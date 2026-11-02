/**
 * DET V3.32 — running objectives and 30–40 week horizons.
 *
 * These are real deterministic-solver calls, never a synthetic "plan passed"
 * fixture. Every reviewed source, approval, date and athlete is TEST-ONLY.
 * Construction, native sporting acceptance and clinical attestation are three
 * different claims. No released entry point imports this file.
 */
import {afterEach,describe,expect,it,vi} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {constructDeterministicPlan} from './engine';
import {buildDetV3ContractFromCatalogue,type V3ReviewedSettings} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';

type RunningGoal='Semi'|'Marathon';
type Case={id:string;fixture:'B-SEMI'|'B-MARATHON';goal:RunningGoal;weeks:number;weeklyHours:number};
const matrix:readonly Case[]=[
  {id:'semi-native-8w',fixture:'B-SEMI',goal:'Semi',weeks:8,weeklyHours:6},
  {id:'semi-30w',fixture:'B-SEMI',goal:'Semi',weeks:30,weeklyHours:6},
  {id:'marathon-native-16w',fixture:'B-MARATHON',goal:'Marathon',weeks:16,weeklyHours:9},
  {id:'marathon-30w',fixture:'B-MARATHON',goal:'Marathon',weeks:30,weeklyHours:9},
  {id:'marathon-40w',fixture:'B-MARATHON',goal:'Marathon',weeks:40,weeklyHours:9},
];

/** Already existing V3 IDs: never mint training content to make an empty slot fit. */
const runSourceIds=[
  'V3P_RUN_001','V3P_RUN_003','V3P_RUN_008','V3P_RUN_009',
  'V3P_RUN_011','V3P_RUN_012','V3P_RUN_013','V3P_RUN_020',
  'V3P_RUN_021','V3P_RUN_023','V3P_RUN_024',
  'V3P_RUN_025','V3P_RUN_026','V3P_RUN_027','V3P_RUN_028',
  'V3P_RUN_029','V3P_RUN_031','V3P_RUN_032','V3P_RUN_037',
  'V3P_RUN_038','V3P_RUN_041','V3P_RUN_044','V3P_RUN_047',
  'V3P_RUN_050','V3P_RUN_076','V3P_RUN_077','V3P_RUN_078',
  'V3P_RUN_079','V3P_RUN_080','V3P_RUN_081','V3P_RUN_082',
  'V3P_RUN_083','V3P_RUN_084','V3P_RUN_085',
  'V3P_RUN_119','V3P_RUN_137','V3P_RUN_139','V3P_RUN_142',
  'V3P_RUN_140','V3P_RUN_145','V3P_RUN_151','V3P_RUN_152',
  'V3P_RUN_153','V3P_RUN_154','V3P_RUN_155','V3P_RUN_156',
  'V3P_RUN_157','V3P_RUN_158','V3P_RUN_159','V3P_RUN_160',
  'V3P_RUN_167','V3P_RUN_169','V3P_RUN_172',
];
const strengthSourceIds=[
  'V3P_STRENGTH_101','V3P_STRENGTH_102','V3P_STRENGTH_103',
  'V3P_STRENGTH_104','V3P_STRENGTH_105','V3P_STRENGTH_106',
  'V3P_STRENGTH_107','V3P_STRENGTH_108','V3P_STRENGTH_109',
  'V3P_STRENGTH_110','V3P_STRENGTH_111','V3P_STRENGTH_112',
  'V3P_STRENGTH_113','V3P_STRENGTH_114','V3P_STRENGTH_115',
];
const hard=(severity:string)=>['critical','blocking','error'].includes(severity);
const eventDate=(weeks:number):string=>
  new Date(Date.UTC(2026,9,26+weeks*7-1)).toISOString().slice(0,10);

