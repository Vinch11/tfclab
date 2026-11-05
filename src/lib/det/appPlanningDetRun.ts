import {dedicatedProgrammeProblems} from '@/lib/plan/dedicatedSportGoal';
import { multiGoalProblems } from '../../../experimental/det-engine/v406-multi-goal-contract';
import type { FrozenAppPlanningInput } from "./appPlanningInput";
import { runCoachDetPlan, type CoachDetOutcome } from "./coachDetRun";

type AppPlanningDetRunInput = Omit<Parameters<typeof runCoachDetPlan>[0], "appInput"> & {
  appInput: FrozenAppPlanningInput | null;
};

/** Normal app entry point. Missing app context must never select the manual
 * runner's partial diagnostic reconstruction, even outside the React panel. */
export function runAppPlanningDetPlan(input: AppPlanningDetRunInput): CoachDetOutcome {
  if (!input.appInput) {
    return { kind: "refused", refusals: [
      "Profil de planification de l'app absent : génération DET annulée, aucun diagnostic n'est reconstruit.",
    ] };
  }
  const dedicatedProblems=dedicatedProgrammeProblems(input.appInput.config,input.appInput.athlete);
  if(dedicatedProblems.length)return {kind:'refused',refusals:dedicatedProblems};
  const multiProblems = multiGoalProblems(input.appInput.config);
  if(multiProblems.length)return {kind:'refused',refusals:['Calendrier multi-objectifs incomplet : '+multiProblems.join(', ')+'. Renseignez les dates, les priorités et les durées prévues de chaque épreuve.']};
  const applied = input.appInput.config.identifiedLimitersRaw ?? [];
  if (JSON.stringify(applied) !== JSON.stringify(input.appInput.limiters.applied)) {
    return { kind: "refused", refusals: [
      "Ordre des limiteurs incohérent avec le profil de planification : rechargez le profil, rien n'est remplacé.",
    ] };
  }
  return runCoachDetPlan(input);
}
