/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Phase 0 — Checks B1-B7 QA du chemin JSON de génération de plan
 * ═══════════════════════════════════════════════════════════════════════════════
 * Spécifications textuelles fournies par le coach (à ne pas paraphraser) :
 *
 *  B1  Zod planSchema OK sans échec définitif (retries loggés)
 *  B2  weekNumbers continus 1..N, ≥4 sessions/sem (hors race-week taper)
 *  B3  Aucun catalogId TRAIL/URBAN/HEDGEHOG ; aucun détail custom
 *      matchant D+/montée sèche/bâtons/power-hike/vertical km
 *  B4  70.3 : swim+bike+run chaque semaine active
 *      SEMI : 0 swim, 0 brick, vélo ≤ 75 min uniquement en Z1-Z2
 *  B5  Chaque catalogId non-null appartient au catalogue injecté (union chunks)
 *  B6  Volume hebdo affiché = somme des durationMin (tolérance 1 min)
 *  B7  validatePlanPaces + sportObjectiveIssues remontent
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { MergedPlan, MergedSession, SportObjectiveIssue } from "@/lib/plan/mergePlanChunks";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { validatePlanPaces } from "@/lib/validatePlanPaces";
import type { PlanGenerationStat } from "@/lib/plan/planGenerationStats";

export type CheckLevel = "critical" | "warning" | "info";
export interface CheckResult {
  id: "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7";
  label: string;
  level: CheckLevel;
  pass: boolean;
  details: string[];
}

const TRAIL_CATALOG_RX = /^[A-D]_TR(50)?_|_TRAIL_|^EXPE_HORS_VILLE_|^URBAN_|^HEDGEHOG_/i;
// Marqueurs strictement critical : D+ chiffré, montée sèche, power-hike, bâtons, vertical km.
const TRAIL_DETAILS_CRITICAL_RX = /\bD\+|montée\s+sèche|b[âa]tons|power[-\s]?hike|vertical[-\s]?km|\bVK\b|\+\s*\d{2,}\s*m\b/i;
// Marqueurs seulement warning : "vallonné" seul (terrain vallonné = légitime en prépa route).
const TRAIL_DETAILS_WARNING_RX = /vallonn[ée]/i;
const Z12_RX = /\bz1\b|\bz2\b|zone\s*1|zone\s*2|zone\s*1-2|z1-2/i;

interface B1Input {
  stat?: PlanGenerationStat;
  parsedPresent?: boolean;
}
/**
 * B1 — Le plan final provient du chemin JSON avec validation Zod réussie :
 *   • stat.format === "json"
 *   • stat.ok === true
 *   • parsedPlan présent côté client (merge exposé)
 * Fail si fallback Markdown, chemin Markdown direct, JSON échoué, ou parsedPlan absent.
 */
export function checkB1(input: B1Input): CheckResult {
  const stat = input.stat;
  const details: string[] = [];
  const LABEL = "Plan issu du chemin JSON validé Zod";
  let pass = true;

  if (!stat) {
    return { id: "B1", label: LABEL, level: "critical", pass: false, details: ["Stat manquante (génération non tracée)"] };
  }
  if (stat.format === "markdown-fallback-from-json") {
    pass = false;
    details.push(`Fallback Markdown déclenché — errorCode=${stat.errorCode ?? "?"} : ${stat.errorMessage ?? ""}`);
  }
  if (stat.format === "markdown") {
    pass = false;
    details.push("Plan produit par le chemin Markdown (JSON non demandé ou route non prise).");
  }
  if (!stat.ok && stat.format === "json") {
    pass = false;
    details.push(`Échec définitif JSON — errorCode=${stat.errorCode ?? "?"}`);
  }
  if (input.parsedPresent === false && stat.format === "json" && stat.ok) {
    pass = false;
    details.push("stat=json ok mais parsedPlan absent côté client (merge non exposé).");
  }
  const attempts = stat.schemaFailDetails?.attempts;
  if (attempts && attempts.length > 0) {
    const maxAttempt = Math.max(...attempts.map(a => a.attempt ?? 1));
    if (maxAttempt >= 2) details.push(`Retry Zod déclenché sur au moins un chunk (max attempt=${maxAttempt})`);
  }
  if (pass && details.length === 0) details.push("Génération JSON validée sans retry définitif.");
  return { id: "B1", label: LABEL, level: "critical", pass, details };
}

/** Retourne true si la semaine est la race-week du taper : dernière semaine du plan, phase taper, contient une "race" ou "compétition" dans le thème. */
function isRaceWeek(w: MergedPlan["weeks"][number], totalWeeks: number): boolean {
  if (w.weekNumber !== totalWeeks) return false;
  const phase = (w.phase || "").toLowerCase();
  if (!/taper|affûtage|peak|pre.?race/i.test(phase)) return false;
  const theme = (w.theme || "").toLowerCase();
  return /race|course|compét|competition/i.test(theme) || phase.includes("race");
}

