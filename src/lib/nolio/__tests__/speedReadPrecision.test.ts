import {describe,it,expect,vi} from 'vitest';
import {exactRemoteMatch,remoteMismatchFields,reconcileExact} from '../../../../supabase/functions/_shared/nolioV2/plannedClient';
import type {V2Operation} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
import {formatRawTargetEvidence} from '../../../../supabase/functions/_shared/nolioV2/readbackDifferences';
const target=(value:number,value_max?:number,unit='m/s')=>({type:'raw',unit,value,...(value_max===undefined?{}:{value_max})});
const step=(t:unknown)=>({kind:'step',duration:{value:600,unit:'s'},targets:[t]});
const body={name:'SYNTHETIC',date_start:'2026-11-11',sport:'spt_SYNTH',athletes:['usr_SYNTH'],description:'[marker]',workout:[step(target(2.0833333333333335,3.125)),{kind:'repeat',times:4,skip_last:true,steps:[step(target(4.042037186742118,4.291845493562231))]},step(target(2.0833333333333335,3.125))]};
const read=()=>({...body,id:'ptrn_SYNTH',workout:[step(target(2.08,3.12)),{kind:'repeat',times:4,skip_last:true,steps:[step(target(4.04,4.29))]},step(target(2.08,3.12))]});
describe('directional raw-speed provider read precision',()=>{
 it('accepts the exact reported three blocks without changing either input',()=>{const a=read(),before=JSON.stringify([a,body]);expect(exactRemoteMatch(a,body)).toBe(true);expect(remoteMismatchFields(a,body)).toEqual([]);expect(JSON.stringify([a,body])).toBe(before);});
 it.each([3.12,3.13])('accepts a nearest-cent tie as %s without assuming a rounding implementation',v=>{expect(exactRemoteMatch({workout:[step(target(v))]},{workout:[step(target(3.125))]})).toBe(true);});
 it.each([2.07,2.09,2.0831,2.075])('rejects a changed or non-cent-grid speed %s',v=>{expect(exactRemoteMatch({workout:[step(target(v,3.12))]},{workout:[step(target(2.0833333333333335,3.125))]})).toBe(false);});
 it('never rounds sent data backwards, watts, distances, durations or RPE',()=>{
  expect(exactRemoteMatch({workout:[step(target(2.0833333333333335))]},{workout:[step(target(2.08))]})).toBe(false);
  expect(exactRemoteMatch({workout:[step(target(120.004,165,'W'))]},{workout:[step(target(120,165,'W'))]})).toBe(false);
  for(const k of ['duration','distance','rpe'])expect(exactRemoteMatch({[k]:2.08},{[k]:2.0833333333333335})).toBe(false);
 });
 it('rejects different units, missing bounds, collapsed ranges, inverted ranges and non-finite values',()=>{
  for(const t of [target(2.08,3.12,'km/h'),target(3.12),target(2.08,2.08),target(3.12,2.08),target(NaN,3.12)])expect(exactRemoteMatch({workout:[step(t)]},{workout:[step(target(2.0833333333333335,3.125))]})).toBe(false);
 });
 it('retains date, audience, description, recovery and repeat checks',()=>{
  for(const [key,value] of [['date_start','2026-11-12'],['athletes',['usr_OTHER']],['description','Changed']])expect(exactRemoteMatch({...read(),[String(key)]:value},body)).toBe(false);
  const r=read();r.workout[1]={kind:'repeat',times:4,skip_last:false,steps:[step(target(4.04,4.29))]};expect(exactRemoteMatch(r,body)).toBe(false);
 });
 it('reconciles through the actual list/detail path without any create',async()=>{
  const post=vi.fn();const http={post,listPage:async()=>({ok:true as const,items:[read()],hasMore:false}),getDetail:async()=>({ok:true as const,item:read()})};
  const op={kind:'training',sessionKey:'S1-J2-4',path:'/api/v2/planned/trainings/',sourceId:'SYNTH',precisionNotes:[],body} as V2Operation;
  expect(await reconcileExact(http,op,'usr_SYNTH',body,'[marker]')).toEqual({kind:'exact',id:'ptrn_SYNTH'});expect(post).not.toHaveBeenCalled();
 });
 it('presents speed diagnostic evidence as min/km for the coach',()=>{
  const s=formatRawTargetEvidence([{path:'workout[0].targets[0]',unit:'m/s',sent:{value:2.0833333333333335,value_max:3.125},read:{value:2.08,value_max:3.12},resolved:{}}],'run');
  expect(s).toContain('envoyé 5:20–8:00 min/km');expect(s).toContain('lu 5:20,51–8:00,77 min/km');expect(s).not.toContain('m/s');
 });
});
