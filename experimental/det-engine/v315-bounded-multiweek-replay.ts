/**
 * DET V3.15 — bounded, deterministic full-horizon replanning.
 * Each attempt builds EVERY week anew; an early-week choice is therefore
 * revisable, unlike the V3.14 last-week-only repair. This is NOT exhaustive
 * cross-week backtracking and not an independent sporting approval.
 * The shared wall-clock and node budgets are hard ceilings.
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
export interface ReplayAttempt {
  target:Readonly<TriMinutes>;
  weeksBuilt:number;
  nodes:number;
  reason:string|null;
  strictRatiosMet:boolean;
  nativeConstraintsSatisfied:boolean;
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
export function constructDeterministicPlanWithBoundedReplays(
  athlete:PlanAthleteData,
  config:PlanConfig,
  limits:SearchLimits,
  contract:ExperimentalAssemblyContract,
):{result:EngineResult|null;evidence:ReplayEvidence}{
  const goal=normalizeRepairGoal(config.objective??'');
  const objective=goal==='half'?'703':goal==='ironman'?'IM':null;
  const fail=(verdict:ReplayEvidence['verdict'],rows:ReplayAttempt[],nodes:number,
    result:EngineResult|null)=>({result,evidence:{
      verdict,attempts:rows,totalNodes:nodes,experimentalOnly:true as const}});
  if(!objective||contract.requireFinalTriathlonMinuteRatios!==true||
     contract.requireStructuredPolarizationOnLoadWeeks!==true||
     contract.preferSourceBackedMultisportBalance!=='triathlon_targets'||
     !Number.isSafeInteger(limits.maxNodes)||limits.maxNodes<=0||
     !Number.isFinite(limits.maxMilliseconds)||limits.maxMilliseconds<=0){
    return fail('invalid_contract',[],0,null);
  }
  const started=performance.now();
  const rows:ReplayAttempt[]=[];
  let totalNodes=0;
  let last:EngineResult|null=null;
  for(let i=0;i<preset[objective].length;i++){
    const remainingMillis=limits.maxMilliseconds-(performance.now()-started);
    const remainingNodes=limits.maxNodes-totalNodes;
    // The underlying DFS increments its node counter *before* checking its
    // limit, so reserve one node per attempt against the GLOBAL budget.
    if(remainingMillis<=0||remainingNodes<2)break;
    const remainingAttempts=preset[objective].length-i;
    const currentLimits:SearchLimits={
      maxMilliseconds:remainingMillis,
      maxNodes:Math.max(1,Math.floor(remainingNodes/remainingAttempts)-1),
    };
    const target=preset[objective][i];
    const result=constructDeterministicPlan(athlete,config,currentLimits,{
      ...contract,ratioTargetPreference:target,
    });
    last=result;totalNodes+=result.nodes;
    const strictRatiosMet=result.technicallyConstructed&&
      result.issues.some(x=>x.code==='det_v314_final_load_ratio_selected')&&
      result.issues.some(x=>x.code==='det_multisport_minute_ratio_verified')&&
      !result.issues.some(x=>x.code==='det_multisport_minute_ratio_unverifiable'||
        x.code==='det_multisport_minute_ratio_out_of_bounds'||
        x.code==='det_multisport_minute_ratio_provably_out_of_bounds');
    rows.push({
      target,weeksBuilt:result.candidate?.weeks.length??0,
      nodes:result.nodes,reason:result.reason??null,strictRatiosMet,
      nativeConstraintsSatisfied:result.constraintsSatisfied,
      blockers:[...new Set(result.issues.filter(i=>
        ['blocking','error','critical'].includes(i.severity)).map(i=>i.code))],
    });
    if(strictRatiosMet){
      result.nodes=totalNodes;
      result.issues.push({code:'det_v315_full_horizon_replay_ratio_found',
        severity:'warning',message:JSON.stringify({
          selectedReplay:i+1,attempts:rows.length,totalNodes,
          nativeConstraintsSatisfied:result.constraintsSatisfied,
          realSourceDosesOnly:true,allPriorWeeksRebuilt:true,
        })});
      return fail(result.constraintsSatisfied?'all_gates_pass':
        'ratio_feasible_native_blockers_remain',rows,totalNodes,result);
    }
  }
  // The best observed prefix is NOT a valid candidate and must not escape
  // under an exhausted multiweek search.
  if(last){
    last.status='refused';last.technicallyConstructed=false;
    last.constraintsSatisfied=false;last.candidate=undefined;
    last.reason='v315_bounded_multiweek_replays_unresolved';
    last.nodes=totalNodes;
    last.issues.push({code:'det_v315_bounded_multiweek_replays_unresolved',
      severity:'blocking',message:JSON.stringify({
        attempted:rows.length,totalNodes,wallClockLimitMs:limits.maxMilliseconds,
        noGlobalImpossibilityClaim:true,
      })});
  }
  return fail('bounded_search_unresolved',rows,totalNodes,last);
}
