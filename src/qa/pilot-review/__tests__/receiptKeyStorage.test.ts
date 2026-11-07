import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {expandCoachBricks} from '../../../../supabase/functions/_shared/nolioV2/coachMultisport';
import {parsePlanDryResp} from '../planDryRunView';
import type {DetWorkout,PlanSessionInput} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
const sql=readFileSync('drizzle/migrations/0024_nolio_v2_brick_receipt_keys.sql','utf8');
const pattern=new RegExp(sql.match(/CHECK \(session_key ~ '([^']+)'\)/)![1]);
const component=(sport:string):DetWorkout=>({schema:'det-structured-workout-v1',sourceId:'SYNTH_'+sport,sport,chosenDurationMin:20,exactSeconds:1200,nodes:[{kind:'step',role:'main',label:'Test',domain:null,target:null,dose:{seconds:1200}}]});
describe('receipt storage agrees with generated multisport operation keys',()=>{
 it('accepts both actual generated child keys in storage and in the client manifest',async()=>{
  const original:PlanSessionInput={sessionKey:'S1-J5-7',date:'2026-11-07',title:'Enchaînement fictif',sport:'brick',detStructuredComponents:{schema:'det-brick-components-preview-v1',bike:component('bike'),run:component('run')}};
  const expanded=await expandCoachBricks([original]);expect(expanded.problems).toEqual([]);expect(expanded.sessions).toHaveLength(2);
  const manifest=expanded.sessions.map((s,i)=>({opIndex:i,sessionKey:s.sessionKey,date:s.date,kind:'training',path:'/api/v2/planned/trainings/',bodySha256:'a'.repeat(64)}));
  expect(manifest.every(m=>pattern.test(m.sessionKey))).toBe(true);
  expect(parsePlanDryResp({status:'PRECHECK_COMPLETE',code:'ok',manifest})?.manifest).toEqual(manifest);
 });
 it.each(['S1-J1-0','S1-J5-7~bike','S1-J5-7~run','S40-J6-128~run'])('keeps valid keys: %s',key=>expect(pattern.test(key)).toBe(true));
 it.each(['S1-J5-7~swim','S1-J5-7~bike~run','S1-J7-7~bike','prefixS1-J1-0','S1-J5-7~','S1-J5-7 extra'])('refuses unrelated or malformed keys: %s',key=>expect(pattern.test(key)).toBe(false));
});
