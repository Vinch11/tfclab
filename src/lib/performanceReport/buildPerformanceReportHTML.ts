import { esc, reportDocument } from '../reportKit';
import { editionCover, editionNav, dateLabel, sportName } from '../reportKit/editions';
import { ATHLETE_VISUAL_CSS, personalMarkers } from '../reportKit/story';
import { PEDAGOGY_CSS, sportDiagramHTML } from '../reportKit/pedagogy';
import editionCSS from '../reportKit/editions.css?raw';
import type { VisualProfile } from '../reportKit/visualProfile';
import { energyAreaSVG, lactateCurveSVG, substratesSVG } from './charts';
import type { PerformanceReportInput } from './types';

/** Detailed companion to the two profile editions. Curves are labelled as model outputs. */
export function buildPerformanceReportHTML(input: PerformanceReportInput, visuals?:VisualProfile): string {
  const p = input.physio;
  const sports = input.sports ?? ['bike'];
  const hasCurves = sports.includes('bike') && input.curve.length > 2;
  const meta = input.identity.filter(x => ['Objectif','Ambition'].includes(x.label)).map((x): [string,string] => [x.label,x.value]);
  const cover = editionCover({label:'Analyse de performance', name:input.athleteName, title:'Lire les courbes de ton bilan',
    intro:'Les valeurs de référence donnent le point de départ. Les courbes illustrent ensuite comment le modèle décrit l’effort quand l’intensité augmente.',
    meta:[...meta, ['Bilan', input.snapshotDate ? dateLabel(input.snapshotDate) : 'À compléter']], logo: input.logoBase64, sport:sports[0]});
  const chapters: [string,string,string][] = [];
  const gauges = input.gauges.filter(g => g.value != null && g.value > 0);
  if (visuals?.portrait) chapters.push(['empreinte','Empreinte physiologique',visuals.portrait]);
  else if (gauges.length) chapters.push(['references','Les repères du bilan',personalMarkers(gauges)]);
  for (const sport of sports) {
    const sets = input.zoneSets?.filter(z => sport === 'bike' ? /vélo/i.test(z.sportLabel) : /course/i.test(z.sportLabel)) ?? [];
    chapters.push([sport, sportName[sport], sportDiagramHTML({
      sport, comparisons: input.sportComparisons?.[sport] ?? [],
      tte: (input.sportTte ?? []).filter(t => t.sport === sport).map(t => ({...t, key:'tte', unit:'min'})),
      zones: sets.flatMap(s => s.zones), landmarks: sets.flatMap(s => s.landmarks ?? []), durability: input.durabilityDataBySport?.[sport],
    })]);
  }
  if (visuals?.terrain) chapters.push(['terrain','Traces et repères de terrain',visuals.terrain]);
  if (visuals?.evolution) chapters.push(['evolution','Évolution des bilans',visuals.evolution]);
  if (hasCurves) {
    chapters.push(['seuil','À quelle puissance se situe le seuil estimé ?',`
      <p>Chaque point représente une estimation à une puissance donnée. Pour comparer cette courbe à un test, relève les watts et le lactate à chaque palier.</p>
      ${lactateCurveSVG(input.curve,p.mlssW,p.lt1W,p.lt2W)}
      ${p.mlssW != null ? `<p class="note">Le modèle situe le MLSS vélo autour de <b>${p.mlssW} W</b>.</p>` : ''}`]);
    chapters.push(['energie','Comment l’effort se répartit-il ?',`<p>Lis le graphique de gauche à droite. Il représente les contributions estimées des filières énergétiques lorsque la puissance augmente.</p>${energyAreaSVG(input.curve,p.mlssW,p.vo2W)}`]);
    chapters.push(['carburants','Quels carburants à quelle puissance ?',`
      <p>Les deux courbes estiment l’utilisation des graisses et des glucides en fonction des watts. Le ravitaillement se règle aussi avec ce que tu tolères à l’entraînement.</p>
      ${substratesSVG(input.curve,p.fatMaxW,p.carbMaxGH)}
      ${input.fueling.length ? `<h3>Repères de ravitaillement du modèle</h3><table><thead><tr><th>Durée</th><th>Contexte</th><th>Glucides</th><th>Format</th></tr></thead><tbody>${input.fueling.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}`]);
  } else if (sports.includes('bike')) {
    chapters.push(['modele','Courbes métaboliques vélo','<p>Les entrées disponibles ne permettent pas de tracer les courbes. Vérifie la puissance, le poids et les repères métaboliques dans le bilan vélo.</p>']);
  }
  if (input.controls.length) chapters.push(['verification','Au prochain test', `<ul>${input.controls.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`]);
  return reportDocument({title:`Analyse de performance — ${input.athleteName}`,extraCSS:ATHLETE_VISUAL_CSS + PEDAGOGY_CSS + editionCSS,
    body:`<main class="edition">${cover}${editionNav(chapters.map(([id,h]) => [id,h]))}
      ${chapters.map(([id,h,content]) => `<section id="${id}" class="edition-section"><h2>${esc(h)}</h2>${content}</section>`).join('')}
      <footer>Two For Coaching Lab · ${esc(input.athleteName)} · ${esc(input.generatedAt)}</footer></main>`});
}
