/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Phase 0 — Verdict engine + report builder + localStorage persistence QA
 * ═══════════════════════════════════════════════════════════════════════════════
 * Verdict logic (spec coach) :
 *  🟢 = 0 fallback Markdown ET aucun chunk ≥2 retries Zod ET 0 issue critical
 *        (B2/B3/B4/B5/B6) ET tests du merge verts
 *  🟠 = retries ponctuels (1, non récurrents) mais 0 fallback, 0 critical
 *  🔴 = ≥1 fallback OU retry récurrent sur un même format OU ≥1 critical
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { CheckResult } from "./checks";
import type { PlanGenerationStat } from "@/lib/plan/planGenerationStats";
import type { TestResult } from "@/lib/plan/mergeTests";

export type Verdict = "🟢" | "🟠" | "🔴";

export interface QARunRecord {
  ts: number;
  profileId: "B-70.3" | "B-SEMI" | "B-SPRINT";
  runIndex: number;                 // 1..N
  totalRuns: number;                // N choisi
  checks: CheckResult[];
  stat?: PlanGenerationStat;
  errorMessage?: string;
  errorStack?: string;              // tronqué 500 chars
  durationMs: number;
}

export interface QASession {
  ts: number;
  n: number;                        // runs par profil
  runs: QARunRecord[];
  mergeTests: TestResult[] | null;
  mergeTestsError?: string;         // raison si mergeTests=null
  verdict: Verdict;
  summary: string;                  // ligne-titre du verdict
}

// ── Verdict compute ─────────────────────────────────────────────────────────

const CRITICAL_IDS = new Set(["B2", "B3", "B4", "B5", "B6"]);

/** Compte les retries Zod du run (max attempt observé sur les chunks). */
function retriesOf(stat?: PlanGenerationStat): number {
  const attempts = stat?.schemaFailDetails?.attempts;
  if (!attempts || attempts.length === 0) return 0;
  return Math.max(...attempts.map(a => (a.attempt ?? 1) - 1));
}

export function computeVerdict(runs: QARunRecord[], mergeTests: TestResult[] | null): { verdict: Verdict; summary: string } {
  let fallbackCount = 0;
  let criticalCount = 0;
  const retriesByProfile: Record<string, number[]> = {};

  for (const r of runs) {
    if (r.stat?.format === "markdown-fallback-from-json") fallbackCount++;
    if (r.stat && !r.stat.ok && r.stat.format === "json") fallbackCount++;
    const retries = retriesOf(r.stat);
    (retriesByProfile[r.profileId] ??= []).push(retries);
    for (const c of r.checks) {
      if (CRITICAL_IDS.has(c.id) && c.level === "critical" && !c.pass) criticalCount++;
    }
  }

  const mergeFailed = (mergeTests ?? []).some(t => !t.pass);
  const anyChunkTwoPlusRetries = runs.some(r => retriesOf(r.stat) >= 2);
  const recurrentRetry = Object.values(retriesByProfile).some(arr => arr.filter(n => n >= 1).length >= 2);

  if (fallbackCount > 0 || criticalCount > 0 || recurrentRetry) {
    return {
      verdict: "🔴",
      summary: `🔴 ${fallbackCount} fallback · ${criticalCount} critical · retry récurrent=${recurrentRetry ? "oui" : "non"}`,
    };
  }
  if (anyChunkTwoPlusRetries || mergeFailed) {
    return {
      verdict: "🔴",
      summary: `🔴 retry ≥2 sur un chunk (${anyChunkTwoPlusRetries}) · merge tests failed=${mergeFailed}`,
    };
  }
  const anyRetry = runs.some(r => retriesOf(r.stat) >= 1);
  if (anyRetry) {
    return { verdict: "🟠", summary: "🟠 retries ponctuels (isolés), 0 fallback, 0 critical" };
  }
  return { verdict: "🟢", summary: "🟢 0 fallback · 0 retry · 0 critical" };
}

// ── Markdown report builder ─────────────────────────────────────────────────

