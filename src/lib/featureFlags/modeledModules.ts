/**
 * Modules modélisés masqués (nov. 2026).
 *
 * Ces modules recalculaient leurs propres repères (puissance de course, glucides, durée de course,
 * TTE cible, cibles d'âge, risque de blessure…) parfois sur des données absentes, et contredisaient
 * la décision du Compass et du rapport. Ils sont masqués dans l'app et retirés du rapport coach
 * (voir COACH_FACTUAL_APPENDICES dans ExportTools) jusqu'à ce qu'ils lisent les mêmes repères que
 * le bilan. Le code reste en place : passer SHOW_MODELED_MODULES à true les réaffiche tous.
 */
export const SHOW_MODELED_MODULES = false;

/** Identifiants des sections masquées (Dashboard, Profil, Stratégie, Profil Running). */
export const MODELED_SECTION_IDS: ReadonlySet<string> = new Set([
  // Dashboard / Profil / Stratégie
  'tte-glycogen-insights',     // TTE × glycogène, « effondrement » glycogénique
  'ftp-targets-profil',        // cibles FTP/kg ou VMA avec ajustement d'âge (doublon du Compass)
  'fatmax-tfcl-profil',        // zones métaboliques Mader (autre grille que les plans)
  'vo2max-age-profil',         // comparaison VO₂max × âge
  'lactate-thresholds-profil', // correspondances lactiques simulées
  'lactate-correspondence',
  'cycle-intelligence-profil',
  'adaptation-predictor-profil', // prédictions de progression en semaines
  'wbal-recovery-profil',
  'nutrition-v2',              // nutrition prédictive
  'pacing-envelope',           // Pacing Envelope / LDRI
  // Profil Running
  'run-mlss-coherence',
  'run-mlss-drift',
  'race-time-estimate',
  'injury-risk-cap',
  'pacing-envelope-run',
  'vma-targets',               // cibles VMA avec ajustement d'âge
]);

export const isModeledSectionHidden = (id: string) => !SHOW_MODELED_MODULES && MODELED_SECTION_IDS.has(id);
