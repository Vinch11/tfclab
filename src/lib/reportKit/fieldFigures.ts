import { pairedDecoupling, type latestPairs } from '../diagnostic/durabilityDay';
import type { StoredCriticalSport } from '../criticalMetrics';
import { criticalReliability, fmt, type FactorRow } from '../coachingCompass/factorStates';
import { compassEvidence } from '../coachingCompass/referenceRegistry';
import { dateLabel, sportName } from './editions';
import { esc } from './index';
import { sportPhoto } from './story';
import { chartFigure, pace, tracePlot } from './visualFigures';

type Sport = 'bike' | 'run';
function source(id: string) {
  const ref = compassEvidence.find(e => e.id === id);
  return ref ? `<a href="${esc(ref.url)}">${esc(ref.title)}</a>` : '';
}

function marathonGauge(demand: FactorRow, coach: boolean, status: string): string {
  const pct = demand.value;
  if (pct == null || !Number.isFinite(pct) || pct <= 0) return '';
  const max = Math.max(110, Math.ceil(pct / 10) * 10 + 10);
  const goal = demand.goalPaceSecPerKm ? pace(demand.goalPaceSecPerKm) + ' min/km' : 'Allure visée';
  const graphic = `<div class="demand-legend"><strong>${esc(goal)}</strong><span>${fmt(pct)} % de la vitesse critique</span></div>
    <div class="critical-rail" aria-hidden="true"><i style="width:${100 * pct / max}%"></i><b style="left:${10000 / max}%"></b></div>
    <div class="critical-scale"><span>0 %</span><span>Trait vertical · vitesse critique (100 %)</span><span>${max} %</span></div>`;
  const reading = coach
    ? 'Les coureurs récréatifs de l’étude ont couru le marathon à 84,8 % de leur vitesse critique en moyenne, avec un écart-type de 13,6 points. Cette dispersion invite à vérifier l’allure visée sur les sorties spécifiques.'
    : 'Le trait vertical représente ta vitesse critique. Plus la barre s’en approche, plus ton objectif te demande de courir près de ce repère sur les 42,195 km. Tes sorties longues aident à juger si cette allure te convient.';
  return chartFigure('Que demande le chrono marathon ?', graphic, reading, 'Allure visée rapportée à la vitesse critique · ' + status, coach ? source('cs-marathon-2020') : '');
}

