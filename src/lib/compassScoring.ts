// =============================================
// METABOLIC PERFORMANCE COMPASS™ – SCORING OFFICIEL
// Two For Coaching Lab – Staff-Grade
// =============================================
// 
// FORMULES TRANSPARENTES ET TRAÇABLES
// Aucune "boîte noire" – chaque score est explicable
//
// 4 AXES INDÉPENDANTS MAIS INTERCONNECTÉS :
// 1. Capacité Aérobie (FTP/kg)
// 2. Tolérance à l'Effort (TTE effectif)
// 3. Profil Métabolique (VLamax effectif)
// 4. Robustesse (composite TTE + VLamax + Charge)
//
// =============================================

import { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { TTEEffectif } from "@/lib/tteEffectif";
import { ChargeRecenteReference, computeChargeScore, ChargeScore } from "@/lib/chargeRecenteReference";

// =============================================
// TYPES
// =============================================

export interface CompassAxisScore {
  score: number;              // 0-100
  rawScore: number;           // Score avant normalisation
  label: string;              // Nom de l'axe
  explanation: string;        // Explication pédagogique
  formula: string;            // Formule utilisée (pour mode staff)
  inputs: Record<string, number | string | null>;  // Valeurs utilisées
  confidence: number;         // 0-1
  source: string;             // Source principale
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
}

export interface CompassTargets {
  objectif: string;
  ftpKgTarget: number;
  tteTarget: number;
  vlamaxIdeal: number;
  vlamaxMax: number;
  chargeOptimale: number;
}

// =============================================
// CIBLES PAR OBJECTIF
// =============================================

const COMPASS_TARGETS: Record<string, CompassTargets> = {
  // Ironman / Ultra
  IM: { objectif: "Ironman", ftpKgTarget: 4.6, tteTarget: 55, vlamaxIdeal: 0.35, vlamaxMax: 0.45, chargeOptimale: 550 },
  Ironman: { objectif: "Ironman", ftpKgTarget: 4.6, tteTarget: 55, vlamaxIdeal: 0.35, vlamaxMax: 0.45, chargeOptimale: 550 },
  Ultra: { objectif: "Ultra", ftpKgTarget: 4.4, tteTarget: 60, vlamaxIdeal: 0.32, vlamaxMax: 0.42, chargeOptimale: 500 },
  
  // 70.3 / Half
  "703": { objectif: "70.3", ftpKgTarget: 4.8, tteTarget: 50, vlamaxIdeal: 0.40, vlamaxMax: 0.50, chargeOptimale: 450 },
  Half: { objectif: "Half", ftpKgTarget: 4.8, tteTarget: 50, vlamaxIdeal: 0.40, vlamaxMax: 0.50, chargeOptimale: 450 },
  
  // Marathon / Semi
  Marathon: { objectif: "Marathon", ftpKgTarget: 4.5, tteTarget: 52, vlamaxIdeal: 0.38, vlamaxMax: 0.48, chargeOptimale: 400 },
  Semi: { objectif: "Semi", ftpKgTarget: 4.5, tteTarget: 47, vlamaxIdeal: 0.42, vlamaxMax: 0.52, chargeOptimale: 350 },
  Course: { objectif: "Course", ftpKgTarget: 4.5, tteTarget: 45, vlamaxIdeal: 0.45, vlamaxMax: 0.55, chargeOptimale: 300 },
  
  // Trail
  Trail: { objectif: "Trail", ftpKgTarget: 4.4, tteTarget: 55, vlamaxIdeal: 0.38, vlamaxMax: 0.48, chargeOptimale: 450 },
  TrailCourt: { objectif: "Trail Court", ftpKgTarget: 4.5, tteTarget: 45, vlamaxIdeal: 0.42, vlamaxMax: 0.52, chargeOptimale: 350 },
  TrailLong: { objectif: "Trail Long", ftpKgTarget: 4.3, tteTarget: 60, vlamaxIdeal: 0.32, vlamaxMax: 0.42, chargeOptimale: 550 },
  
  // Sprint / Olympique
  Sprint: { objectif: "Sprint", ftpKgTarget: 5.0, tteTarget: 35, vlamaxIdeal: 0.55, vlamaxMax: 0.70, chargeOptimale: 300 },
  Olympic: { objectif: "Olympic", ftpKgTarget: 4.8, tteTarget: 40, vlamaxIdeal: 0.50, vlamaxMax: 0.60, chargeOptimale: 350 },
};

const DEFAULT_TARGETS: CompassTargets = COMPASS_TARGETS["703"];

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getTargets(objectif: string): CompassTargets {
  return COMPASS_TARGETS[objectif] || DEFAULT_TARGETS;
}

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
  objectif: string
): CompassAxisScore {
  const targets = getTargets(objectif);
  
  // Données manquantes
  if (ftp === null || poids === null || poids <= 0) {
    return {
      score: 50,
      rawScore: 50,
      label: "Capacité Aérobie",
      explanation: "FTP ou poids non disponible – score neutre appliqué",
      formula: "FTP_score = (FTP_kg / FTP_ref) × 100",
      inputs: { ftp, poids, ftpKg: null, ftpRef: targets.ftpKgTarget },
      confidence: 0.2,
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
  objectif: string
): CompassAxisScore {
  const targets = getTargets(objectif);
  const tteValue = tteEffectif.tte_min;
  
  // TTE inconnu
  if (tteEffectif.source === "unknown" || tteValue === null || tteValue <= 0) {
    return {
      score: 50,
      rawScore: 50,
      label: "Tolérance à l'Effort",
      explanation: "TTE non disponible – score neutre appliqué",
      formula: "TTE_score = (TTE_effectif / TTE_cible) × 100",
      inputs: { tteValue: null, tteTarget: targets.tteTarget, source: tteEffectif.source },
      confidence: tteEffectif.confidence,
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
  objectif: string
): CompassAxisScore {
  const targets = getTargets(objectif);
  const vlamaxValue = vlamaxEffectif.value;
  
  // VLamax inconnu
  if (vlamaxEffectif.source === "unknown" || vlamaxValue === null) {
    return {
      score: 50,
      rawScore: 50,
      label: "Profil Métabolique",
      explanation: "VLamax non disponible – score neutre appliqué",
      formula: "VLamax_score = 100 - ((VLamax - VLamax_optimal) / plage) × 100",
      inputs: { vlamaxValue: null, vlamaxIdeal: targets.vlamaxIdeal, vlamaxMax: targets.vlamaxMax },
      confidence: vlamaxEffectif.confidence,
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
// AXE 4 : ROBUSTESSE (Composite)
// =============================================
// 
// FORMULE OFFICIELLE :
// Robustesse_score = 0.4 × TTE_score + 0.3 × VLamax_score + 0.3 × Charge_score
//

export function computeRobustesse(
  tteScore: CompassAxisScore,
  vlamaxScore: CompassAxisScore,
  chargeScore: ChargeScore
): CompassAxisScore {
  // Pondérations officielles
  const WEIGHT_TTE = 0.4;
  const WEIGHT_VLAMAX = 0.3;
  const WEIGHT_CHARGE = 0.3;
  
  const rawScore = 
    WEIGHT_TTE * tteScore.score +
    WEIGHT_VLAMAX * vlamaxScore.score +
    WEIGHT_CHARGE * chargeScore.score;
  
  const score = clamp(Math.round(rawScore), 0, 100);
  
  // Confiance composite
  const avgConfidence = (tteScore.confidence + vlamaxScore.confidence) / 2;
  const chargeConfidence = chargeScore.status === "unknown" ? 0.2 : 0.8;
  const confidence = (avgConfidence * 0.7 + chargeConfidence * 0.3);
  
  // Explication
  let explanation: string;
  if (score >= 85) {
    explanation = "Robustesse excellente – profil solide et durable";
  } else if (score >= 70) {
    explanation = "Bonne robustesse – capacité à absorber la charge";
  } else if (score >= 50) {
    explanation = "Robustesse modérée – surveiller fatigue et récupération";
  } else {
    explanation = "Robustesse insuffisante – risque de fragilité physiologique";
  }
  
  // Avertissement si charge inconnue
  if (chargeScore.status === "unknown") {
    explanation += " ⚠️ Charge récente inconnue – fiabilité réduite";
  }
  
  return {
    score,
    rawScore: Math.round(rawScore),
    label: "Robustesse",
    explanation,
    formula: `Robustesse = ${WEIGHT_TTE}×TTE(${tteScore.score}) + ${WEIGHT_VLAMAX}×VLamax(${vlamaxScore.score}) + ${WEIGHT_CHARGE}×Charge(${chargeScore.score}) = ${rawScore.toFixed(0)}`,
    inputs: {
      tteScore: tteScore.score,
      vlamaxScore: vlamaxScore.score,
      chargeScore: chargeScore.score,
      chargeStatus: chargeScore.status
    },
    confidence,
    source: "composite"
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
}

export function computeCompassScores(params: ComputeCompassParams): CompassScores {
  const { ftp, poids, vlamaxEffectif, tteEffectif, crr, objectif } = params;
  
  // Calculer les 4 axes
  const capaciteAerobie = computeCapaciteAerobie(ftp, poids, objectif);
  const toleranceEffort = computeToleranceEffort(tteEffectif, objectif);
  const profilMetabolique = computeProfilMetabolique(vlamaxEffectif, objectif);
  const chargeScore = computeChargeScore(crr, objectif);
  const robustesse = computeRobustesse(toleranceEffort, profilMetabolique, chargeScore);
  
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
    mainStrength
  };
}
