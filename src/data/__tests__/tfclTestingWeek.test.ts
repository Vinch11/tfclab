import { describe, it, expect } from "vitest";
import { TFCL_TESTING_WEEK, computeTFCLCompletion } from "../tfclTestingWeek";

/**
 * Fix "FTP et TTE mélangés" (demande coach) : l'ancien D5 combiné (FTP +
 * TTE dans le même effort) était méthodologiquement bancal — le pacing
 * soutenable requis pour un FTP propre contredit le pacing poussé à
 * l'échec requis pour une vraie TTE. La semaine passe de 8 à 9 jours :
 * D5 = FTP dédié, D6 = Z2 (recovery + préparation), D7 = TTE dédié (au FTP
 * de D5), D8 = OFF + cohérence (était D7).
 */
describe("TFCL_TESTING_WEEK — semaine à 9 jours, FTP (D5) et TTE (D7) séparés", () => {
  it("compte 9 jours, de D-1 à D8", () => {
    expect(TFCL_TESTING_WEEK.days).toHaveLength(9);
    const keys = TFCL_TESTING_WEEK.days.map((d) => d.dayKey);
    expect(keys).toEqual(["D-1", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]);
  });

  it("D5 est un test FTP dédié, sans aucune mention de TTE dans son titre/objectif de test", () => {
    const d5 = TFCL_TESTING_WEEK.days.find((d) => d.dayKey === "D5")!;
    expect(d5.title).toContain("FTP");
    expect(d5.title).not.toContain("TTE");
    expect(d5.sessionType).toBe("TEST");
    // Une seule étape principale de 20 min (pas d'"Option A/B" mélangeant FTP et TTE).
    expect(d5.protocol.main).toHaveLength(1);
    expect(d5.protocol.main[0].durationMin).toBe(20);
    expect(d5.protocol.dataToRecord.some((f) => f.toLowerCase().includes("ftp"))).toBe(true);
    expect(d5.protocol.dataToRecord.some((f) => f.toLowerCase().includes("tte"))).toBe(false);
  });

  it("D6 reste une sortie Z2 de validation, positionnée comme tampon entre D5 (FTP) et D7 (TTE)", () => {
    const d6 = TFCL_TESTING_WEEK.days.find((d) => d.dayKey === "D6")!;
    expect(d6.sessionType).toBe("VALIDATION");
    expect(d6.goal).toContain("D5");
    expect(d6.goal).toContain("D7");
  });

  it("D7 est un test TTE dédié, testé au FTP de D5 (jamais un FTP recalculé sur place)", () => {
    const d7 = TFCL_TESTING_WEEK.days.find((d) => d.dayKey === "D7")!;
    expect(d7.title).toContain("TTE");
    expect(d7.sessionType).toBe("TEST");
    expect(d7.protocol.dataToRecord.some((f) => f.toLowerCase().includes("tte"))).toBe(true);
    expect(d7.protocol.dataToRecord.some((f) => f.toLowerCase().includes("ftp"))).toBe(false);
    expect(d7.protocol.validityCriteria.join(" ")).toMatch(/FTP.*D5|D5.*FTP/i);
  });

  it("D8 (était D7) est le OFF + cohérence check, référence D5 et D7 dans sa table de cohérence", () => {
    const d8 = TFCL_TESTING_WEEK.days.find((d) => d.dayKey === "D8")!;
    expect(d8.title).toBe("OFF + COHÉRENCE CHECK");
    expect(d8.sessionType).toBe("REST");
    const criteria = d8.protocol.validityCriteria.join(" ");
    expect(criteria).toContain("D7");
    expect(criteria).toContain("D5");
  });
});

describe("computeTFCLCompletion — FTP (D5) et TTE (D7) évalués indépendamment", () => {
  it("marque D5 complet dès que ftp est présent, même sans tte_observed_min", () => {
    const status = computeTFCLCompletion({ ftp: 290 });
    expect(status.completedTests).toContain("D5 - Test FTP");
    expect(status.completedTests).not.toContain("D7 - Test TTE");
    expect(status.missingData).toContain("TTE observé (min)");
  });

  it("marque D7 complet dès que tte_observed_min est présent, même sans ftp", () => {
    const status = computeTFCLCompletion({ tte_observed_min: 42 });
    expect(status.completedTests).toContain("D7 - Test TTE");
    expect(status.completedTests).not.toContain("D5 - Test FTP");
    expect(status.missingData).toContain("FTP (W)");
  });

  it("les deux complets → aucune donnée FTP/TTE manquante", () => {
    const status = computeTFCLCompletion({
      p30s_w: 900, p60s_w: 700, map5min_w: 350, ftp: 290, tte_observed_min: 42,
    });
    expect(status.isComplete).toBe(true);
    expect(status.missingData).toHaveLength(0);
  });
});
