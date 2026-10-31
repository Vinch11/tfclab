/** V38: scenario-specific selection evidence, never a production or scientific attestation. */
import {afterEach,describe,expect,it,vi} from 'vitest';
import {planningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
import {constructDeterministicPlan} from './engine';
import {buildDetV3ContractFromCatalogue} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';
import {v3FullCatalogue} from '../../scripts/library-v3/catalogueRuntime';

const runnerIds=[
  'V3P_RUN_001','V3P_RUN_002','V3P_RUN_013','V3P_RUN_021',
  'V3P_RUN_023','V3P_RUN_024','V3P_RUN_025','V3P_RUN_026',
  'V3P_RUN_027','V3P_RUN_028','V3P_RUN_029',
] as const;
const sourceById=new Map(v3FullCatalogue.workouts.map(w=>[w.id,w]));
const blocking=(severity:string)=>['error','critical','blocking'].includes(severity);
function runnerReview(id:string,athleteId:string,thresholdPace:number) {
  const fixture=syntheticV3SportingContext(id);
  if(!('sportingReview' in fixture))throw Error('missing_synthetic_fixture:'+id);
  return {
    id,objective:'10K',athleteLevel:'light' as const,athleteLevelSource:'manual' as const,
    allPrerequisitesChecked:true as const,individualCoachApproval:true as const,
    preferReviewedV3:true as const,
    athleteAnchors:{...syntheticV3ReviewAnchors(),runThresholdPaceSecPerKm:thresholdPace},
    expectedAthleteId:athleteId,
    sportingReview:{...fixture.sportingReview,athleteId},
  };
}
const planFixture=()=>{
  const spec=planningCases().find(c=>c.objective==='10K'&&c.level==='light'&&
    c.ambition==='finisher'&&c.load==='unknown');
  if(!spec)throw Error('missing_10k_fixture');
  return preparePlanningCaseContext({...spec,constraints:'unrestricted',intermediate:false}).prepared;
};
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});

