import {parameterSetV28,type ContextV28,type ParameterV28} from './v28-parameters';
import {aeroTimelineV28,swimTimelineV28,strengthTimelineV28} from './v28-modal';
import {assessExecutionV27} from './v27-execution';
import {objectiveVariantV27} from './v27-variant';
import {digest} from './v9-prospective';
import {validateFourWeekScopeV23} from './v23-scope';
import {revalidateV22Reservation} from './v22-prescription';
import {historicalWitnessAdditionsV24} from './v24-placement';

/** Sidecar execution contract; cannot release, replace or mutate a retained prescription. */
export function resolveParametricV28(f:any,context:ContextV28,parameters:ParameterV28[],availableMinutes:number,options:any={}){
 const before=digest(f),p=parameterSetV28(f.record,context,parameters,options.decisionRecords??[],options.verifyDecision);
 const base=assessExecutionV27(f.slot,f.decision,f.week,f.v,f.spec,f.record,options);
 const raw=f.record.originalCanonical.original.raw,phaseCompatible=Array.isArray(raw.phase)&&raw.phase.includes(context.phase)&&Array.isArray(f.slot.card.phases)&&f.slot.card.phases.includes(context.phase);
 const timeline=f.slot.card.id==='C_BIKE_AERO_POSITION_DRILLS'?aeroTimelineV28(f.record,p,base.intensity.numericTargets):f.slot.role.sport==='swim'?swimTimelineV28(f.record,p,f.spec.common.coachDomainBindings):f.slot.role.sport==='strength'?strengthTimelineV28(f.record,p):null;
 const seconds=timeline?.seconds??null,minutes=seconds===null?null:seconds/60;
 const variant=objectiveVariantV27(f.slot.card,minutes??availableMinutes,{objective:context.objective,phase:context.phase,weekType:f.week.type});
 const sourceDurationCompatible=minutes!==null&&minutes>=f.slot.card.durationMin[0]&&minutes<=f.slot.card.durationMin[1];
 const capacity=Object.prototype.hasOwnProperty.call(options,'capacity')?options.capacity:f.slot.input.currentCapacity;
 const capacityCompatible=Number.isFinite(capacity)&&capacity>0&&minutes!==null&&minutes<=capacity;
 const sourceIntact=!base.sourceError&&!p.errors.includes('source_integrity_failed');
 const intensityResolved=f.slot.role.sport==='bike'?base.intensity.resolved===true&&timeline?.intensityResolved===true:timeline?.intensityResolved===true;
 const requiredParamsUsable=p.errors.length===0&&p.unknowns.length===0;
 const structured=sourceIntact&&timeline?.complete===true&&requiredParamsUsable;
 const technicallyComplete=structured&&intensityResolved&&phaseCompatible&&variant.compatible===true&&sourceDurationCompatible;
 const slotCompatible=seconds!==null&&Number.isFinite(availableMinutes)&&availableMinutes>0&&seconds<=availableMinutes*60;
 const stillUnknown=[...p.unknowns,...(timeline?.unknowns??[]),...base.individualConditionsUnchanged.map((c:any)=>c.id)];
 const logistics=base.flags.technical_prerequisites_satisfied;
 const hard=[...base.hardFailures,...p.errors,...(!phaseCompatible?['original_phase_not_compatible']:[]),...(!capacityCompatible?['declared_capacity_missing_or_exceeded']:[]),...(!slotCompatible?['reserved_slot_not_compatible']:[])];
 if(digest(f)!==before)throw Error('V28_SOURCE_OR_RESERVATION_MUTATED');
 return{schema:'det-v28-parametric-execution-1',sourceId:f.record.legacyId,sourceHash:f.record.sourceCanonicalHash,sourceRecipeHash:f.record.sourceRecipeHash,context,parameters,
  originalSourceText:p.originalText,canonicalStructure:p.canonicalStructure,originalSourceIntact:sourceIntact,originalPhase:raw.phase,effectivePhase:f.slot.card.phases,
  objectiveVariant:variant,phaseCompatible,timeline,seconds,minutes,availableMinutes,sourceDurationCompatible,
  technically_complete_in_scenario:technicallyComplete,compatible_with_reserved_slot:slotCompatible,candidate_requires_coach_policy:false,
  intensityResolved,technicalPrerequisitesSatisfied:logistics,currentCapacity:capacity,currentCapacityCompatible:capacityCompatible,
  individualToleranceVerified:false,recoveryCompatible:base.flags.recovery_compatible,individually_admissible:false,approved_by_coach:false,
  safeForUnconditionalInsertion:false,canSubmitForWholeBlockReview:technicallyComplete&&slotCompatible&&logistics&&capacityCompatible&&!hard.length,
  hardFailures:[...new Set(hard)],parametersErrors:p.errors,parametersUnknown:p.unknowns,remainingIndividualConditions:stillUnknown,
  nativeExecutionContractUnchanged:base,parameterValuesAreNotAthleteBData:context.syntheticOnly,automaticallyApplied:false};
}

