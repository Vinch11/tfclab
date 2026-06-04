/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICHED WORKOUTS STRENGTH V2 — Bibliothèque renforcement musculaire enrichie
 *
 * v3 (enrichissement coaching débutant/intermédiaire — aligné recovery v2) :
 *   - Chaque exercice décrit : position de départ, exécution pas-à-pas, respiration,
 *     sensation cible, erreurs fréquentes, régression débutant, progression.
 *   - Chaque séance suit le canevas : Warm-up / Main / Cool-down / Coaching.
 *   - Langue uniformément FR, vocabulaire accessible, anglicismes glosés.
 *   - Catalogue élargi : 5 familles, ~30 séances (vs 14 en v2).
 *
 * 5 familles :
 *   1) Force générale (max, puissance, core, débutant, total-body, KB, home)
 *   2) Trail-spécifique (excentrique, mollets, hike, latéral, core sac, pied)
 *   3) Route/CAP-spécifique (économie, stiffness, drills, sprints, plyo, cadence)
 *   4) Préhab & mobilité (Nordic, hanches, cheville, thorax, genou, dos, glutes, tibial)
 *   5) Cycliste-spécifique (pédalage, cou/dos cycliste)
 *
 * Références principales :
 *   – Petersen J. et al. (2011) — Nordic hamstring, -51% lésions ischios.
 *   – Rønnestad B.R. & Mujika I. (2014) — Strength training & endurance.
 *   – Rønnestad B.R. et al. (2010-2017) — Heavy strength cyclistes élite.
 *   – Blagrove R. et al. (2018, Sports Med) — Strength & running economy.
 *   – Vikmoen O. et al. (2016) — Heavy strength endurance cyclistes.
 *   – Beattie K. et al. (2017) — Maximal strength & endurance perf.
 *   – Berryman N. et al. (2018) — Concurrent training meta-analysis.
 *   – McGill S. (2016) — Low Back Disorders / Big 3.
 *   – Rio E. et al. (2015) — Isométriques tendinopathies.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout } from "@/types/workoutLibrary";

const GOALS_ALL: ("ironman" | "half" | "marathon" | "semi" | "trail_short" | "trail_long")[] =
  ["ironman", "half", "marathon", "semi", "trail_short", "trail_long"];

const mk = (parts: [string, string, string[]][]) =>
  parts.map(([part, text, zones]) => ({ part, text, zones }));

