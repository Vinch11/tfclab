import {digest} from './v9-prospective';
import {originalCard,targetedTiming} from './v14-sources';
import {objectiveVariantV27} from './v27-variant';
import {assessExecutionV27} from './v27-execution';
import {aeroExecutionV27} from './v27-modal';
import {sourceContext} from './v13-source-context';
import {relativeCalendarContext} from './v14-relative-context';
import {minuteEnvelopeV29,slotAccountingV29,exactLedgerV29,sumSecondsV29,isExactSecondV29} from './v29-time';
import {checkTimeBudgetsV29} from './v29-bridge';
import {validateFourWeekScopeV23} from './v23-scope';
import {evaluateCoachFloorRequest} from './coach-floor-contract';

export type PhasePolicyV30='A'|'B';
/** A proposal resolves a programming interpretation, never an authorization or an individual dose. */
export function phaseRecipeV30(slot:any,week:any,profile:any,policy:PhasePolicyV30){
 if(!['A','B'].includes(policy))throw Error('V30_UNREGISTERED_POLICY');
 const context={objective:profile.config.objective,phase:week.phase,weekType:week.type};
 const historical=objectiveVariantV27(slot.card,slot.minutes,context),timing=targetedTiming(slot.card);
 const generic=timing.declaredContentRange,baseProposal=policy==='B'&&slot.card.id==='SEILER_BIKE_Z1_LONG'&&profile.config.objective==='IM'&&week.phase==='base';
 const genericCompatible=!!generic&&slot.minutes>=generic[0]&&slot.minutes<=generic[1];
 const rawSourceMatches=digest(slot.card)===digest(originalCard(slot.card.id));
 const proposedCompatible=rawSourceMatches&&(baseProposal?genericCompatible&&historical.eligibility.length===0:historical.compatible===true);
 return{policy,historicalVariantUnchanged:historical,sourceRecipeRangeMinutes:generic,sourceIntact:rawSourceMatches,
  selectedForCoachReview:baseProposal?'generic_aerobic_base_exposure_not_specific_long_IM_variant':'literal_goal_variant',
  proposedVariantCompatible:proposedCompatible,requiresCoachPhasePolicy:baseProposal,phasePolicyAuthorized:false,
  satisfiesCurrentlyAuthorizedVariant:historical.compatible===true,sourceRecipeCompatible:genericCompatible,
  specificVariantProposedForPhases:['build','peak'],futurePhaseAlreadyApproved:false,
  literalRecipeAndIronmanIntersection:slot.card.id==='SEILER_BIKE_Z1_LONG'?[180,180]:null,
  later210MinutesAutomaticallyAllowed:false,notEvidenceOfIronmanDurability:true};
}

