import {describe,it,expect} from 'vitest';
import {asPlanAdvisories} from '../planAdvisoryPolicy';
describe('volume, race and week findings never refuse delivery',()=>{
 it.each(['coach_load_violation','coach_volume_under_min','race_calendar_reentry_jump','race_day_unexpected','recovery_week_intensity','quota_floor_violation','complete_plan_week_coverage'])('%s becomes a warning without changing the diagnostic',rule=>{
  const source={rule,severity:'error' as const,message:'S30'};
  expect(asPlanAdvisories([source])[0]).toEqual({...source,severity:'warning'});
  expect(source.severity).toBe('error');
 });
 it('retains unrelated content and prescription errors',()=>{
  expect(asPlanAdvisories([{rule:'catalogue_prescription_incompatible',severity:'error'}])[0].severity).toBe('error');
 });
});