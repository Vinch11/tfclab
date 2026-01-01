// =============================================
// ATHLETE READINESS - Version simple et rassurante
// =============================================

import { RaceReadinessEffectif } from "./raceReadinessEffectif";
import { RunningEconomyResult } from "./runningEconomy";

export interface AthleteReadinessReport {
  mainMessage: string;
  score: number;
  scoreColor: "green" | "orange" | "red";
  scoreText: string;
  wellPrepared: string[];
  toWatch: string[];
  keyAdvice: string;
  nutritionMessage: string;
  confidenceMessage: string;
}

export function generateAthleteReadiness(
  readiness: RaceReadinessEffectif | null,
  objectif: string,
  runningEconomy?: RunningEconomyResult | null
): AthleteReadinessReport {
  const score = readiness?.score ?? 50;
  const distanceLabel = getDistanceLabel(objectif);
  
  // Déterminer la couleur et le texte du score
  let scoreColor: "green" | "orange" | "red";
  let scoreText: string;
  
  if (score >= 80) {
    scoreColor = "green";
    scoreText = "Les bases sont solides";
  } else if (score >= 60) {
    scoreColor = "orange";
    scoreText = "Attention à certains points";
  } else {
    scoreColor = "red";
    scoreText = "Des ajustements sont nécessaires";
  }

  // Message principal
  const mainMessage = generateMainMessage(score, readiness, objectif);
  
  // Ce qui est bien préparé (max 3)
  const wellPrepared = generateWellPrepared(readiness, runningEconomy);
  
  // Ce qui doit être surveillé (max 2)
  const toWatch = generateToWatch(readiness, objectif, runningEconomy);
  
  // Conseil clé du jour J
  const keyAdvice = generateKeyAdvice(readiness, objectif, runningEconomy);
  
  // Message nutrition
  const nutritionMessage = generateNutritionMessage(readiness, objectif);
  
  // Message de confiance final
  const confidenceMessage = generateConfidenceMessage(score);

  return {
    mainMessage,
    score,
    scoreColor,
    scoreText,
    wellPrepared,
    toWatch,
    keyAdvice,
    nutritionMessage,
    confidenceMessage,
  };
}

function getDistanceLabel(objectif: string): string {
  const labels: Record<string, string> = {
    "IM": "ton Ironman",
    "70.3": "ton 70.3",
    "Marathon": "ton marathon",
    "Semi": "ton semi-marathon",
    "10km": "ton 10 km",
    "5km": "ton 5 km",
    "Trail": "ton trail",
  };
  return labels[objectif] || "ta course";
}

function generateMainMessage(
  score: number,
  readiness: RaceReadinessEffectif | null,
  objectif: string
): string {
  const distance = getDistanceLabel(objectif);
  
  if (score >= 85) {
    return `Tu es prêt pour ${distance}.`;
  } else if (score >= 75) {
    return `Tu es prêt, mais la gestion de l'allure sera déterminante.`;
  } else if (score >= 60) {
    return `Tu es en bonne voie. Reste attentif à ta stratégie de course.`;
  } else if (score >= 45) {
    return `Ta préparation avance. Quelques points méritent ton attention.`;
  } else {
    return `Ton corps a encore besoin de temps pour être prêt pour cette distance.`;
  }
}

function generateWellPrepared(
  readiness: RaceReadinessEffectif | null,
  runningEconomy?: RunningEconomyResult | null
): string[] {
  const points: string[] = [];
  
  if (!readiness) {
    return ["Données en cours d'analyse"];
  }

  const details = readiness.details;
  
  // Endurance
  if (details.endurance >= 20) {
    points.push("Endurance solide");
  } else if (details.endurance >= 15) {
    points.push("Bonne base d'endurance");
  }
  
  // Capacité métabolique (VLamax)
  if (details.vlamax >= 20) {
    points.push("Bonne capacité à tenir ton allure");
  } else if (details.vlamax >= 15) {
    points.push("Gestion de l'effort bien calibrée");
  }
  
  // Puissance/FTP
  if (details.puissance >= 18) {
    points.push("Bon niveau de puissance");
  }
  
  // Fraîcheur
  if (details.fraicheur >= 18) {
    points.push("Bon équilibre entre intensité et récupération");
  }
  
  // Économie de course
  if (runningEconomy && (runningEconomy.level === "excellent" || runningEconomy.level === "correct")) {
    points.push("Efficacité de course optimale");
  }

  // Garantir au moins un point positif
  if (points.length === 0) {
    points.push("Tu es engagé dans ta préparation");
  }

  return points.slice(0, 3);
}

