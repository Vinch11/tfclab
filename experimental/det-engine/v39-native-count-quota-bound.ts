/**
 * V39 — early certificate that the historical session-COUNT ratio cannot
 * reach its own swim objective given the authorised weekly frequency quotas.
 *
 * This does NOT reinterpret workouts, waive the legacy validator, or label a
 * plan as safe. It only proves impossibility by an OPTIMISTIC LOWER bound:
 * minimum swim counts divided by the MAXIMUM possible endurance session
 * counts (including full quota headroom for bike/run/bricks).
 *
 * Any unmodelled constraint can only make the true minimum swim share higher.
 */
import type {WeeklyQuota} from '@/engines/plan/sessionSizingMatrix';

type WeekQuota={week:number;weekType:string;quota:WeeklyQuota};
export interface NativeCountQuotaBound {
  scope:'load_weeks_only';
  loadedWeeks:number[];
  minimumMandatorySwimSessions:number;
  optimisticMaximumEnduranceSessions:number;
  optimisticMinimumSwimPct:number|null;
  optimisticAllLoadWeeksSwimPct:number|null;
  strictUpperSwimPct:number;
  nativeBlockingUpperSwimPct:number;
  mathematicallyCannotMeetStrictSwimTarget:boolean|null;
  mathematicallyCannotAvoidNativeSwimBlocker:boolean|null;
  interpretation:'necessary_condition_not_a_schedule_or_dose_validation';
}

/** The historical validator allows a +/-3pp tolerance as a warning, and
 * escalates at +/-8pp to an error. We don't change those thresholds.
 */
export function assessNativeSwimCountQuotaBound(
  weeks:readonly WeekQuota[],
  strictUpperSwimPct:number,
  nativeErrorTolerancePp=8,
):NativeCountQuotaBound {
  if(!Number.isFinite(strictUpperSwimPct)||strictUpperSwimPct<=0||strictUpperSwimPct>100||
     !Number.isFinite(nativeErrorTolerancePp)||nativeErrorTolerancePp<0)
    throw Error('v39_count_quota_target_invalid');
  const loadWeeks=weeks.filter(w=>w.weekType==='load');
  let swims=0, maxEndurance=0, anyBrickPossible=false;
  const weeklyOptimisticLowerPcts:number[]=[];
  let valid=loadWeeks.length>0;
  for(const {quota:q} of loadWeeks){
    const ranges=[q.swim,q.bike,q.run,q.brick,q.strength,q.totalSessions];
    if(ranges.some(range=>!range||!Number.isSafeInteger(range.min)||
       !Number.isSafeInteger(range.max)||range.min<0||range.max<range.min)||
       !Number.isSafeInteger(q.totalSessions.max)||
       q.totalSessions.max<q.swim.min+q.bike.min+q.run.min+q.brick.min+q.strength.min){
      valid=false;break;
    }
    const slotsAvailableForEndurance=q.totalSessions.max-q.strength.min;
    const optimisticOtherCount=Math.min(q.bike.max+q.run.max+q.brick.max,
      Math.max(0,slotsAvailableForEndurance-q.swim.min));
    const optimisticEnduranceCount=q.swim.min+optimisticOtherCount;
    if(optimisticEnduranceCount<1||q.swim.min>q.swim.max){
      valid=false;break;
    }
    swims+=q.swim.min;
    maxEndurance+=optimisticEnduranceCount;
    anyBrickPossible ||= q.brick.max>0;
    // Count-based native validation can exclude a nominal load week by its
    // semantic theme. Grant each week an extra integer under its own odd
    // brick count; this remains a lower bound for ANY included subset.
    weeklyOptimisticLowerPcts.push(100*q.swim.min/
      (optimisticEnduranceCount+(q.brick.max>0?1:0)));
  }
  // Native validator rounds 0.5 * GLOBAL brick-count twice; with an odd
  // brick count, one brick contributes two units to its denominator. Grant
  // that extra unit even if an odd count is not actually schedulable: a
  // deliberately optimistic upper bound can never create a false impossibility.
  if(valid&&anyBrickPossible)maxEndurance+=1;
  const allWeeksPct=valid&&maxEndurance>0?100*swims/maxEndurance:null;
  // Aggregate optimistically assumes all load weeks remain in native metrics.
  // The minimum of each week's lower bound is ALSO valid when the native
  // validator drops any subset of them. Only this subset-safe floor may
  // support an inevitable-blocker verdict.
  const pct=valid&&weeklyOptimisticLowerPcts.length?
    Math.min(...weeklyOptimisticLowerPcts):null;
  return {
    scope:'load_weeks_only',
    loadedWeeks:loadWeeks.map(w=>w.week),
    minimumMandatorySwimSessions:valid?swims:0,
    optimisticMaximumEnduranceSessions:valid?maxEndurance:0,
    optimisticMinimumSwimPct:pct,
    optimisticAllLoadWeeksSwimPct:allWeeksPct,
    strictUpperSwimPct,
    nativeBlockingUpperSwimPct:strictUpperSwimPct+nativeErrorTolerancePp,
    mathematicallyCannotMeetStrictSwimTarget:pct===null?null:pct>strictUpperSwimPct,
    mathematicallyCannotAvoidNativeSwimBlocker:pct===null?null:
      pct>strictUpperSwimPct+nativeErrorTolerancePp,
    interpretation:'necessary_condition_not_a_schedule_or_dose_validation',
  };
}
