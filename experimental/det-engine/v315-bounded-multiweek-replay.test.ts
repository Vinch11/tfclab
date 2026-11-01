/** Fail-closed V3.15 bounded lookback: tests orchestration, not sporting approval. */
import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {PlanAthleteData,PlanConfig} from '@/hooks/useAITrainingPlan';
import {constructDeterministicPlanWithBoundedReplays} from './v315-bounded-multiweek-replay';
import type {EngineResult,ExperimentalAssemblyContract} from './engine';

const planner=vi.hoisted(()=>vi.fn());
vi.mock('./engine',()=>({constructDeterministicPlan:planner}));

const athlete={} as PlanAthleteData;
const config={objective:'IM',weeksAvailable:16} as PlanConfig;
const contract={
  id:'synthetic-v315',
  adapt:()=>{},
  preferSourceBackedMultisportBalance:'triathlon_targets',
  requireFinalTriathlonMinuteRatios:true,
  requireStructuredPolarizationOnLoadWeeks:true,
} satisfies ExperimentalAssemblyContract;
const sessionSource='V3P_BIKE_002';
function observed(
  state:'unresolved'|'ratios_only'|'fully_valid',
  trace:EngineResult['trace']=[],
):EngineResult {
  const found=state!=='unresolved';
  return {
    status:found?'candidate':'refused',
    reason:found?undefined:'final_week_ratio_unresolved',
    technicallyConstructed:found,
    constraintsSatisfied:state==='fully_valid',
    sportingRelevance:'not_attested',humanReviewRequired:true,
    nodes:2,trace,limiterPriorities:[],
    candidate:found?({weeks:Array.from({length:16},(_,index)=>({
      weekNumber:index+1,theme:'QA',phase:'QA',sessions:[],
    }))} as EngineResult['candidate']):undefined,
    issues:state==='unresolved'?
      [{code:'det_v314_final_load_ratio_search_unresolved',severity:'blocking'}]:
      [{code:'det_v314_final_load_ratio_selected',severity:'warning'},
       {code:'det_multisport_minute_ratio_verified',severity:'warning'},
       ...(state==='ratios_only'?[{
         code:'native_deload_not_met',severity:'blocking',
       }]:[])],
  };
}
const priorTrace:EngineResult['trace']=[{
  week:2,day:'mardi',id:sessionSource,sport:'bike',duration:90,
  intent:'aerobic',reason:'source selected in earlier week',
}];

beforeEach(()=>planner.mockReset());

