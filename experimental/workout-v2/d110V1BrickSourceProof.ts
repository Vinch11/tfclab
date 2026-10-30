/**
 * D1.10b: conservative certificate of a *planned*, source-derived V1 brick.
 * This is NOT the duration actually executed in training or a proof of
 * physiological dose. No interpolation or assumptions from another V1 ID.
 *
 * The only supported source is BRICK_STAGE1_INTRO. The published card's exact
 * two segment texts and bounds must be unchanged. For a 60min prescribed
 * session the unique nonnegative decomposition of 45–60min bike and
 * 15–20min run with total 60min is 45+15 and zero unallocated seconds.
 */
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import type { D14BrickComponents, D14RatioSession } from "./d14RatioEvidence";

type Source = {
  id:string;
  durationMin: readonly number[];
  structure: readonly {part:string;text:string}[];
};
export type D110BrickSplit =
 | {ok:true;sourceId:"BRICK_STAGE1_INTRO";prescribedTotalMin:60;
    components:D14BrickComponents;scope:"unique_planned_v1_components";
    executionAttested:false;individualDoseApproved:false}
 | {ok:false;reasons:string[]};

const EXACT_TEXTS=[
  {part:"Bike",text:"45–60' Z2 facile"},
  {part:"Run",text:"15–20' Z1 très facile (focus sensation transition)"},
] as const;
export function isD110Stage1SourceUnchanged(source:Source | undefined):boolean {
  return source?.id==="BRICK_STAGE1_INTRO" &&
    source.durationMin.length===2 &&
    source.durationMin[0]===60 && source.durationMin[1]===90 &&
    source.structure.length===2 &&
    source.structure.every((seg,i)=>seg.part===EXACT_TEXTS[i].part &&
      seg.text===EXACT_TEXTS[i].text);
}
export function deriveD110PlannedStage1Brick(
  catalogId:string|null, prescribedDurationMin:number,
):D110BrickSplit {
  if(catalogId!=="BRICK_STAGE1_INTRO")
    return {ok:false,reasons:["not_stage1_source"]};
  const source=WorkoutLibrary.find(w=>w.id===catalogId);
  if(!isD110Stage1SourceUnchanged(source))
    return {ok:false,reasons:["historical_card_drifted_or_missing"]};
  if(prescribedDurationMin!==60)
    return {ok:false,reasons:["total_duration_does_not_uniquely_determine_components"]};
  return {
    ok:true,sourceId:"BRICK_STAGE1_INTRO",prescribedTotalMin:60,
    components:{bikeMin:45,runMin:15,transitionMin:0,verified:true},
    scope:"unique_planned_v1_components",
    executionAttested:false,individualDoseApproved:false,
  };
}
/**
 * Strict cohort adapter: any unknown V1 brick or source drift makes the
 * whole result unverified. This avoids mixing exact and guessed splits.
 */
export function attachD110SourceBrickProof(
  sessions:readonly {sport:string;id:string|null;minutes:number}[],
):{ok:true;sessions:D14RatioSession[];count:number}|{ok:false;reasons:string[]} {
  const converted:D14RatioSession[]=[];
  let count=0;
  for(const session of sessions){
    if(session.sport!=="brick"){
      converted.push({sport:session.sport,durationMin:session.minutes});
      continue;
    }
    const proof=deriveD110PlannedStage1Brick(session.id,session.minutes);
    if(proof.ok===false)return {ok:false,reasons:proof.reasons};
    converted.push({sport:"brick",durationMin:session.minutes,
      brickComponents:proof.components});
    count++;
  }
  return {ok:true,sessions:converted,count};
}
