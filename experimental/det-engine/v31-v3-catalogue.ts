/**
 * Read-only, fail-closed ingestion of the COMPLETE 800-recipe V3 candidate
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
import {configureMeasuredStrengthTiming,type VerifiedStrengthTiming} from '../../scripts/library-v3/strengthTimingV3';
import {
  auditV3SportingRegistry,qualifyV3IndividualSportingSource,
  type V3IndividualSportingEvidence,
} from '../../scripts/library-v3/sportingQualification800';
import {resolveV3IntensityTargets, type V3AthleteAnchors, type V3IntensityTarget} from '../../scripts/library-v3/resolveV3Intensity';
import {
  buildDetV3Contract, type DetV3Review, type V3SourceCard,
} from './v31-v3-bridge';
import { composeReviewedV3BaseBricks, type V3BaseBrickReview } from './v31-v3-brick';
import { composeReviewedV32SpecificBricks, type V32SpecificBrickReview } from './v32-v3-specific-bricks';
import { composeReviewedV34EasyRunBricks, type V34SafeBrickReview } from './v34-v3-low-run-bricks';
import type { ExperimentalAssemblyContract } from './engine';

export interface V3ReviewedSettings extends DetV3Review {
  /** Separate expected athlete identity (not inferred from the review itself). */
  expectedAthleteId?:string;
  /** Explicit source-and-athlete sporting qualification evidence. */
  sportingReview?:V3IndividualSportingEvidence;
  /** Original repetitions require individually measured movement + setup time. */
  verifiedStrengthTiming?:VerifiedStrengthTiming;
  /** Measured or explicitly verified athlete anchors: never generated or filled from population defaults. */
  athleteAnchors?: V3AthleteAnchors;
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
      case 'repeat': {
        const rest=b.betweenSecBounds?alterBound(b.betweenSecBounds,path+'.betweenSec',overrides,seen,true):undefined;
        return {...b,count:alterBound(b.count,path+'.count',overrides,seen,true),
          betweenSec:rest?.base??b.betweenSec,betweenSecBounds:rest,
          steps:configureBlocks(b.steps,overrides,seen,path)};
      }
      case 'time': return {...b,seconds:alterBound(b.seconds!,path+'.seconds',overrides,seen,false),
        repsTarget:b.repsTarget?alterBound(b.repsTarget,path+'.repsTarget',overrides,seen,true):undefined};
      case 'distance': return {...b,meters:alterBound(b.meters!,path+'.meters',overrides,seen,false)};
      case 'reps': return {...b,reps:alterBound(b.reps!,path+'.reps',overrides,seen,true)};
    }
  });
}

/** Explicit edits of quality doses are not equivalent to easy volume fitting. */
function requireDoseChangeApproval(workout:V3Workout,overrides:Overrides,allowed:boolean) {
  if(allowed)return;
  const inspect=(blocks:V3Block[],prefix=''):void=>{
    blocks.forEach((b,i)=>{
      const path=prefix?prefix+'.'+i:String(i);
      if(b.kind==='repeat'){
        if(overrides[path+'.betweenSec']!==undefined&&overrides[path+'.betweenSec']!==b.betweenSec)
          throw Error('v3_rest_change_requires_coach_permission:'+path);
        if(overrides[path+'.count']!==undefined&&overrides[path+'.count']!==b.count.base)
          throw Error('v3_workset_change_requires_coach_permission:'+path);
        inspect(b.steps,path);
      }else{
        const key=b.kind==='time'?'seconds':b.kind==='distance'?'meters':'reps';
        if(b.kind==='time'&&b.repsTarget&&overrides[path+'.repsTarget']!==undefined&&
          overrides[path+'.repsTarget']!==b.repsTarget.base)
          throw Error('v3_repetitions_change_requires_coach_permission:'+path);
        const value=overrides[path+'.'+key];
        const bounds=b.kind==='time'?b.seconds!:b.kind==='distance'?b.meters!:b.reps!;
        const easy=b.domain==='recovery'||b.domain==='moderate_lt1';
        if(value!==undefined&&value!==bounds.base&&!easy)
          throw Error('v3_intense_dose_change_requires_coach_permission:'+path);
      }
    });
  };
  inspect(workout.blocks);
}

