import {nolioTextFixture} from './v18-outputs.mjs';
import {editorialTextFixture,editorialStructuredFixture} from './v19-outputs.mjs';
import {digest} from './v9-prospective';

/** Source coach text is retained; this is an offline encoding dossier, never a sender. */
export function renderV26Session(s:any,d:any,record:any,binding:any[]){
 const physiologicalGoals=binding.length?binding.map((b:any)=>b.adaptation):[s.role.purpose];
 return{slotKey:s.key,week:s.week,day:s.day,title:s.card.title,sport:s.role.sport,sourceId:s.card.id,sourceHash:digest(s.card),minutes:s.minutes,
  originalStructure:record?.originalCanonical.original.effective.structure??s.timing.allDeclaredParts,
  originalDescription:s.card.structure,physiologicalGoals,targets:d.targets,strictVariantExecution:d.strictVariantExecution??null,
  selectionReason:binding.length?'source explicitly matches a prospectively calculated adaptation; shared calendar constraint remains authoritative':'essential discipline/role retained by existing source and calendar rules; no new individual adaptation claim',
  state:s.decision.state,hardFailures:s.input.hardFailures,conditions:s.input.conditions,restrictions:{when:s.card.when,avoid:s.card.avoid,prerequisites:s.card.prerequisiteKeys},
  recoveryAndInteractions:s.input.conditions.filter((c:any)=>['recovery','interaction','capacity'].includes(c.kind)),
  recipe:s.recipe,timing:s.timing,capacity:s.input.currentCapacity,individualDoseApproved:false,coachDecision:'review exact source, intensity interpretation, tolerance and whole microcycle; reject/hold until documented'};
}

export function simulateV26Nolio(result:any,canonical:Map<string,any>){
 // Reuse the local text contract; the historical source duration witness is identified separately from the reserved calendar dose.
 const opts={synthetic:true,apiVersion:'v1',mode:'text_only',acknowledgeUnstructured:true,dateStart:'2026-11-02',domainBindings:{Z1:'recovery',Z2:'moderate_lt1'},domainBindingProvenance:'unchanged V22 candidate binding; no HIIT target invented',refs:{ftpWatts:result.retained.refs.ftpWatts,mlssSpeedKmh:result.retained.refs.mlssSpeedKmh,provenance:'unchanged actual TFCL context on registered synthetic inputs'}};
 return{scope:'local source/candidate serialization only, NOT a calendar export',sourceTexts:result.retained.calendar.weeks.flatMap((w:any)=>w.slots.map((s:any)=>{
  const r=canonical.get(s.card.id),source=r.sourceV18Recipe;
  return{slotKey:s.key,sourceId:s.card.id,reservedCalendarMinutes:s.minutes,sourceWitnessSeconds:source.witness?.seconds??null,
   text:nolioTextFixture(r.originalCanonical,source,{...opts,minutes:s.minutes,occurrence:r.originalCanonical.identity.ordinal}),
   structured:{status:'refused',payload:null,reason:'whole individual source targets/timing not established for this calendar; no workout completeness claim'},calendarPrescriptionExported:false};
 })),editorialCandidates:result.search.results.flatMap((r:any)=>r.offers.filter((o:any)=>o.editorial).map((o:any)=>{
  const record=canonical.get(o.sourceId);return{key:o.key,text:editorialTextFixture(record.originalCanonical,record.sourceV18Recipe,o.recipe,opts),structured:editorialStructuredFixture(record.originalCanonical,record.sourceV18Recipe,o.recipe,opts),programmingPermitted:false};
 })),networkRequests:0,realExportPermitted:false};
}
