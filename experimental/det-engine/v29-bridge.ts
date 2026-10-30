import {exactLedgerV29,slotAccountingV29,minuteEnvelopeV29,sumSecondsV29,isExactSecondV29} from './v29-time';
import {digest} from './v9-prospective';import {validateFourWeekScopeV23} from './v23-scope';
import {sourceContext} from './v13-source-context';import {evaluateCoachFloorRequest} from './coach-floor-contract';

/** Complementary transport only. No legacy durationMin is replaced by a reservation or a fractional duration. */
export function bridgeExactTimeV29(f:any,execution:any,request:any,registry:any){
 const pin=digest(f),validation=registry.verify(f,execution,request),errors:string[]=[...validation.errors];
 const row=validation.row,identity=request.scenarioId+':'+execution.sourceId;
 const ledger=exactLedgerV29(execution.timeline?.events??[],execution.seconds,identity);
 errors.push(...ledger.errors);
 const reserved=minuteEnvelopeV29(request.reservedMinutes),native=minuteEnvelopeV29(f.slot.minutes),capacity=Object.prototype.hasOwnProperty.call(request,'restrictCapacitySeconds')?request.restrictCapacitySeconds:minuteEnvelopeV29(f.slot.input.currentCapacity);
 const accounting=slotAccountingV29(ledger.executionDurationSeconds,reserved,request.semantics);
 if(reserved===null||reserved===0)errors.push('integer_reservation_required');
 if(accounting.compatible!==true)errors.push(accounting.compatible===null?'execution_or_slot_unresolved':'execution_incompatible_with_slot_semantics');
 const capacityCompatible=isExactSecondV29(capacity)&&capacity>0&&isExactSecondV29(execution.seconds)&&execution.seconds<=capacity;
 if(!capacityCompatible)errors.push('documented_capacity_unknown_or_exceeded');
 // A restrictive test can never increase the registered envelope.
 if(capacity!==null&&capacity>minuteEnvelopeV29(f.slot.input.currentCapacity)!)errors.push('capacity_increase_not_authorized');
 const floor=minuteEnvelopeV29(f.slot.role.floor);let floorException:any=null;
 if(isExactSecondV29(execution.seconds)&&floor!==null&&execution.seconds<floor){
  if(execution.seconds%60===0)floorException=evaluateCoachFloorRequest(f.slot,f.v.profile,f.v.caseId,execution.seconds/60,true);
  if(!floorException?.authorizedForExperimentalProgramming)errors.push('execution_below_native_programming_floor');
 }
 if(!execution.technically_complete_in_scenario)errors.push('source_execution_variant_or_phase_incomplete');
 if(!execution.intensityResolved)errors.push('required_execution_intensity_unresolved');
 if(!execution.technicalPrerequisitesSatisfied)errors.push('technical_prerequisites_unconfirmed');
 if(execution.objectiveVariant.compatible!==true)errors.push('objective_variant_not_compatible_or_unknown');
 if(!execution.phaseCompatible)errors.push('phase_not_compatible');
 if(!sourceContext(f.slot.card,f.v.profile,f.week.week,f.slot.day,f.week.type).compatible)errors.push('source_calendar_context_refused');
 errors.push(...execution.hardFailures);
 if(request.recovery==='adverse'||execution.recoveryCompatible===false)errors.push('recovery_or_symptom_hold');
 if(request.pain===true)errors.push('pain_or_restriction');
 const nativeAnchorRequired=['bike','run'].includes(f.slot.role.sport)&&execution.nativeExecutionContractUnchanged.intensity.required;
 if(nativeAnchorRequired&&['absent','uncertain','stale'].includes(request.referenceState))errors.push('required_reference_'+request.referenceState);
 const schedules=checkDocumentedScheduleV29(request.windows,reserved);
 if(schedules.status==='conflict')errors.push(...schedules.errors);
 const result={schema:'det-v29-exact-time-bridge-1',scenarioId:request.scenarioId,sourceId:execution.sourceId,sourceHash:execution.sourceHash,sourceRecipeHash:execution.sourceRecipeHash,
  evidenceBinding:registry.binding(request.scenarioId),subjectCaseId:request.subjectCaseId,sourceSlotHash:digest(f.slot),slotKey:f.slot.key,week:f.week.week,day:f.slot.day,sport:f.slot.role.sport,nativeIntensityAnchorRequired:nativeAnchorRequired,
  executionDurationSeconds:accounting.executionDurationSeconds,reservedSlotSeconds:accounting.reservedSlotSeconds,unallocatedSlotSeconds:accounting.unallocatedSlotSeconds,
  timelineEvents:ledger.timelineEvents,durationAccounting:{...accounting,contributionSumSeconds:ledger.contributionSumSeconds,integerOnly:true,includedEventsCount:ledger.timelineEvents.filter(e=>e.accounting==='included').length},
  legacyCompatibility:{semantics:'exact_planned_exercise_minutes_not_an_upper_bound',nativeDurationMinutes:f.slot.minutes,nativeDurationSeconds:native,
   executionRepresentableAsIntegerMinutes:isExactSecondV29(execution.seconds)&&execution.seconds%60===0,sameExecutionAsNativeDuration:isExactSecondV29(execution.seconds)&&execution.seconds===native,
   originalSessionUnchanged:true,directInsertionAuthorized:false,v28RejectedTrialRaw:row?{scopeErrors:row.wholeBlockReview.scope.executedBlockErrors,rawHistorical:row.wholeBlockReview.rawHistorical,transportLimitation:row.wholeBlockReview.transportLimitation}:null},
  individualApprovalStatus:{currentlyIndividuallyAdmissible:false,individualDoseApproved:false,coachApproved:false,toleranceVerified:false,coachReviewRequired:true,recovery:execution.recoveryCompatible},
  programmingFloorSeconds:floor,floorException,capacitySeconds:capacity,capacityCompatible,documentedSchedule:schedules,
  knownSourceTimeline:ledger.valid&&validation.valid,technicallyCompleteInScenario:execution.technically_complete_in_scenario,compatibleWithReservedSlot:accounting.compatible,
  complementaryConstraintsPass:errors.length===0,errors:[...new Set(errors)],newCoachPolicyAuthorized:false,automaticallyApplied:false,realExportAuthorized:false};
 if(digest(f)!==pin)throw Error('V29_MUTATED_SOURCE_OR_NATIVE_CALENDAR');return result;
}

