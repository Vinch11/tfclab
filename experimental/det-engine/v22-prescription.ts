import{evaluateV18ReviewOffer}from'./v18-selection';import{deriveV22StimulusRequests}from'./v22-intents';
import{buildProspectiveCalendar,type CandidateProgrammingPriorities}from'./v14-calendar';import{validateProspectiveCalendar}from'./v14-validation';
import{assessConditional}from'./v14-state';import{resolvePhysiologicalReferences}from'./v20-physio';
import{resolveV22Targets}from'./v22-intensity';import{deriveTrainingZones}from'@/lib/zones/deriveTrainingZones';
import type{V10Profile}from'./v10-profiles';
/** Reuse the V14 selector/calendar and candidate conditions; no replacement solver or new dose formula. */
export function buildV22Prescription(prepared:any,p:V10Profile,spec:any,canonical:Map<string,any>,programming?:CandidateProgrammingPriorities){
 const refs=resolvePhysiologicalReferences(prepared),calendar=buildProspectiveCalendar(p,'native_floor_conditional',{horizonWeeks:4,dosePolicy:'reserve_source_minima',...(programming?{programming}:{})});
 const decisions=calendar.weeks.flatMap(w=>w.slots.map(s=>{
  const source=canonical.get(s.card.id),src=source?.sourceV18Recipe,original=source?.originalCanonical.original.effective;
  const reasons:string[]=[],pending:string[]=[];
  const sport=s.role.sport,anchor=sport==='bike'?refs.ftpWatts:sport==='run'?refs.mlssSpeedKmh:null;
  const targetByZone=resolveV22Targets(sport,anchor,s.card.zones,s.card.structure,spec.common.coachDomainBindings);
  if(['bike','run'].includes(sport)&&anchor===null)reasons.push('individual_intensity_reference_missing');
  if(sport==='run'&&prepared.diagnostic.runMLSS?.crossValidation?.severity==='critical')reasons.push('run_reference_critical_cross_validation_conflict');
  if(sport==='swim'&&!(prepared.athleteData.css>0))reasons.push('crawl_reference_missing_no_other_stroke_anchor_invented');
  if(!source)reasons.push('canonical_source_missing');
  const canonicalReview=source?evaluateV18ReviewOffer(source.originalCanonical,src,{objective:p.config.objective!,phase:w.phase,weekType:w.type,minutes:s.minutes,trainingLevel:p.config.ambitionMeta!.trainingLevel,trainingLevelSource:p.config.ambitionMeta!.trainingLevelSource,weeklyHours:p.config.weeklyHours},{currentCapacityMinutes:s.role.currentCapacity,availableSessionMinutes:s.minutes,progressionRequested:w.week>1,effectiveRefs:{ftpWatts:refs.ftpWatts??undefined,mlssSpeedKmh:refs.mlssSpeedKmh??undefined,provenance:refs.provenance}}):null;
  for(const r of canonicalReview?.reasons??[]){if(r.startsWith('unconfirmed_prerequisite:')||r.startsWith('unconfirmed_special_context:')||['recipe_not_fully_compiled','no_source_bounded_duration_assignment'].includes(r))pending.push('canonical_review:'+r);else reasons.push('canonical_review:'+r);}
  if(canonicalReview?.goalVariantStatus==='requires_goal_specific_source_resolution')pending.push('objective_variant_requires_explicit_source_resolution');
  if(src?.classification!=='complete')pending.push('canonical_full_recipe_not_technically_complete');
  if(source?.candidates?.some((c:any)=>c.changes.some((x:any)=>x.rule==='explicit_editorial_final_recovery')))pending.push('source_final_recovery_requires_explicit_coach_decision');
  if(sport==='swim')pending.push('whole_swim_protocol_time_and_stroke_specific_execution_unverified');
  if(sport==='strength')pending.push('movement_support_is_not_demonstrated_force_training');
  if(s.role.kind==='technical')pending.push('postural_tolerance_not_demonstrated');
  // Add conditions, never remove the existing V14 conditions or hard failures.
  s.input.hardFailures.push(...reasons);
  for(const id of pending)if(!s.input.conditions.some(c=>c.id===id))s.input.conditions.push({id,kind:'prerequisite',beforeWeek:w.week,requiredEvidence:[id,'source-specific individual and whole-week coach review'],fallback:'hold this prescription; retain a separately verified conservative alternative and revalidate the whole week, never truncate or suppress a discipline'});
  s.decision=assessConditional(s.input);
  const targets=targetByZone.filter(t=>s.card.zones.includes(t.zone));
  const zoneView=['bike','run','swim'].includes(sport)?deriveTrainingZones({sport:sport as any,ftp:prepared.athleteData.ftp,css:prepared.athleteData.css,vma:prepared.athleteData.vma,paceThresholdSecPerKm:prepared.athleteData.paceThresholdSecPerKm,vlamax:refs.vlamaxEffective.value,vo2max:prepared.athleteData.vo2max,weightKg:prepared.athleteData.weightKg}):null;
  return{slotKey:s.key,week:w.week,day:s.day,sport,role:s.role,sourceId:s.card.id,sourceInstructionsUnchanged:original?.structure??null,minutes:s.minutes,currentCapacity:s.role.currentCapacity,state:s.decision.state,canonicalReview,hardFailures:reasons,additionalPending:pending,targets:reasons.length?[]:targets,targetsAreCandidateDomainsNotExactSourceResolved: true,derivedZoneView:zoneView,cssScope:sport==='swim'?'crawl anchor only; no pace assigned to drills, backstroke, breaststroke or mixed swim':null,
   physiology:{limiters:prepared.trace.diagnostic.limiters,levers:prepared.trace.decision.levers,action:prepared.trace.decision.primaryAction,referenceOrigins:refs},
   rationale:{priority:prepared.trace.decision.primaryAction,selectedStimulus:s.role.purpose,dose:'reserve complete source lower bound and unchanged native role floor before any expansion; no automatic volume fill or optimum claim',whyNoForcedHIIT:'No source-specific individual high-intensity tolerance was preregistered; preserve base and defer targeted high-intensity candidate for coach review',reevaluateBeforeWeek:w.week,expectedResponse:'completion with appropriate effort and usable recovery report; adaptation not assumed',actuallyObserved:null,conditions:s.decision.conditions},individualPrescriptionApproved:false,expertReviewed:false};
 }));
 // Recalculate aggregates after adding strict physiological/source conditions.
 const all=calendar.weeks.flatMap(w=>w.slots);calendar.currentlyAdmissibleSlots=all.filter(s=>s.decision.state==='currently_admissible').length;calendar.conditionalSlots=all.filter(s=>s.decision.state==='conditional_pending_reassessment').length;calendar.notAdmissibleSlots=all.filter(s=>s.decision.state==='not_admissible').length;calendar.prospectiveCalendarComplete=calendar.prospectiveCalendarComplete&&!calendar.notAdmissibleSlots;
 const rawValidation=validateProspectiveCalendar(calendar,p);
 return{profile:p.id,calendar,decisions,stimulusRequests:deriveV22StimulusRequests(prepared,p),rawValidation,structuralCalendarComplete:calendar.weeks.length===4&&calendar.weeks.every(w=>w.days.length===7&&!w.unassigned.length&&w.placement.complete&&w.reservedMinutes<=w.budget),historicalControlsPass:rawValidation.historical.blocking===0,currentlyExecutablePlan:false,actualCoverage:{weeks:calendar.weeks.length,days:calendar.weeks.length*7,rawV14CoverageLabelIsKnown16WeekAssumption:true},status:calendar.prospectiveCalendarComplete?'complete_conditional_candidate':'incomplete_or_refused',reassessmentEvents:calendar.weeks.map(w=>({beforeWeek:w.week,trainingDose:null,requires:'dated source-specific recovery, symptoms and capacity assessment; no new test dosage invented',automaticRelease:false})),deferredSpecificity:[{kind:'targeted_high_intensity',reason:'no individually documented interval tolerance; actual TFCL lever retained, no universal HIIT quota'},{kind:'maximal_strength',reason:'movement competence and actual loading evidence missing; support sessions do not prove force gain'},{kind:'brick_nutrition_heat_posture',reason:'no new capacity or tolerance invented'}],refs,expertReviewed:false,automaticRelease:false,scientificIndividualValidation:false};
}

/** Revalidate an explicit evidence update; never infer capacity or silently release a plan. */
export function revalidateV22Reservation(result:ReturnType<typeof buildV22Prescription>,p:V10Profile){
 const c=result.calendar,all=c.weeks.flatMap(w=>w.slots);
 for(const s of all)s.decision=assessConditional(s.input);
 for(const d of result.decisions){const s=all.find(s=>s.key===d.slotKey)!;d.state=s.decision.state;d.hardFailures=[...new Set([...d.hardFailures,...s.input.hardFailures])];d.rationale.conditions=s.decision.conditions;}
 c.currentlyAdmissibleSlots=all.filter(s=>s.decision.state==='currently_admissible').length;c.conditionalSlots=all.filter(s=>s.decision.state==='conditional_pending_reassessment').length;c.notAdmissibleSlots=all.filter(s=>s.decision.state==='not_admissible').length;
 c.prospectiveCalendarComplete=result.structuralCalendarComplete&&c.notAdmissibleSlots===0;result.rawValidation=validateProspectiveCalendar(c,p);result.historicalControlsPass=result.rawValidation.historical.blocking===0;result.status=c.prospectiveCalendarComplete?'complete_conditional_candidate':'incomplete_or_refused';return result;
}
