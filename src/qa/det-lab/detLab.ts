/**
 * DEV-ONLY — laboratoire DET synthétique. Génération RÉELLE par
 * `constructDeterministicPlan` (via la préparation pure partagée avec les
 * tests V356/V357), jamais un JSON préenregistré, jamais un LLM.
 * Les approbations, horloges et placements de la fixture sont artificiels :
 * ils ne sont JAMAIS appliqués au profil d'un athlète réel.
 */
import { runScenarioCore, type Case } from "../../../experimental/det-engine/v332-running-long-horizon-core";
import { strictMarathonCaseSettings, assertAcceptedCore } from "../../../experimental/det-engine/v356-marathon-acceptance-core";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { PLAN_PROVENANCE_SCHEMA, type DetPlanProvenance } from "@/lib/plan/planProvenance";
import { strictCheck, DetLabCheckFailed } from "./strictCheck";

export type DetLabExpectation = "accepted" | "historical_refusal";

export interface DetLabScenario {
  id: string;
  label: string;
  expectation: DetLabExpectation;
  weeks: 16 | 40;
  input: Case;
}

const acc = (id: string, label: string, weeks: 16 | 40, extra: Partial<Case>): DetLabScenario => ({
  id, label, expectation: "accepted", weeks,
  input: { ...strictMarathonCaseSettings, id, weeks, ...extra } as Case,
});
const ref = (id: string, label: string, weeks: 16 | 40, input: Case): DetLabScenario => ({
  id, label, expectation: "historical_refusal", weeks, input,
});

/** Base historique V355 (copie exacte de la matrice V332). */
const v355Base = (weeks: 16 | 40): Case => ({
  id: `marathon-${weeks}w-tte-source-preferred`, fixture: "B-MARATHON",
  goal: "Marathon", weeks, weeklyHours: 9, declaredTwoSlotsPerDay: true,
  unrestrictedSports: true, wideRecoveryClock: true, forwardCheck: true,
  expandedTaperSources: true, approvedTaperDose: true, sourceCertifiedPeak: true,
  shortEasyTaperApproved: true, distinctSportClock: true,
  measuredRecoveryProof: true, runningQualityProof: true,
  runningQualityPriority: true, runningMatchingAudit: true,
  runningCandidatePriority: true, runningEasyMarginPriority: true,
  extendedStrictSearchBudget: true, runningQualitySlotMargin: true,
  marathonHorizonEvidence: true, marathonSpecificityReconciliation: true,
  measuredMarathonMesocycles: true, tteSourcePreferred: true,
} as Case);

/** Mêmes entrées que V356/V357 et la matrice V332 (preuve CI conservée). */
export const DET_LAB_SCENARIOS: readonly DetLabScenario[] = [
  acc("marathon-16w-age_group-tte-source-preferred", "Marathon 16 sem. — age group (accepté attendu)", 16, { weeklyHours: 7, declaredAmbition: "age_group" } as Partial<Case>),
  acc("marathon-40w-age_group-tte-source-preferred", "Marathon 40 sem. — age group (accepté attendu)", 40, { weeklyHours: 7, declaredAmbition: "age_group" } as Partial<Case>),
  acc("marathon-16w-competitor-reviewed-placement-tte-source-preferred", "Marathon 16 sem. — compétiteur, placement revu (accepté attendu)", 16, { weeklyHours: 9, declaredAmbition: "competitor", reviewedCompetitorPlacement: true } as Partial<Case>),
  acc("marathon-40w-competitor-reviewed-placement-tte-source-preferred", "Marathon 40 sem. — compétiteur, placement revu (accepté attendu)", 40, { weeklyHours: 9, declaredAmbition: "competitor", reviewedCompetitorPlacement: true } as Partial<Case>),
  ref("marathon-16w-competitor-tte-source-preferred", "Marathon 16 sem. — compétiteur sans placement revu (refus historique)", 16,
    { ...strictMarathonCaseSettings, id: "marathon-16w-competitor-tte-source-preferred", weeks: 16, weeklyHours: 9, declaredAmbition: "competitor" } as Case),
  ref("marathon-40w-competitor-tte-source-preferred", "Marathon 40 sem. — compétiteur sans placement revu (refus historique)", 40,
    { ...strictMarathonCaseSettings, id: "marathon-40w-competitor-tte-source-preferred", weeks: 40, weeklyHours: 9, declaredAmbition: "competitor" } as Case),
  ref("marathon-16w-tte-source-preferred", "Marathon 16 sem. — base V355 (refus historique)", 16, v355Base(16)),
  ref("marathon-40w-tte-source-preferred", "Marathon 40 sem. — base V355 (refus historique)", 40, v355Base(40)),
];

