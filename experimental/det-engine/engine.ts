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
import {reconcileNativeTriathlonCountRatio} from './v39-reviewed-minute-ratio-reconciliation';
import {diagnoseNativePolarizationWeeks} from './v39-polarization-provenance';
import {assessStrictNativePolarizationTarget,assessStrictStructuredZoneTarget,optimisticNativeLowShareUpperBound,nativeZoneDoseForCandidate,type NativeZoneDose} from './v39-strict-native-polarization-target';
import {assessStructuredZoneNecessaryBounds,type BoundedZoneChoice} from './v310-structured-polarization-bounds';
import {certifySwimRatioCapacity} from './v39-ratio-capacity-certificate';
import {assessNativeSwimCountQuotaBound} from './v39-native-count-quota-bound';
import {calendarOnlyRecoverySafe,calendarOrConfirmedClockRecoverySafe,type ConfirmedSlotStart} from './v39-calendar-safe-recovery';
import {annotateOnlyMeasuredDeloads} from './v39-real-deload';
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
  preferSourceBackedMultisportBalance?:'all'|'bike'|'run'|'swim'|'triathlon';
  /** Opt-in: exclude sprint/pmax/neuromuscular candidates under an explicit coach Sprint Ban. */
  filterDeclaredSprintBanCandidates?:true;
  /** Opt-in hard condition: a non-finisher load week must select a real A/B quality stimulus. */
  requireRealQualityOnLoadWeeks?:true;
  /** Exploratory ONLY: require >=75% native-estimated Z1/Z2 and <=30%
   * unknown intensity minutes on load weeks; no physiological attestation. */
  requireNativePolarizationOnLoadWeeks?:true;
  /** V310 opt-in: source BLOCK duration, never native text interpretation.
   * The unchanged final native validator remains mandatory. */
  requireStructuredPolarizationOnLoadWeeks?:true;
  /** Read-only full-plan trace: verified and missing block-zone sources. */
  auditStructuredPolarizationSources?:true;
}
export interface ChoiceTrace { week:number; day:string; id:string; duration:number|null; intent:string; reason:string; }
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
  // Existing dedicated template: preserve its dose and progression, never invent cards.
  if(config.objective==='StartToRun') {
    if(config.weeksAvailable!==12 || config.constraints || config.raceGoals?.length)return refuse('static_template_configuration_requires_review');
    result.candidate=buildStartToRunTemplatePlan();
    result.issues.push({code:'static_template_individualization_not_attested',severity:'warning'});
  } else {
    const preparation=prepareGenerationContracts(athlete,config,{rotationSeed:0});
    experimentalContract?.adapt(preparation,config);
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
        const actualCatalog=[...new Map([
          ...Object.values(preparation.phaseRepairCatalogs).flat(),
          ...preparation.chunkRepairCatalogs.flat(),
          ...preparation.chunkRegenRepairCatalogs.flat(),
        ].map(m=>[m.id,m])).values()];
        const allowedIds=new Set(week.eligible.map(c=>c.id));
        const eligibleSports=new Set(actualCatalog.filter(m=>allowedIds.has(m.id))
          .map(m=>normalizeRepairSport(m.sport)));
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
    const sourceSlotRatioDomains:RatioSlotDomain[]=[];
    for(const w of report.weeks) {
      const entry=preparation.weeklyQuotas[w.week];
      const layout=entry.layout!;
      const catalog=[...new Map([...Object.values(preparation.phaseRepairCatalogs).flat(),...preparation.chunkRepairCatalogs.flat(),...preparation.chunkRegenRepairCatalogs.flat()].map(m=>[m.id,m])).values()];
      const allowedIds=new Set(w.eligible.map(m=>m.id));
      const slots=layout.days.flatMap((d,dayIndex)=>d.slots.map(slot=>({slot,dayIndex,dayName:d.dayName})));
      const eventDay=layout.days.findIndex(d=>d.slots.some(s=>s.isRaceEvent));
      const raceDayIndex=eventDay>=0?eventDay:null;
      if(slots.some(s=>s.slot.isRaceEvent))result.issues.push({code:'race_duration_unestimated',week:w.week,severity:'warning'});
      const weeklyUsage=new Map<string,number>();
      const chosen:ParsedSession[]=[];
      const context={objective:w.objective,phase:w.phase,weekType:w.weekType};
      let calendarRecoveryExclusions=0;
      let sprintBanExclusions=0;
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
      const options=slots.map(({slot,dayIndex,dayName})=>{
        if(slot.isRaceEvent)return [{weekNumber:w.week,weekTheme:w.phase??'',phase:w.phase??'',dayIndex,dayName,sport:slot.sport,title:`COURSE : ${w.objective}`,details:'Épreuve déclarée ; durée à confirmer par le coach.',durationMin:0,custom:true,isRest:false,isKeySession:true,zones:[]} satisfies ParsedSession];
        return catalog.filter(m=>allowedIds.has(m.id)&&normalizeRepairSport(m.sport)===slot.sport)
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
      if(sprintBanExclusions)result.issues.push({
        code:'det_declared_sprint_ban_candidate_excluded',week:w.week,severity:'warning',
        message:sprintBanExclusions+' sport/phase eligible catalogue candidates excluded under coach-confirmed Sprint Ban',
      });
      if(calendarRecoveryExclusions)result.issues.push({
        code:'det_v3_calendar_recovery_candidates_excluded',week:w.week,severity:'warning',
        message:calendarRecoveryExclusions+' source-slot prescriptions excluded: full recovery hours cannot be proven from day-only layout',
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
          // The strict search itself cannot select an unverified source in a
          // load week. Its domain certificate must exclude those alternatives,
          // rather than accidentally granting unreviewed legacy cards volume.
          const domain=options[index].filter(session=>!strictSources||
            (!!session.catalogId&&experimentalContract.sourceStructuredZoneForId?.(
              session.catalogId,session.durationMin)!=null));
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
      const qualityRequired=experimentalContract?.requireRealQualityOnLoadWeeks===true &&
        entry.weekType==='load'&&config.ambition!=='finisher'&&
        ['half','ironman'].includes(normalizeRepairGoal(config.objective??'')??'');
      const isQuality=(session:ParsedSession)=>!!session.isKeySession&&
        session.zones?.some(zone=>/z\s*[4-7]/i.test(zone))===true;
      const qualitySuffix=Array(order.length+1).fill(false) as boolean[];
      for(let i=order.length-1;i>=0;i--)
        qualitySuffix[i]=qualitySuffix[i+1]||order[i].domain.some(isQuality);
      const minimumSuffix=Array(order.length+1).fill(0) as number[];
      for(let i=order.length-1;i>=0;i--)minimumSuffix[i]=minimumSuffix[i+1]+Math.min(...order[i].domain.map(s=>s.durationMin??0));
      const requireStrictNativeZones=
        experimentalContract?.requireNativePolarizationOnLoadWeeks===true &&
        entry.weekType==='load';
      const requireStructuredZones=
        experimentalContract?.requireStructuredPolarizationOnLoadWeeks===true &&
        entry.weekType==='load';
      const requireAnyStrictZones=requireStrictNativeZones||requireStructuredZones;
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
          candidates.sort((a,b)=>
            Number(a.dose===null)-Number(b.dose===null)||
            (slot.slot.isKeySession?rank(a.session)-rank(b.session):0)||
            (qualityRequired&&slot.slot.isKeySession?
              Number(isQuality(b.session))-Number(isQuality(a.session)):0)||
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
      }
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
      if(minimumSuffix[0]>ceiling)return refuse(`minimum_catalogue_dose_exceeds_budget_week_${w.week}`);
      const strictPrunes:Record<string,number>={};
      const countPrune=(reason:string)=>{strictPrunes[reason]=(strictPrunes[reason]??0)+1;};
      function search(index:number,total:number):boolean {
        if(++result.nodes>limits.maxNodes||performance.now()-started>limits.maxMilliseconds){exhausted=true;return false;}
        if(total+minimumSuffix[index]>ceiling)return false;
        if(qualityRequired&&!chosen.some(isQuality)&&!qualitySuffix[index])return false;
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
        if(index===slots.length){
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
          const m=id?catalog.find(m=>m.id===id):undefined;
          if(m&&(weeklyUsage.get(id!)??0)>=Math.min(1,catalogueWeeklyUsageCapacity(m)))continue; // B13 forbids intra-week duplicate IDs.
          const sourceKeys=m?(experimentalContract?.consumedSourceIds?.(m)??[]).map(src=>'v3-source:'+src):[];
          if(sourceKeys.some(key=>(weeklyUsage.get(key)??0)>=1))continue;
          // Preserve the existing layout's 48h separation for quality of the same sport.
          const quality=m&&m.mainZoneMax>=3;
          if(quality&&chosen.some(s=>s.sport===session.sport&&Math.abs(s.dayIndex-session.dayIndex)<2&&(catalog.find(m=>m.id===s.catalogId)?.mainZoneMax??0)>=3))continue;
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
      for(const day of layout.days)if(!day.slots.length)chosen.push({weekNumber:w.week,weekTheme:w.phase??'',phase:w.phase??'',dayName:day.dayName,dayIndex:layout.days.indexOf(day),sport:'rest',title:'Repos',details:'Repos complet du contrat hebdomadaire.',isRest:true,durationMin:0});
      chosen.sort((a,b)=>a.dayIndex-b.dayIndex);
      for(const s of chosen)if(s.catalogId){usage.set(s.catalogId,(usage.get(s.catalogId)??0)+1);result.trace.push({week:w.week,day:s.dayName,id:s.catalogId,duration:s.durationMin??null,intent:catalog.find(m=>m.id===s.catalogId)!.intentFamily,reason:'Contrat objectif/phase/niveau, durée du catalogue, budget et fréquence respectés ; priorité physiologique sur créneau clé, puis repartition par utilisation et ordre du catalogue préparé.'});}
      plan.weeks.push({weekNumber:w.week,theme:w.phase??'',phase:w.phase??'',sessions:chosen});
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
    result.issues.push(...validateWeeklyQuotas(merged,preparation.weeklyQuotas).map(i=>({code:i.code,week:i.weekNumber,severity:i.severity,message:i.reason})));
  }
  const validation=validatePlan(result.candidate!,config.objective,config.prohibitions,undefined,
    config.identifiedLimitersRaw,undefined,athlete,undefined,{sessionsPerWeek:config.sessionsPerWeek,maxSessionsPerDay:config.maxSessionsPerDay,maxDoubleDaysPerWeek:config.maxDoubleDaysPerWeek},config.injuryRisk,config.ambition,
    config.constraints,config.raceGoals?.some(g=>g.raceFormat==='lcw_3day'),config.deloadCadenceWeeks,
    config.ambitionMeta?{trainingLevel:config.ambitionMeta.trainingLevel,trainingLevelSource:config.ambitionMeta.trainingLevelSource}:undefined,
    config.raceGoals,config.planStartDate,{maxAvailableWeeklyHours:config.weeklyHours},undefined,config.strengthSessionsPerWeek);
  const nativeIssues=validation.issues.map(i=>({
    code:i.rule,week:i.week,severity:i.severity,message:i.message,
  }));
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
  result.technicallyConstructed=result.candidate!.weeks.length===config.weeksAvailable;
  result.constraintsSatisfied=!result.issues.some(i=>['error','critical','blocking'].includes(i.severity));
  result.status='candidate';
  return result;
}
