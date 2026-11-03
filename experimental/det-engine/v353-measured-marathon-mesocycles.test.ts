import {describe,expect,it} from 'vitest';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {proposeMeasuredMarathonMesocycles} from './v353-measured-marathon-mesocycles';

function scenario(horizon:16|40){
  const buildEnd=horizon===40?34:12;
  const peakEnd=horizon===40?38:14;
  const weeks=Array.from({length:horizon},(_,index)=>{
    const n=index+1;
    const phase=n<=5?'base':n<=buildEnd?'build':n<=peakEnd?'peak':'taper';
    const durationMin=n%4===0?60:120;
    return {weekNumber:n,phase,theme:phase,sessions:[{
      weekNumber:n,weekTheme:phase,phase,dayIndex:1,dayName:'mardi',
      title:'Existing reviewed dose — synthetic only',details:'',
      sport:'run',catalogId:'V3P_RUN_001',durationMin,isRest:false,
    }]};
  });
  const weeklyQuotas=Object.fromEntries(weeks.map(week=>[
    week.weekNumber,{weekType:week.weekNumber%4===0?'recovery':'load'},
  ]));
  return {weeks,weeklyQuotas,phases:[]} as unknown as ParsedPlan;
}
describe('V3.53 — real measured marathon mesocycles, no phase-label shortcut',()=>{
  it.each([16,40] as const)('%i-week Build is partitioned at measured deloads',horizon=>{
    const plan=scenario(horizon);
    const original=structuredClone(plan.weeks);
    const proof=proposeMeasuredMarathonMesocycles(plan);
    expect(proof.verified).toBe(true);
    expect(proof.refusals).toEqual([]);
    expect(proof.originallyLongBuildStreaks).toHaveLength(1);
    expect(proof.mesocycles.every(m=>m.weeks>=2&&m.weeks<=6)).toBe(true);
    expect(proof.mesocycles.slice(0,-1).every(m=>
      m.recoveryWeek===m.last&&(m.reductionPct??0)>=30)).toBe(true);
    expect(proof.projectedPhases.filter(p=>p.name.startsWith('build - mesocycle')))
      .toHaveLength(horizon===40?8:2);
    expect(proof.projectedPhases[0].name).toBe('base');
    expect(proof.projectedPhases.at(-1)?.name).toBe('taper');
    expect(plan.weeks).toEqual(original);
    expect(plan.phases).toEqual([]);
    expect(proof.scientificAttestation).toBe(false);
  });
  it('refuses a nominal recovery without a real 30% dose reduction',()=>{
    const plan=scenario(40);
    plan.weeks[7].sessions[0].durationMin=120; // S8; first needed cut
    const proof=proposeMeasuredMarathonMesocycles(plan);
    expect(proof.verified).toBe(false);
    expect(proof.refusals.some(r=>r.startsWith('no_measured_recovery_boundaries')))
      .toBe(true);
    expect(proof.projectedPhases).toEqual([]);
  });
  it('refuses missing week types rather than inventing recovery',()=>{
    const plan=scenario(40);
    delete (plan as {weeklyQuotas?:unknown}).weeklyQuotas;
    const proof=proposeMeasuredMarathonMesocycles(plan);
    expect(proof.verified).toBe(false);
    expect(proof.refusals).toContain('original_week_type_evidence_missing');
  });
  it('refuses a broken weekly chronology before any block labelling',()=>{
    const plan=scenario(16);
    plan.weeks[3].weekNumber=22;
    expect(proposeMeasuredMarathonMesocycles(plan).refusals)
      .toContain('non_contiguous_or_missing_weeks');
  });
});
