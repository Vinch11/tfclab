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
