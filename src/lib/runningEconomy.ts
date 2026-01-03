// =============================================
// ÉCONOMIE DE COURSE (CAP) - Module Staff
// Facteur limitant majeur de la performance en course à pied
// =============================================
//
// DÉFINITION OPÉRATIONNELLE :
// L'économie de course représente le coût énergétique pour maintenir une allure donnée.
// À VLamax et VO₂max égaux, l'athlète le plus économique :
// - performe le mieux
// - consomme le moins de glucides
//
// LIEN AVEC RACE READINESS :
// Race Readiness CAP est dégradé automatiquement si :
// - l'économie est faible
// - la dérive cardiaque est élevée
// - le TTE est correct mais non soutenable mécaniquement
//
// Un bon métabolisme NE COMPENSE PAS une mauvaise économie de course.
//
// =============================================

// =============================================
// TEXTE PÉDAGOGIQUE OFFICIEL
// =============================================

export const RUNNING_ECONOMY_METHODOLOGY = {
  title: "Économie de course & Nutrition",
  definition: `En course à pied, la performance dépend autant de l'économie de mouvement que des capacités métaboliques.

Une mauvaise économie augmente la consommation énergétique et les besoins nutritionnels, même à intensité modérée.

Race Readiness intègre ces paramètres afin d'anticiper les limites physiologiques et nutritionnelles de l'athlète.`,
  disclaimer: "Les résultats sont des ordres de grandeur. L'objectif est l'aide à la décision, pas la prescription médicale.",
  dataUsed: [
    "Allure à une intensité donnée (ex : allure marathon)",
    "Fréquence cardiaque associée",
    "Stabilité de la FC dans le temps (dérive)",
    "Historique de charge (TTE effectif)"
  ],
  noLabRequired: "Aucune mesure de labo obligatoire."
};

// =============================================
// TYPES
// =============================================

export type EconomyLevel = "excellent" | "correct" | "weak" | "very_weak";
export type EconomyRiskColor = "success" | "warning" | "orange" | "destructive";

export interface RunningEconomyInput {
  fcMax: number | null;
  fcMoyenneEndurance: number | null;    // FC moyenne à allure endurance
  allureEndurance: number | null;        // min/km à allure endurance
  deriveCardiaque: number | null;        // % de dérive si disponible
  tteMin: number | null;
  objectif: string;
  sport?: string;                        // velo, course, triathlon...
}

export interface RunningEconomyResult {
  // Indicateur principal
  paceEconomiqueRef: number | null;      // Allure à 75% FCmax (min/km)
  fcPct75: number | null;                // 75% de FCmax
  
  // Niveau d'économie
  level: EconomyLevel;
  levelLabel: string;
  levelIcon: string;
  color: EconomyRiskColor;
  
  // Dérive cardiaque
  deriveEstimee: number | null;          // % dérive estimée ou fournie
  deriveLabel: string;
  
  // Impact sur Race Readiness
  capScore: number | null;               // null = pas de cap, sinon max score
  capMessage: string | null;
  
  // Analyse staff
  analysisMessage: string;
  optimisationLevier: string[];          // Leviers d'optimisation
  
  // Lien avec VLamax/TTE
  metabolicImpact: string;
  
  // Lien nutrition (NOUVEAU)
  nutritionImpact: string;               // Impact sur les besoins nutritionnels
  
  // Applicabilité
  isRunningOnly: boolean;                // true = CAP seulement
  isApplicable: boolean;                 // false si pas de données
}

// =============================================
// CONSTANTES
// =============================================

// Objectifs CAP pour lesquels l'économie est critique
const CAP_OBJECTIVES = [
  "Marathon", "Semi", "Course", "Trail", "TrailCourt", "TrailLong", "TrailMountain", "TrailUltra", "TrailShort"
];

// Seuils de dérive cardiaque
const DRIFT_THRESHOLDS = {
  excellent: 5,
  correct: 8,
  weak: 12,
};

