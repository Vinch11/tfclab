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

export interface FinalVerdict {
  trafficLight: TrafficLight;
  icon: "🟢" | "🟡" | "🔴";
  title: string;
  subtitle: string;
  explanation: string;
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
  staffInterpretation: StaffInterpretation;
  raceStrategy: RaceStrategy;
  nutritionSummary: NutritionSummary;
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
  
  return {
    athleteName,
    objectif,
    objectifLabel: getObjectifLabel(objectif),
    snapshotDate,
    generatedAt: new Date().toISOString().slice(0, 10),
    executiveSummary,
    keyIndicators,
    staffInterpretation,
    raceStrategy,
    nutritionSummary,
    finalVerdict,
  };
}
