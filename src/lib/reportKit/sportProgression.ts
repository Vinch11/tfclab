import type { DbTest } from '@/hooks/useCloudData';
import { validTestDate } from '@/lib/testMeasurementReview';
import { esc, RK } from './index';

export interface SportProgressPoint { id: string; date: string; value: number }
export interface SportProgressSeries { label: string; unit: string; protocol: string | null; points: SportProgressPoint[] }
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const format = (v: number, unit: string) => v.toFixed(unit === 'W' ? 0 : 1).replace('.', ',');

/** Test results only: no current snapshot copied backwards, no targets or model predictions. */
export function sportProgressionSeries(tests: DbTest[], athleteId: string, sport: 'bike' | 'run'): SportProgressSeries[] {
  const groups = new Map<string, SportProgressSeries>();
  if (!athleteId) return [];
  for (const test of tests) {
    if (test.athlete_id !== athleteId) continue;
    const raw = test.raw && typeof test.raw === 'object' && !Array.isArray(test.raw) ? test.raw as Record<string, unknown> : {};
    const sportName = String(test.sport || raw.sport || '').toLowerCase();
    if (!(sport === 'bike' ? ['bike', 'cycling', 'velo', 'vélo'] : ['run', 'running', 'cap', 'course']).includes(sportName)) continue;
    const date = validTestDate(raw.testDate) ? raw.testDate : test.date?.slice(0, 10);
    if (!validTestDate(date)) continue;
    if (raw.estimated === true || raw.isEstimate === true || raw.source === 'estimate' || raw.source === 'model') continue;
    const thresholdTest = /seuil|threshold|ftp|20.?min/i.test(`${test.type} ${test.name} ${raw.protocolId ?? ''}`);
    // TFCL form values retain their numeric input as strings in raw test storage.
    const power = typeof raw.power_avg === 'string' && raw.power_avg.trim() ? Number(raw.power_avg) : raw.power_avg;
    const value = sport === 'run' ? raw.vma : thresholdTest ? power : null;
    if (!positive(value)) continue;
    const protocol = typeof raw.protocolId === 'string' && raw.protocolId.trim() ? raw.protocolId.trim()
      : typeof raw.protocol === 'string' && raw.protocol.trim() ? raw.protocol.trim()
      : typeof raw.dayKey === 'string' && raw.dayKey.trim() && typeof raw.source === 'string' && /TESTING_WEEK/i.test(raw.source) ? `${raw.source}:${raw.dayKey}` : null;
    // Unknown protocols remain isolated: matching names cannot establish comparability.
    const key = protocol ?? `single:${test.id}`;
    const series = groups.get(key) ?? { label: sport === 'bike' ? 'Puissance du test de seuil vélo' : 'VMA', unit: sport === 'bike' ? 'W' : 'km/h', protocol, points: [] };
    if (!series.points.some(p => p.id === test.id)) series.points.push({ id: test.id, date, value });
    groups.set(key, series);
  }
  return [...groups.values()].map(s => ({ ...s, points: s.points.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)) }))
    .sort((a, b) => b.points.length - a.points.length || b.points[b.points.length - 1].date.localeCompare(a.points[a.points.length - 1].date));
}

export function sportProgressionHTML(tests: DbTest[], athleteId: string, sport: 'bike' | 'run'): string {
  const series = sportProgressionSeries(tests, athleteId, sport);
  if (!series.length) return '';
  const color = sport === 'bike' ? RK.primary : RK.mint;
  return `<div class="sport-progress"><h2>${sport === 'bike' ? 'Tes tests de seuil vélo' : 'Ta VMA au fil des tests'}</h2><p class="muted">Chaque point correspond à un test enregistré. Une ligne relie uniquement les tests de même protocole ; les conditions peuvent influencer le résultat.</p>${series.map(s => {
    const W = 560, H = 250, left = 58, right = 44, top = 30, bottom = 56;
    const values = s.points.map(p => p.value), low = Math.min(...values), high = Math.max(...values);
    const padding = Math.max((high - low) * .2, high * .05, s.unit === 'W' ? 5 : .5);
    const min = Math.max(0, low - padding), max = high + padding;
    const times = s.points.map(p => Date.parse(`${p.date}T00:00:00Z`));
    const tmin = Math.min(...times), tmax = Math.max(...times);
    const x = (i: number) => left + (tmax === tmin ? .5 : (times[i] - tmin) / (tmax - tmin)) * (W - left - right);
    const y = (v: number) => H - bottom - (v - min) / (max - min) * (H - top - bottom);
    const ticks = Array.from({ length: 4 }, (_, i) => min + (max - min) * i / 3);
    const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(s.label)} : ${s.points.map(p => `${p.date}, ${format(p.value, s.unit)} ${s.unit}`).join(' ; ')}"><text x="${left}" y="16" fill="${RK.muted}" font-size="12">${esc(s.unit)} · axe vertical resserré</text>${ticks.map(v => `<line x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}" stroke="${RK.lineSoft}"/><text x="${left - 10}" y="${y(v) + 4}" text-anchor="end" fill="${RK.muted}" font-size="12">${format(v, s.unit)}</text>`).join('')}${s.points.length > 1 ? `<polyline points="${s.points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3"/>` : ''}${s.points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.value)}" r="5" fill="${color}" stroke="${RK.surface}" stroke-width="2"><title>${p.date} : ${format(p.value, s.unit)} ${s.unit}</title></circle>${s.points.length <= 6 ? `<text x="${x(i)}" y="${y(p.value) - 12}" text-anchor="middle" fill="${RK.ink}" font-size="13" font-weight="600">${format(p.value, s.unit)}</text>` : ''}`).join('')}${[...new Set([0, s.points.length - 1])].map(i => `<text x="${x(i)}" y="${H - 25}" text-anchor="middle" fill="${RK.muted}" font-size="12">${s.points[i].date.split('-').reverse().join('/')}</text>`).join('')}</svg>`;
    const first = s.points[0], last = s.points[s.points.length - 1], delta = last.value - first.value;
    return `<figure class="progress-figure"><h3>${esc(s.label)}</h3><div class="progress-chart">${svg}</div><figcaption>${s.points.length > 1 ? `${format(first.value, s.unit)} → ${format(last.value, s.unit)} ${s.unit} · ${delta >= 0 ? '+' : ''}${format(delta, s.unit)} ${s.unit} entre ces tests` : `${format(last.value, s.unit)} ${s.unit} · ton point de départ, pas encore une progression`}</figcaption><details><summary>Les ${s.points.length} résultat${s.points.length > 1 ? 's' : ''} daté${s.points.length > 1 ? 's' : ''}</summary><ul>${s.points.map(p => `<li>${p.date.split('-').reverse().join('/')} : <strong>${format(p.value, s.unit)} ${s.unit}</strong></li>`).join('')}</ul></details></figure>`;
  }).join('')}</div>`;
}

export const SPORT_PROGRESSION_CSS = `
.sport-progress{margin-top:22px}.progress-figure{margin:16px 0 22px;break-inside:avoid;border-top:1px solid ${RK.lineSoft};padding-top:12px}.progress-figure h3{margin:0 0 8px}.progress-chart{overflow-x:auto}.progress-chart svg{display:block;width:100%;min-width:480px}.progress-figure figcaption{font-size:12px;color:${RK.ink};margin:8px 0}.progress-figure details{font-size:11px;color:${RK.muted}}.progress-figure summary{cursor:pointer}.progress-figure ul{line-height:1.7}@media print{.progress-chart svg{min-width:0}.progress-figure details{display:block}.progress-figure details ul{display:block}}
`;