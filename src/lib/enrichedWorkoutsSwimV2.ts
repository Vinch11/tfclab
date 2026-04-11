// =============================================
// ENRICHED WORKOUTS — SWIMMING V2
// 18 séances natation supplémentaires (sprint, lactate, fartlek, récup, spécifique)
// =============================================

import { LibraryWorkout, WorkoutGoal } from "@/types/workoutLibrary";

const GOALS_TRI: WorkoutGoal[] = ["ironman", "half"];
const GOALS_ALL: WorkoutGoal[] = ["ironman", "half", "marathon", "semi", "10k"];

function mk(parts: [string, string, string[]][]) {
  return parts.map(([part, text, zones]) => ({ part, text, zones }));
}

export const EnrichedWorkoutsSwimV2: LibraryWorkout[] = [

  // ── SPRINT & LACTATE TOLERANCE ──
  {
    id: "B_SWIM_SPRINT_25s",
    cat: "B", sport: "natation",
    objectif: "Sprint 25m — vitesse max, recrutement neuromusculaire",
    necessite: "Recommandé",
    when: "Peak",
    phase: ["peak"],
    avoid: "Fatigue épaules, débutant",
    durationMin: [30, 45],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 4x50m progressifs", ["Z1", "Z2"]],
      ["Main", "12x25m sprint MAX r=45\" + 4x50m facile récup", ["Z5"]],
      ["Cool-down", "300m facile dos", ["Z1"]]
    ]),
    variants: { ironman: "8x25m suffisant", half: "12x25m" },
    goals: GOALS_TRI,
    tags: ["sprint", "natation", "vitesse", "neuromusculaire"]
  },
  {
    id: "B_SWIM_LACTATE_50s",
    cat: "B", sport: "natation",
    objectif: "Tolérance lactique — 8x50m haute intensité, récup courte",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Technique dégradée, débutant",
    durationMin: [35, 50],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 6x50m progressifs", ["Z1", "Z2"]],
      ["Main", "3x(8x50m Z5 r=15\") macro-r=1'30\"", ["Z5"]],
      ["Cool-down", "300m facile", ["Z1"]]
    ]),
    variants: { ironman: "2 séries suffisantes", half: "3 séries" },
    goals: GOALS_TRI,
    tags: ["lactate", "natation", "haute-intensité", "tolérance"]
  },
  {
    id: "B_SWIM_200_BEST_EFFORT",
    cat: "B", sport: "natation",
    objectif: "4x200m best effort — capacité anaérobie, negative split",
    necessite: "Recommandé",
    when: "Peak",
    phase: ["peak"],
    avoid: "Fatigue cumulée",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 4x50m build-up", ["Z1", "Z2"]],
      ["Main", "4x200m best effort (negative split obligatoire) r=1'30\"", ["Z4", "Z5"]],
      ["Cool-down", "400m facile", ["Z1"]]
    ]),
    variants: { ironman: "3x200m", half: "4x200m" },
    goals: GOALS_TRI,
    tags: ["best-effort", "natation", "anaérobie"]
  },

  // ── FARTLEK & VARIÉTÉ ──
  {
    id: "B_SWIM_FARTLEK_MIX",
    cat: "B", sport: "natation",
    objectif: "Fartlek aquatique — alternance rapide/lent, adaptabilité allure",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "N/A",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m facile + 4x50m éducatifs", ["Z1"]],
      ["Main", "2000m fartlek: alterner 50m rapide Z4 / 50m facile Z1 en continu", ["Z1", "Z4"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "2500m fartlek", half: "2000m fartlek" },
    goals: GOALS_TRI,
    tags: ["fartlek", "natation", "variété", "allure"]
  },
  {
    id: "B_SWIM_NEGATIVE_SPLIT_1K",
    cat: "B", sport: "natation",
    objectif: "Negative split 2x1000m — gestion d'effort, finish fort",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Si CSS non maîtrisé",
    durationMin: [45, 60],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile", ["Z1"]],
      ["Main", "2x1000m negative split (500m Z2 → 500m Z3-Z4) r=1'", ["Z2", "Z3", "Z4"]],
      ["Cool-down", "300m facile dos", ["Z1"]]
    ]),
    variants: { ironman: "2x1500m", half: "2x1000m" },
    goals: GOALS_TRI,
    tags: ["negative-split", "natation", "gestion-effort"]
  },
  {
    id: "B_SWIM_LADDER_50_400",
    cat: "B", sport: "natation",
    objectif: "Échelle montante-descendante — polyvalence distances, stimulus varié",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "N/A",
    durationMin: [45, 60],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 4x50m progressifs", ["Z1", "Z2"]],
      ["Main", "50-100-200-400-200-100-50m Z3-Z4 r=15-30\" (total 1100m)", ["Z3", "Z4"]],
      ["Cool-down", "300m facile", ["Z1"]]
    ]),
    variants: { ironman: "Doubler la série", half: "1 série standard" },
    goals: GOALS_TRI,
    tags: ["ladder", "natation", "polyvalence"]
  },

  // ── ENDURANCE SPÉCIFIQUE ──
  {
    id: "A_SWIM_TEMPO_1500",
    cat: "A", sport: "natation",
    objectif: "Tempo natation — 1500m allure tempo (CSS+5\"), régularité",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Si technique dégradée",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile multi-nages", ["Z1"]],
      ["Main", "3x500m tempo (CSS+5\") r=20\" — splits réguliers", ["Z3"]],
      ["Cool-down", "200m facile dos", ["Z1"]]
    ]),
    variants: { ironman: "3x600m", half: "3x500m" },
    goals: GOALS_TRI,
    tags: ["tempo", "natation", "endurance"]
  },
  {
    id: "A_SWIM_AEROBIC_MULTI_NAGES",
    cat: "A", sport: "natation",
    objectif: "Multi-nages aérobie — endurance globale, équilibre musculaire",
    necessite: "Optionnel",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Débutant (maîtriser crawl d'abord)",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "200m facile", ["Z1"]],
      ["Main", "8x(100m crawl + 50m dos + 50m brasse) Z2 r=15\"", ["Z2"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "10 séries", half: "8 séries" },
    goals: GOALS_TRI,
    tags: ["multi-nages", "natation", "aérobie", "variété"]
  },
  {
    id: "A_SWIM_PROGRESSIVE_2K",
    cat: "A", sport: "natation",
    objectif: "Progressif 2000m — montée en allure contrôlée sur longue distance",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "N/A",
    durationMin: [45, 60],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile", ["Z1"]],
      ["Main", "2000m progressif: 500m Z1 → 500m Z2 → 500m Z3 → 500m Z3+", ["Z1", "Z2", "Z3"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "3000m progressif", half: "2000m" },
    goals: GOALS_TRI,
    tags: ["progressif", "natation", "endurance"]
  },

  // ── RÉCUPÉRATION ACTIVE NATATION ──
  {
    id: "D_SWIM_RECOVERY_EASY",
    cat: "D", sport: "natation",
    objectif: "Récup active natation — flush lactates, mobilité épaules",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [20, 30],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "200m facile multi-nages", ["Z1"]],
      ["Main", "800m facile: 200m crawl + 200m dos + 200m brasse + 200m au choix (tout Z1)", ["Z1"]],
      ["Cool-down", "200m dos très facile + étirements bord bassin", ["Z1"]]
    ]),
    variants: { ironman: "1200m", half: "800m" },
    goals: GOALS_ALL,
    tags: ["récupération", "natation", "facile", "flush"]
  },
  {
    id: "D_SWIM_TECHNIQUE_LIGHT",
    cat: "D", sport: "natation",
    objectif: "Technique légère — éducatifs sans fatigue, travail proprioceptif",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [25, 35],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "200m facile", ["Z1"]],
      ["Main", "6x50m rattrapé r=15\" + 6x50m doigts-traînés r=15\" + 4x50m poing fermé r=15\" + 4x100m Z1 focus glisse", ["Z1"]],
      ["Cool-down", "200m dos facile", ["Z1"]]
    ]),
    variants: { ironman: "Standard", half: "Standard" },
    goals: GOALS_ALL,
    tags: ["technique", "natation", "récupération", "éducatifs"]
  },

  // ── FORCE SPÉCIFIQUE NATATION ──
  {
    id: "B_SWIM_FORCE_PADDLES_BAND",
    cat: "B", sport: "natation",
    objectif: "Force plaquettes + élastique — résistance propulsion, puissance traction",
    necessite: "Optionnel",
    when: "Build",
    phase: ["build"],
    avoid: "Tendinite épaule, débutant",
    durationMin: [35, 50],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 4x50m éducatifs", ["Z1"]],
      ["Main", "6x100m plaquettes + élastique chevilles Z3 r=20\" + 4x100m nage libre sans matériel Z3 r=15\"", ["Z3"]],
      ["Cool-down", "300m facile dos", ["Z1"]]
    ]),
    variants: { ironman: "8x100m plaquettes", half: "6x100m" },
    goals: GOALS_TRI,
    tags: ["force", "natation", "plaquettes", "résistance"]
  },
  {
    id: "A_SWIM_PULL_LONG_DISTANCE",
    cat: "A", sport: "natation",
    objectif: "Pull buoy longue distance — endurance bras, économie de nage",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Douleur épaule",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m facile + 4x50m éducatifs", ["Z1"]],
      ["Main", "2000m continu pull buoy Z2 — focus rotation hanches et catch", ["Z2"]],
      ["Cool-down", "200m facile sans pull buoy", ["Z1"]]
    ]),
    variants: { ironman: "2500m pull", half: "2000m pull" },
    goals: GOALS_TRI,
    tags: ["pull-buoy", "natation", "endurance", "longue-distance"]
  },

  // ── TAPER & PRÉ-COURSE ──
  {
    id: "D_SWIM_TAPER_ACTIVATION",
    cat: "D", sport: "natation",
    objectif: "Activation pré-course — maintien feeling sans fatigue",
    necessite: "Recommandé",
    when: "Taper/Race week",
    phase: ["taper"],
    avoid: "N/A",
    durationMin: [20, 30],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m facile multi-nages", ["Z1"]],
      ["Main", "4x50m progressif (Z1→Z4) r=20\" + 2x100m allure race r=30\" + 200m Z1", ["Z1", "Z3", "Z4"]],
      ["Cool-down", "200m dos très facile", ["Z1"]]
    ]),
    variants: { ironman: "Standard", half: "Standard" },
    goals: GOALS_TRI,
    tags: ["taper", "natation", "activation", "pré-course"]
  },
  {
    id: "D_SWIM_RACE_REHEARSAL",
    cat: "D", sport: "natation",
    objectif: "Répétition générale — 800m allure race, routine pré-compétition",
    necessite: "Recommandé",
    when: "Race week",
    phase: ["taper"],
    avoid: "Pas la veille de course",
    durationMin: [25, 35],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile avec 4x25m accélérations", ["Z1", "Z2"]],
      ["Main", "800m allure race (focus sighting toutes les 8 longueurs) + 200m Z1", ["Z3"]],
      ["Cool-down", "200m facile + visualisation mentale", ["Z1"]]
    ]),
    variants: { ironman: "1200m race pace", half: "800m race pace" },
    goals: GOALS_TRI,
    tags: ["race-rehearsal", "natation", "pré-course", "visualisation"]
  },

  // ── SEUIL SPÉCIFIQUE ──
  {
    id: "B_SWIM_CSS_SHORT_REST",
    cat: "B", sport: "natation",
    objectif: "CSS repos courts — 12x100m seuil, tolérance fatigue accumulée",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "CSS non testé",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 4x50m progressifs", ["Z1", "Z2"]],
      ["Main", "12x100m CSS r=10\" (repos volontairement courts)", ["Z4"]],
      ["Cool-down", "300m facile", ["Z1"]]
    ]),
    variants: { ironman: "12x100m", half: "10x100m" },
    goals: GOALS_TRI,
    tags: ["css", "natation", "seuil", "repos-courts"]
  },
  {
    id: "B_SWIM_THRESHOLD_400_200",
    cat: "B", sport: "natation",
    objectif: "Seuil mixte 400/200 — alternance distances au seuil, résistance mentale",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Si technique dégradée à haute intensité",
    durationMin: [45, 60],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 6x50m éducatifs", ["Z1", "Z2"]],
      ["Main", "2x(400m CSS r=20\" + 2x200m CSS r=15\") macro-r=1'", ["Z4"]],
      ["Cool-down", "300m facile", ["Z1"]]
    ]),
    variants: { ironman: "3 séries", half: "2 séries" },
    goals: GOALS_TRI,
    tags: ["seuil", "natation", "css", "mixte"]
  },
  {
    id: "A_SWIM_STEADY_STATE_2500",
    cat: "A", sport: "natation",
    objectif: "Steady state 2500m — allure constante sub-CSS, endurance spécifique",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Si épaules fatiguées > 7/10",
    durationMin: [50, 65],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile multi-nages", ["Z1"]],
      ["Main", "2500m steady state Z3 (CSS+5-10\") — splits vérifiés chaque 500m", ["Z3"]],
      ["Cool-down", "300m facile dos", ["Z1"]]
    ]),
    variants: { ironman: "3500m steady", half: "2500m" },
    goals: GOALS_TRI,
    tags: ["steady-state", "natation", "endurance", "sub-css"]
  },
];
