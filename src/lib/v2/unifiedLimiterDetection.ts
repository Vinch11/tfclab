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
  getVLamaxRange,
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
  
  // Running-specific
  vma: number | null;              // VMA en km/h — utilisé à la place de FTP/kg en mode running
  sportFocus?: "bike" | "run" | "tri"; // Discipline principale
  
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
  status: "optimal" | "acceptable" | "limiting" | "unknown";
  weight: number;        // Importance stratégique (0-1)
  weightedImpact: number; // Gap × weight (pour classement)
}

/**
 * Catégorie physiologique de limiteur — regroupement des métriques individuelles.
 * Utilisé pour aligner Coaching Compass et Carte Facteurs Limitants
 * sur la même hiérarchie (somme cumulée des impacts par catégorie).
 */
export type LimiterCategory =
  | "aerobic_power"        // VO2max, FTP/kg, VMA
  | "glycolytic"           // VLamax
  | "metabolic_endurance"  // TTE, FatMax
  | "durability"           // Robustesse, Durabilité
  | "neuromuscular"        // W', Économie
  | "unknown";

export interface CategoryRankingEntry {
  category: LimiterCategory;
  metrics: UnifiedGapAnalysis[];
  worstGap: number;        // Le pire écart individuel (le plus négatif)
  totalImpact: number;     // Somme des |weightedImpact| de toutes les métriques limitantes
}

/**
 * Mappe une métrique individuelle vers sa catégorie physiologique.
 * Source unique partagée entre le moteur et la carte Limiteurs.
 */
export const METRIC_TO_CATEGORY: Record<string, LimiterCategory> = {
  "VO2max": "aerobic_power",
  "FTP/kg": "aerobic_power",
  "VMA": "aerobic_power",
  "VLamax": "glycolytic",
  "TTE": "metabolic_endurance",
  "FatMax": "metabolic_endurance",
  "Robustesse": "durability",
  "Durabilité": "durability",
  "Économie": "neuromuscular",
  "W'": "neuromuscular",
  "W' (kJ)": "neuromuscular",
};

/**
 * Mappe une catégorie de limiteur vers le `UnifiedLimiter` correspondant.
 */
const CATEGORY_TO_UNIFIED_LIMITER: Record<LimiterCategory, UnifiedLimiter> = {
  aerobic_power: "aerobic_engine",
  glycolytic: "glycolytic",
  metabolic_endurance: "specific_endurance",
  durability: "specific_endurance",
  neuromuscular: "neuromuscular",
  unknown: "none",
};

const CATEGORY_TO_LEVER: Record<LimiterCategory, UnifiedLever> = {
  aerobic_power: "increase_vo2max",
  glycolytic: "decrease_vlamax",
  metabolic_endurance: "increase_tte",
  durability: "increase_tte",
  neuromuscular: "force_endurance",
  unknown: "maintain",
};

/**
 * Construit le classement par catégorie physiologique à partir des gaps individuels.
 * Source de vérité unique pour Compass + Carte Facteurs Limitants.
 */
