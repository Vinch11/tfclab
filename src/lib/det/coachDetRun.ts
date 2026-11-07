/**
 * Chemin « entrées coach » → VRAI moteur DET. Aucun import de fixture ou de
 * helper synthétique (vérifié par test). Les valeurs absentes restent nulles :
 * jamais de défaut de population.
 */
import type { DiagnosticInput } from "@/engines/diagnostic";
import { prepareTrainingPlanContext } from "@/engines/plan/prepareTrainingPlanContext";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";
import { normalizeAmbitionLevel } from "@/types/ambitionLevel";
import { clockFor, coachFamilyFor, runCoachInputsDet } from "../../../experimental/det-engine/v401-coach-inputs-core";
import { traceLimiterSemantics, type LimiterSemanticsTrace } from "../../../experimental/det-engine/v403-limiter-semantics";
import { PLAN_PROVENANCE_SCHEMA, type DetCoachInputsProvenance } from "@/lib/plan/planProvenance";
import { anchorMismatches, planningInputFor, type FrozenAppPlanningInput } from "./appPlanningInput";
import { checkCoachReviewContext, type CoachDetInputSnapshot, type CoachReviewContext } from "./coachDetContext";

const num = (s: CoachDetInputSnapshot, k: keyof CoachDetInputSnapshot["anchors"]): number | null => {
  const v = s.anchors[k]?.value;
  return typeof v === "number" ? v : null;
};

export function buildCoachPlanInputs(s: CoachDetInputSnapshot): { athlete: PlanAthleteData; config: PlanConfig & { planStartDate: string } } {
  const pace = num(s, "runThresholdPaceSecPerKm");
  const ftp = num(s, "bikeFtpWatts");
  const css = num(s, "cssSecPer100m");
  const vvo2 = num(s, "runVvo2SpeedMps");
  // Conversion d'unité exacte (m/s → km/h), pas une estimation.
  const vma = vvo2 !== null ? vvo2 * 3.6 : null;
  const ph = (k: keyof NonNullable<CoachDetInputSnapshot["physiology"]>) => {
    const v = s.physiology?.[k]?.value; return typeof v === "number" ? v : null;
  };
  const prov = (k: keyof NonNullable<CoachDetInputSnapshot["physiology"]>) =>
    s.physiology?.[k] ? (s.physiology[k]!.kind === "field_measurement" ? "coach_field_measurement" : "coach_explicit_estimate") : null;
  const vo2max = ph("vo2max"), weightKg = ph("weightKg"), tte = ph("tteRunMin"), vlamaxRun = ph("vlamaxRun"), vlamaxBike = ph("vlamaxBike"), fcMax = ph("fcMax");
  const athlete: PlanAthleteData = {
    nom: `QA coach-inputs ${s.athleteId.slice(0, 8)}`, age: s.age, sex: s.sex ?? null,
    ftp, paceThresholdSecPerKm: pace, css, vma, weightKg, vlamax: vlamaxBike, vlamaxRun, vo2max, tte, fcMax,
  };
  // Famille canonique : l'objectif moteur est celui du scénario CI, jamais le titre libre.
  const family = coachFamilyFor(s.objective);
  const objective = family?.engineObjective ?? s.objective;
  const sportFocus = family?.sportFocus ?? "run";
  const diagnosticInput = {
    athleteId: s.athleteId, athleteName: athlete.nom, age: s.age, sex: s.sex ?? null, weightKg,
    objectif: objective, ambition: normalizeAmbitionLevel(s.ambition), sportFocus,
    vo2max, ftp, ftpKg: ftp && weightKg ? ftp / weightKg : null, pmax5s: null, p30sW: null, p60sW: null, map5minW: null,
    vma, css, vlamax: vlamaxBike, vlamaxRun, vlamaxSource: prov(sportFocus === "tri" ? "vlamaxBike" : "vlamaxRun"), vlamaxProtocol: null, vlamaxIsReference: false,
    tteObservedMin: null, tteObservedMinRun: sportFocus === "run" ? tte : null, tteMode: prov("tteRunMin"), tss7d: null, fatigueState: null,
    runEconomyScore: null, runHrDriftPct: null, paceThresholdSecPerKm: pace,
    runningPower1s: null, runningPower5s: null, runningPower30s: null, runningPower60s: null, runningPower5min: null,
    runningPowerThreshold: null, sprint15sDistance: null, bikeCadenceRpm: null, bikeHrDriftFlag: false,
    protocolQuality: null, wprimeKj: null, cpDataQuality: null, fatmax: null, forceDevMode: false,
    giIssuesFlag: false, targetRaceDurationMin: null,
  } as unknown as DiagnosticInput;
  const prepared = prepareTrainingPlanContext({
    diagnosticInput, athleteData: athlete, fcMax: fcMax ?? undefined,
    coachLimiterOrder: s.coachLimiterOrder ? [...s.coachLimiterOrder] : undefined,
    formConfig: {
      objective, raceDate: s.raceDate, planStartDate: s.planStartDate,
      raceGoals: [{ objective, raceDate: s.raceDate, priority: "A" }],
      weeksAvailable: s.weeksAvailable, weeklyHours: s.weeklyHours, sessionsPerWeek: s.sessionsPerWeek,
      maxSessionsPerDay: s.maxSessionsPerDay, strengthSessionsPerWeek: s.strengthSessionsPerWeek, ambition: s.ambition,
    },
  });
  return { athlete, config: { ...prepared.planConfig, planStartDate: s.planStartDate, _outputFormat: "json" } as PlanConfig & { planStartDate: string } };
}

