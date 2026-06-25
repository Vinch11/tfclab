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
        `<tr><td>${escapeHtml(r.metric)}</td><td class="fill"></td><td>${escapeHtml(r.unit)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(p.name)} — Protocole papier</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
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
  th, td { border: 1px solid #bbb; padding: 6px 8px; font-size: 10.5pt; text-align: left; vertical-align: middle; }
  th { background: #f1f5f5; color: #0d9488; font-weight: 600; }
  td.fill { height: 22px; background: repeating-linear-gradient(transparent, transparent 18px, #ccc 18px, #ccc 19px); }
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
    <thead><tr><th style="width:55%">Métrique</th><th style="width:25%">Valeur</th><th style="width:20%">Unité</th></tr></thead>
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
// ============================================================================

export type DossierSport = "triathlon" | "course" | "cyclisme";

/**
 * Extrait le corps central (header + sections 1-5) d'une fiche protocole
 * pour la réutiliser dans un dossier multi-pages, sans le <html>/<head>/<button>.
 */
function buildProtocolSection(protocol: DiagnosticProtocol, athleteName?: string): string {
  const p = PROTOCOLS[protocol];
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const athlete = athleteName ? escapeHtml(athleteName) : blank("200px");

  const materialHtml = p.material
    .map((m) => `<label style="display:inline-block;margin-right:14px;font-size:10pt;">☐ ${escapeHtml(m)}</label>`)
    .join("");

  const blocksHtml = p.blocks
    .map(
      (b) => `
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
        `<tr><td>${escapeHtml(r.metric)}</td><td class="fill"></td><td>${escapeHtml(r.unit)}</td></tr>`,
    )
    .join("");

  return `
  <section class="protocol-page">
    <div class="header">
      <div class="brand">TFCLab™ <small>Two For Coaching</small></div>
      <div class="meta">
        <div><strong>${p.emoji} ${escapeHtml(p.name)}</strong></div>
        <div>${escapeHtml(p.subtitle)}</div>
        <div>Date : ${today}</div>
      </div>
    </div>

    <h1>Protocole de test — ${escapeHtml(p.name)}</h1>
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
      <thead><tr><th style="width:55%">Métrique</th><th style="width:25%">Valeur</th><th style="width:20%">Unité</th></tr></thead>
      <tbody>${resultsHtml}</tbody>
    </table>

    <h2>5 · Notes du coach</h2>
    <div class="notes-area"></div>
  </section>`;
}

/**
 * Construit un dossier complet imprimable (page de garde + toutes les fiches + synthèse).
 */
