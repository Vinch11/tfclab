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
 it('keeps 99 legacy repetition cards estimated until actual individual exercise and setup seconds exist',()=>{
  expect(evaluateV3Workout(source).status).toBe('estimated');
  const absent=buildDetV3ContractFromCatalogue([settings]);
  expect(absent.report.accepted).toHaveLength(0);
  expect(absent.report.rejected.find(x=>x.id===source.id)?.reason).toContain('v3_timing_is_only_estimated');
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
