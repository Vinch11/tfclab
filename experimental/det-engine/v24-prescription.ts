import{buildV23Prescription}from'./v23-prescription';import{reassignV24ExistingSessions,acceptV24Placement}from'./v24-placement';import{floorOptionV24,inspectFloorCounterproposalV24}from'./v24-capacity';import{validateFourWeekScopeV23}from'./v23-scope';import{revalidateV22Reservation}from'./v22-prescription';
/** Compose the existing engine and existing validation; a bounded placement repair only. */
export function buildV24Prescription(v:any,spec:any,canonical:Map<string,any>){
 const before=buildV23Prescription(v,spec,canonical),trials:any[]=[];
 if(before.programming.policy&&before.rejectedProgrammingAttempt){
  for(const model of['pull_on_support_day','catch_on_support_day','protect_peak_ride_only','space_peak_bike_block_and_long_run']as const){
   const trial=reassignV24ExistingSessions(['protect_peak_ride_only','space_peak_bike_block_and_long_run'].includes(model)?before.result:before.rejectedProgrammingAttempt,v.profile,model);
   // V23 applies observations after its placement test. Carry every resulting hold into each trial.
   for(const w of trial.result.calendar.weeks)for(const s of w.slots){const old=before.result.calendar.weeks.flatMap((x:any)=>x.slots).find((x:any)=>x.key===s.key);if(!old||old.card.id!==s.card.id||old.minutes!==s.minutes)throw Error('V24_UNCHANGED_SOURCE_DOSE_REQUIRED');s.input.hardFailures=[...new Set([...s.input.hardFailures,...old.input.hardFailures])];for(const c of old.input.conditions)if(!s.input.conditions.some((x:any)=>x.id===c.id))s.input.conditions.push(c);}
   revalidateV22Reservation(trial.result,v.profile);trial.scope=validateFourWeekScopeV23(trial.result,v.profile);
   trials.push({...trial,acceptance:acceptV24Placement(before.result,trial,v.profile)});
  }
 }
 const retained=trials.find(t=>t.acceptance.accepted)??null,result=retained?.result??before.result;
 const floorOptions=result.calendar.weeks.flatMap((w:any)=>w.slots.filter((s:any)=>s.minutes>s.input.currentCapacity).map((s:any)=>floorOptionV24(s,v.profile)));
 return{caseId:v.caseId,before,trials,retainedModel:retained?.model??null,result,scope:validateFourWeekScopeV23(result,v.profile),floorOptions,floorCounterproposals:floorOptions.map((o:any)=>inspectFloorCounterproposalV24(result,v.profile,o)).filter(Boolean),automaticApproval:false,scientificIndividualValidation:false,capacityIncreased:false};
}
