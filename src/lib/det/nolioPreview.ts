import {preparePlan} from '../../../supabase/functions/_shared/nolioV2/planDryRun';
import {sessionsFromPlanJson} from '../../../supabase/functions/_shared/nolioV2/planSessions';
import {raceIdentityOf} from '../../../supabase/functions/_shared/nolioV2/plannedMapper';
import {detReleaseVersion} from './independentVersion';

/** Run the actual mapper on the saved plan with local simulation references. */
export function previewDetGuidance(plan: unknown, scope?: unknown) {
  const sessions = sessionsFromPlanJson(plan).sessions;
  const race = sessions.map(raceIdentityOf).find(value => value !== null) ?? null;
  return preparePlan(plan, {
    synthetic:true, athleteId:'usr_SYNTHETIC',
    sportIds:{swim:'spt_SWIM',bike:'spt_BIKE',run:'spt_RUN',strength:'spt_STRENGTH',brick:'spt_TRI'},
    exerciseIds:{}, competition:race,
  }, detReleaseVersion, scope);
}
