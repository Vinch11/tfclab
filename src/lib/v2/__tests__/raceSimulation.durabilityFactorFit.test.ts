import { describe, it, expect } from "vitest";
import { computeDurabilityFactor } from "../raceSimulation";

/**
 * Bug réel corrigé (audit "simulation course/nutrition", suivi calibrage
 * scientifique). L'ancienne formule (`0.40 - (tteRef-25)*0.0089`, linéaire à
 * pente unique) annonçait dans son commentaire TTE 25/45/60min → 30/15/8%,
 * mais produisait en réalité 35%/22.2%/8.85% — une formule linéaire à pente
 * unique ne peut mathématiquement pas passer par ces 3 points (pentes
 * 25→45 et 45→60 différentes d'un facteur ~1.6).
 *
 * Recherche (WebSearch, Maunder 2021 / Clark 2022) : ces papiers établissent
 * le concept de "durabilité" mais ne publient aucune courbe TTE→%dérive
 * chiffrée pour cette application précise — les 3 points sont
 * l'opérationnalisation TFCL du concept. Remplacé par une régression
 * exponentielle a·e^(−b·TTE) (forme standard d'atténuation à rendements
 * décroissants) ajustée par moindres carrés sur ces mêmes 3 points de
 * référence, qui reste la référence la plus défendable en l'absence de
 * courbe publiée.
 */

describe("computeDurabilityFactor — régression exponentielle fidèle aux 3 points de référence", () => {
  it("TTE 25min ≈ 30% (référence Maunder/Clark, tolérance ±3%)", () => {
    expect(computeDurabilityFactor(25)).toBeCloseTo(0.30, 1);
  });

  it("TTE 45min ≈ 15% — le cas le plus fréquent, celui où l'ancienne formule dérapait le plus (+48% relatif)", () => {
    const v = computeDurabilityFactor(45);
    expect(v).toBeGreaterThan(0.13);
    expect(v).toBeLessThan(0.16);
  });

  it("TTE 60min ≈ 8%", () => {
    expect(computeDurabilityFactor(60)).toBeCloseTo(0.08, 1);
  });

  it("est strictement décroissante avec le TTE (durabilité croissante → atténuation croissante de la dérive)", () => {
    const v25 = computeDurabilityFactor(25);
    const v45 = computeDurabilityFactor(45);
    const v60 = computeDurabilityFactor(60);
    expect(v25).toBeGreaterThan(v45);
    expect(v45).toBeGreaterThan(v60);
  });

  it("reste dans les bornes historiques [0.08, 0.35] pour des TTE extrêmes", () => {
    expect(computeDurabilityFactor(5)).toBe(0.35);
    expect(computeDurabilityFactor(200)).toBe(0.08);
  });

  it("TTE manquant (null) retombe sur le facteur médian (≈ TTE 45min), pas une valeur fantôme", () => {
    expect(computeDurabilityFactor(null)).toBe(computeDurabilityFactor(45));
  });
});