export function buildCategoryRanking(gapAnalysis: UnifiedGapAnalysis[]): CategoryRankingEntry[] {
  const groups = new Map<LimiterCategory, CategoryRankingEntry>();

  for (const gap of gapAnalysis) {
    // On ne retient que les métriques limitantes (ou clairement en dessous de la cible)
    if (gap.status === "unknown" || gap.value === null) continue;
    if (gap.status !== "limiting" && gap.gap >= -3) continue;

    const category = METRIC_TO_CATEGORY[gap.metric] ?? "unknown";
    const impact = Math.abs(gap.weightedImpact ?? gap.gap);
    const existing = groups.get(category);
    if (existing) {
      existing.metrics.push(gap);
      existing.worstGap = Math.min(existing.worstGap, gap.gap);
      existing.totalImpact += impact;
    } else {
      groups.set(category, {
        category,
        metrics: [gap],
        worstGap: gap.gap,
        totalImpact: impact,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.totalImpact - a.totalImpact);
}

export interface FatigueWarning {
  active: boolean;
  level: "moderate" | "high" | "critical" | null;
  message: string | null;
}

export interface UnifiedLimiterResult {
  // Limiteur principal (JAMAIS "availability" — voir fatigueWarning)
  primaryLimiter: UnifiedLimiter;
  limiterLabel: string;
  limiterEmoji: string;
  limiterExplanation: string;
  
  // ⚠️ Avertissement fatigue (remplace l'ancien limiteur "availability")
  // La disponibilité n'est PAS un limiteur physiologique : elle ne conditionne
  // pas la périodisation. Elle génère un avertissement contextuel.
  fatigueWarning: FatigueWarning;
  
  // ⚠️ Avertissement données insuffisantes
  insufficientData: boolean;         // true si trop de métriques clés manquent
  insufficientDataMessage: string | null;
  missingMetrics: string[];          // Liste des métriques manquantes
  
  // Détail faiblesse aérobie (si applicable)
  aerobicWeaknessDetail: AerobicWeaknessDetail;
  aerobicWeaknessLabel: string | null;
  
  // Levier prioritaire
  primaryLever: UnifiedLever;
  leverLabel: string;
  leverEmoji: string;
  
  // Analyse par domaine
  gapAnalysis: UnifiedGapAnalysis[];

  // ✅ Classement hybride par catégorie physiologique (somme des impacts)
  // Source de vérité partagée Compass + Carte Facteurs Limitants
  categoryRanking: CategoryRankingEntry[];

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
    description: "Le plafond aérobie (VO2max / VMA ou FTP) limite la performance.",
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
// ⚠️ DIVERGENCE DOCUMENTÉE avec Potentiel Physiologique (potentielPhysiologiqueEffectif.ts)
//
// CES POIDS NE DOIVENT PAS ÊTRE ALIGNÉS avec Potentiel Physiologique.
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
// car c'est un levier d'intervention CRITIQUE. Dans Potentiel Physiologique, VLamax pèse
// 40% car il représente 40% de la "readiness" globale. Les deux sont cohérents
// dans l'intention : VLamax est crucial pour l'IM — mais exprimé différemment.
//
// ═══════════════════════════════════════════════════════════════════════════════
const STRATEGIC_WEIGHTS: Record<string, Record<string, number>> = {
  IM: { aerobic: 0.85, glycolytic: 0.95, anaerobic: 0.40, tte: 0.90, fatmax: 0.95, economy: 0.75 },
  "703": { aerobic: 0.90, glycolytic: 0.85, anaerobic: 0.55, tte: 0.85, fatmax: 0.80, economy: 0.70 },
  Marathon: { aerobic: 0.80, glycolytic: 0.90, anaerobic: 0.35, tte: 0.95, fatmax: 0.85, economy: 0.90 },
  Semi: { aerobic: 0.85, glycolytic: 0.80, anaerobic: 0.50, tte: 0.85, fatmax: 0.70, economy: 0.85 },
  "10km": { aerobic: 0.90, glycolytic: 0.70, anaerobic: 0.60, tte: 0.75, fatmax: 0.55, economy: 0.80 },
  "5K": { aerobic: 0.95, glycolytic: 0.55, anaerobic: 0.70, tte: 0.65, fatmax: 0.40, economy: 0.75 },
  Trail: { aerobic: 0.85, glycolytic: 0.85, anaerobic: 0.45, tte: 0.90, fatmax: 0.90, economy: 0.85 },
  Ultra: { aerobic: 0.80, glycolytic: 0.95, anaerobic: 0.30, tte: 0.95, fatmax: 0.95, economy: 0.90 },
  Sprint: { aerobic: 0.95, glycolytic: 0.50, anaerobic: 0.90, tte: 0.60, fatmax: 0.40, economy: 0.70 },
  Olympic: { aerobic: 0.95, glycolytic: 0.65, anaerobic: 0.75, tte: 0.70, fatmax: 0.55, economy: 0.75 },
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
// world_class = top 3% AG : extension monotone du palier `elite`
// (+1 à +2 kJ optimal selon objectif, max élargi de +1 à +2 kJ)
const WPRIME_TARGETS: Record<string, Record<string, { min: number; optimal: number; max: number }>> = {
  IM:       { finisher: { min: 10, optimal: 15, max: 25 }, age_group: { min: 12, optimal: 17, max: 25 }, competitor: { min: 14, optimal: 18, max: 26 }, elite: { min: 15, optimal: 20, max: 28 }, world_class: { min: 16, optimal: 22, max: 30 } },
  "703":    { finisher: { min: 12, optimal: 17, max: 27 }, age_group: { min: 14, optimal: 19, max: 28 }, competitor: { min: 15, optimal: 20, max: 28 }, elite: { min: 16, optimal: 22, max: 30 }, world_class: { min: 17, optimal: 24, max: 32 } },
  Marathon: { finisher: { min: 10, optimal: 14, max: 24 }, age_group: { min: 12, optimal: 16, max: 25 }, competitor: { min: 13, optimal: 17, max: 26 }, elite: { min: 14, optimal: 18, max: 27 }, world_class: { min: 15, optimal: 20, max: 29 } },
  Semi:     { finisher: { min: 12, optimal: 16, max: 26 }, age_group: { min: 14, optimal: 18, max: 27 }, competitor: { min: 15, optimal: 19, max: 28 }, elite: { min: 16, optimal: 20, max: 29 }, world_class: { min: 17, optimal: 22, max: 31 } },
  Trail:    { finisher: { min: 12, optimal: 16, max: 26 }, age_group: { min: 13, optimal: 17, max: 27 }, competitor: { min: 14, optimal: 18, max: 28 }, elite: { min: 15, optimal: 20, max: 28 }, world_class: { min: 16, optimal: 22, max: 30 } },
  Ultra:    { finisher: { min: 10, optimal: 14, max: 24 }, age_group: { min: 11, optimal: 15, max: 25 }, competitor: { min: 12, optimal: 16, max: 26 }, elite: { min: 13, optimal: 17, max: 27 }, world_class: { min: 14, optimal: 19, max: 29 } },
  Sprint:   { finisher: { min: 16, optimal: 20, max: 30 }, age_group: { min: 18, optimal: 22, max: 32 }, competitor: { min: 20, optimal: 25, max: 35 }, elite: { min: 22, optimal: 27, max: 38 }, world_class: { min: 24, optimal: 30, max: 42 } },
  Olympic:  { finisher: { min: 14, optimal: 18, max: 28 }, age_group: { min: 16, optimal: 20, max: 30 }, competitor: { min: 18, optimal: 22, max: 32 }, elite: { min: 20, optimal: 24, max: 34 }, world_class: { min: 22, optimal: 27, max: 37 } },
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
  "10km": { finisher: 48, age_group: 55, competitor: 62, elite: 72 },
  "5K": { finisher: 48, age_group: 56, competitor: 64, elite: 75 },
  Trail: { finisher: 50, age_group: 55, competitor: 60, elite: 68 },
  Ultra: { finisher: 48, age_group: 52, competitor: 58, elite: 65 },
  Sprint: { finisher: 50, age_group: 58, competitor: 65, elite: 75 },
  Olympic: { finisher: 50, age_group: 58, competitor: 62, elite: 72 },
};

/**
 * Calcule le facteur d'ajustement VO2max par âge
 * Basé sur Hawkins & Wiswell 2003, Tanaka & Seals 2008 :
 * déclin ~5-7% par décennie chez les athlètes entraînés Masters
 * 
 * < 30 ans : 1.00 (référence)
 * 30-39 ans : 0.96 (−4%)
 * 40-49 ans : 0.91 (−9%)
 * 50-59 ans : 0.85 (−15%)
 * ≥ 60 ans : 0.78 (−22%)
 */
export function getVo2maxAgeFactor(age: number | null): number {
  if (age === null || age < 30) return 1.0;
  if (age < 40) return 0.96;
  if (age < 50) return 0.91;
  if (age < 60) return 0.85;
  return 0.78;
}

/**
 * Facteur d'ajustement par âge pour les métriques de performance (FTP/kg, VMA)
 * Déclin plus modéré que le VO2max (~5-7% par décennie après 30 ans)
 * 
 * Basé sur Peinado et al. 2018, Lepers et al. 2013 :
 * déclin ~5-7% par décennie pour FTP/VMA chez les Masters.
 * 
 * < 30 ans : 1.00
 * 30-39 ans : 0.98 (−2%)
 * 40-49 ans : 0.95 (−5%)
 * 50-59 ans : 0.91 (−9%)
 * ≥ 60 ans : 0.86 (−14%)
 */
export function getPerformanceAgeFactor(age: number | null): number {
  if (age === null || age < 30) return 1.0;
  if (age < 40) return 0.98;
  if (age < 50) return 0.95;
  if (age < 60) return 0.91;
  return 0.86;
}

/**
 * Facteur d'ajustement TTE par âge
 * Le TTE décline moins vite — l'endurance se maintient mieux
 * (Lepers & Cattagni 2012, Tanaka & Seals 2008)
 * 
 * < 30 ans : 1.00
 * 30-39 ans : 0.99 (−1%)
 * 40-49 ans : 0.97 (−3%)
 * 50-59 ans : 0.94 (−6%)
 * ≥ 60 ans : 0.90 (−10%)
 */
export function getTTEAgeFactor(age: number | null): number {
  if (age === null || age < 30) return 1.0;
  if (age < 40) return 0.99;
  if (age < 50) return 0.97;
  if (age < 60) return 0.94;
  return 0.90;
}

/**
 * Retourne un message explicatif sur l'ajustement par âge
 */
export function getVo2maxAgeAdjustmentLabel(age: number | null): string | null {
  if (age === null || age < 30) return null;
  const factor = getVo2maxAgeFactor(age);
  const reductionPct = Math.round((1 - factor) * 100);
  return `Cible ajustée à ${age} ans (−${reductionPct}% vs < 30 ans)`;
}

/**
 * Retourne la cible VO2max ajustée selon objectif, ambition ET âge
 */
export function getVo2maxTarget(objectif: string, ambition: string, age: number | null = null): number {
  const normalized = normalizeObjective(objectif);
  const targets = VO2MAX_TARGETS[normalized] || VO2MAX_TARGETS["703"];
  const baseTarget = targets[ambition] || targets.age_group;
  
  const ageFactor = getVo2maxAgeFactor(age);
  return Math.round(baseTarget * ageFactor * 10) / 10;
}

/**
 * Ajuste une cible de performance (FTP/kg, VMA) selon l'âge
 */
function adjustPerformanceTarget(baseTarget: number, age: number | null): number {
  return Math.round(baseTarget * getPerformanceAgeFactor(age) * 100) / 100;
}

/**
 * Ajuste une cible TTE selon l'âge
 */
function adjustTTETarget(baseTarget: number, age: number | null): number {
  return Math.round(baseTarget * getTTEAgeFactor(age));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export function detectUnifiedLimiter(input: UnifiedLimiterInput): UnifiedLimiterResult {
  const normalized = normalizeObjective(input.objectif);
  const targets = getTargetsForAmbition(normalized, input.ambition);
  const weights = getWeights(normalized);
  const fatmaxTargets = getFatmaxTargets(normalized);
  
  // Déterminer si on est en mode running
  // Mode running = sportFocus "run" OU objectif running-only
  // (Note: on n'exige PLUS que ftpKg soit null — un coureur peut avoir des
  // données vélo résiduelles dans son snapshot, on doit quand même utiliser
  // VMA comme métrique d'expression aérobie pour un objectif course.)
  const RUNNING_OBJECTIVES = ["Marathon", "Semi", "10km", "10K", "5K", "Trail", "TrailShort", "TrailLong", "TrailMountain", "TrailUltra", "Ultra", "StartToRun"];
  const isRunningMode = input.sportFocus === "run" ||
    (RUNNING_OBJECTIVES.includes(normalized) && input.vma !== null) ||
    (RUNNING_OBJECTIVES.includes(input.objectif) && input.vma !== null);
  const hasVmaTarget = targets.vma_min !== undefined && targets.vma_min !== null;
  const useVma = isRunningMode && hasVmaTarget;
  
  const gapAnalysis: UnifiedGapAnalysis[] = [];
  
  // 1. Analyse Expression Aérobie — VMA (running) ou FTP/kg (vélo/tri)
  if (useVma) {
    // Mode Running : VMA remplace FTP/kg (cible ajustée selon l'âge)
    const vmaTarget = adjustPerformanceTarget(targets.vma_min!, input.age);
    const vmaGap = input.vma !== null 
      ? (input.vma - vmaTarget) / vmaTarget 
      : 0;
    gapAnalysis.push({
      metric: "VMA",
      value: input.vma,
      target: vmaTarget,
      gap: input.vma !== null ? input.vma - vmaTarget : 0,
      gapPercent: vmaGap * 100,
      status: input.vma === null ? "unknown" 
        : input.vma >= vmaTarget ? "optimal" 
        : input.vma >= vmaTarget * 0.9 ? "acceptable" 
        : "limiting",
      weight: weights.aerobic,
      weightedImpact: vmaGap < 0 ? Math.abs(vmaGap) * weights.aerobic * 100 : 0,
    });
  } else {
    // Mode Vélo/Tri : FTP/kg (cible ajustée selon l'âge)
    const ftpKgTarget = adjustPerformanceTarget(targets.ftp_kg_min, input.age);
    const ftpKgGap = input.ftpKg !== null 
      ? (input.ftpKg - ftpKgTarget) / ftpKgTarget 
      : 0;
    gapAnalysis.push({
      metric: "FTP/kg",
      value: input.ftpKg,
      target: ftpKgTarget,
      gap: input.ftpKg !== null ? input.ftpKg - ftpKgTarget : 0,
      gapPercent: ftpKgGap * 100,
      status: input.ftpKg === null ? "unknown" 
        : input.ftpKg >= ftpKgTarget ? "optimal" 
        : input.ftpKg >= ftpKgTarget * 0.9 ? "acceptable" 
        : "limiting",
      weight: weights.aerobic,
      weightedImpact: ftpKgGap < 0 ? Math.abs(ftpKgGap) * weights.aerobic * 100 : 0,
    });
  }
  
  // 1b. Analyse VO2max (Capacité Aérobie) - séparée de FTP/kg ou VMA
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
    status: input.vo2max === null ? "unknown"
      : input.vo2max >= vo2maxTarget ? "optimal"
      : input.vo2max >= vo2maxTarget * 0.9 ? "acceptable"
      : "limiting",
    weight: weights.aerobic * (useVma ? 0.85 : 0.9), // Légèrement moins en mode running car VMA intègre déjà le VO2max
    weightedImpact: vo2maxGap < 0 ? Math.abs(vo2maxGap) * weights.aerobic * (useVma ? 0.85 : 0.9) * 100 : 0,
  });
  
  // 2. Analyse VLamax (Glycolytic)
  // VLamax: plus bas est mieux pour endurance (inversé)
  const vlamaxRange = getVLamaxRange(normalized, input.ambition, input.sportFocus);
  const vlamaxGap = input.vlamax !== null 
    ? (input.vlamax - vlamaxRange.optimal) / vlamaxRange.optimal 
    : 0;
  const vlamaxExcess = input.vlamax !== null && input.vlamax > vlamaxRange.max;
  gapAnalysis.push({
    metric: "VLamax",
    value: input.vlamax,
    target: vlamaxRange.optimal,
    gap: input.vlamax !== null ? input.vlamax - vlamaxRange.optimal : 0,
    gapPercent: vlamaxGap * 100,
    status: input.vlamax === null ? "unknown"
      : input.vlamax <= vlamaxRange.optimal ? "optimal"
      : input.vlamax <= vlamaxRange.max ? "acceptable"
      : "limiting",
    weight: weights.glycolytic,
    weightedImpact: vlamaxExcess ? (input.vlamax! - vlamaxRange.max) * 100 * weights.glycolytic : 0,
  });
  
  // 2b. Analyse W' (Capacité Anaérobie absolue)
  // W' a une cible bidirectionnelle: trop bas = pas assez de punch, trop haut = profil trop glycolytique
  // ⚠️ GUARD RENFORCÉ: W' est exclu du classement des limiteurs si :
  //    1. CP dataQuality === "implausible" (effort non-maximal détecté)
  //    2. CP dataQuality === "suspect" ET W' < 5 kJ (valeur physiologiquement implausible)
  //    3. W' brut < 3 kJ (toujours suspect, même sans diagnostic CP)
  //    Cela empêche qu'un effort non-maximal fausse toute la périodisation
  const cpIsImplausible = input.cpDataQuality === "implausible";
  const cpIsSuspectWithLowWprime = input.cpDataQuality === "suspect" && input.wprimeKj !== null && input.wprimeKj < 5;
  const wprimePhysiologicallyImplausible = input.wprimeKj !== null && input.wprimeKj < 3;
  const shouldExcludeWprime = cpIsImplausible || cpIsSuspectWithLowWprime || wprimePhysiologicallyImplausible;
  const effectiveWprime = shouldExcludeWprime ? null : input.wprimeKj;
  
  const wprimeTargets = getWprimeTargets(normalized, input.ambition);
  const wprimeTooLow = effectiveWprime !== null && effectiveWprime < wprimeTargets.min;
  const wprimeTooHigh = effectiveWprime !== null && effectiveWprime > wprimeTargets.max;
  const wprimeGapValue = effectiveWprime !== null
    ? wprimeTooLow 
      ? (effectiveWprime - wprimeTargets.min) / wprimeTargets.min
      : wprimeTooHigh
        ? (effectiveWprime - wprimeTargets.max) / wprimeTargets.max
        : 0
    : 0;
  gapAnalysis.push({
    metric: "W' (kJ)",
    value: effectiveWprime,
    target: wprimeTargets.optimal,
    gap: effectiveWprime !== null ? effectiveWprime - wprimeTargets.optimal : 0,
    gapPercent: wprimeGapValue * 100,
    status: effectiveWprime === null ? "unknown"
      : effectiveWprime >= wprimeTargets.min && effectiveWprime <= wprimeTargets.max ? "optimal"
      : (effectiveWprime >= wprimeTargets.min * 0.85 && effectiveWprime <= wprimeTargets.max * 1.15) ? "acceptable"
      : "limiting",
    weight: weights.anaerobic,
    weightedImpact: (wprimeTooLow || wprimeTooHigh) 
      ? Math.abs(wprimeGapValue) * weights.anaerobic * 100 
      : 0,
  });

  // 3. Analyse TTE (Specific Endurance) — cible ajustée selon l'âge
  const tteTarget = adjustTTETarget(targets.tte_min, input.age);
  const tteGap = input.tte !== null 
    ? (input.tte - tteTarget) / tteTarget 
    : 0;
  gapAnalysis.push({
    metric: "TTE",
    value: input.tte,
    target: tteTarget,
    gap: input.tte !== null ? input.tte - tteTarget : 0,
    gapPercent: tteGap * 100,
    status: input.tte === null ? "unknown"
      : input.tte >= tteTarget ? "optimal"
      : input.tte >= tteTarget * 0.85 ? "acceptable"
      : "limiting",
    weight: weights.tte,
    weightedImpact: tteGap < 0 ? Math.abs(tteGap) * weights.tte * 100 : 0,
  });
  
  // 4. Analyse FatMax (Metabolic Efficiency)
  // ⚠️ GUARD COHÉRENCE VLamax↔FatMax (modèle Mader-Heck)
  // FatMax est physiologiquement DÉRIVÉE de VLamax : une VLamax optimale
  // implique mécaniquement une FatMax élevée. Si VLamax est ≤ cible (oxydatif),
  // un gap FatMax négatif révèle un problème de mesure/source, pas un vrai limiteur.
  // → On neutralise son weightedImpact pour qu'elle ne sorte pas comme limiteur #1.
  const vlamaxIsOptimal = input.vlamax !== null && input.vlamax <= targets.vlamax.optimal;
  const fatmaxGap = input.fatmax !== null 
    ? (input.fatmax - fatmaxTargets.optimal) / fatmaxTargets.optimal 
    : 0;
  const fatmaxRawImpact = fatmaxGap < 0 ? Math.abs(fatmaxGap) * weights.fatmax * 100 : 0;
  // Si VLamax est optimale ET FatMax semble limitante → incohérence du modèle.
  // On neutralise l'impact (mais on garde la valeur affichée pour transparence).
  const fatmaxImpactNeutralized = vlamaxIsOptimal && fatmaxGap < 0;
  gapAnalysis.push({
    metric: "FatMax",
    value: input.fatmax,
    target: fatmaxTargets.optimal,
    gap: input.fatmax !== null ? input.fatmax - fatmaxTargets.optimal : 0,
    gapPercent: fatmaxGap * 100,
    status: input.fatmax === null ? "unknown"
      : fatmaxImpactNeutralized ? "acceptable"  // Cohérence VLamax → pas limitant
      : input.fatmax >= fatmaxTargets.optimal ? "optimal"
      : input.fatmax >= fatmaxTargets.min ? "acceptable"
      : "limiting",
    weight: weights.fatmax,
    weightedImpact: fatmaxImpactNeutralized ? 0 : fatmaxRawImpact,
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
    status: input.economyScore === null ? "unknown"
      : input.economyScore >= 70 ? "optimal"
      : input.economyScore >= 50 ? "acceptable"
      : "limiting",
    weight: weights.economy,
    weightedImpact: economyGap < 0 ? Math.abs(economyGap) * weights.economy * 100 : 0,
  });
  
  // 6. Analyse Disponibilité — RETIRÉE V2.1
  // La disponibilité n'est plus incluse dans le gap analysis car
  // la fatigue n'est renseignée qu'une fois toutes les 3-4 semaines.
  
  // Tri par impact pondéré (plus grand = plus limitant)
  const sortedGaps = [...gapAnalysis].sort((a, b) => b.weightedImpact - a.weightedImpact);
  
  // Identification du limiteur principal
  const topGap = sortedGaps[0];
  const secondGap = sortedGaps[1];
  
  // ── Fatigue Warning (remplace l'ancien limiteur "availability") ──────────
  // La disponibilité n'est JAMAIS un limiteur primaire. Elle génère un
  // avertissement contextuel qui n'influence PAS la périodisation IA.
  const availabilityAnalysis = gapAnalysis.find(g => g.metric === "Disponibilité");
  const fatigueWarning: FatigueWarning = (() => {
    if (input.hasHealthAlerts) {
      return { active: true, level: "critical" as const, message: "⚠️ Alerte santé détectée — adapter la charge immédiatement." };
    }
    if (availabilityAnalysis && availabilityAnalysis.status === "limiting") {
      return { active: true, level: "high" as const, message: "⚠️ Fatigue élevée — surveiller la récupération avant les séances clés." };
    }
    if (input.availabilityScore !== null && input.availabilityScore < 60) {
      return { active: true, level: "moderate" as const, message: "Fatigue modérée — rester vigilant sur le volume." };
    }
    return { active: false, level: null, message: null };
  })();

  // ── Sélection du limiteur primaire (exclut "Disponibilité") ───────────
  // On filtre les gaps physiologiques uniquement pour le classement
  const physiologicalGaps = sortedGaps.filter(g => g.metric !== "Disponibilité");
  const topPhysioGap = physiologicalGaps[0];
  const secondPhysioGap = physiologicalGaps[1];

  // ✅ HYBRIDE : classement par catégorie cumulée (source unique partagée
  // avec la Carte Facteurs Limitants — garantit la cohérence d'ordre).
  const categoryRanking = buildCategoryRanking(physiologicalGaps);
  const topCategory = categoryRanking[0];

  let primaryLimiter: UnifiedLimiter = "none";
  let primaryLever: UnifiedLever = "maintain";

  // Le limiteur principal = catégorie dont la SOMME des impacts est maximale.
  // Seuil de déclenchement aligné sur l'ancienne logique (impact > 5).
  if (topCategory && topCategory.totalImpact > 5) {
    primaryLimiter = CATEGORY_TO_UNIFIED_LIMITER[topCategory.category];
    primaryLever = CATEGORY_TO_LEVER[topCategory.category];

    // Affinage : si la catégorie aérobie est dominante mais qu'une seule
    // métrique du groupe est FatMax (metabolic_efficiency), on bascule.
    // (Cas marginal — la catégorie reste prioritaire.)
    if (
      topCategory.category === "metabolic_endurance" &&
      topCategory.metrics.length === 1 &&
      topCategory.metrics[0].metric === "FatMax"
    ) {
      primaryLimiter = "metabolic_efficiency";
      primaryLever = "increase_fat_oxidation";
    }
    // Cas W' isolé dans neuromuscular → capacité anaérobie pure
    if (
      topCategory.category === "neuromuscular" &&
      topCategory.metrics.length === 1 &&
      (topCategory.metrics[0].metric === "W'" || topCategory.metrics[0].metric === "W' (kJ)")
    ) {
      primaryLimiter = "anaerobic_capacity";
      primaryLever = "adjust_anaerobic";
    }
  }

  // Calcul du détail de faiblesse aérobie
  // En mode running : VMA remplace FTP/kg dans l'analyse
  const aerobicExpressionAnalysis = gapAnalysis.find(g => g.metric === "VMA" || g.metric === "FTP/kg");
  const vo2maxAnalysis = gapAnalysis.find(g => g.metric === "VO2max");
  const aerobicExprIsLimiting = aerobicExpressionAnalysis?.status === "limiting";
  const vo2maxIsLimiting = vo2maxAnalysis?.status === "limiting";
  const isVmaMode = aerobicExpressionAnalysis?.metric === "VMA";
  
  let aerobicWeaknessDetail: AerobicWeaknessDetail = "none";
  let aerobicWeaknessLabel: string | null = null;
  
  if (primaryLimiter === "aerobic_engine") {
    if (aerobicExprIsLimiting && vo2maxIsLimiting) {
      aerobicWeaknessDetail = "both_low";
      aerobicWeaknessLabel = isVmaMode
        ? "Capacité (VO₂max) ET Vitesse aérobie (VMA) insuffisantes"
        : "Capacité (VO₂max) ET Expression (FTP/kg) insuffisantes";
    } else if (vo2maxIsLimiting) {
      aerobicWeaknessDetail = "vo2max_low";
      aerobicWeaknessLabel = "Capacité aérobie (VO₂max) insuffisante — plafond trop bas";
    } else if (aerobicExprIsLimiting) {
      aerobicWeaknessDetail = "ftp_kg_low";
      aerobicWeaknessLabel = isVmaMode
        ? "Vitesse aérobie maximale (VMA) insuffisante — allure de référence trop basse"
        : "Expression aérobie (FTP/kg) insuffisante — puissance relative trop faible";
    }
  }
  
  // Calcul de la robustesse (gap clair entre 1er et 2ème limiteur physio)
  const gapDifference = (topPhysioGap?.weightedImpact ?? 0) - (secondPhysioGap?.weightedImpact ?? 0);
  const isRobust = gapDifference > 10 || (topPhysioGap?.weightedImpact ?? 0) > 20;
  const robustnessScore = clamp(gapDifference * 5 + 50, 0, 100);
  
  // Calcul de la confiance globale et détection données insuffisantes
  // En mode running, la métrique critique aérobie est VMA au lieu de FTP/kg
  const aerobicCriticalMetric = useVma
    ? { key: "vma", label: "VMA", value: input.vma }
    : { key: "ftpKg", label: "FTP/kg", value: input.ftpKg };
  const CRITICAL_METRICS = [
    aerobicCriticalMetric,
    { key: "vlamax", label: "VLamax", value: input.vlamax },
    { key: "tte", label: "TTE", value: input.tte },
  ];
  const SECONDARY_METRICS = [
    { key: "wprimeKj", label: "W'", value: input.wprimeKj },
    { key: "fatmax", label: "FatMax", value: input.fatmax },
    { key: "economyScore", label: "Économie", value: input.economyScore },
  ];
  
  const missingCritical = CRITICAL_METRICS.filter(m => m.value === null);
  const missingSecondary = SECONDARY_METRICS.filter(m => m.value === null);
  const missingMetrics = [...missingCritical, ...missingSecondary].map(m => m.label);
  
  const dataCount = 6 - missingMetrics.length;
  const confidence = dataCount / 6;
  
  // Garde insuffisance: si ≥2 métriques critiques manquent, on ne peut pas conclure
  const insufficientData = missingCritical.length >= 2;
  const insufficientDataMessage = insufficientData
    ? `Données insuffisantes (${missingMetrics.join(", ")} manquant${missingMetrics.length > 1 ? "s" : ""}) — le diagnostic peut être trompeur.`
    : missingCritical.length === 1
      ? `Attention : ${missingCritical[0].label} manquant — diagnostic partiel.`
      : null;
  
  // Si données insuffisantes ET aucun limiteur fort détecté → forcer "none" avec avertissement
  // plutôt que de laisser croire à un profil équilibré
  const effectiveLimiter = insufficientData && primaryLimiter === "none" ? "none" : primaryLimiter;
  
  const limiterInfo = LIMITER_INFO[effectiveLimiter];
  const leverInfo = LEVER_INFO[primaryLever];
  
  return {
    primaryLimiter: effectiveLimiter,
    limiterLabel: insufficientData && effectiveLimiter === "none" 
      ? "Données insuffisantes" 
      : limiterInfo.label,
    limiterEmoji: insufficientData && effectiveLimiter === "none" 
      ? "❓" 
      : limiterInfo.emoji,
    limiterExplanation: insufficientData && effectiveLimiter === "none"
      ? `Impossible de déterminer le facteur limitant. Métriques manquantes : ${missingMetrics.join(", ")}.`
      : primaryLimiter === "aerobic_engine" && aerobicWeaknessLabel
        ? `${limiterInfo.description} → ${aerobicWeaknessLabel}`
        : limiterInfo.description,
    
    fatigueWarning,
    
    insufficientData,
    insufficientDataMessage,
    missingMetrics,
    
    aerobicWeaknessDetail,
    aerobicWeaknessLabel,
    
    primaryLever,
    leverLabel: leverInfo.label,
    leverEmoji: leverInfo.emoji,
    
    gapAnalysis: gapAnalysis.filter(g => g.metric !== "Disponibilité"),
    categoryRanking,

    
    isRobust: insufficientData ? false : isRobust,
    robustnessScore: insufficientData ? 0 : robustnessScore,
    robustnessNote: insufficientData 
      ? "Données insuffisantes pour une décision fiable"
      : isRobust 
        ? "Décision claire — facteur limitant nettement identifié"
        : "Décision marginale — plusieurs facteurs proches, validation coach recommandée",
    
    confidence,
    confidenceLabel: confidence >= 0.8 ? "Très élevée" 
      : confidence >= 0.6 ? "Élevée"
      : confidence >= 0.4 ? "Moyenne"
      : "Limitée",
    
    targetsUsed: targets,
    version: "1.2.0",
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
