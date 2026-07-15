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
import { TRAIL_DETAILS_CRITICAL_RX, TRAIL_DETAILS_WARNING_RX } from "@/lib/plan/trailMarkers";
import type { QuotaIssue, WeekQuotaEntry } from "@/lib/plan/validateWeeklyQuotas";
import { checkB10, checkB11 } from "./checksB10B11";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { ficheAllowedPhases, type PlanPhase } from "@/lib/plan/phaseNormalization";

export type CheckLevel = "critical" | "warning" | "info";
export interface CheckResult {
  id: "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7" | "B8" | "B9" | "B10" | "B11";
  label: string;
  level: CheckLevel;
  pass: boolean;
  details: string[];
}

const TRAIL_CATALOG_RX = /^[A-D]_TR(50)?_|_TRAIL_|^EXPE_HORS_VILLE_|^URBAN_|^HEDGEHOG_/i;
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
        const titleText = s.title ?? "";
        const detailsText = s.details ?? "";
        const detText = `${titleText} ${detailsText}`;
        if (TRAIL_DETAILS_CRITICAL_RX.test(detText)) {
          pass = false;
          details.push(`S${w.weekNumber} ${s.dayName} — custom trail CRITICAL | sport=${s.sport} dur=${s.durationMin}min | title="${titleText}" | details="${detailsText}"`);
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

export function checkB5(plan: MergedPlan, allowedIds: string[] | undefined, objective?: string): CheckResult {
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
  const allowed = new Set(allowedIds.map(i => i.toUpperCase()));
  const libIndex = new Map<string, typeof WorkoutLibrary[number]>();
  for (const w of WorkoutLibrary) libIndex.set(w.id.toUpperCase(), w);

  const objLower = (objective ?? "").toLowerCase();
  const isTrailObjective = /trail|utmb|ccc|occ|ultra/.test(objLower);

  type Cat = "retiré_par_filtre_phase" | "existe_autre_objectif" | "pur_hallucination";
  const breakdown: Record<Cat, string[]> = {
    retiré_par_filtre_phase: [],
    existe_autre_objectif: [],
    pur_hallucination: [],
  };
  const neighborLines: string[] = [];

  const normSp = (s: string): string => {
    const x = String(s || "").toLowerCase();
    if (x === "course" || x === "run") return "run";
    if (x === "cyclisme" || x === "bike") return "bike";
    if (x === "natation" || x === "swim") return "swim";
    if (x === "renforcement" || x === "strength") return "strength";
    return x;
  };

  for (const w of plan.weeks) {
    for (const s of w.sessions) {
      if (!s.catalogId || s.custom) continue;
      const idU = s.catalogId.toUpperCase();
      if (allowed.has(idU)) continue;
      pass = false;
      const inLib = libIndex.get(idU);
      let cat: Cat;
      if (!inLib) {
        cat = "pur_hallucination";
      } else if (TRAIL_CATALOG_RX.test(inLib.id) && !isTrailObjective) {
        cat = "existe_autre_objectif";
      } else {
        cat = "retiré_par_filtre_phase";
      }
      breakdown[cat].push(`S${w.weekNumber} ${s.dayName} — ${s.catalogId}`);
      details.push(`S${w.weekNumber} ${s.dayName} — catalogId hors catalogue : ${s.catalogId} [${cat}]`);

      // Voisins proches pour cat ≠ pur_hallucination
      if (inLib && cat !== "pur_hallucination") {
        const invSp = normSp(inLib.sport as string);
        const invTags = new Set<string>([
          ...((inLib.tags ?? []) as string[]).map(t => t.toLowerCase()),
          ...((inLib.goals ?? []) as string[]).map(t => t.toLowerCase()),
        ]);
        const candidates: Array<{ id: string; score: number; sport: string }> = [];
        for (const aid of allowed) {
          const f = libIndex.get(aid);
          if (!f) continue;
          const fSp = normSp(f.sport as string);
          if (fSp !== invSp) continue;
          let ov = 0;
          for (const t of ((f.tags ?? []) as string[])) if (invTags.has(t.toLowerCase())) ov++;
          for (const g of ((f.goals ?? []) as string[])) if (invTags.has(g.toLowerCase())) ov++;
          candidates.push({ id: f.id, score: ov, sport: fSp });
        }
        candidates.sort((a, b) => b.score - a.score);
        const top3 = candidates.slice(0, 3).map(c => `${c.id}(t=${c.score})`).join(", ");
        const tagStr = [...invTags].slice(0, 6).join(",");
        neighborLines.push(`  · ${inLib.id} [${invSp}] tags=[${tagStr}] → voisins: ${top3 || "(aucun même sport)"}`);
      }
    }
  }

  if (details.length === 0) details.push(`Tous les catalogId (non-custom) ∈ union catalogue (${allowedIds.length} IDs).`);

  const total = breakdown.retiré_par_filtre_phase.length + breakdown.existe_autre_objectif.length + breakdown.pur_hallucination.length;
  if (total > 0) {
    const line = `[b5_hallucination_breakdown] objective=${objective ?? "?"} total=${total} · retiré_par_filtre=${breakdown.retiré_par_filtre_phase.length} · existe_autre_objectif=${breakdown.existe_autre_objectif.length} · pur_hallucination=${breakdown.pur_hallucination.length}`;
    // eslint-disable-next-line no-console
    console.warn(line);
    if (neighborLines.length > 0) {
      // eslint-disable-next-line no-console
      console.groupCollapsed(`🔎 B5 voisins proches (${neighborLines.length})`);
      for (const l of neighborLines) console.log(l);
      console.groupEnd();
    }
    details.unshift(line);
    for (const l of neighborLines) details.push(l);
  }

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

/**
 * B8 — Fréquence par sport vs quota moteur (Phase 2A).
 * PASS si 0 critical `quota_floor_violation`. Warnings `quota_range_drift`
 * listés avec préfixe ⚠. Un unique tableau compact quota vs observé par
 * semaine est ajouté en fin de details pour lecture rapide.
 */
export function checkB8(
  merged: MergedPlan,
  quotaIssues: QuotaIssue[],
  quotasByWeek: Record<number, WeekQuotaEntry>,
): CheckResult {
  const details: string[] = [];
  const critical = quotaIssues.filter(i => i.severity === "critical");
  const warnings = quotaIssues.filter(i => i.severity === "warning");
  const pass = critical.length === 0;

  for (const c of critical.slice(0, 8)) {
    details.push(`S${c.weekNumber} — ${c.code}: ${c.reason} (attendu ${c.expected ?? "?"}, observé ${c.observed ?? "?"})`);
  }
  for (const w of warnings.slice(0, 6)) {
    details.push(`⚠ S${w.weekNumber} — ${w.reason}`);
  }

  // Tableau compact quota vs observé
  if (Object.keys(quotasByWeek).length > 0) {
    details.push("");
    details.push("Quota vs observé (Sem | sw/bk/rn/br/st) :");
    for (const w of merged.weeks) {
      const entry = quotasByWeek[w.weekNumber];
      if (!entry) continue;
      const cnt = { swim: 0, bike: 0, run: 0, brick: 0, strength: 0 } as Record<string, number>;
      for (const s of w.sessions) if (!s.isRest && s.sport in cnt) cnt[s.sport]++;
      const q = entry.quota;
      const fmt = (obs: number, r: { min: number; max: number }) => r.min === r.max ? `${obs}/${r.min}` : `${obs}/${r.min}-${r.max}`;
      details.push(`  S${w.weekNumber} [${entry.weekType}] · sw=${fmt(cnt.swim, q.swim)} · bk=${fmt(cnt.bike, q.bike)} · rn=${fmt(cnt.run, q.run)} · br=${fmt(cnt.brick, q.brick)} · st=${fmt(cnt.strength, q.strength)}${entry.downgraded ? " · ⚠downgraded" : ""}`);
    }
  }

  if (details.length === 0) details.push("Quota moteur respecté sur toutes les semaines (0 floor violé).");
  return { id: "B8", label: "Fréquence par sport vs quota moteur", level: "critical", pass, details };
}

/**
 * B9 — Prescriptions RELATIVES uniquement (Phase 2B v2).
 * PASS si :
 *   - 0 value_unresolved
 *   - 0 token absolu résiduel (residualAbsoluteTokens=0)
 * Le validateur ne CORRIGE plus l'intensité : il RELATIVE ou flagge.
 */
export function checkB9(semanticRepairs: string[] | undefined): CheckResult {
  const details: string[] = [];
  const repairs = semanticRepairs ?? [];
  const summaryLine = repairs.find(r => r.includes("value_check_summary"));
  const relativizedLines = repairs.filter(r => /\bvalue_relativized\b/.test(r));
  const unresolvedLines = repairs.filter(r => /\bvalue_unresolved\b/.test(r));

  if (!summaryLine) {
    return {
      id: "B9", label: "Prescriptions relatives (zones/%)",
      level: "critical", pass: false,
      details: ["Résumé value_check_summary absent (validateur non exécuté ou payload sans targetTable)."],
    };
  }
  // Contrat v2 canonique : tokens/conforme/relativized/unresolved/residualAbs
  // Accepte aussi l'ancien libellé "relativisés" (rétro-compat).
  const m = summaryLine.match(
    /tokens=(\d+).*?conforme=(\d+).*?(?:relativized|relativisés)=(\d+).*?unresolved=(\d+).*?residualAbs=(\d+)/,
  );
  if (!m) {
    return {
      id: "B9", label: "Prescriptions relatives (zones/%)",
      level: "critical", pass: false,
      details: [`Résumé mal formé : "${summaryLine}"`],
    };
  }
  const total = Number(m[1]);
  const ok = Number(m[2]);
  const relat = Number(m[3]);
  const unres = Number(m[4]);
  const residual = Number(m[5]);
  const pctOk = total > 0 ? Math.round((ok / total) * 100) : 100;
  const pass = unres === 0 && residual === 0;

  details.push(`Total tokens : ${total} · relatifs conformes ${ok} (${pctOk}%) · relativisés ${relat} · unresolved ${unres} · absolus résiduels ${residual}`);
  if (relativizedLines.length > 0) {
    details.push(`Traductions relatives (${relativizedLines.length}) :`);
    for (const l of relativizedLines) details.push(`  - ${l}`);
  }
  if (unresolvedLines.length > 0) {
    details.push(`Unresolved (${unresolvedLines.length}) — à revoir par le coach :`);
    for (const l of unresolvedLines) details.push(`  - ${l}`);
  }
  return { id: "B9", label: "Prescriptions relatives (zones/%)", level: "critical", pass, details };
}

export function runAllChecks(args: {
  profileId: "B-70.3" | "B-SEMI" | "B-SPRINT";
  merged: MergedPlan;
  parsed: ParsedPlan;
  allowedCatalogIds: string[] | undefined;
  sportObjectiveIssues: SportObjectiveIssue[];
  stat: PlanGenerationStat | undefined;
  objective: string | undefined;
  quotaIssues?: QuotaIssue[];
  quotasByWeek?: Record<number, WeekQuotaEntry>;
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
    checkB5(args.merged, args.allowedCatalogIds, args.objective),
    checkB6(args.merged, args.parsed),
    checkB7(args.parsed, args.sportObjectiveIssues, args.objective),
    checkB8(args.merged, args.quotaIssues ?? [], args.quotasByWeek ?? {}),
    checkB9(args.stat?.semanticRepairs),
    checkB10(args.merged),
    checkB11(args.merged, args.objective),
  ];
}
