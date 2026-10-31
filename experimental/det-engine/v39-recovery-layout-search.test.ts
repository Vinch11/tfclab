import {describe,expect,it} from 'vitest';
import {improveCalendarRecoveryByExistingSlotSwaps,type RepairWeek} from './v39-recovery-layout-search';
import type {WeeklyQuota} from '@/engines/plan/sessionSizingMatrix';
import type {WeeklySlotLayout,DayName,LayoutSport} from '@/engines/plan/weeklySlotLayout';
const days:DayName[]=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const quota:WeeklyQuota={
  swim:{min:1,max:1},bike:{min:0,max:0},run:{min:2,max:2},
  brick:{min:0,max:0},strength:{min:0,max:0},totalSessions:{min:3,max:3},
  maxSessionsPerDay:2,minFullRestDays:1,source:{tier:'practitioner_literature',ref:'synthetic-only'},
};
function layout():WeeklySlotLayout{
  return {weekType:'load',targetsBySport:{swim:1,bike:0,run:2,brick:0,strength:0},
    days:days.map((dayName,i)=>({dayName,isRest:i===0,
      slots:i===1||i===3?[{sport:'run' as LayoutSport}]:
        i===5?[{sport:'swim' as LayoutSport}]:[],
    }))};
}
const recover=()=>[{sourceId:'V3P_RUN_008',sport:'run',hours:48}];
describe('V3.9 — recovery day-swaps preserve mandatory training calendar',()=>{
  it('moves an existing run slot rather than shortening source recovery or inventing a workout',()=>{
    const w:RepairWeek={week:1,layout:layout(),quota,reviewedIds:[{id:'V3P_RUN_008',sport:'run'}]};
    const before=w.layout.days.flatMap(d=>d.slots.map(s=>s.sport)).sort();
    const repaired=improveCalendarRecoveryByExistingSlotSwaps([w],recover,[],2);
    expect(repaired.remainingMissing).toBe(0);
    expect(repaired.swaps.length).toBeGreaterThan(0);
    expect(w.layout.days.flatMap(d=>d.slots.map(s=>s.sport)).sort()).toEqual(before);
    expect(w.layout.days[0].isRest).toBe(true);
    expect(w.layout.days[0].slots).toHaveLength(0);
  });
  it('refuses a swap that would put a session onto a banned coach day',()=>{
    const w:RepairWeek={week:1,layout:layout(),quota,reviewedIds:[{id:'V3P_RUN_008',sport:'run'}]};
    const bans=[{day:'vendredi',sport:'any'},{day:'samedi',sport:'run'},{day:'dimanche',sport:'run'}];
    const repaired=improveCalendarRecoveryByExistingSlotSwaps([w],recover,bans,2);
    expect(repaired.remainingMissing).toBeGreaterThan(0);
    expect(w.layout.days[5].slots.some(s=>s.sport==='run')).toBe(false);
  });
});
