/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MATRICE DÉCISIONNELLE TFCL™ — Version Officielle
 * Two For Coaching Lab Method™
 * 
 * Inspirée de la logique Dan Lorang.
 * 
 * OBJECTIF:
 * Transformer un ensemble complexe de métriques physiologiques et de disponibilité
 * en UNE décision d'entraînement prioritaire, robuste, lisible et actionnable.
 * 
 * RÈGLE FINALE:
 * - UNE décision
 * - UN levier
 * - ZÉRO ambiguïté
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { getTargetsForAmbition, getVLamaxRange, normalizeObjective as normalizePhysiologicalObjective, type ObjectiveTargets } from "@/lib/physiologicalTargets";
import { AmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";
import { METHOD_VERSION_DISPLAY } from "./scientificGovernance";
import { detectUnifiedLimiter, type UnifiedLimiterResult, LIMITER_INFO, type AerobicWeaknessDetail, getVo2maxAgeFactor } from "./unifiedLimiterDetection";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TFCLObjective = "IM" | "703" | "Marathon" | "Semi" | "10km" | "Trail" | "Ultra" | "Sprint" | "Olympic";

export type LimitingFactorDomain = 
  | "aerobic_engine"      // VO2max
  | "glycolytic"          // VLamax
  | "specific_endurance"  // TTE
  | "energetic"           // FatMax + Crossover
  | "availability";       // Freshness

export type TrainingLever = 
  | "increase_vo2max"
  | "decrease_vlamax"
  | "increase_tte"
  | "increase_fat_oxidation"
  | "recovery";

export type DecisionCase = "A" | "B" | "C" | "D" | "E";

// Source des données pour la traçabilité
export type DataSource = "snapshot" | "test" | "estimation" | "checkin" | "calcul";

export interface DataWithSource<T> {
  value: T;
  source: DataSource;
  sourceLabel?: string; // Ex: "Test Sprint 15s", "Estimation basée sur FTP"
}

export interface TFCLDecisionInput {
  // Physiologie (valeurs effectives) avec source
  vo2max: DataWithSource<number | null>;
  vlamax: DataWithSource<number | null>;
  tte: DataWithSource<number | null>;
  fatMaxPctVO2: DataWithSource<number | null>;
  fatOxidationMax: DataWithSource<number | null>;
  crossoverPctVO2: DataWithSource<number | null>;
  
  // Expression aérobie (optionnel, pour détail faiblesse)
  ftpKg?: DataWithSource<number | null>;
  
  // Disponibilité avec source
  freshnessScore: DataWithSource<number | null>;
  tss7d: DataWithSource<number | null>;
  tss28d: DataWithSource<number | null>;
  subjectiveFatigue: DataWithSource<number | null>;
  
  // Qualité des données
  confidenceScore: number;        // 0-100
  
  // Contexte
  discipline: "velo" | "cap" | "tri";
  objective: TFCLObjective;
  ambition: AmbitionLevel;
  age: number | null;             // Âge pour ajustement des cibles VO2max
}

export interface NormalizedMetric {
  raw: number | null;
  score: number;          // 0-100 (normalized)
  gap: number;            // Écart à la cible (négatif = en dessous)
  weight: number;         // Poids stratégique (0-1)
  weightedImpact: number; // Impact pondéré négatif
  target: number;         // Valeur cible
  status: "optimal" | "acceptable" | "limiting";
}

export interface TFCLDomainAnalysis {
  domain: LimitingFactorDomain;
  label: string;
  emoji: string;
  metric: NormalizedMetric;
  metricName: string;        // Ex: "VO2max", "VLamax"
  metricUnit: string;        // Ex: "ml/kg/min", "mmol/L/s"
  source: DataSource;
  sourceLabel?: string;
  isLimiting: boolean;
}

export interface TFCLTrainingFocus {
  do: string[];           // Ce qu'il faut favoriser
  avoid: string[];        // Ce qu'il faut éviter
  blockDuration: string;  // Durée recommandée (3-6 semaines)
}

export interface TFCLDecisionResult {
  // Facteur limitant principal
  limitingFactor: LimitingFactorDomain;
  limitingFactorLabel: string;
  limitingFactorEmoji: string;
  
  // Détail faiblesse aérobie (si facteur limitant = aerobic_engine)
  aerobicWeaknessDetail: AerobicWeaknessDetail;
  aerobicWeaknessLabel: string | null;
  
  // Levier prioritaire
  lever: TrainingLever;
  leverLabel: string;
  leverIcon: string;
  
  // Cas décisionnel
  decisionCase: DecisionCase;
  decisionCaseLabel: string;
  
  // Diagnostic
  diagnosisShort: string;     // Phrase courte
  diagnosisFull: string;      // Texte narratif complet
  
  // Focus entraînement
  focus: TFCLTrainingFocus;
  
  // Analyses par domaine
  domains: TFCLDomainAnalysis[];
  
  // Métadonnées
  objective: TFCLObjective;
  objectiveLabel: string;
  ambition: AmbitionLevel;
  confidenceScore: number;
  
  // Indicateur de robustesse
  isRobust: boolean;          // true si décision claire, false si marginal
  robustnessNote: string;
  
  // Texte athlète
  athleteNarrative: string;
  
  // Disclaimer
  disclaimer: string;
  
  // Version
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const OBJECTIVE_LABELS: Record<TFCLObjective, string> = {
  IM: "Ironman",
  "703": "70.3 / Half Ironman",
  Marathon: "Marathon",
  Semi: "Semi-Marathon",
  "10km": "10 km",
  Trail: "Trail (40-80km)",
  Ultra: "Ultra (100km+)",
  Sprint: "Sprint Triathlon",
  Olympic: "Olympic Triathlon",
};

// Poids stratégiques par domaine et objectif
// Plus le poids est élevé, plus ce domaine est critique pour l'objectif
const DOMAIN_WEIGHTS: Record<TFCLObjective, Record<LimitingFactorDomain, number>> = {
  IM: {
    aerobic_engine: 0.85,
    glycolytic: 0.95,       // VLamax critique pour IM
    specific_endurance: 0.90,
    energetic: 0.95,        // FatMax très important
    availability: 0.70,
  },
  "703": {
    aerobic_engine: 0.90,
    glycolytic: 0.85,
    specific_endurance: 0.85,
    energetic: 0.80,
    availability: 0.65,
  },
  Marathon: {
    aerobic_engine: 0.80,
    glycolytic: 0.90,
    specific_endurance: 0.95,  // TTE très critique
    energetic: 0.85,
    availability: 0.70,
  },
  Semi: {
    aerobic_engine: 0.85,
    glycolytic: 0.80,
    specific_endurance: 0.85,
    energetic: 0.70,
    availability: 0.65,
  },
  "10km": {
    aerobic_engine: 0.95,     // VO2max dominant
    glycolytic: 0.70,         // VLamax tolérée plus haute
    specific_endurance: 0.75,
    energetic: 0.50,
    availability: 0.60,
  },
  Trail: {
    aerobic_engine: 0.85,
    glycolytic: 0.85,
    specific_endurance: 0.90,
    energetic: 0.90,
    availability: 0.75,
  },
  Ultra: {
    aerobic_engine: 0.80,
    glycolytic: 0.95,
    specific_endurance: 0.95,
    energetic: 0.95,
    availability: 0.80,
  },
  Sprint: {
    aerobic_engine: 0.95,
    glycolytic: 0.50,         // VLamax haute OK
    specific_endurance: 0.60,
    energetic: 0.40,
    availability: 0.55,
  },
  Olympic: {
    aerobic_engine: 0.95,
    glycolytic: 0.65,
    specific_endurance: 0.70,
    energetic: 0.55,
    availability: 0.60,
  },
};

// Cibles FatMax par objectif (% VO2max) — UNIFIED avec unifiedLimiterDetection.ts
const FATMAX_TARGETS: Record<TFCLObjective, { min: number; optimal: number }> = {
  IM: { min: 55, optimal: 65 },
  "703": { min: 50, optimal: 60 },
  Marathon: { min: 52, optimal: 62 },
  Semi: { min: 48, optimal: 55 },
  "10km": { min: 40, optimal: 48 },
  Trail: { min: 55, optimal: 65 },
  Ultra: { min: 60, optimal: 70 },
  Sprint: { min: 35, optimal: 42 },
  Olympic: { min: 42, optimal: 50 },
};

// NOTE: VO2max targets removed — now derived from physiologicalTargets.ts via FTP/kg
// Les cibles FTP/kg sont la source de vérité pour le "moteur aérobie"

// Seuil de fraîcheur critique
const FRESHNESS_CRITICAL_THRESHOLD = 40;
const FRESHNESS_WARNING_THRESHOLD = 55;

const DOMAIN_INFO: Record<LimitingFactorDomain, { label: string; emoji: string }> = {
  aerobic_engine: { label: "Moteur aérobie", emoji: "🫁" },
  glycolytic: { label: "Métabolisme glycolytique", emoji: "⚡" },
  specific_endurance: { label: "Endurance spécifique", emoji: "⏱️" },
  energetic: { label: "Système énergétique", emoji: "🔥" },
  availability: { label: "Disponibilité", emoji: "🔋" },
};

const LEVER_INFO: Record<TrainingLever, { label: string; icon: string }> = {
  increase_vo2max: { label: "↑ VO2max", icon: "📈" },
  decrease_vlamax: { label: "↓ VLamax", icon: "📉" },
  increase_tte: { label: "↑ TTE", icon: "⏳" },
  increase_fat_oxidation: { label: "↑ Oxydation lipides", icon: "🔥" },
  recovery: { label: "Récupération / Taper", icon: "🛌" },
};

const DECISION_CASE_INFO: Record<DecisionCase, { label: string; condition: string }> = {
  A: { label: "Gros moteur mais grille trop vite", condition: "VO2max OK, VLamax trop haute, FatMax bas" },
  B: { label: "Diesel inépuisable mais plafond bas", condition: "VO2max < cible, VLamax basse, TTE élevé" },
  C: { label: "Bon seuil mais craque", condition: "VO2max OK, VLamax OK, TTE faible" },
  D: { label: "Métabolisme lipidique insuffisant", condition: "FatMax bas, Crossover précoce" },
  E: { label: "Profil solide mais pas prêt", condition: "Physiologie OK, Freshness < seuil" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function normalizeObjective(obj: string): TFCLObjective {
  const aliases: Record<string, TFCLObjective> = {
    "Ironman": "IM",
    "ironman": "IM",
    "im": "IM",
    "70.3": "703",
    "Half": "703",
    "half": "703",
    "marathon": "Marathon",
    "semi": "Semi",
    "Semi-Marathon": "Semi",
    "10km": "10km",
    "trail": "Trail",
    "ultra": "Ultra",
    "sprint": "Sprint",
    "olympic": "Olympic",
    "olympique": "Olympic",
  };
  return (aliases[obj] || obj) as TFCLObjective;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALISATION DES MÉTRIQUES
// ═══════════════════════════════════════════════════════════════════════════════


function normalizeVO2max(
  value: number | null,
  objective: TFCLObjective,
  ambition: AmbitionLevel,
  weight: number,
  confidence: number,
  age: number | null = null
): NormalizedMetric {
  // VO2max normalization now derived from FTP/kg targets (FTP/kg × ~12-14 ≈ VO2max)
  // Uses physiologicalTargets as single source of truth
  const targets = getTargetsForAmbition(objective, ambition);
  // Approximate VO2max target from FTP/kg (typical ratio for endurance athletes)
  const baseVo2max = targets.ftp_kg_min * 13;
  
  // Apply age adjustment factor
  const ageFactor = getVo2maxAgeFactor(age);
  const target = Math.round(baseVo2max * ageFactor * 10) / 10;
  const minTarget = target * 0.85;
  
  if (value === null) {
    return { raw: null, score: 50, gap: 0, weight, weightedImpact: 0, target, status: "acceptable" };
  }
  
  // Score: 100 si >= optimal, décroît linéairement jusqu'à min
  const score = value >= target 
    ? 100 
    : clamp((value / target) * 100, 0, 100);
  
  const gap = value - target;
  const weightedImpact = gap < 0 ? Math.abs(gap) * weight * (confidence / 100) : 0;
  
  const status = value >= target ? "optimal" : value >= minTarget ? "acceptable" : "limiting";
  
  return { raw: value, score, gap, weight, weightedImpact, target, status };
}

// Objectifs course à pied pure — le reste (IM/703/Sprint/Olympic) est multi-sport,
// VLamax de référence = vélo (défaut de getVLamaxRange).
const RUN_ONLY_OBJECTIVES = new Set<TFCLObjective>(["Marathon", "Semi", "10km", "Trail", "Ultra"]);

function normalizeVLamax(
  value: number | null,
  objective: TFCLObjective,
  ambition: AmbitionLevel,
  weight: number,
  confidence: number
): NormalizedMetric {
  // Audit fix — targets.vlamax (AMBITION_TARGETS) est une ex-table obsolète :
  // la VLamax est une cible universelle par distance (source unique
  // getVLamaxRange), PAS ambition-dépendante — jusqu'à 54% d'écart avec la
  // cible réelle du Dashboard pour le même objectif. Impact direct ici : le
  // score du limiteur glycolytique dans la matrice de décision TFCL.
  const vlamaxRange = getVLamaxRange(objective, undefined, RUN_ONLY_OBJECTIVES.has(objective) ? "run" : "bike");
  const target = vlamaxRange.optimal;
  const max = vlamaxRange.max;
  
  if (value === null) {
    return { raw: null, score: 50, gap: 0, weight, weightedImpact: 0, target, status: "acceptable" };
  }
  
  // VLamax: plus c'est PROCHE de l'optimal, mieux c'est
  // Trop haut = limitant pour endurance, trop bas = manque de punch
  const deviation = Math.abs(value - target);
  const score = clamp(100 - (deviation / 0.3) * 50, 0, 100);
  
  // Gap: positif si trop haut (problématique pour endurance)
  const gap = value - target;
  
  // Impact pondéré: pénalise si trop haut par rapport au max
  const weightedImpact = value > max 
    ? (value - max) * 100 * weight * (confidence / 100)
    : 0;
  
  const status = value <= target ? "optimal" : value <= max ? "acceptable" : "limiting";
  
  return { raw: value, score, gap, weight, weightedImpact, target, status };
}

function normalizeTTE(
  value: number | null,
  objective: TFCLObjective,
  ambition: AmbitionLevel,
  weight: number,
  confidence: number
): NormalizedMetric {
  const targets = getTargetsForAmbition(objective, ambition);
  const target = targets.tte_min;
  
  if (value === null) {
    return { raw: null, score: 50, gap: 0, weight, weightedImpact: 0, target, status: "acceptable" };
  }
  
  // Score: 100 si >= cible, décroît linéairement
  const score = value >= target 
    ? 100 
    : clamp((value / target) * 100, 0, 100);
  
  const gap = value - target;
  const weightedImpact = gap < 0 ? Math.abs(gap) * weight * (confidence / 100) : 0;
  
  const status = value >= target ? "optimal" : value >= target * 0.8 ? "acceptable" : "limiting";
  
  return { raw: value, score, gap, weight, weightedImpact, target, status };
}

function normalizeFatMax(
  value: number | null,
  objective: TFCLObjective,
  weight: number,
  confidence: number
): NormalizedMetric {
  const targets = FATMAX_TARGETS[objective];
  const target = targets.optimal;
  
  if (value === null) {
    return { raw: null, score: 50, gap: 0, weight, weightedImpact: 0, target, status: "acceptable" };
  }
  
  // Score: 100 si >= optimal
  const score = value >= target 
    ? 100 
    : clamp((value / target) * 100, 0, 100);
  
  const gap = value - target;
  const weightedImpact = gap < 0 ? Math.abs(gap) * weight * (confidence / 100) : 0;
  
  const status = value >= target ? "optimal" : value >= targets.min ? "acceptable" : "limiting";
  
  return { raw: value, score, gap, weight, weightedImpact, target, status };
}

function normalizeFreshness(
  value: number | null,
  weight: number
): NormalizedMetric {
  const target = 70; // Seuil optimal
  
  if (value === null) {
    return { raw: null, score: 60, gap: 0, weight, weightedImpact: 0, target, status: "acceptable" };
  }
  
  const score = clamp(value, 0, 100);
  const gap = value - target;
  const weightedImpact = gap < 0 ? Math.abs(gap) * weight : 0;
  
  const status = value >= 70 ? "optimal" : value >= FRESHNESS_CRITICAL_THRESHOLD ? "acceptable" : "limiting";
  
  return { raw: value, score, gap, weight, weightedImpact, target, status };
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTIFICATION DU CAS DÉCISIONNEL
// ═══════════════════════════════════════════════════════════════════════════════

function identifyDecisionCase(
  vo2maxMetric: NormalizedMetric,
  vlamaxMetric: NormalizedMetric,
  tteMetric: NormalizedMetric,
  fatmaxMetric: NormalizedMetric,
  freshnessMetric: NormalizedMetric
): DecisionCase {
  const vo2maxOK = vo2maxMetric.status !== "limiting";
  const vlamaxTooHigh = vlamaxMetric.raw !== null && vlamaxMetric.gap > 0.05;
  const vlamaxOK = vlamaxMetric.status !== "limiting";
  const tteOK = tteMetric.status !== "limiting";
  const fatmaxLow = fatmaxMetric.status === "limiting";
  const freshnessCritical = freshnessMetric.raw !== null && freshnessMetric.raw < FRESHNESS_CRITICAL_THRESHOLD;
  
  // CAS E: Physiologie OK mais pas prêt
  if (vo2maxOK && vlamaxOK && tteOK && freshnessCritical) {
    return "E";
  }
  
  // CAS A: Gros moteur mais grille trop vite
  if (vo2maxOK && vlamaxTooHigh && fatmaxLow) {
    return "A";
  }
  
  // CAS B: Diesel mais plafond bas
  if (vo2maxMetric.status === "limiting" && !vlamaxTooHigh) {
    return "B";
  }
  
  // CAS C: Bon seuil mais craque
  if (vo2maxOK && vlamaxOK && tteMetric.status === "limiting") {
    return "C";
  }
  
  // CAS D: Limitation énergétique
  if (fatmaxLow) {
    return "D";
  }
  
  // Fallback: le plus impactant parmi les domaines physiologiques
  // Exclure Cas E (Disponibilité) si la fraîcheur est au-dessus du seuil warning
  // pour éviter de diagnostiquer "Récupération" quand l'athlète est en forme normale
  const impacts: { case: DecisionCase; impact: number }[] = [
    { case: "B", impact: vo2maxMetric.weightedImpact },
    { case: "A", impact: vlamaxMetric.weightedImpact },
    { case: "C", impact: tteMetric.weightedImpact },
    { case: "D", impact: fatmaxMetric.weightedImpact },
  ];
  
  // N'inclure la disponibilité dans le fallback que si la fraîcheur est réellement basse
  if (freshnessMetric.raw !== null && freshnessMetric.raw < FRESHNESS_WARNING_THRESHOLD) {
    impacts.push({ case: "E", impact: freshnessMetric.weightedImpact });
  }
  
  impacts.sort((a, b) => b.impact - a.impact);
  return impacts[0].case;
}

function getDomainFromCase(decisionCase: DecisionCase): LimitingFactorDomain {
  switch (decisionCase) {
    case "A": return "glycolytic";
    case "B": return "aerobic_engine";
    case "C": return "specific_endurance";
    case "D": return "energetic";
    case "E": return "availability";
  }
}

function getLeverFromCase(decisionCase: DecisionCase): TrainingLever {
  switch (decisionCase) {
    case "A": return "decrease_vlamax";
    case "B": return "increase_vo2max";
    case "C": return "increase_tte";
    case "D": return "increase_fat_oxidation";
    case "E": return "recovery";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GÉNÉRATION DES FOCUS D'ENTRAÎNEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function generateTrainingFocus(decisionCase: DecisionCase, objective: TFCLObjective): TFCLTrainingFocus {
  switch (decisionCase) {
    case "A":
      return {
        do: [
          "Zone 2 stricte (60-70% FTP)",
          "SFR / basse cadence",
          "Séances low-carb occasionnelles",
          "Volume aérobie > intensité",
        ],
        avoid: [
          "Intervalles courts haute intensité",
          "Séances > seuil",
          "Sprint et travail anaérobie",
        ],
        blockDuration: "4-6 semaines",
      };
    
    case "B":
      return {
        do: [
          "Intervalles courts (30/30, 40/20)",
          "2-3 séances VO2max / semaine",
          "Côtes courtes explosives",
          "Variété des stimuli",
        ],
        avoid: [
          "Trop de volume lent",
          "Séances longues monotones",
          "Zone 2 exclusive",
        ],
        blockDuration: "3-5 semaines",
      };
    
    case "C":
      return {
        do: [
          "Blocs tempo / sweet spot longs",
          "Progressions au seuil",
          "Économie d'allure",
          "Sorties longues avec finish à tempo",
        ],
        avoid: [
          "Séances trop courtes",
          "Travail exclusif en intervalles courts",
          "Négliger le volume spécifique",
        ],
        blockDuration: "4-6 semaines",
      };
    
    case "D":
      return {
        do: [
          "Longues sorties à glycémie basse",
          "Entraînement à jeun (matin)",
          "Gut training progressif",
          "Stabilisation intensité Z2",
        ],
        avoid: [
          "Sucres rapides pendant l'entraînement",
          "Séances trop courtes pour adaptation métabolique",
          "Haute intensité systématique",
        ],
        blockDuration: "4-8 semaines",
      };
    
    case "E":
      return {
        do: [
          "Réduction charge 40-50%",
          "Qualité sommeil prioritaire",
          "Récupération active légère",
          "Préservation système nerveux",
        ],
        avoid: [
          "Séances clés exigeantes",
          "Volume élevé",
          "Stress additionnel",
        ],
        blockDuration: "1-2 semaines",
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GÉNÉRATION DES NARRATIFS
// ═══════════════════════════════════════════════════════════════════════════════

function generateDiagnosisShort(decisionCase: DecisionCase): string {
  switch (decisionCase) {
    case "A":
      return "Métabolisme trop glycolytique — tu consommes tes glucides trop vite.";
    case "B":
      return "Moteur aérobie limitant — ton plafond est trop bas.";
    case "C":
      return "Endurance spécifique insuffisante — tu craques avant la fin.";
    case "D":
      return "Limitation énergétique — dépendance glucidique trop élevée.";
    case "E":
      return "Disponibilité limitante — ton corps a besoin de récupérer.";
  }
}

function generateAthleteNarrative(
  decisionCase: DecisionCase,
  objective: TFCLObjective
): string {
  const objectiveLabel = OBJECTIVE_LABELS[objective];
  
  switch (decisionCase) {
    case "A":
      return `Ton moteur est solide, mais ton métabolisme te fait consommer trop vite tes glucides. Pour un ${objectiveLabel}, la priorité n'est pas d'aller plus vite, mais de tenir plus longtemps. On va travailler à baisser ta VLamax avec du travail en Zone 2 et de la force à basse cadence.`;
    
    case "B":
      return `Tu as un profil "diesel" économe, mais ton plafond aérobie limite ta performance. Pour un ${objectiveLabel}, on doit d'abord augmenter ta VO2max avec des intervalles courts et intenses avant de consolider l'endurance.`;
    
    case "C":
      return `Ton profil métabolique est bien calibré, mais tu manques d'endurance spécifique. Pour un ${objectiveLabel}, tu dois pouvoir tenir l'effort plus longtemps au seuil. On va travailler des blocs tempo et des sorties longues avec finish à intensité.`;
    
    case "D":
      return `Ton corps dépend trop des glucides et pas assez des lipides. Pour un ${objectiveLabel}, c'est un risque majeur de défaillance énergétique. On va optimiser ton oxydation des graisses avec des sorties longues à basse intensité et un travail sur la nutrition.`;
    
    case "E":
      return `Ton profil physiologique est solide, mais ton corps n'est pas prêt aujourd'hui. La priorité absolue est la récupération. Aucune séance clé ne sera productive dans cet état. On allège et on laisse le système nerveux récupérer.`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

// Mapping domaine -> infos métriques
const METRIC_INFO: Record<LimitingFactorDomain, { name: string; unit: string }> = {
  aerobic_engine: { name: "VO2max", unit: "ml/kg/min" },
  glycolytic: { name: "VLamax", unit: "mmol/L/s" },
  specific_endurance: { name: "TTE", unit: "min" },
  energetic: { name: "FatMax", unit: "% VO2" },
  availability: { name: "Fraîcheur", unit: "pts" },
};

export function computeTFCLDecisionMatrix(input: TFCLDecisionInput): TFCLDecisionResult {
  const objective = normalizeObjective(input.objective);
  const weights = DOMAIN_WEIGHTS[objective] || DOMAIN_WEIGHTS["703"];
  const confidence = input.confidenceScore;
  
  // 1. Normaliser chaque métrique (extraire .value du DataWithSource)
  const vo2maxMetric = normalizeVO2max(
    input.vo2max.value, 
    objective, 
    input.ambition,
    weights.aerobic_engine, 
    confidence,
    input.age
  );
  
  const vlamaxMetric = normalizeVLamax(
    input.vlamax.value, 
    objective, 
    input.ambition, 
    weights.glycolytic, 
    confidence
  );
  
  const tteMetric = normalizeTTE(
    input.tte.value, 
    objective, 
    input.ambition, 
    weights.specific_endurance, 
    confidence
  );
  
  const fatmaxMetric = normalizeFatMax(
    input.fatMaxPctVO2.value, 
    objective, 
    weights.energetic, 
    confidence
  );
  
  const freshnessMetric = normalizeFreshness(
    input.freshnessScore.value, 
    weights.availability
  );
  
  // 2. Construire les analyses par domaine avec source et infos métriques
  const domains: TFCLDomainAnalysis[] = [
    {
      domain: "aerobic_engine",
      ...DOMAIN_INFO.aerobic_engine,
      metric: vo2maxMetric,
      metricName: METRIC_INFO.aerobic_engine.name,
      metricUnit: METRIC_INFO.aerobic_engine.unit,
      source: input.vo2max.source,
      sourceLabel: input.vo2max.sourceLabel,
      isLimiting: false,
    },
    {
      domain: "glycolytic",
      ...DOMAIN_INFO.glycolytic,
      metric: vlamaxMetric,
      metricName: METRIC_INFO.glycolytic.name,
      metricUnit: METRIC_INFO.glycolytic.unit,
      source: input.vlamax.source,
      sourceLabel: input.vlamax.sourceLabel,
      isLimiting: false,
    },
    {
      domain: "specific_endurance",
      ...DOMAIN_INFO.specific_endurance,
      metric: tteMetric,
      metricName: METRIC_INFO.specific_endurance.name,
      metricUnit: METRIC_INFO.specific_endurance.unit,
      source: input.tte.source,
      sourceLabel: input.tte.sourceLabel,
      isLimiting: false,
    },
    {
      domain: "energetic",
      ...DOMAIN_INFO.energetic,
      metric: fatmaxMetric,
      metricName: METRIC_INFO.energetic.name,
      metricUnit: METRIC_INFO.energetic.unit,
      source: input.fatMaxPctVO2.source,
      sourceLabel: input.fatMaxPctVO2.sourceLabel,
      isLimiting: false,
    },
    {
      domain: "availability",
      ...DOMAIN_INFO.availability,
      metric: freshnessMetric,
      metricName: METRIC_INFO.availability.name,
      metricUnit: METRIC_INFO.availability.unit,
      source: input.freshnessScore.source,
      sourceLabel: input.freshnessScore.sourceLabel,
      isLimiting: false,
    },
  ];
  
  // 3. Identifier le cas décisionnel
  const decisionCase = identifyDecisionCase(
    vo2maxMetric,
    vlamaxMetric,
    tteMetric,
    fatmaxMetric,
    freshnessMetric
  );
  
  const limitingFactor = getDomainFromCase(decisionCase);
  const lever = getLeverFromCase(decisionCase);
  
  // Marquer le domaine limitant
  const limitingDomain = domains.find(d => d.domain === limitingFactor);
  if (limitingDomain) {
    limitingDomain.isLimiting = true;
  }
  
  // 4. Évaluer la robustesse de la décision
  const sortedImpacts = domains
    .map(d => ({ domain: d.domain, impact: d.metric.weightedImpact }))
    .sort((a, b) => b.impact - a.impact);
  
  const topImpact = sortedImpacts[0]?.impact || 0;
  const secondImpact = sortedImpacts[1]?.impact || 0;
  const impactGap = topImpact > 0 ? (topImpact - secondImpact) / topImpact : 1;
  
  const isRobust = impactGap > 0.25 || topImpact > 5;
  const robustnessNote = isRobust 
    ? "Décision claire et robuste — facteur limitant bien identifié."
    : "Décision marginale — plusieurs domaines proches. Prioriser selon contexte terrain.";
  
  // 5. Générer les sorties
  const focus = generateTrainingFocus(decisionCase, objective);
  const diagnosisShort = generateDiagnosisShort(decisionCase);
  const athleteNarrative = generateAthleteNarrative(decisionCase, objective);
  
  const diagnosisFull = `${DECISION_CASE_INFO[decisionCase].label}: ${DECISION_CASE_INFO[decisionCase].condition}. ${diagnosisShort}`;
  
  // 6. Calculer le détail de faiblesse aérobie si applicable
  let aerobicWeaknessDetail: AerobicWeaknessDetail = "none";
  let aerobicWeaknessLabel: string | null = null;
  
  if (limitingFactor === "aerobic_engine") {
    const vo2maxDomain = domains.find(d => d.domain === "aerobic_engine");
    const vo2maxLimiting = vo2maxDomain?.metric.status === "limiting";
    
    // On vérifie aussi FTP/kg si on l'a dans les données
    // Pour l'instant on se base sur la VO2max et on infère le FTP/kg
    if (vo2maxLimiting && vo2maxDomain) {
      const vo2maxValue = vo2maxDomain.metric.raw;
      const vo2maxTarget = vo2maxDomain.metric.target;
      
      // Si VO2max très en dessous de la cible -> capacité insuffisante
      if (vo2maxValue !== null && vo2maxValue < vo2maxTarget * 0.85) {
        aerobicWeaknessDetail = "vo2max_low";
        aerobicWeaknessLabel = "Capacité aérobie (VO₂max) insuffisante — plafond trop bas";
      } else if (vo2maxValue !== null && vo2maxValue < vo2maxTarget) {
        // VO2max proche mais pas optimal -> probablement FTP/kg
        aerobicWeaknessDetail = "ftp_kg_low";
        aerobicWeaknessLabel = "Expression aérobie (FTP/kg) insuffisante — puissance relative trop faible";
      } else {
        aerobicWeaknessDetail = "both_low";
        aerobicWeaknessLabel = "Capacité ET Expression aérobie à développer";
      }
    }
  }
  
  return {
    limitingFactor,
    limitingFactorLabel: DOMAIN_INFO[limitingFactor].label,
    limitingFactorEmoji: DOMAIN_INFO[limitingFactor].emoji,
    
    aerobicWeaknessDetail,
    aerobicWeaknessLabel,
    
    lever,
    leverLabel: LEVER_INFO[lever].label,
    leverIcon: LEVER_INFO[lever].icon,
    
    decisionCase,
    decisionCaseLabel: DECISION_CASE_INFO[decisionCase].label,
    
    diagnosisShort,
    diagnosisFull,
    
    focus,
    domains,
    
    objective,
    objectiveLabel: OBJECTIVE_LABELS[objective],
    ambition: input.ambition,
    confidenceScore: confidence,
    
    isRobust,
    robustnessNote,
    
    athleteNarrative,
    
    disclaimer: `Matrice Décisionnelle TFCL™ ${METHOD_VERSION_DISPLAY}. Une décision robuste vaut mieux qu'une analyse parfaite. Ce système éclaire une décision, il ne donne pas d'ordre.`,
    
    version: METHOD_VERSION_DISPLAY,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS UI
// ═══════════════════════════════════════════════════════════════════════════════

export function getDecisionCaseColor(decisionCase: DecisionCase): string {
  switch (decisionCase) {
    case "A": return "amber";
    case "B": return "blue";
    case "C": return "purple";
    case "D": return "orange";
    case "E": return "red";
  }
}

export function getMetricStatusColor(status: NormalizedMetric["status"]): string {
  switch (status) {
    case "optimal": return "text-green-600 dark:text-green-400";
    case "acceptable": return "text-amber-600 dark:text-amber-400";
    case "limiting": return "text-red-600 dark:text-red-400";
  }
}

export function getMetricStatusBadgeClass(status: NormalizedMetric["status"]): string {
  switch (status) {
    case "optimal": 
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700";
    case "acceptable": 
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700";
    case "limiting": 
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700";
  }
}
