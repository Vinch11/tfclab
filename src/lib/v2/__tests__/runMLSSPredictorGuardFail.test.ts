/**
 * GUARD-FAIL anti-régression — Run MLSS Predictor (Modèle C)
 *
 * Verrouille la performance du modèle à RMSE ≤ 3.0% sur le jeu de référence
 * (calibré à 2.64% sur N=17 — voir mem://logic/run-mlss-predictor-modele-c).
 *
 * Si quelqu'un modifie la formule, ce test échoue automatiquement avant qu'une
 * dégradation n'atteigne la production.
 *
 * NE PAS modifier les valeurs de référence sans recalibration explicite + mise
 * à jour du mémo et de la docstring de runMLSSPredictor.ts.
 */

import { describe, it, expect } from "vitest";
import { predictRunMLSSPctFromVLaCE } from "../runMLSSPredictor";

// Jeu de référence figé (N=17 : 14 labo + 3 edge cases).
// Format : [VLamax mmol/L/s, CE ml/kg/km, MLSS_pct observé]
const REFERENCE_DATASET: Array<[number, number, number]> = [
  // Marathoniens élite (faible VLa, bonne CE)
  [0.28, 188, 90.5],
  [0.30, 192, 89.8],
  [0.32, 195, 88.6],
  [0.29, 185, 91.2],
  // Coureurs de demi-fond (équilibrés)
  [0.42, 200, 84.9],
  [0.45, 205, 83.1],
  [0.40, 198, 85.7],
  [0.48, 210, 81.5],
  // Coureurs amateurs (CE moyenne)
  [0.50, 215, 79.8],
  [0.52, 218, 78.6],
  [0.46, 212, 81.7],
  // Profils glycolytiques / sprinters
  [0.65, 225, 74.5],
  [0.68, 228, 73.1],
  [0.62, 220, 75.8],
  // Edge cases (poids 0.3 dans la calibration originale)
  [0.35, 230, 84.0], // CE élevée + VLa basse
  [0.55, 195, 79.5], // VLa moyenne + CE excellente
  [0.72, 215, 72.8], // Très glycolytique
];

const BASELINE_RMSE = 2.64;
const GUARD_THRESHOLD = 3.0; // alerte si on dépasse

describe("GUARD-FAIL Run MLSS Predictor — anti-régression", () => {
  it(`RMSE doit rester ≤ ${GUARD_THRESHOLD}% sur le jeu de référence (baseline ${BASELINE_RMSE}%)`, () => {
    const deltas: number[] = [];
    for (const [vla, ce, observed] of REFERENCE_DATASET) {
      const pred = predictRunMLSSPctFromVLaCE(vla, ce);
      expect(pred).not.toBeNull();
      deltas.push(pred!.mlssPct - observed);
    }
    const mse = deltas.reduce((a, d) => a + d * d, 0) / deltas.length;
    const rmse = Math.sqrt(mse);

    // Log lisible en cas d'échec
    if (rmse > GUARD_THRESHOLD) {
      console.error(
        `❌ RÉGRESSION DÉTECTÉE — RMSE=${rmse.toFixed(2)}% > seuil ${GUARD_THRESHOLD}%. ` +
          `Baseline historique: ${BASELINE_RMSE}%. La formule MLSS_pct a-t-elle été modifiée ?`,
      );
    }

    expect(rmse).toBeLessThanOrEqual(GUARD_THRESHOLD);
  });

  it("biais moyen doit rester centré (|bias| ≤ 1.5%)", () => {
    const deltas: number[] = [];
    for (const [vla, ce, observed] of REFERENCE_DATASET) {
      const pred = predictRunMLSSPctFromVLaCE(vla, ce)!;
      deltas.push(pred.mlssPct - observed);
    }
    const bias = deltas.reduce((a, d) => a + d, 0) / deltas.length;
    expect(Math.abs(bias)).toBeLessThanOrEqual(1.5);
  });
});
