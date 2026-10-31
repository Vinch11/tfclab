import {describe,it,expect} from 'vitest';
import {v3FullCatalogue,evaluateV3Workout} from '../../scripts/library-v3/catalogueRuntime';
import {configureMeasuredStrengthTiming} from '../../scripts/library-v3/strengthTimingV3';
import {buildDetV3ContractFromCatalogue} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';
const source=v3FullCatalogue.workouts.find(x=>x.id==='V3P_STRENGTH_021')!;
const measured={
 coachConfirmedMeasurements:true as const,
 measuredByBlockPath:{
  '1.0':{secondsPerRep:6,setupTransitionSeconds:6,rpeMin:7,rpeMax:8},
  '2.0':{secondsPerRep:4,setupTransitionSeconds:0,rpeMin:6,rpeMax:7},
 },
};
const settings={
 id:source.id,objective:'IM',athleteLevel:'trained' as const,
 athleteLevelSource:'manual' as const,allPrerequisitesChecked:true as const,
 individualCoachApproval:true as const,athleteAnchors:syntheticV3ReviewAnchors(),
 ...syntheticV3SportingContext(source.id),
};
describe('DET V3.3 — real coach measured historical strength scheduling',()=>{
 it('admits a reviewed legacy strength session by frequency without pretending the duration is known',()=>{
  expect(evaluateV3Workout(source).status).toBe('estimated');
  const countOnly=buildDetV3ContractFromCatalogue([settings]);
  expect(countOnly.report.accepted).toHaveLength(1);
  const selected=countOnly.report.accepted[0];
  expect(selected.id).toBe(source.id);
  expect(selected.sport).toBe('strength');
  expect(selected.intentFamily).toBe('force');
  expect(selected.durationMin).toEqual([0,0]); // count-mode marker, NOT training minutes
  expect(selected.tags).toContain('v3-strength-frequency-only-unknown-duration');
  expect(selected.zones).toEqual([]);
  expect(selected.structure).toContain('durée non mesurée');
  expect(evaluateV3Workout(source).status).toBe('estimated');
 });
 it('does not falsely use the nominal duration of a historic timed core exercise',()=>{
  const id='V3P_STRENGTH_009';
  const result=buildDetV3ContractFromCatalogue([{
   ...settings,id,...syntheticV3SportingContext(id),
  }]);
  expect(result.report.accepted).toHaveLength(1);
  expect(result.report.accepted[0].durationMin).toEqual([0,0]);
  expect(result.report.accepted[0].tags).toContain('v3-strength-frequency-only-unknown-duration');
 });
 it('turns measured reps and preparation into exactly 32 min with source intact',()=>{
  const configured=configureMeasuredStrengthTiming(source,measured);
  const duration=evaluateV3Workout(configured.workout);
  expect(duration.status).toBe('confirmed');
  expect(duration.seconds).toBe(32*60);
  expect(evaluateV3Workout(source).status).toBe('estimated');
  expect(configured.totalMeasuredMovementPaths).toBe(2);
  const admitted=buildDetV3ContractFromCatalogue([{
   ...settings,verifiedStrengthTiming:measured,
  }]);
  expect(admitted.report.accepted).toHaveLength(1);
  expect(admitted.report.accepted[0].sport).toBe('strength');
  expect(admitted.report.accepted[0].durationMin).toEqual([32,32]);
  expect(admitted.report.accepted[0].zones).toEqual([]);
  expect(admitted.report.accepted[0].structure).toContain('s de préparation/transition');
  expect(admitted.report.accepted[0].structure).toContain('RPE 7–8');
 });
 it('refuses fabricated, missing or out-of-range measurement evidence',()=>{
  expect(()=>configureMeasuredStrengthTiming(source,{
   ...measured,measuredByBlockPath:{'1.0':measured.measuredByBlockPath['1.0']},
  })).toThrow('v3_strength_measured_timing_missing:2.0');
  expect(()=>configureMeasuredStrengthTiming(source,{
   ...measured,measuredByBlockPath:{...measured.measuredByBlockPath,
     '2.0':{...measured.measuredByBlockPath['2.0'],secondsPerRep:-1}},
  })).toThrow('v3_strength_measurement_out_of_range');
  expect(()=>configureMeasuredStrengthTiming(source,{
   ...measured,measuredByBlockPath:{...measured.measuredByBlockPath,
     unknown:{secondsPerRep:2,setupTransitionSeconds:0,rpeMin:6,rpeMax:7}},
  })).toThrow('v3_strength_unknown_measurement_path');
  expect(buildDetV3ContractFromCatalogue([{
   ...settings,verifiedStrengthTiming:measured,overrides:{'1.0.reps':6},
  }]).report.accepted).toHaveLength(0);
 });
});
