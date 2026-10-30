/**
 * TFCLab Workout Library V2 — isolated pilot (20 parameterized families).
 *
 * INACTIVE BY DESIGN: not imported by the production planner, PDF or Nolio.
 * These are coach-editable candidate recipes, NOT individually approved prescriptions.
 * Ranges below are editorial starting bounds, not scientifically validated dose limits.
 */
import type { WorkoutGoal, PhaseTag, PhysiologicalIntent, WorkoutTrainingLevel } from "@/types/workoutLibrary";

export type V2Sport = "run" | "bike" | "swim" | "trail" | "brick" | "strength";
export type RecipeMode = "steady" | "intervals" | "runwalk" | "swim_intervals" | "brick" | "strength";
export type AnchorKey = "rpe" | "ftpW" | "vmaKmh" | "thresholdPaceSecKm" | "cssSecPer100m" | "racePaceSecKm";
export type RecipeParameter =
  | "warmupSec" | "cooldownSec" | "mainSec" | "repeats" | "sets"
  | "workSec" | "recoverySec" | "betweenSetsSec" | "walkSec"
  | "swimRepDistanceM" | "bikeSec" | "runSec" | "transitionSec"
  | "strengthReps" | "strengthTempoSec" | "strengthRestSec";
export interface ParameterBound { min: number; max: number; step: number; default: number; }
export interface TargetRule { anchor: AnchorKey; lower: number; upper: number; description: string; }
export interface WorkoutV2Model {
  id: string;
  name: string;
  sport: V2Sport;
  goals: readonly WorkoutGoal[];
  phases: readonly PhaseTag[];
  minTrainingLevel: WorkoutTrainingLevel;
  intent: PhysiologicalIntent;
  mode: RecipeMode;
  params: Partial<Record<RecipeParameter, ParameterBound>>;
  target: TargetRule;
  secondTarget?: TargetRule;
  exercises?: readonly string[];
  evidence: readonly string[];
  coachNotes: string;
  requiresCoachReview: true;
}
const p = (min: number, max: number, d: number, step = 1): ParameterBound => ({ min, max, default: d, step });
const rpe = (lo: number, hi: number, description: string): TargetRule => ({ anchor: "rpe", lower: lo, upper: hi, description });
const anchored = (anchor: AnchorKey, lo: number, hi: number, description: string): TargetRule => ({ anchor, lower: lo, upper: hi, description });
const RUN: WorkoutGoal[] = ["5k", "10k", "semi", "marathon"];
const TRI: WorkoutGoal[] = ["sprint", "olympic", "half", "ironman"];
const TRAIL: WorkoutGoal[] = ["trail_short", "trail_mountain", "trail_long", "trail_ultra"];
const ALL: WorkoutGoal[] = ["start_to_run", ...RUN, ...TRI, ...TRAIL];
const RUN_TRI: WorkoutGoal[] = [...RUN, ...TRI];
const RUN_ALL: WorkoutGoal[] = [...RUN_TRI, ...TRAIL];
const BASE: PhaseTag[] = ["base", "build"];
const MAIN: PhaseTag[] = ["base", "build", "peak"];
const ALL_PHASES: PhaseTag[] = ["base", "build", "peak", "taper"];
const SESSIONS = "10.1007/s40279-024-02067-4"; // observational study of successful Norwegian coaches, 2024
const HIIT = "PMID:42237396"; // acute time near VO2max, not longitudinal benefit
const SWIM = "PMID:39526869"; // differing interval distances at critical swimming velocity
const STRENGTH = "PMID:40153564"; // umbrella review; methodological limitations
const TRAIL_REVIEW = "PMID:41209300"; // uphill/downhill biomechanics and load
const TAPER = "PMID:37163550"; // taper review; NOT a session-specific prescription

