import { describe, it, expect } from "vitest";
import { snapshotToEngineData } from "../cycleIntelligence";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 1) :
 * snapshotToEngineData n'transmettait que vlamax/vlamax_run/sport_main à
 * resolveVlamaxForGoal, privant l'estimateur CAP unifié (estimateVLamaxCap)
 * des champs dont il a besoin (vma, pace_threshold_sec_per_km, weight_kg,
 * etc.). Sans eux, l'estimateur renvoyait toujours "insufficient" et le
 * resolver retombait silencieusement sur le champ brut vlamax_run non
 * validé, au lieu du chemin sport-aware multi-source utilisé partout
 * ailleurs dans l'app pour la même donnée (Cycle Intelligence trend
 * detection, PDFPreviewPanel, ExportTools.tsx).
 */

describe("snapshotToEngineData — transmet les champs nécessaires à l'estimateur CAP unifié", () => {
  it("sans vlamax_run mais avec vma+pace_threshold+sprint15s, l'estimateur CAP produit une valeur (preuve que les champs sont bien transmis)", () => {
    // Avant le fix : resolveVlamaxForGoal ne recevait que
    // vlamax/vlamax_run/sport_main. Sans vlamax_run, ni vma/pace_threshold
    // transmis, l'estimateur CAP recevait des inputs tous null → method
    // "insufficient" → retour null. Avec le fix, ces champs sont transmis
    // et l'estimateur peut produire une estimation sport-aware.
    const rawSnapshot: Record<string, unknown> = {
      id: "s1",
      date: "2026-01-01",
      vlamax: null,
      vlamax_run: null,
      sport_main: "run",
      objectif: "Marathon",
      vma: 18,
      pace_threshold_sec_per_km: 230,
      sprint_15s_distance: 75,
      weight_kg: 68,
      vo2max: 55,
      ftp: null,
      tte_observed_min: 45,
      tss_7d: null,
      run_hr_drift_pct: null,
      run_economy_score: null,
    };
    const result = snapshotToEngineData(rawSnapshot);
    expect(result.vlamax).not.toBeNull();
  });
});
