import {it,expect} from 'vitest';
import {marathonReentryBudget} from '../marathonReentryBudget';
const config={planStartDate:'2026-11-16',objective:'Ironman',raceDate:'2027-06-27',raceGoals:[{objective:'Marathon',raceDate:'2027-02-21',priority:'B'}]};
it('caps S15 S16 S17 from the same pre-marathon 950-minute reference without forced minima',()=>{
 expect([15,16,17].map(w=>marathonReentryBudget(config,w,950,undefined)?.maxMinutes)).toEqual([427,665,855]);
 expect(marathonReentryBudget(config,17,950,undefined)?.minMinutes).toBeUndefined();
});
it('does not reset the recovery envelope in a new generation window',()=>{
 expect(marathonReentryBudget({...config,globalWeekOffset:14},3,950,undefined)?.maxMinutes).toBe(855);
});
it('does not invent a recovery volume when the reference is missing',()=>{
 expect(marathonReentryBudget(config,17,undefined,undefined)).toBeUndefined();
});
it('does not borrow a continuous marathon budget for a multi-day event',()=>{
 expect(marathonReentryBudget({...config,raceGoals:[{objective:'Marathon',raceDate:'2027-02-21',raceFormat:'lcw_3day'}]},17,950,undefined)).toBeUndefined();
});