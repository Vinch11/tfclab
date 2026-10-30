/** Candidate mapping evidence for V1 -> V2. This is NOT migration or replacement.
 * Only V1 cards with curator-supplied physiology and literal V2 sport/intent match
 * are considered; compatible dose and structure remain unverified.
 */
import {WorkoutLibrary} from "@/lib/workoutLibrary";
import {WORKOUT_V2_EXTENDED_CANDIDATES} from "./v2RecoveryExtension";
import {V2_REVIEWED_SOURCE_EVIDENCE} from "./v2ReviewedSourceEvidence";
const normalizedSport:Readonly<Record<string,string>>={
  cyclisme:"bike",course:"run",natation:"swim",renforcement:"strength",
  strength:"strength",brick:"brick",trail:"trail",
};
export function proposeV2SourceFamilies(){
  return WorkoutLibrary.map(source=>{
    const physiology=source.physiology;
    const reviewed=V2_REVIEWED_SOURCE_EVIDENCE[source.id];
    const matchingSource=reviewed && source.structure.some(s=>s.part==="Main"&&s.text.includes(reviewed.sourceMainExcerpt));
    const intent=physiology?.primary??(matchingSource?reviewed.intent:undefined);
    const rationale=physiology?.rationale??(matchingSource?reviewed.reason:undefined);
    const hasEvidence=!!intent && !!rationale?.trim();
    const sport=normalizedSport[String(source.sport)]??null;
    const matches=hasEvidence && sport
      ?WORKOUT_V2_EXTENDED_CANDIDATES.filter(m=>m.sport===sport&&m.intent===intent).map(m=>m.id)
      :[];
    return {
      sourceId:source.id,sourceSport:String(source.sport),v2Sport:sport,
      sourceIntent:hasEvidence?intent:null,sourceRationale:hasEvidence?rationale:null,
      candidateFamilyIds:matches,
      status:!hasEvidence?"needs_metadata" as const:
        !sport?"needs_sport_review" as const:
        matches.length?"candidate_structure_and_dose_review" as const:"missing_v2_family" as const,
      migrated:false as const,coachApproved:false as const,
    };
  });
}
export function v2SourceMappingSummary(){
  const rows=proposeV2SourceFamilies();
  const count=(status:typeof rows[number]["status"])=>rows.filter(r=>r.status===status).length;
  return {total:rows.length,needsMetadata:count("needs_metadata"),
    needsSportReview:count("needs_sport_review"),
    missingFamily:count("missing_v2_family"),
    candidateForReview:count("candidate_structure_and_dose_review"),
    candidates:rows.filter(r=>r.candidateFamilyIds.length>0).map(r=>({
      id:r.sourceId,intent:r.sourceIntent,models:r.candidateFamilyIds,
    })),migrated:0 as const,approved:0 as const};
}
