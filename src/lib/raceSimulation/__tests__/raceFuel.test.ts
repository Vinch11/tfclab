import { describe, expect, it } from "vitest";
import { planRaceFuel, carbBurnGH, targetIntensityPct, durationCeiling } from "@/lib/raceSimulation/raceFuel";
import { buildRaceCard, type RaceCardAthlete } from "@/lib/raceSimulation/raceCard";
import { readCarbTolerance, withCarbTolerance } from "@/lib/raceSimulation/carbTolerance";

const emanuela = { weightKg: 52, vo2max: 48, vlamaxBike: { value: 0.2, measured: false }, vlamaxRun: { value: 0.3, measured: false }, toleranceGH: null };
const strongMan = { weightKg: 75, vo2max: 58, vlamaxBike: { value: 0.45, measured: false }, vlamaxRun: { value: 0.5, measured: false }, toleranceGH: 90 };

describe("dépense individuelle (modèle de Mader, comme les rapports)", () => {
  it("intensité : 132 W ≈ 66 % de la VO2max d'Emanuela", () => {
    expect(targetIntensityPct("bike", 132, 52, 48)).toBeGreaterThan(60);
    expect(targetIntensityPct("bike", 132, 52, 48)).toBeLessThan(72);
  });
  it("plus de VLamax ou d'intensité = plus de glucides brûlés ; chaleur + 10 %", () => {
    const low = carbBurnGH("bike", 132, emanuela)!;
    expect(carbBurnGH("bike", 132, { ...emanuela, vlamaxBike: { value: 0.5, measured: false } })!).toBeGreaterThan(low);
    expect(carbBurnGH("bike", 150, emanuela)!).toBeGreaterThan(low);
    expect(carbBurnGH("bike", 132, { ...emanuela, heat: true })!).toBeCloseTo(low * 1.1, 5);
    expect(carbBurnGH("bike", 132, { ...emanuela, vo2max: null })).toBeNull();
  });
});

describe("apport conseillé", () => {
  it("plafond « jusqu'à » selon la durée (Jeukendrup 2014), 120 g/h seulement si l'intestin est entraîné", () => {
    expect(durationCeiling(50, null)).toBeNull();
    expect(durationCeiling(100, null)).toBe(30);
    expect(durationCeiling(140, null)).toBe(60);
    expect(durationCeiling(600, null)).toBe(90);
    expect(durationCeiling(600, 120)).toBe(120);
  });
  it("faible dépense : apport réduit mais jamais sous le minimum d'une épreuve longue", () => {
    const plan = planRaceFuel([{ sport: "swim", minutes: 73, target: null }, { sport: "bike", minutes: 348, target: 132 }, { sport: "run", minutes: 262, target: 372 }], 693, emanuela);
    expect(plan.method).toBe("individual");
    expect(plan.segments.bike!.intake[0]).toBeGreaterThanOrEqual(45);
    expect(plan.segments.bike!.intake[1]).toBeLessThan(90);
    expect(plan.segments.bike!.why).toMatch(/VLamax estimée/);
    expect(plan.supplyG!).toBeGreaterThanOrEqual(plan.needG!);
  });
  it("forte dépense : plafonnée par la tolérance testée, 75 % en course à pied", () => {
    const plan = planRaceFuel([{ sport: "bike", minutes: 330, target: 200 }, { sport: "run", minutes: 230, target: 330 }], 640, strongMan);
    expect(plan.segments.bike!.intake[1]).toBe(90);
    expect(plan.segments.run!.intake[1]).toBe(70);
    expect(plan.segments.run!.limitedBy).toBe("tolerance");
  });
  it("tolérance trop basse pour la dépense : alerte de panne", () => {
    const plan = planRaceFuel([{ sport: "bike", minutes: 330, target: 200 }, { sport: "run", minutes: 230, target: 330 }], 640, { ...strongMan, toleranceGH: 45 });
    expect(plan.warning).toMatch(/risque de panne/);
  });
  it("course de moins d'une heure : rien à manger", () => {
    expect(planRaceFuel([{ sport: "run", minutes: 50, target: 300 }], 50, emanuela).segments.run).toBeUndefined();
  });
});

describe("dans la carte de course", () => {
  const athlete: RaceCardAthlete = {
    ambition: "competitor", weightKg: 52, ftpW: 188, cssSecPer100: 110, vo2max: 48, tteBikeMin: null, fcMax: 192,
    vlamaxBike: { value: 0.2, measured: false }, vlamaxRun: { value: 0.3, measured: false }, carbToleranceGH: 75, sweatRateMlH: 700,
    snapshot: { date: "2026-11-25", ftp: 188, vma: 13, pace_threshold_sec_per_km: 305, fc_max: 192, weight_kg: 52 },
  };
  it("Ironman : glucides individualisés, bilan de glycogène, pas de champ manquant", () => {
    const card = buildRaceCard({ kind: "IM", athlete });
    expect(card.fuel.method).toBe("individual");
    expect(card.fuel.needG).toBeGreaterThan(0);
    expect(card.segments.find(s => s.sport === "bike")!.carbs!.burnGH).toBeGreaterThan(0);
    expect(card.segments.find(s => s.sport === "run")!.carbs!.gh[1]).toBeLessThanOrEqual(55);
    expect(card.missing).toEqual([]);
  });
  it("chaleur : plus de glucides brûlés", () => {
    const cool = buildRaceCard({ kind: "Marathon", athlete }).segments[0].carbs!.burnGH!;
    expect(buildRaceCard({ kind: "Marathon", athlete, heat: true }).segments[0].carbs!.burnGH!).toBeCloseTo(cool * 1.1, 5);
  });
  it("Long Course Weekend : un plan par jour", () => {
    const card = buildRaceCard({ kind: "IM", lcw: true, athlete });
    expect(card.segments.filter(s => s.carbs).map(s => s.sport)).toEqual(["bike", "run"]);
    expect(card.fuel.needG).toBeNull();
  });
});

describe("tolérance dans la fiche athlète", () => {
  it("se range dans refs et s'efface sans toucher au reste", () => {
    const refs = withCarbTolerance({ ambition: "competitor" }, 90, "2026-11-26");
    expect(readCarbTolerance(refs)).toEqual({ gh: 90, date: "2026-11-26" });
    expect((refs as Record<string, unknown>).ambition).toBe("competitor");
    expect(readCarbTolerance(withCarbTolerance(refs, null, "2026-11-26"))).toBeNull();
  });
});
