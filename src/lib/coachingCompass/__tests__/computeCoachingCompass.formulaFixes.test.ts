import { describe, it, expect } from "vitest";
import { computeCoachingCompass, getDurabilityTargetMinutes, type CoachingCompassInput } from "..";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 2) : ce
 * module (computeCoachingCompass.ts) n'avait AUCUN test malgré son usage
 * comme moteur principal du radar "TFCL Coaching Compass™" affiché au
 * coach. Ce fichier comble le trou de couverture et verrouille :
 *
 * 1. Le FatMax de la Compass ignorait ftp/poids réels (retombait sur le
 *    poids par défaut 70kg et un ratio de repli), divergeant jusqu'à ~12
 *    points de %FTP du FatMax calculé correctement ailleurs (ExportTools,
 *    fatmaxTFCL.ts) pour le même athlète dans le même export.
 * 2. deriveEconomyFromBike soustrayait 1.0 au lieu de 0.5 (contredisant sa
 *    propre documentation inline), sous-estimant le score Économie de 10
 *    points à chaque palier FTP/kg.
 * 3. getDurabilityTargetMinutes est la source unique désormais partagée
 *    entre le radar (deriveDurabilityFromTTE) et CoachingCompassCard.tsx —
 *    avant, la carte utilisait une table séparée indexée par ambition
 *    (ignorant l'objectif), donnant un verdict opposé au radar pour la
 *    même mesure TTE.
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

describe("computeCoachingCompass — FatMax utilise le FTP et le poids réels", () => {
  it("le FatMax diffère selon que ftp/poids réels sont fournis ou non (preuve qu'ils sont bien transmis)", () => {
    const withoutRealPower = computeCoachingCompass(baseInput({ vo2max: 55 }));
    const withRealPower = computeCoachingCompass(
      baseInput({ vo2max: 55, ftp: 280, poids: 70 })
    );
    expect(withoutRealPower.profile.fatmax.value).not.toBeNull();
    expect(withRealPower.profile.fatmax.value).not.toBeNull();
    expect(withRealPower.profile.fatmax.value).not.toBe(withoutRealPower.profile.fatmax.value);
  });
});

describe("deriveEconomyFromBike (via profile.runningEconomy) — coefficient aligné sur sa propre documentation", () => {
  it("FTP/kg=4.0 (sans MAP) donne 70, pas 60 (bug de -1.0 au lieu de -0.5 corrigé)", () => {
    const result = computeCoachingCompass(baseInput({ ftp: 280, poids: 70 })); // 280/70 = 4.0 W/kg
    expect(result.profile.runningEconomy.value).toBe(70);
  });
});

describe("Axe VO2max — fallback FTP→VO2max consolidé sur la formule VLamax-aware", () => {
  it("le VO2max estimé varie avec VLamax (preuve qu'il n'utilise plus la formule ftpKg×12+5, aveugle au VLamax)", () => {
    const lowVlamax = computeCoachingCompass(
      baseInput({ ftp: 280, poids: 70, vlamaxEffectif: { value: 0.30, confidence: 0.8, source: "test" } })
    );
    const highVlamax = computeCoachingCompass(
      baseInput({ ftp: 280, poids: 70, vlamaxEffectif: { value: 0.70, confidence: 0.8, source: "test" } })
    );
    const vo2AxisLow = lowVlamax.radarAxes.find((a) => a.key === "vo2max")?.value;
    const vo2AxisHigh = highVlamax.radarAxes.find((a) => a.key === "vo2max")?.value;
    expect(vo2AxisLow).not.toBeNull();
    expect(vo2AxisHigh).not.toBeNull();
    expect(vo2AxisLow).not.toBe(vo2AxisHigh);
  });
});

describe("getDurabilityTargetMinutes — source unique radar + StaffMetricsGrid", () => {
  it("dépend de l'objectif, pas de l'ambition", () => {
    expect(getDurabilityTargetMinutes("IM")).toBe(120);
    expect(getDurabilityTargetMinutes("70.3")).toBe(95);
    expect(getDurabilityTargetMinutes("Marathon")).toBe(75);
    expect(getDurabilityTargetMinutes("10km")).toBe(65);
  });

  it("le radar Durabilité et la cible TTE brute utilisent le même diviseur (plus de verdicts opposés)", () => {
    // TTE=50min, IM → durabilité = round(50/120*100) = 42, cible TTE = 120min.
    // Un TTE de 42% de 120 = 50.4min, cohérent avec l'ancienne divergence
    // rapportée par l'audit (radar "42/100" vs ancienne table staff "cible 45min, +5 d'avance").
    const result = computeCoachingCompass(baseInput({ objectif: "IM", tteEffectif: { tte_min: 50, confidence: 0.8, source: "test" } }));
    expect(result.profile.durability.value).toBe(42);
    expect(getDurabilityTargetMinutes("IM")).toBe(120);
  });
});
