/** Literal non-renewable limits. No remote service, timer-based restart, or credit estimate. */
export function assertBudgetContract(mission,cycle,contract,now=Date.now()){
 const start=Date.parse(contract.startedAt),deadline=Date.parse(contract.hardDeadline),cstart=Date.parse(cycle.startedAt),cend=Date.parse(cycle.deadline);
 if(![start,deadline,cstart,cend,now].every(Number.isFinite)||deadline-start!==7200000||contract.maxCycles!==2||contract.maxCycleSeconds!==3600||contract.automaticRenewal!==false)throw Error('V19_INVALID_NONRENEWABLE_BUDGET');
 if(mission.startedAt!==contract.startedAt||mission.hardDeadline!==contract.hardDeadline||mission.maxCycles!==2||mission.budgetAutoRenewal!==false||mission.automaticRestart!==false)throw Error('V19_BUDGET_MAY_NOT_RENEW');
 if(mission.currentCycle<1||mission.currentCycle>2||mission.cycles.length>2||cycle.cycle!==mission.currentCycle)throw Error('V19_MAX_TWO_CYCLES');
 if(cstart<start||cend>deadline||cend-cstart>3600000||cend<cstart||now<cstart)throw Error('V19_CYCLE_SCOPE');
 if(mission.quotaObservation?.insufficientConfirmed===true)throw Error('V19_CONFIRMED_INSUFFICIENT_QUOTA');
 if(mission.status!=='in_progress_no_go'||now>=deadline)throw Error('V19_MISSION_CLOSED_OR_TOTAL_BUDGET_EXHAUSTED');
 if(cycle.status!=='in_progress_no_go'||now>=cend)throw Error('V19_CYCLE_CLOSED_OR_EXPIRED');
 return{remainingMissionMs:deadline-now,remainingCycleMs:cend-now,maxChildMs:Math.min(180000,cend-now,deadline-now),exactCreditsAvailable:mission.quotaObservation?.exposedCounterAvailable===true};
}
