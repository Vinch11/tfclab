// =============================================
// BIBLIOTHÈQUE ENRICHIE — FATMAX & OXYDATION LIPIDIQUE
// ~18 séances dédiées FatMax : Z2 à jeun, fat oxidation,
// gut training progressif, déplétion glycogénique, sleep low
// =============================================

import { LibraryWorkout, WorkoutGoal } from "@/types/workoutLibrary";

const GOALS_TRI: WorkoutGoal[] = ["ironman", "half"];
const GOALS_LD: WorkoutGoal[] = ["ironman", "half", "marathon", "trail_ultra", "trail_mountain"];
const GOALS_ALL_ENDURANCE: WorkoutGoal[] = ["ironman", "half", "marathon", "semi", "trail_short", "trail_mountain", "trail_ultra"];

function mk(parts: [string, string, string[]][]) {
  return parts.map(([part, text, zones]) => ({ part, text, zones }));
}

// =============================================
// 1. VÉLO — FAT OXIDATION SPÉCIFIQUE
// =============================================
const BIKE_FATMAX: LibraryWorkout[] = [
  {
    id: "FM_BIKE_FATMAX_PROGRESSIVE",
    cat: "A", sport: "cyclisme",
    objectif: "FatMax progressif — Z2 bas avec montée progressive vers plafond FatMax (65→75% FTP). Oxydation lipidique maximale",
    necessite: "Recommandé",
    when: "Base/Build, 1-2x/sem",
    phase: ["base", "build"],
    avoid: "Veille de séance clé, fatigue >7/10",
    durationMin: [120, 180],
    metricKey: "puissance",
    sportKey: "Vélo",
    structure: mk([
      ["Warm-up", "15' Z1 cadence libre, réveil musculaire progressif", ["Z1"]],
      ["Main", "Phase 1 : 45' à 65% FTP (zone FatMax basse). Phase 2 : 30' à 70% FTP (zone FatMax médiane). Phase 3 : 30' à 75% FTP (plafond FatMax). Hydratation eau + électrolytes uniquement. Observer la fréquence cardiaque : le drift doit rester <5%", ["Z2"]],
      ["Cool-down", "10' Z1 souple, étirements légers", ["Z1"]]
    ]),
    variants: { ironman: "3h avec P3 à 75% FTP 45'", half: "2h sans P3" },
    goals: GOALS_LD,
    tags: ["fatmax", "oxydation-lipidique", "progressif", "Z2-ciblé"]
  },
  {
    id: "FM_BIKE_GLYCOGEN_DEPLETION",
    cat: "A", sport: "cyclisme",
    objectif: "Déplétion glycogénique ciblée — Z2-Z3 mixte 2h30+. Épuiser les réserves pour forcer l'oxydation lipidique",
    necessite: "Recommandé",
    when: "Build (1x/2 semaines max)",
    phase: ["build"],
    avoid: "Avant séance clé, athlète non habitué au train low",
    durationMin: [140, 200],
    metricKey: "puissance",
    sportKey: "Vélo",
    structure: mk([
      ["Warm-up", "15' Z1 progressif", ["Z1"]],
      ["Main", "30' Z2 (70% FTP) + 15' Z3 bas (78% FTP) + 30' Z2 + 15' Z3 + 30' Z2. Pas de glucides pendant les 90 premières minutes. Après 90' : 30g/h glucides max si nécessaire. Objectif : vider les réserves de glycogène musculaire pour stimuler les adaptations lipidiques", ["Z2", "Z3"]],
      ["Cool-down", "10' Z1. Recharger glucides dans les 30min post (1.2g/kg glucides + 0.4g/kg protéines)", ["Z1"]]
    ]),
    variants: { ironman: "3h+ avec 3 blocs Z3", half: "2h20 avec 2 blocs Z3" },
    goals: GOALS_LD,
    tags: ["fatmax", "déplétion", "glycogène", "oxydation-lipidique", "métabolique"]
  },
  {
    id: "FM_BIKE_SLEEP_LOW_AM",
    cat: "A", sport: "cyclisme",
    objectif: "Sleep Low → Ride AM — Vélo Z2 matinal après soirée sans glucides post-HIT. Adaptation mitochondriale maximale (Marquet 2016)",
    necessite: "Recommandé",
    when: "Base/Build (1x/sem max, veille = HIT soir sans recharge)",
    phase: ["base", "build"],
    avoid: "Plus de 1x/sem, femmes en phase folliculaire haute, période de compétition",
    durationMin: [60, 100],
    metricKey: "puissance",
    sportKey: "Vélo",
    structure: mk([
      ["Warm-up", "10' Z1 très souple, écouter les sensations (glycogène bas)", ["Z1"]],
      ["Main", "50-80' Z2 strict (65-72% FTP). Protocole Sleep Low : HIT la veille soir → dîner pauvre en glucides (protéines + légumes) → nuit → vélo Z2 à jeun le matin. Eau + café noir uniquement. Gel de secours dans la poche. Si jambes lourdes/vertige → écourter", ["Z2"]],
      ["Cool-down", "10' Z1. Petit-déjeuner complet riche en glucides + protéines dans les 20min post", ["Z1"]]
    ]),
    variants: { ironman: "90' AM post-sleep-low", half: "60' AM" },
    goals: GOALS_LD,
    tags: ["fatmax", "sleep-low", "marquet", "train-low", "oxydation-lipidique", "fasted"]
  },
];

