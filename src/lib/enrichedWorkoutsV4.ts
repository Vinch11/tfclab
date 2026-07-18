/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICHED WORKOUTS V4 — Gap-fill Audit
 * 
 * Séances ajoutées suite à l'audit de diversité pour combler les lacunes :
 * - Strength A (Endurance musculaire) + B (Intensité force)
 * - Brick C (Technique transition) + D (Récup enchaînement) + Taper
 * - Natation Kick drills
 * - 10K spécifiques supplémentaires
 * - Taper séances complémentaires (cyclisme, brick)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";

// =============================================
// STRENGTH A — Endurance musculaire / socle
// =============================================
const STRENGTH_A: LibraryWorkout[] = [
  {
    id: "A_STR_ENDURANCE_CIRCUIT",
    cat: "A",
    sport: "strength",
    objectif: "Circuit endurance musculaire général – socle de force",
    necessite: "Recommandé",
    when: "Phase base/build, 2×/sem max",
    phase: ["base", "build"],
    avoid: "Fatigue musculaire importante, veille séance clé",
    durationMin: [40, 55],
    metricKey: "cardiaque",
    sportKey: "strength",
    structure: [
      { part: "Warm-up", text: "10min mobilité dynamique + activation glutes/core", zones: ["Z1"] },
      { part: "Main", text: "Circuit 3 tours: Squat 15rep, Fentes 12/côté, Planche 45s, Deadlift léger 15rep, Step-up 12/côté, Nordic curl assist 8rep. Repos 60s entre exercices, 2min entre tours", zones: ["Z2"] },
      { part: "Cool-down", text: "5min étirements + foam roller", zones: ["Z1"] },
    ],
    variants: { ironman: "4 tours, charges légères", marathon: "3 tours focus bas du corps", "10k": "3 tours tempo rapide" },
    goals: ["ironman", "half", "marathon", "semi", "10k"],
    tags: ["strength", "endurance", "circuit"],
  },
  {
    id: "A_STR_STABILITY_CORE",
    cat: "A",
    sport: "strength",
    objectif: "Stabilité et gainage – prévention blessure",
    necessite: "Recommandé",
    when: "Toute phase, 2-3×/sem",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Aucun – adapté même en fatigue",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "strength",
    structure: [
      { part: "Warm-up", text: "5min mobilité hanche + cheville", zones: ["Z1"] },
      { part: "Main", text: "3 tours: Planche frontale 45s, Planche latérale 30s/côté, Bird-dog 10/côté, Dead bug 12/côté, Pont fessier unipodal 10/côté, Clamshell 15/côté", zones: ["Z1"] },
      { part: "Cool-down", text: "5min stretching", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["ironman", "half", "marathon", "semi", "10k", "trail_short", "trail_mountain", "trail_ultra"],
    tags: ["strength", "core", "stability", "prehab"],
  },
  {
    id: "A_STR_AERO_STRENGTH",
    cat: "A",
    sport: "strength",
    objectif: "Force aérobie – circuit à basse intensité avec charge modérée",
    necessite: "Optionnel",
    when: "Phase base, 1-2×/sem",
    phase: ["base"],
    avoid: "Fatigue générale élevée",
    durationMin: [45, 60],
    metricKey: "cardiaque",
    sportKey: "strength",
    structure: [
      { part: "Warm-up", text: "10min vélo/rameur Z1 + mobilité", zones: ["Z1"] },
      { part: "Main", text: "4 tours: Goblet squat 12rep, KB swing 15rep, Row haltère 10/côté, Thruster léger 10rep, Box step-up lestés 10/côté. Repos 90s entre tours, garder FC en Z2", zones: ["Z2"] },
      { part: "Cool-down", text: "5min retour au calme + stretching", zones: ["Z1"] },
    ],
    variants: { ironman: "5 tours, charges modérées", trail_mountain: "Ajouter marche lestée 10min" },
    goals: ["ironman", "half", "trail_mountain", "trail_ultra"],
    tags: ["strength", "aero", "circuit"],
  },
];

// =============================================
// STRENGTH B — Intensité / puissance
// =============================================
const STRENGTH_B: LibraryWorkout[] = [
  {
    id: "B_STR_MAX_STRENGTH",
    cat: "B",
    sport: "strength",
    objectif: "Force maximale – développement neuromusculaire",
    necessite: "Recommandé",
    when: "Phase build, 1-2×/sem",
    phase: ["build", "peak"],
    avoid: "Veille de compétition, fatigue musculaire accumulée",
    durationMin: [45, 60],
    metricKey: "cardiaque",
    sportKey: "strength",
    structure: [
      { part: "Warm-up", text: "10min mobilité + séries progressives échauffement", zones: ["Z1"] },
      { part: "Main", text: "Back squat 4×5 @80-85% 1RM, Deadlift 4×5 @80%, Step-up lestés 3×8/côté, Hip thrust 3×8 @75%. Repos 3min entre séries lourdes", zones: ["Z4"] },
      { part: "Cool-down", text: "5min retour au calme + foam roller", zones: ["Z1"] },
    ],
    variants: { trail_mountain: "Ajouter fentes marchées lestées", marathon: "Réduire charges, augmenter reps à 8" },
    goals: ["ironman", "half", "marathon", "trail_short", "trail_mountain"],
    tags: ["strength", "max", "power"],
  },
  {
    id: "B_STR_PLYOMETRIC",
    cat: "B",
    sport: "strength",
    objectif: "Pliométrie – puissance explosive et réactivité musculaire",
    necessite: "Optionnel",
    when: "Phase build/peak, 1×/sem max",
    phase: ["build", "peak"],
    avoid: "Problèmes articulaires, fatigue nerveuse",
    durationMin: [35, 45],
    metricKey: "cardiaque",
    sportKey: "strength",
    structure: [
      { part: "Warm-up", text: "10min mobilité + 6 sauts progressifs", zones: ["Z1"] },
      { part: "Main", text: "3 tours: Box jumps 6rep, Bounds alternés 8rep, Drop jumps 5rep, Squat jumps 8rep, Single-leg hops 6/côté. Repos 2min entre tours. Qualité > volume", zones: ["Z5"] },
      { part: "Cool-down", text: "5min stretching dynamique", zones: ["Z1"] },
    ],
    variants: { "10k": "Accent sur réactivité pied", trail_short: "Ajouter sauts latéraux" },
    goals: ["10k", "semi", "trail_short", "trail_mountain"],
    tags: ["strength", "plyometric", "power", "explosive"],
  },
  {
    id: "B_STR_POWER_ENDURANCE",
    cat: "B",
    sport: "strength",
    objectif: "Puissance-endurance – maintien de force sous fatigue",
    necessite: "Recommandé",
    when: "Phase build/peak, 1×/sem",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée importante",
    durationMin: [40, 55],
    metricKey: "cardiaque",
    sportKey: "strength",
    structure: [
      { part: "Warm-up", text: "8min échauffement progressif", zones: ["Z1"] },
      { part: "Main", text: "EMOM 20min: Min 1: KB swing 15rep, Min 2: Goblet squat 10rep, Min 3: Row 10rep, Min 4: Push-up 12rep. Puis: 3×12 Fentes bulgares, 3×10 Romanian DL", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "5min récupération active + étirements", zones: ["Z1"] },
    ],
    variants: { ironman: "EMOM 24min", trail_ultra: "Ajouter farmer's walk 200m" },
    goals: ["ironman", "half", "marathon", "trail_mountain", "trail_ultra"],
    tags: ["strength", "power-endurance"],
  },
];

// =============================================
// BRICK C — Technique transition
// =============================================
const BRICK_C: LibraryWorkout[] = [
  {
    id: "C_BRICK_TRANSITION_DRILL",
    cat: "C",
    sport: "brick",
    objectif: "Technique de transition T2 – vitesse et automatismes",
    necessite: "Recommandé",
    when: "Phase peak, 1×/sem",
    phase: ["build", "peak"],
    avoid: "Si pas d'accès zone de transition",
    durationMin: [30, 45],
    metricKey: "cardiaque",
    sportKey: "brick",
    structure: [
      { part: "Warm-up", text: "15min vélo Z2", zones: ["Z2"] },
      { part: "Main", text: "5× transition drill: Vélo 3min Z3 → transition chrono → course 3min Z3. Focus: descendre du vélo, changer chaussures, trouver rythme course en <30s. Chronométrer chaque transition", zones: ["Z3"] },
      { part: "Cool-down", text: "10min jogging Z1", zones: ["Z1"] },
    ],
    variants: { half: "Transition en 20s objectif", ironman: "Focus confort + nutrition en transition" },
    goals: ["ironman", "half"],
    tags: ["brick", "transition", "technique"],
  },
  {
    id: "C_BRICK_CADENCE_ADAPT",
    cat: "C",
    sport: "brick",
    objectif: "Adaptation cadence vélo→course – travail neuromusculaire",
    necessite: "Recommandé",
    when: "Phase build/peak",
    phase: ["build", "peak"],
    avoid: "Fatigue musculaire importante",
    durationMin: [50, 120],
    metricKey: "puissance",
    sportKey: "brick",
    structure: [
      { part: "Warm-up", text: "10min vélo Z1", zones: ["Z1"] },
      { part: "Main", text: "Vélo: 3–6×(5min @95rpm Z3 + 5min @75rpm Z3) selon durée dimensionnée. Transition immédiate. Course: 15–25min progression cadence 170→180spm, allure semi. Focus sensation jambes lourdes", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "5min marche", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["ironman", "half"],
    tags: ["brick", "cadence", "technique"],
  },
  {
    id: "C_BRICK_NUTRITION_PRACTICE",
    cat: "C",
    sport: "brick",
    objectif: "Répétition nutrition en enchaînement – gut training spécifique",
    necessite: "Recommandé",
    when: "Phase build",
    phase: ["build"],
    avoid: "Troubles GI connus non stabilisés",
    durationMin: [60, 90],
    metricKey: "cardiaque",
    sportKey: "brick",
    structure: [
      { part: "Warm-up", text: "10min vélo Z1", zones: ["Z1"] },
      { part: "Main", text: "Vélo 45min Z2 avec prise 60-90g/h glucides. Transition. Course 20min Z2 avec gel à 5min et 15min. Objectif: tolérer ≥60g/h sans symptômes GI", zones: ["Z2"] },
      { part: "Cool-down", text: "5min marche + notes tolérance GI", zones: ["Z1"] },
    ],
    variants: { ironman: "90g/h objectif, vélo 60min", half: "60g/h objectif" },
    goals: ["ironman", "half"],
    tags: ["brick", "nutrition", "gut-training"],
  },
];

// =============================================
// BRICK D — Récup enchaînement + TAPER Brick
// =============================================
const BRICK_D: LibraryWorkout[] = [
  {
    id: "D_BRICK_EASY_SHAKEOUT",
    cat: "D",
    sport: "brick",
    objectif: "Enchaînement léger de récupération – maintien sensation transition",
    necessite: "Optionnel",
    when: "Lendemain brick intensif",
    phase: ["build", "peak", "taper"],
    avoid: "Aucun",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "brick",
    structure: [
      { part: "Warm-up", text: "5min vélo très facile", zones: ["Z1"] },
      { part: "Main", text: "Vélo 10min Z1 → Transition calme → Course 10min Z1. Tout en aisance respiratoire", zones: ["Z1"] },
      { part: "Cool-down", text: "5min marche + stretching", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["ironman", "half"],
    tags: ["brick", "recovery"],
  },
  {
    id: "D_BRICK_RECOVERY_SPIN",
    cat: "D",
    sport: "brick",
    objectif: "Récupération active enchaînement – décontraction musculaire",
    necessite: "Optionnel",
    when: "Phase taper, veille course",
    phase: ["taper"],
    avoid: "Aucun",
    durationMin: [20, 30],
    metricKey: "cardiaque",
    sportKey: "brick",
    structure: [
      { part: "Warm-up", text: "5min spin très léger", zones: ["Z1"] },
      { part: "Main", text: "Vélo 10min moulin Z1 + 2×30s accélération libre. Transition. Trot 5min Z1 + 3×15s foulées vives", zones: ["Z1"] },
      { part: "Cool-down", text: "3min marche", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["ironman", "half"],
    tags: ["brick", "recovery", "taper"],
  },
];

// =============================================
// BRICK TAPER — Séances pré-course
// =============================================
const BRICK_TAPER: LibraryWorkout[] = [
  {
    id: "BR_TAPER_OPENER",
    cat: "Brique",
    sport: "brick",
    objectif: "Brick opener pré-course – activation sans fatigue",
    necessite: "Obligatoire",
    when: "J-3 à J-5 avant course",
    phase: ["taper"],
    avoid: "Aucun – obligatoire race week",
    durationMin: [30, 45],
    metricKey: "puissance",
    sportKey: "brick",
    structure: [
      { part: "Warm-up", text: "10min vélo Z1", zones: ["Z1"] },
      { part: "Main", text: "Vélo 10min Z2 incluant 3×1min @allure course (FTP/race pace). Transition rapide. Course 10min Z2 incluant 3×30s @allure course", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "5min marche", zones: ["Z1"] },
    ],
    variants: { ironman: "Efforts à allure IM", half: "Efforts à allure 70.3" },
    goals: ["ironman", "half"],
    tags: ["brick", "taper", "opener"],
  },
  {
    id: "BR_TAPER_DRESS_REHEARSAL",
    cat: "Brique",
    sport: "brick",
    objectif: "Répétition générale – tenue course, nutrition, matériel final",
    necessite: "Recommandé",
    when: "J-7 avant course",
    phase: ["taper"],
    avoid: "Aucun",
    durationMin: [40, 60],
    metricKey: "puissance",
    sportKey: "brick",
    structure: [
      { part: "Warm-up", text: "10min facile", zones: ["Z1"] },
      { part: "Main", text: "Vélo 20min Z2 en tenue course avec nutrition prévue. Transition en conditions réelles. Course 15min Z2 en tenue course. Tester tout le matériel final", zones: ["Z2"] },
      { part: "Cool-down", text: "5min décontraction", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["ironman", "half"],
    tags: ["brick", "taper", "dress-rehearsal"],
  },
];

// =============================================
// NATATION — Kick drills & technique jambes
// =============================================
const SWIM_KICK: LibraryWorkout[] = [
  {
    id: "C_SWIM_KICK_TECH",
    cat: "C",
    sport: "natation",
    objectif: "Technique de battements – position du corps et propulsion jambes",
    necessite: "Recommandé",
    when: "Phase base/build, 1×/sem",
    phase: ["base", "build"],
    avoid: "Douleur genoux ou chevilles",
    durationMin: [35, 45],
    metricKey: "css",
    sportKey: "swim",
    structure: [
      { part: "Warm-up", text: "400m nage libre souple", zones: ["Z1"] },
      { part: "Main", text: "8×50m kick avec planche (repos 15s), 4×100m pull buoy (repos 20s), 6×50m nage complète focus battement minimal et efficace (repos 15s), 4×25m sprint kick sans planche", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "200m souple nage au choix", zones: ["Z1"] },
    ],
    variants: { ironman: "Réduire kick, focus glisse", "10k": "Augmenter intensité kick" },
    goals: ["ironman", "half", "marathon", "semi", "10k"],
    tags: ["swim", "kick", "technique"],
  },
  {
    id: "C_SWIM_LEGS_ENDURANCE",
    cat: "C",
    sport: "natation",
    objectif: "Endurance jambes natation – préparer sortie eau vers vélo",
    necessite: "Optionnel",
    when: "Phase build",
    phase: ["build"],
    avoid: "Crampes récurrentes",
    durationMin: [30, 40],
    metricKey: "css",
    sportKey: "swim",
    structure: [
      { part: "Warm-up", text: "300m nage + 4×50m drill", zones: ["Z1"] },
      { part: "Main", text: "4×200m (50m kick + 150m nage), repos 20s. 6×100m nage complète fréquence basse, repos 15s. Focus: jambes économiques, pas de kick excessif", zones: ["Z2"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["ironman", "half"],
    tags: ["swim", "kick", "endurance"],
  },
];

// =============================================
// 10K — Séances spécifiques supplémentaires
// =============================================
const RUN_10K_SPECIFIC: LibraryWorkout[] = [
  {
    id: "B_RUN_10K_RACE_PACE",
    cat: "B",
    sport: "course",
    objectif: "Allure spécifique 10K – soutien au seuil",
    necessite: "Obligatoire",
    when: "Phase peak, 1×/sem",
    phase: ["build", "peak"],
    avoid: "Fatigue musculaire importante",
    durationMin: [45, 55],
    metricKey: "allure",
    sportKey: "run",
    structure: [
      { part: "Warm-up", text: "15min footing Z1-Z2 + 4 accélérations progressives", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3×2km @allure 10K (repos 2min trot). Puis 4×400m @allure 5K (repos 1min30). FC cible: seuil ±3bpm", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "10min footing Z1", zones: ["Z1"] },
    ],
    variants: { semi: "2×3km @allure semi + 4×600m @allure 10K" },
    goals: ["10k", "semi"],
    tags: ["run", "10k", "race-pace", "threshold"],
  },
  {
    id: "B_RUN_10K_VO2_SHORT",
    cat: "B",
    sport: "course",
    objectif: "Développement VO2max court pour 10K – capacité anaérobie",
    necessite: "Recommandé",
    when: "Phase build, 1×/sem",
    phase: ["build"],
    avoid: "VLamax déjà trop haute",
    durationMin: [40, 50],
    metricKey: "allure",
    sportKey: "run",
    structure: [
      { part: "Warm-up", text: "15min footing progressif + gammes", zones: ["Z1", "Z2"] },
      { part: "Main", text: "12×400m @95-100% VMA (repos 1min jogging). Focus: régularité des temps, pas de dérive", zones: ["Z5"] },
      { part: "Cool-down", text: "10min footing Z1", zones: ["Z1"] },
    ],
    variants: { "10k": "16×400m pour volume VO2", semi: "8×600m" },
    goals: ["10k"],
    tags: ["run", "10k", "vo2", "intervals"],
  },
  {
    id: "A_RUN_10K_TEMPO_LONG",
    cat: "A",
    sport: "course",
    objectif: "Tempo long progression pour 10K – endurance à haute intensité",
    necessite: "Recommandé",
    when: "Phase build/peak",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "run",
    structure: [
      { part: "Warm-up", text: "15min footing Z1", zones: ["Z1"] },
      { part: "Main", text: "30min en progression: 10min @allure semi + 10min entre allure semi et 10K + 10min @allure 10K. Transition fluide sans arrêt", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10min footing Z1", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["10k", "semi"],
    tags: ["run", "10k", "tempo", "progression"],
  },
];

// =============================================
// CYCLISME TAPER — Compléments
// =============================================
const BIKE_TAPER_EXTRA: LibraryWorkout[] = [
  {
    id: "D_BIKE_TAPER_OPENER",
    cat: "D",
    sport: "cyclisme",
    objectif: "Opener vélo pré-course – activation neuromusculaire",
    necessite: "Obligatoire",
    when: "J-2 avant course",
    phase: ["taper"],
    avoid: "Aucun",
    durationMin: [30, 45],
    metricKey: "puissance",
    sportKey: "bike",
    structure: [
      { part: "Warm-up", text: "15min spin Z1", zones: ["Z1"] },
      { part: "Main", text: "10min Z2 incluant 4×30s @FTP puis 2×15s sprint. Tout en fraîcheur", zones: ["Z2", "Z4"] },
      { part: "Cool-down", text: "10min spin très léger", zones: ["Z1"] },
    ],
    variants: { ironman: "2×1min @allure IM", half: "3×45s @allure 70.3" },
    goals: ["ironman", "half"],
    tags: ["bike", "taper", "opener"],
  },
];

// =============================================
// EXPORT CONSOLIDÉ
// =============================================
export const EnrichedWorkoutsV4: LibraryWorkout[] = [
  ...STRENGTH_A,
  ...STRENGTH_B,
  ...BRICK_C,
  ...BRICK_D,
  ...BRICK_TAPER,
  ...SWIM_KICK,
  ...RUN_10K_SPECIFIC,
  ...BIKE_TAPER_EXTRA,
];
