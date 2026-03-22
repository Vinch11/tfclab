// =============================================
// ENRICHED WORKOUTS — TRAIL SPÉCIFIQUE V4
// Trail Court, Trail Montagne, Trail Ultra
// ~80 séances spécialisées D+, descente, back-to-back,
// marche/course, nocturne, nutrition terrain, bâtons
// =============================================

import type { LibraryWorkout } from "@/types/workoutLibrary";

const mkStructure = (parts: [string, string, string[]][]) =>
  parts.map(([part, text, zones]) => ({ part, text, zones }));

const TRAIL_GOALS_ALL: ("trail_short" | "trail_mountain" | "trail_ultra" | "trail_long")[] = ["trail_short", "trail_mountain", "trail_ultra", "trail_long"];
const TRAIL_GOALS_MTN_ULTRA: ("trail_mountain" | "trail_ultra" | "trail_long")[] = ["trail_mountain", "trail_ultra", "trail_long"];
const TRAIL_GOALS_ULTRA: ("trail_ultra" | "trail_long")[] = ["trail_ultra", "trail_long"];

// ═══════════════════════════════════════════
// A — ENDURANCE / VOLUME D+
// ═══════════════════════════════════════════

const TRAIL_A: LibraryWorkout[] = [
  {
    id: "A_TR_EF_SENTIER",
    cat: "A", sport: "course",
    objectif: "Endurance fondamentale sentier — adaptation terrain",
    necessite: "Obligatoire",
    when: "Toute l'année",
    phase: ["base", "build", "peak"],
    avoid: "Route uniquement",
    durationMin: [50, 90],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "10' marche→trot plat", ["Z1"]],
      ["Main", "40-70' Z2 sentier technique, cadence adaptée terrain", ["Z2"]],
      ["Cool-down", "10' marche retour", ["Z1"]]
    ]),
    variants: { trail_short: "Terrain technique varié", trail_mountain: "Sentier +200-400m D+" },
    goals: TRAIL_GOALS_ALL,
    dPlusTargetM: { min: 150, max: 500 },
    tags: ["trail", "endurance", "technique", "sentier"]
  },
  {
    id: "A_TR_SL_MONTAGNE_BASE",
    cat: "A", sport: "course",
    objectif: "Sortie longue montagne base — volume D+ progressif",
    necessite: "Obligatoire",
    when: "Base, week-end",
    phase: ["base"],
    avoid: "Terrain technique excessif en base",
    durationMin: [120, 180],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' plat Z1", ["Z1"]],
      ["Main", "90-150' Z2 montagne, marche en montée >15%, course en descente modérée", ["Z1", "Z2"]],
      ["Cool-down", "15' plat Z1", ["Z1"]]
    ]),
    variants: { trail_mountain: "D+ 800-1200m", trail_ultra: "D+ 1000-1500m" },
    goals: TRAIL_GOALS_MTN_ULTRA,
    dPlusTargetM: { min: 800, max: 1500 },
    tags: ["trail", "long", "montagne", "base", "D+"]
  },
  {
    id: "A_TR_SL_ULTRA_BUILD",
    cat: "A", sport: "course",
    objectif: "Sortie longue ultra build — D+ massif + nutrition",
    necessite: "Obligatoire",
    when: "Build, week-end",
    phase: ["build"],
    avoid: "Sans ravitaillement",
    durationMin: [180, 330],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' plat Z1", ["Z1"]],
      ["Main", "2h30-5h Z2 montagne. Ravitaillement 50-60g/h. Bâtons si pente >20%", ["Z1", "Z2"]],
      ["Cool-down", "15' marche", ["Z1"]]
    ]),
    variants: { trail_ultra: "D+ 1500-2500m", trail_long: "D+ 1200-2000m" },
    goals: TRAIL_GOALS_ULTRA,
    dPlusTargetM: { min: 1500, max: 2500 },
    tags: ["trail", "ultra", "long", "D+", "nutrition"]
  },
  {
    id: "A_TR_SL_PEAK",
    cat: "A", sport: "course",
    objectif: "Sortie longue peak — simulation terrain cible",
    necessite: "Obligatoire",
    when: "Peak, week-end",
    phase: ["peak"],
    avoid: "Terrain plat",
    durationMin: [180, 420],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' plat Z1", ["Z1"]],
      ["Main", "3h-6h terrain type course. Ravitaillement complet 60-70g/h. Simulation équipement", ["Z1", "Z2"]],
      ["Cool-down", "15' marche", ["Z1"]]
    ]),
    variants: { trail_mountain: "Simulation parcours 50-70% distance", trail_ultra: "Simulation 40-50% distance" },
    goals: TRAIL_GOALS_MTN_ULTRA,
    dPlusTargetM: { min: 2000, max: 4000 },
    tags: ["trail", "peak", "simulation", "nutrition", "D+"]
  },
  {
    id: "A_TR_B2B_SAM",
    cat: "A", sport: "course",
    objectif: "Back-to-back samedi — J1 volume D+ fort",
    necessite: "Obligatoire",
    when: "Build/Peak, samedi (back-to-back J1)",
    phase: ["build", "peak"],
    avoid: "Semaine de décharge",
    durationMin: [180, 300],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' marche→trot", ["Z1"]],
      ["Main", "3-4h30 montagne Z2. D+ cumulé fort. Ravitaillement 50g/h", ["Z1", "Z2"]],
      ["Cool-down", "10' marche", ["Z1"]]
    ]),
    variants: { trail_mountain: "D+ 1200-1800m", trail_ultra: "D+ 1500-2500m" },
    goals: TRAIL_GOALS_MTN_ULTRA,
    dPlusTargetM: { min: 1200, max: 2500 },
    tags: ["trail", "back-to-back", "J1", "D+", "volume"]
  },
  {
    id: "A_TR_B2B_DIM",
    cat: "A", sport: "course",
    objectif: "Back-to-back dimanche — J2 endurance sur pré-fatigue",
    necessite: "Obligatoire",
    when: "Build/Peak, dimanche (back-to-back J2)",
    phase: ["build", "peak"],
    avoid: "Intensité haute",
    durationMin: [120, 210],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "10' marche→trot doux", ["Z1"]],
      ["Main", "2-3h Z2 facile sentier vallonné sur jambes fatiguées. Ravitaillement", ["Z1", "Z2"]],
      ["Cool-down", "10' marche", ["Z1"]]
    ]),
    variants: { trail_mountain: "D+ 500-800m", trail_ultra: "D+ 600-1000m" },
    goals: TRAIL_GOALS_MTN_ULTRA,
    dPlusTargetM: { min: 500, max: 1000 },
    tags: ["trail", "back-to-back", "J2", "pré-fatigue", "endurance"]
  },
  {
    id: "A_TR_MARCHE_COURSE_ULTRA",
    cat: "A", sport: "course",
    objectif: "Marche/course alternée — gestion effort ultra longue durée",
    necessite: "Obligatoire",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Course continue uniquement",
    durationMin: [180, 360],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' marche progressive", ["Z1"]],
      ["Main", "3-5h alternance marche (montée >10%) / course (plat+descente). Ratio course/marche progressif 2:1→3:1. Ravitaillement 50-70g/h", ["Z1", "Z2"]],
      ["Cool-down", "15' marche retour", ["Z1"]]
    ]),
    variants: { trail_ultra: "Ratio 2:1 course/marche", trail_long: "Ratio 3:1" },
    goals: TRAIL_GOALS_ULTRA,
    dPlusTargetM: { min: 1000, max: 3000 },
    tags: ["ultra", "marche-course", "gestion-effort", "nutrition"]
  },
  {
    id: "A_TR_EF_VALLON",
    cat: "A", sport: "course",
    objectif: "Endurance fondamentale vallonnée — adaptation D+",
    necessite: "Obligatoire",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Plat exclusif",
    durationMin: [55, 80],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "10' Z1 plat", ["Z1"]],
      ["Main", "40-60' Z2 terrain vallonné +150-300m D+. Cadence adaptée", ["Z2"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {},
    goals: TRAIL_GOALS_ALL,
    dPlusTargetM: { min: 150, max: 350 },
    tags: ["trail", "endurance", "vallonné"]
  },
];

