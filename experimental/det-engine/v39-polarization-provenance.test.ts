import {describe,expect,it} from 'vitest';
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import {diagnoseNativePolarizationWeeks} from './v39-polarization-provenance';

const sess=(title:string,details:string,durationMin?:number):ParsedSession=>({
  weekNumber:1,weekTheme:'build',phase:'build',dayName:'mardi',
  dayIndex:1,sport:'run',title,details,isRest:false,
  ...(durationMin===undefined?{}:{durationMin}),
});
const plan=(sessions:ParsedSession[]):ParsedPlan=>({
  title:'synthetic',phases:[],totalWeeks:1,
  weeks:[{weekNumber:1,theme:'build',phase:'build',sessions}],
});
describe('DET V39 — native polarization source provenance never becomes a sport-safe certificate',()=>{
  it('attributes the exact selected source and native time estimate to one flagged week',()=>{
    const p=plan([
      {...sess('Endurance Z2','60 min Z2',60),catalogId:'EASY_A'},
      {...sess('VO2 Z5','40 min Z5',40),catalogId:'HARD_B'},
    ]);
    const out=diagnoseNativePolarizationWeeks(p,[1]);
    expect(out).toHaveLength(1);
    expect(out[0].observedSessions.map(s=>s.id)).toContain('HARD_B');
    expect(out[0].observedSessions.reduce((n,s)=>n+
      s.lowMin+s.midMin+s.highMin+s.unknownMin,0)).toBeCloseTo(100);
    expect(out[0].provenance).toBe('native_text_zone_estimate_only_not_independent_proof');
  });
  it('never fabricates duration or zone time when a source has neither',()=>{
    const out=diagnoseNativePolarizationWeeks(plan([sess('Opaque protocol','unknown blocks')]),[1]);
    expect(out[0].observedSessions[0].durationMin).toBe(null);
    expect(out[0].lowPctOfClassifiable).toBe(null);
    expect(out[0].unknownPctOfTotal).toBe(null);
  });
  it('does not claim a passing week or create extra sessions',()=>{
    const p=plan([sess('Easy','60 min Z2',60)]);
    expect(diagnoseNativePolarizationWeeks(p,[2])).toEqual([]);
    expect(p.weeks[0].sessions).toHaveLength(1);
  });
});
