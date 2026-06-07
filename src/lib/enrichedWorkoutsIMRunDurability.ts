/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICHED WORKOUTS — IM RUN DURABILITY (Elite Ironman femme/homme)
 *
 * Famille de séances signature pour la durabilité run en fin d'Ironman.
 * Couvre les angles morts détectés par audit coach élite :
 *   1. Long run IM-specific 1h45-2h15 en Z2 haute (volume run long)
 *   2. Brick long marathon-pace (4-5h vélo + 60-90' run au pace IM)
 *   3. Late-race fractions (sortie longue avec 20-30' final @ pace IM)
 *   4. Run en fatigue accumulée (lendemain gros vélo / fin de bloc 3j)
 *   5. Marathon split (2× 60' @ pace IM dans la même journée — durabilité mentale)
 *   6. Negative split long run IM (gestion d'allure sur 1h45-2h)
 *
 * Référentiel : Lorang, Frodeno (training logs), Stryd Durability Index,
 *               Maunder 2021 (run durability post-bike), Coyle 1991 (fat oxidation IM).
 *
 * Cible : Ambition `elite` / `competitor` IM, phases Build + Peak.
 * Prescription : Le prompt IM force la rotation de ≥3 de ces séances en Build/Peak.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";

const IM_RUN_DURABILITY: LibraryWorkout[] = [
  // ── 1. LONG RUN IM-SPECIFIC 1h45-2h15 Z2 ──────────────────────────────────
  {
    id: "A_IM_RUN_LONG_DURABILITY_2H",
    cat: "A",
    sport: "course",
    objectif: "Long run IM-spécifique 1h45-2h15 — durabilité aérobie, oxydation lipidique, résistance musculaire fin de marathon IM",
    necessite: "Obligatoire",
    when: "Build + Peak IM (1×/sem en alternance avec brick long)",
    phase: ["build", "peak"],
    avoid: "Fatigue extrême, blessure tendineuse active, semaine récup",
    durationMin: [105, 135],
    metricKey: "allure",
    sportKey: "run_long_im",
    structure: [
      { part: "Warm-up", text: "15min Z1→Z2 progressif, cadence cible 178-184 spm", zones: ["Z1", "Z2"] },
      { part: "Main", text: "75-105min Z2 stable (75-82% FCmax, pace ~+15-25s/km vs pace IM cible). Cadence verrouillée. Nutrition race 70-90g CHO/h (test IM). FC drift toléré <5% sur les 60 dernières minutes (Stryd Durability). Si drift >8% → réduire à Z1 et noter limite durabilité atteinte.", zones: ["Z2"] },
      { part: "Cool-down", text: "15min Z1 + 5min marche + mobilité hanches/mollets", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2h Z2 + nutrition race + cadence cible. Élite femme : viser 2h-2h15 sur S6-S12 du build, jusqu'à 2h30 en peak (back-to-back samedi vélo / dimanche run).",
      half: "1h30 Z2 + 20min finish @ pace 70.3",
    },
    goals: ["ironman", "half"],
    tags: ["ironman", "durability", "long-run", "elite", "fat-oxidation", "Stryd", "Lorang"],
    notes: "Pierre angulaire de la prépa IM élite. Pour femme élite mondiale : viser 2× ce type de sortie en Build (S6-S12) si pas de brick long la même semaine. Cadence stable = signal #1 de durabilité préservée."
  },

  // ── 2. BRICK LONG MARATHON-PACE (4-5h vélo + 60-90' run IM) ───────────────
  {
    id: "B_IM_BRICK_LONG_MARATHON_PACE",
    cat: "B",
    sport: "brick",
    objectif: "Brick long IM-spécifique — simulation T2 + run au pace marathon IM en fatigue vélo",
    necessite: "Obligatoire",
    when: "Build tardif + Peak IM (toutes les 2-3 sem, jamais en taper)",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée >7j de TSS élevé, signes pré-blessure, chaleur extrême non acclimatée",
    durationMin: [300, 420],
    metricKey: "puissance",
    sportKey: "brick_long_im",
    structure: [
      { part: "Warm-up", text: "20min vélo Z1→Z2 progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "BIKE 3h30-4h30 : 80% Z2 (65-75% FTP, pace IM) + 3×20min Sweet Spot (88-92% FTP) répartis (h1, h2, h3). Nutrition 90-110g CHO/h, hydratation race. T2 rapide <5min (chaussures prêtes, gel prêt). RUN 60-90min : 10min Z2 progressif puis maintenir pace IM cible (Z2 haut, +0-10s/km vs pace IM théorique). Cadence cible. FC drift <8% acceptable.", zones: ["Z2", "Z3", "Z4"] },
      { part: "Cool-down", text: "5-10min marche + glace tendons d'Achille + nutrition récup (1.2g/kg CHO + 0.4g/kg protéine sous 30min)", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Élite femme : 4h30 vélo + 90min run @ pace IM en peak. Variant pluie/froid → indoor trainer 4h + run extérieur 75min. Test nutrition complet (gels, boisson, plaquettes, sel).",
      half: "70.3 : 2h vélo Z3 + 45min run @ pace 70.3 (plus court mais plus intense)"
    },
    goals: ["ironman", "half"],
    tags: ["ironman", "brick", "durability", "race-sim", "elite", "T2", "Lorang", "Frodeno"],
    notes: "Séance clé qui sépare l'élite IM des âge-groupeurs : capacité à courir vite ET longtemps après 4-5h de vélo. Prescrire 4-6 fois entre S8 et S20 d'un plan IM 24 sem. Toujours en weekend, jamais 2 sem de suite (récup nécessaire)."
  },

  // ── 3. LATE-RACE FRACTIONS (long run + 20-30' final @ pace IM) ────────────
  {
    id: "B_IM_RUN_LATE_RACE_FRACTIONS",
    cat: "B",
    sport: "course",
    objectif: "Late-race specifics — capacité à tenir/accélérer au pace IM dans les 30 dernières minutes d'une sortie longue",
    necessite: "Obligatoire",
    when: "Build + Peak IM (1×/2 sem en alternance avec long run pur)",
    phase: ["build", "peak"],
    avoid: "Fatigue jambes >7/10, lendemain VMA",
    durationMin: [90, 130],
    metricKey: "allure",
    sportKey: "run_late_race",
    structure: [
      { part: "Warm-up", text: "15min Z1→Z2 + 4 lignes droites 80m", zones: ["Z1", "Z2"] },
      { part: "Main", text: "60-80min Z2 stable (pace +20s/km vs pace IM) PUIS 20-30min @ pace IM exact (Z2 haut/Z3 bas). Objectif : maintenir cadence et FC contrôlée sur le finish. Visualiser km 35-42 d'un marathon IM. Nutrition 60-80g CHO/h.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10min Z1 + étirements tendons d'Achille + mobilité hanches", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Élite : 90min Z2 + 30min @ pace IM cible. Mental : se dire 'c'est ici que la course se gagne'. Si pace ne tient pas → noter (signe de durabilité limitante).",
      half: "60min Z2 + 20min @ pace 70.3"
    },
    goals: ["ironman", "half"],
    tags: ["ironman", "late-race", "durability", "fast-finish", "elite", "Stryd"],
    notes: "Imite la signature physiologique du marathon IM : faible intensité prolongée puis maintien du pace en fatigue. Variante 'durabilité mentale' = ne PAS regarder la montre sur les 20 dernières min, courir à la sensation."
  },

  // ── 4. RUN EN FATIGUE ACCUMULÉE (lendemain gros vélo) ─────────────────────
  {
    id: "A_IM_RUN_FATIGUED_NEXT_DAY",
    cat: "A",
    sport: "course",
    objectif: "Long run en fatigue résiduelle (lendemain gros vélo ou fin de bloc 3j) — durabilité musculaire IM",
    necessite: "Recommandé",
    when: "Build + Peak IM, dimanche après gros samedi vélo (back-to-back)",
    phase: ["build", "peak"],
    avoid: "Douleur tendineuse, FC repos +10bpm vs baseline (signal sur-fatigue)",
    durationMin: [75, 110],
    metricKey: "allure",
    sportKey: "run_fatigued_next_day",
    structure: [
      { part: "Warm-up", text: "20min Z1 très souple, cadence libre (jambes ouvrent progressivement)", zones: ["Z1"] },
      { part: "Main", text: "45-75min Z2 bas (pace +25-35s/km vs pace IM). Cadence stable >175 spm malgré fatigue. Si FC monte >Z2 → ralentir, ne PAS forcer. Nutrition 60g CHO/h. Objectif : entraîner le système à courir 'long' avec glycogène/muscles pré-fatigués.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "10min marche + protocole récup actif (compression, glace)", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Élite femme : 90min Z2 bas dimanche après 4-5h vélo samedi. Pierre angulaire du back-to-back weekend IM (Lorang, Frodeno, Joe Skipper logs).",
      half: "60min Z2 bas le lendemain d'une SST longue"
    },
    goals: ["ironman", "half"],
    tags: ["ironman", "durability", "back-to-back", "fatigue", "elite", "Lorang"],
    notes: "Format clé du modèle Norvégien (Iden/Blummenfelt) et de l'école française IM (Lorang). Ne PAS chercher de pace, chercher la durée et la qualité de cadence. Idéal weekend 4h vélo samedi + 1h30 run dimanche."
  },

  // ── 5. MARATHON SPLIT (2× 60' @ pace IM dans la journée) ──────────────────
  {
    id: "B_IM_RUN_MARATHON_SPLIT",
    cat: "B",
    sport: "course",
    objectif: "Marathon split — 2 séances run au pace IM séparées de 6-8h (durabilité musculaire + récupération inter-séance)",
    necessite: "Recommandé",
    when: "Peak IM uniquement (1×/3 sem, jamais 2 sem de suite)",
    phase: ["peak"],
    avoid: "Phase Base, taper, fatigue accumulée, blessure",
    durationMin: [120, 150],
    metricKey: "allure",
    sportKey: "run_marathon_split",
    structure: [
      { part: "Warm-up", text: "AM session : 15min Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "AM (matin) : 60min @ pace IM (Z2 haut). Cadence cible. Récup 6-8h : repas complet (CHO 1g/kg + protéine 0.3g/kg), sieste si possible. PM (soir) : 15min échauffement Z1 + 60min @ pace IM. Comparer cadence/FC AM vs PM (delta = signal durabilité). Nutrition course pendant les 2 sessions.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "PM : 10min Z1 + récup nuit prolongée", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Élite peak IM uniquement. Si AM ok mais PM dégradé (FC +10bpm, cadence -5 spm) → durabilité limitante, augmenter long runs Z2 dans le bloc suivant.",
    },
    goals: ["ironman"],
    tags: ["ironman", "double-run", "durability", "peak", "elite", "marathon-pace"],
    notes: "Séance avancée réservée à l'élite. Imite la signature musculaire du marathon IM : courir 'fatigué' à pace cible. Joe Skipper et Lucy Charles utilisent ce format en peak IM."
  },

  // ── 6. NEGATIVE SPLIT LONG RUN IM (gestion d'allure 1h45-2h) ──────────────
  {
    id: "B_IM_RUN_NEG_SPLIT_LR",
    cat: "B",
    sport: "course",
    objectif: "Negative split long run — apprendre la gestion d'allure IM, accélérer en fin de sortie longue",
    necessite: "Recommandé",
    when: "Build + Peak IM (1×/2-3 sem en alternance avec long run pur)",
    phase: ["build", "peak"],
    avoid: "Fatigue jambes, lendemain brick long",
    durationMin: [105, 130],
    metricKey: "allure",
    sportKey: "run_neg_split_im",
    structure: [
      { part: "Warm-up", text: "15min Z1→Z2 très progressif, cadence libre", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3 tiers de 30-35min chacun : T1 = pace IM +30s/km (Z2 bas), T2 = pace IM +15s/km (Z2 milieu), T3 = pace IM exact (Z2 haut/Z3 bas). Cadence stable >178 spm sur les 3 tiers. Mentaliser : 'plus je cours, plus je vais vite'. Nutrition 70g CHO/h.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10min Z1 + étirements", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Élite : 3×35min progressifs jusqu'à pace IM. Pierre angulaire du pacing IM (Lorang : 'never start at pace, finish at pace').",
      half: "3×20min progressifs jusqu'à pace 70.3"
    },
    goals: ["ironman", "half"],
    tags: ["ironman", "negative-split", "pacing", "durability", "elite", "Lorang"],
    notes: "Entraîne la discipline mentale du pacing IM : retenir l'allure en début pour finir fort. Variante avec capteur Stryd : analyser running power et vérifier qu'il reste stable même quand la pace s'accélère."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT CONSOLIDÉ
// ─────────────────────────────────────────────────────────────────────────────
export const EnrichedWorkoutsIMRunDurability: LibraryWorkout[] = [
  ...IM_RUN_DURABILITY,
];

/**
 * IDs prescriptibles par l'IA — utilisés par le prompt IM pour forcer
 * la rotation de ≥3 séances de durabilité run en Build/Peak.
 */
export const IM_RUN_DURABILITY_IDS = IM_RUN_DURABILITY.map(w => w.id);
