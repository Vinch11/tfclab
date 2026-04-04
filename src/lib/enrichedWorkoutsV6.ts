/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICHED WORKOUTS V6 — Formats Anti-Monotonie
 * 
 * Séances à structure variée pour maintenir la motivation et l'engagement :
 * 1. Pyramide / Ladder (Billat, Daniels)
 * 2. Dégressif / Descending Sets (Seiler)
 * 3. Fartlek Libre / Créatif (Holmer — format original)
 * 4. Circuit Cardio-Technique (mix force + cardio ludique)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";

// =============================================
// 1. PYRAMIDE / LADDER — Billat, Daniels
// =============================================
const PYRAMID_LADDER: LibraryWorkout[] = [
  {
    id: "B_RUN_PYRAMID_VMA",
    cat: "B",
    sport: "course",
    objectif: "Pyramide VMA – variété de durées, engagement mental progressif",
    necessite: "Recommandé",
    when: "Build/Peak, remplace 1 séance VMA classique toutes les 3 semaines",
    phase: ["build", "peak"],
    avoid: "Fatigue nerveuse accumulée, veille compétition",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "run_pyramid_vma",
    structure: [
      { part: "Warm-up", text: "15min Z1-Z2 progressif + 4 accélérations 80m", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Pyramide montante-descendante : 200m → 400m → 600m → 800m → 600m → 400m → 200m à 95-105% VMA. Récup = 50% du temps d'effort (jog Z1). La montée progressive engage l'athlète, la descente offre un finish positif. Réf: Daniels – structure ladder pour variété perceptuelle.", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "10min Z1 décroissant + étirements dynamiques", zones: ["Z1"] }
    ],
    variants: {
      "10k": "Pyramide 300→600→1000→600→300 à allure 10K",
      semi: "Pyramide 400→800→1200→800→400 à allure seuil",
      marathon: "Pyramide tempo : 3'→5'→8'→5'→3' à allure marathon",
      trail_short: "Sur côte : 1'→2'→3'→2'→1' en montée seuil"
    },
    goals: ["10k", "semi", "marathon", "half", "trail_short", "trail_mountain"],
    tags: ["pyramid", "ladder", "variety", "anti-monotony", "Daniels"],
    notes: "Format très apprécié des athlètes car chaque intervalle est différent. Casse la routine du fractionné répétitif."
  },
  {
    id: "B_BIKE_PYRAMID_POWER",
    cat: "B",
    sport: "cyclisme",
    objectif: "Pyramide puissance – stimulation multi-zones, variété mentale",
    necessite: "Recommandé",
    when: "Build, 1×/2-3 semaines en remplacement d'intervalles classiques",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée, VLamax très haute (limiter les blocs courts)",
    durationMin: [60, 80],
    metricKey: "puissance",
    sportKey: "bike_pyramid_power",
    structure: [
      { part: "Warm-up", text: "15min Z1-Z2 progressif + 2×30s à 110% FTP", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Pyramide de puissance : 1min @110% FTP → 2min @105% → 4min @FTP → 6min @95% FTP → 4min @FTP → 2min @105% → 1min @110%. Récup 2min Z1 entre chaque. Total ~24min en zone. Stimulation multi-systèmes dans une seule séance.", zones: ["Z3", "Z4", "Z5"] },
      { part: "Cool-down", text: "10min Z1 souple", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Pyramide longue : 3'→5'→8'→10'→8'→5'→3' à 85-95% FTP",
      half: "Pyramide : 2'→4'→6'→4'→2' à 90-105% FTP"
    },
    goals: ["ironman", "half", "marathon", "semi"],
    tags: ["pyramid", "power", "variety", "multi-zone"],
    notes: "Excellente séance de transition entre blocs de travail monotone. L'athlète ne sait jamais exactement ce qui vient = engagement cognitif."
  },
  {
    id: "B_SWIM_PYRAMID_CSS",
    cat: "B",
    sport: "natation",
    objectif: "Pyramide CSS natation – variété de distances, maintien technique sous fatigue",
    necessite: "Recommandé",
    when: "Build/Peak, 1×/2 semaines",
    phase: ["build", "peak"],
    avoid: "Douleur épaule",
    durationMin: [45, 60],
    metricKey: "css",
    sportKey: "swim_pyramid_css",
    structure: [
      { part: "Warm-up", text: "400m : 200 crawl souple + 100 éducatifs + 100 battements", zones: ["Z1"] },
      { part: "Main", text: "Pyramide : 50m → 100m → 200m → 300m → 200m → 100m → 50m à allure CSS ±5s/100m. Repos : 10s par 50m de la distance (ex: 200m = 40s repos). Focus technique maintenue sur les longues distances.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "200m nage au choix souple + 100m dos", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Pyramide longue : 100→200→400→200→100 en pull buoy",
      half: "50→100→200→100→50 × 2 séries"
    },
    goals: ["ironman", "half"],
    tags: ["pyramid", "swim", "CSS", "variety"],
    notes: "Casse la monotonie des séries classiques 10×100m. Chaque distance demande un ajustement de rythme."
  }
];

// =============================================
// 2. DÉGRESSIF / DESCENDING SETS — Seiler
// =============================================
const DESCENDING_SETS: LibraryWorkout[] = [
  {
    id: "B_RUN_DESCENDING_TEMPO",
    cat: "B",
    sport: "course",
    objectif: "Tempo dégressif – finish positif, confiance en fin de séance",
    necessite: "Recommandé",
    when: "Build/Peak, idéal 2-3 sem avant objectif",
    phase: ["build", "peak"],
    avoid: "Fatigue importante",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "run_descending_tempo",
    structure: [
      { part: "Warm-up", text: "15min Z1-Z2 + 4 lignes droites progressives", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Blocs dégressifs avec intensité croissante : 12min @ allure marathon → 8min @ allure semi → 5min @ allure 10K → 3min @ allure 5K. Récup 2min jog Z1 entre chaque. Principe : l'effort raccourcit mais accélère = sensation de puissance croissante. Réf: Seiler – finish positif renforce la confiance.", zones: ["Z3", "Z4", "Z5"] },
      { part: "Cool-down", text: "10min Z1 + étirements", zones: ["Z1"] }
    ],
    variants: {
      marathon: "15' marathon → 10' semi → 5' 10K",
      semi: "10' semi → 6' 10K → 3' 5K",
      "10k": "8' seuil → 5' VO2 → 2' sprint",
      trail_short: "8' allure trail → 5' seuil montée → 2' sprint côte"
    },
    goals: ["marathon", "semi", "10k", "half", "trail_short"],
    tags: ["descending", "negative-split", "confidence", "anti-monotony", "Seiler"],
    notes: "Séance de confiance par excellence. L'athlète termine avec les allures les plus rapides = sensation de maîtrise et de fraîcheur."
  },
  {
    id: "B_BIKE_DESCENDING_INTERVALS",
    cat: "B",
    sport: "cyclisme",
    objectif: "Intervalles dégressifs vélo – intensité montante, durée descendante",
    necessite: "Optionnel",
    when: "Build, 1×/3 semaines",
    phase: ["build", "peak"],
    avoid: "VLamax haute (limiter le bloc final court/intense)",
    durationMin: [55, 75],
    metricKey: "puissance",
    sportKey: "bike_descending",
    structure: [
      { part: "Warm-up", text: "15min Z1-Z2 + 3×20s accélérations", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8min @ 90% FTP → 6min @ 95% FTP → 4min @ 100% FTP → 2min @ 110% FTP → 1min @ 120% FTP. Récup 3min Z1 entre chaque. Progression d'intensité avec durée qui diminue = toujours gérable mentalement.", zones: ["Z3", "Z4", "Z5"] },
      { part: "Cool-down", text: "10min Z1 retour au calme", zones: ["Z1"] }
    ],
    variants: {
      ironman: "10'→8'→6'→4' de 85% à 100% FTP (pas de >FTP)",
      half: "6'→4'→3'→2' de 90% à 110% FTP"
    },
    goals: ["ironman", "half", "semi", "marathon"],
    tags: ["descending", "intervals", "progressive-intensity"],
    notes: "Psychologiquement plus facile que des intervalles uniformes : chaque effort est plus court que le précédent."
  }
];

// =============================================
// 3. FARTLEK LIBRE / CRÉATIF — Holmer (format original)
// =============================================
const FARTLEK_LIBRE: LibraryWorkout[] = [
  {
    id: "A_RUN_FARTLEK_LIBRE",
    cat: "A",
    sport: "course",
    objectif: "Fartlek libre – autonomie de l'athlète, plaisir de courir, instinct",
    necessite: "Recommandé",
    when: "Toute phase, idéal en récup active ou milieu de semaine légère",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Aucun (ajuster si fatigue : rester en Z1-Z2)",
    durationMin: [40, 55],
    metricKey: "cardiaque",
    sportKey: "run_fartlek_libre",
    structure: [
      { part: "Warm-up", text: "10min jog facile sans montre (courir au feeling)", zones: ["Z1"] },
      { part: "Main", text: "25-35min de Fartlek libre : l'athlète accélère QUAND IL VEUT, AUSSI LONGTEMPS QU'IL VEUT, à L'INTENSITÉ QU'IL VEUT. Seules règles : 1) Au moins 5 accélérations. 2) Varier les durées (10s à 3min). 3) Écouter son corps. Réf: Gösta Holmer (1930s) – le Fartlek original suédois était un jeu, pas un protocole. Retrouver le plaisir primitif de courir.", zones: ["Z1", "Z2", "Z3", "Z4"] },
      { part: "Cool-down", text: "5-10min marche/jog très facile", zones: ["Z1"] }
    ],
    variants: {
      marathon: "45min, accélérations de 1-5min max, finir par 2×3min @ allure marathon",
      trail_short: "En sentier : accélérer dans les montées, récupérer dans les descentes",
      trail_mountain: "En montagne : jouer avec le terrain (sprint montée, récup crête)",
      "10k": "35min, inclure 3-4 accélérations proches de l'allure 10K"
    },
    goals: ["marathon", "semi", "10k", "trail_short", "trail_mountain", "trail_ultra", "trail_long", "ironman", "half"],
    tags: ["fartlek", "free", "creative", "fun", "autonomy", "Holmer"],
    notes: "SÉANCE CLÉ ANTI-MONOTONIE. Redonner à l'athlète le contrôle. Pas de montre obligatoire, pas de zones imposées. Le coach fait confiance. À placer stratégiquement quand la motivation baisse."
  },
  {
    id: "A_BIKE_FARTLEK_TERRAIN",
    cat: "A",
    sport: "cyclisme",
    objectif: "Fartlek terrain vélo – jouer avec le parcours, varier les relances",
    necessite: "Optionnel",
    when: "Toute phase, remplace sortie Z2 monotone",
    phase: ["base", "build"],
    avoid: "Aucun",
    durationMin: [60, 90],
    metricKey: "cardiaque",
    sportKey: "bike_fartlek_terrain",
    structure: [
      { part: "Warm-up", text: "15min Z1-Z2 sur terrain plat", zones: ["Z1", "Z2"] },
      { part: "Main", text: "40-65min en utilisant le TERRAIN comme coach : sprinter chaque panneau, accélérer chaque côte, relancer chaque rond-point. Entre les relances : Z2 souple. Pas de puissance cible, pas de durée imposée. Variante : alterner 5min aéro/5min mains en haut, ou danseuse chaque côte.", zones: ["Z2", "Z3", "Z4"] },
      { part: "Cool-down", text: "10min Z1 retour facile", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Sortie longue 90min avec micro-relances terrain",
      trail_mountain: "Sur gravel/chemin : jouer avec les sections techniques"
    },
    goals: ["ironman", "half", "marathon", "semi", "trail_short"],
    tags: ["fartlek", "terrain", "outdoor", "fun", "variety"],
    notes: "Redonne du plaisir aux cyclistes coincés sur home-trainer. À faire dehors obligatoirement."
  }
];

// =============================================
// 4. CIRCUIT CARDIO-TECHNIQUE — Mix force + cardio ludique
// =============================================
const CIRCUIT_CARDIO_TECH: LibraryWorkout[] = [
  {
    id: "C_STR_CIRCUIT_CARDIO_RUN",
    cat: "C",
    sport: "strength",
    objectif: "Circuit cardio-technique coureur – renforcement ludique avec cardio intégré",
    necessite: "Recommandé",
    when: "Base/Build, 1-2×/sem, remplace séance de renforcement classique",
    phase: ["base", "build"],
    avoid: "Blessure articulaire aiguë",
    durationMin: [35, 50],
    metricKey: "cardiaque",
    sportKey: "circuit_cardio_run",
    structure: [
      { part: "Warm-up", text: "8min : 3min jog + gammes dynamiques (montées genoux, talons-fesses, pas chassés)", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3-4 tours de circuit (45s effort / 15s transition) : Station 1 – Squat Jump. Station 2 – Plank Mountain Climbers. Station 3 – Fentes alternées. Station 4 – Burpees (modifiés si besoin). Station 5 – Course sur place genoux hauts. Station 6 – Gainage latéral dynamique. Repos 2min entre les tours. Le format circuit change constamment l'effort = zéro ennui.", zones: ["Z3", "Force", "Cardio"] },
      { part: "Cool-down", text: "7min étirements complets + respiration", zones: ["Récup"] }
    ],
    variants: {
      marathon: "Ajouter Station 7 : calf raises dynamiques 20 reps",
      trail_mountain: "Ajouter Station 7 : step-ups sur banc + Station 8 : lateral bounds",
      "10k": "Réduire à 3 tours, augmenter intensité (30s effort / 10s transition)"
    },
    goals: ["marathon", "semi", "10k", "trail_short", "trail_mountain", "trail_ultra"],
    tags: ["circuit", "cardio", "fun", "strength", "variety", "anti-monotony"],
    notes: "Format très populaire en groupe. Peut se faire en extérieur (parc, stade). Excellent pour les phases de base où le renforcement classique ennuie."
  },
  {
    id: "C_STR_CIRCUIT_CARDIO_TRI",
    cat: "C",
    sport: "strength",
    objectif: "Circuit cardio triathlon – renforcement multisport ludique",
    necessite: "Optionnel",
    when: "Base, 1×/sem",
    phase: ["base", "build"],
    avoid: "Semaine très chargée en volume",
    durationMin: [40, 55],
    metricKey: "cardiaque",
    sportKey: "circuit_cardio_tri",
    structure: [
      { part: "Warm-up", text: "8min mobilité dynamique complète (épaules, hanches, chevilles)", zones: ["Z1"] },
      { part: "Main", text: "3 tours (40s effort / 20s repos) : Bloc SWIM : Band Pull-Apart → Swim Cord Pull → Superman Hold. Bloc BIKE : Air Squat → Single-Leg Bridge → Calf Raises. Bloc RUN : High Knees → Lateral Shuffle → Squat Jump. 2min repos complet entre tours. Enchaîne les 3 sports dans un format ludique et cardio.", zones: ["Z2", "Z3", "Force"] },
      { part: "Cool-down", text: "7min étirements + foam rolling", zones: ["Récup"] }
    ],
    variants: {
      ironman: "4 tours, ajouter bloc TRANSITION (changer de chaussures entre blocs)",
      half: "3 tours standard"
    },
    goals: ["ironman", "half"],
    tags: ["circuit", "triathlon", "multisport", "fun", "variety"],
    notes: "Séance idéale pour jour de pluie ou quand l'athlète n'a pas envie de nager/rouler/courir. Garde le contact avec les 3 sports en mode ludique."
  }
];

// =============================================
// EXPORT CONSOLIDÉ
// =============================================
export const EnrichedWorkoutsV6: LibraryWorkout[] = [
  ...PYRAMID_LADDER,
  ...DESCENDING_SETS,
  ...FARTLEK_LIBRE,
  ...CIRCUIT_CARDIO_TECH,
];
