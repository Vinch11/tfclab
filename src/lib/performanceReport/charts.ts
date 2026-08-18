/**
 * Générateurs SVG du Rapport de Performance TFCL™.
 * Purs : ils reçoivent des données déjà calculées et ne font que de la mise en forme.
 */

import type { PerfCurvePoint, PerfGaugeRow, PerfScenario } from "./types";

export const INK = "#14131A";
export const MUT = "#6E6B78";
export const FAINT = "#97949F";
export const LINE = "#E7E4DC";
export const PAPER = "#FAF9F5";
export const CARD = "#FFFFFF";
export const PERI = "#5555E0";
export const MINT = "#1F9D6B";
export const AMBER = "#C8860D";
export const SKY = "#2E8FD1";
export const ROSE = "#C4577E";
export const VIOL = "#7C5CC4";

const nf = (v: number, d = 0) => v.toFixed(d).replace(".", ",");

function svg(w: number, h: number, parts: string[]): string {
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">${parts.join("")}</svg>`;
}

/** Jauges horizontales : valeur vs plage attendue. */
export function gaugesSVG(rows: PerfGaugeRow[], caption: string): string {
  const W = 760;
  const rh = 46;
  const T = 10;
  const H = T + rh * rows.length + 20;
  const L = 210;
  const R = 118;
  const bw = W - L - R;
  const out: string[] = [];

  rows.forEach((r, i) => {
    const cy = T + rh * i + rh / 2;
    const clampPct = (v: number) =>
      Math.max(0, Math.min(1, (v - r.scale[0]) / Math.max(1e-6, r.scale[1] - r.scale[0])));
    out.push(
      `<text x="0" y="${(cy - 2).toFixed(0)}" font-size="12.2" font-weight="600" fill="${INK}">${r.label}</text>`,
      `<text x="0" y="${(cy + 13).toFixed(0)}" font-size="10.2" fill="${FAINT}">${r.unit}</text>`,
      `<rect x="${L}" y="${(cy - 8).toFixed(0)}" width="${bw}" height="14" rx="7" fill="#EFECE4"/>`,
    );
    if (r.target) {
      const lo = clampPct(r.target[0]);
      const hi = clampPct(r.target[1]);
      out.push(
        `<rect x="${(L + bw * lo).toFixed(0)}" y="${(cy - 11).toFixed(0)}" width="${(bw * (hi - lo)).toFixed(0)}" height="20" rx="6" fill="${MINT}" fill-opacity=".14"/>`,
      );
    }
    if (r.value != null && Number.isFinite(r.value)) {
      const v = clampPct(r.value);
      out.push(
        `<rect x="${L}" y="${(cy - 8).toFixed(0)}" width="${(bw * v).toFixed(0)}" height="14" rx="7" fill="${r.color}"/>`,
        `<circle cx="${(L + bw * v).toFixed(0)}" cy="${(cy - 1).toFixed(0)}" r="5.5" fill="#fff" stroke="${r.color}" stroke-width="2.4"/>`,
      );
    } else {
      out.push(
        `<text x="${L + 8}" y="${(cy + 3).toFixed(0)}" font-size="10.6" fill="${FAINT}" font-style="italic">Données insuffisantes</text>`,
      );
    }
    out.push(
      `<text x="${W - R + 12}" y="${(cy + 3).toFixed(0)}" font-size="13.6" font-weight="600" fill="${INK}">${r.display}</text>`,
    );
  });
  out.push(`<text x="${L}" y="${H - 4}" font-size="10.2" fill="${FAINT}">${caption}</text>`);
  return svg(W, H, out);
}

