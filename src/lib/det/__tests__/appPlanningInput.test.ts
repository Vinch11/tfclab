import { describe, it, expect, vi, beforeEach } from "vitest";

const calls = vi.hoisted(() => ({ prepare: 0, diag: 0, det: [] as Array<{ athlete: unknown; config: Record<string, unknown> }> }));
vi.mock("@/engines/plan/prepareTrainingPlanContext", async (orig) => {
  const m = await orig<typeof import("@/engines/plan/prepareTrainingPlanContext")>();
  return { ...m, prepareTrainingPlanContext: (...a: Parameters<typeof m.prepareTrainingPlanContext>) => { calls.prepare++; return m.prepareTrainingPlanContext(...a); } };
});
vi.mock("@/engines/diagnostic", async (orig) => {
  const m = await orig<Record<string, unknown>>();
  const cd = m.computeDiagnostic as (...a: unknown[]) => unknown;
  return { ...m, computeDiagnostic: (...a: unknown[]) => { calls.diag++; return cd(...a); } };
});
vi.mock("../../../../experimental/det-engine/v401-coach-inputs-core", async (orig) => {
  const m = await orig<Record<string, unknown>>();
  return { ...m, runCoachInputsDet: (i: { athlete: unknown; config: Record<string, unknown> }) => {
    calls.det.push({ athlete: structuredClone(i.athlete), config: structuredClone(i.config) });
    return { out: { issues: [{ code: "stub", severity: "critical", message: "capture" }], constraintsSatisfied: false, candidate: null, reason: "capture", nodes: 0 },
      rejectedSources: [], contextProblems: [], admittedSourceIds: [], family: "semi_marathon", structuredWorkoutForId: () => ({ status: "refused", sourceId: "", reason: "stub" }) };
  } };
});

import { buildAthleteDetInputs, GENERAL_CONFIRMATIONS, CONDITIONAL_CONFIRMATIONS, clockSportsFor, BRICKS_703, type AthleteRecordView, type CoachAnswers, type PlanFormView, type GenuineSourceReviews } from "../athleteDetBridge";
import { findSource, hashCoachInputs } from "../coachDetContext";
import { fingerprintV3SportingSource } from "../../../../scripts/library-v3/sportingQualification800";
import { familySourcePool } from "../familySourcePools";
import { runCoachDetPlan, buildCoachPlanInputs } from "../coachDetRun";
import { runAppPlanningDetPlan } from "../appPlanningDetRun";
import { coachFamilyFor } from "../../../../experimental/det-engine/v401-coach-inputs-core";
import { explicitCoachLimiterOverride, freezeAppPlanningInput, planningInputFor, planningFingerprint, semanticPlanningPayload } from "../appPlanningInput";
import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";

