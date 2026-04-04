/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICHED WORKOUTS V5 — Méthodologies Élite Manquantes
 * 
 * 8 types de séances identifiées comme lacunes vs littérature scientifique :
 * 1. Isométrique Force (Wiles 2010, Oranchuk 2019)
 * 2. Nordic Hamstring (Mjølsnes 2004, Al Attar 2017)
 * 3. Heat Acclimation supplémentaire (Racinais 2015, Périard 2021)
 * 4. Lactate Shuttle CAP (Brooks 2018)
 * 5. Respiratory Muscle Training (Illi 2012, HajGhanbari 2013)
 * 6. PAP – Post-Activation Potentiation (Tillin & Bishop 2009)
 * 7. Swim Cord / Résistance élastique (Girold 2007)
 * 8. Mental Rehearsal structuré (McCormick 2015)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";

// =============================================
// 1. ISOMÉTRIQUE FORCE — Wiles 2010, Oranchuk 2019
// Renforcement tendineux, prévention blessure, gain force statique
// =============================================
const ISOMETRIC_STRENGTH: LibraryWorkout[] = [
  {
    id: "C_STR_ISOMETRIC_LOWER",
    cat: "C",
    sport: "strength",
    objectif: "Force isométrique membres inférieurs – tendons, stabilité articulaire",
    necessite: "Recommandé",
    when: "Toute phase, 1-2×/sem, idéal jour off ou post Z2",
    phase: ["base", "build", "peak"],
    avoid: "Douleur articulaire aiguë, veille compétition",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "strength_isometric",
    structure: [
      { part: "Warm-up", text: "5min mobilité articulaire + activation glutes", zones: ["Z1"] },
      { part: "Main", text: "Wall Sit 4×45s → Iso-Squat 90° 4×30s → Single-Leg ISO Lunge 3×25s/côté → Copenhagen Plank 3×20s/côté. Repos 60-90s inter-séries. Réf: Oranchuk 2019 – isométrie longue durée pour adaptation tendineuse.", zones: ["Force isométrique"] },
      { part: "Cool-down", text: "5min étirements passifs quadriceps, ischio-jambiers, mollets", zones: ["Récup"] }
    ],
    variants: {
      ironman: "Ajouter Calf Raise ISO 4×30s pour endurance Achille",
      marathon: "Focus Wall Sit prolongé 5×60s pour résistance quadriceps",
      trail_mountain: "Ajouter Single-Leg Squat ISO 3×30s pour stabilité descente"
    },
    goals: ["ironman", "half", "marathon", "semi", "10k", "trail_short", "trail_mountain", "trail_ultra"],
    tags: ["isometric", "injury-prevention", "tendon", "Wiles2010", "Oranchuk2019"],
    notes: "Réf: Wiles 2010 – wall sit réduit pression artérielle et améliore endurance isométrique. Oranchuk 2019 – revue systématique isométrie."
  },
  {
    id: "C_STR_ISOMETRIC_UPPER",
    cat: "C",
    sport: "strength",
    objectif: "Force isométrique haut du corps – gainage, stabilité épaules nageur",
    necessite: "Optionnel",
    when: "Base/Build, 1×/sem",
    phase: ["base", "build"],
    avoid: "Douleur épaule, tendinite",
    durationMin: [20, 30],
    metricKey: "cardiaque",
    sportKey: "strength_isometric_upper",
    structure: [
      { part: "Warm-up", text: "5min mobilité épaules + rotateur externe élastique", zones: ["Z1"] },
      { part: "Main", text: "Plank Holds 4×45s → Side Plank 3×30s/côté → Hollow Body Hold 3×30s → Dead Hang 3×30s → Swimmer ISO (bras tendus prone) 3×20s. Repos 45-60s.", zones: ["Force isométrique", "Gainage"] },
      { part: "Cool-down", text: "5min étirements épaules, dorsaux, poignets", zones: ["Récup"] }
    ],
    variants: {
      ironman: "Ajouter Aero Hold ISO 3×45s sur home-trainer",
      half: "Ajouter Aero Hold ISO 3×30s"
    },
    goals: ["ironman", "half", "marathon", "semi"],
    tags: ["isometric", "core", "shoulder-stability"],
    notes: "Prévention blessures épaule nageur + gainage posture aéro vélo."
  }
];