// Allures de référence par niveau (min/km à 75% FCmax pour niveau correct)
// Ces valeurs servent de repères, pas de jugement absolu
const REFERENCE_PACES: Record<string, { good: number; average: number; weak: number }> = {
  Marathon: { good: 5.0, average: 5.5, weak: 6.2 },
  Semi: { good: 4.8, average: 5.3, weak: 6.0 },
  Course: { good: 5.0, average: 5.5, weak: 6.0 },
  Trail: { good: 5.5, average: 6.0, weak: 6.8 },
  TrailCourt: { good: 5.2, average: 5.8, weak: 6.5 },
  TrailLong: { good: 6.0, average: 6.5, weak: 7.2 },
  TrailMountain: { good: 6.0, average: 6.5, weak: 7.0 },
  TrailUltra: { good: 6.5, average: 7.0, weak: 7.8 },
  TrailShort: { good: 5.2, average: 5.8, weak: 6.5 },
};

const DEFAULT_REFERENCE = { good: 5.5, average: 6.0, weak: 6.8 };

// =============================================
// HELPERS
// =============================================

function isRunningObjective(objectif: string): boolean {
  return CAP_OBJECTIVES.includes(objectif);
}

function getReferencePaces(objectif: string) {
  return REFERENCE_PACES[objectif] || DEFAULT_REFERENCE;
}

/**
 * Estime la dérive cardiaque basée sur le TTE
 * TTE élevé = meilleure stabilité = dérive plus faible
 */
function estimateDriftFromTTE(tteMin: number | null): number | null {
  if (tteMin === null) return null;
  
  // TTE > 55 min = très bonne stabilité (< 5%)
  // TTE 45-55 = correct (5-8%)
  // TTE 35-45 = faible (8-12%)
  // TTE < 35 = très faible (> 12%)
  
  if (tteMin >= 55) return 4;
  if (tteMin >= 45) return 6;
  if (tteMin >= 35) return 10;
  return 14;
}

/**
 * Calcule le niveau d'économie basé sur l'allure et la FC
 */
function computeEconomyLevel(
  allure: number | null,
  fcPct: number | null,
  derive: number | null,
  objectif: string
): EconomyLevel {
  const refs = getReferencePaces(objectif);
  
  // Score composite
  let score = 50; // base
  
  // Évaluation allure (si disponible)
  if (allure !== null) {
    if (allure <= refs.good) {
      score += 30;
    } else if (allure <= refs.average) {
      score += 15;
    } else if (allure <= refs.weak) {
      score -= 10;
    } else {
      score -= 25;
    }
  }
  
  // Évaluation FC% (75% cible = score neutre)
  if (fcPct !== null) {
    if (fcPct <= 72) {
      score += 15; // très économe
    } else if (fcPct <= 78) {
      score += 5; // dans la norme
    } else if (fcPct <= 82) {
      score -= 10; // FC élevée pour l'allure
    } else {
      score -= 20; // très haute FC
    }
  }
  
  // Évaluation dérive
  if (derive !== null) {
    if (derive <= DRIFT_THRESHOLDS.excellent) {
      score += 15;
    } else if (derive <= DRIFT_THRESHOLDS.correct) {
      score += 5;
    } else if (derive <= DRIFT_THRESHOLDS.weak) {
      score -= 15;
    } else {
      score -= 30;
    }
  }
  
  // Déterminer le niveau
  if (score >= 75) return "excellent";
  if (score >= 55) return "correct";
  if (score >= 35) return "weak";
  return "very_weak";
}

// =============================================
// MAIN COMPUTE FUNCTION
// =============================================