/** Enregistrements SYNTHÉTIQUES au format du dépôt (athletes/snapshots/refs), aucune donnée réelle. */
const COACH = "00000000-0000-4000-8000-0000000000c1";
const A1 = "00000000-0000-4000-8000-0000000000a1";
const runner = (over: Partial<AthleteRecordView> = {}): AthleteRecordView => ({
  athleteId: A1, coachId: COACH, birthDate: "1990-05-01", sex: "F",
  refs: { vma: 18, ftp: 260, css: null, vo2max: 58, weightKg: 58, fcMax: 188,
    sources: { vma: "snapshot", ftp: "profile", css: "none", vo2max: "snapshot", weightKg: "snapshot", fcMax: "profile" } },
  snapshot: { id: "snap-synthetique", date: "2026-10-01", pace_threshold_sec_per_km: 240, tte_observed_min_run: 45, vlamax_run: 0.45, vlamax: null, fatigue_state: "ok" },
  diagnosticLimiters: ["TTE", "VLamax", "VO2max"], ...over,
});
const form = (objective: string, weeks: number, hours: number): PlanFormView => ({
  objective, planStartDate: "2026-10-26", raceDate: new Date(Date.UTC(2026, 9, 26 + weeks * 7 - 1)).toISOString().slice(0, 10),
  weeksAvailable: weeks, weeklyHours: hours, sessionsPerWeek: /70/.test(objective) ? 8 : 5, strengthSessionsPerWeek: 1, maxSessionsPerDay: 2, ambition: "age_group",
});
const days = Array(7).fill(true);
function answers(objective: string, extra: Partial<CoachAnswers> = {}): CoachAnswers {
  const fam = coachFamilyFor(objective)!; const pool = familySourcePool(fam.key);
  const times: Record<string, string> = { run: "07:00", bike: "12:00", swim: "06:00", strength: "19:00", brick: "08:00" };
  const all = { ...GENERAL_CONFIRMATIONS, ...CONDITIONAL_CONFIRMATIONS };
  return {
    provenance: Object.fromEntries(["runThresholdPaceSecPerKm", "runVvo2SpeedMps", "bikeFtpWatts", "cssSecPer100m", "vo2max", "weightKg", "fcMax", "tteRunMin", "vlamaxRun", "vlamaxBike"].map((k) => [k, { kind: "explicit_estimate", uncertainty: "±5 %" }])),
    entered: { runSprintSpeedRangeMps: { value: [5.2, 7.0], kind: "explicit_estimate", method: "SYNTHÉTIQUE sprints 15 s", uncertainty: "±0,2 m/s" },
      bikeSprintPowerRangeWatts: { value: [600, 870], kind: "explicit_estimate", method: "SYNTHÉTIQUE sprints", uncertainty: "±30 W" },
      bikePmaWatts: { value: 390, kind: "explicit_estimate", method: "SYNTHÉTIQUE rampe", uncertainty: "±10 W" } }, swimPaces: {}, athleteLevel: "trained", recentLoad: "moderate", fatigue: "ready", injuryScreen: "cleared_by_coach",
    general: Object.fromEntries(Object.keys(all).map((k) => [k, true])), prerequisitesAllMet: true, unmetPrerequisites: [], contraindicationsAllAbsent: true, presentContraindications: [],
    strengthLoadAndRpeConfirmed: true, clock: { timeZone: "Europe/Brussels", bySport: Object.fromEntries(clockSportsFor(fam, pool).map((s) => [s, { time: times[s], days }])) },
    bricksConfirmed: true, coachLimiterOrder: null, ...extra,
  };
}
/** Revue par séance SYNTHÉTIQUE au format de la grille « Avancé » (représente une revue humaine enregistrée ; test uniquement). */
function genuineFor(rec: AthleteRecordView, objective: string, over: Partial<GenuineSourceReviews> = {}): GenuineSourceReviews {
  const pool = familySourcePool(coachFamilyFor(objective)!.key);
  return { origin: "det_coach_review_contexts", reviewContextId: "ctx-grille-synthetique", coachId: rec.coachId, athleteId: rec.athleteId, reviewedAt: "2026-11-03T10:00:00Z",
    qualifications: pool.ids.map((id) => { const w = findSource(id)!; return { id, sourceFingerprint: fingerprintV3SportingSource(w), preferReviewedV3: true, ...(pool.doses[id] ?? {}),
      evidence: { coachReviewedSource: true, ...Object.fromEntries(Object.keys({ ...GENERAL_CONFIRMATIONS, ...CONDITIONAL_CONFIRMATIONS }).map((k) => [k, true])), currentPhase: w.phase[0], recentLoad: "moderate", fatigue: "ready", injuryScreen: "cleared_by_coach",
        checkedPrerequisites: [...w.prerequisites], checkedContraindications: [...w.contraindications] } as never } as never; }),
    brickApprovals: /70/.test(objective) ? BRICKS_703 : [], ...over };
}

/**
 * Profil de planification SYNTHÉTIQUE au format produit par la page normale
 * (athleteContext.data + buildConfigWithCoachOverrides) : champs physiologiques
 * non nuls qui changeraient si DET recalculait le contexte.
 */
