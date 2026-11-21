import { describe, expect, it } from "vitest";
import { fieldHoldBounds, HOLD_PROTOCOL, type FieldHold } from "./fieldHold";
import {
  compactSessions,
  nextFieldCheck,
  fieldCheckLink,
} from "./compactFieldAssessment";
import { computeVLamaxEffectif } from "../vlamaxEffectif";
import {
  detectUnifiedLimiter,
  type UnifiedLimiterInput,
} from "../v2/unifiedLimiterDetection";
import { rankPrescriptionGaps } from "../limiterPrescription";
import { replayPriorities } from "../lab/replay";
import { criticalEnvelope } from "../criticalMetrics";
import type { CoachingCompassInput } from "../coachingCompass/types";

const day = "2026-11-20";
const inputs: UnifiedLimiterInput = {
  objectif: "IM",
  ambition: "competitor",
  sportFocus: "bike",
  age: 35,
  vma: null,
  ftpKg: null,
  vo2max: null,
  vlamax: null,
  tte: null,
  fatmax: null,
  wprimeKj: null,
  economyScore: null,
  availabilityScore: null,
  hasHealthAlerts: false,
  vlamaxSource: "estimation",
  tteSource: "unknown",
};
const entry = (overrides: Partial<FieldHold> = {}) => {
  const raw: FieldHold = {
    protocol: HOLD_PROTOCOL,
    sport: "bike",
    reference: 250,
    referenceDate: "2026-10-25",
    day,
    intensity: 250,
    minutes: 20,
    comparable: true,
    conditions: "indoor frais",
    exhausted: false,
    ...overrides,
  };
  return {
    athlete_id: "a",
    coach_id: "c",
    type: HOLD_PROTOCOL,
    sport: raw.sport,
    date: day,
    raw,
  };
};
const findBounds = (
  entries: ReturnType<typeof entry>[],
  sport: "bike" | "run" = "bike",
  ref = 250,
) => fieldHoldBounds(entries, "a", sport, ref, day);
const cases = (extra: Partial<UnifiedLimiterInput>) =>
  detectUnifiedLimiter({ ...inputs, ...extra });
const gap = (d: ReturnType<typeof cases>, name: string) =>
  d.gapAnalysis.find((g) => g.metric === name)!;
const goals = (d: ReturnType<typeof cases>) =>
  rankPrescriptionGaps(d.gapAnalysis).map((g) => g.metric);
const sprint = {
  athlete_id: "a",
  type: "VLAMAX",
  sport: "bike",
  name: "Sprint terrain",
  vlamax: 0.85,
  date: day,
  raw: {
    protocolId: "bike_vlamax_sprint_15s",
    testDate: day,
    conditionsConfirmed: true,
    sensor: "capteur pédale",
    power15s_1: 910,
    power15s_2: 900,
    ftp_reference: 250,
  },
};
const profile = (test = sprint, asOf = day) =>
  computeVLamaxEffectif({
    athleteId: "a",
    objectif: "IM",
    asOf,
    tests: [test],
    snapshots: [],
  });
