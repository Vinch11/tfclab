import {describe,it,expect} from 'vitest';
import {mapTarget,type V2Operation} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
import {bodyToSend,originMarker,exactRemoteMatch,reconcileExact} from '../../../../supabase/functions/_shared/nolioV2/plannedClient';
import {fetchNolioV2Http,type FetchLike} from '../../../../supabase/functions/_shared/nolioV2/httpFetch';

// Synthetic reproduction of the observed ceiling loss. No provider connection,
// credentials, saved athlete/version or positive live receipt is involved.
const version='ceiling-contract-fixture';
function operation():V2Operation{
 return {kind:'training',sessionKey:'S1-J1-0',sourceId:'SYNTHETIC',precisionNotes:[],path:'/api/v2/planned/trainings/',body:{name:'Ceiling contract fixture',date_start:'2026-11-10',sport:'spt_SYNTH',athletes:['usr_SYNTH'],workout:[{kind:'step',duration:{value:600,unit:'s'},intensity:'warmup',targets:[mapTarget({metric:'watts',min:0,max:165},[])]}]}};
}
describe('ceiling source to actual HTTP serialization and readback',()=>{
 it('preserves the numeric zero and upper bound in the actual POST body',async()=>{
  const op=operation(),sent=await bodyToSend(version,op);
  const requests:Array<{method:string;body?:string}>=[];
  const fetch:FetchLike=async(_url,init)=>{requests.push({method:init.method,body:init.body});return {status:201,text:async()=>JSON.stringify({id:'ptrn_SYNTH'})};};
  await fetchNolioV2Http({fetch,accessToken:'SYNTHETIC_NOT_A_CREDENTIAL'}).post(op.path,sent);
  expect(requests).toHaveLength(1);
  expect(JSON.parse(requests[0].body!).workout[0].targets[0]).toEqual({type:'raw',unit:'W',value:0,value_max:165});
  expect(op.body.description).toBeUndefined();
 });
 it('stops on the observed collapsed ceiling without creating or repairing activities during verification',async()=>{
  const op=operation(),sent=await bodyToSend(version,op),marker=await originMarker(version,op);
  const remote={...sent,id:'ptrn_SYNTH',workout:[{kind:'step',duration:{value:600,unit:'s'},intensity:'warmup',targets:[{type:'raw',unit:'W',value:165}]}]};
  const methods:string[]=[];
  const fetch:FetchLike=async(url,init)=>{methods.push(init.method);return {status:200,text:async()=>JSON.stringify(url.includes('ptrn_SYNTH/')?remote:{data:[remote],has_more:false})};};
  const http=fetchNolioV2Http({fetch,accessToken:'SYNTHETIC_NOT_A_CREDENTIAL'});
  for(let attempt=0;attempt<2;attempt++){
   const result=await reconcileExact(http,op,'usr_SYNTH',sent,marker);
   expect(result.kind).toBe('ambiguous');
   if(result.kind==='ambiguous')expect(result.diagnostic?.targets?.[0]).toMatchObject({unit:'W',sent:{value:0,value_max:165},read:{value:165}});
  }
  expect(methods.length).toBeGreaterThan(0);
  expect(methods.every(method=>method==='GET')).toBe(true);
 });
 it('accepts preserved zero ceilings but rejects replacement floors, missing bounds and single setpoints',async()=>{
  const sent=await bodyToSend(version,operation());
  const target=(value:number|string,value_max?:number)=>({...sent,workout:[{kind:'step',duration:{value:600,unit:'s'},intensity:'warmup',targets:[{type:'raw',unit:'W',value,...(value_max===undefined?{}:{value_max})}]}]});
  expect(exactRemoteMatch(target(0,165),sent)).toBe(true);
  expect(exactRemoteMatch(target('0',165),sent)).toBe(true);
  expect(exactRemoteMatch(target(1,165),sent)).toBe(false);
  expect(exactRemoteMatch(target(165),sent)).toBe(false);
  expect(exactRemoteMatch(target(0),sent)).toBe(false);
 });
});
