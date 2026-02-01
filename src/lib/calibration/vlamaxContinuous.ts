/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VLAMAX CONTINUOUS CALIBRATION ENGINE — Two For Coaching Lab™ V2
 * 
 * Moteur de calibration continue basé sur preuves terrain.
 * Fenêtre glissante 42 jours, pondération qualité, gestion verrouillage.
 * 
 * PRINCIPES:
 * - La physiologie évolue lentement (4-6 semaines)
 * - Les preuves augmentent la CONFIANCE, pas la magie
 * - Tout changement est traçable et justifié
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Tables } from "@/integrations/supabase/types";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type EvidenceSourceType = "TEST_PROTOCOL" | "FIT_IMPORT" | "POST_RACE";
export type EvidenceType = "SPRINT_15S" | "P30" | "P60" | "MAP" | "TTE_OBS" | "PACED_RACE" | "DRIFT" | "ECONOMY";
export type ValidityStatus = "OK" | "CHECK" | "INVALID";

export interface CalibrationEvidence {
  id: string;
  athlete_id: string;
  coach_id: string;
  date: string;
  source_type: EvidenceSourceType;
  evidence_type: EvidenceType;
  raw_values: Record<string, number | string | boolean>;
  protocol_quality: 1 | 2 | 3 | 4 | 5;
  validity: ValidityStatus;
  confidence_evidence: number;
  fatigue_index?: number | null;
  notes?: string | null;
  used_in_calibration?: boolean;
  calibration_weight?: number;
}

export interface CalibrationSnapshot {
  id: string;
  athlete_id: string;
  coach_id: string;
  date: string;
  vlamax_modelled: number | null;
  vlamax_calibrated: number | null;
  vlamax_range_p25: number | null;
  vlamax_range_p75: number | null;
  confidence: number;
  evidence_ids: string[];
  is_locked: boolean;
  lock_until: string | null;
  recalibration_recommended: boolean;
  recalibration_reason: string | null;
  calibration_window_start: string | null;
  calibration_window_end: string | null;
  notes?: string | null;
}

export interface CalibrationResult {
  vlamax_modelled: number;
  vlamax_calibrated: number;
  vlamax_range: { p25: number; p75: number };
  delta: number;
  confidence: number;
  confidence_impact: number;
  evidence_count: number;
  evidence_ids: string[];
  recalibration_recommended: boolean;
  recalibration_reason: string | null;
  notes: string[];
}

export interface RecalibrationTrigger {
  triggered: boolean;
  reason: string | null;
  severity: "info" | "warning" | "critical";
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const CALIBRATION_WINDOW_DAYS = 42;
export const LOCK_PERIOD_WEEKS = 4;
export const MIN_EVIDENCE_FOR_CALIBRATION = 1;
export const MAX_DISPERSION_THRESHOLD = 0.15; // mmol/L/s

// Poids de base par type de preuve
const EVIDENCE_BASE_WEIGHTS: Record<EvidenceType, number> = {
  SPRINT_15S: 0.85,
  P30: 0.80,
  P60: 0.75,
  MAP: 0.70,
  TTE_OBS: 0.65,
  PACED_RACE: 0.50, // Modéré car reflète exécution + fatigue
  DRIFT: 0.40,
  ECONOMY: 0.35,
};

// Multiplicateurs qualité protocole
const QUALITY_MULTIPLIERS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0.50,
  2: 0.70,
  3: 1.00,
  4: 1.15,
  5: 1.30,
};

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE WEIGHTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le poids d'une preuve pour la calibration
 * 
 * Règles TFCL Staff-grade:
 * - Base selon type de preuve (sprint > map > race)
 * - +15-30% si protocol_quality >= 4
 * - -30% si validity = CHECK, -60% si INVALID
 * - -20% si fatigue_index > 70
 * - Décroissance temporelle (plus vieux = moins de poids)
 */
