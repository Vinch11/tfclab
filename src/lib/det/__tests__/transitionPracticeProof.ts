import {expect} from 'vitest';
import type {Prepared} from '../../../../supabase/functions/_shared/nolioV2/planDryRun';
import type {V3PlanProposal} from '../appPlanningV3Proposal';
import type {PlanSessionInput} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';

export function verifyTransitionPractice(proposal:V3PlanProposal,full:Prepared,sessions:PlanSessionInput[],continuous=false){
  const proof=proposal.transitionPractice!.map(practice=>{
    const week=proposal.weeks[practice.week-1];
    const session=week.days[practice.dayIndex].sessions[practice.slotIndex];
    expect(session.sport).toBe('brick');
    expect(week.weekType).toBe('load');
    expect(session.components.map(c=>c.sport)).toEqual(['bike','run']);
    const [bike,run]=session.components;
    if(continuous){
      expect(bike.sourceId).toBe('V3P_BIKE_001');
      expect(bike.durationMinutes!).toBeGreaterThanOrEqual(26.5);
      expect(bike.durationMinutes!).toBeLessThanOrEqual(47.5);
      expect(run.sourceId).toBe('V3P_RUN_862');
      expect(run.durationMinutes).toBe(15);
    }else{
      expect(['V3P_BIKE_201','V3P_BIKE_202']).toContain(bike.sourceId);
      expect(run.sourceId).toBe('V3P_RUN_217');
      expect(run.durationMinutes!).toBeGreaterThanOrEqual(12);
      expect(run.durationMinutes!).toBeLessThanOrEqual(17);
      expect(bike.durationMinutes!).toBeGreaterThanOrEqual(15);
      expect(bike.durationMinutes!).toBeLessThanOrEqual(30);
    }
    const date=new Date('2026-11-09T00:00:00Z');
    date.setUTCDate(date.getUTCDate()+7*(practice.week-1)+practice.dayIndex);
    const ymd=date.toISOString().slice(0,10);
    const parent=sessions.find(s=>s.date===ymd&&s.sport==='brick')!;
    const keys=full.ops.filter(o=>o.sessionKey.startsWith(parent.sessionKey+'~')).map(op=>op.sessionKey);
    expect(keys).toEqual([parent.sessionKey+'~bike',parent.sessionKey+'~run']);
    const pair=[bike,run].map(c=>{
      const op=full.ops.find(o=>o.sessionKey===parent.sessionKey+'~'+c.sport)!;
      expect(op.date).toBe(ymd);
      expect(op.body.duration).toEqual({unit:'min',value:c.durationMinutes});
      expect(op.body.sport).toBe(c.sport==='bike'?'spt_BIKE':'spt_RUN');
      expect(op.source.sourceId).toBe(c.sourceId);
      expect(Array.isArray(op.body.workout)&&op.body.workout.length>0).toBe(true);
      return {sport:c.sport,source:c.sourceId,minutes:c.durationMinutes,bodySha256:op.bodySha256};
    });
    return {week:practice.week,day:week.days[practice.dayIndex].day,date:ymd,replaces:practice.originalSport,components:pair,transitionAllowanceMinutes:5};
  });
  expect(proof.length).toBeGreaterThan(0);
  expect(proof[0].week).toBeLessThan(proposal.weeks.find(w=>w.weekType==='taper')!.week);
  return proof;
}
