/**
 * Race Readiness — HTML printable (PDF via Ctrl+P)
 * Aligné avec la charte du mini-rapport TFCL.
 */

import type { RaceReadinessResult } from "./computeRaceReadiness";

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
}

const colorFor = (status: string) =>
  status === "strong" ? "#16a34a" :
  status === "ok" ? "#0ea5e9" :
  status === "below" ? "#f59e0b" : "#dc2626";

const levelColor = (level: string) =>
  level === "excellent" ? "#16a34a" :
  level === "good" ? "#0ea5e9" :
  level === "moderate" ? "#f59e0b" : "#dc2626";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const mdToHtml = (md: string) =>
  esc(md)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

export function buildRaceReadinessHTML(opts: BuildOpts): string {
  const { athleteName, raceName, raceType, raceDateISO, daysRemaining, objectif, ambition, result, aiMessage } = opts;
  const dateFR = new Date(raceDateISO).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const axisRows = result.axes.map(a => `
    <tr>
      <td>${esc(a.label)}</td>
      <td style="text-align:center; font-weight:700; color:${colorFor(a.status)};">${a.score}/100</td>
      <td style="text-align:center;">${a.value != null ? `${a.value}${esc(a.unit)}` : "—"}</td>
      <td style="text-align:center; color:#666;">${a.target != null ? `${a.target}${esc(a.unit)}` : "—"}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/>
<title>Bilan pré-objectif — ${esc(athleteName)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; line-height: 1.55; }
  h1 { font-size: 24pt; margin: 0 0 4pt; color: #0f172a; }
  h2 { font-size: 14pt; margin-top: 24pt; margin-bottom: 8pt; color: #0f172a; border-bottom: 2pt solid #e2e8f0; padding-bottom: 4pt; }
  .meta { color: #64748b; font-size: 10pt; margin-bottom: 16pt; }
  .hero { background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%); border-radius: 12pt; padding: 20pt; margin: 16pt 0; text-align: center; }
  .score { font-size: 56pt; font-weight: 800; color: ${levelColor(result.level)}; line-height: 1; }
  .score-label { font-size: 13pt; color: #334155; margin-top: 6pt; }
  .level-tag { display: inline-block; margin-top: 10pt; padding: 4pt 12pt; border-radius: 999pt; background: ${levelColor(result.level)}; color: white; font-size: 10pt; font-weight: 600; }
  .countdown { font-size: 11pt; color: #475569; margin-top: 8pt; }
  .ai-message { background: #fefce8; border-left: 4pt solid #ca8a04; padding: 14pt 18pt; border-radius: 6pt; margin: 12pt 0; font-size: 11pt; }
  .ai-message p { margin: 0 0 8pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 8pt; font-size: 10pt; }
  th, td { padding: 6pt 8pt; border-bottom: 1pt solid #e2e8f0; }
  th { background: #f1f5f9; text-align: left; font-weight: 600; }
  .strengths, .gaps { display: flex; gap: 8pt; flex-wrap: wrap; margin-top: 6pt; }
  .chip { padding: 3pt 10pt; border-radius: 999pt; font-size: 9pt; font-weight: 600; }
  .chip.strong { background: #dcfce7; color: #166534; }
  .chip.gap { background: #fee2e2; color: #991b1b; }
  .footer { margin-top: 32pt; padding-top: 12pt; border-top: 1pt solid #e2e8f0; font-size: 8pt; color: #94a3b8; text-align: center; }
</style></head>
<body>
  <h1>Bilan pré-objectif TFCL</h1>
  <div class="meta">
    <strong>${esc(athleteName)}</strong> — ${esc(raceName ?? raceType)} (${esc(raceType)}) le ${dateFR}<br/>
    Objectif: ${esc(objectif)} · Ambition: ${esc(ambition)}
  </div>

  <div class="hero">
    <div class="score">${result.scorePct}%</div>
    <div class="score-label">Tu es prêt à <strong>${result.scorePct}%</strong> pour le jour J</div>
    <div class="level-tag">${esc(result.levelLabel)}</div>
    <div class="countdown">J-${daysRemaining} avant la course</div>
  </div>

  <h2>Message du coach</h2>
  <div class="ai-message"><p>${mdToHtml(aiMessage)}</p></div>

  <h2>Détail par axe physiologique</h2>
  <table>
    <thead><tr><th>Axe</th><th style="text-align:center;">Score</th><th style="text-align:center;">Valeur</th><th style="text-align:center;">Cible</th></tr></thead>
    <tbody>${axisRows}</tbody>
  </table>

  ${result.strengths.length ? `
  <h2>Points forts</h2>
  <div class="strengths">${result.strengths.map(s => `<span class="chip strong">${esc(s.label)} (${s.score}/100)</span>`).join("")}</div>` : ""}

  ${result.gaps.length ? `
  <h2>Points de vigilance</h2>
  <div class="gaps">${result.gaps.map(g => `<span class="chip gap">${esc(g.label)} (${g.score}/100)</span>`).join("")}</div>` : ""}

  ${result.limiter ? `
  <h2>Limiteur principal identifié</h2>
  <p style="font-size:10pt;"><strong>${esc(result.limiter.label)}</strong> — ${esc(result.limiter.description)}</p>` : ""}

  <div class="footer">
    Rapport généré par Potentiel Physiologique TFCL™ — ${new Date().toLocaleDateString("fr-FR")}<br/>
    Score basé sur le Coaching Compass (5 axes) et les cibles d'ambition.
  </div>
</body></html>`;
}
