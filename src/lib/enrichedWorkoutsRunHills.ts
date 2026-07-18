/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICHED WORKOUTS — RUN HILLS (côtes ROUTE, pas trail)
 *
 * Motivation (audit B3) : le modèle cherchait un stimulus « côte » légitime pour
 * les plans route (10K / semi / marathon / 70.3 run / IM run) et n'avait sous la
 * main que des variantes `B_TR_HILL_*` taguées trail → fuites récurrentes
 * (`B_TR_HILL_SPRINTS_10x10`, `B_TR50_HILL_TEMPO_3x8`, etc.) rejetées ensuite
 * par le filtre trail aval.
 *
 * Réponse : offrir un objet légitime — 4 séances de côte ROUTE, taxinomie
 * strictement route (sport=course, préfixe `*_RUN_HILL_*`, aucun tag `trail`,
 * `goals` route uniquement). Le stimulus (force spécifique, VO2 en côte, tempo
 * grimpant) est bien connu de la littérature route (Daniels, Pfitzinger,
 * Magness, Lorang) — rien de spécifique trail.
 *
 * Contraintes de taxonomie (garantissent que le filtre trail NE les mange PAS) :
 *   - `id` ne matche AUCUN pattern de `TRAIL_ID_PATTERNS`
 *     (pas de préfixe TRAIL_, pas de _TR_, pas de HEDGEHOG_, pas de URBAN_, etc.)
 *   - `sport: "course"`
 *   - `tags` : aucun `trail`
 *   - `goals` : road only (10k, semi, marathon, half, ironman)
 *   - `structure[].text` : aucun marqueur `TRAIL_DETAILS_CRITICAL_RX`
 *     (pas de "sentier", "massif", "bâtons", "D+ 1200m"…).
 *     D+ mentionné en clair mais SANS chiffre à 2+ digits accolé à « m D+ ».
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";

