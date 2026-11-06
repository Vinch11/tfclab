import { describe, expect, it } from 'vitest';
import { validatePlan, computePhaseLimiterFocus, computeMesocycleLimiterFocus } from '../planValidator';
import type { ParsedPlan } from '@/lib/aiPlanParser';
import { buildLimiterMesocycles } from '@/lib/plan/limiterMesocycles';
const keys=['vo2max','tte','ftp','vlamax','pmax','fatmax'];
const plan: ParsedPlan={title:'SYNTHETIC',phases:[],totalWeeks:8,weeks:Array.from({length:8},(_,i)=>({weekNumber:i+1,theme:'SYNTHETIC',phase:'build',sessions:[{weekNumber:i+1,weekTheme:'SYNTHETIC',phase:'build',dayName:'Mardi',dayIndex:1,sport:'bike',title:'Sprint all-out',details:'SYNTHETIC source text',isRest:false,isKeySession:true}]}))};
describe('native coverage does not stop at rank four',()=>{
 it('reports the fifth and sixth priorities even when they are absent',()=>{
  const result=validatePlan(plan,'Marathon',undefined,undefined,undefined,keys);
  expect(result.limiterCoverage.map(item=>item.key)).toEqual(keys);
  expect(result.limiterCoverage.find(item=>item.key==='fatmax')?.hits).toBe(0);
 });
 it('includes rank five in the derived phase focus',()=>{
  expect(computePhaseLimiterFocus(plan,keys)[0].breakdown.some(item=>item.key==='pmax'&&item.hits>0)).toBe(true);
 });
 it('compares recurring blocks with actual selected session text without asserting dose proof',()=>{
  const calendar=Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,{weekType:(i+1)%4===0?'recovery':'load',phase:'build'}]));
  const schedule=buildLimiterMesocycles(['VO2max','TTE'],calendar);
  const quotas=Object.fromEntries(Object.entries(schedule.byWeek).map(([week,limiterFocus])=>[week,{limiterFocus}])) as ParsedPlan['weeklyQuotas'];
  const focus=computeMesocycleLimiterFocus({...plan,weeklyQuotas:quotas},keys);
  expect(focus.map(item=>item.plannedFocus)).toEqual(['VO2max','TTE']);
  expect(focus.every(item=>item.doseCoverageVerified===false)).toBe(true);
  expect(focus[1].breakdown).toHaveLength(6);
  expect(focus[1].breakdown.find(item=>item.key==='tte')?.hits).toBe(0);
 });
});

import { computeMinPlanWeeksForLimiters } from '@/lib/plan/recommendedPlanDuration';
it('does not hide the fifth or sixth limiter in the duration warning either',()=>{
 const result=computeMinPlanWeeksForLimiters(['VO2max','TTE','FTP','VLamax','Économie','FatMax'].map((metric,i)=>({metric,weightedImpact:100-i,status:'limiting'})));
 expect(result?.limiterCount).toBe(6);
 expect(result?.breakdown.map(item=>item.metric)).toContain('FatMax');
});
