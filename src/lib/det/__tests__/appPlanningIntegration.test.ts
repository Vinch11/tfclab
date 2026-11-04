/**
 * INTÉGRATION RÉELLE (aucun mock moteur) : enregistrements SYNTHÉTIQUES au format du dépôt
 * → pipeline de la page (computeAppAthleteContext + buildAppPlanConfig, extraits tels quels)
 * → profil figé partagé → IA (transport injecté, AUCUN appel IA payant) et DET (vrai solveur +
 * validateurs finaux) → sauvegarde append-only (transport mémoire) → réouverture.
 * La revue des séances est SYNTHÉTIQUE (test uniquement) ; elle n'est pas une revue scientifique.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { bindAppPlanMetadata, planArchiveMetadata } from "@/lib/plan/generatedPlanMetadata";
import { computeAppAthleteContext, buildAppPlanConfig, type AppPlanFormState } from "@/lib/plan/appPlanningPipeline";
import { freezeAppPlanningInput, planningInputFor, semanticPlanningPayload, explicitCoachLimiterOverride } from "../appPlanningInput";
import { buildAthleteRecordView } from "../appRecordView";
import { buildAthleteDetInputs, GENERAL_CONFIRMATIONS, CONDITIONAL_CONFIRMATIONS, clockSportsFor, bricksForFamily, type CoachAnswers, type GenuineSourceReviews, type AthleteRecordView } from "../athleteDetBridge";
import { findSource, hashCoachInputs } from "../coachDetContext";
import { fingerprintV3SportingSource } from "../../../../scripts/library-v3/sportingQualification800";
import { familySourcePool } from "../familySourcePools";
import { runAppPlanningDetPlan } from "../appPlanningDetRun";
import { coachFamilyFor } from "../../../../experimental/det-engine/v401-coach-inputs-core";
import { rankPrescriptionGaps } from "@/lib/limiterPrescription";
import * as detEngine from "../../../../experimental/det-engine/engine";
import { triClock, swimPaces } from './coachDetFamilies.test.shared';

const COACH = "00000000-0000-4000-8000-0000000000c1";
const A1 = "00000000-0000-4000-8000-0000000000a1";
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
    brickApprovals: bricksForFamily(coachFamilyFor(objective)!.key), ...over };
}

const toHm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const variedClock = { timeZone: "Europe/Brussels", bySport: {
  run: { time: "", days, perDay: [1080, 360, 540, 720, 900, 1020, 1140].map(toHm) },
  strength: { time: "", days, perDay: [900, 900, 1080, 1200, 540, 600, 720].map(toHm) },
  bike: { time: "", days, perDay: [660, 660, 840, 1020, 720, 780, 900].map(toHm) } } };

/** Lignes SYNTHÉTIQUES au format `athletes` / `snapshots` (aucune donnée réelle). */
const athleteRow = { id: A1, name: "Synthétique A1", birth_date: "1991-01-01", sex: "M", active_snapshot_id: "snap-syn-1", refs: { fcMax: 188 } };
const snapRow = (pace: number) => ({ id: "snap-syn-1", athlete_id: A1, date: "2026-10-01", sport_main: "run", vma: 18, ftp: 300, weight_kg: 72, vo2max: 58, fc_max: 188,
  pace_threshold_sec_per_km: pace, tte_observed_min_run: 45, vlamax_run: null, fatigue_state: "ok", tss_7d: 380, run_economy_score: 68, run_hr_drift_pct: 3.5 });
