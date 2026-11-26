import { describe, expect, it } from "vitest";
import { bikeDetail, runDetail, segmentFeed, minettiCost, fmtClock } from "@/lib/raceSimulation/raceDetail";
import { DEFAULT_PRODUCTS, readRaceProducts, readSweatTest, withNutritionProfile, type RaceProducts } from "@/lib/raceSimulation/raceNutritionProfile";
import { buildRaceCard, type RaceCardAthlete } from "@/lib/raceSimulation/raceCard";

const typeProducts: RaceProducts = { gel: { ...DEFAULT_PRODUCTS.gel, custom: false }, bar: { ...DEFAULT_PRODUCTS.bar, custom: false }, drink: { ...DEFAULT_PRODUCTS.drink, custom: false } };
const profile = { weightKg: 52, sweatRateMlH: null, salty: null, heat: false, products: typeProducts };

describe("vélo : puissance selon le terrain", () => {
  const d = bikeDetail("IM", { centerW: 133, rangeW: [130, 135], ftpW: 188, weightKg: 52, distanceKm: 180, timeMin: 348, startClockMin: 79 });
  it("plat = cible ; côtes au-dessus mais jamais au-delà du plafond de la distance", () => {
    expect(d.terrain[0].target).toBe("130–135 W");
    expect(d.capW).toBe(160); // 85 % de la FTP en Ironman
    for (const t of d.terrain) for (const w of t.target.match(/\d+(?= W)|\d+(?=–)/g) ?? []) expect(Number(w)).toBeLessThanOrEqual(188);
    expect(d.terrain.find(t => t.terrain.startsWith("Côte courte"))!.target).toBe("146–160 W");
  });
  it("NP visée, moyenne plus basse (VI ≤ 1,05), passages jusqu'à l'arrivée du vélo", () => {
    expect(d.npW).toBe(133);
    expect(d.avgW).toEqual([127, 133]);
    expect(d.passages.map(p => p.km)).toEqual([45, 90, 135, 180]);
    expect(d.passages.at(-1)!.clock).toBe(fmtClock(79 + 348));
  });
});

describe("course : allure selon la pente (Minetti 2002) et passages", () => {
  it("coût : plat 3,6 J/kg/m, + 30 % environ à 5 %", () => {
    expect(minettiCost(0)).toBeCloseTo(3.6, 5);
    expect(minettiCost(0.05) / minettiCost(0)).toBeGreaterThan(1.25);
    expect(minettiCost(0.05) / minettiCost(0)).toBeLessThan(1.35);
  });
  it("départ plus lent et total identique au temps prévu", () => {
    const r = runDetail("Marathon", { paceSec: 336, distanceKm: 42.195, timeMin: 236.3, startClockMin: 0, afterBike: false, ambition: "competitor" });
    expect(r.splits[0].label).toBe("Km 0 à 3");
    expect(r.passages.at(-1)!.runTime).toBe(fmtClock(236.3));
    expect(r.terrain.find(t => t.terrain === "Descente")!.target).toBe("pas plus vite que 5:26/km");
  });
  it("après le vélo en age-group : marcher les ravitos", () => {
    const r = runDetail("IM", { paceSec: 372, distanceKm: 42.195, timeMin: 262, startClockMin: 430, afterBike: true, ambition: "age_group" });
    expect(r.terrain.find(t => t.terrain === "Ravitaillement")!.target).toBe("marche 10–15 s");
  });
});