function sourceTimeline(slot:any,e:any,phase:any){
 if(slot.card.id==='SEILER_BIKE_Z1_LONG'&&phase.sourceRecipeCompatible){
  const total=minuteEnvelopeV29(slot.minutes);if(total===null||total<1800)return null;
  return exactLedgerV29([{kind:'continuous_first_integrated_warmup',seconds:900,instructions:slot.card.structure,sourcePart:'Warm-up',allowedZones:['Z1']},
   {kind:'continuous_middle',seconds:total-1800,sourcePart:'Main',instructions:slot.card.structure,allowedZones:['Z1','Z2']},
   {kind:'continuous_last_integrated_cooldown',seconds:900,sourcePart:'Cool-down',instructions:slot.card.structure,allowedZones:['Z1']}],total,slot.key+':generic-source-review');
 }
 // Existing modal proof is retained; no new swim/force event receives invented seconds.
 return null;
}
export function reviewSessionV30(slot:any,week:any,v:any,spec:any,record:any,policy:PhasePolicyV30,reservedSeconds:number,restrictions:any={}){
 const pin=digest(slot);if(!isExactSecondV29(reservedSeconds)||reservedSeconds===0)throw Error('V30_INTEGER_RESERVATION_REQUIRED');
 if(Object.keys(restrictions).some(k=>!['adverseRecovery','pain','capacityCeilingSeconds','referenceState'].includes(k)))throw Error('V30_NO_NEW_ATHLETE_PARAMETERS');
 const base=assessExecutionV27(slot,slot.decision,week,v,spec,record),phase=phaseRecipeV30(slot,week,v.profile,policy);
 if(base.sourceError||!phase.sourceIntact)throw Error('V30_ORIGINAL_SOURCE_REQUIRED');
 const capacity=minuteEnvelopeV29(slot.input.currentCapacity),restricted=Object.prototype.hasOwnProperty.call(restrictions,'capacityCeilingSeconds')?restrictions.capacityCeilingSeconds:capacity;
 if(isExactSecondV29(restricted)&&isExactSecondV29(capacity)&&restricted>capacity)throw Error('V30_CAPACITY_INCREASE_NOT_AUTHORIZED');
 const timeline=sourceTimeline(slot,base,phase),exact=timeline?.valid?timeline.executionDurationSeconds:base.flags.full_duration_verified&&isExactSecondV29(base.execution.seconds??base.execution.fullDurationSeconds)?base.execution.seconds??base.execution.fullDurationSeconds:null;
 const duration=slotAccountingV29(exact,reservedSeconds,'synthetic_upper_bound');
 const aero=slot.card.id==='C_BIKE_AERO_POSITION_DRILLS'?aeroExecutionV27(record):null;
 const possibleAeroSeconds=aero?.possibleElapsedSeconds??null;
 const errors:string[]=[];if(!phase.proposedVariantCompatible)errors.push('recipe_or_goal_variant_incompatible');
 const unknowns=[...base.individualConditionsUnchanged.map((c:any)=>c.id),...base.execution.unknowns??[],...base.intensity.reasons];
 if(!isExactSecondV29(restricted)||restricted<=0)errors.push('current_capacity_unknown');
 else if(exact!==null&&exact>restricted)errors.push('current_capacity_exceeded');
 const allAeroFit=possibleAeroSeconds?.every((n:number)=>n<=reservedSeconds)??null;
 if(duration.compatible===false)errors.push('known_execution_exceeds_reservation');
 if(possibleAeroSeconds&&!allAeroFit)unknowns.push('one_written_aero_recovery_interpretation_exceeds_slot');
 if(exact===null)unknowns.push('exact_execution_duration_not_established_for_B');
 if(phase.requiresCoachPhasePolicy)unknowns.push('base_generic_phase_policy_not_authorized');
 if(base.equipment.compatible===false)errors.push('equipment_restriction');else if(base.equipment.compatible===null)unknowns.push('equipment_context_and_fan_not_confirmed');
 const recovery=restrictions.adverseRecovery===true||base.flags.recovery_compatible===false||slot.input.hardFailures.includes('documented_adverse_recovery_hold');
 if(recovery)errors.push('suspended_due_to_recovery');if(restrictions.pain===true)errors.push('pain_or_restriction');
 if(['absent','uncertain','stale'].includes(restrictions.referenceState)&&base.intensity.required)errors.push('required_intensity_reference_'+restrictions.referenceState);
 errors.push(...base.hardFailures);
 const floor=minuteEnvelopeV29(slot.role.floor),floorException=exact!==null&&floor!==null&&exact<floor&&exact%60===0?evaluateCoachFloorRequest(slot,v.profile,v.caseId,exact/60,true):null;
 if(exact!==null&&floor!==null&&exact<floor&&!floorException?.authorizedForExperimentalProgramming)errors.push('native_floor_not_satisfied');
 const sourceMinimum=minuteEnvelopeV29(slot.card.durationMin[0]);if(exact!==null&&sourceMinimum!==null&&exact<sourceMinimum)errors.push('source_recipe_minimum_not_satisfied');
 const nativeContext=sourceContext(slot.card,v.profile,week.week,slot.day,week.type);if(!nativeContext.compatible)errors.push(...nativeContext.reasons);
 const sourceStructureComplete=timeline?.valid===true||base.flags.recipe_structurally_complete;
 const technicalReady=sourceStructureComplete&&phase.proposedVariantCompatible&&duration.compatible===true&&(!base.intensity.required||base.flags.intensity_anchor_resolved===true)&&base.flags.technical_prerequisites_satisfied&&!errors.length;
 const result={slotKey:slot.key,week:week.week,day:slot.day,sport:slot.role.sport,role:slot.role.kind,title:slot.card.title,sourceId:slot.card.id,
  sourceHash:digest(slot.card),canonicalHash:record.sourceCanonicalHash,sourceRecipeHash:record.sourceRecipeHash,originalParts:record.originalCanonical.original.effective.structure,
  originalIntention:record.originalCanonical.original.effective.objectif,sourceRestrictions:slot.card.avoid,sourceWhen:slot.card.when,
  nativePlannedMinutesUnchanged:slot.minutes,reservedSlotSeconds:reservedSeconds,executionDurationSeconds:exact,unallocatedSlotSeconds:duration.unallocatedSlotSeconds,
  durationAccounting:duration,timelineEvents:timeline?.timelineEvents??null,executionProofUnchanged:base.execution,
  sourceRecipeStructurallyComplete:sourceStructureComplete,intensity:base.intensity,phaseVariant:phase,
  nativeVariantCompatible:base.flags.objective_variant_compatible,nativeTechnicallyExecutable:base.technicallyExecutable,
  candidateTechnicallyExecutableIfPhasePolicyAuthorized:technicalReady,currentlyIntegrable:false,
  aeroInterpretations:possibleAeroSeconds?{possibleElapsedSeconds:possibleAeroSeconds,allFitReservation:allAeroFit,finalRestSelected:false,maximumContinuousAeroSeconds:600}:null,
  currentCapacitySeconds:restricted,currentCapacityCompatibleWithKnownExecution:exact!==null&&isExactSecondV29(restricted)&&exact<=restricted,
  reservationWithinDeclaredCapacityEnvelope:isExactSecondV29(restricted)&&reservedSeconds<=restricted,reservationIsNotExercise:true,
  individualToleranceVerified:false,recoveryCompatible:recovery?false:null,coachReviewRequired:true,individualPrescriptionApproved:false,
  errors:[...new Set(errors)],unknowns:[...new Set(unknowns)],nativeHardFailuresUnchanged:slot.input.hardFailures,nativeConditionsUnchanged:slot.input.conditions,
  floorException,remainingRequiredDecision:slot.role.sport==='swim'?'source-specific technique/stroke pacing, rests, transitions and measured total; no transfer from V28 fixtures':slot.role.sport==='strength'?'exercise competence, tempos, sides, rests/transitions and individual loading; support is not maximal strength':slot.card.id==='C_BIKE_AERO_POSITION_DRILLS'?'last-rest convention, postural tolerance and symptom/recovery assessment':phase.requiresCoachPhasePolicy?'approve or reject the limited base-phase policy; resolve FCmax/terrain/equipment and source-specific tolerance':'source-specific tolerance, intensity limits and recovery before individual approval',
  rawV27Execution:base,automaticallyApplied:false,compensatoryVolumeAdded:false};
 if(digest(slot)!==pin)throw Error('V30_NATIVE_SLOT_MUTATED');return result;
}