export function checkB2(plan: MergedPlan): CheckResult {
  const details: string[] = [];
  let pass = true;

  const nums = plan.weeks.map(w => w.weekNumber).sort((a, b) => a - b);
  const seen = new Set<number>();
  for (let i = 1; i <= plan.totalWeeks; i++) {
    if (!nums.includes(i)) { pass = false; details.push(`Semaine ${i} manquante`); }
  }
  for (const n of nums) {
    if (seen.has(n)) { pass = false; details.push(`Semaine ${n} en doublon`); }
    seen.add(n);
    if (n < 1 || n > plan.totalWeeks) { pass = false; details.push(`Semaine hors bornes : ${n}`); }
  }

  for (const w of plan.weeks) {
    if (isRaceWeek(w, plan.totalWeeks)) continue;
    if (w.sessions.length < 4) {
      pass = false;
      details.push(`Semaine ${w.weekNumber} : ${w.sessions.length} sessions (< 4)`);
    }
  }
  if (details.length === 0) details.push(`Continuité 1..${plan.totalWeeks} OK, ≥4 sessions/semaine.`);
  return { id: "B2", label: "weekNumbers continus 1..N, ≥4 sessions (hors race-week)", level: "critical", pass, details };
}

export function checkB3(plan: MergedPlan): CheckResult {
  const details: string[] = [];
  const warnings: string[] = [];
  let pass = true;
  for (const w of plan.weeks) {
    for (const s of w.sessions) {
      if (s.catalogId && TRAIL_CATALOG_RX.test(s.catalogId)) {
        pass = false;
        details.push(`S${w.weekNumber} ${s.dayName} — catalogId trail interdit : ${s.catalogId}`);
      }
      if (s.custom) {
        const detText = s.details ?? "";
        if (TRAIL_DETAILS_CRITICAL_RX.test(detText)) {
          pass = false;
          details.push(`S${w.weekNumber} ${s.dayName} — détails custom matchent pattern trail critical : "${detText.slice(0, 80)}"`);
        } else if (TRAIL_DETAILS_WARNING_RX.test(detText)) {
          // "vallonné" seul ⇒ warning uniquement, ne fait pas échouer le check
          warnings.push(`S${w.weekNumber} ${s.dayName} — mention "vallonné" (warning, non bloquant) : "${detText.slice(0, 80)}"`);
        }
      }
    }
  }
  if (details.length === 0 && warnings.length === 0) details.push("Aucun contenu trail détecté.");
  else if (details.length === 0) details.push(`Pass sans marqueur critical. ⚠ ${warnings.length} mention(s) "vallonné" (warning).`);
  // Include warnings after criticals for visibility
  for (const w of warnings) details.push(`⚠ ${w}`);
  return { id: "B3", label: "Aucun contenu trail (catalogId / détails custom)", level: "critical", pass, details };
}

export function checkB4_703(plan: MergedPlan): CheckResult {
  const details: string[] = [];
  let pass = true;
  for (const w of plan.weeks) {
    if (isRaceWeek(w, plan.totalWeeks)) continue;
    const sports = new Set(w.sessions.map(s => s.sport));
    const missing = ["swim", "bike", "run"].filter(sp => !sports.has(sp));
    if (missing.length > 0) {
      pass = false;
      details.push(`Semaine ${w.weekNumber} : sports manquants [${missing.join(", ")}]`);
    }
  }
  if (details.length === 0) details.push("Swim + Bike + Run présents chaque semaine active.");
  return { id: "B4", label: "70.3 — swim/bike/run chaque semaine active", level: "critical", pass, details };
}

export function checkB4_semi(plan: MergedPlan): CheckResult {
  const details: string[] = [];
  let pass = true;
  for (const w of plan.weeks) {
    for (const s of w.sessions) {
      if (s.sport === "swim") { pass = false; details.push(`S${w.weekNumber} ${s.dayName} — swim interdit sur semi.`); }
      if (s.sport === "brick") { pass = false; details.push(`S${w.weekNumber} ${s.dayName} — brick interdit sur semi.`); }
      if (s.sport === "bike") {
        if (s.durationMin > 75) {
          pass = false;
          details.push(`S${w.weekNumber} ${s.dayName} — bike ${s.durationMin} min > 75 min.`);
        }
        const textZones = [(s.zones ?? []).join(" "), s.title ?? "", s.details ?? ""].join(" ");
        if (!Z12_RX.test(textZones)) {
          pass = false;
          details.push(`S${w.weekNumber} ${s.dayName} — bike sans marque Z1-Z2 : zones=[${(s.zones ?? []).join(",")}]`);
        }
      }
    }
  }
  if (details.length === 0) details.push("Aucun swim/brick ; bike ≤75 min et Z1-Z2 uniquement.");
  return { id: "B4", label: "SEMI — 0 swim, 0 brick, vélo Z1-Z2 ≤75 min", level: "critical", pass, details };
}

