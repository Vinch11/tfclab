import { compassEvidence } from '../coachingCompass/referenceRegistry';
import { esc, rich } from './index';
import { sportPhoto } from './story';
import { fmt, planFactorIndex, type FactorRow, type RankedGap } from '../coachingCompass/factorStates';
import type { CalendarEntry, ReportBrief } from './reportBrief';

export const sportName = { bike: 'Vélo', run: 'Course à pied' };
const tierName = { measured: 'Référence publiée', derived: 'Référence dérivée', cohort: 'Référence de cohorte', coaching: 'Repère interne TFCL' };
export const dateLabel = (iso: string) => /^\d{4}-\d\d-\d\d/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : iso;

export function editionCover(o: {
  label: string; name: string; title: string; intro: string; sport?: 'bike' | 'run';
  meta: [string, string][]; logo?: string | null;
}): string {
  return `<header class="edition-cover${o.sport ? ' illustrated' : ''}">
    <div class="edition-mast">${o.logo ? `<img src="${esc(o.logo)}" alt="Two For Coaching Lab">` : '<b>Two For Coaching Lab</b>'}<span>${esc(o.label)}</span></div>
    <div class="edition-headline"><div><p class="edition-name">${esc(o.name)}</p><h1>${esc(o.title)}</h1><p class="edition-deck">${esc(o.intro)}</p></div>
    ${o.sport ? sportPhoto(o.sport, true) : ''}</div>
    <dl class="edition-meta">${o.meta.filter(([, value]) => value && value !== '—').map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></header>`;
}

export function editionNav(items: [string, string][]): string {
  return `<nav class="edition-nav" aria-label="Sommaire">${items.map(([id, label]) => `<a href="#${esc(id)}">${esc(label)}</a>`).join('')}</nav>`;
}

export function referenceRange(r: FactorRow): string {
  if (!r.zone) return 'Repère indisponible';
  return (r.zone.low === r.zone.high ? fmt(r.zone.low) : fmt(r.zone.low) + '–' + fmt(r.zone.high)) + ' ' + r.unit;
}

export function gapFigure(gaps: RankedGap[], detailed: boolean, brief?: ReportBrief): string {
  if (!gaps.length) return '<p>Les comparaisons disponibles ne font ressortir aucun écart classé.</p>';
  // Common scale for the displayed distances. Text retains units, direction and uncertainty.
  const engine = brief?.flow.lead ? [brief.flow.lead, ...brief.flow.others] : [];
  const high = Math.max(...gaps.map(x => x.gap), 1);
  return `<figure class="gap-figure"><figcaption>Écarts aux repères de l’objectif</figcaption>
    <p class="edition-caption">Longueur de la barre = distance à la borne du repère, en pourcentage.</p>
    ${gaps.map((entry, rank) => {
      const { r, sport, gap, verify } = entry;
      const index = planFactorIndex(engine, entry);
      const citations = r.evidence.map(id => compassEvidence.find(e => e.id === id)).filter(Boolean);
      return `<div class="gap-row"><div class="gap-caption"><div><small>${sportName[sport]} · ${tierName[r.tier]}</small><b>${rank + 1}. ${esc(r.label)}</b></div><strong>${fmt(gap)} %</strong></div>
    <div class="gap-track" aria-hidden="true"><i style="width:${gap / high * 100}%"></i></div>
    <p>Bilan <b>${r.value == null ? '—' : fmt(r.value) + ' ' + esc(r.unit)}</b> · Repère <b>${esc(referenceRange(r))}</b></p>
    ${verify ? `<p class="estimate">À vérifier. Le modèle monte jusqu’à ${fmt(verify.modelHigh)} mmol/L/s${verify.observed != null ? `, avec une estimation de terrain à ${fmt(verify.observed)} mmol/L/s${verify.observedDate ? ' le ' + esc(dateLabel(verify.observedDate)) : ''}` : ''}. L’écart affiché peut refléter cette incertitude.</p>` : ''}
    ${index >= 0 ? `<p><b>${index === 0 ? "Bloc ciblé par le moteur" : "Également retenu par le moteur"}</b>${detailed && engine[index].facts ? ' · ' + esc(engine[index].facts) : ''}</p>` : ''}
    ${detailed && r.basis ? `<p>${esc(r.basis)} ${esc(r.adjustment ?? '')}</p>` : ''}${detailed && citations.length ? `<small>${citations.map(e => `<a href="${esc(e.url)}">${esc(e.title)}</a>`).join(' · ')}</small>` : ''}</div>`;
    }).join('')}</figure>`;
}

