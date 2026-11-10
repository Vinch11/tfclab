import type { PlanConfig } from '@/hooks/useAITrainingPlan';
import { TT_OBJECTIVE, type TimeTrialDeclaration } from '../../../experimental/det-engine/v410-time-trial-contract';

/** Only the DET branch calls this adapter. The original profile and its ranked diagnostic stay intact. */
export function withOrdinaryTimeTrial(config: PlanConfig, athleteId: string, profile: string, declaration: TimeTrialDeclaration): PlanConfig {
  if (declaration.athleteId !== athleteId || (config.athleteId && config.athleteId !== athleteId))
    throw Error('CLM : les données de position doivent appartenir à l’athlète sélectionné.');
  const goals=config.raceGoals ?? [];
  if (!config.raceDate || goals.length !== 1 || goals[0].priority !== 'A' || goals[0].raceDate !== config.raceDate ||
      (goals[0].raceFormat && goals[0].raceFormat !== 'continuous'))
    throw Error('CLM : renseigner une seule course A, continue et datée dans le formulaire.');
  if (goals[0].targetTimeMinutes && goals[0].targetTimeMinutes !== declaration.raceDurationMinutes)
    throw Error('CLM : la durée prévue dans le formulaire diffère de la durée du contre-la-montre.');
  return {...config, athleteId, objective:TT_OBJECTIVE, catalogObjective:TT_OBJECTIVE, planningProfileReference:profile,
    timeTrialContext:structuredClone(declaration),
    raceGoals:[{...goals[0], objective:TT_OBJECTIVE, targetTimeMinutes:declaration.raceDurationMinutes}]};
}
