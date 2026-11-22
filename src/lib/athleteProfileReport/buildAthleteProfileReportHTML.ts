import { esc, num, reportDocument, rich } from '../reportKit';
import { ATHLETE_VISUAL_CSS, sportPhoto } from '../reportKit/story';
import { PEDAGOGY_CSS, sportDiagramHTML } from '../reportKit/pedagogy';
import { calendarPreview, dateLabel, editionCover, editionNav, gapFigure, referenceRange, sportName } from '../reportKit/editions';
import editionCSS from '../reportKit/editions.css?raw';
import { fmt } from '../coachingCompass/factorStates';
import { metricSourceLabel } from '../coachingCompass/presentation';
import type { AthleteProfileReportInput } from './types';

const guide: Record<string, string> = {
  vma: 'Ta vitesse maximale aérobie aide à situer l’effort que représente ton allure de course. On la relira avec ton prochain résultat sur le terrain.',
  vo2max: 'Ce chiffre décrit la quantité d’oxygène que ton corps peut utiliser pendant un effort intense. Ton allure ou ta puissance sur le terrain nous dit comment tu utilises cette capacité.',
  vlamax: 'Sur une relance, tu peux fournir de l’énergie très vite. Sur une épreuve longue, la question est de savoir ce que ces accélérations te coûtent. Un sprint et un effort soutenu dans le même sport nous aident à le comprendre.',
  tte: 'Atteindre ton seuil est une chose. Savoir combien de minutes tu peux y rester nous aide à choisir la durée des efforts que tu répètes.',
  ftpkg: 'Ce repère relie la puissance que tu peux soutenir à vélo à ton poids. Il aide à comprendre ce que le parcours exigera, particulièrement dans les montées.',
  fatmax: 'Ce repère situe la zone où ton corps utilise le plus de graisses. À vélo, on le confronte à ce que tu arrives à maintenir et à manger en sortie longue.',
  demand: 'Le chrono que tu vises demande de soutenir une certaine part de ta vitesse maximale aérobie. Cette comparaison aide ton coach à juger l’exigence de l’allure visée.',
};

