import {describe,expect,it} from 'vitest';
import type {V3Block,V3Workout} from '../../scripts/library-v3/catalogueRuntime';
import {structuredV3ZoneDose,composeReviewedBrickZoneDose,matchingStructuredDose} from './v310-structured-zone-dose';

const time=(seconds:number,domain:'recovery'|'moderate_lt1'|'mlss'|'vo2max'|null):V3Block=>({
  kind:'time',label:'Measured dose',role:'main',seconds:{min:seconds,base:seconds,max:seconds},domain,
});
const source=(id:string,sport:'bike'|'run'|'swim',blocks:V3Block[]):Pick<V3Workout,'id'|'sport'|'blocks'>=>({id,sport,blocks});

describe('DET V310 — exact source-zone provenance, with no easy-minute invention',()=>{
  it('measures easy and high blocks independently of misleading title/wording',()=>{
    const workout=source('V3P_BIKE_002','bike',[
      time(50*60,'moderate_lt1'),time(10*60,'vo2max'),
    ]);
    const dose=structuredV3ZoneDose(workout,{});
    expect(dose).toMatchObject({low:50,mid:0,high:10,unknown:0,durationMin:60,
      sourceIds:['V3P_BIKE_002']});
    expect(matchingStructuredDose(dose,60)).toEqual(dose);
    expect(matchingStructuredDose(dose,55)).toBeNull();
  });
  it('keeps inter-repetition passive pauses UNKNOWN, never easy',()=>{
    const workout=source('V3P_RUN_005','run',[{
      kind:'repeat',label:'Intervals',count:{min:4,base:4,max:4},betweenSec:60,
      steps:[time(30,'vo2max'),time(90,'recovery')],
    }]);
    const dose=structuredV3ZoneDose(workout,{});
    expect(dose?.high).toBe(2);
    expect(dose?.low).toBe(6);
    expect(dose?.unknown).toBe(3);
    expect(dose?.durationMin).toBe(11);
  });
  it('refuses swimming distance without a supplied domain pace',()=>{
    const workout=source('V3P_SWIM_002','swim',[{
      kind:'distance',label:'Swim interval',role:'main',domain:'mlss',
      meters:{min:100,base:100,max:100},
    }]);
    expect(structuredV3ZoneDose(workout,{})).toBeNull();
    expect(structuredV3ZoneDose(workout,{mlss:100})).toMatchObject({
      low:0,mid:0,high:100/60,durationMin:100/60});
  });
  it('does not convert unknown-domain time into easy time',()=>{
    const dose=structuredV3ZoneDose(source('V3P_BIKE_003','bike',[time(180,null)]),{});
    expect(dose).toMatchObject({low:0,mid:0,high:0,unknown:3});
  });
  it('refuses unmeasured repetition dose and all strength aerobic attestations',()=>{
    const reps:V3Block={kind:'reps',label:'Strength',role:'main',domain:null,
      reps:{min:10,base:10,max:10},secPerRep:2,sides:1};
    expect(structuredV3ZoneDose(source('V3P_RUN_007','run',[reps]),{})).toBeNull();
    expect(structuredV3ZoneDose({id:'V3P_STRENGTH_003',sport:'strength',blocks:[time(900,'recovery')]},{})).toBeNull();
  });
  it('decomposes a fully reviewed brick and leaves the transition unknown',()=>{
    const bike=structuredV3ZoneDose(source('V3P_BIKE_002','bike',[time(3600,'moderate_lt1')]),{});
    const run=structuredV3ZoneDose(source('V3P_RUN_001','run',[time(1200,'recovery')]),{});
    expect(composeReviewedBrickZoneDose(bike,run,300,85)).toMatchObject({
      low:80,mid:0,high:0,unknown:5,durationMin:85,
      sourceIds:['V3P_BIKE_002','V3P_RUN_001']});
    expect(composeReviewedBrickZoneDose(bike,run,300,80)).toBeNull();
    expect(composeReviewedBrickZoneDose(bike,null,300,85)).toBeNull();
  });
});
