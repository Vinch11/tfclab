/**
 * DET V3.20 — full V3.18 contract on changed physiological and availability
 * contexts. Live solver, synthetic-only approvals and coach clocks.
 * An admissible source or completed calendar is never a scientific GO.
 */
import {afterEach,describe,expect,it,vi} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {buildDetV3ContractFromCatalogue,type V3ReviewedSettings} from './v31-v3-catalogue';
import {constructDeterministicPlanWithBoundedReplays} from './v315-bounded-multiweek-replay';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';
import {V3_BASE_BRICK_ID} from './v31-v3-brick';
import {V32_703_BRICK_BLUEPRINTS} from './v32-v3-specific-bricks';
import {V34_SAFE_RUN_BRICKS} from './v34-v3-low-run-bricks';

type Objective='703'|'IM';
type Scenario={
  id:string;objective:Objective;ftp:number;thresholdPace:number;
  css:number;vma:number;weeklyHours:number;
};
const scenarios:readonly Scenario[]=[
  {id:'703-consistent-anchors',objective:'703',ftp:300,thresholdPace:240,
    css:95,vma:18,weeklyHours:10},
  {id:'703-lower-physiology',objective:'703',ftp:255,thresholdPace:255,
    css:100,vma:16.5,weeklyHours:10},
  {id:'703-reduced-hours',objective:'703',ftp:300,thresholdPace:240,
    css:95,vma:18,weeklyHours:9},
  {id:'703-intermediate-hours',objective:'703',ftp:300,thresholdPace:240,
    css:95,vma:18,weeklyHours:9.5},
  {id:'IM-consistent-anchors',objective:'IM',ftp:300,thresholdPace:240,
    css:95,vma:18,weeklyHours:14},
  {id:'IM-lower-physiology',objective:'IM',ftp:260,thresholdPace:255,
    css:100,vma:16.5,weeklyHours:14},
  {id:'IM-reduced-hours',objective:'IM',ftp:300,thresholdPace:240,
    css:95,vma:18,weeklyHours:13},
];
const initialIds=[
  'V3P_BIKE_002','V3P_BIKE_017','V3P_BIKE_090','V3P_BIKE_057',
  'V3P_BIKE_085','V3P_BIKE_089','V3P_BIKE_016',
  'V3P_RUN_001','V3P_RUN_041',
];
const addedIds=[
  'V3P_RUN_003','V3P_RUN_031','V3P_RUN_032','V3P_RUN_037',
  'V3P_RUN_038','V3P_RUN_084','V3P_RUN_085',
  'V3P_SWIM_001','V3P_SWIM_002','V3P_SWIM_003',
  'V3P_SWIM_012','V3P_SWIM_021','V3P_SWIM_027',
  'V3P_SWIM_041','V3P_SWIM_042','V3P_SWIM_043',
  'V3P_SWIM_044','V3P_SWIM_045','V3P_SWIM_046',
  'V3P_SWIM_047','V3P_SWIM_048','V3P_SWIM_049','V3P_SWIM_050',
  'V3P_SWIM_101','V3P_SWIM_102','V3P_SWIM_103',
  'V3P_SWIM_132','V3P_SWIM_133',
  'V3P_BIKE_142','V3P_BIKE_147','V3P_BIKE_152',
  'V3P_RUN_137','V3P_RUN_142','V3P_RUN_167','V3P_RUN_172',
  'V3P_BIKE_149','V3P_BIKE_154','V3P_RUN_139','V3P_RUN_169',
  'V3P_BIKE_114','V3P_BIKE_199','V3P_RUN_119',
];
const starts:Record<string,number[]>={
  swim:[360,360,540,720,900,1020,480],
  bike:[600,660,600,480,600,420,540],
  run:[420,420,1080,1020,1080,420,420],
  strength:[1140,1140,1140,1140,1140,1140,1140],
  brick:[360,360,360,360,360,360,360],
};
const confirmed=(slot:{week:number;dayIndex:number;sport:string})=>{
  const time=starts[slot.sport]?.[slot.dayIndex];
  return time===undefined?null:{
    provenance:'coach_confirmed' as const,minuteOfDay:time,utcOffsetMinutes:60,
  };
};
function admitted(s:Scenario){
  const anchors=syntheticV3ReviewAnchors();
  const scaledSwim=Object.fromEntries(
    Object.entries(anchors.swimDomainPacesSecPer100m??{}).map(([domain,pace])=>[
      domain,Math.round(pace*(s.css/95)*100)/100,
    ]),
  ) as typeof anchors.swimDomainPacesSecPer100m;
  const vvo2=s.vma/3.6;
  const reviewAnchors={
    ...anchors,bikeFtpWatts:s.ftp,bikePmaWatts:Math.round(s.ftp*1.3),
    bikeSprintPowerRangeWatts:[s.ftp*2,s.ftp*2.9] as [number,number],
    runThresholdPaceSecPerKm:s.thresholdPace,runVvo2SpeedMps:vvo2,
    runSprintSpeedRangeMps:[vvo2+.2,vvo2+2] as [number,number],
    swimDomainPacesSecPer100m:scaledSwim,
  };
  const athleteId='synthetic-v320-'+s.id;
  const raceIds=s.objective==='703'?
    ['V3P_BIKE_012','V3P_BIKE_084','V3P_SWIM_199']:
    ['V3P_BIKE_038','V3P_BIKE_081','V3P_SWIM_194'];
  const reviews=[...new Set([...initialIds,...addedIds,...raceIds])]
    .map(id=>{
      const sporting=syntheticV3SportingContext(id);
      if(!('sportingReview' in sporting))throw Error('unavailable_synthetic_review:'+id);
      return {
        id,objective:s.objective,athleteLevel:'trained' as const,
        athleteLevelSource:'manual' as const,
        allPrerequisitesChecked:true as const,individualCoachApproval:true as const,
        preferReviewedV3:true as const,athleteAnchors:reviewAnchors,
        expectedAthleteId:athleteId,
        sportingReview:{...sporting.sportingReview,athleteId},
        ...(id==='V3P_BIKE_002'?{targetDurationMin:65}:
            id==='V3P_BIKE_016'?{targetDurationMin:139}:{}),
      } satisfies V3ReviewedSettings;
    });
  const bricks=s.objective==='703'?[{
    id:V3_BASE_BRICK_ID,objective:s.objective,individualCoachApproval:true as const,
    transitionSeconds:300,preferReviewedV3:true as const,
  }]:[];
  const specific=s.objective==='703'?V32_703_BRICK_BLUEPRINTS.map(b=>({
    id:b.id,objective:s.objective,individualCoachApproval:true as const,
    transitionSeconds:b.transitionSeconds,preferReviewedV3:true as const,
  })):[];
  const easy=s.objective==='703'?V34_SAFE_RUN_BRICKS.map(b=>({
    id:b.id,objective:s.objective,individualCoachApproval:true as const,
    transitionSeconds:b.transitionSeconds,preferReviewedV3:true as const,
  })):[];
  return buildDetV3ContractFromCatalogue(reviews,bricks,specific,easy);
}
function run(s:Scenario){
  const f=preparePrevalidationFixture(s.objective==='703'?'B-70.3':'B-IM');
  const athlete={
    ...f.athleteData,nom:'synthetic V320 '+s.id,
    ftp:s.ftp,paceThresholdSecPerKm:s.thresholdPace,css:s.css,vma:s.vma,
  };
  const raceDate=s.objective==='703'?'2027-01-17':'2027-02-14';
  const cfg={
    ...f.planConfig,weeklyHours:s.weeklyHours,
    planStartDate:'2026-10-26',raceDate,
    raceGoals:[{objective:s.objective,raceDate,priority:'A' as const}],
    _outputFormat:'json' as const,
  };
  const {contract,report}=admitted(s);
  expect(report.sourceCount).toBe(800);
  expect(report.accepted.length).toBeGreaterThan(45);
  const raceSources=report.accepted.filter(card=>
    contract.reviewedRaceSpecificForId?.(card.id)?.objective===s.objective);
  expect(raceSources.length).toBeGreaterThan(0);
  const out=constructDeterministicPlanWithBoundedReplays(
    athlete,cfg,{maxNodes:s.id==='703-reduced-hours'?40000:200000,
      maxMilliseconds:16000},{
      ...contract,requireReviewedAthleteContext:true,
      // V322: opt-in candidate-quality gate ONLY for the previously blocked
      // 70.3/9 h cohort. Keep the prior five baselines untouched as controls.
      ...(s.objective==='703'&&s.weeklyHours<10?{
        requireLorangQualityBeforeFinalValidation:true as const,
      }:{}),
      requireReviewedRaceSpecificPeak:true,
      rankCandidate:(card,context)=>{
        const proven=contract.reviewedRaceSpecificForId?.(card.id);
        if(context.phase==='peak'&&context.slot.isKeySession&&
          proven?.objective===s.objective)return -4;
        return contract.rankCandidate?.(card,context)??0;
      },
      enforceWeeklyHoursCap:true,enforceCalendarSafeV3Recovery:true,
      enforceConfirmedNoSameDayOverlap:true,
      requireMeasuredDeloadSelection:true,
      excludeNativeForbiddenTaperCandidates:true,
      improveV3RecoveryLayout:true,annotateVerifiedDeloads:true,
      filterDeclaredSprintBanCandidates:true,requireRealQualityOnLoadWeeks:true,
      preferSourceBackedMultisportBalance:'triathlon_targets',
      requireFinalTriathlonMinuteRatios:true,
      requireStructuredPolarizationOnLoadWeeks:true,
      reconcileReviewedSourcePolarization:true,
      auditVerifiedMultisportMinutes:true,
      auditGlobalSourceSportRatioBounds:true,
      applyReviewedMinuteSportRatio:true,
      verifyOfficialRaceQuotaProjection:true,
      auditStructuredPolarizationSources:true,
      coachSlotStart:confirmed,
      coachSessionStart:session=>confirmed({
        week:session.weekNumber,dayIndex:session.dayIndex,sport:session.sport,
      }),
    },
  );
  const result=out.result;
  const blockers=result?.issues.filter(i=>
    ['critical','blocking','error'].includes(i.severity))??[];
  const ratios=result?.issues.find(i=>
    i.code==='det_multisport_minute_ratio_verified')?.message??null;
  const proof=result?.issues.find(i=>
    i.code==='det_v317_individually_reviewed_peak_specificity_verified');
  console.info('DET_V320_FULL_CONTRACT_MATRIX',JSON.stringify({
    profile:s.id,objective:s.objective,weeklyHours:s.weeklyHours,
    ftp:s.ftp,thresholdPace:s.thresholdPace,css:s.css,vma:s.vma,
    admittedSources:report.accepted.length,
    verdict:out.evidence.verdict,
    weeks:result?.candidate?.weeks.length??0,
    nodes:out.evidence.totalNodes,
    attempts:out.evidence.attempts.map(a=>({
      nodes:a.nodes,weeks:a.weeksBuilt,reason:a.reason??null,
      blockers:a.blockers,target:a.target,
    })),
    firstFourDomainDiagnostics:out.evidence.attempts.slice(0,4).map(a=>({
      target:a.target,frontierWeeks:a.weeksBuilt,
      diagnostic:a.constrainedWeekDiagnostic?
        JSON.parse(a.constrainedWeekDiagnostic):null,
    })),
    ratios,certifiedRaceSourceIds:proof?.message??null,
    blockingCodes:[...new Set(blockers.map(i=>i.code))],
    blockingDetails:blockers.map(i=>({week:i.week??null,code:i.code,message:i.message??null})),
    reason:result?.reason??null,
  }));
  expect(out.evidence.experimentalOnly).toBe(true);
  expect(out.evidence.totalNodes).toBeLessThanOrEqual(
    s.id==='703-reduced-hours'?40000:200000);
  expect(result?.humanReviewRequired).toBe(true);
  expect(result?.sportingRelevance).toBe('not_attested');

  // A failed constrained week must be diagnosable without making a false
  // sporting impossibility claim. This log is evidence of actual slot domains.
  if(s.objective==='703'&&s.weeklyHours<10){
    const unassigned=out.evidence.attempts.filter(a=>
      a.reason?.startsWith('no_catalogue_assignment_week_'));
    // Do not demand that failures exist: a later FULL PASS remains welcome.
    // But when a no-assignment failure occurs, its evidence is mandatory.
    for(const attempt of unassigned){
      expect(attempt.constrainedWeekDiagnostic).toBeTruthy();
      const diagnostic=JSON.parse(attempt.constrainedWeekDiagnostic!) as {
        week:number;slotDomains:Array<{sport:string;candidates:number}>;
        noGlobalImpossibilityClaim:boolean;
      };
      expect(Number.isInteger(diagnostic.week)).toBe(true);
      expect(diagnostic.slotDomains.length).toBeGreaterThan(0);
      expect(diagnostic.noGlobalImpossibilityClaim).toBe(true);
      // V3.26 — a required but impossible taper quality stimulus must
      // identify missing approved source coverage explicitly. It cannot
      // be reported solely as solver-budget exhaustion or silently waived.
      if(diagnostic.weekType==='taper'&&
         (diagnostic as typeof diagnostic & {
           qualityRequired?:boolean;qualityDomainAvailable?:boolean;
         }).qualityRequired===true &&
         (diagnostic as typeof diagnostic & {
           qualityDomainAvailable?:boolean;
         }).qualityDomainAvailable===false){
        expect(attempt.blockers).toContain('det_v326_required_taper_quality_domain_empty');
      }
    }
  }

  // V3.23 — independent regression lock for the FIVE full-contract baselines
  // observed as all_gates_pass on CI #1495 (SHA 944eb669). A future refusal
  // on these specific inputs is a regression, even when correctly fail-closed.
  // The 70.3 9 h and 9.5 h contexts are NOT frozen as failures: a genuinely
  // valid solution may be admitted later, but must pass every gate below.
  const certifiedRegressionBaselines = new Set([
    '703-consistent-anchors','703-lower-physiology',
    'IM-consistent-anchors','IM-lower-physiology','IM-reduced-hours',
  ]);
  if(certifiedRegressionBaselines.has(s.id)){
    expect(out.evidence.verdict).toBe('all_gates_pass');
  }
  if(out.evidence.verdict==='all_gates_pass'){
    expect(result?.technicallyConstructed).toBe(true);
    expect(result?.constraintsSatisfied).toBe(true);
    expect(result?.candidate?.weeks.length).toBe(cfg.weeksAvailable);
    expect(blockers).toHaveLength(0);
    expect(ratios).not.toBeNull();
    expect(proof).toBeDefined();

    // Independent numeric cross-check, not merely a reliance on a PASS flag.
    // Require 100% accounted tri-sport minutes and no unverified brick split.
    if(!ratios)throw Error('det_v323_missing_ratio_evidence');
    const ratioProof=JSON.parse(ratios) as {
      knownOnlyRatio:Record<'swim'|'bike'|'run',number>;
      targets:Record<'swim'|'bike'|'run',[number,number]>;
      unresolvedBrickMinutes:number;
    };
    expect(ratioProof.unresolvedBrickMinutes).toBe(0);
    let sum=0;
    for(const sport of ['swim','bike','run'] as const){
      const share=ratioProof.knownOnlyRatio[sport];
      const [low,high]=ratioProof.targets[sport];
      expect(Number.isFinite(share)).toBe(true);
      expect(share).toBeGreaterThanOrEqual(low-1e-6);
      expect(share).toBeLessThanOrEqual(high+1e-6);
      sum+=share;
    }
    expect(Math.abs(sum-100)).toBeLessThan(1e-5);
  }else{
    expect(result?.constraintsSatisfied).not.toBe(true);
  }
  if(result?.candidate){
    for(const week of result.candidate.weeks){
      const training=week.sessions.filter(x=>!x.isRest);
      const knownMinutes=training.reduce((n,x)=>n+(x.durationMin??0),0);
      expect(knownMinutes).toBeLessThanOrEqual(s.weeklyHours*60);
    }
  }
  return {s,out,report};
}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('DET V320 — V318 full certified contract on genuine synthetic variants',()=>{
  it.each(scenarios)('$id: complete evidence or conservative refusal',s=>{
    vi.stubGlobal('fetch',()=>{throw Error('DET_V320_NETWORK_FORBIDDEN');});
    run(s);
  });
});