function appPipelineOutput(): { athlete: PlanAthleteData; config: PlanConfig } {
  const athlete = { nom: "Synthétique A1", age: 36, sex: "F", ftp: 260, paceThresholdSecPerKm: 240, css: null, vma: 18, weightKg: 58,
    vlamax: null, vlamaxRun: 0.45, vo2max: 58, tte: 45, fcMax: 188, runEconomyScore: 71, runHrDriftPct: 4.2 } as unknown as PlanAthleteData;
  const config = { objective: "Semi-marathon", ambition: "Age group", weeksAvailable: 8, weeklyHours: 6, sessionsPerWeek: 5, planStartDate: "2026-10-26",
    identifiedLimitersRaw: ["VO2max", "TTE", "VLamax"], identifiedLimiters: ["VO2max", "TTE", "VLamax"],
    fatigueState: "fatigued", tss7d: 412, targetRaceDurationMin: 98, limiterConfidence: { VO2max: 0.62, TTE: 0.48 }, uncertaintyNotes: ["drift FC estimé"],
    athleteId: A1 } as unknown as PlanConfig;
  return { athlete, config };
}
async function frozen(coachOverride: string[] | null = null) {
  const { athlete, config } = appPipelineOutput();
  return freezeAppPlanningInput({ athleteId: A1, athlete, config, appAutomaticLimiters: ["TTE", "VLamax", "VO2max"], coachOverride, planStartDate: "2026-10-26" });
}
async function runWith(app: Awaited<ReturnType<typeof frozen>> | null, rec = runner(), snapOver: Record<string, unknown> = {}, manual = false) {
  const f = form("Semi-marathon", 8, 6);
  const fp = app?.fingerprint ?? null;
  const b = buildAthleteDetInputs(rec, f, answers("Semi-marathon"), { ...genuineFor(rec, f.objective), planningInputFingerprint: fp }, fp);
  const snapshot = { ...b.snapshot!, coachLimiterOrder: null, ...snapOver };
  const inputsHash = await hashCoachInputs(snapshot);
  const run = manual ? runCoachDetPlan : runAppPlanningDetPlan;
  return run({ reviewContextId: "ctx", ctx: { ...b.ctx!, inputsHash, sourcesVersion: "b".repeat(64) }, coachId: COACH, athleteId: rec.athleteId,
    snapshot, inputsHash, sourcesVersion: "b".repeat(64), engineVersion: "a".repeat(64), releaseId: null, appInput: app });
}
beforeEach(() => { calls.prepare = 0; calls.diag = 0; calls.det = []; vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {}); });

