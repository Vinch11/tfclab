import { describe, it, expect } from "vitest";
import { resolveThresholdPaceForPrediction } from "../ExportTools";

/**
 * Bug réel corrigé (audit "rapport staff", coach : "l'estimation du temps
 * de Vince est toujours de 5h24"). Le fix "temps triathlon 70.3/IM" (PR
 * précédente) ne lisait l'allure au seuil que depuis le champ brut du
 * snapshot (pace_threshold_sec_per_km) — quasi jamais rempli directement
 * par les athlètes, contrairement à RaceSimulationPage.tsx (déjà validé)
 * qui complète avec une allure dérivée des chronos de course réels
 * (estimateFromRaceChronos) quand ce champ est vide. Sans ce même repli,
 * le split physiologique retombait systématiquement sur l'ancien modèle
 * ad-hoc — pas seulement pour Vince, pour la quasi-totalité des athlètes
 * (d'où le "même problème pour les autres athlètes" signalé par le coach).
 */
describe("resolveThresholdPaceForPrediction", () => {
  it("utilise le champ brut du snapshot quand il est renseigné", () => {
    const pace = resolveThresholdPaceForPrediction({ pace_threshold_sec_per_km: 270 } as any);
    expect(pace).toBe(270);
  });

  it("dérive l'allure seuil depuis un chrono de course réel quand le champ brut est vide", () => {
    const pace = resolveThresholdPaceForPrediction({
      pace_threshold_sec_per_km: null,
      time_10k_sec: 2400, // 10km en 40min → seuil dérivé plausible
    } as any);
    expect(pace).not.toBeNull();
    expect(pace).toBeGreaterThan(0);
  });

  it("le champ brut prime sur le chrono dérivé quand les deux sont présents", () => {
    const pace = resolveThresholdPaceForPrediction({
      pace_threshold_sec_per_km: 250,
      time_10k_sec: 2400,
    } as any);
    expect(pace).toBe(250);
  });

  it("retourne null si aucune donnée n'est disponible", () => {
    const pace = resolveThresholdPaceForPrediction({ pace_threshold_sec_per_km: null } as any);
    expect(pace).toBeNull();
  });

  it("retourne null pour un snapshot null", () => {
    expect(resolveThresholdPaceForPrediction(null)).toBeNull();
  });
});
