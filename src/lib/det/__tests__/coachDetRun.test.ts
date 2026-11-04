import { describe, it, expect, vi, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { COACH_INPUTS_SCHEMA, SESSION_COUNT_LABELS, checkCoachReviewContext, describeSourceBlocks, findSource, searchSources, hashCoachInputs, sourceReviewSheet, type CoachDetInputSnapshot, type CoachReviewContext, type SourceQualification } from "../coachDetContext";
import { buildCoachPlanInputs, eligibleLimiterMetrics, runCoachDetPlan } from "../coachDetRun";
import { coachObjectiveKey, runCoachInputsDet } from "../../../../experimental/det-engine/v401-coach-inputs-core";
import { AppendOnlyPlanVersionSaver, type PlanVersionRow } from "@/lib/plan/appendOnlyPlanVersionSave";
import { restoreStructuredPlan } from "@/lib/plan/restoreStructuredPlan";
import { fingerprintV3SportingSource } from "../../../../scripts/library-v3/sportingQualification800";
import { readPlanProvenance, isDetCoachInputsProvenance } from "@/lib/plan/planProvenance";

/**
 * DONNÉES EXPLICITEMENT SYNTHÉTIQUES saisies dans ce test (aucun import de
 * fixture). Une simulation n'est pas une revue sportive humaine : aucun nom
 * ni signature de relecteur n'est renseigné.
 */
const COACH = "573e045a-bbea-4e37-a30f-33183b9fbe13";
const ATHLETE = "c155204f-43e2-4367-9b66-6d068ef89212";
const OTHER_COACH = "6b4c1722-2105-4889-ab14-41bab798cdf7";
const OTHER_ATHLETE = "9758ace0-da71-4200-87bf-04e74bbb4ed9";
const SOURCES_VERSION = "b".repeat(64);
const ENGINE = "a".repeat(64);

const est = (value: number | [number, number], method: string, uncertainty: string) => ({ value, kind: "explicit_estimate" as const, method, measuredOn: null, uncertainty });
const snapshot = (): CoachDetInputSnapshot => ({
  schema: COACH_INPUTS_SCHEMA, athleteId: ATHLETE, coachId: COACH, objective: "Marathon",
  planStartDate: "2026-10-26", raceDate: "2027-02-14", weeksAvailable: 16, weeklyHours: 7,
  sessionsPerWeek: 4, strengthSessionsPerWeek: 1, maxSessionsPerDay: 2, ambition: "age_group", athleteLevel: "trained", age: 35,
  anchors: {
    runThresholdPaceSecPerKm: { value: 240, kind: "field_measurement", method: "SYNTHÉTIQUE — test 30 min terrain", measuredOn: "2026-10-01", uncertainty: null },
    runVvo2SpeedMps: est(5.0, "SYNTHÉTIQUE — estimation depuis 1500 m", "±0,2 m/s"),
    runSprintSpeedRangeMps: est([5.1, 7.0], "SYNTHÉTIQUE — estimation", "±0,3 m/s"),
    bikeFtpWatts: est(300, "SYNTHÉTIQUE — estimation 20 min ×0,95", "±10 W"),
    bikePmaWatts: est(390, "SYNTHÉTIQUE — estimation", "±15 W"),
    bikeSprintPowerRangeWatts: est([550, 850], "SYNTHÉTIQUE — estimation", "±50 W"),
  },
  physiology: {
    vo2max: est(58, "SYNTHÉTIQUE — estimation Cooper", "±3"),
    weightKg: { value: 72, kind: "field_measurement", method: "SYNTHÉTIQUE — balance", measuredOn: "2026-10-01", uncertainty: null },
    tteRunMin: est(45, "SYNTHÉTIQUE — estimation sortie longue", "±10 min"),
    fcMax: { value: 188, kind: "field_measurement", method: "SYNTHÉTIQUE — test terrain", measuredOn: "2026-10-01", uncertainty: null },
  },
  sex: "M",
  coachValidatedStrengthLoadAndRpe: true,
});

// Sources choisies UNE PAR UNE dans ce test (liste du scénario CI V356 age-group 16 sem.).
const RUN = ["001","003","008","009","011","012","013","020","021","023","024","025","026","027","028","029","031","032","037","038","041","044","047","050","076","077","078","079","080","081","082","083","084","085","119","130","137","139","142","140","145","151","152","153","154","155","156","157","158","159","160","167","169","172","105","110","115","120","125","135","150","190","195","200","136","094"].map((n) => `V3P_RUN_${n}`);
const STRENGTH = Array.from({ length: 15 }, (_, i) => `V3P_STRENGTH_${101 + i}`);
const BIKE = ["001","002","017","057","085","090"].map((n) => `V3P_BIKE_${n}`);
const DOSES: Record<string, Partial<SourceQualification>> = {
  V3P_RUN_136: { targetDurationMin: 51, allowWorksetChange: true },
  V3P_RUN_094: { targetDurationMin: 28, allowWorksetChange: true },
  V3P_RUN_001: { targetDurationMin: 28 },
  V3P_RUN_155: { targetDurationMin: 28, allowWorksetChange: true },
};
function qualify(id: string): SourceQualification {
  const w = findSource(id)!;
  return {
    id, sourceFingerprint: fingerprintV3SportingSource(w),
    evidence: {
      coachReviewedSource: true, currentPhase: w.phase[0], recentLoad: "moderate", fatigue: "ready", injuryScreen: "cleared_by_coach",
      checkedPrerequisites: [...w.prerequisites], checkedContraindications: [...w.contraindications],
      stopRuleExplained: true, environmentAndEquipmentConfirmed: true, limiterAndSportingGoalReviewed: true,
      trainingLoadCompatible: true, recoveryContextReviewed: true, highIntensityHistoryConfirmed: true,
      runningImpactToleranceConfirmed: true, racePaceGoalConfirmed: true, testProtocolConfirmed: true,
    },
    preferReviewedV3: true, ...DOSES[id],
  };
}
const clock = {
  timeZone: "Europe/Brussels",
  minutesBySport: {
    run: [1080, 360, 540, 720, 900, 1020, 1140],
    bike: [660, 660, 840, 1020, 720, 780, 900],
    strength: [900, 900, 1080, 1200, 540, 600, 720],
  },
};
async function ctxFor(s: CoachDetInputSnapshot, patch: Partial<CoachReviewContext> = {}): Promise<CoachReviewContext> {
  return { coachId: COACH, athleteId: ATHLETE, inputsHash: await hashCoachInputs(s), sourcesVersion: SOURCES_VERSION,
    qualifications: [...RUN, ...STRENGTH, ...BIKE].map(qualify), clock, ...patch };
}
const run = async (s: CoachDetInputSnapshot, ctx: CoachReviewContext | null, over: Partial<Parameters<typeof runCoachDetPlan>[0]> = {}) =>
  runCoachDetPlan({ reviewContextId: "ctx-1", ctx, coachId: COACH, athleteId: ATHLETE, snapshot: s, inputsHash: await hashCoachInputs(s),
    sourcesVersion: SOURCES_VERSION, engineVersion: ENGINE, releaseId: null, now: () => new Date("2026-11-02T00:00:00Z"), ...over });

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); });
});

