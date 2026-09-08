/**
 * Nutrition Prédictive – Two For Coaching Lab
 *
 * Catégorisation VLamax utilisée par TwoForCoachingAnalysis.tsx.
 *
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 4,
 * priorité 5) : ce fichier portait aussi computeNutritionEstimate (moteur
 * V1), déjà retiré de tout consommateur réel lors du nettoyage
 * NutritionPredictive.tsx (Cluster 3, priorité 4) — StaffDashboard.tsx
 * (son seul importeur restant, jamais rendu nulle part) est supprimé dans
 * ce même correctif. Tout le reste du fichier (computeNutritionEstimate,
 * applyNutritionalCap, NUTRITION_METHODOLOGY, SPORT_NUTRITION_COMPARISON,
 * NutritionalRiskIndex, NUTRITIONAL_RISK_DEFINITION, getObjectifLabel local)
 * était donc mort — supprimé. Seules getVLamaxCategory/getVLamaxLabel
 * restent, toujours utilisées.
 */

export type VLamaxCategory = 'very_low' | 'moderate' | 'high' | 'very_high';

export function getVLamaxCategory(vlamax: number): VLamaxCategory {
  if (vlamax <= 0.30) return 'very_low';
  if (vlamax <= 0.45) return 'moderate';
  if (vlamax <= 0.60) return 'high';
  return 'very_high';
}

export function getVLamaxLabel(category: VLamaxCategory): string {
  switch (category) {
    case 'very_low': return 'Très bas (≤0.30)';
    case 'moderate': return 'Modéré (0.31–0.45)';
    case 'high': return 'Élevé (0.46–0.60)';
    case 'very_high': return 'Très élevé (>0.60)';
  }
}
