// =============================================
// ENRICHED WORKOUTS — RECOVERY & REST (Cat D/Récup)
// 12 séances dédiées récupération, régénération, mobilité
// =============================================

import { LibraryWorkout, WorkoutGoal } from "@/types/workoutLibrary";

const GOALS_ALL: WorkoutGoal[] = ["ironman", "half", "marathon", "semi", "10k"];
const GOALS_TRI: WorkoutGoal[] = ["ironman", "half"];
const GOALS_TRAIL: WorkoutGoal[] = ["trail_short", "trail_mountain", "trail_long", "trail_ultra"];

function mk(parts: [string, string, string[]][]) {
  return parts.map(([part, text, zones]) => ({ part, text, zones }));
}

export const EnrichedWorkoutsRecovery: LibraryWorkout[] = [

  // ── REST COMPLET ──
  {
    id: "REST_FULL_DAY",
    cat: "REST", sport: "mixed",
    objectif: "Repos complet — aucune activité physique. Sommeil, hydratation, nutrition",
    necessite: "Obligatoire",
    when: "Après bloc intensif, semaine taper, ou fatigue >8/10",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [0, 0],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Repos total. Étirements passifs légers autorisés (10' max)", []]
    ]),
    variants: { ironman: "1-2x/sem", half: "1x/sem", marathon: "1x/sem", semi: "1x/sem" },
    goals: GOALS_ALL,
    tags: ["rest", "recovery", "repos"]
  },
  {
    id: "REST_ACTIVE_WALK",
    cat: "Récup", sport: "mixed",
    objectif: "Récupération active par marche — circulation sans stress mécanique",
    necessite: "Recommandé",
    when: "Lendemain séance clé ou longue sortie",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Si douleur articulaire",
    durationMin: [20, 40],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "20-40' marche facile, terrain plat, respiration nasale", ["Z1"]]
    ]),
    variants: { ironman: "30-40'", half: "20-30'", marathon: "30'", semi: "20'" },
    goals: GOALS_ALL,
    tags: ["rest", "recovery", "marche", "active"]
  },

  // ── MOBILITÉ / YOGA ──
  {
    id: "D_MOBILITY_ROUTINE",
    cat: "D", sport: "mixed",
    objectif: "Mobilité articulaire ciblée — hanches, chevilles, épaules, thoracique",
    necessite: "Recommandé",
    when: "Toute l'année, 2-3x/semaine idéal",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [15, 30],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Routine mobilité: 90/90 hanches, world's greatest stretch, cat-cow, thoracic rotations, ankle CARs (15-30')", []]
    ]),
    variants: { ironman: "Focus hanches+épaules", half: "Focus hanches+épaules", marathon: "Focus hanches+chevilles", semi: "Focus hanches+chevilles" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["mobility", "recovery", "prévention"]
  },
  {
    id: "D_YOGA_ATHLETE",
    cat: "D", sport: "mixed",
    objectif: "Yoga athlète — étirements actifs, respiration, relâchement musculaire",
    necessite: "Optionnel",
    when: "Fin de journée ou jour de repos",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [20, 45],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Séquence yoga: sun salutations, warrior poses, pigeon, forward fold, bridge, shavasana (20-45')", []]
    ]),
    variants: { ironman: "Ajouter yin yoga post-longue sortie", half: "30' standard", marathon: "Focus jambes", semi: "20' express" },
    goals: GOALS_ALL,
    tags: ["yoga", "recovery", "flexibility"]
  },

  // ── RÉCUP ACTIVE SPORT-SPÉCIFIQUE ──
  {
    id: "D_RUN_SHAKEOUT",
    cat: "D", sport: "course",
    objectif: "Shakeout run — déverrouillage musculaire pré-compétition ou post-charge",
    necessite: "Recommandé",
    when: "J-1 course ou lendemain longue sortie",
    phase: ["peak", "taper"],
    avoid: "Si douleur",
    durationMin: [15, 25],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "15-25' très facile Z1 + 4x20\" accélérations progressives r=40\" marche", ["Z1"]]
    ]),
    variants: { ironman: "Après brick", half: "J-1 course", marathon: "J-1 marathon", semi: "J-1 semi" },
    goals: GOALS_ALL,
    tags: ["shakeout", "recovery", "activation", "pré-compétition"]
  },
  {
    id: "D_BIKE_SPIN_EASY",
    cat: "D", sport: "cyclisme",
    objectif: "Spin facile — flush lactate, cadence haute sans charge",
    necessite: "Recommandé",
    when: "Lendemain intervalles vélo ou J-1 compétition",
    phase: ["build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [20, 40],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Main", "20-40' Z1 cadence 90-100rpm, très facile, aucune résistance", ["Z1"]]
    ]),
    variants: { ironman: "30-40'", half: "20-30'", marathon: "optionnel", semi: "optionnel" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["spin", "recovery", "flush"]
  },
  {
    id: "D_SWIM_LOOSEN",
    cat: "D", sport: "natation",
    objectif: "Nage de récupération — relâchement épaules et activation douce",
    necessite: "Recommandé",
    when: "Lendemain charge ou semaine taper",
    phase: ["build", "peak", "taper"],
    avoid: "Douleur épaule",
    durationMin: [20, 35],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "200m facile multi-nages", ["Z1"]],
      ["Main", "4x100m Z1 pull buoy r=15\" + 4x50m dos r=10\"", ["Z1"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "Excellent", half: "Excellent", marathon: "—", semi: "—" },
    goals: GOALS_TRI,
    tags: ["recovery", "natation", "loosen"]
  },

  // ── FOAM ROLLING / AUTO-MASSAGE ──
  {
    id: "D_FOAM_ROLLING",
    cat: "D", sport: "mixed",
    objectif: "Auto-massage foam roller — réduction tonus musculaire, prévention adhérences",
    necessite: "Recommandé",
    when: "Post-entraînement ou jour de repos",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Zone blessée aiguë",
    durationMin: [10, 20],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Foam rolling: quadriceps, IT band, mollets, fessiers, adducteurs, dorsaux (30\" par zone x 2 passes)", []]
    ]),
    variants: { ironman: "Ajouter piriforme et TFL", half: "Standard", marathon: "Focus mollets+quads", semi: "15' express" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["foam-rolling", "recovery", "auto-massage"]
  },

  // ── ACTIVATION PRÉ-COMPÉTITION ──
  {
    id: "D_ACTIVATION_PRERACE",
    cat: "D", sport: "mixed",
    objectif: "Activation neuromusculaire pré-course — primers sans fatigue",
    necessite: "Recommandé",
    when: "J-1 ou matin jour de course",
    phase: ["peak", "taper"],
    avoid: "N/A",
    durationMin: [15, 25],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "5' marche dynamique", []],
      ["Main", "Activation: 10 squats, 10 fentes, 10 hip circles, 4x10\" sprints sur place, 2x30\" saut corde", []],
      ["Cool-down", "5' marche + respirations profondes", []]
    ]),
    variants: { ironman: "Ajouter arm swings", half: "Standard", marathon: "Focus jambes", semi: "Express 15'" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["activation", "pré-compétition", "primers"]
  },

  // ── RÉCUP SEMAINE DE DÉCHARGE ──
  {
    id: "D_DELOAD_RUN",
    cat: "D", sport: "course",
    objectif: "Footing de décharge — volume réduit 40-50%, intensité Z1 stricte",
    necessite: "Obligatoire",
    when: "Semaine de récupération (1 semaine sur 3-4)",
    phase: ["base", "build"],
    avoid: "N/A",
    durationMin: [25, 40],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "25-40' Z1 stricte, fréquence cardiaque basse, technique relâchée", ["Z1"]]
    ]),
    variants: { ironman: "30-40'", half: "25-35'", marathon: "30-40'", semi: "25-30'" },
    goals: GOALS_ALL,
    tags: ["deload", "recovery", "décharge"]
  },
  {
    id: "D_DELOAD_BIKE",
    cat: "D", sport: "cyclisme",
    objectif: "Sortie vélo de décharge — volume réduit, cadence libre, plaisir",
    necessite: "Recommandé",
    when: "Semaine de récupération",
    phase: ["base", "build"],
    avoid: "N/A",
    durationMin: [30, 60],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Main", "30-60' Z1 cadence libre, terrain plat de préférence", ["Z1"]]
    ]),
    variants: { ironman: "45-60'", half: "30-45'", marathon: "optionnel", semi: "optionnel" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["deload", "recovery", "décharge"]
  },
  {
    id: "D_STRETCH_ROUTINE",
    cat: "D", sport: "mixed",
    objectif: "Routine étirements statiques — post-entraînement ou jour off",
    necessite: "Optionnel",
    when: "Post-entraînement ou jour de repos",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Jamais avant séance intense",
    durationMin: [10, 20],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Étirements statiques: ischio-jambiers, quadriceps, psoas, mollets, adducteurs, piriformes (30\" x 2 par groupe)", []]
    ]),
    variants: { ironman: "Ajouter épaules", half: "Ajouter épaules", marathon: "Focus jambes", semi: "Focus jambes" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["stretching", "recovery", "étirements"]
  },
];
