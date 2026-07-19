/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICHED WORKOUTS — 70.3 PODIUM DURABILITY
 *
 * Famille de séances signature pour viser un podium / un niveau élite sur
 * Half-Ironman (70.3). Comble les angles morts identifiés par audit coach :
 *   1. Long CAP race-pace 70.3 (45-60min @ pace 70.3 dans une SL 1h30-1h50)
 *   2. Brick race-pace 70.3 (2h-2h30 vélo race-pace + 60-75' run race-pace)
 *   3. Run off-bike fast finish (long run avec 20' final @ pace 70.3 après SST)
 *   4. Negative split long run 70.3 (3 tiers progressifs jusqu'à pace 70.3)
 *   5. Eau libre race-sim (2-3 km, départ rapide + drafting + sighting)
 *   6. Natation départ rapide + drafting (piscine, signature compétitive 70.3)
 *
 * Référentiel : Lorang, Haug/Frodeno (training logs 70.3 podium),
 *               Stryd Durability Index, Maunder 2021 (run durability post-bike).
 *
 * Cible : Ambition `elite` / `competitor` / `podium` 70.3, phases Build + Peak.
 * Prescription : Le prompt 70.3 force la rotation de ≥1-2 de ces séances/sem.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";

const PODIUM_703: LibraryWorkout[] = [
  // ── 1. LONG CAP RACE-PACE 70.3 ────────────────────────────────────────────
  {
    id: "A_703_RUN_RACE_PACE_LONG",
    cat: "A",
    sport: "course",
    objectif: "Long run race-pace 70.3 — 45-60min @ pace 70.3 dans une SL 1h30-1h50 (durabilité spécifique semi off-bike)",
    necessite: "Obligatoire",
    when: "Build + Peak 70.3 (1×/sem en alternance avec brick race-pace)",
    phase: ["build", "peak"],
    avoid: "Fatigue jambes >7/10, lendemain VMA, taper",
    durationMin: [90, 110],
    metricKey: "allure",
    sportKey: "run_long_703",
    structure: [
      { part: "Warm-up", text: "15min Z1→Z2 progressif + 4 lignes droites", zones: ["Z1", "Z2"] },
      { part: "Main", text: "45-60min @ pace 70.3 cible (Z3 bas / seuil-10%, FC ~85-88% FCmax) en 2-3 blocs avec 3' Z2 de transition. Cadence cible stable 178-184 spm. Nutrition race 70-80g CHO/h (test). FC drift toléré <5%. Si pace ne tient pas sur le dernier bloc → noter limite durabilité.", zones: ["Z3"] },
      { part: "Cool-down", text: "10-15min Z1 + mobilité hanches/mollets", zones: ["Z1"] }
    ],
    variants: {
      half: "Élite/podium : viser 60min cumulés @ pace 70.3 en Peak (3×20min ou 2×30min). Pour un athlète féminin en quête de podium : c'est la séance qui prouve que le pace est tenable sur 21km en fatigue.",
    },
    goals: ["half"],
    tags: ["half", "70.3", "podium", "race-pace", "long-run", "durability", "elite", "Lorang"],
    notes: "Pierre angulaire absolument manquante des plans 70.3 standards. Le semi off-bike se gagne par la spécificité du pace, PAS par le volume Z2."
  },

  // ── 2. BRICK RACE-PACE 70.3 ───────────────────────────────────────────────
  {
    id: "B_703_BRICK_RACE_PACE",
    cat: "B",
    sport: "brick",
    objectif: "Brick race-pace 70.3 — 2h-2h30 vélo race-pace + 60-75' run race-pace (signature absolue podium 70.3)",
    necessite: "Obligatoire",
    when: "Build tardif + Peak 70.3 (toutes les 2 sem, jamais en taper)",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée, chaleur extrême non acclimatée",
    durationMin: [180, 240],
    metricKey: "puissance",
    sportKey: "brick_race_pace_703",
    structure: [
      { part: "Warm-up", text: "15min vélo Z1→Z2 progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "BIKE 2h-2h30 : 20min Z2 puis 90-120min @ puissance race 70.3 (80-88% FTP, position aéro stricte). 3×8min en SST (92% FTP) dispersés. Nutrition 80-100g CHO/h. T2 rapide <3min. RUN 60-75min : 10min Z2 progressif puis 45-60min @ pace 70.3 cible (Z3 bas). Cadence ≥180 spm. FC drift <8% acceptable.", zones: ["Z2", "Z3", "Z4"] },
      { part: "Cool-down", text: "5min marche + nutrition récup (1.2g/kg CHO + 0.4g/kg protéine sous 30min)", zones: ["Z1"] }
    ],
    variants: {
      half: "Élite/podium : 2h30 vélo race-pace + 75' run @ pace 70.3 en Peak. Pour profil féminin podium : 4-6 occurrences entre S6 et S14 d'un plan 70.3 16 sem. Test nutrition complet (gels, boisson, sel, plaquettes).",
    },
    goals: ["half"],
    tags: ["half", "70.3", "podium", "brick", "race-sim", "elite", "T2", "Lorang", "Haug"],
    notes: "Sépare l'élite 70.3 de l'âge-groupe : capacité à courir vite après 2h-2h30 en position aéro à race-pace. Toujours en weekend, jamais 2 sem de suite."
  },

  // ── 3. RUN OFF-BIKE FAST FINISH ───────────────────────────────────────────
  {
    id: "B_703_RUN_OFF_BIKE_FAST_FINISH",
    cat: "B",
    sport: "course",
    objectif: "Long run avec finish rapide après séance vélo SST — durabilité fast-finish 70.3",
    necessite: "Recommandé",
    when: "Build + Peak 70.3 (1×/2 sem en alternance avec brick race-pace)",
    phase: ["build", "peak"],
    avoid: "Lendemain VMA, fatigue accumulée",
    durationMin: [75, 100],
    metricKey: "allure",
    sportKey: "run_off_bike_703",
    structure: [
      { part: "Warm-up", text: "Prérequis : vélo SST court (60-75min, 2×15min @92% FTP) le matin OU 30min vélo Z2 immédiatement avant. RUN warm-up : 10min Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "45-60min Z2 stable (pace +15-20s/km vs pace 70.3) PUIS 20min @ pace 70.3 exact (Z3 bas). Cadence cible verrouillée. Visualiser km 15-21 du semi 70.3. Nutrition 60-80g CHO/h.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10min Z1 + étirements tendons d'Achille + mobilité", zones: ["Z1"] }
    ],
    variants: {
      half: "Élite/podium : 60min Z2 + 20-25min @ pace 70.3 après SST 75min. Mental : 'c'est ici que la course se gagne'.",
    },
    goals: ["half"],
    tags: ["half", "70.3", "podium", "fast-finish", "off-bike", "durability", "elite"],
    notes: "Format intermédiaire entre long run pur et brick complet. Imite la signature physiologique du semi 70.3 : maintien du pace en fatigue glycogénique."
  },

  // ── 4. NEGATIVE SPLIT LONG RUN 70.3 ───────────────────────────────────────
  {
    id: "B_703_RUN_NEG_SPLIT",
    cat: "B",
    sport: "course",
    objectif: "Negative split long run 70.3 — gestion d'allure, accélérer jusqu'au pace 70.3 en fin de sortie",
    necessite: "Recommandé",
    when: "Build + Peak 70.3 (1×/2-3 sem en alternance avec long run pur)",
    phase: ["build", "peak"],
    avoid: "Fatigue jambes, lendemain brick race-pace",
    durationMin: [90, 110],
    metricKey: "allure",
    sportKey: "run_neg_split_703",
    structure: [
      { part: "Warm-up", text: "15min Z1→Z2 progressif, cadence libre", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3 tiers de 25-30min : T1 = pace 70.3 +25s/km (Z2 bas), T2 = pace 70.3 +12s/km (Z2 haut), T3 = pace 70.3 exact (Z3 bas). Cadence stable >178 spm sur les 3 tiers. Nutrition 70g CHO/h.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10min Z1 + étirements", zones: ["Z1"] }
    ],
    variants: {
      half: "Élite/podium : 3×30min progressifs jusqu'à pace 70.3. Discipline du pacing 70.3 (Lorang : 'never start at pace, finish at pace').",
    },
    goals: ["half"],
    tags: ["half", "70.3", "podium", "negative-split", "pacing", "durability", "elite", "Lorang"],
    notes: "Entraîne la discipline mentale du pacing 70.3 : retenir l'allure pour finir fort."
  },

  // ── 5. EAU LIBRE RACE-SIM 70.3 ────────────────────────────────────────────
  {
    id: "B_703_SWIM_OWS_RACE_SIM",
    cat: "B",
    sport: "natation",
    objectif: "Eau libre race-sim 70.3 — 2-3 km avec quick start + drafting + sighting + sortie ponton",
    necessite: "Obligatoire",
    when: "Peak 70.3 + Build tardif (1×/2 sem dès que l'eau libre est accessible)",
    phase: ["build", "peak"],
    avoid: "Eau <14°C non acclimatée, mer agitée si peu d'expérience",
    durationMin: [60, 90],
    metricKey: "css",
    sportKey: "swim_ows_703",
    structure: [
      { part: "Warm-up", text: "10min souple + 4×50m progressif jusqu'à CSS. Combinaison enfilée, sighting court (toutes les 6 brasses)", zones: ["Z1", "Z2"] },
      { part: "Main", text: "BLOC 1 : Quick start 200m @ 90-95% effort sprint (simulation départ) puis 800-1000m @ CSS+5% en drafting (pieds d'un partenaire si possible). 3min repos eau. BLOC 2 : 1000-1500m continu @ pace 70.3 (CSS-3 à -5%) avec sighting toutes les 8 brasses + 1 virage simulé toutes les 250m. BLOC 3 : 200m sortie d'eau rapide + transition simulée (combi retirée en courant 50m).", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "200m souple + débriefing pace montre (Garmin OWS) + nutrition post", zones: ["Z1"] }
    ],
    variants: {
      half: "Élite/podium : 3000m total avec 2×1000m race-pace + drafting strict + sighting toutes 6 brasses. Reproduire les conditions du parcours (lac/mer/rivière, eau froide, combi).",
    },
    goals: ["half"],
    tags: ["half", "70.3", "podium", "swim", "open-water", "race-sim", "drafting", "sighting", "elite"],
    notes: "Absolument prescriptible dès que l'eau libre est ouverte. Sans cette séance, le départ 70.3 est joué à 50% (panique, pace mal géré, drafting raté)."
  },

  // ── 6. NATATION DÉPART RAPIDE + DRAFTING (PISCINE) ────────────────────────
  {
    id: "B_703_SWIM_QUICK_START_DRAFT",
    cat: "B",
    sport: "natation",
    objectif: "Piscine race-sim — départ rapide 100-200m + drafting pieds + retour CSS (signature compétitive 70.3)",
    necessite: "Recommandé",
    when: "Build + Peak 70.3 (1×/sem hors-saison eau libre, sinon 1×/2 sem)",
    phase: ["build", "peak"],
    avoid: "Fatigue épaules, semaine taper finale",
    durationMin: [55, 75],
    metricKey: "css",
    sportKey: "swim_race_sim_703",
    structure: [
      { part: "Warm-up", text: "400m progressif (4×100m crawl Z1→Z2) + 4×50m éducatifs + 4×25m progressif vitesse", zones: ["Z1", "Z2"] },
      { part: "Main", text: "SÉRIE 1 départ rapide : 6×100m départ explosif (premier 25m @ sprint 95%, finir @ CSS). R=30s. SÉRIE 2 drafting/relais : 4×200m alterné (50m mène @ CSS-2, 50m draft pieds @ CSS+5, ×2). R=20s. SÉRIE 3 maintien race-pace : 4×300m @ pace 70.3 (CSS-3 à -5). R=30s. SÉRIE 4 sortie : 4×50m sprint départ plongé.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "200m souple éducatifs", zones: ["Z1"] }
    ],
    variants: {
      half: "Élite/podium : 6×100m départ + 4×300m race-pace + drafting strict. Vise un CSS solide ET un départ explosif (les 200 premiers mètres décident du paquet d'arrivée à T1).",
    },
    goals: ["half"],
    tags: ["half", "70.3", "podium", "swim", "quick-start", "drafting", "race-sim", "elite"],
    notes: "Compense l'angle mort piscine pour 70.3 compétitif : la majorité des plans entraînent CSS et endurance mais JAMAIS le départ explosif ni le drafting. Or ce sont les 2 skills qui font gagner 1-2min à T1."
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// BRICK GAP-FILLERS (F-BRICK-GAP) — comble les trous audités du catalogue :
//   - race_pace × peak court (< 3h) pour athlètes competitor sans le budget 4h
//   - seuil × build (brick sweetspot + short threshold run)
//   - seuil × build IM (version longue pour Ironman)
// Ces fiches donnent à l'IA des voisins de substitution B5 pour les brick
// hallucinés (ex : brick race-pace 2h) et couvrent (sport=brick × famille=seuil)
// qui était vide en Build.
// ═══════════════════════════════════════════════════════════════════════════════
const BRICK_GAP_FILLERS: LibraryWorkout[] = [
  {
    id: "B_BRICK_RACE_PACE_SHORT_703",
    cat: "B",
    sport: "brick",
    objectif: "Brick race-pace 70.3 court — 90' vélo race-pace + 30-40' run race-pace (competitor sans budget 4h)",
    necessite: "Recommandé",
    when: "Build + Peak 70.3 (competitor, 1×/2 sem en alternance avec brick long)",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée >7/10, taper race",
    durationMin: [120, 150],
    metricKey: "puissance",
    sportKey: "brick_race_pace_short_703",
    structure: [
      { part: "Warm-up", text: "10min vélo Z1→Z2 progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "BIKE 90min : 15min Z2 puis 60-75min @ puissance race 70.3 (80-88% FTP, aéro). Nutrition 70-80g CHO/h. T2 rapide. RUN 30-40min : 5min Z2 puis 25-35min @ pace 70.3 (Z3 bas). Cadence ≥180 spm.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "5min marche + nutrition récup", zones: ["Z1"] },
    ],
    variants: { half: "Competitor : 90'+30' en Build, 90'+40' en Peak" },
    goals: ["half"],
    tags: ["half", "70.3", "brick", "race-pace", "competitor"],
    notes: "Substitution naturelle pour brick race-pace hallucinés < 3h.",
  },
  {
    id: "B_BRICK_SST_TEMPO_BUILD_703",
    cat: "B",
    sport: "brick",
    objectif: "Brick seuil Build — vélo sweetspot + run tempo court (durabilité seuil off-bike)",
    necessite: "Recommandé",
    when: "Build 70.3 (1×/sem)",
    phase: ["build"],
    avoid: "Semaine VMA très chargée, lendemain seuil run",
    durationMin: [105, 135],
    metricKey: "puissance",
    sportKey: "brick_sst_tempo_build",
    structure: [
      { part: "Warm-up", text: "10min vélo Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "BIKE 75-90min : 3×15-20min sweetspot (88-93% FTP) r=5' Z2. T2 <3'. RUN 20-30min : 5min Z2 puis 15-25min tempo Z3 (~pace semi+5-10s). Cadence 180+.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "5min Z1 + étirements", zones: ["Z1"] },
    ],
    variants: { half: "Build 70.3 : 3×20' SST + 25' tempo", marathon: "Version course longue : 3×15' SST + 25' tempo" },
    goals: ["half", "marathon"],
    tags: ["70.3", "brick", "seuil", "sweetspot", "tempo", "build"],
    notes: "Couvre (brick × seuil × build) — trou audité du catalogue 70.3.",
  },
  {
    id: "B_BRICK_SEUIL_LONG_BUILD_IM",
    cat: "B",
    sport: "brick",
    objectif: "Brick seuil long IM — vélo tempo/SST + run seuil moyen (durabilité IM Build)",
    necessite: "Recommandé",
    when: "Build IM (toutes les 2-3 sem)",
    phase: ["build"],
    avoid: "Fatigue >6/10, lendemain SL, taper",
    durationMin: [180, 240],
    metricKey: "puissance",
    sportKey: "brick_seuil_long_build_im",
    structure: [
      { part: "Warm-up", text: "15min vélo Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "BIKE 150-180min : 30' Z2 puis 3×30' tempo (75-82% FTP) r=10' Z2, aéro. Nutrition 80-90g CHO/h. T2 <3'. RUN 30-40min : 10min Z2 puis 20-30min @ pace IM+5-10s (Z3 bas / seuil bas).", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "5min marche + nutrition récup", zones: ["Z1"] },
    ],
    variants: { ironman: "Build IM : 3×30' tempo + 30' pace IM" },
    goals: ["ironman"],
    tags: ["ironman", "IM", "brick", "seuil", "tempo", "durability", "build"],
    notes: "Couvre (brick × seuil × build) pour IM — sinon les brick seuil IM tombent en pur_hallucination.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT CONSOLIDÉ
// ─────────────────────────────────────────────────────────────────────────────
export const EnrichedWorkouts703PodiumDurability: LibraryWorkout[] = [
  ...PODIUM_703,
  ...BRICK_GAP_FILLERS,
];

/**
 * IDs prescriptibles par l'IA — utilisés par le prompt 70.3 pour forcer
 * la rotation de ≥1-2 séances de durabilité/race-sim par semaine en Build/Peak.
 */
export const PODIUM_703_IDS = PODIUM_703.map(w => w.id);
export const BRICK_GAP_FILLER_IDS = BRICK_GAP_FILLERS.map(w => w.id);
