import {describe,expect,it} from 'vitest';
import type {WeeklyQuota} from '@/engines/plan/sessionSizingMatrix';
import {assessNativeSwimCountQuotaBound} from './v39-native-count-quota-bound';

function quota(swim:[number,number],bike:[number,number],run:[number,number],
  brick:[number,number],strength:[number,number],maxSessions:number):WeeklyQuota {
  return {swim:{min:swim[0],max:swim[1]},
    bike:{min:bike[0],max:bike[1]},run:{min:run[0],max:run[1]},
    brick:{min:brick[0],max:brick[1]},strength:{min:strength[0],max:strength[1]},
    totalSessions:{min:swim[0]+bike[0]+run[0]+brick[0]+strength[0],max:maxSessions},
    maxSessionsPerDay:3,minFullRestDays:0,
    source:{tier:'expert',ref:'V39 synthetic frequency-only bound'},
  } as WeeklyQuota;
}
describe('DET V39 — optimistic mathematical bound against native count-only sport ratio',()=>{
  it('proves swim session-count error inevitable with 4 swim and at most 3+3 other sports',()=>{
    const q=quota([4,4],[3,3],[3,3],[0,0],[0,0],10);
    const r=assessNativeSwimCountQuotaBound([{week:1,weekType:'load',quota:q}],20);
    expect(r.optimisticMinimumSwimPct).toBe(40);
    expect(r.mathematicallyCannotMeetStrictSwimTarget).toBe(true);
    expect(r.mathematicallyCannotAvoidNativeSwimBlocker).toBe(true);
  });
  it('never mistakes ample frequency headroom for validated real dose',()=>{
    const q=quota([2,2],[4,4],[4,4],[0,1],[1,1],12);
    const r=assessNativeSwimCountQuotaBound([{week:1,weekType:'load',quota:q}],20);
    expect(r.optimisticMinimumSwimPct).toBeCloseTo(2/12*100);
    expect(r.mathematicallyCannotAvoidNativeSwimBlocker).toBe(false);
    expect(r.interpretation).toBe('necessary_condition_not_a_schedule_or_dose_validation');
  });
  it('excludes race and recovery weeks rather than hiding non-load periods in the denominator',()=>{
    const load=quota([3,3],[2,2],[2,2],[1,1],[0,0],8);
    const race=quota([0,0],[0,0],[0,0],[0,0],[0,0],1);
    const r=assessNativeSwimCountQuotaBound([
      {week:1,weekType:'load',quota:load},
      {week:2,weekType:'recovery',quota:race},
      {week:3,weekType:'race',quota:race},
    ],20);
    expect(r.loadedWeeks).toEqual([1]);
    expect(r.minimumMandatorySwimSessions).toBe(3);
    expect(r.optimisticMinimumSwimPct).toBeCloseTo(100/3);
  });
  it('declares uncertainty if quotas are internally contradictory, without inventing a count',()=>{
    const bad=quota([3,3],[2,2],[2,2],[0,0],[1,1],4);
    const r=assessNativeSwimCountQuotaBound([{week:1,weekType:'load',quota:bad}],20);
    expect(r.optimisticMinimumSwimPct).toBe(null);
    expect(r.mathematicallyCannotAvoidNativeSwimBlocker).toBe(null);
  });
  it('does not falsely claim inevitability if native drops a high-swim themed load week',()=>{
    const heavySwim=quota([4,4],[3,3],[3,3],[0,0],[0,0],10);
    const lowerSwim=quota([2,2],[3,3],[3,3],[0,0],[0,0],8);
    const r=assessNativeSwimCountQuotaBound([
      {week:1,weekType:'load',quota:heavySwim},
      {week:2,weekType:'load',quota:lowerSwim},
    ],20);
    expect(r.optimisticAllLoadWeeksSwimPct).toBeCloseTo(100/3);
    expect(r.optimisticMinimumSwimPct).toBe(25);
    expect(r.mathematicallyCannotAvoidNativeSwimBlocker).toBe(false);
  });
  it('does not manufacture proof with zero eligible loading weeks',()=>{
    const q=quota([0,0],[0,0],[0,0],[0,0],[0,0],1);
    const r=assessNativeSwimCountQuotaBound([{week:1,weekType:'recovery',quota:q}],20);
    expect(r.optimisticMinimumSwimPct).toBe(null);
  });
});
