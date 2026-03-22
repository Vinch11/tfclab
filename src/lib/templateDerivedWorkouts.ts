// =============================================
// SÉANCES DÉRIVÉES DES TEMPLATES DE PROGRAMMATION
// Extraites des plans Semi-Marathon, Marathon, Ironman Kona, Ironman 70.3
// =============================================

import { LibraryWorkout, WorkoutGoal } from "@/types/workoutLibrary";

const GOALS_TRI: WorkoutGoal[] = ["ironman", "half"];
const GOALS_RUN: WorkoutGoal[] = ["marathon", "semi"];
const GOALS_ALL: WorkoutGoal[] = ["ironman", "half", "marathon", "semi"];
const GOALS_SEMI: WorkoutGoal[] = ["semi"];
const GOALS_MAR: WorkoutGoal[] = ["marathon"];
const GOALS_IM: WorkoutGoal[] = ["ironman"];
const GOALS_703: WorkoutGoal[] = ["half"];

function mkStructure(parts: [string, string, string[]][]) {
  return parts.map(([part, text, zones]) => ({ part, text, zones }));
}

export const TemplateDerivedWorkouts: LibraryWorkout[] = [
  // =============================================
  // COURSE — SEMI-MARATHON TEMPLATE
  // =============================================
  {
    id: "TPL_SEMI_VMA_COURTE_30_30",
    cat: "B",
    sport: "course",
    objectif: "VMA courte 30\"/30\" — développement VO2max et dynamisme",
    necessite: "Obligatoire",
    when: "Phase Développement Moteur (S1-S4)",
    phase: ["build", "base"],
    avoid: "Fatigue nerveuse, douleurs tendineuses",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' progressif Z1→Z2 + éducatifs", ["Z1", "Z2"]],
      ["Main", "2 x (10 x 30\" Z6 / 30\" Z1) R:3' — Focus dynamisme", ["Z6", "Z1"]],
      ["Cool-down", "10' Z1 relâché", ["Z1"]]
    ]),
    variants: {
      semi: "2 x (10 x 30\" Z6 / 30\" Z1). Cible 105-110% VMA",
      marathon: "2 x (8 x 30\" Z5/Z6 / 30\" Z1). Rappel vitesse",
      half: "1 x (10 x 30\" Z5) + 1 x (10 x 30\" Z6)"
    },
    goals: [...GOALS_RUN, "half"],
    tags: ["vma", "30-30", "template-semi", "phase1"]
  },
  {
    id: "TPL_SEMI_VMA_MOYENNE_1MIN",
    cat: "B",
    sport: "course",
    objectif: "VMA moyenne 1' — volume à 100-105% VMA",
    necessite: "Recommandé",
    when: "Phase Développement Moteur (S2-S3)",
    phase: ["build"],
    avoid: "Si VO2max déjà stressé cette semaine",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' progressif Z1→Z2", ["Z1", "Z2"]],
      ["Main", "15 x 1' Z6 (100-105% VMA) r:1' Z1", ["Z6", "Z1"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      semi: "15 x 1' à 100-105% VMA",
      marathon: "12 x 1' à 100% VMA",
    },
    goals: GOALS_RUN,
    tags: ["vma", "1min", "template-semi", "phase1"]
  },
  {
    id: "TPL_SEMI_VO2_LONGUE_3MIN",
    cat: "B",
    sport: "course",
    objectif: "VO2max longue — blocs 3' pour puissance aérobie maximale",
    necessite: "Recommandé",
    when: "Phase Développement Moteur (S3 — Semaine dure)",
    phase: ["build"],
    avoid: "Fatigue accumulée, veille de test",
    durationMin: [60, 75],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' progressif + 4 lignes droites", ["Z1", "Z2"]],
      ["Main", "5 x 3' à Z5 haute/Z6 basse (95-98% VMA) r:2'", ["Z5", "Z6"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      semi: "5 x 3' à 95-98% VMA",
      marathon: "4-5 x 3' à 92-95% VMA",
    },
    goals: GOALS_RUN,
    tags: ["vo2max", "3min", "template-semi", "surcharge"]
  },
  {
    id: "TPL_SEMI_FORCE_COTES_SPRINT",
    cat: "C",
    sport: "course",
    objectif: "Force maximale — sprints en côte raide (Z7)",
    necessite: "Recommandé",
    when: "Phase Développement Moteur (S1-S3)",
    phase: ["build"],
    avoid: "Douleurs tendons d'Achille ou rotuliens",
    durationMin: [45, 60],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU progressif", ["Z1", "Z2"]],
      ["Main", "10 x 15\" Sprint en côte raide (Z7) r:2' marche. Focus poussée explosive", ["Z7"]],
      ["Cool-down", "10' CD Z1", ["Z1"]]
    ]),
    variants: {
      semi: "10 x 15\" Z7 raide",
      marathon: "8 x 40\" montée puissance Z6/Z7",
    },
    goals: GOALS_RUN,
    tags: ["force", "côtes", "sprint", "template-semi", "neuromusculaire"]
  },
  {
    id: "TPL_SEMI_FORCE_COTES_VOLUME",
    cat: "C",
    sport: "course",
    objectif: "Force spécifique — côtes volume Z5/Z6",
    necessite: "Recommandé",
    when: "Phase Développement Moteur / Seuil",
    phase: ["build"],
    avoid: "Si douleurs articulaires genoux",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "12 x 45\" Côte Z6 r:1'30 descente", ["Z6"]],
      ["Cool-down", "10' CD Z1", ["Z1"]]
    ]),
    variants: {
      semi: "12 x 45\" Z6 côte",
      marathon: "10 x 1' Z4/Z5 côte soutenue",
    },
    goals: GOALS_RUN,
    tags: ["force", "côtes", "volume", "template-semi"]
  },
  {
    id: "TPL_SEMI_SEUIL_INTRO",
    cat: "B",
    sport: "course",
    objectif: "Seuil anaérobie — entrée dans le seuil (4x6' Z5)",
    necessite: "Obligatoire",
    when: "Phase Seuil & Endurance (S5-S6)",
    phase: ["build", "peak"],
    avoid: "Fatigue nerveuse_V194",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU progressif", ["Z1", "Z2"]],
      ["Main", "4 x 6' Z5 bas r:2' trot", ["Z5"]],
      ["Cool-down", "10' CD Z1", ["Z1"]]
    ]),
    variants: {
      semi: "4 x 6' Z5 bas",
      marathon: "3 x 8' Z4 seuil",
    },
    goals: GOALS_RUN,
    tags: ["seuil", "anaérobie", "template-semi", "phase2"]
  },
  {
    id: "TPL_SEMI_SEUIL_EXTENSIF",
    cat: "B",
    sport: "course",
    objectif: "Seuil extensif — 3x10'-12' Z5 puis 3x12' Z4b/Z5 mix",
    necessite: "Obligatoire",
    when: "Phase Seuil (S6-S7)",
    phase: ["build", "peak"],
    avoid: "Veille compétition_V195",
    durationMin: [60, 80],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "3 x 10-12' Z4b/Z5 (Mix allure semi/seuil) r:2'30-3'", ["Z4", "Z5"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      semi: "3 x 10' Z5 → 3 x 12' Z4b/Z5",
      marathon: "3 x 10' Z4 seuil",
    },
    goals: GOALS_RUN,
    tags: ["seuil", "extensif", "template-semi", "phase2"]
  },
  {
    id: "TPL_SEMI_TEMPO_CONTINU",
    cat: "B",
    sport: "course",
    objectif: "Tempo continu — 30-40' Z3/Z4a (allure marathon)",
    necessite: "Recommandé",
    when: "Phase Seuil (S5-S7)",
    phase: ["build", "peak"],
    avoid: "Fatigue importante_V196",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' WU", ["Z1", "Z2"]],
      ["Main", "30-40' continu en Z3 haut/Z4a (Allure Marathon)", ["Z3", "Z4"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      semi: "30' Z3/Z4a puis 40' en S7",
      marathon: "40' Z3 haut (allure marathon)"
    },
    goals: GOALS_RUN,
    tags: ["tempo", "continu", "template-semi"]
  },
  {
    id: "TPL_SEMI_SPECIFIQUE_3x3000",
    cat: "B",
    sport: "course",
    objectif: "Spécifique semi — 3x3000m à allure semi (Z4b)",
    necessite: "Obligatoire",
    when: "Phase Spécifique (S9-S10)",
    phase: ["build"],
    avoid: "Si allure trop haute, revoir objectif",
    durationMin: [60, 80],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "3 x 3000m à Z4b (Allure Semi) r:2'30. Cible ~12'/3km", ["Z4"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      semi: "3 x 3000m Z4b. Max 3:58/km",
    },
    goals: GOALS_SEMI,
    tags: ["spécifique", "semi", "3000m", "template-semi", "phase3"]
  },
  {
    id: "TPL_SEMI_JUGE_DE_PAIX",
    cat: "B",
    sport: "course",
    objectif: "Le Juge de Paix — 2x5000m à allure semi (Z4b). Séance étalon",
    necessite: "Obligatoire",
    when: "Phase Spécifique (S10)",
    phase: ["build"],
    avoid: "Fatigue chronique_V197",
    durationMin: [65, 85],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "2 x 5000m à Z4b R:3' trot. Cible 20'/5km", ["Z4"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      semi: "2 x 5000m Z4b. Séance clé de validation"
    },
    goals: GOALS_SEMI,
    tags: ["spécifique", "semi", "5000m", "juge-de-paix", "template-semi", "validation"]
  },
  {
    id: "TPL_SEMI_LONGUE_PYRAMIDE",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue pyramide — Z4a/Z4b/Z5 en fin de sortie",
    necessite: "Recommandé",
    when: "Phase Spécifique (S9)",
    phase: ["build"],
    avoid: "Douleur_V198",
    durationMin: [90, 115],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "30-40' Z2 progressif", ["Z2"]],
      ["Main", "Pyramide: 15' Z4a + 10' Z4b + 5' Z5 (r:2' Z2 entre blocs)", ["Z4", "Z5"]],
      ["Cool-down", "15-20' Z2 retour", ["Z2"]]
    ]),
    variants: {
      semi: "15' Z4a + 10' Z4b + 5' Z5",
    },
    goals: GOALS_SEMI,
    tags: ["longue", "pyramide", "spécifique", "template-semi"]
  },

  // =============================================
  // COURSE — MARATHON TEMPLATE
  // =============================================
  {
    id: "TPL_MAR_COTES_LONGUES",
    cat: "C",
    sport: "course",
    objectif: "Côtes longues — force tranquille Z4 en montée",
    necessite: "Recommandé",
    when: "Phase Endurance Force (S5-S7)",
    phase: ["build"],
    avoid: "Problèmes genoux_V199",
    durationMin: [60, 75],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "6-8 x 2' montée au train (Z4) r:descente. Cuisses brûlent mais pas d'agonie respiratoire", ["Z4"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      marathon: "6 x 2' → 8 x 2' → 5 x 4' (progression sur 3 semaines)",
      semi: "6 x 2' Z4 côte"
    },
    goals: GOALS_RUN,
    tags: ["côtes", "force", "endurance", "template-marathon", "phase2"]
  },
  {
    id: "TPL_MAR_VMA_40_20",
    cat: "B",
    sport: "course",
    objectif: "VMA intermittente 40\"/20\" — temps >90% VO2max maximisé",
    necessite: "Recommandé",
    when: "Phase Endurance Force (S6)",
    phase: ["build"],
    avoid: "Fatigue nerveuse_V200",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU progressif", ["Z1", "Z2"]],
      ["Main", "2 x (10 x 40\" VITE / 20\" COOL) R:4'. 13-14min >90% VO2max", ["Z5", "Z6"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      marathon: "2 x (10 x 40\"/20\")",
      semi: "2 x (8 x 40\"/20\")",
    },
    goals: GOALS_RUN,
    tags: ["vma", "40-20", "intermittent", "template-marathon"]
  },
  {
    id: "TPL_MAR_SEUIL_INTRO",
    cat: "B",
    sport: "course",
    objectif: "Seuil anaérobie intro — 3x8' Z4. Confortablement dur",
    necessite: "Obligatoire",
    when: "Phase Seuil/VLaMax (S9-S10)",
    phase: ["build", "peak"],
    avoid: "Fatigue musculaire profonde",
    durationMin: [60, 75],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "3 x 8' Seuil (Z4) r:2'30. Allure 10km/15km", ["Z4"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      marathon: "3 x 8' → 3 x 10' → 3 x 15' (progression S9→S11)",
    },
    goals: GOALS_MAR,
    tags: ["seuil", "intro", "template-marathon", "phase3"]
  },
  {
    id: "TPL_MAR_SEUIL_JUGE",
    cat: "B",
    sport: "course",
    objectif: "LE SEUIL (Le Juge) — 3x15' Z4. 45min de TTE. Séance étalon marathon",
    necessite: "Obligatoire",
    when: "Phase Seuil (S11 — Pic de Charge)",
    phase: ["peak"],
    avoid: "Si seuil stressé 2x cette semaine déjà",
    durationMin: [70, 85],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "3 x 15' Seuil (Z4) r:3'. 45 min de temps de soutien", ["Z4"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      marathon: "3 x 15' Z4 — Limite d'accumulation lactate",
    },
    goals: GOALS_MAR,
    tags: ["seuil", "juge", "validation", "template-marathon", "pic-charge"]
  },
  {
    id: "TPL_MAR_TEMPO_SWEET_SPOT",
    cat: "B",
    sport: "course",
    objectif: "Tempo Sweet Spot — 2x15' → 2x20' Z3 (entre marathon et semi)",
    necessite: "Recommandé",
    when: "Phase Seuil/VLaMax (S9-S10)",
    phase: ["build", "peak"],
    avoid: "Veille séance seuil",
    durationMin: [60, 80],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "2 x 15-20' Tempo (Z3) r:4-5'. \"Je pourrais tenir ça longtemps\"", ["Z3"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      marathon: "2 x 15' → 2 x 20' → 3 x 20' (progression S9→S11)",
    },
    goals: GOALS_MAR,
    tags: ["tempo", "sweet-spot", "template-marathon", "phase3"]
  },
  {
    id: "TPL_MAR_TEMPO_XXL",
    cat: "B",
    sport: "course",
    objectif: "Tempo XXL — 3x20' Z3 (1h à allure marathon/semi). Test de confiance",
    necessite: "Recommandé",
    when: "Phase Seuil (S11 — Pic de Charge)",
    phase: ["peak"],
    avoid: "Si seuil stressé",
    durationMin: [80, 95],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "3 x 20' Tempo (Z3) r:5'. 1h totale à allure course", ["Z3"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      marathon: "3 x 20' Z3. Ça commence à ressembler au marathon",
    },
    goals: GOALS_MAR,
    tags: ["tempo", "xxl", "template-marathon", "pic-charge"]
  },
  {
    id: "TPL_MAR_SPECIFIQUE_3x3000_MP",
    cat: "B",
    sport: "course",
    objectif: "Spécifique marathon — 3x3000m à Allure Marathon (MP). Doit sembler trop facile",
    necessite: "Obligatoire",
    when: "Phase Spécifique (S13-S14)",
    phase: ["build"],
    avoid: "Partir trop vite",
    durationMin: [65, 80],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "3 x 3000m Allure Marathon (MP) r:3'. Strictement l'allure objectif", ["Z3", "Z4"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      marathon: "3 x 3000m MP → 3 x 4000m MP → 3 x 5000m MP (S13→S15)",
    },
    goals: GOALS_MAR,
    tags: ["spécifique", "marathon", "allure-course", "template-marathon", "phase4"]
  },
  {
    id: "TPL_MAR_BLOC_CONTINU_MP",
    cat: "B",
    sport: "course",
    objectif: "Bloc continu Allure Marathon — 40'-50'-60' à MP. Barrière mentale",
    necessite: "Obligatoire",
    when: "Phase Spécifique (S13-S15)",
    phase: ["build"],
    avoid: "Si allure trop haute (revoir objectif)",
    durationMin: [75, 100],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "40-60' Continu Allure Marathon (MP). Relâchement haut du corps", ["Z3", "Z4"]],
      ["Cool-down", "10-15' CD", ["Z1"]]
    ]),
    variants: {
      marathon: "40' → 50' → 60' (progression S13→S15)",
    },
    goals: GOALS_MAR,
    tags: ["spécifique", "continu", "marathon-pace", "template-marathon", "barrière-mentale"]
  },
  {
    id: "TPL_MAR_LACTATE_SHUFFLE",
    cat: "B",
    sport: "course",
    objectif: "Lactate Shuffle — 3x(10' MP + 5' Seuil). Produire du lactate et le digérer",
    necessite: "Recommandé",
    when: "Phase Affûtage (S18)",
    phase: ["peak"],
    avoid: "Fatigue chronique_V201",
    durationMin: [75, 90],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "3 x [10' Allure Marathon (MP) + 5' Seuil (Z4)] — Lactate ↑ (5') puis clearance à allure course (10')", ["Z3", "Z4"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      marathon: "3 x (10' MP + 5' Seuil). Neuro-plasticité lactate"
    },
    goals: GOALS_MAR,
    tags: ["lactate-shuffle", "marathon", "affûtage", "template-marathon", "clearance"]
  },
  {
    id: "TPL_MAR_SEUIL_OVERSPEED",
    cat: "B",
    sport: "course",
    objectif: "Seuil Overspeed — 5x2000m Z4 (allure semi/15km). Débrider le moteur",
    necessite: "Recommandé",
    when: "Phase Affûtage (S17)",
    phase: ["peak"],
    avoid: "Fatigue élevée_V202",
    durationMin: [65, 80],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "5 x 2000m SEUIL (Z4) r:2'. Plus vite que l'allure marathon", ["Z4"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      marathon: "5 x 2000m Z4. Allure semi/15km pour que MP semble lente"
    },
    goals: GOALS_MAR,
    tags: ["seuil", "overspeed", "affûtage", "template-marathon"]
  },
  {
    id: "TPL_MAR_SORTIE_ROYALE",
    cat: "A",
    sport: "course",
    objectif: "LA SORTIE ROYALE — Z2 + 60-75' à Allure Marathon. Test ultime",
    necessite: "Obligatoire",
    when: "Phase Affûtage (S19 — Pic Final)",
    phase: ["peak"],
    avoid: "Si blessé",
    durationMin: [135, 165],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20-30' Z2", ["Z2"]],
      ["Main", "60-75' à Allure Marathon (MP) ou 2x30'. Nutrition OBLIGATOIRE comme jour J", ["Z3", "Z4"]],
      ["Cool-down", "15-20' CD Z1", ["Z1"]]
    ]),
    variants: {
      marathon: "Test Ultime avant l'affûtage final"
    },
    goals: GOALS_MAR,
    tags: ["sortie-royale", "marathon", "validation", "template-marathon", "peak"]
  },
  {
    id: "TPL_MAR_LONGUE_PRE_FATIGUE",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue pré-fatigue — Z2 puis 30-45' MP en fin. Simulation km30→km40",
    necessite: "Obligatoire",
    when: "Phase Spécifique (S15)",
    phase: ["build"],
    avoid: "Douleur articulaire",
    durationMin: [130, 155],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "10' Z1", ["Z1"]],
      ["Main", "1h30 Z2 + 30-45' Allure Marathon à la fin. Simulation exacte du km30→km40", ["Z2", "Z3", "Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      marathon: "1h30 Z2 + 30-45' MP"
    },
    goals: GOALS_MAR,
    tags: ["longue", "pré-fatigue", "spécifique", "template-marathon"]
  },
  {
    id: "TPL_MAR_MIX_TEMPO_VITESSE",
    cat: "B",
    sport: "course",
    objectif: "Mix Tempo/Vitesse — 20' MP + 10x1' vite/lent. Neuro-plasticité sur pré-fatigue",
    necessite: "Recommandé",
    when: "Phase Affûtage (S17)",
    phase: ["peak"],
    avoid: "Fatigue nerveuse_V203",
    durationMin: [65, 80],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "20' Allure Marathon (MP) + 10 x 1' VITE / 1' LENT. Courir vite sur pré-fatigue", ["Z3", "Z4", "Z5"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      marathon: "20' MP + 10x1' vite/lent"
    },
    goals: GOALS_MAR,
    tags: ["mix", "tempo", "vitesse", "affûtage", "template-marathon"]
  },

  // =============================================
  // VÉLO — IRONMAN KONA TEMPLATE
  // =============================================
  {
    id: "TPL_IM_BIKE_PMA_4x4",
    cat: "B",
    sport: "cyclisme",
    objectif: "PMA blocs — 4-5x4' à 110-115% FTP. VO2max vélo spécifique",
    necessite: "Recommandé",
    when: "Phase Construction (S2-S7)",
    phase: ["build", "peak"],
    avoid: "Si VLamax haute et objectif IM longue distance",
    durationMin: [65, 80],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Warm-up", "20' progressif + 3x30\" Z5", ["Z1", "Z2", "Z5"]],
      ["Main", "4-5 x 4' à 110-115% FTP (Z5) R:4' Z1. Cumul 16-20 min zone rouge", ["Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      ironman: "4 x 4' à 110-115% FTP (S2) → 5 x 4' (S3) → 5 x 5' (S7)",
      half: "5 x 4' à 112-115% FTP",
    },
    goals: GOALS_TRI,
    tags: ["pma", "vo2max", "template-ironman", "phase1"]
  },
  {
    id: "TPL_IM_BIKE_PMA_30_30",
    cat: "B",
    sport: "cyclisme",
    objectif: "PMA intermittente — 30\"/30\" et 40\"/20\" à 120-130% FTP",
    necessite: "Recommandé",
    when: "Phase Construction (S2-S5)",
    phase: ["build", "peak"],
    avoid: "Si VLamax > 0.50",
    durationMin: [60, 75],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Warm-up", "20' progressif", ["Z1", "Z2"]],
      ["Main", "2 x (10 x 30\" à 120-130% / 30\" Z1) R:5' ou 3 x (6 x 40\" Z6 / 20\" Z1) R:5'", ["Z6", "Z1"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      ironman: "30/30 ou 40/20 à 120-130%",
      half: "3 x (8 x 30\"/30\") à 125%",
    },
    goals: GOALS_TRI,
    tags: ["pma", "intermittent", "30-30", "40-20", "template-ironman"]
  },
  {
    id: "TPL_IM_BIKE_PMA_PYRAMIDE",
    cat: "B",
    sport: "cyclisme",
    objectif: "PMA Pyramide — 3'-4'-5'-4'-3' à 110% FTP. Balayer toutes les zones VO2max",
    necessite: "Recommandé",
    when: "Phase Construction (S5-S6)",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée_V204",
    durationMin: [65, 80],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Warm-up", "20' progressif", ["Z1", "Z2"]],
      ["Main", "3'-4'-5'-4'-3' à 110% FTP (Z5). R:Temps effort", ["Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      ironman: "Pyramide 3-4-5-4-3 à 110%",
      half: "Pyramide 2-3-4-5-4-3-2 à 110-112%"
    },
    goals: GOALS_TRI,
    tags: ["pma", "pyramide", "template-ironman"]
  },
  {
    id: "TPL_IM_BIKE_FORCE_K3",
    cat: "C",
    sport: "cyclisme",
    objectif: "Force SubMax K3 — 3x15-20' à 50-55rpm Z3. Pédalage rond en force",
    necessite: "Recommandé",
    when: "Phase Construction & Diesel (S3-S11)",
    phase: ["base", "build"],
    avoid: "Douleur articulaire genoux (monter à 60rpm)",
    durationMin: [90, 135],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Warm-up", "20' progressif", ["Z1", "Z2"]],
      ["Main", "3 x 15-20' Force (50-55 rpm) Z3. R:5'. Pédalage rond obligatoire", ["Z3"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      ironman: "3 x 15' → 3 x 20' → 4 x 20' (progression)",
      half: "3 x 12-15' à 88-92% FTP 50-55rpm"
    },
    goals: GOALS_TRI,
    tags: ["force", "k3", "cadence-basse", "template-ironman"]
  },
  {
    id: "TPL_IM_BIKE_FOUNDATION_4H30",
    cat: "A",
    sport: "cyclisme",
    objectif: "Ironman Foundation — 4h30 Z2 + blocs Z3. Nutrition 90g glucides/h",
    necessite: "Obligatoire",
    when: "Phase Diesel (S9-S15)",
    phase: ["base", "build"],
    avoid: "Fatigue chronique_V205",
    durationMin: [240, 300],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Warm-up", "15' Z1→Z2", ["Z1", "Z2"]],
      ["Main", "4h Z2 avec 3 x 25-30' à 85% FTP (Z3). Position aéro stricte. Nutrition 90g/h", ["Z2", "Z3"]],
      ["Cool-down", "15' Z1", ["Z1"]]
    ]),
    variants: {
      ironman: "4h30 Z2 + 3x30' Z3. Aéro. 90g glucides/h MANDATOIRE"
    },
    goals: GOALS_IM,
    tags: ["endurance", "fondation", "ironman", "nutrition", "template-ironman"]
  },
  {
    id: "TPL_IM_BIKE_RACE_SIM_6H",
    cat: "A",
    sport: "cyclisme",
    objectif: "SIMULATION IRONMAN — 6h. 4h Allure IM stricte + 30' CAP enchaîné",
    necessite: "Obligatoire",
    when: "Phase Spécifique (S15 — Peak Week)",
    phase: ["build", "peak"],
    avoid: "Si malade ou blessé_V212",
    durationMin: [330, 390],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Warm-up", "15' progressif Z1→Z2", ["Z1", "Z2"]],
      ["Main", "4h00 à Allure IM Stricte (70-75% FTP). Tout équipement de course. Pacing constants", ["Z2", "Z3"]],
      ["Brick", "+30' CAP Z2/Z3 enchaîné immédiatement", ["Z2", "Z3"]]
    ]),
    variants: {
      ironman: "Simulation complète — nutrition/pacing/matériel race day"
    },
    goals: GOALS_IM,
    tags: ["simulation", "ironman", "peak", "brick", "template-ironman", "race-sim"]
  },
  {
    id: "TPL_IM_BIKE_SWEET_SPOT_VLaMax",
    cat: "B",
    sport: "cyclisme",
    objectif: "Sweet Spot VLaMax — 3x20' à 88-90% FTP 60-70rpm. Baisser glycolyse",
    necessite: "Recommandé",
    when: "Phase Spécifique (S17)",
    phase: ["build"],
    avoid: "Si FTP recently tested < 5 jours",
    durationMin: [100, 130],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Warm-up", "20' progressif", ["Z1", "Z2"]],
      ["Main", "3 x 20' Sweet Spot (88-90% FTP) à 60-70 RPM. Focus VLaMax ↓", ["Z3", "Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      ironman: "3 x 20' à 88-90% FTP. Cadence modérée",
    },
    goals: GOALS_TRI,
    tags: ["sweet-spot", "vlamax", "cadence", "template-ironman"]
  },
  {
    id: "TPL_IM_BIKE_IRONMAN_SANDWICH",
    cat: "A",
    sport: "cyclisme",
    objectif: "Ironman Sandwich — 5h30. 3x1h Allure IM + 30' CAP. Durabilité spécifique",
    necessite: "Obligatoire",
    when: "Phase Spécifique (S18)",
    phase: ["build"],
    avoid: "Immuno-dépression",
    durationMin: [300, 360],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Main", "3 x 1h00 Allure IM (75% FTP). Nutrition 90g/h. Arrêt solide après 3h", ["Z2", "Z3"]],
      ["Brick", "+30' CAP Z3 (Allure IM) enchaîné", ["Z3"]]
    ]),
    variants: {
      ironman: "5h30 total. Teste portion solide sur 1ère partie vélo"
    },
    goals: GOALS_IM,
    tags: ["endurance", "sandwich", "ironman", "durabilité", "template-ironman"]
  },

  // =============================================
  // VÉLO — IRONMAN 70.3 TEMPLATE
  // =============================================
  {
    id: "TPL_703_BIKE_OVERUNDER",
    cat: "B",
    sport: "cyclisme",
    objectif: "Over-Unders 70.3 — 3-4x12' (2' 90% / 1' 110%). Clearance lactate",
    necessite: "Recommandé",
    when: "Phase Affûtage (S17-S18)",
    phase: ["peak"],
    avoid: "Si crampes récurrentes_V206",
    durationMin: [75, 100],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Warm-up", "20' progressif", ["Z1", "Z2"]],
      ["Main", "3-4 x 12' (2' à 90% FTP / 1' à 110% FTP). Nettoyer le lactate", ["Z4", "Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      half: "3 x 12' → 4 x 12' (progression S17→S18)",
    },
    goals: GOALS_703,
    tags: ["over-under", "70.3", "affûtage", "template-703"]
  },
  {
    id: "TPL_703_BIKE_SWEET_SPOT_90RPM",
    cat: "B",
    sport: "cyclisme",
    objectif: "Sweet Spot cadence course — 3x15-20' à 88-92% FTP 90-95rpm",
    necessite: "Obligatoire",
    when: "Phase Spécifique (S9-S11)",
    phase: ["build"],
    avoid: "Si fatigue cardiaque",
    durationMin: [80, 120],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Warm-up", "20' progressif", ["Z1", "Z2"]],
      ["Main", "3 x 15-20' à 88-92% FTP. Cadence 90-95 RPM. Transfert cardio", ["Z3", "Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      half: "3 x 15' → 3 x 20' → 4 x 20' (progression S9→S11)"
    },
    goals: GOALS_703,
    tags: ["sweet-spot", "cadence-haute", "70.3", "template-703"]
  },
  {
    id: "TPL_703_BIKE_RACE_PACE_3x20",
    cat: "B",
    sport: "cyclisme",
    objectif: "Race Pace 70.3 — 3x20' à 80-85% FTP. Allure spécifique course",
    necessite: "Obligatoire",
    when: "Phase Spécifique (S9-S15)",
    phase: ["build"],
    avoid: "Fatigue chronique_V207",
    durationMin: [150, 200],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Warm-up", "15' progressif", ["Z1", "Z2"]],
      ["Main", "3 x 20-30' Allure 70.3 (80-85% FTP). Aéro stricte. Nutrition 70-80g/h", ["Z3"]],
      ["Cool-down", "15' Z1", ["Z1"]]
    ]),
    variants: {
      half: "3 x 20' → 2 x 30' → 2 x 40' (progression vers S15)"
    },
    goals: GOALS_703,
    tags: ["race-pace", "70.3", "spécifique", "template-703"]
  },
  {
    id: "TPL_703_BIKE_REPETITION_GENERALE",
    cat: "A",
    sport: "cyclisme",
    objectif: "RÉPÉTITION GÉNÉRALE 70.3 — 4h. 2h30 Allure 70.3 + 30-40' CAP",
    necessite: "Obligatoire",
    when: "Phase Spécifique (S15 — Peak Week) ou Affûtage (S19)",
    phase: ["build", "peak"],
    avoid: "Si malade_V211",
    durationMin: [240, 275],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Main", "2h30 Allure 70.3 (80-85% FTP) stricte", ["Z3"]],
      ["Brick", "+30-40' CAP Allure 70.3 enchaîné. Si tu tiens les watts mais exploses à pied → -10W", ["Z3", "Z4"]]
    ]),
    variants: {
      half: "Simulation complète. Valider nutrition/pacing/matériel"
    },
    goals: GOALS_703,
    tags: ["répétition-générale", "70.3", "simulation", "brick", "template-703", "peak"]
  },

  // =============================================
  // NATATION — TEMPLATES IRONMAN
  // =============================================
  {
    id: "TPL_SWIM_HYPOXIE",
    cat: "B",
    sport: "natation",
    objectif: "Hypoxie — blocs Z5 avec respiration restreinte (3/5/7 mouvements)",
    necessite: "Recommandé",
    when: "Phase Construction (S3-S7)",
    phase: ["build", "peak"],
    avoid: "Si vertige ou malaise",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "natation",
    structure: mkStructure([
      ["Warm-up", "400m facile + 4x50m éducatifs", ["Z1", "Z2"]],
      ["Main", "3 blocs de (6 x 75m) Z5. Respiration 3, puis 3/5, puis 5/7 mouvements", ["Z5"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: {
      ironman: "3 x (6 x 75m) Z5 avec hypoxie progressive",
      half: "3 x (5 x 75m) Z5"
    },
    goals: GOALS_TRI,
    tags: ["hypoxie", "respiration", "natation", "template-ironman"]
  },
  {
    id: "TPL_SWIM_FORCE_PLAQUETTES",
    cat: "C",
    sport: "natation",
    objectif: "Force spécifique natation — 3-4x800m Pull+Grosses Plaquettes Z3",
    necessite: "Recommandé",
    when: "Phase Diesel & Spécifique",
    phase: ["build"],
    avoid: "Épaules douloureuses_V208",
    durationMin: [55, 75],
    metricKey: "allure",
    sportKey: "natation",
    structure: mkStructure([
      ["Warm-up", "400m facile", ["Z1", "Z2"]],
      ["Main", "3-4 x 800m (Pull+Grosses Plaquettes) Z3. Chercher à attraper l'eau loin devant", ["Z3"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: {
      ironman: "4 x 800m Pull+Plaq Z3 soutenu",
      half: "3 x 800m Pull+Plaq Z3"
    },
    goals: GOALS_TRI,
    tags: ["force", "plaquettes", "natation", "template-ironman"]
  },
  {
    id: "TPL_SWIM_CSS_LONG_REPS",
    cat: "B",
    sport: "natation",
    objectif: "CSS Endurance longue — 6-8x300-400m à Allure CSS (Z4)",
    necessite: "Obligatoire",
    when: "Phase Construction → Spécifique",
    phase: ["build"],
    avoid: "Épaules fatiguées",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "natation",
    structure: mkStructure([
      ["Warm-up", "400m facile + éducatifs", ["Z1", "Z2"]],
      ["Main", "8 x 300m ou 6 x 400m Allure CSS (Z4) R:20-30\"", ["Z4"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: {
      ironman: "8 x 300m → 6 x 400m CSS",
      half: "6 x 300m CSS"
    },
    goals: GOALS_TRI,
    tags: ["css", "endurance", "longues-séries", "template-ironman"]
  },
  {
    id: "TPL_SWIM_SIMULATION_EAU_LIBRE",
    cat: "A",
    sport: "natation",
    objectif: "Simulation eau libre — 3000-3800m continu avec accélérations/polo",
    necessite: "Recommandé",
    when: "Phase Spécifique (S13-S18)",
    phase: ["build"],
    avoid: "Seul en eau libre (sécurité)",
    durationMin: [55, 75],
    metricKey: "allure",
    sportKey: "natation",
    structure: mkStructure([
      ["Main", "3000-3800m continu. 50m Polo toutes les 500m ou accélérer 20 coups toutes les 5'", ["Z2", "Z3"]]
    ]),
    variants: {
      ironman: "3800m chronométré d'une traite (simulation course)",
      half: "2000m continu avec changements rythme"
    },
    goals: GOALS_TRI,
    tags: ["eau-libre", "simulation", "continu", "template-ironman"]
  },

  // =============================================
  // COURSE — IRONMAN 70.3 TEMPLATE
  // =============================================
  {
    id: "TPL_703_RUN_TEMPO_2x20",
    cat: "B",
    sport: "course",
    objectif: "Tempo 70.3 — 2-3x15-20' Z4 (Allure 70.3). Métronome",
    necessite: "Obligatoire",
    when: "Phase Spécifique (S9-S14)",
    phase: ["build"],
    avoid: "Si allure dévisée = objectif trop haut",
    durationMin: [65, 85],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "2-3 x 15-20' Z4 (Allure 70.3) r:2-3'. Cadence 180spm", ["Z4"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      half: "2 x 20' → 3 x 15' → 3 x 20' (progression S9→S11)"
    },
    goals: GOALS_703,
    tags: ["tempo", "70.3", "allure-course", "template-703"]
  },
  {
    id: "TPL_703_RUN_VMA_1200",
    cat: "B",
    sport: "course",
    objectif: "VMA longue 1200m — 5x1200m allure 10km (Z4 haut). Overspeed",
    necessite: "Recommandé",
    when: "Phase Affûtage (S17)",
    phase: ["peak"],
    avoid: "Si douleur",
    durationMin: [65, 80],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU + éducatifs", ["Z1", "Z2"]],
      ["Main", "5 x 1200m Allure 10km (Z4 haut) R:2'. Débrider le moteur pour que 70.3 semble lent", ["Z4"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      half: "5 x 1200m Z4 haut"
    },
    goals: GOALS_703,
    tags: ["vma", "1200m", "overspeed", "affûtage", "template-703"]
  },

  // =============================================
  // COURSE — IRONMAN KONA TEMPLATE
  // =============================================
  {
    id: "TPL_IM_RUN_SEUIL_EXTENSIF",
    cat: "B",
    sport: "course",
    objectif: "Seuil extensif IM — 2-3x20' Z4a (Allure Marathon IM). Tempo longue distance",
    necessite: "Obligatoire",
    when: "Phase Diesel (S9-S11)",
    phase: ["build", "peak"],
    avoid: "Douleurs tendineuses_V209",
    durationMin: [70, 90],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "2-3 x 20' Z4a (Allure Marathon) R:3-4'. Minimiser dérive cardiaque", ["Z4"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      ironman: "3 x 12' → 2 x 20' → 3 x 20' (progression S9→S11)"
    },
    goals: GOALS_IM,
    tags: ["seuil", "extensif", "ironman", "marathon-pace", "template-ironman"]
  },
  {
    id: "TPL_IM_RUN_TEMPO_SPECIFIQUE",
    cat: "B",
    sport: "course",
    objectif: "Tempo IM spécifique — 3x15-25' Z3 haut/Z4a. Allure Ironman",
    necessite: "Obligatoire",
    when: "Phase Spécifique (S13-S18)",
    phase: ["build"],
    avoid: "Fatigue chronique_V210",
    durationMin: [80, 105],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "20' WU", ["Z1", "Z2"]],
      ["Main", "3 x 15-25' Z3 haut/Z4a (Allure IM) R:3-5'. Focus économie et régularité", ["Z3", "Z4"]],
      ["Cool-down", "10' CD", ["Z1"]]
    ]),
    variants: {
      ironman: "3 x 15' → 2 x 25' → 3 x 25' (progression S13→S18)"
    },
    goals: GOALS_IM,
    tags: ["tempo", "spécifique", "ironman", "allure-course", "template-ironman"]
  },
  {
    id: "TPL_IM_RUN_LONGUE_DURABILITE",
    cat: "A",
    sport: "course",
    objectif: "Longue durabilité IM — Z2 + 20-30' Z3 (Allure IM) en fin de sortie",
    necessite: "Obligatoire",
    when: "Phase Diesel & Spécifique (S9-S18)",
    phase: ["build"],
    avoid: "Si FC dérive >10 puls → marcher 1min",
    durationMin: [90, 135],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Main", "1h10-1h30 Z2 stable + 20-30' Z3 haut (Allure IM) en fin. Jambes en bois les 20 premières min", ["Z2", "Z3"]]
    ]),
    variants: {
      ironman: "1h10 Z2 + 20' Z3 → 1h20 Z2 + 30' Z3 (progression)"
    },
    goals: GOALS_IM,
    tags: ["longue", "durabilité", "ironman", "pré-fatigue", "template-ironman"]
  },
  {
    id: "TPL_IM_RUN_MARATHON_PRE_FATIGUE",
    cat: "A",
    sport: "course",
    objectif: "Marathon pré-fatigué — 2h15 Z2 stable. Après grosse sortie vélo",
    necessite: "Recommandé",
    when: "Phase Spécifique (S15 — Peak Week)",
    phase: ["build", "peak"],
    avoid: "Si malade",
    durationMin: [120, 145],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Main", "2h15 Z2 stable. À jeun/léger. Signaux: jambes en bois les 20 premières min = normal", ["Z2"]]
    ]),
    variants: {
      ironman: "2h15 Z2. Si FC dérive >10 → marche 1min"
    },
    goals: GOALS_IM,
    tags: ["marathon", "pré-fatigue", "peak", "template-ironman"]
  },

  // =============================================
  // BRIQUES SPÉCIFIQUES TEMPLATES
  // =============================================
  {
    id: "TPL_BRICK_IM_PROGRESSIVE",
    cat: "Brique",
    sport: "mixed",
    objectif: "Brique IM progressive — 2h30-3h Vélo Z2/Z3 + 20-30' CAP Z2/Z3",
    necessite: "Obligatoire",
    when: "Phase Construction → Spécifique",
    phase: ["build"],
    avoid: "Si malade ou blessé",
    durationMin: [170, 220],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Vélo", "2h30-3h15 Z2 (avec 3x10-30' Z3 selon phase). Position aéro", ["Z2", "Z3"]],
      ["Transition", "Enchaîner immédiatement", []],
      ["CAP", "20-30' CAP Z2/Z3. Adopter cadence 180spm immédiatement", ["Z2", "Z3"]]
    ]),
    variants: {
      ironman: "2h45 vélo (3x10' Z3) + 20' CAP Z2/Z3 (S2) → 3h15 (3x30' Tempo) + 30' CAP Z3 (S7)",
      half: "2h vélo Z2 + 20' CAP progressif"
    },
    goals: GOALS_TRI,
    tags: ["brique", "progressive", "ironman", "template-ironman"]
  },
  {
    id: "TPL_BRICK_703_RYTHME",
    cat: "Brique",
    sport: "mixed",
    objectif: "Brique 70.3 Rythme — 3h-3h30 Vélo + 20-30' CAP Z4",
    necessite: "Obligatoire",
    when: "Phase Force & Spécifique (S5-S15)",
    phase: ["build"],
    avoid: "Surcharge_V213",
    durationMin: [200, 260],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([
      ["Vélo", "3h-3h30. Tempo blocs (3x20-25' à 80-85% FTP)", ["Z2", "Z3"]],
      ["Transition", "Enchaîner", []],
      ["CAP", "20-30' (15-20' Z4 Allure 70.3). Trouver allure dès 500m", ["Z3", "Z4"]]
    ]),
    variants: {
      half: "3h vélo (2x20' Tempo) + 20' CAP Z4 (S5) → 3h45 (3x25') + 30' Z4 (S7)"
    },
    goals: GOALS_703,
    tags: ["brique", "rythme", "70.3", "template-703"]
  },

  // =============================================
  // RENFORCEMENT — TEMPLATES MARATHON
  // =============================================
  {
    id: "TPL_MAR_RENFO_LOURD",
    cat: "C",
    sport: "strength",
    objectif: "Force lourde marathon — Squat, Fentes, Deadlift (8-10 réps). Muscle fort = muscle économe",
    necessite: "Recommandé",
    when: "Phase Construction → Seuil (S1-S11)",
    phase: ["base", "build"],
    avoid: "Veille séance clé",
    durationMin: [40, 50],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([
      ["Main", "Squats + Fentes + Deadlift (séries 8-10 réps). Phase excentrique contrôlée", []]
    ]),
    variants: {
      marathon: "S1-S4: Force Max. S5-S8: +Pliométrie. S9-S11: Phase excentrique 3s"
    },
    goals: GOALS_MAR,
    tags: ["renforcement", "force-lourde", "marathon", "template-marathon"]
  },
  {
    id: "TPL_MAR_RENFO_EXPLOSIF",
    cat: "C",
    sport: "strength",
    objectif: "Renforcement explosif — charges légères remontée dynamique + pliométrie",
    necessite: "Recommandé",
    when: "Phase Affûtage (S17-S19)",
    phase: ["peak"],
    avoid: "Après S19",
    durationMin: [35, 45],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([
      ["Main", "Charges légères remontée dynamique + Pliométrie basse (corde à sauter). Garder le ressort", []]
    ]),
    variants: {
      marathon: "S17: Explosif + Plyo. S19: STOP MUSCU LOURDE, activation/équilibre uniquement"
    },
    goals: GOALS_MAR,
    tags: ["renforcement", "explosif", "affûtage", "template-marathon"]
  },
];
