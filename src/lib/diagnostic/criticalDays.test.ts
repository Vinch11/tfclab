import { describe, expect, it } from "vitest";
import { CRITICAL_DAYS, buildCriticalBikeDayNolioSession, buildCriticalTrackDayNolioSession } from "./dayTestNolioSessions";
import { criticalGuide } from "./durabilityDay";
import { CRITICAL_POLICY, fitCriticalEfforts, type CriticalEffort } from "../criticalEfforts";
import type { NolioStepLike } from "./testingWeekNolioSessions";

const steps = (s: { structuredWorkout: unknown[] }) => s.structuredWorkout as NolioStepLike[];

describe("Track Day · Vitesse critique", () => {
  const day = buildCriticalTrackDayNolioSession();
  it("reprend le test habituel : échauffement, 1000 m, 30 min de repos, 3000 m, retour au calme", () => {
    expect(day.sport).toBe("run");
    const w = steps(day);
    expect(w.map(x => x.intensity_type)).toEqual(["warmup", "active", "rest", "active", "cooldown"]);
    expect(w[0]).toMatchObject({ step_duration_type: "duration", step_duration_value: 15 * 60 });
    expect(w[1]).toMatchObject({ step_duration_type: "distance", step_duration_value: 1000, target_type: "no_target" });
    expect(w[2]).toMatchObject({ step_duration_type: "duration", step_duration_value: 30 * 60 });
    expect(w[3]).toMatchObject({ step_duration_type: "distance", step_duration_value: 3000, target_type: "no_target" });
    expect(w[4]).toMatchObject({ step_duration_value: 10 * 60 });
  });
  it("dit où trouver le troisième point et limite de la mesure à deux efforts", () => {
    expect(day.objectif).toContain("1500 m du Track Day");
    expect(day.objectif).toContain("avec deux points seulement, la CS reste une estimation");
    expect(day.objectif).toContain("tfcl-cs-day-v1");
  });
  it("les distances sont des tours de 400 m", () => {
    expect(steps(day)[1].notes).toContain("2,5 tours");
    expect(steps(day)[3].notes).toContain("7,5 tours");
  });
});

describe("Bike Day · Puissance critique", () => {
  const day = buildCriticalBikeDayNolioSession();
  it("12 min, 5 min et 3 min, 30 min de repos entre chaque, sans cible imposée", () => {
    expect(day.sport).toBe("bike");
    const w = steps(day);
    expect(w.map(x => x.intensity_type)).toEqual(["warmup", "active", "rest", "active", "rest", "active", "cooldown"]);
    expect(w[1]).toMatchObject({ step_duration_value: 720, target_type: "no_target" });
    expect(w[2]).toMatchObject({ step_duration_value: 30 * 60 });
    expect(w[3]).toMatchObject({ step_duration_value: 300, target_type: "no_target" });
    expect(w[4]).toMatchObject({ step_duration_value: 30 * 60 });
    expect(w[5]).toMatchObject({ step_duration_value: 180, target_type: "no_target" });
  });
  it("trois points dans la même séance, FTP déduite de la CP", () => {
    expect(day.objectif).toContain("Les trois points donnent la puissance critique");
    expect(day.objectif).toContain("CP × 0,965");
  });
});

describe("les Days alimentent bien la politique critique de l'app", () => {
  const effort = (sport: "running" | "cycling", durationSec: number, value: number, measurement: "distance" | "power", id: string): CriticalEffort =>
    ({ id, sport, durationSec, value, measurement, date: "2026-11-10", session: "Day", conditions: "piste", source: "manual", confirmed: true });

  it("les durées prévues sont admissibles (2 à 15 min, rapport ≥ 3 une fois le troisième point ajouté)", () => {
    expect(CRITICAL_DAYS.bike.durationsSec.every(d => d >= CRITICAL_POLICY.minSec && d <= CRITICAL_POLICY.maxSec)).toBe(true);
    expect(Math.max(...CRITICAL_DAYS.bike.durationsSec) / Math.min(...CRITICAL_DAYS.bike.durationsSec)).toBeGreaterThanOrEqual(CRITICAL_POLICY.minSpanRatio);
  });
  it("course : 1000 m + 1500 m (Track Day) + 3000 m donnent une vitesse critique admissible", () => {
    // Athlète fictif : CS 4,0 m/s (14,4 km/h), D′ 200 m, soit 3 min 20 s, 5 min 25 s et 11 min 40 s.
    const fit = fitCriticalEfforts([effort("running", 200, 1000, "distance", "a"), effort("running", 325, 1500, "distance", "b"), effort("running", 700, 3000, "distance", "c")], "running", "2026-11-15");
    expect(fit.errors).toEqual([]);
    expect(fit.status).toBe("eligible");
    expect(fit.critical).toBeCloseTo(4, 1);
    expect(fit.reserve).toBeCloseTo(200, -1);
  });
  it("course : deux points seulement restent une estimation, avec l'avertissement du troisième effort", () => {
    const fit = fitCriticalEfforts([effort("running", 200, 1000, "distance", "a"), effort("running", 700, 3000, "distance", "c")], "running", "2026-11-15");
    expect(fit.status).not.toBe("eligible");
    expect(fit.warnings.join(" ")).toContain("troisième effort requis");
  });
  it("vélo : 3 min + 5 min (Bike Day) + 12 min donnent une CP admissible", () => {
    // Athlète fictif : CP 250 W, W′ 18 kJ, soit 350 W sur 3 min, 310 W sur 5 min et 275 W sur 12 min.
    const fit = fitCriticalEfforts([effort("cycling", 180, 350, "power", "a"), effort("cycling", 300, 310, "power", "b"), effort("cycling", 720, 275, "power", "c")], "cycling", "2026-11-15");
    expect(fit.errors).toEqual([]);
    expect(fit.status).toBe("eligible");
    expect(fit.critical).toBeCloseTo(250, -1);
  });
});

describe("guide des Days", () => {
  it("renvoie vers les nouveaux Days, le Track Day 1500 m + 3000 m et le Bike Day 12/5/3 min", () => {
    expect(criticalGuide.run).toContain("Track Day · Vitesse critique");
    expect(criticalGuide.run).toContain("Track Day (1500 m puis 3000 m maximaux) fournit déjà deux points");
    expect(criticalGuide.bike).toContain("Bike Day · Puissance critique");
    expect(criticalGuide.bike).toContain("12 min, 5 min puis 3 min maximaux");
  });
});
