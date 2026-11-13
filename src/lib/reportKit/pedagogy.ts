/** Personal report charts: resolved values only, explicit units and numerical axes. */
import { esc, num, RK } from './index';
import { metricSourceLabel } from '../coachingCompass/presentation';

export interface PersonalComparison {
  key?: string; label: string; value: number | null; target?: number | null; unit: string; source?: string;
}
export const PEDAGOGY_CSS = `
.personal-chart{margin:22px 0;break-inside:avoid;border-top:1px solid ${RK.line};padding-top:18px}
.personal-chart h3{font-size:19px;line-height:1.3;letter-spacing:0;margin:0 0 6px;color:${RK.ink}}
.personal-chart .chart-lead{font-size:12px;color:${RK.muted};margin:0 0 16px;line-height:1.6}
.comparison-row{padding:14px 0 18px;border-bottom:1px solid ${RK.lineSoft};break-inside:avoid}
.comparison-heading{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:12px}
.comparison-heading b{font-size:14px;line-height:1.4;color:${RK.ink}}
.comparison-heading>span{font-size:29px;line-height:1.2;color:${RK.ink};font-weight:600;white-space:nowrap}
.comparison-heading small{font-size:12px;font-weight:400;color:${RK.muted}}
.comparison-line{display:grid;grid-template-columns:75px minmax(0,1fr) 80px;gap:12px;align-items:center;margin:8px 0;font-size:12px}
.comparison-line>span:first-child{color:${RK.muted}}.comparison-line>strong{text-align:right;font-size:12px;overflow-wrap:anywhere}
.comparison-track{height:13px;background:${RK.surfaceAlt};border-radius:3px;overflow:hidden}
.comparison-track>span{display:block;height:100%;background:${RK.primary};border-radius:3px}
.comparison-line.target .comparison-track>span{background:${RK.mint}}
.comparison-line.target>strong{color:${RK.mint}}
.comparison-scale{margin:6px 92px 0 87px;display:flex;justify-content:space-between;font-size:10px;color:${RK.muted}}
.comparison-reading{font-size:12px;line-height:1.6;color:${RK.body};margin:12px 0 0}
.comparison-reading strong{color:${RK.ink}}.comparison-source{font-size:10px;color:${RK.muted};margin:5px 0 0}
.personal-chart figcaption{font-size:10px;line-height:1.6;color:${RK.muted};margin-top:12px}
@media screen and (max-width:640px){.personal-chart h3{font-size:19px}.comparison-heading{flex-wrap:wrap;gap:6px}.comparison-heading>span{font-size:27px}.comparison-line{grid-template-columns:52px minmax(0,1fr) 95px;gap:8px}.comparison-scale{margin-left:60px;margin-right:103px}.comparison-heading b{font-size:14px}.comparison-reading{font-size:13px}.chart-lead{font-size:13px!important}}
`;

/** Chart math controls only pixel widths; it never changes targets or model inputs. */
export function personalComparisonHTML(title: string, rows: PersonalComparison[], lead = ''): string {
  const known = rows.filter(r => r.value != null && Number.isFinite(r.value) && r.value > 0);
  if (!known.length) return '';
  return `<figure class="personal-chart"><h3>${esc(title)}</h3>${lead ? `<p class="chart-lead">${esc(lead)}</p>` : ''}${known.map(r => {
    const value = r.value ?? 0;
    const target = r.target != null && Number.isFinite(r.target) && r.target > 0 ? r.target : null;
    const decimals = r.unit === 'min' ? 0 : ['mmol/L/s', 'W/kg'].includes(r.unit) ? 2 : 1;
    const display = (v: number) => `${num(v, decimals)} ${esc(r.unit)}`;
    const max = Math.max(value, target ?? 0) * 1.15;
    const width = (v: number) => (v / max * 100).toFixed(2);
    const tte = r.key === 'tte';
    const interpretation = tte ? `Ce repère décrit le temps tenu ${/course/i.test(r.label) ? 'à l’allure seuil en course' : 'au seuil à vélo'}, pas tes capacités après plusieurs heures.` : '';
    const comparison = target == null ? 'Aucune cible définie dans le compass.' : value < target ? `Écart à ta cible : <strong>${display(target - value)}</strong>.` : value > target ? `Ton bilan est <strong>${display(value - target)} au-dessus de la cible</strong>${r.key === 'vlamax' ? ' ; plus haut n’est pas nécessairement préférable' : ''}.` : 'Ton bilan correspond à cette cible.';
    return `<div class="comparison-row" data-metric="${esc(r.key ?? '')}"><div class="comparison-heading"><b>${esc(r.label)}</b><span>${num(value, decimals)} <small>${esc(r.unit)}</small></span></div>${target ? `<div class="comparison-line"><span>Bilan</span><div class="comparison-track"><span style="width:${width(value)}%"></span></div><strong>${display(value)}</strong></div><div class="comparison-line target"><span>Cible</span><div class="comparison-track"><span style="width:${width(target)}%"></span></div><strong>${display(target)}</strong></div><div class="comparison-scale"><span>0</span><span>${display(max)}</span></div>` : ''}<p class="comparison-reading">${comparison}${interpretation ? ` ${interpretation}` : ''}</p>${r.source ? `<p class="comparison-source">${esc(metricSourceLabel(r.source))}</p>` : ''}</div>`;
  }).join('')}<figcaption>Bilan et cible actuelle, pas une évolution dans le temps. Chaque repère possède sa propre échelle et son unité.</figcaption></figure>`;
}
