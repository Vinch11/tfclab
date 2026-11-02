/**
 * Distinct synthetic coach capacities. Historical world-class fixtures remain
 * unchanged; no athlete or source approval is silently downgraded.
 */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {runScenario} from './v332-running-long-horizon-fixture';
import {strictMarathonCaseSettings as common,assertAccepted} from './v356-marathon-acceptance-fixtures';


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

function assertRecoveryRefusal(out:ReturnType<typeof runScenario>){
  expect(out.constraintsSatisfied).toBe(false);
  expect(out.issues.some(i=>i.code==='det_v3_recovery_safe_slot_unfillable'))
    .toBe(true);
}
