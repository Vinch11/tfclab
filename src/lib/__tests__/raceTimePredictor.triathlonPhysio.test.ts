import { describe, it, expect } from "vitest";
import { predictRaceDurationMin } from "../raceTimePredictor";

/**
 * Bug réel remonté par le coach : l'estimation du temps de course pour un
 * objectif triathlon (ex. "il fait un 70.3 en 4h40" vs "5h24" affiché) —
 * avant ce fix, TOUT objectif triathlon retombait sur une baseline
 * forfaitaire (TRI_BASELINE_MIN × AMBITION_TRI_MULT) identique pour deux
 * athlètes de FTP/allure seuil totalement différents, à ambition égale.
 * Corrigé pour IM/70.3 : split physiologique réel (FTP → vélo, allure seuil
 * → course) via estimateBikeSplit/estimateRunSplitMin, déjà utilisés et
 * validés dans "Simulation de course" (RaceSimulationPage.tsx).
 */
describe("predictRaceDurationMin — triathlon 70.3/IM utilise le split physiologique réel", () => {
  it("deux athlètes 70.3 de même ambition mais FTP/allure différents reçoivent des temps DIFFÉRENTS", () => {
    const strong = predictRaceDurationMin({
      objective: "70.3",
      ambition: "sub",
      ftp: 280,
      weightKg: 70,
      thresholdPaceSecPerKm: 240, // 4:00/km au seuil
    });
    const weaker = predictRaceDurationMin({
      objective: "70.3",
      ambition: "sub",
      ftp: 200,
      weightKg: 80,
      thresholdPaceSecPerKm: 300, // 5:00/km au seuil
    });
    expect(strong).not.toBeNull();
    expect(weaker).not.toBeNull();
    expect(strong!.source).toBe("triathlon_physio_split");
    expect(weaker!.source).toBe("triathlon_physio_split");
    // Avant le fix : les deux valaient exactement 330 × 0.80 = 264min (baseline
    // forfaitaire "sub"), quel que soit FTP/allure — donc strictement égaux.
    expect(strong!.targetRaceDurationMin).not.toBe(weaker!.targetRaceDurationMin);
    expect(strong!.targetRaceDurationMin).toBeLessThan(weaker!.targetRaceDurationMin);
  });

  it("sans FTP/poids (données insuffisantes pour le split physiologique) : repli sur la baseline forfaitaire, comportement inchangé", () => {
    const result = predictRaceDurationMin({
      objective: "70.3",
      ambition: "finish",
    });
    expect(result).not.toBeNull();
    expect(result!.source).toBe("triathlon_baseline");
    expect(result!.targetRaceDurationMin).toBe(Math.round(330 * 1.0));
  });

  it("Sprint/Olympique restent hors périmètre du fix (pas de splits swim/T1/T2 établis) : baseline forfaitaire même avec FTP/allure", () => {
    const result = predictRaceDurationMin({
      objective: "sprint",
      ambition: "sub",
      ftp: 280,
      weightKg: 70,
      thresholdPaceSecPerKm: 240,
    });
    expect(result).not.toBeNull();
    expect(result!.source).toBe("triathlon_baseline");
  });

  it("IM avec données complètes : la confiance dépasse celle de la baseline forfaitaire (0.45)", () => {
    const result = predictRaceDurationMin({
      objective: "IM",
      ambition: "perf",
      ftp: 250,
      weightKg: 72,
      thresholdPaceSecPerKm: 270,
      vlamaxRun: 0.4,
    });
    expect(result).not.toBeNull();
    expect(result!.source).toBe("triathlon_physio_split");
    expect(result!.confidence).toBeGreaterThan(0.45);
  });

  it("n'affecte pas les objectifs course à pied pure (Riegel/Daniels inchangés)", () => {
    const result = predictRaceDurationMin({
      objective: "marathon",
      ambition: "sub",
      ftp: 280,
      weightKg: 70,
      raceChronos: { time_10k_sec: 2400 }, // 40min au 10K
    });
    expect(result).not.toBeNull();
    expect(result!.source).toBe("riegel_chrono");
  });
});
