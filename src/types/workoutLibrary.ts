// =============================================
// TYPES BIBLIOTHÈQUE DE SÉANCES ÉLITE
// =============================================

import { ObjectifType } from "./athlete";

// Types de session (anciennement dans planificateur.ts)
export type SessionType = "A" | "B" | "C" | "D" | "REST" | "Récup" | "SV1" | "LT1" | "TT" | "VO2" | "Sprint" | "Brique" | "Race-Sim";
export type TrainingSport = "swim" | "bike" | "run" | "strength" | "mixed" | "cyclisme" | "course" | "natation" | "brick" | "renforcement" | "trail";
export type TrainingMetric = "power" | "HR" | "pace" | "css" | "puissance" | "allure" | "cardiaque" | "fc";
export type PhaseTag = "base" | "build" | "peak" | "taper";

/**
 * Intention physiologique canonique d'une fiche.
 *
 * Cette taxonomie décrit le stimulus principal réel. Elle ne remplace pas
 * les zones propres à chaque discipline et ne doit jamais être déduite d'un
 * simple mot présent dans le titre ou les notes de la séance.
 */
export type PhysiologicalIntent =
  // Domaines métaboliques : IDs identiques à tfclDoctrine.ts.
  | "moderate_lt1"
  | "recovery"
  | "mlss"
  | "vo2max"
  | "neuromuscular"
  | "max_strength"
  | "strength_endurance"
  | "technique_economy"
  | "mobility_prevention"
  | "mixed_specific"
  | "race_specific"
  | "fatmax"
  | "test";

export interface WorkoutPhysiology {
  primary: PhysiologicalIntent;
  secondary?: PhysiologicalIntent[];
  /** Justification courte fondée sur le contenu prescrit. */
  rationale: string;
}

export type WorkoutTrainingLevel = "untrained" | "light" | "trained" | "highly_trained";

export interface WorkoutPrerequisites {
  minimumTrainingLevel?: WorkoutTrainingLevel;
  minimumWeeklyHours?: number;
  /** Si vrai, l'absence de preuves suffisantes ferme l'accès par défaut. */
  requireVerifiedProfile?: boolean;
}

// Partie de structure d'une séance
export interface WorkoutStructurePart {
  part: string; // "Warm-up", "Main", "Cool-down"
  text: string;
  zones: string[];
}

// Variantes par objectif
export type WorkoutVariants = Partial<Record<"ironman" | "half" | "sprint" | "olympic" | "marathon" | "semi" | "10k" | "5k" | "trail_short" | "trail_mountain" | "trail_ultra" | "trail_long", string>>;

// Niveau de nécessité
export type NecessityLevel = "Obligatoire" | "Recommandé" | "Optionnel";

// Cible D+ (dénivelé positif)
export type DPlusTarget = number | { min: number; max: number };

// Goals pour filtrage
// "sprint"/"olympic" (triathlon courts) et "5k" ont été ajoutés après un audit
// coach — avant ce fix, aucune fiche n'était taguée pour ces trois objectifs
// (ni dans `variants`, ni dans `goals`), qui retombaient silencieusement sur
// le pool "half" (Sprint/Olympic) ou "10k" (5K) sans jamais bénéficier du
// bonus de score "objectif documenté" (workoutCatalogBuilder.scoreWorkout).
export type WorkoutGoal = "ironman" | "half" | "sprint" | "olympic" | "marathon" | "semi" | "10k" | "5k" | "trail_short" | "trail_mountain" | "trail_ultra" | "trail_long" | "start_to_run";

