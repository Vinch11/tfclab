import {it,expect} from 'vitest';
import {mergeWindowEvidence,contractWindowLabel} from '../contractScope';
import type {PlanPrevalidation} from '../../../../supabase/functions/_shared/planPrevalidation';
const report=(count:number):PlanPrevalidation=>({status:'coach_review',issues:[{week:1,code:'coach_initial_load_unverified',severity:'warning'}],weeks:Array.from({length:count},(_,i)=>({week:i+1,globalWeek:i+1,availability:[],requiredIntentions:[],eligible:[],excluded:[],limitedDiversitySports:[],missingSports:[],minimumStructuredMinutes:0,minimumCatalogueMinutes:0}))});
it('keeps 33 global contracts when the first 15 week window is assessed',()=>{
 const global=report(33);const result=mergeWindowEvidence(global,{from:1,to:15,objective:'Marathon',report:report(15)});
 expect(result.weeks.length).toBe(33);expect(result.weeks).toBe(global.weeks);expect(result.issues).toEqual(global.issues);
});
it('late window blocking evidence retains global load warning and maps S2 to S17',()=>{
 const local=report(15);local.issues=[{week:2,code:'layout_day_ban_conflict',severity:'blocking'}];
 const result=mergeWindowEvidence(report(33),{from:16,to:30,report:local});
 expect(result.status).toBe('blocked');expect(result.weeks.length).toBe(33);
 expect(result.issues).toContainEqual({week:17,code:'layout_day_ban_conflict',severity:'blocking'});
 expect(result.issues).toContainEqual({week:1,code:'coach_initial_load_unverified',severity:'warning'});
});
it('reports exact independent window scope',()=>{expect(contractWindowLabel({from:1,to:15,objective:'Marathon'})).toBe('Fenêtre S1–S15 · Marathon');});
it('preserves previous window errors when subsequent reports are admissible',()=>{
 const local={...report(15),issues:[{week:2,code:'layout_day_ban_conflict',severity:'blocking' as const}]};
 const first=mergeWindowEvidence(report(33),{from:1,to:15,report:local});
 const next=mergeWindowEvidence(first,{from:16,to:30,report:{...report(15),issues:[],status:'admissible'}});
 expect(next.status).toBe('blocked');expect(next.issues).toContainEqual(local.issues[0]);
});