export function checkDocumentedScheduleV29(windows:any,reserved:number|null){
 if(!windows)return{status:'unknown_clock_times_not_documented',errors:[],noDocumentedOverlapObserved:true,clockConflictFreedomEstablished:false};
 const {startSeconds:start,endSeconds:end,otherWindows:others}=windows;
 if(!isExactSecondV29(start)||!isExactSecondV29(end)||end>86400||end<=start||!Array.isArray(others)||reserved===null)return{status:'conflict',errors:['invalid_documented_clock_window'],clockConflictFreedomEstablished:false};
 const errors:string[]=[];if(end-start<reserved)errors.push('reservation_exceeds_documented_window');
 for(const other of others){if(!isExactSecondV29(other.startSeconds)||!isExactSecondV29(other.endSeconds)||other.endSeconds>86400||other.endSeconds<=other.startSeconds)errors.push('invalid_neighbor_clock_window');else if(start<other.endSeconds&&other.startSeconds<end)errors.push('documented_reservation_overlap:'+other.id);}
 return{status:errors.length?'conflict':'documented_windows_compatible',errors,startSeconds:start,endSeconds:end,clockConflictFreedomEstablished:errors.length===0};
}

/** Integer reservation accounting of an existing block. Unknown execution is never filled with reserved time. */
export function validateBridgeBlockV29(reference:any,v:any,bridge:any){
 const pin=digest(reference),scope=validateFourWeekScopeV23(reference,v.profile),errors:string[]=[],weeks:any[]=[];let targetCount=0;
 if(pin!==bridge.evidenceBinding.nativeCalendarHash||digest(v.profile)!==bridge.evidenceBinding.profileHash)errors.push('registered_native_block_or_profile_changed');
 for(const w of reference.calendar.weeks){
  const slots=w.slots.map((s:any)=>{const target=s.key===bridge.slotKey;if(target)targetCount++;return{slotKey:s.key,sourceId:s.card.id,sport:s.role.sport,day:s.day,
   executionDurationSeconds:target?bridge.executionDurationSeconds:null,plannedExerciseSecondsForBudget:target?bridge.executionDurationSeconds:minuteEnvelopeV29(s.minutes),reservedSlotSeconds:target?bridge.reservedSlotSeconds:minuteEnvelopeV29(s.minutes),
   unallocatedSlotSeconds:target?bridge.unallocatedSlotSeconds:null,executionNotInferredFromLegacyMinutes:!target,legacyDurationMinUnchanged:s.minutes};});
  const reserved=sumSecondsV29(slots.map((s:any)=>s.reservedSlotSeconds)),budget=minuteEnvelopeV29(w.budget),originalReservation=sumSecondsV29(w.slots.map((s:any)=>minuteEnvelopeV29(s.minutes)));
  const planned=sumSecondsV29(slots.map((s:any)=>s.plannedExerciseSecondsForBudget)),hours=v.profile.config.weeklyHours,availability=Number.isFinite(hours)&&hours>=0&&Number.isSafeInteger(hours*3600)?hours*3600:null;
  errors.push(...checkTimeBudgetsV29(planned,reserved,budget,availability).map(e=>e+':'+w.week));
  const nativeBudget=minuteEnvelopeV29(v.profile.prep.weeklyQuotas[w.week].volumeBudget.maxMinutes);if(budget===null||nativeBudget===null||budget>nativeBudget)errors.push('native_week_budget_contract_mismatch:'+w.week);
  if(new Set(slots.map((s:any)=>s.slotKey)).size!==slots.length||new Set(slots.map((s:any)=>s.sourceId)).size!==slots.length)errors.push('source_or_slot_identity_collision:'+w.week);
  for(let day=0;day<7;day++){const daily=slots.filter((s:any)=>s.day===day);if(daily.length&&(!v.profile.availableDays.includes(day)||daily.length>v.profile.maxDaily||new Set(daily.map((s:any)=>s.sport)).size!==daily.length))errors.push('native_day_discipline_or_density_constraint:'+w.week+':'+day);}
  weeks.push({week:w.week,phase:w.phase,weekType:w.type,slots,totalReservedSlotSeconds:reserved,weeklyReservationBudgetSeconds:availability,weeklyAvailabilitySeconds:availability,plannedExerciseSecondsForBudget:planned,plannedTrainingBudgetSeconds:budget,originalLegacyPlannedSeconds:originalReservation,
   knownExecutionSeconds:sumSecondsV29(slots.filter((s:any)=>s.executionDurationSeconds!==null).map((s:any)=>s.executionDurationSeconds)),unknownExecutionSlots:slots.filter((s:any)=>s.executionDurationSeconds===null).length,
   totalUnallocatedSecondsKnownOnly:sumSecondsV29(slots.filter((s:any)=>s.unallocatedSlotSeconds!==null).map((s:any)=>s.unallocatedSlotSeconds)),actualWeeklyExerciseDurationEstablished:false});
 }
 if(targetCount!==1)errors.push('exactly_one_registered_target_required');
 const all=[...bridge.errors,...errors];if(digest(reference)!==pin)throw Error('V29_MUTATED_LEGACY_BLOCK');
 return{schema:'det-v29-complementary-block-1',weeks,additionalErrors:[...new Set(all)],noNewComplementaryDefect:all.length===0,
  legacyRawHistoricalUnchanged:reference.rawValidation.historical,legacyFourWeekScopeUnchanged:scope,legacyResultReplaced:false,legacyCalendarHash:pin,
  historicalValidatorsPass:reference.rawValidation.historical.blocking===0,fullBlockSportingApproval:false,otherSessionExecutionUnknown:true,clockTimesUnknownUnlessDeclared:true,
  status:all.length?'complementary_candidate_refused':'complementary_candidate_without_new_defect_not_approved',insertedIntoOriginalB:false,individualDoseApproved:false};
}

/** Native training volume and declared availability are separate ceilings, with unchanged numeric values. */
export function checkTimeBudgetsV29(planned:any,reserved:any,trainingBudget:any,availability:any){
 const errors:string[]=[];
 if(!isExactSecondV29(planned)||!isExactSecondV29(trainingBudget))errors.push('planned_training_budget_unresolved');else if(planned>trainingBudget)errors.push('planned_training_budget_exceeded');
 if(!isExactSecondV29(reserved)||!isExactSecondV29(availability))errors.push('reservation_availability_unresolved');else if(reserved>availability)errors.push('reserved_week_availability_exceeded');
 return errors;
}
