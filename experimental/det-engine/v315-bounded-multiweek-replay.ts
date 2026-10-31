/**
 * DET V3.15 — bounded, deterministic full-horizon replanning with source
 * no-good branches across earlier weeks.
 *
 * Every attempt invokes the unchanged full-plan builder and ALL native gates.
 * A branch excludes one source previously chosen in a specific earlier week:
 * this makes prior decisions revisable without altering approved session doses.
 * This is bounded lookback, NOT exhaustive global backtracking, and NEVER
 * a scientific or production attestation.
 */
import type {PlanAthleteData,PlanConfig} from '@/hooks/useAITrainingPlan';
import {normalizeRepairGoal} from '../../supabase/functions/_shared/repairSportingEquivalence';
import {constructDeterministicPlan,type ExperimentalAssemblyContract,
  type SearchLimits,type EngineResult} from './engine';
import type {TriMinutes} from './v312-triathlon-dose-trajectory';

const preset:Record<'703'|'IM',Readonly<TriMinutes>[]> = {
  '703':[
    {swim:.175,bike:.475,run:.35},
    {swim:.16,bike:.49,run:.35},
    {swim:.18,bike:.48,run:.34},
    {swim:.17,bike:.46,run:.37},
  ],
  IM:[
    {swim:.175,bike:.50,run:.325},
    {swim:.15,bike:.55,run:.30},
    {swim:.16,bike:.54,run:.30},
    {swim:.17,bike:.53,run:.30},
    {swim:.18,bike:.53,run:.29},
    {swim:.155,bike:.545,run:.30},
    {swim:.19,bike:.53,run:.28},
    {swim:.20,bike:.55,run:.25},
  ],
};
interface NoGood {week:number;sourceId:string}
interface ReplayState {
  targetIndex:number;
  excluded:readonly NoGood[];
}
export interface ReplayAttempt {
  target:Readonly<TriMinutes>;
  weeksBuilt:number;
  nodes:number;
  reason:string|null;
  strictRatiosMet:boolean;
  nativeConstraintsSatisfied:boolean;
  /** No-good alternatives from ACTUALLY selected earlier-week sources. */
  revisedWeeks?:number[];
  excludedSourceIds?:string[];
  /** These are review diagnostics, not permission to prescribe. */
  blockers:string[];
}
export interface ReplayEvidence {
  verdict:'ratio_feasible_native_blockers_remain'|'all_gates_pass'|
    'bounded_search_unresolved'|'invalid_contract';
  attempts:ReplayAttempt[];
  totalNodes:number;
  experimentalOnly:true;
}
const MAX_LOOKBACK_DEPTH=3;
const MAX_NEW_BRANCHES=2;
const stateKey=(s:ReplayState)=>s.targetIndex+'|'+s.excluded.map(
  e=>e.week+':'+e.sourceId).sort().join(',');

function strictlyVerifiedMinutes(result:EngineResult):boolean{
  return result.technicallyConstructed&&
    result.issues.some(x=>x.code==='det_v314_final_load_ratio_selected')&&
    result.issues.some(x=>x.code==='det_multisport_minute_ratio_verified')&&
    !result.issues.some(x=>
      x.code==='det_multisport_minute_ratio_unverifiable'||
      x.code==='det_multisport_minute_ratio_out_of_bounds'||
      x.code==='det_multisport_minute_ratio_provably_out_of_bounds');
}

