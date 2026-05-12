/**
 * VLamax CAP Estimator
 * Estimation automatique de VLamax course à pied basée sur:
 * - Ratio Pace Seuil / VMA (durabilité)
 * - Sprint 15s terrain (distance)
 * - Puissance course (Stryd/Garmin Running Power)
 * - TTE (cross-validation)
 * - Économie de course (ajustement confiance via FIT import)
 * 
 * ⚠️ CSS = Critical Swim Speed (natation) - NON UTILISÉ ici
 * On utilise pace_threshold_sec_per_km (pace seuil CAP)
 */

export interface VLamaxCapEstimateInput {
  vma: number | null;                    // VMA en km/h
  paceThresholdSecPerKm: number | null;  // Pace seuil CAP (sec/km)
  tteMin?: number | null;                // Time to Exhaustion en minutes
  sprint15sDistance?: number | null;     // Distance parcourue en 15s (mètres)
  runningPowerMax?: number | null;       // Puissance max course (W) - Stryd/Garmin
  runningPowerThreshold?: number | null; // Puissance seuil course (W)
  // Données économie de course (import FIT)
  runEconomyScore?: number | null;       // Score 0-100 d'économie de course
  runHrDriftPct?: number | null;         // Dérive cardiaque (%)
  runPaceRefSecPerKm?: number | null;    // Allure de référence (sec/km)
  // Mesure directe labo (lactate sprint) — source dominante si présente
  vlamaxRunMeasured?: number | null;     // VLamax CAP mesurée (mmol/L/s)
  // P3 — Cohérence inverse Modèle C MLSS
  runningEconomyMlPerKgKm?: number | null; // Coût énergétique CE (ml O2/kg/km)
  vo2max?: number | null;                  // VO2max (ml/kg/min) — pour dériver MLSS_pct observé
}

export interface VLamaxCapEstimate {
  value: number;
  confidence: number;
  confidenceAdjustment: number;          // Ajustement lié à l'économie
  sources: string[];
  method: string;
  details?: string;
  economyImpact?: {                      // Impact de l'économie sur l'estimation
    modifier: number;
    reason: string;
  };
}

import { PHYSIOLOGICAL_BOUNDS } from "./vlamaxV2Engine";

const clamp = (val: number, min: number, max: number): number => 
  Math.max(min, Math.min(max, val));

/** Clamp CAP physiologique: [0.20, 0.90] */
const clampCap = (val: number): number => 
  clamp(val, PHYSIOLOGICAL_BOUNDS.cap.min, PHYSIOLOGICAL_BOUNDS.cap.max);

/**
 * Estime VLamax CAP à partir des données de course à pied
 * Hiérarchie des sources:
 * 1. Sprint 15s + Puissance (si disponibles) → meilleure estimation
 * 2. Ratio Pace Seuil/VMA → estimation principale
 * 3. VMA seule → fallback conservateur
 */
