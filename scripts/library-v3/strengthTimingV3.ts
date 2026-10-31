/**
 * Source-preserving, individual-strength timing conversion.
 *
 * Historical movement repetitions do NOT have confirmed appointment durations.
 * A coach may supply actually measured execution seconds PER REP and measured
 * setup/transition seconds PER SET, with an approved RPE/load range. Only then
 * can the configured individual candidate be expressed as a fixed time slot.
 * No real-life measurements, default reps time or set-up time are inferred.
 */
import {type V3Workout,type V3Block} from "./catalogueRuntime";

export interface MeasuredStrengthSet {
  /** Individually observed, seconds per repetition (not a literature estimate). */
  secondsPerRep:number;
  /** Individually observed set preparation/transition, including equipment change. */
  setupTransitionSeconds:number;
  /** Coach-verified safe RPE limits for THIS movement and athlete. */
  rpeMin:number;
  rpeMax:number;
}
export interface VerifiedStrengthTiming {
  coachConfirmedMeasurements:true;
  /** Exact original leaf path, e.g. 1.0 for the first movement in a repeat. */
  measuredByBlockPath:Record<string,MeasuredStrengthSet>;
}
export interface ConvertedStrengthWorkout {
  workout:V3Workout;
  totalMeasuredMovementPaths:number;
  sourcePreserved:true;
  candidateOnly:true;
}
/** Throws when source movement timing is absent, untrusted, or cannot be explained. */
export function configureMeasuredStrengthTiming(
 source:V3Workout, inputs:VerifiedStrengthTiming,
):ConvertedStrengthWorkout {
 if(source.sport!=="strength")throw Error("v3_strength_timing_wrong_sport");
 if(!inputs||inputs.coachConfirmedMeasurements!==true||
    !inputs.measuredByBlockPath||Array.isArray(inputs.measuredByBlockPath))
   throw Error("v3_strength_execution_measurement_not_attested");
 const seen=new Set<string>();
 const blocks=(items:readonly V3Block[],prefix=""):V3Block[]=>
  items.map((b,i):V3Block=>{
   const path=prefix?prefix+"."+i:String(i);
   if(b.kind==="repeat")return {...b,steps:blocks(b.steps,path)};
   if(b.kind!=="reps")return b;
   const measure=inputs.measuredByBlockPath[path];
   if(!measure)throw Error("v3_strength_measured_timing_missing:"+path);
   seen.add(path);
   const {secondsPerRep,setupTransitionSeconds,rpeMin,rpeMax}=measure;
   if(![secondsPerRep,setupTransitionSeconds,rpeMin,rpeMax].every(Number.isFinite) ||
      secondsPerRep<=0||setupTransitionSeconds<0||rpeMin<1||rpeMax>10||
      rpeMin>rpeMax||secondsPerRep>30||setupTransitionSeconds>900)
     throw Error("v3_strength_measurement_out_of_range:"+path);
   const seconds=b.reps!.base*secondsPerRep*(b.sides??1)+setupTransitionSeconds;
   if(!Number.isSafeInteger(seconds)||seconds<=0||seconds>3600)
     throw Error("v3_strength_duration_not_exact_seconds:"+path);
   return {
     kind:"time",role:b.role,domain:null,
     label:b.label+" — "+b.reps!.base+" répétitions mesurées, "+secondsPerRep+
       " s/répétition, "+setupTransitionSeconds+" s de préparation/transition par série, RPE "+
       rpeMin+"–"+rpeMax,
     seconds:{min:seconds,base:seconds,max:seconds},
     // Intentionally fixed here; changing reps requires NEW timing evidence.
     repsTarget:{min:b.reps!.base,base:b.reps!.base,max:b.reps!.base},
     rpeRange:{min:rpeMin,max:rpeMax},
   };
  });
 const converted=blocks(source.blocks);
 if(!seen.size)throw Error("v3_strength_no_repetition_timing_needed");
 const unknown=Object.keys(inputs.measuredByBlockPath).filter(k=>!seen.has(k));
 if(unknown.length)throw Error("v3_strength_unknown_measurement_path:"+unknown[0]);
 return {
  workout:{
   ...source,blocks:converted,
   prescription:{
    ...source.prescription,
    duration:{
      ...source.prescription.duration,
      classification:"timeboxed_executable",
      strengthRepsInterpretation:"individual_coach_measured_execution_plus_transitions",
    },
   },
  },totalMeasuredMovementPaths:seen.size,sourcePreserved:true,candidateOnly:true,
 };
}
