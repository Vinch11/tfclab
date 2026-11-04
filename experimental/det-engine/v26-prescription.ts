import {searchV26Stimuli} from './v26-selection';
import {buildV25Prescription} from './v25-prescription';
import {applyCoachFloorPolicy} from './coach-floor-prescription';
import {validateFourWeekScopeV23} from './v23-scope';
import {digest} from './v9-prospective';
import {instantiate} from './v18-compiler.mjs';

/** Presence of a proposal is never permission to adopt it. Native failures remain visible on fallback. */
export function retainValidatedV26Calendar(v25:any,floor:any){
 const c=floor?.complementary;
 const safe=!!floor?.alternative&&floor.enabled===true&&floor.status==='authorized_experimental_alternative_not_individually_approved'&&c?.policyApplied===true&&
  [c.errors,c.uncoveredNewHistoricalIssues,c.otherBlockErrors].every(xs=>Array.isArray(xs)&&xs.length===0)&&
  c.individualDoseApproved===false&&c.operationalAuthorization===false&&floor.alternative.currentlyExecutablePlan===false;
 return{retained:safe?floor.alternative:v25.baselineV24.result,experimentalFloorAlternativeRetained:safe,
  retainedCalendarOrigin:safe?'validated_existing_coach_floor_alternative':'native_v25_calendar',
  refusedFloorProposalKeptSeparate:!!floor?.alternative&&!safe};
}

/** The search consumes calculated intentions before calendar construction. The existing engine remains authoritative. */
export function buildV26Prescription(v:any,spec:any,canonical:Map<string,any>,knowledge:any,clock:string){
 const pin=digest(v.input),search=searchV26Stimuli(v,canonical,knowledge,spec);
 const v25=buildV25Prescription(v,spec,canonical,clock),floor=applyCoachFloorPolicy(v25,v.profile,v.caseId,true);
 const adoption=retainValidatedV26Calendar(v25,floor),retained=adoption.retained;
 const bindings=search.results.map((r:any)=>({leverId:r.intention.lever.id,adaptation:r.intention.adaptation,offers:r.offers.map((o:any)=>o.key),selectedForCoachReview:r.selectedForCoachReview,shortlistForEvidenceReview:r.shortlistForEvidenceReview,
  actualMatchedSlots:retained.calendar.weeks.flatMap((w:any)=>w.slots.filter((s:any)=>r.offers.some((o:any)=>o.sourceId===s.card.id)&&s.role.sport===r.intention.sport).map((s:any)=>({slotKey:s.key,week:w.week,sourceId:s.card.id,minutes:s.minutes,state:s.decision.state,hardFailures:s.input.hardFailures,conditions:s.input.conditions.map((c:any)=>c.id),selectedBy:'existing calendar source; prospective search confirms/defer role, no new dose'}))),
  blockedNewSources:r.offers.filter((o:any)=>o.blockers.length).map((o:any)=>({key:o.key,reasons:o.blockers})),
  placementDecision:'no unreviewed source swap; preserve V24 B placement and coach-authorized floor alternative',
 }));
 const contextualOffers=search.results.flatMap((r:any)=>r.offers.map((o:any)=>({key:o.key,leverId:r.intention.lever.id,
  weeks:retained.calendar.weeks.map((w:any)=>{
   const existing=w.slots.find((s:any)=>s.card.id===o.sourceId&&s.role.sport===r.intention.sport),decision=existing?retained.decisions.find((x:any)=>x.slotKey===existing.key):null;
   const blockers=[...o.blockers];if(!existing)blockers.push('not_present_no_unreviewed_replacement_of_essential_role');
   if(existing?.input.hardFailures.length)blockers.push(...existing.input.hardFailures);
   if(existing&&(!Number.isFinite(existing.input.currentCapacity)||existing.input.currentCapacity<=0||existing.minutes>existing.input.currentCapacity))blockers.push('actual_calendar_dose_exceeds_or_lacks_current_capacity');
   const witness=existing&&o.layers.A_technicallyStructured?instantiate(o.recipe.nodes.filter((n:any)=>n.kind!=='integrated'),existing.minutes*60):null;
   if(existing&&!witness)blockers.push('actual_reserved_dose_not_structurally_witnessed');
   return{week:w.week,phase:w.phase,weekType:w.type,slotKey:existing?.key??null,day:existing?.day??null,minutes:existing?.minutes??null,capacity:existing?.input.currentCapacity??null,witness,
    decisionState:existing?.decision.state??null,targets:decision?.targets??[],conditions:existing?.input.conditions??[],blockers:[...new Set(blockers)],individualDoseApproved:false,automaticReplacement:false,
    justification:existing?'existing source is explicitly relevant to the prospective priority; exact dose remains conditional':'source matched the priority, but historical phase/recovery/recipe/role constraints prevent insertion'};
  })})));
 if(pin!==digest(v.input))throw Error('V26_INPUT_MUTATION');
 return{version:'det-v26-prescription-1',caseId:v.caseId,input:v.input,inputHash:pin,search,bindings,contextualOffers,v25ReferenceHash:digest(v25),v25Reference:v25,floor,...adoption,
  fourWeekScope:validateFourWeekScopeV23(retained,v.profile),newAutomaticSubstitutions:0,retainedChangesBeyondCoachFloor:0,
  futureFavorableReport:v.counterfactual?.v26FavorableReport??null,favorableReportProvesAdaptation:false,
  individualDoseApproved:false,expertReviewed:false,status:'conditional_coach_review_not_operational'};
}
