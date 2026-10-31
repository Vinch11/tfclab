/** Experimental, pure catalogue assembly. Never imported by the application. */
import type { PlanAthleteData, PlanConfig } from '@/hooks/useAITrainingPlan';
import type { ParsedPlan, ParsedSession } from '@/lib/aiPlanParser';
import type { MergedPlan } from '@/lib/plan/mergePlanChunks';
import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { assessPreparedGeneration } from '@/lib/plan/prevalidateTrainingPlan';
import { validateWeeklyQuotas } from '@/lib/plan/validateWeeklyQuotas';
import { computeFinalValidationIssues } from '@/lib/plan/qa/finalValidation';
import { validatePlan } from '@/engines/plan/planValidator';
import { checkSessionCatalogue } from '../../supabase/functions/_shared/sessionCatalogueContract';
import { catalogueWeeklyUsageCapacity } from '../../supabase/functions/_shared/catalogueWeeklyFrequency';
import { normalizeRepairSport, normalizeRepairGoal, evaluateRepairSportingEquivalence } from '../../supabase/functions/_shared/repairSportingEquivalence';
import { buildStartToRunTemplatePlan } from '@/lib/startToRunTemplate';
import type {RepairWorkoutMetadata} from '../../supabase/functions/_shared/repairSportingEquivalence';
import type {DaySlot} from '@/engines/plan/weeklySlotLayout';
import {auditSourceRecoveryTiming, type CoachSessionStart} from './v33-recovery-timing';
import {auditV35BikeOnlyFeasibility} from './v35-volume-feasibility';

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
  /** Only explicitly reviewed compositions may be decomposed for a V35 ratio audit. */
  verifiedBrickCompositions?:readonly RepairWorkoutMetadata[];
  /** V35 safety experiment: enforce the stated availability even without a volume ramp. */
  enforceWeeklyHoursCap?:true;
  /** An OPTIONAL clock given explicitly by a coach, never inferred from the calendar. */
  coachSessionStart?:(session:ParsedSession)=>CoachSessionStart|null|undefined;
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
function isCountOnlyStrength(card:RepairWorkoutMetadata):boolean {
  return normalizeRepairSport(card.sport)==='strength'&&card.intentFamily==='force'&&
    card.durationMin[0]===0&&card.durationMin[1]===0&&card.mainZoneMax===0&&
    card.zones.length===0&&card.tags.includes('v3-strength-frequency-only-unknown-duration');
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
    const report=assessPreparedGeneration(config,preparation);
    result.issues=report.issues.map(i=>({...i}));
    if(experimentalContract)result.issues.push({code:'experimental_contract_requires_review',severity:'warning'});
    if(report.status==='blocked')return refuse('existing_prevalidation_blocked');
    if(report.weeks.some(w=>!preparation.weeklyQuotas[w.week]?.layout))return refuse('dedicated_route_without_deterministic_quota');
    const plan:ParsedPlan={title:`Plan TFCL™ — ${config.objective} ${athlete.nom??"Profil synthétique"} — ${config.weeksAvailable} semaines`,phases:[],weeks:[],totalWeeks:config.weeksAvailable,weeklyQuotas:preparation.weeklyQuotas};
    const usage=new Map<string,number>();
    const started=performance.now();
    let exhausted=false;
    let previousLoad:number|undefined;
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
            return checked.errors.length||checked.unknown.length?[]:[session];
          }).sort((a,b)=>(usage.get(a.catalogId!)??0)-(usage.get(b.catalogId!)??0)||
            (experimentalContract?.rankCandidate?.(catalog.find(m=>m.id===a.catalogId)!,{...context,week:w.week,slot,dayIndex})??0)-
            (experimentalContract?.rankCandidate?.(catalog.find(m=>m.id===b.catalogId)!,{...context,week:w.week,slot,dayIndex})??0)||
            w.eligible.findIndex(m=>m.id===a.catalogId)-w.eligible.findIndex(m=>m.id===b.catalogId)||a.catalogId!.localeCompare(b.catalogId!));
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
      // Fail early on exact lower bounds, rather than enumerating an impossible Cartesian product.
      const order=options.map((domain,i)=>({domain,slot:slots[i]})).sort((a,b)=>a.domain.length-b.domain.length||a.slot.dayIndex-b.slot.dayIndex);
      const minimumSuffix=Array(order.length+1).fill(0) as number[];
      for(let i=order.length-1;i>=0;i--)minimumSuffix[i]=minimumSuffix[i+1]+Math.min(...order[i].domain.map(s=>s.durationMin??0));
      if(minimumSuffix[0]>ceiling)return refuse(`minimum_catalogue_dose_exceeds_budget_week_${w.week}`);
      function search(index:number,total:number):boolean {
        if(++result.nodes>limits.maxNodes||performance.now()-started>limits.maxMilliseconds){exhausted=true;return false;}
        if(total+minimumSuffix[index]>ceiling)return false;
        if(index===slots.length)return true;
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
      if(!search(0,0))return refuse(exhausted?'search_budget_exhausted':`no_catalogue_assignment_week_${w.week}`);
      for(const day of layout.days)if(!day.slots.length)chosen.push({weekNumber:w.week,weekTheme:w.phase??'',phase:w.phase??'',dayName:day.dayName,dayIndex:layout.days.indexOf(day),sport:'rest',title:'Repos',details:'Repos complet du contrat hebdomadaire.',isRest:true,durationMin:0});
      chosen.sort((a,b)=>a.dayIndex-b.dayIndex);
      for(const s of chosen)if(s.catalogId){usage.set(s.catalogId,(usage.get(s.catalogId)??0)+1);result.trace.push({week:w.week,day:s.dayName,id:s.catalogId,duration:s.durationMin??null,intent:catalog.find(m=>m.id===s.catalogId)!.intentFamily,reason:'Contrat objectif/phase/niveau, durée du catalogue, budget et fréquence respectés ; départage par usage puis ordre du catalogue préparé.'});}
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
    if(experimentalContract?.verifiedBrickCompositions && normalizeRepairGoal(config.objective??'')==='half'){
      // Strictly diagnostic: a mathematically possible bike addition has NOT
      // passed dose, source, load-ramp, fatigue or recovery checks.
      const feasibility=auditV35BikeOnlyFeasibility(plan,preparation.weeklyQuotas,
        experimentalContract.verifiedBrickCompositions,23);
      result.issues.push({code:'v35_bike_only_volume_feasibility',
        severity:feasibility.verdict==='provably_impossible_under_week_caps'?'blocking':'warning',
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
  result.issues.push(...validation.issues.map(i=>({code:i.rule,week:i.week,severity:i.severity,message:i.message})));
  const final=computeFinalValidationIssues(result.candidate!,[],{objective:config.objective??'',ambition:config.ambition??'finisher',vmaKmh:athlete.vma,thresholdPaceSecPerKm:athlete.paceThresholdSecPerKm});
  result.issues.push(...final.issues.map(i=>({code:i.rule,severity:i.severity,message:i.message})));
  result.technicallyConstructed=result.candidate!.weeks.length===config.weeksAvailable;
  result.constraintsSatisfied=!result.issues.some(i=>['error','critical','blocking'].includes(i.severity));
  result.status='candidate';
  return result;
}
