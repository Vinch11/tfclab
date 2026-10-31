/**
 * V3.10 — exact experimental time-in-zone provenance from individually
 * configured source BLOCKS. Never classifies text, never infers warmup,
 * passive recovery, or an unmeasured swim pace as easy training.
 *
 * A source domain uses the TFCL doctrine zone. This is a structural
 * prescription audit, NOT a physiological measurement or release approval.
 * Legacy catalogues and unknown bricks remain unproven.
 */
import {getDoctrineDomain} from '../../src/lib/zones/tfclDoctrine';
import type {Paces,V3Block,V3Workout} from '../../scripts/library-v3/catalogueRuntime';

export interface StructuredZoneDose {
  low:number;mid:number;high:number;unknown:number;
  durationMin:number;
  /** Identity of explicitly configured and accepted V3 source(s). */
  sourceIds:readonly string[];
  provenance:'v3_individually_configured_blocks_only';
}
type WorkoutBlocks=Pick<V3Workout,'id'|'sport'|'blocks'>;
type Seconds={low:number;mid:number;high:number;unknown:number};
const zero=():Seconds=>({low:0,mid:0,high:0,unknown:0});
const add=(a:Seconds,b:Seconds):Seconds=>({
  low:a.low+b.low,mid:a.mid+b.mid,high:a.high+b.high,
  unknown:a.unknown+b.unknown,
});
const valid=(x:number)=>Number.isFinite(x)&&x>=0;

/** No guessed low-intensity minutes: unstructured between-repetition
 * intervals are explicitly UNKNOWN, even if traditionally called recovery. */
function exactBlockSeconds(block:V3Block,paces:Paces):Seconds|null {
  if(block.kind==='repeat'){
    const count=block.count.base;
    if(!Number.isSafeInteger(count)||count<=0||
       !Number.isFinite(block.betweenSec)||block.betweenSec<0||
       !block.steps.length)return null;
    let sum=zero();
    for(const step of block.steps){
      const part=exactBlockSeconds(step,paces);
      if(!part)return null;
      sum=add(sum,part);
    }
    const gap=(count-1)*block.betweenSec;
    if(!valid(gap))return null;
    return {low:sum.low*count,mid:sum.mid*count,
      high:sum.high*count,unknown:sum.unknown*count+gap};
  }
  // A counted strengthening repetition does not prove session minutes.
  if(block.kind==='reps')return null;
  let seconds:number;
  if(block.kind==='time'){
    if(!block.seconds)return null;
    seconds=block.seconds.base;
  }else{
    if(!block.domain||!block.meters)return null;
    const pace=paces[block.domain];
    if(typeof pace!=='number'||!Number.isFinite(pace)||pace<=0)return null;
    seconds=block.meters.base*pace/100;
  }
  if(!valid(seconds))return null;
  if(!block.domain)return {...zero(),unknown:seconds};
  const zone=getDoctrineDomain(block.domain).zone;
  if(zone==='Z1'||zone==='Z2')return {...zero(),low:seconds};
  if(zone==='Z3')return {...zero(),mid:seconds};
  if(zone==='Z4'||zone==='Z5'||zone==='Z6')return {...zero(),high:seconds};
  return null;
}
export function structuredV3ZoneDose(
  workout:WorkoutBlocks,paces:Paces,
):StructuredZoneDose|null {
  // Strength is a FREQUENCY obligation. Its aerobic time is not measured by
  // this prescription structure, including timeboxed strength variants.
  if(workout.sport==='strength'||!workout.blocks.length)return null;
  let seconds=zero();
  for(const block of workout.blocks){
    const part=exactBlockSeconds(block,paces);
    if(!part)return null;
    seconds=add(seconds,part);
  }
  const total=seconds.low+seconds.mid+seconds.high+seconds.unknown;
  if(!Number.isFinite(total)||total<=0)return null;
  return {
    low:seconds.low/60,mid:seconds.mid/60,high:seconds.high/60,
    unknown:seconds.unknown/60,durationMin:total/60,
    sourceIds:[workout.id],
    provenance:'v3_individually_configured_blocks_only',
  };
}
/** Only two fully proved endurance sources and an independently
 * coach-approved exact transition can compose an attestable brick.
 * A transition is UNKNOWN intensity (not Z1/Z2 time). */
export function composeReviewedBrickZoneDose(
  bike:StructuredZoneDose|null,run:StructuredZoneDose|null,
  transitionSeconds:number,declaredDurationMin:number,
):StructuredZoneDose|null {
  if(!bike||!run||!matchingStructuredDose(bike,bike.durationMin)||
     !matchingStructuredDose(run,run.durationMin)||
     bike.sourceIds.length!==1||run.sourceIds.length!==1||
     !/^V3P_BIKE_/.test(bike.sourceIds[0])||
     !/^V3P_RUN_/.test(run.sourceIds[0])||
     !Number.isSafeInteger(transitionSeconds)||transitionSeconds<0||
     !Number.isFinite(declaredDurationMin)||declaredDurationMin<=0)return null;
  const duration=bike.durationMin+run.durationMin+transitionSeconds/60;
  if(Math.abs(duration-declaredDurationMin)>1e-7)return null;
  return {
    low:bike.low+run.low,mid:bike.mid+run.mid,high:bike.high+run.high,
    unknown:bike.unknown+run.unknown+transitionSeconds/60,
    durationMin:duration,sourceIds:[...bike.sourceIds,...run.sourceIds],
    provenance:'v3_individually_configured_blocks_only',
  };
}
/** Prevent any accidental reuse of a source ledger at a different dose. */
export function matchingStructuredDose(
  ledger:StructuredZoneDose|null,chosenDurationMin:number|undefined,
):StructuredZoneDose|null {
  if(!ledger||typeof chosenDurationMin!=='number'||
     !Number.isFinite(chosenDurationMin)||
     Math.abs(chosenDurationMin-ledger.durationMin)>1e-7)return null;
  // A duration match ALONE is insufficient: a corrupted or externally
  // injected zone ledger must never certify more easy/quality minutes than
  // the session actually contains. Preserve fractional swimming durations.
  const components=[ledger.low,ledger.mid,ledger.high,ledger.unknown];
  if(!Number.isFinite(ledger.durationMin)||ledger.durationMin<=0||
     components.some(value=>!Number.isFinite(value)||value<0)||
     Math.abs(components.reduce((sum,value)=>sum+value,0)-ledger.durationMin)>1e-7)
    return null;
  return ledger;
}
