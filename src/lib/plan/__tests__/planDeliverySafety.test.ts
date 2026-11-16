import {describe,it,expect} from 'vitest';
import {assertPlanDeliverySafe} from '../planDeliverySafety';
import type {ParsedPlan} from '@/lib/aiPlanParser';
const plan=()=>({_planStartDate:'2026-11-16',_objective:'Ironman',_raceDate:'2027-06-27',_raceGoals:[{objective:'Marathon',priority:'B',raceDate:'2027-02-21'}],
 title:'Fixture',totalWeeks:32,phases:[],weeks:[{weekNumber:14,phase:'build',theme:'Course',sessions:[{weekNumber:14,weekTheme:'Course',phase:'build',dayName:'dimanche',dayIndex:6,title:'🏁 COURSE Marathon',details:'',sport:'run',durationMin:210,isRest:false},{weekNumber:14,weekTheme:'Course',phase:'build',dayName:'dimanche',dayIndex:6,title:'Vélo',details:'',sport:'bike',durationMin:250,isRest:false}]}]} as ParsedPlan);
describe('all delivery boundaries use the full actual plan',()=>{
 it('blocks the stored marathon plus 4h10 bike even for a single-session export',()=>{
  expect(()=>assertPlanDeliverySafe(plan())).toThrow(/jour de compétition/);
 });
 it('rechecks a moved export calendar against the fixed race date',()=>{
  const p=plan();p.weeks[0].sessions.pop();
  expect(()=>assertPlanDeliverySafe(p)).not.toThrow();
  expect(()=>assertPlanDeliverySafe(p,{planStartDate:'2026-11-09'})).toThrow();
 });
 it('does not mutate stored or already sent records',()=>{
  const p=plan();const before=JSON.stringify(p);
  expect(()=>assertPlanDeliverySafe(p)).toThrow();
  expect(JSON.stringify(p)).toBe(before);
 });
});