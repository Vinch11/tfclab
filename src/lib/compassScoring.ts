// =============================================
// METABOLIC PERFORMANCE COMPASS™ – SCORING OFFICIEL
// Two For Coaching Lab – Staff-Grade
// =============================================
// 
// FORMULES TRANSPARENTES ET TRAÇABLES
// Aucune "boîte noire" – chaque score est explicable
//
// 4 AXES OFFICIELS :
// 1. Aerobic Capacity (potentiel) — FTP/kg (modulé par fatigue)
// 2. Sustainable Power (durabilité) — TTE effectif vs cible
// 3. Metabolic Efficiency (profil) — VLamax effectif vs cible
// 4. Robustness (solidité) — basé sur risque CAP/fatigue
//
// INTÉGRATION FATIGUE :
// - Fatigue module l'axe Aerobic Capacity (potentiel exprimable)
// - Robustesse intègre le risque CAP pour les sports course
//
// =============================================

import type { VLamaxEffectif, TTEEffectif, FatigueEffectif, RunInjuryRiskEnvelope } from "@/engines/diagnostic";
import { ChargeRecenteReference, computeChargeScore, ChargeScore } from "@/lib/chargeRecenteReference";
import { getAgeAdjustedTargets } from "@/lib/ageAdjustment";
import {
  getVLamaxRange,
  getTTETargetByAmbition,
  getFtpKgTargetByAmbition,
  getVmaTargetByAmbition,
  getChargeOptimale,
  VLamaxTargets,
} from "@/lib/physiologicalTargets";
import { AmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";

// =============================================
// TYPES
// =============================================

export interface CompassAxisScore {
  score: number;              // 0-100
  rawScore: number;           // Score avant modulation
  effectiveScore?: number;    // Score après modulation fatigue (si applicable)
  label: string;              // Nom de l'axe
  explanation: string;        // Explication pédagogique
  formula: string;            // Formule utilisée (pour mode staff)
  inputs: Record<string, number | string | null>;  // Valeurs utilisées
  confidence: number;         // 0-1
  source: string;             // Source principale
  isModulatedByFatigue?: boolean; // Indique si modulé par fatigue
}

export interface CompassScores {
  capaciteAerobie: CompassAxisScore;      // AXE 1
  toleranceEffort: CompassAxisScore;      // AXE 2
  profilMetabolique: CompassAxisScore;    // AXE 3
  robustesse: CompassAxisScore;           // AXE 4
  globalScore: number;                    // Moyenne pondérée
  globalLabel: string;
  globalColor: "success" | "warning" | "destructive";
  dataCompleteness: number;               // % de données disponibles
  mainLimitation: string | null;          // Axe le plus faible
  mainStrength: string | null;            // Axe le plus fort
  isFatigueModulated: boolean;            // Fatigue a modulé le potentiel
}

export interface CompassTargets {
  objectif: string;
  ftpKgTarget: number;
  vmaTarget: number | null;
  tteTarget: number;
  vlamaxIdeal: number;
  vlamaxMax: number;
  chargeOptimale: number;
}

// =============================================
// CIBLES PAR OBJECTIF (derived from centralized source)
// =============================================

// (duplicate removed – using the one above)

/**
 * Build CompassTargets from centralized physiological targets
 * Now uses ambition level AND age for adaptive thresholds
 */
function getTargets(objectif: string, ambition: AmbitionLevel = DEFAULT_AMBITION, age?: number | null): CompassTargets {
  // Si l'âge est fourni, utiliser les cibles ajustées par âge
  if (age !== null && age !== undefined) {
    const ageTargets = getAgeAdjustedTargets(objectif, age, ambition);
    return {
      objectif,
      ftpKgTarget: ageTargets.ftpKgTarget,
      vmaTarget: getVmaTargetByAmbition(objectif, ambition),
      tteTarget: ageTargets.tteTarget,
      vlamaxIdeal: ageTargets.vlamaxOptimal,
      vlamaxMax: ageTargets.vlamaxMax,
      chargeOptimale: getChargeOptimale(objectif, ambition),
    };
  }

  // Sans âge, utiliser les cibles de base
  const vlamaxRange = getVLamaxRange(objectif, ambition);
  return {
    objectif,
    ftpKgTarget: getFtpKgTargetByAmbition(objectif, ambition),
    vmaTarget: getVmaTargetByAmbition(objectif, ambition),
    tteTarget: getTTETargetByAmbition(objectif, ambition),
    vlamaxIdeal: vlamaxRange.optimal,
    vlamaxMax: vlamaxRange.max,
    chargeOptimale: getChargeOptimale(objectif, ambition),
  };
}

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// =============================================
// AXE 1 : CAPACITÉ AÉROBIE (FTP/kg)
// =============================================
// 
// FORMULE OFFICIELLE :
// FTP_score = clamp((FTP_kg / FTP_ref_objectif) × 100, 0, 120)
// Plafonné à 100 pour l'affichage
//

export function computeCapaciteAerobie(
  ftp: number | null,
  poids: number | null,
  objectif: string,
  ambition?: AmbitionLevel,
  athleteAge?: number | null
): CompassAxisScore {
  const targets = getTargets(objectif, ambition, athleteAge);
  
  // Données manquantes
  if (ftp === null || poids === null || poids <= 0) {
    return {
      score: 0,
      rawScore: 0,
      label: "Capacité Aérobie",
      explanation: "FTP ou poids non renseigné — aucune estimation possible",
      formula: "Données manquantes",
      inputs: { ftp, poids, ftpKg: null, ftpRef: targets.ftpKgTarget },
      confidence: 0,
      source: "unknown"
    };
  }
  
  const ftpKg = ftp / poids;
  const rawScore = (ftpKg / targets.ftpKgTarget) * 100;
  const score = clamp(Math.round(rawScore), 0, 100);
  
  let explanation: string;
  if (score >= 100) {
    explanation = `FTP/kg excellent (${ftpKg.toFixed(2)} W/kg ≥ ${targets.ftpKgTarget} W/kg cible)`;
  } else if (score >= 85) {
    explanation = `FTP/kg proche de l'objectif (${ftpKg.toFixed(2)} W/kg)`;
  } else if (score >= 70) {
    explanation = `FTP/kg en progression (${ftpKg.toFixed(2)} W/kg vs ${targets.ftpKgTarget} W/kg cible)`;
  } else {
    explanation = `FTP/kg insuffisant pour ${objectif} (${ftpKg.toFixed(2)} W/kg << ${targets.ftpKgTarget} W/kg)`;
  }
  
  return {
    score,
    rawScore: Math.round(rawScore),
    label: "Capacité Aérobie",
    explanation,
    formula: `FTP_score = (${ftpKg.toFixed(2)} / ${targets.ftpKgTarget}) × 100 = ${rawScore.toFixed(0)}`,
    inputs: { ftp, poids, ftpKg: Math.round(ftpKg * 100) / 100, ftpRef: targets.ftpKgTarget },
    confidence: 0.9,
    source: "snapshot"
  };
}

// =============================================
// AXE 2 : TOLÉRANCE À L'EFFORT (TTE effectif)
// =============================================
// 
// FORMULE OFFICIELLE :
// TTE_score = clamp((TTE_effectif / TTE_cible_objectif) × 100, 0, 120)
//

export function computeToleranceEffort(
  tteEffectif: TTEEffectif,
  objectif: string,
  ambition?: AmbitionLevel
): CompassAxisScore {
  const targets = getTargets(objectif, ambition);
  const tteValue = tteEffectif.tte_min;
  
  // TTE inconnu
  if (tteEffectif.source === "unknown" || tteValue === null || tteValue <= 0) {
    return {
      score: 0,
      rawScore: 0,
      label: "Tolérance à l'Effort",
      explanation: "TTE non renseigné — aucune estimation possible",
      formula: "Données manquantes",
      inputs: { tteValue: null, tteTarget: targets.tteTarget, source: tteEffectif.source },
      confidence: 0,
      source: tteEffectif.source
    };
  }
  
  const rawScore = (tteValue / targets.tteTarget) * 100;
  const score = clamp(Math.round(rawScore), 0, 100);
  
  let explanation: string;
  if (tteValue >= targets.tteTarget + 5) {
    explanation = `TTE excellent (${tteValue} min ≥ ${targets.tteTarget + 5} min) – endurance optimale`;
  } else if (tteValue >= targets.tteTarget) {
    explanation = `TTE cible atteinte (${tteValue} min = cible ${targets.tteTarget} min)`;
  } else if (tteValue >= targets.tteTarget - 5) {
    explanation = `TTE proche de la cible (${tteValue} min, cible: ${targets.tteTarget} min)`;
  } else {
    explanation = `TTE insuffisant (${tteValue} min << ${targets.tteTarget} min) – endurance à développer`;
  }
  
  return {
    score,
    rawScore: Math.round(rawScore),
    label: "Tolérance à l'Effort",
    explanation,
    formula: `TTE_score = (${tteValue} / ${targets.tteTarget}) × 100 = ${rawScore.toFixed(0)}`,
    inputs: { tteValue, tteTarget: targets.tteTarget, source: tteEffectif.source },
    confidence: tteEffectif.confidence,
    source: tteEffectif.source
  };
}

// =============================================
// AXE 3 : PROFIL MÉTABOLIQUE (VLamax effectif)
// =============================================
// 
// FORMULE OFFICIELLE :
// VLamax_score = clamp(100 - ((VLamax_effectif - VLamax_optimal) / plage_tolérée) × 100, 0, 100)
// Un VLamax trop bas ou trop haut pénalise le score
//

export function computeProfilMetabolique(
  vlamaxEffectif: VLamaxEffectif,
  objectif: string,
  ambition?: AmbitionLevel
): CompassAxisScore {
  const targets = getTargets(objectif, ambition);
  const vlamaxValue = vlamaxEffectif.value;
  
  // VLamax inconnu
  if (vlamaxEffectif.source === "unknown" || vlamaxValue === null) {
    return {
      score: 0,
      rawScore: 0,
      label: "Profil Métabolique",
      explanation: "VLamax non renseignée — aucune estimation possible",
      formula: "Données manquantes",
      inputs: { vlamaxValue: null, vlamaxIdeal: targets.vlamaxIdeal, vlamaxMax: targets.vlamaxMax },
      confidence: 0,
      source: vlamaxEffectif.source
    };
  }
  
  let score: number;
  let explanation: string;
  const plage = targets.vlamaxMax - targets.vlamaxIdeal;
  
  // VLamax optimal ou en dessous (excellent pour endurance)
  if (vlamaxValue <= targets.vlamaxIdeal) {
    score = 100;
    explanation = `VLamax optimale (${vlamaxValue.toFixed(2)} ≤ ${targets.vlamaxIdeal}) – profil oxydatif idéal`;
  }
  // VLamax dans la plage acceptable
  else if (vlamaxValue <= targets.vlamaxMax) {
    const deviation = vlamaxValue - targets.vlamaxIdeal;
    const rawScore = 100 - (deviation / plage) * 30; // Pénalité max -30
    score = Math.round(rawScore);
    explanation = `VLamax acceptable (${vlamaxValue.toFixed(2)}) – légèrement au-dessus de l'idéal (${targets.vlamaxIdeal})`;
  }
  // VLamax trop élevé
  else {
    const excess = vlamaxValue - targets.vlamaxMax;
    const rawScore = 70 - excess * 200;
    score = Math.max(20, Math.round(rawScore));
    explanation = `VLamax élevée (${vlamaxValue.toFixed(2)} > ${targets.vlamaxMax}) – profil glycolytique excessif pour ${objectif}`;
  }
  
  return {
    score: clamp(score, 0, 100),
    rawScore: score,
    label: "Profil Métabolique",
    explanation,
    formula: `VLamax_score = 100 - ((${vlamaxValue.toFixed(2)} - ${targets.vlamaxIdeal}) / ${plage.toFixed(2)}) × 100`,
    inputs: { 
      vlamaxValue: Math.round(vlamaxValue * 100) / 100, 
      vlamaxIdeal: targets.vlamaxIdeal, 
      vlamaxMax: targets.vlamaxMax,
      source: vlamaxEffectif.source 
    },
    confidence: vlamaxEffectif.confidence,
    source: vlamaxEffectif.source
  };
}

// =============================================
// VERSIONS AVEC AJUSTEMENT PAR ÂGE
// =============================================

/**
 * Tolérance à l'Effort avec ajustement par âge des cibles
 */
export function computeToleranceEffortWithAge(
  tteEffectif: TTEEffectif,
  objectif: string,
  ambition?: AmbitionLevel,
  athleteAge?: number | null
): CompassAxisScore {
  const targets = getTargets(objectif, ambition, athleteAge);
  const tteValue = tteEffectif.tte_min;
  
  if (tteEffectif.source === "unknown" || tteValue === null || tteValue <= 0) {
    return {
      score: 0,
      rawScore: 0,
      label: "Tolérance à l'Effort",
      explanation: "TTE non renseigné — aucune estimation possible",
      formula: "Données manquantes",
      inputs: { tteValue: null, tteTarget: targets.tteTarget, source: tteEffectif.source },
      confidence: 0,
      source: tteEffectif.source
    };
  }
  
  const rawScore = (tteValue / targets.tteTarget) * 100;
  const score = clamp(Math.round(rawScore), 0, 100);
  
  const ageNote = athleteAge && athleteAge >= 30 ? ` (cible ajustée pour ${athleteAge} ans)` : "";
  
  let explanation: string;
  if (tteValue >= targets.tteTarget + 5) {
    explanation = `TTE excellent (${tteValue} min ≥ ${targets.tteTarget + 5} min)${ageNote}`;
  } else if (tteValue >= targets.tteTarget) {
    explanation = `TTE cible atteinte (${tteValue} min = cible ${targets.tteTarget} min)${ageNote}`;
  } else if (tteValue >= targets.tteTarget - 5) {
    explanation = `TTE proche de la cible (${tteValue} min, cible: ${targets.tteTarget} min)${ageNote}`;
  } else {
    explanation = `TTE insuffisant (${tteValue} min << ${targets.tteTarget} min)${ageNote}`;
  }
  
  return {
    score,
    rawScore: Math.round(rawScore),
    label: "Tolérance à l'Effort",
    explanation,
    formula: `TTE_score = (${tteValue} / ${targets.tteTarget}) × 100 = ${rawScore.toFixed(0)}`,
    inputs: { tteValue, tteTarget: targets.tteTarget, source: tteEffectif.source },
    confidence: tteEffectif.confidence,
    source: tteEffectif.source
  };
}

/**
 * Profil Métabolique avec ajustement par âge des cibles VLamax
 */
export function computeProfilMetaboliqueWithAge(
  vlamaxEffectif: VLamaxEffectif,
  objectif: string,
  ambition?: AmbitionLevel,
  athleteAge?: number | null
): CompassAxisScore {
  const targets = getTargets(objectif, ambition, athleteAge);
  const vlamaxValue = vlamaxEffectif.value;
  
  if (vlamaxEffectif.source === "unknown" || vlamaxValue === null) {
    return {
      score: 0,
      rawScore: 0,
      label: "Profil Métabolique",
      explanation: "VLamax non renseignée — aucune estimation possible",
      formula: "Données manquantes",
      inputs: { vlamaxValue: null, vlamaxIdeal: targets.vlamaxIdeal, vlamaxMax: targets.vlamaxMax },
      confidence: 0,
      source: vlamaxEffectif.source
    };
  }
  
  let score: number;
  const plage = targets.vlamaxMax - targets.vlamaxIdeal;
  const ageNote = athleteAge && athleteAge >= 30 ? ` (cible ajustée pour ${athleteAge} ans)` : "";
  
  let explanation: string;
  
  if (vlamaxValue <= targets.vlamaxIdeal) {
    score = 100;
    explanation = `VLamax optimale (${vlamaxValue.toFixed(2)} ≤ ${targets.vlamaxIdeal.toFixed(2)}) – profil oxydatif idéal${ageNote}`;
  }
  else if (vlamaxValue <= targets.vlamaxMax) {
    const deviation = vlamaxValue - targets.vlamaxIdeal;
    const rawScore = 100 - (deviation / plage) * 30;
    score = Math.round(rawScore);
    explanation = `VLamax acceptable (${vlamaxValue.toFixed(2)}) – légèrement au-dessus de l'idéal (${targets.vlamaxIdeal.toFixed(2)})${ageNote}`;
  }
  else {
    const excess = vlamaxValue - targets.vlamaxMax;
    const rawScore = 70 - excess * 200;
    score = Math.max(20, Math.round(rawScore));
    explanation = `VLamax élevée (${vlamaxValue.toFixed(2)} > ${targets.vlamaxMax.toFixed(2)}) – profil glycolytique excessif${ageNote}`;
  }
  
  return {
    score: clamp(score, 0, 100),
    rawScore: score,
    label: "Profil Métabolique",
    explanation,
    formula: `VLamax_score = 100 - ((${vlamaxValue.toFixed(2)} - ${targets.vlamaxIdeal.toFixed(2)}) / ${plage.toFixed(2)}) × 100`,
    inputs: { 
      vlamaxValue: Math.round(vlamaxValue * 100) / 100, 
      vlamaxIdeal: targets.vlamaxIdeal, 
      vlamaxMax: targets.vlamaxMax,
      source: vlamaxEffectif.source
    },
    confidence: vlamaxEffectif.confidence,
    source: vlamaxEffectif.source
  };
}

// =============================================
// AXE 4 : ROBUSTESSE (Solidité structurelle du profil)
// =============================================
// 
// PHILOSOPHIE V2 :
// Le TSS 7j du snapshot est un indicateur STRUCTUREL (volume habituel
// de l'athlète), PAS un indicateur de fatigue actuelle. Il reflète
// la capacité d'absorption de charge, pas l'état du moment.
//
// FORMULE :
// Pour CAP: Robustesse = clamp(100 - RunInjuryRisk.score, 0, 100)
// Pour Vélo: Robustesse = clamp(100 - Fatigue%, 0, 100)
// Fallback: Robustesse = 0.45×TTE + 0.35×VLamax + 0.20×VolumeStructurel
//

export function computeRobustesse(
  tteScore: CompassAxisScore,
  vlamaxScore: CompassAxisScore,
  chargeScore: ChargeScore,
  fatigueEffectif?: FatigueEffectif | null,
  runInjuryRisk?: RunInjuryRiskEnvelope | null,
  sportFocus?: "bike" | "run" | "triathlon" | null
): CompassAxisScore {
  // Si on a le risque CAP et focus course → utiliser robustesse CAP
  if (runInjuryRisk && (sportFocus === "run" || sportFocus === "triathlon")) {
    const riskScore = runInjuryRisk.score;
    const score = clamp(100 - riskScore, 0, 100);
    
    let explanation: string;
    if (score >= 75) {
      explanation = "Robustesse CAP excellente – risque mécanique faible";
    } else if (score >= 50) {
      explanation = "Robustesse CAP modérée – surveiller charge et intensité";
    } else if (score >= 25) {
      explanation = `Robustesse CAP limitée – ${runInjuryRisk.why}`;
    } else {
      explanation = `Robustesse CAP critique – ${runInjuryRisk.guardrails[0] || "Priorité récupération"}`;
    }
    
    return {
      score,
      rawScore: 100 - riskScore,
      effectiveScore: score,
      label: "Robustesse CAP",
      explanation,
      formula: `Robustesse_CAP = 100 - RisqueCAP(${riskScore}) = ${score}`,
      inputs: {
        runInjuryRiskScore: riskScore,
        runInjuryRiskLevel: runInjuryRisk.level as string,
        confidence: runInjuryRisk.confidence
      },
      confidence: runInjuryRisk.confidence,
      source: "run_injury_risk",
      isModulatedByFatigue: true
    };
  }
  
  // Si on a la fatigue et focus vélo → robustesse basée sur fatigue
  if (fatigueEffectif && sportFocus === "bike") {
    const score = clamp(100 - fatigueEffectif.score, 0, 100);
    
    let explanation: string;
    if (score >= 75) {
      explanation = "Robustesse vélo excellente – fatigue faible";
    } else if (score >= 50) {
      explanation = "Robustesse vélo modérée – surveiller charge";
    } else {
      explanation = "Robustesse vélo limitée – privilégier récupération";
    }
    
    return {
      score,
      rawScore: 100 - fatigueEffectif.score,
      effectiveScore: score,
      label: "Robustesse Vélo",
      explanation,
      formula: `Robustesse_Vélo = 100 - Fatigue(${fatigueEffectif.score}%) = ${score}`,
      inputs: {
      fatigueScore: fatigueEffectif.score,
      fatigueLevel: String(fatigueEffectif.level),
      confidence: fatigueEffectif.confidence
    },
      confidence: fatigueEffectif.confidence,
      source: "fatigue_effectif",
      isModulatedByFatigue: true
    };
  }
  
  // Fallback : formule composite structurelle
  // TSS 7j = volume structurel (capacité d'absorption), pas fatigue actuelle
  const WEIGHT_TTE = 0.45;
  const WEIGHT_VLAMAX = 0.35;
  const WEIGHT_VOLUME = 0.20;
  
  const rawScore = 
    WEIGHT_TTE * tteScore.score +
    WEIGHT_VLAMAX * vlamaxScore.score +
    WEIGHT_VOLUME * chargeScore.score;
  
  const score = clamp(Math.round(rawScore), 0, 100);
  
  // Confiance composite
  const avgConfidence = (tteScore.confidence + vlamaxScore.confidence) / 2;
  const volumeConfidence = chargeScore.status === "unknown" ? 0.3 : 0.7;
  const confidence = (avgConfidence * 0.8 + volumeConfidence * 0.2);
  
  // Explication
  let explanation: string;
  if (score >= 85) {
    explanation = "Robustesse excellente – profil solide et durable";
  } else if (score >= 70) {
    explanation = "Bonne robustesse – capacité à absorber la charge";
  } else if (score >= 50) {
    explanation = "Robustesse modérée – profil à consolider";
  } else {
    explanation = "Robustesse insuffisante – risque de fragilité physiologique";
  }
  
  // Avertissement si volume inconnu
  if (chargeScore.status === "unknown") {
    explanation += " ⚠️ Volume structurel inconnu – fiabilité réduite";
  }
  
  return {
    score,
    rawScore: Math.round(rawScore),
    label: "Robustesse",
    explanation,
    formula: `Robustesse = ${WEIGHT_TTE}×TTE(${tteScore.score}) + ${WEIGHT_VLAMAX}×VLamax(${vlamaxScore.score}) + ${WEIGHT_VOLUME}×Volume(${chargeScore.score}) = ${rawScore.toFixed(0)}`,
    inputs: {
      tteScore: tteScore.score,
      vlamaxScore: vlamaxScore.score,
      volumeScore: chargeScore.score,
      volumeStatus: chargeScore.status
    },
    confidence,
    source: "composite"
  };
}

// =============================================
// MODULATION CAPACITÉ AÉROBIE PAR FATIGUE
// =============================================
//
// FORMULE OFFICIELLE :
// AerobicCapacityEffective = AerobicCapacityRaw × (1 - Fatigue% / 140)
// À 70% fatigue, l'axe baisse d'environ 50% max (modulation réaliste)
//

export function modulateCapaciteAerobieByFatigue(
  capaciteAerobie: CompassAxisScore,
  fatigueEffectif: FatigueEffectif | null
): CompassAxisScore {
  if (!fatigueEffectif || fatigueEffectif.score <= 0) {
    return capaciteAerobie;
  }
  
  // Modulation : à 70% fatigue → ~50% réduction max
  const fatigueModulator = 1 - (fatigueEffectif.score / 140);
  const effectiveScore = clamp(Math.round(capaciteAerobie.rawScore * fatigueModulator), 0, 100);
  
  let modifiedExplanation = capaciteAerobie.explanation;
  if (fatigueEffectif.score >= 30) {
    modifiedExplanation += ` (modulé par fatigue ${fatigueEffectif.score}%)`;
  }
  
  return {
    ...capaciteAerobie,
    score: effectiveScore,
    effectiveScore,
    explanation: modifiedExplanation,
    formula: `${capaciteAerobie.formula} → × (1 - ${fatigueEffectif.score}/140) = ${effectiveScore}`,
    isModulatedByFatigue: fatigueEffectif.score >= 15
  };
}

// =============================================
// CALCUL GLOBAL DU COMPASS
// =============================================

export interface ComputeCompassParams {
  ftp: number | null;
  poids: number | null;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  crr: ChargeRecenteReference;
  objectif: string;
  // Niveau d'ambition pour seuils adaptatifs
  ambition?: AmbitionLevel;
  // Âge de l'athlète pour ajustement des cibles
  athleteAge?: number | null;
  // Paramètres pour intégration fatigue
  fatigueEffectif?: FatigueEffectif | null;
  runInjuryRisk?: RunInjuryRiskEnvelope | null;
  sportFocus?: "bike" | "run" | "triathlon" | null;
}

export function computeCompassScores(params: ComputeCompassParams): CompassScores {
  const { 
    ftp, poids, vlamaxEffectif, tteEffectif, crr, objectif, ambition,
    athleteAge, fatigueEffectif, runInjuryRisk, sportFocus 
  } = params;
  
  // Calculer les 4 axes avec ambition ET ajustement par âge
  const capaciteAerobieRaw = computeCapaciteAerobie(ftp, poids, objectif, ambition, athleteAge);
  
  // Moduler la capacité aérobie par la fatigue si disponible
  const capaciteAerobie = fatigueEffectif 
    ? modulateCapaciteAerobieByFatigue(capaciteAerobieRaw, fatigueEffectif)
    : capaciteAerobieRaw;
  
  const toleranceEffort = computeToleranceEffortWithAge(tteEffectif, objectif, ambition, athleteAge);
  const profilMetabolique = computeProfilMetaboliqueWithAge(vlamaxEffectif, objectif, ambition, athleteAge);
  const chargeScore = computeChargeScore(crr, objectif);
  
  // Robustesse intègre le risque CAP/fatigue selon le sport
  const robustesse = computeRobustesse(
    toleranceEffort, 
    profilMetabolique, 
    chargeScore,
    fatigueEffectif,
    runInjuryRisk,
    sportFocus
  );
  
  // Vérifier si la fatigue a modulé le potentiel
  const isFatigueModulated = Boolean(
    capaciteAerobie.isModulatedByFatigue || 
    robustesse.isModulatedByFatigue
  );
  
  // Score global (moyenne pondérée)
  const globalScore = Math.round(
    (capaciteAerobie.score * 0.20 +
     toleranceEffort.score * 0.30 +
     profilMetabolique.score * 0.25 +
     robustesse.score * 0.25)
  );
  
  // Label et couleur
  let globalLabel: string;
  let globalColor: "success" | "warning" | "destructive";
  
  if (globalScore >= 80) {
    globalLabel = "Profil Optimal";
    globalColor = "success";
  } else if (globalScore >= 65) {
    globalLabel = "Bon Équilibre";
    globalColor = "success";
  } else if (globalScore >= 50) {
    globalLabel = "En Progression";
    globalColor = "warning";
  } else {
    globalLabel = "À Développer";
    globalColor = "destructive";
  }
  
  // Identifier forces et limitations
  const axisScores = [
    { name: "Capacité Aérobie", score: capaciteAerobie.score },
    { name: "Tolérance à l'Effort", score: toleranceEffort.score },
    { name: "Profil Métabolique", score: profilMetabolique.score },
    { name: "Robustesse", score: robustesse.score },
  ];
  
  const sorted = [...axisScores].sort((a, b) => b.score - a.score);
  const mainStrength = sorted[0].score >= 70 ? sorted[0].name : null;
  const mainLimitation = sorted[3].score < 70 ? sorted[3].name : null;
  
  // Complétude des données
  let dataCount = 0;
  if (ftp !== null && poids !== null) dataCount++;
  if (tteEffectif.source !== "unknown") dataCount++;
  if (vlamaxEffectif.source !== "unknown") dataCount++;
  if (crr.isValid) dataCount++;
  const dataCompleteness = Math.round((dataCount / 4) * 100);
  
  return {
    capaciteAerobie,
    toleranceEffort,
    profilMetabolique,
    robustesse,
    globalScore,
    globalLabel,
    globalColor,
    dataCompleteness,
    mainLimitation,
    mainStrength,
    isFatigueModulated
  };
}
