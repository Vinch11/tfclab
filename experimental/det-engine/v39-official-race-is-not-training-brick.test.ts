/** Official 70.3 race-day booking cannot be silently treated as a V3 brick workout.
 * An event's physical slot still uses real day capacity and rest-day checks.
 */
import {describe,expect,it} from 'vitest';
import {planningFeasibility,type MechanicalLayout,type MechanicalQuota} from '../../supabase/functions/_shared/planningFeasibility';

const quota:MechanicalQuota={
  swim:{min:2,max:2},bike:{min:2,max:2},run:{min:2,max:2},
  brick:{min:0,max:0},strength:{min:1,max:1},
  totalSessions:{min:7,max:8},maxSessionsPerDay:2,minFullRestDays:1,
};
const layout:MechanicalLayout={
  officialRaceOutsideTrainingQuota:true,
  requiredEvents:[{dayName:'dimanche',sport:'brick'}],
  days:[
    {dayName:'lundi',isRest:true,slots:[]},
    {dayName:'mardi',isRest:false,slots:[{sport:'swim'},{sport:'bike'}]},
    {dayName:'mercredi',isRest:false,slots:[{sport:'run'},{sport:'strength'}]},
    {dayName:'jeudi',isRest:false,slots:[{sport:'swim'}]},
    {dayName:'vendredi',isRest:false,slots:[{sport:'bike'}]},
    {dayName:'samedi',isRest:false,slots:[{sport:'run'}]},
    {dayName:'dimanche',isRest:false,slots:[{sport:'brick',isRaceEvent:true}]},
  ],
};
describe('DET V39 — official triathlon event is not a training brick',()=>{
  it('reserves exactly one declared Sunday race with training brick max=0',()=>{
    expect(planningFeasibility(quota,layout)).toEqual([]);
    expect(layout.days.flatMap(d=>d.slots).filter(s=>s.sport==='brick'&&!s.isRaceEvent)).toEqual([]);
  });
  it('still refuses an ADDITIONAL unreviewed training brick',()=>{
    const extra:MechanicalLayout={...layout,days:layout.days.map(d=>d.dayName==='jeudi'?
      {...d,slots:[...d.slots,{sport:'brick'}]}:d)};
    expect(planningFeasibility(quota,extra)).toContain('layout_exceeds_brick_maximum');
  });
  it('refuses a missing or undeclared official event',()=>{
    const missing:MechanicalLayout={...layout,days:layout.days.map(d=>d.dayName==='dimanche'?{...d,slots:[]}:d)};
    expect(planningFeasibility(quota,missing)).toContain('declared_event_unplaced');
    const undeclared:MechanicalLayout={...layout,requiredEvents:[]};
    expect(planningFeasibility(quota,undeclared)).toContain('undeclared_race_event_slot');
  });
  it('does not exempt the competition from physical day and rest capacity',()=>{
    const overloaded:MechanicalLayout={...layout,days:layout.days.map(d=>d.dayName==='dimanche'?
      {...d,slots:[...d.slots,{sport:'swim'},{sport:'strength'}]}:d)};
    expect(planningFeasibility(quota,overloaded)).toContain('layout_exceeds_daily_max');
    const noRest:MechanicalLayout={...layout,days:layout.days.map(d=>d.dayName==='lundi'?
      {...d,isRest:false,slots:[{sport:'run'}]}:d)};
    expect(planningFeasibility(quota,noRest)).toContain('layout_below_full_rest_minimum');
  });
});
