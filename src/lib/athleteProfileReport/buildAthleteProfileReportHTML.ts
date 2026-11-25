import { esc, num, reportDocument, rich } from '../reportKit';
import { ATHLETE_VISUAL_CSS, sportPhoto } from '../reportKit/story';
import { PEDAGOGY_CSS, sportDiagramHTML } from '../reportKit/pedagogy';
import { preparationTimeline, calendarPreview, dateLabel, editionCover, editionNav, gapFigure, referenceRange, sportName } from '../reportKit/editions';
import editionCSS from '../reportKit/editions.css?raw';
import { visualChapter } from '../reportKit/visualProfile';
import { swimFigure } from '../reportKit/swimFigure';
import { fmt } from '../coachingCompass/factorStates';
import { metricSourceLabel } from '../coachingCompass/presentation';
import { garminBoxHTML } from '../reportKit/garminBox';
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

/** Les décisions du compass sont écrites pour le coach : on les traduit pour l'athlète. */
const NEXT_STEP: Record<string, string> = {
  'Contrôler le progrès sur le terrain': 'Ton plan démarre sur cette priorité. Ton coach suivra tes séances pour vérifier que ce repère progresse.',
  'Vérifier le facteur prioritaire': 'Avant de lancer le premier bloc, ton coach vérifiera ce repère avec toi lors d’un prochain test.',
  'Compléter la comparaison': 'Il manque encore quelques tests pour choisir ton premier chantier. Ton coach te dira lesquels.',
};
export function athleteNextStep(decision: string | null | undefined): string {
  if (!decision) return 'Ton coach précisera le premier chantier avec toi.';
  return NEXT_STEP[decision] ?? `Le premier chantier proposé est « ${decision} ».`;
}

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
    ${support ? `<p class="edition-deck">${support.r.key === 'vo2max' ? 'Tu peux déjà t’appuyer sur ta VO₂max, commune à tes sports.' : `En ${sportName[support.sport].toLowerCase()}, tu peux déjà t’appuyer sur ton résultat de ${esc(support.r.label)}.`} Ton bilan indique <b>${fmt(support.r.value!)} ${esc(support.r.unit)}</b>, dans la plage de comparaison de ton objectif (${esc(referenceRange(support.r))}).</p>` : `<p class="edition-deck">${brief ? 'On part des efforts que tu as déjà réalisés. Ton prochain test permettra de situer les qualités sur lesquelles tu peux t’appuyer.' : rich(d.profileNarrative)}</p>`}
    ${first ? `<h3>Ce qui mérite ton attention en ${sportName[first.sport].toLowerCase()}</h3><p><b>${esc(first.r.label)}.</b> ${esc(guide[first.r.key] ?? 'Ce repère aide à préciser la qualité à travailler pour ton épreuve.')}</p>${gapFigure(brief.ranked.slice(0, 3), false, brief)}` : ''}
    ${flow ? `<div class="note"><b>La priorité retenue pour ton entraînement</b><p>${esc(flow.title)}</p></div>` : ''}`);
  const journey = chapter('preparation', 'Comment on prépare ton objectif', `
    ${preparationTimeline(d.roadmap, [d.objectifLabel, d.nextRace].filter(Boolean).join(' · '), true)}
    ${decision ? `<p class="edition-deck">Le premier chantier proposé est « ${esc(decision.block)} »${decision.durationWeeks > 0 && !d.roadmap ? `, sur ${decision.durationWeeks} semaines` : ''}.</p>
      ${decision.athleteMessage ? `<p>${rich(decision.athleteMessage)}</p>` : ''}
      ${decision.workouts.length ? `<h3>À quoi cela ressemble à l’entraînement</h3><ul>${decision.workouts.slice(0, 3).map(w => `<li>${rich(w)}</li>`).join('')}</ul>` : ''}` :
      `<div class="note next-step"><b>Prochaine étape avec ton coach</b><p>${esc(athleteNextStep(flow?.decision))}</p></div>`}
    ${calendarPreview(d.calendar, true, true)}`);
  const disciplines = sports.map(sp => {
    const tte = (d.sportTte ?? []).filter(r => sp === 'run' ? /course/i.test(r.label) : /vélo/i.test(r.label));
    const sets = d.zoneSets.filter(z => sp === 'run' ? /course/i.test(z.sportLabel) : /vélo/i.test(z.sportLabel));
    const refs = (d.sportReferences ?? []).filter(r => {
      if (r.sport !== (sp === 'run' ? 'running' : 'cycling') || r.value == null || r.value <= 0) return false;
      const covered = d.visuals?.illustratedCritical?.includes(sp);
      return !covered || (sp === 'run' && (r.unit === 'W' || r.unit === 'kJ'));
    });
    // La VO₂max du bilan est commune aux sports : en triathlon, elle n'est montrée qu'une fois (vélo),
    // avec un seul repère, plutôt que deux fois avec deux plages différentes.
    const sharedVo2 = sp === 'run' && sports.includes('bike');
    const comparisons = (d.sportComparisons?.[sp] ?? []).filter(r => !(sharedVo2 && r.key === 'vo2max'));
    const vo2 = sharedVo2 ? undefined : d.metrics.find(m => m.key === 'vo2max' && m.value != null && m.value > 0);
    const sectionRows = brief?.sections.find(s => s.sport === sp)?.rows ?? [];
    const withRange = <T extends { key?: string }>(r: T) => ({ ...r, range: sectionRows.find(x => x.key === r.key)?.zone ?? null });
    const energy = (vo2 && !comparisons.some(r => r.key === 'vo2max') ? [{...vo2, target: vo2.target?.[0], source: vo2.source ?? undefined}, ...comparisons] : comparisons).map(withRange);
    const landmarks = sets.flatMap(z => z.landmarks ?? []);
    return chapter('reperes-' + sp, sp === 'run' ? 'Ta course à pied en chiffres' : 'Ton vélo en chiffres', `
      <div class="sport-intro"><div class="chapter-image">${sportPhoto(sp)}</div><div>
      <p>${sp === 'run' ? 'Sur le terrain, tes allures donnent un sens aux chiffres du bilan. Retrouve ici les repères à consulter avant une séance.' : 'Sur la route, tes watts permettent de retrouver un effort d’une sortie à l’autre. Ces repères t’aident à lire tes séances.'}</p>
      ${sets.map(z => `<p class="chapter-detail">${esc(z.summary ?? (z.source === 'derived' ? 'Zones calculées à partir de ton bilan.' : 'Grille de zones provisoire, à confirmer par un test.'))}</p>`).join('')}
      </div></div>
      ${sportDiagramHTML({sport: sp, athlete: true, landmarks, comparisons: energy, tte: tte.map(r => ({...r, key:'tte', unit:'min'})), zones: sets.flatMap(z => z.zones), durability: d.durabilityDataBySport?.[sp]})}
      ${sets.map(z => garminBoxHTML(z.garmin, sp, true)).join('')}
      ${refs.length ? `<dl class="edition-meta">${refs.map(r => `<div><dt>${esc(r.label)}</dt><dd>${fmt(r.value!)} ${esc(r.unit)}</dd><small>${esc(metricSourceLabel(r.source))}</small></div>`).join('')}</dl>` : ''}`);
  }).join('');
  const swim = d.swimming ? chapter('reperes-swim', 'Tes repères en natation', swimFigure(d.swimming.css)) : '';
  const targets = d.targetProgress.filter(t => t.current != null && t.current > 0 && t.target != null && t.target > 0 && t.progress != null);
  const review = chapter('suivi', 'Ce que tu observeras avec ton coach', `
    <p class="edition-deck">${esc(flow?.instruction ?? 'Reprends un effort de référence dans des conditions comparables et note ton ressenti.')} </p>
    <p>Garde ensemble le résultat, la durée, le terrain et ton ressenti sur 10. Au prochain bilan, ton coach pourra voir si le même effort te coûte moins ou si tu tiens plus longtemps.</p>
    ${!flow && d.nextSteps.length ? `<ul>${d.nextSteps.map(s => `<li>${rich(s)}</li>`).join('')}</ul>` : ''}
    ${!brief && targets.length ? `<h3>Écart à ta cible « ${esc(d.ambitionLabel)} »</h3>${targets.map(t => `<p>${esc(t.label)} · ${num(t.current, t.decimals)} / ${num(t.target, t.decimals)} ${esc(t.unit)} · écart restant ${Math.max(0, Math.round(100 - t.progress!))} %</p>`).join('')}` : ''}`);
  const illustrations = d.visuals;
  const portrait = visualChapter('empreinte','Ton profil en un regard','L’aiguille bleue représente ton bilan. Le vert situe le repère utilisé pour ton objectif. Chaque cadran se lit dans sa propre unité.', illustrations?.portrait ?? '');
  const terrain = visualChapter('terrain','De tes tests à tes séances','Ces repères viennent de tes efforts enregistrés. Ils donnent un sens concret aux sensations et aux chiffres de ta montre.', illustrations?.terrain ?? '');
  const fuels = visualChapter('carburants','Ce qui alimente ton effort à vélo','Voici comment ton profil influence le recours aux graisses et aux glucides selon les watts que tu développes.', illustrations?.metabolism ?? '');
  // Règle coach (13/11/2026) : aucun historique ni progression dans le rapport athlète ; l'historique reste dans l'édition coach.
  const nav:[string,string][]=[['portrait','Ton profil']];
  if (portrait) nav.push(['empreinte','Tes jauges']);
  if (terrain) nav.push(['terrain','Tes tests']);
  if (fuels) nav.push(['carburants','Tes carburants']);
  nav.push(['preparation','Ta préparation']);
  if (swim) nav.push(['reperes-swim','Natation']);
  nav.push(...sports.map((sp):[string,string]=>['reperes-'+sp,sportName[sp]]));
  nav.push(['suivi','Ton prochain bilan']);
  return reportDocument({title: `Rapport athlète — ${d.athleteName}`, extraCSS: ATHLETE_VISUAL_CSS + PEDAGOGY_CSS + editionCSS,
    body: `<main class="edition">${cover}${editionNav(nav)}${opening}${portrait}${terrain}${fuels}${journey}${swim}${disciplines}<div class="edition-ending">${review}<footer>Two For Coaching Lab · ${esc(d.athleteName)} · ${esc(d.generatedAt)}</footer></div></main>`});
}