export function criticalFigure(metric: StoredCriticalSport | undefined, sport: Sport, rows: FactorRow[], coach: boolean): string {
  const bike = sport === 'bike';
  const name = bike ? 'Puissance critique' : 'Vitesse critique';
  const test = bike ? 'Bike Day · Puissance critique' : 'Track Day · Vitesse critique';
  const row = rows.find(r => r.key === (bike ? 'cp' : 'cs'));
  if (!metric) {
    return coach && row?.state === 'missing'
      ? `<p class="edition-caption field-followup"><b>${name} à mesurer.</b> Prochain test possible · ${test}.</p>` : '';
  }
  if (metric.coachReview?.verdict === 'reject') {
    return coach ? `<p class="edition-caption field-followup"><b>${name} écartée par le coach.</b> Reprendre les efforts du ${test} avant de retenir un repère.</p>` : '';
  }
  const quality = criticalReliability(metric);
  const status = metric.status === 'confirmed' ? 'Ajustement confirmé par le coach' : 'Estimation à confirmer';
  const format = bike ? fmt : pace;
  const value = bike ? Math.round(metric.critical) : 1000 / metric.critical;
  const unit = bike ? 'W' : 'min/km';
  const reserve = bike ? fmt(Math.round(metric.reserve / 100) / 10) + ' kJ' : fmt(Math.round(metric.reserve)) + ' m';
  const reserveLabel = bike ? 'W′' : 'D′';
  const reading = bike
    ? 'Au-dessus de cette puissance, chaque accélération puise dans une réserve de travail. Un effort plus intense la dépense plus vite.'
    : coach ? 'D′ estime la distance supplémentaire qu’un coureur peut parcourir au-dessus de sa vitesse critique sur un effort maximal.'
      : 'Si tu accélères au-delà de cette allure, tu gagnes des mètres. Cette réserve estime combien de mètres supplémentaires tu peux gagner sur un effort intense.';
  const points = metric.efforts.filter(e => Number.isFinite(e.value) && e.value > 0 && Number.isFinite(e.durationSec) && e.durationSec > 0)
    .map(e => ({ x: e.durationSec, y: bike ? e.value : e.durationSec * 1000 / e.value })).sort((a, b) => a.x - b.x);
  const last = points.at(-1);
  const observed = last ? ' Sur ' + pace(last.x) + ', ' + (coach ? 'le résultat enregistré est de ' : 'tu as tenu ') + format(last.y) + ' ' + unit + '.' : '';
  const date = metric.latestEffortDate ? ' · dernier effort le ' + dateLabel(metric.latestEffortDate) : '';
  const qualityText = quality.level === 'review' && metric.status === 'confirmed' ? status + ' · à revoir' : status;
  const extra = coach && quality.notes.length ? `<p class="field-check">${quality.notes.map(esc).join(' ')}</p>` : '';
  const concept = bike ? 'La puissance critique est estimée à partir de la relation entre les watts produits et la durée des efforts.'
    : 'Cette allure est estimée à partir des distances parcourues sur plusieurs efforts de durées différentes.';
  const context = coach
    ? (bike ? 'Le seuil lactique stable (MLSS) se vérifie séparément. En moyenne, la CP le dépasse de 12,4 W, avec des limites d’accord de −19 à +44 W. ' + source('cp-mlss-2025')
      : 'Cette allure dépend des efforts retenus. Un test lactate peut situer le seuil lactique séparément. ' + source('cs-mlss-2021'))
    : 'Pour savoir quel rythme tu peux tenir pendant une heure, ton coach s’appuie aussi sur tes efforts longs.';
  const summary = `<div class="field-card" data-critical-sport="${sport}">
    <div class="field-head">${sportPhoto(sport, true)}<div><small>${sportName[sport]} · efforts de terrain</small><h3>${name}${coach ? (bike ? ' (CP)' : ' (CS)') : ''}</h3>
    <strong class="field-value">${format(value)} <small>${unit}</small></strong><p>${esc(qualityText + date)}</p></div></div>
    <div class="field-body"><p>${concept}</p><h4>Réserve au-dessus de ce repère · ${reserve}${coach ? ' (' + reserveLabel + ')' : ''}</h4>
    <p>${reading}${coach ? ' La VLamax demande une évaluation distincte.' : ''}</p><p class="field-context">${context}</p>${extra}</div></div>`;
  const plot = tracePlot({
    title: bike ? 'Puissance et durée des efforts' : 'Allure et durée des efforts', xLabel: 'Durée de l’effort (min:s)', xText: pace,
    yLabel: unit, yText: format, traces: [{ label: 'Efforts enregistrés', points }], scatter: true,
    guides: [{ value, label: name }], source: sportName[sport] + ' · ' + points.length + ' efforts · ' + qualityText,
    reading: 'Chaque point représente un effort. Le trait en pointillés situe le repère calculé.' + observed +
      (bike ? ' Les efforts courts permettent de produire davantage de watts.' : 'Une valeur plus petite en min/km correspond à une allure plus rapide.'),
  });
  const demand = !bike && rows.find(r => r.key === 'demandcs');
  return summary + plot + (demand ? marathonGauge(demand, coach, qualityText) : '');
}

export function pairedFigure(pair: ReturnType<typeof latestPairs>[number] | undefined, coach: boolean): string {
  if (!pair) return '';
  const change = pairedDecoupling(pair);
  if (change == null) return '';
  const bike = pair.sport === 'bike';
  const unit = bike ? 'W' : 'min/km';
  const table = `<table class="lab-data paired-data"><thead><tr><th>Bloc de 10 min</th><th>${bike ? 'Puissance' : 'Allure'}</th><th>Cardio</th><th>Ressenti</th></tr></thead>
    <tbody><tr><th>Début</th><td>${esc(pair.early)} ${unit}</td><td>${pair.hr1} bpm</td><td>${pair.rpe1}/10</td></tr>
    <tr><th>Après ${pair.between} min</th><td>${esc(pair.late)} ${unit}</td><td>${pair.hr2} bpm</td><td>${pair.rpe2}/10</td></tr></tbody></table>`;
  const perBeat = bike ? 'la puissance par battement' : 'la distance parcourue par battement';
  const rounded = Math.round(change * 10) / 10;
  const sentence = rounded === 0 ? 'Le rapport entre effort et fréquence cardiaque est resté stable à la précision affichée.'
    : 'Sur le second bloc, ' + perBeat + (rounded > 0 ? ' a diminué de ' : ' a augmenté de ') + fmt(Math.abs(rounded)) + ' %.';
  return chartFigure(bike ? 'À vélo, comment réagit le cœur en fin de sortie ?' : 'En course, comment réagit le cœur en fin de sortie ?', table,
    sentence + (coach ? ' Comparer ce découplage à un autre test réalisé dans des conditions proches. Conditions consignées · ' + pair.context
      : ' Ton ressenti et les conditions de la sortie aident à interpréter cette différence.'),
    'Test avant/après du ' + dateLabel(pair.day) + ' · cible commune ' + pair.target + ' ' + unit);
}