export const EnrichedWorkoutsStrengthV2: LibraryWorkout[] = [
  // ═════════════════════════════════════════════════════════════════════
  // FAMILLE 1 — FORCE GÉNÉRALE
  // ═════════════════════════════════════════════════════════════════════
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
      ["Warm-up", "12' progressif :\n• 5' vélo home-trainer Z1 (RPE 2-3, tu chantonnes).\n• Activation glute bridge : allongé dos, talons proches fesses, pieds largeur bassin. Pousse dans les talons pour soulever le bassin, serre fort les fessiers en haut 1s, redescends lent. 2×12. Respire : expire en montant.\n• Bird-dog : à 4 pattes, tends bras droit + jambe gauche dans le prolongement du dos, tiens 2s, retour lent. 2×8/côté. Sensation : abdos profonds gainés.\n• 2 séries montantes squat barre : 5 reps @ 50% 1RM puis 5 reps @ 70% 1RM (mise en route articulaire et neuro).", ["Z1"]],
      ["Main", "**A) Back squat lourd — 4×4 @ 85-90% 1RM (RPE 8.5-9)**\n• Position : barre sur trapèzes (high-bar) ou un peu plus bas (low-bar), pieds largeur épaules, pointes 15° ouvertes.\n• Exécution : inspire profond ventre+côtes (Valsalva), gaine, descends en 2s en gardant le buste droit jusqu'à cuisses parallèles au sol, reste 1s en bas, pousse fort dans les talons pour remonter en 1s. Expire en haut.\n• Sensation : quadris + fessiers chargés, dos neutre verrouillé.\n• Erreurs fréquentes : genoux qui rentrent (valgus) · talons qui décollent · arrondissement bas du dos en fin de descente.\n• Régression débutant : goblet squat haltère 12kg × 8 reps tempo 3-1-1-0 (apprentissage 4-6 sem avant barre).\n• Repos 3-4' complets entre séries (récup ATP-PCr).\n\n**B) Trap-bar deadlift (hex-bar) — 3×4 @ 85% 1RM**\n• Position : dans la cage trap-bar, pieds largeur bassin, poignées dans les mains, bras tendus, dos plat, regard à 2m devant.\n• Exécution : inspire ventre, pousse le sol avec les jambes (pas tirer avec le dos), barre qui longe les jambes, extension complète hanches en haut. Expire en haut, redescends contrôlé 2s.\n• Sensation : chaîne postérieure entière (ischios+fessiers+dos).\n• Erreur fréquente : tirer dos arrondi → blessure lombaire.\n• Régression : Romanian deadlift haltères 8 reps @ RPE 6 (apprentissage charnière de hanche).\n• Repos 3'.\n\n**C) Hip thrust barre — 3×6 @ RPE 8 · tempo 2-1-2-0**\n• Position : haut du dos appuyé sur banc, barre sur hanches (avec coussin), pieds à plat largeur bassin.\n• Exécution : pousse les hanches vers le plafond en serrant fort les fessiers, alignement épaule-genou en haut, tiens 1s, redescends 2s.\n• Sensation : fessiers en feu, pas de tension dans le bas du dos.\n• Erreur : hyperextension lombaire en haut (cambré) → menton vers poitrine, fessiers serrés.\n• Régression : glute bridge PdC 15 reps tempo 2-2-2.\n• Repos 2'.\n\n**D) Mollets debout chargés — 3×8 tempo 2-2-1-0**\n• Position : machine ou Smith, plante des pieds sur cale, talons dans le vide.\n• Exécution : descends talons 2s sous niveau cale (étirement max), remonte 1s pointe max, tiens 1s en haut.\n• Sensation : gastrocnémiens (mollet visible) en contraction.\n• Erreur : amplitude tronquée, rebond élastique sans contrôle.\n• Repos 75s.\n\n→ Protocole Rønnestad 2010 (heavy strength + endurance) : gains économie +4-5%.", []],
      ["Cool-down", "8' :\n• Marche ou vélo Z1 3' pour évacuer.\n• Mobilité hanches couch stretch 60s/côté + stretch quadris debout 30s/côté ×2.\n• Respiration nasale lente 2'.", ["Z1"]],
      ["Coaching", "Progression 4+1 : Sem 1-2 : 4×4 @ 85%. Sem 3-4 : 4×4 @ 87-90%. Sem 5 décharge -40% volume. Maintien 1×/sem en peak.\nSécurité : toujours dans une cage avec arrêts de sécurité, ou avec un parreur. Si tu ne peux pas tenir le tempo, baisse la charge — la qualité prime.\nDébutant strict : 6-8 semaines de goblet squat + RDL haltères avant d'attaquer ce bloc lourd.", []],
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
      ["Warm-up", "12' :\n• 5' vélo Z1 progressif.\n• Mobilité dynamique : leg swings avant/arrière 10/jambe + lateral 10/jambe + hip CARs 5/côté.\n• 2×5 squat à 60% 1RM (priming neuro).", ["Z1"]],
      ["Main", "Méthode contraste lourd → explosif (PAP, Post-Activation Potentiation : la charge lourde 'réveille' les fibres rapides juste avant le mouvement explosif).\n\n**Complexe A1+A2 — Back squat 4×3 @ 85% → Squat jumps max 4×5**\n• A1 Squat : descends 2s contrôlé, remonte explosif, 3 reps. Inspire en bas, expire en poussant.\n• Repos exact 15s (chronomètre), enlève la barre.\n• A2 Squat jump : pieds largeur épaules, descends rapidement à mi-squat, saute le plus haut possible bras qui aident, réception en flexion silencieuse, enchaîne 5 sauts.\n• Sensation A2 : jambes 'ressort', tu te sens léger.\n• Erreur : réception genoux raides (impact) → reçois en flexion.\n• Régression débutant : remplace squat jump par squat à vide explosif 5 reps (sans amorti articulaire).\n• Repos 3' entre complexes complets.\n\n**Complexe B1+B2 — Romanian deadlift 3×5 @ 80% → Broad jumps 3×4**\n• B1 RDL : pieds bassin, légère flexion genoux, descends barre le long des jambes en poussant fessiers vers l'arrière (charnière de hanche), redresse en serrant les fessiers.\n• Repos 15s.\n• B2 Broad jump : flexion rapide, saute le plus loin possible vers l'avant, bras qui balancent. 4 sauts avec replacement entre chaque.\n• Sensation : chaîne postérieure qui propulse vers l'avant.\n• Régression : remplace broad jump par broad jump léger (60% effort) pour apprendre la réception.\n• Repos 2'30 entre complexes.\n\n**C) Step-up explosif charge modérée — 3×6/jambe rapide**\n• Position : pied sur banc 40cm, haltères 10-15kg dans chaque main.\n• Exécution : monte explosivement en poussant fort dans le talon avant, jambe arrière qui monte genou haut, redescends contrôlé.\n• Sensation : transfert de force unilatéral, équilibre dynamique.\n• Repos 90s.", []],
      ["Cool-down", "8' : jog Z1 3' + stretch hanches/ischios 5' (pigeon + stretch ischios debout pied surélevé 30s/côté ×2).", ["Z1"]],
      ["Coaching", "Progression : Sem 1 : 3 complexes (apprentissage technique). Sem 2-3 : 4 complexes. Décharge sem 4. STOP J-10 course A (CNS recovery).\nCritère qualité : si la hauteur de saut chute >15% entre la 1ère et la 4ème série → arrête, le SNC est cuit.\nDébutant : maîtrise d'abord 6 sem de squat/RDL technique avant d'ajouter le contraste explosif.", []],
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
      ["Warm-up", "5' activation :\n• Dead bug lent : allongé dos, bras tendus vers plafond, jambes à 90°. Tends bras droit derrière la tête + jambe gauche vers le sol (sans toucher), garde bas du dos PLAQUÉ au sol. 2×8/côté. Sensation : transverse engagé.\n• Cat-cow 1' lent (10 cycles).\n• Glute bridge 2×10 tempo 2-2-2.", []],
      ["Main", "Circuit 4 tours, repos 60s entre tours. Philosophie McGill : le core sert à TRANSMETTRE la force, pas à la créer — donc on travaille la résistance au mouvement (anti-pattern) plutôt que les crunchs.\n\n**1) Anti-extension — Hollow body hold (30-45s)**\n• Position : allongé dos, bas du dos plaqué au sol, jambes tendues à 15cm du sol, bras tendus derrière les oreilles.\n• Sensation : abdos profonds qui brûlent, bas du dos qui RESTE collé au sol.\n• Erreur : bas du dos qui se creuse → remonte jambes ou bras.\n• Régression débutant : tuck hold (genoux pliés ramenés vers poitrine) 30s.\n• Respiration : continue, pas d'apnée.\n\n**2) Anti-rotation — Pallof press élastique (12/côté lent)**\n• Position : debout côté à un point d'ancrage (porte), élastique tenu à 2 mains contre la poitrine.\n• Exécution : tends les bras devant toi lentement, RÉSISTE à la traction qui veut te faire tourner le buste vers l'ancrage. Tiens 2s, ramène. 12 lent.\n• Sensation : obliques + transverse engagés pour résister à la rotation.\n• Erreur : laisser tourner les épaules.\n• Régression : recule d'1 pas de l'ancrage (moins de tension).\n\n**3) Anti-flexion latérale — Suitcase carry (30m/côté)**\n• Charge : haltère ≈ 50% du poids du corps dans une seule main.\n• Exécution : marche lentement 30m en gardant les épaules parfaitement à l'horizontale, ne penche pas du côté chargé. La main libre reste relâchée.\n• Sensation : QL (carré des lombes) du côté OPPOSÉ à la charge qui travaille.\n• Erreur : compenser par épaule remontée → relâche.\n• Régression : 20m avec 30% PdC.\n\n**4) Anti-flexion — Front plank avec drag haltère sous corps (8/côté)**\n• Position : planche bras tendus, pieds largeur épaules, haltère 5kg sur le côté.\n• Exécution : attrape l'haltère avec la main opposée, fais-le glisser sous le corps vers l'autre côté, alterne. 8/côté.\n• Sensation : abdos qui résistent à la rotation des hanches (les hanches DOIVENT rester immobiles).\n• Erreur : hanches qui basculent.\n• Régression : planche genoux au sol 30s statique.\n\n**5) Hip-driven — Single-leg glute bridge tempo 2-2-2 (10/jambe)**\n• Position : allongé dos, un pied au sol près des fessiers, autre jambe tendue.\n• Exécution : monte 2s, tiens 2s en haut (fessier serré, hanches parfaitement alignées sans bascule), redescends 2s.\n• Sensation : fessier de la jambe d'appui isolé.\n• Erreur : hanche du côté libre qui chute → garde alignement.", []],
      ["Cool-down", "5' :\n• Child pose 1' (respiration ample).\n• Respiration diaphragmatique 4' allongé sur le dos, main sur le ventre : inspire 4-6s nez, expire 6-8s nez. Le ventre se gonfle à l'inspire.", []],
      ["Coaching", "Progression : Sem 1-2 : 3 tours. Sem 3-4 : 4 tours + charges +10%. Pas de décharge nécessaire.\nFréquence : 2×/sem idéal, jamais le jour d'une qualité bas du corps.", []],
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
      ["Warm-up", "8' :\n• 4' vélo ou rameur Z1.\n• Activation full body en circuit 1 tour : squat PdC ×12 + push-up ×8 (genoux si besoin) + scapular pull ×10 + glute bridge ×10.", ["Z1"]],
      ["Main", "**Block A — Force compound (3 tours, repos 2'30)**\n• A1) Trap-bar deadlift : 5 reps @ RPE 8 — voir technique détaillée dans C_STR_MAX_LOWER_HEAVY.\n• A2) DB bench press : 6 reps @ RPE 7. Position allongé sur banc, haltères au niveau des pectoraux, coudes à 45° du buste (pas 90°, plus sûr pour les épaules). Descends 2s, pousse 1s. Sensation pectoraux+triceps.\n• Régression bench : push-up genoux 8-12 reps.\n\n**Block B — Unilatéral (3 tours, repos 90s)**\n• B1) Bulgarian split squat : pied arrière surélevé sur banc, pied avant à 60-80cm devant. Descends genou arrière vers le sol en gardant buste droit, remonte. 6/jambe avec haltères. Erreur : pencher le buste, genou avant qui dépasse trop la pointe.\n• B2) Row 1 bras haltère : un genou et une main sur banc, autre main tire l'haltère vers la hanche en serrant l'omoplate. 8/côté. Sensation : milieu du dos qui se serre.\n• Régression Bulgarian : split squat classique (pied arrière au sol).\n\n**Block C — Préhab finisher (2 tours, repos 45s)**\n• C1) Pallof press : 12/côté (voir détail dans C_STR_CORE_INTEGRATED).\n• C2) Calf raise : 12, voir détail dans C_STR_MAX_LOWER_HEAVY.\n• C3) Face pull élastique : 15. Élastique à hauteur du visage, tire vers le front en écartant les coudes, omoplates qui se serrent. Sensation : arrière des épaules + trapèzes moyens. Crucial pour cyclistes/nageurs.", []],
      ["Cool-down", "7' : mobilité hanches (90/90 1'/côté) + épaules (open book 8/côté) + respiration nasale 3'.", []],
      ["Coaching", "Charges +2.5% Sem 2-3 sur lifts compound. Décharge sem 4 (-30% volume).\nSi temps coupé à 30' : garde uniquement Block A complet.", []],
      ["Références", "Berryman et al. (2018) — concurrent training efficience temporelle.", []]
    ]),
    variants: { ironman: "Block A: 4 tours · réduire Block C à 1 tour" },
    goals: GOALS_ALL,
    tags: ["strength", "total-body", "time-efficient"]
  },
  {
    id: "C_STR_BEGINNER_FOUNDATION_FULL",
    cat: "C",
    sport: "strength",
    objectif: "Fondations débutant 8 sem — technique avant charge (full body)",
    necessite: "Recommandé",
    when: "Démarrage muscu (0-8 sem d'expérience) — toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [40, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "10' :\n• 4' marche rapide ou vélo Z1.\n• Mobilité : cat-cow 1' + hip CARs 5/côté + scapular CARs 5/côté.\n• Activation : glute bridge 2×10 + dead bug 2×8/côté + wall slides Y-T 2×8.", ["Z1"]],
      ["Main", "Bloc unique 3 tours, repos 90s entre exos, 2' entre tours.\n\n**1) Goblet squat (haltère ou kettlebell 8-12kg) — 10 reps**\n• Position : haltère tenu verticalement contre la poitrine (mains en coupe sous la tête de l'haltère), pieds largeur épaules pointes 15° dehors.\n• Exécution : inspire, descends en 3s en poussant les genoux vers les pointes, jusqu'à ce que les coudes touchent l'intérieur des genoux. Pousse 1s pour remonter, expire.\n• Sensation : quadris + fessiers, dos droit, talons collés au sol.\n• Erreurs : talons qui décollent (manque mobilité cheville → mets cales sous talons) · genoux qui rentrent · dos qui s'arrondit en bas (tucking).\n• Régression : box squat assis-debout sur chaise + 5cm.\n• Progression : sem 3 → 14kg, sem 5 → 18kg, sem 7 → passer en back squat barre vide.\n\n**2) Romanian deadlift haltères — 10 reps**\n• Position : debout, un haltère dans chaque main devant les cuisses, légère flexion genoux fixe.\n• Exécution : pousse les fessiers loin derrière (charnière de hanche), les haltères longent les jambes, descends jusqu'à sentir étirement ischios (≈ mi-tibia), redresse en serrant les fessiers. Tempo 3-0-1-0.\n• Sensation : ischios étirés en bas, fessiers qui poussent les hanches vers l'avant en haut.\n• Erreur cardinale : arrondir le dos. Si tu sens le dos en bas → réduis amplitude.\n• Régression : RDL avec barre PVC ou bâton (apprentissage charnière).\n• Progression : sem 5 → barre olympique vide.\n\n**3) Push-up — 8 reps (genoux si besoin)**\n• Position : mains sous les épaules, corps gainé en planche, regard 30cm devant les mains.\n• Exécution : descends 2s en gardant les coudes à 45° du buste (pas 90°), poitrine effleure le sol, pousse 1s.\n• Sensation : pectoraux + triceps + gainage abdos.\n• Erreur : hanches qui s'effondrent ou se cassent vers le haut.\n• Régression : push-up genoux ou contre un mur incliné.\n• Progression : sem 4 → push-up pieds surélevés, sem 7 → push-up lesté.\n\n**4) Row inverse barre (TRX, anneaux, ou barre dans rack) — 10 reps**\n• Position : suspendu sous une barre horizontale, corps gainé, talons au sol, prise pronation largeur épaules.\n• Exécution : tire la poitrine vers la barre en serrant les omoplates, descends 2s contrôlé.\n• Sensation : milieu du dos + biceps.\n• Régression : plus le corps est vertical (barre haute), plus c'est facile.\n• Progression : pieds surélevés sur banc.\n\n**5) Glute bridge tempo — 12 reps**\n• Voir détail dans C_STR_MAX_LOWER_HEAVY warm-up. Tempo 2-2-2 (monte 2s, tiens 2s, descends 2s).\n\n**6) Dead bug — 8/côté**\n• Voir détail dans C_STR_CORE_INTEGRATED warm-up.\n\n**7) Bird-dog tempo — 8/côté**\n• Position 4 pattes. Tends bras opposé + jambe opposée alignés au dos, tiens 3s, retour lent contrôlé.\n• Sensation : équilibre + abdos profonds.", []],
      ["Cool-down", "6' : marche 2' + stretch quadris debout 30s/côté + child pose 1' + respiration diaphragmatique 2'.", []],
      ["Coaching", "Fréquence : 2-3×/sem, JAMAIS 2 jours consécutifs au début.\nProgression sur 8 semaines : sem 1-2 : 2 tours, focus technique pure (vidéo-toi). Sem 3-4 : 3 tours, charges +2kg. Sem 5-6 : 3 tours, ajoute pause 1s en bas du squat. Sem 7-8 : transition vers C_STR_TOTAL_BODY_45 ou C_STR_LOWER_HYPERTROPHY.\nCourbatures normales 48-72h les 2 premières semaines, ça s'estompe.\nSi douleur articulaire (genou, dos) → STOP cet exo, regarde la régression, reviens.", []],
      ["Références", "Schoenfeld (2010) — mechanisms of muscular hypertrophy · Rippetoe (2017) Starting Strength.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "beginner", "foundation", "full-body", "technique"]
  },
  {
    id: "C_STR_UPPER_PUSH_PULL",
    cat: "C",
    sport: "strength",
    objectif: "Haut du corps push/pull équilibré — posture & équilibre musculaire",
    necessite: "Optionnel",
    when: "Base & Build (1×/sem complément), spécialement utile cyclistes & nageurs",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [35, 50],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "8' :\n• 3' vélo ou rameur Z1.\n• Mobilité épaules : scapular CARs 5/côté + wall slides Y-T-W 2×8 + thoracic rotations 8/côté.\n• Activation : band pull-apart 2×15 + scapular push-up 2×10.", ["Z1"]],
      ["Main", "Format alterné push/pull, ratio 1:2 (2× plus de pull que push pour compenser la posture cycliste/triathlète).\n\n**A1) DB bench press — 4×8 @ RPE 7-8**\n• Voir détail dans C_STR_TOTAL_BODY_45.\n• Repos 90s avec A2.\n\n**A2) DB row 1 bras — 4×10/côté @ RPE 7-8**\n• Position : genou et main appui sur banc, dos parallèle au sol.\n• Exécution : tire haltère vers la hanche en menant avec le coude, serre l'omoplate vers la colonne en haut, descends contrôlé 2s.\n• Sensation : grand dorsal + rhomboïdes.\n• Erreur : tirer avec le biceps (coude qui s'écarte) → garde coude proche du corps.\n• Repos 90s avec A1.\n\n**B1) DB shoulder press assis — 3×10**\n• Position : assis sur banc dossier à 80°, haltères au niveau des épaules, paumes vers l'avant.\n• Exécution : pousse au-dessus de la tête sans bloquer les coudes, descends 2s.\n• Sensation : deltoïdes.\n• Erreur : cambrer le bas du dos → engage abdos.\n• Régression : haltères légers (3-5kg) en arnold press.\n\n**B2) Lat pulldown ou tractions assistées — 3×10**\n• Position : prise pronation un peu plus large qu'épaules.\n• Exécution : tire la barre vers le haut de la poitrine en menant avec les coudes vers le sol, omoplates qui descendent.\n• Sensation : grand dorsal qui s'allonge en haut, qui se contracte en bas.\n• Régression : assistance machine ou bande élastique pour traction.\n\n**C) Finisher arrière épaules (super-set 3 tours, repos 60s)**\n• Face pull élastique : 15 reps lent (voir détail dans C_STR_TOTAL_BODY_45 Block C).\n• Reverse fly haltères légers (3-5kg) : 12 reps. Penché en avant, écarte les bras tendus latéralement en serrant les omoplates. Sensation : arrière des épaules + rhomboïdes.\n• Band pull-apart : 15. Élastique tendu à hauteur poitrine, écarte les bras tendus.", []],
      ["Cool-down", "7' : doorway pec stretch 45s/côté ×2 + child pose bras à droite/gauche 30s/côté + respiration nasale 2'.", []],
      ["Coaching", "Cyclistes/triathlètes : prioriser le ratio 1:2 push/pull permanent. Sinon douleurs cou/épaules en aéro.\nProgression : sem 1-2 charges modérées (RPE 7). Sem 3-4 RPE 8. Décharge sem 5.", []],
      ["Références", "Janda (1987) — Upper Crossed Syndrome.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "upper", "push-pull", "posture"]
  },
  {
    id: "C_STR_LOWER_HYPERTROPHY",
    cat: "C",
    sport: "strength",
    objectif: "Hypertrophie bas du corps — gain masse maigre (8-12 reps)",
    necessite: "Optionnel",
    when: "Off-season ou base lointaine (>14 sem avant A)",
    phase: ["base"],
    avoid: "Build/Peak (concurrence avec endurance)",
    durationMin: [50, 65],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "10' : vélo Z1 5' + activation glutes (clamshell 2×15 + glute bridge 2×12) + 2×8 squat à vide.", ["Z1"]],
      ["Main", "Format hypertrophie classique : volume modéré, charges 70-80% 1RM, repos courts (60-90s), tempo contrôlé.\n\n**A) Back squat — 4×8 @ 72% 1RM tempo 3-0-1-0 · repos 90s**\n• Voir technique dans C_STR_MAX_LOWER_HEAVY.\n• Différence : descente 3s pour temps sous tension élevé.\n• Sensation : brûlure quadris dès la 6ème rep.\n\n**B) Romanian deadlift barre — 4×10 @ RPE 7 · repos 75s**\n• Voir technique dans C_STR_BEGINNER_FOUNDATION_FULL.\n• Sensation : ischios sous tension constante.\n\n**C) Bulgarian split squat haltères — 3×10/jambe · repos 60s**\n• Voir détail dans C_STR_TOTAL_BODY_45.\n• Charge modérée pour finir les 10 reps en gardant la technique.\n\n**D) Leg curl machine — 3×12 · repos 60s**\n• Position : allongé sur le ventre, chevilles sous le rouleau.\n• Exécution : fléchis les genoux pour amener les talons vers les fessiers, tempo 2-1-2-0.\n• Sensation : ischios isolés.\n• Régression : nordic curl partenaire 5 reps.\n\n**E) Calf raise debout — 4×12 tempo 2-2-1-0 · repos 60s**\n• Voir détail dans C_STR_MAX_LOWER_HEAVY.", []],
      ["Cool-down", "8' : foam roll quadris/ischios 5' + stretch couché psoas 60s/côté.", []],
      ["Coaching", "Volume hebdo cible : 12-16 séries dures par groupe musculaire (cumul sur 1-2 séances).\nCourbatures normales 48-72h. Si chevauche avec endurance dure : décale au moins 6h, idéalement 24h.\nÀ éviter en build/peak : gain masse non-fonctionnel pour endurance pure.", []],
      ["Références", "Schoenfeld et al. (2017) — volume-hypertrophy meta.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "lower", "hypertrophy", "off-season"]
  },
  {
    id: "C_STR_KETTLEBELL_FLOW",
    cat: "C",
    sport: "strength",
    objectif: "Circuit kettlebell complet — force + cardio + coordination",
    necessite: "Optionnel",
    when: "Toute l'année (1×/sem) — alternative aux séances barre",
    phase: ["base", "build"],
    avoid: "Sans apprentissage technique du swing (regarder vidéo ou coach)",
    durationMin: [30, 45],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "8' : marche rapide 3' + halos KB légère 8/sens + glute bridge 2×10 + 2×10 swings techniques légers.", []],
      ["Main", "Circuit EMOM (Every Minute On the Minute) 20 minutes — kettlebell femme 12-16kg / homme 16-24kg.\n\n**Minute 1 : KB Swing — 15 reps**\n• Position : KB au sol entre les pieds, pieds largeur épaules.\n• Exécution : charnière de hanche (pas un squat), tire la KB entre les jambes (hike), puis projette les hanches vers l'avant pour propulser la KB à hauteur épaules. La force vient des FESSIERS, pas des bras.\n• Sensation : explosion fessiers à chaque rep, bras qui suivent.\n• Erreur cardinale : squat au lieu de hinge · bras qui soulèvent.\n• Régression : 10 swings + 50s récup pour apprendre.\n\n**Minute 2 : Goblet squat — 12 reps**\n• Voir détail dans C_STR_BEGINNER_FOUNDATION_FULL.\n\n**Minute 3 : KB Clean & press 1 bras — 6/côté**\n• Clean : depuis le sol, hinge puis tire la KB qui 'roule' autour du poignet pour finir en rack position (KB contre le pectoral, coude collé).\n• Press : pousse au-dessus de la tête.\n• Régression débutant : remplace par DB shoulder press 10 reps.\n\n**Minute 4 : Renegade row — 8/côté**\n• Position : planche bras tendus, mains sur 2 KB au sol.\n• Exécution : tire une KB vers la hanche en gardant les hanches parfaitement stables (pas de rotation), repose, alterne.\n• Sensation : dos + abdos anti-rotation.\n\n**Minute 5 : Repos actif — marche + respiration**\n\n→ Répète 4 tours (= 20 min). Tu fais l'exo dans la minute, le reste = récup.", []],
      ["Cool-down", "7' : marche 3' + mobilité hanches 90/90 + stretch ischios + respiration nasale 2'.", []],
      ["Coaching", "Le swing demande 4-6 semaines d'apprentissage avec une KB légère AVANT de charger. Apprendre la charnière de hanche = clé.\nProgression : sem 1-2 : 3 tours avec KB légère. Sem 3-4 : 4 tours. Sem 5+ : monter KB.\nDouleur lombaire en swing = hinge incorrect → reviens à la technique avec coach ou vidéo.", []],
      ["Références", "Lake & Lauder (2012) — kettlebell swing biomechanics.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "kettlebell", "circuit", "conditioning"]
  },
  {
    id: "C_STR_BODYWEIGHT_HOME",
    cat: "C",
    sport: "strength",
    objectif: "Renfo PdC à la maison — zéro matériel, voyage / hôtel",
    necessite: "Recommandé",
    when: "Déplacement, vacances, semaine sans accès salle",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [25, 40],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "7' : marche sur place + montées de genoux 2×30s + jumping jacks 2×20 + cat-cow 1' + leg swings 10/jambe.", []],
      ["Main", "Circuit 4 tours, repos 60s entre tours, enchaîne exos sans pause.\n\n**1) Squat PdC tempo 3-1-1-0 — 15 reps**\n• Voir technique dans C_STR_BEGINNER_FOUNDATION_FULL goblet squat (sans charge).\n• Sensation : tension constante quadris+fessiers.\n• Progression : ajoute pause 3s en bas à partir de sem 3.\n\n**2) Push-up — 10-15 reps**\n• Voir détail dans C_STR_BEGINNER_FOUNDATION_FULL.\n• Progression : décliné pieds sur chaise → diamond push-up.\n\n**3) Reverse lunge alterné — 10/jambe**\n• Position : debout pieds joints, mains hanches.\n• Exécution : grand pas vers l'arrière, descends genou arrière vers le sol (sans toucher), buste droit, pousse fort dans le talon avant pour revenir.\n• Sensation : quadris + fessiers jambe avant.\n• Erreur : genou avant qui dépasse trop la pointe (pas trop court) ou buste qui s'incline.\n\n**4) Pike push-up — 8 reps (variante shoulder press)**\n• Position : pieds sur chaise ou marche, mains au sol, hanches hautes (forme L inversé).\n• Exécution : descends la tête vers le sol entre les mains, pousse.\n• Sensation : deltoïdes.\n• Régression : push-up classique si trop dur.\n\n**5) Single-leg glute bridge — 12/jambe**\n• Voir détail dans C_STR_CORE_INTEGRATED.\n\n**6) Mountain climbers contrôlés — 20/jambe**\n• Position : planche bras tendus.\n• Exécution : amène un genou vers le coude opposé, alterne lent (pas en mode cardio).\n• Sensation : abdos en rotation contrôlée.\n\n**7) Plank — 45-60s**\n• Position : avant-bras au sol, corps gainé en ligne droite des pieds aux épaules.\n• Sensation : abdos profonds, fessiers serrés.\n• Erreur : hanches affaissées ou trop hautes.", []],
      ["Cool-down", "6' : stretch quadris 30s/côté + stretch ischios assis 30s/côté + child pose 1' + respiration 2'.", []],
      ["Coaching", "Progression : sem 1 : 3 tours. Sem 2+ : 4 tours. Variations possibles : Tabata (20s on / 10s off) pour intensifier.\nIdéal en voyage : 25' suffisent pour entretien.", []],
      ["Références", "Calatayud et al. (2014) — bodyweight vs weighted exercises EMG.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "bodyweight", "home", "travel"]
  },

  // ═════════════════════════════════════════════════════════════════════
  // FAMILLE 2 — TRAIL-SPÉCIFIQUE
  // ═════════════════════════════════════════════════════════════════════
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
      ["Warm-up", "10' :\n• 5' vélo Z1.\n• Squat PdC 2×10 + fentes 2×8/côté (voir technique reverse lunge dans C_STR_BODYWEIGHT_HOME).\n• Mobilité cheville dorsiflexion contre mur 1'/côté.", ["Z1"]],
      ["Main", "Logique : exposer les quadris à des contractions excentriques répétées pour déclencher le **Repeated Bout Effect (RBE)** = adaptation neuromusculaire qui protège des courbatures lors de la course en descente. Eston 1996.\n\n**A) Step-down excentrique boîte 40cm — 4×8/jambe · repos 90s**\n• Position : debout sur une boîte/marche stable de 40cm, un pied dans le vide.\n• Exécution : descends LENTEMENT en 5s en contrôlant uniquement avec la jambe d'appui, le pied libre touche à peine le sol. Remonte en t'aidant des bras (rampe, mur) — on ne travaille QUE l'excentrique.\n• Sensation : quadris qui freinent intensément.\n• Erreur : descente rapide (élan), genou qui rentre.\n• Régression : boîte 20cm, descente 3s, sem 1-2.\n\n**B) Back squat excentrique — 4×5 @ 70-75% 1RM · repos 3'**\n• Position et exécution : voir C_STR_MAX_LOWER_HEAVY.\n• Différence : descente en 5s contrôlés, remontée 1s normale.\n• Sensation : quadris en feu sur la descente.\n\n**C) Reverse Nordic curl — 3×6 amplitude tolérée · repos 90s**\n• Position : à genoux, pieds maintenus (sangle/coussin), buste droit cuisses verticales.\n• Exécution : recule lentement le buste en arrière en pivotant aux genoux, gardant le corps aligné des genoux à la tête. Tiens en bout d'amplitude tolérable, remonte en t'aidant si besoin.\n• Sensation : étirement intense quadris.\n• Régression : amplitude réduite 30° les 2 premières semaines.\n• Attention genoux : si douleur rotulienne → STOP.\n\n**D) Wall sit dynamique avec rebond léger — 3×40s · repos 60s**\n• Position : dos contre mur, cuisses parallèles au sol genoux 90°.\n• Exécution : petits rebonds verticaux 2-3cm dans la position, sans décoller le dos.\n• Sensation : quadris en tension isométrique avec petites secousses.\n\n**E) Marche en descente lestée — gilet 8-12kg, tapis -10%, 5'**\n• Marche normale en pente descendante à 4-5km/h, gilet lesté.\n• Sensation : quadris freinateurs sollicités.\n• Régression : sans lest les 2 premières semaines.", []],
      ["Cool-down", "10' : foam rolling quadris 4' (lent, pause 30s sur points sensibles) + stretch quad debout 30s/côté ×3 + marche 3'.", []],
      ["Coaching", "Progression critique : Sem 1 : volume 50% (test courbatures J+2-J+3, normales à modérées). Sem 2 : 70%. Sem 3-5 : volume plein. Sem 6 décharge -50%. Sem 7-8 réintroduction. STOP 14j avant course A.\nSi courbatures >7/10 J+3 → réduis volume sem suivante de 30%.\nObjectif : course en descente >30' sans destruction musculaire.", []],
      ["Références", "Eston et al. (1996) sur RBE · Nosaka & Aoki (2011).", []]
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
      ["Warm-up", "6' :\n• Marche dynamique 2'.\n• Mobilité cheville : squat profond tenu 30s ×2, dorsiflexion contre mur (genou qui pousse vers le mur en gardant talon au sol) 12/côté.", []],
      ["Main", "**A) Calf raise debout chargé barre/Smith — 4×6 @ RPE 8.5 · tempo 3-2-1-1 · repos 2'30**\n• Position : barre sur trapèzes (ou Smith machine), plante des pieds sur cale 5cm, talons dans le vide.\n• Exécution : descends talons en 3s sous niveau cale (étirement max), tiens 2s en bas, remonte 1s pointe max, tiens 1s en haut.\n• Sensation : gastrocnémiens en charge maximale.\n• Erreur : amplitude tronquée · rebond élastique.\n• Régression : sans charge en mono-jambe pour apprendre tempo (sem 1-2).\n\n**B) Isométrique calf raise mi-amplitude (Smith) — 4×30s · repos 2'**\n• Position : Smith machine, plante des pieds sur cale, jambes droites.\n• Exécution : monte en pointe à mi-amplitude (45° dorsiflexion/plantaire), TIENS immobile 30s à charge lourde.\n• Sensation : tendon Achille + mollet en contraction soutenue.\n• Protocole tendineux : viser 5 minutes cumulées >85% charge max sur la semaine (antalgique + adaptation collagène).\n\n**C) Soléaire assis chargé — 4×10 tempo 2-1-2-0 · repos 90s**\n• Position : assis machine soléaire, genoux à 90°, charge sur les cuisses.\n• Exécution : monte en pointe 2s, tiens 1s, descends 2s.\n• Sensation : soléaire isolé (mollet profond).\n• Importance : sous-utilisé, crucial pour économie de course.\n\n**D) Heel drop excentrique escalier — 3×15/jambe (descente 4s)**\n• Position : pointe des pieds sur marche, talons dans le vide.\n• Exécution : monte sur 2 pieds, transfère sur 1 pied, descends en 4s lent UNIQUEMENT excentrique, remonte sur 2 pieds.\n• Sensation : tendon Achille étiré sous contrôle.\n• Crucial pour tendinopathie Achille (protocole Alfredson).\n\n**E) Hop unilatéral sur place — 3×20 (rigidité réactive)**\n• Sauts sur un pied au sol, contact bref (<200ms), retour rapide.\n• Sensation : ressort tendon.\n• Régression : double-leg pogo si dur.", []],
      ["Cool-down", "6' : stretch gastro debout (jambe arrière tendue, talon au sol) 30s/côté ×3 + stretch soléaire (jambe arrière genou fléchi) 30s/côté ×3 + mobilité cheville 2'.", []],
      ["Coaching", "Progression : charge +2.5kg/sem si tempo respecté. Iso : viser 5min cumulées >85% charge max. Décharge sem 5.\nSi tendinopathie Achille en place : protocole iso ET excentrique = traitement de référence (Rio 2015, Alfredson).\nSensation tendon : courbatures localisées normales 48h, douleur aiguë lancinante = STOP.", []],
      ["Références", "Rio E. et al. (2015) — isométriques antalgiques · Alfredson et al. (1998) — eccentric protocol.", []]
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
      ["Warm-up", "10' :\n• 5' vélo Z1.\n• Activation chaîne postérieure : glute bridge 12 + bird-dog 8/côté + mobilité hanches (90/90 1'/côté).", ["Z1"]],
      ["Main", "**A) Step-up haut (banc 50cm) lesté gilet 10-15kg — 4×8/jambe · repos 90s**\n• Position : pied posé sur banc 50cm, gilet lesté.\n• Exécution : pousse FORT dans le talon avant pour monter sur le banc, jambe arrière qui suit genou haut (genou-poitrine), redescends contrôlé.\n• Sensation : fessier + quadris jambe avant en travail explosif (simule poussée hike raide).\n• Erreur : pousser avec la jambe arrière (pied au sol) au lieu de tirer avec la jambe avant.\n• Régression : sans lest, banc 40cm, sem 1-2.\n\n**B) Bulgarian split squat lesté — 3×8/jambe @ RPE 8 · repos 2'**\n• Voir détail dans C_STR_TOTAL_BODY_45.\n\n**C) Reverse lunge avec haltères — 3×8/jambe · repos 90s**\n• Voir détail dans C_STR_BODYWEIGHT_HOME (avec charges).\n\n**D) Marche en montée lestée tapis +15% — 3×3' à 4-5km/h gilet 12kg · repos 2' marche plate**\n• Marche puissante en pente forte, bâtons simulés (poussée bras).\n• Sensation : transfert direct vers hike trail.\n• Régression : pente +10%, gilet 8kg.\n\n**E) Renfo psoas (mountain climber lent contrôlé) — 3×10/côté**\n• Position : planche bras tendus.\n• Exécution : amène un genou vers la poitrine en 2s, retour 2s, alterne LENT (pas cardio).\n• Sensation : psoas et abdos profonds (clé pour soulever les genoux en hike raide).", []],
      ["Cool-down", "8' : marche 3' + foam roll quadris 2' + foam roll fessiers 2' + stretch psoas couché 60s/côté.", []],
      ["Coaching", "Progression : Sem 1 : gilet 8kg. Sem 2-3 : 12kg. Sem 4 : 15kg + pente +18%. Décharge sem 5.\nSimulation hike : tu dois ressentir la même sensation que dans une montée trail soutenue.\nOption avancée : faire 2 séances/sem si trail >40km D+.", []],
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
      ["Warm-up", "8' : mobilité hanches/chevilles (90/90 + ankle CARs) + bondissements légers latéraux 2×15s/côté.", []],
      ["Main", "**A) Lateral lunge haltères — 3×8/côté tempo 3-0-1-0 · repos 90s**\n• Position : debout pieds joints, haltères dans les mains.\n• Exécution : grand pas LATÉRAL à droite, descends sur la jambe droite (genou aligné pointe), jambe gauche tendue, descends 3s, pousse pour revenir.\n• Sensation : adducteurs + fessiers + quadris jambe d'appui.\n• Erreur : genou qui rentre · buste trop penché vers l'avant.\n\n**B) Cossack squat — 3×6/côté · repos 90s**\n• Position : debout pieds très écartés (1.5× largeur épaules), haltère en goblet.\n• Exécution : descends d'un côté en fléchissant complètement cette jambe (talon collé), jambe opposée tendue talon décollé pointe vers le haut, redresse, alterne.\n• Sensation : mobilité hanches + force adducteurs.\n• Régression : amplitude réduite (descente à mi-chemin).\n\n**C) Single-leg deadlift haltère (équilibre) — 3×8/jambe · repos 90s**\n• Position : debout sur 1 pied, haltère dans la main opposée.\n• Exécution : charnière de hanche, jambe libre qui s'allonge derrière, buste qui descend en T, haltère qui descend le long de la jambe d'appui. Redresse contrôlé.\n• Sensation : ischios + fessier + équilibre cheville.\n• Erreur : perdre l'alignement (hanche libre qui s'ouvre).\n• Régression : pied libre qui effleure le sol pour aide équilibre.\n\n**D) Lateral bounds réactifs — 4×8/côté · repos 60s**\n• Position : debout sur 1 pied (droit), saute latéralement et atterris sur l'autre pied (gauche), tiens 1s en équilibre.\n• Sensation : explosion latérale + contrôle réception.\n• Erreur : réception molle, perte d'équilibre.\n\n**E) Renfo péroniers élastique (éversion) — 3×15/côté**\n• Position : assis, élastique autour du pied, ancré côté médial.\n• Exécution : éverte le pied (pousse pointe vers l'extérieur) contre la résistance, lent.\n• Sensation : muscles latéraux de la cheville.\n• Crucial pour prévention entorse en inversion (mécanisme classique).\n\n**F) Équilibre yeux fermés mono-jambe surface molle — 4×30s/jambe**\n• Position : debout sur coussin proprio ou serviette pliée, 1 pied, yeux fermés, bras croisés.\n• Sensation : tout le pied qui ajuste en permanence.\n• Régression : yeux ouverts surface dure (sem 1-2).", []],
      ["Cool-down", "6' : stretch adducteurs (grenouille au sol) 60s + mobilité cheville 2' + foam roll bandelette IT 1'/côté.", []],
      ["Coaching", "Progression : Sem 1-2 : charge légère, surface dure, yeux ouverts. Sem 3-4 : charge +20%, surface molle, yeux fermés.\nCible : marcher/courir sereinement sur cailloux mobiles, racines, pentes latérales.", []],
      ["Références", "Hrysomallis (2007, Sports Med) — équilibre & prévention entorses.", []]
    ]),
    variants: {},
    goals: ["trail_short", "trail_long"],
    tags: ["strength", "trail", "lateral", "stability", "ankle"]
  },
  {
    id: "C_STR_TRAIL_CORE_BACKPACK",
    cat: "C",
    sport: "strength",
    objectif: "Core porté sac — anti-rotation/anti-flexion ultra-trail",
    necessite: "Recommandé",
    when: "Build & Peak ultra (>6h course avec sac)",
    phase: ["build", "peak"],
    avoid: "Lombalgie aiguë",
    durationMin: [30, 40],
    metricKey: "cardiaque",
    sportKey: "trail",
    structure: mk([
      ["Warm-up", "8' : marche avec sac à dos 3kg 3' + cat-cow 1' + dead bug 2×8/côté + bird-dog 2×8/côté.", []],
      ["Main", "Le port d'un sac (3-8kg) en ultra modifie le centre de gravité et fatigue intensément les muscles posturaux. Cette séance prépare cette charge.\n\n**A) Marche lestée gilet 8kg, tempo lent 4 km/h — 10' continu**\n• Surface : tapis +5% pente.\n• Focus : posture buste droit, regard horizon, gainage permanent.\n• Sensation : abdos profonds + dos qui résistent à la charge en mouvement.\n\n**B) Suitcase carry chargé 50% PdC — 4×40m/côté · repos 60s**\n• Voir détail dans C_STR_CORE_INTEGRATED.\n\n**C) Bottom-up KB carry (KB tenue à l'envers en rack) — 3×30m/côté · repos 90s**\n• Position : KB en rack position mais TÊTE en bas (anse en bas, poids en haut), bras fléchi.\n• Exécution : marche en gardant la KB parfaitement verticale, équilibrée.\n• Sensation : avant-bras qui contrôle + abdos qui stabilisent.\n• Régression : sans bottom-up (rack classique).\n\n**D) Pallof press avec marche (waiter walks) — 3×30m/côté · repos 60s**\n• Position : élastique latéral, mains tendues devant la poitrine.\n• Exécution : marche lentement vers l'avant en résistant à la traction latérale.\n• Sensation : anti-rotation dynamique.\n\n**E) McGill curl-up — 3×8/côté tempo 5s pause**\n• Position : allongé dos, 1 genou plié pied au sol, autre jambe tendue, mains sous le creux lombaire (préserver courbure).\n• Exécution : soulève la tête et les épaules ~5cm du sol sans bouger le bas du dos, tiens 5s, redescends.\n• Sensation : abdos hauts sans douleur lombaire.\n• Erreur : décoller le bas du dos.", []],
      ["Cool-down", "7' : marche sans sac 3' + child pose + stretch lombaires (knees-to-chest) + respiration nasale 2'.", []],
      ["Coaching", "Progression : sem 1 : gilet 5kg + marche 7'. Sem 2-3 : 8kg + 10'. Sem 4 : 10kg + 12'.\nÀ pratiquer en parallèle des sorties longues lestées (préparation ultra).", []],
      ["Références", "McGill (2016) Big 3 · Studencki et al. (2017) load carriage spinal.", []]
    ]),
    variants: {},
    goals: ["trail_long"],
    tags: ["strength", "trail", "ultra", "core", "backpack"]
  },
  {
    id: "C_STR_TRAIL_FOOT_TECHNIQUE",
    cat: "C",
    sport: "strength",
    objectif: "Pied technique trail — proprio dynamique terrain irrégulier",
    necessite: "Recommandé",
    when: "Toute l'année (1×/sem)",
    phase: ["base", "build", "peak"],
    avoid: "—",
    durationMin: [30, 40],
    metricKey: "cardiaque",
    sportKey: "trail",
    structure: mk([
      ["Warm-up", "8' : marche pieds nus 2' + mobilité cheville + short foot exercise (cf C_STR_ANKLE_FOOT_COMPLEX) 2×10s/pied.", []],
      ["Main", "Idéal en extérieur sur sentier mixte herbe/cailloux/racines. À défaut, en salle avec coussin proprio + bosu.\n\n**A) Marche pieds nus terrain mixte — 5' continu**\n• Sentier herbe + cailloux ronds + racines.\n• Sensation : pied qui s'adapte en permanence, intrinsèques actifs.\n• Crucial pour réveiller la sensorialité du pied (souvent éteinte par chaussures).\n\n**B) Course mono-pied sur ligne 5m (équilibre dynamique) — 4×5m/jambe · repos 60s**\n• Position : debout sur 1 pied au début d'une ligne tracée au sol.\n• Exécution : sautille en avant sur la même jambe en restant sur la ligne, contact bref.\n• Sensation : cheville qui ajuste, équilibre dynamique.\n\n**C) Sauts latéraux sur bosu / coussin proprio — 3×10/côté · repos 90s**\n• Position : 1 pied sur bosu, saute latéralement vers l'autre côté en atterrissant sur l'autre pied (toujours sur bosu).\n• Sensation : amortissement + stabilisation latérale.\n\n**D) Course technique slalom plots (avec changements direction rapides) — 4×30s · repos 60s**\n• 6-8 plots au sol espacés 1.5m, slalome en course rapide.\n• Sensation : agilité, transferts de poids.\n\n**E) Marche jusqu'à descente steep technique (10-15% pente herbe/terre) — 4×30m**\n• Descente avec petits pas rapides, regard 3-5m devant (pas les pieds).\n• Sensation : confiance descente technique.", []],
      ["Cool-down", "6' : massage voûte plantaire avec balle de tennis 1'/pied + stretch mollets + mobilité cheville.", []],
      ["Coaching", "Pratique : minimum 1×/sem en pré-saison trail. Investissement énorme pour confiance/vitesse descente.\nDébutant : commence par phase A+B uniquement les 4 premières semaines.", []],
      ["Références", "McKeon et al. (2015) — foot core paradigm.", []]
    ]),
    variants: {},
    goals: ["trail_short", "trail_long"],
    tags: ["strength", "trail", "foot", "proprio", "technical"]
  },

  // ═════════════════════════════════════════════════════════════════════
  // FAMILLE 3 — ROUTE/CAP-SPÉCIFIQUE
  // ═════════════════════════════════════════════════════════════════════
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
      ["Warm-up", "12' :\n• 5' jog Z1.\n• Éducatifs foulée : skipping A 2×20m + skipping B 2×20m + talons-fesses 2×20m + foulée bondissante 2×20m.\n• Activation plyo basse : pogo jumps 2×15 (sauts verticaux 2 pieds, contact bref, talons jamais au sol).", ["Z1"]],
      ["Main", "Protocole Blagrove 2018 (méta-analyse) : combiner force lourde + plyo dans la même séance → gains économie -2 à -5% VO2 à allure marathon.\n\n**Bloc Force (repos 3' entre séries)**\n\n**A) Half-squat barre — 4×5 @ 80% 1RM · tempo 2-0-1-0**\n• Position : voir back squat dans C_STR_MAX_LOWER_HEAVY.\n• Différence : descente uniquement à mi-amplitude (cuisses à 45°, pas parallèle au sol).\n• Sensation : quadris + fessiers, intensité maximale sur cette amplitude.\n• Pourquoi half-squat : amplitude spécifique foulée de course.\n\n**B) Romanian deadlift — 3×6 @ RPE 7-8 · repos 2'**\n• Voir détail dans C_STR_BEGINNER_FOUNDATION_FULL (barre olympique pour avancés).\n\n**C) Single-leg press — 3×6/jambe · repos 2'**\n• Position : machine, 1 pied au centre de la plateforme.\n• Exécution : descends contrôlé, pousse fort.\n• Sensation : quadris + fessiers unilatéraux.\n\n**Bloc Plyo (IMMÉDIATEMENT après force, repos 90s entre exos)**\n\n**D) Squat jumps — 3×6 H max**\n• Position : pieds largeur épaules.\n• Exécution : descends rapidement à mi-squat, saute LE PLUS HAUT POSSIBLE bras qui aident, réception en flexion silencieuse.\n• Sensation : explosion verticale.\n• Critère qualité : si hauteur chute >15% sur la dernière rep → stoppe.\n\n**E) Bounds alternés (foulée bondissante) — 3×20m**\n• Position : debout pied droit avant.\n• Exécution : grandes foulées bondissantes, projection avant + haut, bras qui balancent vigoureusement. Cherche temps de suspension maximal.\n• Sensation : ressort à chaque foulée.\n\n**F) Pogo jumps stiffness — 3×15 contact <200ms**\n• Position : pieds largeur bassin.\n• Exécution : sauts verticaux jambes très peu fléchies, contact AU SOL le plus bref possible (comme un ressort), pas d'amorti aux genoux.\n• Sensation : tendon Achille + mollet en ressort réactif.\n• Erreur : trop d'amorti aux genoux → tu travailles juste l'aérobie pas la stiffness.", []],
      ["Cool-down", "10' : jog Z1 5' + foam rolling complet (quadris, ischios, mollets, bandelette) 5'.", ["Z1"]],
      ["Coaching", "Progression : Sem 1-2 : 3 séries force. Sem 3-5 : 4 séries. Décharge sem 6. Maintien 1×/sem peak (volume -40%).\nClé Blagrove : ne pas séparer force et plyo en séances distinctes — l'enchaînement direct = adaptation neurale optimale.\nDébutant : 8 sem de C_STR_BEGINNER_FOUNDATION_FULL avant ce protocole.", []],
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
      ["Warm-up", "12' :\n• 5' jog Z1.\n• 3' éducatifs (skipping A 2×20m + talons-fesses 2×20m).\n• Activation plyo basse : pogo 2×15 + skip A 2×20m.", ["Z1"]],
      ["Main", "Stiffness = capacité du tendon Achille à stocker/restituer l'énergie élastique. Adaptation = surface contact courte + raideur cheville.\n\n**A) Pogo jumps 2 pieds rigidité max — 4×20 contacts · repos 90s**\n• Voir détail dans C_STR_RE_ECONOMY_BLAGROVE pogo.\n• Critère qualité : contact <180ms, son sec et bref au sol.\n• Erreur : amorti aux genoux → contracte les mollets dur, mini-flexion genou.\n\n**B) Single-leg pogo — 3×12/jambe · repos 90s**\n• Même technique que A mais sur 1 pied.\n• Sensation : ressort tendon Achille unilatéral.\n• Régression : 8 reps les 2 premières semaines.\n\n**C) Hops linéaires unilatéraux — 3×10/jambe sur 15m · repos 90s**\n• Position : debout sur 1 pied au départ.\n• Exécution : sauts vers l'avant successifs sur la même jambe, contact bref, distance régulière.\n• Sensation : propulsion réactive unilatérale.\n• Erreur : pause entre les sauts (perd l'élasticité).\n\n**D) Drop jumps 30cm (réactivité) — 4×5 contact bref · repos 2'**\n• Position : debout sur boîte 30cm.\n• Exécution : LAISSE-TOI tomber (ne saute pas vers le bas), à la réception contact bref puis re-saute verticalement le plus haut possible.\n• Sensation : ressort jambes complet.\n• Critère : temps contact <200ms, hauteur saut >30cm.\n• Régression : drop jump 20cm les 2 premières semaines.\n\n**E) Skipping A explosif — 4×20m focus rebond**\n• Position : skipping classique mais avec focus sur rebond du pied (pas levée passive genou).\n• Sensation : ressort de la cheville à chaque pose pied.", []],
      ["Cool-down", "8' : jog easy Z1 3' + stretch mollets 30s/côté ×2 + stretch soléaire 30s/côté ×2.", ["Z1"]],
      ["Coaching", "Progression : Sem 1 : volume 60% (apprentissage). Sem 2-3 : plein. Sem 4 décharge. STOP J-10 course A. Total contacts <100/séance.\nDébutant total plyo : 4-6 sem de pogo simple + ankle dorsiflexion strength AVANT ce protocole.\nDouleur tendon : STOP, retour vers C_STR_CALF_ISO_HEAVY (phase préparatoire iso/excentrique).", []],
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
    objectif: "Travail de foulée — strides + drills séance dédiée",
    necessite: "Recommandé",
    when: "Toute l'année (1-2×/sem en fin de easy)",
    phase: ["base", "build", "peak"],
    avoid: "—",
    durationMin: [25, 35],
    metricKey: "allure",
    sportKey: "course",
    structure: mk([
      ["Warm-up", "10' jog Z1 progressif + mobilité hanches dynamique (leg swings 10/jambe avant-arrière + latéral).", ["Z1"]],
      ["Main", "**Bloc 1 — Drills (3 tours sur 30m, retour marche)**\n\n**1) Skipping A — pose pied avant**\n• Exécution : alternance genou haut (hanche fléchie 90°) + pose pied avant-pied (médio-pied), bras rythmés.\n• Sensation : pose pied légère et réactive, cadence élevée.\n• Erreur : pose talon (heel strike), cadence trop lente.\n\n**2) Skipping B — extension hanche complète**\n• Exécution : skipping A + extension active de la jambe descendante (push-off complet derrière, comme un coup de pied vers l'arrière).\n• Sensation : ischios + fessiers actifs dans la phase de propulsion.\n\n**3) Foulée bondissante**\n• Voir détail dans C_STR_RE_ECONOMY_BLAGROVE bounds.\n\n**4) Talons-fesses rapides**\n• Exécution : course en cherchant à ramener rapidement les talons sous les fessiers.\n• Sensation : ischios récupérés rapidement (cadence élevée).\n• Erreur : amener les talons vers l'avant (faux talons-fesses).\n\n**Bloc 2 — Strides : 6-8 × 80-100m à 90-95% allure max · récup 90s marche complète**\n\n• Position : départ debout, accélération progressive sur 20m.\n• Exécution : course à 90-95% effort sur 60m, décélération 20m, marche retour 90s.\n• Focus technique : cadence ≥180 ppm, bras décontractés (épaules basses, mains qui montent au niveau du visage), pose pied médio-avant pied SOUS le centre de gravité (pas devant), buste droit légèrement penché vers l'avant.\n• Sensation : course fluide, économique, légère.\n• Erreur : tension visage/épaules/poings serrés → relâche.", []],
      ["Cool-down", "5' jog Z1 + étirements doux ischios/quadris.", ["Z1"]],
      ["Coaching", "Progression : Sem 1 : 6 strides. Sem 3 : 8 strides. Idéal après séance Z2 facile, JAMAIS après séance fractionnée dure.\nDébutant : commence par 4 strides à 85% effort, focus pure technique.", []],
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
      ["Warm-up", "15' :\n• 10' jog Z1-Z2 progressif.\n• 4×strides 80m (voir détail dans C_STR_RUN_FORM_STRIDES).\n• Mobilité hanches dynamique 3'.", ["Z1", "Z2"]],
      ["Main", "**10-12 × sprint 8-12s en côte 6-10% pente**\n• Récupération : descente marche 2-3' complète (FC <120 avant le sprint suivant).\n\n• Position de départ : debout (pas crouch start), pied avant légèrement en avance.\n• Exécution : départ explosif, monte la cadence progressivement sur les 3 premières secondes, foulée puissante avec poussée complète, bras dynamiques, regard 5m devant (pas le sol).\n• Sensation : effort 95-100%, jambes ressort, propulsion maximale.\n• Erreur : crouch start (départ accroupi qui crée tension) · arrêt brutal en haut (continue à courir easy 10m).\n• Régression : 6 sprints à 90% les 2 premières séances.\n\n• Variation avancée Sem 2-3 : ajouter 4 sprints 6s ultra-courts (priming SNC).", []],
      ["Cool-down", "10' jog easy Z1 + mobilité hanches/quadris.", ["Z1"]],
      ["Coaching", "Progression : Sem 1 : 6 sprints (test). Sem 2-3 : 10-12. Sem 4 : 8 sprints (deload). STOP 4 sem avant course A endurance.\nSécurité : si chaleur tendon Achille ou tirage ischios pendant le sprint → STOP immédiat, ne pas pousser.\nDébutant : maîtrise 4-6 sem de strides avant d'attaquer les sprints en côte.", []],
      ["Références", "Ross et al. (2001) — neuromuscular adaptations sprint training.", []]
    ]),
    variants: {},
    goals: ["semi", "marathon", "10k"],
    tags: ["strength", "sprint", "hill", "force-velocity", "cap"]
  },
  {
    id: "C_STR_PLYO_PROGRESSION_8WK",
    cat: "C",
    sport: "strength",
    objectif: "Progression plyo débutant — 8 semaines structurées",
    necessite: "Recommandé",
    when: "Préparation longue base avant tout protocole plyo intense (Blagrove, stiffness)",
    phase: ["base"],
    avoid: "Tendinopathie · IMC >27 (risque articulaire)",
    durationMin: [30, 45],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: mk([
      ["Warm-up", "10' :\n• 5' jog Z1.\n• Activation cheville : ankle CARs 10/sens × 2/côté + mollet stretch dynamique.\n• Activation glutes : clamshell 2×15 + glute bridge 2×12.", ["Z1"]],
      ["Main", "Progression progressive 8 semaines. CHAQUE séance, choisir le bloc correspondant à ta semaine. Total contacts <80/séance.\n\n**Phase 1 — Sem 1-2 : Apprentissage atterrissages (low impact)**\n• A) Saut vertical contrôlé sur boîte 30cm : 4×8 reps. Saute sur boîte, redescends en marchant (pas en sautant). Sensation : réception silencieuse, contrôlée.\n• B) Pogo jumps 2 pieds amplitude faible : 3×10 reps. Voir détail dans C_STR_RE_ECONOMY_BLAGROVE.\n• C) Ankle hops sur place : 3×15.\n\n**Phase 2 — Sem 3-4 : Volume + réactivité basse**\n• A) Squat jumps : 4×6.\n• B) Pogo jumps : 3×15.\n• C) Bounds simples 20m : 3 répétitions.\n• D) Hop unipodal sur place : 3×8/jambe.\n\n**Phase 3 — Sem 5-6 : Plyo réactive vraie**\n• A) Drop jumps 20cm : 4×5. Voir détail dans C_STR_REACTIVE_STIFFNESS.\n• B) Pogo single-leg : 3×10/jambe.\n• C) Hops linéaires unilatéraux 15m : 3×8/jambe.\n• D) Bounds alternés 20m : 3 répétitions.\n\n**Phase 4 — Sem 7-8 : Intensité maximale**\n• A) Drop jumps 30cm : 4×5 contact <200ms.\n• B) Squat jumps maximaux : 4×5 H max.\n• C) Single-leg bounds 20m : 3 répétitions.\n• D) Pogo single-leg : 3×12/jambe.\n\nÀ chaque saut : focus sur RÉCEPTION (silencieuse, en flexion contrôlée) avant la force du saut.", []],
      ["Cool-down", "8' : jog Z1 3' + foam roll mollets/quadris + stretch tendon Achille.", ["Z1"]],
      ["Coaching", "Progression CRITIQUE : NE PAS sauter de phase. Si douleur tendon Achille ou genou en phase 2-3 → recule d'une phase.\nFréquence : 1×/sem suffit, 2×/sem max et jamais 2 jours consécutifs.\nObjectif final : être prêt pour C_STR_REACTIVE_STIFFNESS et C_STR_RE_ECONOMY_BLAGROVE.", []],
      ["Références", "Markovic & Mikulic (2010) — plyometric training progression.", []]
    ]),
    variants: {},
    goals: ["marathon", "semi", "trail_short", "ironman", "half"],
    tags: ["strength", "plyo", "beginner", "progression"]
  },
  {
    id: "C_STR_RUN_CADENCE_DRILLS",
    cat: "C",
    sport: "strength",
    objectif: "Cadence + posture coureur — drills techniques 30'",
    necessite: "Recommandé",
    when: "Toute l'année (1×/sem)",
    phase: ["base", "build", "peak"],
    avoid: "—",
    durationMin: [25, 35],
    metricKey: "allure",
    sportKey: "course",
    structure: mk([
      ["Warm-up", "8' jog Z1 + mobilité hanches.", ["Z1"]],
      ["Main", "**A) Wall drill cadence (mur)**  — 3×30s/jambe**\n• Position : mains contre un mur, corps incliné 45°, ligne droite des chevilles à la tête.\n• Exécution : montées de genoux rapides en alternance (genou jusqu'à hanche), focus cadence haute (>180 ppm).\n• Sensation : abdos + psoas + cadence rapide.\n• Erreur : casser la ligne (fléchir hanches).\n\n**B) Running avec métronome cadence cible — 5×2' à 180 ppm**\n• Allure : Z2 confortable.\n• Exécution : utilise application métronome (180 bpm) ou musique 180 bpm, synchronise la pose pied gauche/droite.\n• Sensation : course plus 'pétillante', pose pied plus sous le centre de gravité.\n• Récup 60s marche entre intervalles.\n\n**C) Course buste droit (correction inclinaison) — 4×100m**\n• Imagine un ballon sous le menton à maintenir, regard vers l'horizon, bassin légèrement antéversé.\n• Sensation : course plus haute, plus économique.\n• Erreur : pencher en avant uniquement aux épaules (= se casser en deux).\n\n**D) Course bras seulement (action des bras décontractée) — 4×30s sur place**\n• Position : debout statique, mimer l'action des bras de la course.\n• Focus : épaules basses, coudes à 90°, mains qui montent au niveau du visage et descendent au niveau de la hanche.\n• Sensation : action de bras propre, relâchée.", []],
      ["Cool-down", "5' jog Z1 + stretch ischios.", ["Z1"]],
      ["Coaching", "Cadence cible : 175-185 ppm pour la majorité des coureurs (taille moyenne). Si tu cours à <165 ppm → travail prioritaire.\nProgression : sem 1-2 cadence 175. Sem 3-4 cadence 180. Sem 5+ cadence cible définitive.", []],
      ["Références", "Heiderscheit et al. (2011) — cadence & loading variables.", []]
    ]),
    variants: {},
    goals: ["marathon", "semi", "10k", "trail_short"],
    tags: ["strength", "drills", "cadence", "technique", "cap"]
  },
  {
    id: "C_STR_SINGLE_LEG_RUNNER",
    cat: "C",
    sport: "strength",
    objectif: "Unilatéral coureur — équilibre droit/gauche, prévention blessure",
    necessite: "Recommandé",
    when: "Toute l'année (1×/sem)",
    phase: ["base", "build", "peak"],
    avoid: "—",
    durationMin: [35, 50],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: mk([
      ["Warm-up", "8' : marche rapide 3' + leg swings 10/jambe + activation glutes (clamshell + glute bridge).", []],
      ["Main", "Format unilatéral pur — la course = mouvement unilatéral, donc renforcer en unilatéral = transfert maximal.\n\n**A) Bulgarian split squat haltères — 4×8/jambe · repos 90s**\n• Voir détail dans C_STR_TOTAL_BODY_45.\n\n**B) Single-leg RDL — 3×8/jambe · repos 90s**\n• Voir détail dans C_STR_TRAIL_LATERAL_STABILITY.\n\n**C) Step-up haltères banc 40cm — 3×10/jambe · repos 90s**\n• Voir détail dans C_STR_TRAIL_HIKING_POWER (sans lest pour cap).\n\n**D) Single-leg calf raise excentrique — 3×12/jambe · repos 60s**\n• Position : 1 pied sur cale, talon dans le vide.\n• Exécution : monte sur 2 pieds (option), descends en 4s sur 1 pied uniquement.\n\n**E) Single-leg glute bridge tempo 2-2-2 — 3×12/jambe**\n• Voir détail dans C_STR_CORE_INTEGRATED.\n\n**F) Pistol squat assisté (TRX ou rampe) — 3×5/jambe**\n• Position : debout sur 1 pied, jambe libre tendue devant.\n• Exécution : descends en squat complet sur 1 jambe en t'aidant des bras (TRX), remonte.\n• Sensation : force complète unilatérale + équilibre.\n• Régression : assis-debout chaise sur 1 jambe (sans assistance bras).", []],
      ["Cool-down", "7' : mobilité hanches + stretch quadris/ischios + foam roll fessiers.", []],
      ["Coaching", "Critère équilibre droit/gauche : différence <10% de charge ou reps tolérables.\nSi déséquilibre >15% → faire 2 séries supplémentaires côté faible chaque séance jusqu'à compensation.\nProgression : sem 1 : 3 séries. Sem 2-3 : 4 séries A. Sem 4 décharge.", []],
      ["Références", "Speirs et al. (2016) — unilateral vs bilateral training transfer.", []]
    ]),
    variants: {},
    goals: ["marathon", "semi", "ironman", "half", "trail_short", "trail_long"],
    tags: ["strength", "unilateral", "balance", "cap", "prehab"]
  },

  // ═════════════════════════════════════════════════════════════════════
  // FAMILLE 4 — PRÉHAB & MOBILITÉ
  // ═════════════════════════════════════════════════════════════════════
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
      ["Warm-up", "8' :\n• Glute bridge 2×12 tempo 2-2-2.\n• Leg swing avant/arrière 12/côté.\n• Hip CARs 5/côté.\n• Good morning PdC 2×10 (mains derrière tête, charnière de hanche, descends buste 3s).", []],
      ["Main", "**A) Nordic curl excentrique (partenaire / strap / machine) — protocole Petersen 2011**\n\n• Position : à genoux, mollets/chevilles maintenus FERMEMENT (par partenaire qui appuie sur les chevilles, ou strap fixe, ou machine Nordic).\n• Exécution : départ buste droit cuisses verticales, descends LENTEMENT en 3-5s en pivotant aux genoux, garde le corps parfaitement aligné (genoux-hanches-épaules en ligne droite, pas de cassure aux hanches). Au moment où tu ne peux plus retenir, atterris sur les mains et pousse pour revenir en haut (aide bras).\n• Sensation : ischios en contraction excentrique maximale, tension qui augmente jusqu'à perte de contrôle.\n• Erreur cardinale : casser aux hanches (charnière hanches au lieu de genoux) → perds le travail ischios.\n• Régression débutant : amplitude réduite 30° les 2 premières semaines (atterris vite).\n\n**Périodisation Petersen :**\n• Sem 1 : 1×5 (1 séance/sem).\n• Sem 2 : 2×6 (2 séances/sem).\n• Sem 3 : 3×6-8 (3 séances/sem).\n• Sem 4-10 : 3×8-10 (3 séances/sem en pré-saison, 1×/sem maintien post).\n→ Repos 2'30 entre séries.\n\n**B) Romanian deadlift haltères — 3×8 @ RPE 7 · tempo 3-0-1-0 · repos 90s**\n• Voir détail dans C_STR_BEGINNER_FOUNDATION_FULL.\n\n**C) Single-leg RDL — 3×8/jambe · repos 90s**\n• Voir détail dans C_STR_TRAIL_LATERAL_STABILITY.\n\n**D) Glute-ham raise machine (si dispo) — 2×8**\n• Position : sur machine GHR, pieds calés sous rouleaux, cuisses appuyées.\n• Exécution : depuis position pied au sol bras tendus, soulève le buste en utilisant ischios pour fléchir les genoux.\n• Régression : se passer si machine non dispo, Nordic + RDL suffisent.", []],
      ["Cool-down", "8' : foam roll ischios 3' (lent, points sensibles) + stretch ischios debout pied surélevé 30s/côté ×3.", []],
      ["Coaching", "Courbatures normales sem 1-2 (RBE prend 2-3 sem pour s'installer). Cycle 4+1 (3 semaines progression + 1 décharge).\nMaintien minimum 1×/sem AD VITAM pour conserver l'effet protecteur.\nProtocole non-négociable pour : marathon · semi · trail · soccer (origine).", []],
      ["Références", "Petersen J. et al. (2011, Am J Sports Med) N=942 footballeurs, -51% lésions ischios · van Dyk et al. (2019) confirmation -51%.", []]
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
      ["Warm-up", "3' : cat-cow + hip CARs lents 5/côté + bird-dog 2×8/côté.", []],
      ["Main", "**Bloc Mobilité (2 tours, exos lents et conscients)**\n\n**1) 90/90 hip switches — 10/côté**\n• Position : assis au sol, jambe avant pliée 90° devant (genou côté droit, pied vers la gauche), jambe arrière 90° sur côté.\n• Exécution : bascule lentement les genoux pour switcher (jambe arrière devient avant et vice-versa) en gardant le buste droit.\n• Sensation : étirement profond fessier + adducteurs.\n• Erreur : pencher le buste pour 'tricher' l'amplitude.\n\n**2) Couch stretch (psoas) — 60s/côté**\n• Position : genou arrière contre un mur ou un canapé, tibia vertical, jambe avant en fente.\n• Exécution : redresse le buste, serre fort le fessier de la jambe arrière, sens l'étirement psoas/quadris.\n• Sensation : étirement intense psoas/quadri jambe arrière.\n• Régression : pied arrière au sol (sans contre mur).\n\n**3) Pigeon pose active — 60s/côté**\n• Position : jambe avant pliée tibia perpendiculaire au corps, jambe arrière allongée.\n• Exécution : redresse le buste, sens l'étirement fessier jambe avant. Avancé : descends le buste sur l'avant-jambe.\n• Sensation : fessier jambe avant (piriforme).\n• Régression : avant-jambe moins perpendiculaire (jambe plus ramenée vers le centre).\n\n**4) Asian squat tenu — 90s**\n• Position : squat profond complet pieds à plat, talons collés au sol, fessiers près des chevilles.\n• Exécution : tiens la position, mains jointes devant, coudes qui poussent les genoux vers l'extérieur.\n• Sensation : mobilité chevilles, hanches, adducteurs.\n• Régression : cales sous talons si mobilité cheville insuffisante.\n\n**5) World's greatest stretch — 5/côté**\n• Voir détail dans D_MOBILITY_ROUTINE de la collection recovery.\n\n**Bloc Activation glutes (2 tours, repos 30s)**\n\n**6) Glute bridge mono-jambe tempo 2-2-2 — 12/côté**\n• Voir détail dans C_STR_CORE_INTEGRATED.\n\n**7) Clamshell élastique — 15/côté**\n• Position : allongé sur le côté, genoux pliés à 90°, élastique autour des cuisses au-dessus des genoux, pieds collés.\n• Exécution : ouvre le genou supérieur en gardant les pieds collés et le bassin immobile (pas de bascule).\n• Sensation : moyen fessier (lateral hip).\n• Erreur : bassin qui bascule en arrière.\n\n**8) Hip thrust haltère — 12 @ RPE 6**\n• Voir détail dans C_STR_MAX_LOWER_HEAVY (charge légère).\n\n**9) Monster walks élastique — 10 pas × 4 directions**\n• Position : élastique au-dessus des chevilles ou genoux, mini-squat.\n• Exécution : 10 pas latéraux à droite, 10 à gauche, 10 vers l'avant en diagonale, 10 vers l'arrière.\n• Sensation : moyen fessier constamment engagé.\n\n**10) Bird-dog tempo 3s pause — 8/côté**\n• Voir détail dans C_STR_CORE_INTEGRATED warm-up.", []],
      ["Cool-down", "3' respiration diaphragmatique nasale (4-6 in / 6-8 out).", []],
      ["Coaching", "Volume stable. Idéal en récup, avant qualité ou jour easy. Pas de décharge nécessaire.\nFréquence : 2-3×/sem minimum pour athlète sédentaire la journée (bureau).", []],
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
      ["Warm-up", "3' : mobilité cheville (dorsiflexion contre mur 12/côté + cercles cheville 10/sens + marche pointes/talons 30s chaque).", []],
      ["Main", "**A) Équilibre mono-jambe yeux ouverts/fermés — 30-45s × 2/côté**\n• Position : debout sur 1 pied, autre genou levé hanche fléchie 90°.\n• Sensation : pied qui ajuste en permanence, cheville stabilisatrice.\n• Progression sem 3 : sur coussin proprio. Sem 4 : yeux fermés.\n\n**B) Calf raise mono-jambe excentrique escalier — 3×12/jambe (descente 3s)**\n• Voir détail dans C_STR_SINGLE_LEG_RUNNER.\n\n**C) Sauts unipodaux contrôlés (avant/arrière/latéral/diagonal) — 3×6/direction/jambe · repos 60s**\n• Position : debout sur 1 pied.\n• Exécution : saute dans une direction (ex : avant), réception en équilibre 1s, saute dans la direction opposée, etc. 6 sauts × 4 directions = 24 sauts.\n• Sensation : cheville qui contrôle la réception sur tous les axes.\n\n**D) Renfo tibial antérieur (toe raises chargés ou poulie) — 3×15**\n• Position : assis ou debout, poids sur dessus des orteils (ou poulie attachée).\n• Exécution : lève les orteils vers le tibia contre la résistance, lent.\n• Sensation : tibial antérieur (devant du tibia).\n• Crucial pour prévention périostite tibiale.\n\n**E) Renfo péroniers (élastique éversion) — 3×15/côté**\n• Voir détail dans C_STR_TRAIL_LATERAL_STABILITY.\n\n**F) Short foot exercise (activation intrinsèques) — 3×10s × 5 répétitions/pied**\n• Position : assis, pieds à plat au sol, sans appuyer sur les orteils.\n• Exécution : raccourcis activement le pied en rapprochant la tête du gros orteil du talon (cambrer la voûte plantaire) SANS recourber les orteils.\n• Sensation : muscles intrinsèques du pied actifs (difficile à isoler au début).\n• Importance : foot core paradigm.\n\n**G) Pickup billes/serviette avec orteils — 2×30s/pied**\n• Position : assis, serviette au sol sous le pied.\n• Exécution : essaie de saisir/froisser la serviette avec les orteils.\n• Sensation : intrinsèques du pied + flexion plantaire active.", []],
      ["Cool-down", "3' : mobilité cheville + auto-massage voûte plantaire balle 1'/côté.", []],
      ["Coaching", "Progression : Surface dure → coussin proprio sem 3. Yeux fermés sem 4. Ajouter 1 perturbation externe (push partenaire) sem 6.\nIdéal couplé à C_STR_TRAIL_FOOT_TECHNIQUE pour trailers.", []],
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
      ["Warm-up", "3' : cat-cow + shoulder CARs 5/côté + thoracic rotations 8/côté.", []],
      ["Main", "**Bloc Mobilité (1 tour lent et conscient)**\n\n**1) Thoracic extension foam roll — 2×60s**\n• Position : allongé dos, foam roll placé HORIZONTALEMENT sous les omoplates, mains derrière la tête.\n• Exécution : laisse les côtes s'ouvrir vers le sol, respire amplement, glisse légèrement le rouleau (5cm) pour explorer différents segments thoraciques.\n• Sensation : ouverture cage thoracique, dos haut qui se déverrouille.\n• Erreur : creuser bas du dos → contracte les abdos pour stabiliser.\n\n**2) Open book — 10/côté tempo lent 3s pause**\n• Voir détail dans D_MOBILITY_ROUTINE recovery.\n\n**3) Wall slides (Y-T-W) — 2×10**\n• Position : dos contre mur, talons à 10cm du mur, bas du dos plaqué.\n• Exécution Y : bras en V au-dessus de la tête, fais glisser les bras vers le bas en gardant les coudes et le dos des mains EN CONTACT avec le mur.\n• Exécution T : bras à l'horizontale.\n• Exécution W : coudes pliés à 90°, bras en W.\n• Sensation : muscles posturaux du haut du dos qui résistent à la gravité.\n• Erreur : bras qui décollent du mur → recule jusqu'à pouvoir le faire.\n\n**4) Doorway pec stretch — 45s/côté ×2**\n• Position : debout dans encadrement de porte, avant-bras contre l'encadrement à 90°, avance d'un pas.\n• Sensation : étirement pectoraux profond.\n\n**5) Quadruped thoracic rotation — 8/côté**\n• Position : à 4 pattes, 1 main derrière la tête.\n• Exécution : tourne le buste pour amener le coude vers le plafond, puis sous le bras opposé.\n• Sensation : mobilité thoracique en rotation.\n\n**Bloc Renfo postural (3 tours, repos 45s)**\n\n**6) Band pull-apart — 3×15**\n• Voir détail dans C_STR_UPPER_PUSH_PULL finisher.\n\n**7) Face pull élastique/poulie — 3×15 lent**\n• Voir détail dans C_STR_TOTAL_BODY_45 Block C.\n\n**8) Prone Y-T-W au sol — 2×10 chaque lettre**\n• Position : allongé sur le ventre, front au sol, bras tendus.\n• Exécution Y : bras en Y, soulève les bras du sol en serrant les omoplates, tiens 1s. T : bras à l'horizontale. W : coudes pliés.\n• Sensation : muscles entre les omoplates (rhomboïdes, trapèzes moyens).\n\n**9) Scapular retraction prone — 2×12 tempo 2-2-2**\n• Position : allongé ventre, bras le long du corps.\n• Exécution : serre uniquement les omoplates vers la colonne en soulevant légèrement les épaules du sol.\n• Sensation : trapèzes moyens isolés.\n\n**10) Wall angels — 2×10**\n• Variation de wall slides en Y → W → Y lent.", []],
      ["Cool-down", "3' respiration nasale lente diaphragmatique.", []],
      ["Coaching", "Stable. Idéal après vélo >2h, avant natation, ou 1× soir bureau. Ajouter charge légère élastique sem 3.\nCyclistes ironman : NON-NÉGOCIABLE 3×/sem.", []],
      ["Références", "Janda (1987) — Upper Crossed Syndrome correction.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "mobility", "thoracic", "shoulder", "postural", "prehab"]
  },
  {
    id: "C_STR_KNEE_PREHAB_VMO",
    cat: "C",
    sport: "strength",
    objectif: "Préhab genou — VMO, alignement, prévention syndrome rotulien",
    necessite: "Recommandé",
    when: "Toute l'année (1-2×/sem) — préventif",
    phase: ["base", "build", "peak"],
    avoid: "Douleur rotulienne aiguë → consult médical",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "6' : vélo Z1 4' + activation glutes (clamshell 2×15) + mobilité hanches (90/90).", ["Z1"]],
      ["Main", "**A) Wall sit avec ballon entre genoux — 3×45s · repos 90s**\n• Position : dos contre mur, cuisses parallèles sol, ballon entre les genoux.\n• Exécution : tiens en serrant légèrement le ballon (active adducteurs+VMO).\n• Sensation : VMO (vastus medialis, partie médiale du quadri qui stabilise la rotule).\n\n**B) Terminal knee extension (TKE) élastique — 3×15/jambe**\n• Position : élastique fixé bas, autour du genou par derrière, debout face à l'ancrage, légère flexion genou.\n• Exécution : tends activement le genou (verrouille la jambe) en serrant fort le quadri.\n• Sensation : VMO contraction maximale en fin d'extension.\n\n**C) Step-down contrôlé boîte 30cm — 3×10/jambe · repos 60s**\n• Voir détail dans C_STR_ECC_DOWNHILL_PROTOCOL (sans charge).\n• Focus : alignement genou-pointe-2ème orteil, pas de valgus.\n\n**D) Single-leg squat alignement miroir — 3×6/jambe**\n• Position : devant un miroir, sur 1 pied.\n• Exécution : descends en single-leg squat (jambe libre tendue devant), vérifie alignement genou.\n• Sensation : si genou rentre → contracter activement le fessier pour le ramener.\n\n**E) Side-lying leg raise (moyen fessier) — 3×15/côté**\n• Position : allongé sur le côté, jambe du dessous fléchie, jambe du dessus tendue.\n• Exécution : lève la jambe tendue à 45°, tiens 2s, descends lent.\n• Sensation : moyen fessier (clé pour empêcher chute du genou en valgus).\n\n**F) Foam roll bandelette IT — 1'/côté + stretch quadri**\n• Position : allongé sur le côté, foam roll sous l'extérieur de la cuisse.\n• Exécution : roule lentement, pause sur points sensibles.", []],
      ["Cool-down", "5' : marche + stretch quadris 30s/côté ×2.", []],
      ["Coaching", "Cible : coureur avec valgus dynamique (genou qui rentre à l'atterrissage) ou antécédent syndrome rotulien.\nFréquence : 2×/sem en prévention, 3×/sem en réhab post-douleur.", []],
      ["Références", "Powers (2010) — proximal control & knee injuries.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "knee", "vmo", "prehab", "patellofemoral"]
  },
  {
    id: "C_STR_LOWER_BACK_BULLETPROOF",
    cat: "C",
    sport: "strength",
    objectif: "Dos bas blindé — McGill Big 3 + renforcement profond",
    necessite: "Recommandé",
    when: "Toute l'année (2-3×/sem)",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Lombalgie aiguë → consult kiné",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "5' : cat-cow + hip CARs + glute bridge 2×12.", []],
      ["Main", "**Big 3 McGill — référence prévention lombalgie**\n\n**1) McGill curl-up — 3×10 avec pause 8s**\n• Voir détail dans C_STR_TRAIL_CORE_BACKPACK.\n\n**2) Side plank — 3×30s/côté tempo croissant**\n• Position : sur le côté, avant-bras au sol, pieds empilés.\n• Exécution : soulève les hanches, corps parfaitement aligné des pieds à la tête.\n• Sensation : obliques + carré des lombes.\n• Erreur : hanches qui chutent.\n• Régression : genoux pliés au sol (knees side plank).\n\n**3) Bird-dog tempo 3s pause — 3×8/côté**\n• Voir détail dans C_STR_CORE_INTEGRATED warm-up.\n\n**Renfo profond complémentaire**\n\n**4) Hip airplane — 3×6/côté**\n• Position : debout sur 1 pied, buste penché à l'horizontale (single-leg deadlift position statique), bras en croix.\n• Exécution : fais pivoter le buste autour de la jambe d'appui (rotation interne/externe hanche), lent contrôlé.\n• Sensation : stabilité hanche + équilibre.\n• Régression : main appui mur.\n\n**5) Pallof press anti-rotation isométrique — 3×30s/côté**\n• Voir détail dans C_STR_CORE_INTEGRATED.\n\n**6) Reverse hyper (machine ou banc romain) — 3×10**\n• Position : ventre sur banc romain ou machine reverse hyper, jambes dans le vide.\n• Exécution : lève les jambes tendues jusqu'à alignement avec le tronc, descends lent.\n• Sensation : ischios + fessiers + lombaires bas.\n• Régression : sur ballon avec mains au sol.", []],
      ["Cool-down", "5' : knees-to-chest 60s + stretch lombaires 60s + child pose.", []],
      ["Coaching", "Protocole McGill Big 3 : faire les 3 exos QUOTIDIENNEMENT idéalement (5-10 min), même les jours off.\nLe dos se renforce par endurance isométrique, PAS par crunchs.\nDouleur lombaire chronique : consulter kiné avant ce protocole.", []],
      ["Références", "McGill S. (2016) Low Back Disorders 3e éd · Big 3 protocol.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "lower-back", "mcgill", "prehab", "core"]
  },
  {
    id: "C_STR_GLUTE_REACTIVATION",
    cat: "C",
    sport: "strength",
    objectif: "Réactivation fessiers — antidote 'glute amnesia' bureau/voiture",
    necessite: "Recommandé",
    when: "Toute l'année (2-3×/sem) — surtout si sédentaire la journée",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [20, 30],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "5' : marche + leg swings 10/jambe + hip CARs 5/côté.", []],
      ["Main", "**Circuit 3 tours, repos 60s entre tours, enchaîne sans pause**\n\n**1) Glute bridge tempo 2-2-2 — 15 reps**\n• Voir détail dans C_STR_MAX_LOWER_HEAVY warm-up.\n\n**2) Single-leg glute bridge — 10/jambe**\n• Voir détail dans C_STR_CORE_INTEGRATED.\n\n**3) Clamshell élastique tempo lent — 15/côté**\n• Voir détail dans C_STR_HIP_MOBILITY_DYNAMIC.\n\n**4) Hip thrust haltère 10kg — 12 reps tempo 2-1-2-0**\n• Voir détail dans C_STR_MAX_LOWER_HEAVY (charge légère).\n\n**5) Bird-dog tempo 3s pause — 8/côté**\n\n**6) Monster walks élastique — 10 pas × 4 directions**\n• Voir détail dans C_STR_HIP_MOBILITY_DYNAMIC.\n\n**7) Reverse lunge avec contraction fessier max en bas — 8/jambe**\n• Voir détail dans C_STR_BODYWEIGHT_HOME.\n• Focus : 1s pause en bas en CONTRACTANT volontairement le fessier de la jambe avant.\n\n**8) Side-lying leg raise — 12/côté**\n• Voir détail dans C_STR_KNEE_PREHAB_VMO.", []],
      ["Cool-down", "5' : pigeon pose 60s/côté + couch stretch 45s/côté.", []],
      ["Coaching", "Cible : athlète qui passe >6h/jour assis. Les fessiers s'éteignent (inhibition réciproque par psoas raccourci).\nFréquence : 3×/sem minimum, idéal en mini-circuit le matin (10') quotidien.\nAprès cette routine : vérifie sensation 'fessiers actifs' lors de tes prochaines courses.", []],
      ["Références", "Beardsley & Contreras (2014) — glute EMG comparisons.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "glute", "activation", "prehab", "sedentary"]
  },
  {
    id: "C_STR_TIBIAL_SHIN_SPLINTS",
    cat: "C",
    sport: "strength",
    objectif: "Prévention périostite tibiale — tibial antérieur & postérieur",
    necessite: "Recommandé",
    when: "Augmentation volume CAP, retour de blessure, ou antécédent périostite",
    phase: ["base", "build"],
    avoid: "Périostite aiguë (douleur >5/10 en course) → repos + kiné",
    durationMin: [20, 30],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: mk([
      ["Warm-up", "5' : marche pointes/talons alternés 30s × 2 + cercles cheville + mobilité cheville mur.", []],
      ["Main", "**A) Toe raise chargé (tibial antérieur) — 3×15 · repos 60s**\n• Position : debout dos contre mur, talons collés au mur, poids sur les orteils.\n• Exécution : lève les orteils + dessus du pied vers le tibia, tiens 1s en haut, descends 2s.\n• Sensation : tibial antérieur en feu (devant du tibia).\n• Variation chargée : haltère sur le dessus des pieds (assis) ou machine Tib bar.\n\n**B) Heel walks — 3×30m**\n• Position : debout sur les talons, orteils relevés au max.\n• Exécution : marche sur les talons uniquement, orteils en l'air.\n• Sensation : tibial antérieur en travail constant.\n\n**C) Calf raise isométrique mi-amplitude — 4×30s · repos 90s**\n• Voir détail dans C_STR_CALF_ISO_HEAVY exo B.\n\n**D) Soléaire assis chargé — 3×12 tempo 2-1-2-0**\n• Voir détail dans C_STR_CALF_ISO_HEAVY exo C.\n\n**E) Single-leg calf raise excentrique — 3×12/jambe (descente 4s)**\n• Voir détail dans C_STR_CALF_ISO_HEAVY exo D.\n\n**F) Tibial postérieur (élastique inversion) — 3×15/côté**\n• Position : assis, élastique autour de l'avant-pied, ancré côté latéral.\n• Exécution : inverse le pied (pointe vers l'intérieur) contre la résistance lent.\n• Sensation : tibial postérieur (clé voûte plantaire + prévention périostite).\n\n**G) Short foot exercise — 3×10s × 5 répétitions/pied**\n• Voir détail dans C_STR_ANKLE_FOOT_COMPLEX.", []],
      ["Cool-down", "5' : stretch mollets + auto-massage tibial antérieur (balle de tennis) + mobilité cheville.", []],
      ["Coaching", "Préventif si augmentation kilométrage hebdo >10%. Curatif léger en début de symptômes (douleur <3/10 uniquement, sinon repos).\nFréquence : 2-3×/sem en préventif. Coupler avec analyse foulée (overstride = facteur risque #1).", []],
      ["Références", "Yates & White (2004) — medial tibial stress syndrome risk factors.", []]
    ]),
    variants: {},
    goals: ["marathon", "semi", "10k", "trail_short"],
    tags: ["strength", "tibial", "shin-splints", "prehab", "cap"]
  },

  // ═════════════════════════════════════════════════════════════════════
  // FAMILLE 5 — CYCLISTE-SPÉCIFIQUE
  // ═════════════════════════════════════════════════════════════════════
  {
    id: "C_STR_CYCLIST_PEDAL_POWER",
    cat: "C",
    sport: "strength",
    objectif: "Force de pédalage — Rønnestad allégé spécial cycliste",
    necessite: "Recommandé",
    when: "Base & début Build (≥10 sem avant événement A)",
    phase: ["base", "build"],
    avoid: "Tapering · Fatigue >7/10",
    durationMin: [45, 60],
    metricKey: "cardiaque",
    sportKey: "vélo",
    structure: mk([
      ["Warm-up", "12' : 5' vélo Z1 + activation glutes + 2 séries montantes squat.", ["Z1"]],
      ["Main", "Protocole Rønnestad pour cyclistes : 4×4 lourd → gains économie pédalage + Wmax +6-8% (Rønnestad 2010, 2017).\n\n**A) Back squat — 4×4 @ 85-90% 1RM · tempo 2-0-1-0 · repos 3'**\n• Voir détail dans C_STR_MAX_LOWER_HEAVY.\n\n**B) Leg press unilatéral — 3×6/jambe @ RPE 8 · repos 2'30**\n• Position : assis machine leg press, 1 pied au centre plateforme.\n• Exécution : descends contrôlé 2s, pousse 1s explosif (simule poussée pédale).\n• Sensation : quadris + fessiers unilatéraux puissants.\n• Avantage vs back squat : pas de charge axiale sur la colonne (récup vélo).\n\n**C) Hip thrust barre — 3×6 @ RPE 8**\n• Voir détail dans C_STR_MAX_LOWER_HEAVY.\n• Crucial cycliste : les fessiers sont sous-utilisés en position assise vélo, ce qui crée déséquilibre quadri-dominant.\n\n**D) Romanian deadlift — 3×6 @ RPE 8 · repos 2'**\n• Voir détail dans C_STR_BEGINNER_FOUNDATION_FULL.\n\n**E) Renfo arrière (face pull + band pull-apart, 2 tours, repos 45s)**\n• Voir détail dans C_STR_THORACIC_POSTURAL_RESET.\n• Importance : compense la posture fermée du vélo.", []],
      ["Cool-down", "8' : vélo Z1 5' (jambes qui tournent) + mobilité hanches 3'.", ["Z1"]],
      ["Coaching", "Progression : Sem 1-2 : 4×4 @ 85%. Sem 3-4 : 4×4 @ 87-90%. Sem 5 décharge. Cycle 4+1. Maintien 1×/sem peak.\nIdéal : faire muscu et vélo dans des journées séparées de 6h+ (matin muscu / soir vélo easy).", []],
      ["Références", "Rønnestad B.R. et al. (2010, 2017) — heavy strength training cyclistes élite.", []]
    ]),
    variants: { ironman: "Volume identique, fréquence 1×/sem en build" },
    goals: ["ironman", "half"],
    tags: ["strength", "cyclist", "pedal-power", "ronnestad"]
  },
  {
    id: "C_STR_CYCLIST_NECK_BACK",
    cat: "C",
    sport: "strength",
    objectif: "Cou & dos cycliste — survivre aux longues sorties en aéro",
    necessite: "Recommandé",
    when: "Toute l'année (1-2×/sem) — surtout build IM",
    phase: ["base", "build", "peak"],
    avoid: "Cervicalgie aiguë",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "vélo",
    structure: mk([
      ["Warm-up", "5' : marche + shoulder CARs + scapular CARs + chin tucks 10.", []],
      ["Main", "**A) Chin tucks — 3×10 tempo 5s pause**\n• Position : debout dos contre mur, talons à 10cm, bas du dos plaqué.\n• Exécution : rentre le menton vers la nuque (comme un 'double menton') en gardant l'arrière de la tête contre le mur, tiens 5s.\n• Sensation : muscles fléchisseurs profonds du cou (deep neck flexors).\n• Erreur : pencher la tête au lieu de la translater horizontalement.\n\n**B) Cervical extension prone — 3×10 pause 3s**\n• Position : allongé ventre, front au sol, mains derrière les fessiers.\n• Exécution : soulève la tête et le buste haut du sol en utilisant les extenseurs cervicaux + dorsaux hauts, tiens 3s.\n• Sensation : nuque + dos haut.\n\n**C) Y-T-W prone — 3×8 chaque lettre**\n• Voir détail dans C_STR_THORACIC_POSTURAL_RESET.\n\n**D) Face pull élastique — 3×15**\n• Voir détail dans C_STR_TOTAL_BODY_45.\n\n**E) Foam roll thoracique extension — 3×60s**\n• Voir détail dans C_STR_THORACIC_POSTURAL_RESET.\n\n**F) Doorway pec stretch — 60s/côté ×2**\n• Voir détail dans C_STR_THORACIC_POSTURAL_RESET.\n\n**G) Cat-cow + thoracic rotations dynamiques — 2 tours**\n• Cat-cow 10 cycles + thoracic rotations à 4 pattes 8/côté.", []],
      ["Cool-down", "5' : respiration nasale lente + mobilité cou (rotations lentes 5/sens + flexions latérales 5/côté).", []],
      ["Coaching", "Fréquence : 2×/sem en bloc IM (sorties >4h en aéro). 1×/sem hors IM.\nIdéal : faire 5' chin tucks + Y-T-W prone tous les jours de sortie longue.", []],
      ["Références", "Janda (1987) — Upper Crossed Syndrome.", []]
    ]),
    variants: {},
    goals: ["ironman", "half"],
    tags: ["strength", "cyclist", "neck", "back", "aero", "prehab"]
  }
];
