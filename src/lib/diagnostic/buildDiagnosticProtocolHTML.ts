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

type ProtocolDef = {
  name: string;
  emoji: string;
  subtitle: string;
  material: string[];
  blocks: Block[];
  results: Array<{ metric: string; unit: string }>;
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