describe("[frontière moquée — solveur capturé, pas une preuve d'acceptation] adaptateur profil de l'app → DET", () => {
  it.each([14.5, 16.5, 17.5])("VMA %s km/h : conversion exacte vers les ancres revues, sans faux refus du profil partagé", async (vma) => {
    const { athlete, config } = appPipelineOutput();
    const app = await freezeAppPlanningInput({ athleteId: A1, athlete: { ...athlete, vma, paceThresholdSecPerKm: 300 }, config,
      appAutomaticLimiters: ["TTE", "VLamax", "VO2max"], coachOverride: null, planStartDate: "2026-10-26" });
    const rec = runner();
    rec.refs.vma = vma;
    rec.snapshot = { ...rec.snapshot, pace_threshold_sec_per_km: 300 };
    const out = await runWith(app, rec);
    expect(out.kind).toBe("engine_refused"); // le moteur capturé est atteint ; il ne retourne aucun plan
    expect(calls.det).toHaveLength(1);
    expect((calls.det[0].athlete as PlanAthleteData).vma).toBe(vma);
    expect(calls.diag).toBe(0);
    expect(calls.prepare).toBe(0);
  });
  it("n'appelle ni computeDiagnostic ni prepareTrainingPlanContext ; le solveur reçoit l'athlète et la config de l'app à l'identique", async () => {
    const app = await frozen();
    const out = await runWith(app);
    expect(calls.diag).toBe(0); expect(calls.prepare).toBe(0);
    expect(calls.det).toHaveLength(1);
    const { athlete, config } = appPipelineOutput();
    expect(calls.det[0].athlete).toEqual(athlete);
    expect(calls.det[0].config.identifiedLimitersRaw).toEqual(["VO2max", "TTE", "VLamax"]);
    for (const k of ["fatigueState", "tss7d", "targetRaceDurationMin", "limiterConfidence", "uncertaintyNotes"]) expect(calls.det[0].config[k]).toEqual((config as unknown as Record<string, unknown>)[k]);
    expect((calls.det[0].athlete as Record<string, unknown>).runEconomyScore).toBe(71);
    expect((calls.det[0].athlete as Record<string, unknown>).runHrDriftPct).toBe(4.2);
    expect(out.kind).toBe("engine_refused");
    if (out.kind === "engine_refused") { expect(out.limiterOrder).toMatchObject({ mode: "automatic", source: "app_planning_pipeline", automatic: ["TTE", "VLamax", "VO2max"], coachConfirmed: null, applied: ["VO2max", "TTE", "VLamax"], unrecognizedByDet: ["VLamax"] });
      expect(out.limiterOrder.semantics!.rawPriorities).toEqual(["VO2max", "TTE", "VLamax"]);
      expect(out.limiterOrder.semantics!.resolutions.find((r) => r.raw === "VLamax")!.policy).toBe("retained_unsupported_secondary"); }
  });
  it("témoin : l'ancien chemin manuel recalcule (prepareTrainingPlanContext appelé) et perd fatigue/charge", async () => {
    await runWith(null, runner(), {}, true);
    expect(calls.prepare).toBeGreaterThan(0);
    expect(calls.det[0].config.fatigueState ?? null).not.toBe("fatigued");
  });
  it("profil absent dans le chemin normal : refus avant tout recalcul, aucun repli vers la saisie manuelle", async () => {
    const out = await runWith(null);
    expect(out.kind).toBe("refused");
    if (out.kind === "refused") expect(out.refusals.join(" ")).toMatch(/aucun diagnostic n'est reconstruit/);
    expect(calls.prepare).toBe(0);
    expect(calls.diag).toBe(0);
    expect(calls.det).toHaveLength(0);
  });
  it("priorités déclarées différentes de la config : refus, aucun appel moteur ni remplacement", async () => {
    const app = await frozen();
    const out = await runWith({ ...app, limiters: { ...app.limiters, applied: ["TTE", "VO2max", "VLamax"] } });
    expect(out.kind).toBe("refused");
    expect(calls.prepare).toBe(0);
    expect(calls.diag).toBe(0);
    expect(calls.det).toHaveLength(0);
  });
  it("empreinte IA = DET (hors champ moteur _outputFormat), et l'entrée figée est immuable", async () => {
    const app = await frozen();
    const ai = planningInputFor(app, "ai"), det = planningInputFor(app, "det");
    expect((det.config as unknown as Record<string, unknown>)._outputFormat).toBe("json");
    expect(semanticPlanningPayload(ai.athlete, ai.config)).toEqual(semanticPlanningPayload(det.athlete, det.config));
    expect(await planningFingerprint(det.athlete, det.config)).toBe(app.fingerprint);
    expect(() => { (app.config as unknown as Record<string, unknown>).tss7d = 1; }).toThrow();
  });
  it("ordre automatique de l'app jamais étiqueté « coach » ; ordre choisi dans la page tracé comme coach", async () => {
    expect((await frozen()).limiters.origin).toBe("app_automatic");
    const o = await runWith(await frozen(["VO2max", "TTE", "VLamax"]));
    if (o.kind !== "engine_refused") throw new Error(o.kind);
    expect(o.limiterOrder).toMatchObject({ mode: "coach", coachConfirmed: ["VO2max", "TTE", "VLamax"] });
  });
  it("vérifications enregistrées pour un autre profil (empreinte) : refus, aucun appel moteur", async () => {
    const o = await runWith(await frozen(), runner(), { planningInputFingerprint: "f".repeat(64) });
    expect(o.kind).toBe("refused"); expect(calls.det).toHaveLength(0);
  });
  it("revue humaine liée à un autre profil : non reprise (bloquée, raison nommée)", async () => {
    const app = await frozen();
    const b = buildAthleteDetInputs(runner(), form("Semi-marathon", 8, 6), answers("Semi-marathon"), { ...genuineFor(runner(), "Semi-marathon"), planningInputFingerprint: "0".repeat(64) }, app.fingerprint);
    expect(b.ctx).toBeNull();
    expect(b.sourceReview.status === "blocked_missing_source_review" && b.sourceReview.reason).toMatch(/autre état du profil/);
  });
  it("date de début : intégrée avant l'empreinte ; incohérence refusée", async () => {
    const app = await frozen();
    expect(app.config.planStartDate).toBe("2026-10-26");
    const { athlete, config } = appPipelineOutput();
    await expect(freezeAppPlanningInput({ athleteId: A1, athlete, config, appAutomaticLimiters: [], coachOverride: null, planStartDate: "2026-11-02" })).rejects.toThrow(/date de début/);
  });
  it("origine coach seulement sur choix explicite de limiteurs (pas n'importe quel payload)", () => {
    expect(explicitCoachLimiterOverride([], { prohibitions: ["x"] } as never, ["TTE"])).toBeNull();
    expect(explicitCoachLimiterOverride([], null, ["TTE"])).toBeNull();
    expect(explicitCoachLimiterOverride([], { limiterOrder: ["TTE"] }, ["TTE"])).toEqual(["TTE"]);
    expect(explicitCoachLimiterOverride([], { overriddenByCoach: { primary: true } }, ["VO2max"])).toEqual(["VO2max"]);
    expect(explicitCoachLimiterOverride(["VLamax"], null, ["VLamax"])).toEqual(["VLamax"]);
  });
  it("deux réglages coach : la trace reprend l'ordre effectivement résolu par la config de la page", () => {
    expect(explicitCoachLimiterOverride(["TTE", "VO2max"], { limiterOrder: ["VO2max", "TTE"] }, ["VO2max", "TTE"]))
      .toEqual(["VO2max", "TTE"]);
  });
  it("exclusion explicite de tous les limiteurs : origine coach conservée, même pour un ordre vide", async () => {
    const { athlete, config } = appPipelineOutput();
    const applied: string[] = [];
    const app = await freezeAppPlanningInput({ athleteId: A1, athlete, config: { ...config, identifiedLimitersRaw: applied },
      appAutomaticLimiters: ["TTE"], coachOverride: explicitCoachLimiterOverride([], { excludedLimiterMetrics: ["TTE"] }, applied),
      planStartDate: "2026-10-26" });
    expect(app.limiters).toMatchObject({ origin: "coach_override", coachOverride: [], applied: [] });
  });
  it("ordre coach différent de la config : gel refusé au lieu d'enregistrer une provenance contradictoire", async () => {
    await expect(frozen(["TTE", "VO2max", "VLamax"])).rejects.toThrow(/ordre des limiteurs/);
  });
  it("aucune métrique non détectée n'est ajoutée : applied = identifiedLimitersRaw de l'app", async () => {
    const app = await frozen();
    expect(app.limiters.applied).toEqual(["VO2max", "TTE", "VLamax"]);
  });
  it("changement d'athlète : profil d'un autre athlète refusé, aucun appel moteur", async () => {
    const app = await frozen();
    const other = runner({ athleteId: "00000000-0000-4000-8000-0000000000a2" });
    const o = await runWith(app, other);
    expect(o.kind).toBe("refused"); expect(calls.det).toHaveLength(0);
  });
  it("ancre revue divergente du profil de l'app : refus explicite, jamais substituée", async () => {
    const rec = runner({ snapshot: { ...runner().snapshot!, pace_threshold_sec_per_km: 250 } });
    const o = await runWith(await frozen(), rec);
    expect(o.kind).toBe("refused");
    if (o.kind === "refused") expect(o.refusals.join(" ")).toMatch(/allure seuil/);
  });
  it("revue de sources toujours exigée séparément : sans revue réelle, le pont bloque (aucune fausse revue)", () => {
    const b = buildAthleteDetInputs(runner(), form("Semi-marathon", 8, 6), answers("Semi-marathon"));
    expect(b.ctx).toBeNull();
    expect(b.sourceReview.status).toBe("blocked_missing_source_review");
  });
  it("le chemin manuel avancé reste disponible et distinct", () => {
    const b = buildAthleteDetInputs(runner(), form("Semi-marathon", 8, 6), answers("Semi-marathon"), genuineFor(runner(), "Semi-marathon"));
    expect(buildCoachPlanInputs(b.snapshot!).config.identifiedLimitersRaw).toBeDefined();
  });
});
