/**
 * CAP INJURY RISK INDEX
 * Indice de Risque Blessure spécifique à la Course à Pied (CAP)
 * 
 * Basé sur:
 * - VLamax effectif (profil glycolytique)
 * - TTE effectif (endurance au seuil)
 * - Objectif athlète (Semi, Marathon, IM, 70.3)
 * 
 * PRINCIPE SCIENTIFIQUE:
 * En CAP, le risque de blessure augmente fortement lorsque:
 * - le profil est très glycolytique (VLamax élevé)
 * - l'endurance au seuil est insuffisante (TTE bas)
 * - le volume est augmenté trop rapidement
 * 
 * Ces facteurs combinés augmentent:
 * - la fatigue neuromusculaire
 * - la rigidité excessive
 * - la perte d'économie
 * - les contraintes tendineuses et osseuses
 */

import { getTTETargetByAmbition } from "@/lib/physiologicalTargets";

// =============================================
// TYPES
// =============================================


export type CAPRiskLevel = 0 | 1 | 2 | 3;

export interface CAPInjuryRiskResult {
  level: CAPRiskLevel;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  vlamaxScore: number;
  tteScore: number;
  totalScore: number;
  explanation: string;
  pedagogicalText: string;
  staffAnalysis: string;
}

interface CAPRiskParams {
  vlamaxValue: number | null;
  tteValue: number | null;
  objectif: string;
  /** R4 : ambition (défaut "age_group" pour préserver le comportement legacy) */
  ambition?: import("@/types/ambitionLevel").AmbitionLevel;
  /** R5 : âge pour ajustement TTE via getTTETargetByAmbition */
  age?: number | null;
}


// =============================================
// SEUILS PAR OBJECTIF
// =============================================

interface ObjectifThresholds {
  vlamaxIdeal: number;
  vlamaxTolerable: number;
  tteTarget: number;
  tteTolerance: number; // marge en minutes
}

/**
 * R4 : seuils dérivés de la source unique `getTTETargetByAmbition`
 * (matrice canonique objectif × ambition + ajustement âge R5).
 *
 * Les seuils VLamax restent locaux car spécifiques au risque blessure CAP
 * (plus stricts que la matrice de performance générique).
 */
function getThresholdsForObjectif(
  objectif: string,
  ambition: import("@/types/ambitionLevel").AmbitionLevel = "age_group",
  age: number | null = null,
): ObjectifThresholds {
  const normalizedGoal = objectif.toLowerCase();
  const tteTarget = getTTETargetByAmbition(objectif, ambition, age);
  const tteTolerance = 5;

  // Semi-marathon
  if (normalizedGoal.includes("semi") || normalizedGoal.includes("21k")) {
    return { vlamaxIdeal: 0.45, vlamaxTolerable: 0.55, tteTarget, tteTolerance };
  }

  // Marathon
  if (normalizedGoal.includes("marathon") && !normalizedGoal.includes("semi")) {
    return { vlamaxIdeal: 0.40, vlamaxTolerable: 0.50, tteTarget, tteTolerance };
  }

  // Ironman 70.3
  if (normalizedGoal.includes("70.3") || normalizedGoal.includes("703") || normalizedGoal.includes("half ironman")) {
    return { vlamaxIdeal: 0.42, vlamaxTolerable: 0.52, tteTarget, tteTolerance };
  }

  // Ironman Full
  if (normalizedGoal.includes("ironman") || normalizedGoal.includes("kona") || normalizedGoal.includes("im full")) {
    return { vlamaxIdeal: 0.35, vlamaxTolerable: 0.45, tteTarget, tteTolerance };
  }

  // Default (Semi-like)
  return { vlamaxIdeal: 0.45, vlamaxTolerable: 0.55, tteTarget, tteTolerance };
}


// =============================================
// CALCUL DU SCORE VLAMAX (CAP)
// =============================================

function computeVLamaxScore(vlamax: number | null, thresholds: ObjectifThresholds): number {
  if (vlamax === null) return 1; // Score neutre si inconnu
  
  if (vlamax <= thresholds.vlamaxIdeal) {
    return 0; // Idéal
  }
  
  if (vlamax <= thresholds.vlamaxTolerable) {
    return 1; // Tolérable
  }
  
  return 2; // Élevé
}

