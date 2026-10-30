/** V2 migration inventory — READ ONLY, no inferred physiological evidence.
 * Enumerate actual V1 library at runtime (including enriched modules) so an
 * expansion decision is based on coverage and provenance, not a guessed count.
 */
import {WorkoutLibrary} from "@/lib/workoutLibrary";
import {WORKOUT_V2_MODELS} from "./catalog";

export type V2MigrationAudit = {
  v1Total:number; v1UniqueIds:number; v1DuplicateIds:string[];
  v1DocumentedIntent:number; v1MissingIntent:number;
  bySport:Array<{sport:string;total:number;documented:number;missing:number}>;
  byIntent:Array<{intent:string;count:number}>;
  v2ModelCount:number; v2BySport:Array<{sport:string;count:number}>;
  missingIntentSample:Array<{id:string;sport:string;cat:string}>;
  autoMigrated:0; approved:0;
};
export function auditV2Migration():V2MigrationAudit {
  const counts=new Map<string,number>();
  const bySport=new Map<string,{total:number;documented:number;missing:number}>();
  const byIntent=new Map<string,number>();
  const missingIntentSample:Array<{id:string;sport:string;cat:string}>=[];
  let documented=0;
  for(const card of WorkoutLibrary){
    counts.set(card.id,(counts.get(card.id)??0)+1);
    const sport=String(card.sport);
    const record=bySport.get(sport)??{total:0,documented:0,missing:0};
    record.total++;
    if(card.physiology?.primary && card.physiology.rationale?.trim()){
      documented++;
      record.documented++;
      byIntent.set(card.physiology.primary,(byIntent.get(card.physiology.primary)??0)+1);
    }else{
      record.missing++;
      if(missingIntentSample.length<30)missingIntentSample.push({id:card.id,sport,cat:String(card.cat)});
    }
    bySport.set(sport,record);
  }
  const models=new Map<string,number>();
  for(const model of WORKOUT_V2_MODELS)models.set(model.sport,(models.get(model.sport)??0)+1);
  const ordered=<T extends {sport:string}>(rows:T[])=>rows.sort((a,b)=>a.sport.localeCompare(b.sport));
  return {
    v1Total:WorkoutLibrary.length,
    v1UniqueIds:counts.size,
    v1DuplicateIds:[...counts.entries()].filter(([,n])=>n>1).map(([id])=>id).sort(),
    v1DocumentedIntent:documented,
    v1MissingIntent:WorkoutLibrary.length-documented,
    bySport:ordered([...bySport.entries()].map(([sport,c])=>({sport,...c}))),
    byIntent:[...byIntent.entries()].map(([intent,count])=>({intent,count})).sort((a,b)=>a.intent.localeCompare(b.intent)),
    v2ModelCount:WORKOUT_V2_MODELS.length,
    v2BySport:ordered([...models.entries()].map(([sport,count])=>({sport,count}))),
    missingIntentSample,
    autoMigrated:0,approved:0,
  };
}
