import {nolioTextFixture} from './v18-outputs.mjs';import {validateNolioV1Payload} from './v16-nolio.mjs';
import {digest} from './v9-prospective';import {isExactSecondV29,sumSecondsV29} from './v29-time';

/** Local internal structure + text contract. No official structured Nolio workout, sender or HTTP client. */
export function prepareExactNolioLocalV29(f:any,bridge:any,block:any){
 const common={networkRequests:0,realExportAuthorized:false,individualPrescriptionApproved:false,remoteAcceptanceVerified:false,
  structuredNolio:{status:'refused',reason:['swim','strength'].includes(bridge.sport)?'stroke_distance_exercise_machine_contract_not_demonstrated':'official_structured_export_not_enabled_by_this_bridge',payload:null}};
 if(digest(f.record.originalCanonical)!==bridge.sourceHash||digest(f.record.sourceV18Recipe)!==bridge.sourceRecipeHash||digest(f.v.profile)!==bridge.evidenceBinding.profileHash||digest(f.slot)!==bridge.sourceSlotHash)return{...common,status:'refused',reason:'source_or_profile_changed_after_bridge',payload:null,internalWorkout:null};
 if(!bridge.knownSourceTimeline)return{...common,status:'refused',reason:'complete_registered_exact_timeline_required',payload:null,internalWorkout:null};
 const epoch=Date.parse(f.v.profile.config.planStartDate+'T00:00:00Z')/1000,daySeconds=((f.week.week-1)*7+f.slot.day)*86400;
 if(!Number.isSafeInteger(epoch)||!isExactSecondV29(daySeconds))return{...common,status:'refused',reason:'exact_calendar_date_required',payload:null,internalWorkout:null};
 const date=new Date((epoch+daySeconds)*1000).toISOString().slice(0,10),instructions=f.record.originalCanonical.original.effective.structure;
 const internalWorkout={schema:'tfcl-v29-local-exact-workout-not-a-nolio-api-contract',sourceId:bridge.sourceId,sourceHash:bridge.sourceHash,sourceRecipeHash:bridge.sourceRecipeHash,date,discipline:bridge.sport,
  executionDurationSeconds:bridge.executionDurationSeconds,reservedSlotSeconds:bridge.reservedSlotSeconds,unallocatedSlotSeconds:bridge.unallocatedSlotSeconds,
  timelineEvents:structuredClone(bridge.timelineEvents),instructions,restrictions:f.slot.card.avoid,individualApprovalStatus:bridge.individualApprovalStatus};
 const roundTrip=JSON.parse(JSON.stringify(internalWorkout));if(digest(roundTrip)!==digest(internalWorkout)||sumSecondsV29(roundTrip.timelineEvents.filter((e:any)=>e.accounting==='additive').map((e:any)=>e.durationSeconds))!==bridge.executionDurationSeconds)throw Error('V29_LOCAL_WORKOUT_ROUNDTRIP_LOSS');
 const reviewText=instructions.map((p:any)=>p.part+' : '+p.text).join('\n')+'\n\nExécution exacte : '+bridge.executionDurationSeconds+' s. Créneau : '+bridge.reservedSlotSeconds+' s. Marge non attribuée : '+bridge.unallocatedSlotSeconds+' s ; aucun exercice ni repos ajouté.\n'+bridge.timelineEvents.map((e:any)=>{
  const x=e.originalEvent,t=x.intensity,target=t?[t.zone??t.sourceZone,t.domain??t.doctrineDomain,Number.isFinite(t.min)&&Number.isFinite(t.max)?t.min+'–'+t.max+' '+t.unit:x.secondsPer100?x.secondsPer100+' s/100m':'cible déclarée'].filter(Boolean).join(' / '):x.secondsPer100?x.secondsPer100+' s/100m':x.secondsPerRep?x.secondsPerRep+' s/répétition':'consigne source conservée';
  const details=[x.round?'tour '+x.round:'',x.repetition?'répétition '+x.repetition:'',x.afterRepetition?'après répétition '+x.afterRepetition:'',x.repetitions?x.repetitions+' répétitions':'',x.side?'côté '+x.side:'',x.loadMode==='bodyweight'?'charge : poids du corps':x.loadMode?'charge : '+x.loadMode:'',x.occurrencePolicy?'repos '+(x.occurrencePolicy==='between_only'?'entre occurrences':'après chaque occurrence'):'',e.accounting==='included'?'inclus, non additionnel':''].filter(Boolean).join(' ; ');
  const end=sumSecondsV29([e.relativeStartSeconds,e.durationSeconds]);
  return(e.occurrenceIndex+1)+'. '+e.durationSeconds+' s (début relatif '+e.relativeStartSeconds+' s, fin '+end+' s) — '+x.kind+' — '+(x.sourceText??x.instructions??x.name??x.position??'transition/repos explicitement déclaré')+' — '+target+(details?' ; '+details:'');
 }).join('\n')+'\nDose individuelle, récupération et export non approuvés. Les zones historiques de force ne sont pas une dose cardiaque musculaire.';
 if(!bridge.complementaryConstraintsPass||!block.noNewComplementaryDefect)return{...common,status:'refused',reason:'source_slot_or_whole_block_constraint_not_satisfied',payload:null,internalWorkout,reviewText,localRoundTripPass:true};
 const source=nolioTextFixture(f.record.originalCanonical,f.record.sourceV18Recipe,{synthetic:true,apiVersion:'v1',mode:'text_only',acknowledgeUnstructured:true,dateStart:date,minutes:f.slot.minutes,occurrence:(f.week.week-1)*7+f.slot.day});
 if(!source.payload)return{...common,status:'refused',reason:'existing_text_contract:'+source.reasons.join(';'),payload:null,internalWorkout,reviewText,localRoundTripPass:true};
 // Existing factory receives unchanged integer legacy minutes. Only this local fixture replaces duration with verified integer execution seconds.
 const payload={...source.payload,duration:bridge.executionDurationSeconds,description:source.payload.description+'\n\nV29 — simulation documentaire, non approuvée\n'+reviewText};
 const contract=validateNolioV1Payload(payload);if(!contract.valid)throw Error('V29_LOCAL_TEXT_CONTRACT_FAILED:'+contract.errors.join(';'));
 if(payload.duration!==bridge.executionDurationSeconds||payload.structured_workout)throw Error('V29_RESERVED_MARGIN_OR_STRUCTURE_LEAKED_INTO_PAYLOAD');
 return{...common,status:'local_exact_text_contract_pass',payload,internalWorkout,reviewText,localRoundTripPass:true,contract,structuredWorkoutIsInternalOnly:true};
}
