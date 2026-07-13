/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 1B — Observability : plan generation stats
 * ═══════════════════════════════════════════════════════════════════════════════
 * Persistés en localStorage (rolling last 50). Consommés par /debug/plan-qa
 * pour valider la fiabilité du chemin JSON avant Phase 1C (suppression du
 * parser Markdown).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
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
  sportObjectiveCriticalIssues?: number;
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
  // eslint-disable-next-line no-console
  console.info(
    `${tag} [plan-stats] fmt=${stat.format} obj="${stat.objective}" weeks=${stat.totalWeeks} chunks=${stat.totalChunks} dur=${stat.durationMs}ms` +
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
