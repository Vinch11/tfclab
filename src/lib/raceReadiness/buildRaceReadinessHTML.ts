/**
 * Race Readiness — HTML printable (PDF via Ctrl+P)
 * Aligné avec la charte du mini-rapport TFCL.
 * Ton positif : les "gaps" sont reformulés en "leviers de progression".
 */

import type { RaceReadinessResult } from "./computeRaceReadiness";
import { buildReadinessRadarSVG } from "./buildReadinessRadarSVG";
import { type PeerReference, peerVerdict } from "./peerReference";
import { getReadinessVerdict } from "./readinessVerdict";

interface BuildOpts {
  athleteName: string;
  raceName: string | null;
  raceType: string;
  raceDateISO: string;
  daysRemaining: number;
  objectif: string;
  ambition: string;
  result: RaceReadinessResult;
  aiMessage: string;
  /** Référence cohorte (moyenne / au-dessus). Optionnel. */
  peerRef?: PeerReference | null;
  /** Corps HTML (inner <body>) de la carte Stratégie TFCL Plan A & Plan B à joindre. */
  strategyBodyHtml?: string | null;
}

const axisInterpretation: Record<string, string> = {
  vo2max: "Plafond aérobie — la puissance maximale de ton moteur principal.",
  vlamax: "Équilibre glycolytique — une valeur maîtrisée limite l'acidose sur la durée.",
  ftpkg: "Puissance aérobie au kilo — le rendement brut de ton moteur.",
  vma: "Vitesse Maximale Aérobie — ta vitesse de référence pour les zones d'entraînement.",
  durability: "Capacité à tenir l'intensité sur toute la durée de l'objectif.",
  economy: "Efficience métabolique — l'énergie consommée pour avancer.",
};

const colorFor = (status: string) =>
  status === "strong" ? "#1F9D6B" :
  status === "ok" ? "#1C8FC4" :
  status === "below" ? "#C8860D" : "#D0433A";

const levelColor = (level: string) =>
  level === "excellent" ? "#1F9D6B" :
  level === "good" ? "#1C8FC4" :
  level === "moderate" ? "#C8860D" : "#D0433A";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const mdToHtml = (md: string) =>
  esc(md)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

