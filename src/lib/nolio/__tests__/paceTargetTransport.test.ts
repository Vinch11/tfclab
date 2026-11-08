import {describe, it, expect, vi} from 'vitest';
import {PACE_TARGET_FORMAT, formatPaceSeconds, parsePaceSeconds} from '../../../../supabase/functions/_shared/nolioV2/paceTarget';
import {mapTarget, mapPlanToNolioV2, v2BodyProblems, semanticViolations, type DetWorkout, type NolioV2Refs, type V2Node} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
import {preparePlan} from '../../../../supabase/functions/_shared/nolioV2/planDryRun';
import {bodyToSend, exactRemoteMatch, reconcileExact} from '../../../../supabase/functions/_shared/nolioV2/plannedClient';

const refs:NolioV2Refs={synthetic:true,athleteId:'usr_SYNTH',sportIds:{run:'spt_RUN'},exerciseIds:{},competition:null};
const workout:DetWorkout={schema:'det-structured-workout-v1',sourceId:'SYNTHETIC',sport:'run',chosenDurationMin:10,exactSeconds:600,nodes:[{kind:'step',role:'main',label:'Allure source',domain:'mlss',dose:{seconds:600},target:{metric:'sec_per_km',min:233,max:247.4}}]};
const session={sessionKey:'S1-J1-0',date:'2026-11-10',title:'SYNTHETIC',sport:'run',catalogId:workout.sourceId,durationMin:10,detStructuredWorkout:workout};
const plan={_planStartDate:'2026-11-09',weeks:[{weekNumber:1,sessions:[{...session,dayIndex:1}]}]};

describe('versioned source-preserving pace transport',()=>{
 it.each([60,95,233,247.4,320,480,600.5])('retains every decimal second of %s',s=>{
  const formatted=formatPaceSeconds(s);expect(formatted).not.toBeNull();expect(parsePaceSeconds(formatted)).toBe(s);
 });
 it('maps running and swimming pace ranges in their documented friendly units without rounding',()=>{
  expect(mapTarget({metric:'sec_per_km',min:233,max:247.4},[],{paceTargets:true})).toEqual({type:'raw',unit:'/km',value:'3:53',value_max:'4:07.4'});
  expect(mapTarget({metric:'sec_per_100m',min:95,max:100.5},[],{paceTargets:true})).toEqual({type:'raw',unit:'/100m',value:'1:35',value_max:'1:40.5'});
  expect(mapTarget({metric:'sec_per_km',min:300,max:300},[],{paceTargets:true})).toEqual({type:'raw',unit:'/km',value:'5:00'});
 });
 it('converts running speed bounds in the opposite order while retaining their numerical precision',()=>{
  const target=mapTarget({metric:'m_per_sec',min:4.12,max:4.5},[],{paceTargets:true,sport:'run'});
  if(typeof target==='string'||target.type!=='raw')throw Error(String(target));
  expect(target.unit).toBe('/km');expect(parsePaceSeconds(target.value)).toBe(1000/4.5);expect(parsePaceSeconds(target.value_max)).toBe(1000/4.12);
  expect(mapTarget({metric:'m_per_sec',min:4,max:5},[],{paceTargets:true,sport:'bike'})).toEqual({type:'raw',unit:'m/s',value:4,value_max:5});
  expect(mapTarget({metric:'watts',min:120,max:165},[],{paceTargets:true})).toEqual({type:'raw',unit:'W',value:120,value_max:165});
 });
 it('refuses absent, nonpositive, inverted and malformed pace bounds',()=>{
  for(const value of ['4:60','4:7','4:07x','0:00','-1:30',233])expect(parsePaceSeconds(value)).toBeNull();
  expect(mapTarget({metric:'sec_per_km',min:233,max:null},[],{paceTargets:true})).toBe('open_pace_bound_unrepresentable');
  expect(mapTarget({metric:'sec_per_km',min:0,max:233},[],{paceTargets:true})).toBe('pace_not_positive');
  const nodes:V2Node[]=[{kind:'step',duration:{value:60,unit:'s'},targets:[{type:'raw',unit:'/km',value:'10:00',value_max:'9:59'}]}];
  expect(semanticViolations(nodes)).toContain('0:raw_bounds_inverted');
 });
 it('freezes the new format through the common whole-plan/scope preparation and preserves old archives byte-for-byte',async()=>{
  const before=JSON.stringify(plan);
  const old=await preparePlan(plan,refs,'OLD_VERSION');
  const next={...structuredClone(plan),_nolioV2TargetFormat:PACE_TARGET_FORMAT};
  const prepared=await preparePlan(next,refs,'NEW_VERSION');
  expect(prepared.precheck.complete).toBe(true);
  expect(prepared.ops[0].body.workout).toMatchObject([{targets:[{unit:'/km',value:'3:53',value_max:'4:07.4'}]}]);
  expect(v2BodyProblems(prepared.ops[0].source.body,'training')).toEqual([]);
  const scoped=await preparePlan(next,refs,'NEW_VERSION',{kind:'weeks',from:1,to:1});
  expect(scoped.ops.map(o=>o.bodySha256)).toEqual(prepared.ops.map(o=>o.bodySha256));
  expect(await preparePlan(plan,refs,'OLD_VERSION')).toEqual(old);
  expect(old.ops[0].body.workout).toMatchObject([{targets:[{unit:'m/s',value:1000/247.4,value_max:1000/233}]}]);
  expect(JSON.stringify(plan)).toBe(before);
  expect(prepared.planSha256).not.toBe(old.planSha256);
  const bad=await preparePlan({...plan,_nolioV2TargetFormat:'unknown'},refs,'NEW_VERSION');
  expect(bad.precheck.complete).toBe(false);expect(bad.ops).toEqual([]);expect(bad.precheck.planProblems).toContain('nolio_target_format_unknown');
 });
 it('verifies exact nested pace readback and rejects changed, lost or collapsed bounds without creating anything',async()=>{
  const op=mapPlanToNolioV2([session],refs,{paceTargets:true}).operations[0];
  const sent=await bodyToSend('NEW_VERSION',op),remote={...sent,id:'ptrn_SYNTH'};
  const post=vi.fn();
  const result=await reconcileExact({post,listPage:async()=>({ok:true,items:[remote],hasMore:false}),getDetail:async()=>({ok:true,item:remote})},op,refs.athleteId,sent,String(sent.description));
  expect(result).toEqual({kind:'exact',id:'ptrn_SYNTH'});expect(post).not.toHaveBeenCalled();
  for(const target of [{unit:'/km',value:'3:53',value_max:'4:08'},{unit:'/km',value:'4:07.4'},{unit:'/km',value:'3:53'},{unit:'m/s',value:4,value_max:5}]){
   expect(exactRemoteMatch({...remote,workout:[{...(sent.workout as V2Node[])[0],targets:[{type:'raw',...target}]}]},sent)).toBe(false);
  }
 });
});
