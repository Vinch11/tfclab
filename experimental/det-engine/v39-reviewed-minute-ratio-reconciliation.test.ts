import {describe,it,expect} from 'vitest';
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import type {RepairWorkoutMetadata} from '../../supabase/functions/_shared/repairSportingEquivalence';
import {reconcileNativeTriathlonCountRatio} from './v39-reviewed-minute-ratio-reconciliation';

const session=(sport:ParsedSession['sport'],minutes:number,id?:string):ParsedSession=>({
  weekNumber:1,weekTheme:'base',phase:'base',dayName:'mardi',
  dayIndex:1,sport,title:'source-backed',details:'Z2 20min',
  durationMin:minutes,isRest:false,zones:['Z2'],
  ...(id?{catalogId:id}:{}),
});
const plan=(sessions:ParsedSession[]):ParsedPlan=>({
  title:'synthetic',phases:[],totalWeeks:1,
  weeks:[{weekNumber:1,theme:'base',phase:'base',sessions}],
});
const countIssues=[
  {code:'sport_ratio',severity:'error',message:'Native swim 40% count-only'},
  {code:'rest_day_coherence',severity:'warning',message:'Independent rest finding'},
];
const noBricks=[
  session('swim',18),session('bike',50),session('run',32),
];
const call=(args:Partial<Parameters<typeof reconcileNativeTriathlonCountRatio>[0]>={})=>
  reconcileNativeTriathlonCountRatio({
    plan:plan(noBricks),weekTypes:{1:'load'},objective:'IM',
    verifiedCompositions:[],nativeIssues:countIssues,quotaIssues:[],...args,
  });

describe('DET V39 — fail-closed reviewed-minute replacement of defective count ratio',()=>{
  it('replaces only the misleading native COUNT ratio when all strict MINUTE targets pass',()=>{
    const out=call();
    expect(out.verdict).toBe('replaced_count_only_with_proven_minutes');
    expect(out.nativeCountIssueCount).toBe(1);
    expect(out.ratios).toEqual({swim:18,bike:50,run:32});
    expect(out.issues.find(i=>i.code==='sport_ratio')).toBeUndefined();
    const historical=out.issues.find(i=>i.code==='det_superseded_count_sport_ratio_diagnostic');
    expect(historical?.severity).toBe('warning');
    expect(historical?.message).toContain('historicalSeverity');
    expect(out.issues.find(i=>i.code==='det_strict_minute_sport_ratio_verified')).toBeDefined();
    expect(out.issues.find(i=>i.code==='rest_day_coherence')?.message).toBe('Independent rest finding');
  });
  it('refuses when even one discipline is out of strict minute bounds',()=>{
    const out=call({plan:plan([session('swim',14),session('bike',55),session('run',31)])});
    expect(out.verdict).toBe('refused');
    expect(out.reason).toBe('strict_sport_minutes_out_of_bounds');
    expect(out.issues.find(i=>i.code==='sport_ratio')?.severity).toBe('error');
  });
  it('preserves native blocker when a brick cannot be split by approved exact source',()=>{
    const out=call({plan:plan([...noBricks,session('brick',35,'LEGACY_BRICK')])});
    expect(out.verdict).toBe('refused');
    expect(out.reason).toBe('unresolved_endurance_brick_or_empty_minutes');
    expect(out.issues.some(i=>i.code==='sport_ratio')).toBe(true);
  });
  it('can reconcile an exactly verified two-component brick, excluding transition from endurance',()=>{
    const structure='Vélo 20 min : Z2 | Transition 5 min | Course 10 min : Z2';
    const approved={
      id:'V3B_SYNTHETIC',sport:'brick',structure,details:structure,
      durationMin:[35,35],tags:['two-reviewed-components',
        'v3-v32-experimental-composition','bike-source:V3P_BIKE_001',
        'run-source:V3P_RUN_001'],
    } as unknown as RepairWorkoutMetadata;
    const brick={...session('brick',35,approved.id),details:structure};
    const o=call({objective:'703',
      plan:plan([session('swim',18),session('bike',25),session('run',30),brick]),
      verifiedCompositions:[approved]});
    expect(o.verdict).toBe('replaced_count_only_with_proven_minutes');
    expect(o.ratios!.swim).toBeCloseTo(100*18/103);
    expect(o.ratios!.bike).toBeCloseTo(100*45/103);
    expect(o.ratios!.run).toBeCloseTo(100*40/103);
    const tampered=call({objective:'703',
      plan:plan([session('swim',18),session('bike',25),session('run',30),
        {...brick,details:'Bike and run, unverified'}]),
      verifiedCompositions:[approved]});
    expect(tampered.verdict).toBe('refused');
    expect(tampered.reason).toBe('source_dose_or_brick_timeline_unverifiable');
  });
  it('does not override a quota floor/range problem or coach sport restriction',()=>{
    expect(call({quotaIssues:[{code:'quota_floor_violation',severity:'critical'}]}).verdict).toBe('refused');
    expect(call({quotaIssues:[{code:'quota_range_drift',severity:'warning'}]}).verdict).toBe('refused');
    expect(call({coachConstraintsText:'pas de natation'}).verdict).toBe('refused');
  });
  it('refuses missing exact endurance duration, no loading weeks and missing phase type',()=>{
    const bad={...session('bike',50),durationMin:undefined};
    expect(call({plan:plan([session('swim',18),bad,session('run',32)])}).reason)
      .toBe('source_dose_or_brick_timeline_unverifiable');
    expect(call({weekTypes:{1:'recovery'}}).reason).toBe('no_loading_weeks');
    expect(call({weekTypes:{}}).reason).toBe('week_type_missing');
  });
  it('retains native plan intact if there was no native count-ratio finding',()=>{
    const out=call({nativeIssues:[{code:'polarization',severity:'error'}]});
    expect(out.verdict).toBe('not_needed');
    expect(out.issues).toEqual([{code:'polarization',severity:'error'}]);
  });
});
