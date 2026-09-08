import { describe, it, expect } from "vitest";
import { computeEssentielsData } from "../computeEssentielsData";
import { getVLamaxRange } from "@/lib/physiologicalTargets";
import { scoreRelativeToTargetInverse } from "@/lib/coachingCompass";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 3, priorité 2).
 * La page /essentiels recalculait son propre score VLamax avec 2 seuils
 * universels fixes (0.6 pour les formats courts, 0.4 pour les longs) et
 * inversait le SENS de notation selon un booléen isLongDist grossier — sans
 * jamais consulter la table par distance (vlamaxTargets.ts, cohortes
 * Mader-Heck/INSCYD) déjà utilisée par le radar Coaching Compass canonique.
 *
 * Rappel du principe scientifique (confirmé par le coach) : l'optimum
 * VLamax se déplace avec la distance (5K=0.50, Semi=0.40, Marathon=0.34,
 * IM=0.32) — ce n'est PAS un simple "plus haut = mieux" sur les formats
 * courts : le score doit culminer à l'idéal propre à la distance et se
 * dégrader au-delà, pas changer de direction. C'est exactement ce que fait
 * scoreRelativeToTargetInverse (même formule que le radar Coaching Compass).
 */

function athlete(objectif: string) {
  return { id: "a1", nom: "Test", objectif, active_snapshot_id: "s1", dateNaissance: "1990-01-01" };
}

// Fixture donnant une VLamax résolue déterministe (0.46) quel que soit
// l'objectif — vérifié empiriquement : avec ftp/poids/vo2max fixes, le
// moteur VLamax Effectif V2 résout toujours à la même valeur pour ce
// snapshot, ce qui permet de comparer le SCORE (qui dépend de la cible,
// donc de l'objectif) à VLamax constante.
function snapshot() {
  return {
    id: "s1", athlete_id: "a1", date: "2026-01-01",
    vlamax: null, vlamax_run: null, sport_main: "run",
    ftp: 250, weight_kg: 70, vo2max: 55,
    tss_7d: 400, tte_mode: "LOAD", tte_observed_min: null,
    fatigue_state: "ok",
  };
}

describe("computeEssentielsData — cible VLamax par distance (pas de seuil universel)", () => {
  it("le target du pilier 1 correspond à getVLamaxRange (source unique), pas à un seuil fixe 0.6/0.4", () => {
    const im = computeEssentielsData({ athlete: athlete("IM"), snapshots: [snapshot()], tests: [] });
    const range5k = getVLamaxRange("5K", undefined, "run");
    const rangeIM = getVLamaxRange("IM", undefined, "run");
    const rangeMarathon = getVLamaxRange("Marathon", undefined, "run");

    // Les cibles proviennent bien de la table par distance (5K ≠ IM ≠ Marathon)
    expect(rangeIM.optimal).toBeLessThan(rangeMarathon.optimal);
    expect(rangeMarathon.optimal).toBeLessThan(range5k.optimal);

    const vlaMetric = im!.pillars[0].metrics[1];
    expect(vlaMetric.target).toEqual([rangeIM.min, rangeIM.max]);

    // Ancien comportement : target fixe [0.25, 0.4] pour TOUT objectif "long"
    // (isLongDist) — IM et Marathon ont pourtant des cibles différentes.
    // Pour IM, la plage canonique coïncide numériquement avec [0.25, 0.4]
    // (coïncidence), mais pas pour Marathon : la preuve de la régression
    // porte donc sur Marathon, où l'ancien seuil universel divergeait
    // réellement de la cible propre à l'objectif.
    const marathon = computeEssentielsData({ athlete: athlete("Marathon"), snapshots: [snapshot()], tests: [] });
    const marathonTarget = marathon!.pillars[0].metrics[1].target;
    expect(marathonTarget).toEqual([rangeMarathon.min, rangeMarathon.max]);
    expect(marathonTarget).not.toEqual([0.25, 0.4]);
  });

  it("la direction est toujours 'band' (écart à l'idéal) — plus jamais 'higher' pour les formats courts", () => {
    const fiveK = computeEssentielsData({ athlete: athlete("5K"), snapshots: [snapshot()], tests: [] });
    expect(fiveK!.pillars[0].metrics[1].direction).toBe("band");
  });

  it("compassScores.vla utilise la formule canonique du radar Coaching Compass (scoreRelativeToTargetInverse), pas scoreH/scoreInv locaux", () => {
    const im = computeEssentielsData({ athlete: athlete("IM"), snapshots: [snapshot()], tests: [] });
    const rangeIM = getVLamaxRange("IM", undefined, "run");
    const resolvedVla = im!.pillars[0].metrics[1].value!;
    const expectedScore = scoreRelativeToTargetInverse(resolvedVla, rangeIM.optimal);
    expect(im!.compassScores!.vla).toBe(expectedScore);
  });

  it("pour la même VLamax effective, le score diverge selon l'objectif — plus sévère pour un format long dont l'idéal est plus bas", () => {
    const marathon = computeEssentielsData({ athlete: athlete("Marathon"), snapshots: [snapshot()], tests: [] });
    const im = computeEssentielsData({ athlete: athlete("IM"), snapshots: [snapshot()], tests: [] });
    const fiveK = computeEssentielsData({ athlete: athlete("5K"), snapshots: [snapshot()], tests: [] });

    // Même VLamax résolue pour les 3 (fixture identique) — seule la cible change.
    const vla5k = fiveK!.pillars[0].metrics[1].value;
    const vlaMarathon = marathon!.pillars[0].metrics[1].value;
    const vlaIM = im!.pillars[0].metrics[1].value;
    expect(vla5k).toBe(vlaMarathon);
    expect(vlaMarathon).toBe(vlaIM);

    // IM (idéal le plus bas) doit pénaliser davantage que Marathon, qui pénalise
    // davantage que 5K (idéal le plus haut, la valeur peut même être dans la cible).
    expect(im!.compassScores!.vla).toBeLessThanOrEqual(marathon!.compassScores!.vla);
    expect(marathon!.compassScores!.vla).toBeLessThanOrEqual(fiveK!.compassScores!.vla);
  });

  it("régression : diverge de l'ancien calcul (seuils universels 0.6/0.4, direction inversée par isLongDist)", () => {
    const fiveK = computeEssentielsData({ athlete: athlete("5K"), snapshots: [snapshot()], tests: [] });
    const vla = fiveK!.pillars[0].metrics[1].value!;

    // Ancien calcul pour un format court : scoreH(vla, 0.6) = min(100, round(vla/0.6*100))
    const oldScoreH = (v: number, t: number) => Math.min(100, Math.round((v / t) * 100));
    const legacyScore = oldScoreH(vla, 0.6);

    expect(fiveK!.compassScores!.vla).not.toBe(legacyScore);
  });
});