export function buildFullDiagnosticDossierHTML(
  athleteName?: string,
  sport: DossierSport = "triathlon",
): string {
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const athlete = athleteName ? escapeHtml(athleteName) : blank("260px");
  const sportLabel =
    sport === "triathlon" ? "Triathlon" : sport === "course" ? "Course à pied" : "Cyclisme";

  // Sélection des fiches selon le sport
  // Spec : Track Day + Bike Day toujours, Pool Day uniquement si triathlon
  const protocols: DiagnosticProtocol[] = ["track-day", "bike-day"];
  if (sport === "triathlon") protocols.push("pool-day");


  const protocolPages = protocols
    .map((proto) => buildProtocolSection(proto, athleteName))
    .join('\n<div class="page-break"></div>\n');

  // Tableau de synthèse
  const synthesisRows: Array<{ metric: string; unit: string }> = [
    { metric: "FTP", unit: "W" },
    { metric: "FTP/kg", unit: "W/kg" },
    { metric: "VMA", unit: "km/h" },
    { metric: "CSS", unit: "s/100m" },
    { metric: "FC max", unit: "bpm" },
    { metric: "FC repos", unit: "bpm" },
    { metric: "VO2max estimé", unit: "ml/kg/min" },
    { metric: "VLamax vélo", unit: "mmol/L/s" },
    { metric: "VLamax course", unit: "mmol/L/s" },
    { metric: "TTE vélo", unit: "min" },
    { metric: "TTE course", unit: "min" },
    { metric: "Pmax 5s", unit: "W/kg" },
    { metric: "P1s CMJ", unit: "W/kg" },
    { metric: "Économie de course", unit: "ml/kg/km" },
    { metric: "FatMax estimé", unit: "% FTP" },
  ];

  const synthesisRowsHtml = synthesisRows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.metric)}</td><td class="fill"></td><td class="fill"></td><td>${escapeHtml(r.unit)}</td></tr>`,
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
  @page { size: A4 portrait; margin: 15mm; }
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
  th, td { border: 1px solid #bbb; padding: 6px 8px; font-size: 10.5pt; text-align: left; vertical-align: middle; }
  th { background: #f1f5f5; color: #0d9488; font-weight: 600; }
  td.fill { height: 22px; background: repeating-linear-gradient(transparent, transparent 18px, #ccc 18px, #ccc 19px); }
  .instructions { margin: 4px 0 8px 18px; padding: 0; font-size: 10.5pt; }
  .instructions li { margin-bottom: 2px; }
  .block { page-break-inside: avoid; margin-bottom: 10px; }
  .coach-line { margin-top: 6px; font-size: 10pt; }
  .notes-area { border: 1px solid #bbb; height: 140px; background: repeating-linear-gradient(transparent, transparent 22px, #ccc 22px, #ccc 23px); }
  .footer { margin-top: 18px; padding-top: 6px; border-top: 1px solid #0d9488; font-size: 8.5pt; color: #555; text-align: center; }
  .page-break { page-break-after: always; }
  .print-btn { position: fixed; top: 10px; right: 10px; background: #0d9488; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 11pt; cursor: pointer; z-index: 1000; }
  @media print { .print-btn { display: none; } }

  /* Page de garde */
  .cover { min-height: 90vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40px 20px; }
  .cover .logo { font-size: 42pt; font-weight: bold; color: #0d9488; margin-bottom: 6px; letter-spacing: -1px; }
  .cover .logo small { display: block; font-size: 13pt; color: #555; font-weight: normal; margin-top: 4px; }
  .cover .doc-title { font-size: 26pt; color: #0d9488; margin: 40px 0 16px; font-weight: bold; }
  .cover .athlete-name { font-size: 20pt; color: #111; margin: 24px 0 8px; }
  .cover .meta-info { font-size: 13pt; color: #444; margin: 6px 0; }
  .cover .info-lines { margin-top: 60px; font-size: 12pt; text-align: left; min-width: 360px; }
  .cover .info-lines div { margin: 14px 0; }
  .cover .cover-footer { margin-top: auto; padding-top: 40px; font-size: 9pt; color: #777; }

  /* Synthèse */
  .synthesis table th:nth-child(1) { width: 40%; }
  .synthesis table th:nth-child(2), .synthesis table th:nth-child(3) { width: 22%; }
  .synthesis table th:nth-child(4) { width: 16%; }
  .conclusion-line { border-bottom: 1px solid #aaa; height: 26px; margin: 0; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Imprimer / PDF</button>

  <!-- 1) PAGE DE GARDE -->
  <section class="cover">
    <div class="logo">TFCLab™<small>Two For Coaching</small></div>
    <div class="doc-title">Dossier de Tests Physiologiques TFCL™</div>
    <div class="athlete-name"><strong>Athlète :</strong> ${athlete}</div>
    <div class="meta-info"><strong>Sport principal :</strong> ${escapeHtml(sportLabel)}</div>
    <div class="meta-info"><strong>Date d'édition :</strong> ${today}</div>

    <div class="info-lines">
      <div><strong>Coach :</strong> ${blank("260px")}</div>
      <div><strong>Saison :</strong> ${blank("260px")}</div>
      <div><strong>Objectif principal :</strong> ${blank("260px")}</div>
    </div>

    <div class="cover-footer">
      Document confidentiel — Usage interne coach &amp; athlète<br/>
      Protocoles scientifiques basés sur Billat 2001, Léger &amp; Bouchard 1980, Coggan 2010, Wakayoshi 1992, Mader-Heck
    </div>
  </section>

  <div class="page-break"></div>

  <!-- 2-N) FICHES DE TEST -->
  ${protocolPages}

  <div class="page-break"></div>

  <!-- DERNIÈRE PAGE : SYNTHÈSE -->
  <section class="synthesis">
    <div class="header">
      <div class="brand">TFCLab™ <small>Two For Coaching</small></div>
      <div class="meta">
        <div><strong>📊 Synthèse du profil</strong></div>
        <div>${escapeHtml(sportLabel)}</div>
        <div>Date : ${today}</div>
      </div>
    </div>

    <h1>Synthèse du profil physiologique</h1>
    <div class="coach-line"><strong>Athlète :</strong> ${athlete} &nbsp;&nbsp; <strong>Coach :</strong> ${blank("220px")}</div>

    <h2>Tableau récapitulatif</h2>
    <table>
      <thead>
        <tr>
          <th>Métrique</th>
          <th>Valeur mesurée</th>
          <th>Valeur précédente</th>
          <th>Unité</th>
        </tr>
      </thead>
      <tbody>${synthesisRowsHtml}</tbody>
    </table>

    <h2>Conclusions du coach &amp; orientations d'entraînement</h2>
    <div>${conclusionLines}</div>

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

