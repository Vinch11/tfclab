import{prospectivePool}from'./v14-sources';import type{V10Profile}from'./v10-profiles';
/** Bridge existing TFCL lever IDs to catalogue families. It never invents a dose or upgrades an unknown. */
const FAMILIES:Record<string,string[]>={vo2_intervals:['vo2'],threshold_work:['seuil'],z2_volume:['endurance_fondamentale'],force_max:['force']};
export function deriveV22StimulusRequests(prepared:any,p:V10Profile){const pool=prospectivePool(p,1);return prepared.trace.decision.levers.map((lever:any)=>{
 const families=FAMILIES[lever.id]??[],reasons:string[]=[];const tte=prepared.diagnostic.effectifs.tte;
 if(lever.id==='z2_volume'&&tte.source==='unknown')reasons.push('TTE_UNKNOWN_IS_NOT_AN_OBSERVED_ZERO_OR_PROVEN_DURABILITY_DEFICIT');
 if(lever.id==='vo2_intervals'&&!(prepared.athleteData.vo2max>0))reasons.push('AEROBIC_REFERENCE_MISSING');
 if(['vo2_intervals','threshold_work'].includes(lever.id))reasons.push('SOURCE_SPECIFIC_INTERVAL_TOLERANCE_NOT_DOCUMENTED');
 if(lever.id==='vo2_intervals'&&prepared.trace.decision.prohibitions.some((x:any)=>x.id==='vo2_heavy_blocks'))reasons.push('HISTORICAL_VO2_HEAVY_BLOCK_PROHIBITION_RETAINED');
 if(lever.id==='force_max')reasons.push('STRENGTH_EXERCISE_COMPETENCE_AND_LOADING_NOT_DOCUMENTED');
 if(!families.length)reasons.push('EXPLICIT_LEVER_FAMILY_BRIDGE_MISSING');
 return{leverUnchanged:lever,families,catalogueOfferIds:pool.filter(c=>families.includes(c.intentFamily)).map(c=>c.id),status:reasons.some(r=>r.startsWith('TTE_UNKNOWN')||r==='AEROBIC_REFERENCE_MISSING')?'refused_missing_physiological_evidence':reasons.length?'deferred_candidate_requires_coach':'candidate_foundation_request',reasons,rawTFCLPrescriptionTextIsNotAnAdoptedQuota:true,source:'existing TFCL decision + explicit experimental family bridge',individualDose:null,automaticApproval:false};
 });}