describe("chemin coach : refus précis", () => {
  it("aucune revue ⇒ refus", async () => {
    const r = await run(snapshot(), null);
    expect(r.kind).toBe("refused");
    if (r.kind === "refused") expect(r.refusals).toContain("aucune revue coach enregistrée pour cet athlète");
  });
  it("aucune source qualifiée ni horaire ⇒ refus (aucune source par défaut)", async () => {
    const s = snapshot();
    const r = await run(s, await ctxFor(s, { qualifications: [], clock: null }));
    expect(r.kind === "refused" && r.refusals).toEqual(expect.arrayContaining([
      "aucune source V3 qualifiée individuellement (aucune n'est approuvée par défaut)", "horaires de séance non confirmés"]));
  });
  it("revue d'un autre coach / d'un autre athlète ⇒ refus", async () => {
    const s = snapshot();
    const a = await run(s, await ctxFor(s, { coachId: OTHER_COACH }));
    const b = await run(s, await ctxFor(s, { athleteId: OTHER_ATHLETE }));
    expect(a.kind === "refused" && a.refusals.join("|")).toMatch(/autre coach/);
    expect(b.kind === "refused" && b.refusals.join("|")).toMatch(/autre athlète/);
  });
  it("ancres modifiées après la revue ⇒ revue périmée", async () => {
    const s = snapshot(); const ctx = await ctxFor(s);
    const changed = { ...s, anchors: { ...s.anchors, runThresholdPaceSecPerKm: { ...s.anchors.runThresholdPaceSecPerKm!, value: 236 } } };
    const r = await run(changed, ctx);
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(/profil\/ancres modifiés/);
  });
  it("version des sources changée ⇒ périmée ; empreinte de source falsifiée ⇒ périmée", async () => {
    const s = snapshot(); const ctx = await ctxFor(s);
    const a = await run(s, ctx, { sourcesVersion: "c".repeat(64) });
    expect(a.kind === "refused" && a.refusals.join("|")).toMatch(/version des sources DET modifiée/);
    const bad = { ...ctx, qualifications: ctx.qualifications.map((q, i) => (i === 0 ? { ...q, sourceFingerprint: "x" } : q)) };
    const b = await run(s, bad);
    expect(b.kind === "refused" && b.refusals.join("|")).toMatch(/modifiée depuis la qualification/);
  });
  it("prérequis non coché ⇒ refus", async () => {
    const s = snapshot(); const ctx = await ctxFor(s);
    const i = ctx.qualifications.findIndex((q) => findSource(q.id)!.prerequisites.length > 0);
    const bad = { ...ctx, qualifications: ctx.qualifications.map((q, k) => (k === i ? { ...q, evidence: { ...q.evidence, checkedPrerequisites: [] } } : q)) };
    const r = await run(s, bad);
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(/prérequis non vérifié/);
  });
  it("ancre requise absente ⇒ refus (jamais complétée par une valeur de fixture)", async () => {
    const s = snapshot(); delete s.anchors.bikeFtpWatts;
    const r = await run(s, await ctxFor(s));
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(/ancres manquantes/);
  });
  it("estimation sans incertitude ⇒ refus", async () => {
    const s = snapshot(); s.anchors.bikePmaWatts = { ...s.anchors.bikePmaWatts!, uncertainty: null };
    const r = await run(s, await ctxFor(s));
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(/estimation sans incertitude/);
  });
  it("fiche de revue : prérequis affichés, rien de coché d'office", () => {
    const sheet = sourceReviewSheet(findSource("V3P_RUN_136")!);
    expect(sheet.prerequisites.length).toBeGreaterThanOrEqual(0);
    expect(sheet).not.toHaveProperty("checked");
  });
  it("le chemin coach n'importe aucun helper synthétique", () => {
    for (const f of ["src/lib/det/coachDetRun.ts", "src/lib/det/coachDetContext.ts", "experimental/det-engine/v401-coach-inputs-core.ts"]) {
      const src = readFileSync(f, "utf8").split("\n").filter((l) => /^\s*import\b|from\s+["']/.test(l)).join("\n");
      expect(src).not.toMatch(/v3-test-anchor-fixtures|syntheticV3|v332-running|v356-marathon|prevalidationFixtures|syntheticProfiles|det-lab\/detLab|sports-plan-lab/);
    }
  });
});

describe("ordre des limiteurs et périmètre (sans moteur)", () => {
  it("un changement d'ordre coach change l'empreinte ⇒ revue périmée", async () => {
    const s = { ...snapshot(), coachLimiterOrder: ["VLamax", "TTE"] }; const ctx = await ctxFor(s);
    const changed = { ...s, coachLimiterOrder: ["TTE", "VLamax"] };
    expect(await hashCoachInputs(changed)).not.toBe(await hashCoachInputs(s));
    const r = await run(changed, ctx);
    expect(r.kind).toBe("refused");
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(/revue périmée/);
  });
  it("passer d'automatique à priorité coach périme aussi la revue", async () => {
    const s = snapshot(); const ctx = await ctxFor(s);
    const r = await run({ ...s, coachLimiterOrder: ["VLamax", "TTE"] }, ctx);
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(/revue périmée/);
  });
  it("les limiteurs éligibles viennent du diagnostic commun (VLamax n'est pas masqué)", () => {
    expect(eligibleLimiterMetrics(snapshot())).toEqual(["VLamax", "TTE"]);
  });
  it("ordre d'une fixture [TTE, VO2max, VMA] refusé : l'ordre coach n'ajoute aucune métrique", async () => {
    const s = { ...snapshot(), coachLimiterOrder: ["TTE", "VO2max", "VMA"] };
    const r = await run(s, await ctxFor(s));
    expect(r.kind).toBe("refused");
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(/VO2max, VMA non détecté/);
  });
  it("ordre incomplet refusé (VLamax ne peut pas être retiré)", async () => {
    const s = { ...snapshot(), coachLimiterOrder: ["TTE"] };
    const r = await run(s, await ctxFor(s));
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(/incomplet : VLamax/);
  });
  it("l'ordre confirmé est transmis au chemin commun et lu dans la config du solveur", () => {
    expect((buildCoachPlanInputs(snapshot()).config as { identifiedLimitersRaw?: string[] }).identifiedLimitersRaw).toEqual(["VLamax", "TTE"]);
    expect((buildCoachPlanInputs({ ...snapshot(), coachLimiterOrder: ["TTE", "VLamax"] }).config as { identifiedLimitersRaw?: string[] }).identifiedLimitersRaw).toEqual(["TTE", "VLamax"]);
  });
  it("clé d'objectif exacte : Semi-marathon n'hérite pas du marathon", () => {
    expect(coachObjectiveKey("Marathon")).toBe("marathon");
    expect(coachObjectiveKey("Marathon route")).toBe("marathon");
    // Le nom libre d'événement n'est jamais une clé d'objectif.
    expect(coachObjectiveKey("Marathon de Paris")).toBe("unsupported");
    expect(coachObjectiveKey("Marathon de trail")).toBe("unsupported");
    expect(coachObjectiveKey("Marathon du Mont-Blanc")).toBe("unsupported");
    expect(coachObjectiveKey("Marathon d'Annecy trail")).toBe("unsupported");
    expect(coachObjectiveKey("Semi-marathon")).toBe("semi_marathon");
    expect(coachObjectiveKey("Half Marathon")).toBe("semi_marathon");
    expect(coachObjectiveKey("Ultra-marathon")).toBe("unsupported");
    expect(coachObjectiveKey("Trail marathon")).toBe("unsupported");
    // 70.3 a sa propre famille (options V320), jamais celles du marathon.
    expect(coachObjectiveKey("Ironman 70.3")).toBe("triathlon_703");
  });
  it.each(["10 km", "Trail court", "Marathon de trail", "Marathon du Mont-Blanc"])("objectif %s refusé explicitement (hors périmètre qualifié)", async (objective) => {
    const s = { ...snapshot(), objective };
    const r = await run(s, await ctxFor(s));
    expect(r.kind).toBe("refused");
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(/hors du périmètre qualifié/);
  });
  it.each([["Semi-marathon", /Semi-marathon route : 7 h\/semaine hors de la plage testée/], ["Ironman", /Triathlon Ironman : 7 h\/semaine hors de la plage testée/]])("%s : famille raccordée mais hors enveloppe testée ⇒ refus explicite", async (objective, re) => {
    const s = { ...snapshot(), objective };
    const r = await run(s, await ctxFor(s));
    expect(r.kind === "refused" && r.refusals.join("|")).toMatch(re);
  });
  it("le cœur moteur refuse lui-même un objectif non qualifié (fail-closed)", () => {
    const { athlete, config } = buildCoachPlanInputs(snapshot());
    expect(() => runCoachInputsDet({ athlete, config: { ...config, objective: "10 km" }, reviews: [], clock })).toThrow(/objective_not_qualified:10k/);
    expect(() => runCoachInputsDet({ athlete, config: { ...config, objective: "Marathon de trail" }, reviews: [], clock })).toThrow(/objective_not_qualified:unsupported/);
  });
  it("cardio et force comptés et libellés séparément", () => {
    expect(SESSION_COUNT_LABELS.sessionsPerWeek).toMatch(/endurance\/cardio.*force non comprise/);
    expect(SESSION_COUNT_LABELS.strengthSessionsPerWeek).toMatch(/force.*à part/);
    const c = buildCoachPlanInputs(snapshot()).config as { sessionsPerWeek?: number; strengthSessionsPerWeek?: number };
    expect([c.sessionsPerWeek, c.strengthSessionsPerWeek]).toEqual([4, 1]);
  });
  it("sources choisies par titre/intention, sans identifiant ni JSON", () => {
    const hits = searchSources("marathon allure");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => /marathon/i.test(h.title) || /allure/.test(h.intent))).toBe(true);
    const lines = describeSourceBlocks(findSource(hits[0].id)!.blocks);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join("\n")).not.toMatch(/[{}"]/);
  });
});

/**
 * VRAI moteur, aucune fixture importée, aucun mock du solveur. Les deux
 * profils sont des athlètes SYNTHÉTIQUES saisis ici ; les qualifications
 * simulées restent non attestées (sportingAttestation:false).
 */
describe("chemin coach : VRAI moteur — profil 240 s/km (refus analysé, inchangé)", () => {
  it("ordre automatique [VLamax, TTE] ⇒ blocage nommé AVANT le solveur (VLamax : aucune branche primaire marathon), ordre brut conservé", async () => {
    const s = snapshot(); const r = await run(s, await ctxFor(s));
    expect(r.kind).toBe("refused");
    if (r.kind !== "refused") throw new Error("attendu refused");
    expect(r.blockedUnsupportedLimiter).toMatchObject({ code: "blocked_unsupported_limiter", raw: "VLamax" });
    expect(r.limiterOrder).toMatchObject({ mode: "automatic", source: "manual_coach_inputs", automatic: ["VLamax", "TTE"], coachConfirmed: null, applied: ["VLamax", "TTE"] });
    expect(r.limiterOrder!.semantics!.rawPriorities).toEqual(["VLamax", "TTE"]);
  }, 600000);
  it("priorité coach [TTE, VLamax] : le solveur lit l'ordre (verdict différent) mais refuse encore — jamais converti en GO", async () => {
    const s = { ...snapshot(), coachLimiterOrder: ["TTE", "VLamax"] }; const r = await run(s, await ctxFor(s));
    expect(r.kind).toBe("engine_refused");
    if (r.kind !== "engine_refused") throw new Error("attendu engine_refused");
    expect(r.limiterOrder.applied).toEqual(["TTE", "VLamax"]);
    expect(r.limiterOrder.mode).toBe("coach");
    expect(r.blockingCodes).toEqual(["lorang_categories"]);
  }, 600000);
});

/** Profil synthétique distinct (allure seuil 220 s/km saisie ici) ; toutes les autres entrées identiques. */
const acceptedProfile = (): CoachDetInputSnapshot => {
  const s = snapshot();
  s.anchors.runThresholdPaceSecPerKm = { value: 220, kind: "field_measurement", method: "SYNTHÉTIQUE — test 30 min terrain (profil B)", measuredOn: "2026-10-01", uncertainty: null };
  return s;
};

describe("chemin coach : VRAI moteur — preuve d'acceptation (profil synthétique 220 s/km)", () => {
  let auto: Awaited<ReturnType<typeof run>>;
  let coach: Awaited<ReturnType<typeof run>>;
  const coachSnap = (): CoachDetInputSnapshot => ({ ...acceptedProfile(), coachLimiterOrder: ["TTE"] });
  beforeAll(async () => {
    const a = acceptedProfile(); auto = await run(a, await ctxFor(a));
    const c = coachSnap(); coach = await run(c, await ctxFor(c));
  }, 600000);
  it("ordre automatique ⇒ accepted", () => {
    expect(auto.kind).toBe("accepted");
    if (auto.kind !== "accepted") throw new Error("non accepté");
    expect(auto.limiterOrder).toMatchObject({ mode: "automatic", source: "manual_coach_inputs", automatic: ["TTE"], coachConfirmed: null, applied: ["TTE"], unrecognizedByDet: [] });
    expect(auto.sessions).toBeGreaterThan(0);
    expect(auto.provenance.sportingAttestation).toBe(false);
    expect(auto.provenance.prescriptionAllowed).toBe(false);
    expect(auto.provenance.syntheticFixture).toBe(false);
  });
  it("priorité coach confirmée ⇒ accepted, ordre conservé dans entrées + provenance", () => {
    expect(coach.kind).toBe("accepted");
    if (coach.kind !== "accepted") throw new Error("non accepté");
    expect(coach.limiterOrder).toMatchObject({ mode: "coach", source: "manual_coach_inputs", automatic: ["TTE"], coachConfirmed: ["TTE"], applied: ["TTE"] });
    expect(coach.limiterOrder.semantics!.resolutions[0]).toMatchObject({ raw: "TTE", key: "tte", policy: "det_primary_branch" });
    expect((coach.provenance.coachInputs as { coachLimiterOrder?: string[] }).coachLimiterOrder).toEqual(["TTE"]);
    expect(isDetCoachInputsProvenance(coach.provenance)).toBe(true);
    // Chaque séance non-repos porte soit sa structure V3, soit un refus explicite.
    for (const w of coach.plan.weeks) for (const x of w.sessions as unknown as Array<Record<string, unknown>>)
      if (!x.isRest) expect(Boolean(x.detStructuredWorkout) !== Boolean(x.detStructureRefusal)).toBe(true);
  });
  it("sauvegarde append-only + réouverture/restauration conservent ordre et provenance (transport mémoire, PAS une preuve JWT)", async () => {
    if (coach.kind !== "accepted") throw new Error("non accepté");
    const db = new Map<string, PlanVersionRow>();
    const transport = {
      insert: async (row: PlanVersionRow) => { db.set(row.id, JSON.parse(JSON.stringify(row))); return { error: null }; },
      readById: async (id: string) => ({ data: db.get(id) ?? null, error: null }),
    };
    const payload = { athlete_id: ATHLETE, coach_id: COACH, plan_json: coach.plan, objective: "Marathon", weeks_count: coach.plan.weeks.length,
      sessions_count: coach.sessions, validator_score: null, validator_grade: null, validator_summary: null };
    const saved = await new AppendOnlyPlanVersionSaver({ transport }).save(payload);
    expect(saved.status).toBe("CONFIRMED");
    // Réouverture dans une nouvelle instance (autre onglet/reconnexion) : même identité, aucune 2e ligne.
    const again = await new AppendOnlyPlanVersionSaver({ transport }).save(payload);
    expect(again).toMatchObject({ status: "CONFIRMED", attemptId: saved.attemptId });
    expect(db.size).toBe(1);
    const restored = restoreStructuredPlan(db.get(saved.attemptId!)!.plan_json);
    expect(restored).not.toBeNull();
    const pv = readPlanProvenance(restored);
    expect(pv.label).toBe("DET Engine (entrées coach, QA)");
    expect(pv.detail).toContain("priorité coach : TTE");
    const prov = (restored as unknown as { _provenance: { limiterOrder: unknown; coachInputs: { coachLimiterOrder: unknown } } })._provenance;
    expect(prov.limiterOrder).toEqual(coach.limiterOrder);
    expect(prov.coachInputs.coachLimiterOrder).toEqual(["TTE"]);
  });
  it("créneaux coach conservés par séance après sauvegarde/restauration (fuseau + offset réel)", () => {
    if (coach.kind !== "accepted") throw new Error("non accepté");
    const restored = restoreStructuredPlan(JSON.parse(JSON.stringify(coach.plan)))!;
    const all = restored.weeks.flatMap((w) => w.sessions as unknown as Array<Record<string, unknown>>).filter((x) => !x.isRest);
    const withStart = all.filter((x) => x.coachStart);
    expect(withStart.length).toBeGreaterThan(0);
    for (const x of withStart) {
      const st = x.coachStart as { provenance: string; localDate: string; minuteOfDay: number; timeZone: string; utcOffsetMinutes: number };
      expect(st.provenance).toBe("coach_confirmed");
      expect(st.timeZone).toBe("Europe/Brussels");
      expect(st.minuteOfDay).toBe((clock.minutesBySport as Record<string, Array<number | null>>)[String(x.sport)][Number(x.dayIndex)]);
      expect([60, 120]).toContain(st.utcOffsetMinutes);
    }
    // Aucune heure inventée pour une séance sans créneau confirmé.
    for (const x of all.filter((y) => !y.coachStart))
      expect((clock.minutesBySport as Record<string, Array<number | null>>)[String(x.sport)]?.[Number(x.dayIndex)] ?? null).toBeNull();
  });
  it("automatique vs coach : provenance distingue les deux modes", () => {
    if (auto.kind !== "accepted" || coach.kind !== "accepted") throw new Error("non accepté");
    expect(readPlanProvenance(auto.plan).detail).toContain("ordre automatique : TTE");
    expect(readPlanProvenance(coach.plan).detail).toContain("priorité coach : TTE");
    expect(auto.provenance.inputsHash).not.toBe(coach.provenance.inputsHash);
  });
});