export const DET_LAB_PLAN_START = "2026-10-26";

export type DetLabOutcome =
  | { kind: "accepted"; plan: ParsedPlan & Record<string, unknown>; provenance: DetPlanProvenance; sessions: number; nodes: number; structured: number; structureRefused: number }
  | { kind: "refused"; reason: string; blockingCodes: string[]; nodes: number; expectedRefusal: boolean }
  | { kind: "blocked"; reason: string };

/** Copie JSON stricte : retire fonctions/undefined, échoue sur NaN/Infinity. */
function jsonCopy<T>(v: T): T {
  const s = JSON.stringify(v, (_k, x) => {
    if (typeof x === "number" && !Number.isFinite(x)) throw new Error("non_finite_number");
    return x;
  });
  return JSON.parse(s) as T;
}

export interface RunDetLabOptions {
  engineVersion: string | null | undefined;
  releaseId?: string | null;
  now?: () => Date;
  /** Injection pour tests : par défaut le vrai moteur. */
  run?: (c: Case, check: typeof strictCheck) => ReturnType<typeof runScenarioCore>;
}

export function runDetLabScenario(scenarioId: string, opts: RunDetLabOptions): DetLabOutcome {
  const scenario = DET_LAB_SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) return { kind: "blocked", reason: "scenario_inconnu" };
  if (!opts.engineVersion || !/^[a-f0-9]{64}$/.test(opts.engineVersion)) {
    return { kind: "blocked", reason: "version_moteur_det_indisponible" };
  }
  const run = opts.run ?? ((c, check) => runScenarioCore(c, check));
  let out: ReturnType<typeof runScenarioCore>;
  try {
    out = run(scenario.input, strictCheck);
  } catch (e) {
    const reason = e instanceof DetLabCheckFailed ? e.message : `exception_moteur:${e instanceof Error ? e.message.slice(0, 160) : "inconnue"}`;
    return { kind: "blocked", reason };
  }
  const hard = out.issues.filter((i) => ["critical", "blocking", "error"].includes(i.severity)).map((i) => i.code);
  if (!out.constraintsSatisfied || !out.candidate) {
    // Refus affiché tel quel. Aucune bascule vers l'IA, aucun contrôle relâché.
    return { kind: "refused", reason: out.reason ?? "contraintes_non_satisfaites", blockingCodes: [...new Set(hard)], nodes: out.nodes, expectedRefusal: scenario.expectation === "historical_refusal" };
  }
  if (scenario.expectation !== "accepted") {
    return { kind: "blocked", reason: "refus_historique_attendu_mais_candidat_produit" };
  }
  try {
    assertAcceptedCore(out, scenario.weeks, strictCheck);
  } catch (e) {
    return { kind: "blocked", reason: e instanceof Error ? e.message : "controle_acceptation_echoue" };
  }
  const provenance: DetPlanProvenance = {
    schema: PLAN_PROVENANCE_SCHEMA,
    engine: "det",
    engineVersion: opts.engineVersion,
    releaseId: opts.releaseId ?? null,
    mode: "synthetic-lab",
    scenarioId: scenario.id,
    scenarioInput: jsonCopy(scenario.input) as unknown as Record<string, unknown>,
    syntheticFixture: true,
    fixtureApprovalsAppliedToAthlete: false,
    prescriptionAllowed: false,
    sportingAttestation: false,
    generatedAt: (opts.now ?? (() => new Date()))().toISOString(),
    result: { status: "candidate", constraintsSatisfied: true, nodes: out.nodes },
  };
  let candidate: ParsedPlan;
  try {
    candidate = jsonCopy(out.candidate) as unknown as ParsedPlan;
  } catch {
    return { kind: "blocked", reason: "candidat_non_serialisable" };
  }
  // Structure sérialisable issue des blocs V3 configurés et admis (jamais du texte).
  let structured = 0; let structureRefused = 0;
  for (const w of candidate.weeks) for (const sess of w.sessions as unknown as Array<Record<string, unknown>>) {
    if (sess.isRest) continue;
    const id = typeof sess.catalogId === "string" ? sess.catalogId : null;
    const r = !id
      ? { status: "refused" as const, sourceId: "", reason: "session_without_source_id" }
      : typeof out.structuredWorkoutForId === "function"
        ? out.structuredWorkoutForId(id, typeof sess.durationMin === "number" ? sess.durationMin : undefined)
        : { status: "refused" as const, sourceId: id, reason: "structure_lookup_unavailable" };
    if (r.status === "structured") { sess.detStructuredWorkout = jsonCopy(r.workout); structured++; }
    else { sess.detStructureRefusal = { sourceId: r.sourceId, reason: r.reason }; structureRefused++; }
  }
  const plan = {
    ...candidate,
    title: `QA — DET synthétique NON PRESCRIPTIF — ${scenario.label}`,
    _qaFixture: true,
    _qaNonPrescriptive: true,
    _provenance: provenance,
    _planStartDate: DET_LAB_PLAN_START,
    _objective: "Marathon",
  } as ParsedPlan & Record<string, unknown>;
  const sessions = candidate.weeks.reduce((n, w) => n + w.sessions.filter((s) => !s.isRest).length, 0);
  return { kind: "accepted", plan, provenance, sessions, nodes: out.nodes, structured, structureRefused };
}

