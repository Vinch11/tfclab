/**
 * D1.10 — mathematical feasibility for the 70.3 *time* distribution hypothesis.
 * NO production policy change, NO athlete prescription.
 *
 * A V1 brick with unknown bike/run/transition partition is modeled as a
 * nonnegative allocation of its known total, not a fabricated 50/50 split.
 * Feasibility of ALL THREE target bands is tested jointly, not by checking
 * three independently optimistic marginal intervals.
 */
import { SPORT_RATIO_TARGETS } from "@/engines/plan/planValidator";
import {
  auditD14DurationRatios,
  type D14RatioEvidence,
  type D14RatioSession,
} from "./d14RatioEvidence";
import { D12_PROFILES, projectD12Profile } from "./d12Projection";
import type { D12Profile } from "./d12CohortAudit";
import { attachD110SourceBrickProof } from "./d110V1BrickSourceProof";

type Sport = "swim" | "bike" | "run";
export type D110Band = [number, number];
export type D110Targets = Record<Sport, D110Band>;
export type D110Status =
  | "inconclusive_missing_time"
  | "incompatible_for_any_brick_allocation"
  | "potentially_compatible_unverified_brick"
  | "fully_accounted_inside_bands"
  | "fully_accounted_outside_bands";
export interface D110Decision {
  status: D110Status;
  comparisonOnly: true;
  policyActivated: false;
  canCertifyPlan: false;
  tolerancePoints: number;
  targets: D110Targets;
  percentageBounds: { swim: D110Band | null; bike: D110Band | null; run: D110Band | null };
  /** A positive conclusion is deliberately NOT possible with unallocated bricks. */
  jointlyFeasible: boolean | null;
  provableOutOfBandSports: Sport[];
  /** Marginal lower allocation requirements: they do not endorse training volume. */
  minimumUnknownAllocationSec: { bike: number | null; run: number | null };
  denominatorSec: number | null;
  unknownBrickSec: number;
  evidenceReasons: D14RatioEvidence["reasonCodes"];
}
export const D110_703_TARGETS: D110Targets = (() => {
  const input = SPORT_RATIO_TARGETS["703"];
  if (!input?.swim || !input.bike || !input.run) throw new Error("D110_NATIVE_703_TARGETS_MISSING");
  return { swim: [...input.swim] as D110Band,
    bike: [...input.bike] as D110Band,
    run: [...input.run] as D110Band };
})();
const roundOne = (v: number): number => Math.round(v * 10) / 10;
const pct = (sec: number, total: number) => roundOne(100 * sec / total);
const within = (n: number, low: number, high: number) => n >= low - 1e-9 && n <= high + 1e-9;
const extend = (b: D110Band, tolerance: number): D110Band =>
  [Math.max(0,b[0]-tolerance),Math.min(100,b[1]+tolerance)];
