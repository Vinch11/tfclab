import {CanonicalV2Schema,digest,assertCanonicalIntegrity} from './v16-canonical.mjs';
import {renderCoach} from './v16-coach.mjs';
/** Local contract mirror of nolio-send-plan payload, not a network client or official v2 validator. */
export const NOLIO_V1_CONTRACT_SOURCE='supabase/functions/nolio-send-plan/index.ts:1925';
const sports={run:2,bike:14,swim:19,strength:20,trail:52};
function dateOK(s){return /^\d{4}-\d{2}-\d{2}$/.test(s??'')&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
export function validateNolioV1Payload(p){const errors=[];if(!Number.isSafeInteger(p.id_partner)||p.id_partner<=0)errors.push('id_partner');for(const k of ['name','date_start','description'])if(typeof p[k]!=='string'||!p[k])errors.push(k);if(!dateOK(p.date_start))errors.push('invalid_date');if(!Number.isInteger(p.athlete_id)||p.athlete_id<=0)errors.push('athlete_id');if(![2,14,18,19,20,52].includes(p.sport_id))errors.push('sport_id');if(p.duration!==undefined&&(!Number.isFinite(p.duration)||p.duration<=0))errors.push('duration');
 const step=s=>{if(s.type==='repetition'){if(!Number.isInteger(s.value)||s.value<=0||!Array.isArray(s.steps)||!s.steps.length)errors.push('repetition');else s.steps.forEach(step);return;}if(s.type!=='step'||s.step_duration_type!=='duration'||!Number.isFinite(s.step_duration_value)||s.step_duration_value<=0)errors.push('step');if(!['warmup','active','rest','cooldown'].includes(s.intensity_type))errors.push('intensity_type');if(!['no_target','power','pace','heartrate'].includes(s.target_type))errors.push('target_type');if(s.target_type!=='no_target'&&(!Number.isFinite(s.target_value_min)||!Number.isFinite(s.target_value_max)||s.target_value_min>s.target_value_max))errors.push('target_bounds');};
 if(p.structured_workout){if(!Array.isArray(p.structured_workout)||!p.structured_workout.length)errors.push('structured_workout');else p.structured_workout.forEach(step);}return{valid:errors.length===0,errors,scope:'local_current_sender_contract_not_remote_acceptance'};}
export function nolioFixture(c,opts){assertCanonicalIntegrity(c);const reasons=[];const refuse=()=>({status:'refused',reasons,payload:null,preview:renderCoach(c),networkRequests:0});
 if(opts.apiVersion==='v2'){reasons.push('v2_machine_contract_not_present_no_numeric_v1_id_reuse');return refuse();}
 if(opts.synthetic!==true){reasons.push('synthetic_fixture_only');return refuse();}if(!dateOK(opts.dateStart))reasons.push('explicit_valid_calendar_date_required');
 const sport=c.prescription.discipline;if(!(sport in sports))reasons.push('multisport_or_unknown_sport_not_faithfully_representable');
 const minutes=opts.minutes;const[min,max]=c.prescription.durationMinutes??[NaN,NaN];if(!Number.isFinite(minutes)||!Number.isFinite(min)||!Number.isFinite(max)||minutes<=0||minutes<min||minutes>max)reasons.push('explicit_admissible_duration_required');
 if(!['text_only','structured'].includes(opts.mode))reasons.push('explicit_representation_mode_required');
 if(opts.mode==='text_only'&&opts.acknowledgeUnstructured!==true)reasons.push('text_only_loss_of_machine_structure_requires_explicit_acknowledgement');
 let steps=null;if(opts.mode==='structured'){
  if(c.conversion.executionStatus!=='literal_timed_parts')reasons.push('complete_source_recipe_unresolved');
  if(c.prescription.structure.some(p=>p.zones.length))reasons.push('personalized_targets_not_established_no_silent_no_target_substitution');
  if(c.prescription.intervalEvidence)reasons.push('interval_evidence_not_proven_full_recipe');
  if(!reasons.length){steps=c.prescription.structure.map(p=>({type:'step',step_duration_type:'duration',step_duration_value:p.execution.seconds,intensity_type:/warm|échauff/i.test(p.part)?'warmup':/cool|retour/i.test(p.part)?'cooldown':/rest|repos|récup/i.test(p.part)?'rest':'active',target_type:'no_target',notes:p.text}));if(steps.reduce((n,s)=>n+s.step_duration_value,0)!==minutes*60)reasons.push('exact_structured_duration_mismatch');}
 }
 if(reasons.length)return refuse();
 const payload={id_partner:parseInt(digest({legacyId:c.identity.legacyId,dateStart:opts.dateStart,occurrence:opts.occurrence??0}).slice(0,12),16),athlete_id:1,sport_id:sports[sport],name:c.prescription.title,date_start:opts.dateStart,description:renderCoach(c),duration:minutes*60,...(steps?{structured_workout:steps}:{})};const contract=validateNolioV1Payload(payload);if(!contract.valid)return{status:'refused',reasons:contract.errors,payload:null,networkRequests:0};return{status:'fixture_contract_pass',reasons:[],payload,contract,representation:opts.mode,unrepresentedMachineStructure:opts.mode==='text_only',individualPrescriptionApproved:false,remoteAcceptanceVerified:false,networkRequests:0};
}