/**
 * Limiteurs ÉLIGIBLES détectés par le diagnostic commun pour ces entrées,
 * dans l'ordre automatique (impact pondéré). C'est la seule liste que le
 * coach peut réordonner : il n'ajoute ni ne retire aucune métrique.
 */
export function eligibleLimiterMetrics(s: CoachDetInputSnapshot): string[] {
  const { config } = buildCoachPlanInputs({ ...s, coachLimiterOrder: null });
  return [...((config as { identifiedLimitersRaw?: string[] }).identifiedLimitersRaw ?? [])];
}

export interface AppliedLimiterOrder {
  mode: "automatic" | "coach";
  /** Origine : pipeline de l'app (diagnostic existant) ou entrées QA manuelles. */
  source?: "app_planning_pipeline" | "manual_coach_inputs";
  /** Limiteurs de l'app transmis tels quels mais sans définition DET (registre moteur V403, jamais remplacés). */
  unrecognizedByDet?: string[];
  /** Résolution sémantique typée (registre moteur V403) : priorités brutes conservées, traduction tracée. */
  semantics?: LimiterSemanticsTrace;
  /** Ordre automatique du diagnostic (impact). */
  automatic: string[];
  /** Ordre confirmé par le coach (null en mode automatique). */
  coachConfirmed: string[] | null;
  /** Ordre réellement transmis au solveur (`identifiedLimitersRaw`). */
  applied: string[];
}

/** Vérifie que l'ordre coach est une permutation exacte des limiteurs éligibles. */
export function limiterOrderProblems(s: CoachDetInputSnapshot, eligible: string[]): string[] {
  const o = s.coachLimiterOrder;
  if (o == null) return [];
  const p: string[] = [];
  const extra = o.filter((m) => !eligible.includes(m));
  const missing = eligible.filter((m) => !o.includes(m));
  if (extra.length) p.push(`ordre des limiteurs coach : ${extra.join(", ")} non détecté(s) pour ce profil — l'ordre coach ne peut que réordonner les limiteurs détectés (${eligible.join(", ") || "aucun"})`);
  if (missing.length) p.push(`ordre des limiteurs coach incomplet : ${missing.join(", ")} à placer explicitement`);
  return p;
}

export type CoachDetOutcome =
  | { kind: "refused"; refusals: string[]; blockedUnsupportedLimiter?: NonNullable<LimiterSemanticsTrace["blocking"]>; limiterOrder?: AppliedLimiterOrder }
  | { kind: "engine_refused"; reason: string; blockingCodes: string[]; blockingIssues?: { code: string; week: number | null; message: string }[]; rejectedSources: { id: string; reason: string }[]; contextProblems: string[]; limiterOrder: AppliedLimiterOrder }
  | { kind: "accepted"; plan: ParsedPlan & Record<string, unknown>; provenance: DetCoachInputsProvenance; sessions: number; limiterOrder: AppliedLimiterOrder; auditCodes: string[] };

