import type { DbCheckin } from '@/hooks/useCloudData';
import type { TFCLCoachingCompassResult } from '../coachingCompass/types';
import type { PerformanceReportInput } from '../performanceReport/types';
import type { ReportBrief } from './reportBrief';
import { dateLabel } from './editions';
import { esc } from './index';
import { fmt } from '../coachingCompass/factorStates';

export function coachingLevers(compass: TFCLCoachingCompassResult, brief: ReportBrief): string {
  const { flow } = brief;
  const list = (items: string[]) => '<ul>' + items.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>';
  const { leverage, decision } = compass;
  return `<section class="section"><h2>Du diagnostic au contenu du bloc</h2><h3>${esc(flow.lever)}</h3>
    <p>${esc(flow.detail)}</p><div class="note"><b>Contrôle terrain</b><p>${esc(flow.instruction)}</p></div>
    ${
      flow.useBlock
        ? `<h3>${esc(decision.recommendedBlock)} · ${decision.durationWeeks} semaines</h3><p>${esc(leverage.description)}</p>
    <div class="decision-pair"><div><h3>Adaptations recherchées</h3>${list(leverage.expectedAdaptations)}</div>
    <div><h3>Exemples de travail</h3>${list(leverage.workoutExamples)}</div></div>
    ${decision.coachRationale ? '<p>' + esc(decision.coachRationale) + '</p>' : ''}
    ${decision.physiologicalTargets.length ? '<h3>Repères à surveiller</h3>' + list(decision.physiologicalTargets) : ''}
    ${decision.prohibitions.length ? '<h3>Précautions retenues pour ce bloc</h3>' + list(decision.prohibitions) : ''}`
        : `<p>Décision proposée · ${esc(flow.decision)}. Le résultat du contrôle orientera le contenu du bloc.</p>`
    }</section>`;
}

export function recoveryDetails(checkins: DbCheckin[], athleteId: string): string {
  const latest = checkins
    .filter((c) => c.athlete_id === athleteId)
    .sort((a, b) => b.date_iso.localeCompare(a.date_iso))
    .slice(0, 8);
  if (!latest.length) return '';
  const columns = [
    ['sleep', 'Sommeil'],
    ['fatigue', 'Fatigue'],
    ['soreness', 'Courbatures'],
    ['stress', 'Stress'],
    ['motivation', 'Motivation'],
    ['rpe_key1', 'RPE séance 1'],
    ['rpe_key2', 'RPE séance 2'],
  ] as const;
  const active = columns.filter(([key]) => latest.some((c) => c[key] != null));
  return `<section class="section"><h2>Récupération et séances clés</h2><p>Derniers questionnaires enregistrés. Relire les variations avec la charge du bloc et les commentaires de l’athlète.</p>
    <table><thead><tr><th>Date</th>${active.map(([, label]) => '<th>' + label + '</th>').join('')}<th>Douleur signalée</th></tr></thead><tbody>${latest.map((c) => `<tr><td>${esc(dateLabel(c.date_iso))}</td>${active.map(([key]) => '<td>' + esc(c[key] ?? '—') + '</td>').join('')}<td>${c.pain_flag == null ? '—' : c.pain_flag ? 'Oui' : 'Non'}</td></tr>`).join('')}</tbody></table>
    ${latest
      .filter((c) => c.notes?.trim())
      .map((c) => '<p><b>' + esc(dateLabel(c.date_iso)) + '</b> · ' + esc(c.notes) + '</p>')
      .join('')}</section>`;
}
export function modelScenarios(p: PerformanceReportInput): string {
  if (!p.sports?.includes('bike') || !p.curve.length || !p.physio.ftp || p.scenarios.length < 2) return '';
  const max = Math.max(...p.scenarios.map((s) => s.mlss));
  return `<section class="section"><h2>Sensibilité du seuil vélo</h2><p>Pour le même profil, le moteur fait varier la VO₂max, la VLamax, puis les deux. Le tableau donne les hypothèses et le MLSS qui en résulte. Ces simulations servent à discuter des leviers possibles.</p>
    <table class="lab-data"><thead><tr><th>Hypothèse simulée</th><th>MLSS estimé</th><th>Écart au profil actuel</th></tr></thead><tbody>${p.scenarios.map((s) => `<tr><td><b>${esc(s.label)}</b><br>${esc(s.detail)}</td><td>${fmt(s.mlss)} W<div class="landmark-rail"><i style="width:${(s.mlss / max) * 100}%"></i></div></td><td>${s.deltaW > 0 ? '+' : ''}${fmt(s.deltaW)} W</td></tr>`).join('')}</tbody></table></section>`;
}