describe("priorités terrain et limites utilisables par le plan", () => {
  it("classe un profil sprint documenté avec la même estimation à travers la chaîne", () => {
    const v = profile();
    expect(v.details?.fieldRange?.low).toBeGreaterThan(0);
    const d = cases({
      vlamax: v.value,
      vlamaxSource: v.v2?.source,
      fieldVlamax: v.details?.fieldRange,
      fatmax: 20,
      fatmaxSource: "model",
    });
    expect(goals(d)).toEqual(["VLamax"]);
    expect(d.limiterLabel).toContain("estimée");
    expect(d.isRobust).toBe(false);
    expect(d.missingMetrics).not.toContain("VLamax");
  });
  it("écarte du classement prescriptif un protocole incomplet, dispersé, inconnu, ancien ou futur", () => {
    for (const over of [
      { ftp_reference: 0 },
      { conditionsConfirmed: false },
      { power15s_2: 500 },
      { protocolId: "autre" },
      { sensor: "" },
      { testDate: "2026-07-25" },
      { testDate: "2026-11-21" },
    ])
      expect(
        profile({ ...sprint, raw: { ...sprint.raw, ...over } }).details
          ?.fieldRange,
      ).toBeUndefined();
  });
  it("conserve les observations de deux disciplines sans confondre watts et allure", () => {
    const rows = [
      entry({ intensity: 260, minutes: 24 }),
      entry({ intensity: 245, exhausted: true, minutes: 31 }),
      entry({ sport: "run", reference: 270, intensity: 260, minutes: 33 }),
      entry({
        sport: "run",
        reference: 270,
        intensity: 280,
        exhausted: true,
        minutes: 39,
      }),
    ];
    expect(findBounds(rows)).toMatchObject({ low: 24, high: 31 });
    expect(findBounds(rows, "run", 270)).toMatchObject({
      low: 33,
      high: 39,
      note: expect.stringContaining("4:20/km"),
    });
  });
  it("ne transforme pas un arrêt programmé en déficit et retient le déficit démontré à la borne haute", () => {
    const low = findBounds([entry({ minutes: 15 })]);
    const h = cases({ fieldHold: low });
    expect(goals(h)).not.toContain("TTE");
    expect(gap(h, "TTE").fieldEstimateNote).toContain("au moins 15");
    const upper = cases({
      fieldHold: findBounds([
        entry({ minutes: 28, exhausted: true, intensity: 240 }),
      ]),
    });
    expect(goals(upper)).toEqual(["TTE"]);
    expect(gap(upper, "TTE").fieldEstimateNote).toContain("au plus 28");
  });
  it("conserve un seuil déjà atteint, écarte une contradiction, une autre cible et un ancien test", () => {
    const h = cases({ fieldHold: findBounds([entry({ minutes: 120 })]) });
    expect(gap(h, "TTE").status).toBe("optimal");
    const conflict = cases({
      tte: 10,
      tteSource: "observed",
      fieldHold: findBounds([entry({ minutes: 25 })]),
    });
    expect(goals(conflict)).toEqual([]);
    expect(gap(conflict, "TTE").fieldEstimateNote).toContain("contradictoires");
    const old = entry({ day: "2026-08-01", referenceDate: "2026-07-23" });
    expect(
      findBounds([
        old,
        entry({ reference: 255 }),
        entry({ day: "2026-11-21" }),
        entry({ referenceDate: day }),
        entry({ comparable: false }),
        { ...entry(), athlete_id: "b" },
      ]),
    ).toBeUndefined();
  });
  it("refuse de faire de la charge une hypothèse de TTE et bloque les hypothèses chez le mineur", () => {
    expect(
      gap(cases({ tte: 10, tteSource: "load_or_ftp" }), "TTE")
        .fieldHypothesisImpact,
    ).toBeUndefined();
    expect(
      goals(
        cases({ age: 15, fieldHold: findBounds([entry({ exhausted: true })]) }),
      ),
    ).toEqual([]);
  });
  it("signale un autre premier rang possible aux bornes et garde les deux facteurs pour le coach", () => {
    const limits = cases({}).targetsUsed.vlamax;
    const low = limits.max + 0.02;
    const ranked = cases({
      vlamax: (low + 1) / 2,
      fieldVlamax: { low, high: 1, sport: "bike", method: "Bike Day" },
      tte: 20,
      tteSource: "observed",
    });
    expect(goals(ranked)).toEqual(expect.arrayContaining(["VLamax", "TTE"]));
    expect(ranked.limiterLabel).toContain("départager");
    expect(ranked.isRobust).toBe(false);
  });
  it("préserve la zone acceptable et les faibles valeurs de VLamax", () => {
    const { max } = cases({}).targetsUsed.vlamax;
    for (const value of [max + 0.03, 0.13]) {
      const d = cases({
        vlamax: value,
        fieldVlamax: {
          sport: "bike",
          low: value - 0.05,
          high: value + 0.05,
          method: "Bike Day",
        },
      });
      expect(goals(d)).not.toContain("VLamax");
    }
  });
  it("prescrit les durées documentées et permet de choisir le seul module utile", () => {
    const steps = compactSessions("cp-bike")[0].structuredWorkout;
    expect(steps.map((s) => s.intensity_type)).toEqual([
      "warmup",
      "active",
      "rest",
      "active",
      "rest",
      "active",
      "cooldown",
    ]);
    expect(
      steps.flatMap((s) =>
        s.type === "step" ? [s.step_duration_value / 60] : [],
      ),
    ).toEqual([15, 12, 30, 7, 30, 3, 10]);
    expect(
      compactSessions("hold-run", 35, 270)[0].structuredWorkout[1],
    ).toMatchObject({
      step_duration_value: 2100,
      notes: expect.stringContaining("4:30/km"),
    });
    expect(compactSessions("hold-run", 0)).toEqual([]);
    expect(compactSessions("cs-run").map((s) => s.dayIndex)).toEqual([0, 2, 4]);
    for (const m of [
      "hold-run",
      "hold-bike",
      "trail-repeat",
      "easy-run",
    ] as const)
      expect(compactSessions(m)).toHaveLength(1);
    expect(
      fieldCheckLink(
        nextFieldCheck({ objectif: "StartToRun" } as CoachingCompassInput),
      ),
    ).toContain("easy-run");
  });
  it("rejoue le bilan à sa date en excluant une modification postérieure", () => {
    const row = {
      id: "snap",
      athlete_id: "a",
      coach_id: "c",
      date: day,
      source: "manual",
      ftp: 250,
      tte_mode: "LOAD",
      tte_observed_min: 10,
    };
    expect(
      replayPriorities(row, "IM", "competitor", 35).some(
        (r) => r.metric.metric === "TTE",
      ),
    ).toBe(false);
    expect(
      replayPriorities(
        { ...row, vma: 12, updated_at: "2026-11-21" },
        "10K",
        "competitor",
        35,
      ),
    ).toEqual([]);
    expect(criticalEnvelope('{"trackDay":{"test":1},"goal":2}')).toEqual({
      trackDay: { test: 1 },
      goal: 2,
    });
  });
});
