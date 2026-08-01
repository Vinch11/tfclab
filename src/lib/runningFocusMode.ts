/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUNNING FOCUS MODE™ — TFCL Method
 * 
 * Couche architecturale fondamentale qui active un environnement 100% CAP
 * lorsque l'athlète a un objectif course à pied (5K, 10K, Semi, Marathon, Trail).
 * 
 * Ce mode est STRUCTURANT : il ne s'agit pas d'un simple filtre visuel, mais
 * d'un verrou disciplinaire qui conditionne toutes les analyses, recommandations
 * et exports.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { isRunningOnly as isRunningOnlyRace } from "./raceTypeNormalization";
import { isRunningOnlyGoal } from "./allowedSports";
import { getVlamaxTarget } from "./v2/vlamaxTargets";

// ⚠️  SOURCE UNIQUE VLamax : cibles issues de `src/lib/v2/vlamaxTargets.ts`.
//    Aucune valeur VLamax-cible en dur ci-dessous.
function _vlamaxRunTarget(key: string): { min: number; optimal: number; max: number } {
  const t = getVlamaxTarget(key, 'run');
  return { min: t.min, optimal: t.ideal, max: t.max };
}

/**
 * Start to Run : plage VLamax dérivée de la source unique mais volontairement
 * élargie (×1.35 sur le max) pour rester NON-limitante chez un débutant, dont
 * le limiteur est structurel (tendons/os) et non métabolique.
 */
function _vlamaxBeginnerTarget(): { min: number; optimal: number; max: number } {
  const t = getVlamaxTarget('10k', 'run');
  return { min: t.min, optimal: t.ideal, max: +(t.max * 1.35).toFixed(2) };
}



// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type DisciplineLock = "RUNNING_ONLY" | "TRIATHLON" | "CYCLING_ONLY";

export type RunningRaceType = "5K" | "10K" | "StartToRun" | "Semi" | "Marathon" | "Trail" | "TrailShort" | "TrailMountain" | "TrailUltra";

export type RunningLimiter = 
  | "vo2max_insufficient"      // VO2max CAP insuffisant
  | "vlamax_high"              // VLamax trop élevée pour la distance
  | "economy_deficient"        // Économie de course déficiente
  | "durability_insufficient"  // Durabilité d'allure insuffisante
  | "mechanical_fatigue"       // Fatigue mécanique excessive
  | "pacing_unstable"          // Discipline de pacing instable
  | "availability_low"         // Disponibilité faible
  | "none";                    // Aucun limiteur identifié

export type RunningLever = 
  | "vo2max_intervals"         // Intervalles VO2max CAP
  | "tempo_threshold"          // Travail tempo / seuil
  | "race_pace"                // Allure spécifique
  | "aerobic_volume"           // Volume aérobie contrôlé
  | "economy_technique"        // Technique / économie
  | "pacing_discipline"        // Discipline de pacing
  | "strength_conditioning"    // Renforcement musculaire
  | "recovery";                // Récupération