describe('DET V3.15 — bounded cross-week no-good replay',()=>{
  it('refuses invalid contract without attempting planning',()=>{
    const out=constructDeterministicPlanWithBoundedReplays(
      athlete,config,{maxNodes:100,maxMilliseconds:1000},{
        ...contract,requireFinalTriathlonMinuteRatios:undefined,
      });
    expect(out.evidence.verdict).toBe('invalid_contract');
    expect(planner).not.toHaveBeenCalled();
  });

  it('revisits a real earlier-week source and keeps all original gates active',()=>{
    const isBanned=(c:ExperimentalAssemblyContract|undefined):boolean=>{
      const filter=c?.filterCandidate;
      if(!filter)return false;
      const card={id:sessionSource} as Parameters<typeof filter>[0];
      const context={week:2,dayIndex:1,slot:{sport:'bike'}} as
        Parameters<typeof filter>[1];
      return !filter(card,context);
    };
    planner.mockImplementation((
      _a:PlanAthleteData,_c:PlanConfig,_b:unknown,c:ExperimentalAssemblyContract,
    )=>{
      if(isBanned(c))return observed('fully_valid');
      const unresolved=observed('unresolved',priorTrace);
      unresolved.reason='search_budget_exhausted';
      return unresolved;
    });
    const out=constructDeterministicPlanWithBoundedReplays(
      athlete,config,{maxNodes:160,maxMilliseconds:60000},contract);
    expect(out.evidence.verdict).toBe('all_gates_pass');
    expect(out.result?.constraintsSatisfied).toBe(true);
    expect(out.evidence.attempts[0].revisedWeeks).toEqual([]);
    // Budget-exhausted week: revise a previously selected source promptly.
    expect(out.evidence.attempts[1].revisedWeeks).toContain(2);
    expect(out.evidence.attempts.some(a=>
      a.revisedWeeks?.includes(2)&&a.excludedSourceIds?.includes(sessionSource))).toBe(true);
    expect(out.evidence.totalNodes).toBeLessThanOrEqual(160);
    expect(planner.mock.calls.length).toBeGreaterThan(1);
    expect(planner.mock.calls.every(call=>
      (call[3] as ExperimentalAssemblyContract).requireStrictPeriodizationEvidence===true))
      .toBe(true);
  });

  it('tries a different admissible ratio target before pointless source exclusions',()=>{
    planner.mockImplementation((
      _a:PlanAthleteData,_c:PlanConfig,_limits:unknown,c:ExperimentalAssemblyContract,
    )=>{
      if(c?.ratioTargetPreference?.swim===.16)return observed('fully_valid');
      const failed=observed('unresolved',priorTrace);
      failed.reason='no_catalogue_assignment_week_9';
      return failed;
    });
    const out=constructDeterministicPlanWithBoundedReplays(
      athlete,config,{maxNodes:160,maxMilliseconds:60000},contract);
    expect(out.evidence.verdict).toBe('all_gates_pass');
    // IM presets are ordered .175, .15, .16: neither of the first
    // two failed targets may trigger an irrelevant earlier-week exclusion.
    expect(out.evidence.attempts).toHaveLength(3);
    expect(out.evidence.attempts[0].target.swim).toBe(.175);
    expect(out.evidence.attempts[1].target.swim).toBe(.15);
    expect(out.evidence.attempts[2].target.swim).toBe(.16);
    expect(out.evidence.attempts.every(a=>a.revisedWeeks?.length===0)).toBe(true);
  });
  it.each(['703','IM'] as const)(
    '%s repeats the same bounded target search in the same order without changing evidence',
    objective=>{
      planner.mockImplementation((
        _a:PlanAthleteData,_c:PlanConfig,_limits:unknown,c:ExperimentalAssemblyContract,
      )=>{
        if(c?.ratioTargetPreference?.swim===.16)return observed('fully_valid');
        const failed=observed('unresolved',priorTrace);
        failed.reason='no_catalogue_assignment_week_9';
        return failed;
      });
      const run=()=>constructDeterministicPlanWithBoundedReplays(
        athlete,{...config,objective},
        {maxNodes:160,maxMilliseconds:60000},contract);
      const first=run();
      const second=run();
      expect(first.evidence.verdict).toBe('all_gates_pass');
      expect(second.evidence).toEqual(first.evidence);
      expect(second.result?.candidate).toEqual(first.result?.candidate);
      expect(second.result?.constraintsSatisfied).toBe(true);
      expect(first.evidence.attempts.every(a=>a.revisedWeeks?.length===0)).toBe(true);
      expect(first.evidence.totalNodes).toBeLessThanOrEqual(160);
    },
  );
  it('sweeps all constrained 70.3 ratio targets before any speculative ban',()=>{
    const early:EngineResult['trace']=Array.from({length:10},(_,i)=>({
      week:i+1,day:'mardi',id:i===9?sessionSource:'V3P_BIKE_017',
      sport:'bike',duration:65,intent:'aerobic',
      reason:'selected reviewed source in a real earlier week',
    }));
    const hasWeekTenBan=(c:ExperimentalAssemblyContract):boolean=>{
      const filter=c.filterCandidate;
      if(!filter)return false;
      return !filter({id:sessionSource} as Parameters<typeof filter>[0],{
        week:10,dayIndex:1,slot:{sport:'bike'},
      } as Parameters<typeof filter>[1]);
    };
    planner.mockImplementation((
      _a:PlanAthleteData,_c:PlanConfig,_b:unknown,c:ExperimentalAssemblyContract,
    )=>{
      if(hasWeekTenBan(c))return observed('fully_valid');
      const unresolved=observed('unresolved',early);
      unresolved.reason='no_catalogue_assignment_week_11';
      return unresolved;
    });
    const out=constructDeterministicPlanWithBoundedReplays(
      athlete,{...config,objective:'703'},
      {maxNodes:300,maxMilliseconds:60000},{
        ...contract,requireLorangQualityBeforeFinalValidation:true,
      });
    expect(out.evidence.verdict).toBe('all_gates_pass');
    expect(out.evidence.attempts.slice(0,4).map(a=>a.target.swim))
      .toEqual([.175,.16,.18,.17]);
    expect(out.evidence.attempts.slice(0,4)
      .every(a=>a.revisedWeeks?.length===0)).toBe(true);
    expect(out.evidence.attempts[4].revisedWeeks).toEqual([10]);
    expect(out.evidence.attempts[4].excludedSourceIds).toEqual([sessionSource]);
    expect(planner.mock.calls.every(call=>
      (call[3] as ExperimentalAssemblyContract).requireStrictPeriodizationEvidence===true))
      .toBe(true);
    expect(out.result?.constraintsSatisfied).toBe(true);
  });

  it('does not broaden constrained 70.3 bans to unrelated early weeks',()=>{
    const trace:EngineResult['trace']=Array.from({length:10},(_,i)=>({
      week:i+1,day:'mardi',id:'V3P_BIKE_'+String(i+1).padStart(3,'0'),
      sport:'bike',duration:65,intent:'aerobic',reason:'reviewed',
    }));
    planner.mockImplementation(()=>({
      ...observed('unresolved',trace),reason:'no_catalogue_assignment_week_11',
    }));
    const out=constructDeterministicPlanWithBoundedReplays(
      athlete,{...config,objective:'703'},
      {maxNodes:160,maxMilliseconds:60000},{
        ...contract,requireLorangQualityBeforeFinalValidation:true,
      });
    expect(out.evidence.verdict).toBe('bounded_search_unresolved');
    for(const row of out.evidence.attempts){
      expect(row.revisedWeeks?.every(week=>week>=8)).toBe(true);
    }
    expect(out.result?.constraintsSatisfied).toBe(false);
    expect(out.result?.candidate).toBeUndefined();
  });

  it('does not convert exact sport ratios into a false native sporting pass',()=>{
    planner.mockImplementation(()=>observed('ratios_only'));
    const out=constructDeterministicPlanWithBoundedReplays(
      athlete,config,{maxNodes:200,maxMilliseconds:60000},contract);
    expect(out.evidence.verdict).toBe('ratio_feasible_native_blockers_remain');
    expect(out.result?.constraintsSatisfied).toBe(false);
    expect(out.result?.issues.some(i=>i.code==='native_deload_not_met')).toBe(true);
    expect(out.result?.humanReviewRequired).toBe(true);
  });

  it('exhausts a shared node budget and refuses every incomplete prefix',()=>{
    planner.mockImplementation(()=>observed('unresolved',priorTrace));
    const out=constructDeterministicPlanWithBoundedReplays(
      athlete,config,{maxNodes:16,maxMilliseconds:60000},contract);
    expect(out.evidence.totalNodes).toBeLessThanOrEqual(16);
    expect(out.evidence.verdict).toBe('bounded_search_unresolved');
    expect(out.result?.candidate).toBeUndefined();
    expect(out.result?.technicallyConstructed).toBe(false);
    expect(out.result?.constraintsSatisfied).toBe(false);
    expect(out.result?.issues.some(i=>
      i.code==='det_v315_bounded_multiweek_replays_unresolved')).toBe(true);
  });
});