/** Production vs capacité d'élimination du lactate + lactate net. */
export function lactateCurveSVG(
  points: PerfCurvePoint[],
  mlssW: number | null,
  lt1W: number | null,
  lt2W: number | null,
): string {
  const W = 760;
  const H = 320;
  const L = 56;
  const R = 138;
  const T = 26;
  const B = 46;
  const pw = W - L - R;
  const ph = H - T - B;
  const pmin = points[0]?.power ?? 0;
  const pmax = points[points.length - 1]?.power ?? 1;
  const rateMax = Math.max(
    1,
    ...points.map((p) => Math.max(p.production, p.clearance)),
  );
  const lacMax = Math.max(8, ...points.map((p) => p.lactate));

  const x = (p: number) => L + (pw * (p - pmin)) / Math.max(1e-6, pmax - pmin);
  const yR = (v: number) => T + ph * (1 - v / (rateMax * 1.08));
  const yL = (v: number) => T + ph * (1 - v / (lacMax * 1.08));

  const out: string[] = [];
  for (let i = 0; i <= 4; i++) {
    const yy = T + (ph * i) / 4;
    out.push(`<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="${LINE}"/>`);
    out.push(
      `<text x="${L - 9}" y="${yy + 4}" font-size="10.2" fill="${FAINT}" text-anchor="end">${nf((lacMax * 1.08 * (4 - i)) / 4, 1)}</text>`,
    );
  }
  out.push(
    `<text x="${L - 9}" y="${T - 11}" font-size="9.6" fill="${FAINT}" text-anchor="end">mmol/L</text>`,
  );

  const poly = (get: (p: PerfCurvePoint) => number, y: (v: number) => number) =>
    points.map((p) => `${x(p.power).toFixed(1)},${y(get(p)).toFixed(1)}`).join(" ");

  out.push(
    `<polyline points="${poly((p) => p.lactate, yL)}" fill="none" stroke="${AMBER}" stroke-width="2.8"/>`,
    `<polyline points="${poly((p) => p.production, yR)}" fill="none" stroke="${ROSE}" stroke-width="2.1" stroke-dasharray="6 5"/>`,
    `<polyline points="${poly((p) => p.clearance, yR)}" fill="none" stroke="${MINT}" stroke-width="2.1" stroke-dasharray="6 5"/>`,
  );

  const marker = (p: number | null, label: string, color: string, dy: number) => {
    if (!p || p < pmin || p > pmax) return;
    out.push(
      `<line x1="${x(p).toFixed(1)}" y1="${T}" x2="${x(p).toFixed(1)}" y2="${T + ph}" stroke="${color}" stroke-width="1" stroke-dasharray="3 4"/>`,
      `<text x="${(x(p) - 5).toFixed(1)}" y="${T + dy}" font-size="10.6" font-weight="600" fill="${color}" text-anchor="end">${label}</text>`,
    );
  };
  marker(lt1W, `LT1 ${Math.round(lt1W ?? 0)} W`, MUT, 12);
  marker(lt2W, `LT2 ${Math.round(lt2W ?? 0)} W`, MUT, 26);
  marker(mlssW, `MLSS ${Math.round(mlssW ?? 0)} W`, INK, 40);

  const last = points[points.length - 1];
  out.push(
    `<text x="${W - R + 10}" y="${yR(last.production).toFixed(0)}" font-size="10.4" fill="${ROSE}" font-weight="600">Production (VLamax)</text>`,
    `<text x="${W - R + 10}" y="${(yR(last.clearance) + 12).toFixed(0)}" font-size="10.4" fill="${MINT}" font-weight="600">Élimination (VO₂max)</text>`,
    `<text x="${W - R + 10}" y="${(yL(last.lactate) - 8).toFixed(0)}" font-size="10.4" fill="${AMBER}" font-weight="600">Lactate net</text>`,
  );

  for (let i = 0; i <= 6; i++) {
    const p = pmin + ((pmax - pmin) * i) / 6;
    out.push(
      `<text x="${x(p).toFixed(0)}" y="${H - 16}" font-size="10.4" fill="${FAINT}" text-anchor="middle">${Math.round(p)}</text>`,
    );
  }
  out.push(
    `<text x="${((L + W - R) / 2).toFixed(0)}" y="${H - 2}" font-size="10.2" fill="${FAINT}" text-anchor="middle">Puissance (W)</text>`,
  );
  return svg(W, H, out);
}

