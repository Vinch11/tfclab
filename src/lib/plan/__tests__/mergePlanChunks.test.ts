import { describe, it, expect } from "vitest";
import { mergePlanChunks, MergePlanError, validateSportObjective } from "../mergePlanChunks";
import { jsonPlanToParsedPlan, computeWeeklyVolumeBySport } from "../jsonPlanToParsedPlan";
import { zPlanChunk, type PlanChunk } from "../planSchema";

function makeSession(over: any = {}) {
  return {
    day: "lundi",
    title: "Session",
    details: "",
    isKeySession: false,
    durationMin: 60,
    zones: [],
    sport: "bike",
    custom: false,
    catalogId: "B_BIKE_TEMPO_01",
    ...over,
  };
}
function makeChunk(weeks: number[], over: any = {}): PlanChunk {
  return zPlanChunk.parse({
    weeks: weeks.map(n => ({
      weekNumber: n,
      phase: "build",
      theme: `S${n}`,
      sessions: [makeSession()],
    })),
    ...over,
  });
}

describe("mergePlanChunks", () => {
  it("merges consecutive chunks (1..8) covering all weeks", () => {
    const c1 = makeChunk([1, 2, 3, 4], { title: "T", phases: [{ name: "Base", weeks: "S1-S4" }] });
    const c2 = makeChunk([5, 6, 7, 8]);
    const m = mergePlanChunks([c1, c2], 8);
    expect(m.weeks.map(w => w.weekNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(m.title).toBe("T");
  });

  it("detects gap", () => {
    const c1 = makeChunk([1, 2, 3]);
    const c2 = makeChunk([5, 6]);
    expect(() => mergePlanChunks([c1, c2], 6)).toThrow(MergePlanError);
  });

  it("detects duplicate weekNumber", () => {
    const c1 = makeChunk([1, 2, 3]);
    const c2 = makeChunk([3, 4]);
    expect(() => mergePlanChunks([c1, c2], 4)).toThrow(MergePlanError);
  });

  it("accepts out-of-order chunks", () => {
    const a = makeChunk([5, 6, 7, 8]);
    const b = makeChunk([1, 2, 3, 4]);
    const m = mergePlanChunks([a, b], 8);
    expect(m.weeks.map(w => w.weekNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("throws on out-of-range weekNumber", () => {
    const c = makeChunk([1, 2, 9]);
    expect(() => mergePlanChunks([c], 8)).toThrow(MergePlanError);
  });
});

describe("jsonPlanToParsedPlan volume recompute", () => {
  it("computes weeklyVolume from durationMin (no LLM-declared volume)", () => {
    const chunk = zPlanChunk.parse({
      weeks: [{
        weekNumber: 1, phase: "base", theme: "S1",
        sessions: [
          makeSession({ day: "lundi", durationMin: 60 }),
          makeSession({ day: "mardi", durationMin: 90 }),
          { day: "mercredi", sport: "rest", title: "Repos", details: "",
            isKeySession: false, durationMin: 0, zones: [],
            custom: true, catalogId: null },
        ],
      }],
    });
    const merged = mergePlanChunks([chunk], 1);
    const parsed = jsonPlanToParsedPlan(merged);
    expect(parsed.weeks[0].computedVolumeMin).toBe(150);
    expect(parsed.weeks[0].volumeTarget).toBeUndefined();
    const vol = computeWeeklyVolumeBySport(merged)[0];
    expect(vol.totalMin).toBe(150);
    expect(vol.bySport.bike).toBe(150);
  });
});

describe("validateSportObjective — sport↔objective guard", () => {
  it("flags catalogId trail in a 70.3 plan as critical", () => {
    const c = zPlanChunk.parse({
      weeks: [{
        weekNumber: 1, phase: "base", theme: "",
        sessions: [makeSession({ catalogId: "A_TR_HILL_HIKE" })],
      }],
    });
    const m = mergePlanChunks([c], 1);
    const issues = validateSportObjective(m, "70.3 Nice");
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe("critical");
    expect(issues[0].offendingId).toBe("A_TR_HILL_HIKE");
  });

  it("flags custom session with trail vocab in road-running plan", () => {
    const c = zPlanChunk.parse({
      weeks: [{
        weekNumber: 1, phase: "base", theme: "",
        sessions: [{
          day: "samedi", sport: "run", title: "Sortie longue",
          details: "3h de sortie avec 1500m D+ et power-hike sur les montées",
          isKeySession: true, durationMin: 180, zones: ["Z2"],
          custom: true, catalogId: null,
        }],
      }],
    });
    const m = mergePlanChunks([c], 1);
    const issues = validateSportObjective(m, "Semi-marathon");
    expect(issues.length).toBe(1);
    expect(issues[0].reason).toMatch(/marqueur trail/);
  });

  it("returns [] for a trail objective (no false positive)", () => {
    const c = zPlanChunk.parse({
      weeks: [{
        weekNumber: 1, phase: "base", theme: "",
        sessions: [makeSession({ catalogId: "A_TR_HILL_HIKE", sport: "run" })],
      }],
    });
    const m = mergePlanChunks([c], 1);
    expect(validateSportObjective(m, "UTMB")).toEqual([]);
  });
});
