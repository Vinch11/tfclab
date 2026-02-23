// =============================================
// FIX 12 - SPORTS AUTORISÉS PAR OBJECTIF
// Garde-fou: aucun sport interdit ne doit apparaître
// =============================================

export type AllowedSport = "course" | "vélo" | "natation" | "renfo";

export interface ProModules {
  triathlon: boolean;      // Active natation + vélo complet
  crosstraining: boolean;  // Active vélo Z1/Z2 uniquement (max 1x/sem)
}

// Objectifs 100% course (+ renfo)
const RUNNING_ONLY_GOALS = [
  "5K", "5k", "10K", "10k", "10km",
  "Semi", "Marathon", "StartToRun", "starttorun",
  "Trail", "TrailShort", "TrailMountain", "TrailUltra"
];

// Objectifs triathlon (multi-sport)
const TRIATHLON_GOALS = ["IM", "703"];

/**
 * Détermine les sports autorisés selon l'objectif et les modules Pro
 */
export function getAllowedSports(
  objectif: string, 
  proModules?: ProModules
): AllowedSport[] {
  // Triathlon natif (IM, 70.3)
  if (TRIATHLON_GOALS.includes(objectif)) {
    return ["course", "vélo", "natation", "renfo"];
  }

  // Running-only par défaut
  const allowed: AllowedSport[] = ["course", "renfo"];

  // Module triathlon activé -> multi-sport complet
  if (proModules?.triathlon) {
    return ["course", "vélo", "natation", "renfo"];
  }

  // Module cross-training activé -> vélo récup Z1/Z2 uniquement
  if (proModules?.crosstraining) {
    allowed.push("vélo");
  }

  return allowed;
}

/**
 * Vérifie si un sport est autorisé pour l'objectif donné
 */
export function isSportAllowed(
  sport: string, 
  objectif: string, 
  proModules?: ProModules
): boolean {
  const allowed = getAllowedSports(objectif, proModules);
  return allowed.includes(sport as AllowedSport);
}

/**
 * Retourne le sport principal selon l'objectif
 */
export function getSportPrincipal(objectif: string): "course" | "triathlon" {
  return TRIATHLON_GOALS.includes(objectif) ? "triathlon" : "course";
}

/**
 * Retourne les ratios de volume par sport selon l'objectif
 */
export function getRatiosSport(objectif: string): Record<AllowedSport, { min: number; max: number }> {
  switch (objectif) {
    case "IM":
      return {
        vélo: { min: 45, max: 55 },
        course: { min: 25, max: 35 },
        natation: { min: 10, max: 20 },
        renfo: { min: 0, max: 10 },
      };
    case "703":
      return {
        vélo: { min: 40, max: 50 },
        course: { min: 30, max: 40 },
        natation: { min: 10, max: 20 },
        renfo: { min: 0, max: 10 },
      };
    case "Trail":
    case "TrailMountain":
    case "TrailUltra":
      return {
        course: { min: 70, max: 85 },
        renfo: { min: 15, max: 30 },
        vélo: { min: 0, max: 0 },
        natation: { min: 0, max: 0 },
      };
    case "StartToRun":
      return {
        course: { min: 60, max: 75 },
        renfo: { min: 25, max: 40 },
        vélo: { min: 0, max: 0 },
        natation: { min: 0, max: 0 },
      };
    case "Marathon":
    case "Semi":
    case "TrailShort":
    default:
      return {
        course: { min: 80, max: 90 },
        renfo: { min: 10, max: 20 },
        vélo: { min: 0, max: 10 }, // Uniquement si cross-training activé
        natation: { min: 0, max: 0 },
      };
  }
}

/**
 * Retourne le nombre de séances clés par type d'objectif
 */
export function getNbSeancesCles(objectif: string): number {
  return TRIATHLON_GOALS.includes(objectif) ? 3 : 2;
}

/**
 * Label lisible pour les sports autorisés
 */
export function getAllowedSportsLabel(allowed: AllowedSport[]): string {
  const labels: Record<AllowedSport, string> = {
    course: "Course",
    vélo: "Vélo",
    natation: "Natation",
    renfo: "Renfo/PPG",
  };
  return allowed.map(s => labels[s]).join(" + ");
}

/**
 * Vérifie si l'objectif est running-only par défaut
 */
export function isRunningOnlyGoal(objectif: string): boolean {
  return RUNNING_ONLY_GOALS.includes(objectif);
}

/**
 * Vérifie si l'objectif est triathlon
 */
export function isTriathlonGoal(objectif: string): boolean {
  return TRIATHLON_GOALS.includes(objectif);
}
