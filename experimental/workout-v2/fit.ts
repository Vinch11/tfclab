/**
 * Deterministic exact-duration fitter for isolated Workout V2 CANDIDATES.
 * Explicitly NOT a plan generator, fatigue model, approval or Nolio adapter.
 *
 * The engine changes only safe-by-construction parameter KNOBS, NEVER intensity,
 * objective, phase, training level, prohibited conditions or recovery ratios.
 * Changing a knob remains a coach-review operation, not a validated dose.
 */
import { WORKOUT_V2_MODELS, type RecipeParameter } from "./catalog";
import { instantiateWorkoutV2, type WorkoutV2Candidate, type WorkoutV2Input, type WorkoutV2Result } from "./instantiate";

export type FitResult =
  | { ok:true; candidate:WorkoutV2Candidate; attempts:number; selected:Partial<Record<RecipeParameter,number>> }
  | { ok:false; reasons:string[]; attempts:number };

const knobsByMode: Record<(typeof WORKOUT_V2_MODELS)[number]["mode"], RecipeParameter[]> = {
  steady:["mainSec"],
  runwalk:["repeats","workSec"],
  intervals:["repeats","workSec"],
  swim_intervals:["repeats","swimRepDistanceM"],
  brick:["bikeSec"],
  strength:["sets"],
};
const MAX_CANDIDATES=3000;
function options(min:number,max:number,step:number):number[] {
  if(!Number.isSafeInteger(min)||!Number.isSafeInteger(max)||!Number.isSafeInteger(step)||
      step<=0 || max<min) return [];
  const values:number[]=[];
  for(let n=min;n<=max && values.length<=MAX_CANDIDATES;n+=step) values.push(n);
  return values;
}
export function fitWorkoutV2ToDuration(
  modelId:string,
  input:WorkoutV2Input,
  targetSec:number,
):FitResult {
  if(!Number.isSafeInteger(targetSec)||targetSec<=0) return {ok:false,reasons:["invalid_target_seconds"],attempts:0};
  const model=WORKOUT_V2_MODELS.find(m=>m.id===modelId);
  if(!model)return {ok:false,reasons:["unknown_model"],attempts:0};
  // Gate first: never search while a required profile, phase or anchor is invalid.
  const first=instantiateWorkoutV2(modelId,{...input,maxDurationSec:undefined});
  if(first.ok===false)return {ok:false,reasons:first.reasons,attempts:0};
  if(input.maxDurationSec!==undefined && targetSec>input.maxDurationSec)
    return {ok:false,reasons:["time_budget_exceeded"],attempts:0};
  const keys=knobsByMode[model.mode].filter(k=>input.parameters?.[k]===undefined);
  const ranges=keys.map(key=>({key,bound:model.params[key]!}));
  const values=ranges.map(({bound})=>options(bound.min,bound.max,bound.step));
  if(values.some(v=>v.length===0))return {ok:false,reasons:["invalid_parameter_bounds"],attempts:0};
  let attempts=0;
  let winner:WorkoutV2Candidate|null=null, bestCost=Infinity, bestKey="";
  const candidateParam={...input.parameters} as Partial<Record<RecipeParameter,number>>;
  function inspect() {
    if(attempts>=MAX_CANDIDATES)return;
    attempts++;
    const result:WorkoutV2Result=instantiateWorkoutV2(modelId,{...input,parameters:candidateParam,maxDurationSec:undefined});
    if(!result.ok || result.candidate.plannedDurationSec!==targetSec)return;
    const cost=ranges.reduce((sum,{key,bound})=>sum+Math.abs((candidateParam[key]??bound.default)-bound.default)/Math.max(1,bound.max-bound.min),0);
    const tie=JSON.stringify(ranges.map(({key})=>candidateParam[key]));
    if(cost<bestCost || (cost===bestCost && tie<bestKey)) {
      winner=result.candidate;bestCost=cost;bestKey=tie;
    }
  }
  function enumerate(index:number) {
    if(attempts>=MAX_CANDIDATES)return;
    if(index===ranges.length){inspect();return;}
    const key=ranges[index].key;
    for(const value of values[index]){
      candidateParam[key]=value;
      enumerate(index+1);
      if(attempts>=MAX_CANDIDATES)break;
    }
  }
  enumerate(0);
  if(!winner)return {ok:false,reasons:attempts>=MAX_CANDIDATES?["search_budget_exhausted_without_exact_fit"]:["no_exact_recipe_within_declared_knobs"],attempts};
  // Only deliver a candidate, NEVER mark it as approved or auto-insertable.
  return {ok:true,candidate:winner,attempts,selected:Object.fromEntries(ranges.map(({key})=>[key,winner!.parameters[key]!]))};
}
