import { coachPriorities } from './coachPriorities';
import { fieldCheckLink, nextFieldCheck } from '../diagnostic/compactFieldAssessment';
import { objectiveDemands } from './objectiveDemands';
import { isKnownPhysiologicalObjective } from '../physiologicalTargets';
import type { CoachingCompassInput, TFCLCoachingCompassResult } from './types';

const actions: Record<string, [string, string]> = {
  tte: ['Tenue au seuil', 'Comparer la durée continue tenue au seuil avec le repère de l’épreuve. Vérifier le seuil de référence et le motif de l’arrêt.'],
  vma: ['Vitesse aérobie', 'Confronter la VMA et l’allure au seuil à une performance récente sur la distance visée.'],
  ftpkg: ['Puissance soutenable à vélo', 'Comparer la puissance tenue sur un effort régulier à la puissance prévue sur le parcours.'],
  vo2max: ['Capacité aérobie', 'Vérifier la discipline et le protocole du test avant de choisir le bloc aérobie.'],
  vlamax: ['Profil glycolytique', 'Confronter le test de sprint à un effort soutenu de la même discipline avant de choisir le bloc.'],
  fatmax: ['Endurance métabolique', 'Vérifier la provenance du FatMax et confronter le résultat à une sortie longue documentée.'],
  'durabilité (découplage)': ['Tenue après fatigue', 'Comparer deux blocs à intensité similaire au début et à la fin d’une sortie longue.'],
};

/** The four coach-facing levels use the same first factor, including when the plan engine has no primary. */
export function compassFlow(input: CoachingCompassInput, compass: TFCLCoachingCompassResult) {
  const { factors, overlap, tied } = coachPriorities(input, compass.presentation);
  const lead = factors[0];
  const shared = !!overlap?.contested && !lead?.hypothesis;
  const selected = lead?.metric.toLowerCase().replace('ftp/kg', 'ftpkg');
  const sport = lead?.sport ?? (compass.presentation?.sport === 'run' ? 'run' : 'bike');
  const check = nextFieldCheck(input, shared || selected === 'vlamax' || (!lead && !!overlap));
  const module = selected === 'tte' ? 'hold-' + sport : selected === 'durabilité (découplage)' ? 'durability-' + sport : null;
  const mappedLink = selected === 'vma' ? '/diagnostic/track-day' : selected === 'ftpkg' ? '/diagnostic/bike-track-day' : undefined;
  const link = module ? '/diagnostic/tests?module=' + module : mappedLink ?? fieldCheckLink(check);
  const active = compass.limiter.type !== 'unknown';
  const useBlock = active && !tied && !shared && !lead?.sport && !lead?.hypothesis && !overlap?.contested &&
    (!lead || input.limiterResult?.categoryRanking?.[0]?.metrics.some(m => m.metric === lead.metric));
  const gap = lead?.observation;
  const named = lead?.title ?? (overlap ? 'Profil glycolytique (VLamax)' : undefined);
  const withinEngine = input.limiterResult?.gapAnalysis.some(m => m.value != null && m.target != null && m.target > 0 &&
    m.prescriptionApplicable !== false && ['optimal', 'acceptable'].includes(m.status ?? ''));
  const within = withinEngine || [compass.presentation?.runningDiagnostic, compass.presentation?.cyclingDiagnostic].some(diagnostic =>
    diagnostic && !diagnostic.priorities.length && diagnostic.axes.some(a => ['tte', 'ftpkg', 'vma'].includes(a.key) &&
      a.source !== 'estimated' && a.value != null && a.target != null && a.target > 0 && a.value >= a.target));
  const goal = objectiveDemands(input.objectif);
  const unsupported = !isKnownPhysiologicalObjective(input.objectif) || goal?.kind === 'beginner' ||
    (input.athleteAge != null && !(input.athleteAge >= 18 && input.athleteAge <= 100));
  const conflict = input.limiterResult?.gapAnalysis.find(m => m.fieldBoundsConflict);
  const measurement = check.module === 'hold-bike' ? 'Durée tenue au seuil vélo à relever'
    : check.module === 'hold-run' ? 'Durée tenue au seuil course à relever'
    : check.module === 'trail-repeat' ? 'Tenue sur une montée de référence à relever'
    : check.module === 'cs-run' ? 'Efforts chronométrés de course à renseigner' : 'Efforts de référence à vélo à renseigner';
  const title = shared ? [lead?.title, 'Profil glycolytique (VLamax)'].filter(Boolean).join(' ou ') :
    tied ? input.limiterResult?.limiterLabel ?? named : named ?? (active && !unsupported ? compass.limiter.label :
    goal?.kind === 'beginner' ? 'Tenue en course continue' : unsupported ? 'Objectif hors référentiel' :
    conflict ? 'Essais de tenue au seuil contradictoires' : within ? 'Aucun écart marqué sur les mesures comparables' : measurement);
  const detail = [lead?.status, lead?.facts, shared || !lead ? overlap?.facts : null,
    shared ? overlap?.previous : null].filter(Boolean).join(' · ') ||
    (active && !unsupported ? compass.limiter.description : conflict?.fieldEstimateNote ?? (within ? 'Suivre la tenue de l’effort à l’intensité visée.' : check.text));
  const action = selected ? actions[selected] : undefined;
  const caution = tied || shared || lead?.hypothesis || (!lead && !!overlap);
  return {
    title, detail, lead, gap, others: factors.slice(1), useBlock: useBlock && !unsupported,
    lever: useBlock && !unsupported ? compass.leverage.label : caution ? 'Départager les observations' : action?.[0] ?? 'Tenue de l’effort spécifique',
    decision: useBlock && !unsupported ? compass.decision.recommendedBlock : caution ? 'Vérifier le facteur prioritaire' : lead ? 'Contrôler le progrès sur le terrain' : 'Compléter la comparaison',
    instruction: caution ? check.text : action?.[1] ?? check.text, link,
  };
}
