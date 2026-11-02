/**
 * Distinct synthetic coach capacities. Historical world-class fixtures remain
 * unchanged; no athlete or source approval is silently downgraded.
 */
import {afterEach,beforeEach,it,vi} from 'vitest';
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
  runScenario({...common,id:'marathon-16w-age_group-tte-source-preferred',
    weeks:16,weeklyHours:7,declaredAmbition:'age_group'});
},45000);
it('declared TTE age-group 40w real solver',()=>{
  runScenario({...common,id:'marathon-40w-age_group-tte-source-preferred',
    weeks:40,weeklyHours:7,declaredAmbition:'age_group'});
},45000);
it('declared TTE competitor 16w real solver',()=>{
  runScenario({...common,id:'marathon-16w-competitor-tte-source-preferred',
    weeks:16,weeklyHours:9,declaredAmbition:'competitor'});
},45000);
it('declared TTE competitor 40w real solver',()=>{
  runScenario({...common,id:'marathon-40w-competitor-tte-source-preferred',
    weeks:40,weeklyHours:9,declaredAmbition:'competitor'});
},45000);

beforeEach(()=>{vi.stubGlobal('fetch',()=>{throw Error('DET_V356_NETWORK_FORBIDDEN');});});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
