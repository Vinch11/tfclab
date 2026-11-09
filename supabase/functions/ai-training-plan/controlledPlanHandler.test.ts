import {assertEquals} from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {handleControlledPlan} from './controlledPlanHandler.ts';
import {attachFixedExplanations,type FixedChunk} from '../_shared/controlledPlan.ts';
const chunk:FixedChunk={title:'Fixture',weeks:[{weekNumber:1,phase:'base',theme:'Fixture',sessions:[{day:'mardi',sport:'run',title:'Endurance',details:'Main: 30 min Z2',durationMin:30,zones:['Z2'],custom:false,catalogId:'RUN_EF',isKeySession:false}]}]};
Deno.test('controlled missing prescription fails before any gateway call',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=()=>{calls++;throw Error('NO_NETWORK');};
 try {const response=await handleControlledPlan({apiKey:'test-not-a-secret',model:'fixture',maxTokens:65536,planConfig:{_controlledPrescription:true},corsHeaders:{}});assertEquals(response.status,422);assertEquals(calls,0);}finally{globalThis.fetch=original;}
});
Deno.test('valid explanatory JSON cannot change the authoritative duration or zones',()=>{
 const result=attachFixedExplanations(chunk,{weeks:[{weekNumber:1,explanation:'Contexte'}]});
 assertEquals(result.weeks[0].sessions[0].durationMin,30);assertEquals(result.weeks[0].sessions[0].zones,['Z2']);
});
for(const field of ['sessions','durationMin','zones','phase']) Deno.test(`provider field ${field} is rejected rather than merged`,()=>{
 let rejected=false;try{attachFixedExplanations(chunk,{weeks:[{weekNumber:1,explanation:'', [field]:'forged'}]});}catch{rejected=true;}assertEquals(rejected,true);
});
Deno.test('week explanation moved to week two is rejected',()=>{
 let rejected=false;try{attachFixedExplanations(chunk,{weeks:[{weekNumber:2,explanation:''}]});}catch{rejected=true;}assertEquals(rejected,true);
});