import { esc, reportDocument } from './index';
import { calendarPreview, dateLabel, editionCover, editionNav } from './editions';
import { ATHLETE_VISUAL_CSS } from './story';
import type { CalendarEntry } from './reportBrief';
import editionCSS from './editions.css?raw';

interface ExpressEdition {
  coach: boolean;
  name: string;
  goal: string;
  ambition: string;
  date: string;
  logo: string;
  sport: 'run' | 'bike';
  snapshot: { fc_max?: number | null; weight_kg?: number | null };
  calendar?: CalendarEntry[] | null;
  evidence: string;
}

export function buildExpressEdition(d: ExpressEdition): string {
  const label = d.coach ? 'Rapport coach' : 'Rapport athlète';
  const cover = editionCover({ label, title: d.coach ? 'Bilan Express' : 'Ton point de départ', name: d.name,
    intro: d.coach ? 'Le bilan Express enregistre les premiers repères. Le prochain test dans la discipline de course permettra d’orienter le choix du bloc.'
      : 'Ton histoire commence avec un premier bilan. Une sortie de référence avec ton coach donnera ensuite du sens à tes allures et à tes sensations.',
    meta: [['Objectif', d.goal], ['Ambition', d.ambition], ['Bilan de référence', dateLabel(d.date)]], logo: d.logo, sport: d.coach ? undefined : d.sport });
  const nav: [string, string][] = [['profil', 'Repères du bilan'], ['preparation', 'Préparation'], ['suivi', 'Prochain bilan']];
  if (d.coach) nav.push(['staff-evidence', 'Mesures et sources']);
  const metrics = [['Fréquence cardiaque maximale', d.snapshot.fc_max, 'bpm'], ['Poids', d.snapshot.weight_kg, 'kg']] as const;
  return reportDocument({ title: label + ' — ' + d.name, extraCSS: ATHLETE_VISUAL_CSS + editionCSS,
    body: `<main class="edition">${cover}${editionNav(nav)}<section class="edition-section" id="profil"><h2>Les premiers repères</h2>
    <dl class="edition-meta">${metrics.map(([name, value, unit]) => `<div><dt>${name}</dt><dd>${value != null && value > 0 ? esc(value) + ' ' + unit : 'À renseigner'}</dd></div>`).join('')}</dl>
    <p>La fréquence cardiaque et le poids donnent le contexte du bilan. Pour situer la capacité à tenir un effort ou choisir une priorité physiologique, il faut aussi un effort de référence dans le sport concerné.</p></section>
    <section class="edition-section" id="preparation"><h2>${d.coach ? 'Calendrier de préparation' : 'Tes premières étapes'}</h2>${calendarPreview(d.calendar, !d.coach)}</section>
    <section class="edition-section" id="suivi"><h2>Au prochain bilan</h2><p>${d.coach ? 'Documenter la durée, le résultat et le ressenti d’un test de terrain adapté au niveau de l’athlète. Reprendre ensuite le Compass pour préciser la priorité.' : 'Avec ton coach, choisis un effort de référence adapté à ton expérience. Garde sa durée, ton résultat et ton ressenti sur 10. Ce sera ton point de comparaison pour la suite.'}</p></section>
    ${d.coach ? d.evidence : ''}<footer>Two For Coaching Lab · ${esc(d.name)}</footer></main>` });
}