/** Sidecar to V14/V22 scheduling. It allocates review windows, never changes historical planned doses. */
export function buildBaseCoachCandidateV30(reference:any,v:any,spec:any,canonical:Map<string,any>,registration:any,options:{policy:PhasePolicyV30;reservationModel:string;restrictionsBySlot?:Record<string,any>}){
 if(Object.keys(options).some(k=>!['policy','reservationModel','restrictionsBySlot'].includes(k)))throw Error('V30_NO_NEW_ATHLETE_PARAMETERS');
 if(v.caseId!==registration.subject||v.profile.config.objective!=='IM')throw Error('V30_REGISTERED_B_SUBJECT_REQUIRED');
 if(!registration.reservationModels.some((m:any)=>m.id===options.reservationModel))throw Error('V30_UNREGISTERED_WINDOW_MODEL');
 const before=digest(reference),profileHash=digest(v.profile),binding=registration.nativeEvidenceBinding;
 if(!binding||before!==binding.nativeCalendarHash||profileHash!==binding.profileHash||digest(v.input)!==binding.subjectInputHash)throw Error('V30_REGISTERED_PROFILE_OR_CALENDAR_CHANGED');
 const scope=validateFourWeekScopeV23(reference,v.profile);
 const weeks=reference.calendar.weeks.map((w:any)=>{
  const sessions=w.slots.map((s:any)=>{let reserve=minuteEnvelopeV29(s.minutes)!;
   if(options.reservationModel==='recipe_review_envelopes'&&w.type==='load'){
    if(s.card.id==='A_STR_STABILITY_CORE')reserve=minuteEnvelopeV29(s.card.durationMin[1])!;
    if(s.card.id==='C_BIKE_AERO_POSITION_DRILLS')reserve=Math.max(...aeroExecutionV27(canonical.get(s.card.id)).possibleElapsedSeconds);
   }
   return reviewSessionV30(s,w,v,spec,canonical.get(s.card.id),options.policy,reserve,options.restrictionsBySlot?.[s.key]??{});
  });
  const reserved=sumSecondsV29(sessions.map((s:any)=>s.reservedSlotSeconds)),budget=minuteEnvelopeV29(w.budget),availability=minuteEnvelopeV29(v.profile.config.weeklyHours*60),errors:string[]=[];
  // Reservation total is a conservative upper bound ONLY IF unresolved executions later fit their windows.
  errors.push(...checkTimeBudgetsV29(reserved,reserved,budget,availability));
  const frequencies=Object.fromEntries(['swim','bike','run','strength'].map(sport=>[sport,sessions.filter((s:any)=>s.sport===sport).length]));
  for(const[sport,count]of Object.entries(frequencies)){const q=v.profile.prep.weeklyQuotas[w.week].quota[sport];if((count as number)<q.min||(count as number)>q.max)errors.push('native_discipline_frequency:'+sport);}
  for(let day=0;day<7;day++){const slots=sessions.filter((s:any)=>s.day===day);if(slots.length&&(!v.profile.availableDays.includes(day)||slots.length>v.profile.maxDaily||new Set(slots.map((s:any)=>s.sport)).size!==slots.length))errors.push('availability_or_daily_density:'+day);}
  if(7-new Set(sessions.map((s:any)=>s.day)).size<v.profile.minRest)errors.push('minimum_rest_days');
  if(new Set(sessions.map((s:any)=>s.sourceId)).size!==sessions.length)errors.push('source_weekly_identity_collision');
  for(const s of w.slots)if(relativeCalendarContext(s.card,w.week,s.day,w.type,w.slots,reference.calendar.weeks.filter((x:any)=>x.week<w.week).flatMap((x:any)=>x.slots)).status==='fail')errors.push('relative_source_context:'+s.key);
  const known=sessions.filter((s:any)=>s.executionDurationSeconds!==null);
  return{week:w.week,phase:w.phase,weekType:w.type,originalPlannedMinutes:w.reservedMinutes,reservedSlotSeconds:reserved,plannedVolumeBudgetSeconds:budget,declaredAvailabilitySeconds:availability,
   reservationUpperBoundWithinNativeVolumeBudget:errors.filter(e=>e.startsWith('planned_training_')).length===0,reservationUpperBoundRequiresAllExecutionsFit:true,
   actualFullExerciseDurationSeconds:sessions.length===known.length?sumSecondsV29(known.map((s:any)=>s.executionDurationSeconds)):null,
   knownExecutionSeconds:sumSecondsV29(known.map((s:any)=>s.executionDurationSeconds)),unknownExecutionCount:sessions.length-known.length,frequencies,
   disciplineReservationsSeconds:Object.fromEntries(Object.keys(frequencies).map(sport=>[sport,sumSecondsV29(sessions.filter((s:any)=>s.sport===sport).map((s:any)=>s.reservedSlotSeconds))])),
   errors,sessions,exactClockTimesKnown:false,reservationClockFreedomEstablished:false};
 });
 const longs=weeks.flatMap((w:any)=>w.sessions.filter((s:any)=>s.role==='long').map((s:any)=>({slotKey:s.slotKey,absoluteDay:(w.week-1)*7+s.day}))),spacing:any[]=[];
 longs.forEach((b:any,i:number)=>longs.slice(0,i).forEach((a:any)=>{if(Math.abs(a.absoluteDay-b.absoluteDay)<=1)spacing.push([a,b]);}));
 const selected=weeks.flatMap((w:any)=>w.sessions),windowErrors=weeks.flatMap((w:any)=>w.errors.map((e:string)=>({week:w.week,error:e}))),hard=selected.flatMap((s:any)=>s.errors.map((e:string)=>({slotKey:s.slotKey,error:e})));
 const nativeCounts={executableSessions:selected.filter((s:any)=>s.nativeTechnicallyExecutable).length,executableSourceIds:[...new Set(selected.filter((s:any)=>s.nativeTechnicallyExecutable).map((s:any)=>s.sourceId))]};
 if(digest(reference)!==before||digest(v.profile)!==profileHash)throw Error('V30_NATIVE_CALENDAR_OR_PROFILE_MUTATED');
 return{schema:'det-v30-base-coach-candidate-1',candidateId:options.policy+':'+options.reservationModel,policy:options.policy,reservationModel:options.reservationModel,
  nativeCalendarHash:before,profileHash,profileInputHash:digest(v.input),weeks,legacyRawHistoricalUnchanged:reference.rawValidation.historical,legacyFourWeekScopeUnchanged:scope,
  nativeCounts,proposalCounts:{phaseCompatibleSessions:selected.filter((s:any)=>s.phaseVariant.proposedVariantCompatible).length,phasePolicyDependentSessions:selected.filter((s:any)=>s.phaseVariant.requiresCoachPhasePolicy).length,
   technicallyExecutableIfPhasePolicyAuthorized:selected.filter((s:any)=>s.candidateTechnicallyExecutableIfPhasePolicyAuthorized).length,technicallyExecutableSourceIds:[...new Set(selected.filter((s:any)=>s.candidateTechnicallyExecutableIfPhasePolicyAuthorized).map((s:any)=>s.sourceId))],
   newSourcesInsertedIntoOriginalB:0,sessionsInsertedIntoOriginalB:0,individualApprovals:0},
  validation:{windowErrors,hardFailures:hard,longSpacingConflicts:spacing,reservationLayoutFeasible:!windowErrors.length&&!spacing.length,fullExerciseTimeKnown:weeks.every((w:any)=>w.actualFullExerciseDurationSeconds!==null),
   sportingPrescriptionComplete:false,acceptance:'coach_proposal_only_not_retained',autoAdoptionAllowed:false,notAcceptedMerelyForNoNewError:true,
   recoveryWeekDoseNotIncreased:weeks.filter((w:any)=>w.weekType==='recovery').every((w:any)=>w.reservedSlotSeconds===w.originalPlannedMinutes*60)},
  physiology:{limiters:v.prepared.trace.diagnostic.limiters,levers:v.prepared.trace.decision.levers,primaryAction:v.prepared.trace.decision.primaryAction,freshTTENotIronmanDurability:true},
  deferredSpecificity:reference.deferredSpecificity,physiologicalInputsChanged:false,newIndividualParameters:[],coachPolicyAuthorized:false,individualPrescriptionApproved:false,expertReviewed:false,automaticallyApplied:false};
}

