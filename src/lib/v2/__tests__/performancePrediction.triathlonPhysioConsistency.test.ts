import { describe, it, expect } from "vitest";
import { computePerformancePredictions } from "../performancePrediction";
import { predictRaceDurationMin } from "@/lib/raceTimePredictor";

/**
 * Bug réel corrigé (audit "rapport staff", coach) : le rapport staff PDF
 * affichait un temps de 70.3 (5h24) sensiblement plus lent que le temps réel
 * de l'athlète (4h45), alors même que le fix "temps course triathlon"
 * (raceTimePredictor.ts) avait déjà corrigé ce problème ailleurs dans l'app
 * (Simulation de course, plan IA). Cause racine : ExportTools.tsx appelle
 * computePerformancePredictions (ce fichier), un DEUXIÈME moteur de temps
 * triathlon totalement indépendant, dupliquant — moins bien — le split
 * vélo/course déjà validé. Ce fichier ne recevait même pas l'allure seuil
 * réelle (thresholdPaceSecPerKm n'existait pas dans son input).
 */
describe("computePerformancePredictions — 70.3/IM délèguent au split physiologique réel", () => {
  const tri703 = (overrides: Partial<Parameters<typeof computePerformancePredictions>[0]>) =>
    computePerformancePredictions(
      { vo2max: 55, vlamax: 0.4, weight: 75, confidence: 0.7, ...overrides },
      "triathlon",
    ).scenarios.find(s => s.scenario === "optimal")!.predictions.find(p => p.raceId === "tri_703")!;

  it("deux athlètes de même VO2max/VLamax/poids mais d'allure seuil différente reçoivent des temps 70.3 différents", () => {
    const fast = tri703({ ftp: 280, thresholdPaceSecPerKm: 240 }); // 4'00/km
    const slow = tri703({ ftp: 280, thresholdPaceSecPerKm: 300 }); // 5'00/km
    expect(fast.timeMinutes).not.toBe(slow.timeMinutes);
    expect(fast.timeMinutes).toBeLessThan(slow.timeMinutes);
  });

  it("le temps 70.3 correspond au split physiologique de raceTimePredictor.ts (source unique)", () => {
    const ftp = 260, weightKg = 72, thresholdPaceSecPerKm = 270, vlamax = 0.42;
    const pred = tri703({ ftp, weight: weightKg, vlamax, thresholdPaceSecPerKm });
    const reference = predictRaceDurationMin({
      objective: "70.3",
      ambition: "perf",
      ftp,
      weightKg,
      vlamaxRun: vlamax,
      thresholdPaceSecPerKm,
      vmaKmh: null,
      raceChronos: null,
    });
    expect(reference?.source).toBe("triathlon_physio_split");
    // Scénario "optimal" = timeFactor 1.0, donc identique à la valeur physio.
    expect(pred.timeMinutes).toBe(reference!.targetRaceDurationMin);
  });

  it("sans FTP/allure seuil, repli sur le modèle physiologique générique (VO2max/VLamax) — pas d'erreur", () => {
    const pred = tri703({});
    expect(pred.timeMinutes).toBeGreaterThan(0);
    expect(Number.isFinite(pred.timeMinutes)).toBe(true);
  });

  it("Sprint et Olympique restent sur le modèle ad-hoc (hors périmètre du split physio)", () => {
    const output = computePerformancePredictions(
      { vo2max: 55, vlamax: 0.4, weight: 75, ftp: 260, thresholdPaceSecPerKm: 270, confidence: 0.7 },
      "triathlon",
    );
    const optimal = output.scenarios.find(s => s.scenario === "optimal")!;
    const sprint = optimal.predictions.find(p => p.raceId === "tri_sprint")!;
    const oly = optimal.predictions.find(p => p.raceId === "tri_oly")!;
    expect(sprint.timeMinutes).toBeGreaterThan(0);
    expect(oly.timeMinutes).toBeGreaterThan(0);
    expect(oly.timeMinutes).toBeGreaterThan(sprint.timeMinutes);
  });
});
