import type { TFCLCoachingCompassResult } from './types';
import { axisAssessment, metricSourceLabel } from './presentation';

const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));

/** Reports consume the exact display projection, never independently infer targets. */
export function compassReportRows(compass: TFCLCoachingCompassResult) {
  return (compass.presentation?.axes ?? []).map(axis => ({
    key: axis.key, label: axis.label, value: axis.value, target: axis.target,
    unit: axis.unit, score: axis.score, source: axis.source ?? 'unknown',
    assessment: axisAssessment(axis),
  }));
}

/** Sport-specific display values and targets, copied only from the compass. */
export function compassSportReportRows(compass: TFCLCoachingCompassResult, sport: 'bike' | 'run') {
  const view = compass.presentation;
  if (!view) return [];
  const axes = view.disciplineAxes?.[sport] ?? (view.sport === sport ? view.axes : []);
  return axes.map(a => ({ key: a.key, label: a.label, value: a.value, target: a.target, unit: a.unit, source: a.source ?? 'unknown' }));
}

export function compassTteReportRows(compass: TFCLCoachingCompassResult) {
  const view = compass.presentation;
  if (!view) return [];
  return (['bike', 'run'] as const).flatMap(sport => {
    const tte = sport === 'bike' ? view.tteBike : view.tteRun;
    if (!tte || tte.tte_min <= 0) return [];
    return [{ sport, label: sport === 'bike' ? 'TTE vélo' : 'TTE course', value: tte.tte_min,
      target: compassSportReportRows(compass, sport).find(a => a.key === 'tte')?.target ?? null, source: tte.source }];
  });
}

export function buildCompassReportReferencesHTML(compass: TFCLCoachingCompassResult): string {
  const view = compass.presentation;
  if (!view) return '<p>Données insuffisantes</p>';
  const tte = (label: string, value: { tte_min: number; source: string } | null | undefined) => value ? `<p>${label} : ${value.tte_min > 0 ? `${value.tte_min} min` : 'Données insuffisantes'} · ${esc(metricSourceLabel(value.source))}</p>` : '';
  const running = view.runningDiagnostic;
  const cycling = view.cyclingDiagnostic;
  const disciplines = view.disciplineAxes;
  const disciplineTable = (label: string, axes: typeof view.axes) => `<h4>${esc(label)}</h4><table><thead><tr><th>Repère</th><th>Valeur</th><th>Cible interne</th><th>Lecture</th></tr></thead><tbody>${axes.map(a => `<tr><td>${esc(a.label)}</td><td>${a.value != null && a.value > 0 ? `${a.value.toFixed(a.unit === 'mmol/L/s' ? 2 : 1)} ${esc(a.unit)}` : 'Données insuffisantes'}</td><td>${a.target != null && a.target > 0 ? `${a.target} ${esc(a.unit)}` : 'Comparaison non définie'}</td><td>${esc(axisAssessment(a))}</td></tr>`).join('')}</tbody></table>`;
  const runningHTML = running ? `<h3>Diagnostic course indépendant</h3><p>${esc(running.summary)}</p><h4>Priorités course — écarts aux cibles internes</h4>${running.priorities.length ? `<ol>${running.priorities.map(p => `<li>${esc(p.label)} · écart ${p.gapPercent.toFixed(0)} %${p.provisional ? ' · à confirmer' : ' · test déclaré'}<p>${esc(p.explanation)}</p><p>Piste de travail : ${esc(p.lever)}</p></li>`).join('')}</ol>` : '<p>Classement non établi sur les données disponibles.</p>'}<h4>Observations course</h4>${running.observations.map(p => `<p>${esc(p)}</p>`).join('')}<h4>Limites du diagnostic</h4>${running.limitations.map(p => `<p>${esc(p)}</p>`).join('')}` : '';
  const cyclingHTML = cycling ? `<h3>Diagnostic vélo indépendant</h3><p>${esc(cycling.summary)}</p><h4>Priorités vélo — écarts aux cibles internes</h4>${cycling.priorities.length ? `<ol>${cycling.priorities.map(p => `<li>${esc(p.label)} · écart ${p.gapPercent.toFixed(0)} %${p.provisional ? ' · à confirmer' : ' · test déclaré'}<p>${esc(p.explanation)}</p><p>Piste de travail : ${esc(p.lever)}</p></li>`).join('')}</ol>` : '<p>Classement non établi sur les données disponibles.</p>'}<h4>Observations vélo</h4>${cycling.observations.map(p => `<p>${esc(p)}</p>`).join('')}<h4>Limites du diagnostic</h4>${cycling.limitations.map(p => `<p>${esc(p)}</p>`).join('')}` : '';
  return `<div class="compass-references"><h3>Repères par sport</h3>${disciplines ? `${disciplineTable('Vélo', disciplines.bike)}${disciplineTable('Course à pied', disciplines.run)}` : ''}${view.sportReferences.map(r => `<p>${esc(r.label)} : ${r.value != null ? `${r.value.toFixed(r.unit === 'kJ' || r.unit === 'km/h' ? 1 : 0)} ${esc(r.unit)} · ${esc(metricSourceLabel(r.source))}` : 'Données insuffisantes'}${r.conditions ? `<br><span class="muted">${esc(r.conditions)}</span>` : ''}</p>`).join('')}
    <p>W′/D′ : travail au-dessus de CP/vitesse critique ; pas une note générale de capacité anaérobie. Watts course spécifiques au capteur.</p>
    ${tte('TTE vélo', view.tteBike)}${tte('TTE course', view.tteRun)}
    <p>Un effort arrêté volontairement ne fournit qu’un minimum de TTE ; les records restent des estimations.</p>
    <p><b>Robustesse à l’effort prolongé : durabilité non évaluée.</b> Le TTE et la dérive seuls ne la mesurent pas.</p>
    ${view.decouplingRun != null ? `<p>Découplage course : ${view.decouplingRun}% — indice de séance, durée et protocole à confirmer.</p>` : ''}
    <p>FatMax : ${view.sport === 'run' ? 'course non mesurée ; aucune conversion des %FTP vélo en allure course' : 'zone lipidique vélo modélisée, non mesurée ; pas une note de préparation à la course'}.</p>${cyclingHTML}${runningHTML}</div>`;
}

export function buildCompassReportSummaryHTML(compass: TFCLCoachingCompassResult, id: string, title: string): string {
  const rows = compassReportRows(compass);
  return `<section id="${esc(id)}" class="section pagebreakAvoid"><h2>${esc(title)}</h2><p>Cibles internes — pas une probabilité de réussite en course. Valeurs et sources identiques au compass.</p>
    <table><thead><tr><th>Repère</th><th>Valeur</th><th>Cible interne</th><th>Source</th><th>Lecture</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.label)}</td><td>${r.value != null && r.value > 0 ? `${r.value.toFixed(r.unit === 'mmol/L/s' ? 2 : 1)} ${esc(r.unit)}` : 'Données insuffisantes'}</td><td>${r.target != null ? `${r.target} ${esc(r.unit)}` : '—'}</td><td>${esc(metricSourceLabel(r.source))}</td><td>${esc(r.assessment)}</td></tr>`).join('')}</tbody></table>
    <h3>Priorités du diagnostic — classement conservé</h3><p>${esc(compass.limiter?.label ?? 'Données insuffisantes')} · ${esc(compass.presentation?.priorityMetrics.join(' → ') ?? '')}</p>
    ${compass.presentation?.wprimeReview ? '<p>W′ : interprétation à revoir — priorité actuelle conservée pour les plans.</p>' : ''}
    ${buildCompassReportReferencesHTML(compass)}</section>`;
}