// ═══════════════════════════════════════════
// B — INTENSITÉ SPÉCIFIQUE TRAIL
// ═══════════════════════════════════════════

const TRAIL_B: LibraryWorkout[] = [
  {
    id: "B_TR_VMA_COTE_COURT",
    cat: "B", sport: "course",
    objectif: "VMA côtes courtes — puissance ascensionnelle explosive",
    necessite: "Obligatoire",
    when: "Build",
    phase: ["build"],
    avoid: "Fatigue musculaire importante",
    durationMin: [55, 80],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z2 plat + gammes", ["Z2"]],
      ["Main", "10-15×1'30 côte 10-15% @VO2max r=descente trot. +300-500m D+", ["Z5", "Z6"]],
      ["Cool-down", "10' Z1 plat", ["Z1"]]
    ]),
    variants: { trail_short: "Pente 10-12%", trail_mountain: "Pente 12-18%" },
    goals: TRAIL_GOALS_ALL,
    dPlusTargetM: { min: 300, max: 600 },
    tags: ["trail", "VMA", "côtes", "puissance"]
  },
  {
    id: "B_TR_VMA_COTE_LONG",
    cat: "B", sport: "course",
    objectif: "VMA côtes longues — endurance de force ascensionnelle",
    necessite: "Obligatoire",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Pré-fatigue importante",
    durationMin: [65, 95],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z2 plat", ["Z2"]],
      ["Main", "5-8×3' côte 8-12% @95% VMA r=descente trot complète. +500-800m D+", ["Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { trail_mountain: "Côtes 4-5min", trail_ultra: "Côtes 5-8min allure seuil" },
    goals: TRAIL_GOALS_ALL,
    dPlusTargetM: { min: 400, max: 800 },
    tags: ["trail", "VMA", "côtes", "endurance-force"]
  },
  {
    id: "B_TR_SEUIL_MONTEE",
    cat: "B", sport: "course",
    objectif: "Seuil en montée — allure spécifique trail montagne",
    necessite: "Obligatoire",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Terrain plat",
    durationMin: [75, 120],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z2 plat→vallonné", ["Z2"]],
      ["Main", "4-6×10-15' montée @seuil (800-1000m/h D+) r=5' descente Z1", ["Z4", "Z4a"]],
      ["Cool-down", "10' Z1 plat", ["Z1"]]
    ]),
    variants: { trail_short: "3×12min", trail_mountain: "5×15min avec bâtons", trail_ultra: "4×20min @seuil bas" },
    goals: TRAIL_GOALS_ALL,
    dPlusTargetM: { min: 600, max: 1200 },
    tags: ["trail", "seuil", "montée", "spécifique"]
  },
  {
    id: "B_TR_SEUIL_MONTEE_LONG",
    cat: "B", sport: "course",
    objectif: "Seuil montée long — endurance au seuil en ascension",
    necessite: "Recommandé",
    when: "Peak",
    phase: ["peak"],
    avoid: "Semaine de décharge",
    durationMin: [90, 130],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z2", ["Z2"]],
      ["Main", "3-4×20' montée @seuil (900-1100m/h D+) r=descente 6-8' Z1", ["Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { trail_mountain: "Avec bâtons obligatoire", trail_ultra: "Nutrition pendant montée" },
    goals: TRAIL_GOALS_MTN_ULTRA,
    dPlusTargetM: { min: 800, max: 1500 },
    tags: ["trail", "seuil", "montée", "long", "peak"]
  },
  {
    id: "B_TR_DESCENTE_RAPIDE",
    cat: "B", sport: "course",
    objectif: "Descente rapide technique — vitesse et placement pied",
    necessite: "Obligatoire",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Sol mouillé/dangereux",
    durationMin: [50, 80],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z2 montée facile", ["Z2"]],
      ["Main", "6-10×3-5' descente technique rapide (single track, cailloux) r=remontée Z2", ["Z3", "Z4"]],
      ["Cool-down", "10' Z1 plat", ["Z1"]]
    ]),
    variants: { trail_short: "Descentes courtes 2-3'", trail_mountain: "Descentes 5-8' cassantes" },
    goals: TRAIL_GOALS_ALL,
    dPlusTargetM: { min: 300, max: 600 },
    tags: ["trail", "descente", "technique", "vitesse"]
  },
  {
    id: "B_TR_DESCENTE_ECCENTRIC",
    cat: "B", sport: "course",
    objectif: "Descente excentrique progressive — tolérance DOMS",
    necessite: "Obligatoire",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Douleur articulaire",
    durationMin: [45, 70],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z2 plat + montée douce", ["Z2"]],
      ["Main", "8-12 descentes 1-2' intensité progressive (Z2→Z3). Focus fréquence foulée courte, posture haute", ["Z2", "Z3"]],
      ["Cool-down", "10' Z1 plat + étirements", ["Z1"]]
    ]),
    variants: {},
    goals: TRAIL_GOALS_ALL,
    dPlusTargetM: { min: 200, max: 500 },
    tags: ["trail", "descente", "excentrique", "prévention"]
  },
  {
    id: "B_TR_FARTLEK_TERRAIN",
    cat: "B", sport: "course",
    objectif: "Fartlek terrain — adaptation rythme variable naturel",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Plat",
    durationMin: [55, 85],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z2 sentier", ["Z2"]],
      ["Main", "30-50' fartlek naturel : accélérer en montée, relâcher en descente, tempo en plat. RPE guidé (6-8)", ["Z2", "Z3", "Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { trail_short: "Intensité plus haute RPE 7-8", trail_mountain: "Plus de D+" },
    goals: TRAIL_GOALS_ALL,
    dPlusTargetM: { min: 250, max: 600 },
    tags: ["trail", "fartlek", "terrain", "naturel"]
  },
  {
    id: "B_TR_TEMPO_VALLON",
    cat: "B", sport: "course",
    objectif: "Tempo vallonné — seuil sur terrain ondulé",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue élevée",
    durationMin: [60, 90],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z2", ["Z2"]],
      ["Main", "3-4×8-12' @tempo trail terrain ondulé + descente technique entre blocs", ["Z3", "Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { trail_mountain: "Terrain cassant", trail_ultra: "Blocs 15min + nutrition" },
    goals: TRAIL_GOALS_ALL,
    dPlusTargetM: { min: 300, max: 700 },
    tags: ["trail", "tempo", "vallonné"]
  },
  {
    id: "B_TR_MONTEE_BATONS",
    cat: "B", sport: "course",
    objectif: "Montée avec bâtons — technique et efficacité",
    necessite: "Recommandé",
    when: "Build/Peak, si bâtons en course",
    phase: ["build", "peak"],
    avoid: "Si pas de bâtons en course",
    durationMin: [60, 100],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z2 plat→montée", ["Z2"]],
      ["Main", "4-6×10' montée avec bâtons @allure course. Focus synchronisation bras/jambes. r=descente sans bâtons", ["Z3", "Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { trail_mountain: "Montées 15-20%", trail_ultra: "Montées >20% marche athlétique" },
    goals: TRAIL_GOALS_MTN_ULTRA,
    dPlusTargetM: { min: 500, max: 1000 },
    tags: ["trail", "bâtons", "montée", "technique"]
  },
  {
    id: "B_TR_NEGATIVE_SPLIT",
    cat: "B", sport: "course",
    objectif: "Sortie longue negative split — gestion effort trail",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue chronique",
    durationMin: [120, 180],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z1 plat", ["Z1"]],
      ["Main", "2-2h30 sentier : 1ère moitié Z1-Z2 très facile, 2nde moitié Z2-Z3 progressif. Derniers 30' @tempo", ["Z1", "Z2", "Z3"]],
      ["Cool-down", "10' Z1 marche", ["Z1"]]
    ]),
    variants: {},
    goals: TRAIL_GOALS_ALL,
    dPlusTargetM: { min: 400, max: 900 },
    tags: ["trail", "negative-split", "gestion-effort"]
  },
];

// ═══════════════════════════════════════════
// C — TECHNIQUE / FORCE SPÉCIFIQUE
// ═══════════════════════════════════════════

const TRAIL_C: LibraryWorkout[] = [
  {
    id: "C_TR_PROPRIOCEPTION",
    cat: "C", sport: "strength",
    objectif: "Proprioception trail — stabilité chevilles et appuis",
    necessite: "Obligatoire",
    when: "Toute l'année",
    phase: ["base", "build", "peak"],
    avoid: "Douleur articulaire",
    durationMin: [25, 40],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "5' activation articulaire chevilles + mobilité", []],
      ["Main", "Bosu single leg 3×30s, planche instable 3×40s, yeux fermés 3×20s, sauts latéraux 3×10, bande chevilles 3×15", []]
    ]),
    variants: {},
    goals: TRAIL_GOALS_ALL,
    tags: ["trail", "proprioception", "chevilles", "prévention"]
  },
  {
    id: "C_TR_EXCENTRIQUE_LOURD",
    cat: "C", sport: "strength",
    objectif: "Force excentrique lourde — prévention DOMS descente",
    necessite: "Obligatoire",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Veille de SL",
    durationMin: [45, 60],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "10' mobilité + activation", []],
      ["Main", "Squat excentrique 5s 4×8, step-downs lestés 3×10, fentes descente 3×12, mollets excentrique 3×15", []],
      ["Cool-down", "Étirements + foam roller 10'", []]
    ]),
    variants: { trail_mountain: "Charges lourdes", trail_ultra: "Volume élevé (5 séries)" },
    goals: TRAIL_GOALS_ALL,
    tags: ["trail", "excentrique", "force", "prévention"]
  },
  {
    id: "C_TR_FORCE_MONTEE",
    cat: "C", sport: "strength",
    objectif: "Force spécifique montée — puissance ascensionnelle",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Veille de sortie longue ou back-to-back",
    durationMin: [40, 55],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "10' mobilité dynamique hanches + activation fessiers", []],
      ["Main", "Step-ups lestés 4×12, fentes bulgares 3×10, hip thrust 3×12, mollets 3×15, gainage anti-rotation 3×40s", []],
      ["Cool-down", "5' étirements quadriceps/psoas", []]
    ]),
    variants: {},
    goals: TRAIL_GOALS_ALL,
    tags: ["trail", "force", "montée", "ascensionnel"]
  },
  {
    id: "C_TR_CORE_ANTIFATIGUE",
    cat: "C", sport: "strength",
    objectif: "Core anti-fatigue trail — résistance posturale longue durée",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Lombalgie aiguë ou hernie discale symptomatique",
    durationMin: [30, 45],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "5' mobilité colonne + activation core (cat-cow, bird dog léger)", []],
      ["Main", "Dead bug 4×12, pallof press 3×12, planche latérale 3×40s, bird dog 3×10, farmer walk 3×30m", []],
      ["Cool-down", "5' étirements psoas/dorsaux", []]
    ]),
    variants: { trail_ultra: "Volume double, enchaîné peu de repos" },
    goals: TRAIL_GOALS_MTN_ULTRA,
    tags: ["trail", "core", "anti-fatigue", "posture"]
  },
  {
    id: "C_TR_PLIO_TRAIL",
    cat: "C", sport: "strength",
    objectif: "Pliométrie trail — réactivité appuis terrain",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Douleur articulaire",
    durationMin: [25, 40],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Main", "Box jumps 4×8, drop jumps 3×6, sauts latéraux 3×10, fentes sautées 3×8, jump squats 3×10", []]
    ]),
    variants: {},
    goals: TRAIL_GOALS_ALL,
    tags: ["trail", "pliométrie", "réactivité"]
  },
  {
    id: "C_TR_RENFO_CIRCUIT_FATIGUE",
    cat: "C", sport: "strength",
    objectif: "Circuit force sous fatigue — résistance musculaire ultra",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Veille de B2B",
    durationMin: [40, 55],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Main", "Circuit enchaîné (peu de repos) : squat excentrique 3×10, burpees 3×8, step-ups 3×15, gainage 4×50s, fentes marchées 3×12", []]
    ]),
    variants: {},
    goals: TRAIL_GOALS_ULTRA,
    tags: ["trail", "circuit", "fatigue", "ultra", "endurance-force"]
  },
];

