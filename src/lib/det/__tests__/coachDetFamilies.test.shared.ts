import { COACH_INPUTS_SCHEMA, findSource, hashCoachInputs, type CoachDetInputSnapshot, type CoachReviewContext, type SourceQualification } from "../coachDetContext";
import { runCoachDetPlan } from "../coachDetRun";
import { V32_703_BRICK_BLUEPRINTS } from "../../../../experimental/det-engine/v32-v3-specific-bricks";
import { V34_SAFE_RUN_BRICKS } from "../../../../experimental/det-engine/v34-v3-low-run-bricks";
import { V3_BASE_BRICK_ID } from "../../../../experimental/det-engine/v31-v3-brick";
import { fingerprintV3SportingSource } from "../../../../scripts/library-v3/sportingQualification800";
/**
 * Entrées coach EXPLICITEMENT SYNTHÉTIQUES saisies pour les tests de familles
 * (aucun import de fixture moteur). Listes de sources = scénarios CI v332/v320.
 */
export const COACH = "573e045a-bbea-4e37-a30f-33183b9fbe13";
export const ATHLETE = "c155204f-43e2-4367-9b66-6d068ef89212";
export const SOURCES_VERSION = "b".repeat(64);
export const ENGINE = "a".repeat(64);
export const est = (value: number | [number, number], method: string, uncertainty = "±3 %") => ({ value, kind: "explicit_estimate" as const, method: `SYNTHÉTIQUE — ${method}`, measuredOn: null, uncertainty });
export const swimPaces = { recovery: 120, moderate_lt1: 110, tempo: 103, im_pace: 108, "703_pace": 102, marathon_pace: 103, sub_threshold: 98, semi_pace: 98, mlss: 95, vo2max: 88, neuromuscular: 80 };

export function snap(objective: string, weeks: number, hours: number, raceDate: string, extra: Partial<CoachDetInputSnapshot> = {}): CoachDetInputSnapshot {
  const tri = /70|iron|^im$/i.test(objective);
  return {
    schema: COACH_INPUTS_SCHEMA, athleteId: ATHLETE, coachId: COACH, objective,
    planStartDate: "2026-10-26", raceDate, weeksAvailable: weeks, weeklyHours: hours,
    sessionsPerWeek: /^ironman$/i.test(objective) ? 10 : tri ? 8 : 5,  strengthSessionsPerWeek: 1, maxSessionsPerDay: 2, ambition: "age_group", athleteLevel: "trained", age: 35,
    anchors: {
      runThresholdPaceSecPerKm: est(240, "test 30 min"), runVvo2SpeedMps: est(5.0, "1500 m"), runSprintSpeedRangeMps: est([5.2, 7.0], "sprints"),
      bikeFtpWatts: est(300, "20 min ×0,95"), bikePmaWatts: est(390, "rampe"), bikeSprintPowerRangeWatts: est([600, 870], "sprints"),
      ...(tri ? { cssSecPer100m: est(95, "test 400/200") } : {}),
    },
    ...(tri ? { swimDomainPaces: Object.fromEntries(Object.entries(swimPaces).map(([k, v]) => [k, est(v, `allure ${k}`)])) } : {}),
    physiology: {
      vo2max: est(58, "Cooper"), weightKg: est(72, "balance", "±0,5 kg"), tteRunMin: est(45, "sortie longue", "±10 min"),
      vlamaxRun: est(0.5, "sprint+seuil", "±0,1"), ...(tri ? { vlamaxBike: est(0.55, "tests 15 s / 3 min", "±0,1") } : {}), fcMax: est(188, "test terrain", "±3 bpm"),
    },
    sex: "M", coachValidatedStrengthLoadAndRpe: true, ...extra,
  };
}
export function qualify(id: string, dose: Partial<SourceQualification> = {}): SourceQualification {
  const w = findSource(id);
  if (!w) throw new Error(`source absente ${id}`);
  return {
    id, sourceFingerprint: fingerprintV3SportingSource(w),
    evidence: {
      coachReviewedSource: true, currentPhase: w.phase[0], recentLoad: "moderate", fatigue: "ready", injuryScreen: "cleared_by_coach",
      checkedPrerequisites: [...w.prerequisites], checkedContraindications: [...w.contraindications],
      stopRuleExplained: true, environmentAndEquipmentConfirmed: true, limiterAndSportingGoalReviewed: true,
      trainingLoadCompatible: true, recoveryContextReviewed: true, highIntensityHistoryConfirmed: true,
      runningImpactToleranceConfirmed: true, swimmingSafetyConfirmed: true, racePaceGoalConfirmed: true,
      testProtocolConfirmed: true, cssPairedTestConfirmed: true,
    } as SourceQualification["evidence"],
    preferReviewedV3: true, ...dose,
  };
}
export const n = (p: string, xs: string[]) => xs.map((x) => `${p}${x}`);
// Liste v332 (course) — sources V3 existantes, aucune séance créée.
export const RUN332 = n("V3P_RUN_", ["001","003","008","009","011","012","013","020","021","023","024","025","026","027","028","029","031","032","037","038","041","044","047","050","076","077","078","079","080","081","082","083","084","085","119","130","137","139","142","140","145","151","152","153","154","155","156","157","158","159","160","167","169","172"]);
/** Sources V3 d'affûtage EXISTANTES (liste v332 « expandedTaperSources »), aucune séance créée. */
export const SEMI_TAPER = n("V3P_RUN_", ["020","105","110","115","120","125","135","150","190","195","200"]);
/** Cross-training vélo V3 existant du scénario v332 (le gabarit semi place un créneau vélo). */
export const SEMI_CROSS_BIKE = n("V3P_BIKE_", ["001","002","017","057","085","090"]);
/** Dose revue par le coach DANS les bornes de la source : 1 bloc allure semi (2→1), 25 min. */
export const SEMI_DOSES: Record<string, Partial<SourceQualification>> = { V3P_RUN_160: { targetDurationMin: 25, allowWorksetChange: true } };
export const STRENGTH = Array.from({ length: 15 }, (_, i) => `V3P_STRENGTH_${101 + i}`);
// Liste v320 (triathlon).
export const TRI_COMMON = [
  ...n("V3P_BIKE_", ["002","017","090","057","085","089","016","142","147","152","149","154","114","199"]),
  ...n("V3P_RUN_", ["001","041","003","031","032","037","038","084","085","137","142","167","172","139","169","119"]),
  ...n("V3P_SWIM_", ["001","002","003","012","021","027","041","042","043","044","045","046","047","048","049","050","101","102","103","132","133","160"]),
];
/**
 * V402 — rôles récupération/affûtage/technique jusque-là remplis par ~21 cartes
 * natives non revues dans le scénario v320, couverts par des sources V3
 * EXISTANTES (durées issues de leurs blocs déclarés ; aucune séance créée,
 * aucune dose modifiée) : natation récupération/technique courte, vélo
 * décrassage/décharge, course rappel allégé, + rappel spécifique 70.3 en affûtage.
 */
