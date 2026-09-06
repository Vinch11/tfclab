import { describe, it, expect } from "vitest";
import { computeErgogenicAids } from "../ergogenicAidsProtocol";

/**
 * Bug réel corrigé (audit "simulation course/nutrition", passe 5). Les
 * fonctions buildNitrates/buildBetaAlanine/buildBicarbonate décidaient de
 * `recommended` à partir du "profil de course" (sprint/short/middle/long/
 * ultra, calibré pour la stratégie glucidique), sans rapport avec la
 * fenêtre de preuve propre à chaque substance citée dans l'en-tête du
 * module. Les nitrates étaient ainsi recommandés jusqu'au profil "long"
 * (240 min = 4h) — la quasi-totalité des courses longue distance de
 * l'app — alors que la littérature ne documente un bénéfice ergogénique
 * que pour des contre-la-montre <40 min.
 */

function findAid(result: ReturnType<typeof computeErgogenicAids>, name: string) {
  const aid = result.aids.find((a) => a.name === name);
  if (!aid) throw new Error(`Aid not found: ${name}`);
  return aid;
}

describe("computeErgogenicAids — les fenêtres de preuve ne dépendent plus du profil de course (sprint/short/middle/long/ultra)", () => {
  it("nitrates : NON recommandés sur une distance Ironman (durée > 40 min) — bénéfice non démontré au-delà d'un contre-la-montre de 40 min", () => {
    const result = computeErgogenicAids({ weightKg: 70, durationMin: 300 }); // 5h de vélo Ironman
    const nitrates = findAid(result, "Nitrates (jus de betterave)");
    expect(nitrates.recommended).toBe(false);
  });

  it("nitrates : recommandés sur un contre-la-montre de 20 min (dans la fenêtre 4-40 min)", () => {
    const result = computeErgogenicAids({ weightKg: 70, durationMin: 20 });
    const nitrates = findAid(result, "Nitrates (jus de betterave)");
    expect(nitrates.recommended).toBe(true);
  });

  it("nitrates : NON recommandés sur un sprint <4 min", () => {
    const result = computeErgogenicAids({ weightKg: 70, durationMin: 3 });
    const nitrates = findAid(result, "Nitrates (jus de betterave)");
    expect(nitrates.recommended).toBe(false);
  });

  it("beta-alanine : NON recommandée sur un 10K route (~40-50 min) sans efforts répétés — hors fenêtre 0.5-10 min", () => {
    const result = computeErgogenicAids({ weightKg: 70, durationMin: 45, hasRepeatedEfforts: false });
    const betaAlanine = findAid(result, "Beta-alanine");
    expect(betaAlanine.recommended).toBe(false);
  });

  it("beta-alanine : recommandée sur un 10K route avec efforts répétés (côtes, relances)", () => {
    const result = computeErgogenicAids({ weightKg: 70, durationMin: 45, hasRepeatedEfforts: true });
    const betaAlanine = findAid(result, "Beta-alanine");
    expect(betaAlanine.recommended).toBe(true);
  });

  it("beta-alanine : recommandée sur un effort de 5 min (dans la fenêtre 0.5-10 min)", () => {
    const result = computeErgogenicAids({ weightKg: 70, durationMin: 5 });
    const betaAlanine = findAid(result, "Beta-alanine");
    expect(betaAlanine.recommended).toBe(true);
  });

  it("bicarbonate : NON recommandé sur un 10K route (45 min) même testé à l'entraînement — hors fenêtre 1-8 min", () => {
    const result = computeErgogenicAids({ weightKg: 70, durationMin: 45, bicarbTested: true });
    const bicarb = findAid(result, "Bicarbonate de sodium (NaHCO₃)");
    expect(bicarb.recommended).toBe(false);
  });

  it("bicarbonate : recommandé sur un effort de 4 min, testé à l'entraînement (dans la fenêtre 1-8 min)", () => {
    const result = computeErgogenicAids({ weightKg: 70, durationMin: 4, bicarbTested: true });
    const bicarb = findAid(result, "Bicarbonate de sodium (NaHCO₃)");
    expect(bicarb.recommended).toBe(true);
  });

  it("bicarbonate : NON recommandé sur un effort de 4 min si jamais testé (garde de sécurité GI conservée)", () => {
    const result = computeErgogenicAids({ weightKg: 70, durationMin: 4, bicarbTested: false });
    const bicarb = findAid(result, "Bicarbonate de sodium (NaHCO₃)");
    expect(bicarb.recommended).toBe(false);
    expect(bicarb.reason.toLowerCase()).toContain("tester");
  });
});
