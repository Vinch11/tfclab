/**
 * V31 isolated bridge: V3 structured candidates -> true DET-ENGINE
 * ExperimentalAssemblyContract. NO AI, Nolio, Supabase, or production mutation.
 *
 * The source V3 catalogue is supplied explicitly by the caller; the current
 * DET-ENGINE repository does not yet contain the 400 source recipes.
 */
import type { ExperimentalAssemblyContract } from './engine';
import type { RepairWorkoutMetadata } from '../../supabase/functions/_shared/repairSportingEquivalence';
import { isCompleteRepairWorkoutMetadata } from '../../supabase/functions/_shared/repairSportingEquivalence';
import { getDoctrineDomain, type DoctrineDomainId } from '../../src/lib/zones/tfclDoctrine';

type Bound={min:number;base:number;max:number};
type V3Block =
 | {kind:'time';seconds:Bound;domain:DoctrineDomainId|null;label:string;role:string}
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
 swimPacesSecPer100m?:Partial<Record<DoctrineDomainId,number>>;
}
const LEVELS=['untrained','light','trained','highly_trained'];
const FAMILIES:Record<string,RepairWorkoutMetadata['intentFamily']>={
 recovery:'recuperation',moderate_lt1:'endurance_fondamentale',mlss:'seuil',vo2max:'vo2',
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
 if(block.kind==='time')return{seconds:block.seconds.base,zones:zone,text:block.seconds.base+'s '+block.label,estimated:false};
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
   if(!steps.length||steps.some(b=>b.estimated)){refuse('exercise_time_estimated');continue;}
   if(steps.some(b=>b.seconds===null)){refuse('individual_duration_unknown');continue;}
   const seconds=steps.reduce((s,b)=>s+(b.seconds??0),0);
   if(seconds<=0||!Number.isSafeInteger(seconds)||seconds%60!==0){refuse('non_integer_minute_execution');continue;}
   const sport={bike:'bike',run:'run',swim:'swim',strength:'strength'}[card.sport];
   const zones=[...new Set(steps.flatMap(b=>b.zones))];
   const main=card.blocks.filter(b=>b.kind==='repeat'||b.kind!=='repeat'&&b.role==='main').map(b=>evaluate(b,approval));
   const mainZones=[...new Set(main.flatMap(b=>b.zones))];
   const mainZoneMax=Math.max(0,...mainZones.map(z=>Number(z.replace('Z',''))));
   const family=FAMILIES[card.primaryIntent];
   if(!family||!mainZones.length||!sport||card.sport==='strength'){refuse('unsupported_sport_or_intent');continue;}
   const meta:RepairWorkoutMetadata={
    metadataVersion:1,complete:true,id:card.id,sport,title:card.title,objective:card.focus,
    intentFamily:family,goals:[approval.objective],objectiveSpecific:true,
    phases:card.phase,durationMin:[seconds/60,seconds/60],mainZoneMax,specialContext:null,
    prerequisiteKeys:[],necessity:'Optionnel',when:card.phase.join(','),
    avoid:card.contraindications.join(' · '),tags:['v3-deterministic-candidate','individual-coach-approval-recorded'],
    structure:steps.map((step,i)=>i+': '+step.text).join(' | '),zones,variants:{},
   };
   if(!isCompleteRepairWorkoutMetadata(meta)){refuse('invalid_repair_metadata');continue;}
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
 }};
}
