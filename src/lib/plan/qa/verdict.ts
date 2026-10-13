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
import type { QAProfileId } from "./syntheticProfiles";

export type Verdict = "🟢" | "🟠" | "🔴";

export interface QARunRecord {
  ts: number;
  profileId: QAProfileId;
  runIndex: number;                 // 1..N
  totalRuns: number;                // N choisi
  checks: CheckResult[];
  stat?: PlanGenerationStat;
  errorMessage?: string;
  errorStack?: string;              // tronqué 500 chars
  durationMs: number;
  /**
   * Priorité 3 (audit scientifique P0, lot Performance Validation Lab) :
   * résultat de `validatePlan()` — la MÊME fonction, avec les MÊMES
   * arguments disponibles, que celle appelée à la sauvegarde réelle par le
   * coach (`AITrainingPlanPage.tsx::handleSaveToPlan`). Les profils
   * synthétiques n'ont pas de contexte diagnostic coach (prohibitions,
   * identifiedLimiters, injuryRisk, coachLimiterOrder) — ces paramètres
   * sont omis (undefined), pas simulés : `validatorResult` reste fidèle à
   * ce que `validatePlan` produit RÉELLEMENT avec les données disponibles,
   * jamais une logique de validation réécrite séparément pour la QA.
   */
  validatorResult?: {
    score: number;
    grade: string;
    criticalIssueCount: number;
    criticalIssues: Array<{ rule: string; message: string; week?: number }>;
  };
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

// Audit scientifique P0 — F12 : B13 (dédoublonnage/cumul "à jeun"
// post-mutations) ajouté — c'est un invariant de sécurité, pas un simple
// avertissement. B14 (cohérence phase/fiche) reste volontairement HORS de
// cette liste — son propre `level: "warning"` (checkB14.ts) le dit déjà.
const CRITICAL_IDS = new Set(["B2", "B3", "B4", "B5", "B6", "B8", "B9", "B10", "B11", "B13"]);

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
    // Priorité 3 : les critiques de `validatePlan` (règles planValidator.ts
    // — polarisation, pattern charge/décharge, catalogue, race day...) sont
    // un domaine de règles DISTINCT des checks B1-B14 (JSON/réconciliateur),
    // jamais un recalcul de la même chose — comptées en plus, pas à la
    // place. Si une vraie redondance est un jour observée en pratique sur
    // un corpus réel, elle devra être dédupliquée ICI explicitement, pas
    // supposée absente par construction.
    if (r.validatorResult && r.validatorResult.criticalIssueCount > 0) {
      criticalCount += r.validatorResult.criticalIssueCount;
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

// ── Verdict explicite PAR PLAN (Priorité 4, demande explicite du coach) ────
// Distinct de `computeVerdict` ci-dessus, qui agrège TOUTE une campagne
// (N runs × plusieurs profils) en un seul verdict de session. Ici : un
// verdict + une liste précise de problèmes pour CHAQUE plan généré,
// individuellement. Aucun seuil de "fiabilité" n'est inventé ici — les
// trois libellés décrivent un ÉTAT CONSTATÉ (quels checks ont échoué, à
// quel niveau), jamais un score de confiance global.
export type ExplicitPlanVerdict = "conforme" | "nécessite une validation coach" | "non conforme";

export interface PlanVerdictReport {
  verdict: ExplicitPlanVerdict;
  problems: string[]; // vide si "conforme"
}

/** Un seul plan (un `QARunRecord`) → verdict explicite + problèmes précis. */
export function explainRun(run: QARunRecord): PlanVerdictReport {
  const problems: string[] = [];
  let hasCritical = false;
  let hasWarningOrRetry = false;

  if (run.errorMessage) {
    hasCritical = true;
    problems.push(`Génération échouée : ${run.errorMessage}`);
  }
  if (run.stat?.format === "markdown-fallback-from-json") {
    hasCritical = true;
    problems.push("Repli silencieux vers le format Markdown legacy (chemin JSON a échoué).");
  }
  const retries = retriesOf(run.stat);
  if (retries >= 2) {
    hasCritical = true;
    problems.push(`${retries} tentatives de correction Zod sur un même bloc (seuil critique : ≥2).`);
  } else if (retries === 1) {
    hasWarningOrRetry = true;
    problems.push("1 tentative de correction Zod isolée (non récurrente).");
  }
  for (const c of run.checks) {
    if (c.pass) continue;
    const prefix = `[${c.id}] ${c.label}`;
    if (c.level === "critical") {
      hasCritical = true;
      problems.push(`${prefix} — ${c.details[0] ?? "échec"}`);
    } else if (c.level === "warning") {
      hasWarningOrRetry = true;
      problems.push(`${prefix} (avertissement) — ${c.details[0] ?? "échec"}`);
    }
  }
  if (run.validatorResult && run.validatorResult.criticalIssueCount > 0) {
    hasCritical = true;
    for (const vi of run.validatorResult.criticalIssues) {
      problems.push(`[validatePlan${vi.week ? ` S${vi.week}` : ""}] ${vi.rule} — ${vi.message}`);
    }
  }

  const verdict: ExplicitPlanVerdict = hasCritical
    ? "non conforme"
    : hasWarningOrRetry
      ? "nécessite une validation coach"
      : "conforme";
  return { verdict, problems };
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

  // Merge tests summary (always present, never null in the report)
  lines.push(`## Merge tests`);
  if (session.mergeTests) {
    const ok = session.mergeTests.filter(t => t.pass).length;
    lines.push(`${ok}/${session.mergeTests.length} passing`);
    for (const t of session.mergeTests) {
      lines.push(`- ${t.pass ? "✅" : "❌"} ${t.name}${!t.pass ? ` — ${t.error}` : ""}`);
    }
  } else {
    lines.push(`⚠️ Merge tests non exécutés — raison : ${session.mergeTestsError ?? "inconnue"}`);
  }
  lines.push("");

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
        if (r.errorStack) lines.push("```\n" + r.errorStack + "\n```");
      }
      if (r.stat) {
        const ratio = typeof r.stat.customRatio === "number"
          ? ` · custom=${Math.round(r.stat.customRatio * 100)}%(${r.stat.customSessionCount ?? "?"}/${r.stat.nonRestSessionCount ?? "?"})`
          : "";
        lines.push(`- format=${r.stat.format} · chunks=${r.stat.totalChunks ?? "?"} · retries≥1=${retriesOf(r.stat)}${ratio}`);
        if (r.stat.semanticRepairs?.length) {
          lines.push(`- repairs sémantiques: ${r.stat.semanticRepairs.length}`);
          // Priorité : garantir la visibilité de [summary], reconciler_summary,
          // recon_substitute_debug, [reconciler] et [catalog_id_*] même quand
          // le rapport est long. Les autres repairs suivent (cap total 40).
          const all = r.stat.semanticRepairs;
          const isPriority = (l: string) =>
            l.startsWith("[summary]") ||
            l.includes("reconciler_summary") ||
            l.includes("recon_substitute_debug") ||
            l.includes("[reconciler]") ||
            l.includes("[catalog_id_substituted]") ||
            l.includes("[catalog_id_no_safe_neighbor]");
          const priority = all.filter(isPriority);
          const rest = all.filter(l => !isPriority(l));
          const shown = [...priority, ...rest].slice(0, 40);
          for (const rep of shown) lines.push(`  - ${rep}`);
        }

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

// ── Persistence : localStorage (cache) + Supabase (source de vérité) ───────

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
  // Mirror vers Supabase (source de vérité cross-onglet). Fire-and-forget.
  void persistQASessionToCloud(session).catch(() => { /* ignore */ });
}

export function clearQASessions(): void {
  try { localStorage.removeItem(QA_KEY); } catch { /* ignore */ }
  void clearQASessionsCloud().catch(() => { /* ignore */ });
}

async function persistQASessionToCloud(session: QASession): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id ?? null;
    if (!userId) return;
    await supabase.from("plan_qa_sessions").insert([{
      user_id: userId,
      ts: new Date(session.ts).toISOString(),
      verdict: session.verdict,
      summary: session.summary,
      n: session.n,
      runs_count: session.runs.length,
      payload: JSON.parse(JSON.stringify(session)),
    }]);
  } catch { /* ignore */ }
}

/** Lit les 50 dernières sessions QA de l'utilisateur depuis Supabase. */
export async function readQASessionsCloud(): Promise<QASession[]> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id ?? null;
    if (!userId) return [];
    const { data, error } = await supabase
      .from("plan_qa_sessions")
      .select("payload, ts")
      .eq("user_id", userId)
      .order("ts", { ascending: true })
      .limit(50);
    if (error || !data) return [];
    return data
      .map(r => r.payload as unknown as QASession)
      .filter(s => s && typeof s === "object" && Array.isArray((s as QASession).runs));
  } catch { return []; }
}

async function clearQASessionsCloud(): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id ?? null;
    if (!userId) return;
    await supabase.from("plan_qa_sessions").delete().eq("user_id", userId);
  } catch { /* ignore */ }
}
