import { describe, it, expect } from "vitest";
import { CAP_TESTING_WEEK, computeCAPCompletion } from "../capTestingWeek";

/**
 * Fix "FTP et TTE mélangés" côté vélo (demande coach), répliqué côté CAP :
 * l'ancien D5 combiné (allure seuil + TTE dans le même effort) était
 * méthodologiquement bancal, pour la même raison que côté vélo — le pacing
 * soutenable requis pour une allure seuil propre contredit le pacing poussé
 * à l'échec requis pour une vraie TTE. La semaine passe de 8 à 9 jours :
 * D5 = allure seuil dédiée, D6 = TTE dédiée (à l'allure de D5), D7 =
 * Endurance Validation + RE (était D6), D8 = OFF + cohérence (était D7).
 */
describe("CAP_TESTING_WEEK — semaine à 9 jours, allure seuil (D5) et TTE (D6) séparées", () => {
  it("compte 9 jours, de D-1 à D8", () => {
    expect(CAP_TESTING_WEEK.days).toHaveLength(9);
    const keys = CAP_TESTING_WEEK.days.map((d) => d.dayKey);
    expect(keys).toEqual(["D-1", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]);
  });

  it("D5 est un test allure seuil dédié, sans aucune mention de TTE dans son titre/données à enregistrer", () => {
    const d5 = CAP_TESTING_WEEK.days.find((d) => d.dayKey === "D5")!;
    expect(d5.title).toContain("ALLURE SEUIL");
    expect(d5.title).not.toContain("TTE");
    expect(d5.sessionType).toBe("TEST");
    // Une seule étape principale de 30 min (pas d'extension TTE dans le même effort).
    expect(d5.protocol.main).toHaveLength(1);
    expect(d5.protocol.main[0].durationMin).toBe(30);
    expect(d5.protocol.dataToRecord.some((f) => f.toLowerCase().includes("tte"))).toBe(false);
    // Idem pour la variante tapis.
    expect(d5.treadmillProtocol).toBeDefined();
    expect(d5.treadmillProtocol!.main).toHaveLength(1);
    expect(d5.treadmillProtocol!.dataToRecord.some((f) => f.toLowerCase().includes("tte"))).toBe(false);
  });

  it("D6 est un test TTE dédié, testé à l'allure seuil de D5 (jamais une allure recalculée sur place)", () => {
    const d6 = CAP_TESTING_WEEK.days.find((d) => d.dayKey === "D6")!;
    expect(d6.title).toContain("TTE");
    expect(d6.sessionType).toBe("TEST");
    expect(d6.protocol.dataToRecord.some((f) => f.toLowerCase().includes("tte"))).toBe(true);
    expect(d6.protocol.validityCriteria.join(" ")).toMatch(/D5/);
    expect(d6.goal).toContain("D5");
    // Idem pour la variante tapis.
    expect(d6.treadmillProtocol).toBeDefined();
    expect(d6.treadmillProtocol!.validityCriteria.join(" ")).toMatch(/D5/);
  });

  it("D7 (était D6) reste Endurance Validation + RE, dayKey mis à jour", () => {
    const d7 = CAP_TESTING_WEEK.days.find((d) => d.dayKey === "D7")!;
    expect(d7.title).toContain("Endurance Validation");
    expect(d7.title).toContain("RE");
    expect(d7.sessionType).toBe("VALIDATION");
  });

  it("D8 (était D7) est le OFF + cohérence check, référence D5 et D6 dans sa table de cohérence", () => {
    const d8 = CAP_TESTING_WEEK.days.find((d) => d.dayKey === "D8")!;
    expect(d8.title).toBe("OFF + COHÉRENCE CHECK");
    expect(d8.sessionType).toBe("REST");
    const criteria = d8.protocol.validityCriteria.join(" ");
    expect(criteria).toContain("D6");
    expect(criteria).toContain("D5");
  });
});

describe("computeCAPCompletion — Allure Seuil (D5) et TTE (D6) évalués indépendamment", () => {
  it("marque D5 complet dès que pace_threshold_sec_per_km est présent, même sans TTE", () => {
    const status = computeCAPCompletion({ pace_threshold_sec_per_km: 240 });
    expect(status.completedTests).toContain("D5 - Allure Seuil");
    expect(status.completedTests).not.toContain("D6 - TTE observé");
    expect(status.missingData).toContain("TTE observé (min)");
  });

  it("marque D6 complet dès que tte_observed_min_run est présent, même sans allure seuil", () => {
    const status = computeCAPCompletion({ tte_observed_min_run: 48 });
    expect(status.completedTests).toContain("D6 - TTE observé");
    expect(status.completedTests).not.toContain("D5 - Allure Seuil");
    expect(status.missingData).toContain("Allure Seuil (s/km)");
  });

  it("les deux complets (avec sprint + VMA) → isComplete et aucune donnée manquante", () => {
    const status = computeCAPCompletion({
      sprint_15s_distance: 95,
      vma: 18.5,
      pace_threshold_sec_per_km: 240,
      tte_observed_min_run: 48,
    });
    expect(status.isComplete).toBe(true);
    expect(status.missingData).toHaveLength(0);
  });

  it("isComplete ne dépend PAS de la TTE (asymétrie pré-existante vs bike, inchangée par le split)", () => {
    const status = computeCAPCompletion({
      sprint_15s_distance: 95,
      vma: 18.5,
      pace_threshold_sec_per_km: 240,
    });
    expect(status.isComplete).toBe(true);
    expect(status.missingData).toContain("TTE observé (min)");
  });
});
