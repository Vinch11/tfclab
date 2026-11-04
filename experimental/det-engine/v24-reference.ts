/** Boundary contract for a separately reviewed reference; never derives CE from an economy score. */
export function assessRunReferenceV24(e:any){
 const reasons:string[]=[];
 if(!e||e.state==='absent')reasons.push('run_reference_absent');
 else{
  if(e.unit!=='km/h'||!Number.isFinite(e.speed)||e.speed<=0)reasons.push('explicit_positive_speed_and_unit_required');
  if(!e.sourceRef||!(/^[a-f0-9]{64}$/i.test(e.sourceHash??''))||!Number.isFinite(Date.parse(e.observedAt))||!(/^[a-f0-9]{64}$/i.test(e.rawInputHash??'')))reasons.push('reference_provenance_incomplete');
  if(e.state!=='corrected_candidate')reasons.push('reference_uncertain');
  if(e.conflictUnresolved)reasons.push('unresolved_reference_conflict');
 }
 return{status:reasons.length?'hold_reference':'candidate_reference_for_coach_review',candidateSpeedKmh:reasons.length?null:e.speed,reasons,productionReferenceReplaced:false,assumedMerged:false,individualDoseApproved:false,capacityIncreased:false};
}
