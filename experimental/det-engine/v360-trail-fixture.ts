/** Synthetic-only trail acceptance specifications. No real athlete or production call. */
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {constructDeterministicPlan} from './engine';
import {buildDetV3ContractFromCatalogue,type V3ReviewedSettings} from './v31-v3-catalogue';
import {v3FullCatalogue} from '../../scripts/library-v3/catalogueRuntime';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';
import {inferWeekType,type WeeklyQuota} from '@/engines/plan/sessionSizingMatrix';
import type {DaySlot,DayName} from '@/engines/plan/weeklySlotLayout';
import type {PlanConfig} from '@/hooks/useAITrainingPlan';

import {auditTrailPlan,fingerprintTrailRoute,validateTrailReview,verifyTrailSpecificSession,type TrailCoachReview,type TrailRouteReview} from './v360-trail-evidence';
import {fingerprintV3SportingSource} from '../../scripts/library-v3/sportingQualification800';
import {evaluateV3Workout,type Overrides} from '../../scripts/library-v3/catalogueRuntime';
export const trailCases=[
 {id:'trail-short-12w',objective:'TrailShort',weeks:12,weeklyHours:7,limiter:'vo2max',
  event:{distanceKm:25,elevationGainM:800,elevationLossM:800,targetTimeMinutes:210},longStart:80,longPeak:129},
 {id:'trail-mountain-16w',objective:'TrailMountain',weeks:16,weeklyHours:9,limiter:'tte',
  event:{distanceKm:55,elevationGainM:3000,elevationLossM:2800,targetTimeMinutes:540},longStart:108,longPeak:157},
 {id:'trail-ultra-20w',objective:'TrailUltra',weeks:20,weeklyHours:12,limiter:'tte',
  event:{distanceKm:100,elevationGainM:6000,elevationLossM:6500,targetTimeMinutes:1200},longStart:120,longPeak:190},
] as const;
export type TrailCase=typeof trailCases[number];
const dayNames:DayName[]=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const times=[720,720,420,930,420,720,420];
/** Route geometry is explicitly authored BEFORE selection. Never generated from pace,
 * distance class or an assumption that D− equals D+. Rows are synthetic observations. */