export function computeRunningEconomy(input: RunningEconomyInput): RunningEconomyResult {
  const { fcMax, fcMoyenneEndurance, allureEndurance, deriveCardiaque, tteMin, objectif, sport } = input;
  
  // Vérifier si applicable (CAP ou trail uniquement)
  const isRunningOnly = isRunningObjective(objectif);
  const isApplicable = isRunningOnly && (fcMax !== null || allureEndurance !== null || tteMin !== null);
  
  // Si pas applicable, retourner résultat vide
  if (!isApplicable) {
    return {
      paceEconomiqueRef: null,
      fcPct75: null,
      level: "correct",
      levelLabel: "Non applicable",
      levelIcon: "⚪",
      color: "warning",
      deriveEstimee: null,
      deriveLabel: "—",
      capScore: null,
      capMessage: null,
      analysisMessage: "L'économie de course n'est pertinente qu'en course à pied et trail.",
      optimisationLevier: [],
      metabolicImpact: "",
      nutritionImpact: "",
      isRunningOnly: false,
      isApplicable: false,
    };
  }
  
  // Calculer FC à 75%
  const fcPct75 = fcMax !== null ? Math.round(fcMax * 0.75) : null;
  
  // Calculer le % de FCmax actuel si données disponibles
  const currentFcPct = (fcMoyenneEndurance !== null && fcMax !== null && fcMax > 0) 
    ? (fcMoyenneEndurance / fcMax) * 100 
    : null;
  
  // Estimer ou utiliser la dérive fournie
  const deriveEstimee = deriveCardiaque !== null ? deriveCardiaque : estimateDriftFromTTE(tteMin);
  
  // Calculer le niveau d'économie
  const level = computeEconomyLevel(allureEndurance, currentFcPct, deriveEstimee, objectif);
  
  // Labels et couleurs par niveau
  const levelConfig: Record<EconomyLevel, { label: string; icon: string; color: EconomyRiskColor }> = {
    excellent: { label: "Excellente", icon: "🟢", color: "success" },
    correct: { label: "Correcte", icon: "🟡", color: "warning" },
    weak: { label: "Faible", icon: "🟠", color: "orange" },
    very_weak: { label: "Très faible", icon: "🔴", color: "destructive" },
  };
  
  const config = levelConfig[level];
  
  // Label dérive
  let deriveLabel = "—";
  if (deriveEstimee !== null) {
    if (deriveEstimee <= DRIFT_THRESHOLDS.excellent) {
      deriveLabel = `< ${DRIFT_THRESHOLDS.excellent}% (stable)`;
    } else if (deriveEstimee <= DRIFT_THRESHOLDS.correct) {
      deriveLabel = `${DRIFT_THRESHOLDS.excellent}-${DRIFT_THRESHOLDS.correct}% (acceptable)`;
    } else if (deriveEstimee <= DRIFT_THRESHOLDS.weak) {
      deriveLabel = `${DRIFT_THRESHOLDS.correct}-${DRIFT_THRESHOLDS.weak}% (élevée)`;
    } else {
      deriveLabel = `> ${DRIFT_THRESHOLDS.weak}% (critique)`;
    }
  }
  
  // Impact sur Race Readiness
  let capScore: number | null = null;
  let capMessage: string | null = null;
  
  if (level === "weak") {
    capScore = 85;
    capMessage = "Limitation par inefficience biomécanique et énergétique";
  } else if (level === "very_weak") {
    capScore = 75;
    capMessage = "Limitation majeure par inefficience biomécanique et énergétique";
  }
  
  // Message d'analyse
  let analysisMessage = "";
  if (level === "excellent") {
    analysisMessage = "Économie de course = atout majeur. La limitation se situe probablement ailleurs (capacité cardiorespiratoire, VLamax).";
  } else if (level === "correct") {
    analysisMessage = "Économie dans la norme. Des gains sont possibles via l'optimisation technique et la régularité.";
  } else if (level === "weak") {
    analysisMessage = "La limitation principale n'est pas cardiorespiratoire. Le gain de performance viendra plus de l'économie que du VO₂max.";
  } else {
    analysisMessage = "Économie de course = facteur limitant majeur. Priorité : technique, cadence, régularité, pas intensité brute.";
  }
  
  // Leviers d'optimisation
  const optimisationLevier: string[] = [];
  if (level === "weak" || level === "very_weak") {
    optimisationLevier.push("Travail technique de foulée (cadence 170-180 ppm)");
    optimisationLevier.push("Renforcement musculaire spécifique (mollets, gainage)");
    optimisationLevier.push("Séances de régularité d'allure");
    optimisationLevier.push("Optimisation du chaussage");
  }
  if (deriveEstimee !== null && deriveEstimee > DRIFT_THRESHOLDS.correct) {
    optimisationLevier.push("Travail d'endurance fondamentale prolongée");
    optimisationLevier.push("Amélioration de l'hydratation et thermorégulation");
  }
  
  // Impact métabolique
  let metabolicImpact = "";
  if (level === "weak" || level === "very_weak") {
    metabolicImpact = "VLamax élevé + mauvaise économie = surconsommation glucidique. La nutrition devient critique même à intensité modérée.";
  } else if (level === "excellent") {
    metabolicImpact = "Bonne économie + TTE élevé = performance durable. La gestion nutritionnelle est facilitée.";
  } else {
    metabolicImpact = "Économie correcte. L'impact nutritionnel reste dépendant du VLamax et de l'intensité cible.";
  }
  
  // NOUVEAU : Impact nutrition explicite
  let nutritionImpact = "";
  if (level === "excellent") {
    nutritionImpact = "Besoins glucidiques réduits grâce à une économie optimale. Marge de sécurité nutritionnelle confortable.";
  } else if (level === "correct") {
    nutritionImpact = "Besoins glucidiques dans la norme. Stratégie nutritionnelle standard applicable.";
  } else if (level === "weak") {
    nutritionImpact = "Surconsommation énergétique probable. Besoins glucidiques majorés de 10-15% vs profil économe.";
  } else {
    nutritionImpact = "Surconsommation énergétique majeure. Besoins glucidiques potentiellement 20% supérieurs à un profil économe. Risque de défaillance nutritionnelle.";
  }
  
  return {
    paceEconomiqueRef: allureEndurance,
    fcPct75,
    level,
    levelLabel: config.label,
    levelIcon: config.icon,
    color: config.color,
    deriveEstimee,
    deriveLabel,
    capScore,
    capMessage,
    analysisMessage,
    optimisationLevier,
    metabolicImpact,
    nutritionImpact,
    isRunningOnly: true,
    isApplicable: true,
  };
}

