import {describe,expect,it} from 'vitest';
import type {ParsedSession} from '@/lib/aiPlanParser';
import {assessStrictNativePolarizationTarget,optimisticNativeLowShareUpperBound,nativeZoneDoseForCandidate} from './v39-strict-native-polarization-target';
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
  it('proves impossibility only when the MOST OPTIMISTIC valid slot combinations are still under 75%',()=>{
    const hard={low:0,nonLow:40,unknown:0};
    const moderate={low:20,nonLow:20,unknown:0};
    const easy={low:60,nonLow:0,unknown:0};
    const impossible=optimisticNativeLowShareUpperBound([hard],[[moderate],[hard]]);
    expect(impossible.provablyBelow75).toBe(true);
    expect(impossible.upperPct).toBeCloseTo(20/120*100);
    const possible=optimisticNativeLowShareUpperBound([hard],[[easy],[easy]]);
    expect(possible.provablyBelow75).toBe(false);
    expect(possible.upperPct).toBe(75);
  });
  it('allows an optimistic upper bound with mutually exclusive choices, never claiming actual feasibility',()=>{
    const hard={low:0,nonLow:80,unknown:0};
    const easy={low:160,nonLow:0,unknown:0};
    const bounded=optimisticNativeLowShareUpperBound([],[[hard,easy],[hard,easy]]);
    expect(bounded.upperPct).toBe(100);
    expect(bounded.provablyBelow75).toBe(false);
  });
  it('reports unknown domain timing without an impossible claim',()=>{
    const x=optimisticNativeLowShareUpperBound([],[[null]]);
    expect(x.unmeasuredDomain).toBe(true);
    expect(x.provablyBelow75).toBe(false);
  });
  it('does not invent aerobic zone minutes for unmeasured strength counted by frequency',()=>{
    const strength={...session('Z2',20),sport:'strength' as const,
      title:'Force',details:'FRÉQUENCE UNIQUEMENT : durée non mesurée',
      durationMin:undefined,zones:[]};
    expect(nativeZoneDoseForCandidate(strength)).toEqual({low:0,nonLow:0,unknown:0});
    expect(assessStrictNativePolarizationTarget([session('Z2',80),session('Z4',20),strength])
      .admissible).toBe(true);
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