// =============================================
// PROFIL W'bal — Recalcul automatique des temps de repos
// =============================================
// Décrit la structure d'intervalle d'une séance de manière machine-readable
// pour permettre au W'bal post-processor de prescrire le temps de récupération
// optimal selon le CP/W' de l'athlète (Skiba 2012), sans dépendre du parsing
// regex du texte libre.
//
// Référentiel d'intensité :
//   - "FTP" / "CP" : % de la puissance critique / FTP (vélo)
//   - "MAP"        : % de la puissance aérobie maximale 5min (vélo)
//   - "VMA"        : % de la VMA (course)
//   - "CSS"        : % de la Critical Swim Speed (natation)
//   - "absolute"   : valeur absolue (W ou m/s) — usage avancé
export type WbalIntensityRef = "FTP" | "CP" | "MAP" | "VMA" | "CSS" | "absolute";

// Stratégie de récupération entre reps (impacte τ Skiba)
export type WbalRecoveryStrategy = "passive" | "active-light" | "active-tempo";

export interface WbalIntervalBlock {
  /** Nombre de répétitions */
  reps: number;
  /** Durée d'une rep en secondes */
  durationSec: number;
  /** Intensité de travail */
  intensity: number;
  /** Référentiel de l'intensité (FTP, CP, VMA, CSS, MAP, absolute) */
  intensityRef: WbalIntensityRef;
  /** Repos prescrit par défaut entre reps (en secondes) — recalculable via W'bal */
  defaultRestSec: number;
  /** Stratégie de récupération entre reps */
  recoveryStrategy?: WbalRecoveryStrategy;
  /** Étiquette libre (ex: "VO2max", "Sweet Spot", "Sprint Maximal") */
  label?: string;
}

export interface WbalProfile {
  /** Sport sur lequel s'applique le profil (généralement "bike" pour W'bal CP/W') */
  sport: TrainingSport;
  /** Blocs d'intervalles structurés (un workout peut chaîner plusieurs blocs) */
  blocks: WbalIntervalBlock[];
  /** Repos entre blocs distincts (sets), en secondes */
  restBetweenBlocksSec?: number;
  /** Indique si le repos doit être recalculé automatiquement via W'bal */
  autoRecalcRest?: boolean;
  /** Notes spécifiques au profil (ex: "Cadence libre", "Position aéro") */
  notes?: string;
}

// Séance de la bibliothèque
export interface LibraryWorkout {
  id: string;
  cat: SessionType;
  sport: TrainingSport;
  objectif: string;
  necessite: NecessityLevel;
  when: string;
  phase?: PhaseTag[];
  avoid: string;
  durationMin: [number, number];
  /**
   * Durée canonique (minutes) prescrite par phase. Optionnel : quand absent,
   * `resolveCanonicalDuration` interpole déterministiquement dans `durationMin`.
   * Évite de dupliquer une fiche en plusieurs variantes de durée.
   */
  durationByPhase?: Partial<Record<PhaseTag, number>>;
  metricKey: TrainingMetric;
  sportKey: string;
  structure: WorkoutStructurePart[];
  variants: WorkoutVariants;
  // Cible D+ pour trail (optionnel)
  dPlusTargetM?: DPlusTarget;
  // Goals compatibles (nouveau)
  goals?: WorkoutGoal[];
  // Tags pour filtrage avancé
  tags?: string[];
  // Notes additionnelles
  notes?: string;
  // Sport ID par défaut pour correspondance métrique/puissance (Nolio, etc.)
  defaultSportId?: number;
  // Profil W'bal optionnel — permet le recalcul automatique des temps de repos
  // au chargement de la séance, basé sur le CP/W' de l'athlète (Skiba 2012).
  wbalProfile?: WbalProfile;
  /** Métadonnée physiologique relue. Absente tant que la fiche n'est pas auditée. */
  physiology?: WorkoutPhysiology;
  /** Prérequis déterministes des protocoles avancés. */
  prerequisites?: WorkoutPrerequisites;
}

// Session planifiée étendue avec référence workout
export interface ExtendedPlannedSession {
  dayName: string;
  type: SessionType;
  sport: TrainingSport;
  name: string;
  workoutId: string;
  workoutTitle: string;
  durationMin: number;
  zone: string;
  zoneTarget: string;
  notes: string;
  dPlusTargetM?: DPlusTarget;
}
