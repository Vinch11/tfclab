// =============================================
// BIBLIOTHÈQUE ENRICHIE — SÉANCES AVANCÉES
// ~90 séances couvrant protocoles modernes et variantes manquantes
// =============================================

import { LibraryWorkout, WorkoutGoal } from "@/types/workoutLibrary";

const GOALS_ALL: WorkoutGoal[] = ["ironman", "half", "marathon", "semi"];
const GOALS_TRI: WorkoutGoal[] = ["ironman", "half"];
const GOALS_RUN: WorkoutGoal[] = ["marathon", "semi"];
const GOALS_IM: WorkoutGoal[] = ["ironman"];
const GOALS_703: WorkoutGoal[] = ["half"];
const GOALS_MAR: WorkoutGoal[] = ["marathon"];
const GOALS_SEMI: WorkoutGoal[] = ["semi"];
const GOALS_TRAIL: WorkoutGoal[] = ["trail_short", "trail_long"];

function mk(parts: [string, string, string[]][]) {
  return parts.map(([part, text, zones]) => ({ part, text, zones }));
}

export const EnrichedWorkouts: LibraryWorkout[] = [

  // =============================================
  // 1. COURSE — PROTOCOLES NORVÉGIENS & MODERNES
  // =============================================
  {
    id: "ENR_RUN_NORWEGIAN_4x8",
    cat: "B", sport: "course",
    objectif: "Norwegian 4x8' — protocole VO2max lactate-guided. Moteur aérobie élite",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Si FC max non connue ou fatigue >7/10",
    durationMin: [65, 80],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "20' progressif Z1→Z2 + 4 accélérations", ["Z1", "Z2"]],
      ["Main", "4 x 8' Z5a (88-92% FCmax) R:4' trot Z1. Chercher steady-state VO2", ["Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { marathon: "4x8' Z5a → augmenter 4x9' S+2", semi: "4x8' Z5a strict", half: "3x8' rappel" },
    goals: [...GOALS_RUN, "half"],
    tags: ["norwegian", "vo2max", "4x8", "lactate-guided", "moderne"]
  },
  {
    id: "ENR_RUN_NORWEGIAN_5x6",
    cat: "B", sport: "course",
    objectif: "Norwegian court 5x6' — variante VO2max plus dense. Accumulation temps en zone",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Fatigue résiduelle course clé <48h",
    durationMin: [60, 75],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z1→Z2 + éducatifs", ["Z1", "Z2"]],
      ["Main", "5 x 6' Z5a (90% FCmax) R:3' trot Z1", ["Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "5x6' strict", marathon: "4x6' suffisant" },
    goals: GOALS_RUN,
    tags: ["norwegian", "vo2max", "5x6", "moderne"]
  },
  {
    id: "ENR_RUN_BILLAT_30_30",
    cat: "B", sport: "course",
    objectif: "Billat 30/30 — 3 séries de 10x(30\" vVO2/30\" Z1). Temps accumulé >10min en zone VO2",
    necessite: "Obligatoire",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Si douleurs péri-articulaires",
    durationMin: [55, 70],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' progressif + 3 lignes droites", ["Z1", "Z2"]],
      ["Main", "3 x (10 x 30\" Z6 / 30\" Z1) R:3' entre séries", ["Z6", "Z1"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "3 séries de 10", marathon: "2 séries de 12", half: "2 séries de 8" },
    goals: [...GOALS_RUN, "half"],
    tags: ["billat", "30-30", "vo2max", "intermittent"]
  },

  // =============================================
  // 2. COURSE — FARTLEK & VARIANTES
  // =============================================
  {
    id: "ENR_RUN_FARTLEK_SCANDINAVE",
    cat: "B", sport: "course",
    objectif: "Fartlek scandinave — surges imprévisibles 1-4' Z4/Z5 dans Z2. Résistance mentale",
    necessite: "Recommandé",
    when: "Build (toutes phases)",
    phase: ["build"],
    avoid: "Phase affûtage strict",
    durationMin: [50, 70],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z1→Z2", ["Z1", "Z2"]],
      ["Main", "30-40' Fartlek : surges de 1-4' Z4/Z5, retours 2-3' Z2. 8-12 surges au feeling", ["Z2", "Z4", "Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "8 surges de 2-3'", marathon: "10 surges de 1-3'", ironman: "6 surges de 2-4'" },
    goals: GOALS_ALL,
    tags: ["fartlek", "scandinave", "variabilité", "mental"]
  },
  {
    id: "ENR_RUN_FARTLEK_KENYAN",
    cat: "B", sport: "course",
    objectif: "Fartlek kényan — tempo continu Z3 avec surges Z5 courts. Développer le changement de rythme",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue musculaire importante",
    durationMin: [50, 65],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2", ["Z2"]],
      ["Main", "25-35' tempo Z3 continu, toutes les 5' accélérer 30-60\" Z5 puis retour Z3 immédiat", ["Z3", "Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "30' Z3 + 6x30\" Z5", marathon: "35' Z3 + 7x45\" Z5" },
    goals: GOALS_RUN,
    tags: ["fartlek", "kenyan", "tempo", "surges"]
  },
  {
    id: "ENR_RUN_FARTLEK_PYRAMIDE",
    cat: "B", sport: "course",
    objectif: "Fartlek pyramidal — 1'-2'-3'-4'-3'-2'-1' Z4-Z5 avec récup égale. Montée puis descente progressive",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Phase récupération",
    durationMin: [55, 70],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 + éducatifs", ["Z1", "Z2"]],
      ["Main", "Pyramide: 1'-2'-3'-4'-3'-2'-1' Z4/Z5 avec récup = temps effort en Z1", ["Z4", "Z5", "Z1"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "Jusqu'à 4' sommet", marathon: "Jusqu'à 5' sommet" },
    goals: GOALS_RUN,
    tags: ["fartlek", "pyramidal", "variabilité"]
  },

  // =============================================
  // 3. COURSE — TEMPO & ALLURE SPÉCIFIQUE
  // =============================================
  {
    id: "ENR_RUN_TEMPO_PROGRESSIF",
    cat: "B", sport: "course",
    objectif: "Tempo progressif — 30-45' en négatif split Z3→Z4. Apprendre à finir fort",
    necessite: "Obligatoire",
    when: "Phase spécifique",
    phase: ["build"],
    avoid: "Fatigue importante, début de cycle",
    durationMin: [55, 75],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z1→Z2", ["Z1", "Z2"]],
      ["Main", "30-45' progressif : 1er tiers Z3 bas, 2ème Z3 haut, dernier Z4. Negative split obligatoire", ["Z3", "Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { marathon: "45' (15'+15'+15')", semi: "30' (10'+10'+10')", half: "35'" },
    goals: [...GOALS_RUN, "half"],
    tags: ["tempo", "progressif", "negative-split", "spécifique"]
  },
  {
    id: "ENR_RUN_CRUISE_INTERVALS",
    cat: "B", sport: "course",
    objectif: "Cruise Intervals Daniels — 4-6x1600m au seuil. Récup courte 60-90\". Clearance lactate optimale",
    necessite: "Recommandé",
    when: "Build/Spécifique",
    phase: ["build"],
    avoid: "Phase base",
    durationMin: [55, 75],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 + 4 accélérations", ["Z1", "Z2"]],
      ["Main", "4-6 x 1600m Z4 (Allure Seuil) R:60-90\" Z1. Récup courte = tolérance lactate", ["Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { marathon: "6x1600m", semi: "4x1600m puis 5x1600m", half: "4x1200m" },
    goals: [...GOALS_RUN, "half"],
    tags: ["cruise", "daniels", "seuil", "intervals"]
  },
  {
    id: "ENR_RUN_ALLURE_MARATHON_LONG",
    cat: "A", sport: "course",
    objectif: "Sortie longue allure marathon — 2h avec 40-60' Z3 marathon incorporé. Calibrer les sensations",
    necessite: "Obligatoire",
    when: "Phase spécifique marathon (S12-S20)",
    phase: ["build"],
    avoid: "Début de programme, si blessure",
    durationMin: [110, 140],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "30' Z2 progressif", ["Z2"]],
      ["Main", "40-60' continu Z3 (Allure Marathon). Focus: cadence stable 180spm, nutrition", ["Z3"]],
      ["Cool-down", "20-30' Z2 → Z1 décrescendo", ["Z2", "Z1"]]
    ]),
    variants: { marathon: "60' bloc Z3 (progression)", semi: "40' bloc Z3" },
    goals: GOALS_MAR,
    tags: ["longue", "allure-marathon", "spécifique", "nutrition"]
  },
  {
    id: "ENR_RUN_ALLURE_SEMI_BLOCS",
    cat: "B", sport: "course",
    objectif: "Blocs allure semi — 3x15' allure semi (Z4a) en nature. Spécificité maximale",
    necessite: "Obligatoire",
    when: "Phase spécifique semi (S8-S11)",
    phase: ["build"],
    avoid: "Veille séance longue",
    durationMin: [60, 80],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 progressif", ["Z1", "Z2"]],
      ["Main", "3 x 15' Allure Semi (Z4a) R:3'. Cadence 180-185spm, respiration contrôlée", ["Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "3x15' → 2x20' → 1x40' (progression)", marathon: "Rappel vitesse 2x15'" },
    goals: GOALS_SEMI,
    tags: ["allure-semi", "spécifique", "blocs"]
  },

  // =============================================
  // 4. COURSE — CÔTES & FORCE SPÉCIFIQUE
  // =============================================
  {
    id: "ENR_RUN_COTES_COURTES",
    cat: "C", sport: "course",
    objectif: "Côtes courtes explosives — 10-15x10-15\" pleine puissance (8-12% pente). Recrutement neuromusculaire",
    necessite: "Recommandé",
    when: "Build (toutes phases)",
    phase: ["build"],
    avoid: "Tendinopathie achille/mollet",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 + éducatifs + 3 lignes droites", ["Z1", "Z2"]],
      ["Main", "10-15 x 10-15\" sprint en côte (8-12%). Récup trot descente. Focus: puissance et fréquence", ["Z6"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "12x12\"", marathon: "15x10\"", half: "10x15\"" },
    goals: [...GOALS_RUN, "half"],
    tags: ["côtes", "courtes", "explosif", "neuromusculaire"]
  },
  {
    id: "ENR_RUN_COTES_LONGUES_FORCE",
    cat: "B", sport: "course",
    objectif: "Côtes longues force — 6-8x2-3' en côte Z4/Z5 (5-8%). Économie de course + puissance",
    necessite: "Recommandé",
    when: "Build/Spécifique",
    phase: ["build"],
    avoid: "Sol glissant, fatigue musculaire ++",
    durationMin: [50, 65],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 progressif", ["Z1", "Z2"]],
      ["Main", "6-8 x 2-3' Z4/Z5 en côte (5-8%). Descente trot récup. Focus: posture haute, attaque médio-pied", ["Z4", "Z5"]],
      ["Cool-down", "10' Z1 plat", ["Z1"]]
    ]),
    variants: { marathon: "8x3' Z4", semi: "6x2' Z5", half: "6x2' Z4" },
    goals: [...GOALS_RUN, "half", ...GOALS_TRAIL],
    tags: ["côtes", "longues", "force", "économie"]
  },
  {
    id: "ENR_RUN_DESCENTE_TECHNIQUE",
    cat: "C", sport: "course",
    objectif: "Descente technique — 30-40' Z2 avec focus technique descente. Anti-DOMS, relâchement musculaire",
    necessite: "Recommandé",
    when: "Build trail / pré-compétition",
    phase: ["build", "peak"],
    avoid: "Sol mouillé dangereux",
    durationMin: [45, 60],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "10' Z2 plat", ["Z2"]],
      ["Main", "30-40' descente technique variée. Focus: petits pas, regard loin, relâchement bras/épaules", ["Z2", "Z3"]],
      ["Cool-down", "10' Z1 plat", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_TRAIL,
    tags: ["descente", "technique", "trail", "anti-doms"]
  },

  // =============================================
  // 5. COURSE — TRAIN LOW & DURABILITÉ
  // =============================================
  {
    id: "ENR_RUN_TRAIN_LOW_FASTED",
    cat: "A", sport: "course",
    objectif: "Train Low / Fasted run — Z2 à jeun 60-90'. Maximiser oxydation lipidique",
    necessite: "Recommandé",
    when: "Base/Build (1-2x/semaine max)",
    phase: ["base", "build"],
    avoid: "Si glycémie instable, diabète, ou SL <45min",
    durationMin: [55, 90],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "5' marche rapide puis trot très léger Z1", ["Z1"]],
      ["Main", "55-85' Z2 strict à jeun. Eau + sel OK. Café noir OK. Attention: si vertige → arrêter + manger", ["Z2"]],
      ["Cool-down", "5' marche + étirements légers. Manger dans les 30min post-séance", ["Z1"]]
    ]),
    variants: { ironman: "90' Z2 fasted + petit déj après", marathon: "75' Z2 fasted", half: "60' Z2 fasted" },
    goals: [...GOALS_ALL],
    tags: ["train-low", "fasted", "oxydation-lipidique", "impey"]
  },
  {
    id: "ENR_RUN_SLEEP_LOW_DOUBLE",
    cat: "A", sport: "course",
    objectif: "Sleep Low double day — Séance HIT soir (déplétion glycogène) + Z2 matin fasted. Protocole Marquet",
    necessite: "Recommandé",
    when: "Build (max 1x/semaine)",
    phase: ["build"],
    avoid: "Compétition <3j, athlète novice",
    durationMin: [50, 70],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "5' marche puis trot très léger Z1", ["Z1"]],
      ["Main", "45-60' Z2 strict matin à jeun. APRÈS séance HIT veille soir sans recharge glucidique. Adaptation mitochondriale ++", ["Z2"]],
      ["Cool-down", "5' marche. Petit-déjeuner riche en protéines + glucides dans les 30min", ["Z1"]]
    ]),
    variants: { ironman: "70' Z2", marathon: "60' Z2" },
    goals: [...GOALS_TRI, ...GOALS_MAR],
    tags: ["sleep-low", "marquet", "train-low", "mitochondrial"]
  },
  {
    id: "ENR_RUN_DURABILITE_FINISH_FAST",
    cat: "A", sport: "course",
    objectif: "Durabilité Finish Fast — Longue Z2 + dernier 20% du temps en Z3/Z4 progressif. Résistance à la fatigue",
    necessite: "Obligatoire",
    when: "Spécifique (S12-S20)",
    phase: ["build"],
    avoid: "Si FC dérive >15bpm vs début",
    durationMin: [90, 130],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "10' trot progressif Z1→Z2", ["Z1", "Z2"]],
      ["Main", "60-90' Z2 stable. Derniers 20-30' progressif Z3→Z4. Objectif: negative split malgré fatigue accumulée", ["Z2", "Z3", "Z4"]],
      ["Cool-down", "10' trot Z1 décrescendo + étirements", ["Z1"]]
    ]),
    variants: { marathon: "2h total, 30' finish Z3/Z4", semi: "1h30, 20' finish Z4", ironman: "1h45, 25' finish Z3" },
    goals: GOALS_ALL,
    tags: ["durabilité", "finish-fast", "negative-split", "fatigue-resistance"]
  },

  // =============================================
  // 6. COURSE — PYRAMIDAL & MIXTE
  // =============================================
  {
    id: "ENR_RUN_PYRAMIDE_LACTIQUE",
    cat: "B", sport: "course",
    objectif: "Pyramide lactique — 200-400-800-1200-800-400-200m. Tolérance multi-zones",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue résiduelle importante",
    durationMin: [55, 70],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 + gammes", ["Z1", "Z2"]],
      ["Main", "Pyramide: 200(Z6)-400(Z5)-800(Z5)-1200(Z4)-800(Z5)-400(Z5)-200(Z6) R:=effort", ["Z4", "Z5", "Z6"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "Sommet 1200m", marathon: "Sommet 1600m" },
    goals: GOALS_RUN,
    tags: ["pyramide", "lactique", "multi-zone", "variabilité"]
  },
  {
    id: "ENR_RUN_DESCENDING_REST",
    cat: "B", sport: "course",
    objectif: "Descending rest 6x1000m — même allure, récup qui diminue (2'-1'30-1'-45\"-30\"-0\"). Tolérance lactate",
    necessite: "Recommandé",
    when: "Spécifique",
    phase: ["build"],
    avoid: "Si incapable de maintenir l'allure",
    durationMin: [50, 65],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 + accélérations", ["Z1", "Z2"]],
      ["Main", "6 x 1000m Z4 avec récup décroissante: 2'-1'30-1'-45\"-30\"-0\". Même allure imposée", ["Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "Z4 allure semi", marathon: "Z4a allure 10km" },
    goals: GOALS_RUN,
    tags: ["descending-rest", "tolérance-lactate", "mental"]
  },
  {
    id: "ENR_RUN_MIXTE_VMA_SEUIL",
    cat: "B", sport: "course",
    objectif: "Séance mixte VMA + Seuil — 6x300m Z6 puis 2x8' Z4. Stimulation multi-filière",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Fatigue chronique",
    durationMin: [55, 70],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 + éducatifs", ["Z1", "Z2"]],
      ["Main", "Bloc 1: 6x300m Z6 R:1'. Bloc 2: 2x8' Z4 R:2'. Multi-système en une séance", ["Z6", "Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "6x300m + 2x8'", marathon: "8x200m + 2x10'" },
    goals: GOALS_RUN,
    tags: ["mixte", "vma-seuil", "multi-filière"]
  },

  // =============================================
  // 7. VÉLO — PROTOCOLES AVANCÉS
  // =============================================
  {
    id: "ENR_BIKE_NORWEGIAN_5x5",
    cat: "B", sport: "cyclisme",
    objectif: "Norwegian vélo 5x5' — VO2max lactate-guided. 88-92% FCmax en steady-state",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Si FTP non calibré",
    durationMin: [65, 85],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' progressif Z1→Z3 + 2x30\" Z5", ["Z1", "Z2", "Z5"]],
      ["Main", "5 x 5' à 110-115% FTP (88-92% FCmax) R:5' Z1. Steady-state VO2 obligatoire", ["Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { ironman: "1x/10j", half: "1x/7j", marathon: "support vélo" },
    goals: GOALS_TRI,
    tags: ["norwegian", "vo2max", "vélo", "moderne"]
  },
  {
    id: "ENR_BIKE_POLARIZED_Z1_Z5",
    cat: "B", sport: "cyclisme",
    objectif: "Séance polarisée — 80' Z1/Z2 avec 3x6' Z5 insérés. Modèle 80/20 pur",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Phase base pure",
    durationMin: [80, 110],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' Z1→Z2", ["Z1", "Z2"]],
      ["Main", "60-80' Z2 avec 3 x 6' Z5 à 108-115% FTP. R:6' Z1 entre chaque. Pas de Z3/Z4", ["Z2", "Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { ironman: "3x6' Z5 dans 90' Z2", half: "3x6' Z5 dans 75' Z2" },
    goals: GOALS_TRI,
    tags: ["polarisé", "80-20", "vélo", "seiler"]
  },
  {
    id: "ENR_BIKE_OVER_UNDER_AVANCE",
    cat: "B", sport: "cyclisme",
    objectif: "Over-Under avancé — 4x12' (3' 105% / 1' 90% x3). Clearance lactate dynamique",
    necessite: "Recommandé",
    when: "Spécifique/Peak",
    phase: ["build", "peak"],
    avoid: "Si crampes récurrentes",
    durationMin: [70, 95],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' progressif", ["Z1", "Z2"]],
      ["Main", "4 x 12' (3x [3' à 105% FTP + 1' à 90% FTP]) R:4' Z1. Navette lactate continue", ["Z4", "Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { ironman: "4x12' complet", half: "3x12'" },
    goals: GOALS_TRI,
    tags: ["over-under", "avancé", "clearance-lactate"]
  },
  {
    id: "ENR_BIKE_SWEET_SPOT_PROGRESSIF",
    cat: "B", sport: "cyclisme",
    objectif: "Sweet Spot progressif — 3x20' à 86→92% FTP (intra-bloc progressif). VLamax ↓ + TTE ↑",
    necessite: "Obligatoire",
    when: "Build (toutes phases)",
    phase: ["build"],
    avoid: "Veille test FTP",
    durationMin: [85, 110],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' progressif", ["Z1", "Z2"]],
      ["Main", "3 x 20' (début 86% FTP → fin 92% FTP, progression intra-bloc). R:5' Z1", ["Z3", "Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { ironman: "3x20' → 2x30' (progression)", half: "3x15' → 3x20'" },
    goals: GOALS_TRI,
    tags: ["sweet-spot", "progressif", "vlamax", "tte"]
  },
  {
    id: "ENR_BIKE_TEMPO_CADENCE_BASSE",
    cat: "B", sport: "cyclisme",
    objectif: "Tempo cadence basse — 3x20' Z3 à 55-65rpm. Force musculaire spécifique cyclisme",
    necessite: "Recommandé",
    when: "Build/Force",
    phase: ["build"],
    avoid: "Douleur genou",
    durationMin: [80, 105],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' Z2 cadence normale", ["Z1", "Z2"]],
      ["Main", "3 x 20' Z3 (78-82% FTP) à 55-65 RPM. Force spécifique sans lactate. R:5' Z1 cadence libre", ["Z3"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { ironman: "3x20' Z3 low cadence", half: "3x15' Z3 low cadence" },
    goals: GOALS_TRI,
    tags: ["tempo", "cadence-basse", "force", "vélo"]
  },
  {
    id: "ENR_BIKE_ENDURANCE_NEGATIVE_SPLIT",
    cat: "A", sport: "cyclisme",
    objectif: "Endurance negative split — 3h Z2 → dernière heure Z3 progressif. Durabilité vélo",
    necessite: "Obligatoire",
    when: "Spécifique IM",
    phase: ["build"],
    avoid: "Phase base",
    durationMin: [150, 210],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "15' progressif Z1→Z2", ["Z1", "Z2"]],
      ["Main", "1h45 Z2 stable + 45-60' Z3 progressif (fin à 85% FTP). Nutrition 80-90g/h glucides. Negative split watts", ["Z2", "Z3"]],
      ["Cool-down", "10' Z1 souple", ["Z1"]]
    ]),
    variants: { ironman: "3h total", half: "2h30 total" },
    goals: GOALS_TRI,
    tags: ["endurance", "negative-split", "durabilité", "vélo"]
  },
  {
    id: "ENR_BIKE_GIMENEZ_TEST_FORMAT",
    cat: "B", sport: "cyclisme",
    objectif: "Gimenez adapté — 6x6' Z4 (95% FTP) R:1' Z1. Seuil extensif haute densité",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue élevée",
    durationMin: [65, 85],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' progressif", ["Z1", "Z2"]],
      ["Main", "6 x 6' Z4 (93-97% FTP) R:1' Z1. Haute densité, clearance lactate rapide", ["Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { ironman: "6x6' complet", half: "5x6'" },
    goals: GOALS_TRI,
    tags: ["gimenez", "seuil", "haute-densité", "vélo"]
  },
  {
    id: "ENR_BIKE_RAMP_4x10",
    cat: "B", sport: "cyclisme",
    objectif: "Ramp 4x10' — chaque bloc commence à 85% et finit à 105% FTP. Tolérance progressive au lactate",
    necessite: "Recommandé",
    when: "Build/Spécifique",
    phase: ["build"],
    avoid: "Si FTP non fiable",
    durationMin: [70, 90],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' Z1→Z2", ["Z1", "Z2"]],
      ["Main", "4 x 10' Ramp (85%→105% FTP progressif chaque minute). R:4' Z1", ["Z3", "Z4", "Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { ironman: "4x10' ramp", half: "3x10' ramp" },
    goals: GOALS_TRI,
    tags: ["ramp", "progressif", "tolérance-lactate", "vélo"]
  },

  // =============================================
  // 8. NATATION — SÉANCES AVANCÉES
  // =============================================
  {
    id: "ENR_SWIM_DESCENDING_SET",
    cat: "B", sport: "natation",
    objectif: "Descending set — 5x400m avec temps qui descend chaque répétition. Gestion allure + finish fort",
    necessite: "Recommandé",
    when: "Build/Spécifique",
    phase: ["build"],
    avoid: "Si épaule douloureuse",
    durationMin: [60, 80],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m varié + 4x50m éducatifs", ["Z1", "Z2"]],
      ["Main", "5 x 400m descending (chaque 400 plus rapide que le précédent). De Z2 à Z4+. R:30\"", ["Z2", "Z3", "Z4"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "5x400m descending", half: "5x300m descending" },
    goals: GOALS_TRI,
    tags: ["descending", "gestion-allure", "natation"]
  },
  {
    id: "ENR_SWIM_BROKEN_SWIM",
    cat: "B", sport: "natation",
    objectif: "Broken swim 1500/1900m — distance race en segments avec micro-pauses 10\". Simulation course",
    necessite: "Obligatoire",
    when: "Spécifique/Affûtage",
    phase: ["build", "peak"],
    avoid: "Phase base",
    durationMin: [55, 75],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m varié (100 NL + 100 dos + 100 pull)", ["Z1", "Z2"]],
      ["Main", "Broken swim: 1500m découpé en 5×300m à allure course Z3/Z4 avec 10\" repos entre chaque segment. Maintenir régularité (<2\" d'écart entre segments). Respiration bilatérale", ["Z3", "Z4"]],
      ["Cool-down", "200m facile dos", ["Z1"]]
    ]),
    variants: { ironman: "3800m en 8×475m R:10\"", half: "1900m en 6×300m+100m R:10\"" },
    goals: GOALS_TRI,
    tags: ["broken-swim", "simulation", "race-pace", "natation"]
  },
  {
    id: "ENR_SWIM_PADDLES_PULL_FORCE",
    cat: "C", sport: "natation",
    objectif: "Pull buoy + plaquettes progressif — 4x600m Pull Z3. Force propulsive aquatique",
    necessite: "Recommandé",
    when: "Build/Spécifique",
    phase: ["build"],
    avoid: "Épaule instable",
    durationMin: [60, 80],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m facile + 4x50m éducatifs", ["Z1", "Z2"]],
      ["Main", "4 x 600m Pull+Plaquettes Z3 (petit→moyen→gros→moyen). R:20\". Focus: prise d'eau lointaine", ["Z3"]],
      ["Cool-down", "200m facile sans matériel", ["Z1"]]
    ]),
    variants: { ironman: "4x600m", half: "4x400m" },
    goals: GOALS_TRI,
    tags: ["pull", "plaquettes", "force", "natation"]
  },
  {
    id: "ENR_SWIM_SPEED_ENDURANCE",
    cat: "B", sport: "natation",
    objectif: "Speed endurance — 16x50m Z5 R:15\". Vitesse + résistance. Départ compétition",
    necessite: "Recommandé",
    when: "Peak/Affûtage",
    phase: ["peak"],
    avoid: "Phase base",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m varié + 4x25m sprint", ["Z1", "Z2", "Z6"]],
      ["Main", "16 x 50m Z5 R:15\". Maintenir <+2\" du meilleur temps sur chaque 50m", ["Z5"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "16x50m Z5", half: "12x50m Z5" },
    goals: GOALS_TRI,
    tags: ["speed-endurance", "sprint", "natation", "affûtage"]
  },
  {
    id: "ENR_SWIM_KICK_SET",
    cat: "C", sport: "natation",
    objectif: "Kick set spécifique — 8x100m battements Z3/Z4. Propulsion jambes + stabilisation core",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Si cheville raide",
    durationMin: [45, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m facile + éducatifs", ["Z1", "Z2"]],
      ["Main", "8 x 100m battements planche Z3/Z4. R:15\". Focus: fréquence haute, amplitude courte depuis la hanche", ["Z3", "Z4"]],
      ["Cool-down", "200m facile nage complète", ["Z1"]]
    ]),
    variants: { ironman: "8x100m", half: "6x100m" },
    goals: GOALS_TRI,
    tags: ["battements", "kick", "technique", "natation"]
  },
  {
    id: "ENR_SWIM_NEGATIVE_SPLIT_800",
    cat: "B", sport: "natation",
    objectif: "Negative split 4x800m — chaque 800 en negative split (2ème 400 plus rapide). Discipline d'allure",
    necessite: "Recommandé",
    when: "Spécifique",
    phase: ["build"],
    avoid: "Si épaule fatiguée",
    durationMin: [70, 90],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile", ["Z1", "Z2"]],
      ["Main", "4 x 800m avec chaque 800 en negative split (1ère 400 Z2/Z3, 2ème 400 Z3/Z4). R:30\"", ["Z2", "Z3", "Z4"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "4x800m", half: "3x800m" },
    goals: GOALS_TRI,
    tags: ["negative-split", "800m", "discipline-allure", "natation"]
  },

  // =============================================
  // 9. TRAIL — SÉANCES SPÉCIFIQUES
  // =============================================
  {
    id: "ENR_TRAIL_VMA_COTES",
    cat: "B", sport: "course",
    objectif: "VMA côtes trail — 8-10x1'30\" en côte raide (>15%). Puissance en montée",
    necessite: "Obligatoire",
    when: "Build trail",
    phase: ["build"],
    avoid: "Sol gelé/dangereux",
    durationMin: [50, 65],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 terrain vallonné", ["Z1", "Z2"]],
      ["Main", "8-10 x 1'30\" en côte raide (>15%) Z5/Z6. Descente trot récup 2-3'. Bâtons optionnels", ["Z5", "Z6"]],
      ["Cool-down", "10' Z1 plat", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_TRAIL,
    tags: ["vma-côtes", "trail", "montée", "puissance"],
    dPlusTargetM: { min: 300, max: 500 }
  },
  {
    id: "ENR_TRAIL_SEUIL_MONTEE",
    cat: "B", sport: "course",
    objectif: "Seuil en montée — 3x10-15' en côte (8-12%) Z4. Endurance musculaire spécifique montée",
    necessite: "Obligatoire",
    when: "Spécifique trail",
    phase: ["build"],
    avoid: "Si quad douloureux",
    durationMin: [60, 80],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 progressif", ["Z1", "Z2"]],
      ["Main", "3 x 10-15' en côte (8-12%) Z4 (cardio). Récup descente trot. Focus: régularité effort + posture", ["Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_TRAIL,
    tags: ["seuil", "montée", "trail", "endurance-musculaire"],
    dPlusTargetM: { min: 400, max: 700 }
  },
  {
    id: "ENR_TRAIL_LONGUE_DPLUS",
    cat: "A", sport: "course",
    objectif: "Sortie longue D+ — 2h30-4h avec D+ ciblé. Résistance verticale et nutrition terrain",
    necessite: "Obligatoire",
    when: "Build/Spécifique trail",
    phase: ["build"],
    avoid: "Si blessure tendineuse",
    durationMin: [150, 240],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' marche→trot progressif sur terrain plat", ["Z1"]],
      ["Main", "2h15-3h45 terrain montagneux. Z2 montée / technique descente. Bâtons si course >3h. Nutrition 60g/h glucides", ["Z1", "Z2", "Z3"]],
      ["Cool-down", "15' marche retour + étirements debout", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_TRAIL,
    tags: ["longue", "D+", "trail", "montagne", "nutrition"],
    dPlusTargetM: { min: 800, max: 2000 }
  },
  {
    id: "ENR_TRAIL_MARCHE_RAPIDE_COTES",
    cat: "A", sport: "course",
    objectif: "Marche rapide en côte — Z2/Z3 cardio en marchant rapidement (>15% pente). Économie verticale",
    necessite: "Recommandé",
    when: "Build/Spécifique ultra",
    phase: ["build"],
    avoid: "Si pas de terrain approprié",
    durationMin: [60, 90],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "10' marche progressive plat→pente douce", ["Z1"]],
      ["Main", "45-70' marche rapide en côte raide (>15%). Z2/Z3 cardio avec bâtons. Focus: cadence pas 45-55/min, posture droite", ["Z2", "Z3"]],
      ["Cool-down", "10' marche retour Z1 + étirements mollets/quadriceps", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_TRAIL,
    tags: ["marche-rapide", "côte", "ultra", "trail", "économie-verticale"],
    dPlusTargetM: { min: 500, max: 1200 }
  },

  // =============================================
  // 10. BRIQUES & ENCHAÎNEMENTS AVANCÉS
  // =============================================
  {
    id: "ENR_BRICK_SWIM_BIKE",
    cat: "Brique", sport: "mixed",
    objectif: "Brique natation→vélo — 2000-3000m natation + 1h30-2h vélo Z2/Z3. Transition T1",
    necessite: "Recommandé",
    when: "Spécifique tri",
    phase: ["build"],
    avoid: "Phase base",
    durationMin: [150, 200],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Natation", "2000-3000m progressif Z2→Z3 (finish 500m allure course)", ["Z2", "Z3"]],
      ["Transition T1", "Enchaîner <5min", []],
      ["Vélo", "1h30-2h Z2/Z3. Stabiliser cardio rapidement après nage", ["Z2", "Z3"]]
    ]),
    variants: { ironman: "3000m + 2h vélo", half: "2000m + 1h30 vélo" },
    goals: GOALS_TRI,
    tags: ["brique", "swim-bike", "T1", "transition"]
  },
  {
    id: "ENR_BRICK_DOUBLE_RUN",
    cat: "Brique", sport: "course",
    objectif: "Double run — AM: 40' Z2 + PM: 30' Z3/Z4 qualité. Volume fractionné dans la journée",
    necessite: "Recommandé",
    when: "Build (marathon/semi)",
    phase: ["build"],
    avoid: "Si <6h entre les séances",
    durationMin: [65, 80],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["AM", "40' Z2 fondamentale", ["Z2"]],
      ["PM", "30' avec 3x5' Z4 (Allure Semi) R:2'. Qualité sur jambes pré-fatiguées", ["Z2", "Z4"]]
    ]),
    variants: { marathon: "AM 50' Z2 + PM 25' (2x8' Z4)", semi: "AM 40' + PM 30' (3x5' Z4)" },
    goals: GOALS_RUN,
    tags: ["double-run", "AM-PM", "volume", "marathon"]
  },

  // =============================================
  // 11. RENFORCEMENT AVANCÉ
  // =============================================
  {
    id: "ENR_STR_PLYOMETRIE",
    cat: "C", sport: "strength",
    objectif: "Pliométrie pure — box jumps, bounds, drop jumps. Raideur musculo-tendineuse",
    necessite: "Recommandé",
    when: "Build (2x/semaine max)",
    phase: ["build"],
    avoid: "Douleur genou/cheville, veille sortie longue",
    durationMin: [35, 45],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "10' mobilité dynamique: rotations chevilles, montées genoux, skipping léger, squats au poids de corps 2×10", []],
      ["Main", "Circuit 3 séries (R:2' inter-séries): Box jumps 8 reps (hauteur progressive) + Bounds alternés 8 reps + Drop jumps 6 reps (40-60cm) + Sauts latéraux haies 3×6 + Jump squats 3×8 + Single leg hops 3×5/côté. Focus: temps de contact sol minimal, qualité > quantité", []],
      ["Cool-down", "5' étirements mollets, quadriceps, ischio-jambiers + foam roller rapide", []]
    ]),
    variants: { marathon: "3 séries", semi: "2-3 séries", half: "2 séries" },
    goals: GOALS_ALL,
    tags: ["pliométrie", "raideur", "renforcement", "explosif"]
  },
  {
    id: "ENR_STR_CORE_ANTI_ROTATION",
    cat: "C", sport: "strength",
    objectif: "Core anti-rotation — Pallof press, planche latérale, dead bug. Stabilité tronc en fatigue",
    necessite: "Obligatoire",
    when: "Toute l'année (2-3x/semaine)",
    phase: ["base", "build"],
    avoid: "Lombalgie aiguë",
    durationMin: [20, 30],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "5' activation core: cat-cow 10 reps, glute bridge 10, bird dog léger 6/côté", []],
      ["Main", "Circuit 3x (R:1'): Pallof press 12/côté + Planche latérale 30\"/côté + Dead bug 10/côté + Bird dog 8/côté + Chop anti-rotation câble/élastique 10/côté + Stir the pot swiss ball 8/côté", []],
      ["Cool-down", "5' étirements psoas, dorsaux, respiration diaphragmatique", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["core", "anti-rotation", "stabilité", "prévention"]
  },
  {
    id: "ENR_STR_EXCENTRIQUE_ISCHIO",
    cat: "C", sport: "strength",
    objectif: "Nordic hamstring + excentriques — prévention blessures ischio-jambiers. Protocole scandinave",
    necessite: "Obligatoire",
    when: "Toute l'année (2x/semaine)",
    phase: ["base", "build"],
    avoid: "Blessure ischio récente <6sem",
    durationMin: [20, 30],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "5' activation: marche talons, good mornings poids de corps 10, glute bridge 2×10", []],
      ["Main", "3x (R:90\"): Nordic curl 5 reps (excentrique 4-5s) + RDL unilat haltère 8/côté + Bridge unilat 12/côté + Glute-ham raise 8 + Leg curl excentrique 8 + Sliding hamstring curl 8", []],
      ["Cool-down", "5' étirements ischio-jambiers, psoas, foam roller ischios", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["excentrique", "ischio", "prévention", "nordic", "scandinave"]
  },
  {
    id: "ENR_STR_CONCURRENT_AM_PM",
    cat: "C", sport: "strength",
    objectif: "Concurrent AM/PM — AM muscu force (squat, deadlift) + PM endurance. Anti-interférence AMPK/mTOR",
    necessite: "Recommandé",
    when: "Build (max 2x/semaine)",
    phase: ["build"],
    avoid: "Phase affûtage",
    durationMin: [40, 50],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "10' mobilité dynamique: mobilité hanches, activation fessiers bande élastique, squats progressifs légers", []],
      ["AM", "Force (30-35'): Back Squat 4×5 @80-85% 1RM + Deadlift 4×5 @80-85% 1RM + Fentes marchées 3×8/côté + Hip thrust 3×10 + Mollets debout 3×12. R:2-3' entre séries lourdes", []],
      ["Note", "PM: Séance endurance Z2 après ≥6h de récup. 30g protéines + 50g glucides dans les 30' post-AM obligatoire", []]
    ]),
    variants: { ironman: "2x/semaine en Build", marathon: "1-2x/semaine en Build" },
    goals: GOALS_ALL,
    tags: ["concurrent", "AM-PM", "AMPK-mTOR", "anti-interférence"]
  },

  // =============================================
  // 12. RÉCUPÉRATION & RÉGÉNÉRATION AVANCÉE
  // =============================================
  {
    id: "ENR_RECUP_ACTIVE_MULTI",
    cat: "D", sport: "mixed",
    objectif: "Récup active multi-sport — 20' nage facile + 20' vélo facile. Varier les contraintes mécaniques",
    necessite: "Recommandé",
    when: "Lendemain séance clé",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Si blessure nécessitant repos complet",
    durationMin: [35, 50],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "20' nage facile Z1 (éducatifs) + 20' vélo facile Z1. Alterner pour varier les contraintes articulaires", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["récup", "active", "multi-sport", "régénération"]
  },
  {
    id: "ENR_RECUP_MOBILITE_YOGA",
    cat: "D", sport: "strength",
    objectif: "Mobilité & yoga flow — 30-40'. Amplitude, respiration, régénération fasciale",
    necessite: "Recommandé",
    when: "Jour off ou post-séance longue",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Si douleur articulaire aiguë",
    durationMin: [25, 40],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "5' respiration consciente (4-7-8) + mouvements articulaires doux (cercles poignets, épaules, cou)", []],
      ["Main", "20-30' yoga flow: 3×Sun salutations A + Warrior I/II 30\"/côté + Pigeon pose 60\"/côté + Frog stretch 2' + Hip circles 10/côté + Thread the needle 45\"/côté + Lizard pose 45\"/côté + Forward fold 60\" + Butterfly 60\"", []],
      ["Cool-down", "5' savasana, respiration nasale profonde", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["mobilité", "yoga", "régénération", "fascial"]
  },

  // =============================================
  // 13. RACE SIMULATION AVANCÉE
  // =============================================
  {
    id: "ENR_RACE_SIM_MARATHON",
    cat: "Race-Sim", sport: "course",
    objectif: "Simulation marathon — 32km avec 20km allure marathon. Dress rehearsal complète",
    necessite: "Obligatoire",
    when: "3-4 semaines avant course",
    phase: ["build", "peak"],
    avoid: "Si blessure",
    durationMin: [150, 195],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "5km Z2 progressif", ["Z2"]],
      ["Main", "20km allure marathon Z3. Tenue race, chaussures race, nutrition race (gels exacts). Dress rehearsal", ["Z3"]],
      ["Cool-down", "5-7km Z1 trot", ["Z1"]]
    ]),
    variants: { marathon: "32km (5+20+7)", semi: "18km (3+12+3)" },
    goals: GOALS_MAR,
    tags: ["simulation", "marathon", "dress-rehearsal", "race-day"]
  },
  {
    id: "ENR_RACE_SIM_SEMI",
    cat: "Race-Sim", sport: "course",
    objectif: "Simulation semi — 18km avec 12km allure semi. Test matériel et nutrition",
    necessite: "Obligatoire",
    when: "2-3 semaines avant course",
    phase: ["build", "peak"],
    avoid: "Si fatigue élevée",
    durationMin: [80, 105],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "3km Z2", ["Z2"]],
      ["Main", "12km allure semi Z4a. Chaussures race, nutrition exacte. Tester negative split 2ème 6km", ["Z4"]],
      ["Cool-down", "3km Z1", ["Z1"]]
    ]),
    variants: { semi: "18km total (3+12+3)" },
    goals: GOALS_SEMI,
    tags: ["simulation", "semi", "dress-rehearsal", "race-day"]
  },

  // =============================================
  // 14. AFFÛTAGE (TAPER) SPÉCIFIQUE
  // =============================================
  {
    id: "ENR_TAPER_OPENERS_RUN",
    cat: "B", sport: "course",
    objectif: "Openers J-2 — 30' facile + 4x30\" allure 5km. Activation neuromusculaire pré-course",
    necessite: "Obligatoire",
    when: "Peak / Taper — Openers J-2 avant course",
    phase: ["build", "peak", "taper"],
    avoid: "Jamais >J-2",
    durationMin: [25, 35],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "25' Z2 relâché + 4 x 30\" progressif Z5/Z6 (allure 5km) R:2' trot. Sensation: jambes de feu, pas de fatigue", ["Z2", "Z5", "Z6"]]
    ]),
    variants: { marathon: "4x30\" Z5", semi: "4x30\" Z6", half: "4x30\" Z5" },
    goals: [...GOALS_RUN, "half"],
    tags: ["openers", "taper", "activation", "J-2"]
  },
  {
    id: "ENR_TAPER_OPENERS_BIKE",
    cat: "B", sport: "cyclisme",
    objectif: "Openers vélo J-2 — 45' facile + 3x1' à 120% FTP. Activation nerveuse pré-course",
    necessite: "Obligatoire",
    when: "J-2 avant course",
    phase: ["build", "peak"],
    avoid: "Jamais >J-2",
    durationMin: [40, 50],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Main", "40' Z1/Z2 + 3 x 1' à 120% FTP R:3' Z1. Court, intense, pas fatigant. Préparer le système nerveux", ["Z1", "Z2", "Z5"]]
    ]),
    variants: { ironman: "3x1' Z5", half: "3x1' Z5" },
    goals: GOALS_TRI,
    tags: ["openers", "taper", "activation", "J-2", "vélo"]
  },
  {
    id: "ENR_TAPER_SHAKEOUT_RUN",
    cat: "D", sport: "course",
    objectif: "Shakeout J-1 — 15-20' trot très facile. Dernier check sensoriel",
    necessite: "Recommandé",
    when: "Veille de course",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Si anxiété → mieux vaut repos complet",
    durationMin: [15, 25],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "15-20' Z1 ultra-facile. 2 accélérations de 10\" en fin. Check: chaussures, tenue, sensations. Zéro fatigue", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["shakeout", "J-1", "taper", "pré-course"]
  },

  // =============================================
  // 15. HEAT & ALTITUDE ADAPTATION
  // =============================================
  {
    id: "ENR_HEAT_ACCLIM_Z2",
    cat: "A", sport: "course",
    objectif: "Heat acclimation — Z2 en condition chaude (>28°C ou sur-habillé). Adaptation thermorégulation 7-14j",
    necessite: "Recommandé",
    when: "2-3 semaines avant course chaude",
    phase: ["base", "build"],
    avoid: "Antécédent coup de chaleur, cardiopathie",
    durationMin: [40, 60],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "40-60' Z2 en conditions chaudes (ou vêtements chauds). Hydratation ++ en amont. Réduire intensité de 5-10% vs normal. Monitoring FC", ["Z2"]]
    ]),
    variants: { ironman: "60' Z2 chaleur (Kona prep)", half: "45' Z2 chaleur" },
    goals: GOALS_ALL,
    tags: ["heat", "acclimatation", "thermorégulation", "chaleur"]
  },
  {
    id: "ENR_ALTITUDE_EASY_RUN",
    cat: "A", sport: "course",
    objectif: "Altitude easy run — Z1/Z2 à altitude >1500m. Adaptation EPO naturelle, réduire 10-15% intensité",
    necessite: "Recommandé",
    when: "Stage altitude",
    phase: ["base", "build"],
    avoid: "Si mal d'altitude, SpO2 <90%",
    durationMin: [35, 60],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "35-60' Z1/Z2 (ajuster -10-15% vs allures plaine). Respiration contrôlée. Hydratation +30%", ["Z1", "Z2"]]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["altitude", "EPO", "adaptation", "stage"]
  },

  // =============================================
  // 16. SÉANCES SPÉCIFIQUES 10K
  // =============================================
  {
    id: "ENR_RUN_10K_TEMPO_CONTINU",
    cat: "B", sport: "course",
    objectif: "Tempo continu 10km — 25-35' allure 10km (Z4 haut). Tolérance lactate spécifique",
    necessite: "Obligatoire",
    when: "Spécifique 10km",
    phase: ["build"],
    avoid: "Phase base",
    durationMin: [45, 60],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 + accélérations", ["Z1", "Z2"]],
      ["Main", "25-35' continu allure 10km (Z4 haut). Ne pas partir trop vite: même effort du 1er au dernier km", ["Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "30' Z4 haut", marathon: "25' Z4 (rappel vitesse)" },
    goals: [...GOALS_RUN, "half"],
    tags: ["10km", "tempo", "allure-spécifique", "lactate"]
  },
  {
    id: "ENR_RUN_10K_REPETITIONS",
    cat: "B", sport: "course",
    objectif: "Répétitions 10km — 10x800m allure 10km R:1'. Volume qualité élevé",
    necessite: "Recommandé",
    when: "Build/Spécifique",
    phase: ["build"],
    avoid: "Fatigue musculaire ++",
    durationMin: [55, 70],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 + gammes", ["Z1", "Z2"]],
      ["Main", "10 x 800m allure 10km (Z4 haut) R:1' trot. Régularité absolue: <2\" d'écart entre chaque 800", ["Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "8x800m", marathon: "6x1000m" },
    goals: GOALS_RUN,
    tags: ["10km", "répétitions", "800m", "régularité"]
  },

  // =============================================
  // 17. LACTATE SHUTTLE & MÉTABOLIQUE
  // =============================================
  {
    id: "ENR_BIKE_LACTATE_SHUTTLE",
    cat: "B", sport: "cyclisme",
    objectif: "Lactate Shuttle — 8x(90\" Z5 + 3' Z3). Navette lactate continue. Clearance optimale",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Phase base",
    durationMin: [65, 85],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' progressif", ["Z1", "Z2"]],
      ["Main", "8 x (90\" Z5 110-115% FTP + 3' Z3 80% FTP actif). Pas de Z1. Navette lactate Brooks", ["Z5", "Z3"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { ironman: "8 reps complet", half: "6 reps" },
    goals: GOALS_TRI,
    tags: ["lactate-shuttle", "brooks", "clearance", "métabolique"]
  },
  {
    id: "ENR_RUN_LACTATE_CLEARANCE",
    cat: "B", sport: "course",
    objectif: "Lactate clearance — 6x(2' Z5 + 4' Z3). Apprendre au corps à recycler le lactate en course",
    necessite: "Recommandé",
    when: "Build/Spécifique",
    phase: ["build"],
    avoid: "Si incapable de maintenir Z3 après Z5",
    durationMin: [55, 70],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2", ["Z1", "Z2"]],
      ["Main", "6 x (2' Z5 + 4' Z3 actif sans Z1). Récup = Z3, pas Z1. Navette lactate en course", ["Z5", "Z3"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "6 reps", marathon: "5 reps + Z3 un peu plus bas" },
    goals: GOALS_RUN,
    tags: ["lactate-clearance", "navette", "course", "métabolique"]
  },
];