export function estimateVLamaxCap(input: VLamaxCapEstimateInput): VLamaxCapEstimate {
  const { 
    vma, 
    paceThresholdSecPerKm, 
    tteMin, 
    sprint15sDistance, 
    runningPowerMax, 
    runningPowerThreshold,
    runEconomyScore,
    runHrDriftPct,
    vlamaxRunMeasured,
  } = input;
  
  const sources: string[] = [];
  const estimates: { value: number; weight: number; source: string }[] = [];
  let details = "";
  let economyConfidenceAdjustment = 0;
  let economyImpact: { modifier: number; reason: string } | undefined;
  let hasMeasured = false;

  // =============================================
  // SOURCE 0: Mesure labo directe (DOMINANTE — P0)
  // =============================================
  if (vlamaxRunMeasured != null && vlamaxRunMeasured > 0) {
    estimates.push({ value: clampCap(vlamaxRunMeasured), weight: 0.70, source: "Mesure labo" });
    sources.push("Mesure labo");
    details += `VLamax mesurée: ${vlamaxRunMeasured.toFixed(2)}. `;
    hasMeasured = true;
  }

  // =============================================
  // SOURCE 1: Sprint 15s terrain (P1: poids réduit 0.40 → 0.30)
  // =============================================
  // CORRECTIF (cf. mini-rapport) : la calibration P4 (N=15) reflète des protocoles
  // sprint Wingate / cyclistes. Un sprint 15s départ arrêté en course à pied mobilise
  // massivement la PCr (filière alactique) et l'efficacité neuromusculaire — pas la
  // glycolyse. On applique donc :
  //   - facteur d'atténuation course à pied ×0.80 et offset −0.05
  //   - bornes physio resserrées [0.20 ; 1.00]
  //   - poids réduit dès qu'un autre signal existe (pace ratio prend le relais)
  if (sprint15sDistance !== null && sprint15sDistance !== undefined && sprint15sDistance > 0) {
    let rawP4: number;
    if (sprint15sDistance <= 50) rawP4 = 0.20;
    else if (sprint15sDistance >= 140) rawP4 = 0.95;
    else rawP4 = -0.5066 + 0.01420 * sprint15sDistance;

    // Atténuation course à pied (alignée mini-rapport)
    const estimated = clamp(rawP4 * 0.80 - 0.05, 0.20, 1.00);

    // Poids : on baisse quand pace ratio disponible (signal physiologique plus robuste)
    const hasPaceRatio = vma != null && vma > 0 && paceThresholdSecPerKm != null && paceThresholdSecPerKm > 0;
    const sprintWeight = hasMeasured ? 0.10 : (hasPaceRatio ? 0.20 : 0.30);
    estimates.push({ value: estimated, weight: sprintWeight, source: "Sprint 15s" });
    sources.push("Sprint 15s");
    details += `Sprint 15s: ${sprint15sDistance}m → ${estimated.toFixed(3)} (P4 ajustée course). `;
  }

  // =============================================
  // SOURCE 2: Puissance course (Stryd/Garmin)
  // =============================================
  if (runningPowerMax !== null && runningPowerMax !== undefined && runningPowerMax > 0) {
    /**
     * Interpolation continue Puissance max → VLamax
     * 350W → 0.28, 700W → 0.50, 1050W → 0.72
     */
    let estimated: number;
    if (runningPowerMax <= 300) estimated = 0.25;
    else if (runningPowerMax >= 1100) estimated = 0.78;
    else {
      // 300-1100W: interpolation linéaire 0.25 → 0.78
      estimated = 0.25 + (runningPowerMax - 300) * 0.000663;
    }
    
    estimates.push({ value: estimated, weight: 0.35, source: "Puissance Max" });
    sources.push("Puissance CAP");
    details += `Pmax: ${runningPowerMax}W → ${estimated.toFixed(3)}. `;
  }

  // =============================================
  // SOURCE 3: Ratio Puissance (si threshold disponible)
  // =============================================
  if (runningPowerMax && runningPowerThreshold && runningPowerThreshold > 0) {
    const powerRatio = runningPowerThreshold / runningPowerMax;
    /**
     * Interpolation continue ratio puissance → VLamax
     * ratio 0.80 → 0.25, ratio 0.65 → 0.45, ratio 0.50 → 0.65
     */
    let estimated: number;
    if (powerRatio >= 0.85) estimated = 0.22;
    else if (powerRatio <= 0.45) estimated = 0.70;
    else {
      // 0.45-0.85: interpolation linéaire inverse (ratio haut = VLamax basse)
      estimated = 0.70 - (powerRatio - 0.45) * 1.20;
    }
    
    estimates.push({ value: estimated, weight: 0.25, source: "Ratio Puissance" });
    sources.push("Ratio P");
    details += `Ratio P: ${(powerRatio * 100).toFixed(1)}% → ${estimated.toFixed(3)}. `;
  }

  // =============================================
  // SOURCE 4: Ratio Pace Seuil / VMA (CLASSIQUE)
  // =============================================
  if (vma !== null && vma > 0 && paceThresholdSecPerKm !== null && paceThresholdSecPerKm > 0) {
    // Convertir pace seuil (sec/km) en vitesse (km/h)
    const paceKmh = 3600 / paceThresholdSecPerKm;
    const ratio = paceKmh / vma;
    
    /**
     * Interpolation continue ratio seuil/VMA → VLamax
     * ratio 0.95 → 0.22, ratio 0.85 → 0.42, ratio 0.75 → 0.62
     * Pente: -2.0 par unité de ratio
     */
    let estimated: number;
    if (ratio >= 0.95) estimated = 0.22;
    else if (ratio <= 0.70) estimated = 0.72;
    else {
      // 0.70-0.95: interpolation linéaire inverse
      estimated = 0.72 - (ratio - 0.70) * 2.0;
    }
    
    // P1: Rééquilibrage — augmenté 0.20 → 0.30 pour ne pas laisser le sprint dominer seul
    // Si mesure labo présente, on garde un poids modéré (0.15)
    const weight = hasMeasured ? 0.15 : (estimates.length > 0 ? 0.30 : 0.55);
    estimates.push({ value: estimated, weight, source: "Ratio Seuil/VMA" });
    sources.push("Seuil/VMA");
    details += `Ratio: ${(ratio * 100).toFixed(1)}% → ${estimated.toFixed(3)}. `;
  }

  // =============================================
  // SOURCE 5: VMA seule (FALLBACK)
  // =============================================
  if (vma !== null && vma > 0 && estimates.length === 0) {
    /**
     * Interpolation continue VMA seule (fallback)
     * VMA 14 → 0.50, VMA 18 → 0.44, VMA 22 → 0.38
     * Pente douce: -0.015 par km/h
     */
    const estimated = clamp(0.50 - (vma - 14) * 0.015, 0.30, 0.55);
    
    estimates.push({ value: estimated, weight: 0.30, source: "VMA seule" });
    sources.push("VMA");
    details += `VMA: ${vma} km/h → ${estimated.toFixed(3)} (fallback). `;
  }

  // =============================================
  // SOURCE 7: Inversion Modèle C MLSS (P3)
  // VLa_inv = (1 − MLSS_pct_obs − 0.0021·(CE−200)) / 0.337
  // MLSS_pct_obs ≈ pace_seuil_kmh / VMA (proxy %vVO2max)
  // =============================================
  const ceForInverse = input.runningEconomyMlPerKgKm;
  if (
    !hasMeasured &&
    vma != null && vma > 0 &&
    paceThresholdSecPerKm != null && paceThresholdSecPerKm > 0 &&
    ceForInverse != null && ceForInverse > 0
  ) {
    const paceKmhInv = 3600 / paceThresholdSecPerKm;
    const mlssFracObs = clamp(paceKmhInv / vma, 0.55, 0.95);
    const ceClamped = clamp(ceForInverse, 150, 280);
    const vlaInverse = (1 - mlssFracObs - 0.0021 * (ceClamped - 200)) / 0.337;
    if (vlaInverse > 0.10 && vlaInverse < 1.20) {
      const clamped = clampCap(vlaInverse);
      // Contrainte physiologique calibrée (RMSE 2.64%) — poids fort
      estimates.push({ value: clamped, weight: 0.35, source: "Modèle C inverse" });
      sources.push("Modèle C");
      details += `Modèle C inv: MLSS_obs=${(mlssFracObs * 100).toFixed(1)}%, CE=${ceClamped.toFixed(0)} → VLa=${clamped.toFixed(3)}. `;
    }
  }

  // =============================================
  // MODIFICATEUR TTE (Cross-validation)
  // =============================================
  if (tteMin !== null && tteMin > 0 && estimates.length > 0) {
    /**
     * TTE CAP modifie l'estimation:
     * - TTE long → VLamax probablement plus basse
     * - TTE court → VLamax probablement plus haute
     */
    let modifier = 0;
    if (tteMin >= 60) modifier = -0.04;
    else if (tteMin >= 50) modifier = -0.02;
    else if (tteMin >= 40) modifier = 0;
    else if (tteMin >= 30) modifier = +0.02;
    else modifier = +0.04;
    
    if (modifier !== 0) {
      estimates.forEach(e => {
        e.value = clamp(e.value + modifier, 0.20, 0.80);
      });
      sources.push("TTE");
      details += `TTE: ${tteMin}min → ajust. ${modifier > 0 ? '+' : ''}${modifier.toFixed(2)}. `;
    }
  }

  // =============================================
  // SOURCE 6: Économie de Course (AJUSTEMENT CONFIANCE)
  // =============================================
  if (runEconomyScore != null && runEconomyScore > 0) {
    /**
     * Économie de course ajuste la CONFIANCE, pas la valeur:
     * - Score élevé (≥70) → +10-15% confiance (données terrain fiables)
     * - Score moyen (40-70) → +5% confiance
     * - Score faible (<40) → 0% (données non fiables)
     * 
     * La dérive cardiaque module aussi:
     * - Faible dérive (<6%) → bonus additionnel
     * - Forte dérive (>12%) → pénalité
     */
    if (runEconomyScore >= 75) {
      economyConfidenceAdjustment = 0.15;
      economyImpact = { 
        modifier: 0.15, 
        reason: "Excellente économie de course, données FIT très fiables" 
      };
    } else if (runEconomyScore >= 55) {
      economyConfidenceAdjustment = 0.10;
      economyImpact = { 
        modifier: 0.10, 
        reason: "Bonne économie de course, données FIT fiables" 
      };
    } else if (runEconomyScore >= 40) {
      economyConfidenceAdjustment = 0.05;
      economyImpact = { 
        modifier: 0.05, 
        reason: "Économie moyenne, données FIT utilisables" 
      };
    } else {
      economyConfidenceAdjustment = 0;
      economyImpact = { 
        modifier: 0, 
        reason: "Économie fragile, confiance non ajustée" 
      };
    }
    
    // Modulation par la dérive cardiaque
    if (runHrDriftPct != null) {
      if (runHrDriftPct < 5 && economyConfidenceAdjustment > 0) {
        economyConfidenceAdjustment += 0.05;
        economyImpact.modifier += 0.05;
        economyImpact.reason += " + faible dérive FC";
      } else if (runHrDriftPct > 12) {
        economyConfidenceAdjustment = Math.max(0, economyConfidenceAdjustment - 0.05);
        economyImpact.modifier = Math.max(0, economyImpact.modifier - 0.05);
        economyImpact.reason += " (pénalité dérive élevée)";
      }
    }
    
    if (economyConfidenceAdjustment > 0) {
      sources.push("Économie CAP");
      details += `Économie: ${runEconomyScore}/100 → conf. +${(economyConfidenceAdjustment * 100).toFixed(0)}%. `;
    }
  }

  // =============================================
  // CALCUL FINAL
  // =============================================
  if (estimates.length === 0) {
    return {
      value: 0.42, // Valeur par défaut conservatrice
      confidence: 0.15,
      confidenceAdjustment: 0,
      sources: ["Défaut"],
      method: "default",
      details: "Données insuffisantes pour estimation"
    };
  }

  const totalWeight = estimates.reduce((sum, e) => sum + e.weight, 0);
  let weightedValue = estimates.reduce((sum, e) => sum + e.value * e.weight, 0) / totalWeight;

  // =============================================
  // P2: MODIFICATEUR VALEUR via Économie de Course
  // =============================================
  // Une excellente économie = signature endurante → VLamax plus basse
  // Une économie fragile = signature glycolytique/coût élevé → VLamax plus haute
  // N'applique pas ce shift si on a une mesure labo directe (déjà fiable)
  if (!hasMeasured && runEconomyScore != null && runEconomyScore > 0) {
    let valueShift = 0;
    if (runEconomyScore >= 75) valueShift = -0.03;
    else if (runEconomyScore >= 55) valueShift = -0.015;
    else if (runEconomyScore < 40) valueShift = +0.03;
    if (valueShift !== 0) {
      weightedValue += valueShift;
      details += `Économie shift: ${valueShift > 0 ? '+' : ''}${valueShift.toFixed(3)}. `;
    }
  }

  const value = clampCap(weightedValue);
  
  // Confiance basée sur les sources disponibles
  let confidence = 0.30; // Base
  if (sources.includes("Sprint 15s")) confidence += 0.20;
  if (sources.includes("Puissance CAP")) confidence += 0.15;
  if (sources.includes("Ratio P")) confidence += 0.10;
  if (sources.includes("Seuil/VMA")) confidence += 0.10;
  if (sources.includes("TTE")) confidence += 0.05;
  if (sources.includes("Modèle C")) confidence += 0.15;

  // Pénalité d'incohérence : si Sprint 15s et Modèle C divergent > 0.10
  const sprintEst = estimates.find(e => e.source === "Sprint 15s");
  const modelCEst = estimates.find(e => e.source === "Modèle C inverse");
  if (sprintEst && modelCEst && Math.abs(sprintEst.value - modelCEst.value) > 0.10) {
    confidence -= 0.15;
    details += `⚠️ Incohérence Sprint vs Modèle C (Δ=${Math.abs(sprintEst.value - modelCEst.value).toFixed(2)}). `;
  }

  // Ajout bonus économie de course
  confidence += economyConfidenceAdjustment;
  confidence = Math.min(0.95, confidence); // Cap légèrement plus haut avec économie

  // Méthode utilisée
  let method = "combined";
  if (sources.length === 1) {
    method = sources[0].toLowerCase().replace(/\s+/g, '_');
  } else if (sources.includes("Sprint 15s") && sources.includes("Puissance CAP")) {
    method = "sprint_power";
  } else if (sources.includes("Seuil/VMA")) {
    method = "ratio_based";
  } else if (sources.includes("Économie CAP")) {
    method = sources.length === 1 ? "economy_only" : "economy_enhanced";
  }

  return {
    value: Math.round(value * 100) / 100,
    confidence,
    confidenceAdjustment: economyConfidenceAdjustment,
    sources,
    method,
    details: details.trim(),
    economyImpact
  };
}

