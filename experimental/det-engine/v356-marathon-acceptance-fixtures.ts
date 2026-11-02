import {expect} from 'vitest';
import type {runScenario} from './v332-running-long-horizon-fixture';

export const strictMarathonCaseSettings={
  fixture:'B-MARATHON' as const,goal:'Marathon' as const,
  declaredTwoSlotsPerDay:true as const,unrestrictedSports:true as const,
  wideRecoveryClock:true as const,forwardCheck:true as const,
  expandedTaperSources:true as const,approvedTaperDose:true as const,
  sourceCertifiedPeak:true as const,shortEasyTaperApproved:true as const,
  distinctSportClock:true as const,measuredRecoveryProof:true as const,
  runningQualityProof:true as const,runningQualityPriority:true as const,
  runningMatchingAudit:true as const,runningCandidatePriority:true as const,
  runningEasyMarginPriority:true as const,extendedStrictSearchBudget:true as const,
  runningQualitySlotMargin:true as const,marathonHorizonEvidence:true as const,
  marathonSpecificityReconciliation:true as const,
  measuredMarathonMesocycles:true as const,tteSourcePreferred:true as const,
  approvedBaseTteDose:true as const,
};
/** Acceptance obligations: these cases may NEVER pass through a permitted NO-GO. */
export function assertAccepted(out:ReturnType<typeof runScenario>,weeks:16|40){
  expect(out.technicallyConstructed).toBe(true);
  expect(out.constraintsSatisfied).toBe(true);
  expect(out.candidate?.weeks).toHaveLength(weeks);
  expect(out.issues.filter(i=>['critical','blocking','error'].includes(i.severity)))
    .toEqual([]);
  const issue=out.issues.find(i=>
    i.code==='det_v351_marathon_exact_source_horizon_evidence_verified');
  expect(issue).toBeDefined();
  const proof=JSON.parse(issue?.message??'{}') as {
    verified:boolean;tte:{verified:boolean;verifiedMatches:number;
      allKeySessions:number;unknownKeySessions:number;percentage:number};
  };
  expect(proof.verified).toBe(true);
  expect(proof.tte.verified).toBe(true);
  expect(proof.tte.percentage).toBeGreaterThanOrEqual(30);
  expect(proof.tte.unknownKeySessions).toBe(0);
  // Independently count the actual unchanged key flags, including easy and
  // long sessions. Never shrink the denominator to make 30% attainable.
  const keys=out.candidate!.weeks.flatMap(w=>w.sessions).filter(s=>
    !s.isRest&&s.isKeySession&&!s.title.startsWith('COURSE : '));
  expect(proof.tte.allKeySessions).toBe(keys.length);
  // Exact doses of the separately approved source variants in THIS fixture.
  const exactTteDurations:Record<string,number>={
    V3P_RUN_136:51,V3P_RUN_137:59,V3P_RUN_008:66,
    V3P_RUN_047:69,V3P_RUN_139:75,
  };
  const threshold=keys.filter(s=>s.catalogId&&
    exactTteDurations[s.catalogId]===s.durationMin);
  expect(threshold.length).toBe(proof.tte.verifiedMatches);
  expect(threshold.length/keys.length).toBeGreaterThanOrEqual(0.30);
  expect(out.sportingRelevance).toBe('not_attested');
  expect(out.humanReviewRequired).toBe(true);
}
