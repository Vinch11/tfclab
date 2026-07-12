/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICHED WORKOUTS — LONG COURSE WEEKEND (LCW) — Format 3 JOURS ÉCLATÉ
 *
 * LCW Wales (Tenby) / LCW Belgium : course à ÉTAPES sur 3 jours consécutifs :
 *   Vendredi = Long Swim ~3.8 km
 *   Samedi   = Long Bike ~112 km
 *   Dimanche = Marathon (ou Half selon édition)
 *
 * ⚠️ N'EST PAS un 70.3 continu. Le paradigme change : succession d'efforts
 *    intenses séparés par nuits de récupération INCOMPLÈTE.
 *
 * Séances signature (comble les angles morts du catalogue 70.3/IM standard) :
 *   1. B_LCW_SWIM_FRI_EVENING       — Natation continue rythmée vendredi soir
 *   2. B_LCW_BIKE_LONG_RACE_SAT     — Long ride race-pace samedi (2h30-3h)
 *   3. B_LCW_RUN_OFF_LEGS_SUN       — Long run race-pace dimanche sur jambes veille
 *   4. B_LCW_BACK_TO_BACK_PEAK      — Répétition générale weekend (Ven+Sam+Dim)
 *   5. B_LCW_NUTRITION_RECHARGE     — Simulation protocole recharge inter-étapes
 *
 * Prescription : forcée quand raceFormat === "lcw_3day" via promptHelpers.ts.
 * Références : organisation LCW Wales, retours coachs élites AG.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";