// =============================================
// 2. COURSE — FAT OXIDATION SPÉCIFIQUE
// =============================================
const RUN_FATMAX: LibraryWorkout[] = [
  {
    id: "FM_RUN_FATMAX_ZONE",
    cat: "A", sport: "course",
    objectif: "FatMax zone run — course en zone d'oxydation lipidique maximale (65-75% VMA). Ciblage métabolique précis",
    necessite: "Recommandé",
    when: "Base/Build, 1-2x/sem",
    phase: ["base", "build"],
    avoid: "Terrain vallonné (maintenir la zone stable), veille de séance clé",
    durationMin: [60, 90],
    metricKey: "allure",
    sportKey: "CAP",
    structure: mk([
      ["Warm-up", "10' marche rapide puis trot Z1", ["Z1"]],
      ["Main", "45-70' course Z2 bas strict. Terrain PLAT obligatoire. Cibler 65-72% VMA ou FC correspondant à la zone FatMax individuelle. Respiration nasale confortable = bon indicateur de zone. Hydratation eau uniquement", ["Z2"]],
      ["Cool-down", "5' marche + étirements dynamiques", ["Z1"]]
    ]),
    variants: { marathon: "75' Z2 FatMax plat", ironman: "60' Z2 FatMax", semi: "50' Z2 FatMax" },
    goals: GOALS_ALL_ENDURANCE,
    tags: ["fatmax", "oxydation-lipidique", "Z2-ciblé", "course", "métabolique"]
  },
  {
    id: "FM_RUN_FASTED_LONG",
    cat: "A", sport: "course",
    objectif: "Sortie longue à jeun — Z2 fasted 75-100'. Maximiser les adaptations lipidiques pour l'endurance",
    necessite: "Recommandé",
    when: "Base/Build (1x/sem max)",
    phase: ["base", "build"],
    avoid: "Séances >100' à jeun, terrain technique, temps chaud >30°C",
    durationMin: [75, 100],
    metricKey: "allure",
    sportKey: "CAP",
    structure: mk([
      ["Warm-up", "10' marche puis trot très léger Z1", ["Z1"]],
      ["Main", "60-85' Z2 strict à jeun matinal. Eau + sel uniquement. Café noir OK. Gel de secours dans la poche. Si vertige ou jambes coupées → manger immédiatement et rentrer. Observer le FC drift : >10% = signe d'hypoglycémie imminente", ["Z2"]],
      ["Cool-down", "5' marche. Petit-déjeuner complet dans les 20min post-course", ["Z1"]]
    ]),
    variants: { marathon: "90' fasted", ironman: "75' fasted (vélo préféré pour >90')" },
    goals: GOALS_ALL_ENDURANCE,
    tags: ["fatmax", "fasted", "oxydation-lipidique", "train-low", "à-jeun"]
  },
  {
    id: "FM_RUN_SLEEP_LOW_AM",
    cat: "A", sport: "course",
    objectif: "Sleep Low → Run AM — Course Z2 matinale après dîner sans glucides post-HIT. Protocole Marquet 2016",
    necessite: "Recommandé",
    when: "Base/Build (1x/sem max)",
    phase: ["base", "build"],
    avoid: "Plus de 1x/sem, période de compétition, athlète non habitué",
    durationMin: [45, 70],
    metricKey: "allure",
    sportKey: "CAP",
    structure: mk([
      ["Warm-up", "5' marche rapide puis trot Z1", ["Z1"]],
      ["Main", "35-60' Z2 strict. Veille : séance HIT soir → dîner protéines + légumes (pas de glucides) → nuit → run AM sans petit-déjeuner. Eau + café OK. Adaptation mitochondriale et fat oxidation amplifiées par la déplétion glycogénique nocturne", ["Z2"]],
      ["Cool-down", "5' marche. Petit-déjeuner complet immédiatement après", ["Z1"]]
    ]),
    variants: { marathon: "60' sleep low run", semi: "45' sleep low" },
    goals: GOALS_ALL_ENDURANCE,
    tags: ["fatmax", "sleep-low", "marquet", "train-low", "fasted", "oxydation-lipidique"]
  },
];

