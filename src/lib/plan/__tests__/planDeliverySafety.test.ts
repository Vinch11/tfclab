import {describe,it,expect,vi} from 'vitest';
import {toast} from 'sonner';
import {assertPlanDeliverySafe} from '../planDeliverySafety';
import type {ParsedPlan} from '@/lib/aiPlanParser';
const plan=()=>({_planStartDate:'2026-11-16',_objective:'Ironman',_raceDate:'2027-06-27',_raceGoals:[{objective:'Marathon',priority:'B',raceDate:'2027-02-21'}],
 title:'Fixture',totalWeeks:32,phases:[],weeks:[{weekNumber:14,phase:'build',theme:'Course',sessions:[{weekNumber:14,weekTheme:'Course',phase:'build',dayName:'dimanche',dayIndex:6,title:'🏁 COURSE Marathon',details:'',sport:'run',durationMin:210,isRest:false},{weekNumber:14,weekTheme:'Course',phase:'build',dayName:'dimanche',dayIndex:6,title:'Vélo',details:'',sport:'bike',durationMin:250,isRest:false}]}]} as ParsedPlan);
describe('all delivery boundaries use the full actual plan',()=>{
 it('reports the S30 Ironman taper warning without refusing or changing the plan',()=>{
  const p=plan();
  p.weeks=[{...p.weeks[0],weekNumber:30,phase:'taper',sessions:[{...p.weeks[0].sessions[1],weekNumber:30,dayName:'jeudi',dayIndex:3,durationMin:75}]}];
  const before=JSON.stringify(p);
  const notify=vi.spyOn(toast,'warning');
  const issues=assertPlanDeliverySafe(p);
  expect(issues.filter(i=>i.rule==='race_calendar_taper_long_missing')).toHaveLength(2);
  expect(issues.find(i=>i.message.includes('vélo (120–150 min)'))?.severity).toBe('warning');
  expect(notify).toHaveBeenCalled();
  expect(JSON.stringify(p)).toBe(before);
  notify.mockRestore();
 });
 it.each(['5K','10K','Semi','Marathon','Trail','703','Ironman'])('%s permits S5 915 min at delivery when progression caps its nominal 950 min minimum',objective=>{
  const budget=(globalWeek:number)=>({globalWeek,maxMinutes:2000,weeklyIncreasePctMax:.1,referenceSource:'coach' as const});
  const p={_objective:objective,title:'Volume fixture',totalWeeks:5,phases:[],weeks:[3,4,5].map((weekNumber,i)=>({weekNumber,sessions:[{sport:'bike',durationMin:[835,580,915][i],title:'Endurance',details:'',isRest:false}]})),weeklyQuotas:{3:{weekType:'load',volumeBudget:budget(3)},4:{weekType:'recovery',volumeBudget:budget(4)},5:{weekType:'load',volumeBudget:{...budget(5),minMinutes:950,targetMinutes:1030}}}} as unknown as ParsedPlan;
  const before=JSON.stringify(p);
  expect(()=>assertPlanDeliverySafe(p)).not.toThrow();
  // Below the minimum: warning only, never a refusal (coach decision 2026-11-16).
  p.weeks[2].sessions[0].durationMin=700;
  expect(()=>assertPlanDeliverySafe(p)).not.toThrow();
  // Large overload is reported as a warning, never a refusal (coach decision 2026-11-16).
  p.weeks[2].sessions[0].durationMin=1020;
  expect(()=>assertPlanDeliverySafe(p)).not.toThrow();
  expect(assertPlanDeliverySafe(p).map(i=>i.message).join()).toMatch(/918 min/);
  p.weeks[2].sessions[0].durationMin=915;
  expect(JSON.stringify(p)).toBe(before);
 });
 it('warns, without refusing, about the marathon plus 4h10 bike even for a single-session export',()=>{
  expect(()=>assertPlanDeliverySafe(plan())).not.toThrow();
  expect(assertPlanDeliverySafe(plan()).map(i=>i.message).join()).toMatch(/jour de compétition/);
 });
 it('rechecks a moved export calendar against the fixed race date',()=>{
  const p=plan();p.weeks[0].sessions.pop();
  p.weeks.push({weekNumber:15,phase:'build',theme:'Récupération',sessions:[{weekNumber:15,weekTheme:'Récupération',phase:'build',dayName:'lundi',dayIndex:0,title:'Repos',details:'',sport:'rest',durationMin:0,isRest:true}]} as never);
  expect(()=>assertPlanDeliverySafe(p)).not.toThrow();
  expect(assertPlanDeliverySafe(p,{planStartDate:'2026-11-09'}).map(i=>i.message).join()).toMatch(/2027-02-21/);
 });
 it('does not mutate stored or already sent records',()=>{
  const p=plan();const before=JSON.stringify(p);
  expect(assertPlanDeliverySafe(p).length).toBeGreaterThan(0);
  expect(JSON.stringify(p)).toBe(before);
 });
});