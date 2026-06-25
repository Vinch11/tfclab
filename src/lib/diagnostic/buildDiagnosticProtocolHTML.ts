/**
 * buildDiagnosticProtocolHTML — Génère une page HTML imprimable (A4 portrait)
 * pour les protocoles de test TFCLab. Ouvrir dans un nouvel onglet puis Ctrl+P.
 */

export type DiagnosticProtocol = "track-day" | "bike-day" | "pool-day" | "tri-day";

type Block = {
  title: string;
  duration: string;
  instructions: string[];
  rows: Array<{ measure: string; unit: string }>;
};

type DetailedSection = {
  title: string;
  items: string[];
};

type ProtocolDef = {
  name: string;
  emoji: string;
  subtitle: string;
  material: string[];
  blocks: Block[];
  results: Array<{ metric: string; unit: string }>;
  /** Détails scientifiques affichés dans le dossier complet (étapes, formules, validité, sécurité). */
  detailed?: DetailedSection[];
};


const PROTOCOLS: Record<DiagnosticProtocol, ProtocolDef> = {
  "track-day": {
    name: "TFCL Track Day™",
    emoji: "🏃",
    subtitle: "Protocole piste 400m — VMA, VLamax, Seuil, TTE en 2h",
    material: ["Piste 400m", "Chronomètre", "Cardiofréquencemètre", "Cônes 30m / 100m", "GPS / montre"],
    blocks: [
      {
        title: "Bloc 1 — Neuromusculaire",
        duration: "~20 min (échauffement inclus)",
        instructions: [
          "Échauffement progressif 15 min (footing + gammes).",
          "3 lignes droites accélérées de 80m.",
          "Sprint maximal 30m départ arrêté (×2, récup 3 min).",
          "Mesurer le meilleur temps au chrono ou GPS.",
        ],
        rows: [
          { measure: "Sprint 30m (essai 1)", unit: "secondes" },
          { measure: "Sprint 30m (essai 2)", unit: "secondes" },
          { measure: "Sprint 100m", unit: "secondes" },
          { measure: "Sprint 200m", unit: "secondes" },
          { measure: "CMJ hauteur (My Jump 2)", unit: "cm" },
          { measure: "P1s estimée", unit: "W/kg" },
          { measure: "5 bonds horizontaux", unit: "mètres" },
          { measure: "FC max atteinte", unit: "bpm" },
        ],
      },
      {
        title: "Bloc 2 — Glycolytique (VLamax)",
        duration: "~15 min",
        instructions: [
          "Récupération marche 5 min.",
          "Effort maximal 15 secondes lancé (départ jogging).",
          "Mesurer la distance parcourue exacte.",
          "Récup complète 8 min avant bloc suivant.",
        ],
        rows: [
          { measure: "Distance 15s lancé", unit: "mètres" },
          { measure: "FC pic post-effort", unit: "bpm" },
          { measure: "Lactate (si dispo)", unit: "mmol/L" },
        ],
      },
      {
        title: "Bloc 3 — VMA (Léger-Boucher / 1500m)",
        duration: "~15 min",
        instructions: [
          "Test 1500m à allure maximale stable.",
          "Tour par tour (400m) à noter.",
          "FC moyenne + FC pic à reporter.",
        ],
        rows: [
          { measure: "Temps 1500m total", unit: "min:sec" },
          { measure: "Tour 1 (400m)", unit: "sec" },
          { measure: "Tour 2 (400m)", unit: "sec" },
          { measure: "Tour 3 (400m)", unit: "sec" },
          { measure: "Tour 4 (300m)", unit: "sec" },
          { measure: "FC moyenne", unit: "bpm" },
        ],
      },
      {
        title: "Bloc 4 — Seuil / TTE (5km tempo)",
        duration: "~25 min",
        instructions: [
          "Récup active 10 min.",
          "5km à allure seuil soutenable (RPE 8/10).",
          "Noter splits par km, FC moyenne, ressenti.",
        ],
        rows: [
          { measure: "Temps 5km total", unit: "min:sec" },
          { measure: "Km 1 / Km 2 / Km 3", unit: "min:sec" },
          { measure: "Km 4 / Km 5", unit: "min:sec" },
          { measure: "FC moyenne 5km", unit: "bpm" },
          { measure: "RPE final", unit: "/10" },
        ],
      },
    ],
    results: [
      { metric: "VMA estimée", unit: "km/h" },
      { metric: "Allure seuil estimée", unit: "min/km" },
      { metric: "VLamax estimée", unit: "mmol/L/s" },
      { metric: "TTE estimé", unit: "min" },
      { metric: "FatMax estimé", unit: "%VMA" },
      { metric: "FC max observée", unit: "bpm" },
    ],
    detailed: [
      {
        title: "Préparation 48h avant",
        items: [
          "J-2 : entraînement léger Z1-Z2 max 45 min, aucun effort intense.",
          "J-1 : repos complet ou marche 30 min. Hydratation 35 ml/kg/jour.",
          "Repas pré-test (3h avant) : 1.5-2 g/kg glucides, faible en fibres et graisses.",
          "Caféine optionnelle 3 mg/kg 45 min avant (si habituel).",
          "Échauffement matinal court (10 min mobilité) avant arrivée sur piste.",
        ],
      },
      {
        title: "Conditions de validité",
        items: [
          "Température piste 10-22°C, vent < 15 km/h, piste sèche.",
          "FC repos matinale dans ±5 bpm de la baseline 7 jours.",
          "RPE pré-test ≤ 3/10 (fraîcheur subjective).",
          "Récupération inter-blocs respectée (sinon VLamax sur-estimée).",
          "Sprint 30m : départ debout 3-points, chrono déclenché au premier mouvement.",
          "1500m : départ lancé 20m, allure régulière (variations < 3 sec/tour).",
        ],
      },
      {
        title: "Formules de calcul",
        items: [
          "VMA (km/h) = distance_1500m / temps_1500m × 3.6 (corrigée +2% piste extérieure).",
          "Allure seuil ≈ 1.06 × allure VMA (zone 88-92% VMA pour 30-60 min).",
          "VLamax_run ≈ −0.5066 + 0.01420 × distance_15s (RMSE 0.073, N=15).",
          "TTE estimé = f(VLamax, économie, %seuil) — voir moteur Mader-Heck.",
          "FatMax ≈ clamp(78 − 52·(VLa−0.25) + 0.15·(VO2−50), 48, 82) %VMA.",
          "FC max retenue = max(FC pic 1500m, FC pic 5km).",
        ],
      },
      {
        title: "Erreurs fréquentes à éviter",
        items: [
          "Sprint 15s lancé trop court (départ < 20m) → distance sous-estimée.",
          "Pacing 1500m positif (départ trop rapide) → temps majoré 3-5%.",
          "5km commencé sans récup → FC saturée, allure dégradée.",
          "Chronomètre arrêté en avance (avant ligne) → erreur 0.2-0.5s.",
          "Athlète fatigué (CTL élevé, sommeil < 7h) → VLamax sous-estimée 10-15%.",
        ],
      },
      {
        title: "Sécurité & arrêt du test",
        items: [
          "Arrêt immédiat si : douleur thoracique, vertige, FC > 220−âge soutenu.",
          "Pression artérielle pré-test si athlète > 40 ans ou ATCD cardio.",
          "Présence d'un second observateur recommandée (chronométrage + sécurité).",
          "Récupération active 15 min Z1 obligatoire après bloc 4.",
        ],
      },
    ],

  },
  "bike-day": {
    name: "TFCL Bike Day™",
    emoji: "🚴",
    subtitle: "Protocole vélo 2h — FTP, VLamax, MAP, W' en une séance",
    material: ["Home-trainer / piste", "Capteur puissance", "Cardiofréquencemètre", "Ventilateur", "Chronomètre"],
    blocks: [
      {
        title: "Bloc 1 — Neuromusculaire (Sprint 10s)",
        duration: "~25 min (échauffement inclus)",
        instructions: [
          "Échauffement progressif 15 min (Z2 → ouvertures).",
          "3 sprints maximaux 10s départ arrêté, récup 3 min.",
          "Noter puissance pic + puissance moyenne 10s.",
        ],
        rows: [
          { measure: "Sprint 10s — Pmax pic", unit: "watts" },
          { measure: "Sprint 10s — P moy (meilleur)", unit: "watts" },
          { measure: "FC max atteinte", unit: "bpm" },
        ],
      },
      {
        title: "Bloc 2 — Glycolytique (Wingate 30s)",
        duration: "~15 min",
        instructions: [
          "Récup 8 min Z1.",
          "Effort maximal 30s tout-droit (Wingate adapté).",
          "Noter P moy 30s + P pic.",
          "Récup complète 10 min Z1.",
        ],
        rows: [
          { measure: "Wingate 30s — P moy", unit: "watts" },
          { measure: "Wingate 30s — P pic", unit: "watts" },
          { measure: "Lactate post (si dispo)", unit: "mmol/L" },
        ],
      },
      {
        title: "Bloc 3 — MAP (PMA 5 min)",
        duration: "~15 min",
        instructions: [
          "Test 5 min all-out à puissance soutenable maximale.",
          "Cadence libre, position aéro confortable.",
          "Noter P moy + FC pic.",
        ],
        rows: [
          { measure: "Test 5 min — P moyenne", unit: "watts" },
          { measure: "FC moyenne 5 min", unit: "bpm" },
          { measure: "FC pic", unit: "bpm" },
        ],
      },
      {
        title: "Bloc 4 — FTP (20 min)",
        duration: "~30 min",
        instructions: [
          "Récup active 10 min Z1-Z2.",
          "Test 20 min à puissance maximale stable.",
          "FTP estimée ≈ 95 % de P moy 20 min.",
        ],
        rows: [
          { measure: "Test 20 min — P moyenne", unit: "watts" },
          { measure: "Test 20 min — NP", unit: "watts" },
          { measure: "FC moyenne 20 min", unit: "bpm" },
          { measure: "RPE final", unit: "/10" },
        ],
      },
    ],
    results: [
      { metric: "FTP estimée", unit: "W" },
      { metric: "MAP / PMA estimée", unit: "W" },
      { metric: "VLamax estimée", unit: "mmol/L/s" },
      { metric: "W' estimé", unit: "kJ" },
      { metric: "CP estimée", unit: "W" },
      { metric: "FC max observée", unit: "bpm" },
    ],
    detailed: [
      {
        title: "Préparation 48h avant",
        items: [
          "J-2 : sortie souple Z2 max 1h, pas d'intervalle.",
          "J-1 : repos ou 30 min Z1 ouverture jambes (2×30s rythme).",
          "Repas 3h avant : 1.5-2 g/kg glucides, hydratation 500 ml + électrolytes.",
          "Calibration capteur de puissance (zero-offset) avant chaque bloc.",
          "Position aéro confirmée et identique à la position de course.",
        ],
      },
      {
        title: "Conditions de validité",
        items: [
          "Home-trainer ERG OFF (slope mode) — sinon FTP biaisée par lissage.",
          "Ventilation forte : T° corporelle stable, perte fluide < 1% poids.",
          "Cadence libre 85-100 rpm sur tests, notée pour chaque bloc.",
          "Sprint 10s : départ debout, gros braquet, chute cadence < 10 rpm = mauvais.",
          "Wingate 30s : départ lancé 60 rpm Z2, all-out immédiat, P moy retenue.",
          "FTP 20' : variation P par minute < 5% (sinon pacing instable, refaire).",
        ],
      },
      {
        title: "Formules de calcul",
        items: [
          "FTP = 0.95 × P moy 20' (méthode Coggan).",
          "MAP = P moy 5 min (≈ VO2max via formule Storer si poids connu).",
          "CP / W' = régression hyperbolique sur (30s, 5min, 20min) — minimum 3 points.",
          "VLamax_bike (Score G) = f(P30s/P5min, P10s/P30s, drop FC) — moteur unifié.",
          "Pmax 5s normalisée = P pic / poids (W/kg) — référence neuro-musculaire.",
          "TTE bike = f(W'/(CP·intensité), VLamax, économie aéro).",
        ],
      },
      {
        title: "Erreurs fréquentes à éviter",
        items: [
          "Wingate avec décélération en fin (regard sur écran) → P moy sous-estimée.",
          "FTP 20' sans 5 min MAP préalable → MAP biaisée par fatigue résiduelle.",
          "Position route ≠ position aéro CLM → FTP non transposable.",
          "Calibration ZO oubliée → erreur +/- 15-25 W.",
          "Récupération inter-blocs < 8 min → VLamax sur-estimée par épuisement W'.",
        ],
      },
      {
        title: "Sécurité & arrêt du test",
        items: [
          "Arrêt si : palpitations, douleur thoracique, vision floue, FC plafonnée.",
          "ECG d'effort recommandé > 40 ans avant test all-out répété.",
          "Cool-down obligatoire 10-15 min Z1 pour clearance lactate.",
          "Hydratation post : 1.5× poids perdu en 2h.",
        ],
      },
    ],
  },


  "pool-day": {
    name: "TFCL Pool Day™",
    emoji: "🏊",
    subtitle: "Protocole piscine 1h30 — CSS, VLamax nage, capacité aérobie",
    material: ["Piscine 25m ou 50m", "Chronomètre", "Pull-buoy / plaquettes (optionnel)", "Cardio étanche (optionnel)"],
    blocks: [
      {
        title: "Bloc 1 — Échauffement & technique",
        duration: "~20 min",
        instructions: [
          "400m crawl progressif.",
          "4×50m éducatifs (rattrapé, polo, etc.) R:15s.",
          "4×25m progressifs vite R:20s.",
        ],
        rows: [
          { measure: "Sensation technique", unit: "/10" },
          { measure: "FC fin échauffement", unit: "bpm" },
        ],
      },
      {
        title: "Bloc 2 — Sprint (VLamax nage)",
        duration: "~15 min",
        instructions: [
          "Récup 3 min souple.",
          "Sprint 25m départ plongé maximal (×2, récup 3 min).",
          "Noter le meilleur temps.",
        ],
        rows: [
          { measure: "Sprint 25m (essai 1)", unit: "sec" },
          { measure: "Sprint 25m (essai 2)", unit: "sec" },
          { measure: "FC pic post-sprint", unit: "bpm" },
        ],
      },
      {
        title: "Bloc 3 — CSS (200 + 400m)",
        duration: "~25 min",
        instructions: [
          "200m all-out (départ dans l'eau) — récup 5 min.",
          "400m all-out (départ dans l'eau).",
          "CSS = (400 − 200) / (T400 − T200).",
        ],
        rows: [
          { measure: "Test 200m — temps", unit: "min:sec" },
          { measure: "Test 400m — temps", unit: "min:sec" },
          { measure: "FC moyenne 400m", unit: "bpm" },
          { measure: "RPE 400m", unit: "/10" },
        ],
      },
      {
        title: "Bloc 4 — Endurance critique (1500m)",
        duration: "~25 min",
        instructions: [
          "Récup 5 min.",
          "1500m à allure CSS soutenable.",
          "Noter splits 500m + FC moyenne.",
        ],
        rows: [
          { measure: "Temps 1500m", unit: "min:sec" },
          { measure: "Split 500m #1", unit: "min:sec" },
          { measure: "Split 500m #2", unit: "min:sec" },
          { measure: "Split 500m #3", unit: "min:sec" },
          { measure: "RPE final", unit: "/10" },
        ],
      },
    ],
    results: [
      { metric: "CSS estimée", unit: "s/100m" },
      { metric: "Allure CSS", unit: "min/100m" },
      { metric: "VLamax nage estimée", unit: "mmol/L/s" },
      { metric: "Vitesse seuil", unit: "m/s" },
      { metric: "TTE nage estimé", unit: "min" },
    ],
    detailed: [
      {
        title: "Préparation 48h avant",
        items: [
          "J-2 : nage technique 2000m max, aucun sprint.",
          "J-1 : repos ou 1500m souple éducatifs.",
          "Repas 3h avant : glucides simples + 500 ml eau.",
          "Combinaison interdite (sauf si test spécifique CLM eau libre).",
          "Bassin calibré (25m ou 50m), virages culbutés ou ouverts à préciser.",
        ],
      },
      {
        title: "Conditions de validité",
        items: [
          "Température eau 25-28°C, ligne d'eau libre (pas de coupure de couloir).",
          "Sprint 25m : départ plongé bloc, chrono manuel au plongeon → mur d'arrivée.",
          "Test 200m : départ dans l'eau (mur), all-out constant — split à 100m noté.",
          "Récup 200/400m : 5-10 min Z1 souple (≥ FC < 110 bpm avant 400m).",
          "Test 400m : variation par 100m < 1.5 s (sinon pacing instable, refaire).",
          "Bassin 25m → ajouter 0.5 s/100m de correction vs 50m (virages).",
        ],
      },
      {
        title: "Formules de calcul",
        items: [
          "CSS (s/100m) = (400 − 200) / (T400 − T200) × 100 (formule Wakayoshi 1992).",
          "Allure CSS = CSS / 100 × 100 → exprimée min:sec/100m.",
          "Vitesse seuil (m/s) = 100 / CSS.",
          "VLamax_swim index = f(V_sprint25m, drop V_400m) — normalisée 0-1.",
          "TTE nage = 25-40 min à CSS pour nageur entraîné (cible 30 min).",
        ],
      },
      {
        title: "Erreurs fréquentes à éviter",
        items: [
          "Sprint 25m en culbute (pas de plongeon) → temps majoré 1-1.5 s.",
          "200m parti trop fort (split #1 < 90% CSS attendu) → CSS sur-estimée.",
          "400m avec dérive technique (fréquence ↓ 10%) → CSS sous-estimée.",
          "Chronométrage GoPro/écran sans synchro main → biais 0.3-0.5 s.",
          "Eau froide (< 24°C) ou chaude (> 29°C) → biais physiologique.",
        ],
      },
      {
        title: "Sécurité",
        items: [
          "Test impossible seul : présence MNS ou binôme bord de bassin obligatoire.",
          "Hyperventilation pré-plongée interdite (risque syncope).",
          "Arrêt si vertige, nausée, crampe — sortie immédiate.",
        ],
      },
    ],
  },

  "tri-day": {
    name: "TFCL Tri Test Day™",
    emoji: "⚡",
    subtitle: "Protocole triathlon combiné — profil complet en 2 séances",
    material: ["Vélo + capteur puissance", "Piste / GPS", "Piscine (J2)", "Cardio", "Chronomètre"],
    blocks: [
      {
        title: "Jour 1 — Bloc Vélo (FTP 20')",
        duration: "~75 min",
        instructions: [
          "Échauffement 20 min progressif.",
          "Sprint 10s ×3 R:3 min.",
          "Wingate 30s × 1.",
          "Test FTP 20 min all-out.",
        ],
        rows: [
          { measure: "Sprint 10s — P pic", unit: "watts" },
          { measure: "Wingate 30s — P moy", unit: "watts" },
          { measure: "Test 20 min — P moy", unit: "watts" },
          { measure: "FC max bike", unit: "bpm" },
        ],
      },
      {
        title: "Jour 1 — Bloc Course (post-vélo)",
        duration: "~30 min",
        instructions: [
          "Transition rapide (T2 simulée).",
          "Échauffement footing 5 min.",
          "Test 3km tempo soutenable.",
        ],
        rows: [
          { measure: "Temps 3km", unit: "min:sec" },
          { measure: "FC moyenne 3km", unit: "bpm" },
          { measure: "RPE final", unit: "/10" },
        ],
      },
      {
        title: "Jour 2 — Bloc Natation (CSS)",
        duration: "~75 min",
        instructions: [
          "Échauffement 600m varié.",
          "Sprint 25m ×2.",
          "Test 200m all-out + Test 400m all-out (récup 5 min).",
        ],
        rows: [
          { measure: "Sprint 25m (meilleur)", unit: "sec" },
          { measure: "Test 200m", unit: "min:sec" },
          { measure: "Test 400m", unit: "min:sec" },
          { measure: "FC moyenne 400m", unit: "bpm" },
        ],
      },
      {
        title: "Jour 2 — Course longue (TTE)",
        duration: "~45 min",
        instructions: [
          "Footing 10 min.",
          "Test 5km tempo seuil.",
          "Noter splits par km + ressenti.",
        ],
        rows: [
          { measure: "Temps 5km", unit: "min:sec" },
          { measure: "FC moyenne 5km", unit: "bpm" },
          { measure: "Splits km 1-5", unit: "min:sec" },
          { measure: "RPE final", unit: "/10" },
        ],
      },
    ],
    results: [
      { metric: "FTP vélo estimée", unit: "W" },
      { metric: "VMA course estimée", unit: "km/h" },
      { metric: "CSS nage estimée", unit: "s/100m" },
      { metric: "VLamax (3 sports)", unit: "mmol/L/s" },
      { metric: "TTE multi-sport", unit: "min" },
      { metric: "FC max par sport", unit: "bpm" },
    ],
    detailed: [
      {
        title: "Planning des 2 jours",
        items: [
          "Jour 1 matin : Vélo (FTP + VLamax) ~75 min — frais.",
          "Jour 1 après-midi (≥ 4h plus tard) : Course post-vélo 3 km tempo.",
          "Jour 2 matin : Natation CSS 200/400m — frais.",
          "Jour 2 après-midi (≥ 4h plus tard) : Course 5 km seuil pour TTE.",
          "Si impossible 2 jours : étaler sur 4 jours (un test par jour) avec Z2 entre les deux.",
        ],
      },
      {
        title: "Conditions de validité",
        items: [
          "Pas de séance intense J-2 et J-1 avant J1, ni entre les tests.",
          "Hydratation 35 ml/kg + 500 ml 1h avant chaque test.",
          "Sommeil ≥ 7h les 2 nuits, RPE matinal ≤ 3/10.",
          "Capteur puissance calibré, GPS course validé sur tour étalon.",
          "FC repos matinale dans ±5 bpm de la baseline.",
        ],
      },
      {
        title: "Formules de calcul",
        items: [
          "FTP = 0.95 × P moy 20'.",
          "VMA (km/h) = distance_3km × 60 / temps_min (corrigée +3% si post-vélo).",
          "CSS (s/100m) = (400 − 200) / (T400 − T200) × 100.",
          "VLamax triathlon pondérée = moyenne pondérée par durée discipline cible.",
          "FC max retenue par sport = max observé sur chaque test (jamais cross-sport).",
        ],
      },
      {
        title: "Erreurs fréquentes à éviter",
        items: [
          "Course 3 km post-vélo trop molle (manque de relance T2) → VMA biaisée.",
          "Confondre FC max bike et FC max run (peut différer 5-15 bpm).",
          "Tester natation en fin de journée → CSS dégradée 2-3 s/100m.",
          "Pacing 5 km TTE non régulier → TTE non exploitable.",
        ],
      },
      {
        title: "Sécurité",
        items: [
          "ECG d'effort recommandé avant tri-day si > 40 ans.",
          "Présence MNS au bloc natation obligatoire.",
          "Récupération active 10-15 min après chaque bloc all-out.",
          "Hydratation post : 1.5× poids perdu dans les 2h.",
        ],
      },
    ],
  },
};