// =============================================
// 3. GUT TRAINING PROGRESSIF (Multi-sport)
// =============================================
const GUT_TRAINING: LibraryWorkout[] = [
  {
    id: "FM_GUT_TRAINING_BIKE_30G",
    cat: "B", sport: "cyclisme",
    objectif: "Gut Training Phase 1 — Tolérance digestive 30g/h glucides pendant effort Z2-Z3. Adaptation intestinale",
    necessite: "Obligatoire",
    when: "Base (début gut training, semaines 1-4)",
    phase: ["base"],
    avoid: "Estomac vide (manger léger 2h avant), produits non testés",
    durationMin: [90, 120],
    metricKey: "puissance",
    sportKey: "Vélo",
    structure: mk([
      ["Warm-up", "15' Z1 progressif", ["Z1"]],
      ["Main", "60-90' Z2 (68-75% FTP). Consommer 30g glucides/h dès la minute 20. Utiliser le produit de course cible. Noter : confort digestif (1-10), ballonnements, nausée. Si inconfort >7 → réduire à 20g/h. Objectif : zéro symptôme à 30g/h avant de passer au niveau suivant", ["Z2"]],
      ["Cool-down", "10' Z1 souple. Noter les symptômes digestifs post-séance", ["Z1"]]
    ]),
    variants: { ironman: "120' à 30g/h", half: "90' à 30g/h" },
    goals: GOALS_TRI,
    tags: ["gut-training", "nutrition", "glycogène", "tolérance-digestive", "fatmax"]
  },
  {
    id: "FM_GUT_TRAINING_BIKE_60G",
    cat: "B", sport: "cyclisme",
    objectif: "Gut Training Phase 2 — Montée à 60g/h glucides pendant effort Z2-Z3. Palier intermédiaire",
    necessite: "Obligatoire",
    when: "Build (semaines 5-8 gut training)",
    phase: ["build"],
    avoid: "Si Phase 1 non validée (30g/h sans symptôme)",
    durationMin: [100, 150],
    metricKey: "puissance",
    sportKey: "Vélo",
    structure: mk([
      ["Warm-up", "15' Z1 progressif", ["Z1"]],
      ["Main", "75-120' Z2-Z3 (68-80% FTP). Consommer 60g glucides/h : alterner gel + boisson isotonique. Boire 500-750ml/h. Tester le mix glucose:fructose 2:1 (Jeukendrup 2014). Noter confort digestif toutes les 20min", ["Z2", "Z3"]],
      ["Cool-down", "10' Z1. Bilan digestif complet post-séance", ["Z1"]]
    ]),
    variants: { ironman: "2h30 à 60g/h", half: "100' à 60g/h" },
    goals: GOALS_TRI,
    tags: ["gut-training", "nutrition", "glycogène", "tolérance-digestive", "fatmax"]
  },
  {
    id: "FM_GUT_TRAINING_BIKE_90G",
    cat: "B", sport: "cyclisme",
    objectif: "Gut Training Phase 3 — Objectif élite 90g/h glucides (glucose:fructose 2:1). Adaptation intestinale avancée (Cao 2025)",
    necessite: "Recommandé",
    when: "Build/Peak (semaines 9+ gut training)",
    phase: ["build", "peak"],
    avoid: "Si Phase 2 non validée, chaleur extrême, course imminente",
    durationMin: [120, 180],
    metricKey: "puissance",
    sportKey: "Vélo",
    structure: mk([
      ["Warm-up", "15' Z1 progressif", ["Z1"]],
      ["Main", "90-150' Z2-Z3 (68-82% FTP). Consommer 90g glucides/h : 2 gels (25g chacun) + boisson isotonique (40g) par heure. Ratio glucose:fructose 2:1 ou 1:0.8 (Cao 2025). Boire 600-800ml/h. Simuler les conditions de course", ["Z2", "Z3"]],
      ["Cool-down", "10' Z1. Bilan digestif détaillé", ["Z1"]]
    ]),
    variants: { ironman: "3h à 90g/h simulation", half: "2h à 80-90g/h" },
    goals: GOALS_TRI,
    tags: ["gut-training", "nutrition", "glycogène", "cao-2025", "jeukendrup", "fatmax"]
  },
  {
    id: "FM_GUT_TRAINING_RUN",
    cat: "B", sport: "course",
    objectif: "Gut Training CAP — Tolérance digestive en course à pied. Condition critique pour marathon/IM",
    necessite: "Obligatoire",
    when: "Build/Peak, intégré aux sorties longues",
    phase: ["build", "peak"],
    avoid: "Terrain très vallonné (les impacts augmentent l'inconfort GI)",
    durationMin: [60, 90],
    metricKey: "allure",
    sportKey: "CAP",
    structure: mk([
      ["Warm-up", "10' trot Z1", ["Z1"]],
      ["Main", "45-75' Z2-Z3 bas. Consommer 40-60g glucides/h : gel toutes les 25-30min + gorgées de boisson. La course à pied provoque plus de symptômes GI que le vélo (impacts). Commencer conservateur. Tester le produit du jour de course", ["Z2", "Z3"]],
      ["Cool-down", "5' marche. Noter tout symptôme GI (crampes, nausée, reflux)", ["Z1"]]
    ]),
    variants: { marathon: "75' avec 50g/h", ironman: "60' post-vélo avec 40g/h" },
    goals: [...GOALS_TRI, "marathon"],
    tags: ["gut-training", "nutrition", "glycogène", "course", "fatmax"]
  },
];