function fmtCheck(c: CheckResult): string {
  const icon = c.pass ? "✅" : c.level === "critical" ? "🔴" : "🟠";
  const bullets = c.details.map(d => `    - ${d}`).join("\n");
  return `- ${icon} **${c.id}** ${c.label}\n${bullets}`;
}

function fmtRawSnippets(stat?: PlanGenerationStat): string {
  const d = stat?.schemaFailDetails;
  if (!d) return "";
  return [
    "",
    "```",
    "── RAW FIRST 800 ──",
    d.rawFirst800 ?? "—",
    "── RAW LAST 400 ──",
    d.rawLast400 ?? "—",
    "```",
  ].join("\n");
}

function fmtZodIssues(stat?: PlanGenerationStat): string {
  const issues = stat?.schemaFailDetails?.zodIssues ?? [];
  if (issues.length === 0) return "_pas d'issue Zod verbatim_";
  return issues.slice(0, 20).map(i => `  - \`${i.path}\` — ${i.message}`).join("\n");
}

export function buildQAReport(session: QASession): string {
  const lines: string[] = [];
  lines.push(`# QA Génération JSON — ${session.verdict}`);
  lines.push(`_${new Date(session.ts).toISOString()}_`);
  lines.push("");
  lines.push(`**Verdict** : ${session.summary}`);
  lines.push(`**Runs** : ${session.n} × 3 profils = ${session.runs.length} générations`);
  lines.push("");

  // Merge tests summary
  if (session.mergeTests) {
    const ok = session.mergeTests.filter(t => t.pass).length;
    lines.push(`## Merge tests`);
    lines.push(`${ok}/${session.mergeTests.length} passing`);
    for (const t of session.mergeTests) {
      lines.push(`- ${t.pass ? "✅" : "❌"} ${t.name}${!t.pass ? ` — ${t.error}` : ""}`);
    }
    lines.push("");
  }

  // Per profile / per run
  const byProfile = new Map<string, QARunRecord[]>();
  for (const r of session.runs) {
    if (!byProfile.has(r.profileId)) byProfile.set(r.profileId, []);
    byProfile.get(r.profileId)!.push(r);
  }
  for (const [pid, runs] of byProfile) {
    lines.push(`## Profil ${pid}`);
    for (const r of runs) {
      const critFails = r.checks.filter(c => c.level === "critical" && !c.pass);
      const status = r.errorMessage ? "🔴 ÉCHEC" : critFails.length > 0 ? "🔴 CRITICAL" : "🟢 OK";
      lines.push(`\n### Run ${r.runIndex}/${r.totalRuns} — ${status} (${(r.durationMs / 1000).toFixed(1)}s)`);
      if (r.errorMessage) {
        lines.push(`> ⚠️ ${r.errorMessage}`);
      }
      if (r.stat) {
        lines.push(`- format=${r.stat.format} · chunks=${r.stat.totalChunks ?? "?"} · retries≥1=${retriesOf(r.stat)}`);
      }
      for (const c of r.checks) lines.push(fmtCheck(c));
      // If critical fail or format!=json, include Zod issues + raw
      if (critFails.length > 0 || (r.stat && r.stat.format !== "json")) {
        lines.push("");
        lines.push("**Diagnostic verbatim**");
        lines.push(fmtZodIssues(r.stat));
        lines.push(fmtRawSnippets(r.stat));
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ── LocalStorage persistence ────────────────────────────────────────────────

const QA_KEY = "tfcl:plan_qa_sessions";
const MAX_SESSIONS = 20;

export function readQASessions(): QASession[] {
  try {
    const raw = localStorage.getItem(QA_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(-MAX_SESSIONS) : [];
  } catch { return []; }
}

export function saveQASession(session: QASession): void {
  try {
    const cur = readQASessions();
    cur.push(session);
    const trimmed = cur.slice(-MAX_SESSIONS);
    localStorage.setItem(QA_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

export function clearQASessions(): void {
  try { localStorage.removeItem(QA_KEY); } catch { /* ignore */ }
}
