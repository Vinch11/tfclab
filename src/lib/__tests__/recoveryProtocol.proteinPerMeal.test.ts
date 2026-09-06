import { describe, it, expect } from "vitest";
import { computeRecoveryProtocol } from "../recoveryProtocol";

/**
 * Bug réel corrigé (audit "simulation course/nutrition", passe 5). La
 * fenêtre de refuel/repair (repas répétés sur 4-6h) est précisément le cas
 * d'usage cité en en-tête du module ("Moore et al. 2014 — 0.4 g/kg
 * leucine-rich protein per meal × 4"), mais la formule utilisait 0.3 g/kg
 * — 25 % sous la valeur que le module cite lui-même comme base
 * scientifique.
 */

describe("computeRecoveryProtocol — protein_per_meal_g aligné sur la référence Moore 2014 citée (0.4 g/kg)", () => {
  it("70 kg : protein_per_meal_g = 28g (0.4 g/kg), pas 21g (0.3 g/kg)", () => {
    const result = computeRecoveryProtocol({ weightKg: 70, durationMin: 120, intensity: "high" });
    expect(result.refuelWindow.protein_per_meal_g).toBe(28);
  });

  it("60 kg : protein_per_meal_g = 24g (0.4 g/kg)", () => {
    const result = computeRecoveryProtocol({ weightKg: 60, durationMin: 120, intensity: "moderate" });
    expect(result.refuelWindow.protein_per_meal_g).toBe(24);
  });

  it("le message de recommandation reflète bien la même dose que protein_per_meal_g (pas de valeur fantôme)", () => {
    const result = computeRecoveryProtocol({ weightKg: 70, durationMin: 120, intensity: "high" });
    const proteinRec = result.recommendations.find((r) => r.includes("Protéine"));
    expect(proteinRec).toContain("28g");
  });

  it("non-régression : l'acute window reste à 0.3 g/kg (borne basse de sa propre fourchette 0.3-0.4 g/kg citée)", () => {
    const result = computeRecoveryProtocol({ weightKg: 70, durationMin: 120, intensity: "high" });
    expect(result.acuteWindow.protein_g).toBe(21); // 0.3 * 70
  });

  it("non-régression : poids manquant retombe sur 70kg par défaut, protein_per_meal_g toujours cohérent", () => {
    const result = computeRecoveryProtocol({ weightKg: null, durationMin: 120, intensity: "high" });
    expect(result.refuelWindow.protein_per_meal_g).toBe(28);
    expect(result.warnings.some((w) => w.toLowerCase().includes("poids"))).toBe(true);
  });
});
