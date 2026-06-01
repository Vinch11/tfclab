/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICHED WORKOUTS STRENGTH V2 — Bibliothèque renforcement musculaire enrichie
 *
 * 4 familles (Pro complet : Warm-up + Main détaillé séries×reps/tempo/RPE-%RM/repos
 *                          + Cool-down + Progression hebdo + Références)
 *   1) Force générale (lower / upper / core / total-body)
 *   2) Trail-spécifique (excentrique, descente, mollets lourds, montagne)
 *   3) Route/CAP-spécifique (puissance, plyo, foulée, force-vitesse)
 *   4) Préhab & mobilité (hanches, cheville, tronc, postural)
 *
 * Références principales :
 *   – Petersen J. et al. (2011) — Nordic hamstring, -51% lésions ischios.
 *   – Rønnestad B.R. & Mujika I. (2014) — Strength training & endurance.
 *   – Rønnestad B.R. et al. (2010-2017) — Heavy strength cyclistes élite.
 *   – Blagrove R. et al. (2018, Sports Med) — Strength & running economy.
 *   – Vikmoen O. et al. (2016) — Heavy strength endurance cyclistes.
 *   – Beattie K. et al. (2017) — Maximal strength & endurance perf.
 *   – Berryman N. et al. (2018) — Concurrent training meta-analysis.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";

const GOALS_ALL: ("ironman" | "half" | "marathon" | "semi" | "trail_short" | "trail_long")[] =
  ["ironman", "half", "marathon", "semi", "trail_short", "trail_long"];

const mk = (parts: [string, string, string[]][]) =>
  parts.map(([part, text, zones]) => ({ part, text, zones }));