// =============================================
// 4. NATATION — FAT OXIDATION & ENDURANCE MÉTABOLIQUE
// =============================================
const SWIM_FATMAX: LibraryWorkout[] = [
  {
    id: "FM_SWIM_Z2_LONG_FATMAX",
    cat: "A", sport: "natation",
    objectif: "Natation Z2 longue — oxydation lipidique en milieu aquatique. Volume aérobie sans impact",
    necessite: "Recommandé",
    when: "Base/Build, 1x/sem",
    phase: ["base", "build"],
    avoid: "Technique dégradée (si fatigue → écourter)",
    durationMin: [50, 70],
    metricKey: "allure",
    sportKey: "Natation",
    structure: mk([
      ["Warm-up", "400m : 200 nage libre + 100 pull + 100 jambes. Focus position et glisse", ["Z1"]],
      ["Main", "2000-2800m continu Z2 (CSS+15-20s/100m). Séries de 400-500m avec 15s repos. Cadence régulière, amplitude prioritaire. L'immersion en eau froide favorise la lipolyse (brown fat activation)", ["Z2"]],
      ["Cool-down", "200m souple technique + 100m dos", ["Z1"]]
    ]),
    variants: { ironman: "3000m Z2", half: "2200m Z2" },
    goals: GOALS_TRI,
    tags: ["fatmax", "natation", "Z2-long", "oxydation-lipidique", "volume-aérobie"]
  },
  {
    id: "FM_SWIM_FASTED_AM",
    cat: "A", sport: "natation",
    objectif: "Natation à jeun matinale — adaptation lipidique en milieu aquatique. Volume Z2 sans glucides",
    necessite: "Optionnel",
    when: "Base (1x/sem max)",
    phase: ["base"],
    avoid: "Séances >60', eau libre (sécurité), athlète non habitué au jeûne",
    durationMin: [40, 55],
    metricKey: "allure",
    sportKey: "Natation",
    structure: mk([
      ["Warm-up", "300m progressif : 100 lent + 100 modéré + 100 allure Z2", ["Z1", "Z2"]],
      ["Main", "1500-2000m Z2 (CSS+15s/100m) à jeun. Séries de 200-300m, repos 10-15s. Eau au bord du bassin. Si vertiges → arrêter. La natation à jeun est mieux tolérée que la course (pas d'impact, position horizontale)", ["Z2"]],
      ["Cool-down", "200m souple + petit-déjeuner dans les 20min", ["Z1"]]
    ]),
    variants: { ironman: "2000m fasted", half: "1500m fasted" },
    goals: GOALS_TRI,
    tags: ["fatmax", "fasted", "natation", "oxydation-lipidique", "train-low"]
  },
];

