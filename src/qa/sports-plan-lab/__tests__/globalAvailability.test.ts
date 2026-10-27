import { planningFeasibility } from "@/lib/plan/planningFeasibility";
import { describe,it,expect } from 'vitest';
import { computeWeekQuotaEntry } from '@/engines/plan/sessionSizingMatrix';
import { buildWeeklySlotLayout } from '@/engines/plan/weeklySlotLayout';
import { isRaceDaySession } from '../../../../supabase/functions/_shared/raceDayIdentity';
describe('shared availability and event identity',()=>{
 for(const objective of ['5K','10K','Semi','Marathon','703','IM']) it(`${objective}: explicit daily capacity is never raised`,()=>{
  const entry=computeWeekQuotaEntry(objective,'age_group',0,'load',false,{maxSessionsPerDay:1})!;
  expect(entry.quota.maxSessionsPerDay).toBe(1);
  const layout=buildWeeklySlotLayout(entry.quota,entry.floors,'load',{dayBans:[{day:'mardi',sport:'any'}]});
  expect(layout.days.find(d=>d.dayName==='mardi')!.slots).toHaveLength(0);
  expect(layout.days.every(d=>d.slots.length<=1)).toBe(true);
 });
 it('keeps an impossible high-volume week blocked instead of relaxing daily capacity',()=>{
  const entry=computeWeekQuotaEntry('IM','world_class',30,'load',false,{maxSessionsPerDay:1})!;
  const layout=buildWeeklySlotLayout(entry.quota,entry.floors,'load');
  expect(planningFeasibility(entry.quota,layout)).toContain('minimum_sessions_exceed_available_capacity');
  expect(entry.quota.maxSessionsPerDay).toBe(1);
 });
 it('mental visualisation of race day is training, but an official event stays an event',()=>{
  expect(isRaceDaySession({title:'Visualisation mentale compétition',sport:'strength'})).toBe(false);
  expect(isRaceDaySession({title:'Speed endurance — 16x50m Z5 R:15. Vitesse + résistance. Départ compétition',sport:'swim'})).toBe(false);
  expect(isRaceDaySession({title:'COURSE : Ironman 70.3 Tours',sport:'brick'})).toBe(true);
 });
});

it.each(['taper','race'] as const)('does not revive a banned running discipline during %s',weekType=>{
 const entry=computeWeekQuotaEntry('703','age_group',12,weekType,false,{bannedSports:['run']})!;
 const layout=buildWeeklySlotLayout(entry.quota,entry.floors,weekType);
 expect(layout.days.flatMap(d=>d.slots).filter(s=>s.sport==='run')).toHaveLength(0);
});

it.each(['load','taper'] as const)('keeps mandatory triathlon sessions with Tuesday unavailable in %s',weekType=>{
 const entry=computeWeekQuotaEntry('703','age_group',12,weekType,false)!;
 const layout=buildWeeklySlotLayout(entry.quota,entry.floors,weekType,{dayBans:[{day:'mardi',sport:'any'}]});
 expect(planningFeasibility(entry.quota,layout)).toEqual([]);
 expect(layout.days.find(d=>d.dayName==='mardi')!.slots).toHaveLength(0);
});
it.each(['load','taper'] as const)('does not subtract a bike for an unplaced brick in %s',weekType=>{
 const entry=computeWeekQuotaEntry('703','age_group',12,weekType,false)!;
 const layout=buildWeeklySlotLayout(entry.quota,entry.floors,weekType,{dayBans:[{day:'samedi',sport:'any'},{day:'dimanche',sport:'any'}]});
 expect(planningFeasibility(entry.quota,layout)).not.toContain('layout_below_bike_minimum');
 for(const d of layout.days)if(d.slots.some(s=>s.sport==='brick'))expect(d.slots.some(s=>s.sport==='run'||s.sport==='bike')).toBe(false);
});
it('reserves the declared final running event on Sunday without a 20–30 minute activation cap',()=>{
 const entry=computeWeekQuotaEntry('10K','age_group',8,'race',false)!;
 const layout=buildWeeklySlotLayout(entry.quota,entry.floors,'race',{raceEvents:[{dayName:'dimanche',sport:'run'}]});
 const event=layout.days.find(d=>d.dayName==='dimanche')!.slots.find(s=>s.isRaceEvent);
 expect(event).toBeDefined();expect(event?.isActivation).not.toBe(true);expect(event?.maxDurationMin).toBeUndefined();
 expect(planningFeasibility(entry.quota,layout)).toEqual([]);
});

it('keeps an event-date availability conflict blocking instead of moving the event',()=>{
 const entry=computeWeekQuotaEntry('10K','age_group',8,'race',false)!;
 const layout=buildWeeklySlotLayout(entry.quota,entry.floors,'race',{raceEvents:[{dayName:'dimanche',sport:'run'}],dayBans:[{day:'dimanche',sport:'any'}]});
 expect(planningFeasibility(entry.quota,layout)).toContain('declared_event_unplaced');
 expect(layout.days.find(d=>d.dayName==='dimanche')!.slots).toEqual([]);
});
it('includes the global minimum in calendar capacity even if each sport minimum fits',()=>{
 const entry=computeWeekQuotaEntry('10K','age_group',8,'load',false,{maxSessionsPerDay:1})!;
 const quota={...entry.quota,totalSessions:{min:8,max:8}};
 const layout=buildWeeklySlotLayout(quota,entry.floors,'load');
 expect(planningFeasibility(quota,layout)).toContain('minimum_sessions_exceed_available_capacity');
});
it('recognizes that two brick days cannot also host five standalone runs in six available days',()=>{
 const entry=computeWeekQuotaEntry('703','competitor',14,'load',false,{bannedSports:['swim']})!;
 const layout=buildWeeklySlotLayout(entry.quota,entry.floors,'load',{dayBans:[{day:'mardi',sport:'any'}]});
 expect(planningFeasibility(entry.quota,layout)).toContain('minimum_sessions_exceed_available_capacity');
});
