/**
 * Helpers d'affichage qualitatif de la confiance / fiabilité
 * Remplace systématiquement les pourcentages numériques par des labels
 * conformes à la politique TFCL "transparence sans fausse précision".
 */

/** Label qualitatif pour un score de confiance 0–1 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "Élevée";
  if (confidence >= 0.6) return "Modérée";
  if (confidence >= 0.4) return "Limitée";
  return "Exploratoire";
}

/** Emoji + label */
export function getConfidenceEmoji(confidence: number): string {
  if (confidence >= 0.8) return "🟢";
  if (confidence >= 0.6) return "🟡";
  if (confidence >= 0.4) return "🟠";
  return "🔴";
}

/** Badge source basé sur la confiance */
export function getSourceBadge(confidence: number): string {
  if (confidence >= 0.8) return "🧪 Mesuré";
  if (confidence >= 0.6) return "🏃 Terrain";
  return "📐 Estimé";
}

/** Couleur CSS pour le label qualitatif */
export function getConfidenceColorClass(confidence: number): string {
  if (confidence >= 0.8) return "text-green-600 dark:text-green-400";
  if (confidence >= 0.6) return "text-amber-600 dark:text-amber-400";
  if (confidence >= 0.4) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

/** Pour les cas où la confiance est déjà en 0–100 (ex: analyse.confiance) */
export function getConfidenceLabelFromPercent(pct: number): string {
  return getConfidenceLabel(pct / 100);
}

export function getConfidenceColorClassFromPercent(pct: number): string {
  return getConfidenceColorClass(pct / 100);
}
