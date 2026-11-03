/**
 * A separately approved weekly placement and confirmed clock declaration.
 * Original V356 competitor schedules remain mandatory safety refusals.
 */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {runScenario} from './v332-running-long-horizon-fixture';
import {strictMarathonCaseSettings as common,assertAccepted} from './v356-marathon-acceptance-fixtures';

beforeEach(()=>{vi.stubGlobal('fetch',()=>{throw Error('DET_V357_NETWORK_FORBIDDEN');});});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

function reviewed(weeks:16|40){
  const out=runScenario({...common,
    id:'marathon-'+weeks+'w-competitor-reviewed-placement-tte-source-preferred',
    weeks,weeklyHours:9,declaredAmbition:'competitor',
    reviewedCompetitorPlacement:true,
  });
  assertAccepted(out,weeks);
  const placement=out.issues.filter(i=>
    i.code==='det_v357_coach_reviewed_placement_mechanics_verified');
  expect(placement).toHaveLength(weeks);
  expect(placement.every(i=>JSON.parse(i.message??'{}').keySlotsPreserved===true))
    .toBe(true);
  for(const week of out.candidate!.weeks){
    const sessions=week.sessions.filter(s=>!s.isRest&&!s.title.startsWith('COURSE : '));
    const type=out.candidate!.weeklyQuotas?.[week.weekNumber]?.weekType;
    if(type==='load'){
      expect(sessions.filter(s=>s.sport==='run')).toHaveLength(5);
      expect(sessions.filter(s=>s.sport==='strength')).toHaveLength(2);
      expect(sessions.filter(s=>s.isKeySession&&s.sport==='run')).toHaveLength(5);
    }
  }
}
it('reviewed competitor 16w strict acceptance and unchanged key counts',()=>reviewed(16),45000);
it('reviewed competitor 40w strict acceptance and unchanged key counts',()=>reviewed(40),45000);
