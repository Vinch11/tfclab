import {describe,it,expect} from 'vitest';
import {annotateOnlyMeasuredDeloads} from './v39-real-deload';
import type {ParsedPlan,ParsedWeek} from '@/lib/aiPlanParser';

function weeks(mins:Array<number|null>):ParsedPlan{
  const rows=mins.map((duration,index):ParsedWeek=>({
    weekNumber:index+1,theme:'build',phase:'build',
    sessions:[{weekNumber:index+1,weekTheme:'build',phase:'build',dayName:'mardi',
      dayIndex:1,sport:'bike',title:'Ordinary session',details:'',isRest:false,
      ...(duration===null?{}:{durationMin:duration})}],
  }));
  return {title:'synthetic',phases:[],totalWeeks:mins.length,weeks:rows,
    weeklyQuotas:Object.fromEntries(mins.map((_,i)=>[i+1,{
      weekType:i===2?'recovery':'load',
    }])) as ParsedPlan['weeklyQuotas'],
  };
}
describe('V3.9 — deload name requires real measured load reduction',()=>{
  it('labels a programmed recovery only when at least 30% minutes are actually reduced',()=>{
    const plan=weeks([520,500,325,600]);
    const evidence=annotateOnlyMeasuredDeloads(plan);
    expect(evidence[2].verified).toBe(true);
    expect(evidence[2].reductionPct).toBe(35);
    expect(plan.weeks[2].theme).toContain('Décharge vérifiée');
    expect(plan.weeks[3].theme).toBe('build');
  });
  it('does not disguise a 20% reduction or an unmeasured strength slot',()=>{
    const small=weeks([400,400,320]);
    expect(annotateOnlyMeasuredDeloads(small)[2].verified).toBe(false);
    expect(small.weeks[2].theme).toBe('build');
    const unknown=weeks([400,null,200]);
    expect(annotateOnlyMeasuredDeloads(unknown)[2].verified).toBe(false);
    expect(unknown.weeks[2].theme).toBe('build');
  });
  it('does not label a non-recovery week even after a large drop',()=>{
    const plan=weeks([500,200]);
    expect(annotateOnlyMeasuredDeloads(plan)[1].verified).toBe(false);
    expect(plan.weeks[1].theme).toBe('build');
  });
});
