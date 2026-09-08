import { describe, it, expect } from "vitest";
import { computeCoachingCompass, type CoachingCompassInput } from "..";

/**
 * Feature ajoutée après clôture du Cluster 2 (audit "estimations
 * physiologiques") : le radar TFCL Coaching Compass™ n'affichait que 4 axes
 * (VO2max, VLamax, Aérobie, Durabilité) alors que le profil physiologique
 * calcule déjà FatMax (profile.fatmax) et W' (profile.wPrime) — deux piliers
 * jusque-là invisibles sur le radar bien que déjà disponibles en entrée
 * (CoachingCompassInput.fatmax / .wprimeKj). Ce fichier verrouille les 2
 * nouveaux axes ajoutés à buildRadarAxes().
 */

function baseInput(overrides: Partial<CoachingCompassInput> = {}): CoachingCompassInput {
  return {
    ftp: null,
    poids: null,
    vo2max: null,
    tss7d: null,
    snapshotDate: null,
    snapshotUpdatedAt: null,
    pmax5s: null,
    p30sW: null,
    p60sW: null,
    map5minW: null,
    runEconomyScore: null,
    hrDriftPct: null,
    vma: null,
    paceThresholdSecPerKm: null,
    fatmax: null,
    vlamaxEffectif: { value: 0.35, confidence: 0.8, source: "test" },
    tteEffectif: { tte_min: 50, confidence: 0.8, source: "test" },
    tteEffectifRun: null,
    fatigueEffectif: null,
    limiterResult: null,
    potentielPhysiologique: null,
    strategyResult: null,
    lactateThresholds: null,
    wprimeKj: null,
    objectif: "IM",
    ambition: "age_group",
    sportFocus: "triathlon",
    athleteAge: null,
    ...overrides,
  };
}

describe("Radar — axe FatMax", () => {
  it("le radar contient un axe 'fatmax' avec la valeur transmise en entrée", () => {
    const result = computeCoachingCompass(baseInput({ fatmax: 62 }));
    const fatmaxAxis = result.radarAxes.find((a) => a.key === "fatmax");
    expect(fatmaxAxis).toBeDefined();
    expect(fatmaxAxis!.value).toBe(62);
    expect(fatmaxAxis!.unit).toBe("% FTP");
  });

  it("score 100 quand FatMax atteint ou dépasse la cible optimale de l'objectif (IM: 65)", () => {
    const result = computeCoachingCompass(baseInput({ objectif: "IM", fatmax: 65 }));
    const fatmaxAxis = result.radarAxes.find((a) => a.key === "fatmax");
    expect(fatmaxAxis!.target).toBe(65);
    expect(fatmaxAxis!.score).toBe(100);
  });

  it("score proportionnel en dessous de la cible", () => {
    // IM optimal=65 : FatMax=32.5 (50% de la cible) → score ≈ 50
    const result = computeCoachingCompass(baseInput({ objectif: "IM", fatmax: 32.5 }));
    const fatmaxAxis = result.radarAxes.find((a) => a.key === "fatmax");
    expect(fatmaxAxis!.score).toBe(50);
  });

  it("score 0 quand FatMax n'est pas disponible (ni saisi, ni estimable)", () => {
    // Sans ftp/poids/vlamax/vo2max exploitables, estimateFatMaxFromProfile
    // ne peut rien estimer non plus (computeFatMaxAnchorPctFTP a besoin d'au
    // moins une VLamax pour estimer une ancre).
    const result = computeCoachingCompass(baseInput({
      fatmax: null, ftp: null, poids: null,
      vlamaxEffectif: { value: null, confidence: 0, source: "unknown" },
    }));
    const fatmaxAxis = result.radarAxes.find((a) => a.key === "fatmax");
    expect(fatmaxAxis!.value).toBeNull();
    expect(fatmaxAxis!.score).toBe(0);
  });

  it("la cible FatMax varie selon l'objectif (IM=65 vs Sprint=42)", () => {
    const im = computeCoachingCompass(baseInput({ objectif: "IM", fatmax: 50 }));
    const sprint = computeCoachingCompass(baseInput({ objectif: "Sprint", fatmax: 50 }));
    const imAxis = im.radarAxes.find((a) => a.key === "fatmax");
    const sprintAxis = sprint.radarAxes.find((a) => a.key === "fatmax");
    expect(imAxis!.target).toBe(65);
    expect(sprintAxis!.target).toBe(42);
    // même valeur FatMax=50 : sous la cible IM (65) mais au-dessus de la cible Sprint (42)
    expect(imAxis!.score).toBeLessThan(100);
    expect(sprintAxis!.score).toBe(100);
  });
});

describe("Radar — axe W' (capacité anaérobie)", () => {
  it("le radar contient un axe 'wprime' avec la valeur transmise en entrée", () => {
    const result = computeCoachingCompass(baseInput({ wprimeKj: 18 }));
    const wprimeAxis = result.radarAxes.find((a) => a.key === "wprime");
    expect(wprimeAxis).toBeDefined();
    expect(wprimeAxis!.value).toBe(18);
    expect(wprimeAxis!.unit).toBe("kJ");
  });

  it("score 100 quand W' atteint la cible optimale (IM/age_group: 17 kJ)", () => {
    const result = computeCoachingCompass(baseInput({ objectif: "IM", ambition: "age_group", wprimeKj: 17 }));
    const wprimeAxis = result.radarAxes.find((a) => a.key === "wprime");
    expect(wprimeAxis!.target).toBe(17);
    expect(wprimeAxis!.score).toBe(100);
  });

  it("la cible W' dépend de l'objectif ET de l'ambition (Sprint exige un W' plus élevé que IM)", () => {
    const im = computeCoachingCompass(baseInput({ objectif: "IM", ambition: "age_group", wprimeKj: 17 }));
    const sprint = computeCoachingCompass(baseInput({ objectif: "Sprint", ambition: "age_group", wprimeKj: 17 }));
    const imAxis = im.radarAxes.find((a) => a.key === "wprime");
    const sprintAxis = sprint.radarAxes.find((a) => a.key === "wprime");
    expect(imAxis!.target).toBe(17); // IM/age_group optimal
    expect(sprintAxis!.target).toBe(22); // Sprint/age_group optimal — bien plus exigeant
    expect(sprintAxis!.score).toBeLessThan(imAxis!.score);
  });

  it("score 0 quand W' n'est pas disponible", () => {
    const result = computeCoachingCompass(baseInput({ wprimeKj: null }));
    const wprimeAxis = result.radarAxes.find((a) => a.key === "wprime");
    expect(wprimeAxis!.value).toBeNull();
    expect(wprimeAxis!.score).toBe(0);
  });
});

describe("Radar — 6 axes désormais (4 existants + FatMax + W')", () => {
  it("le radar a 6 axes, tous avec un score défini", () => {
    const result = computeCoachingCompass(baseInput({ ftp: 280, poids: 70, vo2max: 55, fatmax: 60, wprimeKj: 18 }));
    expect(result.radarAxes).toHaveLength(6);
    const keys = result.radarAxes.map((a) => a.key);
    expect(keys).toEqual(expect.arrayContaining(["vo2max", "vlamax", "durability", "fatmax", "wprime"]));
    for (const axis of result.radarAxes) {
      expect(typeof axis.score).toBe("number");
    }
  });
});
