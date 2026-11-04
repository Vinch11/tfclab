import {instantiate,assertRecipeIntegrity} from './v18-compiler.mjs';
import {evaluateCanonicalOffer} from './v16-selection';
import {originalCard} from './v14-sources';
import {resolveV22Targets} from './v22-intensity';
import {resolvePhysiologicalReferences} from './v20-physio';
import {objectiveVariantV27,equipmentV27} from './v27-variant';
import {swimExecutionV27,aeroExecutionV27,strengthExecutionV27} from './v27-modal';
import {digest} from './v9-prospective';
import {integratedRunProofV24} from './v24-capacity';

export interface ExecutionFlagsV27{
 recipe_structurally_complete:boolean;objective_variant_compatible:boolean|null;full_duration_verified:boolean;intensity_anchor_resolved:boolean|null;
 technical_prerequisites_satisfied:boolean;current_capacity_documented:boolean;individual_tolerance_verified:false;recovery_compatible:boolean|null;
 coach_review_required:true;individual_prescription_approved:false;
}

export function intensityV27(slot:any,decision:any,v:any,spec:any,options:any={}){
 const sport=slot.role.sport,refs=resolvePhysiologicalReferences(v.prepared),raw=v.input.raw;
 const required=['run','bike','swim'].includes(sport),reasons:string[]=[];
 if(['stale','uncertain','absent'].includes(options.referenceState))reasons.push('reference_'+options.referenceState);
 if(slot.input.hardFailures.some((h:string)=>/intensity_reference_missing|run_reference_critical|crawl_reference_missing/.test(h)))reasons.push(...slot.input.hardFailures.filter((h:string)=>/intensity_reference_missing|run_reference_critical|crawl_reference_missing/.test(h)));
 const anchor=sport==='bike'?refs.ftpWatts:sport==='run'?refs.mlssSpeedKmh:null;
 if(['run','bike'].includes(sport)&&!(anchor>0))reasons.push('typed_native_anchor_missing');
 const zones=decision.strictVariantExecution?['Z1']:slot.card.zones;
 const targets=['run','bike'].includes(sport)?resolveV22Targets(sport,anchor,zones,slot.card.structure,spec.common.coachDomainBindings):[];
 if(required&&sport==='swim')reasons.push('CSS_crawl_does_not_resolve_drills_strokes_or_source_domains');
 if(required&&['run','bike'].includes(sport)&&targets.some((t:any)=>!('min'in t)||!('max'in t)))reasons.push('source_domain_not_calculable');
 // Preserve source HR/LT1/terrain limits; never generate FCmax from age or certify LT1 from FTP.
 const sourceConstraints=slot.card.structure.match(/[^.]*FCmax[^.]*|[^.]*LT1[^.]*/gi)??[];
 if(/FCmax/i.test(slot.card.structure)&&!(Number.isFinite(raw.fcMax)&&raw.fcMax>0))reasons.push('explicit_FCmax_reference_missing');
 if(/(?:DOIT|dessous).*LT1|sous LT1/i.test(slot.card.structure))reasons.push('source_LT1_boundary_not_individually_verified');
 const blockedByReference=reasons.some(r=>/^reference_|critical|anchor_missing|intensity_reference_missing/.test(r));
 const numericTargets=blockedByReference?[]:targets;
 const ftp=refs.ftpWatts,range=slot.card.structure.match(/(\d+)\s*[-–]\s*(\d+)\s*%\s*FTP/i);
 const sourcePower=Number.isFinite(ftp)&&ftp>0&&range?{unit:'W',min:ftp*Number(range[1])/100,max:ftp*Number(range[2])/100,flatUpperExclusive:/<\s*72%\s*FTP.*plat/i.test(slot.card.structure),sourceLiteral:range[0],terrainInstructionsRetained:true,calculationOnlyNotLT1Proof:true}:null;
 return{required,resolved:!required?null:reasons.length===0,numericTargets,sourcePower,reasons:[...new Set(reasons)],sourceConstraints,
  anchor:anchor==null?null:{value:anchor,unit:sport==='bike'?'W':'km/h',sourceField:sport==='bike'?'input.raw.ftp':raw.paceThresholdSecPerKm!=null?'input.raw.paceThresholdSecPerKm':refs.runReference.origin,sourceUnit:sport==='bike'?'W':raw.paceThresholdSecPerKm!=null?'s/km':'model_estimate_km/h',rawValue:sport==='bike'?raw.ftp:raw.paceThresholdSecPerKm,
   provenance:'unchanged preregistered synthetic native TFCL reference',recordContextDate:v.input.evidence.date,observationDateForThisExactReference:null,scientificallyVerified:false,validityExpiryNotInvented:true},
  doctrine:'src/lib/zones/tfclDoctrine.ts',domainBinding:'unchanged preregistered V22 coach binding, not a measured boundary',nativeReferencesReplaced:false};
}

