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
    objectif: "[URBAIN · TAPIS] SL tapis incliné progressif — 60-120' à 3-8% incl. Z2, simule fatigue D+ d'une SL trail montagne. Au-delà de 2h, préférer URBAN_PARC_BOUCLES_VALLONNEES ou URBAN_SL_OUTDOOR_VARIETE (outdoor) — un tapis >2h est physiologiquement OK mais très peu motivant et n'apporte plus de gain spécifique.",
    necessite: "Obligatoire",
    when: "Build/Peak weekends sans expé hors-ville (1× tous les 10-15j si terrain plat) — uniquement quand parc/bois inaccessible",
    phase: ["build", "peak"],
    avoid: "Première séance >90', chaleur salle excessive, durée >2h (basculer outdoor)",
    durationMin: [60, 120],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' marche/EF 1-3% incl. + activation glutes", ["Z1", "Z2"]],
      ["Main", "Bloc continu Z2 (70-78% FCmax) avec inclinaison progressive : 20' à 3%, 20' à 5%, 20' à 7%, puis paliers de 15' alternant 5%/8%. Marche en récup brève (60-90\") chaque 30'. Hydratation 500ml/h + 40g CHO/h dès 60min. D+ tapis cumulé ≈ 500-1200m selon durée. Au-delà de 120', basculer obligatoirement vers la version outdoor (parc vallonné / ponts / escaliers) — le tapis >2h détériore engagement et qualité posturale sans bénéfice spécifique additionnel.", ["Z2"]],
      ["Cool-down", "10' marche 1% décroissante + étirements complets chaîne post + foam roller", ["Z1"]]
    ]),
    variants: { trail_short: "60-90'", trail_mountain: "90-120'", trail_ultra: "120' MAX tapis — au-delà obligatoirement outdoor" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "tapis-incliné", "SL", "endurance-D+", "substitution-trail", "fallback", "cap-2h"]
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
    cat: "Race-Sim", sport: "course",
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
    cat: "D", sport: "cyclisme",
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
  },
  // ============= WEEK-ENDS EXPÉ HORS-VILLE — sorties programmées pour athlète urbain =============
  {
    id: "EXPE_HORS_VILLE_SL_DPLUS",
    cat: "B", sport: "course",
    objectif: "[EXPÉ HORS-VILLE] Sortie longue D+ massif accessible — 2h30-5h trail vallonné/montagne (Ardennes/Vosges/Fontainebleau/Forêt domaniale <2h route). Volume D+ irréalisable en ville",
    necessite: "Obligatoire",
    when: "Build/Peak — 1× tous les 10-15j, planifier sam OU dim (un seul jour). Réserver date à l'avance (trajet 1-2h)",
    phase: ["build", "peak"],
    avoid: "Conditions neige/verglas si massif >1500m, première EXPÉ >3h sans préparation",
    durationMin: [150, 300],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' EF plat Z1-Z2 sur sentier facile + activation chevilles/mollets (massif accidenté)", ["Z1", "Z2"]],
      ["Main", "2-4h continu Z2 sur parcours vallonné/montagne RÉEL : viser 600-1500m D+ selon profil course. Alterner montées techniques (marche puissante >15% pente OK) et descentes contrôlées (technique pose pied). Tester nutrition course (gels/barres toutes les 30'), sac d'hydratation, chaussures trail, bâtons si autorisés. Photo/GPS du parcours pour valider D+.", ["Z2", "Z3"]],
      ["Cool-down", "15' EF plat + étirements complets (quadris, mollets, fessiers) + recharge glucidique immédiate", ["Z1"]]
    ]),
    variants: { trail_short: "150-180' / 600-900m D+", trail_mountain: "210-270' / 1000-1500m D+", trail_ultra: "240-300' / 1200-1800m D+" },
    goals: TRAIL_GOALS_ALL,
    tags: ["expé-hors-ville", "week-end", "sortie-longue", "D+", "massif", "obligatoire-urbain"]
  },
  {
    id: "EXPE_HORS_VILLE_BACK_TO_BACK",
    cat: "B", sport: "course",
    objectif: "[EXPÉ HORS-VILLE] Back-to-back week-end massif — sam SL D+ 2h30-3h30 + dim SL D+ 1h30-2h30 sur jambes fatiguées. Choc spécifique trail",
    necessite: "Obligatoire",
    when: "Build/Peak — 2-3× par phase (réserver hébergement gîte/refuge si massif >2h route)",
    phase: ["build", "peak"],
    avoid: "Sem 1-2 du plan (adaptation), CTL bas (<350), blessure aiguë",
    durationMin: [240, 360],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "Jour 1 (sam) : 10' EF + activation. SL D+ 2h30-3h30 / 800-1400m D+ Z2 sentier technique. Recharge glucidique massive post-séance. Sommeil prioritaire.", ["Z1", "Z2"]],
      ["Main", "Jour 2 (dim) : 10' échauffement long (mobilité hanches/chevilles raides) puis SL D+ 1h30-2h30 / 500-900m D+ Z1-Z2 strict (jambes lourdes attendues). Objectif : terminer en aérobie pure malgré fatigue résiduelle. Tester gestion mentale + nutrition course longue. NE PAS pousser si douleur articulaire.", ["Z1", "Z2"]],
      ["Cool-down", "Étirements + récup active lundi (URBAN_RECUP_VELO_ZONE1 ou marche 30')", ["Z1"]]
    ]),
    variants: { trail_short: "Sam 2h / Dim 1h30 (total ~1200m D+)", trail_mountain: "Sam 3h / Dim 2h (total ~2000m D+)", trail_ultra: "Sam 3h30 / Dim 2h30 (total ~2500m D+)" },
    goals: TRAIL_GOALS_ALL,
    tags: ["expé-hors-ville", "back-to-back", "week-end", "choc-spécifique", "obligatoire-urbain"]
  },
  {
    id: "EXPE_HORS_VILLE_DESCENTE_TECHNIQUE",
    cat: "B", sport: "course",
    objectif: "[EXPÉ HORS-VILLE] Atelier descente technique massif — 1h30-2h30 ciblé descentes répétées sur sentier accidenté. Compétence intransposable au tapis/escaliers",
    necessite: "Recommandé",
    when: "Build/Peak — 1× /mois si course trail mountain/ultra avec descentes techniques (>15% pente sentier rocheux)",
    phase: ["build", "peak"],
    avoid: "Pluie battante (glissance), première séance descente sans préparation excentrique préalable",
    durationMin: [90, 150],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' montée EF + activation chevilles (cercles, sauts latéraux contrôlés)", ["Z1", "Z2"]],
      ["Main", "5-8 répétitions descente technique 400-800m dénivelé négatif sur sentier accidenté : pose pied actif (avant-pied/médio-pied), regard 3-5m devant, bras écartés équilibre, fréquence pas élevée (>180), bâtons si besoin. R: remontée Z1-Z2 marche/EF. Travail spécifique impossible en ville (sol urbain trop plat/régulier).", ["Z2", "Z3"]],
      ["Cool-down", "15' EF plat + étirements quadris/tibial antérieur (très sollicités en descente)", ["Z1"]]
    ]),
    variants: { trail_short: "5 reps / 90'", trail_mountain: "6-7 reps / 120'", trail_ultra: "7-8 reps / 150'" },
    goals: TRAIL_GOALS_ALL,
    tags: ["expé-hors-ville", "descente", "technique", "week-end", "spécifique-massif"]
  },
  // ============= TAPIS INCLINÉ — extensions =============
  {
    id: "URBAN_TAPIS_SEUIL_PROGRESSIF_LONG",
    cat: "B", sport: "course",
    objectif: "[URBAIN] Seuil progressif tapis incliné — 3×15' à 4/6/8% inclinaison, allure seuil descendante. Travaille puissance aérobie en montée soutenue",
    necessite: "Recommandé",
    when: "Build/Peak (1× /sem en alternance avec seuil plat)",
    phase: ["build", "peak"],
    avoid: "Fatigue tendineuse Achille, semaine de récup",
    durationMin: [70, 90],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' EF 1% incl. + 4×30\" lignes droites Z3", ["Z1", "Z2"]],
      ["Main", "3×15' seuil à 4% / 6% / 8% incl. (allure régressive de 5-8s/km/bloc pour iso-FC). R: 4' marche 1%. Travail seuil + force spécifique montée.", ["Z4"]],
      ["Cool-down", "10' EF 1% + étirements mollets/soléaires", ["Z1"]]
    ]),
    variants: { trail_short: "2×15'", trail_mountain: "3×15'", trail_ultra: "3×18'" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "tapis-incliné", "seuil", "force-montée", "substitution-trail"]
  },
  {
    id: "URBAN_TAPIS_VO2_FARTLEK_INCLINE",
    cat: "C", sport: "course",
    objectif: "[URBAIN] VO2max tapis fartlek inclinaison variable — 10×(2' à 8-10% VO2 + 1' récup 2%). Reproduit profil dent-de-scie sentier montée",
    necessite: "Recommandé",
    when: "Build (1× /sem en bloc VO2max)",
    phase: ["build", "peak"],
    avoid: "Si VMA descendante 2 sem consécutives",
    durationMin: [50, 65],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "12' EF 1-2% + 4×30\" 5% incl. progressifs", ["Z1", "Z2"]],
      ["Main", "10×(2' à 8-10% incl. allure VO2max FC≥92% / 1' récup 2% incl. EF). Garder cadence ≥175.", ["Z5"]],
      ["Cool-down", "10' EF 1% + mobilité hanches", ["Z1"]]
    ]),
    variants: { trail_short: "8 reps", trail_mountain: "10 reps", trail_ultra: "12 reps allure légèrement réduite" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "tapis-incliné", "vo2max", "fartlek", "substitution-trail"]
  },
  {
    id: "URBAN_TAPIS_SIMUL_COL_LONG",
    cat: "B", sport: "course",
    objectif: "[URBAIN] Simulation col long tapis — 60-90' continu à 6-10% incl. allure marche/course alternée (5'/5'). Reproduit ascension longue 800-1500m D+",
    necessite: "Recommandé",
    when: "Peak (1× tous les 10-14j si course mountain/ultra)",
    phase: ["build", "peak"],
    avoid: "Pas en début de plan, exige adaptation préalable tapis incliné",
    durationMin: [70, 110],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "10' EF 2% incl. + activation chevilles", ["Z1", "Z2"]],
      ["Main", "60-90' continu 6-10% incl. : alterner 5' course allure EF haute (Z2-Z3) + 5' marche puissante (mains sur cuisses si raide). Sac lesté 4-6kg. Test nutrition col long (1 gel/45'). Ventilation max.", ["Z2", "Z3"]],
      ["Cool-down", "10' EF 1% + étirements complets", ["Z1"]]
    ]),
    variants: { trail_short: "60'", trail_mountain: "75-90'", trail_ultra: "90-110'" },
    goals: TRAIL_GOALS_MTN_ULTRA,
    tags: ["urbain", "tapis-incliné", "simulation-col", "marche-course", "substitution-trail"]
  },
  // ============= ESCALIERS — extensions =============
  {
    id: "URBAN_ESCALIERS_SEUIL_CONTINU",
    cat: "B", sport: "course",
    objectif: "[URBAIN] Seuil continu escaliers — 3×8' montées/descentes enchaînées sur grand escalier (>50 marches). Travail seuil + posture descente",
    necessite: "Recommandé",
    when: "Build/Peak (1× /sem si grand escalier disponible : building, monument, stade)",
    phase: ["build", "peak"],
    avoid: "Escalier <30 marches (cassures trop fréquentes), pluie",
    durationMin: [50, 70],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "12' EF + 5' éducatifs montée (1 marche/2 marches)", ["Z1", "Z2"]],
      ["Main", "3×8' enchaînement montée allure seuil + descente contrôlée (pose médio-pied, cadence haute). R: 3' marche plat. Travail FC seuil + technique descente sans D+ massif.", ["Z4"]],
      ["Cool-down", "10' EF + étirements quadris/tibial antérieur", ["Z1"]]
    ]),
    variants: { trail_short: "2×8'", trail_mountain: "3×8'", trail_ultra: "3×10'" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "escaliers", "seuil", "descente-technique", "substitution-trail"]
  },
  {
    id: "URBAN_ESCALIERS_FARTLEK_LIBRE",
    cat: "C", sport: "course",
    objectif: "[URBAIN] Fartlek escaliers ludique — 45' parcours urbain enchaînant 6-10 escaliers du quartier avec allures libres. Stimulus varié et motivant",
    necessite: "Recommandé",
    when: "Build (1× /sem en alternative aux blocs structurés)",
    phase: ["base", "build", "peak"],
    avoid: "Trafic dense (heures de pointe), sols glissants",
    durationMin: [40, 60],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "10' EF rejoindre 1er escalier", ["Z1", "Z2"]],
      ["Main", "Parcours libre 30-40' : chaque escalier croisé = 1-3 montées allure choisie (sprint court, VMA, seuil long si escalier long). Entre les escaliers : EF Z2 récup. Compter ≥6 escaliers ≥40 marches.", ["Z3", "Z4", "Z5"]],
      ["Cool-down", "10' EF retour + mobilité chevilles", ["Z1"]]
    ]),
    variants: { trail_short: "40'", trail_mountain: "50'", trail_ultra: "60'" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "escaliers", "fartlek", "ludique", "substitution-trail"]
  },
  {
    id: "URBAN_ESCALIERS_BATONS_DOUBLE_POLING",
    cat: "C", sport: "course",
    objectif: "[URBAIN] Escaliers + bâtons double-poling — 8×1'30 montée avec bâtons, focus poussée bras synchronisée. Spécifique trail mountain/ultra >1500m D+",
    necessite: "Recommandé",
    when: "Build/Peak (1× tous les 14j si course autorise bâtons)",
    phase: ["build", "peak"],
    avoid: "Escaliers étroits (gêne bâtons), pluie",
    durationMin: [50, 65],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "10' EF + 5' activation épaules (élastique, rotations)", ["Z1", "Z2"]],
      ["Main", "8×1'30 montée escaliers grand format bâtons en poussée double-poling synchro jambe (planter bâtons devant pied avant, pousser jusqu'à extension complète). R: descente 1'30 sans bâtons. Focus économie + chaîne postérieure haut du corps.", ["Z3", "Z4"]],
      ["Cool-down", "10' EF + étirements lats/triceps/poignets", ["Z1"]]
    ]),
    variants: { trail_short: "Skip", trail_mountain: "8 reps", trail_ultra: "10 reps" },
    goals: TRAIL_GOALS_MTN_ULTRA,
    tags: ["urbain", "escaliers", "bâtons", "double-poling", "technique-haut-corps"]
  },
  // ============= CÔTES URBAINES — extensions =============
  {
    id: "URBAN_COTES_NORVEGIEN_DOUBLE_SEUIL",
    cat: "B", sport: "course",
    objectif: "[URBAIN] Côte urbaine méthode norvégienne double seuil — AM 5×6' côte allure seuil bas / PM 6×4' côte allure seuil haut. Volume seuil massif sans casse",
    necessite: "Recommandé",
    when: "Peak (1× /sem si CTL >400 et adaptation seuil OK)",
    phase: ["peak"],
    avoid: "CTL bas, sem 1-3 du plan, fatigue accumulée >7 jours",
    durationMin: [120, 150],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "Séance AM : 15' EF + 4 lignes. 5×6' côte 4-6% allure seuil bas (lactate cible 2.5-3.0 mmol/L si mesurable). R: descente trottinée 2'30. Récup 6-8h.", ["Z1", "Z2", "Z4"]],
      ["Main", "Séance PM : 15' EF + 4 lignes. 6×4' même côte allure seuil haut (lactate 3.5-4.0). R: descente 2'. Norvégien strict : ne JAMAIS dépasser zone seuil.", ["Z4"]],
      ["Cool-down", "10' EF + bain froid si disponible", ["Z1"]]
    ]),
    variants: { trail_short: "AM 4×6' / PM 5×4'", trail_mountain: "5×6' / 6×4'", trail_ultra: "6×6' / 6×5'" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "côtes", "norvégien", "double-seuil", "lactate"]
  },
  {
    id: "URBAN_COTES_SPRINT_NEURO",
    cat: "C", sport: "course",
    objectif: "[URBAIN] Sprint côte neuromusculaire — 12×8\" côte raide (>10%) à intensité max, R complète. Recrutement fibres rapides, puissance départ relances",
    necessite: "Recommandé",
    when: "Base/Build (1× /sem entretien neuromusculaire)",
    phase: ["base", "build"],
    avoid: "Échauffement insuffisant, blessure mollet/Achille",
    durationMin: [40, 55],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' EF + 5' éducatifs (skipping, talons-fesses, foulées bondissantes) + 3×80m progressifs", ["Z1", "Z2", "Z3"]],
      ["Main", "12×8\" sprint côte raide >10% max effort (engagement bras+jambes, attaque pied avant). R: 2-3' marche descente RÉCUP COMPLÈTE. Pas filière lactique : neuromusculaire pur.", ["Z6"]],
      ["Cool-down", "10' EF + mobilité hanches/chevilles", ["Z1"]]
    ]),
    variants: { trail_short: "10 reps", trail_mountain: "12 reps", trail_ultra: "8 reps (entretien minimal)" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "côtes", "sprint", "neuromusculaire", "puissance"]
  },
  {
    id: "URBAN_COTES_LONGUES_FARTLEK",
    cat: "B", sport: "course",
    objectif: "[URBAIN] Fartlek côtes longues — 70' parcours vallonné urbain (parc/passerelles/ponts) avec montées >2' à allures variables. Volume spécifique simulation profil",
    necessite: "Recommandé",
    when: "Build/Peak (1× /sem alternative à SL plate)",
    phase: ["build", "peak"],
    avoid: "Parcours <5km de bosses (trop répétitif)",
    durationMin: [60, 90],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' EF rejoindre parcours vallonné", ["Z1", "Z2"]],
      ["Main", "45-60' parcours bouclé : chaque montée >2' courue à allure seuil/Z3, chaque descente contrôlée technique pose pied, plat = EF Z2. Viser ≥400m D+ cumulés sur la séance.", ["Z2", "Z3", "Z4"]],
      ["Cool-down", "10' EF retour + étirements", ["Z1"]]
    ]),
    variants: { trail_short: "60' / 300m D+", trail_mountain: "75' / 500m D+", trail_ultra: "90' / 600m D+" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "côtes-longues", "fartlek", "volume-D+", "substitution-trail"]
  },
  {
    id: "URBAN_PARKING_RAMPE_PYRAMIDE",
    cat: "C", sport: "course",
    objectif: "[URBAIN] Parking souterrain rampe pyramide — 1-2-3-4-3-2-1 min montée rampe parking (pente continue 8-15%). Alternative tapis si météo extrême",
    necessite: "Optionnel",
    when: "Build (option météo: pluie/neige/froid extrême)",
    phase: ["base", "build", "peak"],
    avoid: "Mauvaise ventilation parking, trafic véhicules",
    durationMin: [40, 55],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "12' EF en surface + 4×30\" rampe progressifs", ["Z1", "Z2"]],
      ["Main", "Pyramide 1-2-3-4-3-2-1' montée rampe parking allure VMA→seuil→VMA. R: descente trottinée temps = temps d'effort. Total ~16' qualité.", ["Z4", "Z5"]],
      ["Cool-down", "10' EF surface + étirements", ["Z1"]]
    ]),
    variants: { trail_short: "1-2-3-2-1", trail_mountain: "1-2-3-4-3-2-1", trail_ultra: "2-3-4-5-4-3-2" },
    goals: TRAIL_GOALS_ALL,
    tags: ["urbain", "parking", "rampe", "pyramide", "météo-extrême"]
  },
  // ============= WEEK-ENDS EXPÉ — extensions =============
  {
    id: "EXPE_HORS_VILLE_NOCTURNE",
    cat: "B", sport: "course",
    objectif: "[EXPÉ HORS-VILLE] Sortie nocturne massif — 2-3h trail nuit avec frontale, sentier connu. Spécifique courses comportant phase nocturne (ultra >12h)",
    necessite: "Recommandé",
    when: "Peak (1-2× avant course ultra avec phase nuit prévue)",
    phase: ["peak"],
    avoid: "Sentier inconnu, frontale faible (<300 lumens), seul si zone isolée sans réseau",
    durationMin: [120, 180],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' EF marche+course progressif (adaptation vision nuit)", ["Z1"]],
      ["Main", "2-3h Z2 strict sur sentier connu avec D+ modéré (400-800m). Frontale principale + backup. Tester nutrition nocturne (gels, soupes salées), gestion baisse vigilance, allure ralentie (-15-20% vs jour). Si possible avec partenaire.", ["Z2"]],
      ["Cool-down", "10' marche + recharge glucidique + sommeil prioritaire", ["Z1"]]
    ]),
    variants: { trail_short: "Skip", trail_mountain: "120-150'", trail_ultra: "150-180'" },
    goals: TRAIL_GOALS_ULTRA,
    tags: ["expé-hors-ville", "nocturne", "ultra-spécifique", "frontale", "week-end"]
  },
  {
    id: "EXPE_HORS_VILLE_TRIPLE_JOUR",
    cat: "B", sport: "course",
    objectif: "[EXPÉ HORS-VILLE] Stage 3 jours massif — vendredi-samedi-dimanche en gîte, choc volume + D+. Pic spécifique ultra/mountain peak phase",
    necessite: "Recommandé",
    when: "Peak (1× max par plan, J-21 à J-35 de course)",
    phase: ["peak"],
    avoid: "CTL <450, blessure récente, dernière sem avant taper",
    durationMin: [360, 540],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "J1 (ven AM/PM) : 2h Z2 reconnaissance + 600-1000m D+. Repas glucidique massif. Sommeil 9h.", ["Z2"]],
      ["Main", "J2 (sam) : SL D+ longue 3-4h / 1200-2000m D+ Z2 sur sentier engagé. Test nutrition course complète. J3 (dim) : 2-3h Z1-Z2 sur jambes fatiguées / 600-1000m D+, allure très contrôlée. Total stage : 7-10h / 2500-4000m D+.", ["Z1", "Z2"]],
      ["Cool-down", "Lundi récup complète + URBAN_RECUP_VELO_ZONE1 ou marche. Suivi feedback corporel 5 jours.", ["Z1"]]
    ]),
    variants: { trail_short: "Skip", trail_mountain: "Total 7h / 2500m D+", trail_ultra: "Total 9-10h / 3500-4000m D+" },
    goals: TRAIL_GOALS_MTN_ULTRA,
    tags: ["expé-hors-ville", "stage", "triple-jour", "pic-spécifique", "week-end-prolongé"]
  },
  {
    id: "EXPE_HORS_VILLE_RACE_SIM_MASSIF",
    cat: "Race-Sim", sport: "course",
    objectif: "[EXPÉ HORS-VILLE] Race-sim massif autonomie complète — 3-5h sentier massif avec sac course, nutrition exacte jour J, matériel obligatoire. Répétition générale",
    necessite: "Obligatoire",
    when: "Peak (1× obligatoire J-21 à J-28 si course mountain/ultra)",
    phase: ["peak"],
    avoid: "Conditions extrêmes opposées à jour J, blessure aiguë",
    durationMin: [180, 300],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' EF + check matériel obligatoire complet (couverture survie, sifflet, frontale, eau, nutrition jour J)", ["Z1", "Z2"]],
      ["Main", "3-5h sur portion représentative du parcours (ou massif équivalent) : viser 60-70% D+ course cible, allure exacte stratégie jour J (Z2 pur sur portions roulantes, marche puissante montées raides, descente technique contrôlée). Nutrition strictement = jour J (gels/barres/poudre exacts). Ravitaillement autonome (pas de soutien externe).", ["Z2", "Z3"]],
      ["Cool-down", "Bilan complet : nutrition tolérée ?, matériel OK ?, allure tenable sur ×2-3 ? Ajustements stratégie finale.", ["Z1"]]
    ]),
    variants: { trail_short: "180' / 600m D+", trail_mountain: "240' / 1200m D+", trail_ultra: "300' / 1800m D+" },
    goals: TRAIL_GOALS_MTN_ULTRA,
    tags: ["expé-hors-ville", "race-sim", "autonomie", "répétition-générale", "nutrition-test"]
  },
  {
    id: "EXPE_HORS_VILLE_VERTICAL_KM",
    cat: "C", sport: "course",
    objectif: "[EXPÉ HORS-VILLE] Vertical Km massif — montée sèche 1000m D+ continue (3-5km dist.), allure soutenue. Test puissance verticale + économie montée raide",
    necessite: "Recommandé",
    when: "Build/Peak (1× tous les 21j si course mountain >1500m D+/km segments)",
    phase: ["build", "peak"],
    avoid: "Sentier glissant, pas de descente sécurisée (téléphérique/navette idéal)",
    durationMin: [90, 150],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' marche+EF approche base montée + activation mollets/chevilles", ["Z1", "Z2"]],
      ["Main", "Montée 1000m D+ continue allure Z3-Z4 soutenue, alterner course (pentes <15%) et marche puissante (>15%, mains cuisses). Chrono total = référence saison. Cadence soutenue, regard sur sentier 3-5m. Bâtons recommandés.", ["Z3", "Z4"]],
      ["Cool-down", "Descente facile EF Z1-Z2 (ou téléphérique) + étirements complets bas du corps", ["Z1"]]
    ]),
    variants: { trail_short: "600m D+", trail_mountain: "1000m D+", trail_ultra: "1000-1200m D+ allure plus modérée" },
    goals: TRAIL_GOALS_MTN_ULTRA,
    tags: ["expé-hors-ville", "vertical-km", "puissance-verticale", "test-référence", "week-end"]
  },
  {
    id: "EXPE_HORS_VILLE_FORET_PERIURBAINE",
    cat: "A", sport: "course",
    objectif: "[EXPÉ HORS-VILLE] Forêt périurbaine sentier — 90-150' sentier forestier accessible en transports (Fontainebleau, Soignes, Meudon, etc.). Volume EF sur sol souple sans long trajet",
    necessite: "Recommandé",
    when: "Base/Build (1× /sem, alternative à SL urbaine bitume)",
    phase: ["base", "build", "peak"],
    avoid: "—",
    durationMin: [80, 150],
    metricKey: "cardiaque", sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "10' EF approche forêt", ["Z1", "Z2"]],
      ["Main", "70-130' EF Z2 strict sur sentier forestier, profiter du terrain souple, des micro-reliefs (200-500m D+ accumulés naturellement), de la fraîcheur. Travail proprioception cheville + variation foulée. Idéal aussi en double tapis-foret le week-end.", ["Z1", "Z2"]],
      ["Cool-down", "10' marche + étirements", ["Z1"]]
    ]),
    variants: { trail_short: "80-100'", trail_mountain: "100-130'", trail_ultra: "120-150'" },
    goals: TRAIL_GOALS_ALL,
    tags: ["expé-hors-ville", "forêt-périurbaine", "EF", "volume", "week-end", "accessible-transports"]
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
