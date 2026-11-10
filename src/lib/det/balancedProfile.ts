import type {AthleteDiagnostic} from '@/engines/diagnostic';
import type {PlanAthleteData, PlanConfig} from '@/hooks/useAITrainingPlan';
import {canGuidePrescription, rankPrescriptionGaps} from '@/lib/limiterPrescription';
import {engineLimit, incompatible, missingData} from './coachDecision';
import {detObjectiveGoal} from './ordinaryObjective';

/** The app's classification and evaluated gaps are both required to plan without a ranked deficit. */
export function balancedProfileEvidence(
  diagnostic: AthleteDiagnostic, athleteId: string, athlete: PlanAthleteData, config: PlanConfig,
): string[] {
  if (diagnostic.athleteId !== athleteId || detObjectiveGoal(diagnostic.objectif) !== detObjectiveGoal(config.objective))
    throw incompatible('Rechargez le bilan correspondant à cet athlète et à son objectif.', 'diagnostic');
  const assessment = diagnostic.limiter;
  if (!assessment || !Array.isArray(assessment.gapAnalysis) || !assessment.gapAnalysis.length)
    throw missingData('Complétez le bilan physiologique pour cet objectif.', 'diagnostic.limiter.gapAnalysis');
  const gaps = assessment.gapAnalysis.filter(g => canGuidePrescription(g, config.objective));
  const ranked = rankPrescriptionGaps(gaps, config.objective);
  if (ranked.length)
    throw incompatible('Le bilan classe ' + ranked.map(g => g.metric).join(', ') +
      '. Réintégrez une priorité dans le classement du coach ou actualisez le bilan.', 'identifiedLimitersRaw');
  if (assessment.insufficientData !== false) {
    const critical = assessment.missingMetrics?.filter(metric => ['VMA', 'FTP/kg', 'VLamax', 'TTE'].includes(metric)) ?? [];
    if (critical.length) throw missingData('Le bilan est incomplet. Renseignez un repère manquant parmi ' +
      critical.join(', ') + ' puis actualisez le bilan.', ...critical.map(metric => 'diagnostic.' + metric));
    throw missingData('Actualisez le bilan physiologique pour évaluer les écarts à l’objectif.', 'diagnostic.limiter');
  }
  const measured = gaps.filter(g => Number.isFinite(g.value) && Number.isFinite(g.target));
  if (!measured.length)
    throw missingData('Le bilan ne contient aucune comparaison chiffrée exploitable pour cet objectif. Actualisez ses repères.', 'diagnostic.limiter.gapAnalysis');
  if (assessment.primaryLimiter !== 'none' || measured.some(g => g.status === 'limiting' || !Number.isFinite(g.weightedImpact)))
    throw engineLimit('Le diagnostic et le classement transmis à DET divergent. Recalculez le bilan pour cet objectif.');
  const running = diagnostic.sportFocus === 'run';
  if (running && !(Number.isFinite(athlete.paceThresholdSecPerKm) && Number(athlete.paceThresholdSecPerKm) > 0))
    throw missingData('Renseignez l’allure au seuil en min/km pour individualiser les blocs de course.', 'athlete.paceThresholdSecPerKm');
  return measured.map(g => g.metric);
}
