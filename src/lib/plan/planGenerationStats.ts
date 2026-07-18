/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 1B — Observability : plan generation stats
 * ═══════════════════════════════════════════════════════════════════════════════
 * Persistés en localStorage (rolling last 50). Consommés par /debug/plan-qa
 * pour valider la fiabilité du chemin JSON avant Phase 1C (suppression du
 * parser Markdown).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export interface PlanGatewayDiagnostic {
  model?: string;
  responseFormatType?: string;
  jsonSchemaName?: string;
  constrained?: boolean;
  jsonSchemaAttempted?: boolean;
  fallbackReason?: string;
  gatewayIndicatedIgnoredResponseFormat?: boolean;
}

export interface PlanSchemaFailDetails {
  chunkIndex?: number;
  zodIssues?: Array<{ path: string; message: string; code?: string }>;
  zodErrorText?: string;
  rawFirst800?: string;
  rawLast400?: string;
  rawLength?: number;
  unwrapped?: boolean;
  unwrapMethod?: string;
  parseError?: string;
  repairs?: string[];
  finishReason?: string;
  gateway?: PlanGatewayDiagnostic;
  attempts?: Array<{
    attempt?: number;
    finishReason?: string;
    rawLength?: number;
    rawFirst800?: string;
    rawLast400?: string;
    unwrapped?: boolean;
    unwrapMethod?: string;
    parseError?: string;
    repairs?: string[];
    zodIssues?: Array<{ path: string; message: string; code?: string }>;
    zodErrorText?: string;
    gateway?: PlanGatewayDiagnostic;
  }>;
}

export interface PlanGenerationStat {
  ts: number;                                // epoch ms
  format: "json" | "markdown" | "markdown-fallback-from-json";
  objective: string | null;
  totalWeeks: number | null;
  totalChunks: number | null;
  durationMs: number;
  ok: boolean;
  errorCode?: string;
  errorMessage?: string;
  schemaFailDetails?: PlanSchemaFailDetails;
  sportObjectiveCriticalIssues?: number;
  /** Ratio de séances custom sur les sessions non-rest (0..1). Cible < 0.20. */
  customRatio?: number;
  /** Nombre de sessions non-rest (dénominateur du ratio). */
  nonRestSessionCount?: number;
  /** Nombre de sessions custom non-rest (numérateur). */
  customSessionCount?: number;
  /** Repairs/warnings déterministes non-Zod (ex: B3 substituted_offsport). */
  semanticRepairs?: string[];
  /** Nombre de catalogId substitués vers un voisin réel du catalogue injecté (Reco 3). */
  catalogSubstitutions?: number;

}

const KEY = "tfcl:plan_gen_stats";
const MAX = 50;

export function readPlanStats(): PlanGenerationStat[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(-MAX) : [];
  } catch { return []; }
}

export function logPlanStat(stat: PlanGenerationStat): void {
  try {
    const cur = readPlanStats();
    cur.push(stat);
    const trimmed = cur.slice(-MAX);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
  const tag = stat.ok ? "✅" : "❌";
  const ratioStr = typeof stat.customRatio === "number"
    ? ` custom=${Math.round(stat.customRatio * 100)}%(${stat.customSessionCount ?? "?"}/${stat.nonRestSessionCount ?? "?"})`
    : "";
  // eslint-disable-next-line no-console
  console.info(
    `${tag} [plan-stats] fmt=${stat.format} obj="${stat.objective}" weeks=${stat.totalWeeks} chunks=${stat.totalChunks} dur=${stat.durationMs}ms${ratioStr}` +
    (stat.errorCode ? ` err=${stat.errorCode}` : "") +
    (stat.sportObjectiveCriticalIssues ? ` issues=${stat.sportObjectiveCriticalIssues}` : "") +
    (stat.semanticRepairs?.length ? ` semanticRepairs=${stat.semanticRepairs.length}` : ""),
  );
  // Mirror non-PII vers Cloud (sentinelle légère /debug/plan-qa). Fire-and-forget.
  void persistPlanStatToCloud(stat).catch(() => { /* ignore */ });
}

async function persistPlanStatToCloud(stat: PlanGenerationStat): Promise<void> {
  try {
    // Lazy import pour ne pas alourdir le bundle si non utilisé côté SSR/tests.
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id ?? null;
    if (!userId) return; // pas de session → pas de mirror
    const repairs = stat.semanticRepairs ?? [];
    const substituted = repairs.filter(r => r.includes("substituted_offsport")).length;
    const unresolved = repairs.filter(r => r.includes("offsport_unresolved")).length;
    const retryCount = stat.schemaFailDetails?.attempts?.length ?? 0;
    await supabase.from("plan_generation_stats").insert({
      ts: new Date(stat.ts).toISOString(),
      user_id: userId,
      format: stat.format,
      ok: stat.ok,
      objective: stat.objective,
      total_weeks: stat.totalWeeks,
      total_chunks: stat.totalChunks,
      duration_ms: stat.durationMs,
      error_code: stat.errorCode ?? null,
      custom_ratio: typeof stat.customRatio === "number" ? stat.customRatio : null,
      substituted_offsport_count: substituted,
      offsport_unresolved_count: unresolved,
      retry_count: retryCount,
      semantic_repairs: repairs.length > 0 ? repairs : null,
    });
  } catch { /* ignore */ }
}

export function clearPlanStats(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// ─── Feature flags — Phase 1C-A ──────────────────────────────────────────────
// Le chemin JSON est le DÉFAUT PROD. Le toggle admin "Forcer Markdown" permet
// de rebrancher explicitement le chemin Markdown legacy pour debug/diagnostic.
const FORCE_MARKDOWN_KEY = "tfcl:plan_force_markdown";
const LEGACY_JSON_BETA_KEY = "tfcl:plan_json_beta";

/** Retourne true si l'utilisateur a explicitement forcé le chemin Markdown (debug). */
export function isForceMarkdownEnabled(): boolean {
  try { return localStorage.getItem(FORCE_MARKDOWN_KEY) === "1"; } catch { return false; }
}
export function setForceMarkdownEnabled(v: boolean): void {
  try {
    if (v) localStorage.setItem(FORCE_MARKDOWN_KEY, "1");
    else localStorage.removeItem(FORCE_MARKDOWN_KEY);
  } catch { /* ignore */ }
}

/** JSON = défaut prod. On ne renvoie false QUE si Force-Markdown est actif. */
export function isJsonBetaEnabled(): boolean {
  return !isForceMarkdownEnabled();
}
export function setJsonBetaEnabled(v: boolean): void {
  // Compat rétro : setJsonBetaEnabled(true) désactive le forçage Markdown ;
  // setJsonBetaEnabled(false) l'active. Nettoie l'ancienne clé legacy.
  try { localStorage.removeItem(LEGACY_JSON_BETA_KEY); } catch { /* ignore */ }
  setForceMarkdownEnabled(!v);
}

