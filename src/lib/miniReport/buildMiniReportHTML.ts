/**
 * Builder HTML imprimable pour le Mini Rapport Athlète.
 * Utilise `openPrintableHTML` pour ouvrir dans un nouvel onglet (Ctrl+P → PDF).
 */

import { formatPace, formatTime, type MiniReportResult } from "./computeMiniProfile";
import { TRAINING_ZONES } from "@/lib/trainingZonesDefinition";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Convertit le markdown léger (**gras**) en HTML */
function renderInline(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

const PROFILE_COLORS: Record<string, string> = {
  explosif: "#E74C3C",
  equilibre: "#3498DB",
  endurant: "#27AE60",
};

// Couleurs alignées sur la grille officielle Z1 → Z7 (Z4 dédoublée a/b)
const ZONE_COLORS: Record<string, string> = {
  Z1: "#A8E6CF",
  Z2: "#7FCDCD",
  Z3: "#FFD93D",
  Z4a: "#FFB347",
  Z4b: "#FF8C42",
  Z5: "#FF6B6B",
  Z6: "#C44569",
  Z7: "#6C5CE7",
};

export function buildMiniReportHTML(result: MiniReportResult): string {
  const { input, vlamax, profile, profileLabel, ceMlPerKgPerKm, mlssPct,
    paceThresholdSecPerKm, paceObservedSecPerKm, vmaPaceSecPerKm,
    zones, profileNarrative, trainingAdvice, caveats } = result;
  const isBeginner = input.vocabularyMode === "beginner";

  // Labels adaptés au mode
  const L = isBeginner ? {
    sectionProfile: "1. Ton profil de coureur",
    profileLabel: "Type de coureur",
    metricVlamax: "Indice de vitesse-puissance",
    metricVlamaxSub: "(VLamax — capacité à fabriquer de l'énergie rapide)",
    metricCE: "Énergie consommée par km",
    metricCESub: "(coût énergétique — plus c'est bas, mieux c'est)",
    metricMlss: "Allure de seuil",
    metricMlssSub: "% de ta VMA — l'allure que tu peux tenir ~1h",
    metricVmaPace: "Allure VMA (vitesse max aérobie)",
    metricThresholdPace: "Allure de seuil (≈ 1h d'effort)",
    sectionAdvice: "2. Tes pistes de travail (vulgarisées)",
    sectionZones: "3. Tes zones d'entraînement (Z1–Z7)",
    zoneTableObjective: "À quoi ça sert",
    caveatsTitle: "À garder en tête",
    glossary: true,
  } : {
    sectionProfile: "1. Profil métabolique",
    profileLabel: "Profil identifié",
    metricVlamax: "VLamax estimée",
    metricVlamaxSub: "mmol/L/s — capacité glycolytique max",
    metricCE: "Coût énergétique",
    metricCESub: "mL O₂/kg/km (estimé)",
    metricMlss: "Seuil (MLSS)",
    metricMlssSub: "de la VMA",
    metricVmaPace: "Allure VMA (100%)",
    metricThresholdPace: "Allure au seuil",
    sectionAdvice: "2. Pistes de travail",
    sectionZones: "3. Zones d'entraînement (Z1–Z7)",
    zoneTableObjective: "Objectif principal",
    caveatsTitle: "⚠ Limites de l'estimation",
    glossary: false,
  };

  const profileColor = PROFILE_COLORS[profile] || "#3498DB";
  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const refRaceLabel = input.referenceRaceType === "semi" ? "Semi-marathon" : "20 km";
  const refDistanceKm = input.referenceRaceType === "semi" ? 21.0975 : 20;

  const adviceHtml = trainingAdvice.map((a) => `<li>${renderInline(a)}</li>`).join("");
  const caveatsHtml = caveats.map((c) => `<li>${escapeHtml(c)}</li>`).join("");

  const zonesHtml = zones.map((z) => `
    <tr>
      <td style="background:${ZONE_COLORS[z.id] || "#999"};color:#000;font-weight:700;text-align:center;width:50px;">${z.id}</td>
      <td><strong>${escapeHtml(z.label)}</strong><br/><span style="font-size:11px;color:#666;">${escapeHtml(z.description)}</span></td>
      <td style="text-align:center;font-variant-numeric:tabular-nums;">${z.pctVmaMin}–${z.pctVmaMax}%</td>
      <td style="text-align:center;font-variant-numeric:tabular-nums;">${formatPace(z.paceMinSecPerKm)}–${formatPace(z.paceMaxSecPerKm)}</td>
      <td style="font-size:11px;color:#444;">${escapeHtml(z.purpose)}</td>
    </tr>
  `).join("");

  const titleAthlete = input.athleteName ? `Mini Rapport — ${escapeHtml(input.athleteName)}` : "Mini Rapport Athlète";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>${titleAthlete}</title>
<style>
  @page { size: A4; margin: 14mm 14mm 16mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a;
    line-height: 1.45;
    margin: 0;
    padding: 18px;
    max-width: 800px;
    margin: 0 auto;
    background: #fff;
  }
  h1 { font-size: 22px; margin: 0 0 4px 0; color: #1a1a1a; letter-spacing: -0.3px; }
  .subtitle { font-size: 12px; color: #666; margin: 0 0 18px 0; }
  h2 {
    font-size: 15px; margin: 22px 0 8px 0;
    padding-bottom: 4px; border-bottom: 2px solid #1a1a1a;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 12px;
  }
  .brand { font-weight: 800; font-size: 13px; letter-spacing: 1px; color: #666; }
  .date { font-size: 11px; color: #888; text-align: right; }

  /* Profil card */
  .profile-card {
    border: 2px solid ${profileColor};
    border-left: 8px solid ${profileColor};
    border-radius: 6px;
    padding: 14px 16px;
    margin: 8px 0 16px 0;
    background: ${profileColor}0D;
  }
  .profile-card .label {
    font-size: 11px; text-transform: uppercase; color: ${profileColor};
    letter-spacing: 1px; font-weight: 700; margin-bottom: 4px;
  }
  .profile-card .value { font-size: 26px; font-weight: 800; color: ${profileColor}; margin-bottom: 8px; }
  .profile-card p { margin: 0; font-size: 13px; color: #222; }

  /* Inputs grid */
  .grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
    margin: 10px 0 0 0;
  }
  .grid .cell {
    background: #f5f5f7; border-radius: 6px; padding: 8px 10px; text-align: center;
  }
  .grid .cell .k { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
  .grid .cell .v { font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 2px; font-variant-numeric: tabular-nums; }

  /* Metrics */
  .metrics {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0;
  }
  .metric { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px; }
  .metric .k { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
  .metric .v { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .metric .sub { font-size: 11px; color: #666; margin-top: 2px; }

  /* Advice */
  ul.advice { padding-left: 20px; margin: 8px 0; }
  ul.advice li { margin: 6px 0; font-size: 12.5px; color: #222; }

  /* Zones table */
  table.zones { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
  table.zones th, table.zones td {
    padding: 7px 8px; border: 1px solid #ddd; text-align: left; vertical-align: middle;
  }
  table.zones th { background: #1a1a1a; color: #fff; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Caveats */
  .caveats {
    background: #FFF8E1; border-left: 4px solid #F39C12; padding: 10px 14px;
    margin: 14px 0 4px 0; border-radius: 4px;
  }
  .caveats p { margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #B7791F; text-transform: uppercase; letter-spacing: 0.5px; }
  .caveats ul { margin: 0; padding-left: 18px; }
  .caveats li { font-size: 11px; color: #5a4a1a; margin: 3px 0; }

  /* Footer */
  .footer {
    margin-top: 22px; padding-top: 10px; border-top: 1px solid #ddd;
    font-size: 10px; color: #999; text-align: center; line-height: 1.4;
  }

  @media print {
    body { padding: 0; }
    h2 { page-break-after: avoid; }
    .profile-card, .metric, table.zones { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="brand">TFC LAB</div>
    <h1>${titleAthlete}</h1>
    <p class="subtitle">Profil physiologique simplifié — Potentiel Physiologique TFCL™</p>
  </div>
  <div class="date">${dateStr}</div>
</div>

<div class="grid">
  <div class="cell"><div class="k">Âge</div><div class="v">${input.age} ans</div></div>
  <div class="cell"><div class="k">Sexe</div><div class="v">${input.sex === "M" ? "H" : "F"}</div></div>
  <div class="cell"><div class="k">VMA</div><div class="v">${input.vmaKmh.toFixed(1)} km/h</div></div>
  <div class="cell"><div class="k">Sprint 15s</div><div class="v">${input.sprint15sM} m</div></div>
</div>

<h2>${L.sectionProfile}</h2>

${L.glossary ? `
<div style="background:#EBF5FB;border-left:4px solid #2980B9;padding:12px 14px;border-radius:6px;margin:8px 0 14px 0;font-size:12px;color:#1B4F72;">
  <p style="margin:0 0 6px 0;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;font-size:11px;">📘 Mini-lexique pour comprendre ton rapport</p>
  <ul style="margin:0;padding-left:18px;line-height:1.55;">
    <li><strong>VMA</strong> : ta vitesse maximale aérobie — la vitesse à laquelle tu utilises le maximum d'oxygène (≈ vitesse soutenable ~6 min à fond).</li>
    <li><strong>Seuil</strong> : l'allure que tu peux tenir environ 1h sans exploser (≈ allure semi-marathon rapide).</li>
    <li><strong>Acide lactique</strong> : ce qui fait "brûler" les jambes en effort intense — ton corps en produit, et il sait aussi le recycler.</li>
    <li><strong>Endurance fondamentale (Z2)</strong> : allure facile où tu peux discuter — c'est la base qui construit ton "moteur".</li>
    <li><strong>Profil métabolique</strong> : la "personnalité physiologique" de ton corps (plutôt explosif, équilibré ou endurant).</li>
  </ul>
</div>
` : ""}

<div class="profile-card">
  <div class="label">${L.profileLabel}</div>
  <div class="value">${escapeHtml(profileLabel)}</div>
  <p>${renderInline(profileNarrative)}</p>
</div>

<div class="metrics">
  <div class="metric">
    <div class="k">${L.metricVlamax}</div>
    <div class="v">${vlamax.toFixed(2)}</div>
    <div class="sub">${L.metricVlamaxSub}</div>
  </div>
  <div class="metric">
    <div class="k">${L.metricCE}</div>
    <div class="v">${ceMlPerKgPerKm}</div>
    <div class="sub">${L.metricCESub}</div>
  </div>
  <div class="metric">
    <div class="k">${L.metricMlss}</div>
    <div class="v">${Math.round(mlssPct * 100)}%</div>
    <div class="sub">${L.metricMlssSub}</div>
  </div>
</div>

<div class="metrics">
  <div class="metric">
    <div class="k">${L.metricVmaPace}</div>
    <div class="v">${formatPace(vmaPaceSecPerKm)}</div>
    <div class="sub">/km</div>
  </div>
  <div class="metric">
    <div class="k">${L.metricThresholdPace}</div>
    <div class="v">${formatPace(paceThresholdSecPerKm)}</div>
    <div class="sub">/km — soutenable ~1h</div>
  </div>
  ${input.referenceTimeSec && paceObservedSecPerKm ? `
  <div class="metric">
    <div class="k">${refRaceLabel} (${refDistanceKm.toFixed(refDistanceKm % 1 === 0 ? 0 : 2)} km)</div>
    <div class="v">${formatTime(input.referenceTimeSec)}</div>
    <div class="sub">${formatPace(paceObservedSecPerKm)}/km observé</div>
  </div>
  ` : `
  <div class="metric">
    <div class="k">Référence course</div>
    <div class="v" style="font-size:14px;color:#999;">— non renseignée —</div>
    <div class="sub">Ajoute un temps semi/20k pour calibrer</div>
  </div>
  `}
</div>

<h2>${L.sectionAdvice}</h2>
<ul class="advice">
  ${adviceHtml}
</ul>

<h2>${L.sectionZones}</h2>
<table class="zones">
  <thead>
    <tr>
      <th style="text-align:center;">Zone</th>
      <th>${isBeginner ? "Type d'effort" : "Filière / Description"}</th>
      <th style="text-align:center;">% VMA</th>
      <th style="text-align:center;">Allure (/km)</th>
      <th>${L.zoneTableObjective}</th>
    </tr>
  </thead>
  <tbody>
    ${zonesHtml}
  </tbody>
</table>

<div style="background:#F8F9FA;border:1px solid #E5E5E5;border-radius:6px;padding:12px 14px;margin:10px 0 4px 0;">
  <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#1a1a1a;">📖 Légende des zones — à quoi sert chaque intensité</p>
  <ul style="margin:0;padding-left:0;list-style:none;font-size:11.5px;line-height:1.55;color:#333;">
    ${TRAINING_ZONES.map((z) => `
      <li style="margin:4px 0;display:flex;gap:8px;align-items:flex-start;">
        <span style="display:inline-block;min-width:34px;text-align:center;padding:2px 6px;border-radius:4px;background:${ZONE_COLORS[z.id] || "#999"};color:#000;font-weight:700;font-size:10px;">${z.id}</span>
        <span><strong>${escapeHtml(z.label)}</strong> — ${escapeHtml(z.description)} <span style="color:#777;">(${escapeHtml(z.positionSeuils)} · ${escapeHtml(z.durationTypique)})</span></span>
      </li>
    `).join("")}
  </ul>
</div>

<div class="caveats">
  <p>${L.caveatsTitle}</p>
  <ul>
    ${caveatsHtml}
  </ul>
</div>

<div class="footer">
  Rapport généré par <strong>Potentiel Physiologique TFCL™</strong> — Modèles : VLamax-Sprint (P4, N=15) · Run MLSS C (N=44) · Mader-Heck.<br/>
  Document indicatif à valider par un coach diplômé. Ce rapport ne se substitue pas à un test de laboratoire.
</div>

</body>
</html>`;
}
