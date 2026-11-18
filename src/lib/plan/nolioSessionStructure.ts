/**
 * Export the actual plan prescription. A library recipe is only a fallback when
 * the occurrence has no text; it must never replace a coach/AI dose silently.
 */
import type { WorkoutStructurePart } from "@/types/workoutLibrary";
import { hasDurationRange, resolveSessionDurationRanges } from "./resolveDurationRanges";
import { cleanPlanText } from "./planText";
import { prescriptionPartsFromText, firstDurationSeconds } from "../../../supabase/functions/_shared/nolioPrescription";

export function structureFromSessionText(details:string|null|undefined):WorkoutStructurePart[]|null {
  if(!details?.trim())return null;
  const parts=prescriptionPartsFromText(cleanPlanText(details));
  return parts.length?parts:null;
}
export interface NolioStructureInput {details?:string|null;durationMin?:number;sport?:string|null;isRest?:boolean;phase?:string}
export function nolioStructureForSession(s:NolioStructureInput,libStructure?:WorkoutStructurePart[]|null):WorkoutStructurePart[]|null {
  if(s.isRest)return null;
  const raw=cleanPlanText(s.details??"").trim();
  if(raw){
    // Only a continuous duration range can be distributed against the total.
    // An interval/recovery range needs an explicit choice, not a generic rounding.
    const resolved=!/\d+\s*[x×]/i.test(raw)
      ?resolveSessionDurationRanges({details:raw,durationMin:s.durationMin??0,sport:s.sport??undefined,phase:s.phase})
      :null;
    const parts=structureFromSessionText(resolved?.details??raw);
    if(parts && parts.some(p=>firstDurationSeconds(p.text)!==null || /\d+\s*m\b|\d+\s*km\b/i.test(p.text)))return parts;
    return null;
  }
  if(libStructure?.length&&!libStructure.some(p=>hasDurationRange(p.text)))
    return libStructure.map(p=>({...p,zones:[...p.zones]}));
  return null;
}
