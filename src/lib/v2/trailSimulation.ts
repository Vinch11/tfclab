/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TRAIL SIMULATION ENGINE — TFCL™
 *
 * Modèle de simulation de performance trail intégrant :
 *   - Coût énergétique par pente (Minetti et al. 2002, J Appl Physiol 93:1039)
 *   - Vitesse GAP (Grade-Adjusted Pace)
 *   - Segmentation auto selon profil (D+/km)
 *   - Pacing conservatif (start −5%, finish libre)
 *   - Modèle glycogène (déplétion intensité × VLamax, apport CHO/h)
 *   - Fatigue neuromusculaire ultra (Ehrström 2018, Vernillo 2017)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { calculateGlycogenDepletion, recommendedCarbsToAvoidBonk } from "./maderMetabolicModel";

export type TrailTechnicite = "facile" | "moyen" | "difficile" | "extreme";

export type TrailAmbition = "finisher" | "perf" | "podium";

export interface TrailAthleteProfile {
  vma: number | null;            // km/h
  fatmaxCenterPct: number | null; // % FTP/VMA centre FatMax
  tteMin: number | null;          // durabilité estimée (min)
  vlamaxEffectif: number | null;  // mmol/L/s
  weightKg: number | null;
  ftp: number | null;             // W (vélo, peu utilisé ici)
}

export interface TrailRaceInput {
  distanceKm: number;
  dPlusM: number;
  dMinusM: number;
  technicite: TrailTechnicite;
  plannedCarbsGH: number;
  ambition: TrailAmbition;
  tempC: number;
  athlete: TrailAthleteProfile;
}

export type SegmentType = "flat" | "climb" | "descent";

