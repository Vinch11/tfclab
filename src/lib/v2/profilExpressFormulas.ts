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

/**
 * VMA estimée depuis un 1500m piste (distance fixe, temps mesuré).
 * Référence : protocole TFCL Track Day™ (Bloc 3), formule Léger-Boucher
 * adaptée — correction +2% pour piste extérieure (frottement/courbes),
 * cf. buildDiagnosticProtocolHTML.ts ("VMA (km/h) = distance_1500m /
 * temps_1500m × 3.6 (corrigée +2% piste extérieure)").
 *
 * NOTE — ne pas combiner cette VMA avec vlamaxRunFromSprintRatio ci-dessus :
 * ce ratio est calibré contre une vitesse 12min (~90-95% VMA), pas contre
 * la VMA elle-même. Utiliser vlamaxRunFromSprint15Distance ci-dessous, qui
 * est calibrée spécifiquement pour ce protocole (sprint 15s seul, sans
 * référence à un second effort).
 */
export function vmaFromTrack1500m(timeSec: number): number {
  const vMs = 1500 / timeSec;
  return vMs * 3.6 * 1.02;
}

/**
 * VLamax course estimée depuis la seule distance d'un sprint 15s lancé.
 * Référence : protocole TFCL Track Day™ (Bloc 2), régression calibrée
 * (RMSE 0.073, N=15), cf. buildDiagnosticProtocolHTML.ts
 * ("VLamax_run ≈ −0.5066 + 0.01420 × distance_15s").
 */
export function vlamaxRunFromSprint15Distance(distanceM: number): number {
  const raw = -0.5066 + 0.0142 * distanceM;
  return Math.max(0.15, Math.min(1.10, raw));
}