/** Sprint : swim+bike+run présents chaque semaine active (comme 70.3 mais raccourci). */
export function checkB4_sprint(plan: MergedPlan): CheckResult {
  const res = checkB4_703(plan);
  return { ...res, label: "SPRINT — swim/bike/run chaque semaine active" };
}

export function checkB5(plan: MergedPlan, allowedIds: string[] | undefined): CheckResult {
  const details: string[] = [];
  let pass = true;
  if (!allowedIds || allowedIds.length === 0) {
    return {
      id: "B5",
      label: "catalogId ⊂ catalogue injecté",
      level: "warning",
      pass: true,
      details: ["Union catalogue injectée non capturée (observabilité manquante) — skip."],
    };
  }
  const allowed = new Set(allowedIds);
  for (const w of plan.weeks) {
    for (const s of w.sessions) {
      if (s.catalogId && !s.custom && !allowed.has(s.catalogId)) {
        pass = false;
        details.push(`S${w.weekNumber} ${s.dayName} — catalogId hors catalogue : ${s.catalogId}`);
      }
    }
  }
  if (details.length === 0) details.push(`Tous les catalogId (non-custom) ∈ union catalogue (${allowedIds.length} IDs).`);
  return { id: "B5", label: "catalogId ⊂ catalogue injecté (union chunks)", level: "critical", pass, details };
}

export function checkB6(plan: MergedPlan, parsed: ParsedPlan): CheckResult {
  const details: string[] = [];
  let pass = true;
  const TOL = 1; // minute
  for (let i = 0; i < plan.weeks.length; i++) {
    const w = plan.weeks[i];
    const pw = parsed.weeks.find(pw => pw.weekNumber === w.weekNumber);
    if (!pw) continue;
    const sumDur = w.sessions.reduce((a: number, s: MergedSession) => a + (s.durationMin || 0), 0);
    const shown = pw.computedVolumeMin ?? 0;
    if (Math.abs(sumDur - shown) > TOL) {
      pass = false;
      details.push(`S${w.weekNumber} — Σdur=${sumDur} min vs affiché=${shown} min (Δ=${Math.abs(sumDur - shown)}).`);
    }
  }
  if (details.length === 0) details.push("Volume hebdo ≡ Σ durationMin (tol 1 min).");
  return { id: "B6", label: "Volume hebdo = Σ durationMin", level: "critical", pass, details };
}

export function checkB7(parsed: ParsedPlan, sportObjectiveIssues: SportObjectiveIssue[], planObjective: string | undefined): CheckResult {
  const details: string[] = [];
  let pass = true;
  try {
    const paceReport = validatePlanPaces(parsed, null, planObjective ?? null);
    if (paceReport.issues && paceReport.issues.length > 0) {
      details.push(`validatePlanPaces issues (${paceReport.issues.length}) : ${paceReport.issues.slice(0, 3).join(" | ")}`);
    } else {
      details.push(paceReport.summary);
    }
  } catch (e) {
    pass = false;
    details.push(`validatePlanPaces a levé : ${e instanceof Error ? e.message : String(e)}`);
  }
  const critical = sportObjectiveIssues.filter(i => i.severity === "critical");
  if (critical.length > 0) {
    // B7 est une remontée (level=warning), les critical sport↔objectif sont déjà agrégés par verdict.
    details.push(`sportObjectiveIssues critical (${critical.length}) : ${critical.slice(0, 3).map(i => `S${i.weekNumber} ${i.dayName}: ${i.reason}`).join(" | ")}`);
  } else {
    details.push(`sportObjectiveIssues critical=0.`);
  }
  return { id: "B7", label: "Validateurs sémantiques (paces + sport/objectif)", level: "warning", pass, details };
}

export function runAllChecks(args: {
  profileId: "B-70.3" | "B-SEMI" | "B-SPRINT";
  merged: MergedPlan;
  parsed: ParsedPlan;
  allowedCatalogIds: string[] | undefined;
  sportObjectiveIssues: SportObjectiveIssue[];
  stat: PlanGenerationStat | undefined;
  objective: string | undefined;
}): CheckResult[] {
  const b4 = args.profileId === "B-70.3"
    ? checkB4_703(args.merged)
    : args.profileId === "B-SEMI"
      ? checkB4_semi(args.merged)
      : checkB4_sprint(args.merged);
  return [
    checkB1({ stat: args.stat, parsedPresent: !!args.parsed }),
    checkB2(args.merged),
    checkB3(args.merged),
    b4,
    checkB5(args.merged, args.allowedCatalogIds),
    checkB6(args.merged, args.parsed),
    checkB7(args.parsed, args.sportObjectiveIssues, args.objective),
  ];
}
