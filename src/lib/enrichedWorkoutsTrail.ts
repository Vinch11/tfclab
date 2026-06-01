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
      ["Warm-up", "5' activation articulaire chevilles + mobilité (cercles, flexions, rotations)", []],
      ["Main", "Circuit 3-4x (R:1'): Bosu single leg 30s/côté + Planche instable 40s + Yeux fermés unipodal 20s/côté + Sauts latéraux mini-haies 10 + Bande chevilles marche latérale 15 pas + Fente avant sur coussin 8/côté + Réception single leg box 6/côté", []],
      ["Cool-down", "5' étirements chevilles, mollets, proprioception douce", []]
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
    avoid: "Douleur articulaire, veille de sortie longue",
    durationMin: [25, 40],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "10' mobilité dynamique + 3×10 montées genoux", []],
      ["Main", "Box jumps 4×8, drop jumps 3×6, sauts latéraux 3×10, fentes sautées 3×8, jump squats 3×10. R:90\" entre séries", []],
      ["Cool-down", "5' étirements mollets/quadriceps", []]
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
    avoid: "Veille de back-to-back ou séance longue",
    durationMin: [40, 55],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "10' mobilité dynamique + activation (jumping jacks, montées genoux)", []],
      ["Main", "Circuit enchaîné (30\" repos inter-exo) : squat excentrique 3×10, burpees 3×8, step-ups 3×15, gainage 4×50s, fentes marchées 3×12. R:2' entre tours", []],
      ["Cool-down", "5' étirements + foam roller rapide", []]
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
      ["Warm-up", "3' marche sur place + cercles chevilles et hanches", []],
      ["Main", "Foam roller 8' (mollets, quadriceps, IT band, fessiers) + mobilité chevilles CARs 2×8/côté + 90/90 hanche 60\"/côté + pigeon pose 45\"/côté + étirements chaîne postérieure 3×30\" + rotation thoracique 8/côté", []],
      ["Cool-down", "3' respiration diaphragmatique allongé", []]
    ]),
    variants: {},
    goals: TRAIL_GOALS_ALL,
    tags: ["trail", "mobilité", "récupération"]
  },
];

// ═══════════════════════════════════════════
// URBAN — Compensations pour athlètes urbains préparant trail montagne
// (Bruxelles, Paris, Amsterdam, etc.) — substitutions des séances D+
// quand terrainAvailability ∈ {plat, vallonne, mixte}
// Refs: Vernillo 2017 (downhill running), Giovanelli 2016 (uphill treadmill),
//       Mille-Hamard 2012 (stair climbing physiology)
// ═══════════════════════════════════════════

