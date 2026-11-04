/**
 * Contrôle HORS LIGNE de la sortie DET vers le PDF imprimable et vers Nolio.
 *
 * - Ne fait AUCUNE requête (ni Nolio, ni backend) et n'écrit rien.
 * - Ne modifie jamais la prescription : aucune allure / aucun plancher ajusté,
 *   aucun texte tronqué pour « faire passer » l'export.
 * - Un verdict PDF « conforme » prouve seulement que le HTML imprimable
 *   contient les éléments prescrits ; il ne prouve pas l'impression réelle.
 * - Nolio : le transformateur réel est écrit en ligne dans le gestionnaire
 *   `Deno.serve` de `supabase/functions/nolio-send-plan/index.ts` et dépend de
 *   lectures en base (overrides, structures générées, références athlète).
 *   Il n'est pas importable hors ligne : le verdict Nolio est donc BLOCKED,
 *   avec les incompatibilités déjà démontrables depuis les règles du code
 *   source de l'expéditeur. Un test de payload ne prouverait pas l'envoi réel.
 */

export interface DetSessionLike {
  weekNumber: number;
  dayIndex: number;
  dayName?: string;
  sport: string;
  title: string;
  details: string;
  isRest: boolean;
  durationMin?: number;
  catalogId?: string | null;
  structure?: unknown;
  structuredWorkout?: unknown;
  noStructuredWorkout?: boolean;
}

export interface DetPlanLike {
  weeks: Array<{ weekNumber: number; sessions: DetSessionLike[] }>;
}

export interface DetEngineResultLike {
  status: "refused" | "candidate";
  reason?: string;
  constraintsSatisfied: boolean;
  sportingRelevance: string;
  humanReviewRequired: boolean;
  candidate?: DetPlanLike;
  issues: Array<{ code: string; week?: number; severity: string; message?: string }>;
}

export interface PrescriptionTokens {
  repetitions: string[];
  recoveries: string[];
  targets: string[];
  durations: string[];
}

export interface DetSessionExpectation {
  key: string;
  weekNumber: number;
  dayIndex: number;
  /** YYYY-MM-DD, même formule que l'expéditeur Nolio (start + (S-1)*7 + jour). */
  date: string | null;
  sport: string;
  title: string;
  /** Instructions source complètes (comparées bloc par bloc, pas par regex seules). */
  details: string;
  durationMin: number | null;
  catalogId: string | null;
  tokens: PrescriptionTokens;
  hasStructure: boolean;
  hasStructuredWorkout: boolean;
}

export interface Incompatibility {
  channel: "engine" | "pdf" | "nolio";
  code: string;
  sessionKey?: string;
  detail: string;
}

export type ChannelVerdict = "CONFORME_HTML" | "INCOMPATIBLE" | "BLOCKED" | "REFUSED";

export interface DetExportConformityReport {
  engine: { status: "candidate" | "refused"; reason: string | null; constraintsSatisfied: boolean };
  /** Toujours false : la sortie DET reste un candidat de laboratoire sans revue coach réelle. */
  prescriptionReleased: false;
  sessions: DetSessionExpectation[];
  pdf: { verdict: ChannelVerdict; checked: boolean };
  nolio: { verdict: "BLOCKED" | "REFUSED"; requestsSent: 0; missingPath: string[] };
  incompatibilities: Incompatibility[];
  overall: "REFUSED" | "INCOMPATIBLE" | "BLOCKED";
}

const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean))];

