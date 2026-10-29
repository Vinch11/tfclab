import {originalCard,targetedTiming} from './v14-sources';
import {sourceContext} from './v13-source-context';
import {assessExecutionV27} from './v27-execution';
import {revalidateV22Reservation} from './v22-prescription';
import {validateFourWeekScopeV23} from './v23-scope';
import {historicalWitnessAdditionsV24} from './v24-placement';
import {digest} from './v9-prospective';

/** One bounded source search, same duration/day/essential role. No automatic substitution. */
export function searchExecutionAlternativesV27(result:any,v:any,spec:any,canonical:Map<string,any>,executions:any[]){
 const pin=digest(result),searches:any[]=[],trials:any[]=[];
 for(const w of result.calendar.weeks)for(const s of w.slots){
  const current=executions.find((e:any)=>e.slotKey===s.key);if(current.technicallyExecutable)continue;
  const original=canonical.get(s.card.id),cat=original.originalCanonical.prescription.category;
  const candidates=[...canonical.values()].filter(c=>c.originalCanonical.prescription.discipline===s.role.sport&&c.legacyId!==s.card.id&&c.originalCanonical.prescription.category===cat);
  const offers=candidates.map(c=>{
   const card=originalCard(c.legacyId),raw=c.originalCanonical.original.effective,main=raw.structure.filter((p:any)=>/main/i.test(p.part));
   const roleCompatible=s.role.kind==='long'?main.some((p:any)=>p.zones.includes('Z2')&&!/\d+\s*[x×]|\br\s*=/i.test(p.text))&&card.mainZoneMax<=2:true;
   const reasons:string[]=[];if(!roleCompatible)reasons.push('autonomous_long_aerobic_role_not_demonstrated');
   if(w.slots.some((x:any)=>x.card.id===c.legacyId))reasons.push('source_already_in_week');
   if(!sourceContext(card,v.profile,w.week,s.day,w.type).compatible)reasons.push('original_source_context_incompatible');
   if(s.minutes<s.role.floor)reasons.push('native_planning_floor_not_met_no_new_waiver');
   if(s.minutes<c.originalCanonical.prescription.durationMinutes[0]||s.minutes>c.originalCanonical.prescription.durationMinutes[1])reasons.push('source_duration_band_incompatible');
   const candidateSlot={...structuredClone(s),card,timing:targetedTiming(card)},decision={...result.decisions.find((d:any)=>d.slotKey===s.key),sourceId:c.legacyId};
   const assessment=assessExecutionV27(candidateSlot,decision,w,v,spec,c);
   if(!assessment.technicallyExecutable)reasons.push(...assessment.categories.map((x:string)=>'execution_category_'+x),...assessment.intensity.reasons,...(assessment.variant.compatible!==true?[assessment.variant.reason]:[]));
   return{sourceId:c.legacyId,sourceHash:digest(card),roleCompatible,minutesUnchanged:s.minutes,dayUnchanged:s.day,reasons:[...new Set(reasons)],executionFlags:assessment.flags,technicallyCandidate:reasons.length===0};
  });
  const eligible=offers.filter((o:any)=>o.technicallyCandidate);
  searches.push({slotKey:s.key,sourceId:s.card.id,week:w.week,scannedCanonicalRecords:canonical.size,sameSportAndCategoryCandidates:candidates.length,offers,eligibleSourceIds:eligible.map((o:any)=>o.sourceId),automaticSelection:false});
  // Lexical order bounds evaluation only. It is not a ranking or a sporting choice.
  for(const offer of [...eligible].sort((a,b)=>a.sourceId.localeCompare(b.sourceId))){
   if(trials.length>=3)break;
   const trial=structuredClone(result),slot=trial.calendar.weeks[w.week-1].slots.find((x:any)=>x.key===s.key),card=originalCard(offer.sourceId),record=canonical.get(offer.sourceId);
   slot.card=card;slot.timing=targetedTiming(card);slot.input.conditions.push({id:'v27_alternative_source_review',kind:'prerequisite',beforeWeek:w.week,requiredEvidence:['new source-specific tolerance, restrictions, exact intensity and whole microcycle reviewed'],fallback:'keep the separate original reservation/refusal; no automatic substitution'});
   const stored=trial.calendar.calendar.weeks[w.week-1].sessions.find((x:any)=>x.catalogId===s.card.id);stored.catalogId=card.id;stored.title=card.title;stored.details=card.structure;stored.zones=card.zones;
   const d=trial.decisions.find((x:any)=>x.slotKey===s.key);d.sourceId=card.id;d.sourceInstructionsUnchanged=record.originalCanonical.original.effective.structure;d.individualPrescriptionApproved=false;
   revalidateV22Reservation(trial,v.profile);const scope=validateFourWeekScopeV23(trial,v.profile),newIssues=historicalWitnessAdditionsV24(result,trial);
   trials.push({slotKey:s.key,newSourceId:card.id,result:trial,scope,newHistoricalIssues:newIssues,coachProposalOnly:true,automaticallyApplied:false,individualPrescriptionApproved:false});
  }
 }
 if(digest(result)!==pin)throw Error('V27_ALTERNATIVE_SEARCH_MUTATED_CALENDAR');
 return{version:'det-v27-execution-alternative-search-1',searches,trials,trialLimit:3,noMassPermutations:true,originalCalendarHash:pin,automaticallyApplied:0,individualApprovals:0};
}
