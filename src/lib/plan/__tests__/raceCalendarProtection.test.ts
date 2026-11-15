import {describe,it,expect} from 'vitest';
import { raceProtectionForDay, protectedRaceWeekType, raceProtectionPrompt } from '../../../../supabase/functions/_shared/raceCalendarProtection';
import { ensureIntermediateRaceDays, protectRaceCalendarSessions, runReconciler } from '../planReconciler';
import { validateRaceCalendar } from '../raceCalendarValidation';
import { buildCoachVolumeBudget } from '@/engines/plan/sessionSizingMatrix';
import { prepareGenerationContracts } from '../prepareGenerationContracts';
import type {PlanChunk,PlanSession} from '../planSchema';
const cfg={planStartDate:'2026-11-16',objective:'Ironman',raceDate:'2027-06-27',raceGoals:[{objective:'Marathon',raceDate:'2027-02-21',priority:'B',raceName:'Séville'}]};
const session=<S extends NonNullable<PlanSession['sport']> = 'run'>(day:NonNullable<PlanSession['day']>,title:string,sport:S='run' as S,durationMin=60)=>({day,title,sport,durationMin,details:'',zones:[] as string[],custom:true as const,catalogId:null,isKeySession:false});
const chunk=(week:number,sessions:ReturnType<typeof session>[]):PlanChunk=>({weeks:[{weekNumber:week,phase:'build',sessions:sessions as PlanSession[]}]});
describe('dated race protection — Manu regression',()=>{
 it('21 February 2027 is reserved on Sunday of week 14, never Saturday',()=>{
  expect(raceProtectionForDay(cfg,14,'dimanche')).toMatchObject({stage:'race',raceDate:'2027-02-21'});
  expect(raceProtectionForDay(cfg,14,'samedi')).toMatchObject({stage:'taper',daysToRace:1});
 });
 it('moves an already existing Saturday marathon and removes Sunday training',()=>{
  const chunks=[chunk(14,[session('samedi','🏁 COURSE Marathon'),session('samedi','Vélo Z2','bike',250),session('dimanche','Course longue','run',100),session('dimanche','Natation','swim',70)])];
  ensureIntermediateRaceDays(chunks,[{globalWeek:14,day:'dimanche',objectiveKey:'Marathon',label:'Séville'}],{} as never,[]);
  expect(chunks[0].weeks[0].sessions.filter(s=>s.day==='dimanche')).toHaveLength(1);
  expect(chunks[0].weeks[0].sessions.find(s=>s.title.includes('COURSE'))?.day).toBe('dimanche');
 });
 it('protects week 13 before the marathon even when the Ironman cycle says load',()=>{
  expect(protectedRaceWeekType(cfg,13,'load')).toBe('taper');
  expect(raceProtectionPrompt(cfg,13)).toContain('Facile uniquement');
 });
 it('protects ten days after marathon across weeks 15 and 16',()=>{
  expect(raceProtectionForDay(cfg,15,'lundi')).toMatchObject({stage:'recovery',restOnly:true});
  expect(raceProtectionForDay(cfg,16,'mercredi')).toMatchObject({stage:'recovery',daysToRace:-10});
  expect(raceProtectionForDay(cfg,16,'jeudi')).toBeUndefined();
 });
 it('rejects MLSS, VO2max, long rides and bricks after marathon',()=>{
  const p={weeks:[{weekNumber:15,phase:'build',sessions:[session('mardi','VO2max','bike',60),session('mercredi','MLSS','run',60),session('jeudi','Brick','brick',200),session('samedi','Vélo long','bike',240)].map(s=>({...s,isRest:false,dayName:s.day}))}]};
  expect(validateRaceCalendar(p,cfg).filter(i=>i.rule==='race_calendar_recovery_unsafe')).toHaveLength(4);
 });
 it('recovery repair removes brick and strength, without inventing an easy prescription',()=>{
  const chunks=[chunk(15,[session('lundi','Course','run',45),session('jeudi','Brick','brick',200),session('vendredi','Force','strength',45)])];
  protectRaceCalendarSessions(chunks,cfg,[]);
  expect(chunks[0].weeks[0].sessions.every(s=>s.sport==='rest')).toBe(true);
 });
 it('applies identical protection in a local generation window',()=>{
  expect(raceProtectionForDay({...cfg,globalWeekOffset:14},1,'mercredi')).toEqual(raceProtectionForDay(cfg,15,'mercredi'));
 });
 it('does not reclassify the end of an early generation window as final taper',()=>{
  const chunks:PlanChunk[]=[{weeks:[1,2,3,4,5].map(weekNumber=>({weekNumber,phase:'base',sessions:[{...session('lundi','Repos','rest',0),durationMin:0 as const}]}))}];
  runReconciler(chunks,{},0,undefined,{objectiveKey:'IM',globalTotalWeeks:32,globalWeekOffset:0});
  expect(chunks[0].weeks.map(w=>w.phase)).toEqual(['base','base','base','base','base']);
 });
 it('detects a wrong-day event independently of the repair',()=>{
  const p={weeks:[{weekNumber:14,phase:'build',sessions:[{...session('samedi','🏁 COURSE Marathon'),isRest:false,dayName:'Samedi'}]}]};
  expect(validateRaceCalendar(p,cfg).some(i=>i.rule==='race_calendar_wrong_day')).toBe(true);
 });
 it('keeps Ironman taper volume at 72.5 then 55 percent of one reference',()=>{
  const ramp={week1HoursMax:12,weeklyHoursTarget:18,week1PctTarget:.8,rampWeeks:2,weeklyIncreasePctMax:.1};
  const shape={totalWeeks:32,objective:'IM'};
  const ref=buildCoachVolumeBudget(ramp,29,'load','coach',shape)?.targetMinutes ?? 0;
  expect(buildCoachVolumeBudget(ramp,30,'taper','coach',shape)?.targetMinutes).toBe(Math.round(ref*.725/5)*5);
  expect(buildCoachVolumeBudget(ramp,31,'taper','coach',shape)?.targetMinutes).toBe(Math.round(ref*.55/5)*5);
  expect(buildCoachVolumeBudget(ramp,13,'taper','coach',shape)).toBeUndefined();
 });
 it('transports protected dates into real preparation without brick/strength or long-session floors',()=>{
  const p=prepareGenerationContracts({age:45,ftp:220,vma:14,vo2max:50,vlamax:.4} as never,
    {...cfg,weeksAvailable:32,fondationDurationWeeks:6,ambition:'competitor',weeklyHours:18,deloadCadenceWeeks:4,
      volumeRamp:{week1HoursMax:12,weeklyHoursTarget:18,week1PctTarget:.8,rampWeeks:2,weeklyIncreasePctMax:.1}} as never);
  expect(p.weeklyQuotas[13].weekType).toBe('taper');
  expect(p.weeklyQuotas[14].raceProtection).toContain('2027-02-21');
  expect(p.weeklyQuotas[15].weekType).toBe('recovery');
  expect(p.weeklyQuotas[15].quota.brick).toEqual({min:0,max:0});
  expect(p.weeklyQuotas[15].quota.strength).toEqual({min:0,max:0});
  expect(p.weeklyQuotas[15].floors.longRunWeekly).toBe(false);
  expect(p.weeklyQuotas[15].volumeBudget).toBeUndefined();
  expect(p.weeklyQuotas[15].layout?.days.find(d=>d.dayName==='lundi')?.slots).toHaveLength(0);
  expect(p.weeklyQuotas[32].layout?.days.find(d=>d.dayName==='dimanche')?.slots.some(s=>s.isRaceEvent)).toBe(true);
 });
 it.each(['5K','10K','Semi','Marathon','703','Ironman'])('respects %s sport-specific protection without imposing a marathon window',objective=>{
  const c={planStartDate:'2027-02-15',objective,raceDate:'2027-02-21'};
  expect(raceProtectionForDay(c,1,'dimanche')?.stage).toBe('race');
  expect(raceProtectionForDay(c,2,'lundi')?.stage).toBe('recovery');
 });
 it('does not borrow marathon recovery for trail or LCW',()=>{
  expect(raceProtectionForDay({planStartDate:'2027-02-15',objective:'Trail ultra',raceDate:'2027-02-21'},2,'mardi')).toBeUndefined();
  expect(raceProtectionForDay({planStartDate:'2027-02-15',objective:'IM',raceDate:'2027-02-21',raceFormat:'lcw_3day'},1,'dimanche')).toBeUndefined();
 });
});