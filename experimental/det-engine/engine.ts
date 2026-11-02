/** Experimental, pure catalogue assembly. Never imported by the application. */
import type { PlanAthleteData, PlanConfig } from '@/hooks/useAITrainingPlan';
import type { ParsedPlan, ParsedSession } from '@/lib/aiPlanParser';
import type { MergedPlan } from '@/lib/plan/mergePlanChunks';
import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { assessPreparedGeneration } from '@/lib/plan/prevalidateTrainingPlan';
import { validateWeeklyQuotas } from '@/lib/plan/validateWeeklyQuotas';
import { computeFinalValidationIssues } from '@/lib/plan/qa/finalValidation';
import { validatePlan,SPORT_RATIO_TARGETS } from '@/engines/plan/planValidator';
import { checkSessionCatalogue } from '../../supabase/functions/_shared/sessionCatalogueContract';
import { catalogueWeeklyUsageCapacity } from '../../supabase/functions/_shared/catalogueWeeklyFrequency';
import { normalizeRepairSport, normalizeRepairGoal, evaluateRepairSportingEquivalence } from '../../supabase/functions/_shared/repairSportingEquivalence';
import {buildWeeklySlotLayout,type LayoutSport} from '@/engines/plan/weeklySlotLayout';
import { buildStartToRunTemplatePlan } from '@/lib/startToRunTemplate';
import type {RepairWorkoutMetadata} from '../../supabase/functions/_shared/repairSportingEquivalence';
import type {DaySlot} from '@/engines/plan/weeklySlotLayout';
import {auditSourceRecoveryTiming, type CoachSessionStart} from './v33-recovery-timing';
import {auditV35BikeOnlyFeasibility} from './v35-volume-feasibility';
import {auditPlannedMinuteDistribution,splitVerifiedV3Brick} from './v31-time-ratio';
import {assessGlobalSourceRatioEnvelope,type RatioSlotDomain,type ExactSportMinutes} from './v311-global-ratio-domain-bounds';
import {planTriathlonRatioTrajectory,triathlonCandidateDoseDistance,type TriContribution,type TriMinutes} from './v312-triathlon-dose-trajectory';
import {assessCumulativeTriathlonRatioPotential,hasExactStrictTriathlonRatio} from './v314-cumulative-ratio-search';
import {reconcileNativeTriathlonCountRatio} from './v39-reviewed-minute-ratio-reconciliation';
import {diagnoseNativePolarizationWeeks} from './v39-polarization-provenance';
import {assessStrictNativePolarizationTarget,assessStrictStructuredZoneTarget,optimisticNativeLowShareUpperBound,nativeZoneDoseForCandidate,type NativeZoneDose} from './v39-strict-native-polarization-target';
import {assessStructuredZoneNecessaryBounds,type BoundedZoneChoice} from './v310-structured-polarization-bounds';
import {certifySwimRatioCapacity} from './v39-ratio-capacity-certificate';
import {assessNativeSwimCountQuotaBound} from './v39-native-count-quota-bound';
import {calendarOnlyRecoverySafe,calendarOrConfirmedClockRecoverySafe,type ConfirmedSlotStart} from './v39-calendar-safe-recovery';
import {confirmedNoSameDayOverlap} from './v313-confirmed-no-overlap';
import {annotateOnlyMeasuredDeloads} from './v39-real-deload';
import {measuredRecoveryCeiling,measuredTrainingMinutes} from './v315-measured-deload-selection';
import {assessStrictPeriodizationEvidence} from './v316-strict-periodization-gate';
import {certifyReviewedRaceSpecificPeak,type ProvenRaceSource} from './v317-certified-race-specific';
import {violatesNativeNormalPeak,hasSourceVisibleRaceSpecificity} from './v316-native-peak-candidate';
import {projectCertifiedRaceEventsForTrainingQuotas} from './v315-certified-race-quota-projection';
import {reconcileTextPolarizationWithReviewedSources} from './v315-reviewed-source-polarization';
import {candidateViolatesNativeTaperPhase} from './v315-taper-phase-prefilter';
import {hasDistinctSourceAssignment} from './v334-distinct-source-feasibility';
import {assessQualityAnchoredSourceMatching} from './v345-quality-source-matching';
import {findHallConflictWitness,type HallConflictWitness} from './v336-hall-conflict';
import {verifyReviewedRunningRaceSpecific,type ReviewedRunningSpecificSource} from './v335-reviewed-run-specificity';
import {auditMarathonHorizon} from './v351-marathon-horizon-evidence';
import {proposeMeasuredMarathonMesocycles} from './v353-measured-marathon-mesocycles';
import {reconcileReviewedMarathonSpecificity} from './v352-reviewed-marathon-specificity';
import {verifyReviewedTaperKeyStimulus} from './v329-proven-taper-quality';
import {reconcileReviewedTaperSemantics,type ExplicitTaperCoachReview} from './v331-taper-semantic-adjudication';
import type {StructuredZoneDose} from './v310-structured-zone-dose';
import {improveCalendarRecoveryByExistingSlotSwaps} from './v39-recovery-layout-search';

export interface SearchLimits { maxNodes: number; maxMilliseconds: number; }
export interface ExperimentalAssemblyContract {
  id:string;
  adapt:(preparation:ReturnType<typeof prepareGenerationContracts>,config:PlanConfig)=>void;
  filterCandidate?:(card:RepairWorkoutMetadata,context:{week:number;phase?:string;weekType?:string;slot:DaySlot;dayIndex:number})=>boolean;
  doseRange?:(card:RepairWorkoutMetadata,context:{week:number;phase?:string;weekType?:string;slot:DaySlot;dayIndex:number})=>[number,number]|null;
  /** Optional review-scoped deterministic tie-breaker; never skips any validation. */
  rankCandidate?:(card:RepairWorkoutMetadata,context:{week:number;phase?:string;weekType?:string;slot:DaySlot;dayIndex:number})=>number;
  /** One V3 source cannot be used twice via two different composites in one week. */
  consumedSourceIds?:(card:RepairWorkoutMetadata)=>readonly string[];
  /** Read-only source recovery floors. Without training start times, proof may be impossible. */
  sourceRecoveryForId?:(id:string)=>readonly {sourceId:string;sport:string;hours:number}[];
  /** V310: EXACT personally configured V3 blocks and separately approved brick
   * transitions; null means no source/time-zone proof and MUST fail closed. */
  sourceStructuredZoneForId?:(id:string,chosenDurationMin:number|undefined)=>NativeZoneDose|null;
  /** Exact source V3 blocks, preserving Z4–Z6 separate from Z3 and unknown. */
  sourceFullStructuredDoseForId?:(id:string,chosenDurationMin:number|undefined)=>StructuredZoneDose|null;
  /** V321 opt-in: refuse any mismatch between source-specific measured anchors
   * and the athlete metrics actually supplied to the real planner. */
  requireReviewedAthleteContext?:true;
  validateReviewedAthleteContext?:(athlete:PlanAthleteData)=>readonly string[];
  /** Only explicitly reviewed compositions may be decomposed for a V35 ratio audit. */
  verifiedBrickCompositions?:readonly RepairWorkoutMetadata[];
  /** V35 safety experiment: enforce the stated availability even without a volume ramp. */
  enforceWeeklyHoursCap?:true;
  /** An OPTIONAL clock given explicitly by a coach, never inferred from the calendar. */
  coachSessionStart?:(session:ParsedSession)=>CoachSessionStart|null|undefined;
  /** V310: separate confirmed calendar-slot clocks, needed ONLY to prove
   * adjacent-day source recovery. Must agree with coachSessionStart for the
   * actual selected session; absent/inconsistent evidence fails closed. */
  coachSlotStart?:ConfirmedSlotStart;
  /** Opt-in: discard V3 source doses without a provable calendar-only recovery window. */
  enforceCalendarSafeV3Recovery?:true;
  /** Opt-in V313: reject source doses that cross an authentic coach-confirmed same-day start. */
  enforceConfirmedNoSameDayOverlap?:true;
  /** Opt-in: label only recovery weeks with a measured >=30% week-over-week dose reduction. */
  annotateVerifiedDeloads?:true;
  /** Opt-in bounded chronology repair: swaps existing slots only, preserves quotas. */
  improveV3RecoveryLayout?:true;
  /** Opt-in independent minute-based triathlon sport ratio audit, without suppressing native validators. */
  auditVerifiedMultisportMinutes?:true;
  /** V311: global optimistic domain ratios over only exact approved source doses. */
  auditGlobalSourceSportRatioBounds?:true;
  /** Experimental ONLY: migrate the erroneous COUNT sport ratio to strict
   * source-certified minutes, conditioned on full brick and frequency proof.
   * Native validation remains the default when this flag is absent. */
  applyReviewedMinuteSportRatio?:true;
  /** Opt-in ONLY: favor verified candidate durations by chosen discipline,
   * keeping original source doses and key-limiter ranking intact. */
  preferSourceBackedMultisportBalance?:'all'|'bike'|'run'|'swim'|'triathlon'|'triathlon_targets';
  /** V314 opt-in: on the FINAL load week, search until ALL cumulative exact
   * 70.3/IM sport-minute targets pass. Never relax native validators. */
  requireFinalTriathlonMinuteRatios?:true;
  /** V315 isolated replay: STRICTLY in-range target for ranking certified
   * source alternatives. It cannot change the final ratio gates. */
  ratioTargetPreference?:Readonly<TriMinutes>;
  /** V315 experimental-only: require real >=30% recovery-week time reduction
   * while selecting candidates, not after accepting a whole calendar. */
  requireMeasuredDeloadSelection?:true;
  /** V343 experimental: demand an exact, individually reviewed Z4–Z6 V3
   * stimulus on a RUN key slot of every non-race LOAD week. This does not
   * replace Lorang, limiter coherence or the native periodization validator. */
  requireReviewedRunningKeyQualityOnLoadWeeks?:true;
  /** V344 opt-in: prioritize an already-admissible source-backed quality KEY
   * slot during DFS, not only a candidate within that slot. Ordering ONLY. */
  prioritizeVerifiedRunningQualitySlot?:true;
  /** V346 opt-in: source-verified quality must be searched first INSIDE the
   * ordered key domain, even when ordinary limiter/rotation scores differ.
   * Candidate eligibility and every final sporting gate remain unchanged. */
  prioritizeVerifiedRunningQualityCandidate?:true;
  /** V347 optional search order only: maximize the actually proven V3
   * Z1/Z2 versus non-easy margin, after authentic source-backed quality.
   * No cap, intensity, limiter rule, or certificate is modified. */
  prioritizeRunningStructuredEasyMargin?:true;
  /** V350 opt-in: choose the FIRST quality-anchoring key SLOT by the
   * best achievable certified easy/polarization margin (not just smallest
   * source domain). Ranking only: no dose/source/slot becomes admissible. */
  prioritizeRunningQualitySlotByMargin?:true;
  /** V345 opt-in: certify the NECESSARY presence of one genuine source-backed
   * RUN quality option in a B13-distinct matching of current slot domains. */
  auditRunningQualitySourceMatching?:true;
  /** V316 opt-in: a native periodization warning cannot count as strict sporting GO. */
  requireStrictPeriodizationEvidence?:true;
  /** V317 independent athlete-approved 70.3/IM race pace source evidence. */
  reviewedRaceSpecificForId?:(id:string)=>ProvenRaceSource|null|undefined;
  requireReviewedRaceSpecificPeak?:true;
  /** V315 only: validate training frequency excluding certified official race
   * EVENTS, while preserving physical and native validation of the full plan. */
  verifyOfficialRaceQuotaProjection?:true;
  /** V315 isolated evidence-based replacement of native TEXT zone estimates,
   * only when ALL real V3 source dose blocks meet the stricter per-load-week
   * contract; never changes native validators in the released application. */
  reconcileReviewedSourcePolarization?:true;
  /** V315 only: avoid already forbidden taper-phase candidates before DFS;
   * unchanged final native phase validator remains authoritative. */
  excludeNativeForbiddenTaperCandidates?:true;
  /** Opt-in: exclude sprint/pmax/neuromuscular candidates under an explicit coach Sprint Ban. */
  filterDeclaredSprintBanCandidates?:true;
  /** Opt-in hard condition: a non-finisher load week must select a real A/B quality stimulus. */
  requireRealQualityOnLoadWeeks?:true;
  /** V322 isolated: enforce native non-deload/non-race A/B category presence
   * in candidate selection even during the peak/taper phase, not just LOAD.
   * Requires genuine Z4+ source on an existing key slot; no invented dose. */
  requireLorangQualityBeforeFinalValidation?:true;
  /** V329: taper quality requires verified high-zone BLOCK minutes on an
   * individually approved source; names, labels and empty durations do not count. */
  requireSourceVerifiedTaperQuality?:true;
  /** V331 experimental-only policy: no CSS-vs-seuil lexical bypass. Only
   * explicit context/week/source/DOSE-specific coach review may reconcile ONE
   * native threshold text error. All native findings remain in the audit. */
  requireExplicitTaperSemanticReview?:true;
  taperSemanticAthleteContextId?:string;
  explicitTaperReviewForSession?:(session:ParsedSession)=>
    ExplicitTaperCoachReview|null|undefined;
  /** V335 opt-in: source-certified semi/marathon peak; native checks retained. */
  enableV335SourceRunningPeak?:true;
  reviewedRunningSpecificForId?:(id:string)=>ReviewedRunningSpecificSource|null|undefined;
  /** V351: exact, athlete-reviewed V3 limiter keys for independent marathon audit. */
  reviewedSourceLimiterKeysForId?:(id:string)=>readonly string[]|null|undefined;
  /** V351: strict 16/40-week audit; cannot suppress any native validator. */
  auditMarathonHorizonEvidence?:true;
  /** V353: split long marathon Build only at REAL >=30% measured deloads.
   * Does not change the workout selection, phase source eligibility or quotas. */
  enableVerifiedMarathonMesocycles?:true;
  /** V352: replace only a source-proven false-negative native text warning. */
  reconcileReviewedMarathonSpecificityLexicalWarning?:true;
  /** V333 opt-in: necessary forward checking, never a sporting exemption. */
  enableV333ForwardCheck?:true;
  /** Exploratory ONLY: require >=75% native-estimated Z1/Z2 and <=30%
   * unknown intensity minutes on load weeks; no physiological attestation. */
  requireNativePolarizationOnLoadWeeks?:true;
  /** V310 opt-in: source BLOCK duration, never native text interpretation.
   * The unchanged final native validator remains mandatory. */
  requireStructuredPolarizationOnLoadWeeks?:true;
  /** Read-only full-plan trace: verified and missing block-zone sources. */
  auditStructuredPolarizationSources?:true;
}
export interface ChoiceTrace { week:number; day:string; id:string; sport?:string; duration:number|null; intent:string; reason:string; }
export interface EngineResult {
  status:'refused'|'candidate'; reason?:string; technicallyConstructed:boolean;
  constraintsSatisfied:boolean; sportingRelevance:'not_attested'; humanReviewRequired:true;
  candidate?:ParsedPlan; trace:ChoiceTrace[]; nodes:number;
  issues:Array<{code:string;week?:number;severity:string;message?:string}>;
  limiterPriorities:string[];
}
/** A frequency-only marker never represents a performed zero-minute workout. */
/** V3 strength has real neuromuscular/RPE anchors, never aerobic zones. */
function isIndividuallyReviewedV3Strength(card:RepairWorkoutMetadata):boolean {
  return normalizeRepairSport(card.sport)==='strength'&&card.mainZoneMax===0&&
    card.zones.length===0&&
    card.tags.includes('v3-strength-timebox-no-fabricated-aerobic-zone')&&
    card.tags.includes('v3-sporting-source-individually-reviewed-candidate')&&
    card.tags.includes('v3-intensity-anchors-individually-verified');
}
function isCountOnlyStrength(card:RepairWorkoutMetadata):boolean {
  return isIndividuallyReviewedV3Strength(card)&&
    card.durationMin[0]===0&&card.durationMin[1]===0&&
    card.tags.includes('v3-strength-frequency-only-unknown-duration');
}
const DEFAULT_LIMITS:SearchLimits={maxNodes:20000,maxMilliseconds:5000};