/** Hypothesis B is deliberately never authorized by a parameter or matching duration. */
export function phaseVariantOptionsV28(f:any){
 const before=digest(f),a=objectiveVariantV27(f.slot.card,f.slot.minutes,{objective:f.v.profile.config.objective,phase:f.week.phase,weekType:f.week.type});
 const execution=assessExecutionV27(f.slot,f.decision,f.week,f.v,f.spec,f.record);
 const text=f.record.originalCanonical.original.raw.structure.find((x:any)=>x.part==='Main')?.text??'',m=text.match(/^(\d+)-(\d+) min/);
 const genericRange=m?[Number(m[1]),Number(m[2])]:null,genericFits=!!genericRange&&f.slot.minutes>=genericRange[0]&&f.slot.minutes<=genericRange[1];
 const out={sourceId:f.record.legacyId,week:f.week.week,reservedMinutes:f.slot.minutes,phase:f.week.phase,capacity:f.slot.input.currentCapacity,budget:f.week.budget,weekReservedMinutes:f.week.reservedMinutes,
  literalGenericRange:genericRange,literalGoalVariant:a.text,literalIntersection:genericRange&&a.range?[Math.max(genericRange[0],a.range[0]),Math.min(genericRange[1],a.range[1])]:null,
  A:{policy:'goal_variant_required_in_base',compatible:a.compatible,raw:a},
  B:{policy:'generic_base_goal_specific_later',genericDurationCompatible:genericFits,compatibleIfCoachPolicyWereAuthorized:f.week.phase==='base'&&genericFits,policyStatus:'proposed_not_authorized',candidate_requires_coach_policy:true,automaticPermission:false,notASpecific180MinuteIronmanExposure:true},
  intensityUnchanged:execution.intensity,equipmentUnchanged:execution.equipment,currentCapacityCompatible:execution.flags.current_capacity_documented,individualToleranceVerified:false,recoveryCompatible:execution.flags.recovery_compatible,
  noAutomaticDurationIncrease:true,noOtherSportReduction:true,recordedExplicitHistoricalGenericBaseWaiver:null};
 if(digest(f)!==before)throw Error('V28_PHASE_OPTIONS_MUTATED_INPUT');return out;
}

/** Validate a separate candidate block at exact computed elapsed time; never insert into the retained calendar. */
export function reviewParametricBlockV28(reference:any,v:any,slotKey:string,execution:any){
 const pin=digest(reference),trial=structuredClone(reference),s=trial.calendar.weeks.flatMap((w:any)=>w.slots).find((s:any)=>s.key===slotKey);
 const beforeScope=validateFourWeekScopeV23(reference,v.profile),changes:any[]=[];
 if(execution.seconds!==null&&s){
  const w=trial.calendar.weeks.find((w:any)=>w.week===s.week),old=s.minutes;
  s.minutes=execution.seconds/60;s.input.minutes=s.minutes;w.reservedMinutes+=s.minutes-old;
  const stored=trial.calendar.calendar.weeks.find((x:any)=>x.weekNumber===s.week).sessions.find((x:any)=>x.catalogId===s.card.id);stored.durationMin=s.minutes;
  const decision=trial.decisions.find((d:any)=>d.slotKey===s.key);decision.minutes=s.minutes;
  changes.push({slotKey,fromMinutes:old,toMinutes:s.minutes,sourceIdUnchanged:s.card.id,dayUnchanged:s.day});
 }
 revalidateV22Reservation(trial,v.profile);const scope=validateFourWeekScopeV23(trial,v.profile),newHistorical=historicalWitnessAdditionsV24(reference,trial);
 const counts=(xs:any[])=>{const m=new Map<string,number>();for(const x of xs)m.set(digest(x),(m.get(digest(x))??0)+1);return m;},oldErrors=counts(beforeScope.executedBlockErrors);
 const newScopeErrors=[...counts(scope.executedBlockErrors)].filter(([k,n])=>n>(oldErrors.get(k)??0));
 const acceptedAsSeparateTechnicalScenario=execution.canSubmitForWholeBlockReview&&newHistorical.length===0&&newScopeErrors.length===0;
 if(digest(reference)!==pin)throw Error('V28_BLOCK_REVIEW_MUTATED_RETAINED');
 return{version:'det-v28-whole-block-review-1',changes,beforeScope,scope,newHistoricalIssues:newHistorical,newScopeErrors,acceptedAsSeparateTechnicalScenario,
  exactElapsedSeconds:execution.seconds,historicalIntegerMinuteTransportCompatible:execution.seconds!==null&&Number.isInteger(execution.seconds/60),
  transportLimitation:execution.seconds!==null&&!Number.isInteger(execution.seconds/60)?'exact_elapsed_seconds_not_representable_in_unchanged_integer_durationMin_schema_no_rounding_or_truncation':null,
  rawHistorical:trial.rawValidation.historical,trialCalendar:trial.calendar,retainedHash:pin,retainedUnchanged:true,automaticallyApplied:false,individualApproval:false,coachPolicyApproved:false};
}
