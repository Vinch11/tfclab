import {describe,it,expect} from 'vitest';
import {findSource} from '../coachDetContext';
import {resolveV3IntensityTargets} from '../../../../scripts/library-v3/resolveV3Intensity';
import {evaluateV3Workout} from '../../../../scripts/library-v3/catalogueRuntime';
import {getDoctrineDomain} from '@/lib/zones/tfclDoctrine';
import {previewDetStructuredWorkout} from '../../../../experimental/det-engine/v400-structured-workout';
import {mapPlanToNolioV2,type V2Node,type NolioV2Refs,type DetWorkout} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
import {bodyToSend,exactRemoteMatch} from '../../../../supabase/functions/_shared/nolioV2/plannedClient';
const source=(id:string)=>{const w=findSource(id);if(!w)throw Error(id);return w;};
describe('individual guided active-recovery execution ranges',()=>{
 it.each([[200,80,110],[300,120,165],[350,140,192.5]])('FTP %s resolves its own bounded recovery range', (ftp,min,max)=>{
  const r=resolveV3IntensityTargets(source('V3P_BIKE_147'),{bikeFtpWatts:ftp});
  expect(r.status).toBe('resolved');expect(r.targets.find(t=>t.domain==='recovery')).toMatchObject({metric:'watts',min,max,confidence:'model'});
  expect(r.targets.find(t=>t.domain==='mlss')).toMatchObject({min:+(.95*ftp).toFixed(1),max:+(1.03*ftp).toFixed(1)});
 });
 it('keeps physiological boundaries distinct from the execution prescription',()=>{
  expect(getDoctrineDomain('recovery').bike).toEqual({min:0,max:.55});
  expect(getDoctrineDomain('recovery').run).toEqual({min:0,max:.75});
  expect(resolveV3IntensityTargets(source('V3P_BIKE_147'),{}).missing).toContain('bike_ftp_w');
 });
 it('gives running recovery two finite pace bounds without inferring swimming paces',()=>{
  const r=resolveV3IntensityTargets(source('V3P_RUN_003'),{runThresholdPaceSecPerKm:240});
  expect(r.targets.find(t=>t.domain==='recovery')).toMatchObject({metric:'sec_per_km',min:320,max:480,confidence:'model'});
  const swim=resolveV3IntensityTargets(source('V3P_SWIM_041'),{cssSecPer100m:95});
  expect(swim.targets.some(t=>t.domain==='recovery')).toBe(false);
 });
 it('serializes the same source recovery range into the guided Nolio blocks, preserving the main set and exact dose',async()=>{
  const w=source('V3P_BIKE_147'),before=JSON.stringify(w),targets=resolveV3IntensityTargets(w,{bikeFtpWatts:300});
  const minutes=evaluateV3Workout(w).minutes;
  const s=previewDetStructuredWorkout({sourceId:w.id,sport:w.sport,blocks:w.blocks,targets:targets.targets,durationMinutes:minutes});
  expect(s.status).toBe('preview');if(s.status!=='preview')throw Error(s.reason);
  const refs:NolioV2Refs={synthetic:true,athleteId:'usr_SYNTH',sportIds:{bike:'spt_SYNTH'},exerciseIds:{},competition:null};
  // The engine also supports qualitative terrain targets; this numerical bike
  // fixture crosses the same runtime-validated serialization boundary as JSON.
  const m=mapPlanToNolioV2([{sessionKey:'S1-J1-0',date:'2026-11-10',title:w.title,sport:'bike',catalogId:w.id,durationMin:minutes!,detStructuredWorkout:s.workout as unknown as DetWorkout}],refs);
  expect(m.refusals).toEqual([]);expect(m.operations).toHaveLength(1);
  const body=await bodyToSend('SYNTHETIC',m.operations[0]);
  const nodes=body.workout as V2Node[];
  const ends=[nodes[0],nodes.at(-1)];
  for(const n of ends){expect(n?.kind).toBe('step');if(n?.kind==='step')expect(n.targets).toEqual([{type:'raw',value:120,value_max:165,unit:'W'}]);}
  expect(JSON.stringify(nodes)).toContain('285');expect(JSON.stringify(nodes)).toContain('309');
  expect(exactRemoteMatch(structuredClone(body),body)).toBe(true);
  expect(JSON.stringify(w)).toBe(before);
 });
});
