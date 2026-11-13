import { computeCoachingCompass } from './computeCoachingCompass';
import type { CoachingCompassInput } from './types';
import { metricSourceLabel } from './presentation';

export interface CompleteIndicator { key: string; label: string; value: number | null; unit: string; target: number | null; source: string; explanation: string }
export interface CompleteDiscipline { sport: string; indicators: CompleteIndicator[] }
const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
export function completeProfileHTML(input: CoachingCompassInput, css: number | null = null): string {
  return `<section class="section"><h3>Profil physiologique complet</h3>${completeProfile(input, css).map(d => `<h4>${esc(d.sport)}</h4><table><thead><tr><th>Indicateur</th><th>Valeur</th><th>Source / limites</th></tr></thead><tbody>${d.indicators.map(i => `<tr><td>${esc(i.label)}</td><td>${i.value == null ? 'Données insuffisantes' : `${i.value} ${esc(i.unit)}`}</td><td>${esc(metricSourceLabel(i.source))} — ${esc(i.explanation)}</td></tr>`).join('')}</tbody></table>`).join('')}</section>`;
}
const positive = (v: number | null | undefined) => v != null && Number.isFinite(v) && v > 0 ? v : null;

/** Read-only complete inventory. Missing measurements never borrow another sport. */
export function completeProfile(input: CoachingCompassInput, css: number | null = null): CompleteDiscipline[] {
  const compass = computeCoachingCompass(input);
  const view = compass.presentation;
  if (!view) return [];
  const sports = view.sport === 'triathlon' ? ['bike', 'run'] as const : [view.sport] as const;
  const result: CompleteDiscipline[] = sports.map(sport => {
    const axes = sport === 'run' ? view.runningDiagnostic?.axes ?? [] : view.cyclingDiagnostic?.axes ?? view.axes;
    const indicators: CompleteIndicator[] = axes.filter(a => !['fatmax', 'wprime', 'durability'].includes(a.key)).map(a => ({
      key: a.key, label: a.label, value: positive(a.value), unit: a.unit, target: positive(a.target), source: a.source ?? 'unknown',
      explanation: a.key === 'tte' ? 'Durée tenue au seuil. Un arrêt volontaire donne un minimum, pas une durée jusqu’à épuisement.' : a.key === 'vo2max' && view.sport === 'triathlon' ? 'Valeur commune enregistrée : elle ne constitue pas deux tests spécifiques vélo et course.' : 'Comparaison à la cible interne de l’objectif ; ce n’est pas une probabilité de réussite.',
    }));
    const add = (key: string, label: string, value: number | null | undefined, unit: string, explanation: string, source = 'snapshot') => {
      if (!indicators.some(i => i.key === key)) indicators.push({ key, label, value: positive(value), unit, target: null, source: positive(value) == null ? 'unknown' : source, explanation });
    };
    const tte = sport === 'run' ? view.tteRun : view.tteBike;
    add('tte', 'Endurance au seuil · TTE', tte?.tte_min, 'min', 'Effort continu à un seuil préalablement établi. Le protocole et la cause de l’arrêt restent à documenter.', tte?.source);
    if (sport === 'run') {
      add('threshold', 'Allure seuil', input.paceThresholdSecPerKm, 's/km', 'Allure enregistrée, distincte de la VMA et de l’allure de compétition.');
      add('economy', 'Économie de course', input.runEconomyScore, '/100', 'Indice d’efficience ; pas une mesure directe de consommation d’oxygène ni un déficit de force.');
      indicators.push({ key: 'drift', label: 'Dérive cardiaque', value: input.hrDriftPct != null && Number.isFinite(input.hrDriftPct) ? input.hrDriftPct : null, unit: '%', target: null, source: input.hrDriftPct == null ? 'unknown' : 'snapshot', explanation: 'Indice de séance : durée, intensité, chaleur et hydratation influencent la lecture.' });
    } else {
      add('ftp', 'FTP', input.ftp, 'W', 'Repère fonctionnel enregistré. FTP, CP et MLSS ne sont pas interchangeables.');
      add('lt1', 'LT1 modélisé', input.lactateThresholds?.lt1?.watts, 'W', 'Seuil aérobie issu du modèle, pas un prélèvement lactate.', 'estimation');
      add('lt2', 'LT2 modélisé', input.lactateThresholds?.lt2?.watts, 'W', 'Repère de modèle : ne certifie pas un MLSS mesuré.', 'estimation');
    }
    for (const ref of view.sportReferences.filter(r => r.sport === (sport === 'run' ? 'running' : 'cycling'))) {
      indicators.push({ key: `critical-${ref.label}-${ref.unit}`, label: ref.label + (sport === 'run' && ref.unit === 'W' || sport === 'run' && ref.unit === 'kJ' ? ' · capteur' : ''), value: positive(ref.value), unit: ref.unit, target: null, source: ref.source, explanation: 'Paramètre ajusté à des efforts. W′/D′ ne mesurent ni la force ni la VLamax. ' + ref.conditions });
    }
    add('fatmax', 'FatMax', sport === 'bike' ? compass.profile.fatmax.value : null, '% FTP', sport === 'run' ? 'Pas de transfert du FatMax vélo vers la course. Voir les courbes exploratoires propres au sport.' : 'Repère lipidique modélisé. Le débit d’oxydation est détaillé dans les courbes.', 'estimation');
    add('durability', 'Durabilité prolongée', null, '', 'Non évaluée : nécessite des comparaisons avant/après effort prolongé. Le TTE seul ne la mesure pas.');
    return { sport: sport === 'run' ? 'Course à pied' : 'Vélo', indicators };
  });
  if (view.sport === 'triathlon') result.push({ sport: 'Natation', indicators: [{ key: 'css', label: 'CSS', value: positive(css), unit: 's/100 m', target: null, source: positive(css) == null ? 'unknown' : 'snapshot', explanation: 'Vitesse critique de nage enregistrée ; ne certifie pas un profil métabolique de natation.' }] });
  return result;
}