import{digest}from'./v9-prospective';import{originalCard,targetedTiming,explicitDose}from'./v14-sources';import{integratedRunProofV24}from'./v24-capacity';
import{verifyCoachDecisionV25,type CoachDecisionV25,type CoachVerifierV25}from'./v25-coach';
import{checkSessionCatalogue}from'../../supabase/functions/_shared/sessionCatalogueContract';import{sourceContext}from'./v13-source-context';

/** A floor exception is a programming proposal, never evidence of individual tolerance or dose safety. */
export function assessPlanningFloorV25(slot:any,p:any,minutes:number,options:{simulation:boolean;coachDocument?:CoachDecisionV25;verifier?:CoachVerifierV25}){
 const reasons:string[]=[];let unchanged=false,original:any=null;try{original=originalCard(slot.card.id);unchanged=digest(original)===digest(slot.card);}catch{/* Keep unsupported sources blocked. */}
 const timing=original?targetedTiming(original):null,integrated=unchanged&&integratedRunProofV24(slot.card,90).valid;
 const main=integrated?slot.card.structure.match(/Main:\s*(\d+)-(\d+) min/):null;
 const sourceMinimum=main?Number(main[1]):timing?.timingCompleteForDeclaredRecipe?timing.necessaryRange[0]:null;
 const sourceMaximum=main?Number(main[2]):timing?.timingCompleteForDeclaredRecipe?timing.necessaryRange[1]:null;
 const variant=slot.card.variants?.ironman,range=typeof variant==='string'?variant.match(/^(\d+)[–-](\d+) min/):null;
 const goalMinimum=range?Number(range[1]):null,goalMaximum=range?Number(range[2]):null;
 const recipe=explicitDose(slot.card,minutes),validMinutes=Number.isFinite(minutes)&&minutes>0;
 const recipeCompatible=unchanged&&validMinutes&&sourceMinimum!==null&&sourceMaximum!==null&&minutes>=sourceMinimum&&minutes<=sourceMaximum&&minutes>=slot.card.durationMin[0]&&minutes<=slot.card.durationMin[1]&&recipe.valid;
 const goalCompatible=goalMinimum!==null&&goalMaximum!==null&&validMinutes&&minutes>=goalMinimum&&minutes<=goalMaximum;
 const cap=Number.isFinite(slot.input.currentCapacity)&&slot.input.currentCapacity>0?slot.input.currentCapacity:null;
 const within=cap!==null&&validMinutes&&minutes<=cap;
 const q=p.prep.weeklyQuotas[slot.week];
 const catalogueCheck=q&&original?checkSessionCatalogue({sport:slot.role.sport,catalogId:slot.card.id,title:slot.card.title,details:slot.card.structure,durationMin:minutes,zones:slot.card.zones},{objective:p.config.objective,phase:q.phase,weekType:q.weekType,catalog:[original]}):{errors:['missing_native_context_or_source']};
 if(p.config.objective!=='IM'||slot.role.sport!=='run')reasons.push('contract_scope_is_ironman_running_only');
 if(catalogueCheck.errors.length)reasons.push('original_catalogue_contract_refuses_alternative');
 if(!q||!original||!sourceContext(slot.card,p,slot.week,slot.day,q.weekType).compatible)reasons.push('source_calendar_context_not_demonstrated');
 if(!unchanged)reasons.push('source_identity_changed_or_missing');if(!recipeCompatible)reasons.push('complete_mandatory_source_recipe_not_preserved');if(!goalCompatible)reasons.push(goalMinimum===null?'goal_variant_not_demonstrated':'goal_variant_duration_not_satisfied');
 if(cap===null)reasons.push('current_capacity_unknown');else if(!within)reasons.push('dose_exceeds_current_documented_envelope');
 const exceptionNeeded=validMinutes&&minutes<slot.role.floor;
 const proposal={version:'det-v25-planning-floor-1',slotKey:slot.key,week:slot.week,sourceId:slot.card.id,sourceHash:digest(slot.card),minutes,planningFloor:slot.role.floor,capacity:cap,objective:p.config.objective,profileContextHash:digest({id:p.id,config:p.config,longCaps:p.longCaps,normalCaps:p.normalCaps})};
 const proposalHash=digest(proposal),coach=verifyCoachDecisionV25(options.coachDocument,proposalHash,'planning_floor_only',options.simulation,options.verifier);
 return{...proposal,proposalHash,source_recipe_minimum:sourceMinimum,catalogue_duration_minimum:slot.card.durationMin[0],goal_variant_minimum:goalMinimum,planning_floor:slot.role.floor,current_capacity_envelope:cap,individual_tolerance_verified:false,coach_override_status:coach.status,coachDecision:coach,
  recipeComplete:recipeCompatible,goalVariantCompatible:goalCompatible,goalVariantCompatibilityScope:'literal duration and unchanged full instructions; individualized intensity assignment remains unresolved',intensityAssignmentVerified:false,catalogueCheck,withinDeclaredEnvelope:within,planningFloorExceptionRequired:exceptionNeeded,alternativeTechnicallyReceivable:reasons.length===0,
  status:reasons.length?'not_currently_admissible':exceptionNeeded?'candidate_planning_floor_exception':'within_programming_floor_candidate_only',reasons,
  outstanding:['source_intensity_domain_resolution','source_specific_individual_tolerance','dated_recovery_and_whole_microcycle_review','independent_coach_dose_decision'],
  sourceIntensityInstructions:slot.card.structure,goalVariantInstructions:variant??null,sourceRecipeChanged:false,nativeFloorChanged:false,individualDoseApproved:false,operationallyApproved:false,capacityIncreased:false};
}