const formState = (objective: string, weeks: number, hours: number, sessions: number): AppPlanFormState => ({
  objective, ambition: "age_group", planStartDate: new Date(2026, 9, 26), raceName: "", raceDate: new Date(Date.UTC(2026, 9, 26 + weeks * 7 - 1)).toISOString().slice(0, 10),
  raceFormat: "continuous", raceGoals: [], trailDistanceKm: "", trailElevationM: "", trailTargetTimeH: "", trailMaxAltitudeM: "",
  weeksAvailable: weeks, weeklyHours: String(hours), sessionsPerWeek: String(sessions), maxSessionsPerDay: "2", strengthSessionsPerWeek: "1",
  deloadCadence: "auto", constraints: "", trainingLevel: "auto", terrainAvailability: "auto", lockAmbition: false, crossTrainingVelo: false, crossTrainingNatation: false,
  chronicWeeklyHours: "", recentWeeklyHours: "", recentWeeksCount: "", maxDoubleDaysPerWeek: "", coachLimiterOrder: [], currentAthleteId: A1,
});

async function pagePipeline(pace: number, objective: string, weeks: number, hours: number, sessions: number, vma = 18) {
  const snapshots = [{ ...snapRow(pace), ...(/Ironman/.test(objective) ? {sport_main:'tri',css:95} : {}), vma }];
  const ctx = computeAppAthleteContext(athleteRow, objective, "age_group", { snapshots, tests: [], checkins: [] })!;
  const st = formState(objective, weeks, hours, sessions);
  const config = buildAppPlanConfig(ctx.diagnostic, st);
  const applied = (config as { identifiedLimitersRaw?: string[] }).identifiedLimitersRaw ?? [];
  const frozen = await freezeAppPlanningInput({ athleteId: A1, athlete: ctx.data, config, planStartDate: "2026-10-26",
    appAutomaticLimiters: rankPrescriptionGaps(ctx.diagnostic.limiter.gapAnalysis).map((g) => g.metric), coachOverride: explicitCoachLimiterOverride([], null, applied) });
  const record = buildAthleteRecordView(athleteRow, snapshots, COACH, ctx.diagnostic);
  return { ctx, config, frozen, record, st };
}
async function runDet(p: Awaited<ReturnType<typeof pagePipeline>>, objective: string, weeks: number, hours: number, sessions: number, extraAnswers:Partial<CoachAnswers>={}) {
  const f = { objective, planStartDate: "2026-10-26", raceDate: p.st.raceDate, weeksAvailable: weeks, weeklyHours: hours, sessionsPerWeek: sessions, strengthSessionsPerWeek: 1, maxSessionsPerDay: 2, ambition: "age_group" };
  const b = buildAthleteDetInputs(p.record, f, answers(objective, { clock: variedClock, ...extraAnswers }), { ...genuineFor(p.record, objective), planningInputFingerprint: p.frozen.fingerprint }, p.frozen.fingerprint);
  expect(b.sourceReview.status).toBe("reviewed");
  const inputsHash = await hashCoachInputs(b.snapshot!);
  const out = runAppPlanningDetPlan({ reviewContextId: "ctx-syn", ctx: { ...b.ctx!, inputsHash, sourcesVersion: "b".repeat(64) }, coachId: COACH, athleteId: A1,
    snapshot: b.snapshot!, inputsHash, sourcesVersion: "b".repeat(64), engineVersion: "a".repeat(64), releaseId: null, now: () => new Date("2026-11-04T00:00:00Z"),
    limits: /Ironman/.test(objective)?undefined:{ maxNodes: 25000, maxMilliseconds: 120000 }, appInput: p.frozen });
  return { b, out };
}
beforeAll(() => { vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); }); });

