import {normalizeRepairSport} from '../../supabase/functions/_shared/repairSportingEquivalence';
/** CLM: explicit coach constraints and exact admitted V3 posture blocks.
 * No speed/power prediction, no inferred posture tolerance or human approval.
 */
import type {PlanConfig} from '@/hooks/useAITrainingPlan';
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import type {DetStructuredWorkout,DetStructuredNode,DetStructureResult} from './v400-structured-workout';
import {detPrimaryLimiterKey,type DetLimiterKey} from './v403-limiter-semantics';
import type {PrimarySourceEvidence} from './v408-primary-limiter-evidence';
import {matchingStructuredDose} from './v310-structured-zone-dose';
export const TT_OBJECTIVE='Cyclisme contre-la-montre';
export const TT_AERO_SOURCES=['V3P_BIKE_057','V3P_BIKE_087'] as const;
export const isTimeTrial=(v:string)=>['cyclisme contre la montre','contre la montre','cycling tt','time trial'].includes(v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[\s_-]+/g,' '));
export interface TimeTrialDeclaration {
 aeroWeeks:number[];aeroDayIndex:number;
 athleteId:string; raceDurationMinutes:number; observedOn:string; reviewReference:string;
 bikeFitConfirmed:boolean; symptomScreenClear:boolean;
 longestContinuousAeroMinutes:number; maxAeroMinutesPerSession:number;
 minimumContinuousAeroMinutes:number; minimumAeroMinutesPerSession:number; minimumAeroSessions:number;
}
const positive=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>0;
export function timeTrialProblems(d:TimeTrialDeclaration|undefined,athleteId:string,config:PlanConfig):string[]{
 if(!isTimeTrial(String(config.objective)))return [];
 if(!d)return ['CLM : revue de la position aéro et durée d’épreuve requises.'];
 const p:string[]=[];
 if(d.athleteId!==athleteId)p.push('CLM : revue posturale d’un autre athlète.');
 if(typeof d.reviewReference!=='string'||!d.reviewReference.trim()||typeof d.observedOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d.observedOn)||!Number.isFinite(Date.parse(d.observedOn))||new Date(d.observedOn).toISOString().slice(0,10)!==d.observedOn||!config.planStartDate||d.observedOn>config.planStartDate)p.push('CLM : référence et date réelle d’observation antérieure au plan requises.');
 if(d.bikeFitConfirmed!==true||d.symptomScreenClear!==true)p.push('CLM : réglage du vélo et absence de douleur en position à confirmer par le coach.');
 if(!Array.isArray(d.aeroWeeks)||!d.aeroWeeks.length||new Set(d.aeroWeeks).size!==d.aeroWeeks.length||d.aeroWeeks.some(w=>!Number.isSafeInteger(w)||w<1||w>(config.weeksAvailable??0))||d.aeroWeeks.length<d.minimumAeroSessions||!Number.isSafeInteger(d.aeroDayIndex)||d.aeroDayIndex<0||d.aeroDayIndex>6)p.push('CLM : semaines et jour de pratique spécifiques explicitement choisis requis.');
 const nums=[d.raceDurationMinutes,d.longestContinuousAeroMinutes,d.maxAeroMinutesPerSession,d.minimumContinuousAeroMinutes,d.minimumAeroMinutesPerSession,d.minimumAeroSessions];
 if(!nums.every(positive)||!Number.isSafeInteger(d.minimumAeroSessions)||d.minimumAeroSessions>(config.weeksAvailable??0)*6)p.push('CLM : durée et doses posturales explicites, positives et finies requises.');
 if(d.minimumContinuousAeroMinutes>d.longestContinuousAeroMinutes||d.minimumAeroMinutesPerSession>d.maxAeroMinutesPerSession||d.minimumContinuousAeroMinutes>d.minimumAeroMinutesPerSession||d.longestContinuousAeroMinutes>d.maxAeroMinutesPerSession)p.push('CLM : objectif de pratique incompatible avec la tolérance posturale déclarée.');
 const goals=config.raceGoals??[];
 if(goals.length!==1||!isTimeTrial(String(goals[0]?.objective))||goals[0]?.targetTimeMinutes!==d.raceDurationMinutes||!goals[0]?.raceDate||goals[0].raceDate!==config.raceDate)p.push('CLM : une course datée et sa durée estimée doivent correspondre à la déclaration.');
 return p;
}
/** Ordered bouts/rests, not a sum of "aero" words in prose. */
export function aeroLedger(w:DetStructuredWorkout){
 const segments:Array<{aero:boolean;seconds:number}>=[];let valid=w.sport==='bike'&&!w.composition;
 const add=(aero:boolean,seconds:number)=>{if(!Number.isFinite(seconds)||seconds<0){valid=false;return;}if(!seconds)return;const last=segments.at(-1);if(last?.aero===aero)last.seconds+=seconds;else segments.push({aero,seconds});};
 const walk=(nodes:DetStructuredNode[])=>{for(const n of nodes){if(n.kind==='repeat'){if(!Number.isSafeInteger(n.count)||n.count<1||n.count>1000){valid=false;return;}for(let i=0;i<n.count;i++){walk(n.steps);if(i<n.count-1)add(false,n.betweenSec);}}else{if(!('seconds'in n.dose)){valid=false;return;}add(/\ba[eé]ro\b/i.test(n.label)&&n.role==='main'&&n.target!==null,n.dose.seconds);}}};
 walk(w.nodes);const sum=segments.reduce((a,s)=>a+s.seconds,0);
 if(w.exactSeconds===null||Math.abs(sum-w.exactSeconds)>1e-6||Math.abs(sum-w.chosenDurationMin*60)>1e-6)valid=false;
 const bouts=segments.filter(s=>s.aero).map(s=>s.seconds);
 return {valid,boutsSeconds:bouts,segments,totalAeroMinutes:bouts.reduce((a,b)=>a+b,0)/60,longestContinuousMinutes:Math.max(0,...bouts)/60};
}
export function verifyBikePrimary(s:ParsedSession,key:DetLimiterKey,p:PrimarySourceEvidence):boolean{
 if(s.isRest||!s.isKeySession||normalizeRepairSport(s.sport)!=='bike'||!s.catalogId||!/^V3P_BIKE_\d{3}$/.test(s.catalogId)||!positive(s.durationMin))return false;
 const d=matchingStructuredDose(p.dose(s.catalogId,s.durationMin)??null,s.durationMin),keys=p.limiterKeys(s.catalogId),domain=p.primaryDomain(s.catalogId);
 if(!d||d.provenance!=='v3_individually_configured_blocks_only'||d.sourceIds.length!==1||d.sourceIds[0]!==s.catalogId||!keys)return false;
 const threshold=domain==='mlss'&&keys.includes('threshold_tolerance')&&keys.includes('fractional_utilization')&&d.high>=20;
 if(key==='ftp'||key==='ftp_relative')return keys.includes('cycling_power_durability')&&(['sub_threshold','mlss','vo2max'].includes(domain??'')&&(d.mid+d.high)>=20||domain==='moderate_lt1'&&d.low>=40&&d.mid===0&&d.high===0); // aerobic support is a co-contributor, never proof of a measured FTP gain
 if(key==='tte')return threshold;
 if(key==='vo2max')return domain==='vo2max'&&keys.includes('aerobic_ceiling')&&keys.includes('severe_domain_tolerance')&&d.high>=8;
 if(key==='vlamax_reduction')return threshold||(domain==='moderate_lt1'&&keys.includes('aerobic_capacity')&&d.low>=40&&d.mid===0&&d.high===0);
 return false;
}
export function auditTimeTrial(plan:Pick<ParsedPlan,'weeks'>,d:TimeTrialDeclaration,key:DetLimiterKey,p:PrimarySourceEvidence,structure:(id:string,min:number|undefined)=>DetStructureResult){
 const sessions=plan.weeks.flatMap(w=>w.sessions).filter(s=>!s.isRest&&!s.title.startsWith('COURSE : '));
 const exposures=sessions.flatMap(s=>{if(!s.catalogId||!(TT_AERO_SOURCES as readonly string[]).includes(s.catalogId))return [];const x=structure(s.catalogId,s.durationMin);return x.status==='structured'&&x.workout.sourceId===s.catalogId&&x.workout.chosenDurationMin===s.durationMin?[{week:s.weekNumber,dayIndex:s.dayIndex,phase:s.phase,sourceId:s.catalogId,...aeroLedger(x.workout)}]:[{week:s.weekNumber,dayIndex:s.dayIndex,phase:s.phase,sourceId:s.catalogId,valid:false,boutsSeconds:[],segments:[],totalAeroMinutes:0,longestContinuousMinutes:0}];});
 const unsafe=exposures.some(e=>!e.valid||!d.aeroWeeks.includes(e.week)||e.dayIndex!==d.aeroDayIndex||e.longestContinuousMinutes>d.longestContinuousAeroMinutes||e.totalAeroMinutes>d.maxAeroMinutesPerSession);
 const relevant=exposures.filter(e=>d.aeroWeeks.includes(e.week)&&e.valid&&['build','peak'].includes(e.phase??'')&&e.totalAeroMinutes>=d.minimumAeroMinutesPerSession&&e.longestContinuousMinutes>=d.minimumContinuousAeroMinutes);
 const keys=sessions.filter(s=>s.isKeySession),hits=keys.filter(s=>verifyBikePrimary(s,key,p)).length;
 const primaryEvidence=keys.map(s=>({week:s.weekNumber,sourceId:s.catalogId,verified:verifyBikePrimary(s,key,p),basis:(key==='ftp'||key==='ftp_relative')&&s.catalogId&&p.primaryDomain(s.catalogId)==='moderate_lt1'?'aerobic_support_only':'exact_domain_work',...(s.catalogId?{domain:p.primaryDomain(s.catalogId),dose:p.dose(s.catalogId,s.durationMin!)}:{})}));
 const appointmentsComplete=d.aeroWeeks.every(w=>exposures.filter(e=>e.week===w&&e.dayIndex===d.aeroDayIndex).length===1);
 const coverage=keys.length?100*hits/keys.length:0;
 return {verified:appointmentsComplete&&!unsafe&&relevant.length>=d.minimumAeroSessions&&relevant.some(e=>e.phase==='peak')&&coverage>=30,primary:key,primaryEvidence,appointmentsComplete,exposures,qualifyingExposures:relevant.length,requiredExposures:d.minimumAeroSessions,unsafe,coverage,hits,keySessions:keys.length,minimumCoverage:30,measuredAdaptation:false,scientificAttestation:false};
}

export function timeTrialPhysiologyProblems(config:PlanConfig,athlete:Readonly<import('@/hooks/useAITrainingPlan').PlanAthleteData>):string[]{
 if(!isTimeTrial(String(config.objective))||detPrimaryLimiterKey(config)!=='ftp_relative')return [];
 const g=config.physiologicalTrace?.diagnostic.limiters.find(g=>g.metric==='FTP/kg');
 const mass=athlete.weightKg,ftp=athlete.ftp;
 return positive(mass)&&positive(ftp)&&g&&positive(g.value)&&positive(g.target)&&g.value<g.target&&Math.abs(g.value-ftp/mass)<0.005?[]:['CLM : FTP/kg requiert la masse actuelle, la FTP et leur écart documenté dans le diagnostic original. Aucune conversion vers FTP absolue ni perte de poids n’est prescrite.'];
}