function normalizedSwimPaces(settings:V3ReviewedSettings) {
  const old=settings.swimPacesSecPer100m??{};
  const supplied=settings.athleteAnchors?.swimDomainPacesSecPer100m??{};
  for(const key of Object.keys(old) as Array<keyof typeof old>) {
    if(supplied[key]!==undefined && old[key]!==supplied[key])
      throw Error('v3_conflicting_swim_pace:'+key);
  }
  const merged={...old,...supplied};
  if(settings.athleteAnchors?.coachConfirmsCssAsMlssProxy===true &&
     typeof settings.athleteAnchors.cssSecPer100m==='number' && merged.mlss===undefined)
    merged.mlss=settings.athleteAnchors.cssSecPer100m;
  return merged;
}
function measuredAnchorInputs(settings:V3ReviewedSettings):V3AthleteAnchors {
  // CSS-derived MLSS may be used for duration but must remain a *proxy* in evidence.
  // Only genuine directly supplied domain paces are presented as direct measurements.
  return {...(settings.athleteAnchors??{}),swimDomainPacesSecPer100m:{
    ...(settings.swimPacesSecPer100m??{}),
    ...(settings.athleteAnchors?.swimDomainPacesSecPer100m??{}),
  }};
}
function verifiedTargetsText(targets:readonly V3IntensityTarget[]):string {
  return targets.map(t=>t.metric==='coach_rpe_load'?
    'Force: charge/RPE individuels confirmés par le coach':
    [t.domain,t.min===null?'':String(t.min),t.max===null?'open':String(t.max),t.metric,
     'source='+t.source,'confiance='+t.confidence].join(' ')).join(' ; ');
}
function configureWorkout(workout:V3Workout,settings:V3ReviewedSettings):V3Workout {
  const swimPaces=normalizedSwimPaces(settings);
  if(settings.verifiedStrengthTiming&&settings.overrides&&Object.keys(settings.overrides).length)
    throw Error('v3_strength_repetitions_changed_without_remeasurement');
  const dosing= settings.verifiedStrengthTiming?
    configureMeasuredStrengthTiming(workout,settings.verifiedStrengthTiming).workout:workout;
  // Alactic 25m only when the athlete's own neuromuscular pace proves
  // an effort no longer than 20 seconds, never inferred from pool distance.
  if(workout.id==='V3P_SWIM_083'){
    const pace=swimPaces.neuromuscular;
    if(typeof pace!=='number'||!Number.isFinite(pace)||pace<=0||25*pace/100>20)
      throw Error('v3_sprint_25m_duration_over_20s_or_unmeasured');
    const repeat=workout.blocks.find(b=>b.kind==='repeat'&&b.steps.some(step=>
      step.kind==='distance'&&step.domain==='neuromuscular'));
    if(!repeat||repeat.kind!=='repeat'||repeat.betweenSec<90)
      throw Error('v3_sprint_25m_recovery_not_sufficient');
  }
  if (settings.overrides && settings.targetDurationMin !== undefined)
    throw Error('v3_conflicting_recipe_controls');
  let overrides=settings.overrides??{};
  if (settings.targetDurationMin !== undefined) {
    // Fitting cannot change the load-bearing work unless coach explicitly opts in.
    const fit=fitV3Duration(dosing,settings.targetDurationMin,{
      swimPaces,toleranceSeconds:0,
      allowWorksetChange:settings.allowWorksetChange===true,
    });
    if(!fit.fitsSlot || fit.computed.status!=='confirmed')
      throw Error('v3_target_duration_unreachable:'+fit.code);
    overrides=fit.overrides;
  }
  requireDoseChangeApproval(dosing,overrides,settings.allowWorksetChange===true);
  const seen=new Set<string>();
  const configured={...dosing,blocks:configureBlocks(dosing.blocks,overrides,seen)};
  if(seen.size!==Object.keys(overrides).length)
    throw Error('v3_override_unknown_path');
  const result=evaluateV3Workout(configured,{swimPaces});
  if(result.status==='estimated')throw Error('v3_timing_is_only_estimated');
  if(result.status==='unresolved')throw Error('v3_timing_unresolved');
  if(result.seconds===null||!Number.isSafeInteger(result.seconds)||result.seconds<=0||result.seconds%60!==0)
    throw Error('v3_fractional_minute_not_supported');
  // No athlete-specific physiological dose may be inferred from a slot duration.
  const resolved=resolveV3IntensityTargets(configured,measuredAnchorInputs(settings));
  if(resolved.status!=='resolved')throw Error('v3_intensity_anchor_missing:'+resolved.missing.join(','));
  return configured;
}