function timedExecution(record:any,minutes:number){
 const integrated=integratedRunProofV24(originalCard(record.legacyId),minutes);
 if(integrated.valid)return{kind:'source_bounded_time_recipe',witness:null,existingIntegratedTimingProof:integrated,seconds:minutes*60,fullDurationVerified:true,complete:true,
  sourceParts:record.originalCanonical.original.effective.structure,integratedSegments:[{part:'first_warmup',seconds:600},{part:'middle',seconds:minutes*60-1200},{part:'last_cooldown',seconds:600}],unknowns:[],noPeripheralMinutesAddedTwice:true,strictGenericIRStatusRetained:record.sourceV18Recipe.classification};
 const r=record.sourceV18Recipe,witness=r.classification==='complete'?instantiate(r.nodes.filter((n:any)=>n.kind!=='integrated'),minutes*60):null;
 const sourceParts=record.originalCanonical.original.effective.structure;
 const technicalUnspecified=sourceParts.some((p:any)=>/éducatifs/i.test(p.text));
 return{kind:'source_bounded_time_recipe',witness,seconds:witness?.seconds??null,fullDurationVerified:!!witness,complete:!!witness&&!technicalUnspecified,
  sourceParts,integratedPeripheralParts:sourceParts.filter((p:any)=>/^Intégré/i.test(p.text)),unknowns:[...(!witness?['complete_timing_witness_missing']:[]),...(technicalUnspecified?['technical_drills_not_fully_specified']:[])],noPeripheralMinutesAddedTwice:true};
}

