/**
 * Mini radar SVG — readiness par axe physiologique.
 * Pur SVG inline pour rendu identique en UI et en PDF (print).
 */

import type { AxisAlignment } from "./computeRaceReadiness";

interface Opts {
  axes: AxisAlignment[];
  size?: number;        // px
  strokeColor?: string; // contour polygone
  fillColor?: string;   // remplissage polygone (rgba)
}

export function buildReadinessRadarSVG({
  axes,
  size = 280,
  strokeColor = "#0ea5e9",
  fillColor = "rgba(14,165,233,0.18)",
}: Opts): string {
  if (!axes.length) return "";

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const n = axes.length;

  // Angles (start at top, clockwise)
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  // Concentric rings (25/50/75/100)
  const rings = [0.25, 0.5, 0.75, 1].map((r) => {
    const pts = Array.from({ length: n }, (_, i) => {
      const a = angle(i);
      return `${(cx + Math.cos(a) * radius * r).toFixed(1)},${(cy + Math.sin(a) * radius * r).toFixed(1)}`;
    }).join(" ");
    return `<polygon points="${pts}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`;
  }).join("");

  // Axes spokes + labels
  const spokes = axes.map((a, i) => {
    const ang = angle(i);
    const x = cx + Math.cos(ang) * radius;
    const y = cy + Math.sin(ang) * radius;
    const lx = cx + Math.cos(ang) * (radius + 18);
    const ly = cy + Math.sin(ang) * (radius + 18);
    const anchor =
      Math.abs(Math.cos(ang)) < 0.2 ? "middle" : Math.cos(ang) > 0 ? "start" : "end";
    return `
      <line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#cbd5e1" stroke-width="1"/>
      <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="10" fill="#475569" font-weight="600">${a.label}</text>
      <text x="${lx.toFixed(1)}" y="${(ly + 12).toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="9" fill="#0ea5e9" font-weight="700">${a.score}</text>
    `;
  }).join("");

  // Score polygon
  const scorePts = axes.map((a, i) => {
    const r = Math.max(0, Math.min(1, a.score / 100));
    const ang = angle(i);
    return `${(cx + Math.cos(ang) * radius * r).toFixed(1)},${(cy + Math.sin(ang) * radius * r).toFixed(1)}`;
  }).join(" ");

  // Dots on each axis vertex
  const dots = axes.map((a, i) => {
    const r = Math.max(0, Math.min(1, a.score / 100));
    const ang = angle(i);
    const x = cx + Math.cos(ang) * radius * r;
    const y = cy + Math.sin(ang) * radius * r;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${strokeColor}"/>`;
  }).join("");

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="${size}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Radar readiness">
  ${rings}
  ${spokes}
  <polygon points="${scorePts}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>
  ${dots}
</svg>`;
}
