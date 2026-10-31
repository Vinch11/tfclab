/**
 * V31 isolated bridge: V3 structured candidates -> true DET-ENGINE
 * ExperimentalAssemblyContract. NO AI, Nolio, Supabase, or production mutation.
 *
 * The source V3 catalogue is supplied explicitly by the caller; the V31
 * catalogue loader imports the 400 source recipes from the isolated V3 branch.
 */
import type { ExperimentalAssemblyContract } from './engine';
import type { RepairWorkoutMetadata } from '../../supabase/functions/_shared/repairSportingEquivalence';
import { isCompleteRepairWorkoutMetadata, normalizeRepairGoal } from '../../supabase/functions/_shared/repairSportingEquivalence';
import { getDoctrineDomain, type DoctrineDomainId } from '../../src/lib/zones/tfclDoctrine';

type Bound={min:number;base:number;max:number};
type V3Block =
 | {kind:'time';seconds:Bound;domain:DoctrineDomainId|null;label:string;role:string;repsTarget?:Bound;rpeRange?:{min:number;max:number}}
 | {kind:'distance';meters:Bound;domain:DoctrineDomainId|null;label:string;role:string}
 | {kind:'reps';reps:Bound;secPerRep:number;sides:number;domain:null;label:string;role:string}
 | {kind:'repeat';count:Bound;betweenSec:number;label:string;steps:V3Block[]};