export interface TrailSegment {
  type: SegmentType;
  label: string;
  distanceKm: number;
  gradePct: number;
  minettiFactor: number;
  speedKmh: number;
  durationMin: number;
  intensityPctVMA: number;
  glycogenUsedG: number;
  glycogenRemainingG: number;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface TrailNutritionPlan {
  phase: string;     // ex "0-3h"
  carbsGH: number;   // recommandé
  fluidsMlH: number;
  sodiumMgH: number;
}

export interface TrailSimulationResult {
  estimatedTimeMin: number;
  segments: TrailSegment[];
  averagePaceSecPerKm: number;
  averageGAPSecPerKm: number;
  glycogenDepletionRisk: RiskLevel;
  glycogenFinalG: number;
  glycogenInitialG: number;
  nutritionPlanGH: TrailNutritionPlan[];
  warnings: string[];
  terrainLabel: string;
  ultraFatigueApplied: boolean;
  // Modèle dual-pool (Coyle 1986 / Coggan 1987 / Romijn 1993)
  bonkRiskKm: number | null;
  bonkRiskMin: number | null;
  limitingFactor: "muscle_glycogen" | "liver_glycogen" | "blood_glucose" | "none";
  hypoglycemiaRisk: "none" | "low" | "medium" | "high" | "critical";
  muscleGlycogenFinalG: number;
  liverGlycogenFinalG: number;
  bloodGlucoseFinalMmol: number;
  recommendedCarbsGH: number;
}


// ─────────────────────────────────────────────────────────────────────────────
// Minetti et al. 2002 — coût énergétique de la locomotion sur pente
// C(i) = 155.4·i⁵ − 30.4·i⁴ − 43.3·i³ + 46.3·i² + 19.5·i + 3.6   [J/kg/m]
// Domaine validé: i ∈ [-0.45, +0.45]. C(0) = 3.6 J/kg/m (référence plat).
// Ref: Minetti AE et al., J Appl Physiol 93:1039-1046 (2002).
// ─────────────────────────────────────────────────────────────────────────────
const MINETTI_C0 = 3.6;

function minettiCost(gradeFrac: number): number {
  const i = Math.max(-0.45, Math.min(0.45, gradeFrac));
  return 155.4 * Math.pow(i, 5)
       - 30.4 * Math.pow(i, 4)
       - 43.3 * Math.pow(i, 3)
       + 46.3 * Math.pow(i, 2)
       + 19.5 * i
       + 3.6;
}

function minettiFactor(gradePct: number): number {
  return minettiCost(gradePct / 100) / MINETTI_C0;
}

/**
 * computeGAP — vitesse plat équivalente (km/h) depuis vitesse réelle + pente
 */
export function computeGAP(speedKmh: number, gradePct: number): number {
  const f = minettiFactor(gradePct);
  return speedKmh * f;
}

const TECHNICITE_FACTOR: Record<TrailTechnicite, number> = {
  facile: 1.0,
  moyen: 0.92,
  difficile: 0.82,
  extreme: 0.70,
};

const AMBITION_INTENSITY: Record<TrailAmbition, number> = {
  finisher: 0.625,
  perf: 0.725,
  podium: 0.80,
};

// ─────────────────────────────────────────────────────────────────────────────
// Segmentation
// ─────────────────────────────────────────────────────────────────────────────
interface SegmentDef {
  type: SegmentType;
  label: string;
  distanceKm: number;
  gradePct: number; // signé
}

function segmentRace(input: TrailRaceInput): { segs: SegmentDef[]; terrainLabel: string } {
  const { distanceKm, dPlusM, dMinusM } = input;
  const dPlusPerKm = dPlusM / Math.max(1, distanceKm);

  // Répartition (% distance) : [flat, climb, descent]
  let split: [number, number, number];
  let climbGrade: number;
  let descentGrade: number;
  let terrainLabel: string;

  if (dPlusPerKm < 30) {
    split = [0.70, 0.15, 0.15];
    climbGrade = 4;
    descentGrade = -4;
    terrainLabel = "Roulant";
  } else if (dPlusPerKm < 60) {
    split = [0.30, 0.35, 0.35];
    climbGrade = 8;
    descentGrade = -8;
    terrainLabel = "Vallonné";
  } else {
    split = [0.10, 0.45, 0.45];
    climbGrade = 15;
    descentGrade = -15;
    terrainLabel = "Montagne";
  }

  // Ajuste les pentes pour matcher exactement D+ et D- réels
  const climbDistanceKm = distanceKm * split[1];
  const descentDistanceKm = distanceKm * split[2];
  if (climbDistanceKm > 0) {
    climbGrade = (dPlusM / (climbDistanceKm * 1000)) * 100;
    climbGrade = Math.max(2, Math.min(30, climbGrade));
  }
  if (descentDistanceKm > 0) {
    descentGrade = -(dMinusM / (descentDistanceKm * 1000)) * 100;
    descentGrade = Math.max(-30, Math.min(-2, descentGrade));
  }

  const segs: SegmentDef[] = [
    { type: "flat", label: "Plat", distanceKm: distanceKm * split[0], gradePct: 0 },
    { type: "climb", label: "Montée", distanceKm: climbDistanceKm, gradePct: climbGrade },
    { type: "descent", label: "Descente", distanceKm: descentDistanceKm, gradePct: descentGrade },
  ];

  return { segs, terrainLabel };
}

// ─────────────────────────────────────────────────────────────────────────────
// Glycogène
// ─────────────────────────────────────────────────────────────────────────────
function initialGlycogenG(weightKg: number | null): number {
  if (!weightKg) return 475;
  // ~6-7 g/kg muscle + foie ≈ 450-500g sur 70-80kg
  return Math.round(Math.max(400, Math.min(550, 6.2 * weightKg + 50)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
export function simulateTrail(input: TrailRaceInput): TrailSimulationResult {
  const warnings: string[] = [];
  const { athlete } = input;

  const vma = athlete.vma ?? 14; // fallback raisonnable si manquant
  if (athlete.vma == null) warnings.push("VMA non renseignée — estimation par défaut 14 km/h.");
  if (athlete.weightKg == null) warnings.push("Poids non renseigné — réserves glycogène estimées.");

  const baseIntensity = AMBITION_INTENSITY[input.ambition];
  const techFactor = TECHNICITE_FACTOR[input.technicite];

  const { segs: segDefs, terrainLabel } = segmentRace(input);

  // Pacing : appliqué globalement (start −5% sur 30% premiers km, finish libre +3% derniers 10%)
  // Pour simplifier, on calcule un facteur moyen ~0.99 (équilibre).
  const pacingFactor = 0.99;

  // Estimation préliminaire pour fatigue ultra
  let prelimMin = 0;
  for (const s of segDefs) {
    const f = minettiFactor(s.gradePct);
    const speed = (vma * baseIntensity * pacingFactor / f) * (s.type === "descent" ? techFactor : 1);
    prelimMin += (s.distanceKm / Math.max(0.5, speed)) * 60;
  }

  const ultraThresholdMin = 8 * 60;
  const ultraFatigueApplied = prelimMin >= 6 * 60;
  if (prelimMin >= 12 * 60) warnings.push("Course >12h : prévoir pauses ravitaillement et alimentation solide.");
  if (prelimMin >= ultraThresholdMin) warnings.push("Course >8h : fatigue neuromusculaire cumulative significative (−3% VMA/h après 8h).");

  if (input.tempC >= 28) warnings.push("Chaleur >28°C : majoration besoins hydriques +30%, sodium +50%.");
  if (input.tempC <= 5) warnings.push("Froid <5°C : prévoir couches techniques, glycogène mobilisé +10%.");

  // F38-bis: VLamax manquante → contribution glycolytique nulle (aerobic pur),
  // et on prévient l'utilisateur car c'est la variable la plus impactante sur la déplétion trail.
  if (athlete.vlamaxEffectif == null || athlete.vlamaxEffectif <= 0) {
    warnings.push("VLamax non renseignée — l'estimation de déplétion est calculée sur base aérobie pure et peut sous-estimer les besoins glucidiques.");
  }
  const vlamaxSafe = athlete.vlamaxEffectif != null && athlete.vlamaxEffectif > 0 ? athlete.vlamaxEffectif : 0;

  // Calcul segments avec déplétion glycogène
  const glycogenInitialG = initialGlycogenG(athlete.weightKg);
  let glycogenG = glycogenInitialG;
  // Coût glycogène ~ g/min : base ~1.5 g/min @ FatMax, scale par intensité²
  const segments: TrailSegment[] = [];
  let cumulativeMin = 0;

  for (const s of segDefs) {
    const f = minettiFactor(s.gradePct);
    let intensityPctVMA = baseIntensity * 100;
    // Plat utilise intensité de référence ; montée légèrement réduite (effort iso) ; descente bénéficie techFactor
    let speed = (vma * baseIntensity * pacingFactor) / f;
    if (s.type === "descent") speed *= techFactor;
    if (s.type === "climb") {
      // Cap montée à 90% du pacing demandé pour éviter explosion
      speed = Math.min(speed, (vma * 0.55) / Math.max(1, f / 1.8));
    }

    // Fatigue ultra (après 6h, +15% coût énergétique → −13% vitesse)
    if (ultraFatigueApplied && cumulativeMin > 6 * 60) {
      speed *= 1 / 1.15;
    }
    // Décrément >8h : −3%/h sur VMA effective
    if (cumulativeMin > ultraThresholdMin) {
      const extraH = (cumulativeMin - ultraThresholdMin) / 60;
      speed *= Math.max(0.7, 1 - 0.03 * extraH);
    }

    speed = Math.max(2.0, speed);
    const durationMin = (s.distanceKm / speed) * 60;

    // Déplétion : coût relatif × durée × (1 + vlamax)
    // ~1.4 g/min plat @ 70%VMA, scale par f et vlamax (0 si inconnu)
    const baseGperMin = 1.4 * (intensityPctVMA / 70);
    const usedGTotal = baseGperMin * durationMin * f * (1 + 0.6 * vlamaxSafe);
    // Apport
    const intakeG = input.plannedCarbsGH * (durationMin / 60);
    const netUsed = Math.max(0, usedGTotal - intakeG);
    glycogenG = Math.max(0, glycogenG - netUsed);

    segments.push({
      type: s.type,
      label: s.label,
      distanceKm: round(s.distanceKm, 2),
      gradePct: round(s.gradePct, 1),
      minettiFactor: round(f, 2),
      speedKmh: round(speed, 2),
      durationMin: round(durationMin, 1),
      intensityPctVMA: round(intensityPctVMA, 1),
      glycogenUsedG: round(netUsed, 1),
      glycogenRemainingG: round(glycogenG, 1),
    });

    cumulativeMin += durationMin;
  }

  const estimatedTimeMin = Math.round(cumulativeMin);
  const totalKm = segments.reduce((a, s) => a + s.distanceKm, 0);
  const averagePaceSecPerKm = (cumulativeMin * 60) / Math.max(1, totalKm);

  // GAP moyen pondéré par distance plate équivalente
  const totalFlatEquivKm = segments.reduce((a, s) => a + s.distanceKm * s.minettiFactor, 0);
  const averageSpeedFlatEquivKmh = totalFlatEquivKm / (cumulativeMin / 60);
  const averageGAPSecPerKm = 3600 / Math.max(1, averageSpeedFlatEquivKmh);

  // Risque glycogène
  const pctRemaining = glycogenG / glycogenInitialG;
  let risk: RiskLevel = "LOW";
  if (pctRemaining < 0.05) risk = "CRITICAL";
  else if (pctRemaining < 0.20) risk = "HIGH";
  else if (pctRemaining < 0.40) risk = "MEDIUM";

  if (risk === "CRITICAL") warnings.push("Glycogène critique (<5%) — augmenter CHO/h ou réduire intensité.");
  else if (risk === "HIGH") warnings.push("Glycogène bas (<20%) — risque hypoglycémie en fin de course.");

  // ── Modèle dual-pool (muscle + foie + glycémie) ───────────────────────────
  // Source: maderMetabolicModel.calculateGlycogenDepletion — pilote bonkRiskKm/hypoglycemiaRisk.
  // NB: le calcul segment-par-segment ci-dessus fournit la déplétion progressive UI ;
  // ce dual-pool est la référence pour les warnings fringale/hypoglycémie exposés au coach.
  // F38-bis: alignement des inputs avec la boucle segmentaire (mêmes fallbacks explicites + warnings).
  if (athlete.vma == null) warnings.push("VMA non renseignée — estimation dual-pool basée sur VMA=14 km/h (moyenne populationnelle).");
  if (athlete.weightKg == null) warnings.push("Poids non renseigné — stocks glycogéniques estimés sur 70 kg (moyenne populationnelle).");
  const vmaForMader = athlete.vma ?? 14;
  const vo2maxMader = vmaForMader * 3.5;
  const vlamaxMader = vlamaxSafe; // même source que la boucle segmentaire
  const weightMader = athlete.weightKg ?? 70;
  const avgIntensityPct = Math.max(40, Math.min(95, baseIntensity * 100 * 0.78)); // %VMA → ~ %VO2max
  const avgSpeedKmh = totalKm / Math.max(0.1, cumulativeMin / 60);
  const depletion = calculateGlycogenDepletion(
    { vo2max: vo2maxMader, vlamax: vlamaxMader, weight: weightMader },
    avgIntensityPct,
    cumulativeMin,
    input.plannedCarbsGH,
    avgSpeedKmh,
  );
  const recommendedCarbsGH = recommendedCarbsToAvoidBonk(
    { vo2max: vo2maxMader, vlamax: vlamaxMader, weight: weightMader },
    avgIntensityPct,
  );

  if (Number.isFinite(depletion.bonkRiskKm) && depletion.bonkRiskKm < totalKm) {
    warnings.push(
      `⚠️ Risque fringale estimé au km ${depletion.bonkRiskKm} (facteur limitant : ${depletion.limitingFactor.replace("_", " ")}) — augmenter les glucides à ${recommendedCarbsGH} g/h pour sécuriser.`,
    );
  } else if (depletion.hypoglycemiaRisk === "high" || depletion.hypoglycemiaRisk === "critical") {
    warnings.push(
      `⚠️ Risque hypoglycémique ${depletion.hypoglycemiaRisk} (glycémie estimée ${depletion.bloodGlucoseMmol} mmol/L) — viser ${recommendedCarbsGH} g/h.`,
    );
  }

  // Plan nutrition par phase
  const heatBoost = input.tempC >= 28 ? 1.3 : input.tempC >= 22 ? 1.15 : 1.0;
  const nutritionPlanGH: TrailNutritionPlan[] = [
    { phase: "0-3h", carbsGH: Math.min(90, Math.max(60, Math.round(input.plannedCarbsGH))), fluidsMlH: Math.round(500 * heatBoost), sodiumMgH: Math.round(500 * heatBoost) },
    { phase: "3-6h", carbsGH: Math.min(90, Math.max(70, Math.round(input.plannedCarbsGH))), fluidsMlH: Math.round(600 * heatBoost), sodiumMgH: Math.round(700 * heatBoost) },
    { phase: "6h+", carbsGH: Math.min(120, Math.max(80, Math.round(input.plannedCarbsGH + 10))), fluidsMlH: Math.round(700 * heatBoost), sodiumMgH: Math.round(900 * heatBoost) },
  ];

  return {
    estimatedTimeMin,
    segments,
    averagePaceSecPerKm,
    averageGAPSecPerKm,
    glycogenDepletionRisk: risk,
    glycogenFinalG: round(glycogenG, 1),
    glycogenInitialG,
    nutritionPlanGH,
    warnings,
    terrainLabel,
    ultraFatigueApplied,
    bonkRiskKm: Number.isFinite(depletion.bonkRiskKm) ? depletion.bonkRiskKm : null,
    bonkRiskMin: Number.isFinite(depletion.bonkRiskMin) ? depletion.bonkRiskMin : null,
    limitingFactor: depletion.limitingFactor,
    hypoglycemiaRisk: depletion.hypoglycemiaRisk,
    muscleGlycogenFinalG: depletion.muscleGlycogenG,
    liverGlycogenFinalG: depletion.liverGlycogenG,
    bloodGlucoseFinalMmol: depletion.bloodGlucoseMmol,
    recommendedCarbsGH,
  };

}

function round(n: number, d: number): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

export function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}