const routeFacts:Record<string,{role:TrailRouteReview['role'];vertical:readonly [number,number][];
 descentMinutes:number;distanceKm:number;fueling?:true}>={
 '003':{role:'long_terrain',vertical:[[220,200],[450,420],[600,650]],descentMinutes:24,distanceKm:12},
 '031':{role:'long_terrain',vertical:[[300,300],[600,650],[800,850]],descentMinutes:30,distanceKm:14},
 '032':{role:'long_terrain',vertical:[[250,230],[450,430],[600,600]],descentMinutes:24,distanceKm:12,fueling:true},
 '035':{role:'long_terrain',vertical:[[320,310],[650,650],[850,900]],descentMinutes:30,distanceKm:14},
 '038':{role:'long_terrain',vertical:[[400,380],[750,700],[950,1000]],descentMinutes:35,distanceKm:15,fueling:true},
 '084':{role:'long_terrain',vertical:[[450,450],[900,850],[1100,1100]],descentMinutes:40,distanceKm:17,fueling:true},
 '085':{role:'long_terrain',vertical:[[550,500],[1050,1000],[1250,1300]],descentMinutes:48,distanceKm:20,fueling:true},
 '086':{role:'long_terrain',vertical:[[270,250],[500,450],[650,600]],descentMinutes:25,distanceKm:12},
 '089':{role:'long_terrain',vertical:[[250,240],[450,420],[600,550]],descentMinutes:22,distanceKm:11,fueling:true},
 '092':{role:'long_terrain',vertical:[[200,180],[300,280],[400,380]],descentMinutes:18,distanceKm:9},
 '014':{role:'support',vertical:[[150,130]],descentMinutes:10,distanceKm:7},
 '016':{role:'technical',vertical:[[100,150]],descentMinutes:15,distanceKm:6},
 '025':{role:'support',vertical:[[0,0]],descentMinutes:0,distanceKm:6},
 '028':{role:'support',vertical:[[90,90]],descentMinutes:8,distanceKm:7},
 '033':{role:'support',vertical:[[120,120]],descentMinutes:8,distanceKm:7},
 '066':{role:'technical',vertical:[[60,80]],descentMinutes:8,distanceKm:4},
 '068':{role:'support',vertical:[[150,130]],descentMinutes:10,distanceKm:5},
 '087':{role:'technical',vertical:[[80,120]],descentMinutes:12,distanceKm:5},
 '090':{role:'technical',vertical:[[160,180]],descentMinutes:15,distanceKm:7},
 '101':{role:'support',vertical:[[0,0]],descentMinutes:0,distanceKm:3},
 '102':{role:'support',vertical:[[0,0]],descentMinutes:0,distanceKm:3},
 '103':{role:'support',vertical:[[0,0]],descentMinutes:0,distanceKm:3.5},
 '104':{role:'support',vertical:[[0,0]],descentMinutes:0,distanceKm:3},
 '105':{role:'support',vertical:[[0,0]],descentMinutes:0,distanceKm:2.5},
 '125':{role:'support',vertical:[[20,20]],descentMinutes:2,distanceKm:3},
 '130':{role:'support',vertical:[[0,0]],descentMinutes:0,distanceKm:2},
 '136':{role:'uphill_quality',vertical:[[200,180]],descentMinutes:12,distanceKm:6},
 '137':{role:'uphill_quality',vertical:[[240,200]],descentMinutes:15,distanceKm:7},
 '139':{role:'uphill_quality',vertical:[[300,250]],descentMinutes:16,distanceKm:8},
 '167':{role:'uphill_quality',vertical:[[180,150]],descentMinutes:8,distanceKm:5},
 '168':{role:'uphill_quality',vertical:[[220,190]],descentMinutes:10,distanceKm:6},
 '169':{role:'uphill_quality',vertical:[[220,200]],descentMinutes:10,distanceKm:6},
};
export interface TrailMutation {
 routes?:(routes:TrailRouteReview[])=>void;review?:(review:TrailCoachReview)=>void;
 omitTerrainReview?:boolean;omitSpecificityProvider?:boolean;
}
export function runTrail(s:TrailCase,mutation:TrailMutation={}){
 const raceDate=new Date(Date.UTC(2026,9,26+s.weeks*7-1)).toISOString().slice(0,10);
 const athleteId='synthetic-v360-'+s.id;
 const f=preparePrevalidationFixture('B-10K',{objective:s.objective,weeksAvailable:s.weeks,
  weeklyHours:s.weeklyHours,ambition:'age_group',planStartDate:'2026-10-26',raceDate});
 const athlete={...f.athleteData,nom:athleteId,ftp:300,paceThresholdSecPerKm:240,css:95,vma:18};
 const index=s.objective==='TrailShort'?0:s.objective==='TrailMountain'?1:2;
 const base=[3,4,6][index],build=[3,6,6][index];
 const taperStart=Array.from({length:s.weeks},(_,i)=>i+1).find(w=>inferWeekType(w,s.weeks,s.objective)==='taper')!;
 const phaseFor=(w:number):'base'|'build'|'peak'|'taper'=>w<=base?'base':w<=base+build?'build':w<taperStart?'peak':'taper';
 const phases=Object.fromEntries(Array.from({length:s.weeks},(_,i)=>[i+1,phaseFor(i+1)])) as PlanConfig['windowWeekPhases'];
 const config:PlanConfig={objective:s.objective,weeksAvailable:s.weeks,weeklyHours:s.weeklyHours,
  ambition:'age_group',sessionsPerWeek:index===0?6:7,strengthSessionsPerWeek:1,maxSessionsPerDay:2,
  planStartDate:'2026-10-26',raceDate,terrainAvailability:'montagne',windowWeekPhases:phases,
  raceGoals:[{objective:s.objective,priority:'A',raceDate,...s.event}],
  identifiedLimitersRaw:[s.limiter,'durability'],_outputFormat:'json'};
 const overridesFor=(id:string):Overrides|undefined=>s.limiter==='tte'&&id==='V3P_RUN_136'?{'1.count':4}:
  s.objective==='TrailUltra'&&id==='V3P_RUN_085'?{'1.seconds':5400,'3.seconds':4620}:undefined;
 const chosen=v3FullCatalogue.workouts.filter(w=>{
  if(w.sport==='strength')return Number(w.id.slice(-3))>=101&&Number(w.id.slice(-3))<=120;
  if(w.sport==='bike')return ['001','013','048','049','092','105'].includes(w.id.slice(-3));
  if(w.sport!=='run'||!routeFacts[w.id.slice(-3)])return false;
  const facts=routeFacts[w.id.slice(-3)];
  if(facts.role==='uphill_quality')return s.limiter==='tte'?w.primaryDomain==='mlss':w.primaryDomain==='vo2max';
  if(facts.role==='long_terrain')return (evaluateV3Workout(w).minutes??Infinity)<=s.longPeak;
  return true;
 });
 const routes:TrailRouteReview[]=chosen.filter(w=>w.sport==='run').map(w=>{
  const facts=routeFacts[w.id.slice(-3)],v=facts.vertical[index]??facts.vertical[0];
  const durationMin=w.id==='V3P_RUN_085'&&s.objective==='TrailUltra'?190:
   w.id==='V3P_RUN_136'&&s.limiter==='tte'?51:evaluateV3Workout(w).minutes!;
  return {athleteId,objective:s.objective,sourceId:w.id,sourceFingerprint:fingerprintV3SportingSource(w),
   routeId:athleteId+':route:'+w.id,durationMin,distanceKm:facts.distanceKm,
   dPlusM:v[0],dMinusM:v[1],descentMinutes:facts.descentMinutes,
   technicality:index===0?'easy':'rocky',role:facts.role,fuelingPractice:!!facts.fueling,
   minimumRecoveryHours:['long_terrain','uphill_quality'].includes(facts.role)?48:12,
   provenance:'explicit_synthetic_route_observation',coachApproved:true};
 });
 const coachReview:TrailCoachReview={athleteId,objective:s.objective,weeks:s.weeks,weeklyHours:s.weeklyHours,
  primaryLimiter:s.limiter,race:{...s.event},
  history:{weeksHeld:8,weeklyMinutes:[390,510,650][index],weeklyDPlusM:[900,1800,2400][index],
   weeklyDMinusM:[850,1700,2500][index],longestRunMinutes:[135,165,195][index],
   largestDescentM:[500,1000,1350][index],observedReadyAfterHours:48,
   downhillExposureDocumented:true,reviewReference:athleteId+':synthetic-history-and-readiness-log'},
  bounds:{weeklyDPlusM:[1400,2600,3400][index],weeklyDMinusM:[1400,2600,3500][index],
   loadStepDPlusM:[250,350,450][index],loadStepDMinusM:[250,350,450][index],
   longRunStepMinutes:35,peakLongMinutes:[100,150,180][index],peakDPlusM:[240,800,1100][index],peakDMinusM:[220,800,1100][index]},
  backToBackApproved:true,terrainEffortReviewConfirmed:true,futureReadinessCheckRequired:true,
  routeFingerprints:Object.fromEntries(routes.map(r=>[r.sourceId,fingerprintTrailRoute(r)])),
 };
 const reviews:V3ReviewedSettings[]=chosen.map(w=>{
  const ctx=syntheticV3SportingContext(w.id);
  if(!('sportingReview' in ctx))throw Error('missing_context');
  const route=routes.find(r=>r.sourceId===w.id);
  return {id:w.id,objective:s.objective,athleteLevel:'trained',athleteLevelSource:'manual',
   allPrerequisitesChecked:true,individualCoachApproval:true,preferReviewedV3:true,
   expectedAthleteId:athleteId,sportingReview:{...ctx.sportingReview,athleteId},
   athleteAnchors:{...syntheticV3ReviewAnchors(),...(route&&!mutation.omitTerrainReview?{runTerrainReview:{
    athleteId,sourceId:w.id,terrainContextId:route.routeId,fieldReviewReference:route.routeId+':synthetic-field-effort-check',
    coachConfirmsFieldEffortReview:true as const,
    domainRpe:{recovery:[1,2] as [number,number],moderate_lt1:[2,3] as [number,number],
     mlss:[6,7] as [number,number],vo2max:[8,9] as [number,number]},
   }}:{})},
   ...(route?{expectedRunTerrainContextId:route.routeId}:{}),
   ...(w.sport==='strength'?{verifiedStrengthLoadAndRpe:true}:{}),
   ...(overridesFor(w.id)?{overrides:overridesFor(w.id),allowWorksetChange:true}:{}),
  };
 });
 const {contract,report}=buildDetV3ContractFromCatalogue(reviews);
 const accepted=new Set(report.accepted.map(c=>c.id));
 const admittedRoutes=routes.filter(r=>accepted.has(r.sourceId));
 mutation.routes?.(admittedRoutes);mutation.review?.(coachReview);
 const source=(id:string)=>v3FullCatalogue.workouts.find(w=>w.id===id);
 const exact=(id:string,min:number)=>contract.sourceFullStructuredDoseForId?.(id,min);
 const clock=(v:{dayIndex:number;sport:string})=>({provenance:'coach_confirmed' as const,
  minuteOfDay:v.sport==='strength'?1080:times[v.dayIndex],utcOffsetMinutes:0});
 const start=(v:{weekNumber:number;dayIndex:number;sport:string})=>
  ((v.weekNumber-1)*7+v.dayIndex)*1440+clock(v).minuteOfDay;
 const lastPeakLoad=Array.from({length:s.weeks},(_,i)=>i+1).filter(w=>w<taperStart&&inferWeekType(w,s.weeks,s.objective)==='load').pop()!;
 const longCap=(week:number)=>Math.round(s.longStart+(s.longPeak-s.longStart)*Math.min(1,(week-1)/(lastPeakLoad-3)));
 for(const card of report.accepted){
  const r=admittedRoutes.find(r=>r.sourceId===card.id);
  if(r)card.structure+=' | PARCOURS APPROUVÉ '+r.routeId+' : D+ '+r.dPlusM+' m ; D− '+r.dMinusM+
   ' m ; descente '+r.descentMinutes+' min. Réévaluer douleur, technique et disponibilité avant la séance suivante.';
 }
 const audit=(plan:Parameters<typeof auditTrailPlan>[0])=>auditTrailPlan(plan,coachReview,admittedRoutes,source,exact,start);
 const out=constructDeterministicPlan(athlete,config,{maxNodes:60000,maxMilliseconds:15000},{...contract,
  requireReviewedAthleteContext:true,
  validateReviewedAthleteContext(a){return [...contract.validateReviewedAthleteContext?.(a)??[],
   ...validateTrailReview(coachReview,admittedRoutes,source,exact),
   ...routes.filter(r=>!accepted.has(r.sourceId)).map(r=>'trail_source_not_admitted:'+r.sourceId)];},
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
     source:{tier:'coach_declared',ref:'Explicit synthetic trail frequency, not marathon quota'}};
    const perDay:DaySlot[][]=[[],[{sport:'run',isKeySession:!reduced}],
     [{sport:'bike'},...(strength?[{sport:'strength'} as DaySlot]:[])],[{sport:'run'}],
     ...(bike===2?[[{sport:'bike'} as DaySlot]]:[[]]),
     reduced?[]:[{sport:'run'}],weekType==='race'?[{sport:'run',isRaceEvent:true}]:
      [{sport:'run',isLongSession:!reduced,isKeySession:!reduced,minDurationMin:!reduced?s.longStart-20:undefined}]];
    p.weeklyQuotas[week]={quota,floors:{minStrengthPerWeek:strength,longRunWeekly:!reduced,
      slLongRunMin:!reduced?s.longStart-20:undefined},weekType,phase:phaseFor(week),downgraded:false,
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
     (s.limiter!=='tte'||(exact(card.id,min)?.high??0)>=20);
   if(reduced)return card.mainZoneMax<=2&&min>15&&min<=33;
   return card.mainZoneMax<=2&&min<=65&&route.role===(ctx.dayIndex===5?'technical':'support');
  },
  rankCandidate(card,ctx){return ctx.slot.isLongSession?Math.abs(longCap(ctx.week)-card.durationMin[0]):contract.rankCandidate?.(card,ctx)??0;},
  sourceRecoveryForId(id){
   const route=admittedRoutes.find(r=>r.sourceId===id);
   return (contract.sourceRecoveryForId?.(id)??[]).map(r=>({...r,hours:Math.max(r.hours,route?.minimumRecoveryHours??0)}));
  },
  requireReviewedTrailEvidence:true,auditReviewedTrailPlan:audit,
  ...(!mutation.omitSpecificityProvider?{reviewedTrailSpecificForSession:(session:Parameters<typeof verifyTrailSpecificSession>[0])=>
   verifyTrailSpecificSession(session,coachReview,admittedRoutes,exact)}:{}),
  useDeclaredEventDurationEstimates:true,officialEventOutsideTrainingHours:true,
  prioritizeVerifiedRunningQualitySlot:true,prioritizeVerifiedRunningQualityCandidate:true,
  prioritizeRunningStructuredEasyMargin:true,prioritizeRunningQualitySlotByMargin:true,
  requireReviewedRunningKeyQualityOnLoadWeeks:true,requireRealQualityOnLoadWeeks:true,
  requireMeasuredDeloadSelection:true,annotateVerifiedDeloads:true,
  requireStructuredPolarizationOnLoadWeeks:true,reconcileReviewedSourcePolarization:true,
  enforceWeeklyHoursCap:true,enforceCalendarSafeV3Recovery:true,enforceConfirmedNoSameDayOverlap:true,
  coachSlotStart:clock,coachSessionStart:clock,
  requireStrictPeriodizationEvidence:true,excludeNativeForbiddenTaperCandidates:true,
  enableV333ForwardCheck:true,filterDeclaredSprintBanCandidates:true,
 });
 const proof=out.candidate?audit(out.candidate):null;
 console.info('DET_V360_TRAIL',JSON.stringify({id:s.id,weeks:s.weeks,accepted:report.accepted.length,
  rejected:report.rejected.filter(r=>reviews.some(v=>v.id===r.id)).slice(0,5),reason:out.reason,
  constructed:out.technicallyConstructed,valid:out.constraintsSatisfied,nodes:out.nodes,
  hard:out.issues.filter(i=>['blocking','critical','error'].includes(i.severity)),
  phaseWarnings:out.issues.filter(i=>i.code==='phase_coherence'),
  coachReview,routes:admittedRoutes,proof,plan:out.candidate??null,
  configuredOverrides:Object.fromEntries(reviews.filter(r=>r.overrides).map(r=>[r.id,r.overrides])),
  syntheticOnly:true,prescriptionAllowed:false,productionAllowed:false,scientificSessionValidation:false,
 }));
 return {out,contract,report,config,athlete,coachReview,routes:admittedRoutes,proof,audit};
}
