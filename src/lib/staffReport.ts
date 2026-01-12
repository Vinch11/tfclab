/**
 * RAPPORT STAFF PRÉ-COURSE - Vince's Lab
 * Synthèse d'une page, lisible en < 2 minutes
 * Destiné aux coachs, staffs et athlètes experts
 */

import { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { TTEEffectif } from "@/lib/tteEffectif";
import { RaceReadinessEffectif } from "@/lib/raceReadinessEffectif";
import { NutritionEstimate, computeNutritionEstimate } from "@/lib/nutritionPredictive";
import { RunningEconomyResult } from "@/lib/runningEconomy";
import { computeCAPInjuryRisk, CAPInjuryRiskResult, getCAPRiskIcon } from "@/lib/capInjuryRisk";
import { 
  suggestWahooWorkouts, 
  formatSuggestionsForPDF, 
  type SuggestionEngineContext,
  type SuggestionEngineOutput,
  type WahooSuggestion 
} from "@/lib/wahoo/wahooSuggestionEngine";
// =============================================
// TYPES
// =============================================

export type TrafficLight = "green" | "orange" | "red";
export type LimitationType = "metabolic" | "endurance" | "economy" | "nutrition" | "power" | "none";

export interface ExecutiveSummary {
  raceReadinessScore: number;
  raceReadinessLabel: string;
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

export interface StaffReport {
  // Métadonnées
  athleteName: string;
  objectif: string;
  objectifLabel: string;
  snapshotDate: string;
  generatedAt: string;
  
  // Sections du rapport
  executiveSummary: ExecutiveSummary;
  keyIndicators: KeyIndicator[];
  capInjuryRisk: CAPInjuryRiskSection;
  fatigueRisk: FatigueRiskSection;
  trainingRecommendations: TrainingRecommendationsSection;
  staffInterpretation: StaffInterpretation;
  raceStrategy: RaceStrategy;
  nutritionSummary: NutritionSummary;
  wahooSuggestions: WahooSuggestionsSection;
  finalVerdict: FinalVerdict;
}

export interface GenerateStaffReportParams {
  athleteName: string;
  objectif: string;
  snapshotDate: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  readiness: RaceReadinessEffectif;
  nutritionEstimate: NutritionEstimate | null;
  runningEconomy: RunningEconomyResult | null;
  ftp: number | null;
  sportFocus?: "run" | "bike" | "tri";
  CRR?: { value: number | null; confidence: number };
  fatigueScore?: number;
  injuryRiskRun?: { level: "faible" | "modéré" | "élevé"; score: number };
  poids: number | null;
  fcMax: number | null;
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

function determineMainLimitation(params: {
  readiness: RaceReadinessEffectif;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  nutritionEstimate: NutritionEstimate | null;
  runningEconomy: RunningEconomyResult | null;
}): { type: LimitationType; label: string } {
  const { readiness, vlamaxEffectif, tteEffectif, nutritionEstimate, runningEconomy } = params;
  
  // Vérifier les plafonnements en priorité
  if (readiness.wasCappedByEconomy && runningEconomy?.level === "very_weak") {
    return { type: "economy", label: "Économie de course" };
  }
  if (readiness.wasCappedByNutrition && nutritionEstimate?.nutritionalRiskIndex.level === "critical") {
    return { type: "nutrition", label: "Risque nutritionnel" };
  }
  
  // Analyser les scores par composant
  const { details } = readiness;
  const scores = [
    { type: "metabolic" as LimitationType, score: details.vlamax, label: "VLamax (métabolique)" },
    { type: "endurance" as LimitationType, score: details.endurance, label: "TTE (endurance)" },
    { type: "power" as LimitationType, score: details.puissance, label: "Puissance relative" },
  ];
  
  // Trouver le plus faible
  const weakest = scores.sort((a, b) => a.score - b.score)[0];
  
  // Si économie faible et applicable
  if (runningEconomy?.isApplicable && (runningEconomy.level === "weak" || runningEconomy.level === "very_weak")) {
    return { type: "economy", label: "Économie de course" };
  }
  
  // Si nutrition à risque élevé
  if (nutritionEstimate && (nutritionEstimate.riskLevel === "high" || nutritionEstimate.riskLevel === "critical")) {
    return { type: "nutrition", label: "Risque nutritionnel" };
  }
  
  if (weakest.score < 15) {
    return { type: weakest.type, label: weakest.label };
  }
  
  return { type: "none", label: "Aucune limitation majeure" };
}

function determineTrafficLight(readiness: RaceReadinessEffectif): TrafficLight {
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
  readiness: RaceReadinessEffectif,
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
  readiness: RaceReadinessEffectif;
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
    messages.push("⚠️ Race Readiness plafonné par le risque nutritionnel");
  }
  if (readiness.wasCappedByEconomy) {
    messages.push("⚠️ Race Readiness plafonné par l'économie de course");
  }
  
  return {
    mainMessage,
    secondaryMessages: messages.slice(0, 3),
    actionOriented: true,
  };
}

function generateRaceStrategy(params: {
  objectif: string;
  readiness: RaceReadinessEffectif;
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
  readiness: RaceReadinessEffectif,
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
  } = params;
  
  // Déterminer la limitation principale
  const limitation = determineMainLimitation({
    readiness,
    vlamaxEffectif,
    tteEffectif,
    nutritionEstimate,
    runningEconomy,
  });
  
  // Générer le feu tricolore
  const trafficLight = determineTrafficLight(readiness);
  
  // Générer le résumé exécutif
  const executiveSummary: ExecutiveSummary = {
    raceReadinessScore: readiness.score,
    raceReadinessLabel: readiness.label,
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
    raceReadiness: {
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
  
  return {
    athleteName,
    objectif,
    objectifLabel: getObjectifLabel(objectif),
    snapshotDate,
    generatedAt: new Date().toISOString().slice(0, 10),
    executiveSummary,
    keyIndicators,
    capInjuryRisk,
    fatigueRisk,
    trainingRecommendations,
    staffInterpretation,
    raceStrategy,
    nutritionSummary,
    wahooSuggestions,
    finalVerdict,
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
      const isIntense = ["VO2MAX", "MAP", "ANAEROBIC"].some(t => 
        suggestion.workoutType?.toUpperCase().includes(t) || 
        suggestion.primaryAxis?.toUpperCase().includes(t)
      );
      if (isIntense) {
        status = "À éviter";
        statusColor = "red";
      }
    }
    
    // Si risque CAP élevé et séance CAP
    if (injuryRiskRun && injuryRiskRun.level === "élevé") {
      const isRunIntense = suggestion.workoutType?.toLowerCase().includes("run") || 
                           suggestion.primaryAxis?.toLowerCase().includes("running");
      if (isRunIntense) {
        status = "Prudence";
        statusColor = "orange";
      }
    }
    
    // Déterminer l'objectif physiologique
    let physiologicalObjective = "Développement général";
    if (suggestion.primaryAxis) {
      const axisMap: Record<string, string> = {
        "VO2MAX": "Augmenter cylindrée cardiaque",
        "THRESHOLD": "Repousser le seuil anaérobie",
        "SWEET_SPOT": "Améliorer durabilité au seuil",
        "LOW_CADENCE": "Développer force, abaisser VLamax",
        "ENDURANCE": "Base aérobie, lipolyse",
        "NEUROMUSCULAR": "Explosivité, recrutement neural",
        "RECOVERY": "Régénération active",
      };
      physiologicalObjective = axisMap[suggestion.primaryAxis] || physiologicalObjective;
    }
    
    return {
      platform: "WAHOO" as string,
      workoutName: suggestion.workoutTitle || "Séance",
      workoutType: suggestion.workoutType || "General",
      status,
      statusColor,
      reason: suggestion.whyRecommended || "Compatible avec le profil",
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
