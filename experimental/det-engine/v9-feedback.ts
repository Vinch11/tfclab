import type{Stimulus,SelectedDose}from'./v9-prospective';
export interface Observation{synthetic:true;intentHash:string;requestId:string;sequence:number;quality:'usable'|'uncertain'|'missing';pain?:boolean;illness?:boolean;felt:'as_expected'|'harder_than_expected'|'not_reported';recovered:'yes'|'no'|'unknown';rpe?:number;drift?:{valuePct:number;comparable:boolean;interpretation:'expected'|'adverse'|'unknown'};test?:{contradictsHypothesis:boolean;methodKnown:boolean};source:string;}
export interface FeedbackState{lastSequence:number;paused:boolean;history:unknown[];}
/** Proposals only. Never writes a calendar, physiological value or athlete response. */
export function feedback(intentHash:string,request:Stimulus,dose:SelectedDose,observation:Observation,state:FeedbackState={lastSequence:0,paused:false,history:[]},alternatives:SelectedDose[]=[]){
 if(observation.synthetic!==true)throw Error('ONLY_SYNTHETIC_OFFLINE_OBSERVATIONS');if(observation.intentHash!==intentHash||observation.requestId!==request.id)throw Error('OBSERVATION_BINDING_MISMATCH');if(!Number.isInteger(observation.sequence)||observation.sequence<=state.lastSequence)throw Error('STALE_OR_DUPLICATE_OBSERVATION');
 let action:'maintain'|'adjust'|'lighten'|'substitute'|'coach_review'='coach_review',reason='',proposal:SelectedDose|null=null;let paused=state.paused;
 if(observation.pain||observation.illness){reason='reported_symptom_stop_and_coach_review';paused=true;}
 else if(state.paused){reason='prior_pause_requires_explicit_coach_clearance';}
 else if(dose.status!=='selected'){reason='no_prescription_to_adapt';}
 else if(observation.test?.contradictsHypothesis&&observation.test.methodKnown){reason='reliable_test_contradicts_hypothesis_do_not_rewrite_limiter';paused=true;}
 else if(observation.test?.contradictsHypothesis){reason='contradictory_test_method_unknown_requires_review';}
 else if(observation.quality!=='usable'){reason='insufficient_response_quality_no_progression';}
 else if(observation.recovered==='no'){reason='not_recovered_withdraw_next_exposure_for_coach_review';paused=true;}
 else if(observation.felt==='harder_than_expected'||(observation.drift?.comparable&&observation.drift.interpretation==='adverse')){
  proposal=alternatives.filter(a=>a.status==='selected'&&a.requestId===request.id&&a.source?.intentFamily===dose.source?.intentFamily&&a.source?.sport===dose.source?.sport&&a.domain===dose.domain&&a.minutes!>=a.source!.durationMin[0]&&a.minutes!<=a.source!.durationMin[1]&&a.minutes!<=request.maxMinutes&&a.minutes!<dose.minutes!&&a.minutes!>=request.minMinutes&&a.catalogueCheck&&!a.catalogueCheck.errors.length&&!a.catalogueCheck.unknown.length).sort((a,b)=>b.minutes!-a.minutes!)[0]??null;
  if(proposal){action=proposal.sourceId===dose.sourceId?'lighten':'substitute';reason='lower_admissible_dose_candidate_requires_calendar_revalidation';}else{reason='no_verified_lower_catalogue_dose_do_not_clip_source';paused=true;}
 }
 else if(observation.recovered==='yes'&&observation.felt==='as_expected'){action='maintain';reason='tolerated_initial_trial_not_proof_of_adaptation_no_automatic_progression';proposal=dose;}
 else{reason='response_incomplete_or_incomparable_no_progression';}
 const transition={sequence:observation.sequence,synthetic:true,action,reason,before:{source:dose.sourceId??null,minutes:dose.minutes??null},after:proposal?{source:proposal.sourceId,minutes:proposal.minutes}:null,intentHash,requestId:request.id,observation,calendarWrite:false,physiologyUpdated:false,expertReviewed:false,requiresCoachReview:true};return{transition,state:{lastSequence:observation.sequence,paused,history:[...state.history,transition]}};
}
