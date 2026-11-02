/**
 * DET V3.32 — running objectives and 30–40 week horizons.
 *
 * These are real deterministic-solver calls, never a synthetic "plan passed"
 * fixture. Every reviewed source, approval, date and athlete is TEST-ONLY.
 * Construction, native sporting acceptance and clinical attestation are three
 * different claims. No released entry point imports this file.
 */
import {expect} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {constructDeterministicPlan} from './engine';
import {buildDetV3ContractFromCatalogue,type V3ReviewedSettings} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';

type RunningGoal='Semi'|'Marathon';
export type Case={id:string;fixture:'B-SEMI'|'B-MARATHON';goal:RunningGoal;weeks:number;weeklyHours:number;
  declaredTwoSlotsPerDay?:true;declaredClock?:true;wideRecoveryClock?:true;
  unrestrictedSports?:true;declaredCompetitor?:true;declaredWorldClassCapacity?:true;
  approvedTaperDose?:true;forwardCheck?:true;expandedTaperSources?:true;
  sourceCertifiedPeak?:true;
  shortEasyTaperApproved?:true;
  distinctSportClock?:true;
  coachDeclaredRunOnly?:true;
  measuredRecoveryProof?:true;
  runningQualityProof?:true;
  runningQualityPriority?:true;
  runningMatchingAudit?:true;
  runningCandidatePriority?:true;
  runningEasyMarginPriority?:true;
  extendedStrictSearchBudget?:true;
  runningQualitySlotMargin?:true;
  marathonHorizonEvidence?:true;
  marathonSpecificityReconciliation?:true;
  measuredMarathonMesocycles?:true;
  tteSourcePreferred?:true;
  declaredAmbition?:'age_group'|'competitor';
  largerSearchBudget?:true;};
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
  // Existing 24-minute, entirely easy/tactical 20–30 min activation;
  // original V3 prescription unchanged (not a retitled threshold workout).
  'V3P_RUN_119','V3P_RUN_130','V3P_RUN_137','V3P_RUN_139','V3P_RUN_142',
  'V3P_RUN_140','V3P_RUN_145','V3P_RUN_151','V3P_RUN_152',
  'V3P_RUN_153','V3P_RUN_154','V3P_RUN_155','V3P_RUN_156',
  'V3P_RUN_157','V3P_RUN_158','V3P_RUN_159','V3P_RUN_160',
  'V3P_RUN_167','V3P_RUN_169','V3P_RUN_172',
];
/** Original V3 catalogue, not fabricated taper sessions. */
const expandedTaperSourceIds=[
  'V3P_RUN_020','V3P_RUN_105','V3P_RUN_110','V3P_RUN_115',
  'V3P_RUN_120','V3P_RUN_125','V3P_RUN_135','V3P_RUN_150',
  'V3P_RUN_190','V3P_RUN_195','V3P_RUN_200',
];
const crossTrainingIds=[
  'V3P_BIKE_001','V3P_BIKE_002','V3P_BIKE_017',
  'V3P_BIKE_057','V3P_BIKE_085','V3P_BIKE_090',
];
/** Appointments deliberately declared by the SYNTHETIC coach, not inferred. */
const declaredClock=(slot:{week:number;dayIndex:number;sport:string})=>({
  provenance:'coach_confirmed' as const,
  minuteOfDay:[1080,1020,1080,1020,1080,420,1140][slot.dayIndex],
  utcOffsetMinutes:60,
});
const wideRecoveryClock=(slot:{week:number;dayIndex:number;sport:string})=>({
  provenance:'coach_confirmed' as const,
  // Synthetic coach's declared slots: Tue 06:00, Wed 09:00, Thu 12:00,
  // Fri 15:00, Sat 17:00, Sun 19:00. No implication of a real appointment.
  minuteOfDay:[1080,360,540,720,900,1020,1140][slot.dayIndex],
  // Europe/Brussels: DST transition on 28 March 2027. Calendar-based,
  // never a constant zone offset silently carried across 30–40 weeks.
  utcOffsetMinutes:Date.UTC(2026,9,26+(slot.week-1)*7+slot.dayIndex)>=
    Date.UTC(2027,2,28)?120:60,
});
/** V341: distinct SYNTHETIC coach-confirmed appointments by sport. The
 * running clock and all original fixture calendars are unchanged. A second
 * sport on the same day is NOT placed at the run's start time by default.
 * These are explicit test-only declarations, never inferred athlete times. */
