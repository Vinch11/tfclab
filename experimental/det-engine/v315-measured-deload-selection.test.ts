import {describe,it,expect} from 'vitest';
import {measuredRecoveryCeiling,measuredTrainingMinutes}
  from './v315-measured-deload-selection';
import type {ParsedSession} from '@/lib/aiPlanParser';
const s=(durationMin?:number):ParsedSession=>({
  weekNumber:1,weekTheme:'build',phase:'build',dayName:'lundi',
  dayIndex:0,sport:'bike',title:'Approved source',details:'Z2',
  isRest:false,...(durationMin===undefined?{}:{durationMin}),
});
describe('V315 — measured deload hard cap before accepting a week',()=>{
  it('uses the entire previous verified week, not the scheduled label',()=>{
    expect(measuredTrainingMinutes([s(120),s(80)])).toBe(200);
    expect(measuredRecoveryCeiling(200)).toBeCloseTo(140);
    expect(measuredRecoveryCeiling(0)).toBeNull();
  });
  it('does not count an unknown strength duration as zero-minute load',()=>{
    const strength={...s(),sport:'strength' as const};
    expect(measuredTrainingMinutes([s(120),strength])).toBeNull();
    expect(measuredRecoveryCeiling(null)).toBeNull();
    expect(measuredTrainingMinutes([s(Number.NaN)])).toBeNull();
  });
  it('cannot manufacture a recovery when all sessions are rest or unknown',()=>{
    expect(measuredTrainingMinutes([{...s(0),isRest:true}])).toBeNull();
    expect(measuredTrainingMinutes([s()])).toBeNull();
  });
});