export interface V3SourceCard {
 id:string; sport:'bike'|'run'|'swim'|'strength';
 title:string;focus:string;primaryIntent:string;primaryDomain:DoctrineDomainId|null;
 phase:string[]; minimumLevel:'untrained'|'light'|'trained'|'highly_trained';
 prerequisites:string[];contraindications:string[];blocks:V3Block[];
 status:'candidate';automaticSelection:false;
 evidence:{sessionSpecificValidation:false;referenceIds:string[]};
}
export interface DetV3Review {
 id:string; athleteLevel:'untrained'|'light'|'trained'|'highly_trained';
 athleteLevelSource:'manual';
 objective:string;allPrerequisitesChecked:true;
 /** Explicitly reviewed against the individual athlete; not scientific validation. */
 individualCoachApproval:true;
 /** Distinct from permission to use: explicit preference in otherwise tied choices. */
 preferReviewedV3?:true;
 /** Strength timebox requires explicit coach-verified load/RPE, never an inferred aerobic zone. */
 verifiedStrengthLoadAndRpe?:true;
 swimPacesSecPer100m?:Partial<Record<DoctrineDomainId,number>>;
}
const LEVELS=['untrained','light','trained','highly_trained'];
const FAMILIES:Record<string,RepairWorkoutMetadata['intentFamily']>={
 recovery:'recuperation',moderate_lt1:'endurance_fondamentale',sub_threshold:'seuil',mlss:'seuil',vo2max:'vo2',
 mixed_intensity:'mixed_intensity',
 neuromuscular:'sprint',max_strength:'force',strength_endurance:'force',
 technique_economy:'technique',mobility_prevention:'technique',
 race_specific:'race_pace',mixed_specific:'brick',fatmax:'fatmax',test:'test',
};
export interface DetV3ImportReport {
 sourceCount:number;accepted:RepairWorkoutMetadata[];rejected:{id:string;reason:string}[];
}
function validBound(b:Bound):boolean{
 return !!b&&[b.min,b.base,b.max].every(Number.isFinite)&&b.min>0&&b.min<=b.base&&b.base<=b.max;
}
function evaluate(block:V3Block,review:DetV3Review):{seconds:number|null;zones:string[];text:string;estimated:boolean} {
 if(block.kind==='repeat'){
  if(!validBound(block.count)||!Number.isInteger(block.count.base)||!Number.isSafeInteger(block.betweenSec)||block.betweenSec<0||!block.steps.length)
   throw Error('v3_invalid_repetition_structure');
  const values=block.steps.map(b=>evaluate(b,review)),unknown=values.some(x=>x.seconds===null);
  return{seconds:unknown?null:block.count.base*values.reduce((s,x)=>s+(x.seconds??0),0)+(block.count.base-1)*block.betweenSec,
   zones:[...new Set(values.flatMap(x=>x.zones))],text:block.count.base+'×('+values.map(x=>x.text).join(' + ')+') ; récup interrépétitions '+block.betweenSec+'s',
   estimated:values.some(x=>x.estimated)};
 }
 const bound=block.kind==='time'?block.seconds:block.kind==='distance'?block.meters:block.reps;
 if(!validBound(bound)||!block.label)throw Error('v3_invalid_work_block');
 const zone=block.domain?[getDoctrineDomain(block.domain).zone]:[];
 if(block.kind==='time') {
   const t=block;
   if(t.repsTarget && (!validBound(t.repsTarget) || ![t.repsTarget.min,t.repsTarget.base,t.repsTarget.max].every(Number.isInteger)))
     throw Error('v3_invalid_timebox_rep_range');
   if(t.rpeRange && (!Number.isFinite(t.rpeRange.min)||!Number.isFinite(t.rpeRange.max)||
       t.rpeRange.min<1||t.rpeRange.max>10||t.rpeRange.min>t.rpeRange.max))
     throw Error('v3_invalid_timebox_rpe');
   const instruction=t.repsTarget? ' ; répétitions cibles '+t.repsTarget.base+
     ' ['+t.repsTarget.min+'..'+t.repsTarget.max+'] ; RPE '+
     (t.rpeRange?t.rpeRange.min+'..'+t.rpeRange.max:'à vérifier'):'';
   return{seconds:t.seconds.base,zones:zone,
     text:t.seconds.base+'s '+t.label+instruction,estimated:false};
 }
 if(block.kind==='reps')return{seconds:null,zones:[],text:block.reps.base+' répétitions '+block.label+' (durée inconnue)',estimated:true};
 if(!block.domain)throw Error('v3_distance_missing_domain');
 const pace=review.swimPacesSecPer100m?.[block.domain];
 if(typeof pace!=="number"||!Number.isFinite(pace)||pace<=0)return{seconds:null,zones:zone,text:block.meters.base+'m '+block.label+' (allure inconnue)',estimated:false};
 return{seconds:block.meters.base*pace/100,zones:zone,text:block.meters.base+'m '+block.label,estimated:false};
}
export function ingestV3ForDeterministicEngine(cards:readonly V3SourceCard[],review:readonly DetV3Review[]):DetV3ImportReport {
 const accepted:RepairWorkoutMetadata[]=[],rejected:DetV3ImportReport['rejected']=[];
 const reviewed=new Map<string,DetV3Review>();for(const r of review){if(reviewed.has(r.id))throw Error('v3_duplicate_review_id');reviewed.set(r.id,r);}
 const seen=new Set<string>();
 for(const card of cards){
  const refuse=(reason:string)=>rejected.push({id:card.id,reason});
  if(seen.has(card.id)){refuse('duplicate_source_id');continue;}seen.add(card.id);
  const approval=reviewed.get(card.id);
  if(!approval){refuse('individual_coach_review_missing');continue;}
  if(!/^V3P_(BIKE|RUN|SWIM|STRENGTH)_\d{3}$/.test(card.id)||card.status!=='candidate'||card.automaticSelection!==false ||
      card.evidence?.sessionSpecificValidation!==false||!card.evidence?.referenceIds?.length){refuse('source_contract_untrusted');continue;}
  if(approval.athleteLevelSource!=='manual'||approval.allPrerequisitesChecked!==true||approval.individualCoachApproval!==true||
      LEVELS.indexOf(approval.athleteLevel)<LEVELS.indexOf(card.minimumLevel)||!approval.objective){
   refuse('individual_level_or_prerequisites_not_verified');continue;
  }
  try {
   const steps=card.blocks.map(b=>evaluate(b,approval));
   // A strength session is scheduled by its weekly frequency when the
   // source has no individually measured execution/transition times.
   // The metadata [0,0] below is ONLY a count-mode protocol marker; it
   // must never be interpreted as a zero-minute performed workout.
   const hasTimedStrengthProtocol=card.blocks.some(b=>b.kind==='repeat'&&b.steps.some(
     step=>step.kind==='time'&&!!step.repsTarget&&!!step.rpeRange));
   const countOnlyStrength=card.sport==='strength'&&!hasTimedStrengthProtocol;
   if(!steps.length||(steps.some(b=>b.estimated)&&!countOnlyStrength)){
     refuse('exercise_time_estimated');continue;
   }
   if(steps.some(b=>b.seconds===null)&&!countOnlyStrength){refuse('individual_duration_unknown');continue;}
   const seconds=steps.reduce((s,b)=>s+(b.seconds??0),0);
   if(!countOnlyStrength&&(!Number.isFinite(seconds)||seconds<=0||seconds>24*60*60)){
     refuse('invalid_or_unbounded_exact_duration');continue;
   }
   const sport={bike:'bike',run:'run',swim:'swim',strength:'strength'}[card.sport];
   // Warm-up blocks in historical strength may carry a "recovery" domain;
   // do NOT convert that into an aerobic Z1 prescription for strength.
   const zones=card.sport==='strength'?[]:[...new Set(steps.flatMap(b=>b.zones))];
   const main=card.blocks.filter(b=>b.kind==='repeat'||b.role==='main').map(b=>evaluate(b,approval));
   const mainZones=card.sport==='strength'?[]:[...new Set(main.flatMap(b=>b.zones))];
   const mainZoneMax=Math.max(0,...mainZones.map(z=>Number(z.replace('Z',''))));
   const family=FAMILIES[card.primaryIntent];
   const normalizedGoal=normalizeRepairGoal(approval.objective);
   if(!normalizedGoal){refuse('unknown_race_objective');continue;}
   // A race-specific anchor is NOT a generic interchangeable race pace.
   // Distinguish an IM pacing source from a 70.3 prescription, and vice versa.
   if(card.primaryIntent==='race_specific' &&
      ((card.primaryDomain==='im_pace' && normalizedGoal!=='ironman') ||
       (card.primaryDomain==='703_pace' && normalizedGoal!=='half') ||
       (card.primaryDomain==='marathon_pace' && !['marathon','ironman'].includes(normalizedGoal)) ||
       (card.primaryDomain==='semi_pace' && normalizedGoal!=='semi'))){
    refuse('race_specific_anchor_incompatible_with_objective');continue;
   }
   const strengthMain=card.sport==='strength' && card.primaryDomain===null &&
     card.blocks.some(b=>b.kind==='repeat'&&b.steps.some(step=>
       step.kind==='time'&&!!step.repsTarget&&!!step.rpeRange ||
       countOnlyStrength&&(step.kind==='time'||step.kind==='reps')&&step.role==='main'));
   if(card.sport==='strength' && (!strengthMain||approval.verifiedStrengthLoadAndRpe!==true)){
     refuse('strength_timebox_or_coach_load_verification_missing');continue;
   }
   if(card.primaryIntent==='mixed_intensity'){
     // Independently prove two distinct MAIN domains; not an arbitrary alias
     // for VO2, MLSS or a post hoc composite. Full source sport audit precedes
     // this converter in the 800-source catalogue.
     const mainDomains=new Set<string>();
     const collectMain=(blocks:V3Block[]):void=>{for(const b of blocks){
       if(b.kind==='repeat')collectMain(b.steps);
       else if(b.role==='main'&&b.domain)mainDomains.add(b.domain);
     }};
     collectMain(card.blocks);
     if(mainDomains.size<2){refuse('mixed_stimulus_requires_two_main_domains');continue;}
   }
   if(!family||(!mainZones.length&&card.sport!=='strength')||!sport){
     refuse('unsupported_sport_or_intent');continue;
   }
   const meta:RepairWorkoutMetadata={
    metadataVersion:1,complete:true,id:card.id,sport,title:card.title,objective:card.focus,
    intentFamily:family,goals:[normalizedGoal],objectiveSpecific:true,
    phases:card.phase,durationMin:countOnlyStrength?[0,0]:[seconds/60,seconds/60],
    mainZoneMax,specialContext:null,
    prerequisiteKeys:[],necessity:'Optionnel',when:card.phase.join(','),
    avoid:card.contraindications.join(' · '),tags:['v3-deterministic-candidate','individual-coach-approval-recorded'],
    structure:steps.map((step,i)=>i+': '+step.text).join(' | '),zones,variants:{},
   };
   if(!isCompleteRepairWorkoutMetadata(meta)){refuse('invalid_repair_metadata');continue;}
   meta.tags.push('v3-primary-intent:'+card.primaryIntent);
   meta.tags.push('v3-primary-domain:'+(card.primaryDomain??'nonmetabolic'));
   if(card.primaryIntent==='sub_threshold')meta.tags.push('v3-subthreshold-not-equivalent-to-mlss');
   if(card.sport==='strength')meta.tags.push('v3-strength-timebox-no-fabricated-aerobic-zone');
   if(!countOnlyStrength){
     meta.tags.push('v3-exact-duration-seconds:'+String(seconds));
     meta.structure+=' | DURÉE CALCULÉE : '+String(seconds)+' secondes exactes (sans arrondi)';
     if(seconds%60!==0)meta.tags.push('v3-subminute-duration-no-rounding');
   }
   if(card.primaryIntent==='mixed_intensity')
     meta.tags.push('v3-mixed-stimulus-distinct-main-domains');
   if(countOnlyStrength){
     meta.tags.push('v3-strength-frequency-only-unknown-duration');
     meta.structure+=' | FRÉQUENCE UNIQUEMENT : durée non mesurée, aucune minute déduite';
   }
   accepted.push(meta);
  } catch(e){refuse('invalid_structure_or_domain:'+String(e));}
 }
 return{sourceCount:cards.length,accepted,rejected};
}
/** Uses DET-ENGINE's existing experimentalContract hook before prevalidation.
 * It cannot turn a draft plan into a publishable plan. */