// ---------------------------------------------------------------------------
// Mode « entrées coach » : n'utilise QUE ce qui est réellement saisi/validé.
// ---------------------------------------------------------------------------

export interface CoachDetInputs {
  objective: string | null;
  weeklyHours: number | null;
  anchors: { ftp?: number | null; thresholdPaceSecPerKm?: number | null; css?: number | null; vma?: number | null };
  /** Qualifications individuelles des sources V3 pour CET athlète (aucun stockage n'existe aujourd'hui). */
  individualSourceQualifications: unknown[];
  confirmedSessionClock: unknown | null;
  reviewedSlotPlacement: unknown | null;
}

export interface CoachInputRefusal { kind: "refused"; missing: string[]; note: string }

/**
 * Jamais de complément depuis la fixture. Sans tous les éléments requis par
 * le contrat V356/V357, refus précis. Aucun chemin « accepté » n'existe tant
 * qu'aucun stockage réel des qualifications/horloges/placements n'existe.
 */
export function evaluateCoachDetInputs(i: CoachDetInputs): CoachInputRefusal {
  const missing: string[] = [];
  if (!i.objective) missing.push("objectif");
  if (!(typeof i.weeklyHours === "number" && i.weeklyHours > 0)) missing.push("volume horaire hebdomadaire");
  const a = i.anchors;
  if (!(typeof a.thresholdPaceSecPerKm === "number" && a.thresholdPaceSecPerKm > 0)) missing.push("ancre allure seuil course");
  if (!(typeof a.vma === "number" && a.vma > 0)) missing.push("ancre VMA");
  if (i.individualSourceQualifications.length === 0) missing.push("qualifications individuelles des sources V3 (revue coach par séance, pour cet athlète)");
  if (i.confirmedSessionClock == null) missing.push("horaires de séance confirmés par le coach");
  if (i.reviewedSlotPlacement == null) missing.push("placement hebdomadaire revu par le coach");
  return {
    kind: "refused",
    missing,
    note: "Aucun stockage applicatif des qualifications de source, horaires confirmés et placements revus n'existe encore : DET ne peut pas être lancé sur des entrées coach réelles. Les valeurs de la fixture ne sont jamais utilisées à leur place.",
  };
}
