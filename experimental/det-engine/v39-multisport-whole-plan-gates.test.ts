/**
 * V39.2 — feasibility gate for COMPLETE 70.3/IM plans, not a session-level pass.
 * Instruments the actual deterministic search and retains every hard refusal.
 * This audit never creates fictitious coach timestamps or athlete load data.
 */
import {describe,it,expect,vi,afterEach} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {constructDeterministicPlan} from './engine';
import {buildDetV3ContractFromCatalogue,type V3ReviewedSettings} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';
import {V3_BASE_BRICK_ID} from './v31-v3-brick';
import {V32_703_BRICK_BLUEPRINTS} from './v32-v3-specific-bricks';
import {V34_SAFE_RUN_BRICKS} from './v34-v3-low-run-bricks';

const review=(id:string,objective:'703'|'IM',targetDurationMin?:number):V3ReviewedSettings=>({
  id,objective,athleteLevel:'trained',athleteLevelSource:'manual',
  allPrerequisitesChecked:true,individualCoachApproval:true,preferReviewedV3:true,
  athleteAnchors:syntheticV3ReviewAnchors(),...syntheticV3SportingContext(id),
  ...(targetDurationMin===undefined?{}:{targetDurationMin}),
});
const baseSourceIds=[
  'V3P_BIKE_002','V3P_BIKE_017','V3P_BIKE_090','V3P_BIKE_057',
  'V3P_BIKE_085','V3P_BIKE_089','V3P_BIKE_016',
  'V3P_RUN_001','V3P_RUN_041',
] as const;
const blocking=(severity:string)=>['blocking','error','critical'].includes(severity);
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('DET V39 — full multisport plans must pass ALL gates simultaneously',()=>{
  it.each(['B-70.3','B-IM'] as const)('%s logs source-resolved weekly volumes and every blocking native rule',fixtureId=>{
    vi.stubGlobal('fetch',()=>{throw Error('DET_V39_NETWORK_FORBIDDEN');});
    const f=preparePrevalidationFixture(fixtureId);
    const objective=fixtureId==='B-70.3'?'703' as const:'IM' as const;
    // Explicit A-race dates: the QA fixture had NO event date, which makes day-J unverifiable.
    // This is declared synthetic race context, not a default for real athletes.
    const raceDate=fixtureId==='B-70.3'?'2027-01-17':'2027-02-14';
    const cfg={...f.planConfig,planStartDate:'2026-10-26',raceDate,
      raceGoals:[{objective,raceDate,priority:'A' as const}],
      _outputFormat:'json' as const};
    expect(cfg.weeklyHours).toBeGreaterThan(0);
    const reviews=baseSourceIds.map(id=>review(id,objective,id==='V3P_BIKE_002'?65:id==='V3P_BIKE_016'?139:undefined));
    const brickReviews=objective==='703'?[{
      id:V3_BASE_BRICK_ID,objective,individualCoachApproval:true as const,
      transitionSeconds:300,preferReviewedV3:true as const,
    }]:[];
    const specific=objective==='703'?V32_703_BRICK_BLUEPRINTS.map(b=>({
      id:b.id,objective,individualCoachApproval:true as const,
      transitionSeconds:b.transitionSeconds,preferReviewedV3:true as const,
    })):[];
    const easy=objective==='703'?V34_SAFE_RUN_BRICKS.map(b=>({
      id:b.id,objective,individualCoachApproval:true as const,
      transitionSeconds:b.transitionSeconds,preferReviewedV3:true as const,
    })):[];
    const {report,contract}=buildDetV3ContractFromCatalogue(reviews,brickReviews,specific,easy);
    expect(report.accepted.length).toBeGreaterThan(0);
    const out=constructDeterministicPlan(f.athleteData,cfg,
      {maxNodes:12000,maxMilliseconds:8000},{...contract,
        enforceWeeklyHoursCap:true,enforceCalendarSafeV3Recovery:true,
        improveV3RecoveryLayout:true,annotateVerifiedDeloads:true,
        auditVerifiedMultisportMinutes:true,filterDeclaredSprintBanCandidates:true,
        requireRealQualityOnLoadWeeks:true});
    // Experimental SECOND SEARCH, same approved sources, quota, athlete and
    // restrictions. This does not replace the original baseline proof.
    // It only reorders already checked source candidates, never edits doses.
    const balanced=constructDeterministicPlan(f.athleteData,cfg,
      {maxNodes:12000,maxMilliseconds:8000},{...contract,
        enforceWeeklyHoursCap:true,enforceCalendarSafeV3Recovery:true,
        improveV3RecoveryLayout:true,annotateVerifiedDeloads:true,
        auditVerifiedMultisportMinutes:true,filterDeclaredSprintBanCandidates:true,
        requireRealQualityOnLoadWeeks:true,preferSourceBackedMultisportBalance:'all'});
    const balancedBlockers=balanced.issues.filter(i=>blocking(i.severity));
    const balancedRatio=balanced.issues.find(i=>i.code.startsWith('det_multisport_minute_ratio_'));
    const baseRatio=out.issues.find(i=>i.code.startsWith('det_multisport_minute_ratio_'));
    const readRatio=(message?:string)=>{
      if(!message)return null;
      try {
        const item=JSON.parse(message) as {knownOnlyRatio?:{swim:number};conservativeBounds?:{swim:{minPct:number}}};
        return {knownOnly:item.knownOnlyRatio?.swim??null,
          minimumConservative:item.conservativeBounds?.swim.minPct??null};
      }catch{return null;}
    };
    console.info('DET_V39_SOURCE_BACKED_BALANCE_COMPARISON',JSON.stringify({
      fixture:fixtureId,objective,baselineConstructed:out.technicallyConstructed,
      balancedConstructed:balanced.technicallyConstructed,
      baselineRatio:readRatio(baseRatio?.message),
      balancedRatio:readRatio(balancedRatio?.message),
      baselineBlockingCodes:[...new Set(out.issues.filter(i=>blocking(i.severity)).map(i=>i.code))],
      balancedBlockingCodes:[...new Set(balancedBlockers.map(i=>i.code))],
      balancedReason:balanced.reason??null,
      balancedSelectedV3:balanced.trace.filter(t=>t.id.startsWith('V3P_')||t.id.startsWith('V3B_')).length,
      balancedWeeklyMinutes:balanced.candidate?.weeks.map(week=>({
        week:week.weekNumber,minutes:week.sessions.filter(x=>!x.isRest)
          .reduce((n,x)=>n+(x.durationMin??0),0),
      }))??[],
    }));
    if(balanced.technicallyConstructed){
      const cap=Math.floor(cfg.weeklyHours!*60);
      expect(balanced.candidate!.weeks.every(week=>
        week.sessions.filter(x=>!x.isRest).reduce((n,x)=>n+(x.durationMin??0),0)<=cap
      )).toBe(true);
      expect(balancedBlockers.filter(i=>i.code==='v3_recovery_hours_unverified')).toEqual([]);
    }
    expect(balanced.humanReviewRequired).toBe(true);
    expect(balanced.sportingRelevance).toBe('not_attested');
    // The all-sports heuristic can overshoot: isolate BIKE duration choices
    // while retaining the original swim/run and key-limiter selection order.
    const bikeOnly=constructDeterministicPlan(f.athleteData,cfg,
      {maxNodes:12000,maxMilliseconds:8000},{...contract,
        enforceWeeklyHoursCap:true,enforceCalendarSafeV3Recovery:true,
        improveV3RecoveryLayout:true,annotateVerifiedDeloads:true,
        auditVerifiedMultisportMinutes:true,filterDeclaredSprintBanCandidates:true,
        requireRealQualityOnLoadWeeks:true,
        preferSourceBackedMultisportBalance:'bike'});
    const bikeRatio=bikeOnly.issues.find(i=>i.code.startsWith('det_multisport_minute_ratio_'));
    console.info('DET_V39_BIKE_ONLY_RATIO_COMPARISON',JSON.stringify({
      fixture:fixtureId,objective,technicallyConstructed:bikeOnly.technicallyConstructed,
      original:readRatio(baseRatio?.message),
      allSports:readRatio(balancedRatio?.message),
      bikeOnly:readRatio(bikeRatio?.message),
      blockerCodes:[...new Set(bikeOnly.issues.filter(i=>blocking(i.severity)).map(i=>i.code))],
      selectedV3:bikeOnly.trace.filter(t=>t.id.startsWith('V3P_')||t.id.startsWith('V3B_')).length,
      reason:bikeOnly.reason??null,
    }));
    if(bikeOnly.technicallyConstructed){
      expect(bikeOnly.candidate!.weeks.every(week=>
        week.sessions.filter(x=>!x.isRest).reduce((n,x)=>n+(x.durationMin??0),0)
          <=Math.floor(cfg.weeklyHours!*60))).toBe(true);
      expect(bikeOnly.issues.filter(i=>i.code==='v3_recovery_hours_unverified')).toEqual([]);
    }
    expect(bikeOnly.humanReviewRequired).toBe(true);
    expect(bikeOnly.sportingRelevance).toBe('not_attested');
    const swimOnly=constructDeterministicPlan(f.athleteData,cfg,
      {maxNodes:12000,maxMilliseconds:8000},{...contract,
        enforceWeeklyHoursCap:true,enforceCalendarSafeV3Recovery:true,
        improveV3RecoveryLayout:true,annotateVerifiedDeloads:true,
        auditVerifiedMultisportMinutes:true,filterDeclaredSprintBanCandidates:true,
        requireRealQualityOnLoadWeeks:true,
        preferSourceBackedMultisportBalance:'swim'});
    const swimRatio=swimOnly.issues.find(i=>i.code.startsWith('det_multisport_minute_ratio_'));
    const parseDetails=(message?:string)=>{
      if(!message)return null;
      try{return JSON.parse(message) as Record<string,unknown>;}catch{return null;}
    };
    const detail=parseDetails(swimRatio?.message);
    const polarization=parseDetails(swimOnly.issues.find(i=>
      i.code==='det_native_polarization_source_attribution')?.message);
    const polarizationTop=Array.isArray(polarization)?polarization.map(
      w=>({week:w.week,lowPctOfClassifiable:w.lowPctOfClassifiable,
        unknownPctOfTotal:w.unknownPctOfTotal,
        offenders:(w.observedSessions as Array<Record<string,unknown>>).slice(0,4)
          .map(s=>({id:s.id,sport:s.sport,day:s.day,highMin:s.highMin,
            midMin:s.midMin,lowMin:s.lowMin,unknownMin:s.unknownMin}))})):null;
    console.info('DET_V39_REMAINING_SOURCE_BARRIERS',JSON.stringify({
      fixture:fixtureId,objective,
      unknownBricks:detail?.unresolvedBricks??[],
      polarizationTop,
    }));
    console.info('DET_V39_SWIM_ONLY_RATIO_COMPARISON',JSON.stringify({
      fixture:fixtureId,objective,technicallyConstructed:swimOnly.technicallyConstructed,
      original:readRatio(baseRatio?.message),
      allSports:readRatio(balancedRatio?.message),
      bikeOnly:readRatio(bikeRatio?.message),
      swimOnly:readRatio(swimRatio?.message),
      blockerCodes:[...new Set(swimOnly.issues.filter(i=>blocking(i.severity)).map(i=>i.code))],
      selectedV3:swimOnly.trace.filter(t=>t.id.startsWith('V3P_')||t.id.startsWith('V3B_')).length,
      reason:swimOnly.reason??null,
    }));
    if(swimOnly.technicallyConstructed){
      expect(swimOnly.candidate!.weeks.every(week=>
        week.sessions.filter(x=>!x.isRest).reduce((n,x)=>n+(x.durationMin??0),0)
          <=Math.floor(cfg.weeklyHours!*60))).toBe(true);
      expect(swimOnly.issues.filter(i=>i.code==='v3_recovery_hours_unverified')).toEqual([]);
    }
    expect(swimOnly.humanReviewRequired).toBe(true);
    expect(swimOnly.sportingRelevance).toBe('not_attested');
    // Evidence-gated experimental migration of the defective COUNT sport
    // ratio: same verified source assignments as the swim-only candidate.
    // 70.3 has unresolved legacy bricks, so it MUST retain native blocking.
    const minuteReconciled=constructDeterministicPlan(f.athleteData,cfg,
      {maxNodes:12000,maxMilliseconds:8000},{...contract,
        enforceWeeklyHoursCap:true,enforceCalendarSafeV3Recovery:true,
        improveV3RecoveryLayout:true,annotateVerifiedDeloads:true,
        auditVerifiedMultisportMinutes:true,filterDeclaredSprintBanCandidates:true,
        requireRealQualityOnLoadWeeks:true,
        preferSourceBackedMultisportBalance:'swim',
        applyReviewedMinuteSportRatio:true});
    const migrationDecision=minuteReconciled.issues.find(i=>
      i.code==='det_native_count_ratio_migration_decision');
    const parsedMigration=migrationDecision?.message?
      JSON.parse(migrationDecision.message) as {verdict:string;reason:string;ratios?:unknown}:null;
    console.info('DET_V39_CERTIFIED_RATIO_MIGRATION',JSON.stringify({
      fixture:fixtureId,objective,constructed:minuteReconciled.technicallyConstructed,
      migration:parsedMigration,
      blockingCodes:[...new Set(minuteReconciled.issues.filter(i=>blocking(i.severity)).map(i=>i.code))],
      quotaDrifts:minuteReconciled.issues.filter(i=>i.code==='quota_range_drift')
        .map(i=>({week:i.week,message:i.message})),
      legacyCountDiagnostics:minuteReconciled.issues.filter(i=>
        i.code==='det_superseded_count_sport_ratio_diagnostic').length,
      strictMinuteGate:minuteReconciled.issues.some(i=>
        i.code==='det_strict_minute_sport_ratio_verified'),
    }));
    expect(minuteReconciled.humanReviewRequired).toBe(true);
    expect(minuteReconciled.sportingRelevance).toBe('not_attested');
    expect(minuteReconciled.constraintsSatisfied).toBe(false); // Other safety gates remain.
    expect(minuteReconciled.issues.filter(i=>i.code==='v3_recovery_hours_unverified'))
      .toEqual([]);
    if(objective==='703'){
      expect(minuteReconciled.issues.some(i=>i.code==='sport_ratio'&&blocking(i.severity)))
        .toBe(true);
      expect(minuteReconciled.issues.some(i=>i.code==='det_strict_minute_sport_ratio_verified'))
        .toBe(false);
    }
    const capMin=Math.floor(cfg.weeklyHours!*60);
    const weeks=out.candidate?.weeks.map(w=>({
      week:w.weekNumber,phase:w.phase,
      totalKnownMinutes:w.sessions.filter(s=>!s.isRest).reduce((n,s)=>n+(s.durationMin??0),0),
      unknownDurationCount:w.sessions.filter(s=>!s.isRest&&s.durationMin===undefined).length,
      swim:w.sessions.filter(s=>s.sport==='swim').length,
      bike:w.sessions.filter(s=>s.sport==='bike').length,
      run:w.sessions.filter(s=>s.sport==='run').length,
      brick:w.sessions.filter(s=>s.sport==='brick').length,
      strength:w.sessions.filter(s=>s.sport==='strength').length,
    }))??[];
    const blockingIssues=out.issues.filter(i=>blocking(i.severity));
    const nativeCheck=prepareGenerationContracts(f.athleteData,cfg,{rotationSeed:0});
    const nativeRaceWeek=nativeCheck.weeklyQuotas[cfg.weeksAvailable!];
    // Inspect the ACTUAL week used in the returned DET candidate. The
    // untouched native preparation deliberately does not enable V39's
    // isolated official-race reservation, and would give a false negative.
    const raceWeek=out.candidate?.weeklyQuotas?.[cfg.weeksAvailable!]??nativeRaceWeek;
    const eventLayout={required:raceWeek?.layout?.requiredEvents??[],
      placed:raceWeek?.layout?.days.flatMap(day=>day.slots.filter(slot=>slot.isRaceEvent)
        .map(slot=>({day:day.dayName,sport:slot.sport})))??[],
      brickQuota:raceWeek?.quota?.brick,totalQuota:raceWeek?.quota?.totalSessions,
      maxSessionsPerDay:raceWeek?.quota?.maxSessionsPerDay,weekType:raceWeek?.weekType};
    const byCode=Object.fromEntries([...new Set(blockingIssues.map(x=>x.code))].sort().map(
      code=>[code,blockingIssues.filter(i=>i.code===code).map(i=>i.week??null)]));
    const named=out.trace.filter(t=>t.id.startsWith('V3P_')||t.id.startsWith('V3B_'));
    console.info('DET_V39_COMPLETE_MULTISPORT_GATE',JSON.stringify({
      fixture:fixtureId,objective,configuredWeeklyHours:cfg.weeklyHours,capMin,
      status:out.status,reason:out.reason,technicallyConstructed:out.technicallyConstructed,
      constraintsSatisfied:out.constraintsSatisfied,eligibleSourceCount:report.accepted.length,
      weeksExpected:cfg.weeksAvailable,weeksConstructed:weeks.length,
      raceEventLayout:eventLayout,
      nativeRaceEventPlaced:nativeRaceWeek?.layout?.days.some(d=>d.slots.some(s=>s.isRaceEvent))??false,
      weeks,selectedV3:named.map(t=>({id:t.id,week:t.week,day:t.day,duration:t.duration})),
      hardBlockers:byCode,
      verifiedMinuteRatio:out.issues.find(i=>i.code.startsWith('det_multisport_minute_ratio_'))?.message??null,
      blockerExamples:Object.fromEntries([...new Set(blockingIssues.map(i=>i.code))].map(code=>
        [code,blockingIssues.filter(i=>i.code===code).slice(0,2)
          .map(i=>({week:i.week??null,message:i.message?.slice(0,450)??''}))])),
      recoveryLayoutRepairs:out.issues.filter(i=>i.code==='det_v3_recovery_slot_swap'||
        i.code==='det_v3_recovery_layout_search_summary').map(i=>({week:i.week??null,code:i.code,detail:i.message})),
      deloadEvidence:out.issues.filter(i=>i.code==='det_measured_deload_verified'||
        i.code==='det_scheduled_deload_not_proven').map(i=>({week:i.week,code:i.code,detail:i.message})),
      firstRecoveryDomainFailure:blockingIssues.find(i=>i.code==='det_empty_catalogue_slot')?.message??null,
      firstWeekSlots:out.candidate?.weeklyQuotas?.[1]?.layout?.days
        .map(d=>({day:d.dayName,slots:d.slots.map(s=>({sport:s.sport,long:!!s.isLongSession,key:!!s.isKeySession}))}))??null,
      searchNodes:out.nodes,
    }));
    if(objective==='703'){
      // A 70.3 is an OFFICIAL race, not one additional training brick.
      // Its Sunday reservation is mandatory even when race-week brick max=0.
      const raceSlots=raceWeek?.layout?.days.flatMap(day=>day.slots)??[];
      expect(raceWeek?.quota.brick.max).toBe(0);
      expect(raceSlots.filter(slot=>slot.sport==='brick'&&slot.isRaceEvent)).toHaveLength(1);
      expect(raceSlots.filter(slot=>slot.sport==='brick'&&!slot.isRaceEvent)).toHaveLength(0);
      expect(eventLayout.placed).toEqual([{day:'dimanche',sport:'brick'}]);
    }
    // Under this explicit day-only safety mode, V3 sources must have their
    // FULL next-same-sport recovery proven without coach timestamps. A V3
    // source that cannot fit must not be selected merely to fill a quota.
    expect(blockingIssues.filter(i=>i.code==='v3_recovery_hours_unverified')).toEqual([]);
    if(out.technicallyConstructed)expect(named.length).toBeGreaterThan(0);
    // Once the clock-free chronology repair is enabled, both complete
    // calendars must remain constructible. Conformance is independently
    // audited: this assertion must not be replaced by a synthetic fallback.
    expect(out.technicallyConstructed).toBe(true);
    expect(weeks).toHaveLength(cfg.weeksAvailable!);
    if(objective==='IM'&&cfg.prohibitions?.some(p=>/sprint\s*ban/i.test(p))){
      // A real declared ban must be applied BEFORE candidate selection, not
      // merely detected as an error after the completed calendar.
      expect(blockingIssues.filter(i=>i.code==='prohibition_compliance')).toEqual([]);
    }
    // Never invent week totals if the solver returned no candidate.
    expect(weeks.every(w=>w.totalKnownMinutes<=capMin)).toBe(true);
    expect(out.constraintsSatisfied).toBe(out.technicallyConstructed&&blockingIssues.length===0);
    // An incomplete athlete program must never be passed off as sport-safe.
    if(weeks.some(w=>w.unknownDurationCount>0)){
      expect(out.constraintsSatisfied).toBe(false);
      expect(blockingIssues.some(i=>i.code==='v3_total_weekly_minutes_unverifiable_strength')).toBe(true);
    }
    expect(out.humanReviewRequired).toBe(true);
    expect(out.sportingRelevance).toBe('not_attested');
  });
});