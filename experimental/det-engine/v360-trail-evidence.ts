/** Dedicated trail evidence. No population progression/recovery rule is invented. */
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import type {V3Workout} from '../../scripts/library-v3/catalogueRuntime';
import {fingerprintV3SportingSource} from '../../scripts/library-v3/sportingQualification800';
import type {StructuredZoneDose} from './v310-structured-zone-dose';

export interface TrailRouteReview {
 athleteId:string;objective:string;sourceId:string;sourceFingerprint:string;routeId:string;
 durationMin:number;distanceKm:number;dPlusM:number;dMinusM:number;descentMinutes:number;
 technicality:'easy'|'rocky';role:'support'|'technical'|'long_terrain'|'uphill_quality';
 fuelingPractice:boolean;minimumRecoveryHours:number;
 provenance:'explicit_synthetic_route_observation';coachApproved:true;
}
export interface TrailCoachReview {
 athleteId:string;objective:string;weeks:number;weeklyHours:number;primaryLimiter:'vo2max'|'tte';
 race:{distanceKm:number;elevationGainM:number;elevationLossM:number;targetTimeMinutes:number};
 history:{weeksHeld:number;weeklyMinutes:number;weeklyDPlusM:number;weeklyDMinusM:number;
  longestRunMinutes:number;largestDescentM:number;observedReadyAfterHours:number;
  downhillExposureDocumented:true;reviewReference:string};
 /** All bounds below are individually declared coach constraints, NOT evidence-derived universal doses. */
 bounds:{weeklyDPlusM:number;weeklyDMinusM:number;loadStepDPlusM:number;loadStepDMinusM:number;
  longRunStepMinutes:number;peakLongMinutes:number;peakDPlusM:number;peakDMinusM:number};
 backToBackApproved:boolean;terrainEffortReviewConfirmed:true;futureReadinessCheckRequired:true;
 routeFingerprints:Record<string,string>;
}
export function fingerprintTrailRoute(route:TrailRouteReview):string {
 const s=JSON.stringify(route);let h=2166136261;
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0).toString(16).padStart(8,'0');
}
const finite=(x:number)=>Number.isFinite(x)&&x>=0;
export function validateTrailReview(review:TrailCoachReview,routes:readonly TrailRouteReview[],
 source:(id:string)=>V3Workout|undefined,exact:(id:string,min:number)=>StructuredZoneDose|null|undefined){
 const problems:string[]=[];
 const h=review.history;
 if(!review.athleteId||!/^Trail(Short|Mountain|Ultra)$/.test(review.objective)||
  !Number.isInteger(review.weeks)||review.weeks<8||!finite(review.weeklyHours)||review.weeklyHours===0)
  problems.push('trail_identity_or_horizon_missing');
 if(!h||h.weeksHeld<8||!h.reviewReference||h.downhillExposureDocumented!==true||
  [h.weeklyMinutes,h.weeklyDPlusM,h.weeklyDMinusM,h.longestRunMinutes,h.largestDescentM,h.observedReadyAfterHours]
    .some(x=>!finite(x)||x===0))problems.push('trail_downhill_history_unverified');
 if(!review.race||Object.values(review.race).some(x=>!finite(x)||x===0))problems.push('trail_event_geometry_or_estimate_missing');
 if(!review.terrainEffortReviewConfirmed||review.futureReadinessCheckRequired!==true)
  problems.push('trail_field_effort_or_readiness_review_missing');
 if(review.objective!=='TrailShort'&&review.backToBackApproved!==true)
  problems.push('trail_back_to_back_approval_missing');
 if(Object.values(review.bounds).some(x=>!finite(x)||x===0))problems.push('trail_coach_bounds_missing');
 if(!routes.length||new Set(routes.map(r=>r.sourceId)).size!==routes.length)
  problems.push('trail_route_registry_missing_or_duplicated');
 for(const r of routes){
  const w=source(r.sourceId),dose=exact(r.sourceId,r.durationMin);
  if(r.athleteId!==review.athleteId||r.objective!==review.objective||!r.routeId||
   r.coachApproved!==true||r.provenance!=='explicit_synthetic_route_observation'||
   review.routeFingerprints[r.sourceId]!==fingerprintTrailRoute(r))problems.push('trail_route_binding_invalid:'+r.sourceId);
  if(!w||w.sport!=='run'||r.sourceFingerprint!==fingerprintV3SportingSource(w)||
   !dose||dose.sourceIds.length!==1||dose.sourceIds[0]!==r.sourceId||
   Math.abs(dose.durationMin-r.durationMin)>1e-7)problems.push('trail_source_or_configured_dose_stale:'+r.sourceId);
  if([r.durationMin,r.distanceKm,r.dPlusM,r.dMinusM,r.descentMinutes,r.minimumRecoveryHours]
   .some(x=>!finite(x))||!r.durationMin||!r.distanceKm||r.descentMinutes>r.durationMin||
   (r.dMinusM>0&&r.descentMinutes===0)||(r.dMinusM===0&&r.descentMinutes>0)||
   r.dPlusM>r.distanceKm*1000||r.dMinusM>r.distanceKm*1000)
    problems.push('trail_vertical_geometry_unknown_or_impossible:'+r.sourceId);
  if(r.dMinusM>h?.largestDescentM||r.durationMin>h?.longestRunMinutes&&r.role==='long_terrain')
   problems.push('trail_dose_exceeds_documented_exposure:'+r.sourceId);
  if((r.role==='long_terrain'||r.role==='uphill_quality')&&
    r.minimumRecoveryHours<h?.observedReadyAfterHours)problems.push('trail_recovery_below_reviewed_response:'+r.sourceId);
 }
 return [...new Set(problems)];
}
export function verifyTrailSpecificSession(session:ParsedSession,review:TrailCoachReview,routes:readonly TrailRouteReview[],
 exact:(id:string,min:number)=>StructuredZoneDose|null|undefined){
 if(session.isRest||session.sport!=='run'||!session.catalogId||!session.isKeySession||
   typeof session.durationMin!=='number')return false;
 const r=routes.find(r=>r.sourceId===session.catalogId);
 const d=r&&exact(r.sourceId,session.durationMin);
 return !!r&&r.athleteId===review.athleteId&&r.objective===review.objective&&
  review.routeFingerprints[r.sourceId]===fingerprintTrailRoute(r)&&
  r.role==='long_terrain'&&r.fuelingPractice&&r.dPlusM>=review.bounds.peakDPlusM&&
  r.dMinusM>=review.bounds.peakDMinusM&&r.durationMin>=review.bounds.peakLongMinutes&&
  session.durationMin===r.durationMin&&!!d&&d.low/d.durationMin>=.75;
}
export function auditTrailPlan(plan:ParsedPlan,review:TrailCoachReview,routes:readonly TrailRouteReview[],
 source:(id:string)=>V3Workout|undefined,exact:(id:string,min:number)=>StructuredZoneDose|null|undefined,
 start:(s:ParsedSession)=>number){
 const problems=validateTrailReview(review,routes,source,exact);
 const byId=new Map(routes.map(r=>[r.sourceId,r]));
 const rows:Array<{week:number;kind:string;minutes:number;dPlusM:number;dMinusM:number;descentMinutes:number;
  longMinutes:number;low:number;high:number;unknown:number;enduranceMinutes:number;qualitySources:string[];specificSources:string[]}> = [];
 let lastLoad={dPlusM:review.history.weeklyDPlusM,dMinusM:review.history.weeklyDMinusM,
  longMinutes:review.history.longestRunMinutes};
 let runCount=0,bikeCount=0,runMinutes=0,bikeMinutes=0,keys=0,matchedKeys=0;
 const allRuns=plan.weeks.flatMap(w=>w.sessions).filter(s=>!s.isRest&&s.sport==='run'&&!s.title.startsWith('COURSE : '));
 if(plan.weeks.length!==review.weeks)problems.push('trail_incomplete_calendar');
 for(const week of plan.weeks){
  const kind=plan.weeklyQuotas?.[week.weekNumber]?.weekType??'unknown';
  const active=week.sessions.filter(s=>!s.isRest&&!s.title.startsWith('COURSE : '));
  const row={week:week.weekNumber,kind,minutes:0,dPlusM:0,dMinusM:0,descentMinutes:0,
   longMinutes:0,low:0,high:0,unknown:0,enduranceMinutes:0,qualitySources:[] as string[],specificSources:[] as string[]};
  const selected=new Set<string>();
  for(const s of active){
   if(!s.catalogId||selected.has(s.catalogId))problems.push('trail_missing_or_duplicate_source:S'+week.weekNumber);
   if(s.catalogId)selected.add(s.catalogId);
   if(s.catalogId&&!source(s.catalogId)?.phase.includes(week.phase as 'base'|'build'|'peak'|'taper'))
    problems.push('trail_selected_source_phase_mismatch:'+s.catalogId);
   if(typeof s.durationMin!=='number'||!finite(s.durationMin)||s.durationMin===0){problems.push('trail_time_unverified');continue;}
   row.minutes+=s.durationMin;
   if(s.sport==='strength')continue;
   const d=s.catalogId?exact(s.catalogId,s.durationMin):null;
   if(!d||Math.abs(d.low+d.mid+d.high+d.unknown-s.durationMin)>1e-7){problems.push('trail_exact_dose_missing:'+s.catalogId);continue;}
   row.low+=d.low;row.high+=d.high;row.unknown+=d.unknown;row.enduranceMinutes+=s.durationMin;
   if(kind==='load'){
    if(s.sport==='run'){runCount++;runMinutes+=s.durationMin;}
    if(s.sport==='bike'){bikeCount++;bikeMinutes+=s.durationMin;}
   }
   if(s.sport!=='run')continue;
   const r=byId.get(s.catalogId!);
   if(!r||r.durationMin!==s.durationMin){problems.push('trail_selected_route_missing_or_wrong_dose:'+s.catalogId);continue;}
   if(!s.details.includes('coach_field_effort')||/\bsec_per_km\b|\bm_per_sec\b/.test(s.details))
    problems.push('trail_flat_pace_transposed:'+s.catalogId);
   row.dPlusM+=r.dPlusM;row.dMinusM+=r.dMinusM;row.descentMinutes+=r.descentMinutes;
   if(r.role==='long_terrain')row.longMinutes=Math.max(row.longMinutes,s.durationMin);
   if(kind==='load'&&s.isKeySession){
    keys++;
    const primary=source(s.catalogId!)?.primaryDomain;
    if(review.primaryLimiter==='tte'?primary==='mlss'&&d.high>=20:primary==='vo2max'&&d.high>=8){
     row.qualitySources.push(s.catalogId!);matchedKeys++;
    }
   }
   if(week.phase==='peak'&&kind==='load'&&verifyTrailSpecificSession(s,review,routes,exact))
    row.specificSources.push(s.catalogId!);
   const next=allRuns.filter(n=>start(n)>start(s)).sort((a,b)=>start(a)-start(b))[0];
   const hours=next?(start(next)-start(s)-s.durationMin)/60:Infinity;
   const required=Math.max(source(s.catalogId!)?.minimumRecoveryHours??Infinity,r.minimumRecoveryHours);
   if(hours+1e-7<required)problems.push('trail_end_to_start_recovery_violated:'+s.catalogId+':S'+week.weekNumber);
  }
  if(row.minutes>review.weeklyHours*60+1e-7)problems.push('trail_weekly_training_hours_exceeded:S'+week.weekNumber);
  if(row.dPlusM>review.bounds.weeklyDPlusM||row.dMinusM>review.bounds.weeklyDMinusM)
   problems.push('trail_weekly_vertical_cap_exceeded:S'+week.weekNumber);
  if(kind==='load'){
   if(!row.qualitySources.length)problems.push('trail_primary_quality_missing:S'+week.weekNumber);
   if(row.low<row.enduranceMinutes*.75-1e-7||row.unknown>row.enduranceMinutes*.3+1e-7)
    problems.push('trail_load_polarization_unverified:S'+week.weekNumber);
   if(row.dPlusM>lastLoad.dPlusM+review.bounds.loadStepDPlusM||
    row.dMinusM>lastLoad.dMinusM+review.bounds.loadStepDMinusM||
    row.longMinutes>lastLoad.longMinutes+review.bounds.longRunStepMinutes)
    problems.push('trail_coach_progression_bound_exceeded:S'+week.weekNumber);
   lastLoad=row;
   if(!active.some(s=>s.dayIndex===5&&s.sport==='run')||!active.some(s=>s.dayIndex===6&&s.sport==='run'&&s.isKeySession))
    problems.push('trail_reviewed_weekend_pair_missing:S'+week.weekNumber);
  }
  const previous=rows[rows.length-1];
  if(kind==='recovery'&&(!previous||row.minutes>previous.minutes*.7+1e-7||
    row.dPlusM>previous.dPlusM*.7+1e-7||row.dMinusM>previous.dMinusM*.7+1e-7))
   problems.push('trail_measured_recovery_not_reduced:S'+week.weekNumber);
  rows.push(row);
 }
 if(!rows.some(r=>r.specificSources.length))problems.push('trail_peak_geometry_fueling_and_dose_unproven');
 const range=review.objective==='TrailShort'?[.7,.8]:review.objective==='TrailMountain'?[.65,.8]:[.65,.75];
 const countShare=runCount/(runCount+bikeCount),minuteShare=runMinutes/(runMinutes+bikeMinutes);
 if(!Number.isFinite(countShare)||countShare<range[0]-1e-7||countShare>range[1]+1e-7||
  !Number.isFinite(minuteShare)||minuteShare<range[0]-1e-7||minuteShare>range[1]+1e-7)
  problems.push('trail_load_run_share_outside_dedicated_range');
 if(!keys||matchedKeys/keys<.3)problems.push('trail_primary_key_coverage_below_30pct');
 const events=plan.weeks.flatMap(w=>w.sessions).filter(s=>s.title.startsWith('COURSE : '));
 if(events.length!==1||events[0].sport!=='run'||events[0].durationMin!==review.race.targetTimeMinutes||
  events[0].weekNumber!==review.weeks||events[0].dayIndex!==6)problems.push('trail_declared_event_mismatch');
 return {verified:!problems.length,problems:[...new Set(problems)],evidence:{rows,countShare,minuteShare,
  keys,matchedKeys,eventEstimateOnly:true,syntheticOnly:true,scientificSessionValidation:false,
  futureReadinessCheckRequired:true,prescriptionAllowed:false,productionAllowed:false}};
}