/**
 * Makes all 800 source candidates visible to DET-ENGINE for evaluation.
 * With no athlete-specific reviews, it MUST admit exactly zero sessions.
 */
export function buildDetV3ContractFromCatalogue(
  reviews:readonly V3ReviewedSettings[],brickReviews:readonly V3BaseBrickReview[]=[],
  specificBrickReviews:readonly V32SpecificBrickReview[]=[],
  lowRunBrickReviews:readonly V34SafeBrickReview[]=[]
) {
  const auditErrors=[...auditV3Catalogue(v3FullCatalogue),...auditV3SportingRegistry()];
  if(auditErrors.length)throw Error('v3_catalogue_audit_failed:'+auditErrors.slice(0,5).join(','));
  if(v3FullCatalogue.workouts.length!==800 ||
      ['bike','run','swim','strength'].some(s=>v3FullCatalogue.workouts.filter(w=>w.sport===s).length!==200))
    throw Error('v3_catalogue_800_distribution_invalid');
  const reviewMap=new Map<string,V3ReviewedSettings>();
  for(const review of reviews) {
    if(reviewMap.has(review.id))throw Error('v3_duplicate_review_id');
    reviewMap.set(review.id,review);
  }
  for(const id of reviewMap.keys())if(!v3FullCatalogue.workouts.some(w=>w.id===id))
    throw Error('v3_unknown_reviewed_recipe:'+id);
  const faulty=new Map<string,string>();
  const resolvedIntensityTexts=new Map<string,string>();
  const qualifiedReviews:DetV3Review[]=[];
  const cards:V3Workout[]=v3FullCatalogue.workouts.map(w=>{
    const settings=reviewMap.get(w.id);
    if(!settings)return w;
    try {
      const sporting=qualifyV3IndividualSportingSource(w,settings.sportingReview,settings.expectedAthleteId);
      if(!sporting.allowedToSubmitToDet)
        throw Error('v3_sporting_gate_refused:'+sporting.blockingReasons.join(';'));
      const configured=configureWorkout(w,settings);
      const checked=resolveV3IntensityTargets(configured,measuredAnchorInputs(settings));
      if(checked.status!=='resolved')throw Error('v3_intensity_anchor_missing:'+checked.missing.join(','));
      resolvedIntensityTexts.set(w.id,verifiedTargetsText(checked.targets));
      qualifiedReviews.push({...settings,swimPacesSecPer100m:normalizedSwimPaces(settings),
        ...(w.sport==='strength'&&settings.athleteAnchors?.coachValidatedStrengthLoadAndRpe===true?
          {verifiedStrengthLoadAndRpe:true as const}:{}),
      });
      return configured;
    }catch(e){
      faulty.set(w.id,String(e));
      return w;
    }
  });
  const {contract:sourceContract,report}=buildDetV3Contract(cards as unknown as V3SourceCard[],qualifiedReviews);
  for(const admitted of report.accepted){
    const intensity=resolvedIntensityTexts.get(admitted.id);
    if(!intensity)throw Error('v3_resolved_intensity_proof_missing:'+admitted.id);
    admitted.structure+=' | CIBLES INDIVIDUALISÉES: '+intensity;
    admitted.tags.push('v3-intensity-anchors-individually-verified');
    admitted.tags.push('v3-sporting-source-individually-reviewed-candidate');
  }
  for(const rejection of report.rejected) {
    const why=faulty.get(rejection.id);
    if(why)rejection.reason=why;
  }
  const brickReport=composeReviewedV3BaseBricks(report.accepted,brickReviews);
  const specificBrickReport=composeReviewedV32SpecificBricks(report.accepted,specificBrickReviews);
  const lowRunBrickReport=composeReviewedV34EasyRunBricks(report.accepted,lowRunBrickReviews);
  const allBricks=[...brickReport.accepted,...specificBrickReport.accepted,...lowRunBrickReport.accepted];
  const brickById=new Map(allBricks.map(card=>[card.id,card]));
  const preferredBrickIds=new Set<string>([...brickReviews,...specificBrickReviews,...lowRunBrickReviews]
    .filter(review=>review.preferReviewedV3===true && brickById.has(review.id))
    .map(review=>review.id));
  const lowRunPreferred=new Set<string>(lowRunBrickReviews.filter(r=>r.preferReviewedV3===true &&
    lowRunBrickReport.accepted.some(m=>m.id===r.id)).map(r=>r.id));
  const contract:ExperimentalAssemblyContract={
    ...sourceContract,
    verifiedBrickCompositions:allBricks,
    adapt(preparation,config){
      sourceContract.adapt(preparation,config);
      if(!allBricks.length)return;
      for(const phase of Object.keys(preparation.phaseRepairCatalogs)){
        preparation.phaseRepairCatalogs[phase]=[
          ...(preparation.phaseRepairCatalogs[phase]??[]),
          ...allBricks.filter(card=>card.phases.includes(phase)),
        ];
      }
      for(const rows of [preparation.chunkRepairCatalogs,preparation.chunkRegenRepairCatalogs])
        rows.forEach((row,i)=>{rows[i]=[...row,...allBricks];});
    },
    filterCandidate(card,ctx){
      const brick=brickById.get(card.id);
      if(brick){
        if(!brick.phases.includes(ctx.phase??''))return false;
        // A short, entirely easy brick must not masquerade as an intensity key.
        if(ctx.slot.isKeySession && !ctx.slot.isLongSession && brick.mainZoneMax<3)return false;
        // Composite bricks require a genuine loading week, never a nominal
        // taper, race, or recovery week even if the phase metadata is stale.
        if(ctx.weekType!=='load')return false;
      }
      return sourceContract.filterCandidate?.(card,ctx)??true;
    },
    doseRange(card,ctx){
      const brick=brickById.get(card.id);
      return brick?brick.durationMin:(sourceContract.doseRange?.(card,ctx)??card.durationMin);
    },
    rankCandidate(card,ctx){
      if(lowRunPreferred.has(card.id))return -2;
      if(preferredBrickIds.has(card.id))return -1;
      return sourceContract.rankCandidate?.(card,ctx)??0;
    },
    consumedSourceIds(card){
      if(report.accepted.some(source=>source.id===card.id))return [card.id];
      const reviewed=brickById.get(card.id);
      if(!reviewed)return [];
      return [...new Set(reviewed.tags.flatMap(tag=>{
        const value=tag.startsWith('bike-source:')?tag.slice('bike-source:'.length):
          tag.startsWith('run-source:')?tag.slice('run-source:'.length):tag;
        return /^V3P_(BIKE|RUN)_\d{3}$/.test(value)?[value]:[];
      }))];
    },
    sourceRecoveryForId(id){
      const meta=report.accepted.find(m=>m.id===id)||brickById.get(id);
      if(!meta)return [];
      const used=contract.consumedSourceIds?.(meta)??[];
      return used.map(sourceId=>{
        const source=v3FullCatalogue.workouts.find(w=>w.id===sourceId);
        if(!source||!Number.isFinite(source.minimumRecoveryHours)||source.minimumRecoveryHours<0)
          throw Error('v3_source_recovery_hours_untrusted:'+sourceId);
        return {sourceId,sport:source.sport,hours:source.minimumRecoveryHours};
      });
    },
  };
  return {contract,report,brickReport,specificBrickReport,lowRunBrickReport,allBricks,auditErrors,sourceCounts:v3FullCatalogue.counts};
}
