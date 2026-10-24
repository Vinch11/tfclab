import { describe, it, expect } from "vitest";
import {
  computeWeekQuotaEntry,
  applySlFloorIndividualization,
  slFloorRampFactor,
  type SlFloorRampAnchors,
} from "../sessionSizingMatrix";

/**
 * Correction ciblée "P0 progression individualisée des charges et cohérence
 * des quotas" (2026-10-24). Bug réel démontré (plan 70.3 33 semaines réel) :
 * le plancher SL (slLongRideMin/slLongRunMin) exigeait la même durée dès S1
 * que n'importe quelle semaine de build, quel que soit le niveau déclaré ou
 * la charge initiale réelle de l'athlète.
 *
 * `applySlFloorIndividualization` étend la rampe DÉJÀ individualisée par
 * `PlanConfig.volumeRamp` (planConfigBuilder.ts — niveau déclaré réconcilié
 * avec la charge réellement mesurée quand disponible) à la durée de sortie
 * longue, pour les semaines "load" uniquement. Ces tests vérifient les
 * VALEURS DE PLANCHER réellement transmises au générateur (pas seulement
 * l'absence d'alerte) pour les 4 profils requis.
 *
 * Matrice volumeRamp réelle (planConfigBuilder.ts), reproduite ici pour les
 * anses de test — jamais une nouvelle valeur inventée :
 *   untrained:      { pct: 0.40, ramp: 6 }
 *   light:           { pct: 0.60, ramp: 4 }
 *   trained:         { pct: 0.80, ramp: 2 }
 *   highly_trained:  { pct: 0.95, ramp: 1 }
 */

const RAMP_TRAINED: SlFloorRampAnchors = { week1PctTarget: 0.80, rampWeeks: 2 };
const RAMP_UNTRAINED: SlFloorRampAnchors = { week1PctTarget: 0.40, rampWeeks: 6 };
const RAMP_HIGHLY_TRAINED: SlFloorRampAnchors = { week1PctTarget: 0.95, rampWeeks: 1 };

describe("Profil A — Triathlète confirmé, 70.3, 33 semaines (1 objectif intermédiaire 10K déclaré)", () => {
  it("[TEST OBLIGATOIRE] plancher SL vélo/CAP réduit en S1 puis atteint 100% dès la fin de rampe (rampWeeks=2), jamais au-delà", () => {
    const entry = computeWeekQuotaEntry("IRONMAN 70.3", "age_group", 10, "load", false);
    expect(entry).not.toBeNull();
    // Plancher nominal non individualisé (référence) : 120min vélo / 90min CAP.
    expect(entry!.floors.slLongRideMin).toBe(120);
    expect(entry!.floors.slLongRunMin).toBe(90);

    const s1 = applySlFloorIndividualization(entry!.floors, 1, "load", RAMP_TRAINED, null);
    // 120*0.80 = 96 → arrondi au multiple de 5 le plus proche = 95.
    expect(s1.floors.slLongRideMin).toBe(95);
    // 90*0.80 = 72 → arrondi = 70.
    expect(s1.floors.slLongRunMin).toBe(70);
    expect(s1.appliedPct.bike).toBeCloseTo(0.80);
    expect(s1.appliedPct.run).toBeCloseTo(0.80);
    expect(s1.reasons.length).toBeGreaterThan(0);

    // Fin de rampe (S2 = rampWeeks) : retour au plancher nominal, jamais réduit ensuite.
    const s2 = applySlFloorIndividualization(entry!.floors, 2, "load", RAMP_TRAINED, null);
    expect(s2.floors.slLongRideMin).toBe(120);
    expect(s2.floors.slLongRunMin).toBe(90);
    expect(s2.reasons).toEqual([]);

    const s20 = applySlFloorIndividualization(entry!.floors, 20, "load", RAMP_TRAINED, null);
    expect(s20.floors.slLongRideMin).toBe(120);
    expect(s20.floors.slLongRunMin).toBe(90);
  });

  it("[TEST OBLIGATOIRE] semaine de décharge (recovery) : individualisation SL sans effet — le ×0.7 existant de floorsFor reste la seule modulation (pas de double-réduction)", () => {
    const entry = computeWeekQuotaEntry("IRONMAN 70.3", "age_group", 10, "recovery", false);
    expect(entry).not.toBeNull();
    const recoveryFloor = entry!.floors.slLongRideMin; // déjà modulé ×0.7 par floorsFor en amont
    const result = applySlFloorIndividualization(entry!.floors, 1, "recovery", RAMP_TRAINED, null);
    expect(result.floors.slLongRideMin).toBe(recoveryFloor);
    expect(result.appliedPct).toEqual({ bike: 1, run: 1 });
    expect(result.reasons).toEqual([]);
  });
});