export function buildRaceReadinessHTML(opts: BuildOpts): string {
  const { athleteName, raceName, raceType, raceDateISO, daysRemaining, objectif, ambition, result, aiMessage, strategyBodyHtml, peerRef } = opts;
  const dateFR = new Date(raceDateISO).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const verdict = getReadinessVerdict(result.scorePct);

  const strategyHTML = strategyBodyHtml
    ? `<h2>Stratégie TFCL — Plan A &amp; Plan B</h2>
       <p style="font-size:10pt; color:#5C5966; margin:4pt 0 8pt;">Deux plans complets : on vise le Plan A. Si quelque chose dérape en course, on bascule sur le Plan B sans paniquer.</p>
       <div class="strategy-block">${strategyBodyHtml}</div>`
    : "";

  const verdictColor = (tone: string) =>
    tone === "above" ? "#7A56C2" : tone === "around" ? "#5C5966" : "#8A5A08";

  const axisRows = result.axes.map(a => {
    const interp = axisInterpretation[a.key] ?? "";
    const v = peerRef ? peerVerdict(a.score, peerRef) : null;
    return `
    <tr>
      <td>
        <div style="font-weight:600;">${esc(a.label)}</div>
        ${interp ? `<div style="font-size:8.5pt; color:#6E6B78; margin-top:2pt; font-style:italic;">${esc(interp)}</div>` : ""}
        ${v ? `<div style="font-size:8.5pt; margin-top:2pt; color:${verdictColor(v.tone)}; font-weight:600;">${v.tone === "above" ? "★ " : ""}${esc(v.label)} <span style="color:#97949F; font-weight:400;">vs ${esc(peerRef!.cohortLabel)} (${peerRef!.peerAvg})</span></div>` : ""}
      </td>
      <td style="text-align:center; font-weight:700; color:${colorFor(a.status)};">${a.score}/100</td>
      <td style="text-align:center;">${a.value != null ? `${a.value}${esc(a.unit)}` : "—"}</td>
      <td style="text-align:center; color:#666;">${a.target != null ? `${a.target}${esc(a.unit)}` : "—"}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/>
<title>Bilan pré-objectif — ${esc(athleteName)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #14131A; max-width: 800px; margin: 0 auto; line-height: 1.55; }
  h1 { font-size: 24pt; margin: 0 0 4pt; color: #14131A; }
  h2 { font-size: 14pt; margin-top: 24pt; margin-bottom: 8pt; color: #14131A; border-bottom: 2pt solid #E7E4DC; padding-bottom: 4pt; }
  .meta { color: #6E6B78; font-size: 10pt; margin-bottom: 16pt; }
  .hero { background: linear-gradient(135deg, #FAF9F5 0%, #E2F1F9 100%); border-radius: 12pt; padding: 20pt; margin: 16pt 0; text-align: center; }
  .verdict-emoji { font-size: 44pt; line-height: 1; }
  .verdict-label { font-size: 26pt; font-weight: 800; color: ${levelColor(result.level)}; margin-top: 8pt; line-height: 1.1; }
  .verdict-tagline { font-size: 12pt; color: #5C5966; margin-top: 6pt; font-style: italic; }
  .level-tag { display: inline-block; margin-top: 10pt; padding: 4pt 12pt; border-radius: 999pt; background: ${levelColor(result.level)}; color: white; font-size: 10pt; font-weight: 600; }
  .countdown { font-size: 11pt; color: #5C5966; margin-top: 8pt; }
  .ai-message { background: #FBF0DA; border-left: 4pt solid #C8860D; padding: 14pt 18pt; border-radius: 6pt; margin: 12pt 0; font-size: 11pt; }
  .ai-message p { margin: 0 0 8pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 8pt; font-size: 10pt; }
  th, td { padding: 6pt 8pt; border-bottom: 1pt solid #E7E4DC; }
  th { background: #F2F0E9; text-align: left; font-weight: 600; }
  .strengths, .gaps { display: flex; gap: 8pt; flex-wrap: wrap; margin-top: 6pt; }
  .chip { padding: 3pt 10pt; border-radius: 999pt; font-size: 9pt; font-weight: 600; }
  .chip.strong { background: #E4F5EE; color: #157A52; }
  .chip.gap { background: #FAE6E4; color: #8F2E27; }
  .chip.lever { background: #E2F1F9; color: #075985; }
  .footer { margin-top: 32pt; padding-top: 12pt; border-top: 1pt solid #E7E4DC; font-size: 8pt; color: #97949F; text-align: center; }
</style></head>
<body>
  <div style="display:flex; align-items:center; gap:14pt; margin-bottom:6pt;">
    <img src="${typeof window !== "undefined" ? window.location.origin : ""}/logo-tfc.png" alt="TFC Lab" style="height:48pt; width:auto;" />
    <h1 style="margin:0;">Bilan pré-objectif TFCL</h1>
  </div>
  <div class="meta">
    <strong>${esc(athleteName)}</strong> — ${esc(raceName ?? raceType)} (${esc(raceType)}) le ${dateFR}<br/>
    Objectif: ${esc(objectif)} · Ambition: ${esc(ambition)}
  </div>

  <div class="hero">
    <div class="verdict-emoji">${verdict.emoji}</div>
    <div class="verdict-label">${esc(verdict.label)}</div>
    <div class="verdict-tagline">${esc(verdict.tagline)}</div>
    <div class="level-tag">${esc(result.levelLabel)}</div>
    <div class="countdown">J-${daysRemaining} avant la course</div>
  </div>

  <h2>Message du coach</h2>
  <div class="ai-message"><p>${mdToHtml(aiMessage)}</p></div>

  <h2>Cartographie de ta forme</h2>
  <div style="display:flex; gap:16pt; align-items:center; flex-wrap:wrap;">
    <div style="flex:1 1 320pt; min-width:280pt;">
      ${buildReadinessRadarSVG({ axes: result.axes, size: 320, peerRef })}
    </div>
    <div style="flex:1 1 220pt; font-size:10pt; color:#5C5966;">
      <p style="margin:0 0 6pt;"><strong>Chaque axe = un pilier de ta performance.</strong></p>
      ${peerRef ? `<p style="margin:0 0 6pt;">Comparé à la cohorte <strong>${esc(peerRef.cohortLabel)}</strong> : ligne grise = moyenne (${peerRef.peerAvg}), ligne violette = seuil <strong>« au-dessus de la moyenne »</strong> (${peerRef.peerAbove}+ ★). Ligne verte à 100 = cible d'ambition.</p>` : ""}
      <p style="margin:0; color:#6E6B78;">Les axes les plus internes ne sont pas des faiblesses : ce sont tes <strong>leviers de progression</strong>, les zones où chaque effort produira le plus de gain.</p>
    </div>
  </div>

  <h2>Détail par axe physiologique</h2>
  <table>
    <thead><tr><th>Axe</th><th style="text-align:center;">Score</th><th style="text-align:center;">Valeur</th><th style="text-align:center;">Cible</th></tr></thead>
    <tbody>${axisRows}</tbody>
  </table>

  ${result.strengths.length ? `
  <h2>Tes points forts à exploiter le jour J</h2>
  <p style="font-size:10pt; color:#5C5966; margin:4pt 0;">Ce sont les leviers sur lesquels t'appuyer pour construire ta course.</p>
  <div class="strengths">${result.strengths.map(s => `<span class="chip strong">${esc(s.label)} (${s.score}/100)</span>`).join("")}</div>` : ""}

  ${result.gaps.length ? `
  <h2>Leviers de progression identifiés</h2>
  <p style="font-size:10pt; color:#5C5966; margin:4pt 0;">Pas des faiblesses — des marges de gain. Garde-les en tête, mais ne laisse pas ces axes te freiner mentalement : ta préparation reste solide sur l'ensemble.</p>
  <div class="gaps">${result.gaps.map(g => `<span class="chip lever">${esc(g.label)} (${g.score}/100)</span>`).join("")}</div>` : ""}


  <h2>Le jour J — pacing &amp; gestion mentale</h2>
  <div style="background:#E4F5EE; border-left:4pt solid #1F9D6B; border-radius:6pt; padding:14pt 18pt; margin:8pt 0 16pt; font-size:10.5pt; color:#14131A; line-height:1.6;">
    <p style="margin:0 0 10pt;"><strong style="color:#157A52;">🧭 Les 4 règles d'or à te répéter sur la ligne de départ</strong></p>
    <ol style="margin:0 0 10pt 18pt; padding:0;">
      <li><strong>Premier tiers : sois ennuyeux.</strong> Reste 5–10 W (ou 10–15 s/km) <em>sous</em> ta cible. Les watts économisés tôt valent triple en fin de course.</li>
      <li><strong>Mange avant d'avoir faim, bois avant d'avoir soif.</strong> Une gorgée toutes les 10–15 min, un apport glucidique toutes les 20–25 min, dès la première heure — pas après.</li>
      <li><strong>Pilote sur une seule donnée à la fois.</strong> Cardio en montée, puissance/allure sur le plat, sensations en descente. Trop d'écrans = décisions floues.</li>
      <li><strong>Découpe la course en blocs de 20 min.</strong> Tu ne cours pas un marathon, tu enchaînes des « petits efforts » que tu sais déjà gérer à l'entraînement.</li>
    </ol>
    <p style="margin:0 0 6pt;"><strong style="color:#157A52;">🧠 Quand le doute s'installe (et il s'installera)</strong></p>
    <ul style="margin:0 0 0 18pt; padding:0;">
      <li><strong>Reviens au présent :</strong> 3 respirations profondes, relâche les épaules et la mâchoire, vérifie ta cadence.</li>
      <li><strong>Une phrase d'ancrage</strong> préparée à l'avance (ex : <em>« je suis prêt, j'ai fait le travail »</em>) — répète-la à chaque ravito.</li>
      <li><strong>Pense process, pas résultat :</strong> la prochaine gorgée, le prochain kilomètre, la prochaine bosse. Le chrono se construit, il ne se décide pas.</li>
    </ul>
  </div>

  ${strategyHTML}

  <div class="footer">
    Rapport généré par Potentiel Physiologique TFCL™ — ${new Date().toLocaleDateString("fr-FR")}<br/>
    Score basé sur le Coaching Compass (5 axes) et les cibles d'ambition.
  </div>
</body></html>`;
}
