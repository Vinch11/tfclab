import { esc } from './index';
import type { FactorRow } from '../coachingCompass/factorStates';
import { fmt } from '../coachingCompass/factorStates';

const blue = '#1669a8';
const teal = '#147e76';
const positive = (v: number | null): v is number => v != null && Number.isFinite(v) && v > 0;
export const pace = (seconds: number) => {
  const s = Math.round(seconds);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
export const chartFigure = (title: string, diagram: string, reading: string, source: string, referenceHTML = '') =>
  `<figure class="lab-figure"><figcaption><h3>${esc(title)}</h3><small>${esc(source)}</small></figcaption>${diagram}<p class="figure-reading">${esc(reading)}</p>${referenceHTML ? `<small>${referenceHTML}</small>` : ''}</figure>`;

export function rangeGauge(row: FactorRow, source?: string, athlete = false): string {
  if (!positive(row.value) || !row.zone || !positive(row.zone.high) || !positive(row.zone.low)) return '';
  const { low, high } = row.zone;
  const top = Math.max(row.value, high) * 1.16;
  const point = (v: number, r: number) => {
    const angle = Math.PI * (1 - v / top);
    return [95 + Math.cos(angle) * r, 90 - Math.sin(angle) * r];
  };
  const xy = (v: number, r: number) =>
    point(v, r)
      .map((n) => n.toFixed(2))
      .join(' ');
  const arc = (a: number, b: number, r: number) => `M ${xy(a, r)} A ${r} ${r} 0 0 1 ${xy(b, r)}`;
  const band =
    low === high
      ? `<path d="M ${xy(low, 58)} L ${xy(low, 82)}" stroke="${teal}" stroke-width="4"/>`
      : `<path d="${arc(low, high, 71)}" fill="none" stroke="${teal}" stroke-width="12"/>`;
  const [x, y] = point(row.value, 71);
  const target = (low === high ? fmt(low) : fmt(low) + '–' + fmt(high)) + ' ' + row.unit;
  const level = athlete ? 'Repère de ton objectif' : {
    measured: 'Référence publiée',
    derived: 'Référence dérivée',
    cohort: 'Référence de cohorte',
    coaching: 'Repère interne TFCL',
  }[row.tier];
  return `<figure class="lab-gauge"><figcaption>${esc(row.label)}</figcaption>
    <svg viewBox="0 0 190 103" role="img" aria-label="${esc(row.label)} · ${fmt(row.value)} ${esc(row.unit)} · repère ${esc(target)}">
    <path d="${arc(0, top, 71)}" stroke="#dce7f0" stroke-width="12" fill="none" stroke-linecap="round"/>${band}
    ${Array.from({ length: 9 }, (_, i) => `<path d="M ${xy((top * i) / 8, 82)} L ${xy((top * i) / 8, 87)}" stroke="#91aabb"/>`).join('')}
    <path d="M 95 90 L ${xy(row.value, 62)}" stroke="${blue}" stroke-width="3"/><circle cx="95" cy="90" r="4" fill="${blue}"/>
    <circle cx="${x}" cy="${y}" r="5" fill="white" stroke="${blue}" stroke-width="3"/>
    <text x="22" y="101">0</text><text x="171" y="101" text-anchor="end">${fmt(top)}</text></svg>
    <strong>${fmt(row.value)} <small>${esc(row.unit)}</small></strong>
    ${source ? `<small>${esc(source)}</small>` : ''}<span><i></i> ${esc(target)}</span><small>${level}</small></figure>`;
}

export type Dot = { x: number; y: number | null; status?: string };
export type Trace = { label: string; points: Dot[] };
interface Plot {
  title: string;
  xLabel: string;
  yLabel: string;
  traces: Trace[];
  reading: string;
  source: string;
  xText?: (v: number) => string;
  yText?: (v: number) => string;
  scatter?: boolean;
  guides?: { value: number; label: string }[];
  xGuides?: { value: number; label: string; unit: string }[];
}
const colors = [blue, teal, '#b76227'];
// Keep extremes when a device supplies thousands of samples, and leave breaks for missing samples.
function screenPoints(points: Dot[]): Dot[] {
  if (points.length <= 320) return points;
  const groups: Dot[] = [];
  const size = Math.ceil(points.length / 80);
  for (let i = 0; i < points.length; i += size) {
    const part = points.slice(i, i + size);
    const valid = part.filter((p) => p.y != null);
    if (valid.length !== part.length) {
      groups.push({ x: part[0].x, y: null });
      continue;
    }
    const lo = valid.reduce((a, b) => (a.y! < b.y! ? a : b));
    const hi = valid.reduce((a, b) => (a.y! > b.y! ? a : b));
    groups.push(...[...new Set([part[0], lo, hi, part[part.length - 1]])].sort((a, b) => a.x - b.x));
  }
  return groups;
}
export function tracePlot(plot: Plot): string {
  const traces = plot.traces.map((t) => ({
    ...t,
    points: t.points
      .filter((p) => Number.isFinite(p.x))
      .map((p) => ({ ...p, y: p.y != null && Number.isFinite(p.y) ? p.y : null })),
  }));
  const valid = traces.flatMap((t) => t.points.filter((p) => p.y != null));
  if (valid.length < 2) return '';
  let xmin = Infinity,
    xmax = -Infinity,
    ymin = Infinity,
    ymax = -Infinity;
  for (const p of valid) {
    xmin = Math.min(xmin, p.x);
    xmax = Math.max(xmax, p.x);
    ymin = Math.min(ymin, p.y!);
    ymax = Math.max(ymax, p.y!);
  }
  if (xmin === xmax) return '';
  for (const g of plot.guides ?? []) {
    ymin = Math.min(ymin, g.value);
    ymax = Math.max(ymax, g.value);
  }
  const pad = (ymax - ymin || Math.abs(ymax) * 0.2 || 1) * 0.12;
  const ylo = Math.max(0, ymin - pad),
    yhi = ymax + pad;
  const X = (v: number) => 57 + ((v - xmin) / (xmax - xmin)) * 385;
  const Y = (v: number) => 148 - ((v - ylo) / (yhi - ylo)) * 118;
  const xt = plot.xText ?? fmt,
    yt = plot.yText ?? fmt;
  const axis =
    Array.from({ length: 4 }, (_, i) => {
      const v = ylo + ((yhi - ylo) * i) / 3,
        y = Y(v);
      return `<path d="M57 ${y} H442" stroke="#cfdfeb" stroke-dasharray="3 4"/><text x="49" y="${y + 4}" text-anchor="end">${esc(yt(v))}</text>`;
    }).join('') +
    [xmin, (xmin + xmax) / 2, xmax]
      .map(
        (v, i) =>
          `<text x="${X(v)}" y="168" text-anchor="${['start', 'middle', 'end'][i]}">${esc(xt(v))}</text>`,
      )
      .join('');
  const paths = traces
    .map((t, i) => {
      let started = false;
      const points = screenPoints(t.points);
      const path = points
        .map((p) => {
          if (p.y == null) {
            started = false;
            return '';
          }
          const cmd = started ? 'L' : 'M';
          started = true;
          return cmd + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1);
        })
        .join(' ');
      const dots = points
        .filter((p) => p.y != null && (plot.scatter || t.points.length <= 15))
        .map(
          (p) =>
            `<circle cx="${X(p.x)}" cy="${Y(p.y!)}" r="4.2" fill="${colors[i % 3]}" stroke="white" stroke-width="1.5"><title>${esc(xt(p.x) + ' · ' + yt(p.y!) + ' ' + plot.yLabel + (p.status ? ' · ' + p.status : ''))}</title></circle>`,
        )
        .join('');
      return (
        (plot.scatter
          ? ''
          : `<path d="${path}" fill="none" stroke="${colors[i % 3]}" stroke-width="2.9" stroke-linejoin="round"/>`) +
        dots
      );
    })
    .join('');
  const vertical = (plot.xGuides ?? []).filter(
    (g) => Number.isFinite(g.value) && g.value >= xmin && g.value <= xmax,
  );
  const marks = vertical
    .map(
      (g, i) =>
        `<path d="M${X(g.value)} 29 V148" stroke="${i % 2 ? '#785786' : '#875522'}" stroke-width="1.2" stroke-dasharray="5 4"/>`,
    )
    .join('');
  const guides = (plot.guides ?? [])
    .map((g) => `<path d="M57 ${Y(g.value)} H442" stroke="#875522" stroke-dasharray="6 4"/>`)
    .join('');
  const legend =
    traces.map((t, i) => `<span><i style="background:${colors[i % 3]}"></i>${esc(t.label)}</span>`).join('') +
    (plot.guides ?? [])
      .map((g) => `<span>┄ ${esc(g.label)} · ${esc(yt(g.value))} ${esc(plot.yLabel)}</span>`)
      .join('');
  const verticalKey = vertical
    .map(
      (g, i) =>
        `<span><i style="background:${i % 2 ? '#785786' : '#875522'}"></i>${esc(g.label)} · ${esc(xt(g.value))} ${esc(g.unit)}</span>`,
    )
    .join('');
  return chartFigure(
    plot.title,
    `<svg class="lab-plot" viewBox="0 0 470 198" role="img" aria-label="${esc(plot.title + ' · ' + plot.yLabel + ' en fonction de ' + plot.xLabel)}"><text x="12" y="15">${esc(plot.yLabel)}</text>${axis}${guides}${marks}${paths}<text x="250" y="191" text-anchor="middle">${esc(plot.xLabel)}</text></svg><div class="plot-key">${legend}${verticalKey}</div>`,
    plot.reading,
    plot.source,
  );
}
