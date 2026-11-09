import {normalizeRepairGoal} from '../../supabase/functions/_shared/repairSportingEquivalence';
import {parseAthleteConstraints} from '@/lib/plan/constraintRules';
import {detPrimaryLimiterKey} from './v403-limiter-semantics';
/** Live trail contract. All route/history facts are supplied by the caller, never fixtures. */
import type {PlanConfig} from '@/hooks/useAITrainingPlan';
import {inferWeekType,type WeeklyQuota} from '@/engines/plan/sessionSizingMatrix';
import type {DaySlot,DayName} from '@/engines/plan/weeklySlotLayout';
import type {V3RunTerrainReview} from '../../scripts/library-v3/resolveV3Intensity';
import type {buildDetV3ContractFromCatalogue} from './v31-v3-catalogue';
import {v3FullCatalogue} from '../../scripts/library-v3/catalogueRuntime';
import {auditTrailPlan,validateTrailReview,verifyTrailSpecificSession,type TrailCoachReview,type TrailRouteReview} from './v360-trail-evidence';
export interface TrailPlanningDeclaration {
 review:TrailCoachReview;routes:TrailRouteReview[];
 longStartMinutes:number;longPeakMinutes:number;
 /** Deliberate acceptance of the displayed Tuesday/Wednesday/Thursday/weekend schedule. */
 scheduleConfirmed:true;
 fieldReviewReference:string;domainRpe:V3RunTerrainReview['domainRpe'];
}
const dayNames:DayName[]=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
export function reviewedTrailContract(contract:ReturnType<typeof buildDetV3ContractFromCatalogue>['contract'],
 declaration:TrailPlanningDeclaration,config:PlanConfig,
 accepted:Set<string>,clock:(v:{week:number;dayIndex:number;sport:string})=>{minuteOfDay:number;utcOffsetMinutes:number;provenance:'coach_confirmed'}|null){
 const coachReview=declaration.review,admittedRoutes=declaration.routes;
 const s={objective:coachReview.objective,weeks:coachReview.weeks};
 const index=s.objective==='TrailShort'?0:s.objective==='TrailMountain'?1:2;
 const base=[3,4,6][index],build=[3,6,6][index];
 const taperStart=Array.from({length:s.weeks},(_,i)=>i+1).find(w=>inferWeekType(w,s.weeks,s.objective)==='taper')!;
 const phaseFor=(w:number):'base'|'build'|'peak'|'taper'=>w<=base?'base':w<=base+build?'build':w<taperStart?'peak':'taper';
 const source=(id:string)=>v3FullCatalogue.workouts.find(w=>w.id===id);
 const exact=(id:string,min:number)=>contract.sourceFullStructuredDoseForId?.(id,min);
 const start=(v:{weekNumber:number;dayIndex:number;sport:string})=>{
  const c=clock({week:v.weekNumber,dayIndex:v.dayIndex,sport:v.sport});
  return c?((v.weekNumber-1)*7+v.dayIndex)*1440+c.minuteOfDay-c.utcOffsetMinutes:NaN;
 };
 const constraints=parseAthleteConstraints(config.constraints??'');
 const schedule:Record<string,number[]>={run:[1,3,5,6],bike:s.objective==='TrailShort'?[2]:[2,4],strength:[2]};
 const startDate=Date.parse((config.planStartDate??'')+'T00:00:00Z');
 const expectedRace=Number.isFinite(startDate)?new Date(startDate+(s.weeks*7-1)*86400000).toISOString().slice(0,10):null;
 const bindingProblems=()=>[
  ...(config.crossTrainingMaintenance?.velo!==true||config.crossTrainingMaintenance?.natation===true?['trail_reviewed_cross_training_protocol_mismatch']:[]),
  ...(!Number.isFinite(startDate)||new Date(startDate).getUTCDay()!==1||config.raceDate!==expectedRace?['trail_fixed_schedule_date_mismatch']:[]),
  ...(typeof config.maxDoubleDaysPerWeek==='number'&&config.maxDoubleDaysPerWeek<1?['trail_double_day_budget_mismatch']:[]),
  ...(constraints.ambiguousRestrictions.length?['trail_constraints_ambiguous']:[]),
  ...constraints.bannedSports.filter(sp=>sp==='any'||sp in schedule).map(sp=>'trail_schedule_banned_sport:'+sp),
  ...constraints.dayBans.filter(b=>Object.entries(schedule).some(([sp,days])=>(b.sport==='any'||b.sport===sp)&&days.includes(dayNames.indexOf(b.day)))).map(b=>'trail_schedule_day_conflict:'+b.day+':'+b.sport),
  ...(admittedRoutes.some(r=>r.athleteId!==coachReview.athleteId)?['trail_athlete_binding_mismatch']:[]),
  ...(coachReview.primaryLimiter!==detPrimaryLimiterKey(config)?['trail_primary_limiter_binding_mismatch']:[]),
  ...(!config.raceGoals?.some(g=>g.priority==='A'&&g.distanceKm===coachReview.race.distanceKm&&g.elevationGainM===coachReview.race.elevationGainM&&g.targetTimeMinutes===coachReview.race.targetTimeMinutes)?['trail_race_geometry_binding_mismatch']:[]),
  ...(config.sessionsPerWeek!==(s.objective==='TrailShort'?5:6)||config.strengthSessionsPerWeek!==1||config.maxSessionsPerDay!==2?['trail_session_budget_mismatch']:[]),
  ...(declaration.scheduleConfirmed!==true?['trail_schedule_not_confirmed']:[]),
  ...(!declaration.fieldReviewReference?.trim()?['trail_field_review_reference_missing']:[]),
  ...(!Number.isFinite(declaration.longStartMinutes)||!Number.isFinite(declaration.longPeakMinutes)||declaration.longStartMinutes<=20||declaration.longPeakMinutes<declaration.longStartMinutes?['trail_long_run_limits_invalid']:[]),
  ...(normalizeRepairGoal(coachReview.objective)!==normalizeRepairGoal(config.objective??'')||coachReview.weeks!==config.weeksAvailable||coachReview.weeklyHours!==config.weeklyHours?['trail_plan_binding_mismatch']:[]),
  ...admittedRoutes.filter(r=>r.provenance!=='explicit_coach_route_observation').map(r=>'trail_live_route_provenance_required:'+r.sourceId),
  ...admittedRoutes.filter(r=>!accepted.has(r.sourceId)).map(r=>'trail_source_not_admitted:'+r.sourceId),
 ];
 const lastPeakLoad=Array.from({length:s.weeks},(_,i)=>i+1).filter(w=>w<taperStart&&inferWeekType(w,s.weeks,s.objective)==='load').pop()!;
 const longCap=(week:number)=>Math.round(declaration.longStartMinutes+(declaration.longPeakMinutes-declaration.longStartMinutes)*Math.min(1,(week-1)/(lastPeakLoad-3)));
 const audit=(plan:Parameters<typeof auditTrailPlan>[0])=>auditTrailPlan(plan,coachReview,admittedRoutes,source,exact,start);
 const result:ReturnType<typeof buildDetV3ContractFromCatalogue>['contract']={...contract,
  requireReviewedAthleteContext:true,
  validateReviewedAthleteContext(a){return [...contract.validateReviewedAthleteContext?.(a)??[],
   ...validateTrailReview(coachReview,admittedRoutes,source,exact),
   ...bindingProblems()];},
  adapt(p,c){
   contract.adapt(p,c);
   for(let week=1;week<=s.weeks;week++){
    const weekType=inferWeekType(week,s.weeks,s.objective);
    const reduced=weekType!=='load';
    const bike=reduced||s.objective==='TrailShort'?1:2;
    const run=reduced?3:4,strength=weekType==='race'?0:1;
    const quota:WeeklyQuota={swim:{min:0,max:0},brick:{min:0,max:0},
     run:{min:run,max:run},bike:{min:bike,max:bike},strength:{min:strength,max:strength},
     totalSessions:{min:run+bike+strength,max:run+bike+strength},maxSessionsPerDay:2,minFullRestDays:1,
     source:{tier:'coach_declared',ref:'Explicit coach-confirmed trail schedule'}};
    const perDay:DaySlot[][]=[[],[{sport:'run',isKeySession:!reduced}],
     [{sport:'bike'},...(strength?[{sport:'strength'} as DaySlot]:[])],[{sport:'run'}],
     ...(bike===2?[[{sport:'bike'} as DaySlot]]:[[]]),
     reduced?[]:[{sport:'run'}],weekType==='race'?[{sport:'run',isRaceEvent:true}]:
      [{sport:'run',isLongSession:!reduced,isKeySession:!reduced,minDurationMin:!reduced?declaration.longStartMinutes-20:undefined}]];
    p.weeklyQuotas[week]={quota,floors:{minStrengthPerWeek:strength,longRunWeekly:!reduced,
      slLongRunMin:!reduced?declaration.longStartMinutes-20:undefined},weekType,phase:phaseFor(week),downgraded:false,
     layout:{weekType,targetsBySport:{run,bike,strength,swim:0,brick:0},
      ...(weekType==='race'?{requiredEvents:[{dayName:'dimanche' as const,sport:'run' as const}]}:{}),
      days:dayNames.map((dayName,i)=>({dayName,slots:perDay[i],isRest:!perDay[i].length}))}};
   }
  },
  filterCandidate(card,ctx){
   if(!accepted.has(card.id)||!(contract.filterCandidate?.(card,ctx)??true))return false;
   const min=card.durationMin[0],reduced=ctx.weekType!=='load';
   if(card.sport==='strength')return min<=35;
   if(['base','build'].includes(ctx.phase??'')&&/taper|affûtage|rappel allégé/i.test(card.title))return false;
   if(card.sport==='bike')return card.mainZoneMax<=2&&min>=30&&min<=(reduced?40:s.objective==='TrailShort'?85:100);
   const route=admittedRoutes.find(r=>r.sourceId===card.id);
   if(!route)return false;
   if(ctx.slot.isLongSession)return route.role==='long_terrain'&&min<=longCap(ctx.week);
   if(ctx.slot.isKeySession)return route.role==='uphill_quality'&&min<=90&&
     (coachReview.primaryLimiter==='vo2max'||(exact(card.id,min)?.high??0)>=20);
   if(reduced)return card.mainZoneMax<=2&&min>15&&min<=33;
   return card.mainZoneMax<=2&&min<=65&&route.role===(ctx.dayIndex===5?'technical':'support');
  },
  rankCandidate(card,ctx){return ctx.slot.isLongSession?Math.abs(longCap(ctx.week)-card.durationMin[0]):contract.rankCandidate?.(card,ctx)??0;},
  sourceRecoveryForId(id){
   const route=admittedRoutes.find(r=>r.sourceId===id);
   return (contract.sourceRecoveryForId?.(id)??[]).map(r=>({...r,hours:Math.max(r.hours,route?.minimumRecoveryHours??0)}));
  },
  requireReviewedTrailEvidence:true,auditReviewedTrailPlan:audit,
  reviewedTrailSpecificForSession:(session:Parameters<typeof verifyTrailSpecificSession>[0])=>
   verifyTrailSpecificSession(session,coachReview,admittedRoutes,exact),
  useDeclaredEventDurationEstimates:true,officialEventOutsideTrainingHours:true,
  prioritizeVerifiedRunningQualitySlot:true,prioritizeVerifiedRunningQualityCandidate:true,
  prioritizeRunningStructuredEasyMargin:true,prioritizeRunningQualitySlotByMargin:true,
  requireReviewedRunningKeyQualityOnLoadWeeks:true,requireRealQualityOnLoadWeeks:true,
  requireMeasuredDeloadSelection:true,annotateVerifiedDeloads:true,
  requireStructuredPolarizationOnLoadWeeks:true,reconcileReviewedSourcePolarization:true,
  enforceWeeklyHoursCap:true,enforceCalendarSafeV3Recovery:true,enforceConfirmedNoSameDayOverlap:true,
  coachSlotStart:clock,coachSessionStart:(v:{weekNumber:number;dayIndex:number;sport:string})=>clock({week:v.weekNumber,dayIndex:v.dayIndex,sport:v.sport}),
  requireStrictPeriodizationEvidence:true,excludeNativeForbiddenTaperCandidates:true,
  enableV333ForwardCheck:true,filterDeclaredSprintBanCandidates:true,
 };
 return result;
}
