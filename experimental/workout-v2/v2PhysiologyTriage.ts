/** V1 whole-library physiology TRIAGE. All 920 records are reviewed by
 * deterministic structure-based rules, but suggestions are not attestations.
 * Never writes physiology metadata or admits a card to the planner.
 */
import {WorkoutLibrary} from "@/lib/workoutLibrary";
import type {LibraryWorkout, PhysiologicalIntent} from "@/types/workoutLibrary";

type Triage = {
  id:string;sport:string;status:"documented"|"candidate_review"|"conflicting_evidence"|"insufficient_evidence";
  suggestedIntent:PhysiologicalIntent|null;witness:string[];
  limits:string[];reviewRequired:true;autoApproved:false;
};
const zoning=(s:string)=>s.toUpperCase().replace(/\s+/g,"");
function triageCard(card:LibraryWorkout):Triage{
  const base={id:card.id,sport:String(card.sport),reviewRequired:true as const,
    autoApproved:false as const};
  if(card.physiology?.primary && card.physiology.rationale?.trim())
    return {...base,status:"documented" as const,suggestedIntent:card.physiology.primary,
      witness:["Existing curated rationale: "+card.physiology.rationale],limits:[]};
  const main=card.structure.filter(p=>/^(main|principal|corps)/i.test(p.part.trim()));
  const zones=[...new Set(main.flatMap(p=>p.zones.map(zoning)))].sort();
  const witness=[`Main blocks: ${main.length}`,`Main zones: ${zones.join(",")||"absent"}`,
    `Prescribed duration: ${card.durationMin.join("-")} min`];
  const limits:string[]=[];
  if(!main.length || !zones.length)limits.push("main_block_or_zone_missing");
  if(main.length>1)limits.push("multiple_main_blocks_require_review");
  if(card.wbalProfile?.blocks?.length)limits.push("structured_intervals_require_review");
  if(card.structure.some(p=>p.zones.some(z=>/Z[3456]|VO2|SPRINT|MAX/i.test(z))))
    limits.push("high_intensity_or_mixed_zone_present");
  // Pure Z1 of a single Main block allows a *recovery hypothesis* only.
  // Zone Z1 does not prove below LT1 nor that the session is clinically safe.
  if(main.length===1 && zones.length===1 && zones[0]==="Z1" &&
     !limits.some(x=>x==="high_intensity_or_mixed_zone_present")){
    return {...base,status:"candidate_review" as const,suggestedIntent:"recovery" as const,
      witness,limits:["Z1 alone does not prove recovery purpose","coach must verify entire chronology"]};
  }
  if(limits.some(x=>x==="high_intensity_or_mixed_zone_present") && zones.includes("Z1"))
    return {...base,status:"conflicting_evidence" as const,suggestedIntent:null,witness,limits};
  return {...base,status:"insufficient_evidence" as const,suggestedIntent:null,witness,limits};
}
export function auditV2PhysiologyTriage(){
 const rows: Triage[]=WorkoutLibrary.map(triageCard);
 const byStatus=Object.fromEntries(["documented","candidate_review","conflicting_evidence","insufficient_evidence"]
   .map(status=>[status,rows.filter(r=>r.status===status).length]));
 return {total:rows.length,byStatus,rows,autoApproved:0 as const};
}