describe("[intégration réelle] pipeline de la page → profil figé → IA et DET (vrai solveur)", () => {
  it('Ironman 16 sem./14 h : profil et priorités automatiques de l’app conservés dans le calendrier complet',async()=>{
    const p=await pagePipeline(240,'Ironman',16,14,10),before=structuredClone(p.ctx.diagnostic);
    const clock={timeZone:triClock.timeZone,bySport:Object.fromEntries(Object.entries(triClock.minutesBySport).map(([sport,row])=>[sport,{time:'',days,perDay:(sport==='run'?[420,420,1080,1200,1080,420,420]:row).map(toHm)}]))};
    const {out,b}=await runDet(p,'Ironman',16,14,10,{clock,swimPaces:Object.fromEntries(Object.entries(swimPaces).map(([domain,value])=>[domain,{value,kind:'explicit_estimate',method:'SYNTHÉTIQUE QA',uncertainty:'±5 s/100 m'}]))});
    process.stdout.write('IM_APP_PIPELINE '+JSON.stringify({kind:out.kind,priorities:p.frozen.limiters.applied,missing:b.missing,...(out.kind==='engine_refused'?{issues:out.blockingIssues}:out.kind==='refused'?{refusals:out.refusals}:{sessions:out.sessions})})+'\n');
    expect(out.kind).toBe('accepted');
    expect(p.ctx.diagnostic).toEqual(before);
    if(out.kind==='accepted'){
      expect(out.plan.weeks).toHaveLength(16);
      expect(out.limiterOrder.applied).toEqual(p.frozen.limiters.applied);
      expect(out.provenance.planningInput).toEqual({source:'app_planning_pipeline',fingerprint:p.frozen.fingerprint});
      expect(out.provenance.prescriptionAllowed).toBe(false);
    }
  },180000);
  it("VMA 17,5 km/h du profil enregistré : la conversion d'unité atteint le vrai solveur sans faux refus d'ancre", async () => {
    const p = await pagePipeline(240, "Semi", 8, 6, 5, 17.5);
    const solver = vi.spyOn(detEngine, "constructDeterministicPlan");
    try {
      const { b, out } = await runDet(p, "Semi", 8, 6, 5);
      expect(b.snapshot!.anchors.runVvo2SpeedMps!.value).toBe(17.5 / 3.6);
      expect(solver).toHaveBeenCalledTimes(1);
      expect(solver.mock.calls[0][0].vma).toBe(17.5);
      // This checks delivery to the solver, not approval of any resulting plan.
      expect(["accepted", "engine_refused"]).toContain(out.kind);
    } finally { solver.mockRestore(); }
  }, 200000);
  it("une autre allure seuil enregistrée change le diagnostic et DET refuse son primaire non pris en charge, sans reprendre le plan précédent", async () => {
    const before = await pagePipeline(222, "Marathon", 16, 7, 4);
    const after = await pagePipeline(300, "Marathon", 16, 7, 4);
    expect(after.frozen.fingerprint).not.toBe(before.frozen.fingerprint);
    expect(before.frozen.limiters.applied).toEqual(["Durabilité", "TTE"]);
    expect(after.frozen.limiters.applied[0]).toBe("VLamax");
    const solver = vi.spyOn(detEngine, "constructDeterministicPlan");
    try {
      const accepted = await runDet(before, "Marathon", 16, 7, 4);
      const refused = await runDet(after, "Marathon", 16, 7, 4);
      expect(accepted.out.kind).toBe("accepted");
      expect(refused.out.kind).toBe("refused");
      if (refused.out.kind !== "refused") return;
      expect(refused.out.blockedUnsupportedLimiter).toMatchObject({ code: "blocked_unsupported_limiter", raw: "VLamax" });
      expect(refused.out.limiterOrder!.applied).toEqual(after.config.identifiedLimitersRaw);
      expect(solver).toHaveBeenCalledTimes(1);
      expect(before.frozen.athlete.paceThresholdSecPerKm).toBe(222);
      expect(after.frozen.athlete.paceThresholdSecPerKm).toBe(300);
    } finally { solver.mockRestore(); }
  }, 200000);

  it("l'ordre choisi dans la page atteint le vrai solveur et active la branche correspondante, sans modifier le diagnostic", async () => {
    const p = await pagePipeline(222, "Marathon", 16, 7, 4);
    const rawBefore = structuredClone(p.ctx.diagnostic);
    const order = [...p.frozen.limiters.applied].reverse();
    const config = buildAppPlanConfig(p.ctx.diagnostic, { ...p.st, coachLimiterOrder: order });
    const frozen = await freezeAppPlanningInput({ athleteId: A1, athlete: p.ctx.data, config, planStartDate: "2026-10-26",
      appAutomaticLimiters: p.frozen.limiters.appAutomatic,
      coachOverride: explicitCoachLimiterOverride(order, null, config.identifiedLimitersRaw ?? []) });
    // Espion en passage réel : aucun résultat moteur n'est substitué.
    const solver = vi.spyOn(detEngine, "constructDeterministicPlan");
    try {
      const automatic = await runDet(p, "Marathon", 16, 7, 4);
      const coached = await runDet({ ...p, config, frozen }, "Marathon", 16, 7, 4);
      expect(solver).toHaveBeenCalledTimes(2);
      for (const [index, expected] of [p.frozen, frozen].entries()) {
        const [athlete, receivedConfig] = solver.mock.calls[index];
        expect(athlete).toEqual(expected.athlete);
        expect(semanticPlanningPayload(athlete, receivedConfig)).toEqual(semanticPlanningPayload(
          expected.athlete as Parameters<typeof semanticPlanningPayload>[0], expected.config));
      }
      expect(automatic.out.kind).toBe("accepted");
      expect(coached.out.kind).toBe("accepted");
      if (automatic.out.kind !== "accepted" || coached.out.kind !== "accepted") return;
      expect(automatic.out.limiterOrder.applied).toEqual(["Durabilité", "TTE"]);
      expect(coached.out.limiterOrder).toMatchObject({ mode: "coach", applied: ["TTE", "Durabilité"] });
      expect(automatic.out.auditCodes).toContain("det_v403_race_durability_coverage_verified");
      expect(coached.out.auditCodes).toContain("det_v355_exact_tte_candidate_preference_audit");
      expect(coached.out.auditCodes).not.toContain("det_v403_race_durability_coverage_verified");
      expect(p.ctx.diagnostic).toEqual(rawBefore);
    } finally { solver.mockRestore(); }
  }, 200000);

  it("semi 8 sem./6 h : limiteurs produits par le diagnostic de l'app, ACCEPTÉ, calendrier complet, entrée identique à l'IA, sauvegarde/réouverture", async () => {
    const p = await pagePipeline(240, "Semi", 8, 6, 5);
    // Le diagnostic réel de l'app a produit les limiteurs (pas une liste écrite dans le test).
    const pipelineLimiters = (p.config as { identifiedLimitersRaw?: string[] }).identifiedLimitersRaw ?? [];
    expect(pipelineLimiters.length).toBeGreaterThan(0);
    expect(p.frozen.limiters).toMatchObject({ applied: pipelineLimiters, origin: "app_automatic", coachOverride: null });
    // Champs réellement préparés par le pipeline et présents dans l'entrée partagée.
    const raw = (p.ctx.diagnostic as unknown as { _rawInput: Record<string, unknown> })._rawInput;
    expect(raw.tss7d).toBe(380); expect(raw.runEconomyScore).toBe(68); expect(raw.runHrDriftPct).toBe(3.5); expect(raw.fatigueState).toBe("ok");
    expect(typeof raw.targetRaceDurationMin).toBe("number");
    expect(p.frozen.config).toEqual({ ...p.config, planStartDate: "2026-10-26" });
    // IA : même entrée (transport injecté, aucun appel IA).
    const ai = planningInputFor(p.frozen, "ai");
    const { b, out } = await runDet(p, "Semi", 8, 6, 5);
    expect(out.kind).toBe("accepted");
    if (out.kind !== "accepted") return;
    const det = planningInputFor(p.frozen, "det");
    expect(semanticPlanningPayload(ai.athlete, ai.config)).toEqual(semanticPlanningPayload(det.athlete, det.config));
    expect(out.limiterOrder).toMatchObject({ mode: "automatic", source: "app_planning_pipeline", applied: pipelineLimiters });
    expect(out.provenance.planningInput).toEqual({ source: "app_planning_pipeline", fingerprint: p.frozen.fingerprint });
    expect((out.provenance.coachInputs as { planningInputFingerprint?: string }).planningInputFingerprint).toBe(p.frozen.fingerprint);
    expect(b.snapshot!.coachLimiterOrder).toBeNull();
    expect(out.provenance.prescriptionAllowed).toBe(false);
    const weeks = (out.plan as unknown as { weeks: { sessions: { isRest?: boolean }[] }[] }).weeks;
    expect(weeks).toHaveLength(8);
    for (const w of weeks) expect(w.sessions.some((x) => !x.isRest)).toBe(true);
    // Sauvegarde append-only (transport mémoire, PAS une preuve JWT) + réouverture.
    const { AppendOnlyPlanVersionSaver } = await import("@/lib/plan/appendOnlyPlanVersionSave");
    const { restoreStructuredPlan } = await import("@/lib/plan/restoreStructuredPlan");
    const { isDetCoachInputsProvenance } = await import("@/lib/plan/planProvenance");
    const db = new Map<string, Record<string, unknown>>();
    const transport = { insert: async (row: { id: string }) => { db.set(row.id, JSON.parse(JSON.stringify(row))); return { error: null }; },
      readById: async (id: string) => ({ data: db.get(id) ?? null, error: null }) };
    const saved = await new AppendOnlyPlanVersionSaver({ transport } as never).save({ athlete_id: A1, coach_id: COACH, plan_json: out.plan, objective: "Semi",
      weeks_count: 8, sessions_count: out.sessions, validator_score: null, validator_grade: null, validator_summary: null } as never);
    expect(saved.status).toBe("CONFIRMED");
    const restored = restoreStructuredPlan((db.get(saved.attemptId!) as { plan_json: unknown }).plan_json as never);
    const prov = (restored as unknown as { _provenance: Record<string, unknown> })._provenance;
    expect(isDetCoachInputsProvenance(prov)).toBe(true);
    expect(prov.planningInput).toEqual({ source: "app_planning_pipeline", fingerprint: p.frozen.fingerprint });
    expect(prov.limiterOrder).toMatchObject({ source: "app_planning_pipeline", applied: pipelineLimiters });
  }, 200000);

  it("semi 30 sem./6 h : diagnostic de l'app inchangé, vrais mésocycles et calendrier complet", async () => {
    const p = await pagePipeline(240, "Semi", 30, 6, 5);
    const before = structuredClone(p.ctx.diagnostic);
    const applied = [...p.frozen.limiters.applied];
    const { out } = await runDet(p, "Semi", 30, 6, 5);
    expect(out.kind).toBe("accepted");
    if (out.kind !== "accepted") throw new Error(JSON.stringify(out.kind === "engine_refused" ? out.blockingIssues : out));
    expect(out.plan.weeks).toHaveLength(30);
    expect(out.limiterOrder.applied).toEqual(applied);
    expect(p.ctx.diagnostic).toEqual(before);
    expect(out.auditCodes).toContain("det_v358_measured_running_mesocycles_verified");
    expect(out.auditCodes).not.toContain("det_v358_measured_running_mesocycles_unverified");
    expect(out.provenance.planningInput).toEqual({ source: "app_planning_pipeline", fingerprint: p.frozen.fingerprint });
    expect(out.provenance.prescriptionAllowed).toBe(false);
  }, 200000);

  it("marathon 16 sem./7 h depuis le VRAI diagnostic de l'app (enregistrement inchangé) : « Durabilité » primaire défini côté moteur (V403), ACCEPTÉ, priorités brutes conservées, jamais remplacé par TTE", async () => {
    const p = await pagePipeline(222, "Marathon", 16, 7, 4);
    const applied = p.frozen.limiters.applied;
    expect(applied).toEqual(["Durabilité", "TTE"]); // produit par le diagnostic réel, pas écrit ici
    expect(p.frozen.limiters.origin).toBe("app_automatic");
    const { b, out } = await runDet(p, "Marathon", 16, 7, 4);
    expect(b.snapshot!.coachLimiterOrder).toBeNull();
    expect(out.kind).toBe("accepted");
    if (out.kind !== "accepted") return;
    // Config transmise au solveur : libellés bruts de l'app, ordre inchangé (aucune traduction écrite dans la config).
    expect(planningInputFor(p.frozen, "det").config.identifiedLimitersRaw).toEqual(["Durabilité", "TTE"]);
    expect(out.limiterOrder.applied).toEqual(["Durabilité", "TTE"]);
    expect(out.limiterOrder.unrecognizedByDet).toEqual([]);
    expect(out.limiterOrder.semantics!.rawPriorities).toEqual(["Durabilité", "TTE"]);
    expect(out.limiterOrder.semantics!.resolutions.map((r) => [r.raw, r.key, r.role, r.policy])).toEqual([
      ["Durabilité", "durability_race_relative", "primary", "det_primary_branch"], ["TTE", "tte", "secondary", "native_validators_only"]]);
    // Branche Durabilité réellement exercée (audit bloquant vérifié), branche TTE primaire NON activée.
    expect(out.auditCodes).toContain("det_v403_race_durability_coverage_verified");
    expect(out.auditCodes).not.toContain("det_v403_race_durability_coverage_missing");
    expect(out.auditCodes).not.toContain("det_v355_exact_tte_candidate_preference_audit");
    expect(out.auditCodes).toContain("det_v351_marathon_exact_source_horizon_evidence_verified");
    expect(out.auditCodes).toContain("det_v316_strict_periodization_verified");
    expect(out.provenance.prescriptionAllowed).toBe(false);
    expect((out.provenance.limiterOrder as { semantics: { scientificReview: boolean } }).semantics.scientificReview).toBe(false);
    const weeks = (out.plan as unknown as { weeks: { sessions: { isRest?: boolean }[] }[] }).weeks;
    expect(weeks).toHaveLength(16);
    // Sauvegarde append-only (transport mémoire) + réouverture : priorités brutes et sémantique conservées.
    const { AppendOnlyPlanVersionSaver } = await import("@/lib/plan/appendOnlyPlanVersionSave");
    const { restoreStructuredPlan } = await import("@/lib/plan/restoreStructuredPlan");
    const db = new Map<string, Record<string, unknown>>();
    const transport = { insert: async (row: { id: string }) => { db.set(row.id, JSON.parse(JSON.stringify(row))); return { error: null }; },
      readById: async (id: string) => ({ data: db.get(id) ?? null, error: null }) };
    const generated = bindAppPlanMetadata(out.plan, p.frozen);
    const archiveMetadata = planArchiveMetadata(generated, {
      _planStartDate: "2028-01-03", _objective: "IM", _raceName: "changed live form", _raceDate: "2028-06-04", _raceGoals: [], _coachLimiterOrder: ["VO2max"],
    });
    expect(archiveMetadata._planStartDate).toBe(p.frozen.config.planStartDate);
    expect(archiveMetadata._objective).toBe(p.frozen.config.objective);
    expect(generated.weeks).toEqual(out.plan.weeks);
    const saved = await new AppendOnlyPlanVersionSaver({ transport } as never).save({ athlete_id: A1, coach_id: COACH, plan_json: { ...generated, ...archiveMetadata }, objective: archiveMetadata._objective,
      weeks_count: 16, sessions_count: out.sessions, validator_score: null, validator_grade: null, validator_summary: null } as never);
    expect(saved.status).toBe("CONFIRMED");
    const restored = restoreStructuredPlan((db.get(saved.attemptId!) as { plan_json: unknown }).plan_json as never);
    expect(planArchiveMetadata(restored!, archiveMetadata)).toEqual(archiveMetadata);
    const prov = (restored as unknown as { _provenance: { limiterOrder: { applied: string[]; semantics: { rawPriorities: string[] } }; planningInput: unknown } })._provenance;
    expect(prov.limiterOrder.applied).toEqual(["Durabilité", "TTE"]);
    expect(prov.limiterOrder.semantics.rawPriorities).toEqual(["Durabilité", "TTE"]);
    expect(prov.planningInput).toEqual({ source: "app_planning_pipeline", fingerprint: p.frozen.fingerprint });
  }, 200000);

  it("70.3 12 sem./9 h depuis le VRAI pipeline de la page (enregistrement tri synthétique) : REFUS moteur réel nommé (brick S1 ≥140 min), priorités brutes conservées", async () => {
    const triSnap = { ...snapRow(240), sport_main: "tri", css: 95, vlamax: 0.55 };
    const snapshots = [triSnap];
    const ctx = computeAppAthleteContext(athleteRow, "703", "age_group", { snapshots, tests: [], checkins: [] })!;
    const st = formState("703", 12, 9, 8);
    const config = buildAppPlanConfig(ctx.diagnostic, st);
    const applied = (config as { identifiedLimitersRaw?: string[] }).identifiedLimitersRaw ?? [];
    const frozen = await freezeAppPlanningInput({ athleteId: A1, athlete: ctx.data, config, planStartDate: "2026-10-26",
      appAutomaticLimiters: rankPrescriptionGaps(ctx.diagnostic.limiter.gapAnalysis).map((g) => g.metric), coachOverride: explicitCoachLimiterOverride([], null, applied) });
    const record = buildAthleteRecordView(athleteRow, snapshots, COACH, ctx.diagnostic);
    const sw = { recovery: 120, moderate_lt1: 110, tempo: 103, im_pace: 108, "703_pace": 102, marathon_pace: 103, sub_threshold: 98, semi_pace: 98, mlss: 95, vo2max: 88, neuromuscular: 80 } as const;
    const f = { objective: "703", planStartDate: "2026-10-26", raceDate: st.raceDate, weeksAvailable: 12, weeklyHours: 9, sessionsPerWeek: 8, strengthSessionsPerWeek: 1, maxSessionsPerDay: 2, ambition: "age_group" };
    const a = answers("703", { swimPaces: Object.fromEntries(Object.entries(sw).map(([k, v]) => [k, { value: v, kind: "explicit_estimate", method: "SYNTHÉTIQUE test 400/200", uncertainty: "±3 s" }])) as never });
    const b = buildAthleteDetInputs(record, f, a, { ...genuineFor(record, "703"), planningInputFingerprint: frozen.fingerprint }, frozen.fingerprint);
    expect(b.missing).toEqual([]);
    expect(b.sourceReview.status).toBe("reviewed");
    const h = await hashCoachInputs(b.snapshot!);
    const out = runAppPlanningDetPlan({ reviewContextId: "ctx-syn", ctx: { ...b.ctx!, inputsHash: h, sourcesVersion: "b".repeat(64) }, coachId: COACH, athleteId: A1,
      snapshot: b.snapshot!, inputsHash: h, sourcesVersion: "b".repeat(64), engineVersion: "a".repeat(64), releaseId: null, now: () => new Date("2026-11-04T00:00:00Z"),
      limits: { maxNodes: 200000, maxMilliseconds: 120000 }, appInput: frozen });
    // Résultat RÉEL sur le profil complet : refus nommé (pas une acceptation). Le pont réduit (athleteDetBridge.test)
    // acceptait 70.3 12/9 ; sur le profil complet de l'app, le créneau brick de la semaine 1 exige ≥140 min et
    // aucune brique revue de la phase « base » n'atteint cette durée. Rien n'est assoupli.
    expect(out.kind).toBe("engine_refused");
    if (out.kind !== "engine_refused") return;
    expect(out.blockingCodes).toContain("det_empty_catalogue_slot");
    const slot = JSON.parse(out.blockingIssues!.find((x) => x.code === "det_empty_catalogue_slot")!.message);
    expect(slot).toMatchObject({ sport: "brick", phase: "base", minDurationMin: 140, afterDuration: 0, finalAdmissible: 0 });
    expect(out.limiterOrder.applied).toEqual(applied);
    expect(out.limiterOrder.semantics!.rawPriorities).toEqual(applied);
    expect(out.limiterOrder.semantics!.resolutions[0].policy).toBe("native_validators_only");
  }, 200000);

  it.each([["Durabilté", "faute de frappe"], ["Foo", "inconnu"], ["VLamax", "sans branche primaire marathon"]])(
    "marathon : primaire « %s » (%s) ⇒ blocked_unsupported_limiter AVANT le solveur, priorités brutes conservées, rien de substitué", async (bad) => {
    const p0 = await pagePipeline(222, "Marathon", 16, 7, 4);
    const config = { ...JSON.parse(JSON.stringify(p0.config)), identifiedLimitersRaw: [bad, "TTE"] };
    const frozen = await freezeAppPlanningInput({ athleteId: A1, athlete: p0.ctx.data, config, planStartDate: "2026-10-26", appAutomaticLimiters: [bad, "TTE"], coachOverride: null });
    const t0 = Date.now();
    const { out } = await runDet({ ...p0, config, frozen }, "Marathon", 16, 7, 4);
    expect(Date.now() - t0).toBeLessThan(10000);
    expect(out.kind).toBe("refused");
    if (out.kind !== "refused") return;
    expect(out.blockedUnsupportedLimiter).toMatchObject({ code: "blocked_unsupported_limiter", raw: bad });
    expect(out.limiterOrder!.applied).toEqual([bad, "TTE"]);
    expect(out.limiterOrder!.semantics!.rawPriorities).toEqual([bad, "TTE"]);
    expect(out.refusals.join(" ")).toMatch(/Rien n'est remplacé/);
  }, 60000);

  it("changement de physiologie du même athlète ⇒ nouvelle empreinte : anciennes vérifications et ancienne revue refusées", async () => {
    const a = await pagePipeline(240, "Semi", 8, 6, 5), b2 = await pagePipeline(235, "Semi", 8, 6, 5);
    expect(a.frozen.fingerprint).not.toBe(b2.frozen.fingerprint);
    const f = { objective: "Semi", planStartDate: "2026-10-26", raceDate: a.st.raceDate, weeksAvailable: 8, weeklyHours: 6, sessionsPerWeek: 5, strengthSessionsPerWeek: 1, maxSessionsPerDay: 2, ambition: "age_group" };
    const stale = buildAthleteDetInputs(b2.record, f, answers("Semi", { clock: variedClock }), { ...genuineFor(b2.record, "Semi"), planningInputFingerprint: a.frozen.fingerprint }, b2.frozen.fingerprint);
    expect(stale.ctx).toBeNull();
    const ok = buildAthleteDetInputs(a.record, f, answers("Semi", { clock: variedClock }), { ...genuineFor(a.record, "Semi"), planningInputFingerprint: a.frozen.fingerprint }, a.frozen.fingerprint);
    const h = await hashCoachInputs(ok.snapshot!);
    const out = runAppPlanningDetPlan({ reviewContextId: "x", ctx: { ...ok.ctx!, inputsHash: h, sourcesVersion: "b".repeat(64) }, coachId: COACH, athleteId: A1, snapshot: ok.snapshot!, inputsHash: h,
      sourcesVersion: "b".repeat(64), engineVersion: "a".repeat(64), releaseId: null, appInput: b2.frozen });
    expect(out.kind).toBe("refused");
  }, 60000);
});
