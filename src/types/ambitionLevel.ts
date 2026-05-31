// =============================================
// NIVEAU D'AMBITION ATHLÈTE — Grille 5 paliers "Parcours athlète"
// Ancrée sur des percentiles AG réels :
//   discovery   → Finisher dans les temps officiels        (clé interne: finisher)
//   confirmed   → Top 50% AG                                (clé interne: age_group)
//   competitor  → Top 25% AG / podium local                 (clé interne: competitor)
//   qualifiable → Top 10% AG — slot National/Européen       (clé interne: elite)
//   world_class → Top 3% AG — slot Mondial / podium overall (clé interne: world_class)
//
// IMPORTANT — Stratégie de migration :
// Les 4 anciennes clés (finisher/age_group/competitor/elite) restent les CLÉS
// DE DONNÉES physiologiques. Le label UI change, mais aucune base de données
// n'a besoin d'être migrée. Le 5ᵉ palier (`world_class`, label "Elite" 👑)
// est NOUVEAU et applique des multiplicateurs +stricts sur les cibles physio
// dérivées du palier `elite` (voir physiologicalTargets.ts).
//
// Ancienne sémantique → nouveau libellé :
//   "finisher"   → "Découverte"  🌱
//   "age_group"  → "Confirmé"    🎯
//   "competitor" → "Compétiteur" 🏆
//   "elite"      → "Qualifiable" 🎟️   (relabel — l'ancien "Elite" sur-utilisé)
//   "world_class"→ "Elite"       👑   (NOUVEAU — top 3% AG)
// =============================================

/**
 * Niveaux d'ambition disponibles (5 paliers).
 *
 * Note technique : les 4 premières clés conservent leur nom historique pour
 * éviter une migration DB. Le 5ᵉ palier `world_class` est nouveau.
 */
