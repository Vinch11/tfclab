import {describe,expect,it} from 'vitest';
import {v3FullCatalogue} from '../../../scripts/library-v3/catalogueRuntime';
import {resolveV31Duration,resolveV31Intensity,type V31AthleteCalibration} from '../../../scripts/library-v3/resolvePrescription';
import type {DoctrineDomainId} from '../zones/tfclDoctrine';

const DOMAINS:DoctrineDomainId[]=[
 'recovery','moderate_lt1','tempo','im_pace','703_pace',
 'marathon_pace','sub_threshold','semi_pace','mlss','vo2max','neuromuscular',
];
const swimPaces=Object.fromEntries(DOMAINS.map(d=>[d,100])) as Record<DoctrineDomainId,number>;
const profileBase:V31AthleteCalibration={
 bikeFTPWatts:290,bikeLT1Watts:210,bikePMAWatts:380,bikeSprintReferenceWatts:1000,
 runMLSSPaceSecondsPerKm:250,runLT1PaceSecondsPerKm:300,
 runVVO2PaceSecondsPerKm:200,runSprintPaceSecondsPerKm:120,
 swimPacesSecondsPer100m:swimPaces,
};
describe('V3.1 — real recipe execution inputs, no fabricated personal values',()=>{
 it('withholds swim and strength duration when individual coach inputs are missing',()=>{
  let direct=0,swim=0,strength=0;
  for(const w of v3FullCatalogue.workouts){
    const out=resolveV31Duration(w);
    if(w.sport==='swim'){
      expect(out.status,w.id).toBe('blocked');swim++;
      expect(out.missing.some(m=>m.startsWith('coach_confirmed_swim_pace_sec_per_100m:'))).toBe(true);
    }else if(w.sport==='strength'){
      expect(out.status,w.id).toBe('blocked');strength++;
      expect(out.missing).toContain('coach_confirmed_setup_transition_seconds');
    }else{
      expect(out.status,w.id).toBe('confirmed');direct++;
    }
  }
  expect({direct,swim,strength}).toEqual({direct:200,swim:100,strength:100});
 });
 it('computes durations for all 400 given explicit synthetic external inputs and never rounds seconds',()=>{
  for(const w of v3FullCatalogue.workouts){
    const measured=Object.fromEntries(w.prescriptionContract.intensity.segments
      .filter(s=>w.prescriptionContract.duration.requiredInputs.includes(
        'coach_measured_execution_seconds_per_repetition:'+s.path))
      .map(s=>[s.path,4]));
    const out=resolveV31Duration(w,{
      swimPacesSecondsPer100m:swimPaces,
      strengthMeasuredSecondsPerRepetitionByPath:measured,
      strengthCoachConfirmedSetupTransitionSeconds:0,
    });
    expect(out.status,w.id+':'+JSON.stringify(out.missing)).toBe('confirmed');
    expect(out.seconds,w.id).toBeGreaterThan(0);
    expect(out.minutes,w.id).toBe((out.seconds??0)/60);
    expect(out.missing).toEqual([]);
  }
 });
 it('resolves source intensity against supplied athlete calibration for all 400 without approving them',()=>{
  for(const w of v3FullCatalogue.workouts){
    const loads=Object.fromEntries(w.prescriptionContract.intensity.segments
      .filter(s=>s.role==='main').map(s=>[s.path,{kind:'rpe' as const,value:6}]));
    const intensity=resolveV31Intensity(w,{...profileBase,strengthLoadPerPath:loads});
    expect(intensity.status,w.id+':'+JSON.stringify(intensity.missing)).toBe('resolved');
    expect(intensity.segments.length,w.id).toBeGreaterThan(0);
    expect(intensity.interpretation).toBe('source_contract_and_individual_inputs_only_not_coach_approval');
    expect(w.automaticSelection).toBe(false);
  }
 });
 it('refuses to invent intensity when actual profile is absent',()=>{
  const bike=v3FullCatalogue.workouts.find(w=>w.id==='V3P_BIKE_002')!;
  const run=v3FullCatalogue.workouts.find(w=>w.id==='V3P_RUN_001')!;
  const swim=v3FullCatalogue.workouts.find(w=>w.id==='V3P_SWIM_001')!;
  const strength=v3FullCatalogue.workouts.find(w=>w.id==='V3P_STRENGTH_001')!;
  for(const w of [bike,run,swim,strength]){
    const out=resolveV31Intensity(w,{});
    expect(out.status).toBe('blocked');
    expect(out.missing.length).toBeGreaterThan(0);
  }
 });
 it('does not invent a pace upper bound for easy recovery running',()=>{
  const run=v3FullCatalogue.workouts.find(w=>w.id==='V3P_RUN_001')!;
  const out=resolveV31Intensity(run,profileBase);
  expect(out.status).toBe('resolved');
  for(const s of out.segments.filter(s=>s.domain==='recovery'))
    expect(s.max).toBeNull();
 });
});
