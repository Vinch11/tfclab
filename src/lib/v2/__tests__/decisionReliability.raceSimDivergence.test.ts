import { describe, it, expect } from "vitest";
import { checkProModeEligibility } from "../raceSimulation";
import { computeFullDRE } from "../decisionReliabilityEngine";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 3, priorité
 * 3). Le rapport PDF Race Simulation (section "Hypothèses utilisées",
 * encart "Confiance données") affichait la confiance calculée par
 * checkProModeEligibility() (raceSimulation.ts) — un simple compte de
 * données manquantes ±0.1 par seuil de confiance <0.6 — totalement
 * indépendante du Decision Reliability Engine (DRE) officiel qui alimente
 * la carte affichée sur le Dashboard (Index.tsx).
 *
 * Mesuré (mêmes VLamax/TTE, vlamaxConfidence=0.55, tteConfidence=0.45) :
 * - checkProModeEligibility : confiance 80% ("confiance maximale")
 * - DRE (Dashboard) : score 68% ("prudent" — "confiance modérée")
 *
 * ExportTools.tsx calcule désormais un DRE (computeFullDRE) avec exactement
 * la même recette d'entrées que Index.tsx, et l'utilise pour l'affichage
 * "Confiance données" du PDF au lieu de checkProModeEligibility.confidence.
 * checkProModeEligibility reste utilisé UNIQUEMENT pour son rôle légitime et
 * distinct : déterminer si les 4 données spécifiques à la simulation PRO
 * (VLamax/TTE/FatMax/Disponibilité) sont présentes (`eligible`), pas pour
 * afficher un pourcentage de confiance au coach.
 */

describe("Divergence historique checkProModeEligibility vs DRE (documentée, plus affichée au coach)", () => {
  it("reproduit la divergence mesurée par l'audit pour un même profil athlète", () => {
    const eligibility = checkProModeEligibility({
      raceType: "IM",
      heat: "moderate",
      terrain: "flat",
      ambition: "perf",
      vlamaxEffectif: 0.35,
      vlamaxConfidence: 0.55,
      vlamaxDiscipline: "bike",
      tteMin: 45,
      tteConfidence: 0.45,
      fatmaxCenterPct: 65,
      fatmaxRange: [55, 75],
      disponibiliteScore: 75,
      disponibiliteLevel: "good",
      ftp: 250,
      vma: null,
      weight: 70,
    });

    const dre = computeFullDRE({
      snapshotId: "s1", athleteId: "a1", coachId: "",
      objective: "IM",
      vlamax: 0.35, vlamaxConfidence: 0.55,
      tteMin: 45, tteConfidence: 0.45,
      fatmaxPct: null, vo2max: 55, ftp: 250, weightKg: 70,
      p30s: null, p1min: null, map5min: null, pmax5s: null,
      isReferenceWeek: false, fatigueState: "normal",
    });

    // La divergence historique : checkProModeEligibility affiche une
    // confiance nettement supérieure (80%) à celle du DRE officiel (≤70%,
    // niveau "prudent" pas "robust") pour le même athlète au même instant.
    expect(eligibility.confidence).toBeGreaterThan(0.75);
    expect(dre.decisionConfidenceScore).toBeLessThan(75);
    expect(dre.decisionLevel).not.toBe("robust");
    expect(Math.round(eligibility.confidence * 100)).not.toBe(dre.decisionConfidenceScore);
  });
});

describe("computeFullDRE — recette d'entrées identique à Index.tsx (Dashboard) et ExportTools.tsx (PDF)", () => {
  it("produit un résultat déterministe et bien formé pour un profil complet", () => {
    const dre = computeFullDRE({
      snapshotId: "s1", athleteId: "a1", coachId: "",
      objective: "IM",
      vlamax: 0.35, vlamaxConfidence: 0.9,
      tteMin: 50, tteConfidence: 0.9,
      fatmaxPct: null, vo2max: 55, ftp: 250, weightKg: 70,
      p30s: 400, p1min: 350, map5min: 300, pmax5s: 900,
      isReferenceWeek: true, fatigueState: "fresh",
    });
    expect(dre.decisionConfidenceScore).toBeGreaterThanOrEqual(0);
    expect(dre.decisionConfidenceScore).toBeLessThanOrEqual(100);
    expect(["robust", "prudent", "insufficient"]).toContain(dre.decisionLevel);
    expect(typeof dre.mainMessage).toBe("string");
  });

  it("un profil avec des confidences faibles ET aucune référence obtient un score plus bas qu'un profil de référence bien mesuré", () => {
    const weakProfile = computeFullDRE({
      snapshotId: "s1", athleteId: "a1", coachId: "",
      objective: "IM",
      vlamax: 0.35, vlamaxConfidence: 0.3,
      tteMin: 45, tteConfidence: 0.3,
      fatmaxPct: null, vo2max: null, ftp: null, weightKg: null,
      p30s: null, p1min: null, map5min: null, pmax5s: null,
      isReferenceWeek: false, fatigueState: "normal",
    });
    const strongProfile = computeFullDRE({
      snapshotId: "s1", athleteId: "a1", coachId: "",
      objective: "IM",
      vlamax: 0.35, vlamaxConfidence: 0.95,
      tteMin: 50, tteConfidence: 0.95,
      fatmaxPct: null, vo2max: 55, ftp: 250, weightKg: 70,
      p30s: 400, p1min: 350, map5min: 300, pmax5s: 900,
      isReferenceWeek: true, fatigueState: "fresh",
    });
    expect(weakProfile.decisionConfidenceScore).toBeLessThan(strongProfile.decisionConfidenceScore);
  });
});