/** Accept any finite nonnegative arbitrary test tolerance, never mutate the production rule. */
export function examineD110TimeRatio(
  sessions: readonly D14RatioSession[],
  tolerancePoints = 0,
  targets: D110Targets = D110_703_TARGETS,
): D110Decision {
  if (!Number.isFinite(tolerancePoints) || tolerancePoints < 0 || tolerancePoints > 100)
    throw new Error("D110_INVALID_TOLERANCE");
  const bands: D110Targets = {
    swim: extend(targets.swim,tolerancePoints),
    bike: extend(targets.bike,tolerancePoints),
    run: extend(targets.run,tolerancePoints),
  };
  const evidence = auditD14DurationRatios(sessions);
  const total = evidence.enduranceSeconds;
  const empty: D110Decision = {
    status:"inconclusive_missing_time", comparisonOnly:true, policyActivated:false,
    canCertifyPlan:false, tolerancePoints, targets:bands,
    percentageBounds:{swim:null,bike:null,run:null}, jointlyFeasible:null,
    provableOutOfBandSports:[],
    minimumUnknownAllocationSec:{bike:null,run:null},
    denominatorSec:total,unknownBrickSec:evidence.countedSeconds.brickUnattributed,
    evidenceReasons:evidence.reasonCodes,
  };
  if(total===null || total<=0) return empty;
  const {swim,bike,run,brickUnattributed:unknown} = evidence.countedSeconds;
  const fixedSwim = pct(swim,total);
  const marginal = {
    swim:[fixedSwim,fixedSwim] as D110Band,
    bike:[pct(bike,total),pct(bike+unknown,total)] as D110Band,
    run:[pct(run,total),pct(run+unknown,total)] as D110Band,
  };
  const outside = (Object.keys(bands) as Sport[]).filter(s =>
    // Unrounded seconds, not display rounding, decide mathematical feasibility.
    (s==="swim" ? swim : s==="bike" ? bike : run)/total * 100 > bands[s][1] + 1e-9 ||
    (s==="swim" ? swim : s==="bike" ? bike+unknown : run+unknown)/total * 100 < bands[s][0] - 1e-9
  );
  const minBike=Math.max(0,total*bands.bike[0]/100-bike);
  const maxBike=Math.min(unknown,total*bands.bike[1]/100-bike);
  const minRun=Math.max(0,total*bands.run[0]/100-run);
  const maxRun=Math.min(unknown,total*bands.run[1]/100-run);
  const swimOK=within(swim/total*100,...bands.swim);
  // Jointly feasible iff unknown components can be allocated to bike and run
  // meeting both ranges simultaneously. Any residual is unclassified
  // transition, so this is deliberately an optimistic upper bound.
  const jointlyFeasible=swimOK &&
    maxBike>=minBike-1e-9 && maxRun>=minRun-1e-9 &&
    minBike+minRun<=unknown+1e-9;
  const fullyKnown=unknown===0 && evidence.status==="observed_complete";
  return {
    ...empty,
    status:!jointlyFeasible
      ? (fullyKnown?"fully_accounted_outside_bands":"incompatible_for_any_brick_allocation")
      : fullyKnown?"fully_accounted_inside_bands":"potentially_compatible_unverified_brick",
    percentageBounds:marginal,
    jointlyFeasible,
    provableOutOfBandSports:outside,
    minimumUnknownAllocationSec:{bike:roundOne(minBike),run:roundOne(minRun)},
  };
}
export interface D110CohortEvidence {
  profile:D12Profile;
  weeksConsidered:[1,2,3];
  nativeCriticalCount:number;
  nominal:D110Decision;
  withNativeThreePointToleranceAsHypothesis:D110Decision;
  withNativeEightPointCriticalMarginAsHypothesis:D110Decision;
  stillRequiresPolicyArbitration:true;
  sportApproved:false;
  /** Uniquely deduced planned components if the real Stage1 fiche remains unchanged. */
  sourceStage1:{status:"verified_planned_components"|"not_verified";count:number;reasons:string[]};
  sourceConditionedNominal:D110Decision|null;
  sourceConditionedPlus3:D110Decision|null;
}
export function examineD110ThreeProfiles():D110CohortEvidence[] {
  return D12_PROFILES.map(profile=>{
    const plan=projectD12Profile(profile);
    if(plan.status!=="candidate" || plan.weeksConstructed!==4)
      throw new Error("D110_D1_REFERENCE_UNAVAILABLE");
    const selected=plan.weeklyPreview.filter(w=>[1,2,3].includes(w.week))
      .flatMap(w=>w.sessions);
    const sessions=selected.map(s=>({sport:s.sport,durationMin:s.minutes}));
    const sourceProof=attachD110SourceBrickProof(selected.map(s=>({sport:s.sport,id:s.id,minutes:s.minutes})));
    return {
      profile,weeksConsidered:[1,2,3] as [1,2,3],
      nativeCriticalCount:plan.countCritical,
      nominal:examineD110TimeRatio(sessions),
      withNativeThreePointToleranceAsHypothesis:examineD110TimeRatio(sessions,3),
      withNativeEightPointCriticalMarginAsHypothesis:examineD110TimeRatio(sessions,8),
      sourceStage1:sourceProof.ok
        ? {status:"verified_planned_components" as const,count:sourceProof.count,reasons:[]}
        : {status:"not_verified" as const,count:0,reasons:sourceProof.reasons},
      sourceConditionedNominal:sourceProof.ok?examineD110TimeRatio(sourceProof.sessions):null,
      sourceConditionedPlus3:sourceProof.ok?examineD110TimeRatio(sourceProof.sessions,3):null,
      stillRequiresPolicyArbitration:true as const,sportApproved:false as const,
    };
  });
}
