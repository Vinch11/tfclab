import { describe, it, expect } from "vitest";
import { calibrateBillat3030FromTlim, formatBillat3030Summary } from "@/lib/tlimVolumeCalibration";

describe("calibrateBillat3030FromTlim", () => {
  it("données absentes ou invalides → null (repli calibrage classique)", () => {
    expect(calibrateBillat3030FromTlim(null)).toBeNull();
    expect(calibrateBillat3030FromTlim(undefined)).toBeNull();
    expect(calibrateBillat3030FromTlim(0)).toBeNull();
    expect(calibrateBillat3030FromTlim(-2)).toBeNull();
    expect(calibrateBillat3030FromTlim(NaN)).toBeNull();
  });

  it("ancres exactes reproduisent littéralement la règle Billat (fiche BILLAT_RUN_TLIM_TEST)", () => {
    const t4 = calibrateBillat3030FromTlim(4);
    expect(t4).toMatchObject({ seriesCount: 2, repsPerSeries: 6, totalReps: 12, clamped: false });

    const t6 = calibrateBillat3030FromTlim(6);
    expect(t6).toMatchObject({ seriesCount: 2, repsPerSeries: 8, totalReps: 16, clamped: false });

    const t8 = calibrateBillat3030FromTlim(8);
    expect(t8).toMatchObject({ seriesCount: 3, repsPerSeries: 8, totalReps: 24, clamped: false });
  });

  it("interpolation entre ancres : tlim=5 → 2×7, tlim=7 → 2×10 (correspond à la progression S2 de BILLAT_RUN_30_30_PRO)", () => {
    const t5 = calibrateBillat3030FromTlim(5);
    expect(t5).toMatchObject({ seriesCount: 2, repsPerSeries: 7, totalReps: 14 });

    const t7 = calibrateBillat3030FromTlim(7);
    expect(t7).toMatchObject({ seriesCount: 2, repsPerSeries: 10, totalReps: 20 });
  });

  it("tlim < 4min : plancher à l'ancre 4min (2×6), marqué clamped", () => {
    const r = calibrateBillat3030FromTlim(2.5);
    expect(r).toMatchObject({ seriesCount: 2, repsPerSeries: 6, totalReps: 12, clamped: true });
  });

  it("tlim > 8min : plafond à l'ancre 8min (3×8), marqué clamped — jamais d'extrapolation au-delà (Billat 2000 : rendements décroissants)", () => {
    const r = calibrateBillat3030FromTlim(15);
    expect(r).toMatchObject({ seriesCount: 3, repsPerSeries: 8, totalReps: 24, clamped: true });
  });

  it("totalTimeAtVo2maxMin = totalReps × 0.5 minute (durée réelle d'un bout de 30s)", () => {
    const r = calibrateBillat3030FromTlim(6)!;
    expect(r.totalTimeAtVo2maxMin).toBe(8);
  });
});

describe("formatBillat3030Summary", () => {
  it("résumé lisible sans mention de plafond/plancher quand non clamped", () => {
    const calib = calibrateBillat3030FromTlim(6)!;
    const summary = formatBillat3030Summary(calib);
    expect(summary).toContain("2×8");
    expect(summary).toContain("Tlim@vVO2max = 6 min");
    expect(summary).not.toContain("plafond");
    expect(summary).not.toContain("plancher");
  });

  it("résumé mentionne le plancher (capacité limitée) sous l'ancre basse", () => {
    const calib = calibrateBillat3030FromTlim(2)!;
    const summary = formatBillat3030Summary(calib);
    expect(summary).toContain("plancher");
    expect(summary).toContain("capacité VO2max limitée");
  });

  it("résumé mentionne le plafond (rendements décroissants) au-dessus de l'ancre haute", () => {
    const calib = calibrateBillat3030FromTlim(12)!;
    const summary = formatBillat3030Summary(calib);
    expect(summary).toContain("plafond");
    expect(summary).toContain("rendements décroissants");
  });
});
