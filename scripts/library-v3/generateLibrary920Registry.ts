/** Offline engineering register. This generator never creates a human review. */
import { writeFileSync } from 'node:fs';
import raw from './library920Candidates.json';
import { fingerprintV3SportingSource, recomputeSourceBlockers } from './sportingQualification800';
import type { V3Block, V3Workout, V3Leaf } from './catalogueRuntime';
const leaves=(bs:V3Block[]):V3Leaf[]=>bs.flatMap(b=>b.kind==='repeat'?leaves(b.steps):[b]);
const contentReservations:Record<string,string[]>={
 // The original means Sprint triathlon: 5 x 1000 m at 5 km race pace.
 // Its earlier rewrite instead prescribes 5 x 10 s alactic bursts. Keep
 // that known content discrepancy out of selection until it is reauthored.
 V3P_RUN_819:['source_5k_race_intervals_rewritten_as_alactic_bursts'],
};
const records=(raw.workouts as unknown as V3Workout[]).map(w=>{
 const blockers=[...recomputeSourceBlockers(w),...(contentReservations[w.id]??[])];
 return {id:w.id,sport:w.sport,sourceFingerprint:fingerprintV3SportingSource(w),
  sourceStatus:blockers.length?'source_blocked':'source_prequalified_pending_individual_review',
  reviewOrigin:'same_author_offline_engineering_checks_not_independent_review',originReviewFingerprint:null,
  sourceBlockers:blockers,primaryIntent:w.primaryIntent,primaryDomain:w.primaryDomain,
  limiterKeys:w.prescription.physiologicalIntent.limiterKeys,mainDomainIds:[...new Set(leaves(w.blocks).filter(b=>b.role==='main').map(b=>b.domain))],
  minimumLevel:w.minimumLevel,phases:w.phase,minimumRecoveryHours:w.minimumRecoveryHours,
  prerequisites:w.prerequisites,contraindications:w.contraindications,equipment:[],
  humanSportingApproved:false,scientificSessionValidated:false,athleteApproved:false};
});
writeFileSync('scripts/library-v3/library920EngineeringRegistry.json',JSON.stringify({
 schemaVersion:'tfcl.library920.engineering.v1',notIndependentScientificReview:true,records
},null,2)+'\n');
console.log(JSON.stringify({registered:records.length,engineeringEligible:records.filter(r=>!r.sourceBlockers.length).length,
 blockers:records.filter(r=>r.sourceBlockers.length).reduce((out,r)=>{for(const b of r.sourceBlockers)out[b]=(out[b]??0)+1;return out;},{} as Record<string,number>)}));
