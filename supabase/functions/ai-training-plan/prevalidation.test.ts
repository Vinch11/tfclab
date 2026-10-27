import {assert,assertEquals} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {handleJSONPlanRequest} from './jsonPlanHandler.ts';
import {inferPhaseFromWeek} from './jsonPlanHandler.ts';
import {buildStructuredDiagnosticBlock} from './promptHelpers.ts';
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

Deno.test('mixed window prompt and server phases follow the same sliced calendar for every objective',()=>{
 for(const objective of ['5K','10K','Semi','Marathon','TrailMountain','Sprint','Olympic','703','IM']) {
  const windowWeekPhases={1:'base',2:'build',3:'peak',4:'taper'};
  const config={objective,weeksAvailable:4,fondationDurationWeeks:6,windowRegenPhase:'build',windowWeekPhases,identifiedLimitersRaw:['VLamax','FatMax']};
  for(let week=1;week<=4;week++) assertEquals(inferPhaseFromWeek(week,4,objective,config),windowWeekPhases[week as keyof typeof windowWeekPhases]);
  const prompt=buildStructuredDiagnosticBlock(config,4);
  assert(prompt.includes(JSON.stringify(windowWeekPhases)));
  assert(!prompt.includes('Bloc Fondation pour CET athlète'));
  assert(!prompt.includes('Ces bornes sont INDICATIVES'));
 }
});

Deno.test('the sliced calendar retains the existing VO2max foundation restriction and limiter priority',()=>{
 const prompt=buildStructuredDiagnosticBlock({objective:'10K',ambition:'competitor',globalTotalWeeks:12,windowWeekPhases:{1:'base',2:'build'},identifiedLimitersRaw:['VO2max','FatMax']},2);
 assert(prompt.includes('SANS VO2max — réservé au Bloc Chantier dédié'));
 assert(prompt.includes('Bloc Chantier [VO2max↓] puis Consolidation [FatMax]'));
});

Deno.test('physiological failures transported to the server block before any gateway call, even without quota payload',async()=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=(()=>{calls++;throw Error('OFFLINE_GATEWAY_FORBIDDEN');}) as typeof fetch;
 try{
  for(const calculationIssues of [['decision_matrix_failed'],['lorang_strategy_failed']]) {
   const planConfig={objective:'10K',weeksAvailable:12,physiologicalTrace:{diagnostic:{executed:true},decision:{executed:true,source:'lorang',calculationIssues}}};
   const report=prevalidateTransport(planConfig);
   assertEquals(report.status,'blocked');assert(report.issues.some(i=>i.code===calculationIssues[0]&&i.severity==='blocking'));
   const response=handleJSONPlanRequest({apiKey:'mock-key',athleteData:{},planConfig,corsHeaders:{}});
   assert((await response.text()).includes('PLAN_PREVALIDATION_BLOCKED'));
  }
  assertEquals(calls,0);
 }finally{globalThis.fetch=previous;}
});
Deno.test('lack of a complementary matrix remains a review; an explicit primary limiter failure remains blocking',()=>{
 const trace={diagnostic:{executed:true},decision:{executed:true,source:'lorang',calculationIssues:['decision_matrix_not_supported']}};
 const config={objective:'5K',weeksAvailable:12,physiologicalTrace:trace};
 const review=prevalidateTransport(config);
 assert(review.status!=='blocked');assert(review.issues.some(i=>i.code==='decision_matrix_not_supported'&&i.severity==='warning'));
 const blocked=prevalidateTransport({...config,physiologicalTrace:{...trace,diagnostic:{executed:false}}});
 assertEquals(blocked.status,'blocked');assert(blocked.issues.some(i=>i.code==='limiter_calculation_unavailable'));
});