// ═══════════════════════════════════════════
// RACE-SIM — SIMULATIONS TRAIL
// ═══════════════════════════════════════════

const TRAIL_RACESIM: LibraryWorkout[] = [
  {
    id: "RS_TR_SIM_COURT",
    cat: "Race-Sim", sport: "course",
    objectif: "Simulation trail court — 60-70% distance course",
    necessite: "Obligatoire",
    when: "Peak, S-3 avant course",
    phase: ["peak"],
    avoid: "Semaine de course",
    durationMin: [120, 210],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z1→Z2 plat", ["Z1", "Z2"]],
      ["Main", "2-3h terrain type course. Allure cible. Ravitaillement identique course. Équipement complet", ["Z2", "Z3"]],
      ["Cool-down", "10' marche", ["Z1"]]
    ]),
    variants: {},
    goals: ["trail_short"],
    dPlusTargetM: { min: 600, max: 1500 },
    tags: ["trail", "race-sim", "simulation", "court"]
  },
  {
    id: "RS_TR_SIM_MTN",
    cat: "Race-Sim", sport: "course",
    objectif: "Simulation trail montagne — terrain et nutrition complète",
    necessite: "Obligatoire",
    when: "Peak, S-3 avant course",
    phase: ["peak"],
    avoid: "Sans nutrition",
    durationMin: [180, 360],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z1", ["Z1"]],
      ["Main", "3-5h montagne terrain cible. Allure course. Ravitaillement complet 60g/h. Bâtons. Équipement obligatoire", ["Z1", "Z2", "Z3"]],
      ["Cool-down", "15' marche", ["Z1"]]
    ]),
    variants: {},
    goals: ["trail_mountain"],
    dPlusTargetM: { min: 1500, max: 3500 },
    tags: ["trail", "race-sim", "montagne", "simulation"]
  },
  {
    id: "RS_TR_SIM_ULTRA",
    cat: "Race-Sim", sport: "course",
    objectif: "Simulation ultra — 40-50% distance avec protocole complet",
    necessite: "Obligatoire",
    when: "Build/Peak, 1x/mois en Build, 1x en Peak",
    phase: ["build", "peak"],
    avoid: "Sans accompagnement",
    durationMin: [300, 480],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' marche progressive", ["Z1"]],
      ["Main", "5-7h simulation ultra. Allure course avec gestion marche/course. Ravitaillement 60-90g/h solide+liquide. Changement équipement", ["Z1", "Z2"]],
      ["Cool-down", "15' marche + bilan", ["Z1"]]
    ]),
    variants: {},
    goals: ["trail_ultra"],
    dPlusTargetM: { min: 2500, max: 5000 },
    tags: ["trail", "race-sim", "ultra", "simulation", "nutrition"]
  },
  {
    id: "RS_TR_SIM_NUIT",
    cat: "Race-Sim", sport: "course",
    objectif: "Simulation nocturne — adaptation vision et fatigue",
    necessite: "Recommandé",
    when: "Peak, si course de nuit",
    phase: ["peak"],
    avoid: "Terrain dangereux de nuit",
    durationMin: [120, 300],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' marche frontale", ["Z1"]],
      ["Main", "2-4h sentier de nuit. Frontale testée. Allure prudente. Navigation. Nutrition solide. Gestion froid", ["Z1", "Z2"]],
      ["Cool-down", "10' marche retour", ["Z1"]]
    ]),
    variants: { trail_mountain: "2-3h", trail_ultra: "4h+ dont départ 3h du matin" },
    goals: TRAIL_GOALS_MTN_ULTRA,
    tags: ["trail", "nocturne", "simulation", "adaptation"]
  },
  {
    id: "RS_TR_GUT_TRAINING",
    cat: "Race-Sim", sport: "course",
    objectif: "Gut Training trail — tolérance digestive en effort vallonné",
    necessite: "Obligatoire",
    when: "Build/Peak, intégré aux SL",
    phase: ["build", "peak"],
    avoid: "—",
    durationMin: [120, 240],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z1", ["Z1"]],
      ["Main", "2-3h sentier vallonné. Test nutrition progressive : 40→60→70→80g/h (solide+gel+boisson). Noter tolérance", ["Z1", "Z2"]],
      ["Cool-down", "10' marche", ["Z1"]]
    ]),
    variants: { trail_ultra: "Montée à 90g/h si toléré" },
    goals: TRAIL_GOALS_ALL,
    dPlusTargetM: { min: 300, max: 1000 },
    tags: ["trail", "gut-training", "nutrition", "tolérance"]
  },
];