function generateToWatch(
  readiness: RaceReadinessEffectif | null,
  objectif: string,
  runningEconomy?: RunningEconomyResult | null
): string[] {
  const points: string[] = [];
  
  if (!readiness) {
    return [];
  }

  const isLongDistance = ["IM", "Marathon", "Trail"].includes(objectif);
  const isMediumDistance = ["70.3", "Semi"].includes(objectif);
  
  // Risque nutritionnel
  if (readiness.wasCappedByNutrition) {
    points.push("Gestion de l'alimentation importante");
  }
  
  // Économie de course
  if (runningEconomy && (runningEconomy.level === "weak" || runningEconomy.level === "very_weak")) {
    points.push("Attention aux départs trop rapides");
  }
  
  // Endurance insuffisante
  if (readiness.details.endurance < 15) {
    if (isLongDistance) {
      points.push("Risque de fatigue en fin de course");
    } else {
      points.push("Gestion du rythme à surveiller");
    }
  }
  
  // Fraîcheur
  if (readiness.details.fraicheur < 12) {
    points.push("Prends soin de ta récupération");
  }
  
  // VLamax élevé sur longue distance
  if (readiness.details.vlamax < 12 && isLongDistance) {
    points.push("Attention à la consommation d'énergie");
  }

  return points.slice(0, 2);
}

function generateKeyAdvice(
  readiness: RaceReadinessEffectif | null,
  objectif: string,
  runningEconomy?: RunningEconomyResult | null
): string {
  if (!readiness) {
    return "Reste à l'écoute de ton corps.";
  }

  const isLongDistance = ["IM", "Marathon", "Trail"].includes(objectif);
  
  // Priorité 1: Risque nutritionnel élevé
  if (readiness.wasCappedByNutrition) {
    return "Mange régulièrement dès le début de l'effort.";
  }
  
  // Priorité 2: Mauvaise économie de course
  if (runningEconomy && runningEconomy.level === "very_weak") {
    return "Pars légèrement en dessous de ton allure cible.";
  }
  
  // Priorité 3: Endurance limitée sur longue distance
  if (readiness.details.endurance < 15 && isLongDistance) {
    return "Reste strict sur ton rythme, même si tu te sens bien au début.";
  }
  
  // Priorité 4: Fraîcheur insuffisante
  if (readiness.details.fraicheur < 12) {
    return "Commence prudemment et laisse ton corps monter en puissance.";
  }
  
  // Priorité 5: Score élevé
  if (readiness.score >= 80) {
    return "Fais confiance à ta préparation et respecte ton plan de course.";
  }
  
  // Défaut
  if (isLongDistance) {
    return "Privilégie la régularité plutôt que l'intensité.";
  }
  
  return "Écoute ton corps et adapte ton effort en fonction de tes sensations.";
}

function generateNutritionMessage(
  readiness: RaceReadinessEffectif | null,
  objectif: string
): string {
  const isLongDistance = ["IM", "Marathon", "Trail", "70.3", "Semi"].includes(objectif);
  
  if (!readiness) {
    return "Une alimentation régulière soutiendra ton effort.";
  }
  
  if (readiness.wasCappedByNutrition) {
    return "La nutrition sera un facteur clé de ta réussite.";
  }
  
  if (isLongDistance) {
    return "Ton corps a besoin d'un apport régulier en énergie.";
  }
  
  return "Reste bien hydraté et alimenté avant le départ.";
}

function generateConfidenceMessage(score: number): string {
  if (score >= 85) {
    return "Les données montrent que tu es sur la bonne voie. Fais confiance à ton travail.";
  } else if (score >= 70) {
    return "Ta préparation porte ses fruits. Reste discipliné, ton corps sait faire.";
  } else if (score >= 55) {
    return "Chaque entraînement te rapproche de ton objectif. Continue sur cette lancée.";
  } else {
    return "La progression est un processus. Fais confiance au chemin parcouru.";
  }
}