const steady = (lo: number, hi: number, d: number, warm = 600, cool = 300) => ({
  warmupSec: p(0, 1200, warm, 60), mainSec: p(lo, hi, d, 60), cooldownSec: p(0, 900, cool, 60),
});
const intervals = (repLo: number, repHi: number, repDefault: number, workLo: number, workHi: number, workDefault: number, recovery: number, sets = 1) => ({
  warmupSec: p(600, 1500, 900, 60),
  sets: p(1, 3, sets), repeats: p(repLo, repHi, repDefault),
  workSec: p(workLo, workHi, workDefault, 15),
  recoverySec: p(0, 480, recovery, 15),
  betweenSetsSec: p(0, 600, 300, 30),
  cooldownSec: p(300, 900, 600, 60),
});
const strength = (exercises: number, reps: number, rest: number) => ({
  warmupSec: p(300, 900, 600, 60), sets: p(2, 4, 3),
  strengthReps: p(3, 12, reps), strengthTempoSec: p(2, 8, 4),
  strengthRestSec: p(15, 240, rest, 15),
  betweenSetsSec: p(60, 300, 180, 30),
  cooldownSec: p(0, 600, 300, 60),
});
const common = { requiresCoachReview: true as const };

export const WORKOUT_V2_MODELS: readonly WorkoutV2Model[] = [
  { ...common, id: "V2_RUN_01", name: "Courir–marcher progressif", sport: "run", goals: ["start_to_run"], phases: BASE, minTrainingLevel: "untrained",
    intent: "moderate_lt1", mode: "runwalk",
    params: { warmupSec: p(300, 900, 600, 60), repeats: p(4, 10, 6), workSec: p(60, 300, 120, 30), walkSec: p(60, 180, 90, 30), cooldownSec: p(180, 600, 300, 60) },
    target: rpe(2, 4, "Course facile en aisance respiratoire ; arrêt si douleur"),
    evidence: [SESSIONS], coachNotes: "Progression individualisée d'une séance à l'autre ; aucune augmentation automatique." },
  { ...common, id: "V2_RUN_02", name: "Endurance facile / récupération", sport: "run", goals: ["start_to_run", ...RUN_ALL], phases: ALL_PHASES, minTrainingLevel: "light",
    intent: "moderate_lt1", mode: "steady", params: steady(600, 5400, 2400),
    target: rpe(2, 4, "Effort facile ; sous LT1 seulement si LT1 est réellement connu"),
    evidence: [SESSIONS, TAPER], coachNotes: "La durée doit respecter la tolérance mécanique de course à pied." },
  { ...common, id: "V2_RUN_03", name: "Sortie longue endurance", sport: "run", goals: ["10k", "semi", "marathon", "half", "ironman"], phases: MAIN, minTrainingLevel: "trained",
    intent: "moderate_lt1", mode: "steady", params: steady(2700, 9000, 5400, 600, 600),
    target: rpe(2, 4, "Endurance contrôlée ; aucune durée implicite déduite de la phase"),
    evidence: [SESSIONS], coachNotes: "Durée longue = sollicitation importante ; capacité individuelle et récupération à confirmer." },
  { ...common, id: "V2_RUN_04", name: "Intervalles autour du seuil course", sport: "run", goals: ["5k", "10k", "semi", "marathon", "olympic", "half"], phases: ["build", "peak"], minTrainingLevel: "trained",
    intent: "mlss", mode: "intervals", params: intervals(2, 6, 3, 300, 1200, 600, 120),
    target: anchored("thresholdPaceSecKm", 0.96, 1.0, "Pourcentage de vitesse correspondant à l'allure seuil vérifiée"),
    evidence: [SESSIONS], coachNotes: "MLSS n'est pas garanti par une simple allure seuil ; réguler selon les observations et la dérive." },
  { ...common, id: "V2_RUN_05", name: "Intervalles VO2 course", sport: "run", goals: ["5k", "10k", "sprint", "olympic"], phases: ["build", "peak"], minTrainingLevel: "trained",
    intent: "vo2max", mode: "intervals", params: intervals(3, 8, 5, 120, 300, 180, 180),
    target: anchored("vmaKmh", 0.95, 1.05, "Pourcentage de VMA mesurée ; ce n'est pas une garantie de temps à VO2max"),
    evidence: [HIIT, SESSIONS], coachNotes: "À réserver aux athlètes capables de supporter les impacts et répétitions rapides." },
  { ...common, id: "V2_RUN_06", name: "Lignes droites / coordination", sport: "run", goals: [...RUN, "sprint", "olympic", "half"], phases: MAIN, minTrainingLevel: "light",
    intent: "neuromuscular", mode: "intervals",
    params: { ...intervals(4, 10, 6, 10, 30, 20, 90), sets: p(1, 1, 1), warmupSec: p(600, 1200, 900, 60) },
    target: rpe(6, 8, "Rapide mais relâché ; jamais sprint maximal improvisé"),
    evidence: [SESSIONS], coachNotes: "Technique prioritaire ; éviter si douleur ou fatigue neuromusculaire." },

  { ...common, id: "V2_BIKE_01", name: "Endurance vélo extensive", sport: "bike", goals: TRI, phases: ALL_PHASES, minTrainingLevel: "light",
    intent: "moderate_lt1", mode: "steady", params: steady(900, 18000, 5400),
    target: rpe(2, 4, "Aérobie facile ; ventilateur/hydratation selon contexte"),
    evidence: [SESSIONS], coachNotes: "Les très longues variantes nécessitent approbation de capacité, nutrition et disponibilité." },
  { ...common, id: "V2_BIKE_02", name: "Intervalles intensité modérée vélo", sport: "bike", goals: TRI, phases: ["base", "build", "peak"], minTrainingLevel: "trained",
    intent: "mlss", mode: "intervals", params: intervals(2, 6, 3, 300, 1200, 720, 180),
    target: anchored("ftpW", 0.88, 1.0, "Zone relative à la FTP connue, pas MLSS démontré"),
    evidence: [SESSIONS], coachNotes: "Distinguer FTP estimée et mesure MLSS ; ne pas utiliser l'intensité comme preuve de lactate." },
  { ...common, id: "V2_BIKE_03", name: "Intervalles haute intensité vélo", sport: "bike", goals: TRI, phases: ["build", "peak"], minTrainingLevel: "trained",
    intent: "vo2max", mode: "intervals", params: intervals(3, 8, 5, 120, 360, 240, 240),
    target: anchored("ftpW", 1.05, 1.18, "Pourcentage de FTP ; ne garantit pas VO2max"),
    evidence: [HIIT, SESSIONS], coachNotes: "L'ajustement de la récupération dépend de la réalisation, pas d'une formule universelle." },
  { ...common, id: "V2_BIKE_04", name: "Spécificité vélo compétition", sport: "bike", goals: TRI, phases: ["build", "peak"], minTrainingLevel: "trained",
    intent: "race_specific", mode: "steady", params: steady(1200, 10800, 4500, 900, 600),
    target: rpe(3, 6, "Effort spécifique à préciser par le coach selon distance et environnement"),
    evidence: [SESSIONS], coachNotes: "Aucune cible unique d'IF pour sprint, olympique, 70.3 et Ironman ; validation coach obligatoire." },

  { ...common, id: "V2_SWIM_01", name: "Endurance technique natation", sport: "swim", goals: TRI, phases: ALL_PHASES, minTrainingLevel: "light",
    intent: "moderate_lt1", mode: "steady", params: steady(600, 4200, 2100, 300, 300),
    target: rpe(2, 4, "Durée de nage, sans déduire une distance sans allure appropriée"),
    evidence: [SESSIONS], coachNotes: "La durée des éducatifs et changements de nage reste déclarée, jamais inférée de CSS crawl." },
  { ...common, id: "V2_SWIM_02", name: "Intervalles crawl autour de CSS", sport: "swim", goals: TRI, phases: ["base", "build", "peak"], minTrainingLevel: "trained",
    intent: "mlss", mode: "swim_intervals",
    params: { warmupSec: p(300, 1200, 600, 60), repeats: p(4, 16, 8), swimRepDistanceM: p(100, 400, 200, 100), recoverySec: p(15, 90, 30, 15), cooldownSec: p(180, 600, 300, 60) },
    target: anchored("cssSecPer100m", 0.95, 1, "Allure par 100m calculée sur vitesse CSS mesurée, crawl uniquement"),
    evidence: [SWIM, SESSIONS], coachNotes: "CSS et MLSS ne sont pas équivalentes universelles ; chronométrage théorique, pas temps réellement nagé." },
  { ...common, id: "V2_SWIM_03", name: "Éducatifs techniques chronométrés", sport: "swim", goals: TRI, phases: ALL_PHASES, minTrainingLevel: "untrained",
    intent: "technique_economy", mode: "intervals", params: intervals(4, 12, 8, 30, 180, 90, 30),
    target: rpe(2, 4, "Technique et qualité gestuelle ; pas de CSS appliquée aux éducatifs"),
    evidence: [SESSIONS], coachNotes: "Déclarer chaque éducatif et son matériel avant adoption individuelle." },

  { ...common, id: "V2_TRAIL_01", name: "Répétitions de montée", sport: "trail", goals: TRAIL, phases: ["base", "build", "peak"], minTrainingLevel: "trained",
    intent: "strength_endurance", mode: "intervals", params: intervals(3, 10, 6, 90, 600, 240, 240),
    target: rpe(5, 7, "Effort contrôlé en montée, marche rapide autorisée"),
    evidence: [TRAIL_REVIEW], coachNotes: "Pente, technicité et durée de descente de récupération à renseigner ; non équivalents à du plat." },
  { ...common, id: "V2_TRAIL_02", name: "Sortie longue terrain trail", sport: "trail", goals: TRAIL, phases: MAIN, minTrainingLevel: "trained",
    intent: "race_specific", mode: "steady", params: steady(2400, 14400, 7200, 600, 600),
    target: rpe(2, 5, "Durée prescrite, dénivelé et technicité à fixer séparément"),
    evidence: [TRAIL_REVIEW, SESSIONS], coachNotes: "Le temps ne décrit pas D+/D-, descente excentrique, ravitaillement ni technicité ; revue coach obligatoire." },
  { ...common, id: "V2_TRAIL_03", name: "Habituation descente contrôlée", sport: "trail", goals: ["trail_mountain", "trail_long", "trail_ultra"], phases: BASE, minTrainingLevel: "trained",
    intent: "technique_economy", mode: "intervals", params: intervals(3, 8, 4, 30, 180, 60, 180),
    target: rpe(2, 4, "Descente facile et maîtrisée, pas de chronométrage maximal"),
    evidence: [TRAIL_REVIEW], coachNotes: "Fort coût excentrique potentiel ; refuser si antécédent douloureux ou compétence terrain inconnue." },

  { ...common, id: "V2_BRICK_01", name: "Transition vélo-course aérobie", sport: "brick", goals: TRI, phases: MAIN, minTrainingLevel: "trained",
    intent: "mixed_specific", mode: "brick",
    params: { warmupSec: p(0, 900, 600, 60), bikeSec: p(1800, 10800, 3600, 60), transitionSec: p(60, 600, 180, 30), runSec: p(300, 2400, 900, 60), cooldownSec: p(0, 900, 300, 60) },
    target: rpe(2, 4, "Vélo contrôlé"), secondTarget: rpe(2, 4, "Course facile et progressive"),
    evidence: [SESSIONS], coachNotes: "Deux sports et leurs références restent distincts ; contrôle de capacité de course post-vélo." },
  { ...common, id: "V2_BRICK_02", name: "Transition spécifique compétition", sport: "brick", goals: ["olympic", "half", "ironman"], phases: ["build", "peak"], minTrainingLevel: "highly_trained",
    intent: "race_specific", mode: "brick",
    params: { warmupSec: p(300, 1200, 900, 60), bikeSec: p(2700, 10800, 5400, 60), transitionSec: p(60, 600, 180, 30), runSec: p(600, 3600, 1200, 60), cooldownSec: p(0, 900, 300, 60) },
    target: rpe(4, 6, "Vélo spécifique à étalonner"), secondTarget: rpe(4, 6, "Course spécifique à étalonner séparément"),
    evidence: [SESSIONS], coachNotes: "Aucune intensité course ou vélo universelle ; compatible seulement après revue des limites individuelles." },

  { ...common, id: "V2_STRENGTH_01", name: "Force maximale : membres inférieurs", sport: "strength", goals: [...RUN_ALL, ...TRI], phases: BASE, minTrainingLevel: "trained",
    intent: "max_strength", mode: "strength",
    params: { ...strength(3, 5, 150), strengthReps: p(3, 6, 5) },
    exercises: ["Squat ou variante adaptée", "Hinge / soulevé de terre adapté", "Montée sur pointe / soléaire"],
    target: rpe(6, 8, "RPE de série et technique ; aucune zone cardiaque ni charge 1RM fabriquée"),
    evidence: [STRENGTH], coachNotes: "Charges déterminées manuellement ; le temps calculé repose sur le tempo déclaré." },
  { ...common, id: "V2_STRENGTH_02", name: "Stabilité, prévention et mobilité", sport: "strength", goals: ALL, phases: ALL_PHASES, minTrainingLevel: "untrained",
    intent: "mobility_prevention", mode: "strength",
    params: { ...strength(4, 8, 45), strengthReps: p(4, 12, 8), strengthTempoSec: p(2, 8, 4) },
    exercises: ["Contrôle du tronc", "Fente ou variante", "Équilibre unipodal", "Mobilité active"],
    target: rpe(2, 5, "Technique en priorité ; arrêter si douleur"),
    evidence: [STRENGTH], coachNotes: "Ne pas présenter la prévention des blessures comme garantie causale ; ajustements coach nécessaires." },
] as const;