/** Match the native final validator's explicit day-J/veille restrictions.
 * This is a proactive selection guard, not an exemption from validation. */
const RACE_DAY_ONLY_WHEN = /matin\s*comp[ée]tition|jour\s*j\b|veille\s*de\s*course/i;
export function raceOnlySourceMatchesDay(
  when:string|undefined, dayIndex:number, raceDayIndex:number|null
):boolean {
  if(!when || !RACE_DAY_ONLY_WHEN.test(when))return true;
  if(raceDayIndex===null)return false;
  if(/veille\s*de\s*course/i.test(when))return dayIndex===raceDayIndex-1;
  return dayIndex===raceDayIndex;
}
/** All limits are hard caps; an exhausted search is not a proof of infeasibility. */
export function constructDeterministicPlan(athlete:PlanAthleteData,config:PlanConfig,limits:SearchLimits=DEFAULT_LIMITS,experimentalContract?:ExperimentalAssemblyContract):EngineResult {
  const result:EngineResult={status:'refused',technicallyConstructed:false,constraintsSatisfied:false,
    sportingRelevance:'not_attested',humanReviewRequired:true,trace:[],nodes:0,issues:[],
    limiterPriorities:[...(config.identifiedLimitersRaw??[])]};
  const refuse=(reason:string)=>({...result,reason});
  if(!Number.isInteger(limits.maxNodes)||limits.maxNodes<=0||!Number.isFinite(limits.maxMilliseconds)||limits.maxMilliseconds<=0)return refuse('invalid_search_budget');
  if(!Number.isInteger(config.weeksAvailable)||!config.weeksAvailable||config.weeksAvailable>104)return refuse('unsupported_horizon');
  if(experimentalContract?.requireReviewedAthleteContext===true){
    // No provider, stale review data, or any athlete/source mismatch: refuse
    // BEFORE selecting a single session. Never infer a substitute FTP or pace.
    let problems:readonly string[]=[];
    try{
      problems=experimentalContract.validateReviewedAthleteContext?.(athlete)??['reviewed_athlete_context_provider_missing'];
    }catch{
      problems=['reviewed_athlete_context_provider_unavailable'];
    }
    if(problems.length){
      result.issues.push({code:'det_v321_reviewed_athlete_context_refused',
        severity:'blocking',message:JSON.stringify({problems})});
      return refuse('reviewed_athlete_context_refused');
    }
  }
  // Source metadata is captured during the genuine week assembly and reused
  // for an optional independent final taper adjudication (no new catalogue).
  let finalizedSourceMetadata:RepairWorkoutMetadata[]=[];
  // Existing dedicated template: preserve its dose and progression, never invent cards.
  if(config.objective==='StartToRun') {
    if(config.weeksAvailable!==12 || config.constraints || config.raceGoals?.length)return refuse('static_template_configuration_requires_review');
    result.candidate=buildStartToRunTemplatePlan();
    result.issues.push({code:'static_template_individualization_not_attested',severity:'warning'});
  } else {
    const preparation=prepareGenerationContracts(athlete,config,{rotationSeed:0});
    experimentalContract?.adapt(preparation,config);
    // V334: adaptation is the ONLY writer of the source pools. Freeze one
    // identical, ID-deduplicated catalogue for prevalidation and every week.
    // This removes redundant 30–40-week catalogue joins and sport scans,
    // without changing card order, eligibility, quotas, doses or safety gates.
    const catalog=[...new Map([
      ...Object.values(preparation.phaseRepairCatalogs).flat(),
      ...preparation.chunkRepairCatalogs.flat(),
      ...preparation.chunkRegenRepairCatalogs.flat(),
    ].map(m=>[m.id,m])).values()];
    const catalogById=new Map(catalog.map(m=>[m.id,m]));
    const catalogBySport=new Map<ReturnType<typeof normalizeRepairSport>,typeof catalog>();
    for(const card of catalog){
      const sport=normalizeRepairSport(card.sport);
      const existing=catalogBySport.get(sport);
      if(existing)existing.push(card);
      else catalogBySport.set(sport,[card]);
    }
    // The current prepared weekly layout can contain OPTIONAL cross-training
    // slots even if the final athlete/phase-specific catalogue contains zero
    // admissible cards of that sport (e.g. an optional bike in a 10K-only plan).
    // Never remove a mandatory frequency, a race event or a safety check.
    // Only in the isolated DET experimental bridge, recompute prevalidation
    // after removing demonstrably unsatisfiable OPTIONAL slots.
    let report=assessPreparedGeneration(config,preparation);
    if(experimentalContract){
      // An official race is not an extra training brick. Keep the native
      // builder's previous semantics UNCHANGED for control replays and
      // production. Rebuild only a rejected, formally declared race-week
      // reservation in this explicitly experimental DET path.
      let eventRebuilt=false;
      for(const week of report.weeks){
        const entry=preparation.weeklyQuotas[week.week];
        const required=entry?.layout?.requiredEvents??[];
        if(entry?.weekType!=='race'||!required.length)continue;
        const missing=required.some(event=>!entry.layout?.days.some(day=>
          day.dayName===event.dayName&&day.slots.some(slot=>
            slot.isRaceEvent&&slot.sport===event.sport)));
        if(!missing||!required.some(event=>entry.quota[event.sport].max===0))continue;
        const availableSports=new Set(week.eligible.map(card=>card.sport as LayoutSport));
        const revised=buildWeeklySlotLayout(entry.quota,entry.floors,entry.weekType,{
          availableSports,raceEvents:required,dayBans:preparation.dayBans,
          officialRaceOutsideTrainingQuota:true,
        });
        entry.layout=revised;
        eventRebuilt=true;
        result.issues.push({code:'det_official_race_outside_training_brick_quota',
          week:week.week,severity:'warning',
          message:'Official race reserved separately from workouts; unchanged training quotas and native safety gates revalidated.'});
      }
      if(eventRebuilt)report=assessPreparedGeneration(config,preparation);
      let changed=false;
      for(const week of report.weeks){
        const entry=preparation.weeklyQuotas[week.week];
        if(!entry?.layout)continue;
        // Use EXACTLY the same physical catalogue as the deterministic
        // assignment below. The prevalidation source list can contain IDs
        // not present in these assembled pools; those cannot fill a slot.
        const allowedIds=new Set(week.eligible.map(c=>c.id));
        // V338: a native eligible card that the athlete's reviewed V3
        // contract excludes is NOT an executable source. Check actual slot
        // reviews before deciding whether an optional sport is available.
        // Mandatory minima and official races remain untouchable.
        const eligibleSports=new Set<LayoutSport>();
        for(const [dayIndex,day] of entry.layout.days.entries()){
          for(const slot of day.slots){
            if(slot.isRaceEvent)continue;
            const candidates=catalogBySport.get(normalizeRepairSport(slot.sport))??[];
            const available=candidates.some(m=>{
              if(!allowedIds.has(m.id))return false;
              try{
                return experimentalContract.filterCandidate?.(m,{
                  week:week.week,phase:week.phase,weekType:week.weekType,
                  slot,dayIndex,
                })??true;
              }catch{return false;}
            });
            if(available)eligibleSports.add(slot.sport);
          }
        }
        const optionalMissing=new Set<LayoutSport>();
        for(const day of entry.layout.days)for(const slot of day.slots){
          if(!slot.isRaceEvent && entry.quota[slot.sport].min===0 &&
             !eligibleSports.has(slot.sport)) optionalMissing.add(slot.sport);
        }
        if(!optionalMissing.size)continue;
        const days=entry.layout.days.map(day=>{
          const slots=day.slots.filter(slot=>slot.isRaceEvent||
            !optionalMissing.has(slot.sport));
          return {...day,slots,isRest:day.isRest||slots.length===0};
        });
        const targetsBySport={...entry.layout.targetsBySport};
        for(const sport of optionalMissing)targetsBySport[sport]=0;
        entry.layout={...entry.layout,days,targetsBySport};
        changed=true;
        result.issues.push({code:'det_optional_slot_missing_catalogue_pruned',
          week:week.week,severity:'warning',
          message:[...optionalMissing].join(',')+
            ': optional sport with zero actually eligible sources; weekly minima revalidated'});
      }
      if(changed)report=assessPreparedGeneration(config,preparation);
      // A coach-confirmed, sport-specific appointment schedule MUST NOT be
      // silently rewritten by a day-only recovery optimization. Keep the
      // declared slots fixed and verify their actual recovery gaps later.
      const verifiedSlotClockMode=experimentalContract.coachSlotStart!==undefined &&
        experimentalContract.coachSessionStart!==undefined;
      if(verifiedSlotClockMode && experimentalContract.improveV3RecoveryLayout===true){
        result.issues.push({code:'det_v310_preserved_coach_confirmed_slot_layout',
          severity:'warning',message:'No automatic day swaps under explicit coach-confirmed appointment clocks'});
      }
      if(experimentalContract.improveV3RecoveryLayout===true &&
         !verifiedSlotClockMode &&
         experimentalContract.enforceCalendarSafeV3Recovery===true &&
         experimentalContract.sourceRecoveryForId){
        const contexts=report.weeks.flatMap(week=>{
          const entry=preparation.weeklyQuotas[week.week];
          return entry?.layout?[{
            week:week.week,layout:entry.layout,quota:entry.quota,
            // In V310 strict structured mode, a legacy source without
            // individually certified zone blocks cannot satisfy a V3
            // recovery-repair domain. The old heuristic would count such
            // legacy entries as safe because they had zero V3 recovery data.
            // Preserve historical inputs outside the strict experiment.
            reviewedIds:week.eligible.filter(src=>
              experimentalContract.requireStructuredPolarizationOnLoadWeeks!==true ||
              experimentalContract.sourceStructuredZoneForId?.(src.id,src.durationMin[0])!=null
            ).map(src=>({id:src.id,sport:src.sport,durationMin:src.durationMin})),
          }]:[];
        });
        const repair=improveCalendarRecoveryByExistingSlotSwaps(contexts,
          experimentalContract.sourceRecoveryForId,preparation.dayBans,12);
        for(const context of contexts)preparation.weeklyQuotas[context.week].layout=context.layout;
        if(repair.swaps.length)report=assessPreparedGeneration(config,preparation);
        for(const swap of repair.swaps)result.issues.push({
          code:'det_v3_recovery_slot_swap',week:swap.week,severity:'warning',
          message:JSON.stringify(swap),
        });
        result.issues.push({code:'det_v3_recovery_layout_search_summary',
          severity:'warning',message:JSON.stringify({
            permittedSlotSwaps:repair.swaps.length,remainingUnprovenV3Domains:repair.remainingMissing,
          })});
      }
    }
    result.issues.push(...report.issues.map(i=>({...i})));
    if(experimentalContract)result.issues.push({code:'experimental_contract_requires_review',severity:'warning'});
    if(report.status==='blocked')return refuse('existing_prevalidation_blocked');
    if(report.weeks.some(w=>!preparation.weeklyQuotas[w.week]?.layout))return refuse('dedicated_route_without_deterministic_quota');
    const scheduledSports=report.weeks.flatMap(week=>preparation.weeklyQuotas[week.week]?.layout?.days
      .flatMap((d,dayIndex)=>d.slots.map(slot=>({week:week.week,dayIndex,sport:slot.sport})))??[]);
    const plan:ParsedPlan={title:`Plan TFCL™ — ${config.objective} ${athlete.nom??"Profil synthétique"} — ${config.weeksAvailable} semaines`,phases:[],weeks:[],totalWeeks:config.weeksAvailable,weeklyQuotas:preparation.weeklyQuotas};
    const usage=new Map<string,number>();
    const started=performance.now();
    let exhausted=false;
    let previousLoad:number|undefined;
    let previousCalendarWeekMinutes:number|null=null;
    const sourceSlotRatioDomains:RatioSlotDomain[]=[];
    const sourceLoadLedger={swim:0,bike:0,run:0};
    let sourceLoadLedgerVerified=true;
    const strictFinalRatioRequested=experimentalContract?.requireFinalTriathlonMinuteRatios===true;
    const objectiveForRatio=normalizeRepairGoal(config.objective??'')==='half'?'703':
      normalizeRepairGoal(config.objective??'')==='ironman'?'IM':null;
    if(strictFinalRatioRequested&&(
      !objectiveForRatio||
      experimentalContract?.preferSourceBackedMultisportBalance!=='triathlon_targets'||
      experimentalContract?.requireStructuredPolarizationOnLoadWeeks!==true)){
      result.issues.push({code:'det_v314_final_ratio_requires_structured_targets',
        severity:'blocking',message:'Strict final ratio search requires verified V3 structured polarization and triathlon_targets; no unproved source may be counted.'});
      return refuse('v314_strict_final_ratio_prerequisites_missing');
    }
    const lastPeakWeekNumber=report.weeks.reduce((last,w)=>
      w.phase?.trim().toLowerCase()==='peak'?w.week:last,0);
    let peakRaceSpecificSeen=false;
    const lastLoadWeekNumber=report.weeks.reduce((last,w)=>
      preparation.weeklyQuotas[w.week]?.weekType==='load'?w.week:last,0);
    if(strictFinalRatioRequested&&!lastLoadWeekNumber)return refuse('v314_no_load_weeks_to_certify');
    const exactTriContribution=(session:ParsedSession):TriContribution|null=>{
      if(!session.catalogId||!['swim','bike','run','brick'].includes(session.sport)||
         typeof session.durationMin!=='number'||!Number.isFinite(session.durationMin)||
         session.durationMin<=0||
         !experimentalContract?.sourceStructuredZoneForId?.(session.catalogId,session.durationMin))
        return null;
      const minutes=session.durationMin;
      if(session.sport==='brick'){
        try {
          const split=splitVerifiedV3Brick(session.catalogId,session.details,
            minutes,experimentalContract.verifiedBrickCompositions??[]);
          return split?{swim:0,bike:split.bike,run:split.run,transition:split.transition}:null;
        }catch{return null;}
      }
      return {swim:session.sport==='swim'?minutes:0,
        bike:session.sport==='bike'?minutes:0,
        run:session.sport==='run'?minutes:0,transition:0};
    };
    for(const w of report.weeks) {
      const entry=preparation.weeklyQuotas[w.week];
      const layout=entry.layout!;
      finalizedSourceMetadata=catalog;
      const weekNodesAtStart=result.nodes;
      const allowedIds=new Set(w.eligible.map(m=>m.id));
      const slots=layout.days.flatMap((d,dayIndex)=>d.slots.map(slot=>({slot,dayIndex,dayName:d.dayName})));
      const eventDay=layout.days.findIndex(d=>d.slots.some(s=>s.isRaceEvent));
      const raceDayIndex=eventDay>=0?eventDay:null;
      if(slots.some(s=>s.slot.isRaceEvent))result.issues.push({code:'race_duration_unestimated',week:w.week,severity:'warning'});
      const weeklyUsage=new Map<string,number>();
      const chosen:ParsedSession[]=[];
      const context={objective:w.objective,phase:w.phase,weekType:w.weekType};
      const runningGoal=normalizeRepairGoal(config.objective??'');
      const sourceSpecificEnabled=experimentalContract?.enableV335SourceRunningPeak===true&&
        (runningGoal==='semi'||runningGoal==='marathon');
      const sourceSpecificCache=new WeakMap<ParsedSession,boolean>();
      const hasProvenRaceSpecificity=(session:ParsedSession):boolean=>{
        if(!sourceSpecificEnabled)return hasSourceVisibleRaceSpecificity(session);
        const cached=sourceSpecificCache.get(session);
        if(cached!==undefined)return cached;
        const verified=verifyReviewedRunningRaceSpecific(session,
          runningGoal as 'semi'|'marathon',
          experimentalContract?.reviewedRunningSpecificForId,
          experimentalContract?.sourceFullStructuredDoseForId).verified;
        sourceSpecificCache.set(session,verified);
        return verified;
      };
      let calendarRecoveryExclusions=0;
      let confirmedOverlapExclusions=0;
      let sprintBanExclusions=0;
      let taperPhaseExclusions=0;
      const sprintBanned=experimentalContract?.filterDeclaredSprintBanCandidates===true &&
        config.prohibitions?.some(text=>/sprint\s*ban/i.test(text))===true;
      let ceiling=entry.volumeBudget?.maxMinutes??Infinity;
      // Without a coach volume ramp, the historical solver used Infinity.
      // This opt-in never expands a pre-existing stricter bound. No inferred
      // increase in training hours is permitted.
      if(experimentalContract?.enforceWeeklyHoursCap===true &&
         typeof config.weeklyHours==='number' && Number.isFinite(config.weeklyHours) &&
         config.weeklyHours>0) {
        ceiling=Math.min(ceiling,Math.floor(config.weeklyHours*60));
      }
      if(previousLoad!==undefined&&entry.volumeBudget)ceiling=Math.min(ceiling,previousLoad*(entry.weekType==='recovery'?0.7:1+entry.volumeBudget.weeklyIncreasePctMax));
      if(experimentalContract?.requireMeasuredDeloadSelection===true &&
         entry.weekType==='recovery'){
        const realCap=measuredRecoveryCeiling(previousCalendarWeekMinutes);
        if(realCap===null){
          result.issues.push({code:'det_v315_recovery_reference_minutes_unverified',
            week:w.week,severity:'blocking',message:
            'The immediately preceding week has unmeasured training time; a -30% recovery week cannot be certified.'});
          return refuse('v315_recovery_reference_minutes_unverified_week_'+w.week);
        }
        ceiling=Math.min(ceiling,realCap);
      }
      const options=slots.map(({slot,dayIndex,dayName})=>{
        if(slot.isRaceEvent)return [{weekNumber:w.week,weekTheme:w.phase??'',phase:w.phase??'',dayIndex,dayName,sport:slot.sport,title:`COURSE : ${w.objective}`,details:'Épreuve déclarée ; durée à confirmer par le coach.',durationMin:0,custom:true,isRest:false,isKeySession:true,zones:[]} satisfies ParsedSession];
        return (catalogBySport.get(slot.sport)??[]).filter(m=>allowedIds.has(m.id))
          .filter(m=>raceOnlySourceMatchesDay(m.when,dayIndex,raceDayIndex))
          .filter(m=>evaluateRepairSportingEquivalence(null,m,{...context,operation:'insertion'}).compatible)
          .filter(m=>!experimentalContract?.filterCandidate||experimentalContract.filterCandidate(m,{...context,week:w.week,slot,dayIndex}))
          .flatMap(m=>{
            if(isCountOnlyStrength(m)){
              // Strength contributes one prescribed session, not a fabricated
              // zero-minute workload. Unknown time remains absent.
              const session:ParsedSession={
                weekNumber:w.week,weekTheme:w.phase??'',phase:w.phase??'',dayIndex,dayName,
                sport:'strength',title:m.title,details:m.structure,catalogId:m.id,custom:false,
                isRest:false,isKeySession:!!slot.isKeySession,zones:[],
              };
              const checked=checkSessionCatalogue(session,{...context,catalog});
              // Only duration and aerobic-zone checks are inapplicable.
              const unexpected=checked.unknown.filter(code=>
                !['duration_not_preserved','intensity_not_declared'].includes(code));
              return checked.errors.length||unexpected.length?[]:[session];
            }
            // Only the original catalogue dose range is executable; preserve full structure.
            const explicitRange=experimentalContract?.doseRange?.(m,{...context,week:w.week,slot,dayIndex});
            if(explicitRange===null)return [];
            const duration=Math.max(m.durationMin[0],slot.minDurationMin??0,explicitRange?.[0]??0);
            if(duration>Math.min(m.durationMin[1],slot.maxDurationMin??Infinity,explicitRange?.[1]??Infinity))return [];
            const session:ParsedSession={weekNumber:w.week,weekTheme:w.phase??'',phase:w.phase??'',dayIndex,dayName,
              sport:slot.sport,title:m.title,details:m.structure,catalogId:m.id,custom:false,durationMin:duration,
              isRest:false,isKeySession:!!slot.isKeySession,zones:m.mainZoneMax?[`Z${m.mainZoneMax}`]:m.zones};
            const checked=checkSessionCatalogue(session,{...context,catalog});
            // A timeboxed V3 strength prescription has confirmed appointment
            // minutes but correctly NO aerobic Z1-Z7. The legacy validator
            // flags absent aerobic zones as unknown; this ONE inapplicable
            // check cannot make all 100 timed strength sources unselectable.
            const unverified=checked.unknown.filter(code=>
              !(code==='intensity_not_declared'&&isIndividuallyReviewedV3Strength(m)));
            return checked.errors.length||unverified.length?[]:[session];
          }).filter(session=>{
            if(experimentalContract?.excludeNativeForbiddenTaperCandidates!==true ||
               (w.phase!=='taper'&&entry.weekType!=='taper'))return true;
            const disallowed=candidateViolatesNativeTaperPhase(session);
            if(disallowed)taperPhaseExclusions++;
            return !disallowed;
          }).filter(session=>
            experimentalContract?.requireStrictPeriodizationEvidence!==true ||
            w.phase?.trim().toLowerCase()!=='peak' ||
            !violatesNativeNormalPeak(session)
          ).filter(session=>
            experimentalContract?.requireMeasuredDeloadSelection!==true ||
            entry.weekType!=='recovery' ||
            (typeof session.durationMin==='number'&&
             Number.isFinite(session.durationMin)&&session.durationMin>0)
          ).filter(session=>{
            if(!sprintBanned)return true;
            // Conservative candidate-level guard for a declared coach ban.
            // Do not rely on the final validator to find this after planning.
            const text=session.title+' '+session.details;
            const forbidden=/(?:sprint|pmax|neuromuscul|all[ -]?out|tabata|plyom|pliom|explosif)/i.test(text);
            if(forbidden)sprintBanExclusions++;
            return !forbidden;
          }).filter(session=>{
            if(!experimentalContract?.enforceCalendarSafeV3Recovery||!session.catalogId||
               !experimentalContract.sourceRecoveryForId)return true;
            const here={week:w.week,dayIndex,sport:slot.sport};
            const requirements=experimentalContract.sourceRecoveryForId(session.catalogId);
            let viable=calendarOnlyRecoverySafe(here,requirements,scheduledSports);
            if(!viable&&experimentalContract.coachSlotStart&&experimentalContract.coachSessionStart){
              let actual:CoachSessionStart|null|undefined;
              let designated:CoachSessionStart|null|undefined;
              try {
                actual=experimentalContract.coachSessionStart(session);
                designated=experimentalContract.coachSlotStart(here);
              }catch{actual=null;designated=null;}
              // A clock associated with a trial source may NOT contradict
              // the independently declared slot clock (no fabricated times).
              const consistent=actual?.provenance==='coach_confirmed'&&
                designated?.provenance==='coach_confirmed'&&
                actual.minuteOfDay===designated.minuteOfDay&&
                actual.utcOffsetMinutes===designated.utcOffsetMinutes;
              if(consistent)viable=calendarOrConfirmedClockRecoverySafe(
                here,session.durationMin,requirements,scheduledSports,
                experimentalContract.coachSlotStart);
            }
            if(!viable)calendarRecoveryExclusions++;
            return viable;
          }).filter(session=>{
            if(experimentalContract?.enforceConfirmedNoSameDayOverlap!==true)return true;
            const here={week:w.week,dayIndex,sport:slot.sport};
            let sessionStart:CoachSessionStart|null|undefined;
            try{sessionStart=experimentalContract.coachSessionStart?.(session);}
            catch{sessionStart=null;}
            const viable=confirmedNoSameDayOverlap(here,session.durationMin,
              scheduledSports,experimentalContract.coachSlotStart,sessionStart);
            if(!viable)confirmedOverlapExclusions++;
            return viable;
          }).sort((a,b)=>{
            // Sport-specific eligibility, dose and safety are already checked
            // above. On a KEY slot, the declared limiter is the first real
            // preference; otherwise historical catalogue rotation can hide
            // the limiter even when both source doses are admissible.
            // This changes ordering only: it NEVER bypasses the DFS, recovery,
            // weekly frequency or final plan validators.
            const rank=(s:ParsedSession)=>experimentalContract?.rankCandidate?.(
              catalog.find(m=>m.id===s.catalogId)!,{...context,week:w.week,slot,dayIndex})??0;
            const balanceMode=experimentalContract?.preferSourceBackedMultisportBalance;
            const balance=!!balanceMode &&
              ['half','ironman'].includes(normalizeRepairGoal(config.objective??'')??'');
            // Experimental triathlon: vary ALREADY APPROVED source doses to
            // reduce excessive swim/run and make room for bike. No dose is
            // lengthened, shortened, substituted, or inferred here.
            // Only selection ORDER changes; all other guards stay mandatory.
            const triathlon=balance&&balanceMode==='triathlon';
            const dosePriority=balance && (balanceMode==='all'||balanceMode==='swim'||triathlon) &&
              slot.sport==='swim'?
              (a.durationMin??Infinity)-(b.durationMin??Infinity):
              triathlon&&slot.sport==='run'?
              (a.durationMin??Infinity)-(b.durationMin??Infinity):
              balance && (balanceMode==='all'||balanceMode===slot.sport||triathlon) &&
                (slot.sport==='bike'||slot.sport==='run')?
                (b.durationMin??0)-(a.durationMin??0):0;
            return (slot.isKeySession?rank(a)-rank(b):0)||
              dosePriority||
              (usage.get(a.catalogId!)??0)-(usage.get(b.catalogId!)??0)||
              (!slot.isKeySession?rank(a)-rank(b):0)||
              w.eligible.findIndex(m=>m.id===a.catalogId)-w.eligible.findIndex(m=>m.id===b.catalogId)||
              a.catalogId!.localeCompare(b.catalogId!);
          });
      });
      if(taperPhaseExclusions)result.issues.push({
        code:'det_v315_taper_candidate_phase_exclusions',
        week:w.week,severity:'warning',
        message:taperPhaseExclusions+' phase-incompatible reviewed candidates rejected before DFS; native validator retained',
      });
      if(sprintBanExclusions)result.issues.push({
        code:'det_declared_sprint_ban_candidate_excluded',week:w.week,severity:'warning',
        message:sprintBanExclusions+' sport/phase eligible catalogue candidates excluded under coach-confirmed Sprint Ban',
      });
      if(calendarRecoveryExclusions)result.issues.push({
        code:'det_v3_calendar_recovery_candidates_excluded',week:w.week,severity:'warning',
        message:calendarRecoveryExclusions+' source-slot prescriptions excluded: full recovery hours cannot be proven from day-only layout',
      });
      if(confirmedOverlapExclusions)result.issues.push({
        code:'det_v313_confirmed_overlap_candidates_excluded',week:w.week,
        severity:'warning',message:confirmedOverlapExclusions+
          ' candidate source-slot doses refused: coach-confirmed same-day appointment overlap or absent/ambiguous proof',
      });
      const emptyIndex=options.findIndex(domain=>domain.length===0);
      if(emptyIndex>=0){
        // Preserve the refusal; expose where each candidate disappears.
        const {slot,dayIndex,dayName}=slots[emptyIndex];
        const sportMatches=catalog.filter(m=>allowedIds.has(m.id)&&normalizeRepairSport(m.sport)===slot.sport);
        const afterRaceDayContext=sportMatches.filter(m=>raceOnlySourceMatchesDay(m.when,dayIndex,raceDayIndex));
        const equivalent=afterRaceDayContext.filter(m=>
          evaluateRepairSportingEquivalence(null,m,{...context,operation:'insertion'}).compatible);
        const afterReview=equivalent.filter(m=>!experimentalContract?.filterCandidate||
          experimentalContract.filterCandidate(m,{...context,week:w.week,slot,dayIndex}));
        const afterDuration=afterReview.filter(m=>{
          if(isCountOnlyStrength(m))return true;
          const range=experimentalContract?.doseRange?.(m,{...context,week:w.week,slot,dayIndex});
          if(range===null)return false;
          const chosen=Math.max(m.durationMin[0],slot.minDurationMin??0,range?.[0]??0);
          return chosen<=Math.min(m.durationMin[1],slot.maxDurationMin??Infinity,range?.[1]??Infinity);
        });
        const samples=afterDuration.slice(0,4).map(m=>{
          const range=experimentalContract?.doseRange?.(m,{...context,week:w.week,slot,dayIndex});
          const duration=isCountOnlyStrength(m)?undefined:
            Math.max(m.durationMin[0],slot.minDurationMin??0,range?.[0]??0);
          const session:ParsedSession={
            weekNumber:w.week,weekTheme:w.phase??'',phase:w.phase??'',dayIndex,dayName,
            sport:slot.sport,title:m.title,details:m.structure,catalogId:m.id,custom:false,
            durationMin:duration,isRest:false,isKeySession:!!slot.isKeySession,
            zones:m.mainZoneMax?['Z'+m.mainZoneMax]:m.zones,
          };
          return {id:m.id,checks:checkSessionCatalogue(session,{...context,catalog})};
        });
        if(calendarRecoveryExclusions)result.issues.push({code:'det_v3_recovery_safe_slot_unfillable',
          week:w.week,severity:'blocking',message:'At least one slot is unfillable after clock-free V3 recovery screening; coach must change the schedule or supply genuine clock evidence.'});
        result.issues.push({code:'det_empty_catalogue_slot',week:w.week,severity:'blocking',
          message:JSON.stringify({day:dayName,sport:slot.sport,phase:w.phase,weekType:w.weekType,
            minDurationMin:slot.minDurationMin??null,maxDurationMin:slot.maxDurationMin??null,
            quotaMin:entry.quota[slot.sport].min,quotaMax:entry.quota[slot.sport].max,
            optionalSportByQuota:entry.quota[slot.sport].min===0,
            allInCatalog:catalog.filter(m=>normalizeRepairSport(m.sport)===slot.sport).length,
            eligibleSportMatches:sportMatches.length,afterRaceDayContext:afterRaceDayContext.length,
            equivalent:equivalent.length,
            afterReview:afterReview.length,afterDuration:afterDuration.length,
            finalAdmissible:0,samples})});
        return refuse('empty_catalogue_domain_week_'+w.week);
      }
      // Source-specific full-horizon diagnostic, constructed from the very
      // same admitted options the DFS receives. Never use unspecified legacy
      // brick minutes to prove a global sport ratio impossible.
      if(experimentalContract?.auditGlobalSourceSportRatioBounds===true&&
         entry.weekType==='load'&&
         ['half','ironman'].includes(normalizeRepairGoal(config.objective??'')??'')){
        slots.forEach(({slot},index)=>{
          if(!['swim','bike','run','brick'].includes(slot.sport))return;
          const strictSources=experimentalContract.requireStructuredPolarizationOnLoadWeeks===true;
          // Without the strict V3 source gate, legacy candidates might still
          // be selected. Proving them impossible from a V3-only pool would be
          // unsound, so the global certificate must remain UNVERIFIED.
          if(!strictSources){
            sourceSlotRatioDomains.push({week:w.week,sport:slot.sport,choices:[null]});
            return;
          }
          // The strict search itself cannot select an unverified source in a
          // load week. Its domain certificate must exclude those alternatives,
          // rather than accidentally granting unreviewed legacy cards volume.
          const domain=options[index].filter(session=>
            !!session.catalogId&&experimentalContract.sourceStructuredZoneForId?.(
              session.catalogId,session.durationMin)!=null);
          const choices=domain.map((session):ExactSportMinutes|null=>{
            const duration=session.durationMin;
            if(typeof duration!=='number'||!Number.isFinite(duration)||duration<=0)return null;
            if(session.sport==='brick'){
              try {
                const split=splitVerifiedV3Brick(session.catalogId??undefined,
                  session.details,duration,experimentalContract.verifiedBrickCompositions??[]);
                return split?{swim:0,bike:split.bike,run:split.run,
                  transition:split.transition}:null;
              }catch{return null;}
            }
            return {swim:session.sport==='swim'?duration:0,
              bike:session.sport==='bike'?duration:0,
              run:session.sport==='run'?duration:0,transition:0};
          });
          sourceSlotRatioDomains.push({week:w.week,sport:slot.sport,choices});
        });
      }
      // Fail early on exact lower bounds, rather than enumerating an impossible Cartesian product.
      const order=options.map((domain,i)=>({domain,slot:slots[i]})).sort((a,b)=>a.domain.length-b.domain.length||a.slot.dayIndex-b.slot.dayIndex);
      const triGoal=['half','ironman'].includes(
        normalizeRepairGoal(config.objective??'')??'');
      const sourceQualityOnLoad=experimentalContract?.requireRealQualityOnLoadWeeks===true &&
        entry.weekType==='load';
      const nativeLorangWeekQuality=experimentalContract?.requireLorangQualityBeforeFinalValidation===true &&
        entry.weekType!=='recovery'&&entry.weekType!=='race'&&
        !layout.days.some(day=>day.slots.some(slot=>slot.isRaceEvent)) &&
        !/d[eé]charge|recovery|r[eé]cup[eé]ration/i.test(w.phase??'');
      const runningQualityRequired=
        experimentalContract?.requireReviewedRunningKeyQualityOnLoadWeeks===true&&
        (runningGoal==='semi'||runningGoal==='marathon')&&
        entry.weekType==='load'&&!layout.days.some(day=>day.slots.some(slot=>slot.isRaceEvent));
      const qualityRequired=((sourceQualityOnLoad||nativeLorangWeekQuality) &&
        config.ambition!=='finisher'&&triGoal)||runningQualityRequired;
      const runningQualityCache=new WeakMap<ParsedSession,boolean>();
      const isQuality=(session:ParsedSession)=>{
        if(runningQualityRequired){
          const cached=runningQualityCache.get(session);
          if(cached!==undefined)return cached;
          let proven=false;
          if(session.isKeySession&&session.sport==='run'&&session.catalogId&&
             typeof session.durationMin==='number'){
            const dose=experimentalContract?.sourceFullStructuredDoseForId?.(
              session.catalogId,session.durationMin);
            proven=!!dose&&dose.provenance==='v3_individually_configured_blocks_only'&&
              dose.sourceIds.length===1&&dose.sourceIds[0]===session.catalogId&&
              dose.high>0;
          }
          runningQualityCache.set(session,proven);
          return proven;
        }
        // V330: reviewed V3 BLOCKS, never a Z4 label, decide taper quality.
        // This does not waive the separate native phase validator.
        if(experimentalContract?.requireSourceVerifiedTaperQuality===true&&
           entry.weekType==='taper'){
          const card=catalog.find(m=>m.id===session.catalogId);
          return verifyReviewedTaperKeyStimulus(session,card,
            experimentalContract.sourceFullStructuredDoseForId).verified;
        }
        return !!session.isKeySession&&
          session.zones?.some(zone=>/z\s*[4-7]/i.test(zone))===true;
      };
      // V343: prioritize truly verified intensity on existing key slots.
      // Source, dose, frequency, clocks and every validator remain unchanged.
      if(runningQualityRequired)for(const item of order){
        if(item.slot.slot.isKeySession)item.domain.sort((a,b)=>
          Number(isQuality(b))-Number(isQuality(a)));
      }
      if(runningQualityRequired&&
         experimentalContract?.prioritizeVerifiedRunningQualitySlot===true){
        // Most-constrained-first is otherwise overwhelmed by easy sessions
        // before it ever visits the genuinely required quality key slot.
        // All slot domains are untouched: reordering cannot make any
        // physiologically forbidden choice eligible or bypass a native check.
        const certifiedKey=(item:typeof order[number])=>
          item.slot.slot.isKeySession&&item.domain.some(isQuality);
        const qualityMargin=(item:typeof order[number]):number=>{
          if(!certifiedKey(item))return -Infinity;
          const margins=item.domain.filter(isQuality).flatMap(session=>{
            const dose=session.catalogId?
              experimentalContract?.sourceFullStructuredDoseForId?.(
                session.catalogId,session.durationMin):null;
            return dose?[dose.low-3*(dose.mid+dose.high)-0.01*dose.unknown]:[];
          });
          return margins.length?Math.max(...margins):-Infinity;
        };
        const preferMargin=experimentalContract?.prioritizeRunningQualitySlotByMargin===true;
        order.sort((a,b)=>Number(certifiedKey(b))-Number(certifiedKey(a))||
          (preferMargin?qualityMargin(b)-qualityMargin(a):0)||
          a.domain.length-b.domain.length||a.slot.dayIndex-b.slot.dayIndex);
        if(preferMargin)result.issues.push({
          code:'det_v350_running_key_slot_margin_order',week:w.week,
          severity:'warning',message:JSON.stringify({
            firstKeySourceMargin:qualityMargin(order[0]),
            keySlots:order.filter(certifiedKey).map(item=>({
              dayIndex:item.slot.dayIndex,sport:item.slot.slot.sport,
              bestCertifiedEasyMargin:qualityMargin(item),
              sourceCandidates:item.domain.filter(isQuality).length,
            })),
            noChangedEligibilityOrDose:true,scientificAttestation:false,
          }),
        });
        result.issues.push({code:'det_v344_running_quality_slot_priority',
          week:w.week,severity:'warning',message:JSON.stringify({
            sourceVerifiedKeySlotCount:order.filter(certifiedKey).length,
            firstSlot:{sport:order[0]?.slot.slot.sport??null,
              dayIndex:order[0]?.slot.dayIndex??null,
              hasSourceVerifiedKeyQuality:order[0]?certifiedKey(order[0]):false},
            unchangedDomainsAndSportingGates:true,
            thisIsSearchOrderNotSportingAttestation:true,
          })});
      }
      const requiresRaceSpecificPeak=
        experimentalContract?.requireStrictPeriodizationEvidence===true &&
        w.phase?.trim().toLowerCase()==='peak' &&
        w.week===lastPeakWeekNumber && !peakRaceSpecificSeen;
      const raceSpecificSuffix=Array(order.length+1).fill(false) as boolean[];
      for(let i=order.length-1;i>=0;i--)
        raceSpecificSuffix[i]=raceSpecificSuffix[i+1]||
          order[i].domain.some(hasProvenRaceSpecificity);
      const qualitySuffix=Array(order.length+1).fill(false) as boolean[];
      for(let i=order.length-1;i>=0;i--)
        qualitySuffix[i]=qualitySuffix[i+1]||order[i].domain.some(isQuality);
      if(runningQualityRequired&&!qualitySuffix[0]){
        result.issues.push({code:'det_v343_running_quality_domain_unavailable',
          week:w.week,severity:'blocking',message:JSON.stringify({
            week:w.week,sourceBackedKeyQualityCandidates:0,
            proof:'no_individually_reviewed_v3_z4_z6_source_in_existing_key_slots',
            scope:'this_athlete_week_approved_source_domains_only',
            noNewWorkoutOrClockInvented:true,notGlobalImpossibility:true,
          })});
        return refuse('v343_running_quality_domain_unavailable_week_'+w.week);
      }
      if(runningQualityRequired&&
         experimentalContract?.auditRunningQualitySourceMatching===true){
        const proof=assessQualityAnchoredSourceMatching(order.map(({domain})=>
          domain.map(s=>({sourceId:s.catalogId??null,
            verifiedKeyQuality:isQuality(s)}))));
        result.issues.push({
          code:proof.verdict==='provably_unreachable_in_current_domains'?
            'det_v345_running_quality_source_matching_impossible':
            'det_v345_running_quality_source_matching_not_refuted',
          week:w.week,
          severity:proof.verdict==='provably_unreachable_in_current_domains'?
            'blocking':'warning',message:JSON.stringify(proof),
        });
        // Necessary condition failed in the exact approved slot domains.
        // A positive matching never bypasses other gates or implies sport GO.
        if(proof.verdict==='provably_unreachable_in_current_domains')
          return refuse('v345_running_quality_source_matching_impossible_week_'+w.week);
      }
      const minimumSuffix=Array(order.length+1).fill(0) as number[];
      for(let i=order.length-1;i>=0;i--)minimumSuffix[i]=minimumSuffix[i+1]+Math.min(...order[i].domain.map(s=>s.durationMin??0));
      const requireStrictNativeZones=
        experimentalContract?.requireNativePolarizationOnLoadWeeks===true &&
        entry.weekType==='load';
      const requireStructuredZones=
        experimentalContract?.requireStructuredPolarizationOnLoadWeeks===true &&
        entry.weekType==='load';
      const requireAnyStrictZones=requireStrictNativeZones||requireStructuredZones;
      const finalRatioGate=strictFinalRatioRequested&&entry.weekType==='load'&&
        w.week===lastLoadWeekNumber;
      if(finalRatioGate&&!sourceLoadLedgerVerified){
        result.issues.push({code:'det_v314_previous_load_minutes_unverified',
          week:w.week,severity:'blocking',message:'An earlier selected load-week session or brick has no exact, independently certified sport-minute split.'});
        return refuse('v314_previous_load_minutes_unverified');
      }
      const nativeProfiles=new Map<ParsedSession,NativeZoneDose|null>();
      const zoneDomains=requireAnyStrictZones?order.map(({domain})=>domain.map(session=>{
        const dose=requireStructuredZones?
          (session.isRest||normalizeRepairSport(session.sport)==='strength'?
            {low:0,nonLow:0,unknown:0}:
            (session.catalogId?
              experimentalContract?.sourceStructuredZoneForId?.(session.catalogId,session.durationMin)??null:null)):
          nativeZoneDoseForCandidate(session);
        nativeProfiles.set(session,dose);
        return dose;
      })):[];
      let structuredDomains=requireStructuredZones?
        order.map(({domain},slotIndex)=>domain.map((session,candidateIndex)=>{
          const dose=zoneDomains[slotIndex][candidateIndex];
          return dose?{dose,isKeyQuality:isQuality(session)} satisfies BoundedZoneChoice:null;
        })):[];
      const initialNecessaryBounds=requireStructuredZones?
        assessStructuredZoneNecessaryBounds([],structuredDomains,qualityRequired):null;
      if(initialNecessaryBounds&&initialNecessaryBounds.reason!=='not_refuted'){
        result.issues.push({
          code:'det_v310_structured_zone_necessary_bound_refused',
          week:w.week,severity:'blocking',
          message:JSON.stringify({...initialNecessaryBounds,
            proof:'exact_independent_slot_upper_and_lower_bounds',
            qualityRequired,
            noSourceHoursOrDosesInvented:true,
            interpretation:'necessary_condition_for_current_domains_only',
          }),
        });
        return refuse('v310_structured_zone_necessary_bound_refused_week_'+w.week);
      }
      // Structured V3 search: put fully certified, promising candidates
      // first. Preserve the declared limiter ranking on KEY slots. This
      // alters only exploration ORDER, never eligibility or validations.
      // Pair the candidate with its zone profile so all later suffix bounds
      // keep the identical index/source association.
      if(requireStructuredZones){
        const targetRatioMode=experimentalContract?.preferSourceBackedMultisportBalance===
          'triathlon_targets'&&sourceLoadLedgerVerified&&
          ['half','ironman'].includes(normalizeRepairGoal(config.objective??'')??'');
        const objectiveKey=normalizeRepairGoal(config.objective??'')==='half'?'703':'IM';
        const ratioSlotKeys=order.map(({slot},index)=>
          [w.week,slot.dayIndex,slot.slot.sport,index].join(':'));
        const trajectory=targetRatioMode?planTriathlonRatioTrajectory(
          objectiveKey,order.filter(x=>['swim','bike','run','brick'].includes(x.slot.slot.sport))
            .map(({domain,slot})=>{
              const index=order.findIndex(x=>x.slot===slot);
              // Strict V3 search already rejects any non-certified
              // candidate before it can become a selected assignment.
              // Do not let a legacy alternative invalidate an otherwise
              // fully certified slot's advisory trajectory; ONLY actual
              // independently verified candidates contribute its bounds.
              return {id:ratioSlotKeys[index],
                choices:domain.map(session=>exactTriContribution(session))
                  .filter((dose):dose is TriContribution=>dose!==null)};
            }),sourceLoadLedger,ceiling,experimentalContract?.ratioTargetPreference):null;
        if(targetRatioMode)result.issues.push({code:'det_v312_source_ratio_trajectory',
          week:w.week,severity:'warning',message:JSON.stringify({
            available:!!trajectory,
            desired:trajectory?.sportTargetMinutes??null,
            min:trajectory?.low??null,max:trajectory?.high??null,
            referenceMinutes:trajectory?.referenceWeekMinutes??null,
            sourceLedger:{...sourceLoadLedger},
            interpretation:'advisory_ranking_never_a_sporting_pass',
          })});
        for(let slotIndex=0;slotIndex<order.length;slotIndex++){
          const {domain,slot}=order[slotIndex];
          const candidates=domain.map((session,index)=>({
            session,dose:zoneDomains[slotIndex][index],originalIndex:index,
          }));
          const rank=(session:ParsedSession)=>{
            const card=catalog.find(card=>card.id===session.catalogId);
            return card?(experimentalContract?.rankCandidate?.(card,{
              ...context,week:w.week,slot:slot.slot,dayIndex:slot.dayIndex})??0):0;
          };
          const score=(dose:NativeZoneDose|null)=>
            dose===null?-Infinity:dose.low-3*dose.nonLow-0.01*dose.unknown;
          const triathlonOrder=experimentalContract?.preferSourceBackedMultisportBalance===
            'triathlon'&&['half','ironman'].includes(normalizeRepairGoal(config.objective??'')??'');
          const triathlonDuration=(a:ParsedSession,b:ParsedSession)=>
            !triathlonOrder?0:slot.slot.sport==='bike'?
              (b.durationMin??0)-(a.durationMin??0):
              slot.slot.sport==='swim'||slot.slot.sport==='run'?
                (a.durationMin??Infinity)-(b.durationMin??Infinity):0;
          const preferred=trajectory?.preferredBySlot[ratioSlotKeys[slotIndex]];
          const targetDistance=(session:ParsedSession)=>
            triathlonCandidateDoseDistance(exactTriContribution(session),preferred);
          candidates.sort((a,b)=>
            Number(a.dose===null)-Number(b.dose===null)||
            (runningQualityRequired&&slot.slot.isKeySession&&
             experimentalContract?.prioritizeVerifiedRunningQualityCandidate===true?
               Number(isQuality(b.session))-Number(isQuality(a.session)):0)||
            (runningQualityRequired&&
             experimentalContract?.prioritizeRunningStructuredEasyMargin===true?
               score(b.dose)-score(a.dose):0)||
            (slot.slot.isKeySession?rank(a.session)-rank(b.session):0)||
            (qualityRequired&&slot.slot.isKeySession?
              Number(isQuality(b.session))-Number(isQuality(a.session)):0)||
            (trajectory?targetDistance(a.session)-targetDistance(b.session):0)||
            triathlonDuration(a.session,b.session)||
            score(b.dose)-score(a.dose)||
            a.originalIndex-b.originalIndex);
          order[slotIndex].domain=candidates.map(c=>c.session);
          zoneDomains[slotIndex]=candidates.map(c=>c.dose);
        }
        // Keep the exact same candidate-to-evidence alignment after sorting.
        structuredDomains=order.map(({domain},slotIndex)=>domain.map((session,candidateIndex)=>{
          const dose=zoneDomains[slotIndex][candidateIndex];
          return dose?{dose,isKeyQuality:isQuality(session)} satisfies BoundedZoneChoice:null;
        }));
        if(runningQualityRequired&&
           experimentalContract?.prioritizeVerifiedRunningQualityCandidate===true)
          result.issues.push({code:'det_v346_quality_candidate_sort_verified',
            week:w.week,severity:'warning',message:JSON.stringify({
              keyDomains:order.filter(x=>x.slot.slot.isKeySession).map(x=>({
                sport:x.slot.slot.sport,dayIndex:x.slot.dayIndex,
                firstSourceId:x.domain[0]?.catalogId??null,
                firstQuality:!!x.domain[0]&&isQuality(x.domain[0]),
                qualityCandidateCount:x.domain.filter(isQuality).length,
              })),
              sameSourcesAndDoseRanges:true,validatorsUnchanged:true,
            })});
      }
      // Search on the last loading week against the ACTUAL cumulative
      // V3-certified endurance ledger; transitions are excluded. Independent
      // slot extrema prune only provably unreachable remaining combinations.
      // Earlier loading weeks are not retroactively altered by this guard.
      const ratioDomains=finalRatioGate?order.map(({domain,slot})=>
        ['swim','bike','run','brick'].includes(slot.slot.sport)?
          domain.map(exactTriContribution):null):null;
      const rootZoneEnvelope=requireAnyStrictZones?
        optimisticNativeLowShareUpperBound([],zoneDomains):null;
      if(rootZoneEnvelope?.unmeasuredDomain || rootZoneEnvelope?.provablyBelow75){
        const proofKind=requireStructuredZones?'structured_v3_blocks':'native_text_estimate';
        result.issues.push({code:requireStructuredZones?
          'det_structured_polarization_source_envelope_refused':
          'det_native_polarization_source_envelope_refused',
          week:w.week,severity:'blocking',message:JSON.stringify({
            upperBoundLowPct:rootZoneEnvelope.upperPct,
            unprovedSourceDomain:rootZoneEnvelope.unmeasuredDomain,
            unprovedSlots:requireStructuredZones?order.flatMap(({domain,slot},index)=>
              zoneDomains[index].some(dose=>dose!==null)?[]:[{
                day:slot.dayName,sport:slot.slot.sport,
                key:!!slot.slot.isKeySession,long:!!slot.slot.isLongSession,
                admittedCandidates:domain.length,
                exampleSourceIds:domain.slice(0,4).map(s=>s.catalogId??s.title),
              }]):[],
            provablyBelow75:rootZoneEnvelope.provablyBelow75,
            proofKind,scope:'current_reviewed_slot_domains_only',
            interpretation:'necessary_condition_not_an_approved_plan',
          })});
        return refuse(`${proofKind}_polarization_source_envelope_refused_week_${w.week}`);
      }
      if(requiresRaceSpecificPeak&&!raceSpecificSuffix[0]){
        result.issues.push({
          code:'det_v316_race_specific_source_domain_empty',
          week:w.week,severity:'blocking',message:JSON.stringify({
            phase:w.phase,weekType:w.weekType,
            eligibleSlots:order.length,
            provenRaceSpecificSourceCandidates:0,
            previousPeakSourceSeen:peakRaceSpecificSeen,
            nativePatternMirrored:!sourceSpecificEnabled,
            proofKind:sourceSpecificEnabled?'athlete_reviewed_v3_blocks':'native_text',
            remedy:'coach review of appropriate source coverage or phase layout',
            noArtificialIntensityOrWorkoutInserted:true,
          }),
        });
        return refuse('v316_race_specific_source_missing_week_'+w.week);
      }
      if(minimumSuffix[0]>ceiling)return refuse(`minimum_catalogue_dose_exceeds_budget_week_${w.week}`);
      const strictPrunes:Record<string,number>={};
      let rootSourceConflict:HallConflictWitness|null=null;
      const countPrune=(reason:string)=>{strictPrunes[reason]=(strictPrunes[reason]??0)+1;};
      function search(index:number,total:number):boolean {
        if(++result.nodes>limits.maxNodes||performance.now()-started>limits.maxMilliseconds){exhausted=true;return false;}
        if(total+minimumSuffix[index]>ceiling)return false;
        // V333: necessary conditions only. Never bypass an existing guard.
        if(experimentalContract?.enableV333ForwardCheck===true){
          let minimum=total;
          let possibleQuality=chosen.some(isQuality);
          let possibleSpecificity=chosen.some(hasProvenRaceSpecificity);
          const remainingSourceDomains:string[][]=[];
          for(let j=index;j<order.length;j++){
            let slotMinimum=Infinity;
            const feasibleIds:string[]=[];
            for(const session of order[j].domain){
              const id=session.catalogId;
              if(id&&(weeklyUsage.get(id)??0)>=1)continue;
              const card=id?catalogById.get(id):undefined;
              if(card){
                const keys=experimentalContract.consumedSourceIds?.(card)??[];
                if(keys.some(k=>(weeklyUsage.get('v3-source:'+k)??0)>=1))continue;
                if(card.mainZoneMax>=3&&chosen.some(s=>
                    s.sport===session.sport&&
                    Math.abs(s.dayIndex-session.dayIndex)<2&&
                    (catalogById.get(s.catalogId??'')?.mainZoneMax??0)>=3))continue;
              }
              slotMinimum=Math.min(slotMinimum,session.durationMin??0);
              // Independent official race slots have no training-source ID.
              // Every real source ID is subject to B13's weekly uniqueness.
              feasibleIds.push(id??'__official_event_slot_'+j);
              if(isQuality(session))possibleQuality=true;
              if(hasProvenRaceSpecificity(session))possibleSpecificity=true;
            }
            if(!Number.isFinite(slotMinimum)){
              countPrune('v333_remaining_slot_has_no_usable_source');return false;
            }
            remainingSourceDomains.push(feasibleIds);
            minimum+=slotMinimum;
            if(minimum>ceiling){
              countPrune('v333_unavoidable_minimum_exceeds_week_cap');return false;
            }
          }
          // V334: a proof of impossible distinct-card allocation is a
          // safe necessary prune; an available matching is NEVER a pass.
          if(!hasDistinctSourceAssignment(remainingSourceDomains)){
            if(index===0)rootSourceConflict=findHallConflictWitness(remainingSourceDomains);
            countPrune('v334_no_distinct_approved_source_matching');return false;
          }
          if(qualityRequired&&!possibleQuality){
            countPrune('v333_remaining_quality_unavailable');return false;
          }
          if(requiresRaceSpecificPeak&&!possibleSpecificity){
            countPrune('v333_remaining_specificity_unavailable');return false;
          }
        }
        if(qualityRequired&&!chosen.some(isQuality)&&!qualitySuffix[index])return false;
        if(requiresRaceSpecificPeak&&!chosen.some(hasProvenRaceSpecificity)&&
           !raceSpecificSuffix[index]){
          countPrune('v316_race_specificity_unavailable');
          return false;
        }
        if(requireAnyStrictZones){
          const selected=chosen.map(session=>nativeProfiles.get(session));
          if(selected.some(dose=>dose==null))return false;
          const upper=optimisticNativeLowShareUpperBound(
            selected as NativeZoneDose[],zoneDomains.slice(index));
          if(upper.unmeasuredDomain||upper.provablyBelow75)return false;
          if(requireStructuredZones){
            const proposed=selected as NativeZoneDose[];
            const exact=assessStructuredZoneNecessaryBounds(
              proposed.map((dose,i)=>({dose,isKeyQuality:isQuality(chosen[i])})),
              structuredDomains.slice(index),qualityRequired);
            if(exact.reason!=='not_refuted'){
              countPrune(exact.reason);
              return false;
            }
          }
        }
        if(finalRatioGate){
          const selectedRatioDoses=chosen.filter(s=>
            ['swim','bike','run','brick'].includes(s.sport)).map(exactTriContribution);
          const remainingRatioDomains=(ratioDomains?.slice(index).filter(
            (domain):domain is (TriContribution|null)[]=>domain!==null)??[]);
          const bound=assessCumulativeTriathlonRatioPotential(
            objectiveForRatio!,sourceLoadLedger,selectedRatioDoses,remainingRatioDomains);
          if(bound.verdict!=='not_refuted'){
            countPrune('v314_'+bound.verdict);
            return false;
          }
        }
        if(index===slots.length){
          if(finalRatioGate&&!hasExactStrictTriathlonRatio(objectiveForRatio!,
            sourceLoadLedger,chosen.filter(s=>
              ['swim','bike','run','brick'].includes(s.sport)).map(exactTriContribution)))
            return false;
          if(qualityRequired&&!chosen.some(isQuality))return false;
          if(requireStructuredZones)
            return assessStrictStructuredZoneTarget(
              chosen.map(session=>nativeProfiles.get(session)!) as NativeZoneDose[]).admissible;
          if(requireStrictNativeZones)
            return assessStrictNativePolarizationTarget(chosen).admissible;
          return true;
        }
        for(const session of order[index].domain) {
          const id=session.catalogId;
          const m=id?catalogById.get(id):undefined;
          if(m&&(weeklyUsage.get(id!)??0)>=Math.min(1,catalogueWeeklyUsageCapacity(m)))continue; // B13 forbids intra-week duplicate IDs.
          const sourceKeys=m?(experimentalContract?.consumedSourceIds?.(m)??[]).map(src=>'v3-source:'+src):[];
          if(sourceKeys.some(key=>(weeklyUsage.get(key)??0)>=1))continue;
          // Preserve the existing layout's 48h separation for quality of the same sport.
          const quality=m&&m.mainZoneMax>=3;
          if(quality&&chosen.some(s=>s.sport===session.sport&&Math.abs(s.dayIndex-session.dayIndex)<2&&(catalogById.get(s.catalogId??'')?.mainZoneMax??0)>=3))continue;
          chosen.push(session);if(id)weeklyUsage.set(id,(weeklyUsage.get(id)??0)+1);
          for(const key of sourceKeys)weeklyUsage.set(key,(weeklyUsage.get(key)??0)+1);
          if(search(index+1,total+(session.durationMin??0)))return true;
          chosen.pop();if(id)weeklyUsage.set(id,weeklyUsage.get(id)!-1);
          for(const key of sourceKeys)weeklyUsage.set(key,weeklyUsage.get(key)!-1);
          if(exhausted)return false;
        }
        return false;
      }
      if(!search(0,0)){
        if(rootSourceConflict){
          result.issues.push({code:'det_v336_root_source_matching_conflict',
            week:w.week,severity:'blocking',message:JSON.stringify({
              ...rootSourceConflict,
              conflictingSlots:rootSourceConflict.slotIndices.map(i=>({
                dayIndex:order[i].slot.dayIndex,
                day:order[i].slot.dayName,sport:order[i].slot.slot.sport,
                isKeySession:!!order[i].slot.slot.isKeySession,
              })),
              scope:'this_athlete_week_approved_source_domains_only',
              noGlobalAthleteImpossibilityClaim:true,
              noNewSourceOrSessionInvented:true,
            })});
        }
        if(experimentalContract?.enableV333ForwardCheck===true)
          result.issues.push({code:'det_v333_week_search_diagnostic',week:w.week,
            severity:'warning',message:JSON.stringify({
              weekNodes:result.nodes-weekNodesAtStart,totalNodes:result.nodes,
              budgetRemaining:Math.max(0,limits.maxNodes-result.nodes),
              necessaryPrunes:strictPrunes,exhausted,notSportingAttestation:true,
            })});
        // V3.26 — a missing genuine Z4+ key stimulus is a CERTIFIED
        // contradiction in these currently approved WEEK-SPECIFIC domains,
        // not a solver-budget failure and not a global impossibility proof.
        // Keep the existing fail-closed search and sporting rules unchanged.
        if(qualityRequired&&!qualitySuffix[0] &&entry.weekType==='taper' &&
           experimentalContract?.requireLorangQualityBeforeFinalValidation===true &&
           normalizeRepairGoal(config.objective??'')==='half'){
          result.issues.push({
            code:'det_v326_required_taper_quality_domain_empty',
            week:w.week,severity:'blocking',
            message:JSON.stringify({
              week:w.week,phase:w.phase??null,weekType:entry.weekType,
              reviewedSlotCount:order.length,
              reviewedCandidateCount:order.reduce((sum,slot)=>sum+slot.domain.length,0),
              reviewedKeyQualityCandidates:0,
              proof:'none_of_current_admitted_key_slots_has_genuine_z4_to_z7_dose',
              scope:'current_athlete_week_phase_reviewed_domains_only',
              noGlobalImpossibilityClaim:true,
              noSyntheticOrUnapprovedSessionInserted:true,
              remedy:'review or individually approve a physiologically appropriate taper quality source; do not relax phase/recovery/dose gates',
            }),
          });
        }
        // V3.25 experiment — explain *which exact already-admitted slot
        // domains* failed around S9/S11 in low-hour 70.3. This emits only
        // candidate counts and structural bounds, not workouts, athlete data
        // or a claim that every conceivable schedule is impossible.
        if(experimentalContract?.requireLorangQualityBeforeFinalValidation===true &&
           normalizeRepairGoal(config.objective??'')==='half'){
          result.issues.push({
            code:'det_v325_constrained_week_domain_diagnostic',
            week:w.week,severity:'warning',message:JSON.stringify({
              week:w.week,phase:w.phase??null,weekType:entry.weekType,
              qualityRequired,qualityDomainAvailable:qualitySuffix[0],
              minimumDomainMinutes:minimumSuffix[0],weeklyCapMinutes:ceiling,
              slotDomains:order.map(({slot,domain})=>({
                dayIndex:slot.dayIndex,sport:slot.slot.sport,
                key:!!slot.slot.isKeySession,long:!!slot.slot.isLongSession,
                candidates:domain.length,
                highQualityCandidates:domain.filter(isQuality).length,
                minMinutes:Math.min(...domain.map(s=>s.durationMin??0)),
                maxMinutes:Math.max(...domain.map(s=>s.durationMin??0)),
              })),
              structuredPrunes:requireStructuredZones?strictPrunes:undefined,
              budgetExhausted:exhausted,checkedNodes:result.nodes,
              noGlobalImpossibilityClaim:true,
              remedy:'review week-specific approved options and actual coach availability',
            }),
          });
        }
        if(runningQualityRequired)result.issues.push({
          code:'det_v343_running_quality_search_unresolved',
          week:w.week,severity:'blocking',message:JSON.stringify({
            verifiedCandidateDomainPresent:qualitySuffix[0],
            searchBudgetExhausted:exhausted,scope:'current_reviewed_week_domains',
            noSportsOrDosesInvented:true,
          }),
        });
        if(finalRatioGate)result.issues.push({
          code:'det_v314_final_load_ratio_search_unresolved',
          week:w.week,severity:'blocking',message:JSON.stringify({
            objective:objectiveForRatio,verifiedEarlierLoadMinutes:sourceLoadLedger,
            searchBudgetExhausted:exhausted,inspectedNodes:result.nodes,
            scope:'final_load_week_with_earlier_load_weeks_frozen',
            interpretation:'failed_or_bounded_search_not_a_proof_of_global_impossibility',
          }),
        });
        if(requireAnyStrictZones){
          result.issues.push({code:requireStructuredZones?
            'det_structured_polarization_target_search_unresolved':
            'det_native_polarization_target_search_unresolved',
            week:w.week,severity:'blocking',message:JSON.stringify({
              targetLowPct:75,maxUnknownPct:30,
              proofKind:requireStructuredZones?'structured_v3_blocks':'native_text_estimate',
              reason:exhausted?'bounded_search_exhausted':'no_assignment_found',
              inspectedNodes:result.nodes,
              structuredBoundPrunes:requireStructuredZones?strictPrunes:undefined,
              scientificAttestation:false,
            })});
        }
        return refuse(exhausted?'search_budget_exhausted':`no_catalogue_assignment_week_${w.week}`);
      }
      if(experimentalContract?.enableV333ForwardCheck===true)
        result.issues.push({code:'det_v333_week_search_diagnostic',week:w.week,
          severity:'warning',message:JSON.stringify({
            weekNodes:result.nodes-weekNodesAtStart,totalNodes:result.nodes,
            budgetRemaining:Math.max(0,limits.maxNodes-result.nodes),
            necessaryPrunes:strictPrunes,exhausted:false,notSportingAttestation:true,
          })});
      if(finalRatioGate)result.issues.push({
        code:'det_v314_final_load_ratio_selected',week:w.week,severity:'warning',
        message:JSON.stringify({objective:objectiveForRatio,
          verifiedEarlierLoadMinutes:sourceLoadLedger,
          finalLoadWeekSources:chosen.filter(s=>
            ['swim','bike','run','brick'].includes(s.sport))
            .map(s=>({id:s.catalogId,minutes:exactTriContribution(s)})),
          interpretation:'source_exact_minutes_only_native_validation_still_required',
        }),
      });
      for(const day of layout.days)if(!day.slots.length)chosen.push({weekNumber:w.week,weekTheme:w.phase??'',phase:w.phase??'',dayName:day.dayName,dayIndex:layout.days.indexOf(day),sport:'rest',title:'Repos',details:'Repos complet du contrat hebdomadaire.',isRest:true,durationMin:0});
      if(w.phase?.trim().toLowerCase()==='peak'){
        const proven=chosen.filter(hasProvenRaceSpecificity);
        if(proven.length)peakRaceSpecificSeen=true;
        if(sourceSpecificEnabled&&proven.length){
          result.issues.push({code:'det_v335_source_certified_peak_selected',
            week:w.week,severity:'warning',message:JSON.stringify({
              approvedSourceDoses:proven.map(s=>({id:s.catalogId,
                durationMin:s.durationMin})),
              sourceProofRequired:true,doesNotOverrideNativeValidator:true,
              scientificAttestation:false,
            })});
        }
      }
      chosen.sort((a,b)=>a.dayIndex-b.dayIndex);
      if(runningQualityRequired)result.issues.push({
        code:'det_v343_running_source_quality_verified',
        week:w.week,severity:'warning',message:JSON.stringify({
          week:w.week,sourceDoses:chosen.filter(isQuality).map(s=>({
            sourceId:s.catalogId,durationMin:s.durationMin,
            highMin:experimentalContract?.sourceFullStructuredDoseForId?.(
              s.catalogId!,s.durationMin)?.high??null,
          })),
          provenance:'individual_v3_blocks_exact_dose',
          nativeQualityAndPeriodizationValidationPreserved:true,
          scientificAttestation:false,
        }),
      });
      if(experimentalContract?.requireSourceVerifiedTaperQuality===true &&
         entry.weekType==='taper'){
        const proof=chosen.flatMap(s=>{
          const card=catalog.find(m=>m.id===s.catalogId);
          const verified=verifyReviewedTaperKeyStimulus(s,card,
            experimentalContract.sourceFullStructuredDoseForId);
          return verified.verified?[verified.evidence]:[];
        });
        result.issues.push({
          code:'det_v329_taper_source_quality_proven',
          week:w.week,severity:'warning',message:JSON.stringify({
            sourceBackedReminders:proof,
            noUnmeasuredQualityCounted:true,
            nativePhaseValidatorUnchanged:true,
            scientificAttestation:false,
          }),
        });
      }
      for(const s of chosen)if(s.catalogId){usage.set(s.catalogId,(usage.get(s.catalogId)??0)+1);result.trace.push({week:w.week,day:s.dayName,id:s.catalogId,sport:s.sport,duration:s.durationMin??null,intent:catalog.find(m=>m.id===s.catalogId)!.intentFamily,reason:'Contrat objectif/phase/niveau, durée du catalogue, budget et fréquence respectés ; priorité physiologique sur créneau clé, puis repartition par utilisation et ordre du catalogue préparé.'});}
      if(experimentalContract?.requireMeasuredDeloadSelection===true &&
         entry.weekType==='recovery'&&measuredTrainingMinutes(chosen)===null){
        result.issues.push({code:'det_v315_recovery_duration_not_verified',
          week:w.week,severity:'blocking'});
        return refuse('v315_recovery_duration_not_verified_week_'+w.week);
      }
      plan.weeks.push({weekNumber:w.week,theme:w.phase??'',phase:w.phase??'',sessions:chosen});
      previousCalendarWeekMinutes=measuredTrainingMinutes(chosen);
      if(entry.weekType==='load'&&
         experimentalContract?.preferSourceBackedMultisportBalance==='triathlon_targets'){
        for(const session of chosen.filter(s=>
          !s.isRest&&['swim','bike','run','brick'].includes(s.sport))){
          const amounts=exactTriContribution(session);
          if(!amounts){sourceLoadLedgerVerified=false;continue;}
          sourceLoadLedger.swim+=amounts.swim;
          sourceLoadLedger.bike+=amounts.bike;
          sourceLoadLedger.run+=amounts.run;
        }
      }
      const countOnly=chosen.filter(session=>session.catalogId&&
        catalog.some(m=>m.id===session.catalogId&&isCountOnlyStrength(m))).length;
      if(countOnly){
        result.issues.push({
          code:'v3_strength_frequency_count_without_duration',week:w.week,severity:'warning',
          message:countOnly+' séance(s) de renforcement V3 prescrite(s) en fréquence ; durée inconnue, non comptabilisée dans les minutes hebdomadaires.',
        });
        // Historic weekly-hours and total-volume ceilings cannot be certified
        // when strength time remains unknown; never silently pass these gates.
        if((typeof config.weeklyHours==='number'&&config.weeklyHours>0)||
           entry.volumeBudget){
          result.issues.push({
            code:'v3_total_weekly_minutes_unverifiable_strength',week:w.week,severity:'blocking',
            message:'Renforcement correctement décompté en séances, mais plafonds horaires et progression de volume total non vérifiables sans durée.',
          });
        }
      }
      if(entry.weekType==='load'&&!slots.some(s=>s.slot.isRaceEvent))previousLoad=chosen.reduce((n,s)=>n+(s.durationMin??0),0);
    }
    result.candidate=plan;
    if(experimentalContract?.enableVerifiedMarathonMesocycles===true&&
       normalizeRepairGoal(config.objective??'')==='marathon'){
      const proof=proposeMeasuredMarathonMesocycles(plan);
      if(proof.verified)plan.phases=proof.projectedPhases;
      result.issues.push({
        code:proof.verified?'det_v353_measured_marathon_mesocycles_verified':
          'det_v353_measured_marathon_mesocycles_unverified',
        severity:proof.verified?'warning':'blocking',
        message:JSON.stringify({mesocycles:proof.mesocycles,
          originallyLongBuildStreaks:proof.originallyLongBuildStreaks,
          projectedPhases:proof.verified?proof.projectedPhases:[],
          refusals:proof.refusals,workoutsAndQuotasUnchanged:true,
          nativeValidatorsPreserved:true,scientificAttestation:false}),
      });
    }
    if(experimentalContract?.auditGlobalSourceSportRatioBounds===true&&
       ['half','ironman'].includes(normalizeRepairGoal(config.objective??'')??'')){
      const objective=normalizeRepairGoal(config.objective??'')==='half'?'703':'IM';
      const raw=SPORT_RATIO_TARGETS[objective];
      if(raw.swim&&raw.bike&&raw.run){
        const bound=assessGlobalSourceRatioEnvelope(sourceSlotRatioDomains,{
          swim:raw.swim,bike:raw.bike,run:raw.run,
        });
        result.issues.push({code:
          bound.verdict==='provably_unreachable_in_current_domains'?
            'det_v311_global_ratio_unreachable_in_approved_domains':
            bound.verdict==='unverified'?
            'det_v311_global_ratio_domains_unverified':
            'det_v311_global_ratio_domains_not_refuted',
          severity:bound.verdict==='provably_unreachable_in_current_domains'?
            'blocking':'warning',message:JSON.stringify(bound)});
      }
    }
    if(experimentalContract?.auditStructuredPolarizationSources===true){
      const rows=plan.weeks.map(week=>{
        let proven=0;const missing:string[]=[];
        const sums={low:0,nonLow:0,unknown:0};
        for(const session of week.sessions){
          if(session.isRest||normalizeRepairSport(session.sport)==='strength')continue;
          if(session.durationMin===0&&session.title.startsWith('COURSE :'))continue;
          const profile=session.catalogId?
            experimentalContract.sourceStructuredZoneForId?.(session.catalogId,session.durationMin):null;
          if(!profile){missing.push(session.catalogId??session.title);continue;}
          proven++;
          sums.low+=profile.low;sums.nonLow+=profile.nonLow;sums.unknown+=profile.unknown;
        }
        return {week:week.weekNumber,proven,missing,sums};
      });
      result.issues.push({code:'det_v310_structured_zone_selection_coverage',
        severity:'warning',message:JSON.stringify({
          provenance:'v3_individually_configured_blocks_only',
          notNativeValidatorSubstitution:true,weeks:rows,
        })});
    }
    if(experimentalContract?.annotateVerifiedDeloads){
      const evidence=annotateOnlyMeasuredDeloads(plan);
      for(const e of evidence.filter(x=>x.scheduledRecovery)){
        result.issues.push({
          code:e.verified?'det_measured_deload_verified':'det_scheduled_deload_not_proven',
          week:e.week,severity:e.verified?'warning':'blocking',
          message:JSON.stringify(e),
        });
      }
    }
    if(experimentalContract?.auditVerifiedMultisportMinutes===true &&
       ['half','ironman'].includes(normalizeRepairGoal(config.objective??'')??'')){
      try{
        const quotas=Object.fromEntries(Object.entries(preparation.weeklyQuotas)
          .map(([week,entry])=>[Number(week),entry.weekType]));
        const audit=auditPlannedMinuteDistribution(plan,quotas,
          experimentalContract.verifiedBrickCompositions??[]);
        const total=audit.knownTotalMinutes;
        const ratio=Object.fromEntries((['swim','bike','run'] as const).map(sport=>[
          sport,total?100*audit.knownMinutes[sport]/total:null,
        ])) as Record<'swim'|'bike'|'run',number|null>;
        const objectiveKey=normalizeRepairGoal(config.objective??'')==='half'?'703':'IM';
        const targets=SPORT_RATIO_TARGETS[objectiveKey];
        // Independent frequency quota proof. The native validator currently
        // counts whole sessions for a ratio intended to represent volume.
        // Never suppress that validator: show when its swim count target is
        // mathematically unreachable, even with maximal bike/run frequency.
        const countRatioCertificate=targets?.swim?assessNativeSwimCountQuotaBound(
          Object.entries(preparation.weeklyQuotas).map(([week,entry])=>({
            week:Number(week),weekType:entry.weekType,quota:entry.quota,
          })),targets.swim[1],
        ):null;
        if(countRatioCertificate){
          result.issues.push({
            code:countRatioCertificate.mathematicallyCannotAvoidNativeSwimBlocker===
              true?'det_native_count_swim_ratio_provably_incompatible_with_quotas':
              'det_native_count_swim_ratio_compatibility_unproven',
            severity:countRatioCertificate.mathematicallyCannotAvoidNativeSwimBlocker===
              true?'blocking':'warning',
            message:JSON.stringify(countRatioCertificate),
          });
        }
        // This bounds the required actual reallocation before optimizing
        // sources. Unresolved brick minutes are all optimistically assigned
        // to non-swim endurance; free weekly minutes are theoretical only.
        const capacityCertificate=targets?.swim?certifySwimRatioCapacity(
          audit.knownMinutes,audit.unresolvedBrickMinutes,targets.swim[1],
          plan,audit.weeks,Object.fromEntries(audit.weeks.map(week=>{
            const entry=preparation.weeklyQuotas[week];
            return [week,Math.min(
              Math.floor((config.weeklyHours??Infinity)*60),
              entry.volumeBudget?.maxMinutes??Infinity,
            )];
          })),
        ):null;
        const sports=['swim','bike','run'] as const;
        const deviations=sports.filter(sport=>{
          const v=ratio[sport],target=targets?.[sport];
          return target&&v!==null&&(v<target[0]||v>target[1]);
        });
        // Even with an unresolved brick, some failures are provable:
        // conservative min/max already grant ALL of its unknown minutes to
        // whichever discipline benefits the target most. If the ranges
        // still cannot overlap, no speculative 50/50 brick split can fix it.
        const provablyOutOfRange=sports.filter(sport=>{
          const range=targets?.[sport],b=audit.conservativeBounds[sport];
          return !!range&&(b.minPct>range[1]||b.maxPct<range[0]);
        });
        const unproved=!total||audit.unresolvedBrickMinutes>0||
          Object.values(ratio).some(x=>x===null);
        result.issues.push({
          code:!total?'det_multisport_minute_ratio_unverifiable':
            provablyOutOfRange.length?'det_multisport_minute_ratio_provably_out_of_bounds':
            unproved?'det_multisport_minute_ratio_unverifiable':
            deviations.length?'det_multisport_minute_ratio_out_of_bounds':'det_multisport_minute_ratio_verified',
          severity:unproved||deviations.length||provablyOutOfRange.length?'blocking':'warning',
          message:JSON.stringify({objective:objectiveKey,knownOnlyRatio:ratio,targets,
            unresolvedBrickMinutes:audit.unresolvedBrickMinutes,
            unresolvedBricks:audit.unresolvedBricks,
            conservativeBounds:audit.conservativeBounds,knownMinutes:audit.knownMinutes,
            verifiedTransitionMinutes:audit.verifiedTransitionMinutes,
            provablyOutOfRange,deviations,scope:audit.scope,
            capacityCertificate}),
        });
      }catch(error){
        result.issues.push({code:'det_multisport_minute_ratio_unverifiable',
          severity:'blocking',message:String(error)});
      }
    }
    if(experimentalContract?.verifiedBrickCompositions && normalizeRepairGoal(config.objective??'')==='half'){
      // Strictly diagnostic: a mathematically possible bike addition has NOT
      // passed dose, source, load-ramp, fatigue or recovery checks.
      const feasibility=auditV35BikeOnlyFeasibility(plan,preparation.weeklyQuotas,
        experimentalContract.verifiedBrickCompositions,23);
      result.issues.push({code:'v35_bike_only_volume_feasibility',
        severity:['provably_impossible_under_week_caps','baseline_duration_invalid']
          .includes(feasibility.verdict)?'blocking':'warning',
        message:JSON.stringify(feasibility)});
    }
    if(experimentalContract?.sourceRecoveryForId){
      result.issues.push(...auditSourceRecoveryTiming({
        plan, sourcesForId:experimentalContract.sourceRecoveryForId,
        startForSession:experimentalContract.coachSessionStart,
      }));
    }
    const merged:MergedPlan={...plan,weeks:plan.weeks.map(w=>({...w,sessions:w.sessions.map(s=>({...s,isKeySession:!!s.isKeySession,catalogId:s.catalogId??null,custom:!!s.custom,durationMin:s.durationMin??0,zones:s.zones??[]}))}))};
    const nativeQuotaIssues=validateWeeklyQuotas(merged,preparation.weeklyQuotas);
    let checkedQuotaIssues=nativeQuotaIssues;
    if(experimentalContract?.verifyOfficialRaceQuotaProjection===true){
      const projection=projectCertifiedRaceEventsForTrainingQuotas(
        merged,preparation.weeklyQuotas);
      if(projection.verdict==='verified'&&projection.projected){
        const trainingOnly=validateWeeklyQuotas(
          projection.projected,preparation.weeklyQuotas);
        // Preserve all original floor, daily capacity, rest, coach-load and
        // layout checks. Recompute ONLY quota-range frequency with the
        // independently certified official event excluded from workouts.
        checkedQuotaIssues=[
          ...nativeQuotaIssues.filter(i=>i.code!=='quota_range_drift'),
          ...trainingOnly.filter(i=>i.code==='quota_range_drift'),
        ];
        result.issues.push({
          code:'det_v315_official_race_training_quota_projection_verified',
          severity:'warning',message:JSON.stringify({
            excludedOfficialEvents:projection.excludedEvents,
            originalRangeDrifts:nativeQuotaIssues
              .filter(i=>i.code==='quota_range_drift')
              .map(i=>({week:i.weekNumber,reason:i.reason})),
            remainingTrainingRangeDrifts:trainingOnly
              .filter(i=>i.code==='quota_range_drift')
              .map(i=>({week:i.weekNumber,reason:i.reason})),
            originalFloorDailyRestAndCoachLoadChecksPreserved:true,
            scope:'experimental_quota_range_count_only',
          }),
        });
      }else if(projection.verdict==='refused'){
        result.issues.push({
          code:'det_v315_race_quota_projection_unverified',
          severity:'blocking',message:projection.reason,
        });
      }
    }
    result.issues.push(...checkedQuotaIssues.map(i=>({
      code:i.code,week:i.weekNumber,severity:i.severity,message:i.reason,
    })));
  }
  const validation=validatePlan(result.candidate!,config.objective,config.prohibitions,undefined,
    config.identifiedLimitersRaw,undefined,athlete,undefined,{sessionsPerWeek:config.sessionsPerWeek,maxSessionsPerDay:config.maxSessionsPerDay,maxDoubleDaysPerWeek:config.maxDoubleDaysPerWeek},config.injuryRisk,config.ambition,
    config.constraints,config.raceGoals?.some(g=>g.raceFormat==='lcw_3day'),config.deloadCadenceWeeks,
    config.ambitionMeta?{trainingLevel:config.ambitionMeta.trainingLevel,trainingLevelSource:config.ambitionMeta.trainingLevelSource}:undefined,
    config.raceGoals,config.planStartDate,{maxAvailableWeeklyHours:config.weeklyHours},undefined,config.strengthSessionsPerWeek);
  let nativeIssues:Array<{code:string;week?:number;severity:string;message?:string}>=
    validation.issues.map(i=>({
      code:i.rule,week:i.week,severity:i.severity,message:i.message,
    }));
  if(experimentalContract?.requireExplicitTaperSemanticReview===true){
    const adjudication=reconcileReviewedTaperSemantics({
      plan:result.candidate!,nativeIssues,
      cards:finalizedSourceMetadata,
      source:experimentalContract.sourceFullStructuredDoseForId,
      athleteContextId:experimentalContract.taperSemanticAthleteContextId??'',
      explicitReviewFor:experimentalContract.explicitTaperReviewForSession??
        (()=>null),
    });
    result.issues.push({
      code:adjudication.verdict==='verified'?
        'det_v331_taper_semantics_reviewed':
        'det_v331_taper_semantics_review_refused',
      severity:adjudication.verdict==='verified'?'warning':'blocking',
      message:JSON.stringify({
        verdict:adjudication.verdict,
        decisions:adjudication.decisions,
        originalNativeIssues:adjudication.originalNativeIssues
          .filter(i=>i.code==='phase_coherence'),
        nativeIssuesPreservedInAudit:true,scientificAttestation:false,
        experimentalOnly:true,
      }),
    });
    // Never replace native errors when ANY adjudication is unproven.
    if(adjudication.verdict==='verified')nativeIssues=adjudication.issues;
  }
  if(experimentalContract?.reconcileReviewedSourcePolarization===true){
    if(experimentalContract.requireStructuredPolarizationOnLoadWeeks!==true||
       !experimentalContract.sourceStructuredZoneForId){
      result.issues.push({code:'det_v315_source_polarization_contract_missing',
        severity:'blocking',message:
        'Cannot replace approximate native polarization without independently reviewed exact V3 source blocks.'});
    }else{
      const weekTypes=Object.fromEntries(Object.entries(
        result.candidate!.weeklyQuotas??{}).map(([week,entry])=>[
          Number(week),entry.weekType,
        ]));
      const migration=reconcileTextPolarizationWithReviewedSources({
        plan:result.candidate!,weekTypes,nativeIssues,
        certifiedDose:(id,durationMin)=>
          experimentalContract.sourceStructuredZoneForId?.(id,durationMin)??null,
      });
      result.issues.push({
        code:'det_v315_native_text_polarization_reconciliation_decision',
        severity:migration.verdict==='refused'?'blocking':'warning',
        message:JSON.stringify({
          verdict:migration.verdict,reason:migration.reason,
          nativeFindings:migration.nativeFindings,weeks:migration.weeks,
          scientificAttestation:false,
        }),
      });
      if(migration.verdict==='replaced_native_text_with_proven_blocks')
        nativeIssues=migration.issues;
    }
  }
  if(experimentalContract?.reconcileReviewedMarathonSpecificityLexicalWarning===true&&
      normalizeRepairGoal(config.objective??'')==='marathon'&&
      nativeIssues.some(i=>i.code==='phase_coherence'&&
        i.message?.startsWith('Bloc Race-Specific sans aucune séance allure course/race-pace/simulation détectée'))){
    const reviewed=experimentalContract.reviewedRunningSpecificForId;
    const dose=experimentalContract.sourceFullStructuredDoseForId;
    const reconciliation=reviewed&&dose?
      reconcileReviewedMarathonSpecificity(result.candidate!,nativeIssues,reviewed,dose):null;
    result.issues.push({
      code:reconciliation?.verified?
        'det_v352_reviewed_marathon_specificity_native_text_reconciled':
        'det_v352_reviewed_marathon_specificity_source_unproven',
      severity:reconciliation?.verified?'warning':'blocking',
      message:JSON.stringify(reconciliation?{
        sourceEvidence:reconciliation.sourceEvidence,
        originalNativeIssues:reconciliation.originalNativeIssues,
        reconciledNativeFindings:reconciliation.reconciledNativeFindings,
        otherNativeGatesUnchanged:true,nativeIssuesPreservedInAudit:true,
        scientificAttestation:false,
      }:{
        reason:'reviewed_marathon_specificity_proof_missing',
        nativeIssuesPreservedInAudit:true,scientificAttestation:false,
      }),
    });
    if(reconciliation?.verified)nativeIssues=reconciliation.issues;
  }
  if(experimentalContract?.applyReviewedMinuteSportRatio===true &&
     experimentalContract.auditVerifiedMultisportMinutes===true &&
     ['half','ironman'].includes(normalizeRepairGoal(config.objective??'')??'') &&
     result.issues.some(i=>i.code==='det_multisport_minute_ratio_verified')){
    // This path is unavailable to the released application. Never reclassify
    // an unknown brick, incompatible frequency, or non-strict minute ratio.
    // It retains the original native count issue as a diagnostic warning and
    // leaves all OTHER blocking rules untouched.
    const objectiveKey=normalizeRepairGoal(config.objective??'')==='half'?'703':'IM';
    const quotaTypes=Object.fromEntries(Object.entries(result.candidate!.weeklyQuotas??{})
      .map(([week,entry])=>[Number(week),entry.weekType]));
    const reconciliation=reconcileNativeTriathlonCountRatio({
      plan:result.candidate!,weekTypes:quotaTypes,objective:objectiveKey,
      verifiedCompositions:experimentalContract.verifiedBrickCompositions??[],
      nativeIssues,
      quotaIssues:result.issues.filter(i=>['quota_floor_violation','quota_range_drift'].includes(i.code)),
      coachConstraintsText:config.constraints,
    });
    result.issues.push(...reconciliation.issues);
    result.issues.push({
      code:'det_native_count_ratio_migration_decision',severity:'warning',
      message:JSON.stringify({verdict:reconciliation.verdict,reason:reconciliation.reason,
        nativeCountIssueCount:reconciliation.nativeCountIssueCount,
        ratios:reconciliation.ratios}),
    });
    if(reconciliation.verdict==='replaced_count_only_with_proven_minutes'){
      // The independent proof that old COUNT targets cannot fit these quotas
      // must remain on record, but it cannot invalidate a FULLY VERIFIED
      // strict MINUTE distribution. Frequency audits remain mandatory.
      for(const issue of result.issues){
        if(issue.code==='det_native_count_swim_ratio_provably_incompatible_with_quotas'){
          issue.severity='warning';
          issue.code='det_native_count_swim_ratio_legacy_conflict_documented';
        }
      }
    }
  } else result.issues.push(...nativeIssues);
  if(experimentalContract?.auditVerifiedMultisportMinutes===true &&
     ['half','ironman'].includes(normalizeRepairGoal(config.objective??'')??'')){
    const failed=validation.issues.filter(i=>i.rule==='polarization' &&
      i.severity==='error'&&typeof i.week==='number').map(i=>i.week!);
    if(failed.length){
      const attribution=diagnoseNativePolarizationWeeks(result.candidate!,failed);
      result.issues.push({code:'det_native_polarization_source_attribution',severity:'warning',
        message:JSON.stringify(attribution)});
    }
  }
  const final=computeFinalValidationIssues(result.candidate!,[],{objective:config.objective??'',ambition:config.ambition??'finisher',vmaKmh:athlete.vma,thresholdPaceSecPerKm:athlete.paceThresholdSecPerKm});
  result.issues.push(...final.issues.map(i=>({code:i.rule,severity:i.severity,message:i.message})));
  if(experimentalContract?.requireReviewedRaceSpecificPeak===true){
    const objective=normalizeRepairGoal(config.objective??'')==='half'?'703':
      normalizeRepairGoal(config.objective??'')==='ironman'?'IM':null;
    const candidate=result.candidate!;
    const proof=objective&&experimentalContract.reviewedRaceSpecificForId&&
      experimentalContract.sourceStructuredZoneForId?
      certifyReviewedRaceSpecificPeak(candidate,objective,
        experimentalContract.reviewedRaceSpecificForId,
        experimentalContract.sourceStructuredZoneForId):null;
    result.issues.push({
      code:proof?.verdict==='verified'?
        'det_v317_individually_reviewed_peak_specificity_verified':
        'det_v317_individually_reviewed_peak_specificity_unverified',
      severity:proof?.verdict==='verified'?'warning':'blocking',
      message:JSON.stringify(proof??{
        reason:'source_proof_callback_or_triathlon_objective_missing',
        scientificAttestation:false,
      }),
    });
  }
  if(experimentalContract?.auditMarathonHorizonEvidence===true&&
     normalizeRepairGoal(config.objective??'')==='marathon'){
    const provider=experimentalContract;
    const report=provider.sourceFullStructuredDoseForId&&
      provider.reviewedRunningSpecificForId&&
      provider.reviewedSourceLimiterKeysForId?
      auditMarathonHorizon(result.candidate!,{
        dose:provider.sourceFullStructuredDoseForId,
        runningSpecific:provider.reviewedRunningSpecificForId,
        limiterKeys:provider.reviewedSourceLimiterKeysForId,
      }):null;
    result.issues.push({
      code:report?.verified?
        'det_v351_marathon_exact_source_horizon_evidence_verified':
        'det_v351_marathon_exact_source_horizon_evidence_unverified',
      severity:report?.verified?'warning':'blocking',
      message:JSON.stringify(report??{
        refusals:['athlete_approved_source_evidence_provider_missing'],
        nativeValidatorsPreserved:true,scientificAttestation:false,
      }),
    });
  }
  if(experimentalContract?.requireStrictPeriodizationEvidence===true){
    const phase=assessStrictPeriodizationEvidence(result.issues);
    result.issues.push({
      code:phase.verdict==='blocked'?
        'det_v316_strict_periodization_not_proven':
        'det_v316_strict_periodization_verified',
      severity:phase.verdict==='blocked'?'blocking':'warning',
      message:JSON.stringify({
        verdict:phase.verdict,findings:phase.flagged,
        nativeValidatorPreserved:true,experimentalOnly:true,
      }),
    });
  }
  result.technicallyConstructed=result.candidate!.weeks.length===config.weeksAvailable;
  result.constraintsSatisfied=!result.issues.some(i=>['error','critical','blocking'].includes(i.severity));
  result.status='candidate';
  return result;
}