/** Contribution aérobie / glycolytique. */
export function energyAreaSVG(
  points: PerfCurvePoint[],
  mlssW: number | null,
  vo2W: number | null,
): string {
  const W = 760;
  const H = 288;
  const L = 56;
  const R = 138;
  const T = 16;
  const B = 46;
  const pw = W - L - R;
  const ph = H - T - B;
  const pmin = points[0]?.power ?? 0;
  const pmax = points[points.length - 1]?.power ?? 1;
  const x = (p: number) => L + (pw * (p - pmin)) / Math.max(1e-6, pmax - pmin);
  const y = (v: number) => T + ph * (1 - v / 100);

  const out: string[] = [];
  [0, 25, 50, 75, 100].forEach((v) =>
    out.push(`<line x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}" stroke="${LINE}"/>`),
  );
  [0, 50, 100].forEach((v) =>
    out.push(
      `<text x="${L - 9}" y="${y(v) + 4}" font-size="10.2" fill="${FAINT}" text-anchor="end">${v} %</text>`,
    ),
  );
  const ae = points.map((p) => `${x(p.power).toFixed(1)},${y(p.aerobicPct).toFixed(1)}`).join(" ");
  out.push(
    `<rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="${ROSE}" fill-opacity=".16"/>`,
    `<polygon points="${L},${y(0)} ${ae} ${W - R},${y(0)}" fill="${PERI}" fill-opacity=".55"/>`,
    `<polyline points="${ae}" fill="none" stroke="${PERI}" stroke-width="2.4"/>`,
  );
  const mark = (p: number | null, label: string, color: string) => {
    if (!p || p < pmin || p > pmax) return;
    out.push(
      `<line x1="${x(p).toFixed(1)}" y1="${T}" x2="${x(p).toFixed(1)}" y2="${y(0)}" stroke="${color}" stroke-width="1" stroke-dasharray="3 4"/>`,
      `<text x="${(x(p) - 5).toFixed(1)}" y="${T + 13}" font-size="10.8" font-weight="600" fill="${color}" text-anchor="end">${label}</text>`,
    );
  };
  mark(mlssW, "MLSS", INK);
  mark(vo2W, "VO₂max", MUT);
  out.push(
    `<text x="${W - R + 10}" y="${y(60)}" font-size="10.4" fill="${PERI}" font-weight="600">Filière aérobie</text>`,
    `<text x="${W - R + 10}" y="${y(94)}" font-size="10.4" fill="${ROSE}" font-weight="600">Filière glycolytique</text>`,
  );
  for (let i = 0; i <= 6; i++) {
    const p = pmin + ((pmax - pmin) * i) / 6;
    out.push(
      `<text x="${x(p).toFixed(0)}" y="${H - 16}" font-size="10.4" fill="${FAINT}" text-anchor="middle">${Math.round(p)}</text>`,
    );
  }
  out.push(
    `<text x="${((L + W - R) / 2).toFixed(0)}" y="${H - 2}" font-size="10.2" fill="${FAINT}" text-anchor="middle">Puissance (W)</text>`,
  );
  return svg(W, H, out);
}

/** Oxydation lipides / glucides en g/h. */
export function substratesSVG(
  points: PerfCurvePoint[],
  fatMaxW: number | null,
  carbCeilingGH: number | null,
): string {
  const W = 760;
  const H = 300;
  const L = 56;
  const R = 138;
  const T = 18;
  const B = 46;
  const pw = W - L - R;
  const ph = H - T - B;
  const pmin = points[0]?.power ?? 0;
  const pmax = points[points.length - 1]?.power ?? 1;
  const vmax = Math.max(120, ...points.map((p) => p.carbGh)) * 1.05;
  const x = (p: number) => L + (pw * (p - pmin)) / Math.max(1e-6, pmax - pmin);
  const y = (v: number) => T + ph * (1 - v / vmax);
  const out: string[] = [];

  for (let i = 0; i <= 4; i++) {
    const yy = T + (ph * i) / 4;
    out.push(`<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="${LINE}"/>`);
    out.push(
      `<text x="${L - 9}" y="${yy + 4}" font-size="10.2" fill="${FAINT}" text-anchor="end">${Math.round((vmax * (4 - i)) / 4)}</text>`,
    );
  }
  out.push(
    `<text x="${L - 9}" y="${T - 6}" font-size="9.6" fill="${FAINT}" text-anchor="end">g/h</text>`,
  );

  const carb = points.map((p) => `${x(p.power).toFixed(1)},${y(p.carbGh).toFixed(1)}`).join(" ");
  const fat = points.map((p) => `${x(p.power).toFixed(1)},${y(p.fatGh).toFixed(1)}`).join(" ");
  out.push(
    `<polygon points="${L},${y(0)} ${carb} ${W - R},${y(0)}" fill="${AMBER}" fill-opacity=".14"/>`,
    `<polyline points="${carb}" fill="none" stroke="${AMBER}" stroke-width="2.6"/>`,
    `<polyline points="${fat}" fill="none" stroke="${MINT}" stroke-width="2.6"/>`,
  );
  if (carbCeilingGH) {
    out.push(
      `<line x1="${L}" y1="${y(carbCeilingGH).toFixed(1)}" x2="${W - R}" y2="${y(carbCeilingGH).toFixed(1)}" stroke="${ROSE}" stroke-width="1.4" stroke-dasharray="5 5"/>`,
      `<text x="${W - R + 10}" y="${(y(carbCeilingGH) + 4).toFixed(1)}" font-size="10.2" fill="${ROSE}" font-weight="600">Plafond ${Math.round(carbCeilingGH)} g/h</text>`,
    );
  }
  if (fatMaxW && fatMaxW >= pmin && fatMaxW <= pmax) {
    out.push(
      `<line x1="${x(fatMaxW).toFixed(1)}" y1="${T}" x2="${x(fatMaxW).toFixed(1)}" y2="${y(0)}" stroke="${MINT}" stroke-width="1" stroke-dasharray="3 4"/>`,
      `<text x="${(x(fatMaxW) - 5).toFixed(1)}" y="${T + 12}" font-size="10.6" font-weight="600" fill="${MINT}" text-anchor="end">FatMax ${Math.round(fatMaxW)} W</text>`,
    );
  }
  const last = points[points.length - 1];
  out.push(
    `<text x="${W - R + 10}" y="${(y(last.carbGh) - 8).toFixed(0)}" font-size="10.4" fill="${AMBER}" font-weight="600">Glucides</text>`,
    `<text x="${W - R + 10}" y="${(y(last.fatGh) + 14).toFixed(0)}" font-size="10.4" fill="${MINT}" font-weight="600">Lipides</text>`,
  );
  for (let i = 0; i <= 6; i++) {
    const p = pmin + ((pmax - pmin) * i) / 6;
    out.push(
      `<text x="${x(p).toFixed(0)}" y="${H - 16}" font-size="10.4" fill="${FAINT}" text-anchor="middle">${Math.round(p)}</text>`,
    );
  }
  out.push(
    `<text x="${((L + W - R) / 2).toFixed(0)}" y="${H - 2}" font-size="10.2" fill="${FAINT}" text-anchor="middle">Puissance (W)</text>`,
  );
  return svg(W, H, out);
}