export const WORKOUT_V2_GOALS: readonly WorkoutGoal[] = ALL;
export const WORKOUT_V2_SPORTS: readonly V2Sport[] = ["run", "bike", "swim", "trail", "brick", "strength"];
export const WORKOUT_V2_EVIDENCE = {
  [SESSIONS]: "Tønnessen et al. (2024), Sports Medicine, DOI: 10.1007/s40279-024-02067-4 — observation de modèles de coaches, non validation des paramètres TFCLab.",
  [HIIT]: "Revue systématique/méta-analyse HIIT (2026), PMID: 42237396 — temps aigu près de VO2max, pas supériorité des adaptations futures.",
  [SWIM]: "Biophysical analyses of interval sets at critical swimming velocity (2024), PMID: 39526869 — n=11, extrapolation limitée.",
  [STRENGTH]: "Umbrella review force/endurance (2025), PMID: 40153564 — bénéfices potentiels, confiance méthodologique variable.",
  [TRAIL_REVIEW]: "Review uphill/downhill biomechanics (2025), PMID: 41209300 — charges mécaniques et risques, non dose universelle.",
  [TAPER]: "Meta-analysis taper (2023), PMID: 37163550 — principes généraux, non recette de séance individuelle.",
} as const;

export function workoutV2Coverage() {
  return {
    goals: Object.fromEntries(ALL.map(goal => [goal, WORKOUT_V2_MODELS.filter(m => m.goals.includes(goal)).map(m => m.id)])),
    sports: Object.fromEntries(WORKOUT_V2_SPORTS.map(sport => [sport, WORKOUT_V2_MODELS.filter(m => m.sport === sport).map(m => m.id)])),
  };
}