export const EnrichedWorkoutsStrengthV2: LibraryWorkout[] = [
  // ─────────────────────────────────────────────────────────────
  // FAMILLE 1 — FORCE GÉNÉRALE
  // ─────────────────────────────────────────────────────────────
  {
    id: "C_STR_MAX_LOWER_HEAVY",
    cat: "C",
    sport: "strength",
    objectif: "Force maximale bas du corps — 4×4 lourd (Rønnestad)",
    necessite: "Recommandé",
    when: "Base & début Build (8-12 sem avant course A)",
    phase: ["base", "build"],
    avoid: "Tapering · Fatigue >7/10 · Débutant <8 sem expérience barre",
    durationMin: [50, 65],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "12' : 5' vélo Z1 + activation (glute bridge 2×12, bird-dog 2×8/côté) + 2 séries montantes squat à 50% & 70% 1RM × 5 reps", ["Z1"]],
      ["Main", "A) Back squat : 4×4 @ 85-90% 1RM (RPE 8.5-9) · tempo 2-1-1-0 · repos 3-4' complets.\nB) Trap-bar deadlift : 3×4 @ 85% 1RM · tempo 2-0-1-0 · repos 3'.\nC) Hip thrust barre : 3×6 @ RPE 8 · tempo 2-1-2-0 · repos 2'.\nD) Mollets debout chargés : 3×8 tempo 2-2-1-0 · repos 75s.\n→ Protocole Rønnestad 2010 (heavy strength + endurance) : gains économie +4-5%.", []],
      ["Cool-down", "8' : marche/vélo Z1 3' + mobilité hanches/quadris 5'", ["Z1"]],
      ["Progression", "Sem 1-2 : 4×4 @ 85%. Sem 3-4 : 4×4 @ 87-90%. Sem 5 : décharge -40% volume. Cycle 4+1. Maintien 1×/sem en peak.", []],
      ["Références", "Rønnestad & Mujika (2014, Scand J Med Sci Sports) · Vikmoen et al. (2016) · Beattie et al. (2017).", []]
    ]),
    variants: { ironman: "Ajouter 2×8 single-leg press", marathon: "Garder 4×4 lourds — pas de réduction" },
    goals: GOALS_ALL,
    tags: ["strength", "lower", "max-force", "heavy", "ronnestad"]
  },
  {
    id: "C_STR_POWER_LIFT_COMPLEX",
    cat: "C",
    sport: "strength",
    objectif: "Force-puissance complexe (PAP) — transfert neuromusculaire",
    necessite: "Recommandé",
    when: "Build & début Peak (≥4 sem avant A)",
    phase: ["build", "peak"],
    avoid: "Fatigue · J-7 course A · Pas avant longue le lendemain",
    durationMin: [45, 60],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "12' : 5' vélo Z1 + mobilité dynamique + 2×5 squat à 60% 1RM", ["Z1"]],
      ["Main", "Contraste lourd → explosif (PAP — Post-Activation Potentiation) :\nA1) Back squat : 4×3 @ 85% 1RM · repos 15s puis →\nA2) Squat jumps max H : 4×5 · repos 3' entre complexes.\nB1) Romanian deadlift : 3×5 @ 80% · repos 15s →\nB2) Broad jumps : 3×4 · repos 2'30.\nC) Step-up explosif charge modérée : 3×6/jambe rapide · repos 90s.", []],
      ["Cool-down", "8' : jog Z1 3' + stretch hanches/ischios 5'", ["Z1"]],
      ["Progression", "Sem 1 : 3 complexes (apprentissage). Sem 2-3 : 4 complexes. Décharge sem 4. STOP J-10 course A.", []],
      ["Références", "Berryman et al. (2018) · Blagrove et al. (2018) — transfert force-puissance vers économie.", []]
    ]),
    variants: {},
    goals: ["marathon", "semi", "trail_short", "half"],
    tags: ["strength", "power", "pap", "complex"]
  },
  {
    id: "C_STR_CORE_INTEGRATED",
    cat: "C",
    sport: "strength",
    objectif: "Core intégré — anti-flexion/extension/rotation/latéro-flexion",
    necessite: "Recommandé",
    when: "Toute l'année (2×/sem)",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "5' : dead bug lent 2×8/côté + cat-cow 1' + glute bridge 2×10", []],
      ["Main", "Circuit 4 tours (repos 60s entre tours), 1 exo par pattern :\n• Anti-extension : Hollow body hold 30-45s.\n• Anti-rotation : Pallof press élastique 12/côté lent.\n• Anti-flexion latérale : Suitcase carry 30m/côté (charge 50% PdC une main).\n• Anti-flexion : Front plank avec drag haltère sous corps 8/côté.\n• Hip-driven : Single-leg glute bridge tempo 2-2-2 : 10/jambe.", []],
      ["Cool-down", "5' : child pose 1' + respiration diaphragmatique 4' (4-6s in / 6-8s out)", []],
      ["Progression", "Sem 1-2 : 3 tours. Sem 3-4 : 4 tours + charges +10%. Pas de décharge nécessaire.", []],
      ["Références", "McGill (2016) Low Back Disorders — 4 patterns anti-mouvement.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "core", "integrated", "anti-movement"]
  },
  {
    id: "C_STR_TOTAL_BODY_45",
    cat: "C",
    sport: "strength",
    objectif: "Total body 45' — efficience athlète à temps limité",
    necessite: "Recommandé",
    when: "Athlète <8h/sem ou semaine chargée (1×/sem suffit)",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [40, 50],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "8' : 4' vélo/rameur Z1 + activation full body (squat PdC 12, push-up 8, scap pull 10, glute bridge 10)", ["Z1"]],
      ["Main", "Block A — Force (3 tours, repos 2'30) :\n• Trap-bar deadlift 5 @ RPE 8 · DB bench 6 @ RPE 7.\nBlock B — Unilatéral (3 tours, repos 90s) :\n• Bulgarian split squat 6/jambe @ haltères · Row 1 bras 8/côté.\nBlock C — Préhab finisher (2 tours, repos 45s) :\n• Pallof press 12/côté · Calf raise 12 · Face pull 15.", []],
      ["Cool-down", "7' : mobilité hanches/épaules 4' + respiration nasale 3'", []],
      ["Progression", "Charges +2.5% Sem 2-3 sur lifts compound. Décharge sem 4 (-30% volume).", []],
      ["Références", "Berryman et al. (2018) — concurrent training efficience temporelle.", []]
    ]),
    variants: { ironman: "Block A: 4 tours · réduire Block C à 1 tour" },
    goals: GOALS_ALL,
    tags: ["strength", "total-body", "time-efficient"]
  },

  // ─────────────────────────────────────────────────────────────
  // FAMILLE 2 — TRAIL-SPÉCIFIQUE
  // ─────────────────────────────────────────────────────────────
  {
    id: "C_STR_ECC_DOWNHILL_PROTOCOL",
    cat: "C",
    sport: "strength",
    objectif: "Protocole excentrique descente — protection quadris (8 sem)",
    necessite: "Recommandé",
    when: "Base & début Build (8 sem avant trail long avec D-)",
    phase: ["base", "build"],
    avoid: "Tapering (STOP J-14) · Courbatures résiduelles · 72h avant longue descente",
    durationMin: [40, 55],
    metricKey: "cardiaque",
    sportKey: "trail",
    structure: mk([
      ["Warm-up", "10' : vélo Z1 5' + activation (squat PdC 2×10, fentes 2×8/côté, mobilité cheville 1'/côté)", ["Z1"]],
      ["Main", "A) Step-down excentrique boîte 40cm : 4×8/jambe — descente 5s contrôlée, remontée aide bras · repos 90s.\nB) Back squat excentrique : 4×5 @ 70-75% 1RM — descente 5s, remontée 1s · repos 3'.\nC) Reverse Nordic curl (quadris) : 3×6 amplitude tolérée · repos 90s.\nD) Wall sit dynamique avec rebond léger : 3×40s · repos 60s.\nE) Marche en descente lestée (gilet 8-12kg) 5' tapis -10% — terminal du protocole.", []],
      ["Cool-down", "10' : foam rolling quadris 4' + stretch quad debout 30s/côté ×3 + marche 3'", []],
      ["Progression", "Sem 1 : volume 50% (test courbatures J+2-J+3). Sem 2 : 70%. Sem 3-5 : volume plein. Sem 6 décharge. Sem 7-8 réintroduction. STOP 14j avant course A.", []],
      ["Références", "Eston et al. (1996) sur RBE (repeated bout effect) — protection excentrique persiste 6-8 sem.", []]
    ]),
    variants: { trail_short: "Réduire phase E à 3' tapis" },
    goals: ["trail_short", "trail_long", "ironman"],
    tags: ["strength", "trail", "eccentric", "downhill", "rbe"]
  },
  {
    id: "C_STR_CALF_ISO_HEAVY",
    cat: "C",
    sport: "strength",
    objectif: "Mollets isométrique lourd — raideur tendon (trail rocheux)",
    necessite: "Recommandé",
    when: "Base & Build",
    phase: ["base", "build"],
    avoid: "Tendinopathie Achille aiguë (<3 sem)",
    durationMin: [30, 40],
    metricKey: "cardiaque",
    sportKey: "trail",
    structure: mk([
      ["Warm-up", "6' : marche dynamique + mobilité cheville (squat profond 30s ×2, dorsiflexion mur 12/côté)", []],
      ["Main", "A) Calf raise debout chargé barre/Smith : 4×6 @ RPE 8.5 — tempo 3-2-1-1 · repos 2'30.\nB) Isométrique calf raise mi-amplitude (Smith) : 4×30s @ charge lourde · repos 2' (protocole isométrique tendineux).\nC) Soléaire assis chargé : 4×10 tempo 2-1-2-0 · repos 90s.\nD) Heel drop excentrique escalier (descente 4s) : 3×15/jambe.\nE) Hop unilatéral sur place : 3×20 (rigidité réactive).", []],
      ["Cool-down", "6' : stretch gastro & soléaire 30s/côté ×3 + mobilité cheville 2'", []],
      ["Progression", "Charge +2.5kg/sem si tempo respecté. Iso : viser 5min cumulées >85% charge max. Décharge sem 5.", []],
      ["Références", "Rio E. et al. (2015) — isométriques antalgiques tendinopathies.", []]
    ]),
    variants: {},
    goals: ["trail_short", "trail_long", "marathon", "semi"],
    tags: ["strength", "calf", "achilles", "trail", "isometric"]
  },
  {
    id: "C_STR_TRAIL_HIKING_POWER",
    cat: "C",
    sport: "strength",
    objectif: "Puissance hike — montées raides avec bâtons (trail long)",
    necessite: "Recommandé",
    when: "Build (≥6 sem avant trail long >25km D+)",
    phase: ["build", "peak"],
    avoid: "Tapering J-10",
    durationMin: [45, 60],
    metricKey: "cardiaque",
    sportKey: "trail",
    structure: mk([
      ["Warm-up", "10' : vélo Z1 5' + activation chaîne postérieure (glute bridge 12, bird-dog 8/côté, mobilité hanches)", ["Z1"]],
      ["Main", "A) Step-up haut (banc 50cm) lesté gilet 10-15kg : 4×8/jambe · repos 90s — simule hike raide.\nB) Bulgarian split squat lesté : 3×8/jambe @ RPE 8 · repos 2'.\nC) Reverse lunge avec haltères : 3×8/jambe · repos 90s.\nD) Marche en montée lestée tapis +15% : 3×3' à 4-5km/h gilet 12kg · repos 2' marche plate.\nE) Renfo psoas (mountain climber lent contrôlé) : 3×10/côté.", []],
      ["Cool-down", "8' : marche 3' + foam roll quadris/fessiers 5'", []],
      ["Progression", "Sem 1 : gilet 8kg. Sem 2-3 : 12kg. Sem 4 : 15kg + pente +18%. Décharge sem 5.", []],
      ["Références", "Giovanelli et al. (2017) — hiking economy & uphill running.", []]
    ]),
    variants: {},
    goals: ["trail_long", "trail_short"],
    tags: ["strength", "trail", "hiking", "uphill", "loaded"]
  },
  {
    id: "C_STR_TRAIL_LATERAL_STABILITY",
    cat: "C",
    sport: "strength",
    objectif: "Stabilité latérale — terrains techniques, prévention cheville",
    necessite: "Recommandé",
    when: "Toute l'année (1-2×/sem)",
    phase: ["base", "build", "peak"],
    avoid: "Entorse aiguë <3 sem",
    durationMin: [30, 40],
    metricKey: "cardiaque",
    sportKey: "trail",
    structure: mk([
      ["Warm-up", "8' : mobilité hanches/chevilles + bondissements légers latéraux 2×15s/côté", []],
      ["Main", "A) Lateral lunge haltères : 3×8/côté tempo 3-0-1-0 · repos 90s.\nB) Cossack squat : 3×6/côté · repos 90s (mobilité+force hanches latérales).\nC) Single-leg deadlift haltère (équilibre) : 3×8/jambe · repos 90s.\nD) Lateral bounds réactifs : 4×8/côté · repos 60s — contact bref.\nE) Renfo péroniers élastique (éversion) : 3×15/côté.\nF) Équilibre yeux fermés mono-jambe surface molle : 4×30s/jambe.", []],
      ["Cool-down", "6' : stretch adducteurs (grenouille) + mobilité cheville", []],
      ["Progression", "Sem 1-2 : charge légère, surface dure. Sem 3-4 : charge +20%, surface molle, yeux fermés.", []],
      ["Références", "Hrysomallis (2007, Sports Med) — équilibre & prévention entorses.", []]
    ]),
    variants: {},
    goals: ["trail_short", "trail_long"],
    tags: ["strength", "trail", "lateral", "stability", "ankle"]
  },

  // ─────────────────────────────────────────────────────────────
  // FAMILLE 3 — ROUTE/CAP-SPÉCIFIQUE
  // ─────────────────────────────────────────────────────────────
  {
    id: "C_STR_RE_ECONOMY_BLAGROVE",
    cat: "C",
    sport: "strength",
    objectif: "Économie de course — protocole Blagrove (force+plyo combiné)",
    necessite: "Recommandé",
    when: "Base & Build (≥10 sem avant marathon/semi)",
    phase: ["base", "build"],
    avoid: "Tapering · Fatigue >7/10",
    durationMin: [50, 65],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: mk([
      ["Warm-up", "12' : 5' jog Z1 + éducatifs foulée (skip A/B, talons-fesses) + activation plyo basse (pogo 2×15)", ["Z1"]],
      ["Main", "Bloc Force (3-4 séries) :\nA) Half-squat barre : 4×5 @ 80% 1RM · tempo 2-0-1-0 · repos 3'.\nB) Romanian deadlift : 3×6 @ RPE 7-8 · repos 2'.\nC) Single-leg press : 3×6/jambe · repos 2'.\nBloc Plyo (immédiatement après, repos 90s entre exos) :\nD) Squat jumps : 3×6 H max.\nE) Bounds alternés (foulée bondissante) : 3×20m.\nF) Pogo jumps stiffness : 3×15 contact <200ms.\n→ Gains économie attendus : -2 à -5% VO2 à allure marathon (Blagrove 2018, méta-analyse).", []],
      ["Cool-down", "10' : jog Z1 5' + foam rolling complet 5'", ["Z1"]],
      ["Progression", "Sem 1-2 : 3 séries force. Sem 3-5 : 4 séries. Décharge sem 6. Maintien 1×/sem peak.", []],
      ["Références", "Blagrove R. et al. (2018, Sports Med) · Beattie et al. (2017) · Denadai et al. (2017).", []]
    ]),
    variants: { marathon: "Garder bloc plyo complet", "10k": "Augmenter plyo : 4 séries chaque" },
    goals: ["marathon", "semi", "ironman", "half"],
    tags: ["strength", "running-economy", "plyo", "blagrove", "cap"]
  },
  {
    id: "C_STR_REACTIVE_STIFFNESS",
    cat: "C",
    sport: "strength",
    objectif: "Raideur réactive Achille — stiffness foulée (route)",
    necessite: "Recommandé",
    when: "Build & début Peak",
    phase: ["build", "peak"],
    avoid: "Tendinopathie · J-10 course A · Débutant total plyo",
    durationMin: [30, 40],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: mk([
      ["Warm-up", "12' : 5' jog Z1 + 3' éducatifs + activation plyo basse (pogo 2×15, skip A 2×20m)", ["Z1"]],
      ["Main", "A) Pogo jumps 2 pieds rigidité max : 4×20 contacts · repos 90s — contact <180ms.\nB) Single-leg pogo : 3×12/jambe · repos 90s.\nC) Hops linéaires unilatéraux : 3×10/jambe sur 15m · repos 90s.\nD) Drop jumps 30cm (réactivité) : 4×5 contact bref · repos 2'.\nE) Skipping A explosif : 4×20m focus rebond.", []],
      ["Cool-down", "8' : jog easy Z1 3' + stretch mollets 5'", ["Z1"]],
      ["Progression", "Sem 1 : volume 60% (apprentissage). Sem 2-3 : plein. Sem 4 décharge. STOP J-10 course A. Total contacts <100.", []],
      ["Références", "Markovic & Mikulic (2010) — plyometric training adaptations.", []]
    ]),
    variants: {},
    goals: ["marathon", "semi", "trail_short"],
    tags: ["strength", "stiffness", "plyo", "achilles", "cap"]
  },
  {
    id: "C_STR_RUN_FORM_STRIDES",
    cat: "C",
    sport: "strength",
    objectif: "Travail de foulée — strides+drills séance dédiée",
    necessite: "Recommandé",
    when: "Toute l'année (1-2×/sem en fin de easy)",
    phase: ["base", "build", "peak"],
    avoid: "—",
    durationMin: [25, 35],
    metricKey: "allure",
    sportKey: "course",
    structure: mk([
      ["Warm-up", "10' jog Z1 + mobilité hanches dynamique", ["Z1"]],
      ["Main", "Bloc 1 — Drills (3 tours sur 30m, retour marche) :\n• Skipping A — pose pied avant.\n• Skipping B — extension hanche complète.\n• Foulée bondissante.\n• Talons-fesses rapides.\nBloc 2 — Strides : 6-8 × 80-100m à 90-95% allure max · récup 90s marche complète.\nFocus : cadence haute (≥180), bras décontractés, pose pied médio-avant pied.", []],
      ["Cool-down", "5' jog Z1 + étirements doux ischios/quadris", ["Z1"]],
      ["Progression", "Sem 1 : 6 strides. Sem 3 : 8 strides. Idéal après séance Z2 facile, jamais après séance fractionnée dure.", []],
      ["Références", "Paavolainen et al. (1999) — explosive strength training & 5K economy.", []]
    ]),
    variants: {},
    goals: ["marathon", "semi", "ironman", "half", "trail_short"],
    tags: ["strength", "drills", "strides", "technique", "cap"]
  },
  {
    id: "C_STR_HILL_SPRINTS_SHORT",
    cat: "C",
    sport: "strength",
    objectif: "Sprints courts en côte — force-vitesse neuromusculaire",
    necessite: "Recommandé",
    when: "Base & début Build",
    phase: ["base", "build"],
    avoid: "Pré-compétition · Sprint ban actif (objectif endurance pur)",
    durationMin: [35, 50],
    metricKey: "allure",
    sportKey: "course",
    structure: mk([
      ["Warm-up", "15' : 10' jog Z1-Z2 + 4×strides 80m + mobilité hanches dynamique", ["Z1", "Z2"]],
      ["Main", "10-12 × sprint 8-12s en côte 6-10% pente · effort 95-100% · récupération descente marche 2-3' (complète, FC <120).\nFocus : départ debout, foulée puissante, bras dynamiques, pas crouch start.\nVariation : Sem 2-3 ajouter 4 sprints 6s ultra-courts pour priming SNC.", []],
      ["Cool-down", "10' jog easy Z1 + mobilité", ["Z1"]],
      ["Progression", "Sem 1 : 6 sprints (test). Sem 2-3 : 10-12. Sem 4 : 8 sprints (deload). STOP 4 sem avant course A endurance.", []],
      ["Références", "Ross et al. (2001) — neuromuscular adaptations sprint training.", []]
    ]),
    variants: {},
    goals: ["semi", "marathon", "10k"],
    tags: ["strength", "sprint", "hill", "force-velocity", "cap"]
  },

  // ─────────────────────────────────────────────────────────────
  // FAMILLE 4 — PRÉHAB & MOBILITÉ
  // ─────────────────────────────────────────────────────────────
  {
    id: "C_STR_NORDIC_HAMSTRING_PETERSEN",
    cat: "C",
    sport: "strength",
    objectif: "Nordic Hamstring — protocole Petersen (-51% lésions ischios)",
    necessite: "Recommandé",
    when: "Toute l'année (1-2×/sem) — protocole 10 semaines minimum",
    phase: ["base", "build", "peak"],
    avoid: "Lésion ischio <4 sem · Tapering course A (J-7)",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "8' : glute bridge 2×12 + leg swing avant/arrière 12/côté + hip CARs + activation ischios (good morning PdC 2×10)", []],
      ["Main", "A) Nordic curl excentrique (partenaire / strap / machine) — Protocole Petersen 2011 :\n  • Sem 1 : 1×5 (1 séance/sem).\n  • Sem 2 : 2×6 (2 séances/sem).\n  • Sem 3 : 3×6-8 (3 séances/sem).\n  • Sem 4-10 : 3×8-10 (3 séances/sem en pré-saison, 1×/sem maintien).\n  → Descente contrôlée 3-5s, retour aide bras · repos 2'30.\nB) Romanian deadlift haltères : 3×8 @ RPE 7 · tempo 3-0-1-0 · repos 90s.\nC) Single-leg RDL : 3×8/jambe · repos 90s.\nD) Glute-ham raise machine (si dispo) : 2×8.", []],
      ["Cool-down", "8' : foam roll ischios 3' + stretch debout 30s/côté ×3", []],
      ["Progression", "Courbatures normales sem 1-2 (RBE prend 2-3 sem). Cycle 4+1. Maintien minimum 1×/sem ad vitam.", []],
      ["Références", "Petersen J. et al. (2011, Am J Sports Med) N=942, -51% lésions ischios · van Dyk et al. (2019) confirmation -51%.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "hamstring", "nordic", "prehab", "petersen", "injury-prevention"]
  },
  {
    id: "C_STR_HIP_MOBILITY_DYNAMIC",
    cat: "C",
    sport: "strength",
    objectif: "Mobilité hanches dynamique + activation chaîne postérieure",
    necessite: "Recommandé",
    when: "Toute l'année (2-3×/sem) — avant qualité ou jour easy",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [20, 30],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "3' : cat-cow + hip CARs lents 5/côté + bird-dog 2×8/côté", []],
      ["Main", "Bloc Mobilité (2 tours) :\n• 90/90 hip switches : 10/côté.\n• Couch stretch (psoas) : 60s/côté.\n• Pigeon pose active : 60s/côté.\n• Asian squat tenu : 90s.\n• World's greatest stretch : 5/côté.\nBloc Activation glutes (2 tours, repos 30s) :\n• Glute bridge mono-jambe : 12/côté tempo 2-2-2.\n• Clamshell élastique : 15/côté.\n• Hip thrust haltère : 12 @ RPE 6.\n• Monster walks élastique : 10 pas × 4 directions.\n• Bird-dog tempo 3s pause : 8/côté.", []],
      ["Cool-down", "3' respiration diaphragmatique nasale (4-6 in / 6-8 out)", []],
      ["Progression", "Volume stable. Idéal en récup, avant qualité ou jour easy. Pas de décharge nécessaire.", []],
      ["Références", "Beardsley & Contreras (2014) — glute activation EMG comparisons.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "mobility", "hip", "prehab", "glute-activation"]
  },
  {
    id: "C_STR_ANKLE_FOOT_COMPLEX",
    cat: "C",
    sport: "strength",
    objectif: "Complexe cheville-pied — proprio, intrinsèques, prévention entorse",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Entorse aiguë <3 sem",
    durationMin: [20, 30],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "3' : mobilité cheville (dorsiflexion contre mur 12/côté, cercles cheville, marche pointes/talons)", []],
      ["Main", "A) Équilibre mono-jambe yeux ouverts/fermés : 30-45s × 2/côté (progression sem 3 : coussin proprio).\nB) Calf raise mono-jambe excentrique escalier : 3×12/jambe (descente 3s).\nC) Sauts unipodaux contrôlés (avant/arrière/latéral/diagonal) : 3×6/direction/jambe · repos 60s.\nD) Renfo tibial antérieur (toe raises chargés ou poulie) : 3×15.\nE) Renfo péroniers (élastique éversion) : 3×15/côté.\nF) Short foot exercise (activation intrinsèques) : 3×10s × 5 répétitions/pied.\nG) Pickup billes/serviette avec orteils : 2×30s/pied.", []],
      ["Cool-down", "3' : mobilité cheville + auto-massage voûte plantaire balle 1'/côté", []],
      ["Progression", "Surface dure → coussin proprio sem 3. Yeux fermés sem 4. Ajouter 1 perturbation externe (push partenaire) sem 6.", []],
      ["Références", "McKeon et al. (2015) — foot core paradigm · Hrysomallis (2007) — équilibre & blessures.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "ankle", "foot", "proprio", "prehab", "intrinsics"]
  },
  {
    id: "C_STR_THORACIC_POSTURAL_RESET",
    cat: "C",
    sport: "strength",
    objectif: "Reset postural thoracique & épaule — vélo/natation/bureau",
    necessite: "Recommandé",
    when: "Toute l'année (2-3×/sem) — après vélo long ou avant natation",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [20, 30],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "3' : cat-cow + shoulder CARs 5/côté + thoracic rotations 8/côté", []],
      ["Main", "Bloc Mobilité (1 tour lent) :\n• Thoracic extension foam roll : 2×60s.\n• Open book : 10/côté tempo lent 3s pause.\n• Wall slides (Y-T-W) : 2×10.\n• Doorway pec stretch : 45s/côté ×2.\n• Quadruped thoracic rotation : 8/côté.\nBloc Renfo postural (3 tours, repos 45s) :\n• Band pull-apart : 3×15.\n• Face pull (élastique/poulie) : 3×15 lent.\n• Prone Y-T-W au sol : 2×10 chaque lettre.\n• Scapular retraction prone : 2×12 tempo 2-2-2.\n• Wall angels : 2×10.", []],
      ["Cool-down", "3' respiration nasale lente diaphragmatique", []],
      ["Progression", "Stable. Idéal après vélo >2h, avant natation, ou 1× soir bureau. Ajouter charge légère élastique sem 3.", []],
      ["Références", "Janda (1987) — Upper Crossed Syndrome correction.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "mobility", "thoracic", "shoulder", "postural", "prehab"]
  }
];
