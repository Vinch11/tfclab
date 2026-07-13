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
    (stat.sportObjectiveCriticalIssues ? ` issues=${stat.sportObjectiveCriticalIssues}` : ""),
  );
}

export function clearPlanStats(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// ─── Feature flag JSON beta (admin/self opt-in) ──────────────────────────────
const FLAG_KEY = "tfcl:plan_json_beta";
export function isJsonBetaEnabled(): boolean {
  try { return localStorage.getItem(FLAG_KEY) === "1"; } catch { return false; }
}
export function setJsonBetaEnabled(v: boolean): void {
  try {
    if (v) localStorage.setItem(FLAG_KEY, "1");
    else localStorage.removeItem(FLAG_KEY);
  } catch { /* ignore */ }
}
