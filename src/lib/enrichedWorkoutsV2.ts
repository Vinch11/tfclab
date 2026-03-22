// =============================================
// BIBLIOTHÈQUE ENRICHIE V2 — SÉANCES AVANCÉES BATCH 2
// ~65 séances couvrant les lacunes restantes
// SFR, TT, 5K, Back-to-back trail, FatMax, Gut Training,
// Technique natation, Sprint, Aquathlon, etc.
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

export const EnrichedWorkoutsV2: LibraryWorkout[] = [

  // =============================================
  // 1. VÉLO — SFR & FORCE SPÉCIFIQUE
  // =============================================
  {
    id: "V2_BIKE_SFR_CLASSIQUE",
    cat: "B", sport: "cyclisme",
    objectif: "SFR classique — 5x8' à 50-60rpm Z3/Z4 en côte (4-6%). Force spécifique vélo",
    necessite: "Obligatoire",
    when: "Build/Force (S3-S10)",
    phase: ["build"],
    avoid: "Douleur genou, tendon rotulien",
    durationMin: [70, 90],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' progressif Z1→Z3", ["Z1", "Z2", "Z3"]],
      ["Main", "5 x 8' en côte (4-6%) à 50-60 RPM, Z3/Z4 (85-95% FTP). R:4' moulinage descente. Assis, mains basses, force pure", ["Z3", "Z4"]],
      ["Cool-down", "10' Z1 plat", ["Z1"]]
    ]),
    variants: { ironman: "5x8' → 4x10' (progression)", half: "4x8'" },
    goals: GOALS_TRI,
    tags: ["sfr", "force", "cadence-basse", "côte", "vélo"]
  },
  {
    id: "V2_BIKE_SFR_PROGRESSIF",
    cat: "B", sport: "cyclisme",
    objectif: "SFR progressif — 4x10' (55rpm→70rpm intra-bloc). Force → vélocité enchaînée",
    necessite: "Recommandé",
    when: "Build avancé",
    phase: ["build"],
    avoid: "Si genou sensible",
    durationMin: [70, 90],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' progressif", ["Z1", "Z2"]],
      ["Main", "4 x 10' en côte: 5' à 55rpm Z4 + 5' à 70rpm Z4 (même puissance). Transition force→vélocité. R:4'", ["Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { ironman: "4x10'", half: "3x10'" },
    goals: GOALS_TRI,
    tags: ["sfr", "progressif", "force-vélocité", "vélo"]
  },
  {
    id: "V2_BIKE_GRIMPEUR_TEMPO",
    cat: "B", sport: "cyclisme",
    objectif: "Tempo grimpeur — 2x25' en bosse Z3 (75-82% FTP) cadence libre. Endurance montée longue",
    necessite: "Recommandé",
    when: "Spécifique montagne",
    phase: ["build"],
    avoid: "Phase base plate",
    durationMin: [80, 110],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' progressif terrain vallonné", ["Z1", "Z2"]],
      ["Main", "2 x 25' en montée soutenue Z3 (75-82% FTP). Cadence naturelle 70-80rpm. R:8' descente", ["Z3"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { ironman: "2x25' montée", half: "2x20' montée" },
    goals: [...GOALS_TRI, ...GOALS_TRAIL],
    tags: ["grimpeur", "tempo", "montée", "endurance-musculaire", "vélo"]
  },

  // =============================================
  // 2. VÉLO — CONTRE-LA-MONTRE & AÉRO
  // =============================================
  {
    id: "V2_BIKE_TT_POSITION",
    cat: "B", sport: "cyclisme",
    objectif: "TT position — 3x15' en position aéro Z3/Z4. Accoutumance aéro + puissance soutenue",
    necessite: "Obligatoire",
    when: "Spécifique tri (S8-S16)",
    phase: ["build", "peak"],
    avoid: "Si douleur cervicale/lombaire en position aéro",
    durationMin: [75, 100],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' progressif dont 5' position aéro", ["Z1", "Z2"]],
      ["Main", "3 x 15' position aéro stricte Z3/Z4 (80-92% FTP). R:5' Z1 mains hautes. Focus: respiration diaphragme, stabilité bassin", ["Z3", "Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { ironman: "3x15' → 2x25' (progression)", half: "3x12'" },
    goals: GOALS_TRI,
    tags: ["TT", "aéro", "position", "tri-spécifique", "vélo"]
  },
  {
    id: "V2_BIKE_TT_RACE_PACE",
    cat: "B", sport: "cyclisme",
    objectif: "TT Race Pace — 1x40-60' continu position aéro allure course. Simulation exacte segment vélo",
    necessite: "Obligatoire",
    when: "3-5 semaines avant course",
    phase: ["build", "peak"],
    avoid: "Vent fort latéral (sécurité)",
    durationMin: [90, 120],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' progressif", ["Z1", "Z2"]],
      ["Main", "40-60' continu position aéro allure course (75-82% FTP IM / 82-88% FTP 703). Nutrition identique race. Watts stables ±3%", ["Z3", "Z4"]],
      ["Cool-down", "15' Z1", ["Z1"]]
    ]),
    variants: { ironman: "60' allure IM (75-82% FTP)", half: "40' allure 703 (82-88% FTP)" },
    goals: GOALS_TRI,
    tags: ["TT", "race-pace", "simulation", "aéro", "vélo"]
  },

  // =============================================
  // 3. VÉLO — FATMAX & OXYDATION LIPIDIQUE
  // =============================================
  {
    id: "V2_BIKE_FATMAX_LONG",
    cat: "A", sport: "cyclisme",
    objectif: "FatMax long — 2h30-3h30 Z2 bas (65-72% FTP). Zone d'oxydation lipidique maximale",
    necessite: "Obligatoire",
    when: "Base/Build IM",
    phase: ["base", "build"],
    avoid: "Si glycogène déjà déplété (train low veille)",
    durationMin: [150, 210],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "15' progressif Z1→Z2, cadence 80rpm", ["Z1", "Z2"]],
      ["Main", "2h15-3h15 Z2 bas (65-72% FTP). Ravitaillement modéré (40-50g/h). Cadence confortable 80-90rpm. Respiration nasale possible = bon signe", ["Z2"]],
      ["Cool-down", "10' Z1 souple", ["Z1"]]
    ]),
    variants: { ironman: "3h30 Z2 bas FatMax", half: "2h30 Z2 bas" },
    goals: GOALS_TRI,
    tags: ["fatmax", "oxydation-lipidique", "Z2-bas", "endurance", "vélo"]
  },
  {
    id: "V2_BIKE_FATMAX_FASTED",
    cat: "A", sport: "cyclisme",
    objectif: "FatMax à jeun — 90-120' Z2 bas à jeun. Maximiser adaptations lipidiques",
    necessite: "Recommandé",
    when: "Base/Build (1-2x/semaine max)",
    phase: ["base", "build"],
    avoid: "Diabète, hypoglycémie, >2h à jeun",
    durationMin: [80, 120],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Main", "90-120' Z2 bas (65-72% FTP) à jeun. Eau + sel uniquement. Café noir OK. Emporter gel de secours. Si vertige → manger immédiatement", ["Z2"]]
    ]),
    variants: { ironman: "120' Z2 fasted", half: "90' Z2 fasted" },
    goals: GOALS_TRI,
    tags: ["fatmax", "fasted", "train-low", "oxydation-lipidique", "vélo"]
  },

  // =============================================
  // 4. VÉLO — SPRINT & PUISSANCE COURTE
  // =============================================
  {
    id: "V2_BIKE_SPRINT_NEUROMUSCULAR",
    cat: "C", sport: "cyclisme",
    objectif: "Sprints neuromusculaires — 8x10\" max effort R:3'. Recrutement fibres rapides + puissance pic",
    necessite: "Recommandé",
    when: "Build (toute phase)",
    phase: ["build"],
    avoid: "Fatigue musculaire importante",
    durationMin: [45, 60],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "20' Z2 + 3 accélérations progressives", ["Z1", "Z2"]],
      ["Main", "8 x 10\" sprint max assis puis danseuse R:3' Z1. Cadence >110rpm. Puissance >200% FTP", ["Z6"]],
      ["Cool-down", "15' Z1", ["Z1"]]
    ]),
    variants: { ironman: "6x10\" (maintien)", half: "8x10\"" },
    goals: GOALS_TRI,
    tags: ["sprint", "neuromusculaire", "puissance-pic", "vélo"]
  },
  {
    id: "V2_BIKE_TABATA",
    cat: "B", sport: "cyclisme",
    objectif: "Tabata vélo — 2x(8x20\"/10\") Z6-Z7. VO2max + capacité anaérobie en 8 minutes d'effort",
    necessite: "Recommandé",
    when: "Peak/Rappel",
    phase: ["peak"],
    avoid: "Phase base, fatigue élevée",
    durationMin: [40, 55],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "15' progressif Z1→Z3 + 2x15\" Z5", ["Z1", "Z2", "Z5"]],
      ["Main", "2 x (8 x 20\" all-out / 10\" repos) R:4' Z1 entre séries. Protocole Tabata original", ["Z6"]],
      ["Cool-down", "15' Z1", ["Z1"]]
    ]),
    variants: { half: "2 séries Tabata", ironman: "1 série (rappel)" },
    goals: GOALS_TRI,
    tags: ["tabata", "anaérobie", "vo2max", "court", "vélo"]
  },

  // =============================================
  // 5. COURSE — 5K SPÉCIFIQUE
  // =============================================
  {
    id: "V2_RUN_5K_VMA_200",
    cat: "B", sport: "course",
    objectif: "VMA courte 200m — 12-16x200m Z6+ (100-105% VMA). Vitesse terminale et relâchement",
    necessite: "Recommandé",
    when: "Build/Peak 5K-10K",
    phase: ["build", "peak"],
    avoid: "Si douleur musculaire résiduelle",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 + gammes + 4 lignes droites", ["Z1", "Z2"]],
      ["Main", "12-16 x 200m Z6+ (100-105% VMA) R:200m trot. Focus: relâchement facial/épaules, foulée haute", ["Z6"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "12x200m rappel vitesse", marathon: "10x200m rappel" },
    goals: [...GOALS_RUN, "half"],
    tags: ["5k", "vma", "200m", "vitesse", "relâchement"]
  },
  {
    id: "V2_RUN_5K_ALLURE_SPECIFIQUE",
    cat: "B", sport: "course",
    objectif: "Allure spécifique 5K — 5x1000m allure 5K (Z5) R:2'. Caler les sensations course",
    necessite: "Obligatoire",
    when: "Spécifique 5K (3-6 semaines avant)",
    phase: ["build"],
    avoid: "Si fatigue élevée",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 + 4 accélérations", ["Z1", "Z2"]],
      ["Main", "5 x 1000m allure 5K (Z5) R:2' trot. Régularité: <1\"/km d'écart. C'est un métronome", ["Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "Rappel vitesse 3x1000m Z5", marathon: "2x1000m Z5 rappel" },
    goals: [...GOALS_RUN, "half"],
    tags: ["5k", "allure-spécifique", "1000m", "métronome"]
  },
  {
    id: "V2_RUN_SPRINT_PLAT",
    cat: "C", sport: "course",
    objectif: "Sprints plat — 6-8x80-100m effort maximal R:3'. Vitesse maximale aérobie + recrutement",
    necessite: "Recommandé",
    when: "Build (toute phase)",
    phase: ["build"],
    avoid: "Ischio-jambiers fragiles, sol mouillé",
    durationMin: [35, 45],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 + gammes complètes + 4 progressifs", ["Z1", "Z2"]],
      ["Main", "6-8 x 80-100m sprint max R:3' marche/trot. Plat, vent dans le dos idéal. Relâchement +++", ["Z6"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["sprint", "plat", "vitesse-max", "neuromusculaire"]
  },

  // =============================================
  // 6. COURSE — ENDURANCE STRUCTURÉE
  // =============================================
  {
    id: "V2_RUN_SORTIE_LONGUE_STRUCTUREE",
    cat: "A", sport: "course",
    objectif: "Sortie longue structurée — Z2 + inserts tempo Z3 toutes les 30'. Volume + qualité",
    necessite: "Obligatoire",
    when: "Build/Spécifique marathon",
    phase: ["build"],
    avoid: "Si fatigue accumulée >3 jours",
    durationMin: [100, 140],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "1h40-2h20 Z2 avec 4-6 inserts de 5' Z3 (allure marathon +10\"/km) toutes les 25-30'. Volume aérobie + rappel tempo. Nutrition 40-60g/h", ["Z2", "Z3"]]
    ]),
    variants: { marathon: "6 inserts de 5' Z3 dans 2h20", semi: "4 inserts de 5' Z3 dans 1h40" },
    goals: GOALS_RUN,
    tags: ["longue", "structurée", "inserts", "marathon", "volume-qualité"]
  },
  {
    id: "V2_RUN_SORTIE_LONGUE_DEPLETION",
    cat: "A", sport: "course",
    objectif: "Sortie longue déplétion — 2h Z2 sans ravitaillement glucidique. Adaptation métabolique",
    necessite: "Recommandé",
    when: "Build IM/Marathon (1x/2semaines max)",
    phase: ["build"],
    avoid: "Si glycémie instable, >2h30 sans glucides",
    durationMin: [100, 130],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "2h Z2 stable sans glucides (eau + sel uniquement). Emporter gel de secours. Manger dans les 30min post. Adaptation fat ox", ["Z2"]]
    ]),
    variants: { marathon: "2h sans glucides", ironman: "2h → 2h15 (progression)" },
    goals: [...GOALS_MAR, ...GOALS_IM],
    tags: ["longue", "déplétion", "train-low", "fat-ox", "métabolique"]
  },

  // =============================================
  // 7. COURSE — GUT TRAINING
  // =============================================
  {
    id: "V2_RUN_GUT_TRAINING_Z3",
    cat: "A", sport: "course",
    objectif: "Gut training course — Z2/Z3 avec ingestion progressive 60→90g/h glucides. Tolérance digestive",
    necessite: "Obligatoire",
    when: "Spécifique IM/Marathon (6-10 semaines avant course)",
    phase: ["build"],
    avoid: "Si gastro ou SII en phase aiguë",
    durationMin: [75, 100],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "75-100' Z2/Z3 (allure marathon/IM). Ingérer gel/boisson toutes les 15-20'. Progresser de 60→90g/h sur 4-6 séances. Noter tout inconfort GI", ["Z2", "Z3"]]
    ]),
    variants: { ironman: "90' Z2/Z3 — target 80-90g/h", marathon: "75' Z3 — target 60-80g/h" },
    goals: [...GOALS_IM, ...GOALS_MAR],
    tags: ["gut-training", "nutrition", "tolérance-digestive", "course"]
  },
  {
    id: "V2_BIKE_GUT_TRAINING",
    cat: "A", sport: "cyclisme",
    objectif: "Gut training vélo — 2-3h Z2/Z3 avec ingestion 80→100g/h. Entraîner l'intestin",
    necessite: "Obligatoire",
    when: "Spécifique IM (8-12 semaines avant course)",
    phase: ["build"],
    avoid: "Si infection intestinale",
    durationMin: [120, 180],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Main", "2-3h Z2/Z3 (allure IM). Ingérer boisson + gel/barre toutes les 15-20'. Target: 80→100g/h glucides. Varier sources: maltodextrine, fructose, gel, solide. Noter tolérance", ["Z2", "Z3"]]
    ]),
    variants: { ironman: "3h Z2 — target 90-100g/h", half: "2h Z3 — target 80g/h" },
    goals: GOALS_TRI,
    tags: ["gut-training", "nutrition", "vélo", "ironman", "tolérance-digestive"]
  },

  // =============================================
  // 8. TRAIL — BACK-TO-BACK & SPÉCIFIQUE ULTRA
  // =============================================
  {
    id: "V2_TRAIL_BACK_TO_BACK_SAM",
    cat: "A", sport: "course",
    objectif: "Back-to-back SAMEDI — 3h-4h terrain montagneux D+ élevé. 1ère partie du weekend choc",
    necessite: "Obligatoire",
    when: "Spécifique ultra (S8-S16)",
    phase: ["build", "peak"],
    avoid: "Si blessure ou maladie",
    durationMin: [180, 240],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "3h-4h terrain montagneux. Z2 montée, technique descente. D+ ciblé. Nutrition réelle (60-80g/h). Bâtons obligatoires >3h", ["Z1", "Z2", "Z3"]]
    ]),
    variants: {},
    goals: GOALS_TRAIL,
    tags: ["back-to-back", "samedi", "ultra", "trail", "D+", "weekend-choc"],
    dPlusTargetM: { min: 1200, max: 2500 }
  },
  {
    id: "V2_TRAIL_BACK_TO_BACK_DIM",
    cat: "A", sport: "course",
    objectif: "Back-to-back DIMANCHE — 2h-3h sur jambes fatiguées. Simuler la 2ème moitié d'ultra",
    necessite: "Obligatoire",
    when: "Spécifique ultra (S8-S16)",
    phase: ["build", "peak"],
    avoid: "Si douleur articulaire SAMEDI",
    durationMin: [120, 180],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "2h-3h terrain vallonné sur jambes fatiguées. Z2 stricte (pas de Z3). Focus: gestion effort, nutrition, mental. Apprendre à avancer fatigué", ["Z1", "Z2"]]
    ]),
    variants: {},
    goals: GOALS_TRAIL,
    tags: ["back-to-back", "dimanche", "ultra", "trail", "pré-fatigue", "mental"],
    dPlusTargetM: { min: 800, max: 1800 }
  },
  {
    id: "V2_TRAIL_MARCHE_COURSE_ALTERNE",
    cat: "A", sport: "course",
    objectif: "Marche/course alternée ultra — 3-5h (10' course Z2 / 5' marche rapide). Stratégie ultra longue distance",
    necessite: "Obligatoire",
    when: "Spécifique ultra (S10-S18)",
    phase: ["build"],
    avoid: "Si pas de terrain approprié",
    durationMin: [180, 300],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "3-5h alternance: 10' course Z2 / 5' marche rapide (côtes). Jamais arrêt complet. Bâtons. Nutrition 50-70g/h. Simuler stratégie course ultra", ["Z1", "Z2"]]
    ]),
    variants: {},
    goals: GOALS_TRAIL,
    tags: ["marche-course", "alternée", "ultra", "stratégie", "trail"],
    dPlusTargetM: { min: 1000, max: 3000 }
  },
  {
    id: "V2_TRAIL_DESCENTE_COMPETITIVE",
    cat: "B", sport: "course",
    objectif: "Descente compétitive — 6x3' descente rapide technique Z4. Gagner du temps en descente",
    necessite: "Recommandé",
    when: "Spécifique trail court/montagne",
    phase: ["build"],
    avoid: "Sol gelé/mouillé, cheville instable",
    durationMin: [55, 70],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 montée progressive", ["Z1", "Z2"]],
      ["Main", "6 x 3' descente rapide technique Z4 (pente 10-15%). Remontée trot récup. Focus: pas courts, regard 5m devant, bras écartés", ["Z4"]],
      ["Cool-down", "10' Z1 plat", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_TRAIL,
    tags: ["descente", "compétitive", "technique", "trail", "vitesse-descente"]
  },
  {
    id: "V2_TRAIL_PROPRIOCEPTION",
    cat: "C", sport: "course",
    objectif: "Proprioception trail — 40' terrain technique irrégulier Z2. Stabilité cheville + lecture terrain",
    necessite: "Recommandé",
    when: "Toute l'année (trail)",
    phase: ["base", "build"],
    avoid: "Si entorse récente <3sem",
    durationMin: [35, 50],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "35-50' sur sentier technique (racines, pierres, single track). Z2 cardio. Focus: placement pied, anticipation obstacles, cadence adaptée au terrain", ["Z2"]]
    ]),
    variants: {},
    goals: GOALS_TRAIL,
    tags: ["proprioception", "technique", "trail", "cheville", "sentier"]
  },

  // =============================================
  // 9. NATATION — TECHNIQUE AVANCÉE
  // =============================================
  {
    id: "V2_SWIM_TECHNIQUE_CATCH",
    cat: "C", sport: "natation",
    objectif: "Technique catch — 6x(100m catch-up + 100m nage). Améliorer prise d'eau et longueur de bras",
    necessite: "Obligatoire",
    when: "Base/Build (toute l'année)",
    phase: ["base", "build"],
    avoid: "Si épaule douloureuse (adapter amplitude)",
    durationMin: [45, 60],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m facile varié", ["Z1", "Z2"]],
      ["Main", "6 x (100m catch-up Z1 + 100m nage complète Z2). Focus: entrée main devant épaule, coude haut, prise d'eau loin devant. Compter coups/25m", ["Z1", "Z2"]],
      ["Cool-down", "200m dos", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["technique", "catch-up", "prise-eau", "natation", "éducatif"]
  },
  {
    id: "V2_SWIM_TECHNIQUE_ROTATION",
    cat: "C", sport: "natation",
    objectif: "Rotation & roulis — éducatifs rotation tronc + nage unilatérale. Alignement et propulsion",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "Épaule instable",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m facile", ["Z1", "Z2"]],
      ["Main", "4 x (50m nage bras droit seul + 50m bras gauche + 100m nage complète focus rotation). Puis 4x100m 3 temps respiration alternée. R:15\"", ["Z1", "Z2"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["technique", "rotation", "roulis", "natation", "éducatif"]
  },
  {
    id: "V2_SWIM_EAU_LIBRE_DRAFT",
    cat: "A", sport: "natation",
    objectif: "Eau libre drafting — 2000-3000m avec alternance leadership/draft. Tactique course",
    necessite: "Recommandé",
    when: "Spécifique tri (S10-S18)",
    phase: ["build"],
    avoid: "Seul en eau libre (sécurité), eau trop froide",
    durationMin: [45, 65],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Main", "2000-3000m en eau libre avec partenaire(s). Alternance 200m en tête / 200m en draft (pieds). Visée toutes les 8-10 brasses. Accélérations départ + bouées", ["Z2", "Z3"]]
    ]),
    variants: { ironman: "3000m simulation complète", half: "2000m" },
    goals: GOALS_TRI,
    tags: ["eau-libre", "drafting", "tactique", "natation", "open-water"]
  },
  {
    id: "V2_SWIM_SIGHTING_DRILL",
    cat: "C", sport: "natation",
    objectif: "Sighting drills — 1500m avec visée (polo/tarzan) toutes les 6-8 brasses. Orientation eau libre",
    necessite: "Recommandé",
    when: "Pré-compétition tri",
    phase: ["peak"],
    avoid: "Si cervicales douloureuses",
    durationMin: [35, 50],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "300m facile", ["Z1", "Z2"]],
      ["Main", "6 x 200m Z2/Z3 avec 1 coup de tête Polo toutes les 8 brasses. + 4 x 100m nage tête haute (Tarzan) Z3. Intégrer la visée sans casser le rythme", ["Z2", "Z3"]],
      ["Cool-down", "200m dos", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_TRI,
    tags: ["sighting", "polo", "eau-libre", "orientation", "natation"]
  },
  {
    id: "V2_SWIM_ENDURANCE_3K",
    cat: "A", sport: "natation",
    objectif: "Endurance 3000m — série longue continue Z2/Z3. Simulation distance race IM",
    necessite: "Obligatoire",
    when: "Spécifique IM",
    phase: ["build"],
    avoid: "Épaule fatiguée",
    durationMin: [65, 85],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + éducatifs", ["Z1", "Z2"]],
      ["Main", "3000m continu Z2/Z3 (allure course -2-3\"/100m). Respiration bilatérale. Cadence stable. Focus: efficacité, ne pas forcer", ["Z2", "Z3"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "3000-3800m continu", half: "2000m continu" },
    goals: GOALS_TRI,
    tags: ["endurance", "3000m", "continu", "natation", "simulation"]
  },

  // =============================================
  // 10. BRIQUES AVANCÉES
  // =============================================
  {
    id: "V2_BRICK_AQUATHLON",
    cat: "Brique", sport: "mixed",
    objectif: "Aquathlon brique — 1500m natation + 10km course enchaînés. Transition T1→course immédiate",
    necessite: "Recommandé",
    when: "Spécifique tri",
    phase: ["build"],
    avoid: "Phase base",
    durationMin: [70, 90],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Natation", "1500m Z3 (allure course)", ["Z3"]],
      ["Transition T1", "Enchaîner <3min", []],
      ["Course", "10km Z3/Z4 progressif. Trouver les jambes rapidement. Cadence 180spm", ["Z3", "Z4"]]
    ]),
    variants: { half: "1500m + 8km", ironman: "2000m + 6km" },
    goals: GOALS_TRI,
    tags: ["aquathlon", "brique", "swim-run", "T1"]
  },
  {
    id: "V2_BRICK_INDOOR_RUN",
    cat: "Brique", sport: "mixed",
    objectif: "Brique indoor→outdoor — 60' HT vélo Z3/Z4 + 20' course Z3 extérieur. Transition jambes lourdes",
    necessite: "Recommandé",
    when: "Hiver / mauvais temps",
    phase: ["build"],
    avoid: "Si vertige post-HT",
    durationMin: [75, 90],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Vélo indoor", "60' home-trainer avec 3x10' Z3/Z4 (85-95% FTP)", ["Z2", "Z3", "Z4"]],
      ["Transition", "Changer chaussures rapidement", []],
      ["Course", "20' Z3 (allure marathon) extérieur. Focus: trouver le rythme en <500m malgré jambes lourdes", ["Z3"]]
    ]),
    variants: { ironman: "60' HT + 20' CAP Z3", half: "45' HT + 15' CAP Z3/Z4" },
    goals: GOALS_TRI,
    tags: ["brique", "indoor", "home-trainer", "hiver", "transition"]
  },
  {
    id: "V2_BRICK_TRIPLE",
    cat: "Brique", sport: "mixed",
    objectif: "Brique triple — 1500m natation + 1h30 vélo + 20' course. Mini-triathlon complet",
    necessite: "Recommandé",
    when: "Spécifique tri (3-6 semaines avant course)",
    phase: ["build"],
    avoid: "Phase base, si blessure",
    durationMin: [155, 190],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Natation", "1500m Z2/Z3 progressif", ["Z2", "Z3"]],
      ["T1", "Transition natation→vélo <5min", []],
      ["Vélo", "1h30 Z2/Z3 allure course", ["Z2", "Z3"]],
      ["T2", "Transition vélo→course <3min", []],
      ["Course", "20' Z3 progressif → Z4 dernières 5'", ["Z3", "Z4"]]
    ]),
    variants: { ironman: "2000m + 2h vélo + 25' CAP", half: "1500m + 1h30 + 20'" },
    goals: GOALS_TRI,
    tags: ["brique", "triple", "mini-tri", "simulation", "T1-T2"]
  },

  // =============================================
  // 11. RENFORCEMENT — SPÉCIFIQUE COUREUR
  // =============================================
  {
    id: "V2_STR_HANCHE_COUREUR",
    cat: "C", sport: "strength",
    objectif: "Mobilité hanche coureur — abducteurs, fléchisseurs, rotateurs. Prévention ITB + économie de foulée",
    necessite: "Obligatoire",
    when: "Toute l'année (3x/semaine)",
    phase: ["base", "build"],
    avoid: "Crise sciatique aiguë",
    durationMin: [20, 30],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Circuit 2-3x: Clamshell 15/côté + Monster walk élastique 20 pas + Fire hydrant 12/côté + 90/90 stretch 30\"/côté + Pigeon pose 45\"/côté. R:1'", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["hanche", "mobilité", "ITB", "coureur", "prévention"]
  },
  {
    id: "V2_STR_ISOMETRIQUE_SEUIL",
    cat: "C", sport: "strength",
    objectif: "Isométrique seuil — wall sit, single leg hold, pont. Endurance musculaire sans impact articulaire",
    necessite: "Recommandé",
    when: "Build/Spécifique",
    phase: ["build"],
    avoid: "Si tendinopathie rotulienne aiguë",
    durationMin: [20, 30],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "3x: Wall sit 60\" + Single leg wall sit 30\"/côté + Pont glute 45\" + Calf raise isométrique 30\"/côté + Planche frontale 60\". R:90\"", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["isométrique", "seuil", "endurance-musculaire", "sans-impact"]
  },
  {
    id: "V2_STR_ESCALIERS_TRAIL",
    cat: "C", sport: "strength",
    objectif: "Escaliers trail — 20-30' montées escaliers (2 à 2) + descente contrôlée. Force + proprioception verticale",
    necessite: "Recommandé",
    when: "Build trail (urbain si pas de montagne)",
    phase: ["build"],
    avoid: "Si genou douloureux en descente",
    durationMin: [25, 35],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "20-30' montées escaliers (2 marches à la fois, poussée glute). Descente contrôlée 1 marche. 6-8 séries de 3-5 étages. R:1' entre séries", []]
    ]),
    variants: {},
    goals: GOALS_TRAIL,
    tags: ["escaliers", "trail", "force-verticale", "proprioception", "urbain"]
  },
  {
    id: "V2_STR_GAINAGE_DYNAMIQUE",
    cat: "C", sport: "strength",
    objectif: "Gainage dynamique triathlon — mountain climber, bear crawl, pallof rotation. Stabilité sous mouvement",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "Lombalgie aiguë",
    durationMin: [20, 30],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Circuit 3x: Mountain climber 20\" + Bear crawl 10m A/R + Pallof press rotation 8/côté + Deadbug bras/jambes alterné 10/côté + Planche latérale hip dip 8/côté. R:1'", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["gainage", "dynamique", "core", "stabilité", "triathlon"]
  },
  {
    id: "V2_STR_FORCE_MAX_UPPER",
    cat: "C", sport: "strength",
    objectif: "Force haut du corps — tractions, développé, rowing. Propulsion natation + posture vélo",
    necessite: "Recommandé",
    when: "Build (2x/semaine)",
    phase: ["build"],
    avoid: "Veille séance natation clé",
    durationMin: [35, 45],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "4 séries: Tractions (ou assistées) 6-8 + Développé haltères 8-10 + Rowing 1 bras 8/côté + Face pull élastique 15 + Dips (ou assistés) 8. R:2' inter-séries", []]
    ]),
    variants: { ironman: "2x/sem Build", half: "1-2x/sem" },
    goals: GOALS_TRI,
    tags: ["force", "haut-du-corps", "natation", "tractions", "renforcement"]
  },

  // =============================================
  // 12. RÉCUPÉRATION STRUCTURÉE
  // =============================================
  {
    id: "V2_RECUP_FOAM_ROLLING",
    cat: "D", sport: "strength",
    objectif: "Foam rolling structuré — 20-25' protocole complet. Auto-massage myofascial post-séance clé",
    necessite: "Recommandé",
    when: "Post-séance clé ou jour off",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Sur zone inflammée aiguë",
    durationMin: [18, 25],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Protocole: Mollets 2'/côté + Ischio 2'/côté + Quad/IT band 2'/côté + Fessiers 2'/côté + Thoracique 2' + Lats 1'/côté. Points triggers: 30\" pression maintenue", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["foam-rolling", "myofascial", "récupération", "auto-massage"]
  },
  {
    id: "V2_RECUP_NAGE_DETENTE",
    cat: "D", sport: "natation",
    objectif: "Nage détente — 1500m multi-nages facile. Décompression articulaire + circulation",
    necessite: "Recommandé",
    when: "Lendemain séance clé CAP/vélo",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Si épaule douloureuse",
    durationMin: [30, 40],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Main", "1500m: 400m crawl Z1 + 200m dos + 200m brasse + 400m crawl Z1 + 200m pull buoy + 100m éducatifs. Aucun effort. Zéro chrono. Décompresser", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["récupération", "nage", "détente", "multi-nages", "décompression"]
  },
  {
    id: "V2_RECUP_VELO_REGENERATION",
    cat: "D", sport: "cyclisme",
    objectif: "Vélo régénération — 45-60' Z1 strict <60% FTP. Flush sanguin sans stress mécanique",
    necessite: "Recommandé",
    when: "Lendemain séance clé / post-compétition",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Si besoin repos complet",
    durationMin: [40, 60],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Main", "45-60' Z1 strict (<60% FTP). Cadence 85-95rpm confortable. Aucune bosse, aucun effort. Si FC >70% FCmax → ralentir. Flush sanguin uniquement", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["régénération", "vélo", "Z1", "flush", "récupération"]
  },

  // =============================================
  // 13. SÉANCES SPÉCIFIQUES IRONMAN
  // =============================================
  {
    id: "V2_IM_BIKE_QUEEN_STAGE",
    cat: "A", sport: "cyclisme",
    objectif: "Queen Stage IM — 4h30-5h Z2/Z3 avec nutrition race complète. Sortie royale du cycle",
    necessite: "Obligatoire",
    when: "Peak week spécifique (1x dans le plan)",
    phase: ["build", "peak"],
    avoid: "Si malade ou surentraîné",
    durationMin: [270, 310],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Main", "4h30-5h Z2 (68-75% FTP) position aéro. 3-4 blocs de 30' Z3. Nutrition 80-100g/h identique race. Hydratation 750ml/h. C'est la répétition générale vélo", ["Z2", "Z3"]]
    ]),
    variants: { ironman: "5h complètes + nutrition race" },
    goals: GOALS_IM,
    tags: ["queen-stage", "ironman", "longue", "5h", "simulation", "vélo"]
  },
  {
    id: "V2_IM_SWIM_PROGRESSIVE_3800",
    cat: "A", sport: "natation",
    objectif: "Progressive 3800m — negative split. 1ère moitié Z2, 2ème Z3. Finir fort comme en course",
    necessite: "Obligatoire",
    when: "Spécifique IM (2-4x dans le plan)",
    phase: ["build"],
    avoid: "Épaule fatiguée",
    durationMin: [75, 100],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "200m facile", ["Z1"]],
      ["Main", "3800m: 1900m Z2 (confort) + 1900m Z3 (allure course puis -2-3\"/100m pour finish). Negative split obligatoire. Visée toutes les 200m", ["Z2", "Z3"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "3800m progressive" },
    goals: GOALS_IM,
    tags: ["progressive", "3800m", "negative-split", "natation", "ironman"]
  },

  // =============================================
  // 14. SÉANCES SPÉCIFIQUES 70.3
  // =============================================
  {
    id: "V2_703_BIKE_SPLIT_NEGATIVE",
    cat: "B", sport: "cyclisme",
    objectif: "Split négatif 70.3 — 2h vélo: 1h à 78% FTP + 1h à 85% FTP. Stratégie pacing 70.3",
    necessite: "Obligatoire",
    when: "Spécifique 70.3",
    phase: ["build"],
    avoid: "Phase base",
    durationMin: [120, 145],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Main", "2h position aéro: 1ère heure Z2 haut (78% FTP) + 2ème heure Z3 (85% FTP). Nutrition 70-80g/h. Pacing: ne JAMAIS partir au-dessus de 78% 1ère heure", ["Z2", "Z3"]]
    ]),
    variants: { half: "2h split négatif 78%→85% FTP" },
    goals: GOALS_703,
    tags: ["split-négatif", "70.3", "pacing", "vélo", "stratégie"]
  },
  {
    id: "V2_703_RUN_BRICK_FAST_START",
    cat: "Brique", sport: "mixed",
    objectif: "Brique 70.3 fast start — 1h30 vélo Z3 + 5km CAP: 1er km Z4 haut puis Z4. Apprendre à attaquer T2",
    necessite: "Recommandé",
    when: "Spécifique 70.3",
    phase: ["build"],
    avoid: "Si mollet/ischio fragile",
    durationMin: [115, 140],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Vélo", "1h30 Z3 (80-85% FTP) position aéro", ["Z3"]],
      ["T2", "Transition rapide <2min", []],
      ["Course", "5km: 1er km Z4 haut (allure 10km) puis Z4 (allure 70.3). Trouver les jambes en <200m. Cadence 180+ spm", ["Z4"]]
    ]),
    variants: { half: "1h30 vélo + 5km CAP fast start" },
    goals: GOALS_703,
    tags: ["brique", "fast-start", "70.3", "T2", "attaque"]
  },

  // =============================================
  // 15. SÉANCES MENTALES & STRATÉGIQUES
  // =============================================
  {
    id: "V2_RUN_MENTAL_FATIGUE",
    cat: "A", sport: "course",
    objectif: "Run sous fatigue mentale — 60' Z2 après 30' tâche cognitive intense. Entraîner le cerveau fatigué",
    necessite: "Recommandé",
    when: "Build/Spécifique (1x/2semaines)",
    phase: ["build"],
    avoid: "Si déjà fatigué mentalement (travail stressant)",
    durationMin: [55, 70],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Pré-fatigue", "30' tâche cognitive intense (Stroop test, calcul mental, quiz) avant de sortir courir", []],
      ["Main", "60' Z2 strict. Le RPE sera plus élevé (~+1 point) pour même allure. C'est normal. Apprendre à performer fatigué", ["Z2"]]
    ]),
    variants: { marathon: "60' Z2 post tâche cognitive", ironman: "75' Z2 post tâche cognitive" },
    goals: GOALS_ALL,
    tags: ["mental", "fatigue-cognitive", "RPE", "psychologie", "endurance"]
  },
  {
    id: "V2_RUN_NEGATIVE_SPLIT_RACE_SIM",
    cat: "B", sport: "course",
    objectif: "Negative split discipline — 10km en 2 moitiés: 5km Z3 bas + 5km Z3 haut→Z4. Discipline mentale absolue",
    necessite: "Recommandé",
    when: "Spécifique",
    phase: ["build"],
    avoid: "Si impossible de retenir le rythme 1er 5km",
    durationMin: [45, 60],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2", ["Z1", "Z2"]],
      ["Main", "10km: 5km à Z3 bas (RETENIR) + 5km Z3 haut→Z4 (LÂCHER). Interdit de partir trop vite. Discipline > talent", ["Z3", "Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { semi: "10km negative split", marathon: "12km (6+6)" },
    goals: GOALS_RUN,
    tags: ["negative-split", "discipline", "mental", "pacing", "course"]
  },

  // =============================================
  // 16. VÉLO — CADENCE & TECHNIQUE
  // =============================================
  {
    id: "V2_BIKE_CADENCE_HAUTE",
    cat: "C", sport: "cyclisme",
    objectif: "Cadence haute — 6x5' Z2 à 100-110rpm. Efficacité pédalage + économie neuromusculaire",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Si douleur rotulienne",
    durationMin: [60, 80],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "15' Z2 cadence libre", ["Z1", "Z2"]],
      ["Main", "6 x 5' Z2 (70-75% FTP) à 100-110rpm. R:3' cadence libre. Focus: pédalage rond, pas de rebond sur la selle, hanche stable", ["Z2"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { ironman: "6x5' high cadence", half: "5x5'" },
    goals: GOALS_TRI,
    tags: ["cadence-haute", "technique", "vélocité", "pédalage", "vélo"]
  },
  {
    id: "V2_BIKE_SINGLE_LEG",
    cat: "C", sport: "cyclisme",
    objectif: "Single leg drills — 6x(2' jambe droite + 2' jambe gauche) Z2. Éliminer les points morts",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Douleur genou unilatérale",
    durationMin: [50, 65],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "15' Z2", ["Z1", "Z2"]],
      ["Main", "6 x (2' jambe droite seule + 2' jambe gauche seule) Z2 60-70rpm. Pied libre sur repose-pied ou décroché. R:2' deux jambes. Focus: point mort haut et bas", ["Z2"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_TRI,
    tags: ["single-leg", "technique", "pédalage", "point-mort", "vélo"]
  },

  // =============================================
  // 17. COURSE — ÉCONOMIE DE COURSE
  // =============================================
  {
    id: "V2_RUN_STRIDES_POST_EF",
    cat: "A", sport: "course",
    objectif: "EF + strides — 45-60' Z2 + 6x20\" accélérations progressives. Neuromusculation dans volume",
    necessite: "Obligatoire",
    when: "Toute l'année (1-2x/semaine)",
    phase: ["base", "build"],
    avoid: "Fatigue musculaire importante",
    durationMin: [45, 65],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Main", "45-60' Z2 fondamental. Dernières 10': 6 x 20\" accélérations progressives (Z2→Z5 sur 20\") R:1' trot. Garder le système nerveux éveillé même en EF", ["Z2", "Z5"]]
    ]),
    variants: { marathon: "60' Z2 + 6 strides", semi: "45' Z2 + 6 strides" },
    goals: GOALS_ALL,
    tags: ["strides", "neuromusculaire", "économie", "EF", "fondamentale"]
  },
  {
    id: "V2_RUN_EDUCATIFS_TECHNIQUES",
    cat: "C", sport: "course",
    objectif: "Éducatifs techniques — gammes complètes 30'. Montées genoux, talons-fesses, skipping, griffé, bondissements",
    necessite: "Obligatoire",
    when: "Toute l'année (2x/semaine, avant séance qualité)",
    phase: ["base", "build"],
    avoid: "Si douleur articulaire aiguë",
    durationMin: [25, 35],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "10' trot Z1", ["Z1"]],
      ["Main", "Gammes complètes: 2x30m montées genoux + 2x30m talons-fesses + 2x30m skipping + 2x30m pas chassés + 2x30m griffé + 4x40m bondissements progressifs. Marche retour", []],
      ["Cool-down", "5' trot Z1", ["Z1"]]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["éducatifs", "technique", "gammes", "économie-course", "fondamentaux"]
  },

  // =============================================
  // 18. COURSE — TEMPO CONTINU (STYLE KÉNYAN)
  // =============================================
  {
    id: "V2_RUN_KENYAN_TEMPO_LONG",
    cat: "B", sport: "course",
    objectif: "Tempo kényan long — 40-60' continu Z3 haut (allure marathon -15\"/km). Le 'bread and butter' des Kényans",
    necessite: "Recommandé",
    when: "Build/Spécifique marathon",
    phase: ["build"],
    avoid: "Si incapable de maintenir l'allure 30'+",
    durationMin: [60, 80],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 progressif", ["Z1", "Z2"]],
      ["Main", "40-60' continu Z3 haut (allure marathon -10-15\"/km). Stable du début à la fin. Si FC dérive >8bpm → trop vite", ["Z3"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { marathon: "60' Z3 haut continu", semi: "40' Z3 haut" },
    goals: GOALS_RUN,
    tags: ["kenyan", "tempo-long", "continu", "marathon", "bread-butter"]
  },
  {
    id: "V2_RUN_ETHIOPIAN_FARTLEK",
    cat: "B", sport: "course",
    objectif: "Fartlek éthiopien — 50' terrain vallonné, accélérer en montée Z4/Z5, Z2 en descente. Tout au feeling",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Phase affûtage",
    durationMin: [50, 65],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "10' Z2", ["Z2"]],
      ["Main", "35-45' terrain vallonné naturel. Accélérer Z4/Z5 chaque montée (30\"-3'), Z2 en descente/plat. Aucun chrono. Au feeling. Écouter le corps", ["Z2", "Z4", "Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { marathon: "45' fartlek terrain", semi: "35' fartlek terrain" },
    goals: GOALS_RUN,
    tags: ["éthiopien", "fartlek", "terrain", "feeling", "montée"]
  },

  // =============================================
  // 19. COURSE — OVER/UNDER COURSE
  // =============================================
  {
    id: "V2_RUN_OVER_UNDER",
    cat: "B", sport: "course",
    objectif: "Over-Under course — 4x8' (2' allure 10km / 2' allure marathon x2). Clearance lactate en course",
    necessite: "Recommandé",
    when: "Build/Spécifique",
    phase: ["build"],
    avoid: "Phase base",
    durationMin: [55, 70],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "15' Z2 + 4 accélérations", ["Z1", "Z2"]],
      ["Main", "4 x 8' (2' allure 10km Z4 haut + 2' allure marathon Z3 x2). R:3' Z1. Apprendre à recycler le lactate", ["Z3", "Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: { marathon: "4x8' complet", semi: "3x8' + allure semi au lieu de marathon" },
    goals: GOALS_RUN,
    tags: ["over-under", "clearance", "lactate", "course", "multi-allure"]
  },

  // =============================================
  // 20. NATATION — RACE PACE & PACING
  // =============================================
  {
    id: "V2_SWIM_RACE_PACE_IM",
    cat: "B", sport: "natation",
    objectif: "Race pace IM — 6x500m allure course IM (Z3) R:20\". Caler exactement son allure",
    necessite: "Obligatoire",
    when: "Spécifique IM",
    phase: ["build"],
    avoid: "Si épaule fatiguée",
    durationMin: [65, 85],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + 4x50m progressif", ["Z1", "Z2"]],
      ["Main", "6 x 500m allure course IM (Z3) R:20\". Chaque 500m à ±1\"/100m de l'allure cible. Régularité absolue", ["Z3"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "6x500m Z3", half: "5x400m Z3/Z4" },
    goals: GOALS_TRI,
    tags: ["race-pace", "ironman", "natation", "régularité", "pacing"]
  },
  {
    id: "V2_SWIM_THRESHOLD_MIXTE",
    cat: "B", sport: "natation",
    objectif: "Seuil mixte distances — 4x(100+200+300)m Z4 R:15\". Varier les distances au seuil",
    necessite: "Recommandé",
    when: "Build/Spécifique",
    phase: ["build"],
    avoid: "Si épaule fatiguée",
    durationMin: [55, 75],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "400m facile + éducatifs", ["Z1", "Z2"]],
      ["Main", "4 x (100m Z4 + 200m Z4 + 300m Z4) R:15\" entre chaque, R:30\" entre séries. Même allure /100m sur toutes les distances", ["Z4"]],
      ["Cool-down", "200m facile", ["Z1"]]
    ]),
    variants: { ironman: "4 séries complètes", half: "3 séries" },
    goals: GOALS_TRI,
    tags: ["seuil", "mixte", "distances", "natation", "variabilité"]
  },
];
