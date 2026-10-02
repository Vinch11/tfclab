/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICHED WORKOUTS — FORMATS COURTS (Triathlon Sprint / Olympique / 5K)
 *
 * Motivation (audit coach) : Sprint (750m/20km/5K), Olympique (1.5km/40km/10K)
 * et 5K couraient n'importe quelle fiche générique du catalogue sans jamais
 * disposer de leur propre contenu calibré. Deux bugs en cascade l'expliquaient :
 *
 *   1. `normalizeGoal()` (workoutCatalogBuilder.ts) redirigeait Sprint/Olympique
 *      sur le pool "half" (70.3) et 5K sur "10k" SANS tag dédié — aucune fiche
 *      ne pouvait donc jamais documenter de `variants`/`goals` "sprint",
 *      "olympic" ou "5k" (corrigé : ces trois clés existent désormais).
 *   2. `defaultGoalsForSport()` (workoutGoalsEnricher.ts), le filet de secours
 *      appliqué à toute fiche historique sans `goals[]` explicite, ne
 *      retournait jamais ces trois clés — rendant TOUT le contenu générique
 *      (récup, renfo, technique nage, bike/run sans calibrage de distance)
 *      invisible au bonus de score "objectif documenté" pour ces plans
 *      (corrigé en parallèle de ce fichier).
 *
 * Ce fichier comble ce qui ne pouvait PAS être résolu en élargissant des tags :
 * du contenu genuinement calibré sur la durée/intensité propre à chaque format
 * (Sprint ~55min-1h20 total, Olympique ~2h-2h30, 5K ~15-22min) — un brick
 * Sprint n'est pas un brick 70.3 raccourci, c'est un exercice de bascule à
 * haute fréquence cardiaque immédiate ; un seuil Olympique est plus proche du
 * tempo soutenu que d'un seuil IM ; un 5K vit à l'intensité VO2max/vVO2 là où
 * un 10K vit au seuil.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";

function mk(parts: [string, string, string[]][]) {
  return parts.map(([part, text, zones]) => ({ part, text, zones }));
}

