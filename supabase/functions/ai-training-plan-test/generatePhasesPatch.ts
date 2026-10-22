/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Filet de complétion du récap de périodisation (`phases`)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Bug réel : `phases`/`strategicRecap` ne sont demandés QU'au chunk 1
 * (systemPromptJSON.ts) et `mergePlanChunks` ne regarde que ce premier
 * contenu non-vide — si ce chunk 1 produit un récap qui ne couvre pas
 * totalWeeks (tronqué, oublié), le plan livré a un trou de périodisation
 * qu'aucun mécanisme actif ne comble : seul un fallback client passif
 * (normalizeWeeksPhases.ts → INCOMPLETE_PHASE_LABEL) rend le trou visible,
 * sans jamais tenter de le combler avec du contenu réel.
 *
 * Ce module ajoute CE filet actif : une fois le plan fusionné, on calcule
 * les plages de semaines non couvertes par `phases` (computePhaseCoverageGaps)
 * et, si des trous existent, on tente UN appel LLM ciblé (+ 1 retry léger)
 * demandant UNIQUEMENT les blocs de périodisation manquants — en lui donnant
 * en contexte les thèmes/phases RÉELLEMENT déjà générés pour ces semaines
 * (déjà disponibles dans les chunks, aucune réinvention nécessaire côté LLM).
 *
 * Si le patch échoue malgré le retry, on ne bloque PAS la livraison du plan
 * (les semaines elles-mêmes sont valides) mais on le signale bruyamment
 * (voir `enqueue("warning", { code: "phases_recap_patch_failed", … })` dans
 * jsonPlanHandler.ts) — jamais une dégradation silencieuse.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { z } from "npm:zod@3.23.8";
import { zPhaseSummary, type PhaseSummaryJSON } from "./planSchema.ts";
import { extractJsonPayload } from "./extractJson.ts";

export interface PhaseCoverageGap {
  start: number;
  end: number;
}

/** Parse "S1-S6" / "S7 à S12" / "Semaines 3-8" → { start, end } (mirror normalizeWeeksPhases.ts côté client). */
function parseWeekRange(raw: string): { start: number; end: number } | null {
  if (!raw) return null;
  const m = raw.match(/S?(\d+)\s*(?:-|–|—|to|à)\s*S?(\d+)/i);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < a) return null;
  return { start: a, end: b };
}

/**
 * Calcule les plages [1..totalWeeks] non couvertes par `phases` — trous en
 * tête, au milieu, ou en fin, pas seulement le trou final (contrairement au
 * fallback d'affichage `normalizeWeeksPhases.ts` qui ne gère que la fin).
 */
export function computePhaseCoverageGaps(
  phases: PhaseSummaryJSON[] | undefined,
  totalWeeks: number,
): PhaseCoverageGap[] {
  const covered = new Array<boolean>(totalWeeks + 1).fill(false);
  for (const p of phases ?? []) {
    const r = parseWeekRange(p.weeks ?? "");
    if (!r) continue;
    const start = Math.max(1, r.start);
    const end = Math.min(totalWeeks, r.end);
    for (let wn = start; wn <= end; wn++) covered[wn] = true;
  }

  const gaps: PhaseCoverageGap[] = [];
  let runStart: number | null = null;
  for (let wn = 1; wn <= totalWeeks; wn++) {
    if (!covered[wn]) {
      if (runStart === null) runStart = wn;
    } else if (runStart !== null) {
      gaps.push({ start: runStart, end: wn - 1 });
      runStart = null;
    }
  }
  if (runStart !== null) gaps.push({ start: runStart, end: totalWeeks });
  return gaps;
}

export interface WeekContext {
  weekNumber: number;
  phase: string;
  theme: string;
}

export interface PhasesPatchInput {
  apiKey: string;
  model: string;
  objective: string | null;
  totalWeeks: number;
  gaps: PhaseCoverageGap[];
  weekContext: WeekContext[];
}

const zPatchResponse = z.object({ phases: z.array(zPhaseSummary).min(1) });

function buildPrompt(input: PhasesPatchInput): { system: string; user: string } {
  const gapsDesc = input.gaps.map((g) => `S${g.start}-S${g.end}`).join(", ");
  const contextLines = input.weekContext
    .filter((w) => input.gaps.some((g) => w.weekNumber >= g.start && w.weekNumber <= g.end))
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .map((w) => `S${w.weekNumber} [${w.phase}] ${w.theme}`)
    .join("\n");

  const system = [
    "Tu es l'assistant de périodisation du plan d'entraînement TFCL™.",
    "Un récap de périodisation (\"phases\") a été produit pour un plan, mais il ne couvre pas la totalité des semaines.",
    "Ta seule tâche : produire les blocs de périodisation MANQUANTS, cohérents avec le contenu RÉELLEMENT déjà généré pour ces semaines (fourni ci-dessous).",
    "Réponds STRICTEMENT en JSON, sans texte autour, au format : {\"phases\": [{\"name\": \"…\", \"weeks\": \"Sx-Sy\", \"objective\": \"…\"}]}",
    "Chaque bloc doit avoir un \"weeks\" au format \"Sx-Sy\" (ou \"Sx\" si une seule semaine), couvrant exactement les semaines listées ci-dessous, sans trou ni recouvrement entre tes propres blocs.",
  ].join("\n");

  const user = [
    `Objectif du plan : ${input.objective ?? "non précisé"}`,
    `Durée totale du plan : ${input.totalWeeks} semaines`,
    `Semaines du récap manquantes à combler : ${gapsDesc}`,
    "",
    "Contenu RÉELLEMENT généré pour ces semaines (phase déclarée semaine par semaine + thème) — base-toi sur ce contenu réel, ne réinvente pas :",
    contextLines || "(aucun contexte disponible)",
  ].join("\n");

  return { system, user };
}

async function callOnce(apiKey: string, model: string, system: string, user: string): Promise<PhaseSummaryJSON[]> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      stream: false,
      max_tokens: 2048,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`[phases_patch] gateway HTTP ${resp.status}: ${text.slice(0, 300)}`);
  }

  const data = await resp.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const { json } = extractJsonPayload(content);
  const parsedJson = JSON.parse(json);
  const parsed = zPatchResponse.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(`[phases_patch] réponse invalide: ${parsed.error.message.slice(0, 300)}`);
  }
  return parsed.data.phases;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Tente de générer les blocs de périodisation manquants. 1 appel + 1 retry
 * court en cas d'échec (erreur gateway ou JSON invalide). Retourne `null`
 * si les deux tentatives échouent — à l'appelant de dégrader bruyamment
 * (jamais silencieusement).
 */
export async function generatePhasesPatch(input: PhasesPatchInput): Promise<PhaseSummaryJSON[] | null> {
  const { system, user } = buildPrompt(input);
  try {
    return await callOnce(input.apiKey, input.model, system, user);
  } catch (e) {
    console.warn(`[phases_patch] tentative 1 échouée: ${e instanceof Error ? e.message : String(e)}`);
  }
  await sleep(1000);
  try {
    return await callOnce(input.apiKey, input.model, system, user);
  } catch (e) {
    console.warn(`[phases_patch] tentative 2 échouée: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}
