import {describe,expect,it} from 'vitest';
import type {ParsedSession} from '@/lib/aiPlanParser';
import {assessStrictNativePolarizationTarget} from './v39-strict-native-polarization-target';
const session=(zone:'Z2'|'Z4',minutes:number):ParsedSession=>({
  weekNumber:1,weekTheme:'build',phase:'build',dayName:'mardi',dayIndex:1,
  sport:'bike',title:zone,details:minutes+' min '+zone,durationMin:minutes,
  isRest:false,zones:[zone],
});
describe('DET V39 — strict native low-zone target is selection-only and conservative',()=>{
  it('allows genuinely explicit 75% low from actual session doses',()=>{
    const r=assessStrictNativePolarizationTarget([
      session('Z2',60),session('Z4',20),session('Z2',20),
    ]);
    expect(r.admissible).toBe(true);
    expect(r.lowPctOfClassifiable).toBe(80);
  });
  it('rejects 60% low against the unchanged strict 75% target',()=>{
    const r=assessStrictNativePolarizationTarget([
      session('Z2',60),session('Z4',40),
    ]);
    expect(r.admissible).toBe(false);
    expect(r.reason).toBe('native_low_intensity_below_strict_75_pct');
  });
  it('refuses unknown duration rather than assigning easy minutes',()=>{
    const unknown={...session('Z2',40),durationMin:undefined,
      title:'Unclassified protocol',details:'No timing available',zones:[]};
    expect(assessStrictNativePolarizationTarget([unknown]).reason)
      .toBe('training_duration_not_verified');
  });
  it('does not bypass unknown duration merely because another workout is Z2',()=>{
    const unknown={...session('Z4',40),durationMin:undefined,
      title:'Opaque source',details:'Unknown time',zones:[]};
    expect(assessStrictNativePolarizationTarget([session('Z2',60),unknown]).admissible)
      .toBe(false);
  });
});