const SHORT_FORMATS: LibraryWorkout[] = [

  // ═══════════════════════════════════════════════════════════════
  // TRIATHLON SPRINT (750m / 20km / 5K · course totale ~55min-1h20)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "B_SPRINT_BIKE_VO2_SHORT",
    cat: "B",
    sport: "cyclisme",
    objectif: "Vélo VO2max court 6×3min — puissance proche de l'allure course Sprint (20km ~30-35min)",
    necessite: "Recommandé",
    when: "Build/Peak, 1x/sem",
    phase: ["build", "peak"],
    avoid: "Séance clé <48h, fatigue genoux",
    durationMin: [50, 65],
    metricKey: "puissance",
    sportKey: "cycling",
    structure: mk([
      ["Warm-up", "15' Z1→Z2 + 3x1' Z4 progressif, cadence croissante", ["Z1", "Z2", "Z4"]],
      ["Main", "6x3' Z5 (105-110% FTP, intensité proche de l'allure course Sprint) R:2' Z1 roue libre. Cadence élevée 95-100rpm, position aéro dès la 2e répétition. Objectif : habituer le corps à partir vite sans s'effondrer avant le run.", ["Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      sprint: "6x3' Z5 — dose complète, c'est le format de référence",
      olympic: "4x5' Z4 haut (seuil/tempo, pas VO2 pur — format plus long)",
      half: "5x4min Z4 haut (allure 70.3, pas Sprint)",
      "10k": "6x3min Z5 (transfert VO2 route)"
    },
    goals: ["sprint", "half", "10k"],
    tags: ["sprint", "triathlon", "cyclisme", "vo2max", "short-course"],
    notes: "Format Sprint = puissance proche du seuil anaérobie plutôt que seuil pur (course ~30-35min). La séance doit laisser les jambes assez fraîches pour enchaîner un run de qualité — ne pas confondre avec une séance VO2 pure de cycliste (repos plus long, pas de contrainte T2)."
  },
  {
    id: "C_SPRINT_RUN_5K_PACE",
    cat: "C",
    sport: "course",
    objectif: "Course allure Sprint (5K post-vélo) — 5×1000m allure 5K cible R:90s",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Veille de brick longue",
    durationMin: [40, 55],
    metricKey: "allure",
    sportKey: "running",
    structure: mk([
      ["Warm-up", "15' Z1→Z2 + 4x20s progressif", ["Z1", "Z2"]],
      ["Main", "5x1000m à allure Sprint cible (Z5, ≈allure 5K) R:90s trot. Idéalement en fin de séance vélo (15-20' Z3-Z4 avant) pour reproduire la sensation de jambes lourdes du T2.", ["Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      sprint: "5x1000m Z5 — dose complète",
      olympic: "4x1500m Z4 (allure 10K, volume Olympique)",
      "10k": "5x1000m allure 10K légèrement plus lente",
      half: "4x1200m Z4 (volume 70.3)"
    },
    goals: ["sprint", "10k"],
    tags: ["sprint", "5k", "allure-specifique", "triathlon", "T2"],
    notes: "Le run Sprint se court quasi à l'intensité 5K dès la sortie de vélo — contrairement au 70.3/IM où l'allure est négociée sur la durée. Travailler la capacité à encaisser cette intensité immédiatement après le vélo est la vraie spécificité de la séance."
  },
  {
    id: "BRIQUE_SPRINT_RACE_PACE",
    cat: "Brique",
    sport: "brick",
    objectif: "Brick Sprint race-pace — vélo 30-35' allure course + T2 chrono + run 15-20' allure Sprint",
    necessite: "Obligatoire",
    when: "Peak, S-2 à S-3",
    phase: ["peak"],
    avoid: "Plus de 2x dans le plan, semaine taper finale",
    durationMin: [55, 75],
    metricKey: "puissance",
    sportKey: "cycling",
    structure: mk([
      ["Warm-up", "Vélo: 10' Z1→Z2", ["Z1", "Z2"]],
      ["Main", "Vélo: 30-35' à allure Sprint cible (Z4 haut, 88-95% FTP) + T2 <90s (chrono, pratiquer le déchaussage à l'arrêt) + Course: 15-20' à allure Sprint cible (Z4-Z5). Jambes lourdes attendues sur le 1er km — c'est le but de l'exercice, pas un signal d'alarme.", ["Z4", "Z5"]],
      ["Cool-down", "10' marche", ["Z1"]]
    ]),
    variants: {
      sprint: "Vélo 30-35' + T2 + run 15-20' — format de référence",
      olympic: "Vélo 1h-1h15 + T2 + run 25-30' allure Olympique (voir BRIQUE_OLY_RACE_PACE)",
      half: "Vélo 45-50' + T2 + run 20-25'"
    },
    goals: ["sprint", "half"],
    tags: ["brick", "sprint", "race-pace", "T2", "triathlon-court"],
    notes: "La brique Sprint se joue sur la VITESSE de transition et la capacité à partir vite en course, pas sur le volume. Pratiquer le T2 chronométré est aussi important que l'intensité elle-même — quelques secondes gagnées en transition comptent proportionnellement plus sur un format de ~1h."
  },
  {
    id: "B_SPRINT_SWIM_RACE_PACE",
    cat: "B",
    sport: "natation",
    objectif: "Natation allure course Sprint — 750m fractionné 15×50m allure cible R:15s",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Technique dégradée, débutant eau libre",
    durationMin: [35, 50],
    metricKey: "css",
    sportKey: "swimming",
    structure: mk([
      ["Warm-up", "300m souple + 4x50m progressif", ["Z1", "Z2"]],
      ["Main", "15x50m à allure course Sprint (CSS +0-2s/100m) R:15s. Départ groupé simulé sur les 3 premiers (bousculade, respiration contrainte), sortie d'eau rapide sur les 2 derniers.", ["Z4"]],
      ["Cool-down", "200m souple dos", ["Z1"]]
    ]),
    variants: {
      sprint: "15x50m — dose complète (volume course 750m)",
      olympic: "2x750m négative split (voir B_OLY_SWIM_RACE_PACE)",
      half: "20x50m (volume 1.5km)"
    },
    goals: ["sprint", "half"],
    tags: ["sprint", "natation", "race-pace", "css", "triathlon-court"],
    notes: "750m se joue presque intégralement en allure course dès le départ — contrairement aux formats longs où la nage se gère en glisse/économie. Travailler le départ groupé et la sortie d'eau rapide est spécifique au format court où ces secondes pèsent proportionnellement lourd."
  },

  // ═══════════════════════════════════════════════════════════════
  // TRIATHLON OLYMPIQUE (1.5km / 40km / 10K · course totale ~2h-2h30)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "B_OLY_BIKE_TEMPO_SUSTAINED",
    cat: "B",
    sport: "cyclisme",
    objectif: "Vélo tempo soutenu 3×15min — seuil format Olympique (40km ~65-85min)",
    necessite: "Recommandé",
    when: "Build/Peak, 1x/sem",
    phase: ["build", "peak"],
    avoid: "Séance clé <48h",
    durationMin: [75, 95],
    metricKey: "puissance",
    sportKey: "cycling",
    structure: mk([
      ["Warm-up", "15' Z1→Z2 + 2x3' Z3 progressif", ["Z1", "Z2", "Z3"]],
      ["Main", "3x15' Z4 (seuil, 90-95% FTP, allure course Olympique soutenable sur 40km) R:4' Z1-Z2. Position aéro maintenue sur toute la durée, cadence régulière 85-90rpm — c'est un effort de gestion, pas d'à-coups.", ["Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      olympic: "3x15' Z4 — dose complète, c'est le format de référence",
      sprint: "6x3' Z5 (intensité plus haute, voir B_SPRINT_BIKE_VO2_SHORT)",
      half: "2x20' Z3-Z4 (volume 70.3, intensité un cran sous)"
    },
    goals: ["olympic", "half"],
    tags: ["olympic", "triathlon", "cyclisme", "seuil", "tempo"],
    notes: "L'Olympique se roule au seuil/tempo soutenu, pas en VO2max (trop court pour 40km) ni en endurance pure (trop long pour rester passif). C'est l'intensité la plus dure qu'on puisse tenir en gardant assez de jambes pour un 10K de qualité derrière."
  },
  {
    id: "C_OLY_RUN_10K_PACE",
    cat: "C",
    sport: "course",
    objectif: "Course allure Olympique (10K post-vélo) — 4×1500m allure 10K cible R:2'",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Veille de brick longue",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "running",
    structure: mk([
      ["Warm-up", "15' Z1→Z2 + 4x20s progressif", ["Z1", "Z2"]],
      ["Main", "4x1500m à allure Olympique cible (Z4, ≈allure 10K) R:2' trot. Idéalement après 20-30' vélo Z3 pour simuler la fatigue T2 — le run Olympique se négocie sur la durée, pas en départ-canon.", ["Z4"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      olympic: "4x1500m Z4 — dose complète",
      sprint: "5x1000m Z5 (intensité plus haute, voir C_SPRINT_RUN_5K_PACE)",
      "10k": "4x1500m allure 10K pure (sans contrainte T2)",
      half: "3x2000m Z3-Z4 (volume 70.3)"
    },
    goals: ["olympic", "10k"],
    tags: ["olympic", "10k", "allure-specifique", "triathlon", "T2"],
    notes: "Contrairement au Sprint (départ-canon), le 10K Olympique exige de la gestion : partir légèrement en retenue sur le 1er km puis tenir le rythme. Travailler cette discipline post-vélo est la vraie spécificité — un coureur pur part souvent trop vite sur cette séance."
  },
  {
    id: "BRIQUE_OLY_RACE_PACE",
    cat: "Brique",
    sport: "brick",
    objectif: "Brick Olympique race-pace — vélo 1h-1h15 allure course + T2 + run 25-30' allure Olympique",
    necessite: "Obligatoire",
    when: "Peak, S-3 à S-4",
    phase: ["peak"],
    avoid: "Plus de 3x dans le plan, semaine taper finale",
    durationMin: [90, 120],
    metricKey: "puissance",
    sportKey: "cycling",
    structure: mk([
      ["Warm-up", "Vélo: 10' Z1→Z2", ["Z1", "Z2"]],
      ["Main", "Vélo: 1h-1h15 à allure Olympique cible (Z4, 90-95% FTP) + T2 <2' + Course: 25-30' à allure Olympique cible (Z4). Négocier le 1er km de course en retenue avant de caler le rythme.", ["Z4"]],
      ["Cool-down", "10' marche + 10' Z1 vélo", ["Z1"]]
    ]),
    variants: {
      olympic: "Vélo 1h-1h15 + T2 + run 25-30' — format de référence",
      sprint: "Vélo 30-35' + T2 + run 15-20' (voir BRIQUE_SPRINT_RACE_PACE)",
      half: "Vélo 1h30-2h + T2 rapide + run 30-40' allure 70.3"
    },
    goals: ["olympic", "half"],
    tags: ["brick", "olympic", "race-pace", "T2", "triathlon"],
    notes: "C'est la répétition générale du format Olympique : assez long pour sentir la vraie fatigue T2 (contrairement au Sprint), assez court pour rester à une intensité proche de la course (contrairement à l'IM/70.3 roulé en endurance)."
  },
  {
    id: "B_OLY_SWIM_RACE_PACE",
    cat: "B",
    sport: "natation",
    objectif: "Natation allure course Olympique — 1500m négative split 2×750m",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Technique dégradée, débutant eau libre",
    durationMin: [45, 60],
    metricKey: "css",
    sportKey: "swimming",
    structure: mk([
      ["Warm-up", "400m souple + 4x50m progressif", ["Z1", "Z2"]],
      ["Main", "2x750m négative split : 1er 750m à allure course Olympique (CSS +2-3s/100m, gestion), 2e 750m plus rapide (CSS +0-1s/100m, lâcher). R:1' entre les deux.", ["Z3", "Z4"]],
      ["Cool-down", "200m souple dos", ["Z1"]]
    ]),
    variants: {
      olympic: "2x750m négative split — dose complète (volume course 1.5km)",
      sprint: "15x50m allure course (voir B_SPRINT_SWIM_RACE_PACE)",
      half: "1500m continu négative split (volume 70.3)"
    },
    goals: ["olympic", "half"],
    tags: ["olympic", "natation", "race-pace", "css", "triathlon"],
    notes: "1.5km se nage en gestion d'énergie — contrairement au Sprint (quasi-sprint du départ à l'arrivée), l'Olympique demande de garder des ressources pour les 40km de vélo qui suivent. Le négative split entraîne cette discipline."
  },

  // ═══════════════════════════════════════════════════════════════
  // 5K — INTENSITÉ VO2MAX/vVO2, DISTINCTE DE L'ALLURE SEUIL DU 10K
  // ═══════════════════════════════════════════════════════════════
  {
    id: "C_5K_VO2_REPS_6x800",
    cat: "C",
    sport: "course",
    objectif: "VO2max 5K — 6×800m allure 5K cible R:2' trot",
    necessite: "Obligatoire",
    when: "Build/Peak, spécifique 5K (4-8 semaines avant)",
    phase: ["build", "peak"],
    avoid: "Si fatigue élevée, moins de 48h avant une autre séance clé",
    durationMin: [45, 60],
    metricKey: "allure",
    sportKey: "running",
    structure: mk([
      ["Warm-up", "15' Z1→Z2 + gammes + 4x20s progressif", ["Z1", "Z2"]],
      ["Main", "6x800m à allure 5K cible (Z5, ≈vVO2max) R:2' trot. Régularité stricte entre reps (<2s/km d'écart) — c'est un métronome, pas une rampe.", ["Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      "5k": "6x800m Z5 — dose complète, c'est le format de référence",
      "10k": "5x1000m Z4 haut (allure plus proche du seuil, voir catalogue 10K)",
      sprint: "5x1000m allure Sprint (voir C_SPRINT_RUN_5K_PACE)"
    },
    goals: ["5k", "sprint"],
    tags: ["5k", "vo2max", "800m", "vvo2", "metronome"],
    notes: "Le 5K se court proche de la vVO2max — une intensité que le 10K n'atteint jamais (le 10K vit au seuil, un cran sous). Confondre les deux allures est l'erreur la plus fréquente : un plan 5K qui n'hérite que de fiches 10K sous-stimule systématiquement la composante VO2max qui fait la différence sur ce format."
  },
  {
    id: "C_5K_PACE_LONG_REPS_3x1600",
    cat: "C",
    sport: "course",
    objectif: "Allure spécifique 5K (reps longues) — 3×1600m allure 5K cible R:3'",
    necessite: "Recommandé",
    when: "Build/Peak, spécifique 5K",
    phase: ["build", "peak"],
    avoid: "Si fatigue élevée",
    durationMin: [45, 60],
    metricKey: "allure",
    sportKey: "running",
    structure: mk([
      ["Warm-up", "15' Z1→Z2 + 4x20s progressif", ["Z1", "Z2"]],
      ["Main", "3x1600m à allure 5K cible (Z5) R:3' trot. Répétition plus longue que 800m : travaille la tolérance à tenir l'allure course sur une durée proche du tiers de la course réelle.", ["Z5"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      "5k": "3x1600m Z5 — dose complète",
      "10k": "3x2000m Z4 (allure 10K, voir catalogue 10K)",
      semi: "Rappel vitesse 2x1600m Z5"
    },
    goals: ["5k"],
    tags: ["5k", "allure-specifique", "1600m", "tolerance"],
    notes: "Complément naturel de C_5K_VO2_REPS_6x800 : reps plus longues, même allure, pour habituer le corps à tenir l'intensité course sur des blocs plus proches de la réalité de la compétition."
  },
  {
    id: "B_5K_FINISH_KICK",
    cat: "B",
    sport: "course",
    objectif: "Finish kick 5K — accélération progressive sur les 800 derniers mètres",
    necessite: "Recommandé",
    when: "Peak, 2-3 semaines avant course",
    phase: ["peak"],
    avoid: "Fatigue neuromusculaire, moins de 72h avant la course",
    durationMin: [35, 45],
    metricKey: "allure",
    sportKey: "running",
    structure: mk([
      ["Warm-up", "15' Z1→Z2 + gammes + 4 lignes droites 60m", ["Z1", "Z2"]],
      ["Main", "20' Z3 continu (simule le corps de course) puis accélération progressive sur 800m : 400m à allure 5K (Z5) + 400m finish (Z6, quasi-sprint les 100 derniers mètres). Récup complète puis répéter 1x si fraîcheur suffisante.", ["Z3", "Z5", "Z6"]],
      ["Cool-down", "10' Z1", ["Z1"]]
    ]),
    variants: {
      "5k": "20' Z3 + 400m Z5 + 400m finish Z6 — dose complète",
      sprint: "15' Z3 + 300m finish (format course plus court)",
      "10k": "Identique mais placé après 25-30' Z3 (corps de course plus long)"
    },
    goals: ["5k", "sprint"],
    tags: ["5k", "finish", "kick", "neuromusculaire", "peak"],
    notes: "Beaucoup de coureurs 5K perdent leur place dans les 400 derniers mètres par manque d'habitude à accélérer en fin d'effort déjà intense. Cette séance entraîne spécifiquement ce geste — distinct d'un sprint à froid."
  },
  {
    id: "TT_5K_TEST",
    cat: "TT",
    sport: "course",
    objectif: "Test chrono 5K — effort maximal, prédicteur et calibration allure",
    necessite: "Recommandé",
    when: "Base/Build (test initial) puis mi-cycle (recalibrage)",
    phase: ["base", "build"],
    avoid: "Semaine de récup, moins de 5 jours avant la course cible",
    durationMin: [35, 50],
    metricKey: "allure",
    sportKey: "running",
    structure: mk([
      ["Warm-up", "15' Z1→Z2 + gammes + 3 accélérations progressives", ["Z1", "Z2"]],
      ["Main", "5km chrono en effort maximal soutenable (piste ou parcours plat de référence, idéalement identique à chaque passage pour comparer). Partir à allure cible visée puis ajuster aux sensations — pas de départ-canon qui casse les 3 derniers kilomètres.", ["Z4", "Z5", "Z6"]],
      ["Cool-down", "10' Z1 trot", ["Z1"]]
    ]),
    variants: { "5k": "5km chrono complet — dose de référence" },
    goals: ["5k"],
    tags: ["5k", "test", "chrono", "predicteur", "calibration"],
    notes: "Sert de double usage : prédicteur de performance (table de Riegel/VMA) et calibration d'allure pour les séances d'allure spécifique qui suivent dans le cycle. À répéter en mi-cycle pour ajuster les allures cibles à la progression réelle, jamais à moins de 5 jours de la course cible."
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT CONSOLIDÉ
// ─────────────────────────────────────────────────────────────────────────────
export const EnrichedWorkoutsShortFormats: LibraryWorkout[] = [...SHORT_FORMATS];

/** IDs prescriptibles par l'IA — utiles pour audit / tests de couverture Sprint/Olympique/5K. */
export const SHORT_FORMATS_IDS = SHORT_FORMATS.map((w) => w.id);