// =============================================
// 2. NORDIC HAMSTRING — Mjølsnes 2004, Al Attar 2017
// Prévention blessure ischio-jambiers, force excentrique
// =============================================
const NORDIC_HAMSTRING: LibraryWorkout[] = [
  {
    id: "C_STR_NORDIC_HAMSTRING",
    cat: "C",
    sport: "strength",
    objectif: "Force excentrique ischio-jambiers – prévention blessure course",
    necessite: "Recommandé",
    when: "Toute phase sauf taper, 2×/sem (dose progressive)",
    phase: ["base", "build", "peak"],
    avoid: "Douleur ischio aiguë, DOMS sévères, 48h avant séance clé course",
    durationMin: [15, 25],
    metricKey: "cardiaque",
    sportKey: "strength_nordic",
    structure: [
      { part: "Warm-up", text: "5min jogging léger + A-skip + gammes dynamiques", zones: ["Z1"] },
      { part: "Main", text: "Nordic Curl progression : S1-2 = 3×5 reps assistés → S3-4 = 3×6 full range → S5+ = 4×6. Tempo 3-0-1. + Single-Leg Romanian DL 3×8/côté. + Prone Hamstring Curl ISO 3×20s. Réf: Mjølsnes 2004 – réduction 65-70% incidence blessure ischio.", zones: ["Force excentrique"] },
      { part: "Cool-down", text: "5min foam rolling ischio + étirements doux", zones: ["Récup"] }
    ],
    variants: {
      marathon: "Augmenter volume : 4×8 + Nordic Slider 3×6",
      trail_mountain: "Ajouter Step-Down excentrique 3×8/côté pour descente",
      "10k": "Maintenir dose minimale 3×5 pour vélocité"
    },
    goals: ["marathon", "semi", "10k", "trail_short", "trail_mountain", "trail_ultra", "trail_long"],
    tags: ["nordic", "hamstring", "eccentric", "injury-prevention", "Mjolsnes2004", "AlAttar2017"],
    notes: "Réf: Al Attar 2017 – méta-analyse : Nordic Hamstring = gold standard prévention blessure ischio chez coureurs. Progression obligatoire sur 4-6 semaines."
  }
];

