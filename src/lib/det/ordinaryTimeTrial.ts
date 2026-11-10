import {missingData,incompatible} from './coachDecision';
import type { PlanConfig } from '@/hooks/useAITrainingPlan';
import { TT_OBJECTIVE, type TimeTrialDeclaration } from '../../../experimental/det-engine/v410-time-trial-contract';

/** Only the DET branch calls this adapter. The original profile and its ranked diagnostic stay intact. */
export function withOrdinaryTimeTrial(config: PlanConfig, athleteId: string, profile: string, declaration: TimeTrialDeclaration): PlanConfig {
  if (declaration.athleteId !== athleteId || (config.athleteId && config.athleteId !== athleteId))
    throw incompatible('CLM : vérifiez l’athlète sélectionné et l’observation de position associée.', 'timeTrial.athleteId');
  const goals=config.raceGoals ?? [];
  if (!config.raceDate || goals.length !== 1 || goals[0].priority !== 'A' || goals[0].raceDate !== config.raceDate ||
      (goals[0].raceFormat && goals[0].raceFormat !== 'continuous'))
    throw missingData('CLM : renseigner une seule course A, continue et datée dans le formulaire.', 'raceGoals');
  if (goals[0].targetTimeMinutes && goals[0].targetTimeMinutes !== declaration.raceDurationMinutes)
    throw incompatible('La durée cible du formulaire diffère de la durée du contre-la-montre. Corrigez la durée prévue.', 'raceGoals.targetTimeMinutes','timeTrial.raceDurationMinutes');
  return {...config, athleteId, objective:TT_OBJECTIVE, catalogObjective:TT_OBJECTIVE, planningProfileReference:profile,
    timeTrialContext:structuredClone(declaration),
    raceGoals:[{...goals[0], objective:TT_OBJECTIVE, targetTimeMinutes:declaration.raceDurationMinutes}]};
}
