// =============================================
// ÉCONOMIE DE COURSE - Calcul depuis Snapshot
// Utilitaires et scoring pour SnapshotManager
// =============================================

export type RunEconomyLabel = "excellent" | "good" | "fragile" | "unknown";

export interface RunEconomyScoreResult {
  score: number | null;
  label: RunEconomyLabel;
  details: string[];
}

// =============================================
// UTILITAIRES DE CONVERSION ALLURE
// =============================================

/**
 * Parse une allure "m:ss" ou "mm:ss" en secondes/km
 * Ex: "4:30" => 270, "5:00" => 300
 * Retourne null si vide ou invalide
 */
export function parsePaceToSec(pace: string | null | undefined): number | null {
  if (!pace || !pace.trim()) return null;
  
  const trimmed = pace.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  
  if (minutes < 0 || seconds < 0 || seconds >= 60) return null;
  
  return minutes * 60 + seconds;
}

/**
 * Formate des secondes/km en "m:ss"
 * Ex: 270 => "4:30", 300 => "5:00"
 */
export function formatSecToPace(secPerKm: number | null | undefined): string {
  if (secPerKm === null || secPerKm === undefined || !isFinite(secPerKm)) return "";
  
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60);
  
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// =============================================
// CALCUL DU SCORE ÉCONOMIE DE COURSE
// =============================================

export interface ComputeRunEconomyParams {
  paceSec: number | null;      // allure en sec/km
  hr: number | null;            // FC moyenne
  durationMin: number | null;   // durée en min
  driftPct: number | null;      // dérive % (optionnel)
  fcMax: number | null;         // FC max pour contexte
}

/**
 * Calcule un score économie de course (0-100) + label
 * Logique staff-grade sans besoin de labo
 */
export function computeRunEconomyScore(params: ComputeRunEconomyParams): RunEconomyScoreResult {
  const { paceSec, hr, durationMin, driftPct, fcMax } = params;
  
  const details: string[] = [];
  
  // Si allure ou HR manquent → unknown
  if (paceSec === null || hr === null) {
    return { score: null, label: "unknown", details: ["Données insuffisantes (allure ou FC manquante)"] };
  }
  
  let score = 0;
  
  // a) Durée: bonus selon la longueur de la séance
  if (durationMin !== null) {
    if (durationMin >= 60) {
      score += 10;
      details.push("Durée ≥60min: +10");
    } else if (durationMin >= 40) {
      score += 5;
      details.push("Durée 40-59min: +5");
    } else {
      details.push("Durée courte: +0");
    }
  } else {
    score += 5; // neutre
    details.push("Durée non renseignée: +5 (neutre)");
  }
  
  // b) Dérive cardiaque
  if (driftPct !== null) {
    if (driftPct <= 5) {
      score += 25;
      details.push(`Dérive ≤5%: +25 (excellente stabilité)`);
    } else if (driftPct <= 8) {
      score += 15;
      details.push(`Dérive 5-8%: +15 (correct)`);
    } else {
      score += 5;
      details.push(`Dérive >8%: +5 (élevée)`);
    }
  } else {
    score += 10; // neutre si pas de drift
    details.push("Dérive non renseignée: +10 (neutre)");
  }
  
  // c) Coût cardio relatif (si FCmax disponible)
  if (fcMax !== null && fcMax > 0) {
    const hrRatio = hr / fcMax;
    if (hrRatio <= 0.78) {
      score += 25;
      details.push(`FC/FCmax ≤78%: +25 (très économe)`);
    } else if (hrRatio <= 0.85) {
      score += 15;
      details.push(`FC/FCmax 78-85%: +15 (correct)`);
    } else {
      score += 5;
      details.push(`FC/FCmax >85%: +5 (coût élevé)`);
    }
  } else {
    score += 12; // valeur par défaut si FCmax inconnu
    details.push("FCmax inconnue: +12 (défaut)");
  }
  
  // d) Cohérence allure/FC (bonus si allure rapide avec faible HR ratio)
  if (fcMax !== null && fcMax > 0) {
    const hrRatio = hr / fcMax;
    if (paceSec < 300 && hrRatio <= 0.80) {
      // Plus rapide que 5:00/km avec faible coût = excellent
      score += 10;
      details.push("Allure <5:00/km + faible coût: +10");
    } else {
      score += 5;
      details.push("Cohérence allure/FC: +5");
    }
  } else {
    score += 5;
    details.push("Cohérence allure/FC (sans FCmax): +5");
  }
  
  // Normaliser 0-100
  score = Math.max(0, Math.min(100, score));
  
  // Déterminer label
  let label: RunEconomyLabel;
  if (score >= 75) {
    label = "excellent";
  } else if (score >= 55) {
    label = "good";
  } else {
    label = "fragile";
  }
  
  return { score, label, details };
}

/**
 * Retourne les classes CSS pour le label économie
 */
export function getEconomyLabelStyle(label: RunEconomyLabel): { 
  text: string; 
  bg: string; 
  labelFr: string;
  icon: string;
} {
  switch (label) {
    case "excellent":
      return { 
        text: "text-green-600", 
        bg: "bg-green-500/10 border-green-500/30",
        labelFr: "Très bonne",
        icon: "🟢"
      };
    case "good":
      return { 
        text: "text-blue-600", 
        bg: "bg-blue-500/10 border-blue-500/30",
        labelFr: "Bonne",
        icon: "🔵"
      };
    case "fragile":
      return { 
        text: "text-orange-600", 
        bg: "bg-orange-500/10 border-orange-500/30",
        labelFr: "Fragile",
        icon: "🟠"
      };
    case "unknown":
    default:
      return { 
        text: "text-muted-foreground", 
        bg: "bg-muted/50 border-muted",
        labelFr: "Inconnue",
        icon: "⚪"
      };
  }
}

/**
 * Calcule le bonus/malus pour Race Readiness selon l'économie CAP
 * Uniquement pour objectifs CAP (Semi/Marathon/Trail)
 */
export function getEconomyRaceReadinessBonus(
  score: number | null,
  label: RunEconomyLabel
): { bonus: number; description: string } {
  if (score === null || label === "unknown") {
    return { bonus: 0, description: "Économie CAP non évaluée" };
  }
  
  if (score >= 75) {
    return { bonus: 8, description: "+8 pts (économie excellente)" };
  } else if (score >= 55) {
    return { bonus: 4, description: "+4 pts (économie correcte)" };
  } else {
    return { bonus: -4, description: "-4 pts (économie fragile)" };
  }
}
