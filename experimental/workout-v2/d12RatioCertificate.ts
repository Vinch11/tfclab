/**
 * D1.2: arithmetic certificate for the *existing* sport-frequency and
 * sport-ratio policies. Read-only. No reinterpretation of the scientific
 * meaning of SPORT_RATIO_TARGETS and no replacement of validation rules.
 *
 * planValidator.validateSportRatio currently counts sessions, not minutes,
 * and treats each brick as half cycling / half running. This arithmetic
 * proves that the fixed age_group 70.3 load quotas cannot reach its swim
 * range even if every session were otherwise perfectly selected.
 */
import { computeWeeklySessionQuota } from "@/engines/plan/sessionSizingMatrix";
import { SPORT_RATIO_TARGETS } from "@/engines/plan/planValidator";

export interface D12RatioCertificate {
  status:"contradictory_native_policies";
  objective:"703";
  ambition:"age_group";
  weeksChecked:3;
  requiredSessions:{swim:number;bike:number;run:number;brick:number};
  countedSessions:{swim:number;bike:number;run:number};
  derivedPct:{swim:number;bike:number;run:number};
  nativeSwimTarget:[number,number];
  nativeCriticalTolerancePoints:8;
  violatesCriticalSwimThreshold:boolean;
  independentOfWorkoutCatalogue:true;
  recommendedAction:"coach_policy_review_required";
  currentPolicyUnchanged:true;
}
export function computeD12RatioCertificate():D12RatioCertificate {
  const weekly=computeWeeklySessionQuota("703","age_group",10,"load");
  const target=SPORT_RATIO_TARGETS["703"]?.swim;
  if(!weekly||weekly.downgraded||!target ||
     ["swim","bike","run","brick"].some(s=>weekly.quota[s as "swim"|"bike"|"run"|"brick"].min!==weekly.quota[s as "swim"|"bike"|"run"|"brick"].max))
    throw new Error("D12_RATIO_INPUT_POLICY_CHANGED");
  const counts={
    swim:weekly.quota.swim.min*3,
    bike:weekly.quota.bike.min*3,
    run:weekly.quota.run.min*3,
    brick:weekly.quota.brick.min*3,
  };
  const adjusted={
    swim:counts.swim,
    bike:counts.bike+Math.round(counts.brick*.5),
    run:counts.run+Math.round(counts.brick*.5),
  };
  const total=adjusted.swim+adjusted.bike+adjusted.run;
  const pct={
    swim:Math.round(adjusted.swim/total*100),
    bike:Math.round(adjusted.bike/total*100),
    run:Math.round(adjusted.run/total*100),
  };
  if(counts.swim!==9||counts.bike!==9||counts.run!==9||counts.brick!==3||
     target[0]!==15||target[1]!==20||pct.swim!==29) throw new Error("D12_RATIO_BASELINE_DRIFT");
  return {
    status:"contradictory_native_policies",objective:"703",ambition:"age_group",
    weeksChecked:3,requiredSessions:counts,countedSessions:adjusted,
    derivedPct:pct,nativeSwimTarget:[target[0],target[1]],
    nativeCriticalTolerancePoints:8,violatesCriticalSwimThreshold:pct.swim>target[1]+8,
    independentOfWorkoutCatalogue:true,
    recommendedAction:"coach_policy_review_required",currentPolicyUnchanged:true,
  };
}