// =============================================
// CALCUL DU SCORE TTE (CAP)
// =============================================

function computeTTEScore(tte: number | null, thresholds: ObjectifThresholds): number {
  if (tte === null) return 1; // Score neutre si inconnu
  
  const minAcceptable = thresholds.tteTarget - thresholds.tteTolerance;
  
  if (tte >= thresholds.tteTarget) {
    return 0; // Optimal
  }
  
  if (tte >= minAcceptable) {
    return 1; // Tolérable
  }
  
  return 2; // Insuffisant
}

// =============================================
// MAPPING SCORE → NIVEAU DE RISQUE
// =============================================

function mapScoreToLevel(totalScore: number): CAPRiskLevel {
  if (totalScore <= 1) return 0; // Très faible
  if (totalScore === 2) return 1; // Faible
  if (totalScore === 3) return 2; // Modéré
  return 3; // Élevé (4+)
}

function getLevelLabel(level: CAPRiskLevel): string {
  switch (level) {
    case 0: return "Très faible";
    case 1: return "Faible";
    case 2: return "Modéré";
    case 3: return "Élevé";
  }
}

function getLevelColors(level: CAPRiskLevel): { color: string; bgColor: string; borderColor: string } {
  switch (level) {
    case 0:
      return {
        color: "text-green-700 dark:text-green-300",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        borderColor: "border-green-300 dark:border-green-700"
      };
    case 1:
      return {
        color: "text-blue-700 dark:text-blue-300",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        borderColor: "border-blue-300 dark:border-blue-700"
      };
    case 2:
      return {
        color: "text-amber-700 dark:text-amber-300",
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
        borderColor: "border-amber-300 dark:border-amber-700"
      };
    case 3:
      return {
        color: "text-red-700 dark:text-red-300",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        borderColor: "border-red-300 dark:border-red-700"
      };
  }
}

// =============================================
// GÉNÉRATION DES TEXTES EXPLICATIFS
// =============================================

function generateExplanation(
  vlamax: number | null,
  tte: number | null,
  level: CAPRiskLevel,
  thresholds: ObjectifThresholds
): string {
  const parts: string[] = [];
  
  if (vlamax !== null) {
    if (vlamax > thresholds.vlamaxTolerable) {
      parts.push(`VLamax élevée (${vlamax.toFixed(2)} > ${thresholds.vlamaxTolerable})`);
    } else if (vlamax > thresholds.vlamaxIdeal) {
      parts.push(`VLamax modérée (${vlamax.toFixed(2)})`);
    }
  } else {
    parts.push("VLamax inconnue");
  }
  
  if (tte !== null) {
    const minAcceptable = thresholds.tteTarget - thresholds.tteTolerance;
    if (tte < minAcceptable) {
      parts.push(`TTE insuffisant (${tte} min < ${minAcceptable} min)`);
    } else if (tte < thresholds.tteTarget) {
      parts.push(`TTE limite (${tte} min)`);
    }
  } else {
    parts.push("TTE inconnu");
  }
  
  if (parts.length === 0) {
    return "Profil favorable pour la CAP longue.";
  }
  
  return parts.join(" + ");
}

function generatePedagogicalText(level: CAPRiskLevel, objectif: string): string {
  switch (level) {
    case 0:
      return "Profil bien adapté à la CAP longue. Volume progressif recommandé.";
    case 1:
      return "Profil compatible avec CAP longue. Respecter la progression et les récupérations.";
    case 2:
      return "Prudence sur l'allongement CAP. Privilégier le volume vélo pour développer l'endurance sans impact.";
    case 3:
      return "Profil glycolytique + endurance seuil limitée : risque élevé. Favoriser vélo/natation pour le volume.";
  }
}