export const TRI_V3_ROLE_POOL = [
  ...n("V3P_SWIM_", ["087","088","100","022","025","026","028","031","035","036","037","057"]),
  ...n("V3P_BIKE_", ["013","091","092","105","110","125"]),
  ...n("V3P_RUN_", ["105","110","115","125","130"]),
];
export const TRI_TAPER_SPECIFIC = { "703": ["V3P_BIKE_185", "V3P_RUN_165"], IM: ["V3P_BIKE_180"] };
export const TRI_RACE = { "703": ["V3P_BIKE_012", "V3P_BIKE_084", "V3P_SWIM_199"], IM: ["V3P_BIKE_038", "V3P_BIKE_081", "V3P_SWIM_194"] };
export const TRI_DOSES: Record<string, Partial<SourceQualification>> = { V3P_BIKE_002: { targetDurationMin: 65 }, V3P_BIKE_016: { targetDurationMin: 139 } };
export const runClock = { timeZone: "Europe/Brussels", minutesBySport: { run: [1080, 360, 540, 720, 900, 1020, 1140], strength: [900, 900, 1080, 1200, 540, 600, 720] } };
/** Horaires coach SYNTHÉTIQUES distincts par sport, vélo (cross-training) compris. */
export const semiClock = { timeZone: "Europe/Brussels", minutesBySport: { ...runClock.minutesBySport, bike: [660, 660, 840, 1020, 720, 780, 900] } };
export const triClock = { timeZone: "Europe/Brussels", minutesBySport: {
  swim: [360, 360, 540, 720, 900, 1020, 480], bike: [600, 660, 600, 480, 600, 420, 540], run: [420, 420, 1080, 1020, 1080, 420, 420],
  strength: [1140, 1140, 1140, 1140, 1140, 1140, 1140], brick: [360, 360, 360, 360, 360, 360, 360] } };
export const BRICKS_703 = [
  { id: V3_BASE_BRICK_ID, transitionSeconds: 300 },
  ...V32_703_BRICK_BLUEPRINTS.map((b) => ({ id: b.id, transitionSeconds: b.transitionSeconds })),
  ...V34_SAFE_RUN_BRICKS.map((b) => ({ id: b.id, transitionSeconds: b.transitionSeconds })),
];

export async function ctx(s: CoachDetInputSnapshot, ids: string[], doses: Record<string, Partial<SourceQualification>>, clock: CoachReviewContext["clock"], bricks?: CoachReviewContext["brickApprovals"]): Promise<CoachReviewContext> {
  return { coachId: COACH, athleteId: ATHLETE, inputsHash: await hashCoachInputs(s), sourcesVersion: SOURCES_VERSION,
    qualifications: [...new Set(ids)].map((id) => qualify(id, doses[id])), clock, ...(bricks ? { brickApprovals: bricks } : {}) };
}
export const run = async (s: CoachDetInputSnapshot, c: CoachReviewContext | null, limits?: { maxNodes: number; maxMilliseconds: number }) =>
  runCoachDetPlan({ reviewContextId: "ctx-fam", ctx: c, coachId: COACH, athleteId: ATHLETE, snapshot: s, inputsHash: await hashCoachInputs(s),
    sourcesVersion: SOURCES_VERSION, engineVersion: ENGINE, releaseId: null, now: () => new Date("2026-11-04T00:00:00Z"), limits });

export const ymd = (weeks: number) => new Date(Date.UTC(2026, 9, 26 + weeks * 7 - 1)).toISOString().slice(0, 10);