// =============================================
// 5. BRICK — FAT OXIDATION ENCHAÎNÉE
// =============================================
const BRICK_FATMAX: LibraryWorkout[] = [
  {
    id: "FM_BRICK_FATMAX_Z2",
    cat: "A", sport: "brick",
    objectif: "Brick FatMax — vélo Z2 long + enchaînement CAP Z2. Oxydation lipidique sous fatigue de transition",
    necessite: "Recommandé",
    when: "Build/Peak (1x/2 sem)",
    phase: ["build", "peak"],
    avoid: "Semaine de décharge, chaleur extrême sans acclimatation",
    durationMin: [120, 180],
    metricKey: "puissance",
    sportKey: "Vélo+CAP",
    structure: mk([
      ["Warm-up", "10' vélo Z1 progressif", ["Z1"]],
      ["Main", "Vélo : 80-120' Z2 (68-75% FTP) sans glucides pendant les 60 premières min, puis 30g/h max. Transition rapide (<5min). CAP : 25-40' Z2 strict. Le corps est forcé d'oxyder les lipides car les réserves de glycogène sont partiellement entamées par le vélo", ["Z2"]],
      ["Cool-down", "5' marche + étirements. Recharger glucides + protéines dans les 30min", ["Z1"]]
    ]),
    variants: { ironman: "2h vélo + 35' CAP", half: "90' vélo + 25' CAP" },
    goals: GOALS_TRI,
    tags: ["fatmax", "brick", "oxydation-lipidique", "transition", "train-low"]
  },
  {
    id: "FM_BRICK_GUT_FATMAX",
    cat: "B", sport: "brick",
    objectif: "Brick Gut+FatMax — vélo Z2 avec gut training + CAP Z2 sans glucides. Double adaptation métabolique",
    necessite: "Recommandé",
    when: "Build/Peak IM",
    phase: ["build", "peak"],
    avoid: "Si gut training non validé en vélo seul d'abord",
    durationMin: [130, 200],
    metricKey: "puissance",
    sportKey: "Vélo+CAP",
    structure: mk([
      ["Warm-up", "10' vélo Z1", ["Z1"]],
      ["Main", "Vélo : 90-140' Z2-Z3 (68-80% FTP) avec gut training 60-90g/h (tester le mix course). Transition. CAP : 25-40' Z2 SANS glucides — forcer l'oxydation lipidique sous fatigue post-vélo. Observer la tolérance digestive pendant la transition vélo→CAP", ["Z2", "Z3"]],
      ["Cool-down", "5' marche. Recharger immédiatement post", ["Z1"]]
    ]),
    variants: { ironman: "2h20 vélo 90g/h + 35' CAP dry", half: "100' vélo 60g/h + 25' CAP dry" },
    goals: GOALS_TRI,
    tags: ["fatmax", "gut-training", "brick", "oxydation-lipidique", "nutrition", "glycogène"]
  },
];

// =============================================
// EXPORT CONSOLIDÉ
// =============================================
export const EnrichedWorkoutsFatMax: LibraryWorkout[] = [
  ...BIKE_FATMAX,
  ...RUN_FATMAX,
  ...GUT_TRAINING,
  ...SWIM_FATMAX,
  ...BRICK_FATMAX,
];
