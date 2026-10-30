/**
 * Read-only, fail-closed ingestion of the COMPLETE 400-recipe V3 candidate
 * catalogue into the experimental deterministic engine. No production import.
 *
 * Reviews and parameter overrides are scoped to one candidate and athlete
 * scenario; they do not declare scientific validation of the original recipe.
 */
import {
  auditV3Catalogue, evaluateV3Workout, v3FullCatalogue,
  type Overrides, type V3Block, type V3Workout,
} from '../../scripts/library-v3/catalogueRuntime';
import { fitV3Duration } from '../../scripts/library-v3/durationFitter';
import {
  buildDetV3Contract, type DetV3Review, type V3SourceCard,
} from './v31-v3-bridge';

export interface V3ReviewedSettings extends DetV3Review {
  /** Exact V3 paths such as "0.seconds" or "1.count". */
  overrides?: Overrides;
  /** Optional exact target. Never pad spare time or round a prescription. */
  targetDurationMin?: number;
  /** Explicit coach permission to change work-set counts/intense durations. */
  allowWorksetChange?: boolean;
}

type Bounds = {min:number;base:number;max:number};

function alterBound(bounds: Bounds, path: string, all: Overrides, seen: Set<string>, integral: boolean): Bounds {
  if (!Object.prototype.hasOwnProperty.call(all,path)) return bounds;
  seen.add(path);
  const next=all[path];
  if (!Number.isFinite(next) || next < bounds.min || next > bounds.max ||
      (integral && !Number.isSafeInteger(next))) throw Error('v3_override_out_of_bounds:'+path);
  return {...bounds,base:next};
}

function configureBlocks(blocks: V3Block[], overrides: Overrides, seen:Set<string>, prefix=''):V3Block[] {
  return blocks.map((b,i):V3Block=>{
    const path=prefix?prefix+'.'+i:String(i);
    switch(b.kind) {
      case 'repeat': return {...b,
        count:alterBound(b.count,path+'.count',overrides,seen,true),
        steps:configureBlocks(b.steps,overrides,seen,path)};
      case 'time': return {...b,seconds:alterBound(b.seconds!,path+'.seconds',overrides,seen,false)};
      case 'distance': return {...b,meters:alterBound(b.meters!,path+'.meters',overrides,seen,false)};
      case 'reps': return {...b,reps:alterBound(b.reps!,path+'.reps',overrides,seen,true)};
    }
  });
}

function configureWorkout(workout:V3Workout,settings:V3ReviewedSettings):V3Workout {
  if (settings.overrides && settings.targetDurationMin !== undefined)
    throw Error('v3_conflicting_recipe_controls');
  let overrides=settings.overrides??{};
  if (settings.targetDurationMin !== undefined) {
    // Fitting cannot change the load-bearing work unless coach explicitly opts in.
    const fit=fitV3Duration(workout,settings.targetDurationMin,{
      swimPaces:settings.swimPacesSecPer100m,toleranceSeconds:0,
      allowWorksetChange:settings.allowWorksetChange===true,
    });
    if(!fit.fitsSlot || fit.computed.status!=='confirmed')
      throw Error('v3_target_duration_unreachable:'+fit.code);
    overrides=fit.overrides;
  }
  const seen=new Set<string>();
  const configured={...workout,blocks:configureBlocks(workout.blocks,overrides,seen)};
  if(seen.size!==Object.keys(overrides).length)
    throw Error('v3_override_unknown_path');
  const result=evaluateV3Workout(configured,{swimPaces:settings.swimPacesSecPer100m});
  if(result.status==='estimated')throw Error('v3_timing_is_only_estimated');
  if(result.status==='unresolved')throw Error('v3_timing_unresolved');
  if(result.seconds===null||!Number.isSafeInteger(result.seconds)||result.seconds<=0||result.seconds%60!==0)
    throw Error('v3_fractional_minute_not_supported');
  return configured;
}

/**
 * Makes all 400 source candidates visible to DET-ENGINE for evaluation.
 * With no athlete-specific reviews, it MUST admit exactly zero sessions.
 */
export function buildDetV3ContractFromCatalogue(reviews:readonly V3ReviewedSettings[]) {
  const auditErrors=auditV3Catalogue(v3FullCatalogue);
  if(auditErrors.length)throw Error('v3_catalogue_audit_failed:'+auditErrors.slice(0,5).join(','));
  if(v3FullCatalogue.workouts.length!==400 ||
      ['bike','run','swim','strength'].some(s=>v3FullCatalogue.workouts.filter(w=>w.sport===s).length!==100))
    throw Error('v3_catalogue_400_distribution_invalid');
  const reviewMap=new Map<string,V3ReviewedSettings>();
  for(const review of reviews) {
    if(reviewMap.has(review.id))throw Error('v3_duplicate_review_id');
    reviewMap.set(review.id,review);
  }
  for(const id of reviewMap.keys())if(!v3FullCatalogue.workouts.some(w=>w.id===id))
    throw Error('v3_unknown_reviewed_recipe:'+id);
  const faulty=new Map<string,string>();
  const qualifiedReviews:DetV3Review[]=[];
  const cards:V3Workout[]=v3FullCatalogue.workouts.map(w=>{
    const settings=reviewMap.get(w.id);
    if(!settings)return w;
    try {
      const configured=configureWorkout(w,settings);
      qualifiedReviews.push(settings);
      return configured;
    }catch(e){
      faulty.set(w.id,String(e));
      return w;
    }
  });
  const {contract,report}=buildDetV3Contract(cards as unknown as V3SourceCard[],qualifiedReviews);
  for(const rejection of report.rejected) {
    const why=faulty.get(rejection.id);
    if(why)rejection.reason=why;
  }
  return {contract,report,auditErrors,sourceCounts:v3FullCatalogue.counts};
}
