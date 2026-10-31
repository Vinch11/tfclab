import { describe, expect, it } from 'vitest';
import { auditV3Catalogue, v3FullCatalogue, type V3Workout } from '../../../scripts/library-v3/catalogueRuntime';
import {
  auditV31PrescriptionContract, expectedV31PrescriptionContract,
} from '../../../scripts/library-v3/prescriptionContract';

describe('V3.1 — 400/400 source-bound physiology, timing and safety contracts',()=>{
 it('requires all 400 canonical workouts, not a pilot subset',()=>{
  expect(v3FullCatalogue.workouts).toHaveLength(400);
  expect(v3FullCatalogue.counts).toEqual({bike:100,run:100,swim:100,strength:100});
  expect(auditV3Catalogue(v3FullCatalogue)).toEqual([]);
 });
 it('has 400 complete and individually source-bound contracts',()=>{
  for(const w of v3FullCatalogue.workouts){
    expect(w.prescriptionContract,w.id).toBeDefined();
    expect(auditV31PrescriptionContract(w),w.id).toEqual([]);
    expect(w.prescriptionContract).toEqual(expectedV31PrescriptionContract(w));
    expect(w.prescriptionContract.eligibility.automaticSelection).toBe(false);
    expect(w.prescriptionContract.eligibility.scientificValidation)
      .toBe('not_session_specifically_validated');
    expect(w.prescriptionContract.intensity.segments.length).toBeGreaterThan(0);
    expect(w.prescriptionContract.duration.rounding).toBe('none');
    expect(w.prescriptionContract.safety.minimumRecoveryHours).toBe(w.minimumRecoveryHours);
  }
 });
 it('keeps explicit distinct duration dependencies for 200 time, 100 swim and 100 strength recipes',()=>{
  const count=(method:string)=>v3FullCatalogue.workouts
    .filter(w=>w.prescriptionContract.duration.method===method).length;
  expect(count('sum_time_seconds')).toBe(200);
  expect(count('swim_pace_dependent')).toBe(100);
  expect(count('strength_measured_execution_dependent')).toBe(100);
  for(const w of v3FullCatalogue.workouts.filter(w=>w.sport==='swim')){
    expect(w.prescriptionContract.duration.requiredInputs.length,w.id).toBeGreaterThan(0);
    expect(w.prescriptionContract.duration.requiredInputs.every(x=>
      x.startsWith('coach_confirmed_swim_pace_sec_per_100m:'))).toBe(true);
  }
  for(const w of v3FullCatalogue.workouts.filter(w=>w.sport==='strength')){
    expect(w.prescriptionContract.duration.requiredInputs)
      .toContain('coach_confirmed_setup_transition_seconds');
    expect(w.prescriptionContract.duration.requiredInputs)
      .toContain('coach_confirmed_strength_load_or_RPE');
  }
 });
 it('fails closed when ANY declared intent, physiology, recovery or segment is tampered with',()=>{
  const original=v3FullCatalogue.workouts[0];
  const mutated=structuredClone(original) as V3Workout;
  mutated.primaryIntent=original.primaryIntent==='vo2max'?'mlss':'vo2max';
  expect(auditV31PrescriptionContract(mutated)).toEqual([
    original.id+':PRESCRIPTION_CONTRACT_SOURCE_MISMATCH',
  ]);
  const noContract=structuredClone(original) as V3Workout;
  delete (noContract as Partial<V3Workout>).prescriptionContract;
  expect(auditV31PrescriptionContract(noContract)).toEqual([
    original.id+':MISSING_V31_PRESCRIPTION_CONTRACT',
  ]);
  const altered=structuredClone(original);
  altered.prescriptionContract.safety.minimumRecoveryHours+=5;
  expect(auditV31PrescriptionContract(altered)).toEqual([
    original.id+':PRESCRIPTION_CONTRACT_SOURCE_MISMATCH',
  ]);
 });
});