/** Parallel interpretation of precisely this floor conflict; all raw results remain in the packet. */
export function evaluateFloorComplementV25(contract:ReturnType<typeof assessPlanningFloorV25>,counterproposal:any){
 if(!counterproposal)return{version:'det-v25-complementary-floor-review-1',status:'whole_block_counterproposal_unavailable',technicallyReceivableUnderControlledException:false,rawValidation:null,rawScope:null,exceptionWitnesses:[],otherErrors:[],individualDoseApproved:false};
 const r=counterproposal.result,s=r.calendar.weeks.flatMap((w:any)=>w.slots).find((s:any)=>s.key===contract.slotKey),quota=r.calendar.calendar.weeklyQuotas[contract.week];
 const bound=!!s&&s.minutes===contract.minutes&&digest(s.card)===contract.sourceHash&&s.role.floor===contract.planning_floor&&s.input.currentCapacity===contract.current_capacity_envelope&&quota.floors.slLongRunMin===contract.planning_floor&&s.role.sport==='run'&&s.role.kind==='long';
 const nativeFloorIssue=counterproposal.scope.originalWeeklyIssues.find((i:any)=>i.code==='quota_floor_violation'&&i.weekNumber===contract.week&&i.expected===`1 run ≥${contract.planning_floor}min`);
 const exceptionWitnesses:any[]=[],otherErrors:any[]=[];
 for(const e of counterproposal.scope.executedBlockErrors){
  let exact=false;
  if(bound&&nativeFloorIssue){
   if(e.code==='four_week_native_floor')exact=e.evidence.slot===contract.slotKey&&e.evidence.week===contract.week&&e.evidence.minutes===contract.minutes&&e.evidence.floor===contract.planning_floor;
   if(e.code==='original_weekly_quota_or_budget')exact=digest(e.evidence)===digest(nativeFloorIssue);
   if(e.code==='historical_error_not_explained_by_scope'){const i=e.evidence.originalIssueUnchanged;exact=i.code==='quota_floor_violation'&&i.week===contract.week&&i.control==='weekly_quotas'&&i.severity===nativeFloorIssue.severity&&i.message===nativeFloorIssue.reason;}
  }
  (exact?exceptionWitnesses:otherErrors).push(e);
 }
 const receivable=bound&&contract.alternativeTechnicallyReceivable&&contract.planningFloorExceptionRequired&&exceptionWitnesses.length===3&&!otherErrors.length&&!r.rawValidation.candidate.sourceFailures.length;
 return{version:'det-v25-complementary-floor-review-1',status:receivable?'technically_receivable_for_explicit_floor_review':'not_demonstrated',technicallyReceivableUnderControlledException:receivable,reviewPacketHash:digest({proposalHash:contract.proposalHash,validation:r.rawValidation,scope:counterproposal.scope}),exceptionWitnesses,otherErrors,
  rawValidation:r.rawValidation,rawScope:counterproposal.scope,historicalErrorsRemoved:0,planningFloorWaived:false,coachFloorDecision:contract.coachDecision,individualDoseApproved:false,operationallyApproved:false,appliedToRetainedPlan:false};
}