/** Extraction littérale (sans interprétation) des éléments chiffrés du texte. */
export function extractPrescriptionTokens(text: string): PrescriptionTokens {
  const t = text ?? "";
  const all = (re: RegExp) => uniq([...t.matchAll(re)].map((m) => m[0]));
  return {
    repetitions: all(/\b\d+\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:min|s|sec|m|km|h)?\b/gi),
    recoveries: all(/r[ée]cup(?:[ée]ration)?\.?\s*:?\s*\d+(?:[.,]\d+)?\s*(?:min|s|sec|')/gi),
    targets: all(/\bZ[1-7](?:\s*[-–]\s*Z?[1-7])?\b|\b\d{2,3}(?:\s*[-–]\s*\d{2,3})?\s*%\s*(?:VMA|FTP|CSS|FCmax|FC|seuil)?|\b\d{2,4}\s*W\b|\b\d{1,2}:\d{2}\s*\/\s*(?:km|100\s*m)|\bRPE\s*\d+(?:\s*[-–]\s*\d+)?/gi),
    durations: all(/\b\d+(?:[.,]\d+)?\s*(?:min|h)\b/gi),
  };
}

export function addDaysYMD(startYMD: string, days: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startYMD);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildDetExpectations(plan: DetPlanLike, planStartDate: string): DetSessionExpectation[] {
  const out: DetSessionExpectation[] = [];
  for (const w of plan.weeks) {
    w.sessions.forEach((s, i) => {
      if (s.isRest) return;
      const valid = Number.isFinite(s.weekNumber) && Number.isInteger(s.dayIndex) && s.dayIndex >= 0 && s.dayIndex <= 6;
      out.push({
        key: `S${s.weekNumber}-J${s.dayIndex}-${i}`,
        weekNumber: s.weekNumber,
        dayIndex: s.dayIndex,
        date: valid ? addDaysYMD(planStartDate, (s.weekNumber - 1) * 7 + s.dayIndex) : null,
        sport: s.sport,
        title: s.title,
        details: s.details ?? "",
        durationMin: typeof s.durationMin === "number" && Number.isFinite(s.durationMin) && s.durationMin > 0 ? s.durationMin : null,
        catalogId: s.catalogId ?? null,
        tokens: extractPrescriptionTokens(s.details),
        hasStructure: Array.isArray(s.structure) && s.structure.length > 0,
        hasStructuredWorkout: Array.isArray(s.structuredWorkout) && s.structuredWorkout.length > 0,
      });
    });
  }
  return out;
}

/** Texte visible d'un HTML imprimable (balises retirées, entités décodées). */
export function htmlToVisibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

/** Date affichée par le PDF (même format fr-FR que `formatSessionDate`). */
export function pdfDateLabel(planStartDate: string, weekNumber: number, dayIndex: number): string | null {
  const ymd = addDaysYMD(planStartDate, (weekNumber - 1) * 7 + dayIndex);
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Forme comparable d'une instruction : marqueurs de liste (« 1) », « • »)
 * et gras Markdown retirés (le PDF les rend en <ol>/<ul>/<strong>), puis
 * TOUT espace supprimé. Le reste du texte doit être identique caractère
 * pour caractère : aucune tolérance sur les chiffres, zones ou consignes.
 */
export function instructionFingerprint(text: string): string {
  return (text ?? "")
    .replace(/\*\*/g, "")
    .replace(/(^|\s)\d+\)\s/g, " ")
    .replace(/(^|\s)•\s/g, " ")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** Titre tel que le PDF l'affiche : tags « [..] » de tête retirés (rendus en badges). */
function displayTitle(raw: string): string {
  let t = (raw ?? "").trim();
  for (;;) {
    const m = /^\[[^\]]*\]\s*/.exec(t);
    if (!m) break;
    t = t.slice(m[0].length);
  }
  return t.trim() || (raw ?? "").trim();
}

interface RenderedBlock { key: string; rest: boolean; regions: Map<string, string[]>; }

function parseBlocks(html: string): RenderedBlock[] | null {
  if (typeof DOMParser === "undefined") return null;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: RenderedBlock[] = [];
  doc.querySelectorAll("[data-session-key]").forEach((el) => {
    const regions = new Map<string, string[]>();
    el.querySelectorAll("[data-src]").forEach((r) => {
      // Une région source imbriquée dans un bloc d'information ne compte pas.
      if (r.closest('[data-role="info"]')) return;
      if (r.closest("[data-session-key]") !== el) return;
      const k = r.getAttribute("data-src")!;
      regions.set(k, [...(regions.get(k) ?? []), r.textContent ?? ""]);
    });
    out.push({ key: el.getAttribute("data-session-key")!, rest: el.getAttribute("data-rest") === "true", regions });
  });
  return out;
}

/**
 * Contrôle PAR SÉANCE : chaque séance DET doit correspondre à UN seul bloc
 * rendu (clé semaine/jour/index), dans l'ordre source, et ce bloc précis doit
 * porter sa date, son titre, son id catalogue, sa durée et ses instructions
 * complètes. Les fiches catalogue et alternatives (`data-role="info"`) sont
 * ignorées : elles ne peuvent jamais « fournir » un élément manquant.
 * Ne prouve qu'un HTML ; pas une impression réelle.
 */
export function checkPdfHtml(
  sessions: DetSessionExpectation[],
  html: string,
  planStartDate: string,
): Incompatibility[] {
  const issues: Incompatibility[] = [];
  const blocks = parseBlocks(html);
  if (!blocks) return [{ channel: "pdf", code: "pdf_parser_unavailable", detail: "DOMParser indisponible : contrôle impossible" }];
  const byKey = new Map<string, RenderedBlock[]>();
  for (const b of blocks) byKey.set(b.key, [...(byKey.get(b.key) ?? []), b]);
  const expectedKeys = new Set(sessions.map((s) => s.key));
  for (const b of blocks) {
    if (!b.rest && !expectedKeys.has(b.key)) issues.push({ channel: "pdf", code: "pdf_session_unexpected", sessionKey: b.key, detail: "bloc rendu sans séance source" });
  }
  const renderedOrder = blocks.filter((b) => expectedKeys.has(b.key)).map((b) => b.key);
  const expectedOrder = sessions.map((s) => s.key).filter((k) => (byKey.get(k)?.length ?? 0) === 1);
  const dedupOrder = renderedOrder.filter((k) => (byKey.get(k)?.length ?? 0) === 1);
  if (dedupOrder.join("|") !== expectedOrder.join("|")) {
    issues.push({ channel: "pdf", code: "pdf_session_order", detail: "ordre des blocs différent de l'ordre source" });
  }
  const one = (b: RenderedBlock, k: string): string | null => {
    const v = b.regions.get(k);
    return v && v.length === 1 ? v[0] : v && v.length > 1 ? "\u0000MULTI" : null;
  };
  for (const s of sessions) {
    const found = byKey.get(s.key) ?? [];
    if (found.length === 0) { issues.push({ channel: "pdf", code: "pdf_session_missing", sessionKey: s.key, detail: "aucun bloc rendu" }); continue; }
    if (found.length > 1) { issues.push({ channel: "pdf", code: "pdf_session_duplicated", sessionKey: s.key, detail: `${found.length} blocs` }); continue; }
    const b = found[0];
    const push = (code: string, detail: string) => issues.push({ channel: "pdf", code, sessionKey: s.key, detail });

    const label = pdfDateLabel(planStartDate, s.weekNumber, s.dayIndex);
    const date = one(b, "date");
    if (!label || date == null || norm(date) !== norm(label)) push("pdf_date_divergent", `attendu ${label ?? "invalide"}`);

    const title = one(b, "title");
    if (title == null || norm(title) !== norm(displayTitle(s.title))) push("pdf_title_divergent", "titre du bloc ≠ titre source");

    const cid = one(b, "catalog-id");
    if (s.catalogId && (cid == null || cid.trim() !== s.catalogId)) push("pdf_catalog_id_divergent", `attendu ${s.catalogId}`);

    const dur = one(b, "duration");
    if (s.durationMin == null) {
      push("det_duration_absent", "durée DET absente : le PDF n'en invente pas");
      if (dur != null) push("pdf_duration_invented", "durée rendue sans durée source");
    } else if (dur == null || norm(dur) !== norm(`Durée : ${s.durationMin} min`)) {
      push("pdf_duration_divergent", `attendu ${s.durationMin} min`);
    }

    const det = one(b, "details");
    if (det == null) {
      push("pdf_instructions_missing", "instructions absentes du bloc");
    } else {
      if (instructionFingerprint(det) !== instructionFingerprint(s.details)) push("pdf_instructions_divergent", "instructions du bloc ≠ instructions source");
      const t = norm(det);
      for (const kind of ["repetitions", "recoveries", "targets"] as const) {
        for (const tok of s.tokens[kind]) if (!t.includes(norm(tok))) push(`pdf_${kind}_missing`, tok);
      }
    }
  }
  return issues;
}

/** Chemin manquant pour un contrôle Nolio réel hors ligne. */
export const NOLIO_MISSING_PATH = [
  "Préflight V2 pur disponible : supabase/functions/_shared/nolioV2/plannedMapper.ts (affiché par /__qa/pilot-review, références synthétiques, aucune requête).",
  "Statut réel : BLOCKED_CONNECTION_NOT_CONFIGURED — magasin nolio_v2_connections vide ; écran OAuth V2 + callback QA et écriture serveur du magasin non construits.",
  "Une validation locale ne prouve ni un dry_run serveur ni un envoi réel.",
];

/**
 * LEGACY V1 — non utilisé pour l'état de préparation Nolio actuel (voie V2).
 * Incompatibilités Nolio démontrables depuis les règles source de l'expéditeur
 * (sans l'exécuter) : sans `structure`/`structuredWorkout` ni override en base,
 * l'expéditeur n'envoie ni `duration` ni `structured_workout` (texte seul).
 */
export function nolioStaticIncompatibilities(sessions: DetSessionExpectation[]): Incompatibility[] {
  const out: Incompatibility[] = [];
  for (const s of sessions) {
    if (s.date == null) {
      out.push({ channel: "nolio", code: "nolio_session_skipped_invalid_day", sessionKey: s.key, detail: "semaine/jour invalide : l'expéditeur saute la séance" });
      continue;
    }
    if (!s.hasStructure && !s.hasStructuredWorkout) {
      out.push({
        channel: "nolio",
        code: "nolio_no_structure_duration_and_steps_dropped",
        sessionKey: s.key,
        detail: `durée ${s.durationMin ?? "?"} min, ${s.tokens.repetitions.length} répétition(s), ${s.tokens.recoveries.length} récupération(s), ${s.tokens.targets.length} cible(s) : seulement dans la description texte`,
      });
    }
  }
  return out;
}

export function checkDetExportConformity(input: {
  engineResult: DetEngineResultLike;
  planStartDate: string;
  /** HTML réellement produit par l'export PDF (capturé hors ligne). */
  pdfHtml?: string | null;
}): DetExportConformityReport {
  const { engineResult: r, planStartDate } = input;
  const engine = { status: r.status, reason: r.reason ?? null, constraintsSatisfied: r.constraintsSatisfied };
  if (r.status !== "candidate" || !r.candidate) {
    // Refus DET : affiché tel quel, aucune bascule vers un autre moteur.
    return {
      engine, prescriptionReleased: false, sessions: [],
      pdf: { verdict: "REFUSED", checked: false },
      nolio: { verdict: "REFUSED", requestsSent: 0, missingPath: NOLIO_MISSING_PATH },
      incompatibilities: [{ channel: "engine", code: `det_refused_${r.reason ?? "unknown"}`, detail: "DET a refusé : aucun export" }],
      overall: "REFUSED",
    };
  }
  const sessions = buildDetExpectations(r.candidate, planStartDate);
  const incompatibilities: Incompatibility[] = [];
  if (!r.constraintsSatisfied) {
    incompatibilities.push({ channel: "engine", code: "det_constraints_not_satisfied", detail: r.issues.map((i) => i.code).slice(0, 20).join(",") });
  }
  let pdf: DetExportConformityReport["pdf"] = { verdict: "BLOCKED", checked: false };
  if (typeof input.pdfHtml === "string") {
    const p = checkPdfHtml(sessions, input.pdfHtml, planStartDate);
    incompatibilities.push(...p);
    pdf = { verdict: p.length === 0 ? "CONFORME_HTML" : "INCOMPATIBLE", checked: true };
  } else {
    incompatibilities.push({ channel: "pdf", code: "pdf_html_not_provided", detail: "aucun HTML d'export fourni" });
  }
  // Les règles statiques V1 (nolioStaticIncompatibilities) ne décrivent plus la
  // préparation Nolio : la voie cible est le mapper pur V2 ; seul le blocage de connexion reste.
  incompatibilities.push({ channel: "nolio", code: "nolio_v2_connection_not_configured", detail: "préflight V2 pur disponible hors ligne ; aucune connexion V2 configurée, aucune requête" });
  return {
    engine, prescriptionReleased: false, sessions, pdf,
    nolio: { verdict: "BLOCKED", requestsSent: 0, missingPath: NOLIO_MISSING_PATH },
    incompatibilities,
    overall: pdf.verdict === "INCOMPATIBLE" || !r.constraintsSatisfied ? "INCOMPATIBLE" : "BLOCKED",
  };
}
