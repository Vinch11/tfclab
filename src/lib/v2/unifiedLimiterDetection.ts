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
  | "anaerobic_capacity"  // W' trop bas ou trop haut vs cible objectif
  | "specific_endurance"  // TTE insuffisant
  | "metabolic_efficiency" // FatMax trop bas
  | "availability"        // Fatigue / stress / récupération
  | "neuromuscular"       // Économie / force
  | "none";               // Profil équilibré

// Sous-type pour préciser la faiblesse aérobie
export type AerobicWeaknessDetail = 
  | "vo2max_low"          // Capacité aérobie (plafond) insuffisante
  | "ftp_kg_low"          // Expression aérobie (puissance/poids) insuffisante
  | "both_low"            // Les deux sont limitants
  | "none";               // Pas de faiblesse aérobie

export type UnifiedLever = 
  | "increase_vo2max"
  | "decrease_vlamax"
  | "adjust_anaerobic"
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
  wprimeKj: number | null;         // W' en kJ (capacité anaérobie absolue)
  cpDataQuality?: "good" | "suspect" | "implausible" | null; // Qualité des données CP — si "implausible", W' est exclu du classement
  tte: number | null;
  fatmax: number | null;           // % FTP où FatMax atteint
  economyScore: number | null;     // 0-100
  
  // Disponibilité
  availabilityScore: number | null; // 0-100
  hasHealthAlerts: boolean;
  
  // Contexte
  objectif: string;
  ambition: AmbitionLevel;
  age: number | null;               // Âge pour ajustement des cibles
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
  
  // Détail faiblesse aérobie (si applicable)
  aerobicWeaknessDetail: AerobicWeaknessDetail;
  aerobicWeaknessLabel: string | null;
  
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
  anaerobic_capacity: {
    label: "Capacité anaérobie (W')",
    emoji: "💥",
    description: "W' hors cible : capacité anaérobie inadaptée à l'objectif.",
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
  adjust_anaerobic: { label: "Ajuster W'", emoji: "💥" },
  increase_tte: { label: "↑ TTE", emoji: "⏳" },
  increase_fat_oxidation: { label: "↑ FatMax", emoji: "🔥" },
  recovery: { label: "Récupération", emoji: "🛌" },
  force_endurance: { label: "Force endurance", emoji: "💪" },
  maintain: { label: "Maintenir", emoji: "✅" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// POIDS STRATÉGIQUES PAR OBJECTIF
// ═══════════════════════════════════════════════════════════════════════════════
//
// ⚠️ DIVERGENCE DOCUMENTÉE avec Race Readiness (raceReadinessEffectif.ts)
//
// CES POIDS NE DOIVENT PAS ÊTRE ALIGNÉS avec Race Readiness.
// Les deux systèmes ont des rôles et des architectures fondamentalement différents :
//
// ┌──────────────────────┬─────────────────────────────┬───────────────────────────────┐
// │                      │ RACE READINESS              │ UNIFIED LIMITER               │
// ├──────────────────────┼─────────────────────────────┼───────────────────────────────┤
// │ Question             │ "Est-il prêt pour sa        │ "Quel est son limiteur        │
// │                      │  course ?"                  │  principal ?"                 │
// ├──────────────────────┼─────────────────────────────┼───────────────────────────────┤
// │ Architecture         │ MIN(Potentiel, Dispo)       │ Classement par weightedImpact │
// │                      │ - Pénalités                 │ = gap × weight                │
// ├──────────────────────┼─────────────────────────────┼───────────────────────────────┤
// │ Métriques            │ 4 piliers (VLamax, TTE,     │ 7 domaines (aerobic,          │
// │                      │ FTP/kg, Fraîcheur)          │ glycolytic, anaerobic, tte,   │
// │                      │                             │ fatmax, economy, availability) │
// ├──────────────────────┼─────────────────────────────┼───────────────────────────────┤
// │ Poids = ...          │ % de contribution au score  │ Multiplicateur de priorité    │
// │                      │ (somme = 100%)              │ d'intervention (0-1)          │
// ├──────────────────────┼─────────────────────────────┼───────────────────────────────┤
// │ Sortie               │ Score 0-100 + label         │ L1/L2 limiteurs + roadmap     │
// └──────────────────────┴─────────────────────────────┴───────────────────────────────┘
//
// Exemple concret : Pour un Ironman, glycolytic (VLamax) a un poids de 0.95 ici
// car c'est un levier d'intervention CRITIQUE. Dans Race Readiness, VLamax pèse
// 40% car il représente 40% de la "readiness" globale. Les deux sont cohérents
// dans l'intention : VLamax est crucial pour l'IM — mais exprimé différemment.
//
// ═══════════════════════════════════════════════════════════════════════════════
const STRATEGIC_WEIGHTS: Record<string, Record<string, number>> = {
  IM: { aerobic: 0.85, glycolytic: 0.95, anaerobic: 0.40, tte: 0.90, fatmax: 0.95, economy: 0.75, availability: 0.70 },
  "703": { aerobic: 0.90, glycolytic: 0.85, anaerobic: 0.55, tte: 0.85, fatmax: 0.80, economy: 0.70, availability: 0.65 },
  Marathon: { aerobic: 0.80, glycolytic: 0.90, anaerobic: 0.35, tte: 0.95, fatmax: 0.85, economy: 0.85, availability: 0.70 },
  Semi: { aerobic: 0.85, glycolytic: 0.80, anaerobic: 0.50, tte: 0.85, fatmax: 0.70, economy: 0.80, availability: 0.65 },
  Trail: { aerobic: 0.85, glycolytic: 0.85, anaerobic: 0.45, tte: 0.90, fatmax: 0.90, economy: 0.80, availability: 0.75 },
  Ultra: { aerobic: 0.80, glycolytic: 0.95, anaerobic: 0.30, tte: 0.95, fatmax: 0.95, economy: 0.85, availability: 0.80 },
  Sprint: { aerobic: 0.95, glycolytic: 0.50, anaerobic: 0.90, tte: 0.60, fatmax: 0.40, economy: 0.70, availability: 0.55 },
  Olympic: { aerobic: 0.95, glycolytic: 0.65, anaerobic: 0.75, tte: 0.70, fatmax: 0.55, economy: 0.75, availability: 0.60 },
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

// W' targets (kJ) par objectif et ambition
// Sprint/Olympic: W' élevé nécessaire (efforts courts supra-CP)
// IM/Ultra/Marathon: W' bas acceptable (efforts principalement sous-CP)
const WPRIME_TARGETS: Record<string, Record<string, { min: number; optimal: number; max: number }>> = {
  IM:       { finisher: { min: 10, optimal: 15, max: 25 }, age_group: { min: 12, optimal: 17, max: 25 }, competitor: { min: 14, optimal: 18, max: 26 }, elite: { min: 15, optimal: 20, max: 28 } },
  "703":    { finisher: { min: 12, optimal: 17, max: 27 }, age_group: { min: 14, optimal: 19, max: 28 }, competitor: { min: 15, optimal: 20, max: 28 }, elite: { min: 16, optimal: 22, max: 30 } },
  Marathon: { finisher: { min: 10, optimal: 14, max: 24 }, age_group: { min: 12, optimal: 16, max: 25 }, competitor: { min: 13, optimal: 17, max: 26 }, elite: { min: 14, optimal: 18, max: 27 } },
  Semi:     { finisher: { min: 12, optimal: 16, max: 26 }, age_group: { min: 14, optimal: 18, max: 27 }, competitor: { min: 15, optimal: 19, max: 28 }, elite: { min: 16, optimal: 20, max: 29 } },
  Trail:    { finisher: { min: 12, optimal: 16, max: 26 }, age_group: { min: 13, optimal: 17, max: 27 }, competitor: { min: 14, optimal: 18, max: 28 }, elite: { min: 15, optimal: 20, max: 28 } },
  Ultra:    { finisher: { min: 10, optimal: 14, max: 24 }, age_group: { min: 11, optimal: 15, max: 25 }, competitor: { min: 12, optimal: 16, max: 26 }, elite: { min: 13, optimal: 17, max: 27 } },
  Sprint:   { finisher: { min: 16, optimal: 20, max: 30 }, age_group: { min: 18, optimal: 22, max: 32 }, competitor: { min: 20, optimal: 25, max: 35 }, elite: { min: 22, optimal: 27, max: 38 } },
  Olympic:  { finisher: { min: 14, optimal: 18, max: 28 }, age_group: { min: 16, optimal: 20, max: 30 }, competitor: { min: 18, optimal: 22, max: 32 }, elite: { min: 20, optimal: 24, max: 34 } },
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

function getWprimeTargets(objectif: string, ambition: AmbitionLevel): { min: number; optimal: number; max: number } {
  const normalized = normalizeObjective(objectif);
  const targets = WPRIME_TARGETS[normalized] || WPRIME_TARGETS["703"];
  return targets[ambition] || targets.age_group;
}

// Cibles VO2max par objectif et ambition (ml/kg/min) — VALEURS DE RÉFÉRENCE < 30 ANS
const VO2MAX_TARGETS: Record<string, Record<string, number>> = {
  IM: { finisher: 45, age_group: 52, competitor: 58, elite: 65 },
  "703": { finisher: 48, age_group: 55, competitor: 60, elite: 68 },
  Marathon: { finisher: 48, age_group: 55, competitor: 62, elite: 70 },
  Semi: { finisher: 50, age_group: 55, competitor: 62, elite: 72 },
  Trail: { finisher: 50, age_group: 55, competitor: 60, elite: 68 },
  Ultra: { finisher: 48, age_group: 52, competitor: 58, elite: 65 },
  Sprint: { finisher: 50, age_group: 58, competitor: 65, elite: 75 },
  Olympic: { finisher: 50, age_group: 58, competitor: 62, elite: 72 },
};

/**
 * Calcule le facteur d'ajustement VO2max par âge
 * Basé sur le déclin physiologique naturel (~7-10% par décennie après 30 ans)
 * 
 * < 30 ans : 1.00 (référence)
 * 30-39 ans : 0.95 (−5%)
 * 40-49 ans : 0.88 (−12%)
 * 50-59 ans : 0.80 (−20%)
 * ≥ 60 ans : 0.72 (−28%)
 */
export function getVo2maxAgeFactor(age: number | null): number {
  if (age === null || age < 30) return 1.0;
  if (age < 40) return 0.95;
  if (age < 50) return 0.88;
  if (age < 60) return 0.80;
  return 0.72;
}

/**
 * Retourne un message explicatif sur l'ajustement VO2max par âge
 */
export function getVo2maxAgeAdjustmentLabel(age: number | null): string | null {
  if (age === null || age < 30) return null;
  const factor = getVo2maxAgeFactor(age);
  const reductionPct = Math.round((1 - factor) * 100);
  return `Cible ajustée à ${age} ans (−${reductionPct}% vs < 30 ans)`;
}

/**
 * Retourne la cible VO2max ajustée selon objectif, ambition ET âge
 * 
 * Exemple: Elite Marathon
 * - < 30 ans → 70 ml/kg/min
 * - 40 ans → 70 × 0.88 = 61.6 ml/kg/min
 * - 55 ans → 70 × 0.80 = 56 ml/kg/min
 */
export function getVo2maxTarget(objectif: string, ambition: string, age: number | null = null): number {
  const normalized = normalizeObjective(objectif);
  const targets = VO2MAX_TARGETS[normalized] || VO2MAX_TARGETS["703"];
  const baseTarget = targets[ambition] || targets.age_group;
  
  // Application du facteur âge
  const ageFactor = getVo2maxAgeFactor(age);
  return Math.round(baseTarget * ageFactor * 10) / 10; // Arrondi à 1 décimale
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
  
  // 1. Analyse FTP/kg (Expression Aérobie)
  const ftpKgGap = input.ftpKg !== null 
    ? (input.ftpKg - targets.ftp_kg_min) / targets.ftp_kg_min 
    : 0;
  const ftpKgLimiting = input.ftpKg !== null && input.ftpKg < targets.ftp_kg_min * 0.9;
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
  
  // 1b. Analyse VO2max (Capacité Aérobie) - séparée de FTP/kg
  // Note: VO2max target ajustée selon ambition, objectif ET âge
  const vo2maxTarget = getVo2maxTarget(normalized, input.ambition, input.age);
  const vo2maxGap = input.vo2max !== null 
    ? (input.vo2max - vo2maxTarget) / vo2maxTarget 
    : 0;
  const vo2maxLimiting = input.vo2max !== null && input.vo2max < vo2maxTarget * 0.9;
  gapAnalysis.push({
    metric: "VO2max",
    value: input.vo2max,
    target: vo2maxTarget,
    gap: input.vo2max !== null ? input.vo2max - vo2maxTarget : 0,
    gapPercent: vo2maxGap * 100,
    status: input.vo2max === null ? "acceptable"
      : input.vo2max >= vo2maxTarget ? "optimal"
      : input.vo2max >= vo2maxTarget * 0.9 ? "acceptable"
      : "limiting",
    weight: weights.aerobic * 0.9, // Légèrement moins que FTP/kg car moins directement mesurable
    weightedImpact: vo2maxGap < 0 ? Math.abs(vo2maxGap) * weights.aerobic * 0.9 * 100 : 0,
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
  
  // 2b. Analyse W' (Capacité Anaérobie absolue)
  // W' a une cible bidirectionnelle: trop bas = pas assez de punch, trop haut = profil trop glycolytique
  const wprimeTargets = getWprimeTargets(normalized, input.ambition);
  const wprimeTooLow = input.wprimeKj !== null && input.wprimeKj < wprimeTargets.min;
  const wprimeTooHigh = input.wprimeKj !== null && input.wprimeKj > wprimeTargets.max;
  const wprimeGapValue = input.wprimeKj !== null
    ? wprimeTooLow 
      ? (input.wprimeKj - wprimeTargets.min) / wprimeTargets.min
      : wprimeTooHigh
        ? (input.wprimeKj - wprimeTargets.max) / wprimeTargets.max
        : 0
    : 0;
  gapAnalysis.push({
    metric: "W' (kJ)",
    value: input.wprimeKj,
    target: wprimeTargets.optimal,
    gap: input.wprimeKj !== null ? input.wprimeKj - wprimeTargets.optimal : 0,
    gapPercent: wprimeGapValue * 100,
    status: input.wprimeKj === null ? "acceptable"
      : input.wprimeKj >= wprimeTargets.min && input.wprimeKj <= wprimeTargets.max ? "optimal"
      : (input.wprimeKj >= wprimeTargets.min * 0.85 && input.wprimeKj <= wprimeTargets.max * 1.15) ? "acceptable"
      : "limiting",
    weight: weights.anaerobic,
    weightedImpact: (wprimeTooLow || wprimeTooHigh) 
      ? Math.abs(wprimeGapValue) * weights.anaerobic * 100 
      : 0,
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
      case "VO2max":
        primaryLimiter = "aerobic_engine";
        primaryLever = "increase_vo2max";
        break;
      case "VLamax":
        primaryLimiter = "glycolytic";
        primaryLever = "decrease_vlamax";
        break;
      case "W' (kJ)":
        primaryLimiter = "anaerobic_capacity";
        primaryLever = "adjust_anaerobic";
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
  
  // Calcul du détail de faiblesse aérobie
  const ftpKgAnalysis = gapAnalysis.find(g => g.metric === "FTP/kg");
  const vo2maxAnalysis = gapAnalysis.find(g => g.metric === "VO2max");
  const ftpKgIsLimiting = ftpKgAnalysis?.status === "limiting";
  const vo2maxIsLimiting = vo2maxAnalysis?.status === "limiting";
  
  let aerobicWeaknessDetail: AerobicWeaknessDetail = "none";
  let aerobicWeaknessLabel: string | null = null;
  
  if (primaryLimiter === "aerobic_engine") {
    if (ftpKgIsLimiting && vo2maxIsLimiting) {
      aerobicWeaknessDetail = "both_low";
      aerobicWeaknessLabel = "Capacité (VO₂max) ET Expression (FTP/kg) insuffisantes";
    } else if (vo2maxIsLimiting) {
      aerobicWeaknessDetail = "vo2max_low";
      aerobicWeaknessLabel = "Capacité aérobie (VO₂max) insuffisante — plafond trop bas";
    } else if (ftpKgIsLimiting) {
      aerobicWeaknessDetail = "ftp_kg_low";
      aerobicWeaknessLabel = "Expression aérobie (FTP/kg) insuffisante — puissance relative trop faible";
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
    input.wprimeKj,
    input.tte, 
    input.fatmax, 
    input.economyScore, 
    input.availabilityScore
  ].filter(v => v !== null).length;
  const confidence = dataCount / 7;
  
  const limiterInfo = LIMITER_INFO[primaryLimiter];
  const leverInfo = LEVER_INFO[primaryLever];
  
  return {
    primaryLimiter,
    limiterLabel: limiterInfo.label,
    limiterEmoji: limiterInfo.emoji,
    limiterExplanation: primaryLimiter === "aerobic_engine" && aerobicWeaknessLabel
      ? `${limiterInfo.description} → ${aerobicWeaknessLabel}`
      : limiterInfo.description,
    
    aerobicWeaknessDetail,
    aerobicWeaknessLabel,
    
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
    version: "1.1.0",
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
    case "anaerobic_capacity": return "Profil Métabolique";
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
    case "anaerobic_capacity": return "metabolic";
    case "specific_endurance": return "endurance";
    case "metabolic_efficiency": return "nutrition";
    case "neuromuscular": return "economy";
    case "availability": return "none";
    default: return "none";
  }
}