describe("boire et manger", () => {
  it("vélo d'Ironman : barres dans la 1re partie, gels ensuite, glucides prévus proches de la cible", () => {
    const f = segmentFeed({ sport: "bike", kind: "IM", minutes: 348, raceMin: 690, startClockMin: 79, carbsGH: [60, 75], profile });
    expect(f.events[0].segMin).toBe(20);
    expect(f.counts.bar).toBeGreaterThan(0);
    expect(f.counts.gel).toBeGreaterThan(0);
    const firstGel = f.events.findIndex(e => e.items.some(i => i.includes("gel")));
    const lastBar = f.events.map(e => e.items.some(i => i.includes("barre"))).lastIndexOf(true);
    expect(lastBar).toBeLessThan(firstGel === -1 ? Infinity : f.events.length);
    expect(f.events[lastBar].segMin).toBeLessThanOrEqual(348 * 0.6);
    expect(Math.abs(f.carbsPlannedGH! - f.carbsTargetGH!)).toBeLessThanOrEqual(10);
  });
  it("sueur testée et salée : plus d'eau et de sodium, capsules si les produits ne suffisent pas", () => {
    const base = segmentFeed({ sport: "bike", kind: "IM", minutes: 348, raceMin: 690, startClockMin: 0, carbsGH: [60, 75], profile });
    const salty = segmentFeed({ sport: "bike", kind: "IM", minutes: 348, raceMin: 690, startClockMin: 0, carbsGH: [60, 75], profile: { ...profile, sweatRateMlH: 1000, salty: true } });
    expect(salty.sweatSource).toBe("measured");
    expect(salty.fluidMlH).toBeGreaterThan(base.fluidMlH);
    expect(salty.sodiumMgH).toBeGreaterThan(base.sodiumMgH);
    expect(salty.counts.salt).toBeGreaterThan(0);
    expect(salty.fluidMlH).toBeLessThanOrEqual(800);
  });
  it("produits de l'athlète : son gel de 40 g remplace le gel type", () => {
    const f = segmentFeed({ sport: "run", kind: "Marathon", minutes: 236, raceMin: 236, startClockMin: 0, carbsGH: [45, 60],
      profile: { ...profile, products: { ...typeProducts, gel: { name: "Maurten 160", carbsG: 40, sodiumMg: 0, custom: true } } } });
    expect(f.events.some(e => e.items.includes("1 maurten 160 (40 g)"))).toBe(true);
    expect(f.counts.bar).toBeUndefined();
  });
  it("10 km de moins d'une heure : eau seulement", () => {
    const f = segmentFeed({ sport: "run", kind: "10K", minutes: 51, raceMin: 51, startClockMin: 0, carbsGH: null, profile });
    expect(f.carbsTargetGH).toBeNull();
    expect(f.events.every(e => e.items.length === 1 && e.items[0].endsWith("d'eau"))).toBe(true);
  });
});

describe("fiche : sueur et produits dans refs", () => {
  it("lecture, produits types par défaut, effacement", () => {
    let refs = withNutritionProfile({ carbTolerance: { gh: 75 } }, { sweatTest: { mlH: 900, salty: true, date: "2026-11-26" }, products: { gel: { name: "SIS Beta Fuel", carbsG: 40, sodiumMg: 20 } } });
    expect(readSweatTest(refs)).toEqual({ mlH: 900, salty: true, date: "2026-11-26" });
    expect(readRaceProducts(refs).gel).toMatchObject({ name: "SIS Beta Fuel", carbsG: 40, custom: true });
    expect(readRaceProducts(refs).bar.custom).toBe(false);
    expect((refs as Record<string, unknown>).carbTolerance).toEqual({ gh: 75 });
    refs = withNutritionProfile(refs, { sweatTest: null, products: { gel: null } });
    expect(readSweatTest(refs)).toBeNull();
    expect(readRaceProducts(refs).gel.custom).toBe(false);
  });
});

describe("carte de course complète", () => {
  const athlete: RaceCardAthlete = {
    ambition: "competitor", weightKg: 52, ftpW: 188, cssSecPer100: 110, vo2max: 48, tteBikeMin: null, fcMax: 192,
    vlamaxBike: { value: 0.2, measured: false }, vlamaxRun: { value: 0.3, measured: false }, carbToleranceGH: 75, sweatRateMlH: 700,
    snapshot: { date: "2026-11-25", ftp: 188, vma: 13, pace_threshold_sec_per_km: 305, fc_max: 192, weight_kg: 52 },
  };
  it("Ironman : détail vélo et course, chrono continu, liste à préparer", () => {
    const card = buildRaceCard({ kind: "IM", athlete });
    const bike = card.segments.find(s => s.sport === "bike")!, run = card.segments.find(s => s.sport === "run")!;
    expect(bike.detail?.bike?.terrain.length).toBe(6);
    expect(run.detail?.run?.passages.at(-1)!.clock).toBe(fmtClock(card.totalMin!));
    expect(bike.detail?.feed?.sweatSource).toBe("measured");
    expect(card.nutrition.shopping.some(x => x.includes("bidons"))).toBe(true);
    expect(card.nutrition.preRace.length).toBe(4);
    expect(card.missing).toEqual([]);
  });
  it("sueur non testée : listée comme donnée à compléter", () => {
    const card = buildRaceCard({ kind: "IM", athlete: { ...athlete, sweatRateMlH: null } });
    expect(card.missing.map(m => m.label)).toContain("Taux de sueur testé");
  });
});
