// =============================================
// ENRICHED WORKOUTS V3 — GAP FIXES
// Cyclisme (+40), Race-Sim (+15), Tests (+10),
// Bricks (+10), Récup/D (+10), Trail goals, 10k
// =============================================

import { LibraryWorkout } from "@/types/workoutLibrary";

export const EnrichedWorkoutsV3: LibraryWorkout[] = [

  // ═══════════════════════════════════════════
  // CYCLISME — ENDURANCE (A)
  // ═══════════════════════════════════════════
  {
    id: "V3_BIKE_Z2_ENDURANCE_LONG",
    cat: "A", sport: "cyclisme",
    objectif: "Développement aérobie fondamental — sortie longue Z2",
    necessite: "Obligatoire",
    when: "Base et Build, week-end",
    phase: ["base", "build"],
    avoid: "Semaine de récupération",
    durationMin: [150, 300],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "20' progressif Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2h30-4h30 Z2 stable, cadence 85-95 rpm", zones: ["Z2"] },
      { part: "Cool-down", text: "10' retour Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "4h30 Z2 + ravitaillement toutes les 30'", half: "3h Z2", marathon: "2h30 Z2" },
    goals: ["ironman", "half"],
    tags: ["endurance", "aérobie", "longue"]
  },
  {
    id: "V3_BIKE_Z2_CAFE_RIDE",
    cat: "A", sport: "cyclisme",
    objectif: "Sortie sociale Z2 récupération active",
    necessite: "Optionnel",
    when: "Dimanche facile ou semaine de récup",
    phase: ["taper"],
    avoid: "En remplacement d'une séance clé",
    durationMin: [60, 120],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "10' Z1", zones: ["Z1"] },
      { part: "Main", text: "50-100' Z2 relax, cadence libre", zones: ["Z2"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half", "marathon", "semi"],
    tags: ["récupération", "social", "facile"]
  },
  {
    id: "V3_BIKE_FATMAX_LONG",
    cat: "A", sport: "cyclisme",
    objectif: "Oxydation lipidique maximale — FatMax long",
    necessite: "Recommandé",
    when: "Base phase, matin à jeun si possible",
    phase: ["base"],
    avoid: "Jour après VO2max",
    durationMin: [120, 240],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' progressif Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "1h45-3h45 à FatMax (60-72% FTP), cadence 80-90 rpm", zones: ["Z2"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "4h FatMax + ravitaillement réduit", half: "2h30 FatMax" },
    goals: ["ironman", "half"],
    tags: ["lipides", "fatmax", "métabolique"]
  },

  // ═══════════════════════════════════════════
  // CYCLISME — TEMPO / SWEET SPOT (B)
  // ═══════════════════════════════════════════
  {
    id: "V3_BIKE_SST_PROGRESSIF",
    cat: "B", sport: "cyclisme",
    objectif: "Sweet Spot progressif — montée en durée bloc à bloc",
    necessite: "Obligatoire",
    when: "Build phase, mardi ou jeudi",
    phase: ["build"],
    avoid: "Veille de compétition",
    durationMin: [75, 100],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 avec 3x30'' accélérations", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3x12' → 3x15' → 3x18' SST (88-94% FTP) / 5' Z1", zones: ["Z4"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "3x20' SST", half: "3x15' SST" },
    goals: ["ironman", "half"],
    tags: ["sweet-spot", "progression", "seuil"]
  },
  {
    id: "V3_BIKE_TEMPO_LONG",
    cat: "B", sport: "cyclisme",
    objectif: "Tempo continu prolongé — endurance musculaire",
    necessite: "Recommandé",
    when: "Build mi-semaine",
    phase: ["build"],
    avoid: "Semaine de récup",
    durationMin: [90, 120],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "40-60' continu Z3 (76-88% FTP), cadence 85-95 rpm", zones: ["Z3"] },
      { part: "Cool-down", text: "15' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "2x30' Z3 / 5' Z1", half: "45' continu Z3" },
    goals: ["ironman", "half"],
    tags: ["tempo", "endurance-musculaire"]
  },
  {
    id: "V3_BIKE_OVER_UNDER_ADV",
    cat: "B", sport: "cyclisme",
    objectif: "Over-Under avancé — clearance lactate sous pression",
    necessite: "Recommandé",
    when: "Build/Peak, jour clé",
    phase: ["build", "peak"],
    avoid: "Jour après test FTP",
    durationMin: [75, 95],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 + 2x1' à 105% FTP", zones: ["Z1", "Z2", "Z4"] },
      { part: "Main", text: "4x(3' à 95% + 2' à 108% + 1' à 85%) / 4' Z1", zones: ["Z3", "Z4", "Z5"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half", "marathon"],
    tags: ["over-under", "lactate", "seuil"]
  },
  {
    id: "V3_BIKE_CLIMBING_TEMPO",
    cat: "B", sport: "cyclisme",
    objectif: "Tempo en montée — simulation col",
    necessite: "Recommandé",
    when: "Build, terrain vallonné disponible",
    phase: ["build"],
    avoid: "Plat uniquement",
    durationMin: [90, 150],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "20' Z1→Z2 sur plat", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3-5x 8-15' montée Z3-Z4 (80-95% FTP), 60-70 rpm assis / descente Z1", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "15' Z1 plat", zones: ["Z1"] }
    ],
    variants: { ironman: "5x12' col", trail_mountain: "Cols longs 15-20'" },
    goals: ["ironman", "half", "trail_mountain"],
    tags: ["montée", "col", "force"]
  },
  {
    id: "V3_BIKE_FORCE_SFR",
    cat: "B", sport: "cyclisme",
    objectif: "SFR — Strength/Force Resistance en côte",
    necessite: "Recommandé",
    when: "Base/Build, 1x/semaine max",
    phase: ["base", "build"],
    avoid: "Problèmes de genoux",
    durationMin: [70, 90],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 cadence haute", zones: ["Z1", "Z2"] },
      { part: "Main", text: "6-8x 4' montée gros braquet 50-60 rpm, Z3-Z4 / 4' moulinage Z1", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10' Z1 souple", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half", "trail_mountain"],
    tags: ["SFR", "force", "côte", "braquet"]
  },
  {
    id: "V3_BIKE_RACE_PACE_TT",
    cat: "B", sport: "cyclisme",
    objectif: "Race Pace vélo — simulation allure cible",
    necessite: "Obligatoire",
    when: "Peak phase, simulation jour J",
    phase: ["peak"],
    avoid: "Plus de 3 semaines avant la course",
    durationMin: [90, 180],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' progressif Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "60-150' à puissance cible course (IM: 70-76% FTP, 70.3: 80-85% FTP)", zones: ["Z3"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "2h30 à 72% FTP", half: "1h15 à 82% FTP" },
    goals: ["ironman", "half"],
    tags: ["race-pace", "simulation", "TT"]
  },
  {
    id: "V3_BIKE_TT_AERO",
    cat: "B", sport: "cyclisme",
    objectif: "Position aéro — adaptation posturale TT",
    necessite: "Recommandé",
    when: "Build/Peak, 1x/semaine",
    phase: ["build", "peak"],
    avoid: "Début de saison sans adaptation",
    durationMin: [60, 90],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "10' Z1 position route", zones: ["Z1"] },
      { part: "Main", text: "4x10' position aéro Z3 (76-88% FTP) / 5' route Z2. Focus: stabilité bassin, respiration", zones: ["Z3"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half"],
    tags: ["aéro", "position", "TT", "triathlon"]
  },

  // ═══════════════════════════════════════════
  // CYCLISME — VO2max / HAUTE INTENSITÉ (C)
  // ═══════════════════════════════════════════
  {
    id: "V3_BIKE_VO2_CLASSIC_5x5",
    cat: "C", sport: "cyclisme",
    objectif: "VO2max classique 5x5' — gold standard Billat",
    necessite: "Obligatoire",
    when: "Build/Peak, jour clé",
    phase: ["build", "peak"],
    avoid: "Fatigue > 7/10",
    durationMin: [60, 80],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 + 2x2' à Z4", zones: ["Z1", "Z2", "Z4"] },
      { part: "Main", text: "5x5' à 105-115% FTP / 5' Z1", zones: ["Z5", "Z6"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half", "10k"],
    tags: ["VO2max", "intervalles", "haute-intensité"],
    // W'bal — repos recalculable au CP/W' réel de l'athlète (Skiba 2012),
    // au lieu du repos générique 5' ci-dessus. Extrait fidèlement du texte
    // Main : 5x5' à 105-115% FTP (110% = milieu de plage) / 5' Z1 (récup active).
    wbalProfile: {
      sport: "bike",
      blocks: [
        {
          reps: 5,
          durationSec: 300,
          intensity: 110,
          intensityRef: "FTP",
          defaultRestSec: 300,
          recoveryStrategy: "active-light",
          label: "VO2max 5x5 classique (Billat)",
        },
      ],
    },
  },
  {
    id: "V3_BIKE_VO2_SHORT_30_30",
    cat: "C", sport: "cyclisme",
    objectif: "VO2max 30/30 vélo — accumulation temps en zone",
    necessite: "Recommandé",
    when: "Build phase",
    phase: ["build"],
    avoid: "Jour après intervalle long",
    durationMin: [55, 75],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 + 4x30'' sprints", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3x(10x 30'' à 120-130% FTP / 30'' Z1) / 5' Z1 entre séries", zones: ["Z5", "Z6"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["half", "10k"],
    tags: ["VO2max", "30-30", "intermittent"]
  },
  {
    id: "V3_BIKE_VO2_NORWEGIAN_4x8",
    cat: "C", sport: "cyclisme",
    objectif: "Norwegian 4x8' vélo — protocole Ingebrigtsen adapté",
    necessite: "Recommandé",
    when: "Build/Peak, 1x/10 jours",
    phase: ["build", "peak"],
    avoid: "Fatigue élevée",
    durationMin: [70, 90],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "4x8' à 100-108% FTP / 4' Z1 actif", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half"],
    tags: ["norwegian", "VO2max", "seuil-haut"],
    // W'bal — extrait fidèlement du texte Main : 4x8' à 100-108% FTP
    // (104% = milieu de plage) / 4' Z1 actif.
    wbalProfile: {
      sport: "bike",
      blocks: [
        {
          reps: 4,
          durationSec: 480,
          intensity: 104,
          intensityRef: "FTP",
          defaultRestSec: 240,
          recoveryStrategy: "active-light",
          label: "Norwegian 4x8",
        },
      ],
    },
  },
  {
    id: "V3_BIKE_VO2_TABATA",
    cat: "C", sport: "cyclisme",
    objectif: "Tabata vélo — capacité anaérobie + VO2max",
    necessite: "Optionnel",
    when: "Peak phase, athlètes expérimentés",
    phase: ["peak"],
    avoid: "Débutants, fatigue élevée",
    durationMin: [45, 60],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 + 3x1' accélérations", zones: ["Z1", "Z2"] },
      { part: "Main", text: "4x(8x 20'' all-out / 10'' repos) / 4' Z1 entre séries", zones: ["Z6", "Z7"] },
      { part: "Cool-down", text: "15' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["10k", "half"],
    tags: ["tabata", "anaérobie", "VO2max"]
  },
  {
    id: "V3_BIKE_RAMP_TEST",
    cat: "C", sport: "cyclisme",
    objectif: "Ramp test — montée progressive jusqu'à échec",
    necessite: "Recommandé",
    when: "Début de bloc ou toutes les 6-8 semaines",
    phase: ["base"],
    avoid: "Semaine chargée",
    durationMin: [30, 45],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "10' Z1→Z2 souple", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Rampe: +20W chaque minute depuis 100W jusqu'à épuisement. FTP ≈ 75% de la dernière palier complète", zones: ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"] },
      { part: "Cool-down", text: "10' Z1 souple", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half", "marathon", "semi", "10k"],
    tags: ["test", "FTP", "évaluation"]
  },

  // ═══════════════════════════════════════════
  // CYCLISME — SPRINT / NEUROMUSCULAIRE (C)
  // ═══════════════════════════════════════════
  {
    id: "V3_BIKE_SPRINT_NEURO",
    cat: "C", sport: "cyclisme",
    objectif: "Sprints neuromusculaires — recrutement fibres rapides",
    necessite: "Recommandé",
    when: "Build/Peak, début de séance Z2",
    phase: ["build", "peak", "base"],
    avoid: "Fatigue musculaire élevée",
    durationMin: [60, 80],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8x10'' sprint max départ arrêté / 5' Z2. Puis 30' Z2", zones: ["Z7", "Z2"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["10k", "half"],
    tags: ["sprint", "neuromusculaire", "puissance"]
  },
  {
    id: "V3_BIKE_CADENCE_DRILLS",
    cat: "B", sport: "cyclisme",
    objectif: "Travail de cadence — efficacité de pédalage",
    necessite: "Recommandé",
    when: "Base/Build, dans sortie Z2",
    phase: ["base", "build"],
    avoid: "Jour d'intervalles intenses",
    durationMin: [60, 90],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Alternance: 5' à 60 rpm + 5' à 110 rpm, le tout Z2. 6 cycles. Focus: rondeur pédalage", zones: ["Z2"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half"],
    tags: ["cadence", "technique", "pédalage"]
  },
  {
    id: "V3_BIKE_THRESHOLD_2x20",
    cat: "B", sport: "cyclisme",
    objectif: "Seuil classique 2x20' — gold standard FTP",
    necessite: "Obligatoire",
    when: "Build, jour clé",
    phase: ["build"],
    avoid: "Veille de course",
    durationMin: [70, 85],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 + 2x1' à 110% FTP", zones: ["Z1", "Z2", "Z5"] },
      { part: "Main", text: "2x20' à 95-100% FTP / 5' Z1", zones: ["Z4"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half", "marathon", "semi", "10k"],
    tags: ["seuil", "FTP", "threshold"],
    // W'bal — extrait fidèlement du texte Main : 2x20' à 95-100% FTP
    // (98% = milieu de plage, arrondi) / 5' Z1. Séance seuil : le repos ne
    // sera recalculé que si la puissance résolue dépasse le CP effectif de
    // l'athlète (cas fréquent pour un CP proche ou légèrement sous FTP) —
    // sinon recalcWorkoutRest conserve le repos par défaut ci-dessus, sans
    // effet indésirable.
    wbalProfile: {
      sport: "bike",
      blocks: [
        {
          reps: 2,
          durationSec: 1200,
          intensity: 98,
          intensityRef: "FTP",
          defaultRestSec: 300,
          recoveryStrategy: "active-light",
          label: "Seuil 2x20 (gold standard FTP)",
        },
      ],
    },
  },
  {
    id: "V3_BIKE_MUSCULAR_ENDURANCE",
    cat: "B", sport: "cyclisme",
    objectif: "Endurance musculaire — efforts soutenus mi-zone",
    necessite: "Recommandé",
    when: "Build phase",
    phase: ["build"],
    avoid: "Jour de VO2max",
    durationMin: [80, 110],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3x15' Z3 (76-88% FTP) cadence 80-85 rpm / 5' Z1. Focus: stabilité puissance", zones: ["Z3"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "3x20' Z3", half: "3x15' Z3" },
    goals: ["ironman", "half"],
    tags: ["endurance-musculaire", "tempo", "stabilité"]
  },
  {
    id: "V3_BIKE_MIXED_PYRAMID",
    cat: "C", sport: "cyclisme",
    objectif: "Pyramide mixte vélo — multi-zone en une séance",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Semaine de récup",
    durationMin: [70, 90],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "1'-2'-3'-5'-3'-2'-1' à Z4-Z5-Z4-Z3-Z4-Z5-Z6 / égal repos Z1", zones: ["Z3", "Z4", "Z5", "Z6"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["half", "10k"],
    tags: ["pyramide", "multi-zone", "variété"]
  },

  // ═══════════════════════════════════════════
  // CYCLISME — RÉCUPÉRATION (D)
  // ═══════════════════════════════════════════
  {
    id: "V3_BIKE_RECOVERY_SPIN",
    cat: "D", sport: "cyclisme",
    objectif: "Récupération active vélo — flush lactate",
    necessite: "Recommandé",
    when: "Lendemain de séance clé",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Jamais en remplacement de repos complet si fatigue > 8/10",
    durationMin: [30, 50],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "5' Z1", zones: ["Z1"] },
      { part: "Main", text: "20-40' Z1 strict (<55% FTP), cadence 90-100 rpm, pas de résistance", zones: ["Z1"] },
      { part: "Cool-down", text: "5' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half", "marathon", "semi", "10k"],
    tags: ["récupération", "flush", "facile"]
  },

  // ═══════════════════════════════════════════
  // COURSE — 10K SPÉCIFIQUE
  // ═══════════════════════════════════════════
  {
    id: "V3_RUN_10K_INTERVALS_1000",
    cat: "C", sport: "course",
    objectif: "10K spécifique — 5x1000m à allure cible",
    necessite: "Obligatoire",
    when: "Build/Peak, jour clé",
    phase: ["build", "peak"],
    avoid: "Fatigue élevée",
    durationMin: [50, 65],
    metricKey: "allure", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 + gammes", zones: ["Z1", "Z2"] },
      { part: "Main", text: "5x1000m à allure 10K cible / 2'30'' trot Z1", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { "10k": "Progressif: 1er à 102%, dernier à 98% du temps cible" },
    goals: ["10k"],
    tags: ["10k", "spécifique", "1000m"]
  },
  {
    id: "V3_RUN_10K_TEMPO_CRUISE",
    cat: "B", sport: "course",
    objectif: "Cruise intervals 10K — Daniels",
    necessite: "Recommandé",
    when: "Build phase",
    phase: ["build"],
    avoid: "Semaine de récup",
    durationMin: [50, 65],
    metricKey: "allure", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "4x(5' à allure seuil + 1' trot) — cible: seuil lactique 10K", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["10k", "semi"],
    tags: ["10k", "cruise", "daniels", "seuil"]
  },
  {
    id: "V3_RUN_10K_FAST_FINISH",
    cat: "B", sport: "course",
    objectif: "Fast finish long run — sortie longue avec finish rapide 10K",
    necessite: "Recommandé",
    when: "Build, sortie longue du week-end",
    phase: ["build"],
    avoid: "Veille de compétition",
    durationMin: [60, 80],
    metricKey: "allure", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "Pas d'échauffement séparé", zones: [] },
      { part: "Main", text: "45-60' Z2 + derniers 15-20' à allure 10K cible (progression)", zones: ["Z2", "Z4"] },
      { part: "Cool-down", text: "5' marche", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["10k", "semi"],
    tags: ["10k", "fast-finish", "progression"]
  },
  {
    id: "V3_RUN_10K_VO2_800",
    cat: "C", sport: "course",
    objectif: "VO2max 10K — 8x800m",
    necessite: "Obligatoire",
    when: "Peak phase",
    phase: ["peak"],
    avoid: "Plus de 2x/semaine",
    durationMin: [50, 65],
    metricKey: "allure", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 + 4 accélérations", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8x800m à 95-98% VMA / 2' trot", zones: ["Z5", "Z6"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["10k"],
    tags: ["10k", "VO2max", "800m"]
  },
  {
    id: "V3_RUN_10K_RACE_SIM",
    cat: "Race-Sim", sport: "course",
    objectif: "Simulation course 10K — dress rehearsal",
    necessite: "Obligatoire",
    when: "S-2 avant 10K cible",
    phase: ["build", "peak"],
    avoid: "Plus de 2 fois dans le plan",
    durationMin: [40, 55],
    metricKey: "allure", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "15' échauffement compétition (Z1→Z2 + 3 accélérations)", zones: ["Z1", "Z2"] },
      { part: "Main", text: "6-8 km à allure 10K cible. Conditions course: tenue jour J, ravitaillement", zones: ["Z4"] },
      { part: "Cool-down", text: "10' trot Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["10k"],
    tags: ["race-sim", "10k", "simulation"]
  },

  // ═══════════════════════════════════════════
  // TRAIL MOUNTAIN SPÉCIFIQUE
  // ═══════════════════════════════════════════
  {
    id: "V3_TRAIL_MTN_VMA_COTE",
    cat: "C", sport: "course",
    objectif: "VMA côte trail montagne — puissance ascensionnelle",
    necessite: "Obligatoire",
    when: "Build, terrain montagneux",
    phase: ["build"],
    avoid: "Plat uniquement",
    durationMin: [60, 80],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 + gammes côte", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8-10x 2-3' montée raide (>15%) à 90-95% FCmax / descente trot", zones: ["Z5", "Z6"] },
      { part: "Cool-down", text: "10' Z1 plat", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["trail_mountain", "trail_short"],
    dPlusTargetM: { min: 400, max: 700 },
    tags: ["trail", "montagne", "VMA-côte", "ascensionnel"]
  },
  {
    id: "V3_TRAIL_MTN_DESCENTE_TECH",
    cat: "B", sport: "course",
    objectif: "Descente technique trail — proprioception et vitesse",
    necessite: "Obligatoire",
    when: "Build, terrain technique",
    phase: ["build"],
    avoid: "Sol glissant dangereux",
    durationMin: [50, 75],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 montée facile", zones: ["Z1", "Z2"] },
      { part: "Main", text: "6-8x descente technique 3-5' à allure course. Focus: placement pied, fréquence, regard loin / montée Z2", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10' Z1 plat", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["trail_mountain", "trail_short"],
    dPlusTargetM: { min: 300, max: 500 },
    tags: ["trail", "descente", "technique", "proprioception"]
  },
  {
    id: "V3_TRAIL_MTN_LONG_D_PLUS",
    cat: "A", sport: "course",
    objectif: "Sortie longue D+ trail montagne — volume vertical",
    necessite: "Obligatoire",
    when: "Build, week-end",
    phase: ["build"],
    avoid: "Semaine de récup",
    durationMin: [150, 270],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "15' Z1 plat", zones: ["Z1"] },
      { part: "Main", text: "2h-4h en montagne, montées Z2-Z3 marche/course, descentes techniques contrôlées. Cible D+ 1000-2000m", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "15' Z1 plat", zones: ["Z1"] }
    ],
    variants: { trail_mountain: "D+ 1500m mini", trail_ultra: "D+ 2000m+ avec nutrition" },
    goals: ["trail_mountain", "trail_ultra"],
    dPlusTargetM: { min: 1000, max: 2000 },
    tags: ["trail", "long", "D+", "montagne"]
  },
  {
    id: "V3_TRAIL_MTN_RACE_SIM",
    cat: "Race-Sim", sport: "course",
    objectif: "Simulation course trail montagne — parcours type",
    necessite: "Obligatoire",
    when: "S-3 avant course cible",
    phase: ["build", "peak"],
    avoid: "Plus de 2x dans le plan",
    durationMin: [120, 240],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "10' Z1", zones: ["Z1"] },
      { part: "Main", text: "2-3h sur parcours similaire course: profil D+, ravitaillement jour J, tenue complète. Allure cible ±5%", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10' marche", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["trail_mountain", "trail_short"],
    dPlusTargetM: { min: 800, max: 1500 },
    tags: ["race-sim", "trail", "montagne", "simulation"]
  },

  // ═══════════════════════════════════════════
  // TRAIL ULTRA SPÉCIFIQUE
  // ═══════════════════════════════════════════
  {
    id: "V3_TRAIL_ULTRA_B2B_WEEKEND",
    cat: "A", sport: "course",
    objectif: "Back-to-back ultra — double sortie week-end pré-fatigue",
    necessite: "Obligatoire",
    when: "Build, 1x/mois max",
    phase: ["build"],
    avoid: "Moins de 10 semaines avant course",
    durationMin: [180, 360],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "Pas d'échauffement séparé", zones: [] },
      { part: "Main", text: "Samedi: 3-4h Z2 avec D+ modéré. Dimanche: 2h30-3h Z2 sur jambes fatiguées. Nutrition ultra toutes les 30'", zones: ["Z2"] },
      { part: "Cool-down", text: "10' marche", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["trail_ultra", "trail_long"],
    dPlusTargetM: { min: 1500, max: 3000 },
    tags: ["trail", "ultra", "back-to-back", "volume", "pré-fatigue"]
  },
  {
    id: "V3_TRAIL_ULTRA_MARCHE_COURSE",
    cat: "A", sport: "course",
    objectif: "Marche/course alternée ultra — gestion effort longue durée",
    necessite: "Obligatoire",
    when: "Build/Peak, sortie longue",
    phase: ["build", "peak"],
    avoid: "Semaine de récup",
    durationMin: [180, 420],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "10' Z1 marche", zones: ["Z1"] },
      { part: "Main", text: "3-6h alternance: 10' course Z2 + 5' marche rapide. Montées >15%: marche active bâtons. Nutrition 60-90g/h glucides", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "10' marche", zones: ["Z1"] }
    ],
    variants: { trail_ultra: "Ratio 2:1 course/marche", trail_long: "Ratio 3:1" },
    goals: ["trail_ultra", "trail_long"],
    dPlusTargetM: { min: 1000, max: 2500 },
    tags: ["trail", "ultra", "marche-course", "gestion-effort", "nutrition"]
  },
  {
    id: "V3_TRAIL_ULTRA_NIGHT",
    cat: "B", sport: "course",
    objectif: "Sortie nocturne — adaptation vision et fatigue",
    necessite: "Recommandé",
    when: "Build, 2-3x avant course nocturne",
    phase: ["build"],
    avoid: "Terrain dangereux inconnu",
    durationMin: [90, 180],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "10' Z1", zones: ["Z1"] },
      { part: "Main", text: "1h30-2h30 en nocturne: frontale, gestion batterie, technique descente réduite. Z2 prudent", zones: ["Z2"] },
      { part: "Cool-down", text: "10' marche", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["trail_ultra", "trail_long"],
    tags: ["trail", "ultra", "nocturne", "adaptation", "technique"]
  },
  {
    id: "V3_TRAIL_ULTRA_RACE_SIM",
    cat: "Race-Sim", sport: "course",
    objectif: "Simulation ultra — 50% distance course avec protocole complet",
    necessite: "Obligatoire",
    when: "S-4 à S-6 avant course",
    phase: ["build", "peak"],
    avoid: "Moins de 4 semaines avant course",
    durationMin: [240, 480],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "Pas d'échauffement séparé", zones: [] },
      { part: "Main", text: "4-8h à 50% distance cible. Protocole complet: nutrition 60-90g/h, hydratation, changes vêtements, gestion mentale. Allure course ±10%", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "Marche retour", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["trail_ultra"],
    dPlusTargetM: { min: 2000, max: 4000 },
    tags: ["trail", "race-sim", "ultra", "simulation", "nutrition"]
  },

  // ═══════════════════════════════════════════
  // RACE-SIM — TOUS SPORTS
  // ═══════════════════════════════════════════
  {
    id: "V3_RACESIM_MARATHON",
    cat: "Race-Sim", sport: "course",
    objectif: "Simulation marathon — 30-32K à allure cible",
    necessite: "Obligatoire",
    when: "S-3 à S-4 avant marathon",
    phase: ["build", "peak"],
    avoid: "Plus de 2x dans le plan",
    durationMin: [140, 180],
    metricKey: "allure", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "10' trot Z1", zones: ["Z1"] },
      { part: "Main", text: "30-32K dont 20K à allure marathon cible (AMS). Derniers 5K: effort libre. Ravitaillement tous les 5K", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10' marche + étirements", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["marathon"],
    tags: ["race-sim", "marathon", "simulation", "AMS"]
  },
  {
    id: "V3_RACESIM_SEMI",
    cat: "Race-Sim", sport: "course",
    objectif: "Simulation semi-marathon — 16-18K à allure cible",
    necessite: "Obligatoire",
    when: "S-2 à S-3 avant semi",
    phase: ["build", "peak"],
    avoid: "Plus de 2x dans le plan",
    durationMin: [75, 100],
    metricKey: "allure", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "15' échauffement compétition", zones: ["Z1", "Z2"] },
      { part: "Main", text: "16-18K à allure semi cible. Splits négatifs recommandés (1ère moitié +3s/km)", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10' trot Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["semi"],
    tags: ["race-sim", "semi", "simulation"]
  },
  {
    id: "V3_RACESIM_BIKE_IM",
    cat: "Race-Sim", sport: "cyclisme",
    objectif: "Simulation vélo Ironman — 140K à puissance cible",
    necessite: "Obligatoire",
    when: "S-4 à S-6 avant Ironman",
    phase: ["build", "peak"],
    avoid: "Plus de 2x dans le plan",
    durationMin: [270, 360],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "10' Z1", zones: ["Z1"] },
      { part: "Main", text: "120-140K à 70-76% FTP. Position aéro 80%+ du temps. Nutrition 80-100g/h glucides. Test protocole boisson", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10' Z1 + T2 simulé", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman"],
    tags: ["race-sim", "ironman", "vélo", "simulation"]
  },
  {
    id: "V3_RACESIM_BIKE_703",
    cat: "Race-Sim", sport: "cyclisme",
    objectif: "Simulation vélo 70.3 — 70K à puissance cible",
    necessite: "Obligatoire",
    when: "S-3 à S-4 avant 70.3",
    phase: ["build", "peak"],
    avoid: "Plus de 2x dans le plan",
    durationMin: [130, 170],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "10' Z1", zones: ["Z1"] },
      { part: "Main", text: "65-75K à 80-85% FTP. Position aéro. Nutrition 60-80g/h", zones: ["Z3"] },
      { part: "Cool-down", text: "5' Z1 + T2 simulé", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["half"],
    tags: ["race-sim", "70.3", "vélo", "simulation"]
  },
  {
    id: "V3_RACESIM_SWIM_IM",
    cat: "Race-Sim", sport: "natation",
    objectif: "Simulation natation Ironman — 3800m à allure cible",
    necessite: "Obligatoire",
    when: "S-4 avant Ironman, eau libre si possible",
    phase: ["build", "peak"],
    avoid: "Piscine courte seulement",
    durationMin: [75, 95],
    metricKey: "css", sportKey: "swimming",
    structure: [
      { part: "Warm-up", text: "400m varié (100 NL + 100 bat + 100 pull + 100 NL) + 4x50m progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3800m continu à allure cible IM (CSS +5-8''). Respiration bilatérale tous les 3 ou 5 temps. Navigation si eau libre. Ravitaillement liquide toutes les 1000m", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "200m souple dos", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman"],
    tags: ["race-sim", "natation", "ironman", "simulation"]
  },
  {
    id: "V3_RACESIM_SWIM_703",
    cat: "Race-Sim", sport: "natation",
    objectif: "Simulation natation 70.3 — 1900m à allure cible",
    necessite: "Obligatoire",
    when: "S-3 avant 70.3",
    phase: ["build", "peak"],
    avoid: "Piscine 25m uniquement",
    durationMin: [40, 55],
    metricKey: "css", sportKey: "swimming",
    structure: [
      { part: "Warm-up", text: "300m varié", zones: ["Z1", "Z2"] },
      { part: "Main", text: "1900m continu à allure cible 70.3 (CSS +3-5''). Départ groupé simulé si possible", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["half"],
    tags: ["race-sim", "natation", "70.3", "simulation"]
  },

  // ═══════════════════════════════════════════
  // TESTS / ÉVALUATION
  // ═══════════════════════════════════════════
  {
    id: "V3_TEST_FTP_20MIN",
    cat: "C", sport: "cyclisme",
    objectif: "Test FTP 20' — évaluation seuil fonctionnel",
    necessite: "Obligatoire",
    when: "Début de bloc ou toutes les 6-8 semaines",
    phase: ["base"],
    avoid: "Fatigue > 5/10",
    durationMin: [50, 65],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 + 3x1' à Z4 / 1' Z1 + 5' Z1", zones: ["Z1", "Z2", "Z4"] },
      { part: "Main", text: "20' all-out régulier. FTP = 95% puissance moyenne. Splits réguliers recommandés", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "15' Z1 souple", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half", "marathon", "semi", "10k"],
    tags: ["test", "FTP", "évaluation", "20min"]
  },
  {
    id: "V3_TEST_VMA_VAMEVAL",
    cat: "C", sport: "course",
    objectif: "Test VMA VAMEVAL — évaluation vitesse max aérobie",
    necessite: "Obligatoire",
    when: "Début de bloc ou toutes les 8 semaines",
    phase: ["base"],
    avoid: "Fatigue, vent fort",
    durationMin: [35, 50],
    metricKey: "allure", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 + gammes + 3 accélérations", zones: ["Z1", "Z2"] },
      { part: "Main", text: "VAMEVAL: course continue, vitesse +0.5 km/h chaque minute depuis 8 km/h. VMA = dernier palier complété", zones: ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"] },
      { part: "Cool-down", text: "10' marche + trot Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["marathon", "semi", "10k", "trail_short"],
    tags: ["test", "VMA", "évaluation", "VAMEVAL"]
  },
  {
    id: "V3_TEST_CSS",
    cat: "B", sport: "natation",
    objectif: "Test CSS — Critical Swim Speed",
    necessite: "Obligatoire",
    when: "Toutes les 6-8 semaines",
    phase: ["build", "peak"],
    avoid: "Fatigue, après séance intense",
    durationMin: [35, 45],
    metricKey: "css", sportKey: "swimming",
    structure: [
      { part: "Warm-up", text: "400m varié (200 NL, 100 bat, 100 pull)", zones: ["Z1", "Z2"] },
      { part: "Main", text: "400m chrono all-out → 5' repos → 200m chrono all-out. CSS = (400-200) / (T400-T200)", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half"],
    tags: ["test", "CSS", "natation", "évaluation"]
  },
  {
    id: "V3_TEST_LACTATE_STEP",
    cat: "C", sport: "course",
    objectif: "Test paliers lactate — seuils LT1/LT2",
    necessite: "Recommandé",
    when: "Début de bloc, conditions contrôlées",
    phase: ["base"],
    avoid: "Sans accès à un analyseur lactate",
    durationMin: [50, 70],
    metricKey: "allure", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "10' Z1 + 5' Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Paliers de 4' avec +1 km/h par palier depuis 9 km/h. Prélèvement lactate à chaque palier. Arrêt à >8 mmol/L ou épuisement", zones: ["Z1", "Z2", "Z3", "Z4", "Z5"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["marathon", "semi", "10k", "half"],
    tags: ["test", "lactate", "seuils", "LT1", "LT2"]
  },
  {
    id: "V3_TEST_SPRINT_15S",
    cat: "C", sport: "cyclisme",
    objectif: "Test sprint 15'' — puissance neuromusculaire maximale",
    necessite: "Recommandé",
    when: "Début de bloc ou post-récup",
    phase: ["taper", "base"],
    avoid: "Fatigue musculaire",
    durationMin: [25, 35],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "10' Z1→Z2 + 3x5'' sprints / 2' Z1", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3x 15'' sprint maximal départ arrêté / 5' récup complète. Retenir meilleur Pmax 5s et P15s", zones: ["Z7"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half", "10k"],
    tags: ["test", "sprint", "Pmax", "neuromusculaire"]
  },
  {
    id: "V3_TEST_TTE",
    cat: "C", sport: "cyclisme",
    objectif: "Test TTE — Time To Exhaustion au seuil",
    necessite: "Recommandé",
    when: "Toutes les 8-12 semaines, reposé",
    phase: ["taper"],
    avoid: "Sans FTP récent connu",
    durationMin: [45, 75],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 + 2x2' à 90% FTP / 2' Z1", zones: ["Z1", "Z2", "Z4"] },
      { part: "Main", text: "Effort continu à 100% FTP jusqu'à épuisement (incapacité de maintenir ±3%). TTE = durée totale. Cible élite: 40-70'", zones: ["Z4"] },
      { part: "Cool-down", text: "15' Z1 souple", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half"],
    tags: ["test", "TTE", "seuil", "endurance"]
  },
  {
    id: "V3_TEST_COOPER",
    cat: "C", sport: "course",
    objectif: "Test Cooper 12' — estimation VO2max terrain",
    necessite: "Recommandé",
    when: "Début de plan ou comparaison périodique",
    phase: ["base"],
    avoid: "Vent fort, terrain accidenté",
    durationMin: [25, 35],
    metricKey: "allure", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "10' Z1→Z2 + 3 accélérations", zones: ["Z1", "Z2"] },
      { part: "Main", text: "12' course maximale sur piste. VO2max ≈ (distance en m - 505) / 45. Allure la plus régulière possible", zones: ["Z5", "Z6"] },
      { part: "Cool-down", text: "10' marche + trot", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["marathon", "semi", "10k"],
    tags: ["test", "Cooper", "VO2max", "évaluation"]
  },
  {
    id: "V3_TEST_HALF_MARATHON_TT",
    cat: "C", sport: "course",
    objectif: "Test chrono semi-marathon — validation allure cible",
    necessite: "Recommandé",
    when: "S-6 à S-4 avant marathon cible",
    phase: ["base", "build"],
    avoid: "Conditions météo extrêmes",
    durationMin: [75, 120],
    metricKey: "allure", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "15' échauffement compétition", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Semi-marathon chrono (compétition ou solo). Sert de prédicteur marathon (x2.1) et validation allure", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10' trot Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["marathon"],
    tags: ["test", "semi", "chrono", "prédicteur"]
  },

  // ═══════════════════════════════════════════
  // BRICK SESSIONS SUPPLÉMENTAIRES
  // ═══════════════════════════════════════════
  {
    id: "V3_BRICK_IM_LONG",
    cat: "Brique", sport: "brick",
    objectif: "Brick longue Ironman — vélo long + run off the bike",
    necessite: "Obligatoire",
    when: "Build, 1x/2 semaines",
    phase: ["build"],
    avoid: "Semaine de récup",
    durationMin: [210, 330],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "Vélo: 15' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Vélo: 3-4h à 70-76% FTP + T2 chrono + Course: 30-45' à allure IM cible (AMS+15'')", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10' marche", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman"],
    tags: ["brick", "ironman", "longue", "T2"]
  },
  {
    id: "V3_BRICK_703_RACE_PACE",
    cat: "Brique", sport: "brick",
    objectif: "Brick 70.3 race pace — simulation T2 compétition",
    necessite: "Obligatoire",
    when: "Peak, S-3 à S-4",
    phase: ["peak"],
    avoid: "Plus de 3x dans le plan",
    durationMin: [150, 200],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "Vélo: 10' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Vélo: 1h30-2h à 80-85% FTP + T2 rapide (<2') + Course: 30-40' à allure 70.3 cible", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10' trot Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["half"],
    tags: ["brick", "70.3", "race-pace", "T2"]
  },
  {
    id: "V3_BRICK_SWIM_BIKE",
    cat: "Brique", sport: "brick",
    objectif: "Brick natation→vélo — T1 simulation",
    necessite: "Recommandé",
    when: "Build/Peak, 1x/mois",
    phase: ["build", "peak"],
    avoid: "Conditions eau froide sans combinaison",
    durationMin: [90, 140],
    metricKey: "css", sportKey: "swimming",
    structure: [
      { part: "Warm-up", text: "200m souple", zones: ["Z1"] },
      { part: "Main", text: "Natation: 1500-2000m à allure course + T1 chrono + Vélo: 45-60' Z3", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10' vélo Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "3000m + 1h30 vélo", half: "1500m + 45' vélo" },
    goals: ["ironman", "half"],
    tags: ["brick", "T1", "natation-vélo", "transition"]
  },
  {
    id: "V3_BRICK_SHORT_INTENSITY",
    cat: "Brique", sport: "brick",
    objectif: "Brick courte intense — adaptation neuromusculaire",
    necessite: "Recommandé",
    when: "Build, mi-semaine",
    phase: ["build"],
    avoid: "Jour de récup",
    durationMin: [60, 80],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "Vélo: 10' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Vélo: 3x5' Z4 (95-100% FTP) / 3' Z1 + T2 immédiat + Course: 15' dont 5x1' vite / 1' trot", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "10' trot Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["half", "10k"],
    tags: ["brick", "intense", "neuromusculaire", "courte"]
  },
  {
    id: "V3_BRICK_SWIM_RUN_AQUA",
    cat: "Brique", sport: "brick",
    objectif: "Aquathlon brick — natation + course directe",
    necessite: "Optionnel",
    when: "Build, variante fun",
    phase: ["build"],
    avoid: "Semaine chargée",
    durationMin: [50, 70],
    metricKey: "css", sportKey: "swimming",
    structure: [
      { part: "Warm-up", text: "200m souple", zones: ["Z1"] },
      { part: "Main", text: "3x(500m natation Z3 + T1 + 10' course Z3) / 3' marche entre séries", zones: ["Z3"] },
      { part: "Cool-down", text: "200m souple natation", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half"],
    tags: ["brick", "aquathlon", "natation-course"]
  },
  {
    id: "V3_BRICK_TRIPLE",
    cat: "Brique", sport: "brick",
    objectif: "Triple brick — simulation enchaînement complet S/B/R",
    necessite: "Recommandé",
    when: "S-6 à S-4 avant Ironman/70.3",
    phase: ["build"],
    avoid: "Plus de 2x dans le plan",
    durationMin: [180, 300],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "200m natation souple", zones: ["Z1"] },
      { part: "Main", text: "Natation: 1500-2000m Z2-Z3 + T1 + Vélo: 1h30-2h30 Z2-Z3 + T2 + Course: 20-40' Z2-Z3. Protocole nutrition complet", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10' marche", zones: ["Z1"] }
    ],
    variants: { ironman: "2000m + 3h vélo + 40' course", half: "1500m + 1h30 vélo + 25' course" },
    goals: ["ironman", "half"],
    tags: ["brick", "triple", "simulation", "enchaînement"]
  },

  // ═══════════════════════════════════════════
  // RÉCUPÉRATION / CATÉGORIE D
  // ═══════════════════════════════════════════
  {
    id: "V3_RECUP_YOGA_ATHLETE",
    cat: "D", sport: "strength",
    objectif: "Yoga athlète — mobilité et relâchement",
    necessite: "Recommandé",
    when: "Jour de repos ou après séance clé",
    phase: ["base", "build", "peak", "taper"],
    avoid: "En remplacement de repos si fatigue > 8/10",
    durationMin: [30, 50],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "5' respiration consciente", zones: [] },
      { part: "Main", text: "25-40' séquence yoga: salutations soleil, guerrier, pigeon, torsions, flexions avant. Focus hanches et chaîne postérieure", zones: [] },
      { part: "Cool-down", text: "5' savasana", zones: [] }
    ],
    variants: {},
    goals: ["ironman", "half", "marathon", "semi", "10k", "trail_mountain", "trail_ultra"],
    tags: ["récupération", "yoga", "mobilité", "flexibilité"]
  },
  {
    id: "V3_RECUP_FOAM_ROLL",
    cat: "D", sport: "strength",
    objectif: "Auto-massage foam roller — flush et mobilité",
    necessite: "Recommandé",
    when: "Post-entraînement ou jour de repos",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Blessure aiguë",
    durationMin: [15, 30],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "Pas d'échauffement", zones: [] },
      { part: "Main", text: "15-25' foam rolling: quadriceps (2'), IT band (2'), mollets (2'), fessiers (2'), dorsaux (2'), psoas (2'). Trigger points: 30'' maintien", zones: [] },
      { part: "Cool-down", text: "5' étirements statiques", zones: [] }
    ],
    variants: {},
    goals: ["ironman", "half", "marathon", "semi", "10k", "trail_mountain", "trail_ultra"],
    tags: ["récupération", "foam-roller", "auto-massage"]
  },
  {
    id: "V3_RECUP_SWIM_REGEN",
    cat: "D", sport: "natation",
    objectif: "Natation régénérative — récupération aquatique",
    necessite: "Recommandé",
    when: "Lendemain de séance clé ou jour de repos actif",
    phase: ["taper"],
    avoid: "Si douleur épaule",
    durationMin: [25, 40],
    metricKey: "css", sportKey: "swimming",
    structure: [
      { part: "Warm-up", text: "100m dos souple", zones: ["Z1"] },
      { part: "Main", text: "400-800m: alternance 50m NL / 50m dos / 50m bat / 50m pull. Tout en Z1, focus technique et respiration", zones: ["Z1"] },
      { part: "Cool-down", text: "100m souple au choix", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half", "marathon", "semi"],
    tags: ["récupération", "natation", "régénérative"]
  },
  {
    id: "V3_RECUP_WALK_NATURE",
    cat: "D", sport: "course",
    objectif: "Marche en nature — récupération et santé mentale",
    necessite: "Optionnel",
    when: "Jour de repos ou récup active",
    phase: ["taper"],
    avoid: "Jamais en remplacement de repos complet si surentraînement",
    durationMin: [30, 60],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "Pas d'échauffement", zones: [] },
      { part: "Main", text: "30-60' marche terrain naturel (forêt, sentier). Pas de FC cible, focus: respiration nasale, déconnexion", zones: ["Z1"] },
      { part: "Cool-down", text: "5' étirements debout", zones: [] }
    ],
    variants: {},
    goals: ["ironman", "half", "marathon", "semi", "10k", "trail_mountain", "trail_ultra", "trail_short"],
    tags: ["récupération", "marche", "nature", "mental"]
  },
  {
    id: "V3_RECUP_MOBILITE_HANCHE",
    cat: "D", sport: "strength",
    objectif: "Mobilité articulaire hanches/chevilles — prévention",
    necessite: "Recommandé",
    when: "Quotidien ou post-entraînement",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Blessure articulaire aiguë",
    durationMin: [15, 25],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "2' marche sur place", zones: [] },
      { part: "Main", text: "Routine: CARs hanche (2x10/côté), 90/90 stretch (2'), frog stretch (2'), ankle CARs (2x10), deep squat hold (2'), cossack squat (3x8/côté)", zones: [] },
      { part: "Cool-down", text: "2' respiration profonde", zones: [] }
    ],
    variants: {},
    goals: ["marathon", "semi", "10k", "trail_mountain", "trail_ultra", "trail_short"],
    tags: ["mobilité", "hanches", "chevilles", "prévention"]
  },
  {
    id: "V3_RECUP_COMPRESSION_PROTOCOL",
    cat: "D", sport: "mixed",
    objectif: "Protocole récupération complète — cold/compression/nutrition",
    necessite: "Optionnel",
    when: "Après compétition ou séance > RPE 8",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Si blessure nécessitant avis médical",
    durationMin: [30, 60],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "Pas d'échauffement", zones: [] },
      { part: "Main", text: "1) Nutrition récup dans les 30' (0.3g/kg protéines + 1g/kg glucides). 2) Compression 20'. 3) Bain froid 10' à 10-12°C ou douche contrastée. 4) Foam rolling 10'", zones: [] },
      { part: "Cool-down", text: "Sieste 20-30' si possible", zones: [] }
    ],
    variants: {},
    goals: ["ironman", "half", "marathon", "semi", "10k", "trail_mountain", "trail_ultra"],
    tags: ["récupération", "compression", "froid", "nutrition", "protocole"]
  },

  // ═══════════════════════════════════════════
  // TRAIL SHORT (20-40K) SPÉCIFIQUE
  // ═══════════════════════════════════════════
  {
    id: "V3_TRAIL_SHORT_TEMPO_COTE",
    cat: "B", sport: "course",
    objectif: "Tempo côte trail court — allure spécifique montée",
    necessite: "Obligatoire",
    when: "Build, terrain vallonné",
    phase: ["build"],
    avoid: "Plat uniquement",
    durationMin: [55, 75],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 plat", zones: ["Z1", "Z2"] },
      { part: "Main", text: "5-6x 5' montée à allure course trail (85-90% FCmax) / descente trot Z1", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10' Z1 plat", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["trail_short"],
    dPlusTargetM: { min: 300, max: 500 },
    tags: ["trail", "court", "tempo", "côte"]
  },
  {
    id: "V3_TRAIL_SHORT_RACE_SIM",
    cat: "Race-Sim", sport: "course",
    objectif: "Simulation trail court 20-30K — parcours type",
    necessite: "Obligatoire",
    when: "S-2 à S-3 avant course",
    phase: ["build", "peak"],
    avoid: "Plus de 2x dans le plan",
    durationMin: [100, 180],
    metricKey: "cardiaque", sportKey: "running",
    structure: [
      { part: "Warm-up", text: "10' Z1", zones: ["Z1"] },
      { part: "Main", text: "20-25K sur parcours similaire: profil D+, ravitaillement, tenue course. Allure cible ±5%", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10' marche", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["trail_short"],
    dPlusTargetM: { min: 500, max: 1000 },
    tags: ["race-sim", "trail", "court", "simulation"]
  },

  // ═══════════════════════════════════════════
  // CYCLISME — ENDURANCE COMPLÉMENTAIRE
  // ═══════════════════════════════════════════
  {
    id: "V3_BIKE_Z2_PROGRESSIF",
    cat: "A", sport: "cyclisme",
    objectif: "Sortie Z2 progressive — montée en puissance graduelle",
    necessite: "Recommandé",
    when: "Base/Build, mi-semaine",
    phase: ["base", "build"],
    avoid: "Semaine de récup",
    durationMin: [90, 150],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1", zones: ["Z1"] },
      { part: "Main", text: "Progressif: 30' bas Z2 (55%) → 30' mi-Z2 (62%) → 30' haut Z2 (70%). Cadence stable 85-90 rpm", zones: ["Z2"] },
      { part: "Cool-down", text: "15' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "Étendre à 2h30 progressif", half: "1h30 progressif" },
    goals: ["ironman", "half"],
    tags: ["endurance", "progressif", "Z2", "aérobie"]
  },
  {
    id: "V3_BIKE_INDOOR_ZWIFT",
    cat: "B", sport: "cyclisme",
    objectif: "Indoor structuré — séance home-trainer type Zwift",
    necessite: "Optionnel",
    when: "Mauvais temps ou contrainte horaire",
    phase: ["build", "peak"],
    avoid: "Si possibilité de rouler dehors",
    durationMin: [45, 75],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "10' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3x(5' Z3 + 3' Z4 + 1' Z5) / 3' Z1. ERG mode recommandé", zones: ["Z3", "Z4", "Z5"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half", "10k"],
    tags: ["indoor", "home-trainer", "structuré"]
  },
  {
    id: "V3_BIKE_NEGATIVE_SPLIT",
    cat: "B", sport: "cyclisme",
    objectif: "Negative split vélo — 2ème moitié plus rapide",
    necessite: "Recommandé",
    when: "Build/Peak, simulation race strategy",
    phase: ["build", "peak"],
    avoid: "Semaine de récup",
    durationMin: [90, 150],
    metricKey: "puissance", sportKey: "cycling",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "1ère moitié: Z2 haut (68-72% FTP). 2ème moitié: Z3 bas (76-82% FTP). Derniers 10': Z3 haut si sensations OK", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "2h total", half: "1h30 total" },
    goals: ["ironman", "half"],
    tags: ["negative-split", "stratégie", "race-pace"]
  },

  // ═══════════════════════════════════════════
  // NATATION — COMPLÉMENTS
  // ═══════════════════════════════════════════
  {
    id: "V3_SWIM_OWS_SIGHTING",
    cat: "B", sport: "natation",
    objectif: "Eau libre — navigation et drafting",
    necessite: "Recommandé",
    when: "Build/Peak, accès eau libre",
    phase: ["build", "peak"],
    avoid: "Conditions dangereuses",
    durationMin: [40, 60],
    metricKey: "css", sportKey: "swimming",
    structure: [
      { part: "Warm-up", text: "300m souple avec repérage bouées", zones: ["Z1"] },
      { part: "Main", text: "4x500m en eau libre: sighting toutes les 10 brasses, drafting en groupe si possible, entrées/sorties plage. Z2-Z3", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half"],
    tags: ["eau-libre", "OWS", "sighting", "drafting"]
  },
  {
    id: "V3_SWIM_SPEED_ENDURANCE",
    cat: "C", sport: "natation",
    objectif: "Speed endurance natation — maintien vitesse haute",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Douleur épaule",
    durationMin: [45, 60],
    metricKey: "css", sportKey: "swimming",
    structure: [
      { part: "Warm-up", text: "400m varié (100 NL, 100 bat, 100 pull, 100 NL)", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8x100m à CSS -3'' / 15'' repos + 4x200m à CSS / 20'' repos", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "200m souple dos", zones: ["Z1"] }
    ],
    variants: {},
    goals: ["ironman", "half"],
    tags: ["vitesse", "endurance", "natation", "CSS"]
  },
];
