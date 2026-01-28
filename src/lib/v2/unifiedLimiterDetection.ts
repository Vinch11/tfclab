/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNIFIED LIMITER DETECTION — TFCL METHOD™
 * Single Source of Truth for Limiting Factor Identification
 * 
 * OBJECTIF:
 * Garantir que tous les outils (Compass, Matrix, Report, Lorang) utilisent
 * la MÊME logique pour identifier le facteur limitant principal.
 * 
 * ARCHITECTURE:
 * - Inputs: données physiologiques normalisées
 * - Output: facteur limitant + leviers + confiance
 * - Utilisé par: TFCLDecisionMatrix, StaffReport, LorangEngine, Compass
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { 
  getTargetsForAmbition, 
  normalizeObjective,
  type ObjectiveTargets 
} from "@/lib/physiologicalTargets";
import { AmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type UnifiedLimiter = 
  | "aerobic_engine"      // VO2max / FTP/kg insuffisant
  | "glycolytic"          // VLamax trop haute (consommation glycogène excessive)
  | "specific_endurance"  // TTE insuffisant
  | "metabolic_efficiency" // FatMax trop bas
  | "availability"        // Fatigue / stress / récupération
  | "neuromuscular"       // Économie / force
  | "none";               // Profil équilibré

export type UnifiedLever = 
  | "increase_vo2max"
  | "decrease_vlamax"
  | "increase_tte"
  | "increase_fat_oxidation"
  | "recovery"
  | "force_endurance"
  | "maintain";

export interface UnifiedLimiterInput {
  // Données physiologiques (valeurs effectives)
  vo2max: number | null;
  ftpKg: number | null;
  vlamax: number | null;
  tte: number | null;
  fatmax: number | null;           // % FTP où FatMax atteint
  economyScore: number | null;     // 0-100
  
  // Disponibilité
  availabilityScore: number | null; // 0-100
  hasHealthAlerts: boolean;
  
  // Contexte
  objectif: string;
  ambition: AmbitionLevel;
}

export interface UnifiedGapAnalysis {
  metric: string;
  value: number | null;
  target: number;
  gap: number;           // Négatif = en dessous de la cible
  gapPercent: number;    // Gap en %
  status: "optimal" | "acceptable" | "limiting";
  weight: number;        // Importance stratégique (0-1)
  weightedImpact: number; // Gap × weight (pour classement)
}

export interface UnifiedLimiterResult {
  // Limiteur principal
  primaryLimiter: UnifiedLimiter;
  limiterLabel: string;
  limiterEmoji: string;
  limiterExplanation: string;
  
  // Levier prioritaire
  primaryLever: UnifiedLever;
  leverLabel: string;
  leverEmoji: string;
  
  // Analyse par domaine
  gapAnalysis: UnifiedGapAnalysis[];
  
  // Robustesse de la décision
  isRobust: boolean;           // true si gap clair entre limiteurs
  robustnessScore: number;     // 0-100
  robustnessNote: string;
  
  // Confiance
  confidence: number;          // 0-1
  confidenceLabel: string;
  
  // Métadonnées
  targetsUsed: ObjectiveTargets;
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES OFFICIELLES
// ═══════════════════════════════════════════════════════════════════════════════

export const LIMITER_INFO: Record<UnifiedLimiter, {
  label: string;
  emoji: string;
  description: string;
}> = {
  aerobic_engine: {
    label: "Moteur aérobie",
    emoji: "🫁",
    description: "Le plafond aérobie (VO2max / FTP) limite la performance.",
  },
  glycolytic: {
    label: "Métabolisme glycolytique",
    emoji: "⚡",
    description: "VLamax trop haute : consommation glycogène excessive.",
  },
  specific_endurance: {
    label: "Endurance spécifique",
    emoji: "⏱️",
    description: "TTE insuffisant : difficulté à maintenir l'effort.",
  },
  metabolic_efficiency: {
    label: "Efficacité métabolique",
    emoji: "🔥",
    description: "FatMax bas : dépendance aux glucides trop élevée.",
  },
  availability: {
    label: "Disponibilité",
    emoji: "🔋",
    description: "Fatigue ou stress limitent l'expression du potentiel.",
  },
  neuromuscular: {
    label: "Neuromusculaire",
    emoji: "💪",
    description: "Économie de geste ou force musculaire à développer.",
  },
  none: {
    label: "Profil équilibré",
    emoji: "✅",
    description: "Aucun facteur limitant majeur identifié.",
  },
};

export const LEVER_INFO: Record<UnifiedLever, {
  label: string;
  emoji: string;
}> = {
  increase_vo2max: { label: "↑ VO2max", emoji: "📈" },
  decrease_vlamax: { label: "↓ VLamax", emoji: "📉" },
  increase_tte: { label: "↑ TTE", emoji: "⏳" },
  increase_fat_oxidation: { label: "↑ FatMax", emoji: "🔥" },
  recovery: { label: "Récupération", emoji: "🛌" },
  force_endurance: { label: "Force endurance", emoji: "💪" },
  maintain: { label: "Maintenir", emoji: "✅" },
};

// Poids stratégiques par objectif (importance de chaque domaine)
const STRATEGIC_WEIGHTS: Record<string, Record<string, number>> = {
  IM: { aerobic: 0.85, glycolytic: 0.95, tte: 0.90, fatmax: 0.95, economy: 0.75, availability: 0.70 },
  "703": { aerobic: 0.90, glycolytic: 0.85, tte: 0.85, fatmax: 0.80, economy: 0.70, availability: 0.65 },
  Marathon: { aerobic: 0.80, glycolytic: 0.90, tte: 0.95, fatmax: 0.85, economy: 0.85, availability: 0.70 },
  Semi: { aerobic: 0.85, glycolytic: 0.80, tte: 0.85, fatmax: 0.70, economy: 0.80, availability: 0.65 },
  Trail: { aerobic: 0.85, glycolytic: 0.85, tte: 0.90, fatmax: 0.90, economy: 0.80, availability: 0.75 },
  Ultra: { aerobic: 0.80, glycolytic: 0.95, tte: 0.95, fatmax: 0.95, economy: 0.85, availability: 0.80 },
  Sprint: { aerobic: 0.95, glycolytic: 0.50, tte: 0.60, fatmax: 0.40, economy: 0.70, availability: 0.55 },
  Olympic: { aerobic: 0.95, glycolytic: 0.65, tte: 0.70, fatmax: 0.55, economy: 0.75, availability: 0.60 },
};

// FatMax targets (% FTP) par objectif
const FATMAX_TARGETS: Record<string, { min: number; optimal: number }> = {
  IM: { min: 55, optimal: 65 },
  "703": { min: 50, optimal: 60 },
  Marathon: { min: 52, optimal: 62 },
  Semi: { min: 48, optimal: 55 },
  Trail: { min: 55, optimal: 65 },
  Ultra: { min: 60, optimal: 70 },
  Sprint: { min: 35, optimal: 42 },
  Olympic: { min: 42, optimal: 50 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getWeights(objectif: string): Record<string, number> {
  const normalized = normalizeObjective(objectif);
  return STRATEGIC_WEIGHTS[normalized] || STRATEGIC_WEIGHTS["703"];
}

function getFatmaxTargets(objectif: string): { min: number; optimal: number } {
  const normalized = normalizeObjective(objectif);
  return FATMAX_TARGETS[normalized] || FATMAX_TARGETS["703"];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export function detectUnifiedLimiter(input: UnifiedLimiterInput): UnifiedLimiterResult {
  const normalized = normalizeObjective(input.objectif);
  const targets = getTargetsForAmbition(normalized, input.ambition);
  const weights = getWeights(normalized);
  const fatmaxTargets = getFatmaxTargets(normalized);
  
  const gapAnalysis: UnifiedGapAnalysis[] = [];
  
  // 1. Analyse FTP/kg (Aerobic Engine)
  const ftpKgGap = input.ftpKg !== null 
    ? (input.ftpKg - targets.ftp_kg_min) / targets.ftp_kg_min 
    : 0;
  gapAnalysis.push({
    metric: "FTP/kg",
    value: input.ftpKg,
    target: targets.ftp_kg_min,
    gap: input.ftpKg !== null ? input.ftpKg - targets.ftp_kg_min : 0,
    gapPercent: ftpKgGap * 100,
    status: input.ftpKg === null ? "acceptable" 
      : input.ftpKg >= targets.ftp_kg_min ? "optimal" 
      : input.ftpKg >= targets.ftp_kg_min * 0.9 ? "acceptable" 
      : "limiting",
    weight: weights.aerobic,
    weightedImpact: ftpKgGap < 0 ? Math.abs(ftpKgGap) * weights.aerobic * 100 : 0,
  });
  
  // 2. Analyse VLamax (Glycolytic)
  // VLamax: plus bas est mieux pour endurance (inversé)
  const vlamaxGap = input.vlamax !== null 
    ? (input.vlamax - targets.vlamax.optimal) / targets.vlamax.optimal 
    : 0;
  const vlamaxExcess = input.vlamax !== null && input.vlamax > targets.vlamax.max;
  gapAnalysis.push({
    metric: "VLamax",
    value: input.vlamax,
    target: targets.vlamax.optimal,
    gap: input.vlamax !== null ? input.vlamax - targets.vlamax.optimal : 0,
    gapPercent: vlamaxGap * 100,
    status: input.vlamax === null ? "acceptable"
      : input.vlamax <= targets.vlamax.optimal ? "optimal"
      : input.vlamax <= targets.vlamax.max ? "acceptable"
      : "limiting",
    weight: weights.glycolytic,
    weightedImpact: vlamaxExcess ? (input.vlamax! - targets.vlamax.max) * 100 * weights.glycolytic : 0,
  });
  
  // 3. Analyse TTE (Specific Endurance)
  const tteGap = input.tte !== null 
    ? (input.tte - targets.tte_min) / targets.tte_min 
    : 0;
  gapAnalysis.push({
    metric: "TTE",
    value: input.tte,
    target: targets.tte_min,
    gap: input.tte !== null ? input.tte - targets.tte_min : 0,
    gapPercent: tteGap * 100,
    status: input.tte === null ? "acceptable"
      : input.tte >= targets.tte_min ? "optimal"
      : input.tte >= targets.tte_min * 0.85 ? "acceptable"
      : "limiting",
    weight: weights.tte,
    weightedImpact: tteGap < 0 ? Math.abs(tteGap) * weights.tte * 100 : 0,
  });
  
  // 4. Analyse FatMax (Metabolic Efficiency)
  const fatmaxGap = input.fatmax !== null 
    ? (input.fatmax - fatmaxTargets.optimal) / fatmaxTargets.optimal 
    : 0;
  gapAnalysis.push({
    metric: "FatMax",
    value: input.fatmax,
    target: fatmaxTargets.optimal,
    gap: input.fatmax !== null ? input.fatmax - fatmaxTargets.optimal : 0,
    gapPercent: fatmaxGap * 100,
    status: input.fatmax === null ? "acceptable"
      : input.fatmax >= fatmaxTargets.optimal ? "optimal"
      : input.fatmax >= fatmaxTargets.min ? "acceptable"
      : "limiting",
    weight: weights.fatmax,
    weightedImpact: fatmaxGap < 0 ? Math.abs(fatmaxGap) * weights.fatmax * 100 : 0,
  });
  
  // 5. Analyse Économie (Neuromuscular)
  const economyGap = input.economyScore !== null 
    ? (input.economyScore - 70) / 70 
    : 0;
  gapAnalysis.push({
    metric: "Économie",
    value: input.economyScore,
    target: 70,
    gap: input.economyScore !== null ? input.economyScore - 70 : 0,
    gapPercent: economyGap * 100,
    status: input.economyScore === null ? "acceptable"
      : input.economyScore >= 70 ? "optimal"
      : input.economyScore >= 50 ? "acceptable"
      : "limiting",
    weight: weights.economy,
    weightedImpact: economyGap < 0 ? Math.abs(economyGap) * weights.economy * 100 : 0,
  });
  
  // 6. Analyse Disponibilité
  const availabilityGap = input.availabilityScore !== null 
    ? (input.availabilityScore - 70) / 70 
    : 0;
  gapAnalysis.push({
    metric: "Disponibilité",
    value: input.availabilityScore,
    target: 70,
    gap: input.availabilityScore !== null ? input.availabilityScore - 70 : 0,
    gapPercent: availabilityGap * 100,
    status: input.hasHealthAlerts ? "limiting"
      : input.availabilityScore === null ? "acceptable"
      : input.availabilityScore >= 70 ? "optimal"
      : input.availabilityScore >= 50 ? "acceptable"
      : "limiting",
    weight: weights.availability,
    weightedImpact: (input.hasHealthAlerts ? 50 : 0) + 
      (availabilityGap < 0 ? Math.abs(availabilityGap) * weights.availability * 100 : 0),
  });
  
  // Tri par impact pondéré (plus grand = plus limitant)
  const sortedGaps = [...gapAnalysis].sort((a, b) => b.weightedImpact - a.weightedImpact);
  
  // Identification du limiteur principal
  const topGap = sortedGaps[0];
  const secondGap = sortedGaps[1];
  
  // Si le top gap est significatif
  let primaryLimiter: UnifiedLimiter = "none";
  let primaryLever: UnifiedLever = "maintain";
  
  if (topGap.weightedImpact > 5) {
    switch (topGap.metric) {
      case "FTP/kg":
        primaryLimiter = "aerobic_engine";
        primaryLever = "increase_vo2max";
        break;
      case "VLamax":
        primaryLimiter = "glycolytic";
        primaryLever = "decrease_vlamax";
        break;
      case "TTE":
        primaryLimiter = "specific_endurance";
        primaryLever = "increase_tte";
        break;
      case "FatMax":
        primaryLimiter = "metabolic_efficiency";
        primaryLever = "increase_fat_oxidation";
        break;
      case "Économie":
        primaryLimiter = "neuromuscular";
        primaryLever = "force_endurance";
        break;
      case "Disponibilité":
        primaryLimiter = "availability";
        primaryLever = "recovery";
        break;
    }
  }
  
  // Calcul de la robustesse (gap clair entre 1er et 2ème limiteur)
  const gapDifference = topGap.weightedImpact - secondGap.weightedImpact;
  const isRobust = gapDifference > 10 || topGap.weightedImpact > 20;
  const robustnessScore = clamp(gapDifference * 5 + 50, 0, 100);
  
  // Calcul de la confiance globale
  const dataCount = [
    input.ftpKg, 
    input.vlamax, 
    input.tte, 
    input.fatmax, 
    input.economyScore, 
    input.availabilityScore
  ].filter(v => v !== null).length;
  const confidence = dataCount / 6;
  
  const limiterInfo = LIMITER_INFO[primaryLimiter];
  const leverInfo = LEVER_INFO[primaryLever];
  
  return {
    primaryLimiter,
    limiterLabel: limiterInfo.label,
    limiterEmoji: limiterInfo.emoji,
    limiterExplanation: limiterInfo.description,
    
    primaryLever,
    leverLabel: leverInfo.label,
    leverEmoji: leverInfo.emoji,
    
    gapAnalysis,
    
    isRobust,
    robustnessScore,
    robustnessNote: isRobust 
      ? "Décision claire — facteur limitant nettement identifié"
      : "Décision marginale — plusieurs facteurs proches, validation coach recommandée",
    
    confidence,
    confidenceLabel: confidence >= 0.8 ? "Très élevée" 
      : confidence >= 0.6 ? "Élevée"
      : confidence >= 0.4 ? "Moyenne"
      : "Limitée",
    
    targetsUsed: targets,
    version: "1.0.0",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mapper le limiteur unifié vers le format Compass (pour compatibilité)
 */
export function mapLimiterToCompassAxis(limiter: UnifiedLimiter): string {
  switch (limiter) {
    case "aerobic_engine": return "Capacité Aérobie";
    case "glycolytic": return "Profil Métabolique";
    case "specific_endurance": return "Tolérance à l'Effort";
    case "metabolic_efficiency": return "Profil Métabolique";
    case "neuromuscular": return "Robustesse";
    case "availability": return "Robustesse";
    default: return "Équilibré";
  }
}

/**
 * Mapper le limiteur unifié vers le format StaffReport (pour compatibilité)
 */
export function mapLimiterToReportType(limiter: UnifiedLimiter): string {
  switch (limiter) {
    case "aerobic_engine": return "power";
    case "glycolytic": return "metabolic";
    case "specific_endurance": return "endurance";
    case "metabolic_efficiency": return "nutrition";
    case "neuromuscular": return "economy";
    case "availability": return "none";
    default: return "none";
  }
}