export interface RunningFocusModeState {
  isActive: boolean;
  disciplineLock: DisciplineLock;
  raceType: RunningRaceType | null;
  distanceKm: number | null;
  durationEstimateMin: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES OFFICIELLES
// ═══════════════════════════════════════════════════════════════════════════════

// Race types qui déclenchent le Running Focus Mode
export const RUNNING_RACE_TYPES: RunningRaceType[] = [
  "StartToRun", "5K", "10K", "Semi", "Marathon", 
  "Trail", "TrailShort", "TrailMountain", "TrailUltra"
];

// Mapping des objectifs vers les race types normalisés
const OBJECTIVE_TO_RUNNING_TYPE: Record<string, RunningRaceType | null> = {
  "StartToRun": "StartToRun",
  "starttorun": "StartToRun",
  "start to run": "StartToRun",
  "5K": "5K",
  "5k": "5K",
  "10K": "10K",
  "10k": "10K",
  "10km": "10K",
  "Semi": "Semi",
  "semi": "Semi",
  "Semi-Marathon": "Semi",
  "semi-marathon": "Semi",
  "Marathon": "Marathon",
  "marathon": "Marathon",
  "Trail": "Trail",
  "trail": "Trail",
  "TrailShort": "TrailShort",
  "TrailMountain": "TrailMountain",
  "TrailUltra": "TrailUltra",
  // Triathlon & Cycling -> NOT running only
  "IM": null,
  "im": null,
  "Ironman": null,
  "ironman": null,
  "703": null,
  "70.3": null,
  "Sprint": null,
  "Olympic": null,
};

// Distances par type de course (km)
export const RUNNING_DISTANCES: Record<RunningRaceType, number> = {
  "StartToRun": 5,
  "5K": 5,
  "10K": 10,
  "Semi": 21.1,
  "Marathon": 42.195,
  "Trail": 30,
  "TrailShort": 25,
  "TrailMountain": 60,
  "TrailUltra": 100,
};

// Labels lisibles
export const RUNNING_RACE_LABELS: Record<RunningRaceType, string> = {
  "StartToRun": "Start to Run (débutant)",
  "5K": "5 km",
  "10K": "10 km",
  "Semi": "Semi-Marathon",
  "Marathon": "Marathon",
  "Trail": "Trail",
  "TrailShort": "Trail Court (20–40km)",
  "TrailMountain": "Trail Montagne (40–80km)",
  "TrailUltra": "Ultra Trail (80km+)",
};

// Limiter info pour Running Focus Mode
export const RUNNING_LIMITER_INFO: Record<RunningLimiter, {
  label: string;
  emoji: string;
  description: string;
}> = {
  vo2max_insufficient: {
    label: "VO2max insuffisant",
    emoji: "🫁",
    description: "La capacité aérobie maximale limite la performance.",
  },
  vlamax_high: {
    label: "VLamax trop élevée",
    emoji: "⚡",
    description: "Consommation glycogène excessive pour la distance cible.",
  },
  economy_deficient: {
    label: "Économie de course",
    emoji: "🏃",
    description: "Coût énergétique par kilomètre trop élevé.",
  },
  durability_insufficient: {
    label: "Durabilité insuffisante",
    emoji: "⏱️",
    description: "Difficulté à maintenir l'allure sur la durée.",
  },
  mechanical_fatigue: {
    label: "Fatigue mécanique",
    emoji: "🦵",
    description: "Stress musculaire et articulaire excessif.",
  },
  pacing_unstable: {
    label: "Pacing instable",
    emoji: "📊",
    description: "Variations d'allure excessives, départs trop rapides.",
  },
  availability_low: {
    label: "Disponibilité faible",
    emoji: "🔋",
    description: "Fatigue ou stress limitent l'expression du potentiel.",
  },
  none: {
    label: "Profil équilibré",
    emoji: "✅",
    description: "Aucun facteur limitant majeur identifié.",
  },
};

// Lever info pour Running Focus Mode
export const RUNNING_LEVER_INFO: Record<RunningLever, {
  label: string;
  emoji: string;
  description: string;
}> = {
  vo2max_intervals: {
    label: "Intervalles VO2max",
    emoji: "📈",
    description: "Séances fractionnées 90-100% vVO2max.",
  },
  tempo_threshold: {
    label: "Travail tempo/seuil",
    emoji: "🎯",
    description: "Séances à allure seuil (85-90% vVO2max).",
  },
  race_pace: {
    label: "Allure spécifique",
    emoji: "🏁",
    description: "Travail à l'allure cible de compétition.",
  },
  aerobic_volume: {
    label: "Volume aérobie",
    emoji: "🔄",
    description: "Développement du volume en endurance fondamentale.",
  },
  economy_technique: {
    label: "Technique/Économie",
    emoji: "🎓",
    description: "Travail technique et exercices d'économie de course.",
  },
  pacing_discipline: {
    label: "Discipline de pacing",
    emoji: "📊",
    description: "Entraînement à maintenir une allure régulière.",
  },
  strength_conditioning: {
    label: "Renforcement",
    emoji: "💪",
    description: "PPG et renforcement musculaire spécifique CAP.",
  },
  recovery: {
    label: "Récupération",
    emoji: "🛌",
    description: "Priorité à la récupération et régénération.",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS DE DÉTECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Détermine si le Running Focus Mode doit être actif
 * basé sur l'objectif de l'athlète
 */
export function isRunningFocusModeActive(objectif: string | null | undefined): boolean {
  if (!objectif) return false;
  
  // Vérification directe via le mapping
  const normalized = objectif.trim();
  if (OBJECTIVE_TO_RUNNING_TYPE[normalized] !== undefined) {
    return OBJECTIVE_TO_RUNNING_TYPE[normalized] !== null;
  }
  
  // Fallback vers les fonctions existantes
  return isRunningOnlyRace(objectif) || isRunningOnlyGoal(objectif);
}

/**
 * Retourne le type de course running normalisé
 */
export function getRunningRaceType(objectif: string | null | undefined): RunningRaceType | null {
  if (!objectif) return null;
  
  const normalized = objectif.trim();
  
  // Vérification directe
  if (OBJECTIVE_TO_RUNNING_TYPE[normalized] !== undefined) {
    return OBJECTIVE_TO_RUNNING_TYPE[normalized];
  }
  
  // Fallback avec détection intelligente
  const lower = objectif.toLowerCase();
  
  if (lower === "5k" || lower === "5km") return "5K";
  if (lower === "10k" || lower === "10km") return "10K";
  if (lower.includes("semi")) return "Semi";
  if (lower === "marathon") return "Marathon";
  if (lower.includes("ultra")) return "TrailUltra";
  if (lower.includes("trailmountain") || lower.includes("trail montagne")) return "TrailMountain";
  if (lower.includes("trailshort") || lower.includes("trail court")) return "TrailShort";
  if (lower.includes("trail")) return "Trail";
  
  return null;
}

/**
 * Retourne l'état complet du Running Focus Mode
 */
export function getRunningFocusModeState(objectif: string | null | undefined): RunningFocusModeState {
  const isActive = isRunningFocusModeActive(objectif);
  const raceType = getRunningRaceType(objectif);
  
  return {
    isActive,
    disciplineLock: isActive ? "RUNNING_ONLY" : "TRIATHLON",
    raceType,
    distanceKm: raceType ? RUNNING_DISTANCES[raceType] : null,
    durationEstimateMin: raceType ? estimateDuration(raceType) : null,
  };
}

/**
 * Estime la durée typique d'une course selon le type (en minutes)
 * Basé sur un athlète "Age Group" typique
 */
function estimateDuration(raceType: RunningRaceType): number {
  const durations: Record<RunningRaceType, number> = {
    "StartToRun": 40,
    "5K": 25,
    "10K": 50,
    "Semi": 110,
    "Marathon": 240,
    "Trail": 180,
    "TrailShort": 180,
    "TrailMountain": 420,
    "TrailUltra": 720,
  };
  return durations[raceType];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZONES D'ENTRAÎNEMENT CAP
// ═══════════════════════════════════════════════════════════════════════════════

export interface RunningZone {
  name: string;
  label: string;
  pctVVO2max: { min: number; max: number };
  description: string;
  energySystem: "aerobic" | "mixed" | "glycolytic";
  color: string;
}

export const RUNNING_TRAINING_ZONES: RunningZone[] = [
  {
    name: "recovery",
    label: "Récupération",
    pctVVO2max: { min: 55, max: 65 },
    description: "Course très facile, conversation aisée",
    energySystem: "aerobic",
    color: "hsl(var(--success))",
  },
  {
    name: "endurance",
    label: "Endurance Aérobie (FatMax)",
    pctVVO2max: { min: 65, max: 75 },
    description: "Zone optimale d'oxydation lipidique",
    energySystem: "aerobic",
    color: "hsl(var(--success))",
  },
  {
    name: "tempo",
    label: "Tempo / Seuil Aérobie",
    pctVVO2max: { min: 75, max: 85 },
    description: "Effort soutenu mais contrôlé",
    energySystem: "mixed",
    color: "hsl(var(--warning))",
  },
  {
    name: "threshold",
    label: "Seuil Lactique",
    pctVVO2max: { min: 85, max: 92 },
    description: "Allure marathon / semi rapide",
    energySystem: "mixed",
    color: "hsl(var(--warning))",
  },
  {
    name: "vo2max",
    label: "Zone VO2max",
    pctVVO2max: { min: 92, max: 100 },
    description: "Intervalles haute intensité",
    energySystem: "glycolytic",
    color: "hsl(var(--destructive))",
  },
  {
    name: "race_specific",
    label: "Allure Course",
    pctVVO2max: { min: 0, max: 0 }, // Dynamique selon objectif
    description: "Allure cible de compétition",
    energySystem: "mixed",
    color: "hsl(var(--primary))",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// GRAMMAIRE RUNNING — INDICATEURS CLÉS
// ═══════════════════════════════════════════════════════════════════════════════

export interface RunningKeyMetric {
  key: string;
  label: string;
  unit: string;
  description: string;
  importance: "critical" | "high" | "medium";
}

export const RUNNING_KEY_METRICS: RunningKeyMetric[] = [
  {
    key: "vo2max",
    label: "VO2max CAP",
    unit: "ml/kg/min",
    description: "Capacité aérobie maximale mesurée ou estimée en course",
    importance: "critical",
  },
  {
    key: "vlamax_cap",
    label: "VLamax CAP",
    unit: "mmol/L/s",
    description: "Capacité glycolytique mesurée par test terrain CAP",
    importance: "critical",
  },
  {
    key: "vma",
    label: "VMA",
    unit: "km/h",
    description: "Vitesse Maximale Aérobie",
    importance: "critical",
  },
  {
    key: "economy",
    label: "Économie de course",
    unit: "score 0-100",
    description: "Efficacité énergétique par kilomètre",
    importance: "high",
  },
  {
    key: "durability",
    label: "Durabilité d'allure",
    unit: "min",
    description: "Temps limite à l'allure cible",
    importance: "high",
  },
  {
    key: "hr_drift",
    label: "Dérive cardiaque",
    unit: "%",
    description: "Augmentation de la FC à allure constante",
    importance: "high",
  },
  {
    key: "mechanical_fatigue",
    label: "Fatigue mécanique",
    unit: "score 0-100",
    description: "Stress musculaire et articulaire",
    importance: "medium",
  },
  {
    key: "pacing_consistency",
    label: "Constance d'allure",
    unit: "%",
    description: "Régularité du pacing en course",
    importance: "medium",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ÉLÉMENTS À MASQUER EN MODE RUNNING
// ═══════════════════════════════════════════════════════════════════════════════

// Termes vélo qui ne doivent JAMAIS apparaître en Running Focus Mode
export const CYCLING_TERMS_TO_HIDE = [
  "FTP",
  "PMA",
  "MAP",
  "Puissance",
  "Watts",
  "W/kg",
  "Cadence vélo",
  "RPM",
  "Zones puissance",
  "Power",
  "Watt",
  "Cyclisme",
  "Vélo",
  "Bike",
  "Cycling",
];

// Composants qui ne doivent pas apparaître
export const CYCLING_COMPONENTS_TO_HIDE = [
  "VLamaxBikeV2EnhancedCard",
  "VLamaxCombinedCard", // Si affiche vélo
  "InjuryRiskBikeCard",
  "CadenceWorkRangesCard", // Si cadence vélo
];

// Métriques à remplacer
export const METRIC_REPLACEMENTS: Record<string, string> = {
  "FTP": "Allure Seuil",
  "FTP/kg": "Allure Seuil",
  "PMA": "vVO2max",
  "MAP": "VMA",
  "Puissance": "Allure",
  "Watts": "min/km",
  "W/kg": "% vVO2max",
};

// ═══════════════════════════════════════════════════════════════════════════════
// CIBLES PHYSIOLOGIQUES RUNNING
// ═══════════════════════════════════════════════════════════════════════════════

export interface RunningTargets {
  vo2max: { min: number; optimal: number; elite: number };
  vlamax: { min: number; optimal: number; max: number };
  economyScore: { min: number; optimal: number };
  durabilityMin: number; // Minutes à l'allure cible
  pctVO2maxRace: number; // % VO2max utilisable en course
}

// ⚠️  VLamax : injectée depuis la SOURCE UNIQUE `vlamaxTargets.ts` (jamais en dur ici).
export const RUNNING_TARGETS_BY_RACE: Record<RunningRaceType, RunningTargets> = {
  // Start to Run : plage VLamax élargie (non-limitante) — un débutant n'est
  // jamais évalué sur les cibles métaboliques d'un coureur 5K/10K.
  "StartToRun": {
    vo2max: { min: 30, optimal: 40, elite: 50 },
    vlamax: _vlamaxBeginnerTarget(),
    economyScore: { min: 40, optimal: 55 },
    durabilityMin: 30,
    pctVO2maxRace: 70,
  },

  "5K": {
    vo2max: { min: 50, optimal: 58, elite: 72 },
    vlamax: _vlamaxRunTarget("5k"),
    economyScore: { min: 60, optimal: 75 },
    durabilityMin: 25,
    pctVO2maxRace: 92,
  },
  "10K": {
    vo2max: { min: 50, optimal: 58, elite: 72 },
    vlamax: _vlamaxRunTarget("10k"),
    economyScore: { min: 65, optimal: 78 },
    durabilityMin: 45,
    pctVO2maxRace: 88,
  },
  "Semi": {
    vo2max: { min: 48, optimal: 55, elite: 68 },
    vlamax: _vlamaxRunTarget("semi"),
    economyScore: { min: 68, optimal: 80 },
    durabilityMin: 100,
    pctVO2maxRace: 82,
  },
  "Marathon": {
    vo2max: { min: 48, optimal: 55, elite: 70 },
    vlamax: _vlamaxRunTarget("marathon"),
    economyScore: { min: 72, optimal: 85 },
    durabilityMin: 210,
    pctVO2maxRace: 78,
  },
  "Trail": {
    vo2max: { min: 48, optimal: 55, elite: 65 },
    vlamax: _vlamaxRunTarget("trail"),
    economyScore: { min: 65, optimal: 78 },
    durabilityMin: 180,
    pctVO2maxRace: 70,
  },
  "TrailShort": {
    vo2max: { min: 50, optimal: 58, elite: 68 },
    vlamax: _vlamaxRunTarget("trail"),
    economyScore: { min: 65, optimal: 78 },
    durabilityMin: 150,
    pctVO2maxRace: 72,
  },
  "TrailMountain": {
    vo2max: { min: 48, optimal: 55, elite: 65 },
    vlamax: _vlamaxRunTarget("trail"),
    economyScore: { min: 68, optimal: 80 },
    durabilityMin: 360,
    pctVO2maxRace: 65,
  },
  "TrailUltra": {
    vo2max: { min: 45, optimal: 52, elite: 62 },
    vlamax: _vlamaxRunTarget("im"),
    economyScore: { min: 72, optimal: 85 },
    durabilityMin: 600,
    pctVO2maxRace: 58,
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Retourne les cibles physiologiques pour un type de course running
 */
export function getRunningTargets(raceType: RunningRaceType): RunningTargets {
  return RUNNING_TARGETS_BY_RACE[raceType];
}

/**
 * Convertit une allure min/km vers un pourcentage de vVO2max
 */
export function paceToVVO2maxPercent(paceSecPerKm: number, vma: number): number {
  if (!vma || vma <= 0) return 0;
  const speedKmH = 3600 / paceSecPerKm;
  return (speedKmH / vma) * 100;
}

/**
 * Convertit un pourcentage de vVO2max vers une allure min/km
 */
export function vvo2maxPercentToPace(pctVVO2max: number, vma: number): number {
  if (!vma || vma <= 0 || pctVVO2max <= 0) return 0;
  const speedKmH = (pctVVO2max / 100) * vma;
  return 3600 / speedKmH; // sec/km
}

/**
 * Formate une allure en min:sec/km
 */
export function formatPace(secPerKm: number): string {
  if (!secPerKm || secPerKm <= 0) return "--:--";
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Retourne le label complet du Running Focus Mode
 */
export function getRunningFocusModeLabel(): string {
  return "Running Focus Mode™";
}

/**
 * Retourne le badge à afficher quand le mode est actif
 */
export function getRunningFocusModeBadge(): { label: string; emoji: string; color: string } {
  return {
    label: "Running Focus Mode™",
    emoji: "🏃",
    color: "hsl(var(--primary))",
  };
}
