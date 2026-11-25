import { describe, expect, it } from "vitest";
import { settlePhaseDurations } from "@/lib/v2/strategicRoadmap";
import { preparationTimeline } from "@/lib/reportKit/editions";

const ph = (bounds: [number, number][]) => bounds.map(([startWeek, endWeek], i) => ({ startWeek, endWeek, name: ["A", "B", "C", "Affûtage"][i], subtitle: i === 3 ? "Phase 4: Affûtage" : "x" }));
const lengths = (p: { startWeek: number; endWeek: number }[]) => p.map(x => x.endWeek - x.startWeek + 1);

describe("durées des phases", () => {
  it("marathon : affûtage de 2 semaines et blocs d'au moins 3 semaines (cas Emanuela, 14 sem.)", () => {
    const p = ph([[1, 4], [5, 6], [7, 13], [14, 14]]);
    settlePhaseDurations(p, 14, "Marathon");
    expect(lengths(p)).toEqual([4, 3, 5, 2]);
    expect(p[3].endWeek).toBe(14);
  });
  it("Ironman 15 sem. : un bloc d'1 semaine devient un vrai bloc", () => {
    const p = ph([[1, 3], [4, 4], [5, 13], [14, 15]]);
    settlePhaseDurations(p, 15, "IM");
    expect(lengths(p)).toEqual([3, 3, 7, 2]);
  });
  it("un modèle déjà correct reste identique", () => {
    const p = ph([[1, 4], [5, 8], [9, 19], [20, 24]]);
    settlePhaseDurations(p, 24, "IM");
    expect(lengths(p)).toEqual([4, 4, 11, 5]);
  });
});

describe("frise du rapport", () => {
  it("l'affûtage se termine le jour de la course", () => {
    const html = preparationTimeline({ title: "", totalWeeks: 31, limiterSummary: "", personalized: true, startDate: "2026-11-25",
      phases: [{ id: 1, name: "Affûtage", subtitle: "", startWeek: 13, endWeek: 14, color: "", focus: "", levers: [], targets: [] },
        { id: 2, name: "Affûtage (Cycle 2/2 — IM)", subtitle: "", startWeek: 30, endWeek: 31, color: "", focus: "", levers: [], targets: [] }],
      cycles: [{ objective: "Marathon", raceDate: "2027-02-28", startWeek: 1, endWeek: 14 }, { objective: "IM", raceDate: "2027-06-27", startWeek: 17, endWeek: 31 }] }, "IM", true);
    expect(html).toContain("au 28/02/2027");
    expect(html).toContain("au 27/06/2027");
    expect(html).not.toContain("02/03/2027");
  });
});

describe("séance de seuil selon la TTE", () => {
  it("TTE 19 min : 3×10 min, pas 2×20-30", async () => {
    const { thresholdRepsForTte } = await import("@/lib/v2/lorangStrategyEngine");
    expect(thresholdRepsForTte(19)).toMatch(/^3×10min/);
    expect(thresholdRepsForTte(48)).toMatch(/^2×24min/);
    expect(thresholdRepsForTte(null)).toBe("2×20-30min au seuil pour augmenter le TTE");
  });
});

describe("repères de course sur la grille", () => {
  it("une plage à cheval sur deux zones s'affiche « Z2–Z3 »", async () => {
    const { zoneSpan } = await import("@/lib/reportKit/sportDiagramData");
    const bike = { Z1: [0, 127], Z2: [127, 146], Z3: [146, 166] } as never;
    expect(zoneSpan(bike, 138, 148)).toBe("Z2–Z3");
    expect(zoneSpan(bike, 130, 140)).toBe("Z2");
    const run = { Z2: [368, 431], Z3: [351, 368] } as never; // [rapide, lent] s/km
    expect(zoneSpan(run, 359, 391)).toBe("Z2–Z3");
  });
});