export function computeEvidenceWeight(
  evidence: CalibrationEvidence,
  referenceDate: Date = new Date()
): number {
  let weight = EVIDENCE_BASE_WEIGHTS[evidence.evidence_type] ?? 0.50;
  
  // Multiplicateur qualité protocole
  weight *= QUALITY_MULTIPLIERS[evidence.protocol_quality];
  
  // Pénalité validité
  if (evidence.validity === "CHECK") {
    weight *= 0.70;
  } else if (evidence.validity === "INVALID") {
    weight *= 0.40;
  }
  
  // Pénalité fatigue
  if (evidence.fatigue_index !== null && evidence.fatigue_index !== undefined) {
    if (evidence.fatigue_index > 70) {
      weight *= 0.80;
    } else if (evidence.fatigue_index > 85) {
      weight *= 0.65;
    }
  }
  
  // Décroissance temporelle (42 jours = fenêtre complète)
  const evidenceDate = new Date(evidence.date);
  const daysSinceEvidence = Math.floor((referenceDate.getTime() - evidenceDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceEvidence > CALIBRATION_WINDOW_DAYS) {
    // Hors fenêtre: poids très réduit mais non nul (historique)
    weight *= 0.20;
  } else if (daysSinceEvidence > 21) {
    // Vieille preuve: réduction progressive
    const decay = 1 - ((daysSinceEvidence - 21) / 21) * 0.40;
    weight *= decay;
  }
  
  // Clamp final [0.1, 1.0]
  return Math.max(0.10, Math.min(1.0, weight));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALIBRATION DELTA COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le delta de calibration basé sur les preuves
 * 
 * Retourne:
 * - delta: ajustement à appliquer à la VLamax modélisée
 * - confidence_impact: boost de confiance
 * - dispersion: écart-type des preuves
 */
export function computeCalibrationDelta(
  modelled_vlamax: number,
  evidences: CalibrationEvidence[],
  referenceDate: Date = new Date()
): {
  delta: number;
  confidence_impact: number;
  dispersion: number;
  weighted_average: number;
  notes: string[];
} {
  const notes: string[] = [];
  
  if (evidences.length === 0) {
    return {
      delta: 0,
      confidence_impact: 0,
      dispersion: 0,
      weighted_average: modelled_vlamax,
      notes: ["Aucune preuve disponible"],
    };
  }
  
  // Filtrer les preuves valides avec VLamax
  const validEvidences = evidences.filter(e => {
    const vlamax = e.raw_values?.vlamax_estimated as number | undefined;
    return vlamax !== undefined && e.validity !== "INVALID";
  });
  
  if (validEvidences.length === 0) {
    notes.push("Preuves présentes mais sans VLamax estimée valide");
    return {
      delta: 0,
      confidence_impact: 0,
      dispersion: 0,
      weighted_average: modelled_vlamax,
      notes,
    };
  }
  
  // Calcul moyenne pondérée
  let totalWeight = 0;
  let weightedSum = 0;
  const values: number[] = [];
  
  for (const evidence of validEvidences) {
    const vlamax = evidence.raw_values?.vlamax_estimated as number;
    const weight = computeEvidenceWeight(evidence, referenceDate);
    
    weightedSum += vlamax * weight;
    totalWeight += weight;
    values.push(vlamax);
  }
  
  const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : modelled_vlamax;
  
  // Calcul dispersion (écart-type)
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const dispersion = Math.sqrt(variance);
  
  // Delta = différence entre moyenne pondérée et modèle
  const delta = weightedAverage - modelled_vlamax;
  
  // Impact confiance
  let confidenceImpact = 0;
  
  // Boost si peu de dispersion et bonne qualité
  const avgQuality = validEvidences.reduce((acc, e) => acc + e.protocol_quality, 0) / validEvidences.length;
  
  if (dispersion < 0.05 && avgQuality >= 4) {
    confidenceImpact = 0.15;
    notes.push("Preuves cohérentes haute qualité → confiance +15%");
  } else if (dispersion < 0.10 && avgQuality >= 3) {
    confidenceImpact = 0.10;
    notes.push("Preuves cohérentes → confiance +10%");
  } else if (dispersion < MAX_DISPERSION_THRESHOLD) {
    confidenceImpact = 0.05;
    notes.push("Dispersion acceptable → confiance +5%");
  } else {
    confidenceImpact = -0.05;
    notes.push(`Dispersion élevée (${dispersion.toFixed(2)}) → confiance réduite`);
  }
  
  // Bonus pour nombre de preuves
  if (validEvidences.length >= 3) {
    confidenceImpact += 0.05;
    notes.push(`${validEvidences.length} preuves convergentes`);
  }
  
  return {
    delta,
    confidence_impact: confidenceImpact,
    dispersion,
    weighted_average: weightedAverage,
    notes,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCE CALIBRATED VLAMAX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Produit la VLamax calibrée finale avec plage et confiance
 */
export function produceCalibratedVLamax(
  modelled_vlamax: number,
  modelled_confidence: number,
  evidences: CalibrationEvidence[],
  referenceDate: Date = new Date()
): CalibrationResult {
  const windowStart = new Date(referenceDate);
  windowStart.setDate(windowStart.getDate() - CALIBRATION_WINDOW_DAYS);
  
  // Filtrer preuves dans la fenêtre
  const windowEvidences = evidences.filter(e => {
    const evidenceDate = new Date(e.date);
    return evidenceDate >= windowStart && evidenceDate <= referenceDate;
  });
  
  // Calculer delta
  const { delta, confidence_impact, dispersion, weighted_average, notes } = 
    computeCalibrationDelta(modelled_vlamax, windowEvidences, referenceDate);
  
  // Appliquer delta à la valeur modélisée
  const calibrated = modelled_vlamax + delta;
  
  // Calculer plage P25-P75 basée sur dispersion
  const rangeWidth = Math.max(0.03, dispersion * 1.5);
  const p25 = calibrated - rangeWidth;
  const p75 = calibrated + rangeWidth;
  
  // Calculer confiance finale
  const finalConfidence = Math.max(0.30, Math.min(0.95, modelled_confidence + confidence_impact));
  
  // Vérifier si recalibration recommandée
  const recalibration = checkRecalibrationTriggers(
    modelled_vlamax,
    calibrated,
    windowEvidences,
    dispersion
  );
  
  return {
    vlamax_modelled: modelled_vlamax,
    vlamax_calibrated: calibrated,
    vlamax_range: { p25, p75 },
    delta,
    confidence: finalConfidence,
    confidence_impact,
    evidence_count: windowEvidences.length,
    evidence_ids: windowEvidences.map(e => e.id),
    recalibration_recommended: recalibration.triggered,
    recalibration_reason: recalibration.reason,
    notes,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECALIBRATION TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie si une recalibration est recommandée
 * 
 * Triggers:
 * - VLamax calibrée hors P10-P90 du cluster objectif
 * - Dispersion > seuil
 * - Post-race incohérente
 * - 2+ preuves fortes contradictoires
 */
export function checkRecalibrationTriggers(
  modelled: number,
  calibrated: number,
  evidences: CalibrationEvidence[],
  dispersion: number
): RecalibrationTrigger {
  // Trigger 1: Dispersion trop élevée
  if (dispersion > MAX_DISPERSION_THRESHOLD) {
    return {
      triggered: true,
      reason: `Dispersion des preuves élevée (${dispersion.toFixed(2)} > ${MAX_DISPERSION_THRESHOLD})`,
      severity: "warning",
    };
  }
  
  // Trigger 2: Delta très important (>20% du modèle)
  const deltaPercent = Math.abs((calibrated - modelled) / modelled);
  if (deltaPercent > 0.20) {
    return {
      triggered: true,
      reason: `Écart calibration/modèle de ${(deltaPercent * 100).toFixed(0)}%`,
      severity: "critical",
    };
  }
  
  // Trigger 3: Preuves contradictoires haute qualité
  const highQualityEvidences = evidences.filter(e => e.protocol_quality >= 4 && e.validity === "OK");
  if (highQualityEvidences.length >= 2) {
    const values = highQualityEvidences
      .map(e => e.raw_values?.vlamax_estimated as number)
      .filter(v => v !== undefined);
    
    if (values.length >= 2) {
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      const range = maxVal - minVal;
      
      if (range > 0.12) {
        return {
          triggered: true,
          reason: `Preuves haute qualité contradictoires (écart ${range.toFixed(2)})`,
          severity: "warning",
        };
      }
    }
  }
  
  // Trigger 4: Post-race incohérente
  const postRaceEvidences = evidences.filter(e => e.source_type === "POST_RACE");
  if (postRaceEvidences.length > 0) {
    const latestRace = postRaceEvidences.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    
    const raceVlamax = latestRace.raw_values?.vlamax_estimated as number | undefined;
    if (raceVlamax !== undefined && Math.abs(raceVlamax - calibrated) > 0.10) {
      return {
        triggered: true,
        reason: `Post-race suggère VLamax différente (${raceVlamax.toFixed(2)} vs ${calibrated.toFixed(2)})`,
        severity: "info",
      };
    }
  }
  
  return {
    triggered: false,
    reason: null,
    severity: "info",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE LOCK MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie si le profil est verrouillé
 */
export function isProfileLocked(snapshot: CalibrationSnapshot | null): boolean {
  if (!snapshot) return false;
  if (!snapshot.is_locked) return false;
  
  if (snapshot.lock_until) {
    const lockUntil = new Date(snapshot.lock_until);
    return lockUntil > new Date();
  }
  
  return snapshot.is_locked;
}

/**
 * Calcule la date de fin de verrouillage
 */
export function computeLockEndDate(startDate: Date = new Date()): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + LOCK_PERIOD_WEEKS * 7);
  return endDate;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PACING ENVELOPE IMPACT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le coefficient de conservatisme pour le pacing envelope
 * basé sur la confiance VLamax
 */
export function computePacingConservatism(confidence: number): {
  coefficient: number;
  label: string;
  description: string;
} {
  if (confidence >= 0.85) {
    return {
      coefficient: 1.00,
      label: "Précis",
      description: "Confiance élevée → envelope serré",
    };
  } else if (confidence >= 0.70) {
    return {
      coefficient: 0.97,
      label: "Standard",
      description: "Confiance moyenne → légère marge de sécurité",
    };
  } else if (confidence >= 0.55) {
    return {
      coefficient: 0.94,
      label: "Prudent",
      description: "Confiance modérée → envelope conservateur",
    };
  } else {
    return {
      coefficient: 0.90,
      label: "Très prudent",
      description: "Confiance faible → forte marge de sécurité",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type { Tables };
