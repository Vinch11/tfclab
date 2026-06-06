/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICHED WORKOUTS HEDGEHOG — Mode "Hérisson" 🦔
 *
 * Séances utilisant des côtes courtes répétées (parking, talus, ruelle, escaliers).
 * Pensées pour les athlètes trail SANS accès à la montagne, mais bénéfiques
 * aussi en plan route pour le travail de force-vitesse spécifique.
 *
 * Hypothèse type : côte 200–500 m, pente 6–12 %, descente comme récup active.
 * Si la côte est plus courte (talus 50–100 m), on enchaîne plusieurs montées
 * dans une même répétition.
 *
 * Tags : "hedgehog", "urban", "hill-repeats" — l'IA peut prescrire ces séances
 * directement quand l'athlète déclare ne pas avoir accès à la montagne, ou en
 * complément hebdo pour densifier le D+ (cf. trail-weekly-dplus-targets).
 *
 * Réfs : Saunders 2006 (hill running & RE), Barnes 2013 (uphill VO2 cost),
 *        Vernillo 2017 (uphill vs flat running biomechanics).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";

const HEDGEHOG: LibraryWorkout[] = [
  // ───────────────────────────────────────────────────────────
  // 1. 🦔 HÉRISSON VMA COURTE — talus / parking en pente
  // ───────────────────────────────────────────────────────────
  {
    id: "B_RUN_HEDGEHOG_VMA_SHORT",
    cat: "B",
    sport: "course",
    objectif: "🦔 Hérisson VMA courte — puissance ascensionnelle, VO2max, sans accès montagne",
    necessite: "Recommandé",
    when: "Build/Peak, 1×/sem en remplacement d'une VMA classique pour les profils trail urbain",
    phase: ["build", "peak"],
    avoid: "Tendon d'Achille sensible, blessure mollet récente, terrain glissant",
    durationMin: [45, 60],
    metricKey: "allure",
    sportKey: "run_hedgehog_vma_short",
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 sur plat + 4 lignes droites 80 m + 2 montées progressives 20 s en accélération", zones: ["Z1", "Z2"] },
      { part: "Main", text: "🦔 Hérisson court : 10–12 × 30–45 s côte 8–12 % à 95–105 % VMA (effort respiration forcée, jambes brûlent en fin). Récup = redescente trot facile (≈ 60–90 s). Si la côte fait moins de 100 m, enchaîner 2 montées par rep en se replaçant en bas vite. Bloc 1 (×6) – pause 3 min Z1 – Bloc 2 (×4–6). Cible : 8–12 min cumulés au-dessus de 95 % VMA. Réf : Saunders 2006 — hill repeats améliorent RE +3 % en 6 sem.", zones: ["Z5"] },
      { part: "Cool-down", text: "10 min Z1 sur plat décroissant + étirements mollets/Achille debout 2×30 s", zones: ["Z1"] }
    ],
    variants: {
      "10k": "10 × 30 s côte 8–10 % à VMA, récup descente — bénéfice transfert puissance plat",
      semi: "8 × 45 s côte 6–8 %, récup descente — endurance de force",
      trail_short: "12 × 45 s côte 10–12 %, récup descente trot — version trail dense",
      trail_mountain: "10 × 60 s côte 10 %+, récup descente — préparation à défaut de montagne accessible"
    },
    goals: ["10k", "semi", "trail_short", "trail_mountain", "marathon"],
    tags: ["hedgehog", "hill-repeats", "vma", "urban", "trail", "anti-monotony", "Saunders"],
    notes: "Idéal si l'athlète a une seule côte de 50–200 m près de chez lui. Format compatible avec un échauffement/retour à la maison à pied. Très efficace en hiver (sol stable contrairement à la montagne)."
  },

  // ───────────────────────────────────────────────────────────
  // 2. 🦔 HÉRISSON VMA LONGUE — côtes urbaines 200–400 m
  // ───────────────────────────────────────────────────────────
  {
    id: "B_RUN_HEDGEHOG_VMA_LONG",
    cat: "B",
    sport: "course",
    objectif: "🦔 Hérisson VMA longue — VO2max soutenu + lactique sur côte urbaine",
    necessite: "Recommandé",
    when: "Build/Peak, alternance avec hérisson court ou VMA piste",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée, séance seuil la veille",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "run_hedgehog_vma_long",
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 4 accélérations 80 m + 1 montée d'activation 45 s en progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "🦔 Hérisson long : 6–8 × 60–90 s côte 6–10 % à 90–95 % VMA (allure soutenable, fin de rep difficile mais contrôlée). Récup = redescente trot 90–120 s + 30 s marche en haut si besoin. Objectif : 8–10 min cumulés en zone VO2max sans casser la technique. Réf : Barnes 2013 — coût VO2 majoré +20 % en montée vs plat à allure égale.", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "10 min Z1 plat + mobilité hanches/chevilles", zones: ["Z1"] }
    ],
    variants: {
      trail_short: "8 × 90 s côte 8–10 %, récup descente — version trail urbain dense",
      trail_mountain: "6 × 2 min côte 8 %, récup descente trot — substitut VMA ascensionnelle montagne",
      semi: "6 × 60 s côte 6 % à VMA, récup descente — travail puissance pour finish 21 km"
    },
    goals: ["semi", "trail_short", "trail_mountain", "10k"],
    tags: ["hedgehog", "hill-repeats", "vma", "vo2max", "urban", "trail"],
    notes: "Demande une côte urbaine d'au moins 200 m (typiquement une rue en pente, un pont, un escalier latéral). Si pas de récup possible en descente longue, faire la rep dans un sens et la récup en montée douce dans l'autre."
  },

  // ───────────────────────────────────────────────────────────
  // 3. 🦔 HÉRISSON SEUIL CÔTE — côtes urbaines 400 m+
  // ───────────────────────────────────────────────────────────
  {
    id: "B_RUN_HEDGEHOG_SEUIL",
    cat: "B",
    sport: "course",
    objectif: "🦔 Hérisson seuil côte — endurance de force au seuil, sans montagne",
    necessite: "Recommandé",
    when: "Build, 1×/sem alternance avec seuil plat",
    phase: ["build", "peak"],
    avoid: "Charge hebdo élevée, mollets enraidis",
    durationMin: [60, 75],
    metricKey: "cardiaque",
    sportKey: "run_hedgehog_seuil",
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 3 lignes droites 100 m + 1 montée 60 s progressive", zones: ["Z1", "Z2"] },
      { part: "Main", text: "🦔 Hérisson seuil : 4–6 × 3–5 min côte 4–8 % à Z3–Z4 (allure seuil ≈ FC 85–90 % FCmax, allure 'comfortably hard'). Récup = redescente active 2–3 min Z1–Z2 (jamais marche). Variante longue (peak) : 3 × 6 min côte 4–6 %. Objectif : 15–20 min cumulés au seuil avec sollicitation chaîne postérieure + spécificité ascensionnelle. Réf : Vernillo 2017 — uphill running ↑ recrutement fessiers/mollets vs plat.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10 min Z1 plat + étirements ischios/mollets longs", zones: ["Z1"] }
    ],
    variants: {
      trail_short: "5 × 4 min côte 6–8 %, récup descente — spé montée trail court",
      trail_mountain: "4 × 6 min côte 6 % + 1 × 8 min finale — substitut session montée longue",
      trail_ultra: "3 × 10 min côte 4–6 % (Z3 bas), récup descente trot — endurance ascensionnelle longue",
      marathon: "4 × 5 min côte 4 % à allure seuil — travail spécifique marathon vallonné"
    },
    goals: ["semi", "marathon", "trail_short", "trail_mountain", "trail_ultra"],
    tags: ["hedgehog", "hill-repeats", "seuil", "threshold", "urban", "trail", "Vernillo"],
    notes: "Nécessite une côte continue d'au moins 400–500 m (typiquement les côtes type 500 m / 50 m D+ que l'on trouve en périphérie urbaine). Si la côte est plus courte, enchaîner plusieurs côtes proches en continu pour atteindre la durée cible."
  },

  // ───────────────────────────────────────────────────────────
  // 4. 🦔 HÉRISSON ESCALIERS / DÉNIVELÉ PUR — 100% urbain
  // ───────────────────────────────────────────────────────────
  {
    id: "C_RUN_HEDGEHOG_STAIRS",
    cat: "C",
    sport: "course",
    objectif: "🦔 Hérisson escaliers — puissance excentrique + chaîne postérieure, 100 % urbain",
    necessite: "Optionnel",
    when: "Base/Build, 1×/2 sem pour profils trail sans aucun accès dénivelé long",
    phase: ["base", "build"],
    avoid: "Douleur genou (rotule), tendon Achille en charge, lendemain SL",
    durationMin: [40, 55],
    metricKey: "cardiaque",
    sportKey: "run_hedgehog_stairs",
    structure: [
      { part: "Warm-up", text: "12 min Z1 trot + 5 min mobilité chevilles/hanches + 4 montées de 10 marches en progressif", zones: ["Z1"] },
      { part: "Main", text: "🦔 Hérisson escaliers : 8–10 × 60–90 s en montée d'escaliers ou talus très raide (>15 %), une marche à la fois (jamais en sautant) pour préserver l'Achille. Récup = redescente MARCHE lente et contrôlée (jamais en courant — risque traumatique élevé). Si escaliers courts : enchaîner plusieurs volées dans la même rep. Cible : 8–15 min cumulés en montée. Bonus : ajouter 5 × 30 s en marche-rapide montée poussée chaîne postérieure en fin de séance. Réf : Vernillo 2017 — uphill steep ↑↑ activation glutéaux/soléaire.", zones: ["Z4", "Z5", "Force"] },
      { part: "Cool-down", text: "10 min trot plat Z1 + étirements mollets/soléaire 2×45 s + auto-massage fascia plantaire", zones: ["Z1"] }
    ],
    variants: {
      trail_short: "10 × 90 s escaliers + 5 × 30 s marche-rapide poussée — densité maximale",
      trail_mountain: "8 × 90 s escaliers + 3 × 2 min marche-rapide lestée (sac 5 kg) — simulation portage",
      trail_ultra: "Format long : 30 min en allers-retours continus marche-rapide montée / trot descente (Z2–Z3)"
    },
    goals: ["trail_short", "trail_mountain", "trail_ultra"],
    tags: ["hedgehog", "stairs", "urban", "trail", "strength-endurance", "eccentric", "Vernillo"],
    notes: "Séance la plus 'urbaine' du catalogue — exploitable en plein centre-ville (escaliers de métro, parking en pente, gradins de stade). Très efficace pour les athlètes vivant en zone 100 % plate qui visent un trail montagneux."
  }
];

// =============================================
// EXPORT
// =============================================
export const EnrichedWorkoutsHedgehog: LibraryWorkout[] = HEDGEHOG;