const distinctConfirmedSportClock=(slot:{week:number;dayIndex:number;sport:string})=>{
  const base=wideRecoveryClock(slot);
  const minutesBySport:Record<string,readonly number[]>={
    bike:[660,660,840,1020,720,780,900],
    strength:[900,900,1080,1200,540,600,720],
    swim:[1200,1200,360,480,600,480,540],
  };
  return {...base,minuteOfDay:minutesBySport[slot.sport]?.[slot.dayIndex]??base.minuteOfDay};
};
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

export function runScenario(s:Case){
  // A long-horizon quality witness without its actual hard gate is INVALID.
  // V346 exposed a 40/40 technical build that was otherwise easy to
  // misreport as evidence of source-backed Z4–Z6 sessions.
  if(s.id.includes('quality-candidate-first')||
     s.id.includes('quality-easy-margin-first')||
     s.id.includes('strict-search-25k')||
     s.id.includes('quality-slot-margin-25k')){
    expect(s.runningQualityProof).toBe(true);
    expect(s.measuredRecoveryProof).toBe(true);
    expect(s.runningCandidatePriority).toBe(true);
  }
  const fixture=preparePrevalidationFixture(s.fixture,s.declaredAmbition?{
    ambition:s.declaredAmbition,weeklyHours:s.weeklyHours,
    sessionsPerWeek:s.declaredAmbition==='age_group'?5:6,
    strengthSessionsPerWeek:s.declaredAmbition==='age_group'?1:2,
    maxSessionsPerDay:2,constraints:undefined,
  }:{});
  const athleteId='synthetic-v332-'+s.id;
  const athlete={...fixture.athleteData,nom:'synthetic DET V332 '+s.id,
    ftp:300,paceThresholdSecPerKm:240,css:95,vma:18};
  const raceDate=eventDate(s.weeks);
  const config={...fixture.planConfig,objective:s.goal,
    weeksAvailable:s.weeks,weeklyHours:s.weeklyHours,
    ...(s.declaredTwoSlotsPerDay?{maxSessionsPerDay:2}:{}),
    ...(s.unrestrictedSports?{constraints:undefined}:{}),
    ...(s.coachDeclaredRunOnly?{constraints:
      'Déclaration du coach synthétique : vélo interdit et natation interdite ; uniquement course à pied.'}:{}),
    ...(s.declaredCompetitor?{ambition:'competitor' as const,
      sessionsPerWeek:7,strengthSessionsPerWeek:2}:{}),
    ...(s.declaredWorldClassCapacity?{sessionsPerWeek:10,
      strengthSessionsPerWeek:2}:{}),
    ...(s.declaredAmbition?{ambition:s.declaredAmbition,
      sessionsPerWeek:s.declaredAmbition==='age_group'?5:6,
      strengthSessionsPerWeek:s.declaredAmbition==='age_group'?1:2}:{}),
    planStartDate:'2026-10-26',raceDate,
    raceGoals:[{objective:s.goal,raceDate,priority:'A' as const}],
    _outputFormat:'json' as const};
  // Distinct source IDs only: the expanded approved set may overlap the base.
  // This is fixture de-duplication, not an athlete approval bypass.
  const reviews=[...new Set([...runSourceIds,
    ...(s.expandedTaperSources?expandedTaperSourceIds:[]),
    ...(s.expandedTaperSources&&s.goal==='Marathon'?['V3P_RUN_094']:[]),
    ...strengthSourceIds,
    ...(s.unrestrictedSports?crossTrainingIds:[])])].map(id=>{
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
      ...(s.expandedTaperSources&&s.goal==='Marathon'&&id==='V3P_RUN_094'?{
        // Existing source-defined 2 × 4 min genuine marathon pace.
        // Coach approves shortening 3 -> 2 worksets; no dose is invented.
        targetDurationMin:28,
        allowWorksetChange:true as const,
      }:{}),
      ...(s.shortEasyTaperApproved&&id==='V3P_RUN_001'?{
        // Original V3 bounded easy/recovery blocks support exactly 28 min.
        // Synthetic coach's distinct approval; never a production default.
        targetDurationMin:28,
      }:{}),
      ...(s.approvedTaperDose&&(
        (s.goal==='Semi'&&id==='V3P_RUN_160')||
        (s.goal==='Marathon'&&id==='V3P_RUN_155'))?{
        targetDurationMin:s.goal==='Semi'?25:28,
        // Source-defined 2 -> 1 workset, NOT a different effort domain.
        allowWorksetChange:true as const,
      }:{}),
    } satisfies V3ReviewedSettings;
  });
  const {contract,report}=buildDetV3ContractFromCatalogue(reviews);
  expect(report.sourceCount).toBe(800);
  expect(report.accepted.some(card=>card.sport==='run')).toBe(true);
  expect(report.accepted.some(card=>card.id==='V3P_RUN_130')).toBe(true);
  if(s.shortEasyTaperApproved){
    const easy=report.accepted.find(card=>card.id==='V3P_RUN_001');
    expect(easy?.durationMin).toEqual([28,28]);
    expect(contract.sourceFullStructuredDoseForId?.('V3P_RUN_001',28))
      .toBeTruthy();
  }
  if(s.approvedTaperDose){
    const id=s.goal==='Semi'?'V3P_RUN_160':'V3P_RUN_155';
    const intendedMinutes=s.goal==='Semi'?25:28;
    const reviewed=report.accepted.find(card=>card.id===id);
    expect(reviewed?.durationMin).toEqual([intendedMinutes,intendedMinutes]);
    expect(contract.sourceFullStructuredDoseForId?.(id,intendedMinutes))
      .toBeTruthy();
  }
  expect(report.accepted.some(card=>card.sport==='strength')).toBe(true);
  expect(contract.validateReviewedAthleteContext?.(athlete)).toEqual([]);
  const accepted=new Set(report.accepted.map(card=>card.id));
  const baseFilter=contract.filterCandidate;
  // A "valid" plan must never quietly fall back to an unreviewed native card.
  const budgetNodes=s.extendedStrictSearchBudget?25000:
    s.largerSearchBudget?7000:3000;
  const budgetMilliseconds=s.extendedStrictSearchBudget?15000:
    s.largerSearchBudget?4500:2000;
  const out=constructDeterministicPlan(athlete,config,
    {maxNodes:budgetNodes,maxMilliseconds:budgetMilliseconds},{
      ...contract,requireReviewedAthleteContext:true,
      filterCandidate:(card,ctx)=>accepted.has(card.id)&&
        (baseFilter?.(card,ctx)??true),
      enforceWeeklyHoursCap:true,
      enforceCalendarSafeV3Recovery:true,
      ...(s.declaredClock||s.wideRecoveryClock||s.distinctSportClock?{
        coachSlotStart:s.distinctSportClock?distinctConfirmedSportClock:
          s.wideRecoveryClock?wideRecoveryClock:declaredClock,
        coachSessionStart:(session:{weekNumber:number;dayIndex:number;sport:string})=>
          (s.distinctSportClock?distinctConfirmedSportClock:
            s.wideRecoveryClock?wideRecoveryClock:declaredClock)({
            week:session.weekNumber,dayIndex:session.dayIndex,sport:session.sport,
          }),
      }:{}),
      ...(s.distinctSportClock?{enforceConfirmedNoSameDayOverlap:true as const}:{}),
      ...(s.runningQualityProof?{requireReviewedRunningKeyQualityOnLoadWeeks:true as const}:{}),
      ...(s.runningQualityPriority?{prioritizeVerifiedRunningQualitySlot:true as const}:{}),
      ...(s.runningMatchingAudit?{auditRunningQualitySourceMatching:true as const}:{}),
      ...(s.runningCandidatePriority?{prioritizeVerifiedRunningQualityCandidate:true as const}:{}),
      ...(s.runningEasyMarginPriority?{prioritizeRunningStructuredEasyMargin:true as const}:{}),
      ...(s.runningQualitySlotMargin?{prioritizeRunningQualitySlotByMargin:true as const}:{}),
      ...(s.marathonHorizonEvidence?{auditMarathonHorizonEvidence:true as const}:{}),
      ...(s.measuredMarathonMesocycles?{enableVerifiedMarathonMesocycles:true as const}:{}),
      ...(s.tteSourcePreferred?{prioritizeSourceVerifiedTteOnKeySlots:true as const}:{}),
      ...(s.marathonSpecificityReconciliation?{reconcileReviewedMarathonSpecificityLexicalWarning:true as const}:{}),
      ...(s.measuredRecoveryProof?{
        requireMeasuredDeloadSelection:true as const,
        annotateVerifiedDeloads:true as const,
      }:{}),
      improveV3RecoveryLayout:true,
      ...(s.forwardCheck?{enableV333ForwardCheck:true as const}:{}),
      ...(s.sourceCertifiedPeak?{enableV335SourceRunningPeak:true as const}:{}),
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
  expect(out.nodes).toBeLessThanOrEqual(budgetNodes+1);
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
  if(s.measuredMarathonMesocycles&&out.technicallyConstructed){
    const meso=out.issues.find(i=>i.code.startsWith('det_v353_'));
    // A full length alone must never count; exact measured deload boundaries
    // are mandatory on this opt-in real-solver witness.
    expect(meso?.code).toBe('det_v353_measured_marathon_mesocycles_verified');
    expect(out.candidate?.phases.some(p=>p.name.startsWith('build - mesocycle'))).toBe(true);
  }
  if(s.marathonHorizonEvidence){
    const evidence=out.issues.find(i=>i.code.startsWith('det_v351_marathon_'));
    if(out.technicallyConstructed){
      expect(evidence).toBeDefined();
      expect(JSON.parse(evidence!.message??'{}').nativeValidatorsPreserved).toBe(true);
    }
  }
  if(s.runningQualityProof&&out.candidate){
    for(const week of out.candidate.weeks.filter(w=>
      out.candidate!.weeklyQuotas?.[w.weekNumber]?.weekType==='load')){
      const verified=week.sessions.filter(s=>{
        if(!s.isKeySession||s.sport!=='run'||!s.catalogId||
           typeof s.durationMin!=='number')return false;
        const dose=contract.sourceFullStructuredDoseForId?.(s.catalogId,s.durationMin);
        return !!dose&&dose.provenance==='v3_individually_configured_blocks_only'&&
          dose.sourceIds.length===1&&dose.sourceIds[0]===s.catalogId&&dose.high>0;
      });
      expect(verified.length).toBeGreaterThan(0);
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
    raceDate,weeklyHours:s.weeklyHours,
    declaredTwoSlotsPerDay:s.declaredTwoSlotsPerDay===true,
    syntheticCoachClock:s.declaredClock===true,
    syntheticWideRecoveryClock:s.wideRecoveryClock===true,
    unrestrictedSports:s.unrestrictedSports===true,
    declaredCompetitor:s.declaredCompetitor===true,
    declaredWorldClassCapacity:s.declaredWorldClassCapacity===true,
    declaredAmbition:s.declaredAmbition??null,
    declaredCardioSessionsPerWeek:config.sessionsPerWeek??null,
    approvedTaperDose:s.approvedTaperDose===true,
    forwardCheck:s.forwardCheck===true,
    sourceCertifiedPeak:s.sourceCertifiedPeak===true,
    shortEasyTaperApproved:s.shortEasyTaperApproved===true,
    distinctSportClock:s.distinctSportClock===true,
    coachDeclaredRunOnly:s.coachDeclaredRunOnly===true,
    measuredRecoveryProof:s.measuredRecoveryProof===true,
    runningQualityProof:s.runningQualityProof===true,
    runningQualityPriority:s.runningQualityPriority===true,
    runningMatchingAudit:s.runningMatchingAudit===true,
    runningCandidatePriority:s.runningCandidatePriority===true,
    runningEasyMarginPriority:s.runningEasyMarginPriority===true,
    runningQualitySlotMargin:s.runningQualitySlotMargin===true,
    tteSourcePreferred:s.tteSourcePreferred===true,
    tteSourceCandidateDomains:s.tteSourcePreferred?
      out.issues.filter(i=>i.code==='det_v355_tte_candidate_domain_audit')
        .map(i=>({week:i.week??null,evidence:JSON.parse(i.message??'{}')})):undefined,
    selectedVerifiedTteSources:s.tteSourcePreferred?
      out.issues.filter(i=>i.code==='det_v355_exact_tte_candidate_preference_audit')
        .flatMap(i=>JSON.parse(i.message??'{}').chosenVerifiedTteKeySources??[])
        .map((x:{id:string;durationMin:number;exactHighMinutes:number})=>x):undefined,
    measuredMarathonMesocycles:s.measuredMarathonMesocycles?
      out.issues.filter(i=>i.code.startsWith('det_v353_'))
        .map(i=>({code:i.code,evidence:JSON.parse(i.message??'{}')})):undefined,
    marathonSpecificityReconciliation:s.marathonSpecificityReconciliation?
      out.issues.filter(i=>i.code.startsWith('det_v352_'))
        .map(i=>({code:i.code,evidence:JSON.parse(i.message??'{}')})):undefined,
    marathonExactSourceAudit:s.marathonHorizonEvidence?
      out.issues.filter(i=>i.code.startsWith('det_v351_marathon_'))
        .map(i=>({code:i.code,verdict:JSON.parse(i.message??'{}')})):undefined,
    qualitySlotMarginEvidence:s.runningQualitySlotMargin?
      out.issues.filter(i=>i.code==='det_v350_running_key_slot_margin_order')
        .slice(0,2).map(i=>({week:i.week??null,message:i.message??null})):undefined,
    runningCandidateAudit:s.runningCandidatePriority?
      out.issues.filter(i=>i.code==='det_v346_quality_candidate_sort_verified')
        .map(i=>({week:i.week??null,message:i.message??null})):undefined,
    runningMatchingEvidence:s.runningMatchingAudit?
      out.issues.filter(i=>i.code.startsWith('det_v345_'))
        .map(i=>({week:i.week??null,code:i.code,message:i.message??null})):undefined,
    runningQualityIssues:s.runningQualityProof?
      out.issues.filter(i=>i.code.startsWith('det_v343_'))
        .map(i=>({week:i.week??null,code:i.code,message:i.message??null})):undefined,
    measuredRecoveryIssues:s.measuredRecoveryProof?
      out.issues.filter(i=>[
        'det_measured_deload_verified','det_scheduled_deload_not_proven',
        'det_v315_recovery_duration_not_verified',
      ].includes(i.code)).map(i=>({week:i.week??null,code:i.code,
        evidence:i.message??null})):undefined,
    measuredRecoveryWeeks:s.measuredRecoveryProof?
      out.candidate?.weeks.map((week,index)=>{
        const active=week.sessions.filter(x=>!x.isRest);
        const known=active.length>0&&active.every(x=>
          typeof x.durationMin==='number'&&Number.isFinite(x.durationMin));
        const minutes=known?active.reduce((sum,x)=>sum+(x.durationMin??0),0):null;
        const prior=index>0?out.candidate!.weeks[index-1].sessions
          .filter(x=>!x.isRest):[];
        const knownPrior=prior.length>0&&prior.every(x=>
          typeof x.durationMin==='number'&&Number.isFinite(x.durationMin));
        const priorMinutes=knownPrior?prior.reduce((sum,x)=>sum+(x.durationMin??0),0):null;
        return {week:week.weekNumber,
          weekType:out.candidate?.weeklyQuotas?.[week.weekNumber]?.weekType??null,
          minutes,reductionPct:minutes!==null&&priorMinutes!==null&&priorMinutes>0?
            Math.round((priorMinutes-minutes)/priorMinutes*1000)/10:null,
          theme:week.theme};
      }):undefined,
    expandedTaperSources:s.expandedTaperSources===true,
    searchBudgetNodes:budgetNodes,searchBudgetMilliseconds:budgetMilliseconds,
    v333WeekNodeDiagnostics:out.issues.filter(i=>
      i.code==='det_v333_week_search_diagnostic').map(i=>({
        week:i.week,...JSON.parse(i.message??'{}') as Record<string,unknown>,
      })),
    admittedCrossTrainingSources:report.accepted.filter(card=>card.sport==='bike').length,
    admittedRunSources:report.accepted
      .filter(card=>card.sport==='run').length,
    admittedStrengthSources:report.accepted.filter(card=>card.sport==='strength').length,
    technicallyConstructed:out.technicallyConstructed,
    nativeConstraintsSatisfied:out.constraintsSatisfied,
    weeksConstructed:out.candidate?.weeks.length??0,nodes:out.nodes,
    reason:out.reason??null,selectedApprovedSources:chosen.length,
    blockingCodes:[...new Set(blockers.map(issue=>issue.code))],
    nativeGateEvidence:blockers.filter(issue=>[
      'v3_coach_session_overlap','load_pattern','limiter_coherence',
      'lorang_categories','det_v316_strict_periodization_not_proven',
    ].includes(issue.code)).slice(0,14).map(issue=>({
      week:issue.week??null,code:issue.code,
      message:issue.message?.slice(0,350)??null,
    })),
    blockingExamples:blockers.slice(0,4).map(issue=>({
      week:issue.week??null,code:issue.code,message:issue.message?.slice(0,320)??null,
    })),
    clinicalAttestation:false,backendPersistenceTested:false,
  }));
  return out;
}

