// =============================================
// NIVEAU D'AMBITION ATHLÈTE
// Modulateur des seuils physiologiques par objectif
// =============================================

/**
 * Niveaux d'ambition disponibles
 * - finisher: Terminer la course, objectif participation
 * - age_group: Performance catégorie d'âge, top 50% local
 * - competitor: Compétiteur sérieux, podium catégorie possible
 * - elite: Qualification championnats / podium overall
 */
export type AmbitionLevel = "finisher" | "age_group" | "competitor" | "elite";

export interface AmbitionDefinition {
  id: AmbitionLevel;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  color: string;
}

export const AMBITION_DEFINITIONS: Record<AmbitionLevel, AmbitionDefinition> = {
  finisher: {
    id: "finisher",
    label: "Finisher",
    shortLabel: "FIN",
    description: "Objectif: terminer la course avec succès",
    icon: "🏁",
    color: "text-muted-foreground"
  },
  age_group: {
    id: "age_group",
    label: "Age Group",
    shortLabel: "AG",
    description: "Performance dans votre catégorie d'âge",
    icon: "⭐",
    color: "text-blue-500"
  },
  competitor: {
    id: "competitor",
    label: "Compétiteur",
    shortLabel: "COMP",
    description: "Podium catégorie d'âge / top 25%",
    icon: "🏆",
    color: "text-amber-500"
  },
  elite: {
    id: "elite",
    label: "Elite / Qualif",
    shortLabel: "PRO",
    description: "Qualification championnats ou podium overall",
    icon: "👑",
    color: "text-purple-500"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUGGESTIONS DE TEMPS PAR OBJECTIF RUNNING + AMBITION
// Pour les objectifs de course à pied, chaque niveau d'ambition est associé
// à une fourchette de temps indicative (hommes). Femmes: +8-12% environ.
// ═══════════════════════════════════════════════════════════════════════════════

export type RunningObjectiveWithTimes = "Marathon" | "Semi" | "10K" | "5K";

export const RUNNING_TIME_HINTS: Record<RunningObjectiveWithTimes, Record<AmbitionLevel, string>> = {
  Marathon: {
    finisher: "4h30 – 5h+",
    age_group: "3h30 – 4h15",
    competitor: "3h00 – 3h30",
    elite: "Sub 2h45",
  },
  Semi: {
    finisher: "2h00 – 2h30",
    age_group: "1h35 – 1h55",
    competitor: "1h20 – 1h35",
    elite: "Sub 1h18",
  },
  "10K": {
    finisher: "55' – 1h10",
    age_group: "45' – 52'",
    competitor: "38' – 44'",
    elite: "Sub 36'",
  },
  "5K": {
    finisher: "28' – 35'",
    age_group: "22' – 26'",
    competitor: "18' – 21'",
    elite: "Sub 17'",
  },
};

/**
 * Retourne la suggestion de temps pour un objectif running + ambition.
 * Retourne null si l'objectif n'est pas un objectif running avec temps.
 */
export function getRunningTimeHint(objectif: string, ambition: AmbitionLevel): string | null {
  if (objectif in RUNNING_TIME_HINTS) {
    return RUNNING_TIME_HINTS[objectif as RunningObjectiveWithTimes]?.[ambition] ?? null;
  }
  return null;
}

/**
 * Vérifie si un objectif est un objectif running avec suggestions de temps
 */
export function isRunningObjectiveWithTimes(objectif: string): objectif is RunningObjectiveWithTimes {
  return objectif in RUNNING_TIME_HINTS;
}

/**
 * Normalise une valeur d'ambition (string libre) vers AmbitionLevel valide.
 * Gère: casse (COMPETITOR → competitor), alias courants, valeurs nulles.
 */
const AMBITION_ALIASES: Record<string, AmbitionLevel> = {
  fin: "finisher",
  finisher: "finisher",
  ag: "age_group",
  age_group: "age_group",
  agegroup: "age_group",
  intermediaire: "age_group",
  comp: "competitor",
  competitor: "competitor",
  perf: "elite",
  performance: "elite",
  elite: "elite",
  pro: "elite",
};

export function normalizeAmbitionLevel(value: unknown): AmbitionLevel {
  if (!value || typeof value !== "string") return DEFAULT_AMBITION;
  const key = value.trim().toLowerCase();
  return AMBITION_ALIASES[key] ?? DEFAULT_AMBITION;
}

/**
 * Extrait l'ambition d'un athlète (any shape) en normalisant.
 * Cherche: athlete.refs.ambition → athlete.ambition → DEFAULT_AMBITION
 */
export function getAthleteAmbition(athlete: unknown): AmbitionLevel {
  if (!athlete || typeof athlete !== "object") return DEFAULT_AMBITION;
  const a = athlete as Record<string, any>;
  const raw = a.refs?.ambition ?? a.ambition ?? null;
  return normalizeAmbitionLevel(raw);
}

/**
 * Récupère la définition d'ambition
 */
export function getAmbitionDefinition(level: AmbitionLevel): AmbitionDefinition {
  return AMBITION_DEFINITIONS[level] || AMBITION_DEFINITIONS.age_group;
}

/**
 * Liste ordonnée pour les sélecteurs
 */
export const AMBITION_LEVELS_ORDERED: AmbitionLevel[] = [
  "finisher",
  "age_group",
  "competitor",
  "elite"
];

/**
 * Ambition par défaut
 */
export const DEFAULT_AMBITION: AmbitionLevel = "age_group";