const TRAIL_URBAN: LibraryWorkout[] = [
  {
    id: "URBAN_TAPIS_INCLINE_SEUIL",
    cat: "B", sport: "course",
    objectif: "[URBAIN] Seuil montée tapis incliné — 4×12' à 8-12% incl. Z3/Z4. Substitue seuil montée long en l'absence de relief",
    necessite: "Obligatoire",
    when: "Build/Peak (1-2×/sem si terrain plat)",
    phase: ["build", "peak"],
    avoid: "Genou/tendon achille douloureux à l'inclinaison",
    durationMin: [60, 90],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' progressif : 5' marche 3% incl. + 10' EF Z2 à 1% incl. + 4×30\" lignes droites 5% incl.", ["Z1", "Z2"]],
      ["Main", "4 × 12' à 8-12% inclinaison, allure Z3/Z4 (85-92% FCmax, ~seuil running montée), cadence 75-85 spm. R:3-4' marche 2% incl. Cible cardio = équivalent seuil montée long sentier. D+ tapis cumulé ≈ 600-1000m selon vitesse.", ["Z3", "Z4"]],
      ["Cool-down", "10' marche 1-3% incl. décroissant + étirements mollets longs, soléaire, ischios", ["Z1"]]
    ]),
    variants: { trail_short: "3×10'", trail_mountain: "4×12'", trail_ultra: "5×15'" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "tapis-incliné", "seuil", "montée", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_COTES_URBAINES_VMA",
    cat: "B", sport: "course",
    objectif: "[URBAIN] VMA côtes urbaines — 10-15×60-90\" à fond sur passerelles/ponts/rampes. Substitue VMA côtes en l'absence de montagne",
    necessite: "Recommandé",
    when: "Base/Build (1×/sem si terrain plat ou vallonné)",
    phase: ["base", "build"],
    avoid: "Tendinopathie achille active",
    durationMin: [50, 75],
    metricKey: "allure", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' progressif Z1→Z2 + 4 lignes droites + gammes (montées genoux, talons-fesses, foulées bondissantes)", ["Z1", "Z2"]],
      ["Main", "10-15 × 60-90\" à fond sur côte courte 4-8% (passerelle, pont, rampe parking, escalier d'avenue). Effort 95-100% VMA, foulée puissante avant-pied, bras dynamiques. R:descente trottinée 90-120\". Si une seule bosse : faire des allers-retours.", ["Z5"]],
      ["Cool-down", "10' EF Z1 + étirements quadriceps, mollets, fléchisseurs hanche", ["Z1"]]
    ]),
    variants: { trail_short: "10-12 reps", trail_mountain: "12-15 reps", trail_ultra: "15×90\"" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "VMA", "côtes", "puissance-aérobie", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_ESCALIERS_PYRAMIDE",
    cat: "B", sport: "course",
    objectif: "[URBAIN] Escaliers pyramide — montées répétées d'escaliers urbains (building, parking, gradins). Force-puissance verticale + tolérance lactique montée",
    necessite: "Obligatoire",
    when: "Build (1-2×/sem si terrain plat)",
    phase: ["base", "build"],
    avoid: "Genou douloureux en descente, premières semaines de reprise",
    durationMin: [40, 60],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "10' EF + mobilité chevilles + 3×30\" montées d'escaliers à allure modérée 2 marches à la fois", ["Z1", "Z2"]],
      ["Main", "Pyramide : 1-2-3-4-5-4-3-2-1 étages (ou volées de 20-30 marches). Montée puissante 2 marches à la fois, poussée glute. Descente CONTRÔLÉE 1 marche à la fois (pas en courant — évite traumatisme rotulien). R:retour passif au point bas. Volume cible : 200-400 marches montées. Si gradins stade : 8-12×1' montée rapide.", ["Z3", "Z4"]],
      ["Cool-down", "10' marche + étirements mollets, soléaire, quadriceps, glutes", ["Z1"]]
    ]),
    variants: { trail_short: "150-250 marches", trail_mountain: "250-400 marches", trail_ultra: "400-600 marches" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "escaliers", "force-verticale", "puissance", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_EXCENTRIQUE_DESCENTE_SALLE",
    cat: "C", sport: "strength",
    objectif: "[URBAIN] Excentrique descente salle — substitue descente technique trail. Presse 120° phase neg 3-4s + step-downs + Nordic. Prépare quadriceps au stress descente",
    necessite: "Obligatoire",
    when: "Build/Peak (2×/sem si terrain plat/vallonné préparant montagne)",
    phase: ["base", "build", "peak"],
    avoid: "Tendinopathie rotulienne aiguë, post-séance longue (DOMS 48h)",
    durationMin: [40, 55],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "10' vélo ergo Z2 + mobilité hanches/chevilles + activation glutes (clamshells, monster walks)", []],
      ["Main", "Bloc 1 — Presse 120° excentrique : 4×6 reps à 70-80% 1RM, tempo 4-1-1-0 (4s descente, 1s pause basse, 1s remontée). R:2'30. | Bloc 2 — Step-downs lents : 4×8/côté sur step 30-40cm, descente 4s contrôlée, posé doux. R:90\". | Bloc 3 — Nordic curls : 3×6 (assistance bande si besoin), phase neg max contrôle. R:2'. | Bloc 4 (option) : Descente escalier en chaise (assis-debout sur marches) 3×12/jambe.", []],
      ["Cool-down", "10' vélo Z1 + étirements quadriceps + foam roller IT band, quadriceps", []]
    ]),
    variants: { trail_short: "1×/sem", trail_mountain: "2×/sem Build", trail_ultra: "2×/sem Build + 1×/sem Peak" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "excentrique", "descente", "force-max", "préhab-genou", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_TAPIS_SL_LONG",
    cat: "A", sport: "course",
    objectif: "[URBAIN] SL tapis incliné progressif — 90-180' à 3-8% incl. Z2, simule fatigue D+ d'une SL trail montagne",
    necessite: "Obligatoire",
    when: "Build/Peak weekends sans expé hors-ville (1× tous les 10-15j si terrain plat)",
    phase: ["build", "peak"],
    avoid: "Première séance >2h, chaleur salle excessive",
    durationMin: [90, 180],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' marche/EF 1-3% incl. + activation glutes", ["Z1", "Z2"]],
      ["Main", "Bloc continu Z2 (70-78% FCmax) avec inclinaison progressive : 30' à 3%, 30' à 5%, 30' à 7%, puis paliers de 15' alternant 5%/8%. Marche en récup brève (60-90\") chaque 30'. Hydratation 500ml/h + 40g CHO/h dès 60min. D+ tapis cumulé ≈ 800-1800m selon durée. Simulation forme/posture montée trail (penché légèrement, bras compacts).", ["Z2"]],
      ["Cool-down", "10' marche 1% décroissante + étirements complets chaîne post + foam roller", ["Z1"]]
    ]),
    variants: { trail_short: "90-120'", trail_mountain: "120-180'", trail_ultra: "150-210' + nutrition test" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "tapis-incliné", "SL", "endurance-D+", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_DOUBLE_TAPIS_AM_PM",
    cat: "A", sport: "course",
    objectif: "[URBAIN] Doublette tapis matin+soir — substitue back-to-back trail weekend. AM 75' Z2 5% incl. + PM 60' Z2 3% incl. Charge cumulée D+ équivalente",
    necessite: "Recommandé",
    when: "Build/Peak weekends si pas d'accès hors-ville (1× tous les 15j)",
    phase: ["build", "peak"],
    avoid: "Tendinopathie en cours, semaines de récupération",
    durationMin: [135, 180],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "AM : 10' EF 1% incl. PM : 10' marche + EF court 1%", ["Z1", "Z2"]],
      ["Main", "AM (matin, ≥10h avant PM) : 75' continu Z2 à 5-8% inclinaison, allure modérée, cible D+ tapis ≈ 600-900m. Nutrition 30g CHO/h. PM (soir, jambes pré-fatiguées) : 60' continu Z2 à 3-5% inclinaison, allure très contrôlée, focus posture haute et cadence. Cible cardio Z2 strict (jamais Z3). Cumul D+ jour ≈ 1000-1500m.", ["Z2"]],
      ["Cool-down", "Chaque séance : 5' marche + étirements + bain froid optionnel entre AM et PM", ["Z1"]]
    ]),
    variants: { trail_short: "60'+45'", trail_mountain: "75'+60'", trail_ultra: "90'+75'" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "tapis-incliné", "back-to-back", "double-day", "endurance-D+", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_TAPIS_DESCENTE_NEGATIVE",
    cat: "B", sport: "course",
    objectif: "[URBAIN] Tapis incliné NÉGATIVE — 4×6' à -6 à -10% incl. Z2/Z3. Travail spécifique excentrique quadriceps descente (tapis le permettant)",
    necessite: "Recommandé",
    when: "Build/Peak (1×/sem si tapis avec incl. négative dispo, terrain plat préparant montagne)",
    phase: ["build", "peak"],
    avoid: "Tapis sans inclinaison négative (substitue par URBAN_EXCENTRIQUE_DESCENTE_SALLE)",
    durationMin: [50, 70],
    metricKey: "allure", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' EF Z2 à 1% + 4×30\" lignes droites + 5' marche 0%", ["Z1", "Z2"]],
      ["Main", "4 × 6' à inclinaison NÉGATIVE -6 à -10%, allure Z2/Z3 contrôlée (FC modérée, charge mécanique max). Cadence haute 88-92 spm, foulée RACCOURCIE, posé médio-pied sous CG, pas d'attaque talon. R:3' marche 1% incl. ⚠️ Si DOMS quadri >48h après séance, réduire à 4×4' la fois suivante.", ["Z2", "Z3"]],
      ["Cool-down", "10' marche 1% + étirements quadriceps statiques 3×45\"/jambe + foam roller", ["Z1"]]
    ]),
    variants: { trail_short: "3×5'", trail_mountain: "4×6'", trail_ultra: "5×6' progression" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "tapis", "descente", "excentrique", "spécifique-descente", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_PARC_BOUCLES_VALLONNEES",
    cat: "A", sport: "course",
    objectif: "[URBAIN] SL parc/bois urbain — 90-150' Z2 sur boucles vallonnées (Bois Vincennes, Forêt Soignes, Bois Boulogne, etc.). Cumul D+ via répétitions de petites bosses",
    necessite: "Obligatoire",
    when: "Build/Peak weekends (1×/sem si parc/bois accessible avec D+ local)",
    phase: ["base", "build", "peak"],
    avoid: "Boucles 100% plates (utiliser tapis incliné à la place)",
    durationMin: [90, 150],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' EF Z1/Z2 plat", ["Z1", "Z2"]],
      ["Main", "90-150' continu Z2 sur boucle vallonnée (3-5km par boucle, 30-80m D+/boucle). Multiplier les répétitions de la même bosse pour cumuler 400-900m D+ total. Marcher activement les bosses raides >12% pour reproduire effort trail. Hydratation/nutrition 30-50g CHO/h dès 60min.", ["Z2"]],
      ["Cool-down", "10' EF Z1 + étirements + mobilité", ["Z1"]]
    ]),
    variants: { trail_short: "90-120'", trail_mountain: "120-150'", trail_ultra: "150-210'" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "parc", "endurance-D+", "SL", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_ESCALIERS_TEMPO_LONG",
    cat: "B", sport: "course",
    objectif: "[URBAIN] Escaliers tempo long — 25-45' continu sur boucle escaliers/parc à étages. Endurance force-vertical-aérobie",
    necessite: "Recommandé",
    when: "Build (1×/sem si gradins/parc à étages dispo, alternative à VMA escaliers)",
    phase: ["build", "peak"],
    avoid: "Premier mois de reprise, genou douloureux en descente",
    durationMin: [45, 75],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Main", "Après échauffement 15', enchaîner 25-45' boucle continue : montée d'escaliers (60-100 marches) à allure tempo Z3 + descente trottinée Z1/Z2 + transition à plat 30-60\". Objectif cumul ≥600-1200 marches montées dans la fenêtre. FC moyenne 80-87% FCmax. Bras dynamiques, poussée glutes.", ["Z3"]],
      ["Cool-down", "10' EF Z1 + étirements complets", ["Z1"]]
    ]),
    variants: { trail_short: "25-30'", trail_mountain: "30-40'", trail_ultra: "40-50'" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "escaliers", "tempo", "endurance-force", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_TAPIS_PYRAMIDE_INCLINE",
    cat: "B", sport: "course",
    objectif: "[URBAIN] Pyramide inclinaison tapis — VO2max montée : 3-5-7-5-3' à 8% incl. allure Z4/Z5. Stimule VO2 spécifique grimpe",
    necessite: "Recommandé",
    when: "Peak (1×/sem si terrain plat, alternative à VMA côtes)",
    phase: ["peak"],
    avoid: "Achille douloureux, jambes fatiguées (>RPE 7/10 au repos)",
    durationMin: [55, 75],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' EF Z2 + 4×30\" lignes droites 5% incl.", ["Z1", "Z2"]],
      ["Main", "Pyramide 3'-5'-7'-5'-3' à 8% inclinaison, allure Z4/Z5 (90-95% FCmax, ≈VO2max spécifique montée). R: 3' marche 1-2% incl. entre paliers. Cadence 80-88 spm, foulée puissante. Total 23' à intensité élevée + récup.", ["Z4", "Z5"]],
      ["Cool-down", "10' marche 1% décroissante + étirements mollets + soléaire", ["Z1"]]
    ]),
    variants: { trail_short: "3-5-3'", trail_mountain: "3-5-7-5-3'", trail_ultra: "3-5-7-7-5-3'" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "tapis-incliné", "VO2max", "montée", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_SAC_LESTE_SL",
    cat: "A", sport: "course",
    objectif: "[URBAIN] SL avec sac lesté 4-6kg — 75-120' Z2 en parc/boucle urbaine. Reproduit charge spécifique trail (sac hydratation + matériel obligatoire)",
    necessite: "Recommandé",
    when: "Peak (1×/sem dans les 6 dernières sem avant course trail mountain/ultra)",
    phase: ["peak"],
    avoid: "Lombalgie active, première semaine de reprise post-coupure",
    durationMin: [75, 120],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "10' marche avec sac + mobilité épaules/tronc", ["Z1", "Z2"]],
      ["Main", "75-120' continu Z2 strict (jamais Z3 avec lest), sac dorsal lesté 4-6kg réparti (eau + matériel = matériel obligatoire course). Posture droite, gainage actif tronc. Si parc vallonné : intégrer 4-6 montées de petites bosses au passage. Cible : adapter chaîne post + épaules à la charge ressentie le jour J.", ["Z2"]],
      ["Cool-down", "10' marche sans sac + étirements lombaires, trapèzes, ischios", ["Z1"]]
    ]),
    variants: { trail_short: "60-75' sac 3-4kg", trail_mountain: "90-120' sac 5-6kg", trail_ultra: "120-150' sac 6-8kg" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "sac-lesté", "spécificité-trail", "SL", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_CORE_GAINAGE_TRAIL",
    cat: "C", sport: "strength",
    objectif: "[URBAIN] Gainage trail spécifique — circuit 30' anti-affaissement chaîne post + tronc + cheville. Pré-requis pour soutenir effort montée/descente long",
    necessite: "Obligatoire",
    when: "Toute saison (2×/sem si terrain plat, 1×/sem en peak)",
    phase: ["base", "build", "peak"],
    avoid: "Lombalgie aiguë",
    durationMin: [30, 45],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "5' mobilité dynamique chevilles, hanches, colonne", []],
      ["Main", "Circuit 3-4 tours (45\"/15\" repos entre exos, 90\" repos entre tours) : (1) gainage planche + lever jambe alternée, (2) side-plank dynamique + dip hanche 12/côté, (3) bird-dog 10/côté tempo lent, (4) calf-raises mollet/soléaire 20 reps unipodal, (5) glute bridge unipodal 12/côté, (6) Y-T-W épaules 8 reps chaque, (7) ankle stability sur Bosu/coussin 30\"/pied yeux fermés.", []],
      ["Cool-down", "5' étirements chaîne post + respiration diaphragmatique", []]
    ]),
    variants: { trail_short: "3 tours", trail_mountain: "3-4 tours", trail_ultra: "4 tours + 1 round mental imagery" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "gainage", "core", "préhab", "stabilité-cheville", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_RACESIM_TAPIS_NUTRITION",
    cat: "RACESIM", sport: "course",
    objectif: "[URBAIN] Race-sim tapis incliné — 2-4h tapis 4-7% incl. Z2 avec test nutrition/hydratation/matériel jour J. Substitue race-sim trail montagne",
    necessite: "Recommandé",
    when: "Peak (1× dans les 4-6 sem avant course, équipement complet)",
    phase: ["peak"],
    avoid: "Chaleur salle excessive (>22°C), première séance >2h sans préparation",
    durationMin: [120, 240],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "10' marche + EF 1% incl. (équipement complet déjà porté)", ["Z1", "Z2"]],
      ["Main", "2-4h continu Z2 strict avec inclinaison alternée : blocs de 30' à 4%/5%/7% en rotation. Sac dorsal lesté 4-6kg. Tester EXACTEMENT la nutrition/hydratation/électrolytes prévus le jour J (gels, barres, boissons, fréquence). Tester chaussures + chaussettes + cuissard + casquette + bâtons (poussée sur tapis si possible). Ventilation salle ouverte si possible. Cible: 90% des conditions jour J sans le D+ naturel.", ["Z2"]],
      ["Cool-down", "10' marche 1% + étirements + retour calme alimentaire", ["Z1"]]
    ]),
    variants: { trail_short: "120-150'", trail_mountain: "180-210'", trail_ultra: "210-240' + simulation nocturne" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "race-sim", "tapis-incliné", "nutrition-test", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_BATONS_TECHNIQUE_PARC",
    cat: "C", sport: "course",
    objectif: "[URBAIN] Technique bâtons + montée puissante — 45' parc/escaliers avec bâtons trail. Apprentissage gestuelle bras + économie montée",
    necessite: "Recommandé",
    when: "Build/Peak (1× tous les 15j si course trail mountain/ultra avec bâtons autorisés)",
    phase: ["build", "peak"],
    avoid: "Douleur épaule/coude, pluie intense (sol glissant)",
    durationMin: [40, 60],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "10' marche rapide + activation épaules (rotations, pull-aparts élastique)", ["Z1"]],
      ["Main", "Phase 1 (10') : gestuelle bâtons à plat (poussée alternée, double-poling court). Phase 2 (20') : 6-8 montées d'escaliers urbains ou côte parc avec bâtons (poussée synchronisée jambe opposée), R: descente sans bâtons. Phase 3 (10') : transition rapide bâtons en mains/dans sac (5 reps chronométrées : viser <8s). Bras compacts, poussée verticale.", ["Z2", "Z3"]],
      ["Cool-down", "10' étirements épaules, triceps, lats + mobilité poignets", ["Z1"]]
    ]),
    variants: { trail_short: "Skip (sauf course autorisant bâtons)", trail_mountain: "1× tous les 15j", trail_ultra: "1× /sem peak" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "bâtons", "technique", "économie-montée", "substitution-trail", "fallback"]
  },
  {
    id: "URBAN_RECUP_VELO_ZONE1",
    cat: "D", sport: "vélo",
    objectif: "[URBAIN] Récup vélo home-trainer Z1 — 40-60' très facile post-séance lourde urbaine (escaliers/tapis incliné). Drainage sans impact",
    necessite: "Recommandé",
    when: "Lendemain de séance urbaine intense (escaliers, tapis incliné, descente)",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [40, 60],
    metricKey: "cardiaque", sportKey: "vélo",
    structure: mkStructure([
      ["Main", "40-60' continu Z1 (<70% FCmax, <60% FTP), cadence libre haute 85-95rpm, position confortable. Aucune intensité. Drainage musculaire + maintien volume aérobie sans surcharge tendineuse/articulaire des jambes après stress vertical.", ["Z1"]],
      ["Cool-down", "5' pédalage très facile + étirements jambes complets", ["Z1"]]
    ]),
    variants: { trail_short: "40'", trail_mountain: "45-60'", trail_ultra: "60' + mobilité 15'" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "récupération", "vélo", "cross-training", "substitution-trail", "fallback"]
  }
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
  ...TRAIL_URBAN,
];