/** Barres « et si… » : seuil recalculé par levier. */
export function whatIfBarsSVG(scenarios: PerfScenario[], baseline: number): string {
  const W = 760;
  const rowH = 46;
  const T = 12;
  const H = T + rowH * scenarios.length + 18;
  const L = 208;
  const R = 150;
  const bw = W - L - R;
  const maxV = Math.max(baseline, ...scenarios.map((s) => s.mlss)) * 1.06;
  const out: string[] = [];

  scenarios.forEach((s, i) => {
    const cy = T + rowH * i + rowH / 2;
    const w = (bw * s.mlss) / Math.max(1e-6, maxV);
    const wb = (bw * baseline) / Math.max(1e-6, maxV);
    const isBase = s.deltaW === 0;
    out.push(
      `<text x="0" y="${(cy - 2).toFixed(0)}" font-size="12.2" font-weight="600" fill="${INK}">${s.label}</text>`,
      `<text x="0" y="${(cy + 13).toFixed(0)}" font-size="10.2" fill="${FAINT}">${s.detail}</text>`,
      `<rect x="${L}" y="${(cy - 11).toFixed(0)}" width="${w.toFixed(0)}" height="22" rx="6" fill="${isBase ? MUT : PERI}" fill-opacity="${isBase ? 0.35 : 0.85}"/>`,
      `<line x1="${(L + wb).toFixed(0)}" y1="${(cy - 15).toFixed(0)}" x2="${(L + wb).toFixed(0)}" y2="${(cy + 15).toFixed(0)}" stroke="${INK}" stroke-width="1" stroke-dasharray="3 3"/>`,
      `<text x="${W - R + 10}" y="${(cy + 1).toFixed(0)}" font-size="13" font-weight="600" fill="${INK}">${Math.round(s.mlss)} W</text>`,
      `<text x="${W - R + 10}" y="${(cy + 14).toFixed(0)}" font-size="10.2" fill="${s.deltaW > 0 ? MINT : FAINT}">${s.deltaW > 0 ? `+${Math.round(s.deltaW)} W` : "référence"}${s.tteMin ? ` · TTE ${Math.round(s.tteMin)} min` : ""}</text>`,
    );
  });
  out.push(
    `<text x="${L}" y="${H - 3}" font-size="10.2" fill="${FAINT}">Trait pointillé = seuil actuel. Chaque levier est borné par les plafonds de progression mensuels (Inscyd 2025).</text>`,
  );
  return svg(W, H, out);
}
