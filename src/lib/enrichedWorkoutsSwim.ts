// =============================================
// ENRICHED WORKOUTS — SWIMMING SUPPLEMENT
// 18 séances natation supplémentaires pour combler le ratio course/natation
// =============================================

import { LibraryWorkout, WorkoutGoal } from "@/types/workoutLibrary";

const GOALS_TRI: WorkoutGoal[] = ["ironman", "half"];
const GOALS_ALL: WorkoutGoal[] = ["ironman", "half", "marathon", "semi", "10k"];

function mk(parts: [string, string, string[]][]) {
  return parts.map(([part, text, zones]) => ({ part, text, zones }));
}

export const EnrichedWorkoutsSwim: LibraryWorkout[] = [

  // ── A – ENDURANCE NATATION ──
  {
    id: "A_SWIM_CONTINUOUS_2K",
    cat: "A", sport: "natation",
    objectif: "Nage continue 2000m — endurance aérobie, régularité allure",
    necessite: "Obligatoire",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Si technique se dégrade après 1000m",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile multi-nages", ["Z1"]],
      ["Main", "2000m continu Z2 (splits réguliers, focus respiration bilatérale)", ["Z2"]],
      ["Cool-down", "200m dos facile", ["Z1"]]
    ]),
    variants: { ironman: "Augmenter à 3000m", half: "2000m standard" },
    goals: GOALS_TRI,
    tags: ["endurance", "natation", "continu"]
  },
  {
    id: "A_SWIM_PULL_ENDURANCE",
    cat: "A", sport: "natation",
    objectif: "Endurance pull buoy — force propulsion bras, position corps",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Douleur épaule",
    durationMin: [35, 50],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m facile + 4x50m éducatifs", ["Z1", "Z2"]],
      ["Main", "8x200m pull buoy Z2 r=20\" (focus catch et glisse)", ["Z2"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "10x200m", half: "8x200m" },
    goals: GOALS_TRI,
    tags: ["endurance", "natation", "pull-buoy"]
  },
  {
    id: "A_SWIM_PADDLES_Z2",
    cat: "A", sport: "natation",
    objectif: "Endurance plaquettes — force spécifique traction, résistance eau",
    necessite: "Optionnel",
    when: "Build",
    phase: ["build"],
    avoid: "Tendinite épaule, débutant",
    durationMin: [35, 50],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile", ["Z1"]],
      ["Main", "6x200m plaquettes Z2 r=20\" + 4x100m sans plaquettes Z2 r=15\"", ["Z2"]],
      ["Cool-down", "200m dos facile", ["Z1"]]
    ]),
    variants: { ironman: "8x200m plaquettes", half: "6x200m" },
    goals: GOALS_TRI,
    tags: ["endurance", "natation", "paddles", "force"]
  },

  // ── B – INTENSITÉ NATATION ──
  {
    id: "B_SWIM_CSS_8x200",
    cat: "B", sport: "natation",
    objectif: "Seuil CSS — 8x200m au seuil critique de nage",
    necessite: "Obligatoire",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Si CSS non testé récemment",
    durationMin: [45, 60],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 4x50m progressifs", ["Z1", "Z2"]],
      ["Main", "8x200m CSS (allure seuil) r=20-30\"", ["Z4"]],
      ["Cool-down", "300m facile", ["Z1"]]
    ]),
    variants: { ironman: "8x200m", half: "6x200m + 4x100m rapide" },
    goals: GOALS_TRI,
    tags: ["css", "seuil", "natation", "threshold"]
  },
  {
    id: "B_SWIM_CSS_PYRAMID",
    cat: "B", sport: "natation",
    objectif: "Pyramide CSS — variation distance au seuil pour stimulus cognitif",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Si allure CSS instable",
    durationMin: [45, 60],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 6x50m éducatifs", ["Z1", "Z2"]],
      ["Main", "200-300-400-300-200m CSS r=15-30\" (total 1400m au seuil)", ["Z4"]],
      ["Cool-down", "300m facile", ["Z1"]]
    ]),
    variants: { ironman: "Ajouter 400m central", half: "Standard" },
    goals: GOALS_TRI,
    tags: ["css", "pyramide", "natation"]
  },
  {
    id: "B_SWIM_VO2_100",
    cat: "B", sport: "natation",
    objectif: "VO2max natation — 10x100m efforts max contrôlés",
    necessite: "Recommandé",
    when: "Peak",
    phase: ["peak"],
    avoid: "Fatigue épaules, technique dégradée",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 4x50m build-up", ["Z1", "Z2"]],
      ["Main", "10x100m Z5 (90-95% effort) r=30\"", ["Z5"]],
      ["Cool-down", "300m facile", ["Z1"]]
    ]),
    variants: { ironman: "8x100m suffisant", half: "10x100m" },
    goals: GOALS_TRI,
    tags: ["vo2max", "natation", "haute-intensité"]
  },
  {
    id: "B_SWIM_DESCENDING_400",
    cat: "B", sport: "natation",
    objectif: "Série descendante 400m — negative split, gestion allure",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Si CSS non maîtrisé",
    durationMin: [45, 60],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 4x50m progressifs", ["Z1", "Z2"]],
      ["Main", "4x400m descendant (Z2→Z3→Z4→sub-CSS) r=30-45\"", ["Z2", "Z3", "Z4"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "4x400m", half: "3x400m + 4x100m rapide" },
    goals: GOALS_TRI,
    tags: ["descending", "natation", "gestion-allure"]
  },
  {
    id: "B_SWIM_BROKEN_1500",
    cat: "B", sport: "natation",
    objectif: "1500m cassé — simulation distance race avec micro-repos",
    necessite: "Recommandé",
    when: "Peak",
    phase: ["peak"],
    avoid: "Fatigue générale",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 4x50m build-up", ["Z1", "Z2"]],
      ["Main", "1500m cassé: 5x300m CSS-5\" r=10\" (total sous allure race)", ["Z4"]],
      ["Cool-down", "300m facile", ["Z1"]]
    ]),
    variants: { ironman: "2x1500m cassé r=2'", half: "1x1500m cassé" },
    goals: GOALS_TRI,
    tags: ["broken", "race-sim", "natation"]
  },

  // ── C – TECHNIQUE NATATION ──
  {
    id: "C_SWIM_CATCH_FOCUS",
    cat: "C", sport: "natation",
    objectif: "Technique catch — amélioration prise d'eau et phase propulsive",
    necessite: "Obligatoire",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "N/A",
    durationMin: [35, 50],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m facile", ["Z1"]],
      ["Main", "8x50m scull avant r=15\" + 8x50m catch-up drill r=15\" + 6x100m Z2 focus catch", ["Z1", "Z2"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "Prioritaire", half: "Prioritaire" },
    goals: GOALS_TRI,
    tags: ["technique", "natation", "catch", "éducatifs"]
  },
  {
    id: "C_SWIM_BILATERAL_BREATH",
    cat: "C", sport: "natation",
    objectif: "Respiration bilatérale — équilibre nage, réduction traînée",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Débutant total (apprendre respiration unilat d'abord)",
    durationMin: [30, 45],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m facile respiration libre", ["Z1"]],
      ["Main", "4x200m respiration bilatérale (3 temps) Z2 r=20\" + 4x100m respiration 5 temps Z2 r=15\"", ["Z2"]],
      ["Cool-down", "200m dos facile", ["Z1"]]
    ]),
    variants: { ironman: "Fondamental", half: "Fondamental" },
    goals: GOALS_TRI,
    tags: ["technique", "natation", "respiration"]
  },
  {
    id: "C_SWIM_KICK_SET",
    cat: "C", sport: "natation",
    objectif: "Battement de jambes — propulsion jambes, position corps, gainage",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Si crampes récurrentes",
    durationMin: [30, 45],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m facile", ["Z1"]],
      ["Main", "8x50m kick planche Z2 r=15\" + 4x100m nage complète focus battement Z2 r=15\" + 4x50m kick sans planche Z3 r=20\"", ["Z2", "Z3"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "Kick léger triathlon (économie)", half: "Standard" },
    goals: GOALS_TRI,
    tags: ["technique", "natation", "kick", "battement"]
  },
  {
    id: "C_SWIM_OPEN_WATER_SKILLS",
    cat: "C", sport: "natation",
    objectif: "Compétences eau libre — navigation, drafting, départ groupé",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Piscine uniquement si pas d'accès eau libre",
    durationMin: [35, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile", ["Z1"]],
      ["Main", "4x50m sighting drill (relever tête) r=10\" + 6x100m Z3 départ arrêté r=15\" + 2x400m Z2 en peloton simulé", ["Z2", "Z3"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "Focus drafting longue distance", half: "Focus départs rapides" },
    goals: GOALS_TRI,
    tags: ["technique", "natation", "eau-libre", "open-water"]
  },
  {
    id: "C_SWIM_TURNS_STARTS",
    cat: "C", sport: "natation",
    objectif: "Virages et coulées — efficacité virages, poussée murale, coulées",
    necessite: "Optionnel",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "N/A",
    durationMin: [30, 45],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m facile", ["Z1"]],
      ["Main", "10x50m focus virage explosif + coulée longue r=20\" + 4x100m Z2 comptage coups de bras r=15\"", ["Z1", "Z2"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "Optionnel (eau libre)", half: "Utile piscine" },
    goals: GOALS_TRI,
    tags: ["technique", "natation", "virages"]
  },

  // ── NATATION SPÉCIFIQUE TRIATHLON ──
  {
    id: "B_SWIM_RACE_SIM_IM",
    cat: "B", sport: "natation",
    objectif: "Simulation course IM — 3800m allure race avec nutrition pré-vélo",
    necessite: "Recommandé",
    when: "Peak",
    phase: ["peak"],
    avoid: "Si pas encore en forme course",
    durationMin: [55, 75],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile progressif", ["Z1", "Z2"]],
      ["Main", "3800m allure race: 400m Z3 (départ) + 3000m Z2-Z3 + 400m Z3 (finish)", ["Z2", "Z3"]],
      ["Cool-down", "200m facile + transition mentale vélo", ["Z1"]]
    ]),
    variants: { ironman: "Séance clé", half: "1900m race sim" },
    goals: ["ironman"],
    tags: ["race-sim", "natation", "ironman", "spécifique"]
  },
  {
    id: "B_SWIM_RACE_SIM_703",
    cat: "B", sport: "natation",
    objectif: "Simulation course 70.3 — 1900m allure race, transition mentale",
    necessite: "Recommandé",
    when: "Peak",
    phase: ["peak"],
    avoid: "Si pas en forme course",
    durationMin: [35, 50],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile", ["Z1"]],
      ["Main", "1900m allure race: 200m Z3 (départ rapide) + 1500m Z3 (steady) + 200m Z3-Z4 (finish)", ["Z3", "Z4"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "Adaptation 3800m", half: "Séance clé" },
    goals: ["half"],
    tags: ["race-sim", "natation", "70.3", "spécifique"]
  },

  // ── ENDURANCE LONGUE NATATION ──
  {
    id: "A_SWIM_LONG_3K",
    cat: "A", sport: "natation",
    objectif: "Sortie longue natation 3000m+ — endurance spécifique IM",
    necessite: "Recommandé",
    when: "Build/Peak IM",
    phase: ["build", "peak"],
    avoid: "Si épaules fatigues > 7/10",
    durationMin: [55, 75],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile multi-nages", ["Z1"]],
      ["Main", "3000m: 10x300m Z2 r=15\" (régularité stricte)", ["Z2"]],
      ["Cool-down", "300m facile dos", ["Z1"]]
    ]),
    variants: { ironman: "Augmenter à 4000m", half: "2400m suffisant" },
    goals: GOALS_TRI,
    tags: ["endurance", "natation", "longue-distance"]
  },
  {
    id: "B_SWIM_MIXED_SET",
    cat: "B", sport: "natation",
    objectif: "Séance mixte — alternance endurance et seuil, polyvalence",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Fatigue épaules",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 4x50m éducatifs", ["Z1", "Z2"]],
      ["Main", "4x(200m Z2 + 100m Z4) r=15-20\" (total 1200m mixte)", ["Z2", "Z4"]],
      ["Cool-down", "300m facile", ["Z1"]]
    ]),
    variants: { ironman: "5x(200+100)", half: "4x(200+100)" },
    goals: GOALS_TRI,
    tags: ["mixte", "natation", "polyvalence"]
  },
];
