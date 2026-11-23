/**
 * % de VMA du calculateur d'allure seuil TFCL (estimation avant le test 20 min).
 * Partagé par le calculateur et par la grille de zones, qui l'utilise comme estimation
 * lorsqu'aucun seuil mesuré n'existe.
 */
export type ThresholdPaceLevel = "beginner" | "intermediate" | "advanced" | "elite";

export const LEVEL_VMA_PERCENT: Record<ThresholdPaceLevel, { conservative: number; target: number; ambitious: number }> = {
  beginner:     { conservative: 0.78, target: 0.81, ambitious: 0.84 },
  intermediate: { conservative: 0.82, target: 0.85, ambitious: 0.87 },
  advanced:     { conservative: 0.85, target: 0.88, ambitious: 0.90 },
  elite:        { conservative: 0.88, target: 0.90, ambitious: 0.92 },
};

/** Niveau du calculateur le plus proche d'une ambition TFCL. */
export function levelForAmbition(ambition: string | null | undefined): ThresholdPaceLevel {
  switch (ambition) {
    case "finisher": return "beginner";
    case "competitor": return "advanced";
    case "elite": case "world_class": return "elite";
    default: return "intermediate";
  }
}
