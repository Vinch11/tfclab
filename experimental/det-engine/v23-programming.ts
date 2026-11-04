import{deriveV22StimulusRequests}from'./v22-intents';import type{CandidateProgrammingPriorities}from'./v14-calendar';import type{V10Profile}from'./v10-profiles';
/** Only an existing, observed and sport-bound foundation request can drive this opt-in priority. */
export function deriveV23Programming(prepared:any,p:V10Profile,input:any){
 const requests=deriveV22StimulusRequests(prepared,p),decisions=requests.map((r:any)=>{
 const reasons=[...r.reasons];const t=prepared.diagnostic.effectifs.tte;
 const observed=r.leverUnchanged.id==='z2_volume'&&t.source==='observed'&&Number.isFinite(input.raw.tteObservedMin)&&input.raw.tteObservedMin>0;
 if(r.leverUnchanged.id==='z2_volume'&&!observed)reasons.push('observed_bike_sustainability_evidence_required_for_sport_priority');
 if(r.leverUnchanged.id==='z2_volume'&&!(prepared.athleteData.ftp>0))reasons.push('bike_anchor_missing_for_personalized_priority');
 if(!input.evidence.date)reasons.push('dated_individual_evidence_missing');
 return{...r,programmingEligible:r.status==='candidate_foundation_request'&&observed&&reasons.length===0,sport:observed?'bike':null,programmingReasons:reasons};
 });
 const bySport:CandidateProgrammingPriorities['bySport']={};for(const r of decisions.filter((x:any)=>x.programmingEligible))bySport.bike={families:[...r.families],priority:r.leverUnchanged.priority,protectLongSessionDay:true,intentId:r.leverUnchanged.id};
 const policy:CandidateProgrammingPriorities|undefined=Object.keys(bySport).length?{version:'v23-observed-foundation-priority-1',bySport,extraMinutes:'none_without_documented_dose_reason'}:undefined;
 const noDifferenceReasons:string[]=[];if(!decisions.some((r:any)=>r.programmingEligible))noDifferenceReasons.push('no_existing_evidence_eligible_foundation_request');if(prepared.diagnostic.effectifs.tte.source!=='observed')noDifferenceReasons.push('no_observed_bike_sustainability_evidence');
 return{requests:decisions,noDifferenceReasons,policy:policy??null,volumesMayRemainIdentical:true,coachingConventionCandidate:true,scientificDoseProof:false,roleBinding:'prioritized autonomous bike endurance only; source role frames and all essential frequencies unchanged',reassessment:'same-source recovery and whole-week interactions required; priority does not establish capacity'};
}
