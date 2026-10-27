import {expect,it} from 'vitest';
import {computeWeekQuotaEntry} from '@/engines/plan/sessionSizingMatrix';
import {calendarCapacityEvidence} from '../residualEvidence';

it.each(['5K','10K','Semi','Marathon'])('%s: explains an explicit one-session daily limit without raising it',objective=>{
 const quota=computeWeekQuotaEntry(objective,'competitor',0,'load',false,{maxSessionsPerDay:1})!.quota;
 const before=structuredClone(quota);
 const proof=calendarCapacityEvidence(quota,6);
 expect(proof.admissibleByNecessaryBound).toBe(false);
 expect(proof.branches.every(b=>b.minimum>=7&&b.rawCapacity===6&&b.reasons.includes('daily_session_capacity'))).toBe(true);
 expect(quota).toEqual(before);
});
it('does not confuse a restrictive coach agenda with a contradiction in a feasible running quota',()=>{
 const quota=computeWeekQuotaEntry('10K','competitor',0,'load',false)!.quota;
 expect(calendarCapacityEvidence(quota,6).admissibleByNecessaryBound).toBe(true);
 expect(calendarCapacityEvidence({...quota,maxSessionsPerDay:1},6).admissibleByNecessaryBound).toBe(false);
});
it('explains mutually exclusive standalone running and brick days even when raw session capacity fits',()=>{
 const quota=computeWeekQuotaEntry('703','competitor',14,'load',false,{bannedSports:['swim']})!.quota;
 const proof=calendarCapacityEvidence(quota,6);
 expect(proof.admissibleByNecessaryBound).toBe(false);
 expect(proof.branches.every(b=>b.reasons.includes('run_plus_brick_days'))).toBe(true);
});
it('distinguishes a total-quota contradiction from a genuine daily-capacity refusal',()=>{
 const quota=computeWeekQuotaEntry('10K','competitor',0,'load',false)!.quota;
 const proof=calendarCapacityEvidence({...quota,totalSessions:{min:3,max:3}},6);
 expect(proof.admissibleByNecessaryBound).toBe(false);
 expect(proof.branches[0].reasons).toContain('minimum_above_total_max');
 expect(proof.branches[0].reasons).not.toContain('daily_session_capacity');
});