describe("Profil B — Débutant 10K (charge initiale faible)", () => {
  it("[TEST OBLIGATOIRE] plancher CAP fortement réduit en S1 (pas de prescription excessive), progression accessible jusqu'à 100% en fin de rampe (rampWeeks=6)", () => {
    const entry = computeWeekQuotaEntry("10K", "finisher", 4, "load", false);
    expect(entry).not.toBeNull();
    expect(entry!.floors.slLongRunMin).toBe(60); // plancher nominal 10K

    const s1 = applySlFloorIndividualization(entry!.floors, 1, "load", RAMP_UNTRAINED, null);
    // 60*0.40 = 24 → arrondi = 25min. Nettement sous le plancher nominal.
    expect(s1.floors.slLongRunMin).toBe(25);
    expect(s1.floors.slLongRunMin!).toBeLessThan(30);

    // Semaine 3 : progression intermédiaire strictement croissante vs S1, strictement sous le nominal.
    const s3 = applySlFloorIndividualization(entry!.floors, 3, "load", RAMP_UNTRAINED, null);
    expect(s3.floors.slLongRunMin!).toBeGreaterThan(s1.floors.slLongRunMin!);
    expect(s3.floors.slLongRunMin!).toBeLessThan(60);

    // Fin de rampe (S6) : plancher nominal atteint, jamais dépassé.
    const s6 = applySlFloorIndividualization(entry!.floors, 6, "load", RAMP_UNTRAINED, null);
    expect(s6.floors.slLongRunMin).toBe(60);
  });

  it("[TEST OBLIGATOIRE] la progression hebdomadaire du plancher SL est monotone (jamais de régression semaine sur semaine)", () => {
    const entry = computeWeekQuotaEntry("10K", "finisher", 4, "load", false);
    let prev = 0;
    for (let w = 1; w <= 8; w++) {
      const r = applySlFloorIndividualization(entry!.floors, w, "load", RAMP_UNTRAINED, null);
      const v = r.floors.slLongRunMin!;
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("Profil C — Marathonien expérimenté (volume initial déjà développé)", () => {
  it("[TEST OBLIGATOIRE] rampWeeks=1 (highly_trained) désactive la rampe : plancher nominal dès S1, aucune régression artificielle de charge", () => {
    const entry = computeWeekQuotaEntry("MARATHON", "competitor", 9, "load", false);
    expect(entry).not.toBeNull();
    expect(entry!.floors.slLongRunMin).toBe(110); // plancher nominal marathon

    const s1 = applySlFloorIndividualization(entry!.floors, 1, "load", RAMP_HIGHLY_TRAINED, null);
    expect(s1.floors.slLongRunMin).toBe(110);
    expect(s1.appliedPct.run).toBe(1);
    expect(s1.reasons).toEqual([]);

    // slFloorRampFactor seul : rampWeeks<=1 → toujours 1, quelle que soit la semaine.
    expect(slFloorRampFactor(1, RAMP_HIGHLY_TRAINED)).toBe(1);
    expect(slFloorRampFactor(5, RAMP_HIGHLY_TRAINED)).toBe(1);
  });
});

describe("Profil D — Données initiales insuffisantes (pas de niveau déclaré/résolu)", () => {
  it("[TEST OBLIGATOIRE] volumeRamp absent (ramp=null) → comportement inchangé, plancher nominal dès S1 : aucune estimation fabriquée sans donnée d'entrée", () => {
    const entry = computeWeekQuotaEntry("IRONMAN 70.3", "age_group", 10, "load", false);
    expect(entry).not.toBeNull();
    const nominalBike = entry!.floors.slLongRideMin;
    const nominalRun = entry!.floors.slLongRunMin;

    const s1 = applySlFloorIndividualization(entry!.floors, 1, "load", null, null);
    expect(s1.floors.slLongRideMin).toBe(nominalBike);
    expect(s1.floors.slLongRunMin).toBe(nominalRun);
    expect(s1.appliedPct).toEqual({ bike: 1, run: 1 });
    expect(s1.reasons).toEqual([]);
    // Idempotent quelle que soit la semaine : pas de courbe inventée en l'absence de donnée.
    const s10 = applySlFloorIndividualization(entry!.floors, 10, "load", undefined, undefined);
    expect(s10.floors.slLongRideMin).toBe(nominalBike);
  });
});

describe("Risque blessure (élevé/critique) — malus indépendant vélo/course, jamais conflé", () => {
  it("[TEST OBLIGATOIRE] risque ÉLEVÉ sur la course réduit uniquement le plancher CAP (vélo inchangé) ; le plus restrictif entre rampe et blessure s'applique", () => {
    const entry = computeWeekQuotaEntry("IRONMAN 70.3", "age_group", 10, "load", false);
    expect(entry).not.toBeNull();

    // Niveau "trained" (rampe 80% en S1) + risque blessure course ÉLEVÉ (×0.7, plus restrictif que 80%).
    const result = applySlFloorIndividualization(entry!.floors, 1, "load", RAMP_TRAINED, { bike: null, run: "ELEVE" });
    // Vélo : seule la rampe s'applique (80%) → 95min (identique au profil A sans blessure).
    expect(result.floors.slLongRideMin).toBe(95);
    // Course : min(rampe 80%, blessure 70%) = 70% → 90*0.7=63 → arrondi 65.
    expect(result.floors.slLongRunMin).toBe(65);
    expect(result.appliedPct.run).toBeCloseTo(0.7);
    expect(result.reasons.some(r => r.includes("blessure"))).toBe(true);
  });

  it("[TEST OBLIGATOIRE] risque CRITIQUE actif même sans rampe (niveau confirmé/highly_trained, ramp désactivée) : le malus blessure reste appliqué", () => {
    const entry = computeWeekQuotaEntry("MARATHON", "competitor", 9, "load", false);
    const result = applySlFloorIndividualization(entry!.floors, 5, "load", RAMP_HIGHLY_TRAINED, { run: "CRITIQUE" });
    // 110*0.7 = 77 → arrondi 75.
    expect(result.floors.slLongRunMin).toBe(75);
    expect(result.appliedPct.run).toBeCloseTo(0.7);
  });
});

describe("Cohérence triathlon vélo/course — jamais un seul pourcentage générique appliqué aux deux disciplines", () => {
  it("[TEST OBLIGATOIRE] un risque blessure déclaré uniquement sur une discipline ne module jamais l'autre", () => {
    const entry = computeWeekQuotaEntry("IRONMAN", "age_group", 12, "load", false);
    expect(entry).not.toBeNull();
    const nominalBike = entry!.floors.slLongRideMin!;
    const result = applySlFloorIndividualization(entry!.floors, 10, "load", null, { bike: "CRITIQUE", run: null });
    // Semaine hors rampe (ramp=null) + blessure vélo seule → vélo réduit, course au plancher nominal.
    expect(result.floors.slLongRideMin).toBe(Math.round((nominalBike * 0.7) / 5) * 5);
    expect(result.floors.slLongRunMin).toBe(entry!.floors.slLongRunMin);
    expect(result.appliedPct.bike).toBeCloseTo(0.7);
    expect(result.appliedPct.run).toBe(1);
  });
});