const RUN_HILLS: LibraryWorkout[] = [
  // ── 1. HILL SPRINTS COURTS — puissance neuromusculaire / recrutement ────────
  {
    id: "B_RUN_HILL_SPRINTS_10x10",
    cat: "B",
    sport: "course",
    objectif: "Sprints en côte 10×10s — puissance neuromusculaire, recrutement fibres rapides, économie de course",
    necessite: "Recommandé",
    when: "Base + Build (1×/sem, tôt dans le plan puis maintien)",
    phase: ["base", "build"],
    avoid: "Blessure tendineuse active, fatigue neuromusculaire, semaine récup",
    durationMin: [40, 55],
    metricKey: "allure",
    sportKey: "run_hill_sprints",
    structure: [
      { part: "Warm-up", text: "15min footing Z1→Z2 + 4 lignes droites accélérées 60m + 2 montées progressives 15s", zones: ["Z1", "Z2"] },
      { part: "Main", text: "10×10s en côte à pente modérée (5-8%) SUR ROUTE. Effort maximal contrôlé (Z5), départ arrêté, focus fréquence de foulée haute et projection avant. Récupération : retour en marchant/trottinant vers le point de départ (2-3min, complète). Cadence cible 190+ spm sur l'accélération. Terrain route/asphalte uniquement — PAS de sentier.", zones: ["Z5"] },
      { part: "Cool-down", text: "10-15min footing Z1 sur plat + étirements dynamiques mollets/quadriceps", zones: ["Z1"] }
    ],
    variants: {
      "10k": "10×10s pente 6-8% + 1× ligne droite 60m sprint en fin de série",
      semi: "8×12s pente 5-7%",
      marathon: "8×10s pente 4-6% (dose plus modérée)",
      half: "8×10s pente 5-7%",
      ironman: "6×10s pente 5-7% (maintien plus que développement)",
    },
    goals: ["10k", "semi", "marathon", "half", "ironman"],
    tags: ["run", "hill", "route", "sprint", "neuromuscular", "economy", "Daniels", "Magness"],
    notes: "Stimulus route classique (Daniels R-pace en côte, Magness hill sprints). Aucune spécificité trail : côte routière courte, effort neuromusculaire pur. Sécurise la fréquence de foulée et l'économie sans traumatisme du sprint sur plat."
  },

  // ── 2. HILL REPS VO2max — 6-8× 60-90s en côte ──────────────────────────────
  {
    id: "C_RUN_HILL_REPS_VO2_8x60",
    cat: "C",
    sport: "course",
    objectif: "Répétitions VO2max en côte 8×60-90s — développement aérobie, puissance grimpante, résistance à l'acidose",
    necessite: "Recommandé",
    when: "Build + Peak (1×/sem, alterner avec fractionné plat)",
    phase: ["build", "peak"],
    avoid: "Séance clé <48h, blessure Achille/mollet, chaleur extrême",
    durationMin: [45, 65],
    metricKey: "allure",
    sportKey: "run_hill_vo2",
    structure: [
      { part: "Warm-up", text: "15min Z1→Z2 + 4×20s progressif + 3min Z2 haut", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8×60-90s en côte pente 4-6% SUR ROUTE, effort Z5 (allure ~95-100% VMA équivalent plat). Redescente en trottinant Z1 (récupération 1:1 à 1:1.5). Focus posture haute, bras actifs, cadence 185-192 spm. Terrain route/piste, PAS de sentier ni de single technique.", zones: ["Z5"] },
      { part: "Cool-down", text: "10-15min Z1 sur plat", zones: ["Z1"] }
    ],
    variants: {
      "10k": "8×90s pente 5-6%",
      semi: "6×90s pente 4-6%",
      marathon: "6×60s pente 4-5%",
      half: "6×75s pente 5-6%",
      ironman: "5×60s pente 4-5% (dose maintenance)"
    },
    goals: ["10k", "semi", "marathon", "half", "ironman"],
    tags: ["run", "hill", "route", "vo2max", "vo2", "power", "Daniels", "Pfitzinger"],
    notes: "Substitut légitime au fractionné VO2 plat (Daniels I-pace). La côte impose une intensité neuromusculaire supérieure à FC équivalente et protège les tendons (moins d'impact excentrique). Objet ROUTE — ne matche aucun pattern trail."
  },

  // ── 3. HILL TEMPO — 3×8min grimpant au seuil ───────────────────────────────
  {
    id: "B_RUN_HILL_TEMPO_3x8",
    cat: "B",
    sport: "course",
    objectif: "Tempo grimpant 3×8min au seuil — endurance au seuil en côte, force spécifique en montée soutenue",
    necessite: "Recommandé",
    when: "Build (1×/sem, alterner avec seuil plat)",
    phase: ["build", "peak"],
    avoid: "Fatigue tendineuse, semaine récup, taper",
    durationMin: [55, 75],
    metricKey: "allure",
    sportKey: "run_hill_tempo",
    structure: [
      { part: "Warm-up", text: "15min Z1→Z2 + 3min Z3", zones: ["Z1", "Z2", "Z3"] },
      { part: "Main", text: "3×8min en côte pente régulière 3-5% SUR ROUTE, effort Z4 (allure seuil ~88-92% VMA équivalent plat, RPE 7-8/10). Redescente 3min Z1 en trottinant. Cadence cible 180-186 spm, foulée courte et fréquente, buste légèrement projeté. Route/asphalte — PAS de sentier technique, PAS de bâtons.", zones: ["Z4"] },
      { part: "Cool-down", text: "10min Z1 sur plat", zones: ["Z1"] }
    ],
    variants: {
      "10k": "3×6min pente 4-5%",
      semi: "3×8min pente 3-5%",
      marathon: "2×12min pente 3-4%",
      half: "3×8min pente 4-5%",
      ironman: "2×10min pente 3-4% (dose 70.3/IM run)"
    },
    goals: ["10k", "semi", "marathon", "half", "ironman"],
    tags: ["run", "hill", "route", "threshold", "tempo", "seuil", "Pfitzinger", "Lorang"],
    notes: "Séance tempo-en-côte classique route (Pfitzinger LT hill workouts). Substitut légitime au seuil plat quand le profil de course inclut du dénivelé modéré (semi/marathon urbains vallonnés, 70.3 avec faux-plats). Aucune spécificité trail."
  },

  // ── 4. HILL STRIDES — accélérations en côte, entretien économie ────────────
  {
    id: "A_RUN_HILL_STRIDES_END",
    cat: "A",
    sport: "course",
    objectif: "Strides en côte en fin de sortie facile — entretien économie, activation neuromusculaire douce",
    necessite: "Optionnel",
    when: "Base + Build + Peak (1-2×/sem en fin de footing facile)",
    phase: ["base", "build", "peak"],
    avoid: "Fatigue extrême, veille de séance clé si dose >6 strides",
    durationMin: [35, 55],
    metricKey: "allure",
    sportKey: "run_hill_strides",
    structure: [
      { part: "Warm-up", text: "Footing Z1→Z2 25-40min sur plat", zones: ["Z1", "Z2"] },
      { part: "Main", text: "6×15s strides en légère côte (pente 3-5%) SUR ROUTE, effort Z4-Z5 progressif (pas maximal), focus posture et cadence haute. Récupération marche/trot 60-90s complète. Terrain route/asphalte.", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "5-10min Z1 sur plat + mobilité chevilles", zones: ["Z1"] }
    ],
    variants: {
      "10k": "8×15s pente 4-5%",
      semi: "6×15s pente 3-5%",
      marathon: "6×12s pente 3-4%",
      half: "6×15s pente 3-5%",
      ironman: "6×12s pente 3-4%"
    },
    goals: ["10k", "semi", "marathon", "half", "ironman"],
    tags: ["run", "hill", "route", "strides", "economy", "neuromuscular", "easy"],
    notes: "Entretien neuromusculaire léger, à greffer sur une sortie facile. Alternative propre aux strides plat quand le parcours inclut naturellement une petite bosse. Objet ROUTE — préfixe A_RUN_HILL_, aucun tag trail."
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT CONSOLIDÉ
// ─────────────────────────────────────────────────────────────────────────────
export const EnrichedWorkoutsRunHills: LibraryWorkout[] = [...RUN_HILLS];

/** IDs prescriptibles par l'IA — utiles pour audit / tests de fuite trail. */
export const RUN_HILLS_IDS = RUN_HILLS.map((w) => w.id);
