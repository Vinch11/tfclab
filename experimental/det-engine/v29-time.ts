import {digest} from './v9-prospective';

export const isExactSecondV29=(x:any)=>Number.isSafeInteger(x)&&x>=0;
export function minuteEnvelopeV29(minutes:any):number|null{return Number.isSafeInteger(minutes)&&minutes>=0&&Number.isSafeInteger(minutes*60)?minutes*60:null;}
export function sumSecondsV29(values:any[]):number|null{let total=0;for(const value of values){if(!isExactSecondV29(value)||!Number.isSafeInteger(total+value))return null;total+=value;}return total;}

/** Integer seconds only. Included children annotate an additive parent; they never add time twice. */
export function exactLedgerV29(sourceEvents:any[],declaredTotal:any,identity:string){
 const errors:string[]=[],events:any[]=[],ids=new Set<string>();let cursor=0;
 if(!Array.isArray(sourceEvents))return{valid:false,errors:['events_array_required'],timelineEvents:[],contributionSumSeconds:null,executionDurationSeconds:null};
 const complete=isExactSecondV29(declaredTotal);
 for(let index=0;index<sourceEvents.length;index++){
  const e=sourceEvents[index],included=e?.accounting==='included',seconds=e?.seconds;
  if(!isExactSecondV29(seconds)){errors.push('event_integer_seconds_required:'+index);continue;}
  if(e.accounting!==undefined&&!['included','additive'].includes(e.accounting)){errors.push('unknown_event_accounting:'+index);continue;}
  const eventId=identity+':'+index+':'+digest(e),parent=included?events.find(p=>p.occurrenceIndex===e.parentIndex):null;
  if(ids.has(eventId)){errors.push('duplicate_event_identity:'+index);continue;}ids.add(eventId);
  let start:number|null=complete?cursor:null;
  if(included){
   if(!parent||parent.accounting!=='additive'||!isExactSecondV29(e.offsetSeconds)||!Number.isSafeInteger(e.offsetSeconds+seconds)||e.offsetSeconds+seconds>parent.durationSeconds){errors.push('invalid_included_parent_or_bounds:'+index);continue;}
   start=parent.relativeStartSeconds===null?null:parent.relativeStartSeconds+e.offsetSeconds;
   const siblings=events.filter(x=>x.accounting==='included'&&x.parentEventId===parent.eventId);
   if(siblings.some(x=>e.offsetSeconds<x.offsetSeconds+x.durationSeconds&&x.offsetSeconds<e.offsetSeconds+seconds))errors.push('undocumented_included_component_overlap:'+index);
  }else{
   const next=sumSecondsV29([cursor,seconds]);if(next===null){errors.push('integer_time_overflow');continue;}cursor=next;
  }
  events.push({eventId,occurrenceIndex:index,accounting:included?'included':'additive',durationSeconds:seconds,relativeStartSeconds:start,parentEventId:parent?.eventId??null,offsetSeconds:included?e.offsetSeconds:null,originalEvent:structuredClone(e)});
 }
 if(!complete)errors.push('execution_duration_unresolved_or_not_integer');
 if(complete&&cursor!==declaredTotal)errors.push('event_sum_differs_from_declared_execution');
 if(!sourceEvents.length&&declaredTotal!==0)errors.push('empty_complete_timeline_not_allowed');
 return{valid:errors.length===0,errors,timelineEvents:events,contributionSumSeconds:cursor,executionDurationSeconds:complete?declaredTotal:null};
}

/** Verify a transported ledger against its authoritative ordered event sequence, not just a supplied hash. */
export function verifyExactLedgerV29(ledger:any,expectedEvents:any[],expectedTotal:any,identity:string){
 const recomputed=exactLedgerV29(expectedEvents,expectedTotal,identity);
 const ids=(ledger?.timelineEvents??[]).map((e:any)=>e.eventId),duplicate=ids.length!==new Set(ids).size;
 return{valid:recomputed.valid&&!duplicate&&digest(ledger)===digest(recomputed),duplicateEventIds:duplicate,expected:recomputed};
}

export function slotAccountingV29(executionSeconds:any,reservedSeconds:any,semantics:'legacy_exact'|'synthetic_upper_bound'){
 const known=isExactSecondV29(executionSeconds)&&isExactSecondV29(reservedSeconds)&&['legacy_exact','synthetic_upper_bound'].includes(semantics),delta=known?reservedSeconds-executionSeconds:null;
 return{executionDurationSeconds:isExactSecondV29(executionSeconds)?executionSeconds:null,reservedSlotSeconds:isExactSecondV29(reservedSeconds)?reservedSeconds:null,
  unallocatedSlotSeconds:known?(delta!>=0?delta:0):null,overrunSlotSeconds:known?(delta!<0?-delta!:0):null,
  compatible:known?(semantics==='legacy_exact'?delta===0:delta!>=0):null,
  marginIsTraining:false,semantics,slackAddedToEvents:false};
}
