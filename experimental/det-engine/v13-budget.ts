import type{V10Profile}from'./v10-profiles';import{prepareGenerationContracts}from'@/lib/plan/prepareGenerationContracts';
/** Ordinary experimental-fixture parameter reconciliation. No load measurement or fitness gain invented. */
export function reconcileExperimentalBudget<P extends V10Profile>(p:P){
 const hours=p.config.weeklyHours,ramp=p.config.volumeRamp;
 if(typeof hours!=='number'||hours<=0||!ramp)throw Error('DECLARED_BUDGET_OR_RAMP_MISSING');
 const config={...p.config,volumeRamp:{...ramp,weeklyHoursTarget:hours,week1HoursMax:Math.min(ramp.week1HoursMax,hours)}};
 const candidate={...p,config,prep:prepareGenerationContracts(p.athlete,config,{rotationSeed:0})};
 return{candidate,evidence:{originalWeeklyHours:hours,originalRampTarget:ramp.weeklyHoursTarget,reconciledRampTarget:config.volumeRamp.weeklyHoursTarget,originalWeek1Maximum:ramp.week1HoursMax,reconciledWeek1Maximum:config.volumeRamp.week1HoursMax,unchangedFloorParameters:{week1PctTarget:ramp.week1PctTarget,rampWeeks:ramp.rampWeeks,weeklyIncreasePctMax:ramp.weeklyIncreasePctMax},inheritedRecentLoadAdjustment:ramp.recentLoadAdjustment,provenanceWarning:'inherited QA snapshot wording is synthetic, not a real athlete measurement; no TSS-to-hours conversion performed',before:Object.entries(p.prep.weeklyQuotas).map(([week,q])=>({week:+week,nativeMax:q.volumeBudget?.maxMinutes??null,floors:q.floors})),after:Object.entries(candidate.prep.weeklyQuotas).map(([week,q])=>({week:+week,nativeMax:q.volumeBudget?.maxMinutes??null,floors:q.floors})),objectiveAndAmbitionUnchanged:config.objective===p.config.objective&&config.ambition===p.config.ambition,capacityEnvelopesUnchanged:true,productionApplied:false}};
}
