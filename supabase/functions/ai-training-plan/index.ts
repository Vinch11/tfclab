import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { normalizeObjKey, normalizeAmbKey, extractLimiterKeywords } from "./sportRatioMatrix.ts";
import { mapObjectiveToSport } from "../_shared/deriveRaceTargets.ts";
import { getSystemPrompt } from "./systemPrompt.ts";
import {
  buildUserPrompt,
  buildCPWprimeSection,
  computeCPWprime,
  buildStructuredDiagnosticBlock,
  buildTerrainHardBanBlock,
  extractStrategicRecap,
  detectActivePhase,
  validateChunk1HasRecap,
  buildCanonicalRaceCard,
} from "./promptHelpers.ts";

// Boot marker — bump on refactors qui doivent être visibles en logs
const BUILD_TAG = "ai-training-plan@2026-07-14.b7-phase2A4-brick-sl-alternance";
console.info(`[boot] ${BUILD_TAG} at ${new Date().toISOString()}`);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-plan-output-format, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};
function parseIsoDateUtc(iso?: string): number | undefined {
  if (!iso) return undefined;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: verify caller has a valid session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { athleteData, planConfig, regenerateWeek, workoutCatalog, phaseCatalogs, chunkCatalogs, catalogDurationStats } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 1A — Chemin JSON structuré (feature-flag serveur).
    // Activé quand `planConfig._outputFormat === "json"` OU header
    // `X-Plan-Output-Format: json`. Par défaut : chemin Markdown historique.
    // Le client Phase 1B basculera ce flag ; d'ici là, prod inchangée.
    // ═══════════════════════════════════════════════════════════════════════════
    const jsonModeRequested = planConfig?._outputFormat === "json"
      || req.headers.get("X-Plan-Output-Format")?.toLowerCase() === "json";
    if (jsonModeRequested) {
      console.log(`🧬 Phase 1A JSON path activé (flag=${planConfig?._outputFormat ?? "header"}).`);
      const { handleJSONPlanRequest } = await import("./jsonPlanHandler.ts");
      return handleJSONPlanRequest({
        apiKey: LOVABLE_API_KEY,
        athleteData,
        planConfig,
        regenerateWeek,
        workoutCatalog,
        phaseCatalogs,
        chunkCatalogs,
        catalogDurationStats,
        corsHeaders,
      });
    }

    // ─── DÉFENSE EN PROFONDEUR : cap serveur de l'ambition vs trainingLevel ───
    // Le client applique déjà `computeAmbitionEffective`, mais si un caller bypasse
    // le downgrade (test, script, régénération programmée), on cappe ici.
    try {
      const { enforceAmbitionCap } = await import("./ambitionDefense.ts");
      const tl = planConfig?.ambitionMeta?.trainingLevel ?? planConfig?.trainingLevel ?? null;
      const defense = enforceAmbitionCap(planConfig?.ambition, tl);
      if (defense.serverDowngraded && planConfig) {
        planConfig.ambition = defense.ambitionEffective;
        planConfig._serverAmbitionDefense = {
          saisie: defense.ambitionSaisie,
          effective: defense.ambitionEffective,
          trainingLevel: defense.trainingLevel,
          reason: defense.reason,
        };
      }
    } catch (defErr) {
      console.warn("[ambitionDefense] skipped:", defErr);
    }


    // F-21 — Réinjection dynamique des sections spécialisées (Master >=50, Féminin/RED-S, Trail)
    const baseSystemPrompt = getSystemPrompt({
      sex: athleteData?.sex ?? planConfig?._athleteSex ?? null,
      age: athleteData?.age ?? null,
      objective: planConfig?.objective ?? null,
      expressFinisher: planConfig?._expressFinisher === true,
    });
    const expressPrefix = typeof planConfig?._expressFinisherPromptPrefix === "string" && planConfig._expressFinisherPromptPrefix.trim().length > 0
      ? `${planConfig._expressFinisherPromptPrefix.trim()}\n\n`
      : "";
    const systemPrompt = `${expressPrefix}${baseSystemPrompt}`;
    console.log(`📋 F-21 systemPrompt profile: sex=${athleteData?.sex ?? planConfig?._athleteSex ?? "?"} age=${athleteData?.age ?? "?"} obj=${planConfig?.objective ?? "?"} expressPrefix=${expressPrefix ? "yes" : "no"} → ${systemPrompt.length} chars`);
    let userPrompt: string;
    if (regenerateWeek) {
      userPrompt = `Régénère UNIQUEMENT la Semaine ${regenerateWeek.weekNumber} du plan.
Contexte : ${regenerateWeek.phase || "Phase inconnue"}, thème "${regenerateWeek.theme || "Standard"}".
Plan total : ${regenerateWeek.totalWeeks} semaines.

${buildUserPrompt(athleteData, planConfig, catalogDurationStats)}

IMPORTANT : Ne génère QUE la Semaine ${regenerateWeek.weekNumber} au format tableau obligatoire. Pas les autres semaines.

RAPPEL W'bal OBLIGATOIRE : Pour CHAQUE séance d'intervalles de cette semaine, tu DOIS :
1. Mentionner la durée de repos avec justification W'bal (ex: "Repos 2min30 — calibré W'bal 22kJ")
2. Indiquer le nombre max de répétitions avant dégradation W'
3. Étiqueter les efforts supra-CP quand la puissance prescrite dépasse CP
Ces mentions sont OBLIGATOIRES si les données CP/W' sont disponibles dans le profil athlète ci-dessus.`;
    } else {
      userPrompt = buildUserPrompt(athleteData, planConfig, catalogDurationStats);
    }

    // Resolve workout catalog for injection — phase-specific catalogs take priority
    function getWorkoutCatalogForPhase(phase: string): string {
      if (phaseCatalogs && typeof phaseCatalogs === "object") {
        // Map active phase names to catalog keys
        const phaseMap: Record<string, string> = {
          "fondation": "base", "base": "base", "adaptation": "base",
          "build": "build", "chantier": "build", "consolidation": "build", "développement": "build",
          "spécifique": "peak", "peak": "peak", "race-specific": "peak", "compétition": "peak",
          "affûtage": "taper", "taper": "taper", "pre-race": "taper",
        };
        const key = phaseMap[phase.toLowerCase()] || "build";
        const catalog = phaseCatalogs[key];
        if (catalog && typeof catalog === "string" && catalog.length > 0) return catalog;
        // Fallback to any available catalog
        for (const k of ["build", "base", "peak", "taper"]) {
          if (phaseCatalogs[k]) return phaseCatalogs[k];
        }
      }
      // Legacy: single workoutCatalog string
      if (workoutCatalog && typeof workoutCatalog === "string" && workoutCatalog.length > 0) {
        return workoutCatalog;
      }
      return "";
    }

    // For non-chunked plans, inject ALL phase catalogs (plan covers all phases)
    const monoblocCatalogParts: string[] = [];
    for (const phaseKey of ["base", "build", "peak", "taper"]) {
      const cat = getWorkoutCatalogForPhase(phaseKey);
      if (cat && !monoblocCatalogParts.includes(cat)) {
        monoblocCatalogParts.push(cat);
      }
    }
    if (monoblocCatalogParts.length > 0) {
      // Deduplicate: if all phases return the same catalog, inject once
      const uniqueCatalogs = [...new Set(monoblocCatalogParts)];
      userPrompt += "\n\n" + uniqueCatalogs.join("\n\n");
      userPrompt += `\n\n→ Utilise PRIORITAIREMENT les séances du catalogue ci-dessus.
→ Si AUCUNE séance ne correspond, tu peux CRÉER une séance [Custom] en respectant le format et la méthodologie.
→ Ratio cible : ≥80% séances catalogue, ≤20% séances custom.`;
    }

    // 🚨 TERRAIN HARD-BAN — prepend en TÊTE du userPrompt pour overrider les exemples
    // "+1200m D+" / "montagne" du systemPrompt quand l'athlète déclare un terrain urbain.
    // S'applique à tous les chemins : mono-bloc, chunked (chunk 1+N), retries, surgical.
    const _terrainHardBanTop = buildTerrainHardBanBlock(planConfig);
    if (_terrainHardBanTop) {
      userPrompt = `${_terrainHardBanTop}\n\n${userPrompt}`;
      console.log(`🏙️ TERRAIN HARD-BAN ACTIVE: terrainAvailability="${planConfig?.terrainAvailability}" → injecté en tête + queue de chaque chunk.`);
    } else {
      console.log(`🏙️ TERRAIN HARD-BAN inactif (terrainAvailability="${planConfig?.terrainAvailability ?? "undefined"}").`);
    }

    const totalWeeks = planConfig?.weeksAvailable || 12;
    // Use smaller chunks for triathlon (very verbose output with multi-session days)
    const obj = (planConfig?.objective || "").toUpperCase();
    // Detect verbose plans: triathlon multi-sport plans generate much more text per week
    // Verbose tier 1: Triathlon (doubles/triples, 3 sports) — most verbose
    const isTriVerbose = /IRON|IM\b|703|70\.3|TRIATHLON|TRI\b/i.test(obj);
    // Verbose tier 2: Trail Ultra/Mountain (D+, back-to-back, nutrition descriptions)
    const isTrailVerbose = /TRAIL\s*(ULTRA|MOUNTAIN|MONT|UTMB|CCC|OCC|LONG)/i.test(obj) || (/TRAIL/i.test(obj) && totalWeeks >= 12);
    const isVerbosePlan = isTriVerbose || isTrailVerbose;
    // Dynamic chunk sizing based on verbosity tier
    // FIX (2026-07-08 audit — placeholders S7-S10 sur plan semi 11 sem) :
    // les plans "non-verbose" (semi/marathon/CAP) restaient monolithiques jusqu'à 12 sem →
    // truncation silencieuse au-delà de ~S6, complétée en placeholders côté parser.
    // On chunk dès 6 semaines (4 sem / chunk) pour garantir une couverture complète.
    const CHUNK_SIZE = isTriVerbose ? 5 : isTrailVerbose ? 6 : 4;
    const chunkThreshold = isTriVerbose ? 6 : isTrailVerbose ? 8 : 6;
    const needsChunking = !regenerateWeek && totalWeeks > chunkThreshold;
    console.log(`🔎 Chunk decision: totalWeeks=${totalWeeks} threshold=${chunkThreshold} regenerateWeek=${!!regenerateWeek} isTriVerbose=${isTriVerbose} isTrailVerbose=${isTrailVerbose} → needsChunking=${needsChunking}`);

    // FIX #1: Deduplicate CP/W' — reuse buildCPWprimeSection's logic via shared helper
    const cpwResult = computeCPWprime(athleteData);
    const cpRound = cpwResult?.cpRound ?? null;
    const effectiveCPVal = cpwResult?.effectiveCP ?? null;
    const wprimeKJ = cpwResult?.wprimeKJ ?? null;
    const wEffKJ = cpwResult ? Math.round(cpwResult.wprimeEffJ / 100) / 10 : null;

    // FIX #6: Per-chunk timeout (4 min per chunk call)
    const CHUNK_TIMEOUT_MS = 4 * 60 * 1000;
    // AUDIT FIX #2: Inter-chunk delay to mitigate rate limits on long plans (>24w)
    const INTER_CHUNK_DELAY_MS = 1500;
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    // AUDIT FIX #6: Model fallback chain — primary fast, fallback robust for long plans
    const PRIMARY_MODEL = "google/gemini-3-flash-preview";
    const FALLBACK_MODEL = "google/gemini-2.5-pro";

    // AUDIT FIX #1: Track finish_reason to detect truncation (max_tokens reached)
    // generateAndStream returns text + truncation flag for caller-side handling
    let streamError: { code: number; message: string } | null = null;
    async function generateAndStream(
      prompt: string,
      controller: ReadableStreamDefaultController,
      encoder: TextEncoder,
      model: string = PRIMARY_MODEL,
      // OPTIMIZATION #3: Adaptive reasoning — enable on critical chunks (Chunk 1, Race Weeks)
      reasoningEffort?: "minimal" | "low" | "medium" | "high",
      // RÈGLE #0 — H1 déterministe : quand fourni, la 1re ligne `# …` du flux
      // est remplacée par ce texte avant d'être émise au client. Streaming buffer
      // jusqu'au premier `\n` pour capturer la ligne complète.
      h1Rewrite?: string | null,
    ): Promise<{ text: string; truncated: boolean }> {
      const abortCtrl = new AbortController();
      const timeout = setTimeout(() => abortCtrl.abort(), CHUNK_TIMEOUT_MS);

      try {
        const body: Record<string, unknown> = {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          stream: true,
          max_tokens: 65536,
        };
        if (reasoningEffort) {
          body.reasoning = { effort: reasoningEffort };
        }

        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: abortCtrl.signal,
        });

        if (!resp.ok || !resp.body) {
          const errText = await resp.text().catch(() => "Unknown error");
          console.error("AI call error:", resp.status, errText);

          const status = resp.status || 500;
          if (status === 402) {
            streamError = { code: 402, message: "Crédits IA épuisés. Ajoutez des crédits dans les paramètres." };
          } else if (status === 429) {
            streamError = { code: 429, message: "Rate limit dépassé, réessayez dans quelques instants." };
          } else {
            streamError = { code: 500, message: "Erreur du service IA" };
          }

          return { text: "", truncated: false };
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        let buf = "";
        let truncated = false;
        // H1 rewrite state (RÈGLE #0)
        let h1Done = !h1Rewrite; // if no rewrite requested, skip logic
        let h1Buffer = ""; // buffered content (raw text) until first `\n` seen

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);

            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;

            try {
              const p = JSON.parse(json);
              const token = p.choices?.[0]?.delta?.content;
              // AUDIT FIX #1: Capture finish_reason to detect length-based truncation
              const finishReason = p.choices?.[0]?.finish_reason;
              if (finishReason === "length") {
                truncated = true;
                console.warn("⚠️ AI response truncated (finish_reason=length). Will trigger continuation logic.");
              }
              if (token) {
                text += token;
                if (!h1Done) {
                  // Buffer until we've seen the first full line
                  h1Buffer += token;
                  const nlIdx = h1Buffer.indexOf("\n");
                  if (nlIdx !== -1) {
                    const firstLine = h1Buffer.slice(0, nlIdx);
                    const rest = h1Buffer.slice(nlIdx); // includes leading \n
                    let rewritten: string;
                    if (/^\s*#\s+/.test(firstLine)) {
                      rewritten = `# ${h1Rewrite}${rest}`;
                      console.log(`✏️ RÈGLE #0 : H1 réécrit "${firstLine.trim()}" → "# ${h1Rewrite}"`);
                    } else {
                      // AI didn't emit a `#` line first — prepend our H1 to preserve compliance
                      rewritten = `# ${h1Rewrite}\n\n${h1Buffer}`;
                      console.log(`✏️ RÈGLE #0 : H1 absent, injecté en tête "# ${h1Rewrite}"`);
                    }
                    // Replace the same span in `text` (which already accumulated raw tokens)
                    text = rewritten + text.slice(h1Buffer.length);
                    controller.enqueue(
                      encoder.encode(`data: {"choices":[{"delta":{"content":${JSON.stringify(rewritten)}}}]}\n\n`)
                    );
                    h1Done = true;
                    h1Buffer = "";
                  }
                  // else keep buffering, do not emit yet
                } else {
                  controller.enqueue(encoder.encode(line + "\n\n"));
                }
              }
            } catch {}
          }
        }
        // Safety flush: if stream ended without newline, emit whatever we buffered
        if (!h1Done && h1Buffer.length > 0) {
          const rewritten = `# ${h1Rewrite}\n\n${h1Buffer}`;
          text = rewritten + text.slice(h1Buffer.length);
          controller.enqueue(
            encoder.encode(`data: {"choices":[{"delta":{"content":${JSON.stringify(rewritten)}}}]}\n\n`)
          );
        }
        return { text, truncated };
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          console.error("Chunk generation timed out after", CHUNK_TIMEOUT_MS, "ms");
          streamError = { code: 504, message: "Timeout: le bloc a pris trop de temps à générer." };
        }
        return { text: "", truncated: false };
      } finally {
        clearTimeout(timeout);
      }
    }

    // Helper: extract which week numbers were generated in a chunk of text
    function extractGeneratedWeekNumbers(text: string): number[] {
      const nums: number[] = [];
      const re = /^(?:#{2,4}\s*)?\*{0,2}\s*Semaine\s*(\d+)\b/gim;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        nums.push(parseInt(m[1], 10));
      }
      return [...new Set(nums)].sort((a, b) => a - b);
    }

    // FIX #2: Build W'bal reminder using effectiveCP and W' effectif (aligned with client-side)
    const wbalReminder = (effectiveCPVal !== null && wEffKJ !== null)
      ? `\n🔋 RAPPEL W'bal OBLIGATOIRE : Pour CHAQUE séance d'intervalles supra-CP, tu DOIS :
1. Justifier la durée de repos avec le W' individuel (ex: "Repos 2min30 — calibré W'bal ${wEffKJ} kJ")
2. Indiquer le volume max de répétitions avant épuisement du W'
3. Étiqueter les efforts au-dessus de CP effectif (${effectiveCPVal}W) comme "supra-CP"${cpwResult?.cpBounded ? `\n⚠️ CP brut (${cpRound}W) borné à ${effectiveCPVal}W (FTP+10) pour les prescriptions.` : ""}`
      : "";

    if (needsChunking) {
      // === CHUNKED GENERATION for long plans ===
      const encoder = new TextEncoder();
      const MAX_SUMMARY_CHUNKS = 5;

      // Build structured diagnostic from config (always available, includes phase bounds)
      const structuredDiagnostic = buildStructuredDiagnosticBlock(planConfig, totalWeeks);

      const stream = new ReadableStream({
        async start(controller) {
          try {
            let chunkSummaries: string[] = [];
            // Capture diagnostic from first chunk for re-injection
            let extractedDiagnostic = "";
            // FIX #1 (audit recap): Capture Récapitulatif Stratégique from chunk 1
            let extractedRecap = "";
            // AUDIT FIX #4: Global Plan Memory — ultra-condensed, persists across all chunks
            let globalPlanMemory = "";
            // F-22 + AUDIT Cath juillet 2026 : Carte de course canonique DÉTERMINISTE
            // (allure CAP race, IF+Watts vélo bornés TTE, CSS+race-pace nat, HR seuil).
            // Calculée AVANT chunk 1 à partir du snapshot, injectée à l'identique dans
            // TOUS les chunks pour éliminer les "trois CSS / trois race-power" observés.
            const canonicalRaceCard = buildCanonicalRaceCard(athleteData, planConfig);
            let prescribedPaces = canonicalRaceCard;
            console.log(`🎯 CARTE COURSE canonique seed (${canonicalRaceCard.length} chars) — inter-chunks anchor.`);
            // AUDIT FIX #5: Anti-redundancy — track key sessions used across all previous chunks
            const usedKeySessions: Set<string> = new Set();
            // FIX C1 (audit): Initialize activePhase from ambition — finisher starts in "Adaptation", not "Fondation"
            const ambKeyForPhase = normalizeAmbKey(planConfig?.ambition || "");
            let activePhase = (ambKeyForPhase === "finisher") ? "Adaptation" : "Fondation";
            const chunks: { start: number; end: number }[] = [];
            for (let s = 1; s <= totalWeeks; s += CHUNK_SIZE) {
              chunks.push({ start: s, end: Math.min(s + CHUNK_SIZE - 1, totalWeeks) });
            }

            // AUDIT FIX #4: Append condensed entry to global memory (capped ~2KB)
            const updateGlobalMemory = (chunkIdx: number, chunkRange: string, phase: string, blocs: string[], topSessions: string[]) => {
              const blocLine = blocs.length > 0 ? ` | Blocs: ${blocs.join("; ")}` : "";
              const sessLine = topSessions.length > 0 ? ` | Clés: ${topSessions.slice(0, 4).join(", ")}` : "";
              const entry = `[Bloc${chunkIdx + 1} ${chunkRange} • ${phase}${blocLine}${sessLine}]`;
              globalPlanMemory = (globalPlanMemory + " " + entry).trim();
              if (globalPlanMemory.length > 2000) {
                const parts = globalPlanMemory.split(/(?=\[Bloc)/);
                while (parts.length > 1 && parts.join("").length > 2000) parts.shift();
                globalPlanMemory = parts.join("").trim();
              }
            };

            /**
             * F-22: Extract prescribed paces / power / HR from chunk 1 text.
             * Looks for explicit thresholds and pace prescriptions in the diagnostic,
             * strategic recap, and first weeks. Returns a deduplicated compact list
             * (≤800 chars) suitable for re-injection in every subsequent chunk.
             */
            const extractPrescribedPaces = (text: string): string => {
              if (!text) return "";
              const hits = new Set<string>();
              // Power prescriptions: "CP 285W", "FTP 280W", "Z4 = 240-260W", "Seuil ~265W"
              const powerRe = /\b(CP|FTP|MAP|PMA|Seuil|Threshold|Z[1-7]|VO2|Sweet ?Spot|SST|Tempo)\b[^.\n|]{0,40}?\b\d{2,4}\s*W\b/gi;
              // Pace prescriptions: "allure marathon 4:30/km", "seuil 3:45/km", "VMA 18 km/h", "16:00/3km"
              const paceRe = /\b(VMA|Seuil|Allure\s+\w+|Tempo|Marathon|Semi|10K|5K|CSS|Z[1-7])\b[^.\n|]{0,40}?\d{1,2}[:'h]\d{1,2}\s*\/?\s*(?:km|m|3km)?|\b\d{1,2}[,.]?\d?\s*km\/h\b/gi;
              // HR prescriptions: "Z2 130-145 bpm", "Seuil 165 bpm"
              const hrRe = /\b(Z[1-7]|Seuil|Threshold|FCmax|FC\s*Seuil)\b[^.\n|]{0,30}?\d{2,3}\s*(?:-\s*\d{2,3})?\s*(?:bpm|ppm)\b/gi;
              // %FTP / %CP / %VMA / %VO2 / %FCmax bands
              const pctRe = /\b\d{2,3}\s*[-–]\s*\d{2,3}\s*%\s*(?:FTP|CP|VMA|VO2|PMA|FCmax|FCM)\b/gi;

              const collect = (re: RegExp) => {
                let m: RegExpExecArray | null;
                while ((m = re.exec(text)) !== null) {
                  const s = m[0].replace(/\s+/g, " ").trim();
                  if (s.length >= 6 && s.length <= 80) hits.add(s);
                }
              };
              collect(powerRe);
              collect(paceRe);
              collect(hrRe);
              collect(pctRe);

              if (hits.size === 0) return "";
              const list = Array.from(hits).slice(0, 24);
              let joined = list.join(" • ");
              if (joined.length > 800) joined = joined.slice(0, 800).replace(/\s•[^•]*$/, "") + " …";
              return joined;
            };


            // ─── OPTIMIZATION #4: Dynamic feedback guardrails ───
            // Track per-chunk metrics (volume, intensity ratio, sport distribution).
            // After each chunk, compute deviations vs Lorang/Friel norms and feed them
            // back as NON-PRESCRIPTIVE signals into the NEXT chunk's prompt. The AI
            // remains in full control — it can confirm, justify, or correct.
            interface ChunkMetrics {
              chunkIdx: number;
              weekRange: string;
              estimatedTSS: number;          // sum of est. TSS across chunk weeks
              avgWeeklyHours: number;        // avg duration in hours
              intensityRatioPct: number;     // % time in Z3+ (high) — target ≤20% polarized
              sportDist: Record<string, number>; // sport → minutes
              progressionVsPrevPct: number | null; // %change in TSS vs previous chunk
            }
            const chunkMetricsHistory: ChunkMetrics[] = [];
            // Pending guardrail messages to inject into NEXT chunk
            let pendingGuardrails: string[] = [];

            // Estimate TSS from a session line: "duration × intensity factor² × 100"
            // Heuristic-based since we only have text. Conservative IF mapping per category.
            const estimateSessionTSS = (sessionText: string): number => {
              const lower = sessionText.toLowerCase();
              // Extract duration in minutes (formats: "1h30", "90min", "45'")
              let durMin = 0;
              const hMatch = lower.match(/(\d+)\s*h\s*(\d{1,2})?/);
              if (hMatch) {
                durMin = parseInt(hMatch[1], 10) * 60 + (hMatch[2] ? parseInt(hMatch[2], 10) : 0);
              } else {
                const mMatch = lower.match(/(\d{2,3})\s*(?:min|'|′)/);
                if (mMatch) durMin = parseInt(mMatch[1], 10);
              }
              if (durMin === 0) return 0;
              // IF heuristic by intensity markers
              let IF = 0.65; // Z2 default
              if (/sprint|vo2|map\b|z5|z6|110%|120%/.test(lower)) IF = 0.95;
              else if (/seuil|threshold|ftp\b|css|tempo|z4/.test(lower)) IF = 0.88;
              else if (/sweet ?spot|z3|sst/.test(lower)) IF = 0.82;
              else if (/fatmax|endurance|z2|aérobie|easy/.test(lower)) IF = 0.65;
              else if (/récup|recovery|z1|jog/.test(lower)) IF = 0.50;
              return Math.round((durMin / 60) * IF * IF * 100);
            };

            // Compute objective metrics for a chunk's generated text
            const computeChunkMetrics = (text: string, chunkIdx: number, range: string, prevTSS: number | null): ChunkMetrics => {
              const weekBlocks = text.match(/(?:^|\n)(?:#{2,4}\s*)?\*{0,2}\s*Semaine\s*\d+\b[\s\S]*?(?=(?:\n(?:#{2,4}\s*)?\*{0,2}\s*Semaine\s*\d+\b)|$)/gi) || [];
              let totalTSS = 0;
              let totalMin = 0;
              let highIntensityMin = 0;
              const sportDist: Record<string, number> = {};
              for (const wb of weekBlocks) {
                // Each session line typically has duration + zone info
                const lines = wb.split("\n").filter(l => /\d+\s*(?:h|min|'|′)/.test(l));
                for (const line of lines) {
                  const tss = estimateSessionTSS(line);
                  totalTSS += tss;
                  const lower = line.toLowerCase();
                  let durMin = 0;
                  const hMatch = lower.match(/(\d+)\s*h\s*(\d{1,2})?/);
                  if (hMatch) durMin = parseInt(hMatch[1], 10) * 60 + (hMatch[2] ? parseInt(hMatch[2], 10) : 0);
                  else {
                    const mMatch = lower.match(/(\d{2,3})\s*(?:min|'|′)/);
                    if (mMatch) durMin = parseInt(mMatch[1], 10);
                  }
                  totalMin += durMin;
                  if (/sprint|vo2|map\b|seuil|threshold|tempo|z3|z4|z5|z6|sst|sweet ?spot/.test(lower)) {
                    highIntensityMin += durMin;
                  }
                  // Sport detection
                  if (/vélo|bike|cyclisme|home ?trainer|ht\b/.test(lower)) sportDist.bike = (sportDist.bike || 0) + durMin;
                  else if (/course|run|cap\b|trail|piste/.test(lower)) sportDist.run = (sportDist.run || 0) + durMin;
                  else if (/nat|swim|piscine|crawl/.test(lower)) sportDist.swim = (sportDist.swim || 0) + durMin;
                  else if (/musc|force|gym|strength|renf/.test(lower)) sportDist.strength = (sportDist.strength || 0) + durMin;
                }
              }
              const numWeeks = Math.max(weekBlocks.length, 1);
              const avgWeeklyHours = Math.round((totalMin / 60 / numWeeks) * 10) / 10;
              const intensityRatioPct = totalMin > 0 ? Math.round((highIntensityMin / totalMin) * 100) : 0;
              const progressionVsPrevPct = prevTSS !== null && prevTSS > 0
                ? Math.round(((totalTSS - prevTSS) / prevTSS) * 100)
                : null;
              return { chunkIdx, weekRange: range, estimatedTSS: totalTSS, avgWeeklyHours, intensityRatioPct, sportDist, progressionVsPrevPct };
            };

            // Build feedback guardrail messages from metrics — NON-PRESCRIPTIVE tone
            const buildFeedbackGuardrails = (m: ChunkMetrics, phase: string): string[] => {
              const msgs: string[] = [];
              // Lorang: max +10% load progression between consecutive blocks
              if (m.progressionVsPrevPct !== null) {
                if (m.progressionVsPrevPct > 12) {
                  msgs.push(`📊 Charge bloc précédent (${m.weekRange}) : TSS ${m.estimatedTSS} = +${m.progressionVsPrevPct}% vs bloc N-1. Recommandation Lorang : max +10%/bloc. Confirme ce saut (justifié par adaptation forte ?) ou lisse la progression.`);
                } else if (m.progressionVsPrevPct < -25 && phase !== "Affûtage" && phase !== "Récupération") {
                  msgs.push(`📊 Charge bloc précédent : TSS −${Math.abs(m.progressionVsPrevPct)}% vs N-1 hors phase de récup/taper. Si volontaire (semaine de décharge), ignore ce signal. Sinon, vérifie la cohérence.`);
                }
              }
              // Polarized 80/20 — high intensity should be ≤20-25% in base/build
              if (m.intensityRatioPct > 28 && (phase === "Fondation" || phase === "Adaptation" || phase === "Build" || phase === "Chantier")) {
                msgs.push(`⚖️ Intensité bloc précédent : ${m.intensityRatioPct}% du temps en Z3+ (cible polarisée 80/20 = ≤20-25% en ${phase}). Si l'athlète a besoin de plus d'intensité (limiteur VLamax/VO2max), justifie. Sinon, rééquilibre vers du Z2/FatMax.`);
              }
              // Sport distribution sanity (only flag if multi-sport plan)
              const totalSportMin = Object.values(m.sportDist).reduce((a, b) => a + b, 0);
              if (totalSportMin > 60 && Object.keys(m.sportDist).length >= 2) {
                const dist = Object.entries(m.sportDist)
                  .map(([s, min]) => `${s}=${Math.round(min / totalSportMin * 100)}%`)
                  .join(", ");
                msgs.push(`🏃🚴🏊 Répartition sport bloc précédent : ${dist}. Vérifie que c'est aligné avec l'objectif et la phase active.`);
              }
              return msgs;
            };

            const emitChunkBoundary = () => {
              controller.enqueue(
                encoder.encode('data: {"choices":[{"delta":{"content":"\\n\\n"}}]}\n\n')
              );
            };

            console.log(`🧩 Chunking activé : ${chunks.length} bloc(s) × ${CHUNK_SIZE} sem (total ${totalWeeks} sem) — ${chunks.map(c => `S${c.start}-S${c.end}`).join(", ")}`);

            // ─── RÈGLE #0 : H1 déterministe (post-processor, ne dépend pas de l'IA) ───
            const buildDeterministicH1 = (): string => {
              const rawObj = String(planConfig?.objective || "").toUpperCase();
              const goals = Array.isArray(planConfig?.raceGoals) ? planConfig.raceGoals : [];
              const isLCW = goals.some((g: any) => g?.raceFormat === "lcw_3day");
              const rn = goals.map((g: any) => String(g?.raceName || "")).join(" ");
              const isLCWName = /LCW|LONG\s*COURSE\s*WEEKEND/i.test(rn);
              const lcwSuffix = (isLCW || isLCWName) ? " LCW" : "";
              let format = "Plan";
              if (/IRONMAN|(^|_)IM(_|$)/.test(rawObj)) format = "Ironman";
              else if (/70[._ ]?3|HALF[_ ]?IRON|TRIATHLON.*70/.test(rawObj)) format = "70.3";
              else if (/MARATHON(?!.*SEMI)|(^|_)MAR(_|$)/.test(rawObj) && !/SEMI|HALF/.test(rawObj)) format = "Marathon";
              else if (/SEMI|HALF[_ ]?MAR/.test(rawObj)) format = "Semi-marathon";
              else if (/10\s*K|10KM|RUN_10/.test(rawObj)) format = "10 km";
              else if (/5\s*K|5KM/.test(rawObj)) format = "5 km";
              else if (/SPRINT/.test(rawObj)) format = "Sprint";
              else if (/OLYMP|_OLY/.test(rawObj)) format = "Olympique";
              else if (/TRAIL.*ULTRA|UTMB|CCC/.test(rawObj)) format = "Trail Ultra";
              else if (/TRAIL/.test(rawObj)) format = "Trail";
              const athleteName = String(planConfig?._athleteFirstName || planConfig?.athleteName || "").trim();
              const namePart = athleteName ? ` ${athleteName}` : "";
              return `Plan TFCL™ — ${format}${lcwSuffix}${namePart} — ${totalWeeks} semaines`;
            };
            const deterministicH1 = buildDeterministicH1();
            console.log(`🎯 RÈGLE #0 : H1 cible = "# ${deterministicH1}"`);

            // Accumulateur texte plan complet — utilisé par les assertions post-génération.
            let fullPlanText = "";
            for (let ci = 0; ci < chunks.length; ci++) {
              const chunk = chunks[ci];
              const isFirst = ci === 0;
              console.log(`▶️ Chunk ${ci + 1}/${chunks.length} — S${chunk.start}-S${chunk.end} : génération en cours…`);
              const expectedWeeks = Array.from(
                { length: chunk.end - chunk.start + 1 },
                (_, i) => chunk.start + i
              );

              // Sliding window summary — only last N chunks
              const slidingSummary = chunkSummaries.slice(-MAX_SUMMARY_CHUNKS).join("\n");

              // Per-chunk filtered catalog (OPTIMIZATION #1): prefer chunk-specific over phase-wide
              // Reduces cognitive noise: AI sees ~45 ultra-relevant sessions instead of ~80 phase-wide
              const chunkSpecificCatalog = Array.isArray(chunkCatalogs) && typeof chunkCatalogs[ci] === "string" && chunkCatalogs[ci].length > 0
                ? chunkCatalogs[ci]
                : null;
              const chunkPhaseCatalog = chunkSpecificCatalog || getWorkoutCatalogForPhase(activePhase);

              // PHASE 2A — bloc quotas hebdo pré-calculé côté client (injecté avant catalogue)
              const _quotasBlockByChunk = Array.isArray(planConfig?._weeklyQuotasPromptByChunk)
                ? planConfig._weeklyQuotasPromptByChunk
                : [];
              const quotasBlockForChunk = typeof _quotasBlockByChunk[ci] === "string" && _quotasBlockByChunk[ci].length > 0
                ? `\n${_quotasBlockByChunk[ci]}\n`
                : "";

              let chunkPrompt: string;
              if (isFirst) {
                const allChunksSummary = chunks.map(c => `Semaines ${c.start}-${c.end}`).join(", ");
                // FIX C2 (audit): Inject structuredDiagnostic in chunk 1 to anchor phase bounds from the start
                chunkPrompt = `${userPrompt}${quotasBlockForChunk}
${chunkPhaseCatalog ? `\n${chunkPhaseCatalog}\n` : ""}
${canonicalRaceCard}

⚠️ GÉNÉRATION PAR BLOC : Génère UNIQUEMENT les semaines ${chunk.start} à ${chunk.end} (sur ${totalWeeks} total).

📋 DIAGNOSTIC STRUCTURÉ (RÉFÉRENCE pour la cohérence du plan entier) :
${structuredDiagnostic}

Pour ce premier bloc, inclus :
1. Le **Diagnostic TFCL™** complet
2. Le **Récapitulatif Stratégique** couvrant **L'INTÉGRALITÉ du plan de ${totalWeeks} semaines** (${allChunksSummary}), PAS seulement le bloc actuel.
   - Le tableau "Limiteurs → Blocs → Séances Clés" DOIT lister TOUS les blocs/phases du plan entier (ex: Fondation S1-S6, Build S7-S12, Spécifique S13-S26, Affûtage S27-S32).
   - La colonne "Semaines" DOIT couvrir la totalité des ${totalWeeks} semaines.
   - Les synergies doivent concerner le plan global.
   - ⚠️ CHAQUE phase/bloc DOIT avoir des bornes de semaines explicites (ex: "S1-S6", "S7-S12").
   - ⚠️ Les bornes de phase estimées ci-dessus servent de GUIDE. Tu peux ajuster ±1 semaine si les limiteurs le justifient.

Génère ensuite les semaines ${chunk.start} à ${chunk.end} avec leurs tableaux complets.
IMPORTANT : Tu DOIS générer EXACTEMENT ${expectedWeeks.length} semaines (${expectedWeeks.join(", ")}). Ne t'arrête pas avant.${wbalReminder}${_terrainHardBanTop ? `\n\n${_terrainHardBanTop}` : ""}`;

              } else {
                // FIX #2 (audit recap): Re-inject BOTH diagnostic AND strategic recap
                const diagnosticBlock = structuredDiagnostic + (extractedDiagnostic ? `\n\n📝 Diagnostic généré (résumé) :\n${extractedDiagnostic}` : "");
                
                // FIX #2: Build recap injection section
                const recapSection = extractedRecap
                  ? `\n📋 RÉCAPITULATIF STRATÉGIQUE (généré au bloc 1 — RÉFÉRENCE pour le séquençage) :\n${extractedRecap}\n\n⚠️ Tu DOIS respecter les bornes de phase et les séances clés définies ci-dessus. Si la semaine ${chunk.start} tombe dans un nouveau bloc/phase selon ce récapitulatif, insère l'en-tête de bloc.`
                  : "";

                // FIX C3 (audit): Build multi-objective reminder specific to this chunk's week range
                let multiObjChunkReminder = "";
                if (planConfig?.raceGoals && planConfig.raceGoals.length > 1) {
                  const relevantGoals = planConfig.raceGoals.filter((g: any) => {
                    if (!g.raceDate || !planConfig.planStartDate) return false;
                    const startMs = parseIsoDateUtc(planConfig.planStartDate);
                    const raceMs = parseIsoDateUtc(g.raceDate);
                    if (startMs === undefined || raceMs === undefined) return false;
                    const days = Math.round((raceMs - startMs) / (24 * 3600 * 1000));
                    const goalWeek = days >= 0 ? Math.floor(days / 7) + 1 : 0;
                    // Include goals within ±3 weeks of this chunk's range (taper/recovery window)
                    return goalWeek >= chunk.start - 3 && goalWeek <= chunk.end + 3;
                  });
                  if (relevantGoals.length > 0) {
                    multiObjChunkReminder = `\n\n🎯 RAPPEL MULTI-OBJECTIFS pour ce bloc :`;
                    relevantGoals.forEach((g: any) => {
                      const startMs = parseIsoDateUtc(planConfig.planStartDate);
                      const raceMs = parseIsoDateUtc(g.raceDate);
                      const days = (startMs !== undefined && raceMs !== undefined) ? Math.round((raceMs - startMs) / (24 * 3600 * 1000)) : 0;
                      const goalWeek = days >= 0 ? Math.floor(days / 7) + 1 : 0;
                      const prio = g.priority === "A" ? "🅰️" : g.priority === "B" ? "🅱️" : "🆎";
                      multiObjChunkReminder += `\n  ${prio} ${g.objective || g.raceName || "Course"} — Semaine ${goalWeek} (${g.raceDate})`;
                      if (g.priority !== "A" && goalWeek >= chunk.start && goalWeek <= chunk.end) {
                        multiObjChunkReminder += ` ⚠️ DANS CE BLOC → Mini-taper S${goalWeek - 1}, Course S${goalWeek}, Récup S${goalWeek + 1}`;
                      }
                    });

                    const inChunkGoals = relevantGoals.filter((g: any) => {
                      const startMs = parseIsoDateUtc(planConfig.planStartDate);
                      const raceMs = parseIsoDateUtc(g.raceDate);
                      const days = (startMs !== undefined && raceMs !== undefined) ? Math.round((raceMs - startMs) / (24 * 3600 * 1000)) : -999;
                      const goalWeek = days >= 0 ? Math.floor(days / 7) + 1 : 0;
                      return goalWeek >= chunk.start && goalWeek <= chunk.end;
                    });

                    if (inChunkGoals.length > 0) {
                      multiObjChunkReminder += `\n\n🚨 RACE WEEK À GÉNÉRER DANS CE BLOC (OBLIGATION ABSOLUE) :`;
                      inChunkGoals.forEach((g: any) => {
                        const startMs = parseIsoDateUtc(planConfig.planStartDate);
                        const raceMs = parseIsoDateUtc(g.raceDate);
                        const days = (startMs !== undefined && raceMs !== undefined) ? Math.round((raceMs - startMs) / (24 * 3600 * 1000)) : 0;
                        const goalWeek = days >= 0 ? Math.floor(days / 7) + 1 : 0;
                        multiObjChunkReminder += `\n- ${g.priority === "A" ? "🅰️" : g.priority === "B" ? "🅱️" : "🆎"} ${g.objective || g.raceName || "Course"} : la S${goalWeek} DOIT inclure la course à la date exacte ${g.raceDate}.`;
                        multiObjChunkReminder += `\n  • La S${goalWeek} doit être une vraie Race Week complète : mini-taper + rappels spécifiques + activation + Jour J.`;
                        multiObjChunkReminder += `\n  • Interdit de produire une semaine vide, ambiguë, ou limitée à 2-3 séances non spécifiques.`;
                        multiObjChunkReminder += `\n  • Minimum attendu : 5 séances réelles pour cette semaine, dont une séance "🏁 COURSE OBJECTIF" / "🏁 Jour J".`;
                      });
                    }
                  }
                }

                chunkPrompt = `${userPrompt}${quotasBlockForChunk}
${chunkPhaseCatalog ? `\n📚 CATALOGUE SÉANCES FILTRÉES POUR CETTE PHASE (${activePhase}) :\n${chunkPhaseCatalog}\n` : ""}
⚠️ GÉNÉRATION PAR BLOC (suite) : Génère UNIQUEMENT les semaines ${chunk.start} à ${chunk.end} (sur ${totalWeeks} total).
NE PAS répéter le diagnostic ni le récapitulatif stratégique. NE PAS ajouter d'introduction.
Tu DOIS générer EXACTEMENT ${expectedWeeks.length} semaines : ${expectedWeeks.map(w => `Semaine ${w}`).join(", ")}.

🔴 RÈGLE CRITIQUE — EN-TÊTES DE BLOC :
Si une nouvelle phase/bloc commence dans cette plage de semaines (d'après le Récapitulatif Stratégique du premier bloc), tu DOIS insérer l'en-tête de bloc AVANT la première semaine de ce bloc :
## Bloc N : [Nom Métabolique] (Semaines X-Y)
**Objectif physiologique :** [...]
**Volume cible :** [...]

Puis continue avec les semaines. Chaque bloc doit avoir son en-tête. C'est OBLIGATOIRE pour le parsing.

📋 DIAGNOSTIC STRUCTURÉ (cohérence obligatoire pour ce bloc) :
${diagnosticBlock}
${recapSection}${multiObjChunkReminder}

🔄 PHASE ACTIVE ESTIMÉE : ${activePhase}
→ Les séances clés de ce bloc doivent correspondre à cette phase ET aux limiteurs ci-dessus.
→ Utilise PRIORITAIREMENT les séances du catalogue ci-dessus qui correspondent à cette phase.
→ Si AUCUNE séance du catalogue ne correspond précisément à l'objectif/phase/sport requis, tu peux CRÉER une séance sur mesure en respectant :
  1. Le format identique (titre explicite, zones, durée, structure Warm-up/Main/Cool-down)
  2. Les principes méthodologiques du plan (polarisation 80/20, progression, cohérence de phase)
  3. Marque-la avec [Custom] dans le titre pour la distinguer des protocoles validés
→ Ratio cible : ≥80% séances catalogue, ≤20% séances custom. Si tu dépasses 20% custom, justifie pourquoi.

${prescribedPaces ? `🎯 ALLURES / PUISSANCES / FC PRESCRITES (réf. bloc 1 — ANCRAGE OBLIGATOIRE, ne pas dériver) :\n${prescribedPaces}\n→ Toute séance d'intensité de ce bloc DOIT utiliser ces ancrages (ou une variation justifiée ±5%). Ne pas inventer de nouvelles valeurs.\n\n` : ""}🧠 MÉMOIRE GLOBALE DU PLAN (synthèse de TOUS les blocs déjà générés — anti-amnésie) :
${globalPlanMemory || "(aucun bloc précédent)"}

Résumé détaillé des blocs récents (progression) :
${slidingSummary || "Premier bloc de continuation."}

🚫 SÉANCES CLÉS DÉJÀ UTILISÉES (éviter la répétition exacte — varier les protocoles) :
${usedKeySessions.size > 0 ? Array.from(usedKeySessions).slice(-25).join(" • ") : "(aucune)"}
→ Tu peux REPRENDRE des familles de séances pour la progression, mais évite de copier le titre exact d'une séance déjà programmée. Varie les durées, intensités, ou structures.
${pendingGuardrails.length > 0 ? `\n🛟 GARDE-FOUS DYNAMIQUES (signaux objectifs du bloc précédent — tu restes maître, confirme ou ajuste) :\n${pendingGuardrails.map(g => `• ${g}`).join("\n")}\n→ Ces signaux sont INFORMATIFS. Tu peux les justifier (adaptation contextuelle valide) ou les corriger dans ce bloc. Ne les ignore pas silencieusement.\n` : ""}
Assure la PROGRESSION LOGIQUE du volume et de l'intensité par rapport aux semaines précédentes.${wbalReminder}${_terrainHardBanTop ? `\n\n${_terrainHardBanTop}` : ""}`;
                // Reset pending guardrails — they've been delivered
                pendingGuardrails = [];
              }

              if (!isFirst) emitChunkBoundary();

              // AUDIT FIX #2: Inter-chunk delay to mitigate rate limits (skip on first chunk)
              if (!isFirst) {
                await sleep(INTER_CHUNK_DELAY_MS);
              }

              // ─── OPTIMIZATION #3: Adaptive reasoning ───
              // Activate medium reasoning for critical chunks where the AI must think harder:
              //   • Chunk 1 → strategic recap covering ALL totalWeeks (high-stakes structural decision)
              //   • Chunks containing a Race Week (priority A/B/C) → race day logistics + taper precision
              const chunkContainsRaceWeek = Array.isArray(planConfig?.raceGoals) && planConfig.raceGoals.some((g: any) => {
                if (!g.raceDate || !planConfig.planStartDate) return false;
                const sMs = parseIsoDateUtc(planConfig.planStartDate);
                const rMs = parseIsoDateUtc(g.raceDate);
                if (sMs === undefined || rMs === undefined) return false;
                const days = Math.round((rMs - sMs) / (24 * 3600 * 1000));
                const goalWeek = days >= 0 ? Math.floor(days / 7) + 1 : 0;
                return goalWeek >= chunk.start && goalWeek <= chunk.end;
              });
              const useReasoning = isFirst || chunkContainsRaceWeek;
              if (useReasoning) {
                console.log(`🧠 Adaptive reasoning ENABLED for chunk ${ci + 1} (isFirst=${isFirst}, raceWeek=${chunkContainsRaceWeek})`);
              }

              // Generate chunk
              // RÈGLE #0 : le H1 déterministe est appliqué UNIQUEMENT sur le chunk 1
              // (les chunks suivants n'émettent pas de H1 au niveau plan).
              const genResult = await generateAndStream(
                chunkPrompt,
                controller,
                encoder,
                PRIMARY_MODEL,
                useReasoning ? "medium" : undefined,
                isFirst ? deterministicH1 : null,
              );
              let chunkText = genResult.text;
              let combinedChunkText = chunkText;
              let chunkTruncated = genResult.truncated;

              if (!chunkText) {
                console.error(`Chunk ${ci + 1}/${chunks.length} failed (empty response). StreamError: ${streamError?.message || "none"}`);
                if (streamError && (streamError.code === 402 || streamError.code === 429)) {
                  const errorPayload = `{"error":"${streamError.message}","code":${streamError.code}}`;
                  controller.enqueue(encoder.encode(`data: ${errorPayload}\n\n`));
                  break;
                }
                console.log(`Retrying full chunk ${ci + 1} after failure...`);
                streamError = null;
                await sleep(INTER_CHUNK_DELAY_MS);
                const retryResult = await generateAndStream(chunkPrompt, controller, encoder, PRIMARY_MODEL, undefined, isFirst ? deterministicH1 : null);
                if (!retryResult.text) {
                  // AUDIT FIX #6: Fallback model — switch to robust Gemini Pro after 2 failures
                  console.warn(`⚠️ Chunk ${ci + 1} primary retry failed. Trying FALLBACK model (${FALLBACK_MODEL})...`);
                  streamError = null;
                  await sleep(INTER_CHUNK_DELAY_MS);
                  const fallbackResult = await generateAndStream(chunkPrompt, controller, encoder, FALLBACK_MODEL, undefined, isFirst ? deterministicH1 : null);
                  if (!fallbackResult.text) {
                    // FIX (2026-07-08) : ne PLUS "skipper" silencieusement — remonter une erreur visible.
                    const msg = `Génération incomplète : bloc semaines S${chunk.start}-S${chunk.end} n'a pas pu être généré (2 retries + fallback modèle échoués). Relancer la génération.`;
                    console.error(`❌ Chunk ${ci + 1} FATAL: ${msg}`);
                    const errorPayload = `{"error":${JSON.stringify(msg)},"code":500,"missingChunk":"S${chunk.start}-S${chunk.end}"}`;
                    controller.enqueue(encoder.encode(`data: ${errorPayload}\n\n`));
                    break;
                  }
                  chunkText = fallbackResult.text;
                  combinedChunkText = chunkText;
                  chunkTruncated = fallbackResult.truncated;
                  console.log(`✅ Chunk ${ci + 1} recovered via fallback model.`);
                } else {
                  chunkText = retryResult.text;
                  combinedChunkText = chunkText;
                  chunkTruncated = retryResult.truncated;
                }
              }

              // AUDIT FIX #1: Log truncation — missing-weeks retry below handles continuation
              if (chunkTruncated) {
                const generatedSoFar = extractGeneratedWeekNumbers(combinedChunkText);
                const missingFromTrunc = expectedWeeks.filter(w => !generatedSoFar.includes(w));
                console.warn(`⚠️ Chunk ${ci + 1} truncated (finish_reason=length). Missing ${missingFromTrunc.length}/${expectedWeeks.length} weeks — continuation will be requested.`);
              }

              // === FIRST CHUNK EXTRACTIONS ===
              if (isFirst) {
                // Extract Diagnostic
                const diagMatch = chunkText.match(/(?:##\s*(?:1\.\s*)?Diagnostic[^\n]*\n)([\s\S]*?)(?=##\s*(?:2\.\s*)?(?:R[ée]capitulatif|Semaine\s*\d))/i);
                if (diagMatch) {
                  extractedDiagnostic = diagMatch[1].trim().slice(0, 1200);
                } else {
                  const limiterLines = chunkText.match(/(?:Limiteur|L1|L2|stratégi|priorit|VLamax|VO2max|TTE|FTP|FatMax|économie|durabilité)[^\n]*/gi) || [];
                  extractedDiagnostic = limiterLines.slice(0, 15).join("\n");
                }

                // FIX #1 (audit recap): Extract Récapitulatif Stratégique
                extractedRecap = extractStrategicRecap(chunkText);

                // AUDIT FIX #3: Strict recap enforcement — regenerate chunk 1 once if recap is missing
                let recapValidation = validateChunk1HasRecap(chunkText);
                if ((!recapValidation.hasRecap || !recapValidation.hasPhases || !extractedRecap) && chunks.length > 1) {
                  console.warn("⚠️ Chunk 1 missing strategic recap — forcing one regeneration with reinforced prompt.");
                  await sleep(INTER_CHUNK_DELAY_MS);
                  const reinforcedPrompt = `${chunkPrompt}

🚨 CONTRAINTE ABSOLUE — RÉCAPITULATIF STRATÉGIQUE OBLIGATOIRE :
Tu DOIS produire une section "## 2. Récapitulatif Stratégique" couvrant les ${totalWeeks} semaines du plan AVANT toute semaine.
Le tableau "Limiteurs → Blocs → Séances Clés" doit comporter au moins 3 phases avec bornes explicites (S1-Sx, Sy-Sz, …) couvrant l'INTÉGRALITÉ des ${totalWeeks} semaines.
Sans ce récapitulatif structuré, le plan sera rejeté.`;
                  const reinforcedResult = await generateAndStream(reinforcedPrompt, controller, encoder);
                  if (reinforcedResult.text) {
                    combinedChunkText = reinforcedResult.text;
                    chunkText = reinforcedResult.text;
                    extractedRecap = extractStrategicRecap(reinforcedResult.text);
                    recapValidation = validateChunk1HasRecap(reinforcedResult.text);
                    chunkTruncated = chunkTruncated || reinforcedResult.truncated;
                  }
                }

                if (!recapValidation.hasRecap) {
                  console.warn("⚠️ Chunk 1 still missing Récapitulatif Stratégique after enforcement.");
                }
                if (!recapValidation.hasPhases) {
                  console.warn("⚠️ Chunk 1 Récapitulatif has no phase boundaries (SN-SM patterns) after enforcement.");
                }
                if (extractedRecap) {
                  console.log(`✅ Extracted strategic recap (${extractedRecap.length} chars)`);
                } else {
                  console.warn("⚠️ Failed to extract strategic recap — subsequent chunks will lack periodization context");
                }

                // F-22 : la CARTE DE COURSE canonique (déterministe) reste la source
                // de vérité et n'est PAS écrasée par l'extraction. L'extraction chunk 1
                // devient un COMPLÉMENT (rappels FC/Zx additionnels), pas un override.
                const extractedExtras = extractPrescribedPaces(combinedChunkText);
                if (extractedExtras) {
                  prescribedPaces = `${canonicalRaceCard}\n\n📎 Ancrages complémentaires détectés bloc 1 (indicatifs) : ${extractedExtras}`;
                  console.log(`🎯 F-22: Carte canonique + extras chunk 1 (${extractedExtras.length} chars extras).`);
                } else {
                  console.log(`🎯 F-22: Carte canonique conservée (aucun extra extrait chunk 1).`);
                }

              }

              // FIX #4 (audit recap): Detect active phase with broader matching
              activePhase = detectActivePhase(combinedChunkText, activePhase);

              // Verify which weeks were generated
              const generatedWeeks = extractGeneratedWeekNumbers(chunkText);
              const missingWeeks = expectedWeeks.filter(w => !generatedWeeks.includes(w));

              // Double retry for missing weeks (with deduplication + diagnostic + recap injection)
              if (missingWeeks.length > 0) {
                console.log(`Chunk ${ci + 1}: missing weeks ${missingWeeks.join(",")}. Retry 1...`);
                
                // FIX #2: Include recap in retry prompts too
                const retryRecapSection = extractedRecap
                  ? `\n📋 RÉCAPITULATIF STRATÉGIQUE (référence) :\n${extractedRecap.slice(0, 1500)}`
                  : "";
                
                const retryPrompt = `${userPrompt}

⚠️ COMPLÉTION DE SEMAINES MANQUANTES : Génère UNIQUEMENT les semaines suivantes : ${missingWeeks.map(w => `Semaine ${w}`).join(", ")}.
NE PAS répéter le diagnostic ni le récapitulatif. NE PAS ajouter d'introduction.

🔴 RÈGLE CRITIQUE — EN-TÊTES DE BLOC :
Si une des semaines manquantes est la PREMIÈRE semaine d'un nouveau bloc/phase, tu DOIS insérer l'en-tête de bloc.

📋 DIAGNOSTIC STRUCTURÉ :
${structuredDiagnostic}
${retryRecapSection}
${prescribedPaces ? `\n🎯 ALLURES PRESCRITES (réf. bloc 1) : ${prescribedPaces}\n` : ""}

🔄 PHASE ACTIVE : ${activePhase}

Contexte des semaines déjà générées :
${slidingSummary}
${generatedWeeks.length > 0 ? `Semaines déjà générées dans ce bloc : ${generatedWeeks.join(", ")}` : ""}

Assure la CONTINUITÉ de la progression.${wbalReminder}`;

                emitChunkBoundary();
                await sleep(INTER_CHUNK_DELAY_MS);
                const retryResult1 = await generateAndStream(retryPrompt, controller, encoder);
                const retryText = retryResult1.text;
                let allRetryWeeks: number[] = [];
                if (retryText) {
                  combinedChunkText += `\n${retryText}`;
                  allRetryWeeks = extractGeneratedWeekNumbers(retryText);
                  // Update phase from retry text too
                  activePhase = detectActivePhase(retryText, activePhase);
                }

                const stillMissing = missingWeeks.filter(w => !allRetryWeeks.includes(w));

                // Second retry for remaining missing weeks
                if (stillMissing.length > 0) {
                  console.log(`Chunk ${ci + 1}: still missing ${stillMissing.join(",")}. Retry 2...`);
                  // FIX #2 (audit recap): Include recap in retry 2 as well
                  const retry2RecapSection = extractedRecap
                    ? `\n📋 RÉCAPITULATIF STRATÉGIQUE (référence) :\n${extractedRecap.slice(0, 1200)}`
                    : "";

                  const retry2Prompt = `${userPrompt}

⚠️ DERNIÈRE TENTATIVE — Génère UNIQUEMENT : ${stillMissing.map(w => `Semaine ${w}`).join(", ")}.
NE PAS répéter le diagnostic. Génère directement les tableaux.

📋 DIAGNOSTIC STRUCTURÉ :
${structuredDiagnostic}
${retry2RecapSection}
${prescribedPaces ? `\n🎯 ALLURES PRESCRITES (réf. bloc 1) : ${prescribedPaces}\n` : ""}

🔄 PHASE ACTIVE : ${activePhase}

Contexte : ${slidingSummary}
Semaines déjà générées : ${[...generatedWeeks, ...allRetryWeeks].sort((a, b) => a - b).join(", ")}${wbalReminder}`;

                  emitChunkBoundary();
                  await sleep(INTER_CHUNK_DELAY_MS);
                  const retry2Result = await generateAndStream(retry2Prompt, controller, encoder);
                  const retry2Text = retry2Result.text;
                  if (retry2Text) {
                    combinedChunkText += `\n${retry2Text}`;
                    const retry2Weeks = extractGeneratedWeekNumbers(retry2Text);
                    const finalMissing = stillMissing.filter(w => !retry2Weeks.includes(w));
                    if (finalMissing.length > 0) {
                      console.warn(`Final missing weeks after 2 retries: ${finalMissing.join(",")}`);
                    }
                    activePhase = detectActivePhase(retry2Text, activePhase);
                  }
                }
              }

              // ─── OPTIMIZATION #2: Surgical per-week regeneration for ANEMIC weeks ───
              // After missing-weeks retries, scan for weeks that are technically present
              // but underdeveloped (too few sessions, missing key markers). Regenerate
              // ONLY those individual weeks instead of the whole chunk.
              {
                const minSessionsExpected = isVerbosePlan ? 6 : 4; // tri/trail need more
                const presentWeeks = extractGeneratedWeekNumbers(combinedChunkText);
                const anemicWeeks: number[] = [];

                for (const wNum of presentWeeks) {
                  // Extract this week's block (from "Semaine N" to next "Semaine M" or end)
                  const wRe = new RegExp(
                    `(?:^|\\n)(?:#{2,4}\\s*)?\\*{0,2}\\s*Semaine\\s*${wNum}\\b[\\s\\S]*?(?=(?:\\n(?:#{2,4}\\s*)?\\*{0,2}\\s*Semaine\\s*\\d+\\b)|$)`,
                    "i",
                  );
                  const m = combinedChunkText.match(wRe);
                  if (!m) continue;
                  const block = m[0];

                  // Heuristics: count table rows (| Lundi |, | Mardi |…) OR session bullet markers
                  const dayRows = (block.match(/\|\s*(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\s*\|/gi) || []).length;
                  const bulletRows = (block.match(/^\s*[-*]\s+(?:Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)/gim) || []).length;
                  const sessionCount = Math.max(dayRows, bulletRows);
                  // A week is anemic if it has too few sessions OR is suspiciously short
                  const blockLen = block.length;
                  const isAnemic = (sessionCount < minSessionsExpected && blockLen < 1500) || blockLen < 600;
                  if (isAnemic) {
                    anemicWeeks.push(wNum);
                    console.warn(`🔍 Anemic week detected: S${wNum} (sessions=${sessionCount}, len=${blockLen}, threshold=${minSessionsExpected})`);
                  }
                }

                // Surgical regeneration: one week at a time, max 3 to bound cost
                const weeksToFix = anemicWeeks.slice(0, 3);
                for (const wNum of weeksToFix) {
                  console.log(`🩹 Surgical regen of anemic week S${wNum}…`);
                  const surgicalRecap = extractedRecap
                    ? `\n📋 RÉCAPITULATIF STRATÉGIQUE (référence) :\n${extractedRecap.slice(0, 1200)}`
                    : "";
                  const surgicalPrompt = `${userPrompt}

⚠️ RÉGÉNÉRATION CHIRURGICALE — Régénère UNIQUEMENT la Semaine ${wNum} de manière COMPLÈTE et DÉTAILLÉE.
Cette semaine était trop pauvre (séances insuffisantes ou structure incomplète) — produis une version riche.

Exigences obligatoires :
- Minimum ${minSessionsExpected} séances réelles
- Tableau jour-par-jour complet (Lundi → Dimanche) avec : sport, type, durée, zones cibles, structure
- Marqueur 🔑 sur les séances clés (alignées L1="${planConfig?.identifiedLimitersRaw?.[0] || planConfig?.identifiedLimiters?.[0] || "—"}")
- Justification W'bal pour les séances d'intervalles supra-CP
- Cohérence de phase : ${activePhase}
${surgicalRecap}

🚫 SÉANCES CLÉS DÉJÀ UTILISÉES (varier les protocoles) :
${usedKeySessions.size > 0 ? Array.from(usedKeySessions).slice(-15).join(" • ") : "(aucune)"}

NE PAS répéter le diagnostic. Génère directement le tableau "### Semaine ${wNum}".${wbalReminder}`;

                  emitChunkBoundary();
                  await sleep(INTER_CHUNK_DELAY_MS);
                  // Use medium reasoning for surgical fixes — quality > speed here
                  const surgicalResult = await generateAndStream(
                    surgicalPrompt,
                    controller,
                    encoder,
                    PRIMARY_MODEL,
                    "medium",
                  );
                  if (surgicalResult.text) {
                    combinedChunkText += `\n${surgicalResult.text}`;
                    console.log(`✅ Week S${wNum} regenerated surgically (${surgicalResult.text.length} chars).`);
                  } else {
                    console.warn(`⚠️ Surgical regen failed for S${wNum}.`);
                  }
                }
              }

              // ─── OPTIMIZATION #3: Surgical per-week regen for TRAIL CONTAMINATION (triathlon plans) ───
              // Un plan 70.3/IM/triathlon ne doit JAMAIS contenir de séance trail (montagne, sentier,
              // dénivelé, IDs HEDGEHOG_/URBAN_/TRAIL_). Si l'IA en invente, on régénère la semaine
              // avec un HARD BAN explicite. Fiabilise le plan sans attendre l'utilisateur.
              if (isTriVerbose) {
                // Anti faux-positif : on ne déclenche la régénération QUE sur
                // un ID trail explicite ou un titre de séance "trail run".
                // Vocabulaire "dénivelé/D+50m/col" seul = OK (long run route vallonné).
                const trailIdRx = /\b(HEDGEHOG_[A-Z0-9_]+|URBAN_[A-Z0-9_]+|TRAIL_[A-Z0-9_]+|[A-Z]+_TRAIL_[A-Z0-9_]+)\b/;
                const trailVocabRx = /(s[ée]ance\s+trail|trail\s+run(ning)?|sortie\s+trail|entra[iî]nement\s+trail)/i;
                const contaminatedWeeks: number[] = [];
                const presentWeeksT = extractGeneratedWeekNumbers(combinedChunkText);
                for (const wNum of presentWeeksT) {
                  const wRe = new RegExp(
                    `(?:^|\\n)(?:#{2,4}\\s*)?\\*{0,2}\\s*Semaine\\s*${wNum}\\b[\\s\\S]*?(?=(?:\\n(?:#{2,4}\\s*)?\\*{0,2}\\s*Semaine\\s*\\d+\\b)|$)`,
                    "i",
                  );
                  const m = combinedChunkText.match(wRe);
                  if (!m) continue;
                  const block = m[0];
                  if (trailIdRx.test(block) || trailVocabRx.test(block)) {
                    contaminatedWeeks.push(wNum);
                    console.warn(`🚫 Trail contamination detected in triathlon plan: S${wNum}`);
                  }
                }
                const weeksToClean = contaminatedWeeks.slice(0, 3);
                for (const wNum of weeksToClean) {
                  console.log(`🩹 Surgical regen of trail-contaminated week S${wNum}…`);
                  const cleanPrompt = `${userPrompt}

⚠️ RÉGÉNÉRATION CHIRURGICALE ANTI-TRAIL — Régénère UNIQUEMENT la Semaine ${wNum}.
La version précédente contenait des séances TRAIL/MONTAGNE INTERDITES dans un plan triathlon.

🚫 HARD BAN ABSOLU (aucune exception) :
- AUCUN ID commençant par HEDGEHOG_, URBAN_, TRAIL_ ni contenant _TRAIL_
- AUCUNE mention de : montagne, sentier, dénivelé, D+, bâtons, sac à dos, ravitaillement trail
- AUCUNE séance en terrain trail/nature/off-road
- Sports autorisés UNIQUEMENT : natation, vélo (route/HT), course à pied (route/piste), brique, renforcement

✅ Utilise EXCLUSIVEMENT les séances du catalogue triathlon injecté (préfixes B_LCW_, B_703_, B_IM_, A_IM_, B_BIKE_, B_RUN_, B_SWIM_, etc.).

Génère directement le tableau "### Semaine ${wNum}" au format complet Lundi→Dimanche.${wbalReminder}`;

                  emitChunkBoundary();
                  await sleep(INTER_CHUNK_DELAY_MS);
                  const cleanResult = await generateAndStream(
                    cleanPrompt,
                    controller,
                    encoder,
                    PRIMARY_MODEL,
                    "medium",
                  );
                  if (cleanResult.text) {
                    // Replace the contaminated week block in combinedChunkText
                    const wRe = new RegExp(
                      `((?:^|\\n)(?:#{2,4}\\s*)?\\*{0,2}\\s*Semaine\\s*${wNum}\\b[\\s\\S]*?)(?=(?:\\n(?:#{2,4}\\s*)?\\*{0,2}\\s*Semaine\\s*\\d+\\b)|$)`,
                      "i",
                    );
                    if (wRe.test(combinedChunkText)) {
                      combinedChunkText = combinedChunkText.replace(wRe, `\n${cleanResult.text.trim()}\n`);
                    } else {
                      combinedChunkText += `\n${cleanResult.text}`;
                    }
                    console.log(`✅ Week S${wNum} cleaned of trail contamination (${cleanResult.text.length} chars).`);
                  } else {
                    console.warn(`⚠️ Trail-clean regen failed for S${wNum} — fallback: sanitize inline.`);
                  }
                }
              }



              // FIX M1 (audit): Build ENRICHED summary with limiter progression tracking
              const weekMatches = combinedChunkText.match(/^(?:#{2,4}\s*)?\*{0,2}\s*Semaine\s*\d+[^#\n]*(?:\n(?!#{1,4}\s*\*{0,2}\s*Semaine\s*\d+).*)*/gim) || [];
              const summaryLines = weekMatches.map(w => {
                const numMatch = w.match(/Semaine\s*(\d+)/i);
                const themeMatch = w.match(/[—–:\-]\s*(.+?)[\n|]/);
                // Extract key sessions (🔑) for richer context
                const keySessionMatches = w.match(/🔑[^\n|]*/g) || [];
                const keySummary = keySessionMatches.length > 0 ? ` [Clés: ${keySessionMatches.map(k => k.replace("🔑", "").trim().slice(0, 30)).join(", ")}]` : "";
                // M1: Track limiter-relevant metrics (durations, intensities, volumes)
                const durationMatches = w.match(/(\d+h?\d*['′min]*\s*(?:Z2|endurance|FatMax|seuil|tempo|SFR|force))/gi) || [];
                const durSummary = durationMatches.length > 0 ? ` [Prog: ${durationMatches.slice(0, 2).map(d => d.trim().slice(0, 25)).join(", ")}]` : "";
                return `S${numMatch?.[1] || "?"}: ${themeMatch?.[1]?.trim() || "progression"}${keySummary}${durSummary}`;
              }).join(", ");
              
              // Detect bloc headers in this chunk for phase tracking in summary
              const blocHeaders = combinedChunkText.match(/##\s*Bloc\s*\d*\s*[:—–\-]?\s*[^\n]+/gi) || [];
              const blocInfo = blocHeaders.length > 0 ? ` | Blocs: ${blocHeaders.map(h => h.replace(/^##\s*/i, "").trim().slice(0, 40)).join("; ")}` : "";
              
              // M1: Track longest Z2/endurance session for durability progression
              const z2Durations = combinedChunkText.match(/(\d+)\s*(?:h|min|'|′)\s*(?:\d+\s*(?:min|'|′))?\s*(?:Z2|endurance|FatMax|aérobie)/gi) || [];
              const maxZ2 = z2Durations.length > 0 ? ` | MaxZ2: ${z2Durations[z2Durations.length - 1]?.trim().slice(0, 20)}` : "";

              // FIX M3 (audit): Post-chunk validation — check key sessions target L1/L2
              const keySessionMatches_all = combinedChunkText.match(/🔑[^\n|]*/g) || [];
              const rawLimitersList: string[] = (planConfig?.identifiedLimitersRaw && planConfig.identifiedLimitersRaw.length > 0)
                ? planConfig.identifiedLimitersRaw
                : (planConfig?.identifiedLimiters || []);
              const L1Name = (rawLimitersList[0] || "").toLowerCase();
              const L2Name = (rawLimitersList[1] || "").toLowerCase();
              if (L1Name && keySessionMatches_all.length > 0) {
                const L1Keywords = extractLimiterKeywords(L1Name);
                const L2Keywords = L2Name ? extractLimiterKeywords(L2Name) : [];
                const keyTexts = keySessionMatches_all.map(k => k.toLowerCase());
                const L1Hits = keyTexts.filter(t => L1Keywords.some(kw => t.includes(kw))).length;
                const L2Hits = L2Keywords.length > 0 ? keyTexts.filter(t => L2Keywords.some(kw => t.includes(kw))).length : -1;
                if (L1Hits === 0) {
                  console.warn(`⚠️ M3 Validation: Chunk ${ci + 1} (S${chunk.start}-S${chunk.end}) — NO key sessions (🔑) target L1="${L1Name}". Phase: ${activePhase}`);
                  pendingGuardrails.push(`Bloc précédent: 0 séance clé 🔑 ne ciblait L1="${rawLimitersList[0]}". Recentre au moins 1 séance clé/sem sur ce limiteur (mots-clés: ${L1Keywords.slice(0, 4).join(", ")}).`);
                }
                if (L2Hits === 0 && activePhase !== "Fondation" && activePhase !== "Adaptation") {
                  console.warn(`⚠️ M3 Validation: Chunk ${ci + 1} (S${chunk.start}-S${chunk.end}) — NO key sessions target L2="${L2Name}" in ${activePhase} phase.`);
                  pendingGuardrails.push(`Bloc précédent: 0 séance clé 🔑 ne ciblait L2="${rawLimitersList[1]}" en phase ${activePhase}. Ajoute ≥1 séance L2 (mots-clés: ${L2Keywords.slice(0, 4).join(", ")}).`);
                }
              }
              
              chunkSummaries.push(`Semaines ${chunk.start}-${chunk.end} [Phase: ${activePhase}${blocInfo}${maxZ2}]: ${summaryLines || "Plan progressif standard"}`);

              // AUDIT FIX #4 + #5: Update global memory + register key sessions for anti-redundancy
              const blocLabels = blocHeaders.map(h => h.replace(/^##\s*/i, "").trim().slice(0, 50));
              const topSessions = keySessionMatches_all
                .map(k => k.replace(/🔑/g, "").replace(/[|]/g, "").trim())
                .filter(s => s.length > 0)
                .map(s => s.slice(0, 50));
              updateGlobalMemory(ci, `S${chunk.start}-S${chunk.end}`, activePhase, blocLabels, topSessions);
              topSessions.forEach(s => {
                const norm = s.toLowerCase().replace(/\s+/g, " ").trim();
                if (norm.length >= 6) usedKeySessions.add(norm);
              });

              // ─── OPTIMIZATION #4: Compute metrics & build guardrails for NEXT chunk ───
              const prevTSS = chunkMetricsHistory.length > 0
                ? chunkMetricsHistory[chunkMetricsHistory.length - 1].estimatedTSS
                : null;
              const metrics = computeChunkMetrics(combinedChunkText, ci, `S${chunk.start}-S${chunk.end}`, prevTSS);
              chunkMetricsHistory.push(metrics);
              console.log(`📊 Chunk ${ci + 1} metrics: TSS=${metrics.estimatedTSS}, avgH/wk=${metrics.avgWeeklyHours}, intensityZ3+=${metrics.intensityRatioPct}%, prog=${metrics.progressionVsPrevPct ?? "n/a"}%`);
              const newGuardrails = buildFeedbackGuardrails(metrics, activePhase);
              if (newGuardrails.length > 0) {
                console.log(`🛟 ${newGuardrails.length} guardrail(s) queued for chunk ${ci + 2}`);
                pendingGuardrails.push(...newGuardrails);
              }
              // FIX (2026-07-08) : traçabilité frontières de chunks
              const finalWeeks = extractGeneratedWeekNumbers(combinedChunkText);
              const stillMissingFinal = expectedWeeks.filter(w => !finalWeeks.includes(w));
              if (stillMissingFinal.length > 0) {
                console.warn(`⚠️ Chunk ${ci + 1} S${chunk.start}-S${chunk.end} : généré avec semaines manquantes ${stillMissingFinal.join(",")} (frontend affichera placeholder).`);
              } else {
                console.log(`✅ Chunk ${ci + 1}/${chunks.length} S${chunk.start}-S${chunk.end} : généré, validé (${finalWeeks.length}/${expectedWeeks.length} sem), streamé.`);
              }
              // Accumule pour les assertions plan-complet post-génération
              fullPlanText += `\n${combinedChunkText}`;
            }

            // ─── ASSERTION POST-GÉNÉRATION : contamination triathlon dans plan running ───
            // Chantier "doubles/triples" — rend visible toute violation, sans bloquer la publication.
            try {
              const finalSport = mapObjectiveToSport(planConfig?.objective || "");
              if (finalSport === "run_route" || finalSport === "trail") {
                const totalSwim = chunkMetricsHistory.reduce((s, m) => s + (m.sportDist?.swim || 0), 0);
                const totalBike = chunkMetricsHistory.reduce((s, m) => s + (m.sportDist?.bike || 0), 0);
                if (totalSwim > 0) {
                  const msg = `ASSERTION VIOLÉE : natation détectée dans un plan running (${finalSport}, obj="${planConfig?.objective}") — ${totalSwim} min cumulées sur ${chunkMetricsHistory.length} chunk(s). Le plan est publié avec un warning.`;
                  console.error(`🚨 ${msg}`);
                  // Warning visible côté client via un delta SSE — l'AIPlanViewer affiche déjà le contenu brut ;
                  // le bandeau est injecté au tout début du plan pour être vu par le coach.
                  const warning = `\n\n> ⚠️ **WARNING GÉNÉRATION** : natation détectée (${totalSwim} min) dans un plan running/trail. Contamination à corriger manuellement avant envoi à l'athlète.\n\n`;
                  controller.enqueue(
                    encoder.encode(`data: {"choices":[{"delta":{"content":${JSON.stringify(warning)}}}]}\n\n`)
                  );
                }
                if (totalBike > 0) {
                  console.log(`ℹ️ Plan ${finalSport} : ${totalBike} min vélo cumulées (attendu ≤ récupération Z1-Z2).`);
                }
              }
            } catch (assertErr) {
              console.warn("Assertion post-génération failed:", assertErr);
            }

            // ─── COMPLIANCE POST-GÉNÉRATION : sessionsPerWeek + maxSessionsPerDay ───
            // Détecte les écarts entre la config utilisateur (contrainte dure) et le plan produit.
            // Non-bloquant : warning injecté en tête pour visibilité coach + log serveur.
            try {
              const targetSessions: number | null = Number.isFinite(planConfig?.sessionsPerWeek)
                ? Number(planConfig.sessionsPerWeek) : null;
              const maxPerDay: number | null = Number.isFinite(planConfig?.maxSessionsPerDay)
                ? Number(planConfig.maxSessionsPerDay) : null;

              const weekBlocks = fullPlanText.match(
                /(?:^|\n)(?:#{2,4}\s*)?\*{0,2}\s*Semaine\s*(\d+)\b[\s\S]*?(?=(?:\n(?:#{2,4}\s*)?\*{0,2}\s*Semaine\s*\d+\b)|$)/gi,
              ) || [];

              const violations: string[] = [];
              const isSessionRow = (line: string): boolean => {
                if (!/^\s*\|/.test(line)) return false;
                if (/^\s*\|\s*[-:]+/.test(line)) return false;
                if (/^\s*\|\s*(Jour|Sport|Séance|Détails|Zone|Charge)\s*\|/i.test(line)) return false;
                return /\d+\s*(?:h\s*\d{0,2}|min|'|′)/.test(line)
                       && !/repos|rest\s*(day|complet)|off\b/i.test(line);
              };
              const isDayRepos = (line: string): boolean =>
                /^\s*\|/.test(line) && /repos|rest\s*(day|complet)|off\b/i.test(line);

              const DAYS = /^\s*\|\s*(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i;
              for (const wb of weekBlocks) {
                const weekNumMatch = wb.match(/Semaine\s*(\d+)/i);
                const weekNum = weekNumMatch ? weekNumMatch[1] : "?";
                const rows = wb.split("\n");
                let sessionCount = 0;
                const perDay: Record<string, number> = {};
                let currentDay = "?";
                for (const r of rows) {
                  const dayMatch = r.match(DAYS);
                  if (dayMatch) currentDay = dayMatch[1].toLowerCase();
                  if (isDayRepos(r)) continue;
                  if (isSessionRow(r)) {
                    sessionCount++;
                    perDay[currentDay] = (perDay[currentDay] || 0) + 1;
                  }
                }
                if (targetSessions !== null && sessionCount > 0 && Math.abs(sessionCount - targetSessions) > 1) {
                  violations.push(`S${weekNum} : ${sessionCount} séances (cible ${targetSessions})`);
                }
                if (maxPerDay !== null) {
                  for (const [day, n] of Object.entries(perDay)) {
                    if (n > maxPerDay) violations.push(`S${weekNum} ${day} : ${n} séances (max/jour ${maxPerDay})`);
                  }
                }
              }

              if (violations.length > 0) {
                const msg = `COMPLIANCE : ${violations.length} écart(s) config détecté(s) — ${violations.slice(0, 5).join(" | ")}${violations.length > 5 ? ` (+${violations.length - 5} autres)` : ""}`;
                console.warn(`⚠️ ${msg}`);
                const banner = `\n\n> ⚠️ **COMPLIANCE CONFIG** : ${violations.length} écart(s) détecté(s) entre la config saisie et le plan produit :\n${violations.slice(0, 8).map(v => `> - ${v}`).join("\n")}${violations.length > 8 ? `\n> - _(+${violations.length - 8} autres, voir logs)_` : ""}\n> _Ajuster manuellement ou régénérer._\n\n`;
                controller.enqueue(
                  encoder.encode(`data: {"choices":[{"delta":{"content":${JSON.stringify(banner)}}}]}\n\n`),
                );
              } else if (targetSessions !== null || maxPerDay !== null) {
                console.log(`✅ Compliance config OK sur ${weekBlocks.length} semaine(s) analysée(s).`);
              }
            } catch (complianceErr) {
              console.warn("Compliance check failed:", complianceErr);
            }

            // ─── COMPLIANCE POST-GÉNÉRATION : LCW (Long Course Weekend) ───
            // Compte les occurrences des séances signature LCW attendues en Build/Peak.
            // Non-bloquant : bandeau injecté en tête + logs coach.
            try {
              const goalsLCW = Array.isArray(planConfig?.raceGoals) ? planConfig.raceGoals : [];
              const hasLCWFlag = goalsLCW.some((g: any) => g?.raceFormat === "lcw_3day");
              const raceNamesLCW = goalsLCW.map((g: any) => String(g?.raceName || "")).join(" ");
              const isLCW = hasLCWFlag || /long\s*course\s*weekend|\blcw\b/i.test(raceNamesLCW);

              if (isLCW) {
                const countMatches = (id: string): number => {
                  const rx = new RegExp(`\\b${id}\\b`, "g");
                  return (fullPlanText.match(rx) || []).length;
                };
                const swimFri = countMatches("B_LCW_SWIM_FRI_EVENING");
                const bikeSat = countMatches("B_LCW_BIKE_LONG_RACE_SAT");
                const runSun = countMatches("B_LCW_RUN_OFF_LEGS_SUN");
                const recharge = countMatches("B_LCW_NUTRITION_RECHARGE");
                const backToBack = countMatches("B_LCW_BACK_TO_BACK_PEAK");

                // Détection : `B_LCW_SWIM_FRI_EVENING` mal placé (pas un Vendredi)
                const swimBadDays: string[] = [];
                const swimLineRx = /(?:^|\n)\*{0,2}(Lundi|Mardi|Mercredi|Jeudi|Samedi|Dimanche)\*{0,2}[^\n]*B_LCW_SWIM_FRI_EVENING/gi;
                let mSwim: RegExpExecArray | null;
                while ((mSwim = swimLineRx.exec(fullPlanText)) !== null) {
                  swimBadDays.push(mSwim[1]);
                }

                const lcwViolations: string[] = [];
                if (backToBack < 1) lcwViolations.push("`B_LCW_BACK_TO_BACK_PEAK` absent (attendu 1× en Peak J-3/J-4)");
                if (bikeSat < 3) lcwViolations.push(`\`B_LCW_BIKE_LONG_RACE_SAT\` prescrit ${bikeSat}× (attendu ≥3 : 1 Build + 2 Peak)`);
                if (runSun < 3) lcwViolations.push(`\`B_LCW_RUN_OFF_LEGS_SUN\` prescrit ${runSun}× (attendu ≥3 : 1 Build + 2 Peak)`);
                if (swimFri < 2) lcwViolations.push(`\`B_LCW_SWIM_FRI_EVENING\` prescrit ${swimFri}× (attendu ≥2 en Build/Peak)`);
                if (recharge < 3) lcwViolations.push(`\`B_LCW_NUTRITION_RECHARGE\` prescrit ${recharge}× (attendu ≥3, associé à chaque back-to-back)`);
                if (swimBadDays.length > 0) {
                  lcwViolations.push(`\`B_LCW_SWIM_FRI_EVENING\` mal placé (jour(s) : ${swimBadDays.join(", ")}) — doit être STRICTEMENT le Vendredi`);
                }

                // Détection substitutions sémantiques interdites en contexte LCW
                const forbiddenSubs: Array<{ id: string; suggest: string }> = [
                  { id: "B_IM_BRICK_LONG_MARATHON_PACE", suggest: "B_LCW_BIKE_LONG_RACE_SAT + B_LCW_RUN_OFF_LEGS_SUN (séparés 12-18h)" },
                  { id: "B_703_BRICK_RACE_PACE", suggest: "banni en LCW (voir règle #1)" },
                ];
                // NB : `A_IM_RUN_FATIGUED_NEXT_DAY` autorisée si long-bike la veille — check dédié plus bas.
                for (const sub of forbiddenSubs) {
                  const n = countMatches(sub.id);
                  if (n > 0) {
                    lcwViolations.push(`Substitution sémantique interdite : \`${sub.id}\` prescrit ${n}× → utiliser \`${sub.suggest}\``);
                  }
                }

                // ─── Détection FUITES TRAIL dans un plan 70.3/LCW ───
                // Cherche IDs Hedgehog/Urban/Trail ainsi que vocabulaire trail dans le corps.
                const trailIdRx = /\b(HEDGEHOG_\w+|URBAN_\w+|TRAIL_\w+|\w+_TRAIL_\w+)\b/gi;
                const trailIdMatches = Array.from(new Set((full.match(trailIdRx) || []).map(s => s.toUpperCase())));
                if (trailIdMatches.length > 0) {
                  lcwViolations.push(`Fuite TRAIL détectée : ID(s) interdit(s) dans un plan 70.3 LCW → ${trailIdMatches.slice(0, 5).join(", ")}${trailIdMatches.length > 5 ? "…" : ""}`);
                }
                const trailVocabRx = /\b(d[eé]nivel[eé]|D\+\s*\d|sentier|b[aâ]tons?|sac\s*[aà]\s*dos)\b/gi;
                const trailVocabHits = (full.match(trailVocabRx) || []).length;
                if (trailVocabHits >= 3) {
                  lcwViolations.push(`Vocabulaire TRAIL suspect (${trailVocabHits} occurrences) dans un plan 70.3 LCW — vérifier absence de séances montagne/sentier`);
                }

                // ─── Détection ORPHELINE : long run fatigue résiduelle SANS long-bike la veille ───
                // Autorisée si J-1 = long bike (≥2h30 Z2-Z3 ou race-pace / B_LCW_BIKE_LONG_RACE_SAT / B_IM_BIKE_LONG_*).
                // Sinon violation : la séance perd sa signature physiologique.
                const fatigueRunIds = ["A_IM_RUN_FATIGUED_NEXT_DAY", "B_LCW_RUN_OFF_LEGS_SUN"];
                const jours = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
                // Segmenter le plan par jour : capture chaque bloc `**Jour**` ... jusqu'au prochain jour ou fin de semaine.
                const dayBlockRx = /\*{0,2}(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\*{0,2}([\s\S]*?)(?=\n\s*\*{0,2}(?:Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\*{0,2}|\n\s*##|\n\s*###|$)/gi;
                const orphanHits: string[] = [];
                let m: RegExpExecArray | null;
                // Reconstruire une timeline linéaire (jour, contenu) dans l'ordre d'apparition.
                const timeline: Array<{ day: string; body: string }> = [];
                while ((m = dayBlockRx.exec(full)) !== null) {
                  timeline.push({ day: m[1], body: m[2] });
                }
                const isLongBike = (body: string): boolean => {
                  if (/B_LCW_BIKE_LONG_RACE_SAT|B_IM_BIKE_LONG|B_703_BIKE_LONG|B_BIKE_LONG_Z2/i.test(body)) return true;
                  // Vélo + durée ≥ 2h30
                  const bikeMention = /(v[eé]lo|bike|home\s*trainer|HT|cyclisme)/i.test(body);
                  const durMatch = body.match(/(\d+)\s*h\s*(\d{0,2})?/);
                  if (bikeMention && durMatch) {
                    const h = parseInt(durMatch[1], 10);
                    const min = durMatch[2] ? parseInt(durMatch[2], 10) : 0;
                    if (h * 60 + min >= 150) return true;
                  }
                  return false;
                };
                for (let i = 0; i < timeline.length; i++) {
                  const { day, body } = timeline[i];
                  const hasFatigueRun = fatigueRunIds.some(id => body.toUpperCase().includes(id));
                  if (!hasFatigueRun) continue;
                  // Jour précédent = i-1 dans la timeline (semaine calendaire réelle).
                  const prev = i > 0 ? timeline[i - 1] : null;
                  const dayIdx = jours.indexOf(day);
                  const expectedPrev = dayIdx > 0 ? jours[dayIdx - 1] : "Dimanche (sem. précédente)";
                  const prevIsAdjacent = prev && prev.day.toLowerCase() === expectedPrev.toLowerCase();
                  const prevHasLongBike = prevIsAdjacent && isLongBike(prev.body);
                  if (!prevHasLongBike) {
                    orphanHits.push(`${day} (attendu ${expectedPrev} = long-bike ≥2h30)`);
                  }
                }
                if (orphanHits.length > 0) {
                  lcwViolations.push(`Long run 'fatigue résiduelle' ORPHELINE (pas de long-bike la veille) : ${orphanHits.slice(0, 5).join(" | ")}${orphanHits.length > 5 ? "…" : ""}`);
                }




                if (lcwViolations.length > 0) {
                  console.warn(`⚠️ COMPLIANCE LCW : ${lcwViolations.length} écart(s) — ${lcwViolations.join(" | ")}`);
                  const lcwBanner = `\n\n> ⚠️ **COMPLIANCE LCW (Long Course Weekend)** : ${lcwViolations.length} écart(s) détecté(s) entre les règles LCW et le plan produit :\n${lcwViolations.map(v => `> - ${v}`).join("\n")}\n> _Régénérer le plan ou corriger manuellement les semaines Build/Peak concernées._\n\n`;
                  controller.enqueue(
                    encoder.encode(`data: {"choices":[{"delta":{"content":${JSON.stringify(lcwBanner)}}}]}\n\n`),
                  );
                } else {
                  console.log(`✅ Compliance LCW OK : swimFri=${swimFri} bikeSat=${bikeSat} runSun=${runSun} recharge=${recharge} backToBack=${backToBack}`);
                }
              }
            } catch (lcwErr) {
              console.warn("LCW compliance check failed:", lcwErr);
            }

            // Send final [DONE]
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (e) {
            console.error("Chunked generation error:", e);
            controller.error(e);
          }
        },
      });


      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // === SINGLE GENERATION for short plans / regenerateWeek ===
    // FIX: Inject race week obligation for single-gen plans too
    let singleGenPrompt = userPrompt;
    if (!regenerateWeek && planConfig?.raceGoals && planConfig.raceGoals.length > 0) {
      const raceGoalReminders: string[] = [];
      for (const goal of planConfig.raceGoals) {
        if (!goal.raceDate || !planConfig.planStartDate) continue;
        const startMs = parseIsoDateUtc(planConfig.planStartDate);
        const raceMs = parseIsoDateUtc(goal.raceDate);
        if (startMs === undefined || raceMs === undefined) continue;
        const days = Math.round((raceMs - startMs) / (24 * 3600 * 1000));
        const goalWeek = days >= 0 ? Math.floor(days / 7) + 1 : 0;
        if (goalWeek >= 1 && goalWeek <= totalWeeks) {
          const prio = goal.priority === "A" ? "🅰️" : goal.priority === "B" ? "🅱️" : "🆎";
          raceGoalReminders.push(`${prio} ${goal.objective || goal.raceName || "Course"} : S${goalWeek} DOIT inclure "🏁 COURSE OBJECTIF" le ${goal.raceDate}. Minimum 5 séances réelles. Race Week complète obligatoire.`);
        }
      }
      if (raceGoalReminders.length > 0) {
        singleGenPrompt += `\n\n🚨 RACE WEEK OBLIGATION (PRIORITÉ ABSOLUE) :\n${raceGoalReminders.join("\n")}`;
      }
    }
    singleGenPrompt += wbalReminder;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: singleGenPrompt },
        ],
        stream: true,
        max_tokens: 65536,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit dépassé, réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoutez des crédits dans les paramètres." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-training-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