export function buildAthleteProfileReportHTML(d: AthleteProfileReportInput): string {
  const sports = d.sports ?? [];
  const brief = d.brief;
  const first = brief?.ranked[0];
  const support = brief?.supports[0];
  const flow = brief?.flow;
  const decision = flow && !flow.useBlock ? null : d.decision;
  const firstName = d.athleteName.trim().split(/\s+/)[0];
  const chapter = (id: string, heading: string, content: string) =>
    `<section class="edition-section" id="${id}"><h2>${esc(heading)}</h2>${content}</section>`;
  const cover = editionCover({ label: 'Rapport athlète', name: d.athleteName, title: 'Ton chemin vers la course',
    intro: `${firstName}, voici ce que tes efforts racontent déjà. On part de tes repères pour comprendre ce qui te rapproche de ton objectif et choisir la suite de ton entraînement.`,
    meta: [['Objectif', d.objectifLabel], ['Ambition', d.ambitionLabel], ['Prochaine course', d.nextRace ?? ''], ['Bilan de référence', d.snapshotDate ? dateLabel(d.snapshotDate) : 'À compléter'], ['Édition du', d.generatedAt]],
    sport: sports[0], logo: d.logoBase64 });
  const opening = chapter('portrait', 'Ce que tes tests racontent', `
    ${support ? `<p class="edition-deck">En ${sportName[support.sport].toLowerCase()}, tu peux déjà t’appuyer sur ton résultat de ${esc(support.r.label)}. Ton bilan indique <b>${fmt(support.r.value!)} ${esc(support.r.unit)}</b>, dans la plage de comparaison de ton objectif (${esc(referenceRange(support.r))}).</p>` : `<p class="edition-deck">${brief ? 'On part des efforts que tu as déjà réalisés. Ton prochain test permettra de situer les qualités sur lesquelles tu peux t’appuyer.' : rich(d.profileNarrative)}</p>`}
    ${first ? `<h3>Ce qui mérite ton attention en ${sportName[first.sport].toLowerCase()}</h3><p><b>${esc(first.r.label)}.</b> ${esc(guide[first.r.key] ?? 'Ce repère aide à préciser la qualité à travailler pour ton épreuve.')}</p>${gapFigure(brief.ranked.slice(0, 3), false, brief)}` : ''}
    ${flow ? `<div class="note"><b>La priorité retenue pour ton entraînement</b><p>${esc(flow.title)}</p>${flow.lead?.status ? `<small>${esc(flow.lead.status)}</small>` : ''}</div>` : ''}`);
  const route = d.calendar?.length ? [] : d.roadmap?.phases ?? [];
  const journey = chapter('preparation', 'Comment on prépare ton objectif', `
    ${decision ? `<p class="edition-deck">Le premier chantier proposé est « ${esc(decision.block)} »${decision.durationWeeks > 0 ? `, sur ${decision.durationWeeks} semaines` : ''}.</p>
      ${decision.athleteMessage ? `<p>${rich(decision.athleteMessage)}</p>` : ''}
      ${decision.workouts.length ? `<h3>À quoi cela ressemble à l’entraînement</h3><ul>${decision.workouts.slice(0, 3).map(w => `<li>${rich(w)}</li>`).join('')}</ul>` : ''}` :
      `<p class="edition-deck">${esc(flow?.decision ?? 'Ton coach précisera le premier chantier avec toi.')}</p>`}
    ${route.length ? `<h3>Le fil de ta préparation</h3><p>Cette trame proposée pour ton objectif donne un rôle à chaque période. Ton coach en ajuste les dates et le contenu dans ton calendrier.</p>
      <ol class="route">${route.map(p => `<li><small>Semaines ${p.startWeek}–${p.endWeek}</small><h3>${esc(p.name)}</h3><p>${rich(p.focus)}</p>${p.targets.length ? `<p class="chapter-detail">Repère de fin de bloc · ${p.targets.map(rich).join(' · ')}</p>` : ''}</li>`).join('')}</ol>` : ''}
    ${calendarPreview(d.calendar, true)}`);
  const disciplines = sports.map(sp => {
    const tte = (d.sportTte ?? []).filter(r => sp === 'run' ? /course/i.test(r.label) : /vélo/i.test(r.label));
    const sets = d.zoneSets.filter(z => sp === 'run' ? /course/i.test(z.sportLabel) : /vélo/i.test(z.sportLabel));
    const refs = (d.sportReferences ?? []).filter(r => r.sport === (sp === 'run' ? 'running' : 'cycling') && r.value != null && r.value > 0);
    const comparisons = d.sportComparisons?.[sp] ?? [];
    const vo2 = d.metrics.find(m => m.key === 'vo2max' && m.value != null && m.value > 0);
    const energy = vo2 && !comparisons.some(r => r.key === 'vo2max') ? [{...vo2, target: vo2.target?.[0], source: vo2.source ?? undefined}, ...comparisons] : comparisons;
    return chapter('reperes-' + sp, sp === 'run' ? 'Ta course à pied en chiffres' : 'Ton vélo en chiffres', `
      <div class="chapter-image">${sportPhoto(sp)}</div>
      <p>${sp === 'run' ? 'Sur le terrain, tes allures donnent un sens aux chiffres du bilan. Retrouve ici les repères à consulter avant une séance.' : 'Sur la route, tes watts permettent de retrouver un effort d’une sortie à l’autre. Ces repères t’aident à lire tes séances.'}</p>
      ${sets.map(z => `<p class="chapter-detail">${z.source === 'derived' ? 'Zones calculées à partir du bilan' : 'Grille de zones provisoire'}${z.anchors.length ? ' · ' + z.anchors.map(esc).join(', ') : ''}.</p>`).join('')}
      ${sportDiagramHTML({sport: sp, comparisons: energy, tte: tte.map(r => ({...r, key:'tte', unit:'min'})), zones: sets.flatMap(z => z.zones), durability: d.durabilityDataBySport?.[sp]})}
      ${refs.length ? `<dl class="edition-meta">${refs.map(r => `<div><dt>${esc(r.label)}</dt><dd>${fmt(r.value!)} ${esc(r.unit)}</dd><small>${esc(metricSourceLabel(r.source))}</small></div>`).join('')}</dl>` : ''}`);
  }).join('');
  const swim = d.swimming ? chapter('reperes-swim', 'Tes repères en natation', d.swimming.css ? `<p>En bassin, ton allure critique de référence est de <b>${Math.floor(d.swimming.css / 60)}:${String(d.swimming.css % 60).padStart(2, '0')} min/100 m</b>. C’est le repère de ton bilan pour lire tes séries.</p>` : '<p>Ton prochain test en bassin permettra de situer ton allure critique sur 100 mètres.</p>') : '';
  const targets = d.targetProgress.filter(t => t.current != null && t.current > 0 && t.target != null && t.target > 0 && t.progress != null);
  const review = chapter('suivi', 'Ce que tu observeras avec ton coach', `
    <p class="edition-deck">${esc(flow?.instruction ?? 'Reprends un effort de référence dans des conditions comparables et note ton ressenti.')} </p>
    <p>Garde ensemble le résultat, la durée, le terrain et ton ressenti sur 10. Au prochain bilan, ton coach pourra voir si le même effort te coûte moins ou si tu tiens plus longtemps.</p>
    ${!flow && d.nextSteps.length ? `<ul>${d.nextSteps.map(s => `<li>${rich(s)}</li>`).join('')}</ul>` : ''}
    ${!brief && targets.length ? `<h3>Écart à ta cible « ${esc(d.ambitionLabel)} »</h3>${targets.map(t => `<p>${esc(t.label)} · ${num(t.current, t.decimals)} / ${num(t.target, t.decimals)} ${esc(t.unit)} · écart restant ${Math.max(0, Math.round(100 - t.progress!))} %</p>`).join('')}` : ''}`);
  const nav: [string, string][] = [['portrait', 'Ton profil'], ['preparation', 'Ta préparation'], ...sports.map((sp): [string,string] => ['reperes-' + sp, sportName[sp]])];
  if (swim) nav.push(['reperes-swim','Natation']);
  nav.push(['suivi', 'Ton prochain bilan']);
  return reportDocument({title: `Rapport athlète — ${d.athleteName}`, extraCSS: ATHLETE_VISUAL_CSS + PEDAGOGY_CSS + editionCSS,
    body: `<main class="edition">${cover}${editionNav(nav)}${opening}${journey}${swim}${disciplines}${review}<footer>Two For Coaching Lab · ${esc(d.athleteName)} · ${esc(d.generatedAt)}</footer></main>`});
}