function runScenario(s:Case){
  const fixture=preparePrevalidationFixture(s.fixture);
  const athleteId='synthetic-v332-'+s.id;
  const athlete={...fixture.athleteData,nom:'synthetic DET V332 '+s.id,
    ftp:300,paceThresholdSecPerKm:240,css:95,vma:18};
  const raceDate=eventDate(s.weeks);
  const config={...fixture.planConfig,objective:s.goal,
    weeksAvailable:s.weeks,weeklyHours:s.weeklyHours,
    planStartDate:'2026-10-26',raceDate,
    raceGoals:[{objective:s.goal,raceDate,priority:'A' as const}],
    _outputFormat:'json' as const};
  const reviews=[...runSourceIds,...strengthSourceIds].map(id=>{
    const context=syntheticV3SportingContext(id);
    if(!('sportingReview' in context))throw Error('missing_existing_v3_source:'+id);
    return {
      id,objective:s.goal,athleteLevel:'trained' as const,
      athleteLevelSource:'manual' as const,
      allPrerequisitesChecked:true as const,
      individualCoachApproval:true as const,preferReviewedV3:true as const,
      ...(id.startsWith('V3P_STRENGTH_')?{
        verifiedStrengthLoadAndRpe:true as const,
      }:{}),
      expectedAthleteId:athleteId,
      sportingReview:{...context.sportingReview,athleteId},
      athleteAnchors:syntheticV3ReviewAnchors(),
    } satisfies V3ReviewedSettings;
  });
  const {contract,report}=buildDetV3ContractFromCatalogue(reviews);
  expect(report.sourceCount).toBe(800);
  expect(report.accepted.some(card=>card.sport==='run')).toBe(true);
  expect(report.accepted.some(card=>card.sport==='strength')).toBe(true);
  expect(contract.validateReviewedAthleteContext?.(athlete)).toEqual([]);
  const accepted=new Set(report.accepted.map(card=>card.id));
  const baseFilter=contract.filterCandidate;
  // A "valid" plan must never quietly fall back to an unreviewed native card.
  const out=constructDeterministicPlan(athlete,config,
    {maxNodes:3000,maxMilliseconds:2000},{
      ...contract,requireReviewedAthleteContext:true,
      filterCandidate:(card,ctx)=>accepted.has(card.id)&&
        (baseFilter?.(card,ctx)??true),
      enforceWeeklyHoursCap:true,
      enforceCalendarSafeV3Recovery:true,
      requireRealQualityOnLoadWeeks:true,
      filterDeclaredSprintBanCandidates:true,
      excludeNativeForbiddenTaperCandidates:true,
      requireStructuredPolarizationOnLoadWeeks:true,
      requireStrictPeriodizationEvidence:true,
      auditStructuredPolarizationSources:true,
    });
  const blockers=out.issues.filter(issue=>hard(issue.severity));
  const chosen=out.trace.filter(row=>row.id.startsWith('V3P_'));
  expect(chosen.every(row=>accepted.has(row.id))).toBe(true);
  expect(out.humanReviewRequired).toBe(true);
  expect(out.sportingRelevance).toBe('not_attested');
  expect(out.nodes).toBeLessThanOrEqual(3001);
  expect(out.constraintsSatisfied).toBe(out.technicallyConstructed&&blockers.length===0);
  if(out.candidate){
    expect(out.candidate.weeks.length).toBeLessThanOrEqual(s.weeks);
    for(const week of out.candidate.weeks){
      expect(week.weekNumber).toBeGreaterThanOrEqual(1);
      expect(week.weekNumber).toBeLessThanOrEqual(s.weeks);
      let knownMinutes=0;
      for(const session of week.sessions.filter(session=>!session.isRest)){
        if(session.title.startsWith('COURSE : '))continue;
        expect(session.catalogId).toBeDefined();
        expect(accepted.has(session.catalogId!)).toBe(true);
        if(session.sport!=='strength'){
          expect(typeof session.durationMin).toBe('number');
          const dose=contract.sourceFullStructuredDoseForId?.(
            session.catalogId!,session.durationMin);
          // A measured duration without matching V3 blocks is NOT an
          // attested session even if the native validator missed that fact.
          if(out.constraintsSatisfied)expect(dose).toBeTruthy();
        }
        if(typeof session.durationMin==='number')knownMinutes+=session.durationMin;
      }
      expect(knownMinutes).toBeLessThanOrEqual(s.weeklyHours*60+1e-7);
    }
  }
  if(out.constraintsSatisfied){
    expect(out.candidate?.weeks).toHaveLength(s.weeks);
    const last=out.candidate!.weeks.find(week=>week.weekNumber===s.weeks);
    expect(last?.sessions.some(session=>session.title.startsWith('COURSE : ')))
      .toBe(true);
    expect(blockers).toHaveLength(0);
  }else{
    // A bounded search may be unresolved: NEVER turn it into a sporting
    // impossibility claim or an athlete-facing accepted plan.
    expect(out.constraintsSatisfied).toBe(false);
  }
  console.info('DET_V332_RUNNING_REAL_SOLVER',JSON.stringify({
    scenario:s.id,objective:s.goal,weeksRequested:s.weeks,
    raceDate,weeklyHours:s.weeklyHours,admittedRunSources:report.accepted
      .filter(card=>card.sport==='run').length,
    admittedStrengthSources:report.accepted.filter(card=>card.sport==='strength').length,
    technicallyConstructed:out.technicallyConstructed,
    nativeConstraintsSatisfied:out.constraintsSatisfied,
    weeksConstructed:out.candidate?.weeks.length??0,nodes:out.nodes,
    reason:out.reason??null,selectedApprovedSources:chosen.length,
    blockingCodes:[...new Set(blockers.map(issue=>issue.code))],
    blockingExamples:blockers.slice(0,4).map(issue=>({
      week:issue.week??null,code:issue.code,message:issue.message?.slice(0,320)??null,
    })),
    clinicalAttestation:false,backendPersistenceTested:false,
  }));
}

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('DET V3.32 — semi, marathon, 30–40 week real-solver safety matrix',()=>{
  it.each(matrix)('$id: full sporting gates or an explicit NO-GO',s=>{
    vi.stubGlobal('fetch',()=>{throw Error('DET_V332_NETWORK_FORBIDDEN');});
    runScenario(s);
  },45000);

  it('rejects a running source approval stolen from another synthetic athlete',()=>{
    const id='V3P_RUN_001';
    const source=syntheticV3SportingContext(id);
    if(!('sportingReview' in source))throw Error('missing_run_source');
    const {report}=buildDetV3ContractFromCatalogue([{
      id,objective:'Marathon',athleteLevel:'trained',
      athleteLevelSource:'manual',allPrerequisitesChecked:true,
      individualCoachApproval:true,
      expectedAthleteId:'synthetic-v332-athlete-A',
      sportingReview:{...source.sportingReview,athleteId:'synthetic-v332-athlete-B'},
      athleteAnchors:syntheticV3ReviewAnchors(),
    }]);
    expect(report.accepted.some(card=>card.id===id)).toBe(false);
    expect(report.rejected.find(item=>item.id===id)?.reason)
      .toContain('athlete_scoped_review_identity_missing_or_mismatched');
  });
});
