// =============================================
// ENRICHED WORKOUTS — RECOVERY & REST (Cat D/Récup)
// Séances dédiées récupération, régénération, mobilité, respiration, mental.
//
// F40 disambiguation : ceci est le CATALOGUE de séances (consommé par la
// bibliothèque + le générateur de plan IA). La nutrition post-effort (CHO/protéines/
// fluides) vit dans `src/lib/recoveryProtocol.ts`.
//
// v2 (enrichissement coaching débutant/intermédiaire) :
//   - Chaque séance décompose Warm-up / Main / Cool-down / Coaching pas-à-pas.
//   - Exos détaillés : position de départ, exécution, respiration, durée/reps,
//     sensation cible, erreurs à éviter, regression débutant.
//   - Langue uniformément FR, vocabulaire accessible, pas d'anglais sans glose.
// =============================================

import { LibraryWorkout, WorkoutGoal } from "@/types/workoutLibrary";

const GOALS_ALL: WorkoutGoal[] = ["ironman", "half", "marathon", "semi", "10k"];
const GOALS_TRI: WorkoutGoal[] = ["ironman", "half"];
const GOALS_TRAIL: WorkoutGoal[] = ["trail_short", "trail_mountain", "trail_long", "trail_ultra"];

function mk(parts: [string, string, string[]][]) {
  return parts.map(([part, text, zones]) => ({ part, text, zones }));
}