export function coachDecision(brief: ReportBrief): string {
  const {flow, ranked, unmeasured} = brief;
  const lead = ranked[0];
  const engine = flow.lead ? [flow.lead, ...flow.others] : [];
  const offList = engine.filter(f => !ranked.some(x => planFactorIndex([f], x) === 0));
  return `<section id="lecture-coach" class="edition-section"><p class="eyebrow">Décision de coaching</p><h2>${lead ? esc(lead.r.label) + " · " + sportName[lead.sport] : esc(flow.title)}</h2>
    <p class="edition-deck">${lead ? (lead.verify ? 'Premier écart du Compass, à confirmer sur le terrain.' : 'Premier écart du Compass pour cet objectif et cette ambition.') : rich(flow.detail)}</p>
    <div class="decision-pair"><div><h3>Orientation du Compass</h3><p><b>${esc(flow.title)}</b> · ${esc(flow.decision)}</p></div><div><h3>Contrôle sur le terrain</h3><p>${esc(flow.instruction)}</p></div></div>
    ${gapFigure(ranked, true, brief)}
    ${offList.length ? `<p class="edition-caption">Autres facteurs retenus par le moteur pour le bloc · ${offList.map(f => esc(f.title) + (f.facts ? ' (' + esc(f.facts) + ')' : '')).join(', ')}.</p>` : ''}
    ${unmeasured.length ? `<p class="edition-caption">Comparaisons encore ouvertes · ${unmeasured.map(x => esc(x.r.label) + ' (' + sportName[x.sport] + ')').join(', ')}.</p>` : ''}</section>`;
}

const phasePurposes: [RegExp, string][] = [
  [/seuil/i, 'Dans ce bloc, on observe combien de temps tu peux maintenir un effort soutenu et régulier.'],
  [/allure|spécifi|specifi|race.pace/i, 'Ces séances rapprochent tes efforts de ce que tu retrouveras le jour de la course.'],
  [/affût|affut|taper/i, 'Cette période laisse davantage de place à la récupération à l’approche de la course.'],
  [/base|fonci|endurance/i, 'Cette période installe la régularité et l’aisance dont tu auras besoin dans les efforts plus longs.'],
  [/récup|recup/i, 'Cette période laisse le temps de retrouver de la fraîcheur avant la suite.'],
];

export function calendarPreview(rows: CalendarEntry[] | null | undefined, athlete = false): string {
  if (rows === undefined) return '';
  if (!rows?.length) return `<p class="edition-caption">${rows === null ? 'Le calendrier enregistré n’a pas pu être lu.' : 'Aucune séance à venir dans le calendrier TFCLab.'}</p>`;
  const phases: {label: string; start: string; end: string; count: number}[] = [];
  for (const row of rows) {
    const label = row.phase?.trim() || 'Séances planifiées';
    const previous = phases[phases.length - 1];
    if (previous?.label === label) {
      previous.end = row.date;
      previous.count++;
    } else {
      phases.push({label, start: row.date, end: row.date, count: 1});
    }
  }
  const phaseCounts=new Map<string,number>();
  for (const phase of phases) phaseCounts.set(phase.label,(phaseCounts.get(phase.label) ?? 0)+phase.count);
  const planSummary=phaseCounts.size>1?`<figure class="lab-figure"><figcaption><h3>Les chantiers de la préparation</h3><small>${rows.length} séances à venir</small></figcaption>
    ${[...phaseCounts].map(([label,count])=>`<div class="landmark"><div><b>${esc(label)}</b><strong>${count} / ${rows.length}</strong></div><div class="landmark-rail"><i style="width:${count/rows.length*100}%"></i></div></div>`).join('')}
    <p class="figure-reading">La largeur de chaque barre donne la part des séances programmées dans ce chantier. Les dates figurent ci-dessous.</p></figure>`:'';
  return `<section class="calendar-panel"><h3>Le fil du calendrier enregistré</h3>${planSummary}
    <ol class="route">${phases.map(p => {
      const purpose = athlete && phasePurposes.find(([pattern]) => pattern.test(p.label))?.[1];
      return `<li><small>${esc(dateLabel(p.start))}${p.end !== p.start ? ' – ' + esc(dateLabel(p.end)) : ''}</small>
      <h3>${esc(p.label)}</h3>${purpose ? '<p>' + purpose + '</p>' : ''}<p>${p.count} séance${p.count > 1 ? 's' : ''} au calendrier</p></li>`; }).join('')}</ol>
    <h3>Les prochaines séances du calendrier</h3><ol class="calendar-list">${rows.slice(0, 3).map(row =>
      `<li><time datetime="${esc(row.date)}">${esc(dateLabel(row.date))}</time><span><b>${esc(row.title)}</b></span></li>`).join('')}</ol></section>`;
}
