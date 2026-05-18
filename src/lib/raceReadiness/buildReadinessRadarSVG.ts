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
 * Repères affichés :
 *  - Ligne pleine grise  : moyenne des athlètes similaires
 *  - Ligne pleine violette: seuil "au-dessus de la moyenne" (top ~30%)
 *  - Ligne pointillée verte : cible d'ambition (100)
 */

import type { AxisAlignment } from "./computeRaceReadiness";
import type { PeerReference } from "./peerReference";

interface Opts {
  axes: AxisAlignment[];
  size?: number;
  peerRef?: PeerReference | null;
  // (compat ascendante — non utilisés mais acceptés)
  strokeColor?: string;
  fillColor?: string;
}

const barColor = (score: number) =>
  score >= 85 ? "#10b981" :
  score >= 70 ? "#0ea5e9" :
  score >= 55 ? "#f59e0b" :
                "#60a5fa";

const barLabel = (score: number, peer?: PeerReference | null) => {
  if (peer && score >= peer.peerAbove) return "Au-dessus de la moyenne";
  if (peer && score >= peer.peerAvg - 5) return "Dans la moyenne";
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Solide";
  if (score >= 55) return "Marge à exploiter";
  return "Levier de gain";
};

export function buildReadinessRadarSVG({ axes, size = 320, peerRef = null }: Opts): string {
  if (!axes.length) return "";

  const W = size;
  const rowH = 38;
  const padTop = 26;
  const legendH = peerRef ? 28 : 0;
  const padBottom = 18 + legendH;
  const labelW = Math.min(120, Math.max(90, Math.floor(W * 0.32)));
  const trackX = labelW + 8;
  const trackW = W - trackX - 56;
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

  const targetLabelX = trackX + trackW;
  const targetLabel = `<text x="${targetLabelX}" y="${padTop - 8}" text-anchor="middle" font-size="8" fill="#10b981" font-weight="700">Cible</text>`;

  // repères peer (moyenne + au-dessus)
  const peerMarkers = peerRef ? (() => {
    const xAvg = trackX + (trackW * peerRef.peerAvg) / 100;
    const xAbove = trackX + (trackW * peerRef.peerAbove) / 100;
    return `
      <line x1="${xAvg}" y1="${padTop - 2}" x2="${xAvg}" y2="${H - padBottom + 2}"
            stroke="#64748b" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.7"/>
      <line x1="${xAbove}" y1="${padTop - 2}" x2="${xAbove}" y2="${H - padBottom + 2}"
            stroke="#7c3aed" stroke-width="1.4" stroke-dasharray="3 2" opacity="0.85"/>
    `;
  })() : "";

  const bars = axes.map((a, i) => {
    const score = Math.max(0, Math.min(100, a.score));
    const y = padTop + i * rowH;
    const barY = y + 10;
    const barH = 14;
    const w = Math.max(2, (trackW * score) / 100);
    const c = barColor(score);
    const tag = barLabel(score, peerRef);

    // pastille "au-dessus" si dépassement du seuil peerAbove
    const aboveBadge = peerRef && score >= peerRef.peerAbove
      ? `<text x="${trackX + w - 4}" y="${barY + barH - 3}" text-anchor="end" font-size="8" font-weight="700" fill="#fff">★</text>`
      : "";

    return `
      <text x="${labelW}" y="${y + 14}" text-anchor="end" font-size="11" font-weight="600" fill="#1e293b">${escapeXml(a.label)}</text>
      <rect x="${trackX}" y="${barY}" width="${trackW}" height="${barH}" rx="7" ry="7" fill="#f1f5f9"/>
      <rect x="${trackX}" y="${barY}" width="${w.toFixed(1)}" height="${barH}" rx="7" ry="7" fill="${c}"/>
      ${aboveBadge}
      <text x="${trackX + trackW + 6}" y="${barY + barH - 3}" font-size="11" font-weight="700" fill="${c}">${score}</text>
      <text x="${labelW}" y="${y + 30}" text-anchor="end" font-size="8" fill="#64748b">${tag}</text>
    `;
  }).join("");

  const legend = peerRef ? (() => {
    const ly = H - legendH + 6;
    return `
      <g font-size="8.5" fill="#475569">
        <line x1="${trackX}" y1="${ly}" x2="${trackX + 14}" y2="${ly}" stroke="#64748b" stroke-width="1.2" stroke-dasharray="2 2"/>
        <text x="${trackX + 18}" y="${ly + 3}">Moyenne ${escapeXml(peerRef.cohortLabel)} (${peerRef.peerAvg})</text>
        <line x1="${trackX}" y1="${ly + 14}" x2="${trackX + 14}" y2="${ly + 14}" stroke="#7c3aed" stroke-width="1.4" stroke-dasharray="3 2"/>
        <text x="${trackX + 18}" y="${ly + 17}">Au-dessus de la moyenne (${peerRef.peerAbove}+) ★</text>
      </g>
    `;
  })() : "";

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Readiness par axe">
  ${grid}
  ${peerMarkers}
  ${targetLabel}
  ${bars}
  ${legend}
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
