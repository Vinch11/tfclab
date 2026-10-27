import {assert,assertEquals} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {handleJSONPlanRequest} from './jsonPlanHandler.ts';
import {prevalidateTransport} from '../_shared/prevalidateTransport.ts';
const quota={swim:{min:0,max:0},bike:{min:0,max:1},run:{min:5,max:5},brick:{min:0,max:0},strength:{min:2,max:2},totalSessions:{min:7,max:8},maxSessionsPerDay:1,minFullRestDays:1};
const layout={days:['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].map(dayName=>({dayName,isRest:dayName==='lundi',slots:[]}))};
Deno.test('a contradiction in a later week stops JSON generation before the first gateway fetch',async()=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=(()=>{calls++;throw Error('OFFLINE_GATEWAY_FORBIDDEN');}) as typeof fetch;
 try{
  const planConfig={objective:'10K',weeksAvailable:12,_weeklyQuotas:{12:{quota,layout,phase:'taper',weekType:'race'}}};
  assertEquals(prevalidateTransport(planConfig).status,'blocked');
  const response=handleJSONPlanRequest({apiKey:'mock-key',athleteData:{},planConfig,corsHeaders:{}});
  const text=await response.text();assert(text.includes('PLAN_PREVALIDATION_BLOCKED'));assertEquals(calls,0);
 }finally{globalThis.fetch=previous;}
});
Deno.test('legacy and JSON entrypoints enforce the shared gate before reading model credentials',()=>{
 const source=Deno.readTextFileSync(new URL('./index.ts',import.meta.url));
 assert(source.indexOf('prevalidateTransport(planConfig')<source.indexOf('const LOVABLE_API_KEY'));
 assert(source.includes('status: 422'));
});
Deno.test('a contradictory per-week phase is blocked before any gateway request',async()=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=(()=>{calls++;throw Error('OFFLINE_GATEWAY_FORBIDDEN');}) as typeof fetch;
 try{
  const planConfig={objective:'10K',weeksAvailable:1,windowRegenPhase:'build',windowWeekPhases:{1:'base'},_weeklyQuotas:{1:{quota:{...quota,maxSessionsPerDay:2},layout,phase:'build',weekType:'load'}}};
  const response=handleJSONPlanRequest({apiKey:'mock-key',athleteData:{},planConfig,corsHeaders:{}});
  assert((await response.text()).includes('PLAN_PREVALIDATION_BLOCKED'));assertEquals(calls,0);
 }finally{globalThis.fetch=previous;}
});
Deno.test('a declared event outside a complete plan is rejected without any paid fetch',async()=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=(()=>{calls++;throw Error('OFFLINE_GATEWAY_FORBIDDEN');}) as typeof fetch;
 try{
  const planConfig={objective:'10K',weeksAvailable:10,planStartDate:'2026-10-26',raceGoals:[{objective:'10K',raceDate:'2027-01-17'}]};
  const response=handleJSONPlanRequest({apiKey:'mock-key',athleteData:{},planConfig,corsHeaders:{}});
  assert((await response.text()).includes('PLAN_PREVALIDATION_BLOCKED'));assertEquals(calls,0);
 }finally{globalThis.fetch=previous;}
});