// ═══════════════════════════════════════════
// D — RÉCUPÉRATION / TAPER TRAIL
// ═══════════════════════════════════════════

const TRAIL_D: LibraryWorkout[] = [
  {
    id: "D_TR_RECUP_ACTIVE",
    cat: "D", sport: "course",
    objectif: "Récupération active trail — trot très facile sentier",
    necessite: "Recommandé",
    when: "Lendemain charge, décharge",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Terrain technique",
    durationMin: [25, 45],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Main", "25-40' Z1 trot très facile sentier plat/facile. Cadence naturelle. Aucune intensité", ["Z1"]]
    ]),
    variants: {},
    goals: TRAIL_GOALS_ALL,
    tags: ["trail", "récupération", "Z1"]
  },
  {
    id: "D_TR_VELO_CROSS",
    cat: "D", sport: "cyclisme",
    objectif: "Vélo cross-training — volume aérobie sans impact",
    necessite: "Recommandé",
    when: "Récupération entre grosses journées montagne",
    phase: ["base", "build", "peak"],
    avoid: "Intensité",
    durationMin: [45, 90],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Main", "45-90' vélo Z1 plat. Récupération active pure. Cadence libre. Zéro intensité", ["Z1"]]
    ]),
    variants: {},
    goals: TRAIL_GOALS_ALL,
    tags: ["trail", "cross-training", "vélo", "récupération"]
  },
  {
    id: "D_TR_TAPER_RAPPEL",
    cat: "D", sport: "course",
    objectif: "Taper trail — rappel seuil montée court",
    necessite: "Obligatoire",
    when: "Taper, S-2 et S-1",
    phase: ["taper"],
    avoid: "Volume",
    durationMin: [40, 60],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "15' Z2 plat", ["Z2"]],
      ["Main", "2-3×5' montée @seuil r=descente trot. Rappel intensité sans fatigue", ["Z4"]],
      ["Cool-down", "10' Z1 plat", ["Z1"]]
    ]),
    variants: { trail_short: "2×5min", trail_mountain: "3×5min", trail_ultra: "3×6min" },
    goals: TRAIL_GOALS_ALL,
    dPlusTargetM: { min: 150, max: 300 },
    tags: ["trail", "taper", "rappel", "seuil"]
  },
  {
    id: "D_TR_TAPER_ACTIVATION",
    cat: "D", sport: "course",
    objectif: "Activation pré-course trail — J-2",
    necessite: "Obligatoire",
    when: "J-2 avant course",
    phase: ["taper"],
    avoid: "—",
    durationMin: [30, 50],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "10' Z1 plat", ["Z1"]],
      ["Main", "20-30' vallonné léger dont 4-6×30s @allure course r=1'30 trot. Terrain type course si possible", ["Z1", "Z2", "Z3"]],
      ["Cool-down", "10' Z1 + strides légères", ["Z1"]]
    ]),
    variants: {},
    goals: TRAIL_GOALS_ALL,
    dPlusTargetM: { min: 100, max: 200 },
    tags: ["trail", "taper", "activation", "J-2"]
  },
  {
    id: "D_TR_MOBILITE_TRAIL",
    cat: "D", sport: "strength",
    objectif: "Mobilité trail — chevilles, hanches, colonne",
    necessite: "Recommandé",
    when: "Toute l'année, post-SL",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [20, 35],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Main", "Foam roller 10', mobilité chevilles 5', mobilité hanches 5', étirements chaîne postérieure 5'", []]
    ]),
    variants: {},
    goals: TRAIL_GOALS_ALL,
    tags: ["trail", "mobilité", "récupération"]
  },
];

// ═══════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════

export const EnrichedWorkoutsTrail: LibraryWorkout[] = [
  ...TRAIL_A,
  ...TRAIL_B,
  ...TRAIL_C,
  ...TRAIL_RACESIM,
  ...TRAIL_D,
];
