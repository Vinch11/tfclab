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