export type AmbitionLevel =
  | "finisher"     // UI: "Découverte"
  | "age_group"    // UI: "Confirmé"
  | "competitor"   // UI: "Compétiteur"
  | "elite"        // UI: "Qualifiable"
  | "world_class"; // UI: "Elite" (NOUVEAU top 3%)

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
    label: "Découverte",
    shortLabel: "DEC",
    description: "Premier dossard — terminer dans les temps officiels",
    icon: "🌱",
    color: "text-emerald-600"
  },
  age_group: {
    id: "age_group",
    label: "Confirmé",
    shortLabel: "CONF",
    description: "Top 50% catégorie d'âge — performance solide",
    icon: "🎯",
    color: "text-blue-500"
  },
  competitor: {
    id: "competitor",
    label: "Compétiteur",
    shortLabel: "COMP",
    description: "Top 25% AG — podium local, haut de tableau",
    icon: "🏆",
    color: "text-amber-500"
  },
  elite: {
    id: "elite",
    label: "Qualifiable",
    shortLabel: "QUAL",
    description: "Top 10% AG — slot National/Européen accessible",
    icon: "🎟️",
    color: "text-orange-500"
  },
  world_class: {
    id: "world_class",
    label: "Elite",
    shortLabel: "ELITE",
    description: "Top 3% AG — slot Mondial / podium overall",
    icon: "👑",
    color: "text-purple-500"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUGGESTIONS DE TEMPS PAR OBJECTIF RUNNING + AMBITION
// Temps indicatifs hommes. Femmes: +8-12% selon la distance.
// 5 paliers : Découverte / Confirmé / Compétiteur / Qualifiable / Elite
// ═══════════════════════════════════════════════════════════════════════════════

export type RunningObjectiveWithTimes = "Marathon" | "Semi" | "10K" | "5K" | "Trail" | "TrailShort" | "TrailMountain";
export type SexeForHints = "M" | "F";

export const RUNNING_TIME_HINTS: Record<RunningObjectiveWithTimes, Record<AmbitionLevel, { M: string; F: string }>> = {
  Marathon: {
    finisher:    { M: "4h30 – 5h+",    F: "4h55 – 5h30+" },
    age_group:   { M: "3h30 – 4h15",   F: "3h50 – 4h40" },
    competitor:  { M: "3h00 – 3h30",   F: "3h18 – 3h50" },
    elite:       { M: "2h45 – 3h00",   F: "3h05 – 3h20" },
    world_class: { M: "Sub 2h35",      F: "Sub 2h55" },
  },
  Semi: {
    finisher:    { M: "2h00 – 2h30",   F: "2h10 – 2h45" },
    age_group:   { M: "1h35 – 1h55",   F: "1h44 – 2h06" },
    competitor:  { M: "1h20 – 1h35",   F: "1h28 – 1h44" },
    elite:       { M: "1h12 – 1h20",   F: "1h20 – 1h28" },
    world_class: { M: "Sub 1h08",      F: "Sub 1h17" },
  },
  "10K": {
    finisher:    { M: "55' – 1h10",    F: "1h00 – 1h17" },
    age_group:   { M: "45' – 52'",     F: "49' – 57'" },
    competitor:  { M: "38' – 44'",     F: "42' – 48'" },
    elite:       { M: "33' – 37'",     F: "37' – 41'" },
    world_class: { M: "Sub 31'",       F: "Sub 35'" },
  },
  "5K": {
    finisher:    { M: "28' – 35'",     F: "30' – 38'" },
    age_group:   { M: "22' – 26'",     F: "24' – 29'" },
    competitor:  { M: "18' – 21'",     F: "20' – 23'" },
    elite:       { M: "16' – 18'",     F: "18' – 20'" },
    world_class: { M: "Sub 15'",       F: "Sub 17'" },
  },
  Trail: {
    finisher:    { M: "5h30 – 7h",     F: "6h00 – 7h45" },
    age_group:   { M: "4h00 – 5h15",   F: "4h25 – 5h45" },
    competitor:  { M: "3h15 – 4h00",   F: "3h35 – 4h25" },
    elite:       { M: "2h50 – 3h15",   F: "3h10 – 3h35" },
    world_class: { M: "Sub 2h45",      F: "Sub 3h05" },
  },
  TrailShort: {
    finisher:    { M: "5h30 – 7h",     F: "6h00 – 7h45" },
    age_group:   { M: "4h00 – 5h15",   F: "4h25 – 5h45" },
    competitor:  { M: "3h15 – 4h00",   F: "3h35 – 4h25" },
    elite:       { M: "2h50 – 3h15",   F: "3h10 – 3h35" },
    world_class: { M: "Sub 2h45",      F: "Sub 3h05" },
  },
  TrailMountain: {
    finisher:    { M: "12h – 16h",     F: "13h – 17h30" },
    age_group:   { M: "9h – 11h30",    F: "10h – 12h40" },
    competitor:  { M: "7h – 9h",       F: "7h45 – 10h" },
    elite:       { M: "6h – 7h",       F: "6h40 – 7h45" },
    world_class: { M: "Sub 5h45",      F: "Sub 6h25" },
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
 * Gère: casse, alias historiques, nouveaux alias "parcours athlète", valeurs nulles.
 *
 * Mapping legacy → nouvelles clés UI :
 *   - `discovery`   (nouvelle clé UI) → `finisher`   (clé interne historique)
 *   - `confirmed`   (nouvelle clé UI) → `age_group`  (clé interne historique)
 *   - `qualifiable` (nouvelle clé UI) → `elite`      (clé interne historique)
 *   - `world_class` (nouvelle clé UI) → `world_class` (NOUVEAU palier)
 */
const AMBITION_ALIASES: Record<string, AmbitionLevel> = {
  // Clés internes canoniques
  finisher: "finisher",
  age_group: "age_group",
  competitor: "competitor",
  elite: "elite",
  world_class: "world_class",
  // Alias "Parcours athlète" (labels UI saisis ailleurs)
  discovery: "finisher",
  decouverte: "finisher",
  "découverte": "finisher",
  fin: "finisher",
  confirmed: "age_group",
  confirme: "age_group",
  "confirmé": "age_group",
  ag: "age_group",
  agegroup: "age_group",
  intermediaire: "age_group",
  comp: "competitor",
  competiteur: "competitor",
  "compétiteur": "competitor",
  qualifiable: "elite",
  qualif: "elite",
  perf: "elite",
  performance: "elite",
  worldclass: "world_class",
  "world-class": "world_class",
  monde: "world_class",
  mondial: "world_class",
  pro: "world_class",
};

export function normalizeAmbitionLevel(value: unknown): AmbitionLevel {
  if (!value || typeof value !== "string") return DEFAULT_AMBITION;
  const key = value.trim().toLowerCase().replace(/\s+/g, "_");
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
 * Liste ordonnée pour les sélecteurs (du plus modeste au plus exigeant).
 */
export const AMBITION_LEVELS_ORDERED: AmbitionLevel[] = [
  "finisher",     // Découverte
  "age_group",    // Confirmé
  "competitor",   // Compétiteur
  "elite",        // Qualifiable
  "world_class",  // Elite (top 3%)
];

/**
 * Ambition par défaut — "Confirmé" (top 50% AG).
 * Position médiane volontaire pour éviter sur-promesses.
 */
export const DEFAULT_AMBITION: AmbitionLevel = "age_group";