/**
 * Formate l'estimation pour affichage
 */
export function formatVLamaxCapEstimate(estimate: VLamaxCapEstimate): string {
  const label = estimate.confidence >= 0.8 ? "Fiabilité élevée" : estimate.confidence >= 0.6 ? "Fiabilité modérée" : "Fiabilité limitée";
  return `${estimate.value.toFixed(2)} mmol/L/s (${label})`;
}

/**
 * Vérifie si suffisamment de données sont disponibles pour une estimation
 */
export function canEstimateVLamaxCap(input: VLamaxCapEstimateInput): boolean {
  const { vma, paceThresholdSecPerKm, sprint15sDistance, runningPowerMax } = input;
  return (vma !== null && vma > 0) || 
         (paceThresholdSecPerKm !== null && paceThresholdSecPerKm > 0) ||
         (sprint15sDistance !== null && sprint15sDistance > 0) ||
         (runningPowerMax !== null && runningPowerMax > 0);
}

/**
 * Retourne une description des sources utilisées
 */
export function getEstimationSourcesDescription(estimate: VLamaxCapEstimate): string {
  if (estimate.sources.length === 0) return "Aucune source";
  if (estimate.sources.includes("Sprint 15s") && estimate.sources.includes("Puissance CAP")) {
    return "Tests terrain + puissance (haute fiabilité)";
  }
  if (estimate.sources.includes("Sprint 15s")) {
    return "Test sprint 15s terrain";
  }
  if (estimate.sources.includes("Puissance CAP")) {
    return "Données puissance course";
  }
  if (estimate.sources.includes("Seuil/VMA")) {
    return "Ratio pace seuil / VMA";
  }
  return estimate.sources.join(" + ");
}
