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
  if (o.label === 'Rapport coach' || o.label === 'Rapport athlète') {
    const coach = o.label === 'Rapport coach';
    const details = o.meta.filter(([,v]) => v && v !== '—');
    return `<header class="folio-cover ${coach ? 'staff-cover' : 'athlete-cover'}">
      <div class="folio-image"><div class="folio-brand">
        ${o.logo ? `<img src="${esc(o.logo)}" alt="">` : ''}<b>Two For Coaching Lab</b><span>${esc(o.label)}</span></div>${o.sport ? sportPhoto(o.sport, coach) : ''}</div>
      <div class="folio-copy"><p class="folio-name">${esc(o.name)}</p><h1>${esc(o.title)}</h1><p class="folio-intro">${esc(o.intro)}</p>
      <dl class="folio-facts">${details.map(([k,v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div></header>`;
  }
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
  [/vlamax/i, 'Le travail régulier en endurance prépare à maintenir le rythme sans multiplier les accélérations coûteuses.'],
  [/vo2/i, 'Les efforts soutenus visent à développer la quantité d’oxygène que le corps peut utiliser à haute intensité.'],
  [/fat adaptation/i, 'Les sorties en endurance travaillent la capacité à utiliser les graisses quand l’effort se prolonge.'],
  [/vélocité|neuro/i, 'Les efforts courts et vifs servent à retrouver de la vitesse avant de chercher à la tenir plus longtemps.'],
  [/force/i, 'Le travail de force aide à répéter un geste efficace quand la résistance augmente.'],
  [/fraîcheur/i, 'À l’approche de l’épreuve, la priorité est de retrouver des jambes fraîches tout en gardant des repères d’allure.'],
  [/seuil/i, 'Ce bloc travaille la capacité à tenir un effort soutenu et régulier. Le repère à suivre est la durée pendant laquelle l’allure ou la puissance reste stable.'],
  [/allure|spécifi|specifi|race.pace|peak/i, 'Les répétitions à l’intensité de course permettent de reconnaître le bon rythme et de vérifier qu’il reste maîtrisé quand la fatigue arrive.'],
  [/affût|affut|taper/i, 'Cette période laisse davantage de place à la récupération à l’approche de la course.'],
  [/base|fonci|endurance/i, 'Cette période installe la régularité et l’aisance dont tu auras besoin dans les efforts plus longs.'],
  [/build|développement|construction/i, 'Ce bloc développe la qualité ciblée par le plan. Reprendre une séance comparable en fin de bloc aide à voir si le même effort devient plus facile.'],
  [/durabilité|tenue|tte/i, 'L’enjeu est de conserver un effort régulier quand la fatigue monte. Comparer le début et la fin des efforts longs permet de suivre cette capacité.'],
  [/récup|recup/i, 'Cette période laisse le temps de retrouver de la fraîcheur avant la suite.'],
];

const phaseActions: Record<string, string> = {
  'TTE Builder': 'Tenir plus longtemps au seuil',
  'Fat Adaptation': 'Mieux utiliser les graisses à l’effort',
  'Chantier VLamax ↓': 'Rendre les efforts longs plus économiques',
  'Chantier VO2max': 'Développer la capacité aérobie maximale',
  "Développement W'": 'Mieux soutenir les efforts courts et intenses',
  'Force & Économie': 'Gagner en force et en efficacité',
  'Train Low & Race Pace': 'Travailler l’endurance et le rythme de course',
  'Endurance Spécifique +': 'Prolonger l’effort au rythme de course',
  'Régénération post-pic': 'Récupérer après la course',
  'Neuro & Vélocité': 'Gagner en vitesse',
  'Force Endurance': 'Garder de la force dans la durée',
  'Force Endurance K3': 'Garder de la force dans la durée',
  'Spécifique Race Pace': 'Tenir le rythme de course',
  'Spécifique Marathon': 'Tenir son allure marathon',
  'Spécifique Semi': 'Tenir son allure semi-marathon',
  'Spécifique & Big Week': 'Répéter les efforts de la course',
  'Base Aérobie': 'Construire son endurance',
  'Affûtage': 'Arriver avec des jambes fraîches',
  'Fraîcheur & Densité': 'Arriver avec des jambes fraîches',
};

export function preparationTimeline(roadmap: import('../athleteProfileReport/types').ReportRoadmap | null | undefined, goal: string, athlete: boolean) {
  if (!roadmap?.phases.length) return '';
  const phases = roadmap.phases;
  return `<section class="journey-map${athlete ? ' athlete-journey' : ''}"><p class="journey-kicker">Trajectoire proposée</p>
    <h3>${roadmap.totalWeeks} semaines jusqu’à l’objectif</h3>
    <ol>${phases.map((phase,index) => {
      const action = phaseActions[phase.name] || phase.name;
      const explanation = phasePurposes.find(([re]) => re.test(phase.name))?.[1] || phase.focus;
      const span = phase.startWeek === phase.endWeek ? 'Semaine ' + phase.startWeek : 'Semaines ' + phase.startWeek + ' à ' + phase.endWeek;
      return `<li><span class="journey-pin" aria-hidden="true">${athlete ? '' : index+1}</span><div><small>${athlete ? `Bloc ${index + 1}` : span}</small><h4>${esc(action)}</h4>
        <p>${esc(explanation)}</p>${!athlete && phase.focus !== explanation ? `<p class="journey-detail"><b>Travail prévu</b> · ${esc(phase.focus)}</p>` : ''}
        ${phase.targets.length ? `<p class="journey-detail"><b>${athlete ? 'Repère à observer' : 'Repère de fin de bloc'}</b> · ${phase.targets.map(rich).join(' · ')}</p>` : ''}</div></li>`;
    }).join('')}</ol>
    <div class="journey-goal"><small>Objectif</small><strong>${esc(goal)}</strong></div></section>`;
}

export function calendarPreview(rows: CalendarEntry[] | null | undefined, athlete = false): string {
  if (rows === undefined) return '';
  if (!rows?.length) return `<p class="edition-caption">${rows === null ? 'Le calendrier enregistré n’a pas pu être lu.' : 'Aucune séance à venir dans le calendrier TFCLab.'}</p>`;
  rows = [...rows].sort((a,b) => a.date.localeCompare(b.date));
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
  return `<section class="calendar-panel"><h3>${athlete ? 'Ce qui est déjà dans ton calendrier' : 'Chantiers inscrits au calendrier'}</h3>
    <ul class="scheduled-blocks">${phases.map(p => `<li><span>${esc(dateLabel(p.start))}${p.end !== p.start ? ' – ' + esc(dateLabel(p.end)) : ''}</span><b>${esc(p.label)}</b><small>${p.count} séance${p.count > 1 ? 's' : ''}</small></li>`).join('')}</ul>
    <h3>Les prochaines séances du calendrier</h3><ol class="calendar-list">${rows.slice(0, 3).map(row =>
      `<li><time datetime="${esc(row.date)}">${esc(dateLabel(row.date))}</time><span><b>${esc(row.title)}</b></span></li>`).join('')}</ol></section>`;
}