export function windowDemandV30(candidate:any,week:number,demands:{slotKey:string;reservedSeconds:number;provenance:string}[]){
 const w=candidate.weeks.find((w:any)=>w.week===week);if(!w)throw Error('V30_UNKNOWN_WEEK');
 const map=new Map<string,number>();for(const d of demands){if(!w.sessions.some((s:any)=>s.slotKey===d.slotKey)||map.has(d.slotKey)||!isExactSecondV29(d.reservedSeconds)||!d.provenance)throw Error('V30_INVALID_WINDOW_DEMAND');map.set(d.slotKey,d.reservedSeconds);}
 const reserved=sumSecondsV29(w.sessions.map((s:any)=>map.get(s.slotKey)??s.reservedSlotSeconds));
 return{week,demands,reservedSeconds:reserved,unchangedBudgetSeconds:w.plannedVolumeBudgetSeconds,unchangedAvailabilitySeconds:w.declaredAvailabilitySeconds,errors:checkTimeBudgetsV29(reserved,reserved,w.plannedVolumeBudgetSeconds,w.declaredAvailabilitySeconds),doesNotAssertAthleteExecution:true,automaticallyApplied:false};
}

/** Numeric stress projection for old validators ONLY. Reservation ceilings are not asserted to be prescribed exercise. */
export function diagnoseReservationProjectionV30(reference:any,v:any,candidate:any){
 const pin=digest(reference),r=structuredClone(reference),names=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
 for(const w of r.calendar.weeks){
  const cw=candidate.weeks.find((x:any)=>x.week===w.week);
  for(const s of w.slots){const cs=cw.sessions.find((x:any)=>x.slotKey===s.key);if(cs.reservedSlotSeconds%60!==0)throw Error('V30_LEGACY_PROXY_REQUIRES_INTEGER_MINUTES');s.minutes=cs.reservedSlotSeconds/60;s.input.minutes=s.minutes;
   const stored=r.calendar.calendar.weeks.find((x:any)=>x.weekNumber===w.week).sessions.find((x:any)=>!x.isRest&&x.catalogId===s.card.id);stored.durationMin=s.minutes;stored.dayName=names[s.day];
  }
  w.reservedMinutes=w.slots.reduce((n:number,s:any)=>n+s.minutes,0);
 }
 // Imported lazily through the same established validation path, not a relaxed validator.
 revalidateV22Reservation(r,v.profile);const scope=validateFourWeekScopeV23(r,v.profile);
 if(digest(reference)!==pin)throw Error('V30_PROXY_MUTATED_NATIVE');
 return{scope,rawHistorical:r.rawValidation.historical,rawCandidateChecks:r.rawValidation.candidate,
  changedSlots:r.calendar.weeks.flatMap((w:any)=>w.slots.filter((s:any)=>s.minutes!==reference.calendar.weeks[w.week-1].slots.find((x:any)=>x.key===s.key).minutes).map((s:any)=>({slotKey:s.key,reservationCeilingMinutes:s.minutes}))),
  semantics:'counterfactual numeric reservation-ceiling stress test for historical validators; NOT exact prescribed exercise or a candidate workout',actualExecutionClaimed:false,individualApproval:false,usedForAutomaticAcceptance:false};
}
import {revalidateV22Reservation} from './v22-prescription';
