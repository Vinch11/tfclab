/**
 * Mini graphique de readiness — barres horizontales par axe.
 * Plus lisible qu'un radar à 5 axes, surtout sur mobile.
 * Pur SVG inline → rendu identique UI + PDF.
 *
 * Zones :
 *  - 0-55  : zone "levier de progression" (sky/blue clair)
 *  - 55-70 : zone "marge"               (amber clair)
 *  - 70-85 : zone "solide"              (sky)
 *  - 85+   : zone "excellence"          (emerald)
 *
 * Ligne cible à 100 (objectif d'ambition).
 */

import type { AxisAlignment } from "./computeRaceReadiness";

interface Opts {
  axes: AxisAlignment[];
  size?: number; // largeur cible (px) — la hauteur s'ajuste
  // (compat ascendante — non utilisés mais acceptés)
  strokeColor?: string;
  fillColor?: string;
}

const barColor = (score: number) =>
  score >= 85 ? "#10b981" :   // emerald
  score >= 70 ? "#0ea5e9" :   // sky
  score >= 55 ? "#f59e0b" :   // amber
                "#60a5fa";    // blue clair (ton positif, pas rouge)

const barLabel = (score: number) =>
  score >= 85 ? "Excellent" :
  score >= 70 ? "Solide" :
  score >= 55 ? "Marge à exploiter" :
                "Levier de gain";

export function buildReadinessRadarSVG({ axes, size = 320 }: Opts): string {
  if (!axes.length) return "";

  const W = size;
  const rowH = 38;
  const padTop = 22;
  const padBottom = 18;
  const labelW = Math.min(120, Math.max(90, Math.floor(W * 0.32)));
  const trackX = labelW + 8;
  const trackW = W - trackX - 56; // place pour le score à droite
  const H = padTop + axes.length * rowH + padBottom;

  // grille verticale (25/50/75/100)
  const grid = [25, 50, 75, 100].map((g) => {
    const x = trackX + (trackW * g) / 100;
    return `
      <line x1="${x}" y1="${padTop - 6}" x2="${x}" y2="${H - padBottom + 2}"
            stroke="${g === 100 ? "#10b981" : "#e2e8f0"}"
            stroke-width="${g === 100 ? 1.5 : 1}"
            stroke-dasharray="${g === 100 ? "4 3" : ""}"/>
      <text x="${x}" y="${padTop - 8}" text-anchor="middle" font-size="8" fill="#94a3b8">${g}</text>
    `;
  }).join("");

  // libellé "cible" au-dessus de la ligne 100
  const targetLabelX = trackX + trackW;
  const targetLabel = `<text x="${targetLabelX}" y="${padTop - 8}" text-anchor="middle" font-size="8" fill="#10b981" font-weight="700">Cible</text>`;

  const bars = axes.map((a, i) => {
    const score = Math.max(0, Math.min(100, a.score));
    const y = padTop + i * rowH;
    const barY = y + 10;
    const barH = 14;
    const w = Math.max(2, (trackW * score) / 100);
    const c = barColor(score);
    const tag = barLabel(score);

    return `
      <text x="${labelW}" y="${y + 14}" text-anchor="end" font-size="11" font-weight="600" fill="#1e293b">${escapeXml(a.label)}</text>
      <rect x="${trackX}" y="${barY}" width="${trackW}" height="${barH}" rx="7" ry="7" fill="#f1f5f9"/>
      <rect x="${trackX}" y="${barY}" width="${w.toFixed(1)}" height="${barH}" rx="7" ry="7" fill="${c}"/>
      <text x="${trackX + trackW + 6}" y="${barY + barH - 3}" font-size="11" font-weight="700" fill="${c}">${score}</text>
      <text x="${labelW}" y="${y + 30}" text-anchor="end" font-size="8" fill="#64748b">${tag}</text>
    `;
  }).join("");

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Readiness par axe">
  ${grid}
  ${targetLabel}
  ${bars}
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
