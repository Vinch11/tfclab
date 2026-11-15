import { describe, it, expect } from 'vitest';
import { applyLongRidePhasePolicy, phasePosition, protectDedicatedRideQuota } from '../longRidePolicy';
import { computeWeekQuotaEntry } from '../sessionSizingMatrix';
import { buildWeeklySlotLayout } from '../weeklySlotLayout';
import { planningFeasibility } from '../../../../supabase/functions/_shared/planningFeasibility';
import { validateWeeklyQuotas } from '@/lib/plan/validateWeeklyQuotas';

const policy = (objective = 'Ironman', phase: 'base'|'build'|'peak' = 'build', priorities = ['Durabilité'], weekType: 'load'|'recovery'|'taper' = 'load') => {
  const entry = computeWeekQuotaEntry(objective, 'competitor', 17.5, weekType, false, { strengthSessionsPerWeek: 2, maxSessionsPerDay: 3 });
  if (!entry) throw Error('Missing quota');
  return { ...entry, floors: applyLongRidePhasePolicy(entry.floors, { objective, phase, priorities, weekType, phaseWeek: 6, phaseWeeks: 6 }) };
};

describe('long bike rides by phase and workstream', () => {
  it.each([['base',210],['build',300],['peak',330]] as const)('IM %s endurance workstream reaches %i minutes', (phase, minutes) => {
    expect(policy('Ironman',phase).floors.slLongRideMin).toBe(minutes);
  });
  it.each([['base',150],['build',210],['peak',240]] as const)('70.3 %s stays within its own range (%i)', (phase,minutes) => {
    expect(policy('Ironman 70.3',phase).floors.slLongRideMin).toBe(minutes);
  });
  it('threshold-first build reserves 255 minutes instead of 300', () => {
    expect(policy('Ironman','build',['FTP']).floors.slLongRideMin).toBe(255);
  });
  it('recovery reduces the same build reference to 210 minutes', () => {
    expect(policy('Ironman','build',['Durabilité'],'recovery').floors.slLongRideMin).toBe(210);
  });
  it.each(['Ironman','Ironman 70.3'])('recovery protects a standalone ride instead of an obligatory brick for %s', objective=>{
    const entry=policy(objective,'build',['Durabilité'],'recovery');
    const quota=protectDedicatedRideQuota(entry.quota,entry.floors);
    const layout=buildWeeklySlotLayout(quota,entry.floors,'recovery');
    expect(layout.days.flatMap(d=>d.slots).filter(s=>s.sport==='bike'&&s.isLongSession)).toHaveLength(1);
    expect(quota.totalSessions).toEqual(entry.quota.totalSessions);
    expect(planningFeasibility(quota,layout)).toEqual([]);
  });
  it('taper retains existing activations, without a mandatory long ride', () => {
    expect(policy('Ironman','build',[],'taper').floors.longRideWeekly).toBe(false);
    expect(policy('Ironman','build',[],'taper').floors.dedicatedLongRide).toBeUndefined();
  });
  it.each(['5K','10K','Semi','Marathon','Triathlon Sprint'])('does not transfer long-course references into %s', objective => {
    const raw = computeWeekQuotaEntry(objective,'competitor',17.5,'load',false);
    if(!raw) throw Error('Missing quota');
    expect(applyLongRidePhasePolicy(raw.floors,{objective,phase:'peak',phaseWeek:4,phaseWeeks:4,weekType:'load'})).toBe(raw.floors);
  });
  it('leaves trail, running maintenance and LCW untouched', () => {
    const floors = { longRideWeekly:true, slLongRideMin:120, minStrengthPerWeek:1 };
    for(const extra of [{objective:'Trail montagne'},{objective:'Ironman',isLCW:true},{objective:'Ironman',isMaintenance:true}]) {
      expect(applyLongRidePhasePolicy(floors,{...extra,phase:'peak',phaseWeek:4,phaseWeeks:4,weekType:'load'})).toBe(floors);
    }
  });
  it.each(['Ironman','Ironman 70.3'])('reserves a standalone long ride without adding sessions for %s', objective => {
    const entry = policy(objective);
    const layout = buildWeeklySlotLayout(entry.quota,entry.floors,'load');
    expect(layout.days.flatMap(d=>d.slots).filter(s=>s.sport==='bike'&&s.isLongSession)).toHaveLength(1);
    expect(planningFeasibility(entry.quota,layout)).toEqual([]);
    const sessions=layout.days.flatMap(d=>d.slots.map(s=>({sport:s.sport,dayName:d.dayName,isRest:false,durationMin:s.sport==='brick'?400:s.sport==='bike'?90:s.minDurationMin??30})));
    const failures=validateWeeklyQuotas({weeks:[{weekNumber:1,sessions}]} as never,{1:entry});
    expect(failures.some(i=>i.code==='quota_floor_violation'&&i.reason.includes('vélo autonome'))).toBe(true);
    const bike=sessions.find(s=>s.sport==='bike');
    if(!bike)throw Error('Missing bike');
    bike.durationMin=entry.floors.slLongRideMin??0;
    expect(validateWeeklyQuotas({weeks:[{weekNumber:1,sessions}]} as never,{1:entry}).some(i=>i.reason.includes('vélo autonome'))).toBe(false);
  });
  it('uses the global phase position for a regenerated week', () => {
    expect(phasePosition({20:'build',21:'build',22:'build',23:'peak'},22)).toEqual({phase:'build',phaseWeek:3,phaseWeeks:3});
  });
});