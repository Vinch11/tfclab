import {describe,expect,it} from 'vitest';
import type {WeeklyQuota} from '@/engines/plan/sessionSizingMatrix';
import type {WeeklySlotLayout} from '@/engines/plan/weeklySlotLayout';
import {projectCoachReviewedSlotPlacement,slotPlacementSnapshot,type CoachReviewedSlotPlacement}
  from './v357-coach-reviewed-slot-placement';

const days=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'] as const;
const zero=()=>({min:0,max:0});
const quota:WeeklyQuota={swim:zero(),bike:zero(),brick:zero(),run:{min:2,max:2},
  strength:{min:1,max:1},totalSessions:{min:3,max:3},minFullRestDays:1,
  maxSessionsPerDay:2,source:{tier:'peer_reviewed',ref:'synthetic V357 test'}};
function original():WeeklySlotLayout {
  const layout:WeeklySlotLayout={weekType:'load',
    targetsBySport:{swim:0,bike:0,run:2,brick:0,strength:1},
    days:days.map(dayName=>({dayName,isRest:dayName==='lundi',slots:[]}))};
  layout.days[1].slots.push({sport:'strength'});
  layout.days[2].slots.push({sport:'run',isKeySession:true,minDurationMin:20});
  layout.days[6].slots.push({sport:'run',isLongSession:true,isKeySession:true,
    minDurationMin:80});
  return layout;
}
function reviewFor(layout:WeeklySlotLayout):CoachReviewedSlotPlacement {
  return {provenance:'coach_confirmed_slot_placement',athleteContextId:'synthetic-A',
    week:1,originalLayoutSnapshot:slotPlacementSnapshot(layout),fullRestDayIndices:[1,2,4,5],
    assignments:layout.days.flatMap((d,fromDayIndex)=>d.slots.map((s,fromSlotIndex)=>({
      fromDayIndex,fromSlotIndex,
      toDayIndex:s.isLongSession||s.isRaceEvent?fromDayIndex:s.sport==='strength'?3:0,
    })))};
}
function project(layout=original(),patch:Partial<CoachReviewedSlotPlacement>={},
  extra:Partial<Parameters<typeof projectCoachReviewedSlotPlacement>[0]>={}){
  return projectCoachReviewedSlotPlacement({layout,quota,week:1,
    expectedAthleteContextId:'synthetic-A',review:{...reviewFor(layout),...patch},
    dayBans:[],...extra});
}
describe('V357 placement — approval never weakens original slot obligations',()=>{
  it('copies every slot and key/duration flag, preserving input immutability',()=>{
    const layout=original(),before=structuredClone(layout),out=project(layout);
    expect(out.verified).toBe(true);
    expect(out.movedSlots).toBe(2);
    expect(layout).toEqual(before);
    const signature=(l:WeeklySlotLayout)=>l.days.flatMap(d=>d.slots)
      .map(s=>JSON.stringify(s)).sort();
    expect(signature(out.layout!)).toEqual(signature(before));
    expect(out.layout?.days[0].slots[0].isKeySession).toBe(true);
    expect(out.layout?.days[6].slots[0].isLongSession).toBe(true);
  });
  it('fails closed without a separate placement approval',()=>{
    expect(project(original(),{},{review:null}).verified).toBe(false);
  });
  it.each([
    {athleteContextId:'synthetic-B'},{week:2},{originalLayoutSnapshot:'stale'},
  ])('rejects another athlete, week or stale original snapshot: %j',patch=>{
    expect(project(original(),patch).verified).toBe(false);
  });
  it('rejects deleting or duplicating any original slot',()=>{
    const layout=original(),r=reviewFor(layout);
    expect(project(layout,{assignments:r.assignments.slice(1)}).verified).toBe(false);
    expect(project(layout,{assignments:[r.assignments[0],r.assignments[0],
      r.assignments[2]]}).verified).toBe(false);
  });
  it('rejects an invalid destination or a full-rest destination',()=>{
    const layout=original(),r=reviewFor(layout);
    expect(project(layout,{assignments:r.assignments.map((a,i)=>
      i===0?{...a,toDayIndex:7}:a)}).verified).toBe(false);
    expect(project(layout,{fullRestDayIndices:[0]}).verified).toBe(false);
  });
  it('keeps long and official-race anchors on their original day',()=>{
    const layout=original(),r=reviewFor(layout);
    expect(project(layout,{assignments:r.assignments.map(a=>
      a.fromDayIndex===6?{...a,toDayIndex:5}:a)}).verified).toBe(false);
    layout.days[2].slots[0].isRaceEvent=true;
    const race=reviewFor(layout);
    expect(project(layout,{assignments:race.assignments.map(a=>
      a.fromDayIndex===2?{...a,toDayIndex:0}:a)}).verified).toBe(false);
  });
  it('preserves coach day bans and native daily capacity',()=>{
    expect(project(original(),{},{dayBans:[{day:'lundi',sport:'run'}]}).verified)
      .toBe(false);
    const layout=original(),r=reviewFor(layout);
    expect(project(layout,{assignments:r.assignments.map(a=>
      a.fromDayIndex===1?{...a,toDayIndex:0}:a)},
      {quota:{...quota,maxSessionsPerDay:1}}).verified).toBe(false);
  });
  it('never fixes a native frequency deficit by reducing the quota',()=>{
    expect(project(original(),{},{quota:{...quota,run:{min:3,max:3},
      totalSessions:{min:4,max:4}}}).verified).toBe(false);
  });
  it('never trades away a real full-rest day',()=>{
    const layout=original();
    layout.days[1].slots.push(layout.days[2].slots.pop()!);
    expect(project(layout).refusals).toContain('coach_slot_placement_reduces_full_rest_days');
  });
  it.each(['swim','bike','strength','brick'] as const)(
    'preserves the same obligations for a %s slot',sport=>{
      const layout=original();
      layout.days[2].slots=[];
      layout.days[1].slots=[{sport,isKeySession:true}];
      layout.targetsBySport={swim:0,bike:0,run:1,brick:0,strength:0,[sport]:1};
      const q={...quota,run:{min:1,max:1},strength:zero(),[sport]:{min:1,max:1},
        ...(sport==='brick'?{bike:{min:1,max:1}}:{}),
        totalSessions:{min:sport==='brick'?3:2,max:sport==='brick'?3:2}};
      const r=reviewFor(layout);
      const out=project(layout,{...r,fullRestDayIndices:[1,2,4,5]},
        {quota:q});
      expect(out.verified).toBe(true);
      expect(out.layout!.days.flatMap(d=>d.slots).filter(s=>s.sport===sport))
        .toEqual([{sport,isKeySession:true}]);
    });
});