export function buildDetV3Contract(cards:readonly V3SourceCard[],reviews:readonly DetV3Review[]):{
 contract:ExperimentalAssemblyContract;report:DetV3ImportReport
} {
 const report=ingestV3ForDeterministicEngine(cards,reviews);
 const approved=new Map(report.accepted.map(card=>[card.id,card]));
 const preferred=new Set(reviews.filter(r=>r.preferReviewedV3===true && approved.has(r.id)).map(r=>r.id));
 return{report,contract:{
  id:'det-v31-v3-individual-coach-review',
  adapt(preparation) {
   for(const k of Object.keys(preparation.phaseRepairCatalogs)) {
    const existing=preparation.phaseRepairCatalogs[k]??[];
    preparation.phaseRepairCatalogs[k]=[...existing,...report.accepted.filter(m=>m.phases.includes(k))];
   }
   for(const rows of [preparation.chunkRepairCatalogs,preparation.chunkRegenRepairCatalogs])
    rows.forEach((row,i)=>{rows[i]=[...row,...report.accepted];});
  },
  filterCandidate(card,ctx){
   if(!approved.has(card.id))return true; // Preserve native catalog and its rules.
   const entry=approved.get(card.id)!;
   return entry.phases.includes(ctx.phase??'') &&
      entry.durationMin[0]>=0 && entry.durationMin[0]<=entry.durationMin[1];
  },
  doseRange(card){return approved.has(card.id)?approved.get(card.id)!.durationMin:card.durationMin;},
  rankCandidate(card,ctx){
   if(!preferred.has(card.id))return 0;
   // Do not prefer an easy recovery card for a non-long key intensity slot.
   if(ctx.slot.isKeySession && !ctx.slot.isLongSession && card.mainZoneMax<3)return 0;
   // Coach-reviewed V3 cards are tie-break candidates, never eligibility waivers.
   return -1;
  },
 }};
}
