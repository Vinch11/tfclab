import {describe,it,expect} from 'vitest';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {reconcileTextPolarizationWithReviewedSources}
  from './v315-reviewed-source-polarization';

const s=(id:string,minutes:number)=>({
  weekNumber:1,weekTheme:'build',phase:'build',dayName:'mardi',
  dayIndex:1,sport:'bike',title:id,details:'Legacy text Z4',
  catalogId:id,durationMin:minutes,isRest:false,zones:['Z4'],
});
const plan=(sessions:unknown[],week=1):ParsedPlan=>({
  title:'synthetic',totalWeeks:1,phases:[],
  weeks:[{weekNumber:week,theme:'build',phase:'build',sessions}],
}) as ParsedPlan;
const native=[
  {code:'polarization',severity:'error',week:1,message:'Native text estimates 48% easy'},
  {code:'lorang_categories',severity:'error',week:1,message:'Independent Lorang failure'},
];
const call=(arg:Partial<Parameters<typeof reconcileTextPolarizationWithReviewedSources>[0]>={})=>
  reconcileTextPolarizationWithReviewedSources({
    plan:plan([s('A',80),s('B',20)]),weekTypes:{1:'load'},
    nativeIssues:native,
    certifiedDose:id=>id==='A'?{low:80,nonLow:0,unknown:0}:
      {low:0,nonLow:20,unknown:0},
    ...arg,
  });
describe('DET V315 — only exact source-zone proof can replace native text estimates',()=>{
  it('keeps historical diagnosis and every independent safety finding',()=>{
    const out=call();
    expect(out.verdict).toBe('replaced_native_text_with_proven_blocks');
    expect(out.weeks[0].lowPct).toBe(80);
    expect(out.issues.some(i=>i.code==='polarization'&&i.severity==='error')).toBe(false);
    expect(out.issues.find(i=>i.code==='lorang_categories')?.severity).toBe('error');
    expect(out.issues.some(i=>
      i.code==='det_native_text_polarization_superseded_by_verified_blocks')).toBe(true);
  });
  it('refuses missing dose, non-conserved dose, or unknown or nonfinite timing',()=>{
    const missing=call({certifiedDose:()=>null});
    expect(missing.verdict).toBe('refused');
    expect(missing.issues).toEqual(native);
    expect(call({certifiedDose:()=>({low:1,nonLow:1,unknown:1})}).reason)
      .toBe('source_zone_minutes_not_conserved');
    expect(call({plan:plan([s('A',Number.NaN)])}).reason)
      .toBe('source_or_duration_not_proven');
  });
  it('refuses true underpolarization or more than 30% unclassified source time',()=>{
    expect(call({certifiedDose:id=>id==='A'?
      {low:50,nonLow:30,unknown:0}:{low:0,nonLow:20,unknown:0}}).reason)
      .toBe('strict_source_zone_target_not_met');
    expect(call({certifiedDose:id=>id==='A'?
      {low:35,nonLow:0,unknown:45}:{low:0,nonLow:20,unknown:0}}).reason)
      .toBe('strict_source_zone_target_not_met');
  });
  it('never replaces errors outside independently proven load weeks',()=>{
    const out=call({nativeIssues:[
      {code:'polarization',severity:'error',week:2,message:'Unproven taper week'},
    ]});
    expect(out.reason).toBe('native_polarization_outside_verified_loading_weeks');
    expect(out.issues[0].code).toBe('polarization');
  });
  it('does not rewrite native diagnostics when no native violation exists',()=>{
    const input=[{code:'rest_day_coherence',severity:'error',week:1,message:'Rest missing'}];
    const out=call({nativeIssues:input});
    expect(out.verdict).toBe('not_needed');
    expect(out.issues).toEqual(input);
  });
});
