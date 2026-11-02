/**
 * Distinct synthetic coach capacities. Historical world-class fixtures remain
 * unchanged; no athlete or source approval is silently downgraded.
 */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {runScenario} from './v332-running-long-horizon-fixture';

const common={
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
it('declared TTE age-group 16w real solver',()=>{
  assertAccepted(runScenario({...common,id:'marathon-16w-age_group-tte-source-preferred',
    weeks:16,weeklyHours:7,declaredAmbition:'age_group'}),16);
},45000);
it('declared TTE age-group 40w real solver',()=>{
  assertAccepted(runScenario({...common,id:'marathon-40w-age_group-tte-source-preferred',
    weeks:40,weeklyHours:7,declaredAmbition:'age_group'}),40);
},45000);
it('declared TTE competitor 16w real solver',()=>{
  assertRecoveryRefusal(runScenario({...common,id:'marathon-16w-competitor-tte-source-preferred',
    weeks:16,weeklyHours:9,declaredAmbition:'competitor'}));
},45000);
it('declared TTE competitor 40w real solver',()=>{
  assertRecoveryRefusal(runScenario({...common,id:'marathon-40w-competitor-tte-source-preferred',
    weeks:40,weeklyHours:9,declaredAmbition:'competitor'}));
},45000);

beforeEach(()=>{vi.stubGlobal('fetch',()=>{throw Error('DET_V356_NETWORK_FORBIDDEN');});});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

/** Acceptance obligations: these cases may NEVER pass through a permitted NO-GO. */
function assertAccepted(out:ReturnType<typeof runScenario>,weeks:16|40){
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
function assertRecoveryRefusal(out:ReturnType<typeof runScenario>){
  expect(out.constraintsSatisfied).toBe(false);
  expect(out.issues.some(i=>i.code==='det_v3_recovery_safe_slot_unfillable'))
    .toBe(true);
}
