// =============================================
// PROFIL EXPRESS — formules partagées (course à pied)
// Source unique de vérité pour éviter toute divergence entre la bibliothèque
// de tests (testLibrary.ts: run_cooper, run_vlamax_sprint15_12min), le champ
// de saisie terrain (VLamaxRunFieldTest.tsx) et le moteur Profil Express
// (profilExpress.ts).
// =============================================

/**
 * VO2max estimé depuis un test Cooper 12 min (distance en mètres).
 * Référence : Cooper K.H. (1968).
 */
export function vo2maxFromCooper12min(distanceM: number): number {
  return (distanceM - 504.9) / 44.73;
}

/**
 * VLamax course estimée depuis le ratio vitesse sprint 15s / vitesse 12min.
 * Référence : formule terrain Two For Coaching Lab (test_id
 * "run_vlamax_sprint15_12min"), fiabilité 0.80 en usage dédié.
 */
export function vlamaxRunFromSprintRatio(v15Ms: number, v12Ms: number): number {
  const sr = v15Ms / v12Ms;
  const normalized = Math.max(0, Math.min(1, (sr - 1.55) / 0.35));
  return Math.max(0.25, Math.min(0.95, 0.25 + 0.55 * normalized));
}
