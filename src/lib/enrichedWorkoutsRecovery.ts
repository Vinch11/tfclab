// =============================================
// ENRICHED WORKOUTS — RECOVERY & REST (Cat D/Récup)
// 12 séances dédiées récupération, régénération, mobilité
//
// F40 disambiguation: this is the TRAINING catalog of recovery/rest
// SESSIONS (consumed by the workout library + AI plan generator).
// Post-effort NUTRITION targets (CHO/protein/fluids) live in
// `src/lib/recoveryProtocol.ts`. The two files are intentionally distinct.
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

  // ── ACTIVATION NEUROMUSCUAIRE AVANCÉE ──
  {
    id: "D_ACTIVATION_GLUTES",
    cat: "D", sport: "mixed",
    objectif: "Activation fessiers — réveil glutéal avant séance clé ou longue sortie",
    necessite: "Recommandé",
    when: "Avant séance B/C incluant course ou vélo",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [10, 15],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Clam shells 2x15, monster walks bande élastique 2x10, single leg glute bridge 2x12, fire hydrants 2x12", []]
    ]),
    variants: { ironman: "Ajouter hip thrusts", half: "Standard", marathon: "Focus single leg", semi: "Express 10'" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["activation", "glutes", "prévention"]
  },
  {
    id: "D_ACTIVATION_CORE_TAPER",
    cat: "D", sport: "mixed",
    objectif: "Gainage léger taper — maintien core sans fatigue musculaire",
    necessite: "Recommandé",
    when: "Semaine taper, maintien tonus sans charge",
    phase: ["taper"],
    avoid: "Charge lourde en semaine taper",
    durationMin: [10, 15],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Dead bug 2x10, bird dog 2x10, side plank 2x20\", pallof press bande 2x10, plank 2x30\"", []]
    ]),
    variants: { ironman: "15' avec respiration", half: "12'", marathon: "12'", semi: "10'" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["core", "activation", "taper", "gainage"]
  },
  {
    id: "D_ACTIVATION_ANKLE_FOOT",
    cat: "D", sport: "course",
    objectif: "Activation pieds & chevilles — proprioception et prévention entorses/périostites",
    necessite: "Recommandé",
    when: "Pré-séance trail ou 2-3x/semaine",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [8, 12],
    metricKey: "cardiaque", sportKey: "course",
    structure: mk([
      ["Main", "Toe yoga 2x10, heel raises 2x15, single leg balance 2x30\", ankle CARs 2x8, short foot drill 2x12", []]
    ]),
    variants: { ironman: "Post-brick", half: "Standard", marathon: "Focus périostite prev.", semi: "Express" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["activation", "chevilles", "pieds", "proprioception"]
  },

  // ── MOBILITÉ AVANCÉE ──
  {
    id: "D_MOBILITY_HIPS_DEEP",
    cat: "D", sport: "mixed",
    objectif: "Mobilité hanches approfondie — déverrouillage psoas, piriforme, adducteurs",
    necessite: "Recommandé",
    when: "Post-longue sortie ou jour de repos",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [15, 25],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "90/90 flow 2x8, pigeon progressif 2x45\", frog stretch 2x30\", couch stretch 2x30\", adductor rocks 2x12", []]
    ]),
    variants: { ironman: "Ajouter psoas release balle", half: "Standard", marathon: "Focus psoas+IT band", semi: "15' express" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["mobility", "hanches", "psoas", "deep"]
  },
  {
    id: "D_MOBILITY_THORACIC",
    cat: "D", sport: "mixed",
    objectif: "Mobilité thoracique & épaules — crucial nageurs et posture vélo",
    necessite: "Recommandé",
    when: "Post-natation ou post-vélo longue durée",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [12, 20],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Thoracic rotations 2x10, open book 2x8, thread the needle 2x8, wall slides 2x10, pec doorway stretch 2x30\"", []]
    ]),
    variants: { ironman: "Focus épaules nageur", half: "Focus épaules nageur", marathon: "Focus posture", semi: "Express 12'" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["mobility", "thoracique", "épaules", "posture"]
  },
  {
    id: "D_MOBILITY_TRAIL_SPECIFIC",
    cat: "D", sport: "course",
    objectif: "Mobilité trail — préparation descente, stabilité latérale, flexion dorsale",
    necessite: "Recommandé",
    when: "Avant sortie trail technique ou post-descente",
    phase: ["base", "build", "peak"],
    avoid: "N/A",
    durationMin: [15, 20],
    metricKey: "cardiaque", sportKey: "course",
    structure: mk([
      ["Main", "Ankle dorsiflexion wall 2x12, cossack squats 2x8, lateral lunges 2x10, single leg RDL 2x8, tibialis raises 2x15", []]
    ]),
    variants: {},
    goals: GOALS_TRAIL,
    tags: ["mobility", "trail", "descente", "stabilité"]
  },

  // ── YOGA AVANCÉ ──
  {
    id: "D_YOGA_YIN_DEEP",
    cat: "D", sport: "mixed",
    objectif: "Yin yoga — postures longues (3-5') pour fascias et tissu conjonctif",
    necessite: "Optionnel",
    when: "Jour de repos ou semaine de décharge",
    phase: ["base", "build", "taper"],
    avoid: "N/A",
    durationMin: [30, 50],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Dragon pose 3', sphinx 3', shoelace 3', banana 3', butterfly 3', legs up the wall 5' (30-50')", []]
    ]),
    variants: { ironman: "50' post-longue sortie", half: "40'", marathon: "35' focus jambes", semi: "30'" },
    goals: GOALS_ALL,
    tags: ["yoga", "yin", "fascia", "recovery", "deep"]
  },
  {
    id: "D_YOGA_POWER_LIGHT",
    cat: "D", sport: "mixed",
    objectif: "Power yoga léger — flow dynamique sans fatigue, coordination respiration",
    necessite: "Optionnel",
    when: "Matin jour intermédiaire ou pre-séance légère",
    phase: ["base", "build", "peak"],
    avoid: "Ne pas faire avant séance clé intense",
    durationMin: [20, 35],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "3' respiration diaphragmatique", []],
      ["Main", "Sun salutation A x3, warrior II flow, triangle, half moon balance, chair pose flow (15-25')", []],
      ["Cool-down", "Child's pose + shavasana 5'", []]
    ]),
    variants: { ironman: "35' avec équilibre", half: "30'", marathon: "25'", semi: "20'" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["yoga", "power", "flow", "coordination"]
  },
  {
    id: "D_YOGA_PRERACE",
    cat: "D", sport: "mixed",
    objectif: "Yoga pré-compétition — calme mental, ouverture hanches, activation douce",
    necessite: "Optionnel",
    when: "J-1 compétition, soir",
    phase: ["peak", "taper"],
    avoid: "N/A",
    durationMin: [15, 25],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Cat-cow 1', low lunge 1'x2, pigeon 1'x2, forward fold 1', legs up the wall 3', body scan meditation 5'", []]
    ]),
    variants: { ironman: "Ajouter visualisation parcours", half: "Standard", marathon: "Focus jambes", semi: "15' express" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["yoga", "pré-compétition", "mental", "calme"]
  },

  // ── RÉCUP SPÉCIFIQUE TAPER ──
  {
    id: "D_TAPER_FLUSH_RUN",
    cat: "D", sport: "course",
    objectif: "Footing flush taper — micro-dose pour maintenir sensations sans charge",
    necessite: "Recommandé",
    when: "Semaine taper, J-3 à J-2 avant course",
    phase: ["taper"],
    avoid: "N/A",
    durationMin: [15, 20],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "15-20' Z1 très facile + 3x15\" allure course r=45\" marche", ["Z1"]]
    ]),
    variants: { ironman: "Avec 2x20\" allure IM", half: "Standard", marathon: "Allure marathon", semi: "Allure semi" },
    goals: GOALS_ALL,
    tags: ["taper", "flush", "pré-compétition"]
  },
  {
    id: "D_TAPER_FLUSH_BIKE",
    cat: "D", sport: "cyclisme",
    objectif: "Spin taper — openers vélo avant compétition",
    necessite: "Recommandé",
    when: "J-2 avant course vélo ou triathlon",
    phase: ["taper"],
    avoid: "N/A",
    durationMin: [20, 30],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Main", "20-30' Z1 + 3x30\" à FTP r=1' facile", ["Z1", "Z4"]]
    ]),
    variants: { ironman: "Avec 2x1' allure IM", half: "Standard", marathon: "optionnel", semi: "optionnel" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["taper", "flush", "openers", "vélo"]
  },
  {
    id: "D_TAPER_SWIM_TOUCH",
    cat: "D", sport: "natation",
    objectif: "Nage taper — toucher l'eau, garder le feel sans fatigue",
    necessite: "Recommandé",
    when: "Semaine taper triathlon",
    phase: ["taper"],
    avoid: "N/A",
    durationMin: [15, 25],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Main", "300m facile multi-nages + 4x50m allure course r=15\" + 200m cool-down", ["Z1", "Z3"]]
    ]),
    variants: { ironman: "Allure IM", half: "Allure 70.3" },
    goals: GOALS_TRI,
    tags: ["taper", "natation", "feel", "pré-compétition"]
  },

  // ── BREATHWORK & MENTAL ──
  {
    id: "D_BREATHWORK_BOX",
    cat: "D", sport: "mixed",
    objectif: "Box breathing & cohérence cardiaque — gestion stress pré-compétition",
    necessite: "Optionnel",
    when: "Soir J-1 ou matin jour de course",
    phase: ["peak", "taper"],
    avoid: "N/A",
    durationMin: [10, 15],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Box breathing 4-4-4-4 x 5 cycles, cohérence cardiaque 5-5 x 5', body scan 3'", []]
    ]),
    variants: { ironman: "Ajouter visualisation", half: "Standard", marathon: "Standard", semi: "10' express" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["breathwork", "mental", "cohérence", "stress"]
  },
  {
    id: "D_COLD_CONTRAST",
    cat: "D", sport: "mixed",
    objectif: "Protocole contraste chaud/froid — récupération vasculaire post-charge",
    necessite: "Optionnel",
    when: "Post-séance clé ou post-compétition",
    phase: ["build", "peak"],
    avoid: "Si problème cardiaque ou Raynaud",
    durationMin: [15, 20],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "3 cycles: douche froide 1' → douche chaude 2' → froide 1'. Finir par froid. Respiration contrôlée", []]
    ]),
    variants: { ironman: "Ajouter bain glacé 10°C", half: "Standard", marathon: "Standard", semi: "2 cycles" },
    goals: GOALS_ALL,
    tags: ["recovery", "contraste", "froid", "vasculaire"]
  },
];
