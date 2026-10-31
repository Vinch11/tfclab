/**
 * V39.1 — A different physiological limiter must produce a different ACTUAL
 * selected key session for an otherwise identical synthetic athlete.
 * No production athlete, no inferred anchors, no publication.
 */
import {afterEach,describe,expect,it,vi} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {constructDeterministicPlan} from './engine';
import {buildDetV3ContractFromCatalogue} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';
import {v3FullCatalogue} from '../../scripts/library-v3/catalogueRuntime';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import type {DaySlot} from '@/engines/plan/weeklySlotLayout';

const candidates=[
  'V3P_RUN_001','V3P_RUN_002','V3P_RUN_013','V3P_RUN_021',
  'V3P_RUN_023','V3P_RUN_024','V3P_RUN_025','V3P_RUN_026',
  'V3P_RUN_027','V3P_RUN_028','V3P_RUN_029',
  'V3P_RUN_008','V3P_RUN_009',
  // Preserve the two mandatory strength slots; no fabricated zero-minute sessions.
  'V3P_STRENGTH_101','V3P_STRENGTH_102','V3P_STRENGTH_103',
  'V3P_STRENGTH_104','V3P_STRENGTH_105','V3P_STRENGTH_106',
  'V3P_STRENGTH_107','V3P_STRENGTH_108','V3P_STRENGTH_109',
  'V3P_STRENGTH_110','V3P_STRENGTH_111','V3P_STRENGTH_112',
  'V3P_STRENGTH_113','V3P_STRENGTH_114','V3P_STRENGTH_115',
] as const;
const sourceMap=new Map(v3FullCatalogue.workouts.map(w=>[w.id,w]));
const targeted=['V3P_RUN_008','V3P_RUN_009'] as const;
const limiterScenarios=[
  {key:'fractional_utilization',expected:'V3P_RUN_008',other:'V3P_RUN_009'},
  {key:'aerobic_ceiling',expected:'V3P_RUN_009',other:'V3P_RUN_008'},
] as const;
const athleteId='synthetic-v39-same-fitness';
function reviews(){
  return candidates.map(id=>{
    const context=syntheticV3SportingContext(id);
    if(!('sportingReview' in context))throw Error('synthetic_context_missing:'+id);
    return {
      id, objective:'10K', athleteLevel:'trained' as const,
      athleteLevelSource:'manual' as const, individualCoachApproval:true as const,
      preferReviewedV3:true as const, allPrerequisitesChecked:true as const,
      expectedAthleteId:athleteId,
      sportingReview:{...context.sportingReview,athleteId},
      athleteAnchors:syntheticV3ReviewAnchors(),
      // Same 60-minute key-slot dose: adjust only source-bounded easy warm-up/
      // cooldown; threshold and VO2 work-set repetition counts remain unchanged.
      ...(id==='V3P_RUN_008'||id==='V3P_RUN_009'?{targetDurationMin:60}:{}),
    };
  });
}
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
describe('V39 — same athlete, opposed physiological limiter, genuine DET key-session choice',()=>{
  it('records the complete cohort outcome and requires a changed real-world key-slot choice',()=>{
    vi.useFakeTimers({toFake:['Date']});
    vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
    const prepared=preparePrevalidationFixture('B-10K',{
      objective:'10K',trainingLevel:'trained',ambition:'competitor',
      planStartDate:'2026-10-26',raceDate:'2027-01-03',
      raceGoals:[{objective:'10K',raceDate:'2027-01-03',priority:'A'}],
      weeklyHours:8,sessionsPerWeek:7,maxSessionsPerDay:2,maxDoubleDaysPerWeek:2,
    });
    const outcomes=[];
    for(const scenario of limiterScenarios){
      const cfg={...prepared.planConfig,identifiedLimitersRaw:[scenario.key]};
      const {contract,report}=buildDetV3ContractFromCatalogue(reviews());
      expect(report.accepted.map(w=>w.id).sort()).toEqual([...candidates].sort());
      const p=prepareGenerationContracts(prepared.athleteData,cfg,{rotationSeed:0});
      contract.adapt(p,cfg);
      console.info('DET_V39_WEEK1_QUOTA',JSON.stringify({
        limiter:scenario.key,quota:p.weeklyQuotas[1]?.quota,
        slots:p.weeklyQuotas[1]?.layout?.days.map(d=>({
          day:d.dayName,slots:d.slots.map(x=>({sport:x.sport,isKey:x.isKeySession})),
        })),
      }));
      const cards=new Map(report.accepted.map(c=>[c.id,c]));
      const buildKeyContext={week:4,phase:'build',weekType:'load',dayIndex:2,
        slot:{sport:'run',isKeySession:true,isLongSession:false} as DaySlot};
      const target=cards.get(scenario.expected)!;
      const other=cards.get(scenario.other)!;
      expect(contract.rankCandidate?.(target,buildKeyContext)).toBe(-3);
      expect(contract.rankCandidate?.(other,buildKeyContext)).toBe(-1);
      const actual=constructDeterministicPlan(prepared.athleteData,cfg,
        {maxNodes:40000,maxMilliseconds:10000},contract);
      const selected=actual.trace.filter(t=>targeted.includes(t.id as typeof targeted[number]));
      const keySessions=actual.candidate?.weeks.flatMap(w=>w.sessions.filter(s=>s.isKeySession)
        .map(s=>({week:w.weekNumber,day:s.dayName,id:s.catalogId,sport:s.sport,duration:s.durationMin})))??[];
      const blockers=actual.issues.filter(i=>['critical','error','blocking'].includes(i.severity));
      console.info('DET_V39_LIMITER_ACTUAL_CHOICE',JSON.stringify({
        limiter:scenario.key,expected:scenario.expected,
        technicallyConstructed:actual.technicallyConstructed,
        constraintsSatisfied:actual.constraintsSatisfied,
        selectedSourceIds:selected.map(t=>({id:t.id,week:t.week,day:t.day})),
        keySessions,warnings:actual.issues.filter(i=>i.severity==='warning').map(i=>i.code),blocking:blockers.map(x=>({code:x.code,week:x.week,message:x.message?.slice(0,2600)})),
      }));
      expect(actual.humanReviewRequired).toBe(true);
      expect(actual.sportingRelevance).toBe('not_attested');
      expect(actual.technicallyConstructed).toBe(true);
      // Hard safety is not silently passed: a candidate is conformant ONLY if no blockers.
      expect(actual.constraintsSatisfied).toBe(blockers.length===0);
      // Selection must occur in a real matching key slot, not just a sort helper.
      outcomes.push({key:scenario.key,selected,keys:keySessions});
    }
    const first=new Set(outcomes[0].selected.map(s=>s.id));
    const second=new Set(outcomes[1].selected.map(s=>s.id));
    const firstExpected=outcomes[0].selected.some(s=>s.id==='V3P_RUN_008');
    const secondExpected=outcomes[1].selected.some(s=>s.id==='V3P_RUN_009');
    const oppositeSelectionDiff=outcomes[0].keys.some(a=>a.id==='V3P_RUN_008'&&
      outcomes[1].keys.some(b=>b.week===a.week&&b.day===a.day&&b.id==='V3P_RUN_009'));
    console.info('DET_V39_LIMITER_ACTUAL_CONTRAST',JSON.stringify({
      firstExpected,secondExpected,
      thresholdOnly:[...first].filter(x=>!second.has(x)),
      aerobicOnly:[...second].filter(x=>!first.has(x)),
      sameWeekDifferentPhysiologicalKey:oppositeSelectionDiff,
    }));
    expect(firstExpected).toBe(true);
    expect(secondExpected).toBe(true);
    expect(oppositeSelectionDiff).toBe(true);
  });
});