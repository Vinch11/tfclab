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
 * Taxonomie : préfixe `S2R_`, `sport: "course"`/"renforcement"/"natation"/
 * "cyclisme", `goals: ["start_to_run"]` UNIQUEMENT → ces fiches ne peuvent pas
 * fuiter dans un plan 5K/10K/semi, et réciproquement le hard-ban
 * `start_to_run` du catalog builder empêche les fiches performance d'entrer
 * ici.
 *
 * Extension (audit catalogue — coverage réelle vs. bibliothèque générale) :
 * le pool initial (16 fiches) ne couvrait que course/renforcement + 1 fiche
 * cross-training générique, et seulement 6 fiches taguées "taper" — donc peu
 * de choix réel sur les semaines 9-12 avant repli sur du texte libre non
 * vérifié. Ajout de fiches natation/vélo dédiées (sans impact), de paliers de
 * progression intermédiaires, et de davantage de contenu taper.
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
    notes: "Minutes courues cumulées : ~54min/semaine (+~28 % sur 2 semaines). Palier de consolidation suivant en S8 (cadence fixe toutes les 4 semaines : S4, S8, S12 — jamais S7).",
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
    objectif: "Semaine de palier — répétition du volume de la semaine précédente sans progression",
    necessite: "Obligatoire",
    when: "JAMAIS avant la semaine 4. Uniquement en S4, S8 et S12 (semaines de consolidation) — interdite en S1-S3 car il n'existe aucun volume antérieur à répéter.",
    // Bug réel corrigé (audit "génération de plan IA", volet catalogue) :
    // cette fiche est explicitement utilisée en S12 ("when" ci-dessus), mais
    // S12 (fin d'un cycle Start-to-Run de 12 semaines) tombe côté calcul de
    // phase par pourcentage (phasesForWeekRange) dans le bucket "taper" —
    // sans ce tag, la fiche disparaissait du catalogue injecté pour le
    // dernier chunk du plan, contredisant son propre "when".
    phase: ["base", "build", "peak", "taper"],
    avoid: "Semaines 1 à 3. Toute tentation d'augmenter la durée cette semaine.",
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
    // Bug réel corrigé (audit "génération de plan IA", volet catalogue) :
    // S10-11 peut tomber dans le bucket "taper" du calcul de phase par
    // pourcentage selon la longueur exacte du cycle — sans ce tag, la
    // fiche pouvait disparaître du catalogue injecté pour ces semaines.
    phase: ["build", "peak", "taper"],
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
    // Bug réel corrigé (audit "cohérence du prompt assemblé") : "sortie
    // longue" est le terme explicitement banni par S2R_STRUCTURE_RULES
    // (systemPrompt.ts, règle 1 — "on écrit marche-course progressive") pour
    // ne pas induire un cadrage performance chez un débutant. Ce libellé de
    // fiche l'utilisait pourtant lui-même — un plan citant ce titre tel quel
    // aurait donc violé sa propre règle S2R.
    objectif: "Course continue débutant 30min — objectif final du cycle",
    necessite: "Obligatoire",
    when: "Semaine 12, sortie la plus longue de la semaine",
    // Bug réel corrigé (audit "génération de plan IA", volet catalogue) :
    // c'est la séance phare du cycle (objectif final), explicitement en
    // S12 — qui tombe côté calcul de phase par pourcentage dans le bucket
    // "taper" pour un cycle de 12 semaines. Sans ce tag, la séance la plus
    // importante du programme disparaissait du catalogue injecté pour sa
    // propre semaine.
    phase: ["peak", "taper"],
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
    tags: ["start-to-run", "course-continue", "course-continue-debutant", "objectif-final"],
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
    objectif: "Renforcement fondation — Bloc 1 (S1-S4) : ancrage technique, charge minimale",
    necessite: "Obligatoire",
    when: "2×/semaine, les jours sans course ou après la séance de course",
    phase: ["base"],
    avoid: "Juste avant une séance de course (fatigue neuromusculaire)",
    durationMin: [20, 25],
    metricKey: "cardiaque",
    sportKey: "renforcement",
    structure: [
      { part: "Warm-up", text: "5min mobilité chevilles, hanches, thoracique", zones: ["Z1"] },
      { part: "Main", text: "2 tours (S1-S2) puis 3 tours (S3-S4), récup 60s : montées sur pointes bipodales 2×15 → 3×15 · pont fessier 2×12 → 3×12 · fente avant contrôlée 2×8/jambe → 3×8 · planche ventrale 2×20s → 3×25s · planche latérale 2×15s/côté → 3×20s. Poids de corps uniquement, exécution lente, jamais à l'échec (2-3 répétitions en réserve).", zones: ["Z2"] },
      { part: "Cool-down", text: "5min étirements mollets, quadriceps, ischios", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "renforcement", "prevention", "mollets", "gainage"],
    notes: "Bloc 1/3 de la progression force 12 semaines. Objectif = apprendre les patterns moteurs, pas générer de la fatigue. Le mollet/tendon d'Achille et le tibia sont les 2 sites de blessure les plus fréquents du coureur débutant : cette séance n'est pas optionnelle.",
  },
  {
    id: "S2R_STR_FOUNDATION_BLOC2",
    cat: "C",
    sport: "renforcement",
    objectif: "Renforcement fondation — Bloc 2 (S5-S8) : unilatéral et tolérance à l'impact",
    necessite: "Obligatoire",
    when: "2×/semaine, les jours sans course ou après la séance de course",
    phase: ["build"],
    avoid: "Douleur tendineuse achilléenne en cours · veille d'une séance longue",
    durationMin: [25, 30],
    metricKey: "cardiaque",
    sportKey: "renforcement",
    structure: [
      { part: "Warm-up", text: "6min mobilité chevilles/hanches + 20 talons-fesses et montées de genoux sur place", zones: ["Z1"] },
      { part: "Main", text: "3 tours, récup 60-75s : montées sur pointes UNIPODALES 3×10/jambe (S5-S6) → 3×12/jambe (S7-S8) · pont fessier une jambe 3×10/jambe · fente avant 3×10/jambe (S7-S8 : + sac à dos 3-5kg) · step-up sur marche 3×8/jambe · planche ventrale 3×30s → 3×40s · planche latérale 3×25s/côté. Descente lente (3s) sur chaque mouvement de mollet.", zones: ["Z2"] },
      { part: "Cool-down", text: "6min étirements + automassage mollets/fascia plantaire", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "renforcement", "prevention", "unilateral", "excentrique"],
    notes: "Bloc 2/3. Passage au travail unilatéral : la course est une succession d'appuis sur une jambe. L'excentrique lent du mollet (3s de descente) est le protocole de référence pour la tolérance du tendon d'Achille (Alfredson).",
  },
  {
    id: "S2R_STR_FOUNDATION_BLOC3",
    cat: "C",
    sport: "renforcement",
    objectif: "Renforcement fondation — Bloc 3 (S9-S12) : élasticité et maintien",
    necessite: "Obligatoire",
    when: "2×/semaine en S9-S11, 1×/semaine allégée en S12 (semaine de validation)",
    phase: ["peak", "taper"],
    avoid: "Toute douleur articulaire · 48h avant le test de validation 30min continu",
    durationMin: [25, 30],
    metricKey: "cardiaque",
    sportKey: "renforcement",
    structure: [
      { part: "Warm-up", text: "6min mobilité + éducatifs de cadence sur place (30s × 3)", zones: ["Z1"] },
      { part: "Main", text: "3 tours, récup 75s : montées sur pointes unipodales 3×15/jambe · pont fessier une jambe 3×12/jambe (pied surélevé) · fente marchée 3×12/jambe · squat 3×15 (S12 : 2×12) · sauts à la corde ou petits rebonds bipodaux 3×20s (élasticité, contact au sol court) · planche ventrale 3×45s · planche latérale 3×30s/côté. S12 : réduire à 2 tours, supprimer les rebonds.", zones: ["Z2"] },
      { part: "Cool-down", text: "6min étirements complets + respiration", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "renforcement", "prevention", "elasticite", "maintien"],
    notes: "Bloc 3/3. Introduction très prudente de la pluométrie basse (rebonds) : améliore la raideur utile du tendon et l'économie de course. Semaine 12 = volume réduit pour arriver frais sur la validation 30min continu.",
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

  // ── EXTENSION — comble deux lacunes réelles identifiées (audit catalogue) :
  // (1) aucune fiche natation/vélo dédiée (le cross-training low-impact
  //     reposait sur une seule fiche "mixed" générique) ; (2) seulement 6
  //     fiches taguées "taper" sur les 16 d'origine, donc peu de choix pour
  //     les dernières semaines du cycle. ──────────────────────────────────

  // -- Natation/vélo dédiés (remplace le "mixed" unique pour varier le choix) --
  {
    id: "S2R_SWIM_INTRO_TECHNIQUE",
    cat: "C",
    sport: "natation",
    objectif: "Découverte natation sans impact — alternative aérobie pendant la construction du tissu conjonctif",
    necessite: "Optionnel",
    when: "Jour de repos de course, si piscine accessible",
    phase: ["base", "build"],
    avoid: "Transformer en séance d'intensité — ça reste de la récupération active",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "100-200m nage libre très facile, alterner avec marche dans l'eau si besoin", zones: ["Z1"] },
      { part: "Main", text: "15-20min de nage continue facile (tous styles acceptés, y compris planche + battements de jambes si le crawl n'est pas maîtrisé). Aucune notion de chrono, respiration confortable uniquement.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "100m très facile + étirements épaules", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "natation", "cross-training", "sans-impact"],
    notes: "Permet de construire de l'aérobie sans aucune charge mécanique sur les jambes — utile en particulier si une gêne tendineuse impose une pause course temporaire.",
  },
  {
    id: "S2R_SWIM_CONTINUOUS_LOW_IMPACT",
    cat: "D",
    sport: "natation",
    objectif: "Natation continue facile — volume aérobie complémentaire, compatible semaine de taper",
    necessite: "Optionnel",
    when: "1×/semaine en complément, y compris en fin de cycle",
    phase: ["build", "peak", "taper"],
    avoid: "Enchaîner immédiatement après une séance de course intense",
    durationMin: [25, 40],
    metricKey: "cardiaque",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "150m nage libre facile", zones: ["Z1"] },
      { part: "Main", text: "20-30min nage continue Z1-Z2, pause courte autorisée toutes les 200-300m si besoin. Travail de régularité de la respiration.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "100m très facile", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "natation", "cross-training", "sans-impact", "taper"],
    notes: "Option basse-fatigue pour garder du volume aérobie pendant les semaines où le volume de course est volontairement réduit.",
  },
  {
    id: "S2R_BIKE_INTRO_SPIN",
    cat: "C",
    sport: "cyclisme",
    objectif: "Découverte vélo sans impact — alternative aérobie, home trainer ou terrain plat",
    necessite: "Optionnel",
    when: "Jour de repos de course, home trainer ou terrain plat sécurisé",
    phase: ["base", "build"],
    avoid: "Circulation dense, dénivelé marqué, vitesse excessive en descente",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "5min pédalage très facile, cadence libre", zones: ["Z1"] },
      { part: "Main", text: "20-25min pédalage continu Z1-Z2 sur terrain plat ou home trainer, cadence confortable (75-90rpm), discussion possible tout du long.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "5min pédalage très facile", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "cyclisme", "cross-training", "sans-impact"],
    notes: "Alternative idéale les jours où les jambes ont besoin de bouger sans ajouter d'impact — notamment utile en période de forte chaleur ou de fatigue articulaire.",
  },
  {
    id: "S2R_BIKE_CONTINUOUS_LOW_IMPACT",
    cat: "D",
    sport: "cyclisme",
    objectif: "Vélo continu facile — volume aérobie complémentaire, compatible semaine de taper",
    necessite: "Optionnel",
    when: "1×/semaine en complément, y compris en fin de cycle",
    phase: ["build", "peak", "taper"],
    avoid: "Terrain technique ou circulation dense en fin de cycle (priorité à la sécurité)",
    durationMin: [30, 45],
    metricKey: "cardiaque",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "5min pédalage facile", zones: ["Z1"] },
      { part: "Main", text: "25-35min pédalage continu Z1-Z2 sur terrain plat ou home trainer, cadence libre et confortable.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "5min pédalage très facile", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "cyclisme", "cross-training", "sans-impact", "taper"],
    notes: "Permet de garder un volume aérobie confortable pendant les semaines de réduction du volume de course, sans risque musculo-squelettique additionnel.",
  },

  // -- Variété de progression (évite de retomber systématiquement sur la même fiche) --
  {
    id: "S2R_WALK_RUN_4_1",
    cat: "A",
    sport: "course",
    objectif: "Marche-course 4'/1' — palier intermédiaire entre 3'/1' et 5'/1'",
    necessite: "Recommandé",
    when: "Semaine 6-7, utilisable si le passage direct à 5'/1' semble trop brusque",
    phase: ["build"],
    avoid: "Si la fiche 3'/1' n'est pas encore confortable sur l'ensemble de la séance",
    durationMin: [34, 40],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "5min marche + 5min alternance 30s trot / 30s marche", zones: ["Z1"] },
      { part: "Main", text: "5× (4min trot facile + 1min marche). Total couru = 20min. Repère de parole maintenu sur toute la fraction, y compris la dernière.", zones: ["Z2"] },
      { part: "Cool-down", text: "5min marche + mobilité hanches/chevilles", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "marche-course", "construction", "palier-intermediaire"],
    notes: "Palier optionnel pour les profils qui ont besoin d'une marche plus progressive entre 3'/1' et 5'/1' — à utiliser au choix, pas en plus.",
  },
  {
    id: "S2R_BREATHING_TECHNIQUE_INTRO",
    cat: "C",
    sport: "course",
    objectif: "Technique respiratoire — contrôle du souffle avant qu'il ne devienne un frein à la progression",
    necessite: "Recommandé",
    when: "1×/semaine, en début de cycle, intégré en warm-up d'une séance de marche-course",
    phase: ["base"],
    avoid: "Hyperventilation volontaire prolongée en cas de vertige",
    durationMin: [15, 20],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "3min marche + respiration abdominale assise 2min", zones: ["Z1"] },
      { part: "Main", text: "4× (2min marche rapide avec respiration rythmée 3 pas inspiration / 2 pas expiration + 1min trot très facile en appliquant le même rythme respiratoire). Objectif : stabiliser la respiration avant d'augmenter l'allure.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "5min marche + respiration diaphragmatique allongé", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "respiration", "technique", "initiation"],
    notes: "Beaucoup de débutants s'arrêtent par essoufflement géré plutôt que par fatigue musculaire réelle — cette séance traite directement cette cause fréquente d'abandon.",
  },
  {
    id: "S2R_HILL_INTRO_GENTLE",
    cat: "A",
    sport: "course",
    objectif: "Introduction très progressive au dénivelé — préparer le profil à un terrain non plat",
    necessite: "Optionnel",
    when: "Semaines 7-9, si le terrain habituel comporte du relief",
    phase: ["build", "peak"],
    avoid: "Pente raide, descente technique, terrain glissant",
    durationMin: [30, 38],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "8min marche active sur plat", zones: ["Z1"] },
      { part: "Main", text: "6× (1min trot très facile en légère montée douce + 2min marche en descente/récupération). Effort perçu identique à une séance sur plat — l'allure ralentit naturellement, c'est normal et souhaité.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "6min marche + étirements mollets", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "denivele", "initiation", "terrain-varie"],
    notes: "Le dénivelé augmente la charge mécanique sur le mollet et le tendon d'Achille — à n'introduire qu'une fois la course continue 15-20min acquise sur plat.",
  },

  // -- Taper / fin de cycle : davantage de choix pour les dernières semaines --
  {
    id: "S2R_CONTINUOUS_20_PARK_VARIANT",
    cat: "A",
    sport: "course",
    objectif: "Course continue 20min en environnement agréable — variante de motivation, même cible physiologique",
    necessite: "Optionnel",
    when: "Semaines 10-12, en alternance avec la version standard",
    phase: ["peak", "taper"],
    avoid: "Terrain inconnu ou technique en fin de cycle",
    durationMin: [34, 40],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "8min marche active en parc ou sentier plat", zones: ["Z1"] },
      { part: "Main", text: "20min de course continue en Z2 conversationnelle, idéalement en parc, sentier plat ou bord de mer/rivière — le changement de décor aide souvent la motivation en fin de cycle sans changer la cible physiologique.", zones: ["Z2"] },
      { part: "Cool-down", text: "6min marche + étirements", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "course-continue", "variete", "motivation"],
    notes: "Même cible que S2R_CONTINUOUS_20_25 — proposée comme alternative pour éviter la monotonie des dernières semaines, pas comme progression supplémentaire.",
  },
  {
    id: "S2R_PARKRUN_SOCIAL_INTRO",
    cat: "Race-Sim",
    sport: "course",
    objectif: "Première sortie encadrée/collective — ancrer la régularité par le cadre social plutôt que la performance",
    necessite: "Optionnel",
    when: "Semaine 11-12, si une course populaire ou un groupe local existe",
    phase: ["peak", "taper"],
    avoid: "Se laisser entraîner par le rythme du groupe — rester sur sa propre sensation Z2",
    durationMin: [30, 50],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "10min marche active + présentation/échauffement collectif si encadré", zones: ["Z1"] },
      { part: "Main", text: "20-30min en groupe ou événement local, format marche-course ou continu selon la sensation du jour — consigne unique : ignorer l'allure des autres participants.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "10min marche + échange avec le groupe", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "social", "adherence", "validation"],
    notes: "L'adhérence à long terme chez le débutant dépend autant du cadre social que du contenu de la séance — cette fiche formalise ce levier plutôt que de le laisser au hasard.",
  },
  {
    id: "S2R_FIRST_5K_CONTINUOUS_RACE",
    cat: "Race-Sim",
    sport: "course",
    objectif: "Premier 5 km en course continue — variante pour les profils ayant dépassé le besoin de marche-course",
    necessite: "Optionnel",
    when: "Fin de cycle (S12), si la course continue 30min est déjà acquise avec facilité",
    phase: ["taper"],
    avoid: "Départ trop rapide — appliquer la même consigne de prudence que la version marche-course",
    durationMin: [25, 40],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "10min marche + 3× 1min trot progressif", zones: ["Z1"] },
      { part: "Main", text: "5 km en course continue, allure volontairement conservatrice sur le 1er kilomètre, légère accélération possible sur le dernier kilomètre si les sensations sont bonnes.", zones: ["Z2"] },
      { part: "Cool-down", text: "8min marche + étirements", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "premier-5k", "validation", "course-continue"],
    notes: "Alternative à S2R_FIRST_5K_WALK_RUN pour les profils qui ont dépassé le besoin de fractions de marche — même objectif de validation, sans objectif chronométrique.",
  },
  {
    id: "S2R_STR_MAINTENANCE_TAPER",
    cat: "C",
    sport: "renforcement",
    objectif: "Renforcement allégé spécial taper — maintien sans fatigue résiduelle",
    necessite: "Recommandé",
    when: "Semaine 12 ou toute semaine de réduction de charge",
    phase: ["taper"],
    avoid: "Charge additionnelle, répétitions à l'échec, nouveaux mouvements non maîtrisés",
    durationMin: [15, 20],
    metricKey: "cardiaque",
    sportKey: "renforcement",
    structure: [
      { part: "Warm-up", text: "4min mobilité chevilles/hanches", zones: ["Z1"] },
      { part: "Main", text: "2 tours, récup 60s : montées sur pointes bipodales 2×12 · pont fessier 2×10 · planche ventrale 2×20s · planche latérale 2×15s/côté. Volume volontairement réduit par rapport aux blocs précédents — l'objectif est d'arriver frais, pas de progresser.", zones: ["Z1"] },
      { part: "Cool-down", text: "4min étirements doux", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "renforcement", "taper", "maintien"],
    notes: "Alternative allégée à S2R_STR_FOUNDATION_BLOC3 pour les semaines où même ce bloc réduit semble encore trop sollicitant avant un objectif clé.",
  },
  {
    id: "S2R_ACTIVE_RECOVERY_WALK_LONG",
    cat: "D",
    sport: "course",
    objectif: "Marche longue de récupération active — volume aérobie sans aucune charge d'impact",
    necessite: "Optionnel",
    when: "N'importe quelle semaine, en complément ou en remplacement d'une séance si fatigue/motivation basse",
    phase: ["base", "build", "peak", "taper"],
    avoid: "La transformer en sortie performance",
    durationMin: [40, 60],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "5min marche tranquille", zones: ["Z1"] },
      { part: "Main", text: "35-50min marche continue à allure confortable, terrain au choix (ville, nature, sentier plat). Discussion possible tout du long.", zones: ["Z1"] },
      { part: "Cool-down", text: "5min marche très lente", zones: ["Z1"] },
    ],
    variants: {},
    goals: ["start_to_run"],
    tags: ["start-to-run", "marche", "recuperation", "sans-impact"],
    notes: "Option universelle utilisable à n'importe quel point du cycle — comble le besoin de bouger les semaines où une séance de course n'est pas souhaitable.",
  },
];

export const EnrichedWorkoutsStartToRun: LibraryWorkout[] = START_TO_RUN;