export function constructDeterministicPlanWithBoundedReplays(
  athlete:PlanAthleteData,
  config:PlanConfig,
  limits:SearchLimits,
  contract:ExperimentalAssemblyContract,
):{result:EngineResult|null;evidence:ReplayEvidence}{
  const goal=normalizeRepairGoal(config.objective??'');
  const objective=goal==='half'?'703':goal==='ironman'?'IM':null;
  const finish=(verdict:ReplayEvidence['verdict'],rows:ReplayAttempt[],nodes:number,
    result:EngineResult|null)=>({result,evidence:{
      verdict,attempts:rows,totalNodes:nodes,experimentalOnly:true as const}});
  if(!objective||contract.requireFinalTriathlonMinuteRatios!==true||
     contract.requireStructuredPolarizationOnLoadWeeks!==true||
     contract.preferSourceBackedMultisportBalance!=='triathlon_targets'||
     !Number.isSafeInteger(limits.maxNodes)||limits.maxNodes<=0||
     !Number.isFinite(limits.maxMilliseconds)||limits.maxMilliseconds<=0){
    return finish('invalid_contract',[],0,null);
  }
  const started=performance.now();
  const rows:ReplayAttempt[]=[];
  const queue:ReplayState[]=preset[objective].map((_,targetIndex)=>({
    targetIndex,excluded:[],
  }));
  const seen=new Set(queue.map(stateKey));
  const maxAttempts=Math.min(24,Math.max(preset[objective].length+4,
    Math.floor(limits.maxNodes/750)));
  let totalNodes=0;
  let last:EngineResult|null=null;
  let firstRatio:{result:EngineResult;attempt:number}|null=null;

  while(queue.length&&rows.length<maxAttempts){
    const remainingMillis=limits.maxMilliseconds-(performance.now()-started);
    const remainingNodes=limits.maxNodes-totalNodes;
    if(remainingMillis<=0||remainingNodes<2)break;
    const state=queue.shift()!;
    // Divide remaining nodes among the queued alternatives. Reserve one
    // because the inner DFS increments before checking maxNodes.
    const remainingAttempts=Math.max(1,Math.min(queue.length+1,
      maxAttempts-rows.length));
    const perAttempt=Math.max(1,Math.floor(remainingNodes/remainingAttempts)-1);
    const exclusions=state.excluded;
    const target=preset[objective][state.targetIndex];
    const candidateFilter=contract.filterCandidate;
    const result=constructDeterministicPlan(athlete,config,{
      maxMilliseconds:remainingMillis,maxNodes:perAttempt,
    },{
      ...contract,ratioTargetPreference:target,
      // The strict multiweek wrapper cannot silently accept native phase warnings.
      requireStrictPeriodizationEvidence:true,
      filterCandidate:(card,context)=>
        candidateFilter?.(card,context)!==false &&
        !exclusions.some(x=>x.week===context.week&&
          x.sourceId===card.id&&
          ['swim','bike','run','brick'].includes(context.slot.sport)),
    });
    // A failing inner search can use at most perAttempt + 1 nodes.
    last=result;totalNodes+=result.nodes;
    const strictRatiosMet=strictlyVerifiedMinutes(result);
    rows.push({
      target,
      weeksBuilt:result.candidate?.weeks.length??
        new Set(result.trace.map(x=>x.week)).size,
      nodes:result.nodes,reason:result.reason??null,strictRatiosMet,
      nativeConstraintsSatisfied:result.constraintsSatisfied,
      revisedWeeks:[...new Set(exclusions.map(x=>x.week))].sort((a,b)=>a-b),
      excludedSourceIds:exclusions.map(x=>x.sourceId),
      blockers:[...new Set(result.issues.filter(i=>
        ['blocking','error','critical'].includes(i.severity)).map(i=>i.code))],
    });
    if(strictRatiosMet){
      if(result.constraintsSatisfied){
        result.nodes=totalNodes;
        result.issues.push({code:'det_v315_full_horizon_replay_ratio_found',
          severity:'warning',message:JSON.stringify({
            selectedReplay:rows.length,attempts:rows.length,totalNodes,
            nativeConstraintsSatisfied:true,realSourceDosesOnly:true,
            earlierWeekSourceChoicesRevisited:exclusions,
            independentSportingAttestation:false,
          })});
        return finish('all_gates_pass',rows,totalNodes,result);
      }
      if(!firstRatio)firstRatio={result,attempt:rows.length};
    }

    // Branch from the ACTUAL selected trace, not from invented candidate IDs.
    // Exclude only an earlier-week source; rerun every week from the start.
    // A source ban can make a slot impossible: the ordinary fail-closed
    // catalogue, recovery and native validators remain authoritative.
    if(exclusions.length>=MAX_LOOKBACK_DEPTH)continue;
    const selected=[...new Map(result.trace.filter(t=>
      Number.isInteger(t.week)&&t.week>=1&&
      ['swim','bike','run','brick'].includes(t.sport??'')&&
      t.week<config.weeksAvailable!&&t.id&&
      typeof t.duration==='number'&&t.duration>0&&
      !exclusions.some(x=>x.week===t.week&&x.sourceId===t.id)
    ).map(t=>[t.week+':'+t.id,t])).values()]
      .sort((a,b)=>b.week-a.week||a.id.localeCompare(b.id));
    const children:ReplayState[]=[];
    for(const trace of selected){
      if(children.length>=MAX_NEW_BRANCHES)break;
      const child:ReplayState={targetIndex:state.targetIndex,
        excluded:[...exclusions,{week:trace.week,sourceId:trace.id}]};
      const key=stateKey(child);
      if(seen.has(key))continue;
      seen.add(key);children.push(child);
    }
    // If this target already failed to assign a whole week, trying another
    // independently admissible RATIO TARGET is more useful than recursively
    // excluding unrelated earlier-week workouts. The IM budget-exhaustion
    // case still retries an actual earlier choice first: preserves the
    // previously observed cross-week recovery without wasting target sweeps.
    const exhaustedAtPriorChoice=result.reason==='search_budget_exhausted'||
      result.reason?.includes('budget_exhausted')===true;
    if(exhaustedAtPriorChoice)queue.unshift(...children);
    else queue.push(...children);
  }
  if(firstRatio){
    // A ratio-feasible but native-blocked plan is only diagnostic. Do not
    // change its sporting verdict or bypass any inherited blocker.
    const {result,attempt}=firstRatio;
    result.nodes=totalNodes;
    result.issues.push({code:'det_v315_full_horizon_replay_ratio_found',
      severity:'warning',message:JSON.stringify({
        selectedReplay:attempt,attempts:rows.length,totalNodes,
        nativeConstraintsSatisfied:false,
        independentSportingAttestation:false,
      })});
    return finish('ratio_feasible_native_blockers_remain',rows,totalNodes,result);
  }
  // Never return an incomplete prefix as if it were a usable plan.
  if(last){
    last.status='refused';last.technicallyConstructed=false;
    last.constraintsSatisfied=false;last.candidate=undefined;
    last.reason='v315_bounded_multiweek_replays_unresolved';
    last.nodes=totalNodes;
    last.issues.push({code:'det_v315_bounded_multiweek_replays_unresolved',
      severity:'blocking',message:JSON.stringify({
        attempted:rows.length,totalNodes,
        wallClockLimitMs:limits.maxMilliseconds,
        maxLookbackDepth:MAX_LOOKBACK_DEPTH,
        noGlobalImpossibilityClaim:true,
      })});
  }
  return finish('bounded_search_unresolved',rows,totalNodes,last);
}