describe('DET V38 — named synthetic athlete, selected dose, actual week and no hidden safety waiver',()=>{
  it('builds two real 11-week 10K calendars with athlete-specific intensities, admissible phases and all native constraints',()=>{
    vi.useFakeTimers({toFake:['Date']});
    vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
    const fetchGuard=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{
      throw Error('DET_V38_OFFLINE_ONLY');
    });
    const cases=[
      {id:'synthetic-v38-runner-a',pace:240},
      {id:'synthetic-v38-runner-b',pace:300},
    ];
    const observed:Array<{id:string;pace:number;selected:Map<string,string>;weeks:Set<number>}>=[];
    for(const athleteCase of cases) {
      const prepared=planFixture();
      const athlete={...prepared.athleteData,nom:athleteCase.id,
        paceThresholdSecPerKm:athleteCase.pace};
      const config={...prepared.planConfig,identifiedLimitersRaw:['running_impact_tolerance']};
      const {report,contract}=buildDetV3ContractFromCatalogue(
        runnerIds.map(id=>runnerReview(id,athleteCase.id,athleteCase.pace)));
      expect(report.accepted).toHaveLength(runnerIds.length);
      expect(report.rejected).toHaveLength(800-runnerIds.length);
      const result=constructDeterministicPlan(athlete,config,
        {maxNodes:20000,maxMilliseconds:5000},contract);
      const approved=new Map(report.accepted.map(c=>[c.id,c]));
      const trace=result.trace.filter(t=>approved.has(t.id));
      const sessions=result.candidate?.weeks.flatMap(week=>week.sessions.filter(s=>
        approved.has(s.catalogId??'')).map(s=>({week:week.weekNumber,phase:week.phase,session:s})))??[];
      const byWeek=new Set(trace.map(t=>t.week));
      const allBlocking=result.issues.filter(issue=>blocking(issue.severity));
      console.info('DET_V38_10K_ATHLETE_WEEK_EVIDENCE',JSON.stringify({
        syntheticAthlete:athleteCase.id,thresholdPaceSecPerKm:athleteCase.pace,
        constructed:result.technicallyConstructed,conformant:result.constraintsSatisfied,
        weeks:result.candidate?.weeks.length,selected:trace.length,
        weeksWithSelectedV3:[...byWeek].sort((a,b)=>a-b),
        sources:trace.map(t=>({id:t.id,week:t.week,day:t.day,minutes:t.duration})),
        blocking:allBlocking.map(x=>({code:x.code,week:x.week})),
        releaseAttested:false,
      }));
      expect(result.technicallyConstructed).toBe(true);
      expect(result.constraintsSatisfied).toBe(true);
      expect(allBlocking).toEqual([]);
      expect(result.candidate?.weeks).toHaveLength(11);
      expect(trace.length).toBeGreaterThan(0);
      expect(byWeek.size).toBeGreaterThanOrEqual(8);
      expect(sessions.length).toBe(trace.length);
      for(const {week,phase,session} of sessions) {
        const source=sourceById.get(session.catalogId!)!;
        const card=approved.get(session.catalogId!)!;
        expect(source).toBeDefined();
        expect(source.sport).toBe('run');
        expect(source.phase).toContain(phase);
        expect(source.prescription.physiologicalIntent.limiterKeys)
          .toContain('running_impact_tolerance');
        expect(session.sport).toBe('run');
        expect(session.durationMin).toBe(card.durationMin[0]);
        expect(session.durationMin).toBeGreaterThan(0);
        expect(session.details).toContain('CIBLES INDIVIDUALISÉES');
        expect(result.trace.some(t=>t.id===session.catalogId&&t.week===week&&
          t.day===session.dayName&&t.duration===session.durationMin)).toBe(true);
      }
      expect(result.issues.some(i=>i.code==='v3_recovery_hours_unverified'||
        i.code==='v3_session_clock_invalid'||i.code==='v3_coach_session_overlap')).toBe(false);
      expect(result.humanReviewRequired).toBe(true);
      expect(result.sportingRelevance).toBe('not_attested');
      observed.push({
        id:athleteCase.id,pace:athleteCase.pace,weeks:byWeek,
        selected:new Map(sessions.map(({session})=>[session.catalogId!,session.details??''])),
      });
    }
    const common=[...observed[0].selected.keys()].filter(id=>observed[1].selected.has(id));
    expect(common.length).toBeGreaterThan(0);
    expect(common.some(id=>observed[0].selected.get(id)!==
      observed[1].selected.get(id))).toBe(true);
    expect(fetchGuard).not.toHaveBeenCalled();
  });

  it('rejects an unsafe athlete or mismatched review before a V3 source reaches the real plan',()=>{
    vi.useFakeTimers({toFake:['Date']});
    vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
    const id='synthetic-v38-injury';
    const controls=runnerIds.map(sourceId=>{
      const original=runnerReview(sourceId,id,240);
      return {...original,sportingReview:{
        ...original.sportingReview,injuryScreen:'contraindication' as const,
      }};
    });
    const {report,contract}=buildDetV3ContractFromCatalogue(controls);
    expect(report.accepted).toHaveLength(0);
    expect(report.rejected).toHaveLength(800);
    for(const sourceId of runnerIds)
      expect(report.rejected.find(x=>x.id===sourceId)?.reason)
        .toContain('injury_screen_not_cleared');
    const prepared=planFixture();
    const result=constructDeterministicPlan(prepared.athleteData,prepared.planConfig,
      {maxNodes:20000,maxMilliseconds:5000},contract);
    expect(result.trace.filter(t=>t.id.startsWith('V3P_'))).toHaveLength(0);
    expect(result.humanReviewRequired).toBe(true);
    expect(result.sportingRelevance).toBe('not_attested');

    const valid=runnerReview('V3P_RUN_002','synthetic-v38-runner-a',240);
    const checks=[
      {label:'wrong-athlete',review:{...valid,expectedAthleteId:'another-athlete'},
        expected:'athlete_scoped_review_identity_missing_or_mismatched'},
      {label:'missing-threshold',review:{...valid,athleteAnchors:{}},
        expected:'run_threshold_pace_sec_per_km'},
      {label:'recovery-not-reviewed',review:{...valid,sportingReview:{
        ...valid.sportingReview,recoveryContextReviewed:false as true}},
        expected:'recovery_context_not_reviewed'},
    ];
    for(const check of checks) {
      const audited=buildDetV3ContractFromCatalogue([check.review]);
      expect(audited.report.accepted,check.label).toHaveLength(0);
      expect(audited.report.rejected.find(x=>x.id===valid.id)?.reason,check.label)
        .toContain(check.expected);
    }
    const intense=runnerReview('V3P_RUN_008','synthetic-v38-train',240);
    const fatigued=buildDetV3ContractFromCatalogue([{
      ...intense,athleteLevel:'trained' as const,
      sportingReview:{...intense.sportingReview,fatigue:'fatigued' as const},
    }]);
    expect(fatigued.report.accepted).toHaveLength(0);
    expect(fatigued.report.rejected.find(x=>x.id==='V3P_RUN_008')?.reason)
      .toContain('high_intensity_requires_ready_fatigue');
    console.info('DET_V38_SAFETY_REFUSALS',JSON.stringify({
      syntheticAthlete:id,injuryRejected:runnerIds.length,
      wrongIdentity:true,missingAnchor:true,missingRecoveryReview:true,
      highIntensityWhenFatigued:'refused',v3SelectedAfterInjury:0,
    }));
  });
});
