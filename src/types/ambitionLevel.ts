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
// Temps indicatifs hommes. Femmes: +8-12% selon la distance.
// ═══════════════════════════════════════════════════════════════════════════════

export type RunningObjectiveWithTimes = "Marathon" | "Semi" | "10K" | "5K" | "Trail" | "TrailShort" | "TrailMountain";
export type SexeForHints = "M" | "F";

export const RUNNING_TIME_HINTS: Record<RunningObjectiveWithTimes, Record<AmbitionLevel, { M: string; F: string }>> = {
  Marathon: {
    finisher:   { M: "4h30 – 5h+",    F: "4h55 – 5h30+" },
    age_group:  { M: "3h30 – 4h15",   F: "3h50 – 4h40" },
    competitor: { M: "3h00 – 3h30",    F: "3h18 – 3h50" },
    elite:      { M: "Sub 2h45",       F: "Sub 3h05" },
  },
  Semi: {
    finisher:   { M: "2h00 – 2h30",    F: "2h10 – 2h45" },
    age_group:  { M: "1h35 – 1h55",    F: "1h44 – 2h06" },
    competitor: { M: "1h20 – 1h35",    F: "1h28 – 1h44" },
    elite:      { M: "Sub 1h18",       F: "Sub 1h26" },
  },
  "10K": {
    finisher:   { M: "55' – 1h10",     F: "1h00 – 1h17" },
    age_group:  { M: "45' – 52'",      F: "49' – 57'" },
    competitor: { M: "38' – 44'",      F: "42' – 48'" },
    elite:      { M: "Sub 36'",        F: "Sub 40'" },
  },
  "5K": {
    finisher:   { M: "28' – 35'",      F: "30' – 38'" },
    age_group:  { M: "22' – 26'",      F: "24' – 29'" },
    competitor: { M: "18' – 21'",      F: "20' – 23'" },
    elite:      { M: "Sub 17'",        F: "Sub 19'" },
  },
  Trail: {
    finisher:   { M: "5h30 – 7h",      F: "6h00 – 7h45" },
    age_group:  { M: "4h00 – 5h15",    F: "4h25 – 5h45" },
    competitor: { M: "3h15 – 4h00",    F: "3h35 – 4h25" },
    elite:      { M: "Sub 3h00",       F: "Sub 3h20" },
  },
  TrailShort: {
    finisher:   { M: "5h30 – 7h",      F: "6h00 – 7h45" },
    age_group:  { M: "4h00 – 5h15",    F: "4h25 – 5h45" },
    competitor: { M: "3h15 – 4h00",    F: "3h35 – 4h25" },
    elite:      { M: "Sub 3h00",       F: "Sub 3h20" },
  },
  TrailMountain: {
    finisher:   { M: "12h – 16h",      F: "13h – 17h30" },
    age_group:  { M: "9h – 11h30",     F: "10h – 12h40" },
    competitor: { M: "7h – 9h",        F: "7h45 – 10h" },
    elite:      { M: "Sub 6h30",       F: "Sub 7h10" },
  },
};

/**
 * Retourne la suggestion de temps pour un objectif running + ambition + sexe.
 */
export function getRunningTimeHint(objectif: string, ambition: AmbitionLevel, sexe?: SexeForHints): string | null {
  if (objectif in RUNNING_TIME_HINTS) {
    const entry = RUNNING_TIME_HINTS[objectif as RunningObjectiveWithTimes]?.[ambition];
    if (!entry) return null;
    return entry[sexe === "F" ? "F" : "M"];
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
