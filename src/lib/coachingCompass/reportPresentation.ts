import type { TFCLCoachingCompassResult } from './types';
import { axisAssessment, metricSourceLabel } from './presentation';
import { BENCHMARK_LIMITATION } from './benchmarks';

const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));

/** Reports consume the exact display projection, never independently infer targets. */
export function compassReportRows(compass: TFCLCoachingCompassResult) {
  return (compass.presentation?.axes ?? []).map(axis => ({
    key: axis.key, label: axis.label, value: axis.value, target: axis.target,
    unit: axis.unit, score: axis.score, source: axis.source ?? 'unknown',
    assessment: axisAssessment(axis),
  }));
}

export function buildCompassReportReferencesHTML(compass: TFCLCoachingCompassResult): string {
  const view = compass.presentation;
  if (!view) return '<p>Données insuffisantes</p>';
  const tte = (label: string, value: { tte_min: number; source: string } | null | undefined) => value ? `<p>${label} : ${value.tte_min > 0 ? `${value.tte_min} min` : 'Données insuffisantes'} · ${esc(metricSourceLabel(value.source))}</p>` : '';
  return `<div class="compass-references"><h3>Repères par sport</h3>${view.sportReferences.map(r => `<p>${esc(r.label)} : ${r.value != null ? `${r.value.toFixed(r.unit === 'kJ' || r.unit === 'km/h' ? 1 : 0)} ${esc(r.unit)} · ${esc(metricSourceLabel(r.source))}` : 'Données insuffisantes'}${r.conditions ? `<br><span class="muted">${esc(r.conditions)}</span>` : ''}</p>`).join('')}
    <p>W′/D′ : travail au-dessus de CP/vitesse critique ; pas une note générale de capacité anaérobie. Watts course spécifiques au capteur.</p>
    ${tte('TTE vélo', view.tteBike)}${tte('TTE course', view.tteRun)}
    <p>Un effort arrêté volontairement ne fournit qu’un minimum de TTE ; les records restent des estimations.</p>
    <p><b>Robustesse à l’effort prolongé : durabilité non évaluée.</b> Le TTE et la dérive seuls ne la mesurent pas.</p>
    ${view.decouplingRun != null ? `<p>Découplage course : ${view.decouplingRun}% — indice de séance, durée et protocole à confirmer.</p>` : ''}
    <p>FatMax : ${view.sport === 'run' ? 'course non mesurée ; aucune conversion des %FTP vélo en allure course' : 'zone lipidique vélo modélisée, non mesurée ; pas une note de préparation à la course'}.</p>
    ${view.benchmarks?.length ? `<h3>Références externes — hors score</h3>${view.benchmarks.map(r => `<p><b>${r.kind === 'sport' ? 'Cohorte sportive' : 'Norme âge/sexe'} · ${r.sport === 'run' ? 'Course' : 'Vélo'} · ${esc(r.label)}</b><br>Valeur : ${r.value ?? 'Données insuffisantes'} · Cible TFCL : ${r.target ?? 'Non disponible'} ml/kg/min<br>${esc(r.reference)}<br>${esc(r.context)}<br><a href="${esc(r.url)}">${esc(r.source)}</a><br>${esc(r.limitation)}</p>`).join('')}<p>${esc(BENCHMARK_LIMITATION)}</p>` : ''}</div>`;
}

export function buildCompassReportSummaryHTML(compass: TFCLCoachingCompassResult, id: string, title: string): string {
  const rows = compassReportRows(compass);
  return `<section id="${esc(id)}" class="section pagebreakAvoid"><h2>${esc(title)}</h2><p>Cibles internes — pas une probabilité de réussite en course. Valeurs et sources identiques au compass.</p>
    <table><thead><tr><th>Repère</th><th>Valeur</th><th>Cible interne</th><th>Source</th><th>Lecture</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.label)}</td><td>${r.value != null && r.value > 0 ? `${r.value.toFixed(r.unit === 'mmol/L/s' ? 2 : 1)} ${esc(r.unit)}` : 'Données insuffisantes'}</td><td>${r.target != null ? `${r.target} ${esc(r.unit)}` : '—'}</td><td>${esc(metricSourceLabel(r.source))}</td><td>${esc(r.assessment)}</td></tr>`).join('')}</tbody></table>
    <h3>Priorités du diagnostic — classement conservé</h3><p>${esc(compass.limiter?.label ?? 'Données insuffisantes')} · ${esc(compass.presentation?.priorityMetrics.join(' → ') ?? '')}</p>
    ${compass.presentation?.wprimeReview ? '<p>W′ : interprétation à revoir — priorité actuelle conservée pour les plans.</p>' : ''}
    ${buildCompassReportReferencesHTML(compass)}</section>`;
}