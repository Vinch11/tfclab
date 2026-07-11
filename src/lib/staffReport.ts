import { computePotentielEffectif, type PotentielPhysiologiqueEffectif, getScoreColor, getPotentielTargets, getTargets, getWeightsBySport, generateAthleteReadiness, computePillarCalculations, type PotentielInput, type PotentielResult, computePotentielSignature } from "@/lib/potentielPhysiologiqueEffectif";
/**
 * RAPPORT STAFF PRÉ-COURSE - Vince's Lab
 * Synthèse d'une page, lisible en < 2 minutes
 * Destiné aux coachs, staffs et athlètes experts
 */

import type { VLamaxEffectif, TTEEffectif } from "@/engines/diagnostic";
import { computeCycleIntelligence, snapshotToEngineData, type CycleIntelligenceResult, type SnapshotData } from "@/lib/v2/cycleIntelligence";
import { computeCompassScores, CompassScores, ComputeCompassParams } from "@/lib/compassScoring";
import { computeCRR } from "@/lib/chargeRecenteReference";
import { NutritionEstimate, computeNutritionEstimate } from "@/lib/nutritionPredictive";
import { computeBaseRateMader } from "@/lib/v2/nutritionUnified";

import { RunningEconomyResult } from "@/lib/runningEconomy";
import { computeCAPInjuryRisk, CAPInjuryRiskResult, getCAPRiskIcon } from "@/lib/capInjuryRisk";
import { 
  suggestWahooWorkouts, 
  formatSuggestionsForPDF, 
  type SuggestionEngineContext,
  type SuggestionEngineOutput,
  type WahooSuggestion 
} from "@/lib/wahoo/wahooSuggestionEngine";
import { 
  detectUnifiedLimiter, 
  mapLimiterToReportType,
  type UnifiedLimiterInput,
  type UnifiedLimiter 
} from "@/engines/diagnostic";
// =============================================
// TYPES
// =============================================

export type TrafficLight = "green" | "orange" | "red";
export type LimitationType = "metabolic" | "endurance" | "economy" | "nutrition" | "power" | "none";

export interface ExecutiveSummary {
  potentielPhysiologiqueScore: number;
  potentielPhysiologiqueLabel: string;
  trafficLight: TrafficLight;
  trafficLightLabel: string;
  trafficLightIcon: "🟢" | "🟡" | "🔴";
  mainLimitation: LimitationType;
  mainLimitationLabel: string;
  executiveMessage: string;
}

export interface KeyIndicator {
  name: string;
  value: string;
  source: string;
  confidence: number;
  confidenceLabel: string;
  status: "good" | "warning" | "critical";
}

export interface StaffInterpretation {
  mainMessage: string;
  secondaryMessages: string[];
  actionOriented: boolean;
}

export interface RaceStrategy {
  toDo: string[];
  toAvoid: string[];
  targetIntensity: string;
  criticalNutritionWindow: string | null;
}

export interface NutritionSummary {
  carbsEstimate: string;
  riskLevel: string;
  riskIcon: string;
  keyMessage: string;
  isLimitingFactor: boolean;
}

export interface CAPInjuryRiskSection {
  level: number;
  levelLabel: string;
  icon: string;
  showWarning: boolean;
  vlamaxValue: string;
  vlamaxSource: string;
  vlamaxConfidence: number;
  tteValue: string;
  tteSource: string;
  tteConfidence: number;
  objectif: string;
  interpretation: string;
  programmingImpact: string;
  recommendations: string[];
  disclaimer: string;
}

export interface FinalVerdict {
  trafficLight: TrafficLight;
  icon: "🟢" | "🟡" | "🔴";
  title: string;
  subtitle: string;
  explanation: string;
}

export interface WahooSuggestionsSection {
  suggestions: WahooSuggestion[];
  diagnosticSummary: string;
  formattedForPDF: string;
  hasRecommendations: boolean;
}

// Section Fatigue & Risque CAP pour PDF
export interface FatigueRiskSection {
  fatigueScore: number | null;
  fatigueLevel: string;
  fatigueConfidence: number;
  fatigueSources: string[];
  runInjuryRiskScore: number | null;
  runInjuryRiskLevel: string;
  runInjuryRiskConfidence: number;
  runInjuryRiskDrivers: { label: string; value: string; contribution: number }[];
  runInjuryRiskGuardrails: string[];
  runInjuryRiskCoachOptions: string[];
}

// Section Recommandations Entraînement pour PDF
export interface TrainingRecommendationsSection {
  recommendations: {
    platform: string;
    workoutName: string;
    workoutType: string;
    status: "OK" | "Prudence" | "À éviter";
    statusColor: "green" | "orange" | "red";
    reason: string;
    physiologicalObjective: string;
  }[];
  diagnosticSummary: string;
  disclaimer: string;
}

// Ambition Progress Prediction for PDF
export interface AmbitionPredictionSection {
  predictions: {
    ambition: AmbitionLevel;
    ambitionLabel: string;
    ambitionIcon: string;
    currentProgress: number | null;
    weeksToReach: number | null;
    estimatedDate: string | null;
    progressPerWeek: number | null;
    confidence: "high" | "medium" | "low" | "unknown";
    isReached: boolean;
    delayLabel: string;
  }[];
  currentAmbitionPrediction: string;
  trendSummary: string;
}

// Section TFCL Reference Week pour PDF
export interface TFCLReferenceWeekSection {
  isComplete: boolean;
  completedTests: string[];
  missingData: string[];
  testValues: {
    p30s_w: number | null;
    p60s_w: number | null;
    map5min_w: number | null;
    ftp_w: number | null;
    tte_observed_min: number | null;
    protocol_quality: number | null;
  };
  confidenceAdjustment: number;
  confidenceAdjustmentLabel: string;
  qualityLabel: string;
  testDates: string | null;
}

export interface StaffReport {
  // Métadonnées
  athleteName: string;
  objectif: string;
  objectifLabel: string;
  ambition: AmbitionLevel;
  ambitionLabel: string;
  ambitionIcon: string;
  snapshotDate: string;
  generatedAt: string;
  
  // Sections du rapport
  executiveSummary: ExecutiveSummary;
  keyIndicators: KeyIndicator[];
  capInjuryRisk: CAPInjuryRiskSection;
  fatigueRisk: FatigueRiskSection;
  trainingRecommendations: TrainingRecommendationsSection;
  ambitionPredictions: AmbitionPredictionSection;
  tfclReferenceWeek: TFCLReferenceWeekSection;
  staffInterpretation: StaffInterpretation;
  raceStrategy: RaceStrategy;
  nutritionSummary: NutritionSummary;
  wahooSuggestions: WahooSuggestionsSection;
  finalVerdict: FinalVerdict;
  
  // ✅ NOUVELLES SECTIONS V2
  metabolicProfileComplete: MetabolicProfileCompleteSection;
  nutritionV2Detailed: NutritionV2DetailedSection;
  vlamaxCombinedTriathlon: VLamaxCombinedTriathlonSection | null;
  trainingLeversSection: TrainingLeversSection;
  methodologyRecommendation: MethodologyRecommendationSection;
  
  // ✅ SECTION COMPARATIF VO2MAX AVEC/SANS ÂGE
  vo2maxAgeComparison: VO2maxAgeComparisonSection;
  
  // ✅ CYCLE INTELLIGENCE ENGINE™
  cycleIntelligence: CycleIntelligenceReportSection | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CYCLE INTELLIGENCE REPORT SECTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface CycleIntelligenceReportSection {
  available: boolean;
  adaptationScore: number;
  verdictLabel: string;
  verdictEmoji: string;
  summary: string;
  recommendationLabel: string;
  recommendationDetail: string;
  limiterVerdict: string;
  limiterExplanation: string;
  metrics: {
    label: string;
    previousValue: string;
    currentValue: string;
    evolution: string;
  }[];
  daysBetween: number;
  previousDate: string;
  currentDate: string;
  staffNote: string;
}

// =============================================
// INTERFACE VO2MAX AGE COMPARISON
// =============================================

export interface VO2maxAgeComparisonSection {
  hasAgeAdjustment: boolean;
  age: number | null;
  ageFactor: number;
  reductionPercent: number;
  objectifLabel: string;
  currentAmbition: string;
  currentAmbitionLabel: string;
  currentVo2max: number | null;
  rows: {
    ambition: string;
    ambitionLabel: string;
    emoji: string;
    baseTarget: number;
    adjustedTarget: number;
    difference: number;
    isCurrent: boolean;
  }[];
  explanation: string;
}

// =============================================
// NOUVELLES INTERFACES V2
// =============================================

export interface MetabolicProfileCompleteSection {
  vlamaxValue: number | null;
  vlamaxLabel: string;
  vlamaxCategory: string;
  vlamaxPercentile: string | null;
  tteValue: number | null;
  tteLabel: string;
  tteCategory: string;
  ftpKg: number | null;
  ftpKgLabel: string;
  ftpKgCategory: string;
  radarData: { axis: string; value: number; target: number }[];
  overallBalance: "equilibre" | "glycolytique" | "endurant" | "mixte";
  overallBalanceLabel: string;
  interpretation: string;
  gaps: { metric: string; gap: string; priority: "high" | "medium" | "low" }[];
  // ✅ Score unifié du Compass pour cohérence dashboard/rapport
  compassScores?: CompassScores;
}

export interface NutritionV2DetailedSection {
  carbsMin: number;
  carbsMax: number;
  carbsCentral: number;
  glycogenRisk: string;
  glycogenRiskScore: number;
  glycogenRiskIcon: string;
  sportLabel: string;
  contributors: { label: string; adjustment: string; explanation: string }[];
  whyThisNumber: string;
  recommendations: string[];
  warnings: string[];
  segmentStrategy: { segment: string; duration: string; carbsPerHour: string; totalGrams: string; notes: string }[] | null;
  totalRaceCarbs: number | null;
}

export interface VLamaxCombinedTriathlonSection {
  vlamaxBike: number | null;
  vlamaxBikeLabel: string;
  vlamaxRun: number | null;
  vlamaxRunLabel: string;
  delta: number | null;
  deltaInterpretation: string;
  profileCoherence: "coherent" | "divergent";
  nutritionImpact: string;
  trainingPriority: string;
}

export interface TrainingLeversSection {
  sport: string;
  sportLabel: string;
  keyStatement: string;
  priorityLevers: { name: string; effect: string; riskLevel: string }[];
  cautionLevers: { name: string; effect: string; conditions: string[] }[];
  discouragedLevers: { name: string; reason: string }[];
}

export interface MethodologyRecommendationSection {
  recommendedApproach: string;
  recommendedApproachLabel: string;
  justification: string;
  keyPrinciples: string[];
  alternativeApproaches: { name: string; suitability: string }[];
  disclaimer: string;
}

import { AmbitionLevel, DEFAULT_AMBITION, getAmbitionDefinition } from "@/types/ambitionLevel";

export interface GenerateStaffReportParams {
  athleteName: string;
  objectif: string;
  snapshotDate: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  readiness: PotentielPhysiologiqueEffectif;
  nutritionEstimate: NutritionEstimate | null;
  runningEconomy: RunningEconomyResult | null;
  ftp: number | null;
  sportFocus?: "run" | "bike" | "tri";
  CRR?: { value: number | null; confidence: number };
  fatigueScore?: number;
  injuryRiskRun?: { level: "faible" | "modéré" | "élevé"; score: number };
  poids: number | null;
  fcMax: number | null;
  ambition?: AmbitionLevel;
  // ✅ Données supplémentaires pour calculs unifiés
  tss7d?: number | null;
  snapshotUpdatedAt?: string | null;
  athleteAge?: number | null;
  vo2max?: number | null;