function ymdPlus(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function runCoachDetPlan(input: {
  reviewContextId: string | null;
  ctx: CoachReviewContext | null;
  coachId: string; athleteId: string;
  snapshot: CoachDetInputSnapshot; inputsHash: string;
  sourcesVersion: string | null; engineVersion: string | null; releaseId: string | null;
  now?: () => Date;
  limits?: { maxNodes: number; maxMilliseconds: number };
  /** Entrée figée de la page normale (même que l'IA). Si présente, aucun recalcul. */
  appInput?: FrozenAppPlanningInput | null;
}): CoachDetOutcome {
  if (!input.engineVersion || !/^[a-f0-9]{64}$/.test(input.engineVersion)) return { kind: "refused", refusals: ["version moteur DET indisponible"] };
  const check = checkCoachReviewContext({
    ctx: input.ctx,
    current: { coachId: input.coachId, athleteId: input.athleteId, snapshot: input.snapshot, inputsHash: input.inputsHash, sourcesVersion: input.sourcesVersion },
  });
  if (check.ok === false) return { kind: "refused", refusals: check.refusals };
  if (!input.reviewContextId) return { kind: "refused", refusals: ["revue non enregistrée (identifiant absent)"] };
  let athlete: PlanAthleteData, config: PlanConfig & { planStartDate: string }, limiterOrder: AppliedLimiterOrder;
  const app = input.appInput ?? null;
  if (app) {
    // Chemin normal : entrée de l'app, jamais reconstruite ni rediagnostiquée.
    if (app.athleteId !== input.athleteId) return { kind: "refused", refusals: ["profil de planification d'un autre athlète : action annulée"] };
    if (input.snapshot.planningInputFingerprint !== app.fingerprint) return { kind: "refused", refusals: ["vérifications enregistrées pour un autre état du profil de planification : refaire les vérifications"] };
    if (app.config.planStartDate !== input.snapshot.planStartDate) return { kind: "refused", refusals: [`date de début incohérente (profil ${String(app.config.planStartDate)} ≠ vérifications ${input.snapshot.planStartDate})`] };
    if (input.snapshot.coachLimiterOrder) return { kind: "refused", refusals: ["l'ordre des limiteurs se règle dans la page (il est déjà inclus dans le profil partagé IA/DET)"] };
    const mism = anchorMismatches(app, input.snapshot.anchors as never);
    if (mism.length) return { kind: "refused", refusals: mism };
    ({ athlete, config } = planningInputFor(app, "det"));
    limiterOrder = {
      mode: app.limiters.origin === "coach_override" ? "coach" : "automatic", source: "app_planning_pipeline",
      automatic: [...app.limiters.appAutomatic], coachConfirmed: app.limiters.coachOverride ? [...app.limiters.coachOverride] : null,
      applied: [...app.limiters.applied],
    };
  } else {
    const automatic = eligibleLimiterMetrics(input.snapshot);
    const orderProblems = limiterOrderProblems(input.snapshot, automatic);
    if (orderProblems.length) return { kind: "refused", refusals: orderProblems };
    ({ athlete, config } = buildCoachPlanInputs(input.snapshot));
    limiterOrder = {
      mode: input.snapshot.coachLimiterOrder ? "coach" : "automatic", source: "manual_coach_inputs", automatic,
      coachConfirmed: input.snapshot.coachLimiterOrder ? [...input.snapshot.coachLimiterOrder] : null,
      applied: [...((config as { identifiedLimitersRaw?: string[] }).identifiedLimitersRaw ?? [])],
    };
  }
  // Sémantique moteur (pas le dictionnaire d'affichage) : primaire non défini ⇒ blocage nommé AVANT le solveur.
  const familyKey = coachFamilyFor(String(config.objective))?.key ?? "unsupported";
  const semantics = traceLimiterSemantics(limiterOrder.applied, familyKey);
  limiterOrder.semantics = semantics;
  limiterOrder.unrecognizedByDet = semantics.resolutions.filter((r) => r.status === "unsupported").map((r) => r.raw);
  if (semantics.blocking) return { kind: "refused", refusals: [`Limiteur principal « ${semantics.blocking.raw} » sans définition DET pour cette famille : ${semantics.blocking.reason}. Rien n'est remplacé ; DET ne génère pas (code blocked_unsupported_limiter).`, ...semantics.blocking.missingItems.map((m) => `Manquant : ${m}`)], blockedUnsupportedLimiter: semantics.blocking, limiterOrder };
  const run = runCoachInputsDet({ athlete, config, reviews: check.reviews, clock: input.ctx!.clock!, brickApprovals: input.ctx!.brickApprovals, limits: input.limits });
  const out = run.out;
  const hard = out.issues.filter((i) => ["critical", "blocking", "error"].includes(i.severity)).map((i) => i.code);
  if (!out.constraintsSatisfied || !out.candidate || run.contextProblems.length) {
    return { kind: "engine_refused", reason: out.reason ?? (run.contextProblems.length ? "contexte_athlete_incoherent" : "contraintes_non_satisfaites"),
      blockingCodes: [...new Set(hard)], blockingIssues: out.issues.filter((i) => ["critical", "blocking", "error"].includes(i.severity)).slice(0, 20).map((i) => ({ code: i.code, week: typeof (i as { week?: unknown }).week === "number" ? (i as { week: number }).week : null, message: String(i.message ?? "").slice(0, 600) })), rejectedSources: run.rejectedSources, contextProblems: run.contextProblems, limiterOrder };
  }
  const candidate = JSON.parse(JSON.stringify(out.candidate)) as ParsedPlan;
  const slotStart = clockFor(input.ctx!.clock!, input.snapshot.planStartDate);
  for (const w of candidate.weeks) for (const sess of w.sessions as unknown as Array<Record<string, unknown>>) {
    if (sess.isRest) continue;
    const id = typeof sess.catalogId === "string" ? sess.catalogId : null;
    const r = id ? run.structuredWorkoutForId(id, typeof sess.durationMin === "number" ? sess.durationMin : undefined)
      : { status: "refused" as const, sourceId: "", reason: "session_without_source_id" };
    // Créneau confirmé par le coach, conservé tel quel (date locale, minute,
    // fuseau, offset réel de l'instant — DST V401). Absent ⇒ aucune heure.
    const start = slotStart({ week: Number(sess.weekNumber), dayIndex: Number(sess.dayIndex), sport: String(sess.sport) });
    if (start) sess.coachStart = {
      provenance: "coach_confirmed", localDate: ymdPlus(input.snapshot.planStartDate, (Number(sess.weekNumber) - 1) * 7 + Number(sess.dayIndex)),
      minuteOfDay: start.minuteOfDay, timeZone: input.ctx!.clock!.timeZone, utcOffsetMinutes: start.utcOffsetMinutes,
    };
    if (r.status === "structured") sess.detStructuredWorkout = JSON.parse(JSON.stringify(r.workout));
    else sess.detStructureRefusal = { sourceId: r.sourceId, reason: r.reason };
  }
  const provenance: DetCoachInputsProvenance = {
    schema: PLAN_PROVENANCE_SCHEMA, engine: "det", engineVersion: input.engineVersion, releaseId: input.releaseId,
    mode: "coach-inputs", reviewContextId: input.reviewContextId, inputsHash: input.inputsHash,
    sourcesVersion: input.sourcesVersion!, coachInputs: JSON.parse(JSON.stringify(input.snapshot)),
    qualifiedSourceIds: input.ctx!.qualifications.map((q) => q.id), admittedSourceIds: run.admittedSourceIds,
    limiterOrder: JSON.parse(JSON.stringify(limiterOrder)),
    family: run.family,
    planningInput: app ? { source: "app_planning_pipeline", fingerprint: app.fingerprint } : { source: "manual_coach_inputs", fingerprint: null },
    brickApprovals: JSON.parse(JSON.stringify(input.ctx!.brickApprovals ?? [])),
    syntheticFixture: false, sourceQualificationIsNotPlanApproval: true, prescriptionAllowed: false, sportingAttestation: false,
    generatedAt: (input.now ?? (() => new Date()))().toISOString(),
    result: { status: "candidate", constraintsSatisfied: true, nodes: out.nodes },
  };
  const plan = {
    ...candidate,
    title: `QA — DET entrées coach NON PRESCRIPTIF — ${input.snapshot.objective}`,
    _qaFixture: true, _qaNonPrescriptive: true, _provenance: provenance,
    _planStartDate: input.snapshot.planStartDate, _objective: input.snapshot.objective,
  } as ParsedPlan & Record<string, unknown>;
  const sessions = candidate.weeks.reduce((n, w) => n + w.sessions.filter((s) => !s.isRest).length, 0);
  return { kind: "accepted", plan, provenance, sessions, limiterOrder, auditCodes: [...new Set(out.issues.map((i) => i.code))].sort() };
}