const LCW_WORKOUTS: LibraryWorkout[] = [
  {
    id: "B_LCW_SWIM_FRI_EVENING",
    cat: "B",
    sport: "natation",
    objectif: "Natation continue rythmée style vendredi LCW — 2.5-3.8 km en 2 blocs allure race, préparation étape 1 (départ soir, fatigue journée)",
    necessite: "Recommandé",
    when: "Build + Peak LCW (1×/sem, jeudi ou vendredi soir pour reproduire timing course)",
    phase: ["build", "peak"],
    avoid: "Séance qualité vélo/run le lendemain matin (samedi = long bike LCW)",
    durationMin: [45, 70],
    metricKey: "css",
    sportKey: "swim_long_race",
    structure: [
      { part: "Warm-up", text: "400m Z1-Z2 + 4×50m technique + 4×25m accélérations", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2 blocs continus : 1200-1800m allure race LCW (CSS+3-5 sec/100m) + 200m Z2 récup + 1000-1500m allure race. Respiration bilatérale, sighting toutes les 8-10 brasses. Simuler nutrition post-natation (30g CHO + 20g protéine dans les 30min).", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "300m Z1 + étirements dorsaux/épaules", zones: ["Z1"] }
    ],
    variants: {
      ironman: "LCW Wales/Belgium : cibler 3.8 km continu en 2 blocs en Peak. Tester exactement la nutrition et l'horaire (fin de journée) pour éviter surprise. La difficulté n'est pas la distance mais l'enchaînement avec Long Bike samedi matin.",
    },
    goals: ["ironman", "half"],
    tags: ["lcw", "long-course-weekend", "swim", "race-sim", "stage-race", "endurance"],
    notes: "Signature LCW Étape 1 : la fatigue de fin de journée + digestion + températures fraîches d'eau libre = angle mort des plans 70.3 continus."
  },

  {
    id: "B_LCW_BIKE_LONG_RACE_SAT",
    cat: "B",
    sport: "cyclisme",
    objectif: "Long ride race-pace samedi LCW — 2h30-3h à intensité race étape 2 (85-88% FTP autorisé, PAS de contrainte T2), préparation étape 2 (SANS brique)",
    necessite: "Obligatoire",
    when: "Build + Peak LCW (1×/sem, samedi après-midi pour reproduire timing course)",
    phase: ["build", "peak"],
    avoid: "VMA course la veille, semaine de vraie course",
    durationMin: [150, 200],
    metricKey: "puissance",
    sportKey: "bike_long_race_lcw",
    structure: [
      { part: "Warm-up", text: "20min Z1→Z2 progressif + 3×2min @ 90% FTP r=2min", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2h-2h30 continu à IF cible 0.82-0.85 (85-88% FTP autorisé car PAS de course immédiate après). Position aéro tenue ≥80% du temps. Nutrition race exacte 80-100g CHO/h + 500-750 mL/h. Sortie parcours vallonné si possible pour reproduire profil LCW Wales. FC drift toléré <5% sur la 2e heure.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10min Z1 + spin-out cadence 100+ rpm", zones: ["Z1"] }
    ],
    variants: {
      ironman: "LCW Peak : monter à 3h à IF 0.85 (85-88% FTP). L'avantage LCW vs 70.3/IM continu : puissance race plus haute autorisée (pas de coût T2). Enchaîner IMMÉDIATEMENT le protocole de recharge glycogénique (B_LCW_NUTRITION_RECHARGE) car le vrai test est dimanche matin.",
    },
    goals: ["ironman", "half"],
    tags: ["lcw", "long-course-weekend", "bike", "long-ride", "race-pace", "stage-race", "no-brick"],
    notes: "Différence clé vs B_703_BRICK_RACE_PACE : PAS d'enchaînement run derrière. La puissance vélo peut être plus haute car la course viendra 12-18h plus tard, pas 3 minutes plus tard."
  },

  {
    id: "B_LCW_RUN_OFF_LEGS_SUN",
    cat: "B",
    sport: "course",
    objectif: "Long run race-pace dimanche LCW — 60-90min (ou 21km/marathon en Peak) sur jambes fatiguées vélo veille, préparation étape 3",
    necessite: "Obligatoire",
    when: "Build + Peak LCW (1×/sem, dimanche matin obligatoirement APRÈS long bike samedi)",
    phase: ["build", "peak"],
    avoid: "Ne JAMAIS prescrire cette séance sans B_LCW_BIKE_LONG_RACE_SAT la veille (perd toute spécificité)",
    durationMin: [60, 120],
    metricKey: "allure",
    sportKey: "run_long_race_lcw",
    structure: [
      { part: "Warm-up", text: "15min Z1→Z2 très progressif (jambes lourdes normales) + 4 lignes droites relance", zones: ["Z1", "Z2"] },
      { part: "Main", text: "45-90min à allure race cible LCW (semi ou marathon selon édition). Cadence stable 178-184 spm. Nutrition race testée 60-80g CHO/h. La sensation JAMBES LOURDES au démarrage est le vrai objectif : apprendre à trouver l'allure race sur jambes fatiguées veille. FC drift <7% toléré. Si allure ne tient pas → noter limite durabilité 3 jours.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10-15min Z1 + mobilité mollets/quadriceps", zones: ["Z1"] }
    ],
    variants: {
      ironman: "LCW Peak : 21.1 km à allure semi-marathon race sur jambes vélo veille. Séance de VÉRITÉ absolue LCW — c'est là que se joue le succès (ou l'implosion). Si les jambes ne tiennent pas → réduire l'ambition course d'un cran ou augmenter la recharge glycogénique.",
    },
    goals: ["ironman", "half"],
    tags: ["lcw", "long-course-weekend", "run", "off-legs", "race-pace", "stage-race", "durability"],
    notes: "Angle mort ABSOLU des plans 70.3 continus. Un brick T2 (3 min post-vélo) N'entraîne PAS la même adaptation qu'un run 12-18h post-vélo (fatigue centrale résiduelle + déplétion glycogène partielle + nuit courte)."
  },

  {
    id: "B_LCW_BACK_TO_BACK_PEAK",
    cat: "A",
    sport: "mixed",
    objectif: "Répétition générale weekend LCW — enchaîner Ven soir natation + Sam long bike + Dim long run sur 3 jours consécutifs (SIMULATION COURSE COMPLÈTE)",
    necessite: "Obligatoire",
    when: "Peak LCW uniquement (1×, positionné 3-4 sem avant la course)",
    phase: ["peak"],
    avoid: "Jamais 2× dans le plan, jamais en Build, jamais dans les 2 dernières sem avant course",
    durationMin: [360, 480],
    metricKey: "puissance",
    sportKey: "lcw_full_sim",
    structure: [
      { part: "Warm-up", text: "Vendredi 18h-20h : B_LCW_SWIM_FRI_EVENING intégral (3-3.8 km continu)", zones: ["Z2", "Z3"] },
      { part: "Main", text: "Samedi 9h-13h : B_LCW_BIKE_LONG_RACE_SAT intégral (2h30-3h @ IF 0.82-0.85). Nutrition post-vélo : protocole recharge (voir B_LCW_NUTRITION_RECHARGE). Dimanche 8h : B_LCW_RUN_OFF_LEGS_SUN (60-90min ou semi/marathon selon édition). Reproduire EXACTEMENT le timing course (horaires, nutrition, sommeil).", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "Dimanche après-midi : mobilité complète + bilan écrit (sensations J1/J2/J3, nutrition, sommeil, points d'échec)", zones: ["Z1"] }
    ],
    variants: {
      ironman: "LCW Wales/Belgium Peak : semaine test 3-4 sem avant course. Volume total ~7-8h sur 3 jours. Si l'athlète craque dimanche → ajuster ambition course OU renforcer recharge glycogénique inter-étapes. Cette séance décide de la stratégie course finale.",
    },
    goals: ["ironman", "half"],
    tags: ["lcw", "long-course-weekend", "race-sim", "back-to-back", "stage-race", "peak", "signature"],
    notes: "Séance PIVOT du Peak LCW. Sans cette répétition, l'athlète découvre le paradigme 3 jours le jour J = risque majeur d'implosion étape 3."
  },

  {
    id: "B_LCW_NUTRITION_RECHARGE",
    cat: "C",
    sport: "mixed",
    objectif: "Protocole recharge glycogénique inter-étapes LCW — recharge agressive vendredi soir + samedi soir pour restaurer glycogène musculaire avant étape suivante",
    necessite: "Obligatoire",
    when: "Build + Peak LCW (associé à chaque back-to-back weekend, prescrire ≥3 simulations)",
    phase: ["build", "peak"],
    avoid: "Ne pas appliquer les jours de repos ou séances courtes < 90min",
    durationMin: [0, 0],
    metricKey: "puissance",
    sportKey: "nutrition_recharge_lcw",
    structure: [
      { part: "Post-Étape 1 (Ven soir post-natation)", text: "Fenêtre 30min : 1.2 g/kg CHO + 0.4 g/kg protéine (ex: repas riz + poulet + fruit). Puis dîner classique + 1 collation glucidique avant coucher (banane + pain complet). Cible 8-10 g/kg CHO sur 12-16h vers samedi matin.", zones: [] },
      { part: "Post-Étape 2 (Sam post-vélo)", text: "Fenêtre 30min CRITIQUE : 1.2 g/kg CHO + 0.4 g/kg protéine (boisson récup + fruits + gel). Dîner riche glucides complexes (pâtes/riz 200-300g cuits) + protéine maigre + légumes cuits (pas crus, digestibilité). Collation avant coucher : porridge + miel. Hydratation +500 mL/h de sommeil visée.", zones: [] },
      { part: "Pré-Étape 3 (Dim matin pré-run)", text: "Petit-déjeuner 3h avant : 2-2.5 g/kg CHO facilement digestibles (avoine + banane + miel + toast). 30min avant départ : 30g CHO liquide (gel + eau). Café si habitude.", zones: [] }
    ],
    variants: {
      ironman: "LCW Wales/Belgium Peak : la nutrition inter-étapes est la vraie discipline #4. Un athlète bien entraîné mais sous-rechargé implose dimanche. Tester ce protocole ≥3× en Peak sur les back-to-back weekends pour identifier tolérance digestive.",
    },
    goals: ["ironman", "half"],
    tags: ["lcw", "long-course-weekend", "nutrition", "glycogen", "recharge", "stage-race", "durability"],
    notes: "Séance NON-PHYSIQUE mais prescriptible. Le glycogène est le facteur limitant #1 du LCW (course à étapes). Sources : Burke 2018, Costa 2019, retours coachs LCW."
  },
];

export const EnrichedWorkoutsLCW = LCW_WORKOUTS;
