/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICHED WORKOUTS — START TO RUN (débutant absolu)
 *
 * Motivation : jusqu'ici l'objectif `StartToRun` était redirigé sur le pool
 * `10k` (workoutCatalogBuilder.normalizeGoal). Un débutant recevait donc des
 * fiches conçues pour un coureur déjà « constructible » (VMA courte, seuil,
 * tempo continu 30-45 min), avec pour seule adaptation un volume réduit.
 *
 * Ce module fournit le catalogue MANQUANT : une progression marche-course sur
 * 12 semaines, pilotée par l'impact cumulé (minutes COURUES, pas minutes
 * totales) et non par des cibles métaboliques (FatMax, VLamax, déplétion) qui
 * n'ont aucune pertinence chez un débutant.
 *
 * Principes retenus (littérature « couch to 5K » / Lorang initiation /
 * charge mécanique — Nielsen 2012, Bertelsen 2017 sur la progression du
 * volume et le risque de blessure du coureur novice) :
 *   1. Intensité plafonnée : tout se court en Z1-Z2 « conversationnelle ».
 *      Aucune séance Z4/Z5 avant la fin du cycle. Aucun sprint.
 *   2. Progression par MINUTES COURUES cumulées, +≤10 %/semaine, avec palier
 *      de consolidation toutes les 4 semaines.
 *   3. Ratio marche/course décroissant : 1'/2' → 2'/1' → 5'/1' → continu.
 *   4. Jamais 2 jours de course consécutifs (récupération du tissu conjonctif
 *      plus lente que l'adaptation cardio).
 *   5. Renforcement + mobilité obligatoires : le limiteur d'un débutant est
 *      musculo-squelettique, pas aérobie.
 *
 * Taxonomie : préfixe `S2R_`, `sport: "course"` (ou "renforcement"),
 * `goals: ["start_to_run"]` UNIQUEMENT → ces fiches ne peuvent pas fuiter dans
 * un plan 5K/10K/semi, et réciproquement le hard-ban `start_to_run` du
 * catalog builder empêche les fiches performance d'entrer ici.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";

const START_TO_RUN: LibraryWorkout[] = [
  // ── PHASE 1 — INITIATION (semaines 1-4) : découvrir l'impact ────────────────
  {
    id: "S2R_WALK_RUN_1_2",
    cat: "A",
    sport: "course",
    objectif: "Marche-course 1'/2' — première exposition à l'impact, tolérance tendineuse",
    necessite: "Obligatoire",
    when: "Semaines 1-2, 3×/semaine, jamais 2 jours de suite",
    phase: ["base"],
    avoid: "Douleur tendineuse ou articulaire persistante, 2 jours consécutifs",
    durationMin: [24, 30],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "5min marche active, rythme soutenu, posture grandie", zones: ["Z1"] },
      { part: "Main", text: "8× (1min trot très facile + 2min marche). Le trot doit permettre de parler en phrases complètes — si ce n'est pas le cas, ralentir encore. Total couru = 8min. Aucune notion d'allure, uniquement la sensation.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "5min marche + mobilité chevilles/mollets 3min", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "marche-course", "initiation", "impact-progressif"],
    notes: "Minutes courues cumulées de la semaine : ~24min. Repère de sécurité : aucune douleur qui augmente pendant la séance.",
  },
  {
    id: "S2R_WALK_RUN_2_2",
    cat: "A",
    sport: "course",
    objectif: "Marche-course 2'/2' — allongement de la fraction courue",
    necessite: "Obligatoire",
    when: "Semaines 3-4, 3×/semaine",
    phase: ["base"],
    avoid: "Semaine où une douleur d'impact est apparue (rester sur 1'/2')",
    durationMin: [28, 34],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "5min marche active + 5 montées de genoux/talons-fesses souples", zones: ["Z1"] },
      { part: "Main", text: "7× (2min trot facile + 2min marche). Total couru = 14min. Cadence cible : petits pas rapides plutôt que grandes foulées (limite l'impact au talon).", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "5min marche + étirements doux mollets/quadriceps", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "marche-course", "initiation"],
    notes: "Minutes courues cumulées : ~42min/semaine. Ne pas passer à la fiche suivante si la séance reste difficile.",
  },
  {
    id: "S2R_WALK_BRISK_RECOVERY",
    cat: "D",
    sport: "course",
    objectif: "Marche rapide de récupération — volume aérobie SANS impact supplémentaire",
    necessite: "Recommandé",
    when: "Jour intercalaire entre deux séances de marche-course",
    phase: ["base", "build"],
    avoid: "Rien — séance de sécurité",
    durationMin: [30, 45],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "5min marche normale", zones: ["Z1"] },
      { part: "Main", text: "25-35min marche rapide continue, bras actifs, respiration nasale possible. Aucun trot.", zones: ["Z1"] },
      { part: "Cool-down", text: "5min marche lente", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "marche", "recuperation", "sans-impact"],
    notes: "Sert à construire le socle aérobie pendant que le tissu conjonctif récupère de l'impact.",
  },

  // ── PHASE 2 — CONSTRUCTION (semaines 5-8) : inverser le ratio ───────────────
  {
    id: "S2R_WALK_RUN_3_1",
    cat: "A",
    sport: "course",
    objectif: "Marche-course 3'/1' — la course devient majoritaire",
    necessite: "Obligatoire",
    when: "Semaines 5-6, 3×/semaine",
    phase: ["base", "build"],
    avoid: "Si la fiche 2'/2' n'est pas encore confortable",
    durationMin: [32, 38],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "5min marche + 5min alternance 30s trot / 30s marche", zones: ["Z1"] },
      { part: "Main", text: "6× (3min trot facile + 1min marche). Total couru = 18min. Test de la parole à chaque fraction : si essoufflé, réduire l'allure, jamais la durée.", zones: ["Z2"] },
      { part: "Cool-down", text: "5min marche + mobilité hanches", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "marche-course", "construction"],
    notes: "Minutes courues cumulées : ~54min/semaine (+~28 % sur 2 semaines → palier de consolidation obligatoire en S7).",
  },
  {
    id: "S2R_WALK_RUN_5_1",
    cat: "A",
    sport: "course",
    objectif: "Marche-course 5'/1' — préparation à la course continue",
    necessite: "Obligatoire",
    when: "Semaines 7-8, 2-3×/semaine",
    phase: ["build"],
    avoid: "Terrain irrégulier, dénivelé marqué (l'impact est déjà maximal pour le profil)",
    durationMin: [36, 42],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "8min marche active + 3× 1min trot progressif", zones: ["Z1"] },
      { part: "Main", text: "5× (5min trot facile + 1min marche). Total couru = 25min. Objectif : régularité de l'allure entre la 1re et la 5e fraction (la dernière ne doit pas être plus lente).", zones: ["Z2"] },
      { part: "Cool-down", text: "5min marche + gainage doux 2min", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "marche-course", "construction", "regularite"],
    notes: "Minutes courues cumulées : ~75min/semaine.",
  },
  {
    id: "S2R_CONSOLIDATION_WEEK_SESSION",
    cat: "D",
    sport: "course",
    objectif: "Séance de palier — répétition du volume de la semaine précédente sans progression",
    necessite: "Obligatoire",
    when: "Toutes les 4 semaines (S4, S8, S12) — semaine de consolidation",
    phase: ["base", "build", "peak"],
    avoid: "Toute tentation d'augmenter la durée cette semaine",
    durationMin: [28, 36],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "5min marche", zones: ["Z1"] },
      { part: "Main", text: "Reprendre EXACTEMENT le format de la semaine précédente, en réduisant le nombre de répétitions de 1. Aucune augmentation de durée ni d'allure.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "5min marche + étirements", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "consolidation", "palier"],
    notes: "Le palier est le mécanisme principal de prévention des blessures du novice : l'adaptation osseuse/tendineuse est plus lente que l'adaptation cardio.",
  },

  // ── PHASE 3 — CONTINU (semaines 9-12) : courir sans marcher ────────────────
  {
    id: "S2R_CONTINUOUS_15",
    cat: "A",
    sport: "course",
    objectif: "Première course continue 15min — franchissement du seuil psychologique",
    necessite: "Obligatoire",
    when: "Semaine 9, 1re séance de la semaine",
    phase: ["build"],
    avoid: "Chaleur forte, terrain dur inhabituel",
    durationMin: [30, 36],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "8min marche active + 2× 1min trot", zones: ["Z1"] },
      { part: "Main", text: "15min de course continue, allure volontairement très lente (plus lente que les fractions de 5min). Autorisation explicite de marcher 1min si nécessaire, puis reprendre.", zones: ["Z2"] },
      { part: "Cool-down", text: "8min marche + mobilité complète", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "course-continue", "etape-cle"],
    notes: "Réussir cette séance importe plus que sa qualité. Aucune donnée d'allure à commenter.",
  },
  {
    id: "S2R_CONTINUOUS_20_25",
    cat: "A",
    sport: "course",
    objectif: "Course continue 20-25min — consolidation de l'endurance de base",
    necessite: "Obligatoire",
    when: "Semaines 10-11, 2×/semaine",
    phase: ["build", "peak"],
    avoid: "Enchaînement sur 2 jours consécutifs",
    durationMin: [34, 42],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "8min marche active + 3× 30s trot progressif", zones: ["Z1"] },
      { part: "Main", text: "20 à 25min de course continue en Z2 conversationnelle. Repère : pouvoir prononcer une phrase de 8-10 mots sans reprendre son souffle.", zones: ["Z2"] },
      { part: "Cool-down", text: "6min marche + étirements mollets/ischios", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "course-continue", "endurance-fondamentale"],
    notes: "Minutes courues cumulées : ~50-60min/semaine sur 2-3 sorties.",
  },
  {
    id: "S2R_CONTINUOUS_30_LONG",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue débutant 30min continues — objectif final du cycle",
    necessite: "Obligatoire",
    when: "Semaine 12, sortie la plus longue de la semaine",
    phase: ["peak"],
    avoid: "Veille d'une autre séance de course",
    durationMin: [42, 50],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "10min marche active progressive", zones: ["Z1"] },
      { part: "Main", text: "30min de course continue, allure stable et lente. Découpage mental possible en 3×10min sans arrêt.", zones: ["Z2"] },
      { part: "Cool-down", text: "8min marche + mobilité complète 5min", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "course-continue", "sortie-longue-debutant", "objectif-final"],
    notes: "30min continues ≈ 4-5 km selon le profil. C'est la porte d'entrée vers les Test Days TFCL et le catalogue 5K/10K.",
  },
  {
    id: "S2R_FIRST_5K_WALK_RUN",
    cat: "Race-Sim",
    sport: "course",
    objectif: "Premier 5 km en marche-course assumée — validation du cycle",
    necessite: "Recommandé",
    when: "Fin de cycle (S12) ou course grand public visée",
    phase: ["peak", "taper"],
    avoid: "Départ trop rapide dans l'euphorie du dossard",
    durationMin: [35, 55],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "10min marche + 3× 1min trot", zones: ["Z1"] },
      { part: "Main", text: "5 km en course continue OU en 5'/1' marche-course selon la sensation du jour. Consigne unique : partir plus lentement que prévu sur le 1er kilomètre.", zones: ["Z2"] },
      { part: "Cool-down", text: "10min marche + étirements", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "premier-5k", "validation"],
    notes: "Aucun objectif chronométrique. Le succès = terminer sans douleur et vouloir recommencer.",
  },

  // ── TRANSVERSAL — support musculo-squelettique (le vrai limiteur) ───────────
  {
    id: "S2R_STR_FOUNDATION_BEGINNER",
    cat: "C",
    sport: "renforcement",
    objectif: "Renforcement fondation débutant — tolérance à l'impact (mollets, fessiers, gainage)",
    necessite: "Obligatoire",
    when: "2×/semaine, les jours sans course ou après la séance de course",
    phase: ["base", "build", "peak"],
    avoid: "Juste avant une séance de course (fatigue neuromusculaire)",
    durationMin: [20, 30],
    metricKey: "cardiaque",
    sportKey: "renforcement",
    structure: [
      { part: "Warm-up", text: "5min mobilité chevilles, hanches, thoracique", zones: ["Z1"] },
      { part: "Main", text: "3 tours : 15 montées sur pointes bipodales (progression : unipodales) · 12 ponts fessiers · 10 fentes avant contrôlées par jambe · 30s planche ventrale · 20s planche latérale par côté. Récup 60s entre tours. Exécution lente, jamais à l'échec.", zones: ["Z2"] },
      { part: "Cool-down", text: "5min étirements mollets, quadriceps, ischios", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "renforcement", "prevention", "mollets", "gainage"],
    notes: "Le mollet/tendon d'Achille et le tibia sont les 2 sites de blessure les plus fréquents du coureur débutant. Cette séance n'est pas optionnelle.",
  },
  {
    id: "S2R_TECHNIQUE_CADENCE_DRILLS",
    cat: "C",
    sport: "course",
    objectif: "Éducatifs et cadence — réduire l'impact par la fréquence de foulée",
    necessite: "Recommandé",
    when: "1×/semaine, intégré en début de séance de marche-course",
    phase: ["base", "build"],
    avoid: "Sur sol glissant ou en état de fatigue",
    durationMin: [15, 25],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "5min marche active", zones: ["Z1"] },
      { part: "Main", text: "4 éducatifs × 20m, 2 passages chacun : talons-fesses · montées de genoux · foulées bondissantes très souples · pas chassés. Puis 4× 1min de trot à cadence augmentée (petits pas rapides, viser ~170-180 pas/min avec un métronome).", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "5min marche", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "technique", "cadence", "prevention"],
    notes: "Augmenter la cadence de 5-10 % réduit significativement les forces d'impact au genou et à la hanche chez le novice.",
  },
  {
    id: "S2R_CROSS_TRAINING_LOW_IMPACT",
    cat: "D",
    sport: "mixed",
    objectif: "Cross-training sans impact (vélo, elliptique, natation) — volume aérobie supplémentaire",
    necessite: "Optionnel",
    when: "Jour de repos de course, si l'envie de bouger est là",
    phase: ["base", "build", "peak"],
    avoid: "Le transformer en séance dure — ça reste de la récupération active",
    durationMin: [30, 45],
    metricKey: "cardiaque",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "5min très facile", zones: ["Z1"] },
      { part: "Main", text: "25-35min continu en Z1-Z2 sur vélo, elliptique ou natation. Respiration confortable du début à la fin.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "5min très facile", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "cross-training", "sans-impact", "recuperation"],
    notes: "Permet de progresser en aérobie sans ajouter de charge mécanique — levier majeur chez le débutant en surpoids relatif.",
  },
  {
    id: "S2R_MOBILITY_RECOVERY",
    cat: "D",
    sport: "renforcement",
    objectif: "Mobilité et récupération — chevilles, hanches, chaîne postérieure",
    necessite: "Recommandé",
    when: "Lendemain de séance de course ou jour de repos",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Étirements balistiques agressifs sur muscle douloureux",
    durationMin: [15, 20],
    metricKey: "cardiaque",
    sportKey: "renforcement",
    structure: [
      { part: "Warm-up", text: "3min marche sur place ou mobilisation articulaire", zones: ["Z1"] },
      { part: "Main", text: "Circuit maintenu 45s par position : flexion dorsale de cheville au mur · fente basse hanche · étirement ischios assis · posture chat-vache · rouleau mousse mollets et fessiers 2min chacun.", zones: ["Z1"] },
      { part: "Cool-down", text: "3min respiration diaphragmatique allongé", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "mobilite", "recuperation", "prevention"],
    notes: "Sert aussi de séance « soupape » les jours où la motivation ou la fraîcheur manque.",
  },
];

export const EnrichedWorkoutsStartToRun: LibraryWorkout[] = START_TO_RUN;