function generateStaffAnalysis(
  vlamax: number | null,
  tte: number | null,
  level: CAPRiskLevel,
  thresholds: ObjectifThresholds
): string {
  const lines: string[] = [];
  
  // VLamax analysis
  if (vlamax !== null) {
    if (vlamax > thresholds.vlamaxTolerable) {
      lines.push(`VLamax élevée (${vlamax.toFixed(2)}) → fatigue neuromusculaire rapide en CAP.`);
      lines.push(`Seuil idéal pour cet objectif: ≤${thresholds.vlamaxIdeal}.`);
    } else if (vlamax > thresholds.vlamaxIdeal) {
      lines.push(`VLamax modérée (${vlamax.toFixed(2)}) → vigilance sur les volumes CAP élevés.`);
    } else {
      lines.push(`VLamax favorable (${vlamax.toFixed(2)}) → bonne tolérance aux efforts longs CAP.`);
    }
  } else {
    lines.push("VLamax non disponible → évaluation incomplète du risque glycolytique.");
  }
  
  // TTE analysis
  if (tte !== null) {
    const minAcceptable = thresholds.tteTarget - thresholds.tteTolerance;
    if (tte < minAcceptable) {
      lines.push(`TTE bas (${tte} min) → endurance au seuil insuffisante.`);
      lines.push(`Cible TTE pour cet objectif: ≥${thresholds.tteTarget} min.`);
      lines.push(`Allonger la CAP augmente le risque tendineux et osseux.`);
    } else if (tte < thresholds.tteTarget) {
      lines.push(`TTE limite (${tte} min) → développement endurance en cours.`);
    } else {
      lines.push(`TTE correct (${tte} min) → bonne base d'endurance.`);
    }
  } else {
    lines.push("TTE non disponible → évaluation incomplète de l'endurance seuil.");
  }
  
  // Recommendations
  if (level >= 2) {
    lines.push("");
    lines.push("RECOMMANDATION: Privilégier le volume vélo pour développer l'endurance sans impact.");
    if (level === 3) {
      lines.push("Option CAP longue déconseillée sans supervision rapprochée.");
    }
  }
  
  return lines.join("\n");
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computeCAPInjuryRisk(params: CAPRiskParams): CAPInjuryRiskResult {
  const { vlamaxValue, tteValue, objectif } = params;
  
  const thresholds = getThresholdsForObjectif(objectif);
  
  const vlamaxScore = computeVLamaxScore(vlamaxValue, thresholds);
  const tteScore = computeTTEScore(tteValue, thresholds);
  const totalScore = vlamaxScore + tteScore;
  
  const level = mapScoreToLevel(totalScore);
  const { color, bgColor, borderColor } = getLevelColors(level);
  
  return {
    level,
    label: getLevelLabel(level),
    color,
    bgColor,
    borderColor,
    vlamaxScore,
    tteScore,
    totalScore,
    explanation: generateExplanation(vlamaxValue, tteValue, level, thresholds),
    pedagogicalText: generatePedagogicalText(level, objectif),
    staffAnalysis: generateStaffAnalysis(vlamaxValue, tteValue, level, thresholds)
  };
}

// =============================================
// HELPER: Doit-on afficher l'indice?
// =============================================

export function shouldShowCAPInjuryRisk(
  sport: string,
  durationMin: number | null,
  hasLongCAPOption: boolean
): boolean {
  // Seulement pour CAP
  const normalizedSport = sport.toLowerCase();
  const isCAP = normalizedSport.includes("run") || 
                normalizedSport.includes("cap") || 
                normalizedSport.includes("course") ||
                normalizedSport === "running";
  
  if (!isCAP) return false;
  
  // Afficher si durée > 75 min OU option CAP longue
  if (hasLongCAPOption) return true;
  if (durationMin !== null && durationMin > 75) return true;
  
  return false;
}

// =============================================
// HELPER: Niveau de risque pour option CAP
// =============================================

export function getCAPOptionRiskBadge(level: CAPRiskLevel): {
  show: boolean;
  text: string;
  color: string;
} {
  switch (level) {
    case 0:
    case 1:
      return { show: false, text: "", color: "" };
    case 2:
      return {
        show: true,
        text: "Prudence",
        color: "bg-amber-500 text-white"
      };
    case 3:
      return {
        show: true,
        text: "Risque élevé",
        color: "bg-red-500 text-white"
      };
  }
}

// =============================================
// EXPORT ICON HELPER
// =============================================

export function getCAPRiskIcon(level: CAPRiskLevel): string {
  switch (level) {
    case 0: return "✓";
    case 1: return "○";
    case 2: return "⚠️";
    case 3: return "🔴";
  }
}
