import { describe, it, expect } from "vitest";
import { resolveVolumeRampLoadAdjustment } from "@/lib/volumeRampLoadAdjustment";
import type { ChargeRecenteReference } from "@/lib/chargeRecenteReference";

/**
 * Audit sprint qualité Marathon/Ironman (oct. 2026), correction #1 : la rampe
 * de volume Sem 1 ne lisait que `trainingLevel` déclaré, jamais la Charge
 * Récente de Référence (CRR) — un athlète déclaré "trained" mais réellement
 * en charge basse (reprise après coupure) ou en surcharge recevait la même
 * rampe agressive qu'un athlète dont la déclaration est cohérente avec sa
 * charge réelle. Ces tests figent le comportement attendu, et surtout
 * l'absence de changement quand la CRR n'est qu'une estimation dérivée du
 * niveau déclaré lui-même (pas de donnée réelle = pas de circularité).
 */

function mkCrr(overrides: Partial<ChargeRecenteReference>): ChargeRecenteReference {
  return {
    value: 300,
    source: "SNAPSHOT",
    confidence: 0.85,
    lastUpdated: "2026-10-15",
    label: "300 TSS/7j (Snapshot)",
    isValid: true,
    warningMessage: null,
    ...overrides,
  };
}

describe("resolveVolumeRampLoadAdjustment", () => {
  it("charge réelle 'low' + niveau déclaré 'trained' → rampe abaissée à 'light', raison explicite", () => {
    const result = resolveVolumeRampLoadAdjustment("trained", mkCrr({ value: 150 }), "low");
    expect(result.triggered).toBe(true);
    expect(result.effectiveLevel).toBe("light");
    expect(result.reason).toMatch(/charge récente réelle mesurée basse/i);
  });

  it("charge réelle 'overload' + niveau déclaré 'highly_trained' → plafonné à 'light', progression réduite à 7%", () => {
    const result = resolveVolumeRampLoadAdjustment("highly_trained", mkCrr({ value: 900, label: "900 TSS/7j (Nolio)", source: "NOLIO" }), "overload");
    expect(result.triggered).toBe(true);
    expect(result.effectiveLevel).toBe("light");
    expect(result.weeklyIncreasePctMaxOverride).toBe(0.07);
  });

  it("charge réelle 'overload' mais niveau déclaré déjà 'untrained' → jamais relevé, pas de changement", () => {
    const result = resolveVolumeRampLoadAdjustment("untrained", mkCrr({ value: 900 }), "overload");
    expect(result.triggered).toBe(false);
    expect(result.effectiveLevel).toBe("untrained");
  });

  it("charge réelle 'low' mais niveau déclaré déjà 'untrained' → pas de palier en dessous, pas de changement", () => {
    const result = resolveVolumeRampLoadAdjustment("untrained", mkCrr({ value: 50 }), "low");
    expect(result.triggered).toBe(false);
    expect(result.effectiveLevel).toBe("untrained");
  });

  it("charge réelle 'optimal' cohérente avec le niveau déclaré → pas de changement", () => {
    const result = resolveVolumeRampLoadAdjustment("trained", mkCrr({ value: 400 }), "optimal");
    expect(result.triggered).toBe(false);
  });

  it("source MANUAL (estimation dérivée du niveau déclaré, pas une mesure réelle) → jamais de déclassement même si statut 'low'", () => {
    // Cas réel et fréquent : untrained/light sans historique produisent une
    // estimation manuelle qui tombe synthétiquement en statut "low" — ce
    // n'est PAS une preuve indépendante, juste l'écho du niveau déclaré.
    const result = resolveVolumeRampLoadAdjustment(
      "light",
      mkCrr({ source: "MANUAL", value: 140, label: "140 TSS/7j (Manuel)" }),
      "low",
    );
    expect(result.triggered).toBe(false);
    expect(result.effectiveLevel).toBe("light");
  });

  it("source UNKNOWN (aucune donnée) → jamais de déclassement", () => {
    const result = resolveVolumeRampLoadAdjustment(
      "trained",
      mkCrr({ source: "UNKNOWN", value: null, isValid: false, label: "— (non renseigné)" }),
      "unknown",
    );
    expect(result.triggered).toBe(false);
    expect(result.effectiveLevel).toBe("trained");
  });

  it("charge réelle 'high' (élevée mais pas en surcharge) → pas de déclassement (cohérent avec un bon niveau déclaré)", () => {
    const result = resolveVolumeRampLoadAdjustment("highly_trained", mkCrr({ value: 700 }), "high");
    expect(result.triggered).toBe(false);
  });
});