  // TFCL Reference Week data
  tfclData?: {
    p30s_w?: number | null;
    p60s_w?: number | null;
    map5min_w?: number | null;
    ftp_w?: number | null;
    tte_observed_min?: number | null;
    protocol_quality?: number | null;
    testDates?: string | null;
  };
  // ✅ Cycle Intelligence — snapshots pour analyse d'évolution
  allSnapshots?: Array<Record<string, unknown>>;
  currentSnapshotId?: string | null;
  previousLimiterId?: string | null;
  previousLimiterLabel?: string | null;
}

// =============================================
// HELPERS
// =============================================

function getObjectifLabel(objectif: string): string {
  const labels: Record<string, string> = {
    IM: "Ironman",
    Ironman: "Ironman",
    "703": "70.3 / Half Ironman",
    Half: "70.3 / Half Ironman",
    Marathon: "Marathon",
    Semi: "Semi-Marathon",
    Course: "Course à pied",
    Trail: "Trail",
    TrailCourt: "Trail Court",
    TrailLong: "Trail Long / Ultra",
    Ultra: "Ultra",
  };
  return labels[objectif] || objectif;
}

/**
 * ✅ REFACTORISÉ: Utilise maintenant le moteur unifié detectUnifiedLimiter
 * pour garantir la cohérence avec TFCLDecisionMatrix et le Compass
 */
function determineMainLimitation(params: {
  readiness: PotentielPhysiologiqueEffectif;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  nutritionEstimate: NutritionEstimate | null;
  runningEconomy: RunningEconomyResult | null;
  objectif: string;
  ambition: AmbitionLevel;
  ftp: number | null;
  poids: number | null;
  availabilityScore?: number | null;
  hasHealthAlerts?: boolean;
  age?: number | null;
}): { type: LimitationType; label: string } {
  const { 
    readiness, 
    vlamaxEffectif, 
    tteEffectif, 
    nutritionEstimate, 
    runningEconomy,
    objectif,
    ambition,
    ftp,
    poids,
    availabilityScore,
    hasHealthAlerts,
    age
  } = params;
  
  // Calculer FTP/kg
  const ftpKg = (ftp && poids && poids > 0) ? ftp / poids : null;
  
  // Construire l'input pour le moteur unifié
  const unifiedInput: UnifiedLimiterInput = {
    vo2max: null,
    ftpKg,
    vlamax: vlamaxEffectif.value,
    wprimeKj: null,
    tte: tteEffectif.tte_min,
    fatmax: null,
    economyScore: runningEconomy?.isApplicable ? (runningEconomy.capScore ?? null) : null,
    availabilityScore: availabilityScore ?? null,
    hasHealthAlerts: hasHealthAlerts ?? false,
    objectif,
    ambition,
    age: age ?? null,
    vma: null,
  };
  
  // Appeler le moteur unifié
  const unifiedResult = detectUnifiedLimiter(unifiedInput);
  
  // Mapper le résultat vers le format legacy
  const limiterType = mapLimiterToReportType(unifiedResult.primaryLimiter) as LimitationType;
  
  // Conserver la logique de plafonnement existante
  if (readiness.wasCappedByEconomy && runningEconomy?.level === "very_weak") {
    return { type: "economy", label: "Économie de course" };
  }
  if (readiness.wasCappedByNutrition && nutritionEstimate?.nutritionalRiskIndex.level === "critical") {
    return { type: "nutrition", label: "Risque nutritionnel" };
  }
  
  // Si nutrition à risque élevé et pas capté par le moteur unifié
  if (nutritionEstimate && (nutritionEstimate.riskLevel === "high" || nutritionEstimate.riskLevel === "critical")) {
    return { type: "nutrition", label: "Risque nutritionnel" };
  }
  
  // Utiliser le résultat du moteur unifié
  return { 
    type: limiterType, 
    label: unifiedResult.limiterLabel 
  };
}

function determineTrafficLight(readiness: PotentielPhysiologiqueEffectif): TrafficLight {
  const { score, wasCappedByNutrition, wasCappedByEconomy } = readiness;
  
  if (score >= 80 && !wasCappedByNutrition && !wasCappedByEconomy) {
    return "green";
  }
  if (score >= 60) {
    return "orange";
  }
  return "red";
}

function generateExecutiveMessage(
  readiness: PotentielPhysiologiqueEffectif,
  limitation: { type: LimitationType; label: string }
): string {
  const { score } = readiness;
  
  if (limitation.type === "none" && score >= 80) {
    return "L'athlète est prêt physiologiquement. Stratégie de course validée.";
  }
  
  if (score >= 75) {
    return `L'athlète est prêt physiologiquement MAIS limité par : ${limitation.label}.`;
  }
  
  if (score >= 60) {
    return `Préparation en progression. Point d'attention principal : ${limitation.label}.`;
  }
  
  return `Préparation incomplète pour l'objectif. Limitation majeure : ${limitation.label}.`;
}

function generateStaffInterpretation(params: {
  readiness: PotentielPhysiologiqueEffectif;
  limitation: { type: LimitationType; label: string };
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  nutritionEstimate: NutritionEstimate | null;
  runningEconomy: RunningEconomyResult | null;
}): StaffInterpretation {
  const { readiness, limitation, vlamaxEffectif, tteEffectif, nutritionEstimate, runningEconomy } = params;
  
  const messages: string[] = [];
  
  // Message principal basé sur la limitation
  let mainMessage = "";
  
  switch (limitation.type) {
    case "metabolic":
      if (vlamaxEffectif.value !== null && vlamaxEffectif.value > 0.50) {
        mainMessage = "Le moteur glycolytique est trop actif pour cette distance. La dépendance aux glucides sera élevée.";
        messages.push("Risque de dérive glycémique après 2-3h d'effort");
      } else if (vlamaxEffectif.value !== null && vlamaxEffectif.value < 0.30) {
        mainMessage = "Le profil métabolique est excellent pour l'endurance. La puissance de pointe peut être le facteur limitant.";
      } else {
        mainMessage = "Le profil métabolique est adapté à l'objectif avec quelques ajustements possibles.";
      }
      break;
      
    case "endurance":
      mainMessage = "La capacité à maintenir l'allure cible sur la durée est le facteur limitant principal.";
      if (tteEffectif.tte_min !== null && tteEffectif.tte_min < 40) {
        messages.push("TTE insuffisant pour un effort prolongé au seuil");
      }
      messages.push("Le travail d'endurance spécifique reste à consolider");
      break;
      
    case "economy":
      mainMessage = "La limitation principale n'est pas cardiorespiratoire. Le gain de performance viendra de l'économie de course.";
      if (runningEconomy?.optimisationLevier) {
        messages.push(...runningEconomy.optimisationLevier.slice(0, 2));
      }
      break;
      
    case "nutrition":
      mainMessage = "Le moteur est suffisant, la contrainte est énergétique. La stratégie nutritionnelle sera déterminante.";
      if (nutritionEstimate) {
        messages.push(`Besoin estimé : ${nutritionEstimate.carbsMin}-${nutritionEstimate.carbsMax} g/h`);
        if (nutritionEstimate.nutritionalRiskIndex.mainRiskFactor) {
          messages.push(`Facteur principal : ${nutritionEstimate.nutritionalRiskIndex.mainRiskFactor}`);
        }
      }
      break;
      
    case "power":
      mainMessage = "La puissance relative (FTP/kg) est en-dessous des cibles pour l'objectif.";
      messages.push("Marge de progression sur le travail au seuil");
      break;
      
    default:
      mainMessage = "Le profil physiologique est équilibré pour l'objectif. Exécution et gestion de course seront clés.";
  }
  
  // Ajouter des messages secondaires contextuels
  if (readiness.wasCappedByNutrition) {
    messages.push("⚠️ Potentiel Physiologique plafonné par le risque nutritionnel");
  }
  if (readiness.wasCappedByEconomy) {
    messages.push("⚠️ Potentiel Physiologique plafonné par l'économie de course");
  }
  
  return {
    mainMessage,
    secondaryMessages: messages.slice(0, 3),
    actionOriented: true,
  };
}

function generateRaceStrategy(params: {
  objectif: string;
  readiness: PotentielPhysiologiqueEffectif;
  limitation: { type: LimitationType; label: string };
  nutritionEstimate: NutritionEstimate | null;
  ftp: number | null;
}): RaceStrategy {
  const { objectif, readiness, limitation, nutritionEstimate, ftp } = params;
  
  const toDo: string[] = [];
  const toAvoid: string[] = [];
  
  // Intensité cible
  let targetIntensity = "";
  if (ftp) {
    const isLongDistance = ["IM", "Ironman", "Marathon", "Ultra", "TrailLong"].includes(objectif);
    const isMediumDistance = ["703", "Half", "Semi", "Trail"].includes(objectif);
    
    if (isLongDistance) {
      targetIntensity = `65-75% FTP (${Math.round(ftp * 0.65)}-${Math.round(ftp * 0.75)}W) ou Zone 2 stable`;
    } else if (isMediumDistance) {
      targetIntensity = `75-85% FTP (${Math.round(ftp * 0.75)}-${Math.round(ftp * 0.85)}W) ou Zone 3`;
    } else {
      targetIntensity = `85-95% FTP (${Math.round(ftp * 0.85)}-${Math.round(ftp * 0.95)}W)`;
    }
  } else {
    targetIntensity = "Intensité à définir selon les tests";
  }
  
  // À FAIRE
  toDo.push(`Intensité cible : ${targetIntensity}`);
  
  if (limitation.type === "nutrition" || limitation.type === "metabolic") {
    toDo.push("Alimentation précoce et régulière dès le départ");
    toDo.push("Tester le plan nutritionnel à l'entraînement");
  }
  
  if (limitation.type === "endurance") {
    toDo.push("Départ conservateur, accélérer en seconde partie si possible");
    toDo.push("Surveiller la FC et la dérive cardiaque");
  }
  
  if (limitation.type === "economy") {
    toDo.push("Focus sur la régularité d'allure");
    toDo.push("Cadence haute et stable (170-180 ppm)");
  }
  
  // À ÉVITER
  toAvoid.push("Départ trop rapide (premier quart d'heure)");
  toAvoid.push("Pics d'intensité inutiles sur les relances");
  
  if (limitation.type === "nutrition" || limitation.type === "metabolic") {
    toAvoid.push("Sous-alimentation dans la première heure");
    toAvoid.push("Gels uniquement sans hydratation");
  }
  
  if (limitation.type === "endurance") {
    toAvoid.push("Intensité supérieure à 80% FTP en début d'épreuve");
  }
  
  // Fenêtre nutritionnelle critique
  let criticalNutritionWindow: string | null = null;
  if (nutritionEstimate && (nutritionEstimate.riskLevel === "high" || nutritionEstimate.riskLevel === "critical")) {
    if (["IM", "Ironman", "Ultra", "TrailLong"].includes(objectif)) {
      criticalNutritionWindow = "Heures 3 à 6 : fenêtre critique de déplétion glycogénique";
    } else if (["703", "Half", "Marathon"].includes(objectif)) {
      criticalNutritionWindow = "Heures 2 à 4 : fenêtre critique de gestion énergétique";
    }
  }
  
  return {
    toDo: toDo.slice(0, 4),
    toAvoid: toAvoid.slice(0, 4),
    targetIntensity,
    criticalNutritionWindow,
  };
}

function generateNutritionSummary(
  nutritionEstimate: NutritionEstimate | null,
  limitation: { type: LimitationType }
): NutritionSummary {
  if (!nutritionEstimate) {
    return {
      carbsEstimate: "Non disponible",
      riskLevel: "Inconnu",
      riskIcon: "⚪",
      keyMessage: "Données insuffisantes pour l'estimation nutritionnelle",
      isLimitingFactor: false,
    };
  }
  
  const { carbsMin, carbsMax, nutritionalRiskIndex } = nutritionEstimate;
  
  const isLimitingFactor = limitation.type === "nutrition" || 
    nutritionalRiskIndex.level === "critical" || 
    nutritionalRiskIndex.level === "high";
  
  let keyMessage = "";
  if (isLimitingFactor) {
    keyMessage = "La nutrition est un facteur LIMITANT majeur";
  } else if (nutritionalRiskIndex.level === "moderate") {
    keyMessage = "La nutrition est un facteur NEUTRE à surveiller";
  } else {
    keyMessage = "La nutrition est un facteur NEUTRE – gestion standard";
  }
  
  return {
    carbsEstimate: `${carbsMin}-${carbsMax} g/h`,
    riskLevel: nutritionalRiskIndex.label,
    riskIcon: nutritionalRiskIndex.icon,
    keyMessage,
    isLimitingFactor,
  };
}

function generateFinalVerdict(
  readiness: PotentielPhysiologiqueEffectif,
  limitation: { type: LimitationType; label: string }
): FinalVerdict {
  const trafficLight = determineTrafficLight(readiness);
  
  if (trafficLight === "green") {
    return {
      trafficLight: "green",
      icon: "🟢",
      title: "FEU VERT",
      subtitle: "Athlète prêt, stratégie validée",
      explanation: "Le profil physiologique est adapté à l'objectif. Exécution et discipline de course seront les clés de la réussite.",
    };
  }
  
  if (trafficLight === "orange") {
    return {
      trafficLight: "orange",
      icon: "🟡",
      title: "FEU ORANGE",
      subtitle: "Athlète prêt MAIS points à sécuriser",
      explanation: `Préparation globalement satisfaisante. Point d'attention : ${limitation.label}. Vigilance requise sur l'exécution.`,
    };
  }
  
  return {
    trafficLight: "red",
    icon: "🔴",
    title: "FEU ROUGE",
    subtitle: "Athlète non sécurisé pour l'objectif",
    explanation: `Préparation insuffisante ou risque identifié : ${limitation.label}. Revoir l'objectif ou reporter pour sécuriser la performance.`,
  };
}

// =============================================
// MAIN FUNCTION
// =============================================

export function generateStaffReport(params: GenerateStaffReportParams): StaffReport {
  const {
    athleteName,
    objectif,
    snapshotDate,
    vlamaxEffectif,
    tteEffectif,
    readiness,
    nutritionEstimate,
    runningEconomy,
    ftp,
    poids,
    sportFocus,
    CRR,
    fatigueScore,
    injuryRiskRun,
    ambition = DEFAULT_AMBITION,
    tfclData,
    // ✅ Nouveaux paramètres pour calculs unifiés
    tss7d,
    snapshotUpdatedAt,
    athleteAge,
    vo2max,
  } = params;

  
  // Déterminer la limitation principale (utilise désormais le moteur unifié)
  const limitation = determineMainLimitation({
    readiness,
    vlamaxEffectif,
    tteEffectif,
    nutritionEstimate,
    runningEconomy,
    objectif,
    ambition: ambition ?? DEFAULT_AMBITION,
    ftp,
    poids,
    availabilityScore: readiness.details.fraicheur ?? null,
    hasHealthAlerts: readiness.wasCappedByNutrition || readiness.wasCappedByEconomy,
    age: athleteAge ?? null,
  });
  
  // Générer le feu tricolore
  const trafficLight = determineTrafficLight(readiness);
  
  // Générer le résumé exécutif
  const executiveSummary: ExecutiveSummary = {
    potentielPhysiologiqueScore: readiness.score,
    potentielPhysiologiqueLabel: readiness.label,
    trafficLight,
    trafficLightLabel: trafficLight === "green" ? "Prêt" : trafficLight === "orange" ? "À sécuriser" : "À risque",
    trafficLightIcon: trafficLight === "green" ? "🟢" : trafficLight === "orange" ? "🟡" : "🔴",
    mainLimitation: limitation.type,
    mainLimitationLabel: limitation.label,
    executiveMessage: generateExecutiveMessage(readiness, limitation),
  };
  
  // Générer les indicateurs clés
  const keyIndicators: KeyIndicator[] = [];
  
  // VLamax
  keyIndicators.push({
    name: "VLamax effectif",
    value: vlamaxEffectif.value !== null ? vlamaxEffectif.value.toFixed(2) : "—",
    source: vlamaxEffectif.source === "test" ? "Test" : vlamaxEffectif.source === "snapshot" ? "Snapshot" : "Estimé",
    confidence: vlamaxEffectif.confidence,
    confidenceLabel: vlamaxEffectif.confidence >= 0.8 ? "Très fiable" : vlamaxEffectif.confidence >= 0.6 ? "Fiable" : "Modéré",
    status: vlamaxEffectif.confidence >= 0.7 ? "good" : vlamaxEffectif.confidence >= 0.4 ? "warning" : "critical",
  });
  
  // TTE
  keyIndicators.push({
    name: "TTE effectif",
    value: tteEffectif.tte_min !== null ? `${tteEffectif.tte_min} min` : "—",
    source: tteEffectif.source === "observed" ? "Observé" : tteEffectif.source === "estimated" ? "Estimé" : "Inconnu",
    confidence: tteEffectif.confidence,
    confidenceLabel: tteEffectif.confidence >= 0.8 ? "Très fiable" : tteEffectif.confidence >= 0.5 ? "Fiable" : "Modéré",
    status: tteEffectif.confidence >= 0.7 ? "good" : tteEffectif.confidence >= 0.4 ? "warning" : "critical",
  });
  
  // FTP/kg
  const ftpKg = ftp && poids && poids > 0 ? ftp / poids : null;
  keyIndicators.push({
    name: "FTP/kg",
    value: ftpKg !== null ? `${ftpKg.toFixed(2)} W/kg` : "—",
    source: "Snapshot",
    confidence: ftpKg !== null ? 0.9 : 0.2,
    confidenceLabel: ftpKg !== null ? "Fiable" : "Non dispo",
    status: ftpKg !== null ? "good" : "critical",
  });
  
  // Économie de course (si applicable)
  if (runningEconomy?.isApplicable) {
    keyIndicators.push({
      name: "Économie de course",
      value: runningEconomy.levelLabel,
      source: "Analyse",
      confidence: 0.7,
      confidenceLabel: "Estimé",
      status: runningEconomy.level === "excellent" || runningEconomy.level === "correct" ? "good" : 
              runningEconomy.level === "weak" ? "warning" : "critical",
    });
  }
  
  // Risque nutritionnel
  if (nutritionEstimate) {
    keyIndicators.push({
      name: "Risque nutritionnel",
      value: nutritionEstimate.nutritionalRiskIndex.label,
      source: "Analyse",
      confidence: 0.8,
      confidenceLabel: "Calculé",
      status: nutritionEstimate.nutritionalRiskIndex.level === "low" ? "good" : 
              nutritionEstimate.nutritionalRiskIndex.level === "moderate" ? "warning" : "critical",
    });
  }
  
  // Générer l'interprétation staff
  const staffInterpretation = generateStaffInterpretation({
    readiness,
    limitation,
    vlamaxEffectif,
    tteEffectif,
    nutritionEstimate,
    runningEconomy,
  });
  
  // Générer la stratégie de course
  const raceStrategy = generateRaceStrategy({
    objectif,
    readiness,
    limitation,
    nutritionEstimate,
    ftp,
  });
  
  // Générer le résumé nutritionnel
  const nutritionSummary = generateNutritionSummary(nutritionEstimate, limitation);
  
  // Générer le verdict final
  const finalVerdict = generateFinalVerdict(readiness, limitation);
  
  // Générer l'indice de risque blessure CAP
  const capRiskResult = computeCAPInjuryRisk({
    vlamaxValue: vlamaxEffectif.value,
    tteValue: tteEffectif.tte_min,
    objectif,
  });
  
  const capInjuryRisk: CAPInjuryRiskSection = {
    level: capRiskResult.level,
    levelLabel: capRiskResult.label,
    icon: getCAPRiskIcon(capRiskResult.level),
    showWarning: capRiskResult.level >= 2,
    vlamaxValue: vlamaxEffectif.value !== null ? vlamaxEffectif.value.toFixed(2) : "—",
    vlamaxSource: vlamaxEffectif.source === "test" ? "Test" : vlamaxEffectif.source === "snapshot" ? "Snapshot" : "Estimé",
    vlamaxConfidence: vlamaxEffectif.confidence,
    tteValue: tteEffectif.tte_min !== null ? `${tteEffectif.tte_min} min` : "—",
    tteSource: tteEffectif.source === "observed" ? "Observé" : tteEffectif.source === "estimated" ? "Estimé" : "Inconnu",
    tteConfidence: tteEffectif.confidence,
    objectif: getObjectifLabel(objectif),
    interpretation: capRiskResult.staffAnalysis,
    programmingImpact: generateCAPProgrammingImpact(capRiskResult.level),
    recommendations: generateCAPRecommendations(capRiskResult.level),
    disclaimer: "Indice calculé à partir des données cloud disponibles à la date du rapport : VLamax effectif et TTE effectif. Cet indicateur est une aide à la décision et ne remplace pas l'expertise du coach.",
  };
  
  // Générer les suggestions Wahoo SYSTM
  const wahooContext: SuggestionEngineContext = {
    objectif,
    sportFocus: sportFocus || "tri",
    vlamaxEffectif: {
      value: vlamaxEffectif.value,
      confidence: vlamaxEffectif.confidence,
      source: vlamaxEffectif.source,
    },
    tteEffectif: {
      value: tteEffectif.tte_min,
      confidence: tteEffectif.confidence,
      source: tteEffectif.source,
    },
    potentielPhysiologique: {
      score: readiness.score,
      details: {
        endurance: readiness.details.endurance,
        vlamax: readiness.details.vlamax,
        fraicheur: readiness.details.fraicheur,
        puissance: readiness.details.puissance,
      },
    },
    CRR: CRR || { value: 300, confidence: 0.5 },
    fatigueScore: fatigueScore,
    injuryRiskRun: injuryRiskRun || (capRiskResult.level >= 2 ? {
      level: capRiskResult.level >= 3 ? "élevé" as const : "modéré" as const,
      score: capRiskResult.level,
    } : undefined),
  };
  
  const wahooOutput = suggestWahooWorkouts(wahooContext);
  
  const wahooSuggestions: WahooSuggestionsSection = {
    suggestions: wahooOutput.suggestions,
    diagnosticSummary: wahooOutput.diagnosticSummary,
    formattedForPDF: formatSuggestionsForPDF(wahooOutput),
    hasRecommendations: wahooOutput.suggestions.length > 0,
  };
  
  // Générer la section Fatigue & Risque (nouvelle section PDF)
  const fatigueRisk: FatigueRiskSection = {
    fatigueScore: fatigueScore ?? null,
    fatigueLevel: fatigueScore !== undefined && fatigueScore !== null
      ? (fatigueScore < 30 ? "TRES_FAIBLE" : fatigueScore < 45 ? "FAIBLE" : fatigueScore < 60 ? "MODEREE" : fatigueScore < 75 ? "ELEVEE" : "CRITIQUE")
      : "INCONNU",
    fatigueConfidence: fatigueScore !== undefined ? 0.7 : 0.3,
    fatigueSources: ["CRR", "TTE", "readiness", "age"].filter(Boolean),
    runInjuryRiskScore: injuryRiskRun?.score ?? null,
    runInjuryRiskLevel: injuryRiskRun?.level ?? "INCONNU",
    runInjuryRiskConfidence: injuryRiskRun ? 0.7 : 0.3,
    runInjuryRiskDrivers: [
      { label: "Fatigue", value: `${fatigueScore ?? 0}%`, contribution: 30 },
      { label: "VLamax", value: vlamaxEffectif.value?.toFixed(2) ?? "—", contribution: 20 },
      { label: "TTE", value: tteEffectif.tte_min !== null ? `${tteEffectif.tte_min} min` : "—", contribution: 20 },
      { label: "Charge", value: CRR?.value !== null ? `${CRR?.value ?? 0} TSS` : "—", contribution: 20 },
      { label: "Âge", value: "—", contribution: 10 },
    ],
    runInjuryRiskGuardrails: generateRunInjuryGuardrails(injuryRiskRun?.level),
    runInjuryRiskCoachOptions: generateRunInjuryCoachOptions(injuryRiskRun?.level),
  };

  // Générer la section Recommandations Entraînement (nouvelle section PDF)
  const trainingRecommendations: TrainingRecommendationsSection = generateTrainingRecommendationsSection({
    wahooSuggestions: wahooOutput.suggestions,
    objectif,
    vlamaxEffectif,
    tteEffectif,
    fatigueScore,
    injuryRiskRun,
  });
  
  // Générer les prédictions d'ambition
  const ambitionPredictions = generateAmbitionPredictionsSection({
    objectif,
    vlamaxEffectif,
    tteEffectif,
    ftp,
    poids,
    ambition,
  });
  
  // Générer la section TFCL Reference Week
  const tfclReferenceWeek = generateTFCLReferenceWeekSection(tfclData);
  
  // ✅ NOUVELLES SECTIONS V2 - Utilise computeCompassScores unifié
  const metabolicProfileComplete = generateMetabolicProfileCompleteSection({
    vlamaxEffectif,
    tteEffectif,
    ftp,
    poids,
    objectif,
    ambition,
    tss7d,
    snapshotDate,
    snapshotUpdatedAt,
    athleteAge,
  });
  
  const nutritionV2Detailed = generateNutritionV2DetailedSection({
    vlamaxEffectif,
    tteEffectif,
    poids,
    objectif,
    vo2max,
  });

  
  const vlamaxCombinedTriathlon = isTriathlonObjectif(objectif) 
    ? generateVLamaxCombinedTriathlonSection({ vlamaxEffectif, objectif })
    : null;
  
  const trainingLeversSection = generateTrainingLeversSection({
    objectif,
    vlamaxEffectif,
    tteEffectif,
    fatigueScore,
    injuryRiskRun,
  });
  
  const methodologyRecommendation = generateMethodologyRecommendationSection({
    vlamaxEffectif,
    tteEffectif,
    objectif,
  });
  
  const ambitionDef = getAmbitionDefinition(ambition);
  
  return {
    athleteName,
    objectif,
    objectifLabel: getObjectifLabel(objectif),
    ambition,
    ambitionLabel: ambitionDef.label,
    ambitionIcon: ambitionDef.icon,
    snapshotDate,
    generatedAt: new Date().toISOString().slice(0, 10),
    executiveSummary,
    keyIndicators,
    capInjuryRisk,
    fatigueRisk,
    trainingRecommendations,
    ambitionPredictions,
    tfclReferenceWeek,
    staffInterpretation,
    raceStrategy,
    nutritionSummary,
    wahooSuggestions,
    finalVerdict,
    // ✅ NOUVELLES SECTIONS
    metabolicProfileComplete,
    nutritionV2Detailed,
    vlamaxCombinedTriathlon,
    trainingLeversSection,
    methodologyRecommendation,
    // ✅ SECTION COMPARATIF VO2MAX AVEC/SANS ÂGE
    vo2maxAgeComparison: generateVO2maxAgeComparisonSection({
      objectif,
      ambition,
      age: athleteAge ?? null,
      currentVo2max: null,
    }),
    // ✅ CYCLE INTELLIGENCE ENGINE™
    cycleIntelligence: generateCycleIntelligenceSection(params),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CYCLE INTELLIGENCE SECTION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function generateCycleIntelligenceSection(params: GenerateStaffReportParams): CycleIntelligenceReportSection | null {
  const { allSnapshots, currentSnapshotId, previousLimiterId, previousLimiterLabel, objectif } = params;
  
  if (!allSnapshots || allSnapshots.length < 2) return null;

  const engineSnapshots = allSnapshots
    .filter(s => s.date && s.id)
    .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime())
    .map(s => snapshotToEngineData(s));
  
  if (engineSnapshots.length < 2) return null;

  let currentIdx = 0;
  if (currentSnapshotId) {
    const idx = engineSnapshots.findIndex(s => s.id === currentSnapshotId);
    if (idx >= 0) currentIdx = idx;
  }
  
  const previousIdx = currentIdx + 1;
  if (previousIdx >= engineSnapshots.length) return null;

  const result = computeCycleIntelligence({
    previousSnapshot: engineSnapshots[previousIdx],
    currentSnapshot: engineSnapshots[currentIdx],
    previousLimiterId,
    previousLimiterLabel,
    objectif,
  });

  const availableMetrics = result.metrics.filter(m => m.available);

  return {
    available: true,
    adaptationScore: result.adaptationScore,
    verdictLabel: result.verdictLabel,
    verdictEmoji: result.verdictEmoji,
    summary: result.summary,
    recommendationLabel: result.recommendationLabel,
    recommendationDetail: result.recommendationDetail,
    limiterVerdict: result.limiterAnalysis.limiterVerdict,
    limiterExplanation: result.limiterAnalysis.explanation,
    metrics: availableMetrics.map(m => ({
      label: m.label,
      previousValue: m.previousValue?.toFixed(m.id === "vlamax" ? 2 : 1) ?? "—",
      currentValue: m.currentValue?.toFixed(m.id === "vlamax" ? 2 : 1) ?? "—",
      evolution: m.evolution === "positive" ? "↑" : m.evolution === "negative" ? "↓" : "→",
    })),
    daysBetween: result.daysBetween,
    previousDate: result.previousSnapshotDate,
    currentDate: result.currentSnapshotDate,
    staffNote: result.staffNote,
  };
}

// =============================================
// HELPERS CAP INJURY RISK
// =============================================

function generateCAPProgrammingImpact(level: number): string {
  switch (level) {
    case 0:
    case 1:
      return "Aucune restriction spécifique liée au profil physiologique. Progression CAP standard recommandée.";
    case 2:
      return "Les options CAP longues (>75–90 min) sont possibles mais doivent rester ponctuelles et contrôlées. Surveiller la réponse tendineuse.";
    case 3:
      return "Les options CAP longues (>75–90 min) augmentent significativement le risque de blessure. Une priorisation du volume vélo est recommandée.";
    default:
      return "Données insuffisantes pour évaluer l'impact.";
  }
}

function generateCAPRecommendations(level: number): string[] {
  if (level <= 1) {
    return [
      "Progression CAP conforme au plan",
      "Surveiller les signes de surcharge (douleurs périostées, tendineuses)",
    ];
  }
  
  if (level === 2) {
    return [
      "Il serait pertinent de privilégier le développement de l'endurance via le vélo",
      "Il est recommandé de renforcer le travail d'économie avant l'allongement CAP",
      "Surveiller la réponse tendineuse et la dérive FC en fin de séance",
    ];
  }
  
  return [
    "Il est fortement recommandé de privilégier le volume vélo pour le développement aérobie",
    "Il serait pertinent de limiter les séances CAP longues aux phases spécifiques uniquement",
    "Renforcer le travail d'économie de course (cadence, pose de pied)",
    "Surveiller étroitement la dérive cardiaque et les signes de fatigue neuromusculaire",
    "Considérer un bilan podologique si douleurs récurrentes",
  ];
}

// =============================================
// HELPERS FATIGUE & RUN INJURY RISK (pour PDF)
// =============================================

function generateRunInjuryGuardrails(level: string | undefined): string[] {
  if (!level || level === "faible") {
    return ["Maintenir le monitoring habituel"];
  }
  
  if (level === "modéré") {
    return [
      "Surveiller densité de qualité CAP",
      "Privilégier Z2 sur sorties longues",
      "Éviter triade long + seuil + vitesse dans la même semaine",
    ];
  }
  
  // élevé
  return [
    "Limiter intensité CAP haute (seuil, VMA)",
    "Privilégier vélo pour charge cardiovasculaire",
    "Insérer journée recovery entre qualités CAP",
    "Réduire volume CAP de 10-20%",
  ];
}

function generateRunInjuryCoachOptions(level: string | undefined): string[] {
  if (!level || level === "faible" || level === "modéré") {
    return [];
  }
  
  return [
    "Remplacer qualité CAP par vélo Z3/Z4",
    "Réduire volume CAP de 15%",
    "Ajouter journée recovery complète",
  ];
}

// =============================================
// TRAINING RECOMMENDATIONS SECTION (pour PDF)
// =============================================

interface GenerateTrainingRecsParams {
  wahooSuggestions: WahooSuggestion[];
  objectif: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  fatigueScore?: number;
  injuryRiskRun?: { level: "faible" | "modéré" | "élevé"; score: number };
}

function generateTrainingRecommendationsSection(params: GenerateTrainingRecsParams): TrainingRecommendationsSection {
  const { wahooSuggestions, objectif, vlamaxEffectif, tteEffectif, fatigueScore, injuryRiskRun } = params;
  
  const recommendations = wahooSuggestions.map(suggestion => {
    // Déterminer le statut basé sur la priorité et les indices
    let status: "OK" | "Prudence" | "À éviter" = "OK";
    let statusColor: "green" | "orange" | "red" = "green";
    
    // Si fatigue élevée et séance intense
    if (fatigueScore && fatigueScore > 55) {
      const targetAxis = suggestion.targetAxis || "";
      const isIntense = ["VO2MAX", "MAP", "ANAEROBIC", "VO2"].includes(targetAxis.toUpperCase());
      if (isIntense) {
        status = "À éviter";
        statusColor = "red";
      }
    }
    
    // Si risque CAP élevé et séance CAP
    if (injuryRiskRun && injuryRiskRun.level === "élevé") {
      const targetNeed = suggestion.target_need || "";
      const isRunIntense = targetNeed.toLowerCase().includes("run");
      if (isRunIntense) {
        status = "Prudence";
        statusColor = "orange";
      }
    }
    
    // Déterminer l'objectif physiologique basé sur targetAxis
    let physiologicalObjective = "Développement général";
    const targetAxis = suggestion.targetAxis || "";
    const axisMap: Record<string, string> = {
      "VO2": "Augmenter cylindrée cardiaque",
      "VO2MAX": "Augmenter cylindrée cardiaque",
      "TTE": "Améliorer durabilité au seuil",
      "THRESHOLD": "Repousser le seuil anaérobie",
      "VLAMAX": "Abaisser VLamax, force basse cadence",
      "ENDURANCE": "Base aérobie, lipolyse",
      "FRESHNESS": "Régénération active",
    };
    physiologicalObjective = axisMap[targetAxis.toUpperCase()] || physiologicalObjective;
    
    return {
      platform: "WAHOO" as string,
      workoutName: suggestion.wahoo_name || "Séance",
      workoutType: suggestion.targetAxis || "General",
      status,
      statusColor,
      reason: suggestion.why || "Compatible avec le profil",
      physiologicalObjective,
    };
  });
  
  // Diagnostic summary
  const diagnosticParts: string[] = [];
  if (vlamaxEffectif.value !== null && vlamaxEffectif.value > 0.50) {
    diagnosticParts.push("VLamax élevé → éviter sprints/MAP");
  }
  if (tteEffectif.tte_min !== null && tteEffectif.tte_min < 40) {
    diagnosticParts.push("TTE insuffisant → privilégier durabilité");
  }
  if (fatigueScore && fatigueScore > 55) {
    diagnosticParts.push("Fatigue élevée → limiter intensité");
  }
  if (injuryRiskRun && injuryRiskRun.level === "élevé") {
    diagnosticParts.push("Risque CAP → privilégier vélo");
  }
  
  const diagnosticSummary = diagnosticParts.length > 0
    ? diagnosticParts.join(". ") + "."
    : "Profil équilibré. Toutes séances compatibles.";
  
  return {
    recommendations: recommendations.slice(0, 8), // Max 8 pour le PDF
    diagnosticSummary,
    disclaimer: "Ces recommandations sont des aides à la décision, non des prescriptions. Le coach reste décisionnaire.",
  };
}

// =============================================
// AMBITION PREDICTIONS SECTION (pour PDF)
// =============================================

import { 
  getVLamaxRange, 
  getTTETargetByAmbition, 
  getFtpKgTargetByAmbition 
} from "@/lib/physiologicalTargets";
import { AMBITION_LEVELS_ORDERED } from "@/types/ambitionLevel";

interface GenerateAmbitionPredictionsParams {
  objectif: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  ftp: number | null;
  poids: number | null;
  ambition: AmbitionLevel;
}

function calculateProgressForAmbition(
  vlamax: number | null,
  tte: number | null,
  ftpKg: number | null,
  objectif: string,
  ambition: AmbitionLevel
): number | null {
  const vlamaxRange = getVLamaxRange(objectif, ambition);
  const tteTarget = getTTETargetByAmbition(objectif, ambition);
  const ftpKgTarget = getFtpKgTargetByAmbition(objectif, ambition);

  const progresses: number[] = [];

  // VLamax progress (inverse - lower is better)
  if (vlamax !== null && vlamax > 0) {
    if (vlamax <= vlamaxRange.optimal) {
      progresses.push(100);
    } else {
      progresses.push(Math.max(0, Math.min(100, (vlamaxRange.optimal / vlamax) * 100)));
    }
  }

  // TTE progress
  if (tte !== null && tte > 0) {
    progresses.push(Math.min(100, (tte / tteTarget) * 100));
  }

  // FTP/kg progress
  if (ftpKg !== null && ftpKg > 0) {
    progresses.push(Math.min(100, (ftpKg / ftpKgTarget) * 100));
  }

  if (progresses.length === 0) return null;
  return Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length);
}

function formatDelayLabel(weeksToReach: number | null, isReached: boolean): string {
  if (isReached) return "✓ Atteint";
  if (weeksToReach === null) return "> 1 an";
  if (weeksToReach <= 4) return `~${weeksToReach} semaines`;
  const months = Math.round(weeksToReach / 4);
  return `~${months} mois`;
}

function generateAmbitionPredictionsSection(params: GenerateAmbitionPredictionsParams): AmbitionPredictionSection {
  const { objectif, vlamaxEffectif, tteEffectif, ftp, poids, ambition } = params;
  
  const ftpKg = ftp && poids && poids > 0 ? ftp / poids : null;
  
  const predictions = AMBITION_LEVELS_ORDERED.map((amb) => {
    const ambDef = getAmbitionDefinition(amb);
    const progress = calculateProgressForAmbition(
      vlamaxEffectif.value,
      tteEffectif.tte_min,
      ftpKg,
      objectif,
      amb
    );
    
    const isReached = progress !== null && progress >= 100;
    
    // Estimate weeks to reach (simplified - assumes ~1-2% progress per week based on typical training)
    let weeksToReach: number | null = null;
    if (progress !== null && !isReached) {
      const remaining = 100 - progress;
      // Assume 1-2% per week for average progression
      const avgProgressPerWeek = 1.5;
      weeksToReach = Math.ceil(remaining / avgProgressPerWeek);
      // Cap at 52 weeks
      if (weeksToReach > 52) weeksToReach = null;
    }
    
    const confidence: "high" | "medium" | "low" | "unknown" = 
      isReached ? "high" :
      progress !== null && progress >= 80 ? "high" :
      progress !== null && progress >= 50 ? "medium" :
      progress !== null ? "low" : "unknown";
    
    return {
      ambition: amb,
      ambitionLabel: ambDef.label,
      ambitionIcon: ambDef.icon,
      currentProgress: progress,
      weeksToReach: isReached ? 0 : weeksToReach,
      estimatedDate: weeksToReach !== null && !isReached
        ? new Date(Date.now() + weeksToReach * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : null,
      progressPerWeek: 1.5, // Simplified estimate
      confidence,
      isReached,
      delayLabel: formatDelayLabel(isReached ? 0 : weeksToReach, isReached),
    };
  });
  
  // Current ambition prediction summary
  const currentPrediction = predictions.find((p) => p.ambition === ambition);
  const currentAmbitionPrediction = currentPrediction
    ? currentPrediction.isReached
      ? `Objectif ${currentPrediction.ambitionLabel} atteint ✓`
      : currentPrediction.weeksToReach !== null
        ? `Objectif ${currentPrediction.ambitionLabel} estimé dans ${currentPrediction.delayLabel}`
        : `Objectif ${currentPrediction.ambitionLabel} à plus d'un an`
    : "Données insuffisantes pour la prédiction";
  
  // Trend summary
  const reachedCount = predictions.filter((p) => p.isReached).length;
  const trendSummary = reachedCount === 4 
    ? "Tous les niveaux d'ambition sont atteints 🏆"
    : reachedCount > 0
      ? `${reachedCount}/4 niveaux atteints. Progression en cours.`
      : "Aucun niveau d'ambition encore atteint. Travail en cours.";
  
  return {
    predictions,
    currentAmbitionPrediction,
    trendSummary,
  };
}

// =============================================
// TFCL REFERENCE WEEK SECTION (pour PDF)
// =============================================

function generateTFCLReferenceWeekSection(
  tfclData?: GenerateStaffReportParams["tfclData"]
): TFCLReferenceWeekSection {
  const p30s = tfclData?.p30s_w ?? null;
  const p60s = tfclData?.p60s_w ?? null;
  const map5min = tfclData?.map5min_w ?? null;
  const ftpW = tfclData?.ftp_w ?? null;
  const tte = tfclData?.tte_observed_min ?? null;
  const quality = tfclData?.protocol_quality ?? null;
  
  // Determine completed tests
  const completedTests: string[] = [];
  const missingData: string[] = [];
  
  if (p30s !== null && p60s !== null) {
    completedTests.push("D1 - Test Glycolytique (P30s + P60s)");
  } else {
    if (p30s === null) missingData.push("P30s (Puissance 30s)");
    if (p60s === null) missingData.push("P60s (Puissance 60s)");
  }
  
  if (map5min !== null) {
    completedTests.push("D3 - Test MAP 5 min");
  } else {
    missingData.push("MAP 5min (Puissance Aérobie Maximale)");
  }
  
  if (ftpW !== null && tte !== null) {
    completedTests.push("D5 - Test FTP + TTE");
  } else {
    if (ftpW === null) missingData.push("FTP (Puissance au Seuil)");
    if (tte === null) missingData.push("TTE (Time To Exhaustion)");
  }
  
  // VLamax V2 Enhanced requires P30, P60, MAP, TTE
  const isComplete = p30s !== null && p60s !== null && map5min !== null && tte !== null;
  
  // Calculate confidence adjustment based on protocol quality
  let confidenceAdjustment = 0;
  let confidenceAdjustmentLabel = "Aucun ajustement";
  
  if (quality !== null) {
    if (quality <= 2) {
      confidenceAdjustment = -0.10;
      confidenceAdjustmentLabel = "-10% (qualité insuffisante)";
    } else if (quality === 3) {
      confidenceAdjustment = 0;
      confidenceAdjustmentLabel = "0% (qualité standard)";
    } else if (quality === 4) {
      confidenceAdjustment = 0.05;
      confidenceAdjustmentLabel = "+5% (bonne qualité)";
    } else if (quality === 5) {
      confidenceAdjustment = 0.10;
      confidenceAdjustmentLabel = "+10% (excellente qualité)";
    }
  }
  
  // Quality label
  const qualityLabels: Record<number, string> = {
    1: "Très faible",
    2: "Faible",
    3: "Standard",
    4: "Bonne",
    5: "Excellente",
  };
  const qualityLabel = quality !== null ? qualityLabels[quality] || "Non évalué" : "Non évalué";
  
  return {
    isComplete,
    completedTests,
    missingData,
    testValues: {
      p30s_w: p30s,
      p60s_w: p60s,
      map5min_w: map5min,
      ftp_w: ftpW,
      tte_observed_min: tte,
      protocol_quality: quality,
    },
    confidenceAdjustment,
    confidenceAdjustmentLabel,
    qualityLabel,
    testDates: tfclData?.testDates ?? null,
  };
}

// =============================================
// NOUVELLES SECTIONS V2 — GÉNÉRATION
// =============================================

function isTriathlonObjectif(objectif: string): boolean {
  return ["IM", "Ironman", "703", "Half", "70.3"].includes(objectif);
}

function getVLamaxCategory(vlamax: number | null): string {
  if (vlamax === null) return "Inconnu";
  if (vlamax < 0.30) return "Diesel";
  if (vlamax < 0.40) return "Endurant";
  if (vlamax < 0.55) return "Équilibré";
  if (vlamax < 0.70) return "Explosif";
  return "Sprinter";
}

function getTTECategory(tte: number | null): string {
  if (tte === null) return "Inconnu";
  if (tte >= 60) return "Excellent";
  if (tte >= 50) return "Bon";
  if (tte >= 40) return "Correct";
  if (tte >= 30) return "Insuffisant";
  return "Critique";
}

function getFTPKgCategory(ftpKg: number | null): string {
  if (ftpKg === null) return "Inconnu";
  if (ftpKg >= 4.5) return "Elite";
  if (ftpKg >= 4.0) return "Très bon";
  if (ftpKg >= 3.5) return "Bon";
  if (ftpKg >= 3.0) return "Correct";
  return "À développer";
}

function generateMetabolicProfileCompleteSection(params: {
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  ftp: number | null;
  poids: number | null;
  objectif: string;
  ambition: AmbitionLevel;
  tss7d?: number | null;
  snapshotDate?: string | null;
  snapshotUpdatedAt?: string | null;
  athleteAge?: number | null;
}): MetabolicProfileCompleteSection {
  const { vlamaxEffectif, tteEffectif, ftp, poids, objectif, ambition, tss7d, snapshotDate, snapshotUpdatedAt, athleteAge } = params;
  const ftpKg = ftp && poids && poids > 0 ? ftp / poids : null;
  
  // ✅ UTILISER computeCompassScores COMME SOURCE UNIQUE DE VÉRITÉ
  const crr = computeCRR({ tss7d: tss7d ?? null, snapshotDate: snapshotDate ?? null, snapshotUpdatedAt: snapshotUpdatedAt ?? null });
  const compassScores = computeCompassScores({
    ftp,
    poids,
    vlamaxEffectif,
    tteEffectif,
    crr,
    objectif,
    ambition,
    athleteAge,
  });
  
  // Utiliser les scores du Compass pour le radar
  const vlamaxNorm = compassScores.profilMetabolique.score;
  const tteNorm = compassScores.toleranceEffort.score;
  const ftpKgNorm = compassScores.capaciteAerobie.score;
  
  // Determine overall balance (basé sur les données brutes)
  let overallBalance: "equilibre" | "glycolytique" | "endurant" | "mixte" = "equilibre";
  if (vlamaxEffectif.value !== null) {
    if (vlamaxEffectif.value < 0.35) overallBalance = "endurant";
    else if (vlamaxEffectif.value > 0.55) overallBalance = "glycolytique";
    else if (tteEffectif.tte_min !== null && tteEffectif.tte_min < 45) overallBalance = "mixte";
  }
  
  const balanceLabels = {
    equilibre: "Profil équilibré",
    glycolytique: "Profil glycolytique (explosif)",
    endurant: "Profil endurant (diesel)",
    mixte: "Profil mixte (TTE à travailler)",
  };
  
  // Calculate gaps using compass interpretation
  const gaps: { metric: string; gap: string; priority: "high" | "medium" | "low" }[] = [];
  
  if (compassScores.profilMetabolique.score < 70) {
    gaps.push({
      metric: "VLamax",
      gap: compassScores.profilMetabolique.explanation,
      priority: compassScores.profilMetabolique.score < 50 ? "high" : "medium",
    });
  }
  if (compassScores.toleranceEffort.score < 70) {
    gaps.push({
      metric: "TTE",
      gap: compassScores.toleranceEffort.explanation,
      priority: compassScores.toleranceEffort.score < 50 ? "high" : "medium",
    });
  }
  if (compassScores.capaciteAerobie.score < 70) {
    gaps.push({
      metric: "FTP/kg",
      gap: compassScores.capaciteAerobie.explanation,
      priority: compassScores.capaciteAerobie.score < 50 ? "high" : "medium",
    });
  }
  
  // Interpretation basée sur le score global du Compass
  let interpretation = "";
  if (compassScores.globalScore >= 80) {
    interpretation = `Profil ${compassScores.globalLabel}. ${compassScores.mainStrength ? `Point fort: ${compassScores.mainStrength}.` : ""} L'athlète est bien positionné pour son objectif.`;
  } else if (compassScores.globalScore >= 65) {
    interpretation = `${compassScores.globalLabel}. ${compassScores.mainLimitation ? `Priorité: développer ${compassScores.mainLimitation}.` : ""} Bon potentiel d'amélioration.`;
  } else if (compassScores.globalScore >= 50) {
    interpretation = `${compassScores.globalLabel}. ${compassScores.mainLimitation ? `Limitation principale: ${compassScores.mainLimitation}.` : ""} Travail structuré nécessaire.`;
  } else {
    interpretation = `${compassScores.globalLabel}. Plusieurs axes à développer prioritairement. Focus sur ${compassScores.mainLimitation || "l'endurance de base"}.`;
  }
  
  return {
    vlamaxValue: vlamaxEffectif.value,
    vlamaxLabel: vlamaxEffectif.value !== null ? `${vlamaxEffectif.value.toFixed(2)} mmol/L/s` : "—",
    vlamaxCategory: getVLamaxCategory(vlamaxEffectif.value),
    vlamaxPercentile: null,
    tteValue: tteEffectif.tte_min,
    tteLabel: tteEffectif.tte_min !== null ? `${tteEffectif.tte_min} min` : "—",
    tteCategory: getTTECategory(tteEffectif.tte_min),
    ftpKg,
    ftpKgLabel: ftpKg !== null ? `${ftpKg.toFixed(2)} W/kg` : "—",
    ftpKgCategory: getFTPKgCategory(ftpKg),
    // ✅ Utiliser les scores du Compass pour cohérence
    radarData: [
      { axis: "VLamax", value: vlamaxNorm, target: 80 },
      { axis: "TTE", value: tteNorm, target: 80 },
      { axis: "FTP/kg", value: ftpKgNorm, target: 80 },
    ],
    overallBalance,
    overallBalanceLabel: balanceLabels[overallBalance],
    interpretation,
    gaps,
    // ✅ Ajouter les scores du Compass pour usage dans le rapport
    compassScores,
  };
}

function generateNutritionV2DetailedSection(params: {
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  poids: number | null;
  objectif: string;
  vo2max?: number | null;
}): NutritionV2DetailedSection {
  const { vlamaxEffectif, tteEffectif, poids, objectif, vo2max } = params;
  
  // Determine sport and duration based on objectif
  const isCAP = ["Marathon", "Semi", "10km", "Trail", "TrailCourt", "TrailLong", "Ultra"].includes(objectif);
  const sport = isCAP ? "cap" : "velo";
  const sportLabel = isCAP ? "Course à pied" : "Vélo";
  
  // Duration estimates by objectif
  const durationMap: Record<string, number> = {
    IM: 10, Ironman: 10, "703": 5, Half: 5,
    Marathon: 3.5, Semi: 1.75, "10km": 0.75,
    Trail: 4, TrailCourt: 2, TrailLong: 8, Ultra: 12,
  };
  const targetDuration = durationMap[objectif] ?? 4;
  
  // Base calculation — Audit #8 : délégué à la source canonique
  // `nutritionUnified.computeBaseRateMader` (Mader-Heck) pour éviter tout
  // bypass. Le taux de base intègre déjà VLamax + intensité + durée + chaleur.
  const weightKg = poids ?? 70;
  const targetIntensityPct = isCAP ? 82 : 72;
  const maderBase = computeBaseRateMader(
    weightKg,
    sport,
    vo2max ?? null,
    vlamaxEffectif.value,
    targetIntensityPct,
    targetDuration,
  );
  const baseRate = maderBase.baseRate;
  
  // Adjustments — Aligné sur nutritionUnified.computeNutritionUnified :
  // VLamax déjà intégré dans Mader (pas de double-comptage). Seuls TTE + durée
  // sont ajoutés comme modulateurs coach-facing.
  const contributors: { label: string; adjustment: string; explanation: string }[] = [];
  let totalAdjustment = 0;
  
  contributors.push({
    label: "Taux de base (Mader)",
    adjustment: `${baseRate} g/h`,
    explanation: `Oxydation totale : ${maderBase.totalOxidation} g/h → exogène : ${baseRate} g/h (${sportLabel}, ${weightKg} kg, ${targetIntensityPct}% intensité, ${targetDuration}h)`,
  });

  
  // TTE adjustment
  if (tteEffectif.tte_min !== null) {
    let adj = 0;
    let expl = "";
    if (tteEffectif.tte_min < 45) {
      adj = 10;
      expl = "TTE court (<45 min) → tolérance glycogène réduite";
    } else if (tteEffectif.tte_min > 55) {
      adj = -5;
      expl = "TTE long (>55 min) → meilleure endurance glycogène";
    }
    if (adj !== 0) {
      totalAdjustment += adj;
      contributors.push({
        label: "Modulation TTE",
        adjustment: `${adj > 0 ? "+" : ""}${adj} g/h`,
        explanation: expl,
      });
    }
  }
  
  // Duration adjustment
  if (targetDuration > 4) {
    totalAdjustment += 10;
    contributors.push({
      label: "Modulation durée",
      adjustment: "+10 g/h",
      explanation: "Durée très longue (>4h) → besoins augmentés",
    });
  } else if (targetDuration > 3) {
    totalAdjustment += 5;
    contributors.push({
      label: "Modulation durée",
      adjustment: "+5 g/h",
      explanation: "Durée longue (>3h) → besoins légèrement augmentés",
    });
  }
  
  // Final calculation
  const carbsCentral = Math.max(40, Math.min(100, baseRate + totalAdjustment));
  const carbsMin = Math.max(40, carbsCentral - 5);
  const carbsMax = Math.min(100, carbsCentral + 5);
  
  // Risk score
  let riskScore = 0;
  if (vlamaxEffectif.value !== null && vlamaxEffectif.value > 0.55) riskScore++;
  if (tteEffectif.tte_min !== null && tteEffectif.tte_min < 45) riskScore++;
  if (targetDuration > 3) riskScore++;
  if (isCAP) riskScore++;
  
  const riskLabels = ["Faible", "Modéré", "Élevé", "Élevé", "Critique"];
  const riskIcons = ["✅", "⚠️", "🔶", "🔶", "🛑"];
  
  // Recommendations
  const recommendations: string[] = [];
  if (riskScore >= 3) {
    recommendations.push("Entraînement digestif régulier recommandé");
    recommendations.push("Fractionner les apports toutes les 15-20 min");
  }
  if (carbsCentral >= 70) {
    recommendations.push("Privilégier les gels + boissons isotoniques");
  }
  if (isCAP) {
    recommendations.push("Tester la tolérance digestive à l'entraînement");
  }
  recommendations.push("Adapter en fonction des conditions météo");
  
  // Warnings
  const warnings: string[] = [];
  if (vlamaxEffectif.value !== null && vlamaxEffectif.value > 0.60) {
    warnings.push("Profil glycolytique — forte dépendance glucidique");
  }
  if (isCAP && carbsCentral >= 75) {
    warnings.push("Besoins élevés en CAP — risque digestif");
  }
  if (riskScore >= 3) {
    warnings.push("Risque de déplétion élevé — stratégie nutritionnelle impérative");
  }
  
  // Segment strategy for triathlon
  let segmentStrategy: NutritionV2DetailedSection["segmentStrategy"] = null;
  let totalRaceCarbs: number | null = null;
  
  if (isTriathlonObjectif(objectif)) {
    const isFullIM = ["IM", "Ironman"].includes(objectif);
    segmentStrategy = isFullIM
      ? [
          { segment: "Natation", duration: "1h00-1h15", carbsPerHour: "0", totalGrams: "0", notes: "Pas d'apport pendant la natation" },
          { segment: "T1", duration: "5-10 min", carbsPerHour: "—", totalGrams: "30-40", notes: "Gel/boisson rapide" },
          { segment: "Vélo", duration: "5h00-6h00", carbsPerHour: `${carbsCentral - 5}-${carbsCentral + 5}`, totalGrams: `${Math.round((carbsCentral) * 5.5)}`, notes: "Régularité absolue" },
          { segment: "T2", duration: "5 min", carbsPerHour: "—", totalGrams: "20-30", notes: "Gel rapide" },
          { segment: "Marathon", duration: "3h30-5h00", carbsPerHour: `${Math.round(carbsCentral * 1.1)}-${Math.round(carbsCentral * 1.2)}`, totalGrams: `${Math.round((carbsCentral * 1.1) * 4)}`, notes: "Fractionner ++" },
        ]
      : [
          { segment: "Natation", duration: "30-40 min", carbsPerHour: "0", totalGrams: "0", notes: "Pas d'apport" },
          { segment: "T1", duration: "3-5 min", carbsPerHour: "—", totalGrams: "20", notes: "Gel rapide" },
          { segment: "Vélo", duration: "2h30-3h00", carbsPerHour: `${carbsCentral - 5}-${carbsCentral + 5}`, totalGrams: `${Math.round((carbsCentral) * 2.75)}`, notes: "Régularité" },
          { segment: "T2", duration: "3 min", carbsPerHour: "—", totalGrams: "15-20", notes: "Gel" },
          { segment: "Semi-Marathon", duration: "1h30-2h00", carbsPerHour: `${Math.round(carbsCentral * 1.05)}`, totalGrams: `${Math.round((carbsCentral * 1.05) * 1.75)}`, notes: "Gels fractionnés" },
        ];
    
    totalRaceCarbs = segmentStrategy.reduce((sum, seg) => {
      const grams = parseInt(seg.totalGrams) || 0;
      return sum + grams;
    }, 0);
  } else if (["Marathon", "Semi"].includes(objectif)) {
    segmentStrategy = objectif === "Marathon"
      ? [
          { segment: "0-10 km", duration: "45-55 min", carbsPerHour: `${carbsCentral - 5}`, totalGrams: `${Math.round((carbsCentral - 5) * 0.85)}`, notes: "Démarrage progressif" },
          { segment: "10-25 km", duration: "1h10-1h20", carbsPerHour: `${carbsCentral}`, totalGrams: `${Math.round(carbsCentral * 1.25)}`, notes: "Régularité maximale" },
          { segment: "25-42 km", duration: "1h20-1h40", carbsPerHour: `${carbsCentral + 5}`, totalGrams: `${Math.round((carbsCentral + 5) * 1.5)}`, notes: "Renforcer si signes de fatigue" },
        ]
      : [
          { segment: "0-10 km", duration: "40-50 min", carbsPerHour: `${carbsCentral - 5}`, totalGrams: `${Math.round((carbsCentral - 5) * 0.75)}`, notes: "Modéré" },
          { segment: "10-21 km", duration: "45-55 min", carbsPerHour: `${carbsCentral}`, totalGrams: `${Math.round(carbsCentral * 0.85)}`, notes: "Stable" },
        ];
    
    totalRaceCarbs = segmentStrategy.reduce((sum, seg) => {
      const grams = parseInt(seg.totalGrams) || 0;
      return sum + grams;
    }, 0);
  }
  
  // Why this number
  const whyThisNumber = `Votre besoin estimé de ${carbsCentral} g/h est calculé à partir de votre poids (${weightKg} kg), ` +
    `votre VLamax (${vlamaxEffectif.value?.toFixed(2) ?? "inconnue"}), ` +
    `votre TTE (${tteEffectif.tte_min ?? "inconnu"} min), ` +
    `et la durée estimée de votre objectif (${targetDuration}h).`;
  
  return {
    carbsMin,
    carbsMax,
    carbsCentral,
    glycogenRisk: riskLabels[riskScore] || "Inconnu",
    glycogenRiskScore: riskScore,
    glycogenRiskIcon: riskIcons[riskScore] || "⚪",
    sportLabel,
    contributors,
    whyThisNumber,
    recommendations,
    warnings,
    segmentStrategy,
    totalRaceCarbs,
  };
}

function generateVLamaxCombinedTriathlonSection(params: {
  vlamaxEffectif: VLamaxEffectif;
  objectif: string;
}): VLamaxCombinedTriathlonSection {
  const { vlamaxEffectif, objectif } = params;
  
  // For now, same VLamax for bike and run (could be differentiated later)
  const vlamaxBike = vlamaxEffectif.value;
  const vlamaxRun = vlamaxEffectif.value; // In reality, run VLamax is often slightly lower
  
  const delta = vlamaxBike !== null && vlamaxRun !== null ? vlamaxBike - vlamaxRun : null;
  
  let deltaInterpretation = "";
  let profileCoherence: "coherent" | "divergent" = "coherent";
  
  if (delta !== null) {
    if (Math.abs(delta) < 0.05) {
      deltaInterpretation = "Profils cohérents entre vélo et CAP. Stratégie nutritionnelle unifiée possible.";
      profileCoherence = "coherent";
    } else if (delta > 0) {
      deltaInterpretation = `Profil plus glycolytique à vélo (+${delta.toFixed(2)}). Attention à la gestion glucides sur segment vélo.`;
      profileCoherence = "divergent";
    } else {
      deltaInterpretation = `Profil plus glycolytique en CAP (${delta.toFixed(2)}). Vigilance sur le marathon après vélo.`;
      profileCoherence = "divergent";
    }
  } else {
    deltaInterpretation = "Données insuffisantes pour comparer les profils.";
  }
  
  // Nutrition impact
  let nutritionImpact = "";
  if (vlamaxBike !== null && vlamaxBike > 0.55) {
    nutritionImpact = "VLamax élevée : apports glucidiques importants nécessaires sur le segment vélo et CAP.";
  } else if (vlamaxBike !== null && vlamaxBike < 0.35) {
    nutritionImpact = "VLamax basse : bonne économie lipidique, apports modérés suffisants.";
  } else {
    nutritionImpact = "Profil équilibré : stratégie nutritionnelle standard recommandée.";
  }
  
  // Training priority
  let trainingPriority = "";
  if (vlamaxBike !== null && vlamaxBike > 0.50) {
    trainingPriority = "Priorité : travail d'abaissement VLamax en vélo (Z2 longue, force basse cadence).";
  } else if (vlamaxBike !== null && vlamaxBike < 0.35) {
    trainingPriority = "Priorité : développement puissance et TTE (le moteur endurant est déjà installé).";
  } else {
    trainingPriority = "Priorité : équilibre entre développement TTE et maintien du profil métabolique.";
  }
  
  return {
    vlamaxBike,
    vlamaxBikeLabel: vlamaxBike !== null ? `${vlamaxBike.toFixed(2)} mmol/L/s` : "—",
    vlamaxRun,
    vlamaxRunLabel: vlamaxRun !== null ? `${vlamaxRun.toFixed(2)} mmol/L/s` : "—",
    delta,
    deltaInterpretation,
    profileCoherence,
    nutritionImpact,
    trainingPriority,
  };
}

function generateTrainingLeversSection(params: {
  objectif: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  fatigueScore?: number;
  injuryRiskRun?: { level: string; score: number };
}): TrainingLeversSection {
  const { objectif, vlamaxEffectif, tteEffectif, fatigueScore, injuryRiskRun } = params;
  
  // Determine sport
  const isTri = isTriathlonObjectif(objectif);
  const isRun = ["Marathon", "Semi", "10km", "Trail", "TrailCourt", "TrailLong", "Ultra"].includes(objectif);
  const sport = isTri ? "triathlon" : isRun ? "running" : "cycling";
  const sportLabel = isTri ? "Triathlon" : isRun ? "Course à pied" : "Vélo";
  
  // Key statement based on sport
  const keyStatements: Record<string, string> = {
    triathlon: "On développe le moteur en vélo, on protège la structure en course à pied.",
    running: "La régularité et l'économie priment sur le volume.",
    cycling: "Le développement de la durabilité et l'abaissement VLamax sont les clés de la performance longue distance.",
  };
  
  // Priority levers based on profile
  const priorityLevers: { name: string; effect: string; riskLevel: string }[] = [];
  const cautionLevers: { name: string; effect: string; conditions: string[] }[] = [];
  const discouragedLevers: { name: string; reason: string }[] = [];
  
  // Common priority levers
  priorityLevers.push({
    name: "Endurance Z2 longue",
    effect: "Baisse VLamax, amélioration économie lipidique",
    riskLevel: "Faible",
  });
  
  if (vlamaxEffectif.value !== null && vlamaxEffectif.value > 0.45) {
    priorityLevers.push({
      name: "Force basse cadence (50-65 rpm)",
      effect: "Sollicitation fibres lentes, baisse contribution glycolytique",
      riskLevel: "Faible",
    });
  }
  
  if (tteEffectif.tte_min !== null && tteEffectif.tte_min < 50) {
    priorityLevers.push({
      name: "Tempo étendu (Sweet Spot)",
      effect: "Développement TTE et endurance au seuil",
      riskLevel: "Modéré",
    });
  }
  
  // Caution levers
  if (isTri) {
    cautionLevers.push({
      name: "Brick intensif (enchaînement vélo-CAP)",
      effect: "Simulation course réelle",
      conditions: ["TTE vélo > 40 min", "Fatigue < 50%", "Expérience triathlon"],
    });
  }
  
  if (vlamaxEffectif.value !== null && vlamaxEffectif.value < 0.40) {
    cautionLevers.push({
      name: "Intervalles VO2max",
      effect: "Développement puissance aérobie",
      conditions: ["Profil déjà endurant", "Fatigue basse", "Période de construction"],
    });
  }
  
  // Discouraged levers based on context
  if (fatigueScore !== undefined && fatigueScore > 60) {
    discouragedLevers.push({
      name: "Séances haute intensité",
      reason: "Fatigue élevée — risque de surentraînement",
    });
  }
  
  if (injuryRiskRun && injuryRiskRun.level === "élevé") {
    discouragedLevers.push({
      name: "Volume CAP élevé",
      reason: "Risque blessure CAP élevé — privilégier le vélo",
    });
  }
  
  if (vlamaxEffectif.value !== null && vlamaxEffectif.value > 0.55 && isTri) {
    discouragedLevers.push({
      name: "Sprints/intervalles courts répétés",
      reason: "VLamax déjà élevée — risque d'aggravation du profil glycolytique",
    });
  }
  
  return {
    sport,
    sportLabel,
    keyStatement: keyStatements[sport] || "",
    priorityLevers,
    cautionLevers,
    discouragedLevers,
  };
}

function generateMethodologyRecommendationSection(params: {
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  objectif: string;
}): MethodologyRecommendationSection {
  const { vlamaxEffectif, tteEffectif, objectif } = params;
  
  // Determine recommended approach
  let recommendedApproach = "tfcl";
  let recommendedApproachLabel = "TFCL (Two For Coaching Lab)";
  let justification = "";
  
  if (vlamaxEffectif.value !== null) {
    if (vlamaxEffectif.value > 0.55) {
      recommendedApproach = "inversee";
      recommendedApproachLabel = "Méthode Inversée (Dan Lorang)";
      justification = "Profil glycolytique élevé nécessitant un abaissement VLamax prioritaire via force basse cadence et endurance Z2 prolongée.";
    } else if (vlamaxEffectif.value < 0.35) {
      recommendedApproach = "classique";
      recommendedApproachLabel = "Méthode Classique (pyramidale)";
      justification = "Profil endurant déjà installé. Focus sur le développement de la puissance et du TTE via une approche pyramidale.";
    } else if (tteEffectif.tte_min !== null && tteEffectif.tte_min < 45) {
      recommendedApproach = "tfcl";
      recommendedApproachLabel = "TFCL (Two For Coaching Lab)";
      justification = "Profil équilibré mais TTE insuffisant. Approche TFCL pour développer simultanément l'endurance et optimiser le profil.";
    } else {
      recommendedApproach = "polarisee";
      recommendedApproachLabel = "Méthode Polarisée";
      justification = "Profil bien équilibré. Approche polarisée (80% Z2, 20% Z4-Z5) pour maintenir le profil tout en progressant.";
    }
  } else {
    justification = "Données VLamax insuffisantes — approche TFCL recommandée par défaut pour établir le profil.";
  }
  
  // Key principles
  const keyPrinciples: string[] = [];
  if (recommendedApproach === "inversee") {
    keyPrinciples.push("Force basse cadence 2-3x/semaine");
    keyPrinciples.push("Z2 longue (3-5h) hebdomadaire");
    keyPrinciples.push("Éviter les intervalles courts répétés");
    keyPrinciples.push("Patience : 8-12 semaines pour effets significatifs");
  } else if (recommendedApproach === "classique") {
    keyPrinciples.push("Base aérobie solide (Z2)");
    keyPrinciples.push("Progression pyramidale vers le seuil");
    keyPrinciples.push("Travail VO2max en phase de construction");
    keyPrinciples.push("Spécifique en phase de compétition");
  } else if (recommendedApproach === "polarisee") {
    keyPrinciples.push("80% du volume en Z1-Z2");
    keyPrinciples.push("20% en Z4-Z5 (pas de Z3)");
    keyPrinciples.push("Séparation stricte intensités");
    keyPrinciples.push("Récupération complète entre qualités");
  } else {
    keyPrinciples.push("Approche intégrée VLamax + TTE");
    keyPrinciples.push("Flexibilité selon le contexte");
    keyPrinciples.push("Monitoring continu des indicateurs");
    keyPrinciples.push("Ajustement selon la réponse individuelle");
  }
  
  // Alternative approaches
  const alternativeApproaches: { name: string; suitability: string }[] = [
    {
      name: "Polarisée",
      suitability: recommendedApproach === "polarisee" ? "Recommandée" : "Compatible si profil équilibré",
    },
    {
      name: "Inversée (Lorang)",
      suitability: recommendedApproach === "inversee" ? "Recommandée" : vlamaxEffectif.value !== null && vlamaxEffectif.value > 0.50 ? "Très adaptée" : "Optionnelle",
    },
    {
      name: "Classique (Pyramidale)",
      suitability: recommendedApproach === "classique" ? "Recommandée" : "Compatible tous profils",
    },
  ];
  
  return {
    recommendedApproach,
    recommendedApproachLabel,
    justification,
    keyPrinciples,
    alternativeApproaches,
    disclaimer: "Cette recommandation est basée sur le profil physiologique actuel. Elle doit être adaptée au contexte, à l'historique de l'athlète et aux contraintes de temps.",
  };
}

// =============================================
// VO2MAX AGE COMPARISON SECTION
// =============================================

import { 
  getVo2maxTarget, 
  getVo2maxAgeFactor 
} from "@/engines/diagnostic";

const AMBITION_LABELS_REPORT: Record<string, { label: string; emoji: string }> = {
  finisher: { label: "Finisher", emoji: "🎯" },
  age_group: { label: "Age Group", emoji: "🏅" },
  competitor: { label: "Compétiteur", emoji: "🥈" },
  elite: { label: "Élite", emoji: "🏆" },
};

function generateVO2maxAgeComparisonSection(params: {
  objectif: string;
  ambition: AmbitionLevel;
  age: number | null;
  currentVo2max: number | null;
}): VO2maxAgeComparisonSection {
  const { objectif, ambition, age, currentVo2max } = params;
  
  const ageFactor = getVo2maxAgeFactor(age);
  const hasAgeAdjustment = age !== null && age >= 30;
  const reductionPercent = hasAgeAdjustment ? Math.round((1 - ageFactor) * 100) : 0;
  
  const ambitions = ["finisher", "age_group", "competitor", "elite"];
  
  const rows = ambitions.map((amb) => {
    const baseTarget = getVo2maxTarget(objectif, amb, null); // Sans âge
    const adjustedTarget = getVo2maxTarget(objectif, amb, age); // Avec âge
    const difference = adjustedTarget - baseTarget;
    const ambitionInfo = AMBITION_LABELS_REPORT[amb] || { label: amb, emoji: "📊" };

    return {
      ambition: amb,
      ambitionLabel: ambitionInfo.label,
      emoji: ambitionInfo.emoji,
      baseTarget,
      adjustedTarget,
      difference,
      isCurrent: amb === ambition,
    };
  });
  
  const explanation = hasAgeAdjustment
    ? `Les cibles sont réduites de ${reductionPercent}% pour tenir compte du déclin naturel du VO₂max avec l'âge (${age} ans). Ces valeurs restent des objectifs ambitieux et réalistes.`
    : age !== null
      ? `À ${age} ans, les cibles VO₂max de référence s'appliquent sans ajustement (< 30 ans = référence).`
      : "Aucune date de naissance renseignée — les cibles de référence < 30 ans s'appliquent.";

  const currentAmbitionInfo = AMBITION_LABELS_REPORT[ambition] || { label: ambition, emoji: "📊" };
  
  return {
    hasAgeAdjustment,
    age,
    ageFactor,
    reductionPercent,
    objectifLabel: getObjectifLabel(objectif),
    currentAmbition: ambition,
    currentAmbitionLabel: currentAmbitionInfo.label,
    currentVo2max,
    rows,
    explanation,
  };
}