// =============================================
// INTÉGRATION RACE READINESS
// =============================================

/**
 * Applique le plafonnement économie de course au score Race Readiness
 */
export function applyEconomyCap(
  score: number,
  economyResult: RunningEconomyResult | null
): { cappedScore: number; wasCapped: boolean; capReason: string | null } {
  if (!economyResult || economyResult.capScore === null) {
    return { cappedScore: score, wasCapped: false, capReason: null };
  }
  
  if (score > economyResult.capScore) {
    return {
      cappedScore: economyResult.capScore,
      wasCapped: true,
      capReason: economyResult.capMessage,
    };
  }
  
  return { cappedScore: score, wasCapped: false, capReason: null };
}

// =============================================
// HELPERS UI
// =============================================

export function getEconomyColorClass(color: EconomyRiskColor): string {
  switch (color) {
    case "success": return "text-green-500 bg-green-500/10 border-green-500/20";
    case "warning": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    case "orange": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    case "destructive": return "text-red-500 bg-red-500/10 border-red-500/20";
  }
}

export function getEconomyBadgeClass(color: EconomyRiskColor): string {
  switch (color) {
    case "success": return "bg-green-500/20 text-green-600 border-green-500/30";
    case "warning": return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
    case "orange": return "bg-orange-500/20 text-orange-600 border-orange-500/30";
    case "destructive": return "bg-red-500/20 text-red-600 border-red-500/30";
  }
}