/** Additional execution view only: never mutates the slot, source, dose, historical issue, or individual decision. */
export function assessExecutionV27(slot:any,decision:any,week:any,v:any,spec:any,record:any,options:any={}){
 const initial=digest(slot),p=v.profile,c=record.originalCanonical;
 const criteria={objective:p.config.objective,phase:week.phase,weekType:week.type,minutes:slot.minutes,trainingLevel:p.config.ambitionMeta.trainingLevel,trainingLevelSource:p.config.ambitionMeta.trainingLevelSource,weeklyHours:p.config.weeklyHours};
 let sourceReview:any,sourceError:string|null=null;
 try{assertRecipeIntegrity(c,record.sourceV18Recipe);sourceReview=evaluateCanonicalOffer(c,criteria);if(!sourceReview.sourceMatches||digest(slot.card)!==digest(originalCard(record.legacyId)))sourceError='original_source_or_slot_card_mismatch';}catch(e){sourceError=String((e as Error).message);}
 const variant=objectiveVariantV27(slot.card,slot.minutes,criteria),equipment=equipmentV27(slot.card,options.equipment);
 const sport=slot.role.sport,intensity=intensityV27(slot,decision,v,spec,options);
 const modal:any=sourceError?{kind:'refused_source_integrity',complete:false,seconds:null,unknowns:['source_integrity_failed']}:sport==='swim'?swimExecutionV27(record,options.swim??{}):sport==='strength'?strengthExecutionV27(record,options.competence??null):slot.card.id==='C_BIKE_AERO_POSITION_DRILLS'?aeroExecutionV27(record,options.aeroRestPolicy??null):timedExecution(record,slot.minutes);
 const seconds=modal.fullDurationSeconds??modal.seconds??null;
 const fullDuration=modal.fullDurationVerified??(modal.kind==='aero_execution_v27'?modal.complete:false);
 const structural=sport==='strength'?false:sport==='swim'?modal.fullDurationVerified:modal.complete===true;
 const capacity=Object.prototype.hasOwnProperty.call(options,'capacity')?options.capacity:slot.input.currentCapacity;
 const pain=options.pain===true,adverse=options.recovery==='adverse'||slot.input.hardFailures.includes('documented_adverse_recovery_hold');
 const sourceUnconfirmed=(sourceReview?.reasons??[]).filter((r:string)=>r.startsWith('unconfirmed_')&&!(r==='unconfirmed_prerequisite:ventilateur'&&/home trainer sans ventilateur/i.test(slot.card.avoid??'')&&equipment.compatible===true));
 const sourceViolations=(sourceReview?.reasons??[]).filter((r:string)=>!r.startsWith('unconfirmed_'));
 const prerequisites=(sport==='strength'?options.competence===true:slot.role.kind==='technical'?options.competence===true:equipment.compatible===true)&&sourceUnconfirmed.length===0;
 const hard=[...slot.input.hardFailures,...sourceViolations,...(sourceError?['source_integrity_failed']:[]),...(pain?['pain_or_restriction']:[]),...(adverse?['adverse_recovery_hold']:[]),...(equipment.compatible===false?['source_equipment_restriction']:[])];
 const flags:ExecutionFlagsV27={recipe_structurally_complete:structural&&!sourceError,objective_variant_compatible:variant.compatible,full_duration_verified:fullDuration===true&&!sourceError,
  intensity_anchor_resolved:intensity.resolved,technical_prerequisites_satisfied:prerequisites&&!sourceError,current_capacity_documented:Number.isFinite(capacity)&&capacity>0&&slot.minutes<=capacity,
  individual_tolerance_verified:false,recovery_compatible:adverse||pain?false:null,coach_review_required:true,individual_prescription_approved:false};
 const fits=seconds!==null&&Math.abs(seconds-slot.minutes*60)<1e-7;
 const technicallyExecutable=flags.recipe_structurally_complete&&flags.objective_variant_compatible===true&&flags.full_duration_verified&&fits&&(!intensity.required||flags.intensity_anchor_resolved===true)&&flags.technical_prerequisites_satisfied&&flags.current_capacity_documented&&!hard.length;
 const categories:string[]=[];
 if(technicallyExecutable)categories.push('A');
 if(structural&&(!fullDuration||intensity.required&&intensity.resolved!==true)||variant.compatible===null)categories.push('B');
 if(variant.compatible===false)categories.push('C');
 if(!structural)categories.push('D');
 if(!prerequisites)categories.push('E');
 if(!flags.current_capacity_documented||!flags.individual_tolerance_verified||flags.recovery_compatible!==true)categories.push('F');
 if(hard.length)categories.push('G');
 if(digest(slot)!==initial)throw Error('V27_SLOT_MUTATED');
 const executableWorkout=technicallyExecutable?{version:'det-v27-technical-workout-1',sourceId:slot.card.id,sourceHash:digest(slot.card),goalVariant:variant.text,totalSeconds:seconds,steps:modal.sourceParts?.length===1?[{kind:'continuous',seconds,instructions:modal.sourceParts[0].text,allowedSourceZones:slot.card.zones,calculatedDomains:intensity.numericTargets,domainBindingIsCandidate:true}]:null,
  instructionParts:c.original.effective.structure,allSourceRestrictionsRetained:slot.card.avoid,individualPrescriptionApproved:false,readyForAthlete:false}:null;
 return{version:'det-v27-execution-1',slotKey:slot.key,week:slot.week,day:slot.day,sourceId:slot.card.id,sourceHash:digest(slot.card),sourceRecipeHash:record.sourceRecipeHash,sourceVersion:c.schemaVersion,
  title:slot.card.title,sport,minutesReserved:slot.minutes,currentCapacity:capacity,originalParts:c.original.effective.structure,originalSourceUnchanged:!sourceError,
  variant,equipment,intensity,execution:modal,executableWorkout,flags,fits_reserved_window:fits,technicallyExecutable,categories:[...new Set(categories)],hardFailures:hard,sourceReview,sourceUnconfirmed,sourceViolations,sourceError,
  individualConditionsUnchanged:slot.input.conditions,nativeDecisionUnchanged:slot.decision,individualPrescriptionApproved:false,operationalAuthorization:false,
  technicalReadinessIsNotIndividualApproval:true,syntheticParametersNotOriginalEvidence:!!Object.keys(options).length};
}
