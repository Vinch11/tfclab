import {describe,it,expect} from 'vitest';
import {completeStrengthSources,timedSwimSources} from '../../../../scripts/library-v3/completeSessionSources';
import {auditV3Catalogue,evaluateV3Workout,v3FullCatalogue,type V3Block,type V3Leaf} from '../../../../scripts/library-v3/catalogueRuntime';
import {resolveV3IntensityTargets} from '../../../../scripts/library-v3/resolveV3Intensity';
import {previewDetStructuredWorkout} from '../../../../experimental/det-engine/v400-structured-workout';
const all=[...completeStrengthSources,...timedSwimSources];
const leaves=(blocks:V3Block[]):V3Leaf[]=>blocks.flatMap(b=>b.kind==='repeat'?leaves(b.steps):[b]);
describe('complete candidate prescriptions, without athlete approvals',()=>{
 it('audits every complete source and keeps the original 800 unchanged',()=>{
  expect(auditV3Catalogue({...v3FullCatalogue,count:all.length,counts:{strength:8,swim:14,run:0,bike:0},workouts:all})).toEqual([]);
  expect(v3FullCatalogue.workouts.length).toBe(800);
  expect(all.every(w=>w.automaticSelection===false&&w.evidence.sessionSpecificValidation===false)).toBe(true);
 });
 it.each(completeStrengthSources)('$id has six explicit exercises, exact timeboxes and no invented load',w=>{
  const circuit=w.blocks.find(b=>b.kind==='repeat');expect(circuit?.kind).toBe('repeat');
  if(circuit?.kind!=='repeat')throw Error('Missing circuit');
  expect(circuit.steps).toHaveLength(6);expect(new Set(circuit.steps.map(b=>b.label)).size).toBe(6);
  expect(evaluateV3Workout(w).status).toBe('confirmed');
  expect(resolveV3IntensityTargets(w,{}).missing).toEqual([]);
  expect(leaves(w.blocks).filter(b=>b.role==='main').every(b=>b.rpeRange&&b.rpeRange.max<7)).toBe(true);
  expect(JSON.stringify(w.blocks)).not.toContain('kg');
  const preview=previewDetStructuredWorkout({sourceId:w.id,sport:w.sport,blocks:w.blocks,targets:[],durationMinutes:evaluateV3Workout(w).minutes});
  expect(preview.status).toBe('preview');
  if(preview.status==='preview')expect(preview.sourceAdmission).toBe('pending');
 });
 it.each(timedSwimSources)('$id gives a timed qualitative prescription without converting CSS',w=>{
  const a=resolveV3IntensityTargets(w,{cssSecPer100m:95}),b=resolveV3IntensityTargets(w,{cssSecPer100m:120});
  expect(a).toEqual(b);expect(a.targets).toEqual([]);expect(a.missing).toEqual([]);
  expect(evaluateV3Workout(w).status).toBe('confirmed');
  expect(leaves(w.blocks).every(b=>b.kind==='time')).toBe(true);
  expect(w.methodology).toContain('aucune allure calculée depuis CSS');
  const preview=previewDetStructuredWorkout({sourceId:w.id,sport:w.sport,blocks:w.blocks,targets:[],durationMinutes:evaluateV3Workout(w).minutes});
  // Qualitative prescription is usable in the coach viewer; it is not
  // silently turned into an exportable pace/threshold target.
  expect(preview.status).toBe('refused');
 });
});