// =============================================
// 3. HEAT ACCLIMATION — Racinais 2015, Périard 2021
// Protocoles supplémentaires pour compétitions en chaleur
// =============================================
const HEAT_ACCLIMATION: LibraryWorkout[] = [
  {
    id: "C_HEAT_ACCLIM_BIKE_INDOOR",
    cat: "C",
    sport: "cyclisme",
    objectif: "Acclimatation chaleur sur home-trainer – expansion plasmatique",
    necessite: "Recommandé",
    when: "3-4 sem avant compétition en chaleur, 5-10 séances",
    phase: ["peak"],
    avoid: "Pathologie cardiaque, déshydratation préexistante",
    durationMin: [45, 75],
    metricKey: "cardiaque",
    sportKey: "bike_heat_acclim",
    structure: [
      { part: "Warm-up", text: "10min Z1 progressif, habillage chaud (couches, salle chauffée 30-35°C)", zones: ["Z1"] },
      { part: "Main", text: "35-55min Z2 en conditions thermiques contrôlées. FC cible : 75-85% FCmax. Hydratation contrôlée : boire à soif mais peser avant/après. Objectif : sudation 1-1.5L/h. Réf: Racinais 2015 – 5-10 séances = adaptation thermorégulatrice complète.", zones: ["Z2", "Heat stress"] },
      { part: "Cool-down", text: "5min Z1 + réhydratation immédiate + pesée post", zones: ["Z1", "Récup"] }
    ],
    variants: {
      ironman: "Allonger à 75min, ajouter nutrition 60g/h CHO pour tester tolérance chaleur+nutrition",
      half: "50min suffisant, focus FC drift monitoring",
      marathon: "Alterner vélo/tapis pour habituer la course"
    },
    goals: ["ironman", "half", "marathon", "semi", "trail_mountain"],
    tags: ["heat", "acclimation", "thermoregulation", "Racinais2015", "Periard2021"],
    notes: "Réf: Périard 2021 – heat acclimation améliore VO2max effectif de 3-5% en conditions chaudes. Protocole minimal : 5 séances × 60min à >30°C."
  },
  {
    id: "A_HEAT_ACCLIM_RUN",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue en conditions chaudes – adaptation sudation + pacing chaleur",
    necessite: "Recommandé",
    when: "2-4 sem avant objectif chaud, remplace 1 sortie longue standard",
    phase: ["peak"],
    avoid: "Canicule extrême sans expérience, pathologie cardiaque",
    durationMin: [60, 90],
    metricKey: "cardiaque",
    sportKey: "run_heat_acclim",
    structure: [
      { part: "Warm-up", text: "10min marche/jog très léger, protection solaire, hydratation pré-chargée", zones: ["Z1"] },
      { part: "Main", text: "45-70min Z2 aux heures chaudes (12h-15h). FC drift attendu +10-15bpm. Allure régulée par FC, PAS par pace. Points hydratation toutes les 15min. Réf: Périard 2021 – adaptation perceptuelle + physiologique.", zones: ["Z2", "Heat stress"] },
      { part: "Cool-down", text: "5min marche à l'ombre + réhydratation + pesée", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Combiner avec nutrition test 80-90g/h CHO",
      trail_mountain: "Ajouter 300-500m D+ pour combo chaleur+altitude",
      marathon: "Focus allure marathon au feeling (ignorer GPS)"
    },
    goals: ["ironman", "half", "marathon", "trail_mountain", "trail_ultra"],
    tags: ["heat", "acclimation", "long-run", "Periard2021"],
    notes: "Adaptation perceptuelle cruciale : apprendre à gérer l'effort mental en chaleur."
  }
];

// =============================================
// 4. LACTATE SHUTTLE CAP — Brooks 2018
// Navette lactate en course à pied
// =============================================
const LACTATE_SHUTTLE_RUN: LibraryWorkout[] = [
  {
    id: "B_RUN_LACTATE_SHUTTLE",
    cat: "B",
    sport: "course",
    objectif: "Navette lactate – clairance lactique et recyclage métabolique",
    necessite: "Recommandé",
    when: "Build/Peak, 1×/sem max, remplace séance seuil classique",
    phase: ["build", "peak"],
    avoid: "VLamax très haute (préférer Z2 prolongé), fatigue élevée",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "run_lactate_shuttle",
    structure: [
      { part: "Warm-up", text: "15min Z1-Z2 progressif + 4 accélérations 15s", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Alternance seuil/récup active : 4-6× (3min allure seuil → 2min Z2 actif SANS arrêt). L'objectif est de maintenir le lactate légèrement élevé (~3-4 mmol/L) sans pic. Réf: Brooks 2018 – le lactate est un carburant, pas un déchet. Entraîner la navette = meilleure clairance.", zones: ["Z3-Z4", "Z2"] },
      { part: "Cool-down", text: "10min Z1 décroissant", zones: ["Z1"] }
    ],
    variants: {
      marathon: "6×3min au seuil marathon + 2min Z2",
      semi: "5×3min au seuil semi + 90s Z2",
      "10k": "4×4min allure 10K + 2min Z2",
      trail_mountain: "Sur terrain vallonné : 4×3min en montée seuil + 2min descente récup"
    },
    goals: ["marathon", "semi", "10k", "half", "ironman", "trail_short", "trail_mountain"],
    tags: ["lactate-shuttle", "threshold", "clearance", "Brooks2018"],
    notes: "Réf: Brooks 2018 – Cell-to-Cell Lactate Shuttle. La récupération active maintient le flux de lactate comme substrat énergétique. Ne pas confondre avec du fractionné classique : ici la récup est ACTIVE et l'intensité contrôlée."
  }
];

// =============================================
// 5. RESPIRATORY MUSCLE TRAINING — Illi 2012, HajGhanbari 2013
// Entraînement des muscles respiratoires
// =============================================
const RESPIRATORY_TRAINING: LibraryWorkout[] = [
  {
    id: "C_RESP_INSPIRATORY_MUSCLE",
    cat: "C",
    sport: "strength",
    objectif: "Entraînement muscles inspiratoires – réduction dyspnée, économie ventilatoire",
    necessite: "Optionnel",
    when: "Toute phase, quotidien ou 5×/sem, complément aux séances principales",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Asthme non contrôlé, pneumothorax récent",
    durationMin: [10, 15],
    metricKey: "cardiaque",
    sportKey: "respiratory_imt",
    structure: [
      { part: "Warm-up", text: "2min respiration diaphragmatique profonde, 4-7-8 pattern", zones: ["Récup"] },
      { part: "Main", text: "30 respirations résistées (PowerBreathe ou équivalent) : 2×15 à 50-70% MIP (pression inspiratoire max). Progression : semaine 1 = 50% MIP → semaine 4+ = 70% MIP. Alternative sans matériel : 5×6 respirations contre lèvres pincées avec contraction abdominale. Réf: Illi 2012 – méta-analyse : IMT améliore performance endurance 3-5%.", zones: ["Respiratoire"] },
      { part: "Cool-down", text: "2min respiration lente 4-4 + relaxation", zones: ["Récup"] }
    ],
    variants: {
      ironman: "Matin + soir, 2×30 reps, focus endurance respiratoire longue durée",
      "10k": "1×/jour, 2×15 reps intensité plus haute (70% MIP)",
      trail_ultra: "Combiner avec exercices de respiration nasale pour économie"
    },
    goals: ["ironman", "half", "marathon", "semi", "10k", "trail_mountain", "trail_ultra"],
    tags: ["respiratory", "IMT", "breathing", "Illi2012", "HajGhanbari2013"],
    notes: "Réf: HajGhanbari 2013 – IMT réduit la perception d'effort respiratoire et améliore le time-to-exhaustion. Matériel recommandé : PowerBreathe K-Series ou Airofit."
  }
];

// =============================================
// 6. PAP — Post-Activation Potentiation — Tillin & Bishop 2009
// Activation neuromusculaire pré-compétition
// =============================================
const PAP_ACTIVATION: LibraryWorkout[] = [
  {
    id: "D_PAP_PRE_RACE",
    cat: "D",
    sport: "strength",
    objectif: "Post-Activation Potentiation – activation neuromusculaire pré-compétition",
    necessite: "Recommandé",
    when: "J-1 ou matin de course, 1× unique",
    phase: ["peak", "taper"],
    avoid: "Si jamais pratiqué avant (tester en entraînement d'abord)",
    durationMin: [12, 20],
    metricKey: "cardiaque",
    sportKey: "pap_activation",
    structure: [
      { part: "Warm-up", text: "5min mobilité dynamique + 2×10 squats poids de corps", zones: ["Z1"] },
      { part: "Main", text: "Protocole PAP : 3×3 Back Squat à 80-85% 1RM (ou 3×5 Squat Jump max) → Repos 3min → 3×20m sprint court. Alternative sans salle : 3×5 CMJ (Counter-Movement Jump) max effort → 3×15m accélérations. Réf: Tillin & Bishop 2009 – PAP augmente rate of force development de 5-10% pendant 5-20min post-activation.", zones: ["Neuromusculaire", "Puissance"] },
      { part: "Cool-down", text: "3min marche + étirements dynamiques légers", zones: ["Récup"] }
    ],
    variants: {
      "10k": "Focus CMJ 5×3 + strides 4×80m @ race pace",
      marathon: "Version allégée : 3×3 CMJ + 3×100m allure semi",
      trail_short: "3×5 Box Jump + 3×20m côte sprint",
      ironman: "Remplacer par 5min spin vélo Z3 → 3×10s sprint = PAP cycling"
    },
    goals: ["10k", "semi", "marathon", "half", "trail_short", "trail_mountain"],
    tags: ["PAP", "potentiation", "activation", "pre-race", "Tillin2009"],
    notes: "Réf: Tillin & Bishop 2009 – revue : fenêtre optimale PAP = 5-20min post-activation. TESTER AVANT en entraînement (2-3×). Ne pas utiliser si non familier le jour J."
  }
];

// =============================================
// 7. SWIM CORD / RÉSISTANCE ÉLASTIQUE — Girold 2007
// Force spécifique natation avec élastiques
// =============================================
const SWIM_CORD: LibraryWorkout[] = [
  {
    id: "C_SWIM_CORD_RESISTANCE",
    cat: "C",
    sport: "natation",
    objectif: "Force spécifique nage avec élastique/corde – puissance de traction",
    necessite: "Optionnel",
    when: "Build/Peak, 1-2×/sem en complément de séance piscine",
    phase: ["build", "peak"],
    avoid: "Tendinite épaule, douleur coiffe des rotateurs",
    durationMin: [20, 30],
    metricKey: "cardiaque",
    sportKey: "swim_cord",
    structure: [
      { part: "Warm-up", text: "5min mobilité épaules + band pull-apart 2×15", zones: ["Z1"] },
      { part: "Main", text: "Swim Cord attaché au mur ou poteau : 4×30s traction crawl max → 60s repos. + 3×20s traction papillon → 45s repos. + Band-Resisted Catch 3×12 reps/bras. Alternative piscine : 4×25m avec élastique de résistance attaché à la taille. Réf: Girold 2007 – swim cord + natation = gain 2-3% vitesse nage sur 50-100m.", zones: ["Force spécifique", "Puissance nage"] },
      { part: "Cool-down", text: "5min étirements épaules + rotation externe légère", zones: ["Récup"] }
    ],
    variants: {
      ironman: "Réduire intensité, augmenter durée : 6×20s + focus endurance de traction",
      half: "4×25s max + 4×25m résisté en piscine",
      "10k": "Non applicable"
    },
    goals: ["ironman", "half"],
    tags: ["swim-cord", "resistance", "swim-specific-strength", "Girold2007"],
    notes: "Réf: Girold 2007 – la combinaison entraînement sec résisté + natation classique > natation seule pour la puissance de nage. Matériel : Swim Cord (StrechCordz ou équivalent)."
  }
];

// =============================================
// 8. MENTAL REHEARSAL STRUCTURÉ — McCormick 2015
// Visualisation et préparation mentale de course
// =============================================
const MENTAL_REHEARSAL: LibraryWorkout[] = [
  {
    id: "D_MENTAL_RACE_VISUALIZATION",
    cat: "D",
    sport: "mixed",
    objectif: "Visualisation structurée de course – gestion mentale, pacing, scénarios",
    necessite: "Recommandé",
    when: "2-4 sem avant objectif, 2-3×/sem, complément aux séances physiques",
    phase: ["peak", "taper"],
    avoid: "Anxiété pathologique non accompagnée (orienter vers psychologue du sport)",
    durationMin: [15, 25],
    metricKey: "cardiaque",
    sportKey: "mental_visualization",
    structure: [
      { part: "Warm-up", text: "3min respiration carrée (4-4-4-4) + scan corporel progressif", zones: ["Récup"] },
      { part: "Main", text: "Visualisation multi-sensorielle : 1) Parcours complet en imagination (5min) – chaque km/secteur clé. 2) Scénario 'Plan A' : course idéale, pacing, nutrition, sensations (3min). 3) Scénario 'Plan B' : gestion difficulté (crampe, météo, concurrent) – coping strategies (3min). 4) Ancrage : mot-clé + geste associé pour reset mental en course (2min). Réf: McCormick 2015 – visualisation améliore performance 1-3% et réduit anxiété compétitive.", zones: ["Mental"] },
      { part: "Cool-down", text: "3min respiration lente + journal : noter 3 sensations positives visualisées", zones: ["Récup"] }
    ],
    variants: {
      ironman: "Visualiser les 3 disciplines + transitions T1/T2 + nutrition horaire",
      marathon: "Focus km 30-42 : gestion mur + stratégie finish",
      trail_mountain: "Visualiser ravitaillements, descentes techniques, gestion bâtons",
      trail_ultra: "Inclure gestion de nuit, somnolence, changement de matériel"
    },
    goals: ["ironman", "half", "marathon", "semi", "10k", "trail_short", "trail_mountain", "trail_ultra", "trail_long"],
    tags: ["mental", "visualization", "race-prep", "psychology", "McCormick2015"],
    notes: "Réf: McCormick 2015 – Mental imagery in sport: A review. Technique validée chez athlètes élite. Pratiquer couché ou assis au calme. Enregistrer un audio guide personnalisé pour faciliter la régularité."
  },
  {
    id: "D_MENTAL_RACE_SCENARIO_TRAINING",
    cat: "D",
    sport: "mixed",
    objectif: "Entraînement par scénarios – résilience mentale et adaptabilité tactique",
    necessite: "Optionnel",
    when: "Build/Peak, 1×/sem, idéalement après séance longue",
    phase: ["build", "peak"],
    avoid: "Aucun",
    durationMin: [10, 15],
    metricKey: "cardiaque",
    sportKey: "mental_scenario",
    structure: [
      { part: "Warm-up", text: "2min centrage attention + respiration 4-7-8", zones: ["Récup"] },
      { part: "Main", text: "3 scénarios aléatoires (tirer au sort ou coach impose) : Ex: 'Tu perds ta gourde au km 15', 'Il pleut au T2', 'Tu as une crampe au km 35'. Pour chaque : 1) Visualiser le problème (30s) → 2) Identifier la solution (30s) → 3) Visualiser l'exécution de la solution (1min). Réf: Brick 2020 – coping strategies = trait distinctif des athlètes performants.", zones: ["Mental", "Stratégique"] },
      { part: "Cool-down", text: "2min gratitude + note des solutions trouvées", zones: ["Récup"] }
    ],
    variants: {
      ironman: "Scénarios : crevaison, problème nutrition, vent de face segment vélo",
      trail_ultra: "Scénarios : nausée ravitaillement, ampoule, chute technique"
    },
    goals: ["ironman", "half", "marathon", "trail_mountain", "trail_ultra"],
    tags: ["mental", "scenario", "coping", "resilience", "Brick2020"],
    notes: "Inspiré de la préparation mentale des forces spéciales et de l'aviation. Adapter les scénarios au parcours réel de l'objectif."
  }
];

// =============================================
// EXPORT CONSOLIDÉ
// =============================================
export const EnrichedWorkoutsV5: LibraryWorkout[] = [
  ...ISOMETRIC_STRENGTH,
  ...NORDIC_HAMSTRING,
  ...HEAT_ACCLIMATION,
  ...LACTATE_SHUTTLE_RUN,
  ...RESPIRATORY_TRAINING,
  ...PAP_ACTIVATION,
  ...SWIM_CORD,
  ...MENTAL_REHEARSAL,
];
