/**
 * V3.1 runtime resolution of source-bound prescriptions.
 *
 * Generic source cards intentionally hold NO athlete metrics. This module
 * resolves them ONLY from supplied/confirmed per-athlete inputs and remains
 * independent of the actual training-plan generator and athlete database.
 * No missing FTP, LT1, pace, sprint or strength timing is fabricated.
 */
import { getDoctrineDomain, type DoctrineDomainId } from '../../src/lib/zones/tfclDoctrine';
import type { V3Workout,V3Block } from './catalogueRuntime';
import {auditV31PrescriptionContract} from './prescriptionContract';

export interface V31AthleteCalibration {
  bikeFTPWatts?:number;
  bikeLT1Watts?:number;
  bikePMAWatts?:number;
  bikeSprintReferenceWatts?:number;
  runMLSSPaceSecondsPerKm?:number;
  runLT1PaceSecondsPerKm?:number;
  runVVO2PaceSecondsPerKm?:number;
  runSprintPaceSecondsPerKm?:number;
  swimPacesSecondsPer100m?:Partial<Record<DoctrineDomainId,number>>;
  /** Each strength MAIN segment is reviewed independently, not one RPE for all exercises. */
  strengthLoadPerPath?:Record<string,{kind:'rpe'|'kg';value:number}>;
}
export interface V31IntensitySegment {
  path:string;
  domain:DoctrineDomainId|null;
  role:string;
  unit:'watts'|'seconds_per_km'|'seconds_per_100m'|'rpe'|'kg';
  min:number;
  max:number;
  provenance:'coach_confirmed'|'derived_from_individual_threshold';
}
export interface V31IntensityResult {
  status:'resolved'|'blocked';
  segments:V31IntensitySegment[];
  missing:string[];
  interpretation:'source_contract_and_individual_inputs_only_not_coach_approval';
}
function valid(n:unknown):n is number {
  return typeof n==='number'&&Number.isFinite(n)&&n>0;
}
export function resolveV31Intensity(w:V3Workout,athlete:V31AthleteCalibration):V31IntensityResult {
  if(auditV31PrescriptionContract(w).length)throw Error('V31_SOURCE_CONTRACT_INVALID:'+w.id);
  const segments:V31IntensitySegment[]=[];
  const missing:string[]=[];
  const need=(key:string)=>missing.push(key);
  const values=(path:string,domain:DoctrineDomainId|null,role:string,
    unit:V31IntensitySegment['unit'],min:number,max:number,
    provenance:V31IntensitySegment['provenance'])=>{
      if(!Number.isFinite(min)||!Number.isFinite(max)||min<0||max<=0||min>max){
        need('INCOMPATIBLE_CALIBRATION:'+path);return;
      }
      segments.push({path,domain,role,unit,min,max,provenance});
    };
  for(const item of w.prescriptionContract.intensity.segments){
    const {path,role,domain}=item;
    if(w.sport==='strength'){
      if(role!=='main')continue;
      const v=athlete.strengthLoadPerPath?.[path];
      if(!v||!valid(v.value)||(v.kind==='rpe'&&(v.value<1||v.value>10))){
        need('strength_coach_load_or_RPE:'+path);continue;
      }
      values(path,domain,role,v.kind,v.value,v.value,'coach_confirmed');
      continue;
    }
    if(domain===null){need('MISSING_PHYSIOLOGICAL_DOMAIN:'+path);continue;}
    if(w.sport==='swim'){
      const pace=athlete.swimPacesSecondsPer100m?.[domain];
      if(!valid(pace)){need('coach_confirmed_swim_pace:'+domain);continue;}
      values(path,domain,role,'seconds_per_100m',pace,pace,'coach_confirmed');
      continue;
    }
    const doctrine=getDoctrineDomain(domain);
    if(w.sport==='bike'){
      if(domain==='neuromuscular'){
        const sprint=athlete.bikeSprintReferenceWatts;
        if(!valid(sprint)){need('bike_sprint_reference_watts');continue;}
        values(path,domain,role,'watts',sprint,sprint,'coach_confirmed');
        continue;
      }
      const ftp=athlete.bikeFTPWatts;
      if(!valid(ftp)){need('bike_FTP_watts');continue;}
      if(!doctrine.bike){need('bike_domain_without_power_range:'+domain);continue;}
      let min=doctrine.bike.min*ftp,max=doctrine.bike.max*ftp;
      if(domain==='recovery'||domain==='moderate_lt1'){
        const lt1=athlete.bikeLT1Watts;
        if(!valid(lt1)||lt1>=ftp){need('bike_individual_LT1_watts');continue;}
        max=Math.min(max,lt1);
      }
      if(domain==='vo2max'){
        const pma=athlete.bikePMAWatts;
        if(!valid(pma)||pma<=1.05*ftp){need('bike_individual_PMA_watts');continue;}
        max=pma;
      }
      values(path,domain,role,'watts',min,max,'derived_from_individual_threshold');
      continue;
    }
    if(w.sport==='run'){
      if(domain==='neuromuscular'){
        const sprint=athlete.runSprintPaceSecondsPerKm;
        if(!valid(sprint)){need('run_individual_sprint_pace');continue;}
        values(path,domain,role,'seconds_per_km',sprint,sprint,'coach_confirmed');
        continue;
      }
      const threshold=athlete.runMLSSPaceSecondsPerKm;
      if(!valid(threshold)){need('run_individual_MLSS_pace');continue;}
      if(!doctrine.run||doctrine.run.max<=0){need('run_domain_without_pace_range:'+domain);continue;}
      let fastest=threshold/doctrine.run.max;
      const slowest=doctrine.run.min>0?threshold/doctrine.run.min:threshold*2;
      if(domain==='recovery'||domain==='moderate_lt1'){
        const lt1=athlete.runLT1PaceSecondsPerKm;
        if(!valid(lt1)||lt1<=threshold){need('run_individual_LT1_pace');continue;}
        fastest=Math.max(fastest,lt1);
      }
      if(domain==='vo2max'){
        const vvo2=athlete.runVVO2PaceSecondsPerKm;
        if(!valid(vvo2)||vvo2>=threshold/1.03){need('run_individual_vVO2_pace');continue;}
        fastest=vvo2;
      }
      values(path,domain,role,'seconds_per_km',fastest,slowest,
        'derived_from_individual_threshold');
    }
  }
  return {status:missing.length?'blocked':'resolved',segments,
    missing:[...new Set(missing)].sort(),
    interpretation:'source_contract_and_individual_inputs_only_not_coach_approval'};
}
export interface V31DurationInputs {
  swimPacesSecondsPer100m?:Partial<Record<DoctrineDomainId,number>>;
  /** Measured/coach-confirmed seconds for ONE execution of each rep leaf. */
  strengthMeasuredSecondsPerRepetitionByPath?:Record<string,number>;
  /** Extra setup/transitions external to declared blocks; can be 0 if confirmed. */
  strengthCoachConfirmedSetupTransitionSeconds?:number;
}
export interface V31ResolvedDuration {
  status:'confirmed'|'blocked';
  seconds:number|null;
  minutes:number|null;
  wholeMinuteSlot:boolean;
  missing:string[];
  provenance:'exact_structured_time_or_coach_confirmed_inputs';
}
/** Never uses estimated secPerRep from strength source or a generic swim CSS fallback. */
export function resolveV31Duration(w:V3Workout,input:V31DurationInputs={}):V31ResolvedDuration {
  if(auditV31PrescriptionContract(w).length)throw Error('V31_SOURCE_CONTRACT_INVALID:'+w.id);
  const missing:string[]=[];
  const accumulate=(blocks:readonly V3Block[],prefix=''):number=>{
    let total=0;
    for(let i=0;i<blocks.length;i++){
      const block=blocks[i],path=prefix?prefix+'.'+i:String(i);
      if(block.kind==='repeat'){
        const count=block.count.base;
        if(!Number.isSafeInteger(count)||count<1||!Number.isFinite(block.betweenSec)||block.betweenSec<0)
          throw Error('V31_INVALID_REPEAT:'+path);
        const inner=accumulate(block.steps,path);
        total+=count*inner+(count-1)*block.betweenSec;
      }else if(block.kind==='time'){
        if(!valid(block.seconds?.base))throw Error('V31_INVALID_TIME:'+path);
        total+=block.seconds!.base;
      }else if(block.kind==='distance'){
        if(w.sport!=='swim'||!block.domain)throw Error('V31_UNSUPPORTED_DISTANCE:'+path);
        const pace=input.swimPacesSecondsPer100m?.[block.domain];
        if(!valid(pace)){
          missing.push('coach_confirmed_swim_pace_sec_per_100m:'+block.domain);continue;
        }
        if(!valid(block.meters?.base))throw Error('V31_INVALID_DISTANCE:'+path);
        total+=block.meters!.base*pace/100;
      }else{
        if(w.sport!=='strength')throw Error('V31_REPETITION_NOT_STRENGTH:'+path);
        const seconds=input.strengthMeasuredSecondsPerRepetitionByPath?.[path];
        if(!valid(seconds)){
          missing.push('coach_measured_execution_seconds_per_repetition:'+path);continue;
        }
        if(!valid(block.reps?.base)||!valid(block.sides))
          throw Error('V31_INVALID_REP_COUNT:'+path);
        total+=block.reps!.base*block.sides!*seconds;
      }
    }
    return total;
  };
  let total=accumulate(w.blocks);
  if(w.sport==='strength'){
    const setup=input.strengthCoachConfirmedSetupTransitionSeconds;
    if(typeof setup!=='number'||!Number.isFinite(setup)||setup<0)
      missing.push('coach_confirmed_setup_transition_seconds');
    else total+=setup;
  }
  if(missing.length)return{status:'blocked',seconds:null,minutes:null,
    wholeMinuteSlot:false,missing:[...new Set(missing)].sort(),
    provenance:'exact_structured_time_or_coach_confirmed_inputs'};
  if(!Number.isFinite(total)||total<=0)throw Error('V31_INVALID_TOTAL:'+w.id);
  return{status:'confirmed',seconds:total,minutes:total/60,
    wholeMinuteSlot:Number.isSafeInteger(total/60),missing:[],
    provenance:'exact_structured_time_or_coach_confirmed_inputs'};
}