export const EnrichedWorkoutsRecovery: LibraryWorkout[] = [

  // ── REST COMPLET ──
  {
    id: "REST_FULL_DAY",
    cat: "REST", sport: "mixed",
    objectif: "Repos complet — aucune activité physique. Sommeil, hydratation, nutrition",
    necessite: "Obligatoire",
    when: "Après bloc intensif, semaine taper, ou fatigue >8/10",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [0, 0],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Aucune séance. Le repos EST l'entraînement aujourd'hui — c'est pendant ces journées que les adaptations se construisent (réparation musculaire, consolidation neuro, baisse du cortisol).\n\nCheck-list du jour :\n• Sommeil : viser 8-9h, coucher avant 23h. Pas d'écran 60' avant.\n• Hydratation : 30-35 ml/kg/jour (≈ 2,2-2,5 L pour 70 kg). Urines couleur paille claire.\n• Alimentation : protéines à chaque repas (1,6-2 g/kg/jour), glucides complets, légumes, oméga-3.\n• Marche douce <20' tolérée si besoin de bouger (≠ entraînement).\n• Étirements passifs très légers autorisés (10' max) sans recherche d'amplitude.\n• Interdits : muscu, course, vélo, natation, HIIT, sauna intense, alcool.", []]
    ]),
    variants: { ironman: "1-2x/sem", half: "1x/sem", marathon: "1x/sem", semi: "1x/sem" },
    goals: GOALS_ALL,
    tags: ["rest", "recovery", "repos"]
  },
  {
    id: "REST_ACTIVE_WALK",
    cat: "Récup", sport: "mixed",
    objectif: "Récupération active par marche — circulation sans stress mécanique",
    necessite: "Recommandé",
    when: "Lendemain séance clé ou longue sortie",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Si douleur articulaire",
    durationMin: [20, 40],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Main", "Marche facile en extérieur, terrain plat, 20-40'. Objectif = pomper le sang sans solliciter les fibres musculaires.\n\nExécution pas-à-pas :\n• Cadence : naturelle, ~100-120 pas/min. Tu dois pouvoir chanter, pas seulement parler.\n• Respiration : 100% nasale (inspire 4s / expire 6s). Si tu dois ouvrir la bouche, ralentis.\n• Posture : épaules relâchées en arrière, regard à l'horizon (pas le téléphone), bras qui se balancent librement.\n• Fréquence cardiaque cible : < 65% FCmax. Si tu n'as pas de cardio, sers-toi du test de la parole.\n• Pauses autorisées : aucune nécessaire, mais possible.\n\nRegression débutant : 20' suffit. Progression intermédiaire : 40' avec 4-5 micro-pauses pour mobilité chevilles (5 cercles/côté).", ["Z1"]]
    ]),
    variants: { ironman: "30-40'", half: "20-30'", marathon: "30'", semi: "20'" },
    goals: GOALS_ALL,
    tags: ["rest", "recovery", "marche", "active"]
  },

  // ── MOBILITÉ / YOGA ──
  {
    id: "D_MOBILITY_ROUTINE",
    cat: "D", sport: "mixed",
    objectif: "Mobilité articulaire ciblée — hanches, chevilles, épaules, thoracique",
    necessite: "Recommandé",
    when: "Toute l'année, 2-3x/semaine idéal",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [15, 30],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "3' d'activation circulatoire : marche sur place avec montées de genoux 30s + cercles d'épaules avant/arrière 10/sens + balancements jambe libre 10/jambe.", []],
      ["Main", "Circuit de 5 mouvements, 2 tours. Respiration ample tout du long (inspire nez 4s / expire bouche 6s).\n\n1) **90/90 hanches** (rotation interne/externe). Position : assis au sol, jambe avant pliée à 90° devant, jambe arrière à 90° sur le côté. Bascule lentement d'un côté à l'autre en gardant le buste droit. 8 oscillations/côté. Sensation : étirement profond fessier/adducteurs. Erreur : pencher le buste pour 'tricher'.\n\n2) **World's greatest stretch** (fente avec rotation). Fente avant pied droit, main gauche au sol près du pied droit, main droite vers le plafond (rotation thoracique). Tiens 3 respirations, change. 4/côté. Sensation : étirement psoas + ouverture thoracique. Regression débutant : main droite sur la hanche au lieu du plafond.\n\n3) **Cat-cow** (chat/vache). À 4 pattes, mains sous épaules, genoux sous hanches. Inspire en creusant le bas du dos + regard haut (vache). Expire en arrondissant + menton vers poitrine (chat). 10 cycles lents. Sensation : vagues le long de la colonne.\n\n4) **Rotations thoraciques 'open book'**. Allongé sur le côté, genoux pliés à 90°, bras tendus devant. Ouvre le bras du dessus comme un livre vers le sol opposé, suis avec le regard. 8/côté. Sensation : ouverture milieu du dos.\n\n5) **Ankle CARs** (rotations contrôlées de cheville). Assis ou debout, pied levé, dessine le plus grand cercle possible avec l'orteil, lentement. 8 dans un sens / 8 dans l'autre, par cheville. Sensation : amplitude max sans douleur.\n\nDurée totale main : 12-22' selon vitesse d'exécution. Ne PAS chercher la souffrance, mais l'amplitude libre.", []],
      ["Cool-down", "2' : posture de l'enfant (genoux écartés, fesses sur talons, bras tendus devant, front au sol) + 5 respirations lentes.", []],
      ["Coaching", "Fréquence : 2-3×/semaine. À faire le soir devant la TV ou le matin au réveil. Si une zone tire fort, ralentir, ne jamais forcer en bout d'amplitude. Si une articulation craque sans douleur = normal. Si douleur aiguë = stop ce mouvement.", []]
    ]),
    variants: { ironman: "Focus hanches+épaules (allonger 90/90 et open book)", half: "Focus hanches+épaules", marathon: "Focus hanches+chevilles (doubler ankle CARs)", semi: "Focus hanches+chevilles" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["mobility", "recovery", "prévention"]
  },
  {
    id: "D_YOGA_ATHLETE",
    cat: "D", sport: "mixed",
    objectif: "Yoga athlète — étirements actifs, respiration, relâchement musculaire",
    necessite: "Optionnel",
    when: "Fin de journée ou jour de repos",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [20, 45],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "3' assis en tailleur, yeux fermés. Respiration 4s inspire nez / 6s expire nez. Pose ton intention : 'je relâche, je n'optimise pas'.", []],
      ["Main", "Enchaînement de postures (flow). Tiens chaque posture 5 respirations lentes (≈ 30-40s).\n\n1) **Salutations au soleil A (2 cycles)** — chien tête en bas → planche → chaturanga (genoux au sol pour débutant) → cobra → chien tête en bas. Lien respiration/mouvement : 1 mouvement = 1 souffle.\n\n2) **Guerrier I (Virabhadrasana I)** — fente avant, pied arrière à 45°, bras tendus vers le ciel. Bassin face avant, hanche arrière qui descend. 5 respirations/côté. Sensation : ouverture psoas avant, force jambes.\n\n3) **Guerrier II** — depuis Guerrier I, ouvre le bassin sur le côté, bras à l'horizontale. Regard sur la main avant. 5 respirations/côté.\n\n4) **Triangle (Trikonasana)** — depuis Guerrier II, tends la jambe avant, main avant qui descend sur le tibia (ou bloc), main arrière vers le ciel. 5 respirations/côté. Erreur : arrondir le dos pour aller toucher le sol. Garde-le long.\n\n5) **Pigeon (Eka Pada Rajakapotasana)** — jambe avant pliée tibia perpendiculaire, jambe arrière allongée. Buste posé sur l'avant-jambe (ou redressé pour débutant). 6 respirations/côté. Sensation : étirement profond fessier (piriforme). À ne JAMAIS forcer.\n\n6) **Pince debout (Uttanasana)** — debout, expire en pliant en avant à partir des hanches, mains au sol ou sur les tibias, genoux légèrement fléchis. 5 respirations.\n\n7) **Pont (Setu Bandha)** — allongé sur le dos, pieds au sol près des fessiers, soulève le bassin en serrant les fessiers. 5 respirations puis redescends vertèbre par vertèbre. 2 répétitions.\n\n8) **Shavasana (posture du cadavre)** — allongé sur le dos, bras en croix paumes vers le haut, jambes écartées. 3-5' en respiration libre. Scan corporel mental des pieds vers la tête.\n\nDurée Main : 15-40' selon nombre de cycles guerriers et durée du shavasana.", []],
      ["Cool-down", "2' assis tailleur, mains sur les genoux, 10 respirations conscientes. 'Mon corps est récupéré, je suis prêt(e) pour la prochaine séance.'", []],
      ["Coaching", "Niveau débutant : 20' avec 1 seul cycle guerrier + shavasana 5'. Intermédiaire : 30-45' avec 2 cycles + transitions fluides. Important : pas d'égo dans le yoga — la posture la plus simple bien exécutée vaut 10 versions forcées.", []]
    ]),
    variants: { ironman: "Ajouter yin yoga post-longue sortie (voir D_YOGA_YIN_DEEP)", half: "30' standard", marathon: "Focus jambes (doubler pigeon + pince)", semi: "20' express : sun salutations + shavasana" },
    goals: GOALS_ALL,
    tags: ["yoga", "recovery", "flexibility"]
  },

  // ── RÉCUP ACTIVE SPORT-SPÉCIFIQUE ──
  {
    id: "D_RUN_SHAKEOUT",
    cat: "D", sport: "course",
    objectif: "Shakeout run — déverrouillage musculaire pré-compétition ou post-charge",
    necessite: "Recommandé",
    when: "J-1 course ou lendemain longue sortie",
    phase: ["peak", "taper"],
    avoid: "Si douleur",
    durationMin: [15, 25],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "3' marche dynamique avec montées de genoux légères + cercles de bras + 5 squats à poids de corps.", []],
      ["Main", "**Bloc 1 — 12 à 20' Z1 stricte** (allure très facile, FC <70% max). Tu dois pouvoir tenir une conversation complète. Foulée courte, cadence légèrement plus haute que d'habitude (180+ pas/min) pour stimuler le système nerveux sans charger les muscles.\n\n**Bloc 2 — 4×20\" accélérations progressives**. Après le bloc Z1 facile, exécute 4 lignes droites sur 100-150m :\n• 20\" : tu pars en footing puis tu accélères PROGRESSIVEMENT pour finir à allure 5K à la dernière seconde. Aucune raideur, aucun blocage.\n• 40\" de marche entre chaque ligne droite (récup complète).\n• Objectif = réveiller la chaîne propulsive, pas faire un test.\n\nNi capteur ni chrono nécessaire — tout est aux sensations.", ["Z1"]],
      ["Cool-down", "2' marche + 5 respirations profondes + étirement debout mollet/quadri (15s/côté, sans forcer).", []],
      ["Coaching", "But = 'allumer la machine' la veille d'une course, PAS s'entraîner. Si tu ressens fatigue ou douleur en début de séance, raccourcis à 10' Z1 sans accélérations. La veille d'une course majeure : faire le shakeout le matin si la course est l'après-midi, ou l'après-midi si course le matin.", []]
    ]),
    variants: { ironman: "Après brick", half: "J-1 course", marathon: "J-1 marathon", semi: "J-1 semi" },
    goals: GOALS_ALL,
    tags: ["shakeout", "recovery", "activation", "pré-compétition"]
  },
  {
    id: "D_BIKE_SPIN_EASY",
    cat: "D", sport: "cyclisme",
    objectif: "Spin facile — flush lactate, cadence haute sans charge",
    necessite: "Recommandé",
    when: "Lendemain intervalles vélo ou J-1 compétition",
    phase: ["build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [20, 40],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "5' Z1 cadence libre (80-90 rpm), résistance minimale.", ["Z1"]],
      ["Main", "20-40' continu en Z1 strict.\n• Cadence cible : 90-100 rpm (jambes qui 'tournent' rapidement sans pousser fort).\n• Puissance : <55% FTP (si tu n'as pas de capteur, cible 'je sens à peine la pédale').\n• Respiration : 100% nasale.\n• Position : relâche les épaules toutes les 5', décroche un bras à tour de rôle pour relâcher la nuque.\n\nL'objectif est de pomper le sang dans les jambes pour évacuer les déchets, PAS de produire de la puissance. Si tu transpires beaucoup ou que tu deviens essoufflé, ralentis encore.", ["Z1"]],
      ["Cool-down", "2' cadence libre <80 rpm + 3' descente de vélo et marche douce.", []],
      ["Coaching", "Indoor (home trainer) recommandé pour éviter les côtes/sprints. Si en extérieur, choisis un parcours 100% plat. Regarde un film ou écoute un podcast — c'est une séance plaisir.", []]
    ]),
    variants: { ironman: "30-40'", half: "20-30'", marathon: "optionnel", semi: "optionnel" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["spin", "recovery", "flush"]
  },
  {
    id: "D_SWIM_LOOSEN",
    cat: "D", sport: "natation",
    objectif: "Nage de récupération — relâchement épaules et activation douce",
    necessite: "Recommandé",
    when: "Lendemain charge ou semaine taper",
    phase: ["build", "peak", "taper"],
    avoid: "Douleur épaule",
    durationMin: [20, 35],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "200m multi-nages très facile : 50m crawl + 50m dos + 50m brasse + 50m crawl. Pas de chrono, focus sur la glisse.", ["Z1"]],
      ["Main", "**Série A — 4×100m crawl avec pull-buoy**, allure très facile, repos 15\" :\n• Pull-buoy entre les cuisses pour relâcher les jambes (épaules font tout le boulot, mais en mode souple).\n• Sensation : longues coulées, mains qui entrent loin devant l'épaule, expire long sous l'eau.\n• Si pas de pull-buoy : crawl 'glissé' avec 6 battements par cycle de bras.\n\n**Série B — 4×50m dos crawlé**, repos 10\" :\n• Excellent pour ouvrir la cage thoracique et étirer la posture après vélo.\n• Doigts qui pointent au plafond à la sortie de l'eau, regard fixe sur le plafond.\n\n**Optionnel — 2×50m brasse souple** pour relâcher les hanches.", ["Z1"]],
      ["Cool-down", "200m facile en alternant 25m crawl / 25m sur le dos. Sors de l'eau lentement, étirement épaules au mur 20\"/côté.", ["Z1"]],
      ["Coaching", "Aucun chrono, aucun virage poussé fort, aucune jambe forcée. Si tes épaules sont tendues, retire 1 série de pull. Idéal en eau libre l'été (lac plat, sans courant).", []]
    ]),
    variants: { ironman: "Excellent", half: "Excellent", marathon: "—", semi: "—" },
    goals: GOALS_TRI,
    tags: ["recovery", "natation", "loosen"]
  },

  // ── FOAM ROLLING / AUTO-MASSAGE ──
  {
    id: "D_FOAM_ROLLING",
    cat: "D", sport: "mixed",
    objectif: "Auto-massage foam roller — réduction tonus musculaire, prévention adhérences",
    necessite: "Recommandé",
    when: "Post-entraînement ou jour de repos",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Zone blessée aiguë, hématome, varices marquées",
    durationMin: [10, 20],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "1' de respiration profonde au sol : inspire 4s / expire 6s. Préviens ton corps que tu vas le travailler en profondeur.", []],
      ["Main", "Parcours 6 zones, 30-45\" par passage, 2 passages par zone. Respiration LENTE pendant chaque passage (jamais d'apnée). Si tu trouves un point très sensible, reste dessus 20-30\" sans bouger jusqu'à ce que la douleur diminue de moitié.\n\n1) **Quadriceps** — face contre le rouleau, appui sur les avant-bras, rouleau juste au-dessus du genou. Roule lentement de mi-cuisse jusqu'au-dessus du genou. 2 passages chaque jambe. Erreur : passer sur le genou (interdit).\n\n2) **TFL/IT band** (face latérale cuisse) — sur le côté, hanche du dessous sur le rouleau, jambe du dessus pliée devant. Roule de la hanche jusqu'au-dessus du genou. Très sensible la 1ère fois — respire fort, ne pas pleurer 😉. 2 passages.\n\n3) **Mollets** — assis au sol, jambes tendues, rouleau sous le mollet. Croise l'autre jambe par-dessus pour amplifier la pression. Roule de la cheville jusqu'au creux du genou. Pour intensifier : tourne le pied vers l'intérieur puis l'extérieur. 2 passages/jambe.\n\n4) **Fessiers / piriforme** — assis sur le rouleau, croise la cheville droite sur le genou gauche (figure 4), penche-toi sur la fesse droite. Roule en petits cercles 30\". Change. Soulagement +++ pour les coureurs.\n\n5) **Adducteurs** (intérieur de cuisse) — face contre sol, cuisse écartée sur le côté à 90°, rouleau perpendiculaire à la cuisse, entre le genou et l'aine. Roule lentement. 2 passages/jambe. Aine = STOP.\n\n6) **Dorsaux / haut du dos** — allongé sur le dos, rouleau sous les omoplates, mains derrière la tête, bassin levé. Roule du milieu du dos jusqu'au haut. Tu peux laisser tomber la tête en arrière pour ouvrir la poitrine. Ne PAS rouler sur le bas du dos (lombaires).", []],
      ["Cool-down", "1' allongé sur le dos, jambes pliées, respiration ample. Sens la circulation dans les jambes.", []],
      ["Coaching", "Échelle de douleur : vise 6/10 max ('inconfort qui se relâche'), jamais 9/10. Si tu n'as pas de rouleau : balle de tennis (point précis) ou bouteille d'eau gelée (mollets). Fréquence : 3-4×/semaine post-entraînement ou en soirée.", []]
    ]),
    variants: { ironman: "Ajouter piriforme et TFL (3 passages)", half: "Standard", marathon: "Focus mollets+quads (3 passages)", semi: "15' express : quads + mollets + fessiers" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["foam-rolling", "recovery", "auto-massage"]
  },

  // ── ACTIVATION PRÉ-COMPÉTITION ──
  {
    id: "D_ACTIVATION_PRERACE",
    cat: "D", sport: "mixed",
    objectif: "Activation neuromusculaire pré-course — primers sans fatigue",
    necessite: "Recommandé",
    when: "J-1 ou matin jour de course",
    phase: ["peak", "taper"],
    avoid: "N/A",
    durationMin: [15, 25],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "5' marche dynamique avec montées de genoux légères + balancements de bras avant/arrière + 10 rotations de bassin/côté.", []],
      ["Main", "Circuit d'activation, 1 seul tour, focus qualité technique. Tu dois sortir 'allumé' mais PAS fatigué.\n\n1) **10 squats poids de corps** lents. Descente 3s, montée 1s. Genoux dans l'axe des orteils, talons au sol. Sensation : fessiers qui s'activent.\n\n2) **10 fentes alternées**. Grand pas en avant, genou avant à 90°, genou arrière vers le sol sans le toucher. Pousse sur le talon avant pour remonter. 5/jambe.\n\n3) **10 hip circles/côté** (cercles de hanche, jambe libre). Debout en appui sur 1 jambe (tiens un mur), trace un grand cercle avec le genou de l'autre jambe (5 avant + 5 arrière). Active fessier moyen + ouverture hanche.\n\n4) **4×10\" sprints sur place**. Cuisses qui montent à l'horizontale, bras dynamiques, rapide mais pas max. R = 20s marche. Sensation : système nerveux qui se réveille.\n\n5) **2×30\" saut à la corde** (ou simulé). Cadence rapide, pieds bas, rebond élastique. R = 30s.", []],
      ["Cool-down", "5' marche + 10 respirations profondes (4s inspire / 6s expire). Visualise ton départ de course (cool, fluide, en confiance).", []],
      ["Coaching", "JAMAIS de douleur, JAMAIS d'essoufflement. Tu ne dois PAS être fatigué après. Si tu sens un truc qui tire, raccourcis ou supprime ce mouvement. Idéal : 15-25' avant le repas du soir J-1.", []]
    ]),
    variants: { ironman: "Ajouter arm swings (10 cercles bras chaque sens)", half: "Standard", marathon: "Focus jambes (doubler fentes)", semi: "Express 15' (retirer saut corde)" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["activation", "pré-compétition", "primers"]
  },

  // ── RÉCUP SEMAINE DE DÉCHARGE ──
  {
    id: "D_DELOAD_RUN",
    cat: "D", sport: "course",
    objectif: "Footing de décharge — volume réduit 40-50%, intensité Z1 stricte",
    necessite: "Obligatoire",
    when: "Semaine de récupération (1 semaine sur 3-4)",
    phase: ["base", "build"],
    avoid: "N/A",
    durationMin: [25, 40],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "3' marche dynamique + 5 squats + 5 fentes.", []],
      ["Main", "25-40' Z1 stricte (allure très facile, 'je peux parler en phrases complètes').\n• Cible FC : 65-72% FCmax max.\n• Cadence : naturelle, ne pas chercher à augmenter.\n• Technique : épaules basses, regard 20m devant, foulée souple.\n• Si tu te sens trop bien et que tu accélères 'machinalement' : ralentis volontairement. Le but n'est PAS de progresser cette séance.", ["Z1"]],
      ["Cool-down", "3' marche + étirement debout mollets/quadriceps 20\"/côté.", []],
      ["Coaching", "Semaine de décharge = 40-50% du volume normal. Tu dois finir TOUTES tes séances de la semaine avec l'impression d'avoir 'gardé du jus'. Si tu termines fatigué, c'est que ta décharge est trop chargée.", []]
    ]),
    variants: { ironman: "30-40'", half: "25-35'", marathon: "30-40'", semi: "25-30'" },
    goals: GOALS_ALL,
    tags: ["deload", "recovery", "décharge"]
  },
  {
    id: "D_DELOAD_BIKE",
    cat: "D", sport: "cyclisme",
    objectif: "Sortie vélo de décharge — volume réduit, cadence libre, plaisir",
    necessite: "Recommandé",
    when: "Semaine de récupération",
    phase: ["base", "build"],
    avoid: "N/A",
    durationMin: [30, 60],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "5' Z1 cadence libre.", ["Z1"]],
      ["Main", "30-60' Z1, terrain plat de préférence, cadence libre 80-95 rpm. Aucun seuil ni sprint. Sortie 'café shop' : tu peux t'arrêter, faire des photos, profiter. Si tu croises une côte : tu poses pied au sol ou tu montes en danseuse souple sans charger.", ["Z1"]],
      ["Cool-down", "3' Z1 cadence libre.", []],
      ["Coaching", "C'est une sortie plaisir, pas une séance d'entraînement. Vélo de route ou gravel, peu importe. Évite le home trainer si possible — l'extérieur fait aussi du bien à la tête.", []]
    ]),
    variants: { ironman: "45-60'", half: "30-45'", marathon: "optionnel", semi: "optionnel" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["deload", "recovery", "décharge"]
  },
  {
    id: "D_STRETCH_ROUTINE",
    cat: "D", sport: "mixed",
    objectif: "Routine étirements statiques — post-entraînement ou jour off",
    necessite: "Optionnel",
    when: "Post-entraînement ou jour de repos",
    phase: ["base", "build", "peak", "taper"],
    avoid: "JAMAIS avant séance intense (réduit puissance et force)",
    durationMin: [10, 20],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "1' marche sur place + 5 respirations profondes.", []],
      ["Main", "6 étirements statiques, 30\" × 2 séries chacun, respiration ample. Sensation : étirement modéré (5-6/10), jamais douleur (>8/10).\n\n1) **Ischio-jambiers** (arrière cuisse) — assis au sol, jambe tendue, autre jambe pliée pied contre intérieur cuisse. Penche le buste vers le pied tendu, dos LONG (pas arrondi). Si tu n'atteins pas le pied : sangle ou serviette autour du pied.\n\n2) **Quadriceps** (avant cuisse) — debout, attrape un pied derrière la fesse (genou pointé vers le bas), bassin légèrement basculé vers l'avant (rétroversion). Si tu te tiens à un mur, c'est OK.\n\n3) **Psoas** (avant hanche) — fente arrière, genou arrière au sol (mets un coussin), bassin qui descend et avance. Lève le bras du côté arrière vers le plafond pour amplifier.\n\n4) **Mollets** (gastrocnémien) — debout face à un mur, mains au mur, jambe arrière tendue talon au sol, jambe avant pliée. Avance les hanches vers le mur. 30\". Puis fléchis le genou arrière pour cibler le soléaire.\n\n5) **Adducteurs** (intérieur cuisse) — assis 'papillon', plantes des pieds collées, genoux qui descendent vers le sol. Coudes peuvent pousser légèrement sur l'intérieur des genoux. Buste droit, pas arrondi.\n\n6) **Piriforme** (fessier profond) — allongé sur le dos, cheville droite sur le genou gauche, attrape la cuisse gauche et tire vers la poitrine. Tu dois sentir l'étirement dans la fesse droite. 30\"/côté.", []],
      ["Cool-down", "1' allongé sur le dos, jambes pliées, respiration libre. Scan corporel rapide (pieds → tête).", []],
      ["Coaching", "Étirements statiques = APRÈS effort uniquement, jamais avant (recherches récentes : -5 à -10% performance si fait avant). Si tu sens un étirement très intense, recule un peu. Tenir 30\" suffit (au-delà, gains marginaux).", []]
    ]),
    variants: { ironman: "Ajouter épaules (croise un bras devant, tire vers toi)", half: "Ajouter épaules", marathon: "Focus jambes (doubler ischios + mollets)", semi: "Focus jambes" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["stretching", "recovery", "étirements"]
  },

  // ── ACTIVATION NEUROMUSCUAIRE AVANCÉE ──
  {
    id: "D_ACTIVATION_GLUTES",
    cat: "D", sport: "mixed",
    objectif: "Activation fessiers — réveil glutéal avant séance clé ou longue sortie",
    necessite: "Recommandé",
    when: "Avant séance B/C incluant course ou vélo",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [10, 15],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "1' marche sur place + 5 squats poids de corps.", []],
      ["Main", "Circuit 4 mouvements, 2 tours, repos 30s entre exercices, 60s entre tours. Bande élastique mini-loop autour des cuisses pour exos 1-2-4.\n\n1) **Clam shells** (coquillage) — couché sur le côté, genoux pliés à 45°, talons collés. Ouvre le genou du dessus en gardant les talons collés et le bassin immobile. 15 reps lents/côté. Sensation : brûlure fessier moyen (côté de la fesse). Erreur : basculer le bassin vers l'arrière.\n\n2) **Monster walks** (pas du monstre) — bande au-dessus des genoux, demi-squat, fais 10 pas latéraux vers la droite puis 10 vers la gauche. Garde la tension permanente dans la bande (genoux qui ne s'effondrent jamais).\n\n3) **Single leg glute bridge** — couché sur le dos, 1 pied au sol (genou plié), autre jambe tendue en l'air. Pousse sur le talon au sol pour décoller le bassin, serre fort la fesse en haut, redescends lentement. 12/côté. Sensation : fesse qui brûle, PAS le bas du dos.\n\n4) **Fire hydrants** (bouche d'incendie) — à 4 pattes, lève un genou plié sur le côté à hauteur de hanche, redescends sans poser. 12/côté. Bassin reste face au sol (ne tourne pas).\n\nDurée totale : 8-12'.", []],
      ["Cool-down", "1' marche + 5 respirations.", []],
      ["Coaching", "À faire AVANT ta séance (intégration au warm-up). Active les fessiers qui sont souvent 'éteints' chez les coureurs/cyclistes (compensation lombaires/ischios). Si tu ressens beaucoup le bas du dos = mauvaise exécution, ralentis et concentre-toi sur la fesse.", []]
    ]),
    variants: { ironman: "Ajouter hip thrusts 2x10 charge légère", half: "Standard", marathon: "Focus single leg (doubler glute bridge)", semi: "Express 10'" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["activation", "glutes", "prévention"]
  },
  {
    id: "D_ACTIVATION_CORE_TAPER",
    cat: "D", sport: "mixed",
    objectif: "Gainage léger taper — maintien core sans fatigue musculaire",
    necessite: "Recommandé",
    when: "Semaine taper, maintien tonus sans charge",
    phase: ["taper"],
    avoid: "Charge lourde en semaine taper",
    durationMin: [10, 15],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "2' : dead bug lent 2×5 + cat-cow 1' + respiration diaphragmatique 1' (main sur ventre qui se gonfle, pas la poitrine).", []],
      ["Main", "Circuit 5 mouvements, 2 tours, repos 30s. Focus qualité technique, jamais d'effort max (taper = maintien).\n\n1) **Dead bug** — allongé sur le dos, bras tendus vers le plafond, jambes pliées à 90° (cuisses verticales). Tends simultanément bras droit derrière la tête + jambe gauche vers le sol (sans la poser), reviens. Alterne. 10 reps total. Bas du dos COLLÉ au sol (sangle abdominale tenue). Respiration : expire en tendant.\n\n2) **Bird dog** — à 4 pattes, tends simultanément bras droit devant + jambe gauche derrière, tiens 2s, reviens. Alterne. 10 total. Bassin stable, pas de balancement.\n\n3) **Side plank** (gainage latéral) — sur l'avant-bras, corps aligné de la tête aux pieds, hanche soulevée. Tiens 20\" × 2/côté. Regression débutant : genou inférieur au sol.\n\n4) **Pallof press** (anti-rotation) — debout à 90° d'un point d'ancrage (élastique), mains sur la poitrine, tends les bras devant toi sans laisser le buste tourner. 10 reps lents/côté. Tu sens les obliques du côté opposé à l'élastique.\n\n5) **Planche** (front plank) — sur les avant-bras, corps gainé, fesses au niveau des épaules (pas en l'air, pas affaissées). 30\" × 2.", []],
      ["Cool-down", "1' posture de l'enfant + 5 respirations.", []],
      ["Coaching", "Pendant le taper, garder la sangle ACTIVE sans fatigue. Si tu sens des courbatures abdominales le lendemain = trop intense. Réduire à 1 tour si nécessaire.", []]
    ]),
    variants: { ironman: "15' avec respiration diaphragmatique (3') en fin", half: "12'", marathon: "12'", semi: "10'" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["core", "activation", "taper", "gainage"]
  },
  {
    id: "D_ACTIVATION_ANKLE_FOOT",
    cat: "D", sport: "course",
    objectif: "Activation pieds & chevilles — proprioception et prévention entorses/périostites",
    necessite: "Recommandé",
    when: "Pré-séance trail ou 2-3x/semaine",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [8, 12],
    metricKey: "cardiaque", sportKey: "course",
    structure: mk([
      ["Main", "5 exercices, 2 tours, repos 20s. Pieds NUS de préférence.\n\n1) **Toe yoga** (yoga des orteils) — assis, pied à plat au sol. Lève le gros orteil sans bouger les autres (10 reps). Puis lève les 4 autres en gardant le gros orteil au sol (10 reps). C'est dur la 1ère fois — le cerveau apprend. 2 tours/pied.\n\n2) **Heel raises** (montées sur pointes des pieds) — debout, mains à un mur, monte lentement sur la pointe (2s), redescends (3s). 15 reps. Pour intensifier : 1 jambe à la fois.\n\n3) **Single leg balance** — debout pieds nus sur 1 jambe, autre jambe pliée en arrière. Tiens 30\". Niveau 1 : yeux ouverts. Niveau 2 : yeux fermés. Niveau 3 : sur coussin/serviette pliée. 2×30\"/jambe.\n\n4) **Ankle CARs** (cercles contrôlés cheville) — assis ou debout, pied levé, dessine le plus grand cercle possible avec l'orteil, très lentement. 8 dans un sens / 8 dans l'autre, par cheville.\n\n5) **Short foot drill** (pied court) — assis ou debout pieds nus, essaie de 'raccourcir' ton pied en rapprochant la base des orteils du talon SANS recroqueviller les orteils. Comme si tu voulais creuser une voûte sous le pied. 12 contractions lentes de 3s/pied. Active les muscles intrinsèques (anti-pieds plats fonctionnels).", []],
      ["Cool-down", "1' marche pieds nus en alternant marche normale, sur les pointes, sur les talons, sur les bords externes/internes.", []],
      ["Coaching", "Idéal en intégrant à ta routine du matin (sortie de douche) ou en regardant la TV. Pieds nus impératif. Prévention #1 des périostites, fascite plantaire, entorses pour les trailers et coureurs.", []]
    ]),
    variants: { ironman: "Post-brick", half: "Standard", marathon: "Focus périostite prev. (doubler heel raises)", semi: "Express (4 exos × 1 tour)" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["activation", "chevilles", "pieds", "proprioception"]
  },

  // ── MOBILITÉ AVANCÉE ──
  {
    id: "D_MOBILITY_HIPS_DEEP",
    cat: "D", sport: "mixed",
    objectif: "Mobilité hanches approfondie — déverrouillage psoas, piriforme, adducteurs",
    necessite: "Recommandé",
    when: "Post-longue sortie ou jour de repos",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [15, 25],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "3' : marche sur place 1' + 10 squats poids de corps + 10 cercles de hanche/côté.", []],
      ["Main", "5 postures travaillées en profondeur. Respiration AMPLE et LENTE à chaque expiration tu vas un peu plus loin.\n\n1) **90/90 flow** — assis au sol, jambe avant à 90° devant (tibia parallèle au buste), jambe arrière à 90° sur le côté (tibia perpendiculaire). Bascule lentement le bassin pour passer de l'autre côté en gardant les tibias au sol. 8 oscillations × 2 séries.\n\n2) **Pigeon progressif** — jambe avant pliée tibia perpendiculaire au corps, jambe arrière allongée. Buste droit puis qui descend progressivement sur l'avant-jambe. Tiens 45\" × 2/côté. Sensation : fessier profond (piriforme). Si trop intense : place un coussin sous la fesse.\n\n3) **Frog stretch** (posture de la grenouille) — à 4 pattes, écarte progressivement les genoux le plus large possible, pieds en équerre vers l'extérieur. Recule légèrement le bassin vers les talons. Tiens 30\" × 2. Étirement adducteurs +++.\n\n4) **Couch stretch** (étirement canapé) — face à un canapé/mur, genou arrière au sol contre le canapé, tibia arrière vertical contre la paroi, jambe avant en fente. Redresse le buste, bascule le bassin en rétroversion. Tiens 30\" × 2/côté. Étirement psoas/quadriceps profond — souvent intense pour les cyclistes/coureurs.\n\n5) **Adductor rocks** — à 4 pattes, étends 1 jambe sur le côté pied posé au sol. Bascule lentement les fesses vers l'arrière puis vers l'avant. 12/côté. Étirement contrôlé adducteurs.", []],
      ["Cool-down", "2' allongé jambes croisées (figure 4), 1 main sur la cuisse, 1 main au sol. 5 respirations/côté.", []],
      ["Coaching", "À faire idéalement le SOIR, après douche chaude (tissus plus malléables). Si une zone est très tendue, c'est normal — l'amélioration vient avec 3-4 semaines de pratique régulière. Ne JAMAIS forcer en bout d'amplitude.", []]
    ]),
    variants: { ironman: "Ajouter psoas release balle de tennis 60\"/côté", half: "Standard", marathon: "Focus psoas + IT band (doubler couch stretch)", semi: "15' express (retirer adductor rocks)" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["mobility", "hanches", "psoas", "deep"]
  },
  {
    id: "D_MOBILITY_THORACIC",
    cat: "D", sport: "mixed",
    objectif: "Mobilité thoracique & épaules — crucial nageurs et posture vélo",
    necessite: "Recommandé",
    when: "Post-natation ou post-vélo longue durée",
    phase: ["base", "build", "peak", "taper"],
    avoid: "N/A",
    durationMin: [12, 20],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "2' : cercles d'épaules avant 10 / arrière 10 + arm swings (balancements bras croisés) 20.", []],
      ["Main", "5 mouvements, 2 tours, focus respiration.\n\n1) **Thoracic rotations** (rotation thoracique à 4 pattes) — à 4 pattes, 1 main derrière la nuque. Amène le coude vers le coude opposé (rotation interne), puis ouvre vers le plafond (rotation externe en suivant du regard). 10 lents/côté. Sensation : déverrouillage entre les omoplates.\n\n2) **Open book** — couché sur le côté, genoux pliés à 90°, bras tendus devant à hauteur d'épaule. Ouvre lentement le bras du dessus comme un livre vers le sol opposé, regard qui suit la main. Tiens 2s en ouverture max, reviens. 8/côté. Garde les genoux collés (ne pas tricher avec le bassin).\n\n3) **Thread the needle** (enfiler l'aiguille) — à 4 pattes, glisse le bras droit sous le corps (paume vers le haut) jusqu'à poser l'épaule au sol. Bras gauche tendu devant en appui. Tiens 8 respirations, change. 2 × 8 resp/côté.\n\n4) **Wall slides** — debout dos au mur, talons à 15 cm du mur, bas du dos / haut du dos / tête au mur. Coudes pliés à 90°, dos des mains au mur (formant un W). Glisse les bras vers le haut pour former un Y sans décoller les mains, puis redescends. 10 lents. Excellent posture vélo.\n\n5) **Pec doorway stretch** (étirement pectoral porte) — debout dans l'embrasure d'une porte, avant-bras contre le chambranle, coude à hauteur d'épaule. Avance le buste d'1 pas → étirement pectoral. Tiens 30\"/côté × 2.", []],
      ["Cool-down", "2' assis tailleur, mains jointes derrière le dos, ouverture poitrine + 5 respirations profondes.", []],
      ["Coaching", "Idéal post-natation (relâche les épaules sur-sollicitées) ou en fin de journée si tu bosses assis. Pour les triathlètes : combine avec D_MOBILITY_HIPS_DEEP 1×/sem pour une routine 'mobilité complète' de 30'.", []]
    ]),
    variants: { ironman: "Focus épaules nageur (3 tours)", half: "Focus épaules nageur", marathon: "Focus posture (insister wall slides)", semi: "Express 12'" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["mobility", "thoracique", "épaules", "posture"]
  },
  {
    id: "D_MOBILITY_TRAIL_SPECIFIC",
    cat: "D", sport: "course",
    objectif: "Mobilité trail — préparation descente, stabilité latérale, flexion dorsale",
    necessite: "Recommandé",
    when: "Avant sortie trail technique ou post-descente",
    phase: ["base", "build", "peak"],
    avoid: "N/A",
    durationMin: [15, 20],
    metricKey: "cardiaque", sportKey: "course",
    structure: mk([
      ["Warm-up", "2' marche dynamique + 10 squats + 10 cercles de chevilles/côté.", []],
      ["Main", "5 exercices, 2 tours, repos 30s.\n\n1) **Ankle dorsiflexion wall** — face à un mur, gros orteil à 8-10 cm du mur, mets en fente. Pousse le genou avant vers le mur SANS décoller le talon. Si tu touches : recule le pied de 2 cm. 12 lentes/côté. Si tu ne touches PAS : amplitude limitée, à travailler +++.\n\n2) **Cossack squats** — debout jambes très écartées, descends sur 1 jambe en pliant le genou (l'autre tendue, talon au sol orteil vers le ciel). Buste droit, mains devant pour équilibre. Reviens debout puis descends sur l'autre. 8/côté. Excellent pour la stabilité latérale en descente trail.\n\n3) **Lateral lunges** (fente latérale) — debout, grand pas sur le côté, descends sur cette jambe (autre jambe tendue talon au sol). Pousse pour revenir. 10/côté. Travaille adducteurs et fessier moyen.\n\n4) **Single leg RDL** (soulevé de terre roumain unijambiste) — debout sur 1 jambe, bascule le buste vers l'avant en tendant la jambe libre derrière (corps en T). Garde le dos long, ne pas arrondir. Reviens. 8/côté. Si tu vacilles : touche un mur du bout des doigts.\n\n5) **Tibialis raises** (montées tibial antérieur) — debout dos au mur, talons collés au mur, lève le plus haut possible la pointe des pieds (vers les tibias). 15 lentes. Le muscle devant le tibia se contracte fort = prévention #1 des shin splints / périostite trail.", []],
      ["Cool-down", "2' marche + étirement mollets debout au mur 30\"/côté.", []],
      ["Coaching", "À faire 1× avant ta sortie trail technique (chauffe spécifique) OU 1× en récup post-descente longue (prévention courbatures excentriques). Pieds nus pour exos 1-5 si possible.", []]
    ]),
    variants: {},
    goals: GOALS_TRAIL,
    tags: ["mobility", "trail", "descente", "stabilité"]
  },

  // ── YOGA AVANCÉ ──
  {
    id: "D_YOGA_YIN_DEEP",
    cat: "D", sport: "mixed",
    objectif: "Yin yoga — postures longues (3-5') pour fascias et tissu conjonctif",
    necessite: "Optionnel",
    when: "Jour de repos ou semaine de décharge",
    phase: ["base", "build", "taper"],
    avoid: "N/A",
    durationMin: [30, 50],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "3' assis tailleur, yeux fermés. Respiration 4s in / 6s out × 20 cycles. Intention : 'je m'autorise à ne rien faire'.", []],
      ["Main", "6 postures yin tenues 3-5 minutes chacune. Le yin travaille les FASCIAS (tissu conjonctif), pas les muscles. La règle : trouver son 'edge' (étirement modéré 5/10), s'immobiliser, respirer, accepter la sensation.\n\n1) **Dragon pose** (fente basse) — fente avant profonde, genou arrière au sol (coussin), mains de chaque côté du pied avant ou avant-bras au sol. 3'/côté. Sensation : psoas/aine arrière. Si trop : remonte sur les mains.\n\n2) **Sphinx** — couché ventre, avant-bras au sol coudes sous épaules, buste relevé. Bassin et jambes relâchés au sol. 3'. Sensation : ouverture douce lombaires + bas du ventre.\n\n3) **Shoelace** (lacet de chaussure) — assis, genou droit croisé par-dessus genou gauche (genoux empilés), pieds vers les fesses opposées. Penche le buste vers l'avant. 3'/côté. Sensation : fessier + hanche externe. Si genoux ne s'empilent pas : pose un coussin sous la fesse haute.\n\n4) **Banana** (banane) — couché sur le dos, croise les chevilles, attrape le poignet gauche avec la main droite par-dessus la tête, déhanche les hanches vers la gauche → corps en arc de banane. 3'/côté. Sensation : étirement latéral du tronc.\n\n5) **Butterfly** (papillon) — assis, plantes des pieds collées en losange, genoux qui tombent sur les côtés. Penche le buste vers l'avant en arrondissant le dos (yin = différent du hatha où on garde dos droit). 3'. Sensation : intérieur cuisses + bas du dos.\n\n6) **Legs up the wall** (jambes au mur) — couché sur le dos, fesses contre un mur, jambes tendues à la verticale contre le mur. Bras en croix. 5'. Récupération veineuse +++, calme le système nerveux.\n\nDurée totale : 30-50' selon nombre de postures et durée tenue.", []],
      ["Cool-down", "3' shavasana — couché sur le dos, bras en croix paumes vers le haut. Laisse le corps lourd. Respiration naturelle.", []],
      ["Coaching", "Le yin n'est PAS du stretch dynamique — la magie opère quand tu RESTES sans bouger 3-5'. Au début, c'est mentalement dur. Utilise un timer. Pas de musique entraînante (musique calme ou silence). Idéal jour de repos ou soir.", []]
    ]),
    variants: { ironman: "50' post-longue sortie", half: "40'", marathon: "35' focus jambes (insister dragon + shoelace)", semi: "30'" },
    goals: GOALS_ALL,
    tags: ["yoga", "yin", "fascia", "recovery", "deep"]
  },
  {
    id: "D_YOGA_POWER_LIGHT",
    cat: "D", sport: "mixed",
    objectif: "Power yoga léger — flow dynamique sans fatigue, coordination respiration",
    necessite: "Optionnel",
    when: "Matin jour intermédiaire ou pre-séance légère",
    phase: ["base", "build", "peak"],
    avoid: "Ne pas faire avant séance clé intense",
    durationMin: [20, 35],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "3' respiration diaphragmatique assise (main sur ventre, ventre qui se gonfle à l'inspiration, se vide à l'expiration). 15 cycles.", []],
      ["Main", "Flow dynamique : 1 mouvement = 1 respiration. Tiens 3-5 respirations dans les postures statiques.\n\n1) **Salutation au soleil A × 3 cycles** : debout (Tadasana) → bras au ciel inspire → pince debout expire → demi-pince inspire → planche expire → chaturanga (descente pompe contrôlée) → cobra/chien tête en haut inspire → chien tête en bas expire (5 respirations) → step avant pince → bras au ciel inspire → debout expire. Apprends ce flow par cœur.\n\n2) **Guerrier II flow** (5 min) — depuis chien tête en bas, step pied droit en fente, ouvre en Guerrier II (bras horizontaux), tiens 5 resp. Passe en Triangle (jambe avant tendue, main avant qui descend, main arrière vers le ciel), tiens 5 resp. Passe en Demi-lune (main avant au sol, jambe arrière levée à l'horizontale, main libre vers le ciel), tiens 5 resp. Reviens Guerrier II. Change de côté.\n\n3) **Chair pose flow** (chaise) — debout, descends en chaise (cuisses parallèles au sol, bras au ciel, dos long), tiens 5 resp. Twist droit (coude gauche sur genou droit), 5 resp. Twist gauche, 5 resp. Sors en pince debout.\n\n4) **Posture sur 1 jambe — Tree pose** (arbre) — debout, pied droit à l'intérieur cuisse gauche (ou mollet, JAMAIS sur le genou), mains jointes devant la poitrine ou au ciel. 8 resp/côté. Travaille équilibre + concentration.\n\nDurée Main : 15-25' selon vitesse.", []],
      ["Cool-down", "Posture de l'enfant 2' + shavasana 3-5'.", []],
      ["Coaching", "Power yoga = chauffe + force + équilibre + souplesse. Ne pas faire avant une séance VO2max ou seuil (tu seras 'cuit'). Idéal le matin pour démarrer la journée OU intercalé entre 2 jours d'entraînement modérés.", []]
    ]),
    variants: { ironman: "35' avec équilibre (ajouter Warrior III)", half: "30'", marathon: "25'", semi: "20'" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["yoga", "power", "flow", "coordination"]
  },
  {
    id: "D_YOGA_PRERACE",
    cat: "D", sport: "mixed",
    objectif: "Yoga pré-compétition — calme mental, ouverture hanches, activation douce",
    necessite: "Optionnel",
    when: "J-1 compétition, soir",
    phase: ["peak", "taper"],
    avoid: "N/A",
    durationMin: [15, 25],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "2' assis tailleur, 10 respirations lentes 4/6. Pose ton intention pour demain : 1 mot (ex. 'fluide', 'engagé', 'présent').", []],
      ["Main", "7 postures douces, focalisées sur la respiration et l'apaisement. Ne CHERCHE PAS la performance.\n\n1) **Cat-cow** lent × 10 cycles (1'). Lubrifie la colonne.\n\n2) **Low lunge** (fente basse douce) — fente avant, genou arrière au sol, mains de chaque côté du pied avant ou bras au ciel. 1'/côté × 2. Ouvre les psoas (souvent tendus à cause du stress).\n\n3) **Pigeon doux** — jambe avant pliée tibia perpendiculaire, jambe arrière étendue, buste droit (pas penché en avant pour cette version pré-course). 1'/côté × 2.\n\n4) **Forward fold debout** (pince) — debout, expire en pliant en avant, mains au sol ou aux tibias, genoux légèrement fléchis. Laisse pendre la tête. 1'. Calme le système nerveux.\n\n5) **Legs up the wall** — couché sur le dos, jambes tendues contre un mur. 3'. Récupération veineuse + relaxation profonde.\n\n6) **Body scan meditation** — toujours allongé jambes au mur ou shavasana, scan mental du corps des pieds vers la tête, 30s par zone. Note les tensions, respire dedans. 5'.\n\n7) **Visualisation parcours** (optionnel) — assis ou allongé, visualise les 1ères minutes de course : le départ, ton allure, ta respiration, ton expression. Voir, sentir, vivre mentalement.", []],
      ["Cool-down", "2' assis tailleur, mains sur les genoux, 10 respirations. 'Je suis prêt(e). Je fais confiance à mon entraînement.'", []],
      ["Coaching", "À faire le SOIR J-1, idéalement après le dîner (laisser 90' avant le coucher). Lumière tamisée, pas d'écran, musique calme ou silence. ZERO ambition de performance dans cette séance — c'est un cadeau à ton système nerveux.", []]
    ]),
    variants: { ironman: "Ajouter visualisation parcours détaillée (5')", half: "Standard", marathon: "Focus jambes (doubler low lunge)", semi: "15' express (retirer pigeon)" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["yoga", "pré-compétition", "mental", "calme"]
  },

  // ── RÉCUP SPÉCIFIQUE TAPER ──
  {
    id: "D_TAPER_FLUSH_RUN",
    cat: "D", sport: "course",
    objectif: "Footing flush taper — micro-dose pour maintenir sensations sans charge",
    necessite: "Recommandé",
    when: "Semaine taper, J-3 à J-2 avant course",
    phase: ["taper"],
    avoid: "N/A",
    durationMin: [15, 20],
    metricKey: "allure", sportKey: "course",
    structure: mk([
      ["Warm-up", "3' marche dynamique + 5 squats + 5 fentes.", []],
      ["Main", "**Bloc 1 — 12-15' Z1 très facile**. Allure 'je peux chanter'. FC <70% max. Cadence naturelle.\n\n**Bloc 2 — 3×15\" allure course**. Sur une portion plate, accélère pour atteindre l'allure prévue le jour de la course (PAS plus vite), tiens 15\" puis relâche en marche 45\". 3 répétitions. But : rappeler au système nerveux 'à quoi ressemble' l'allure de course, SANS fatigue.", ["Z1"]],
      ["Cool-down", "2' marche + 5 respirations.", []],
      ["Coaching", "Tu dois sortir FRAIS et avec l'envie d'en faire plus. Si tu sens un truc qui tire, raccourcis à 10' Z1 sans accélérations. Pas de chrono visible.", []]
    ]),
    variants: { ironman: "Avec 2×20\" allure IM au lieu de 15\"", half: "Standard", marathon: "Allure marathon", semi: "Allure semi" },
    goals: GOALS_ALL,
    tags: ["taper", "flush", "pré-compétition"]
  },
  {
    id: "D_TAPER_FLUSH_BIKE",
    cat: "D", sport: "cyclisme",
    objectif: "Spin taper — openers vélo avant compétition",
    necessite: "Recommandé",
    when: "J-2 avant course vélo ou triathlon",
    phase: ["taper"],
    avoid: "N/A",
    durationMin: [20, 30],
    metricKey: "puissance", sportKey: "cyclisme",
    structure: mk([
      ["Warm-up", "5' Z1 cadence libre montée progressive.", ["Z1"]],
      ["Main", "**Bloc 1 — 12-20' Z1 cadence 90-95 rpm**.\n\n**Bloc 2 — 3×30\" à FTP, cadence 95-100 rpm, R=1' Z1**. Les 30\" doivent être 'francs' (FTP, pas plus) — c'est un rappel neuromusculaire, pas un test. Reste assis, position aéro propre. Récup 1' pédalage Z1 cadence libre entre chaque.", ["Z1", "Z4"]],
      ["Cool-down", "3' Z1 cadence libre.", []],
      ["Coaching", "Les '3×30\" FTP' réveillent les fibres rapides sans les fatiguer. Si tes jambes sont lourdes au 2ème 30\", arrête, ne fais pas le 3ème. Tu dois sortir frais et en confiance.", []]
    ]),
    variants: { ironman: "Avec 2×1' allure IM (Z3) au lieu de 3×30\" FTP", half: "Standard", marathon: "optionnel", semi: "optionnel" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["taper", "flush", "openers", "vélo"]
  },
  {
    id: "D_TAPER_SWIM_TOUCH",
    cat: "D", sport: "natation",
    objectif: "Nage taper — toucher l'eau, garder le feel sans fatigue",
    necessite: "Recommandé",
    when: "Semaine taper triathlon",
    phase: ["taper"],
    avoid: "N/A",
    durationMin: [15, 25],
    metricKey: "allure", sportKey: "natation",
    structure: mk([
      ["Warm-up", "200m multi-nages facile.", ["Z1"]],
      ["Main", "**Bloc principal — 300m facile multi-nages** (alterne 50m crawl / 50m dos) puis **4×50m allure course** (allure prévue le jour J, ni plus vite ni plus lent), repos 15\" entre. Focus glisse, technique, respiration côté faible.\n\n**Cool-down — 200m facile pull-buoy** : épaules relâchées, longues coulées.", ["Z1", "Z3"]],
      ["Cool-down", "Étirement épaules au mur 20\"/côté.", []],
      ["Coaching", "Garder le 'feel' de l'eau, sans accumuler de fatigue épaule. Aucune série dure. Si tes épaules sont tendues : retire les 4×50m allure course.", []]
    ]),
    variants: { ironman: "Allure IM (très contrôlée)", half: "Allure 70.3" },
    goals: GOALS_TRI,
    tags: ["taper", "natation", "feel", "pré-compétition"]
  },

  // ── BREATHWORK & MENTAL ──
  {
    id: "D_BREATHWORK_BOX",
    cat: "D", sport: "mixed",
    objectif: "Box breathing & cohérence cardiaque — gestion stress pré-compétition",
    necessite: "Optionnel",
    when: "Soir J-1 ou matin jour de course",
    phase: ["peak", "taper"],
    avoid: "N/A",
    durationMin: [10, 15],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "1' assis confortable (chaise, dos droit, pieds au sol) ou allongé. Yeux fermés. 5 respirations naturelles d'observation.", []],
      ["Main", "**Bloc 1 — Box breathing (respiration carrée) 4-4-4-4** : 5 cycles.\nUtilisé par les Navy SEALs avant intervention. Active le système parasympathique (calme).\n• Inspire 4 secondes par le nez (ventre qui se gonfle, pas la poitrine).\n• Apnée 4 secondes poumons pleins.\n• Expire 4 secondes par la bouche pincée (comme si tu soufflais sur une bougie).\n• Apnée 4 secondes poumons vides.\n• Reprends. Compte mentalement '1-2-3-4' à chaque phase.\nSi 4s d'apnée vide est inconfortable : passe en 4-2-4-2 puis progresse.\n\n**Bloc 2 — Cohérence cardiaque 5-5** : 5 minutes (≈ 30 cycles).\nProtocole 365 (3×/jour, 6 cycles/min, 5 minutes). Validé scientifiquement (Servan-Schreiber, Sciences & Vie).\n• Inspire 5 secondes par le nez (ventre).\n• Expire 5 secondes par la bouche, légère résistance.\n• Pas d'apnée. Rythme régulier comme une vague.\n• Effet attendu : variabilité cardiaque augmente, cortisol baisse, mental s'apaise.\n\n**Bloc 3 — Body scan 3 minutes** : scan mental du corps des pieds vers la tête. Note les zones tendues, respire dedans (envoie le souffle vers la zone). Pas d'évaluation, juste de la conscience.", []],
      ["Cool-down", "1' assis, 5 respirations naturelles. Ouvre les yeux lentement.", []],
      ["Coaching", "Idéal le soir J-1 (1h avant coucher, lumière tamisée) ET le matin jour de course (15' après le réveil, avant petit-déj). Apps gratuites pour t'aider : 'RespiRelax+' (cohérence cardiaque). Pratique 3×/semaine en hors-compétition pour que ce soit un automatisme le jour J.", []]
    ]),
    variants: { ironman: "Ajouter visualisation 3' (voir le parcours, sentir la transition)", half: "Standard", marathon: "Standard", semi: "10' express (1 bloc cohérence cardiaque seulement)" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["breathwork", "mental", "cohérence", "stress"]
  },
  {
    id: "D_VISUALIZATION_RACE",
    cat: "D", sport: "mixed",
    objectif: "Visualisation mentale de la course — répétition mentale guidée du jour J",
    necessite: "Optionnel",
    when: "Semaine pré-course (3-7 jours avant), 2-3 sessions",
    phase: ["peak", "taper"],
    avoid: "Si anxiété pré-course intense — préférer breathwork pur",
    durationMin: [15, 25],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "3' : assis ou allongé, yeux fermés, 10 respirations 4/6 pour entrer en état d'attention détendue.", []],
      ["Main", "Visualisation guidée structurée en 5 phases. La visualisation EST de l'entraînement : ton cerveau et ton système nerveux ne distinguent pas une expérience vécue d'une expérience intensément imaginée.\n\n**Phase 1 — Veille du jour J (2')**\nVisualise ton sac préparé la veille (matériel sur la table, check-list cochée). Tu te couches calmement, tu t'endors confiant.\n\n**Phase 2 — Réveil & arrivée sur le site (3')**\nRéveil sans stress, petit-déjeuner habituel, trajet vers le départ. Ressens les détails : l'air frais, le bruit, l'odeur. Tu es calme, focus, prêt.\n\n**Phase 3 — Départ & premier tiers de course (5')**\nVisualise le départ : signal, premières foulées/coups de pédale/brasses. Tu ne pars PAS trop vite. Tu sens ton corps qui s'installe. Ta respiration est posée. Tu observes ton allure, tu valides : 'c'est bon'.\n\n**Phase 4 — Milieu de course (5')**\nLe vrai jeu commence. Visualise les sensations difficiles qui arrivent : jambes qui tirent, souffle qui monte, doute mental. ENTRAÎNE-TOI à ta réponse : 1 mot d'ancrage ('fluide', 'force', 'tiens'), focus respiration, focus prochain ravito/kilomètre/transition. Tu ne paniques pas, tu exécutes.\n\n**Phase 5 — Dernier tiers & arrivée (3')**\nVisualise le moment où tu accélères (ou tu tiens). La ligne d'arrivée approche. Tu sens la satisfaction monter. Tu franchis la ligne, le chrono te plaît OU tu es fier d'avoir tout donné. Goûte la sensation.\n\n**Phase 6 — Ancrage (2')**\nReviens à ta respiration. Pose une intention pour le jour J : 1 mot que tu te répéteras dans les moments durs.", []],
      ["Cool-down", "2' : 5 respirations lentes, ouvre les yeux. Note 1 mot ou 1 phrase dans un carnet pour ancrer.", []],
      ["Coaching", "Fais 2-3 sessions en semaine pré-course, idéalement le soir avant de dormir (lumière tamisée). Plus tu visualises avec TOUS les sens (vue, sons, odeurs, sensations corporelles, émotions), plus l'effet est puissant. Niveau débutant : commence par 10' (uniquement phases 3-4-5). Si tu te sens stressé pendant la visualisation, ce n'est PAS grave — c'est même utile : tu t'entraînes à la gestion du stress.", []]
    ]),
    variants: { ironman: "Visualiser les 3 disciplines + 2 transitions (25')", half: "Visualiser les 3 disciplines (20')", marathon: "Focus mur du 30K (insister phase 4)", semi: "Focus dernier 5K", "10k": "15' express (départ rapide + tenue + final)" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["visualization", "mental", "pré-compétition", "guided"]
  },
  {
    id: "D_BREATHWORK_NASAL_ENDURANCE",
    cat: "D", sport: "mixed",
    objectif: "Respiration nasale endurance — développer tolérance CO2, économie respiratoire",
    necessite: "Optionnel",
    when: "1-2×/sem hors compétition, pas en semaine de course",
    phase: ["base", "build"],
    avoid: "Asthme non contrôlé · Rhume bouché",
    durationMin: [15, 25],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "3' assis confortable, respiration naturelle d'observation. Note ton 'BOLT score' (Body Oxygen Level Test) : inspire normal nez, expire normal nez, pince le nez, compte les secondes avant la 1ère envie de respirer. <20s = capacité CO2 faible (à travailler), 20-40s = correct, >40s = athlète entraîné en respi.", []],
      ["Main", "**Protocole inspiré Patrick McKeown (Oxygen Advantage).**\n\n**Bloc 1 — Respiration nasale lente 4/6 × 10 cycles (3')**\nInspire 4s nez (ventre), expire 6s nez. Réduit la fréquence respiratoire, élève le CO2.\n\n**Bloc 2 — Réduction respiratoire × 12 cycles (5')**\nRespire UNIQUEMENT par le nez, RÉDUIS volontairement le volume inspiré (respiration 'plus petite' que la normale). Tu dois ressentir une 'faim d'air' légère mais tolérable (3-4/10). Cela accroît la tolérance au CO2 = meilleure efficience respiratoire à l'effort.\n\n**Bloc 3 — Apnée à l'expiration progressive (5')**\nInspire normal nez, expire normal nez, retiens souffle poumons vides. Compte les secondes jusqu'à la 1ère 'pression' (pas jusqu'à l'asphyxie). Reprends respiration calme par le nez. Récup 1' respiration normale. Refais 5-6 cycles.\nObjectif : allonger progressivement la durée d'apnée semaine après semaine.\n\n**Bloc 4 — Cohérence cardiaque 5/5 × 5' (5')**\nRespiration calme nez 5s in / 5s out, comme vague régulière. Termine sur cette note apaisée.", []],
      ["Cool-down", "2' respiration libre nez, 5 respirations profondes.", []],
      ["Coaching", "Effets attendus après 4-6 sem : ventilation/min plus basse à effort donné = économie cardiaque + meilleure libération O2 aux muscles (effet Bohr). À combiner avec respiration NASALE en footing facile (Z1-Z2). Ne JAMAIS forcer une apnée jusqu'au malaise — la 'pression' est ton signal d'arrêt. Si vertige : stop, respire normalement.", []]
    ]),
    variants: { ironman: "+1 bloc apnée (10' total)", half: "Standard", marathon: "Standard", semi: "15' express (3 blocs)" },
    goals: [...GOALS_ALL, ...GOALS_TRAIL],
    tags: ["breathwork", "nasal", "endurance", "co2-tolerance", "oxygen-advantage"]
  },
  {
    id: "D_COLD_CONTRAST",
    cat: "D", sport: "mixed",
    objectif: "Protocole contraste chaud/froid — récupération vasculaire post-charge",
    necessite: "Optionnel",
    when: "Post-séance clé ou post-compétition (PAS dans les 4h post-muscu si recherche d'hypertrophie)",
    phase: ["build", "peak"],
    avoid: "Problème cardiaque · Maladie de Raynaud · Hypertension non contrôlée",
    durationMin: [15, 20],
    metricKey: "cardiaque", sportKey: "tout sport",
    structure: mk([
      ["Warm-up", "Douche tiède 1' pour acclimater.", []],
      ["Main", "**3 cycles complets** :\n\n**Cycle 1**\n• Douche FROIDE (eau la plus froide que tu supportes, ~12-15°C) — 1 minute. Commence par les pieds, mollets, cuisses, puis monte au tronc, dos, bras, nuque, tête en dernier. Respiration LENTE et profonde par le nez — résiste à l'envie d'hyperventiler. 'L'effet whim hof' : respire calmement même si c'est désagréable.\n• Douche CHAUDE (~38-40°C) — 2 minutes. Détends les muscles, relâche les épaules.\n\n**Cycles 2 et 3** : idem (1' froid → 2' chaud).\n\n**Termine TOUJOURS par 1' FROID** (4ème passage froid).\n\nEffet physiologique : vasoconstriction (froid) → vasodilatation (chaud) → pompage sanguin musculaire = évacuation des déchets métaboliques, sensation de fraîcheur dans les jambes.", []],
      ["Cool-down", "Sèche-toi vigoureusement, habille-toi chaudement (chaussettes, sweat). Boisson chaude (thé, infusion).", []],
      ["Coaching", "Idéal post-longue sortie ou post-séance clé. À ÉVITER dans les 4-6h post-séance de muscu lourde si tu cherches l'hypertrophie (le froid bloque la signalisation anabolique). Si tu débutes : commence par 30\" froid / 2' chaud, progresse semaine après semaine. Effet 'boost' énergétique post-séance bien connu.", []]
    ]),
    variants: { ironman: "Ajouter bain glacé 10°C × 3' en remplacement des cycles douche", half: "Standard", marathon: "Standard", semi: "2 cycles au lieu de 3" },
    goals: GOALS_ALL,
    tags: ["recovery", "contraste", "froid", "vasculaire"]
  },
];