const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const blank = (width = "100%") =>
  `<span style="display:inline-block;border-bottom:1px solid #555;min-width:80px;width:${width};height:14px;"></span>`;

export function buildDiagnosticProtocolHTML(
  protocol: DiagnosticProtocol,
  athleteName?: string,
): string {
  const p = PROTOCOLS[protocol];
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const athlete = athleteName ? escapeHtml(athleteName) : blank("200px");

  const materialHtml = p.material
    .map((m) => `<label style="display:inline-block;margin-right:14px;font-size:10pt;">☐ ${escapeHtml(m)}</label>`)
    .join("");

  const blocksHtml = p.blocks
    .map(
      (b, i) => `
    <div class="block">
      <h3>${escapeHtml(b.title)} <span class="duration">— ${escapeHtml(b.duration)}</span></h3>
      <ol class="instructions">
        ${b.instructions.map((ins) => `<li>${escapeHtml(ins)}</li>`).join("")}
      </ol>
      <table class="data">
        <thead><tr><th style="width:45%">Mesure</th><th style="width:20%">Valeur</th><th style="width:15%">Unité</th><th style="width:20%">Notes</th></tr></thead>
        <tbody>
          ${b.rows
            .map(
              (r) =>
                `<tr><td>${escapeHtml(r.measure)}</td><td class="fill"></td><td>${escapeHtml(r.unit)}</td><td class="fill"></td></tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>`,
    )
    .join("");

  const resultsHtml = p.results
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.metric)}</td><td class="fill"></td><td class="fill"></td><td>${escapeHtml(r.unit)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(p.name)} — Protocole papier</title>
<style>
  @page { size: A4 portrait; margin: 15mm 15mm 20mm; @bottom-right { content: "Page " counter(page) " / " counter(pages); font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #555; } @bottom-left { content: "TFCLab™ · ${escapeHtml(p.name)}"; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #555; } }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111; margin: 0; line-height: 1.4; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 12px; }
  .header .brand { font-size: 16pt; font-weight: bold; color: #0d9488; }
  .header .brand small { display: block; font-size: 10pt; color: #555; font-weight: normal; }
  .header .meta { font-size: 10pt; text-align: right; }
  h1 { font-size: 14pt; color: #0d9488; margin: 4px 0; }
  h2 { font-size: 12pt; color: #0d9488; border-bottom: 1px solid #0d9488; padding-bottom: 3px; margin-top: 14px; margin-bottom: 8px; }
  h3 { font-size: 11pt; color: #0d9488; margin: 10px 0 4px; }
  h3 .duration { color: #666; font-weight: normal; font-size: 10pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { border: 1px solid #bbb; padding: 8px 10px; font-size: 10.5pt; text-align: left; vertical-align: middle; }
  th { background: #f1f5f5; color: #0d9488; font-weight: 600; }
  td.fill { height: 32px; background: repeating-linear-gradient(transparent, transparent 28px, #ccc 28px, #ccc 29px); }
  .instructions { margin: 4px 0 8px 18px; padding: 0; font-size: 10.5pt; }
  .instructions li { margin-bottom: 2px; }
  .block { page-break-inside: avoid; margin-bottom: 10px; }
  .coach-line { margin-top: 6px; font-size: 10pt; }
  .notes-area { border: 1px solid #bbb; height: 180px; background: repeating-linear-gradient(transparent, transparent 22px, #ccc 22px, #ccc 23px); }
  .footer { margin-top: 18px; padding-top: 6px; border-top: 1px solid #0d9488; font-size: 8.5pt; color: #555; text-align: center; }
  .print-btn { position: fixed; top: 10px; right: 10px; background: #0d9488; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 11pt; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Imprimer / PDF</button>

  <div class="header">
    <div class="brand">TFCLab™ <small>Two For Coaching</small></div>
    <div class="meta">
      <div><strong>${p.emoji} ${escapeHtml(p.name)}</strong></div>
      <div>${escapeHtml(p.subtitle)}</div>
      <div>Date : ${today}</div>
    </div>
  </div>

  <h1>Protocole de test — Version papier</h1>
  <div class="coach-line"><strong>Athlète :</strong> ${athlete} &nbsp;&nbsp; <strong>Coach :</strong> ${blank("220px")}</div>

  <h2>1 · Informations générales</h2>
  <table>
    <tr><th style="width:30%">Date du test</th><td class="fill"></td><th style="width:30%">Heure de début</th><td class="fill"></td></tr>
    <tr><th>Conditions (météo / T°)</th><td class="fill"></td><th>Heure de fin</th><td class="fill"></td></tr>
    <tr><th>Lieu</th><td class="fill"></td><th>Durée totale</th><td class="fill"></td></tr>
  </table>
  <div style="margin-top:6px;"><strong>Matériel utilisé :</strong><br/>${materialHtml}</div>

  <h2>2 · Données de base</h2>
  <table>
    <tr><th style="width:25%">Poids (kg)</th><td class="fill"></td><th style="width:25%">Taille (cm)</th><td class="fill"></td></tr>
    <tr><th>FC repos (bpm)</th><td class="fill"></td><th>FC max connue (bpm)</th><td class="fill"></td></tr>
  </table>

  <h2>3 · Protocole détaillé</h2>
  ${blocksHtml}

  <h2>4 · Résultats calculés <span style="font-size:9pt;font-weight:normal;color:#666;">(à remplir après le test)</span></h2>
  <table>
    <thead><tr><th style="width:40%">Métrique</th><th style="width:20%">Valeur</th><th style="width:20%">Valeur précédente</th><th style="width:20%">Unité</th></tr></thead>
    <tbody>${resultsHtml}</tbody>
  </table>

  <h2>5 · Notes du coach</h2>
  <div class="notes-area"></div>

  <div class="footer">
    TFCLab™ — Two For Coaching · Protocole scientifique basé sur Billat 2001, Léger &amp; Bouchard 1980, Coggan 2010, Wakayoshi 1992 · Confidentiel
  </div>
</body>
</html>`;
}

/**
 * Ouvre le protocole dans un nouvel onglet imprimable.
 */
export function openDiagnosticProtocolPrint(
  protocol: DiagnosticProtocol,
  athleteName?: string,
): void {
  const html = buildDiagnosticProtocolHTML(protocol, athleteName);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// ============================================================================
// DOSSIER COMPLET — Plusieurs fiches en un seul PDF imprimable
// Refonte : sommaire navigable, chapitres numérotés, encadrés typés,
// champs à remplir nets (cellules bordées hautes), synthèse regroupée.
// ============================================================================

export type DossierSport = "triathlon" | "course" | "cyclisme";

/** Mappe un titre de section "detailed" à un type visuel (couleur + icône). */
type CalloutKind = "prep" | "validity" | "formula" | "error" | "safety" | "planning";

function detectCalloutKind(title: string): CalloutKind {
  const t = title.toLowerCase();
  if (t.includes("préparation") || t.includes("preparation")) return "prep";
  if (t.includes("planning")) return "planning";
  if (t.includes("validité") || t.includes("validite") || t.includes("condition")) return "validity";
  if (t.includes("formule") || t.includes("calcul")) return "formula";
  if (t.includes("erreur")) return "error";
  if (t.includes("sécurité") || t.includes("securite") || t.includes("arrêt")) return "safety";
  return "validity";
}

const CALLOUT_META: Record<CalloutKind, { icon: string; label: string }> = {
  prep:     { icon: "📋", label: "Préparation" },
  planning: { icon: "📅", label: "Planning" },
  validity: { icon: "✅", label: "Conditions de validité" },
  formula:  { icon: "🧮", label: "Formules" },
  error:    { icon: "⚠️",  label: "Erreurs fréquentes" },
  safety:   { icon: "🚨", label: "Sécurité" },
};

/** Construit la fiche d'un protocole pour le dossier (chapitre numéroté). */
function buildProtocolChapter(
  protocol: DiagnosticProtocol,
  chapterNumber: number,
  athleteName?: string,
): string {
  const p = PROTOCOLS[protocol];
  const athlete = athleteName ? escapeHtml(athleteName) : blank("220px");

  const materialHtml = p.material
    .map((m) => `<span class="chip">☐ ${escapeHtml(m)}</span>`)
    .join("");

  // Blocs de test : chaque bloc = carte numérotée avec étapes + tableau de mesures.
  const blocksHtml = p.blocks
    .map(
      (b, i) => `
    <div class="block-card">
      <div class="block-head">
        <span class="block-num">${chapterNumber}.${i + 1}</span>
        <div class="block-title">${escapeHtml(b.title)}</div>
        <span class="block-duration">⏱ ${escapeHtml(b.duration)}</span>
      </div>
      <div class="block-body">
        <div class="block-steps">
          <div class="mini-label">Étapes</div>
          <ol class="instructions">
            ${b.instructions.map((ins) => `<li>${escapeHtml(ins)}</li>`).join("")}
          </ol>
        </div>
        <div class="block-measures">
          <div class="mini-label">Mesures à reporter</div>
          <table class="data">
            <thead><tr><th style="width:52%">Mesure</th><th style="width:28%">Valeur</th><th style="width:20%">Unité</th></tr></thead>
            <tbody>
              ${b.rows
                .map(
                  (r) =>
                    `<tr><td>${escapeHtml(r.measure)}</td><td class="fill-cell"></td><td class="unit-cell">${escapeHtml(r.unit)}</td></tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>`,
    )
    .join("");

  // Encadrés scientifiques (préparation, validité, formules, erreurs, sécurité)
  const detailedHtml = (p.detailed ?? [])
    .map((sec) => {
      const kind = detectCalloutKind(sec.title);
      const meta = CALLOUT_META[kind];
      return `
      <div class="callout callout-${kind}">
        <div class="callout-head"><span class="callout-icon">${meta.icon}</span> ${escapeHtml(sec.title)}</div>
        <ul class="callout-list">
          ${sec.items.map((it) => `<li>${escapeHtml(it)}</li>`).join("")}
        </ul>
      </div>`;
    })
    .join("");

  const resultsHtml = p.results
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.metric)}</td><td class="fill-cell"></td><td class="fill-cell"></td><td class="unit-cell">${escapeHtml(r.unit)}</td></tr>`,
    )
    .join("");

  return `
  <section class="chapter" id="chap-${protocol}">
    <!-- Bandeau chapitre -->
    <div class="chapter-banner">
      <div class="chapter-num">Chapitre ${chapterNumber}</div>
      <div class="chapter-title"><span class="chapter-emoji">${p.emoji}</span> ${escapeHtml(p.name)}</div>
      <div class="chapter-sub">${escapeHtml(p.subtitle)}</div>
    </div>

    <div class="page-meta">
      <span><strong>Athlète :</strong> ${athlete}</span>
      <span><strong>Date du test :</strong> ${blank("120px")}</span>
      <span><strong>Lieu :</strong> ${blank("160px")}</span>
    </div>

    <h2>${chapterNumber}.0 — Contexte &amp; matériel</h2>
    <table class="kv-table">
      <tr><th>Heure de début</th><td class="fill-cell"></td><th>Heure de fin</th><td class="fill-cell"></td></tr>
      <tr><th>Conditions (T° / vent / météo)</th><td class="fill-cell" colspan="3"></td></tr>
      <tr><th>Poids du jour (kg)</th><td class="fill-cell"></td><th>FC repos matinale (bpm)</th><td class="fill-cell"></td></tr>
    </table>
    <div class="material-block">
      <div class="mini-label">Matériel à cocher</div>
      <div class="chip-row">${materialHtml}</div>
    </div>

    <h2>${chapterNumber}.A — Protocole pas à pas</h2>
    ${blocksHtml}

    ${detailedHtml ? `<h2>${chapterNumber}.B — Cadre scientifique &amp; sécurité</h2>${detailedHtml}` : ""}

    <h2>${chapterNumber}.C — Résultats calculés <span class="h2-hint">(à remplir après le test)</span></h2>
    <table class="results-table">
      <thead><tr><th style="width:40%">Métrique</th><th style="width:20%">Valeur</th><th style="width:20%">Valeur précédente</th><th style="width:20%">Unité</th></tr></thead>
      <tbody>${resultsHtml}</tbody>
    </table>

    <h2>${chapterNumber}.D — Notes du coach</h2>
    <div class="lined-notes"></div>
  </section>`;
}

/**
 * Construit un dossier complet imprimable : couverture + sommaire + chapitres + synthèse.
 */
export function buildFullDiagnosticDossierHTML(
  athleteName?: string,
  sport: DossierSport = "triathlon",
): string {
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const athlete = athleteName ? escapeHtml(athleteName) : blank("260px");
  const sportLabel =
    sport === "triathlon" ? "Triathlon" : sport === "course" ? "Course à pied" : "Cyclisme";

  // Sélection des fiches : Track + Bike toujours, Pool seulement si triathlon.
  const protocols: DiagnosticProtocol[] = ["track-day", "bike-day"];
  if (sport === "triathlon") protocols.push("pool-day");

  // Numérotation : Chapitre 1 = Track, 2 = Bike, 3 = Pool (si tri)
  const chapters = protocols.map((proto, idx) => ({
    num: idx + 1,
    proto,
    def: PROTOCOLS[proto],
  }));

  // Sommaire
  const tocRows = [
    { num: "—", title: "Page de garde", page: "1" },
    { num: "—", title: "Sommaire", page: "2" },
    { num: "—", title: "Mode d'emploi du dossier", page: "3" },
    ...chapters.map((c) => ({
      num: String(c.num),
      title: `${c.def.emoji} ${c.def.name} — ${c.def.subtitle}`,
      page: "→",
    })),
    { num: String(chapters.length + 1), title: "📊 Synthèse du profil physiologique", page: "→" },
  ];
  const tocHtml = tocRows
    .map(
      (r) => `
      <tr>
        <td class="toc-num">${escapeHtml(r.num)}</td>
        <td class="toc-title">${escapeHtml(r.title)}</td>
        <td class="toc-dots"></td>
        <td class="toc-page">${escapeHtml(r.page)}</td>
      </tr>`,
    )
    .join("");

  const chapterPages = chapters
    .map((c) => buildProtocolChapter(c.proto, c.num, athleteName))
    .join('\n<div class="page-break"></div>\n');

  // Tableau de synthèse — regroupé par catégorie pour la lisibilité
  type SynthRow = { metric: string; unit: string };
  const synthGroups: Array<{ title: string; rows: SynthRow[] }> = [
    {
      title: "Puissance & seuils aérobies",
      rows: [
        { metric: "FTP", unit: "W" },
        { metric: "FTP/kg", unit: "W/kg" },
        { metric: "VMA", unit: "km/h" },
        { metric: "CSS", unit: "s/100m" },
        { metric: "FC max", unit: "bpm" },
        { metric: "FC repos", unit: "bpm" },
        { metric: "VO2max estimé", unit: "ml/kg/min" },
      ],
    },
    {
      title: "Capacités anaérobies & neuromusculaires",
      rows: [
        { metric: "VLamax vélo", unit: "mmol/L/s" },
        { metric: "VLamax course", unit: "mmol/L/s" },
        { metric: "Pmax 5s", unit: "W/kg" },
        { metric: "P1s CMJ", unit: "W/kg" },
      ],
    },
    {
      title: "Endurance, efficience & métabolisme",
      rows: [
        { metric: "TTE vélo", unit: "min" },
        { metric: "TTE course", unit: "min" },
        { metric: "Économie de course", unit: "ml/kg/km" },
        { metric: "FatMax estimé", unit: "% FTP" },
      ],
    },
  ];

  const synthesisHtml = synthGroups
    .map(
      (g) => `
      <h3 class="synth-group-title">${escapeHtml(g.title)}</h3>
      <table class="synthesis-table">
        <thead>
          <tr>
            <th style="width:40%">Métrique</th>
            <th style="width:22%">Mesurée</th>
            <th style="width:22%">Précédente</th>
            <th style="width:16%">Unité</th>
          </tr>
        </thead>
        <tbody>
          ${g.rows
            .map(
              (r) =>
                `<tr><td>${escapeHtml(r.metric)}</td><td class="fill-cell"></td><td class="fill-cell"></td><td class="unit-cell">${escapeHtml(r.unit)}</td></tr>`,
            )
            .join("")}
        </tbody>
      </table>`,
    )
    .join("");

  const conclusionLines = Array.from({ length: 15 })
    .map(() => `<div class="conclusion-line"></div>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Dossier de Tests Physiologiques TFCL™ — ${escapeHtml(athleteName || "Athlète")}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 14mm 20mm; @bottom-right { content: "Page " counter(page) " / " counter(pages); font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #555; } @bottom-left { content: "TFCLab™ · Dossier de Tests Physiologiques"; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #555; } }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111; margin: 0; line-height: 1.45; }

  /* ---- Typographie & hiérarchie commune ---- */
  h1 { font-size: 18pt; color: #0d9488; margin: 4px 0 8px; }
  h2 { font-size: 13pt; color: #0d9488; margin: 18px 0 8px; padding: 6px 10px; background: #e6f4f3; border-left: 4px solid #0d9488; border-radius: 2px; page-break-after: avoid; }
  h2 .h2-hint { font-size: 9pt; font-weight: normal; color: #666; margin-left: 6px; }
  h3 { font-size: 11pt; color: #0d9488; margin: 10px 0 4px; }
  .mini-label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #555; font-weight: 600; margin-bottom: 4px; }

  /* ---- Tableaux génériques ---- */
  table { width: 100%; border-collapse: collapse; margin-top: 2px; }
  th, td { border: 1px solid #b9c6c6; padding: 8px 10px; font-size: 10.5pt; text-align: left; vertical-align: middle; }
  th { background: #f1f7f6; color: #0d6b65; font-weight: 600; }
  .kv-table th { width: 28%; }
  .results-table th { background: #fdf6e3; color: #8a6d1f; }
  .results-table tbody tr td:first-child { font-weight: 600; }

  /* ---- Champs à remplir : cellule haute, fond très clair, baseline nette ---- */
  td.fill-cell { height: 32px; padding: 8px 10px; background: #fcfdfd; border-bottom: 1.5px solid #0d9488; }
  td.unit-cell { padding: 8px 10px; background: #f7faf9; color: #555; font-size: 10pt; text-align: center; }

  /* ---- Cards ---- */
  .block-card { border: 1px solid #c8d4d4; border-radius: 4px; margin: 10px 0 14px; overflow: hidden; page-break-inside: avoid; }
  .block-head { display: flex; align-items: center; gap: 10px; background: #0d9488; color: white; padding: 6px 10px; }
  .block-num { background: white; color: #0d9488; font-weight: bold; padding: 2px 8px; border-radius: 3px; font-size: 10.5pt; }
  .block-title { flex: 1; font-weight: bold; font-size: 11pt; }
  .block-duration { font-size: 9.5pt; opacity: 0.95; white-space: nowrap; }
  .block-body { padding: 8px 10px 10px; }
  .block-steps { margin-bottom: 8px; }
  .instructions { margin: 0 0 0 22px; padding: 0; font-size: 10.5pt; }
  .instructions li { margin-bottom: 3px; }

  /* ---- Encadrés typés (callouts) ---- */
  .callout { margin: 8px 0 10px; padding: 8px 12px 8px 14px; border-left: 4px solid; border-radius: 3px; page-break-inside: avoid; }
  .callout-head { font-weight: bold; font-size: 10.5pt; margin-bottom: 4px; }
  .callout-icon { margin-right: 4px; }
  .callout-list { margin: 0 0 0 20px; padding: 0; font-size: 10pt; line-height: 1.5; }
  .callout-list li { margin-bottom: 2px; }
  .callout-prep     { background: #fff8e6; border-color: #d4a017; }
  .callout-prep .callout-head { color: #8a6d14; }
  .callout-planning { background: #eef4fb; border-color: #2563eb; }
  .callout-planning .callout-head { color: #1d4ed8; }
  .callout-validity { background: #ecfaf2; border-color: #16a34a; }
  .callout-validity .callout-head { color: #166534; }
  .callout-formula  { background: #f1f5fb; border-color: #4f46e5; }
  .callout-formula .callout-head { color: #3730a3; }
  .callout-error    { background: #fdecec; border-color: #dc2626; }
  .callout-error .callout-head { color: #991b1b; }
  .callout-safety   { background: #f4f4f5; border-color: #374151; }
  .callout-safety .callout-head { color: #1f2937; }

  /* ---- Matériel à cocher ---- */
  .material-block { margin: 6px 0 4px; }
  .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { display: inline-block; padding: 3px 8px; border: 1px solid #b9c6c6; border-radius: 14px; font-size: 9.5pt; background: #fafcfc; }

  /* ---- Méta page chapitre ---- */
  .page-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 10pt; color: #333; margin: 6px 0 4px; padding: 6px 10px; background: #f7fafa; border: 1px dashed #b9c6c6; border-radius: 3px; }

  /* ---- Bandeau chapitre ---- */
  .chapter-banner { background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); color: white; padding: 14px 18px; border-radius: 4px; margin-bottom: 12px; page-break-after: avoid; }
  .chapter-num { font-size: 9.5pt; letter-spacing: 2px; text-transform: uppercase; opacity: 0.85; margin-bottom: 2px; }
  .chapter-title { font-size: 18pt; font-weight: bold; line-height: 1.15; }
  .chapter-emoji { margin-right: 6px; }
  .chapter-sub { font-size: 10.5pt; opacity: 0.95; margin-top: 4px; }

  /* ---- Notes lignées ---- */
  .lined-notes { border: 1px solid #b9c6c6; height: 150px; background: repeating-linear-gradient(transparent, transparent 23px, #d0d0d0 23px, #d0d0d0 24px); border-radius: 3px; }

  /* ---- Sauts de page & impression ---- */
  .page-break { page-break-after: always; }
  .footer { margin-top: 20px; padding-top: 6px; border-top: 1px solid #0d9488; font-size: 8.5pt; color: #555; text-align: center; }
  .print-btn { position: fixed; top: 10px; right: 10px; background: #0d9488; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 11pt; cursor: pointer; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
  @media print { .print-btn { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

  /* ---- Couverture ---- */
  .cover { min-height: 95vh; display: flex; flex-direction: column; justify-content: space-between; padding: 30px 10px; }
  .cover-top { text-align: center; }
  .cover .logo { font-size: 38pt; font-weight: bold; color: #0d9488; letter-spacing: -1px; }
  .cover .logo small { display: block; font-size: 12pt; color: #555; font-weight: normal; margin-top: 2px; }
  .cover .doc-tag { display: inline-block; margin-top: 18px; padding: 4px 14px; background: #0d9488; color: white; font-size: 10pt; letter-spacing: 2px; text-transform: uppercase; border-radius: 20px; }
  .cover .doc-title { font-size: 30pt; color: #0d9488; margin: 60px 0 12px; font-weight: bold; text-align: center; line-height: 1.1; }
  .cover .doc-sub { font-size: 13pt; color: #555; text-align: center; margin-bottom: 40px; }
  .cover .info-card { border: 2px solid #0d9488; border-radius: 6px; padding: 20px 28px; margin: 0 auto; max-width: 480px; background: #f7fafa; }
  .cover .info-card .info-line { display: flex; align-items: baseline; margin: 12px 0; font-size: 12pt; }
  .cover .info-card .info-line .lbl { width: 130px; color: #555; font-weight: 600; }
  .cover .info-card .info-line .val { flex: 1; border-bottom: 1px solid #777; min-height: 18px; padding-left: 6px; }
  .cover-footer { text-align: center; font-size: 9pt; color: #777; margin-top: 30px; }

  /* ---- Sommaire ---- */
  .toc-table { border: none; }
  .toc-table td, .toc-table th { border: none; padding: 7px 0; }
  .toc-num { width: 50px; font-weight: bold; color: #0d9488; font-size: 11pt; }
  .toc-title { font-size: 11pt; }
  .toc-dots { border-bottom: 2px dotted #999; height: 1px; }
  .toc-page { width: 50px; text-align: right; color: #555; font-weight: 600; }

  /* ---- Mode d'emploi ---- */
  .howto-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
  .howto-card { border: 1px solid #c8d4d4; border-radius: 4px; padding: 10px 12px; background: #fafcfc; }
  .howto-card .htc-title { font-weight: bold; color: #0d9488; font-size: 11pt; margin-bottom: 4px; }
  .howto-card .htc-body { font-size: 10pt; color: #333; line-height: 1.45; }
  .legend-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 10pt; }
  .legend-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,0.15); }

  /* ---- Synthèse ---- */
  .synth-group-title { margin: 14px 0 4px; color: #0d9488; font-size: 11.5pt; }
  .synthesis-table th { background: #e6f4f3; }
  .synthesis-table tbody tr td:first-child { font-weight: 600; }
  .conclusion-line { border-bottom: 1px solid #aaa; height: 26px; margin: 0; }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Imprimer / PDF</button>

  <!-- ============================ 1 · COUVERTURE ============================ -->
  <section class="cover">
    <div class="cover-top">
      <div class="logo">TFCLab™<small>Two For Coaching</small></div>
      <div class="doc-tag">Dossier de tests physiologiques</div>
    </div>

    <div>
      <div class="doc-title">Dossier de Tests<br/>Physiologiques TFCL™</div>
      <div class="doc-sub">${escapeHtml(sportLabel)} — Édition du ${today}</div>

      <div class="info-card">
        <div class="info-line"><span class="lbl">Athlète</span><span class="val">${athleteName ? escapeHtml(athleteName) : ""}</span></div>
        <div class="info-line"><span class="lbl">Coach</span><span class="val"></span></div>
        <div class="info-line"><span class="lbl">Saison</span><span class="val"></span></div>
        <div class="info-line"><span class="lbl">Objectif principal</span><span class="val"></span></div>
        <div class="info-line"><span class="lbl">Date du dossier</span><span class="val">${today}</span></div>
      </div>
    </div>

    <div class="cover-footer">
      Document confidentiel — Usage interne coach &amp; athlète<br/>
      Protocoles scientifiques : Billat 2001 · Léger &amp; Bouchard 1980 · Coggan 2010 · Wakayoshi 1992 · Mader-Heck
    </div>
  </section>

  <div class="page-break"></div>

  <!-- ============================ 2 · SOMMAIRE ============================ -->
  <section>
    <h1>Sommaire</h1>
    <p style="font-size:10.5pt;color:#555;margin:0 0 12px;">Athlète : <strong>${athlete}</strong> &nbsp;·&nbsp; Sport : <strong>${escapeHtml(sportLabel)}</strong></p>
    <table class="toc-table">
      <tbody>${tocHtml}</tbody>
    </table>
    <div class="footer">TFCLab™ · ${chapters.length} fiches de test + 1 synthèse · ${today}</div>
  </section>

  <div class="page-break"></div>

  <!-- ============================ 3 · MODE D'EMPLOI ============================ -->
  <section>
    <h1>Mode d'emploi du dossier</h1>
    <p style="font-size:10.5pt;color:#333;margin:4px 0 10px;">
      Ce dossier accompagne le coach et l'athlète sur le terrain. Chaque chapitre suit la même structure : contexte, protocole pas à pas, cadre scientifique, résultats, notes. Remplissez au stylo pendant la séance, puis reportez les valeurs dans la synthèse finale.
    </p>

    <h2>Structure d'un chapitre</h2>
    <div class="howto-grid">
      <div class="howto-card"><div class="htc-title">X.0 — Contexte &amp; matériel</div><div class="htc-body">Date, lieu, conditions météo, poids du jour et matériel à cocher avant de démarrer.</div></div>
      <div class="howto-card"><div class="htc-title">X.A — Protocole pas à pas</div><div class="htc-body">Blocs numérotés (X.1, X.2, …) avec étapes, durée et tableau de mesures à reporter en temps réel.</div></div>
      <div class="howto-card"><div class="htc-title">X.B — Cadre scientifique</div><div class="htc-body">Encadrés colorés : préparation, validité, formules, erreurs fréquentes, sécurité.</div></div>
      <div class="howto-card"><div class="htc-title">X.C — Résultats calculés</div><div class="htc-body">Tableau récapitulatif post-test. À reporter ensuite dans la synthèse finale.</div></div>
    </div>

    <h2>Légende des encadrés</h2>
    <div class="legend-row"><span class="legend-swatch" style="background:#fff8e6;border-color:#d4a017;"></span><strong>Préparation</strong> — à lire 48h avant le test</div>
    <div class="legend-row"><span class="legend-swatch" style="background:#ecfaf2;border-color:#16a34a;"></span><strong>Conditions de validité</strong> — sinon le test est à refaire</div>
    <div class="legend-row"><span class="legend-swatch" style="background:#f1f5fb;border-color:#4f46e5;"></span><strong>Formules</strong> — calculs appliqués automatiquement par l'app</div>
    <div class="legend-row"><span class="legend-swatch" style="background:#fdecec;border-color:#dc2626;"></span><strong>Erreurs fréquentes</strong> — à anticiper avant le départ</div>
    <div class="legend-row"><span class="legend-swatch" style="background:#f4f4f5;border-color:#374151;"></span><strong>Sécurité</strong> — critères d'arrêt et précautions</div>

    <h2>Conseils d'utilisation terrain</h2>
    <ul style="margin:4px 0 0 22px;font-size:10.5pt;line-height:1.55;">
      <li>Imprimer en A4 noir &amp; blanc — les codes couleurs restent lisibles en niveaux de gris.</li>
      <li>Fixer le dossier sur un clipboard rigide ; stylo bille (le feutre bave à la sueur).</li>
      <li>Cocher le matériel avant l'échauffement, vérifier la calibration capteurs juste avant chaque bloc.</li>
      <li>Reporter immédiatement chaque valeur dans le tableau du bloc — pas de mémorisation.</li>
      <li>Après le test, saisir les valeurs dans l'app : la synthèse se calcule automatiquement.</li>
    </ul>

    <div class="footer">TFCLab™ · Lire avant d'utiliser le dossier sur le terrain</div>
  </section>

  <div class="page-break"></div>

  <!-- ============================ 4-N · CHAPITRES DE TEST ============================ -->
  ${chapterPages}

  <div class="page-break"></div>

  <!-- ============================ DERNIER · SYNTHÈSE ============================ -->
  <section class="synthesis">
    <div class="chapter-banner">
      <div class="chapter-num">Chapitre ${chapters.length + 1}</div>
      <div class="chapter-title"><span class="chapter-emoji">📊</span> Synthèse du profil physiologique</div>
      <div class="chapter-sub">${escapeHtml(sportLabel)} — Édition du ${today}</div>
    </div>

    <div class="page-meta">
      <span><strong>Athlète :</strong> ${athlete}</span>
      <span><strong>Coach :</strong> ${blank("180px")}</span>
      <span><strong>Saison :</strong> ${blank("100px")}</span>
    </div>

    <h2>Tableau récapitulatif</h2>
    ${synthesisHtml}

    <h2>Conclusions du coach &amp; orientations d'entraînement</h2>
    <div>${conclusionLines}</div>

    <h2>Validation</h2>
    <table class="kv-table">
      <tr><th>Signature coach</th><td class="fill-cell"></td><th>Date</th><td class="fill-cell"></td></tr>
      <tr><th>Signature athlète</th><td class="fill-cell"></td><th>Date</th><td class="fill-cell"></td></tr>
    </table>

    <div class="footer">
      TFCLab™ — Two For Coaching · Dossier complet de tests physiologiques · Confidentiel
    </div>
  </section>
</body>
</html>`;
}

/**
 * Ouvre le dossier complet dans un nouvel onglet imprimable.
 */
export function openFullDiagnosticDossierPrint(
  athleteName?: string,
  sport: DossierSport = "triathlon",
): void {
  const html = buildFullDiagnosticDossierHTML(athleteName, sport);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}


