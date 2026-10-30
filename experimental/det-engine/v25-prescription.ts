import{buildV24Prescription}from'./v24-prescription';import{assessPlanningFloorV25,evaluateFloorComplementV25}from'./v25-floor';import{consumeRunCostV25}from'./v25-physiology';import{replayRecoveryV25}from'./v25-recovery';import{digest}from'./v9-prospective';
/** Three new decision contracts around the existing V24 result. No automatic prescription mutation. */
export function buildV25Prescription(v:any,spec:any,canonical:Map<string,any>,clock:string){
 const baselineV24=buildV24Prescription(v,spec,canonical),r=baselineV24.result;
 const alternatives=r.calendar.weeks.flatMap((w:any)=>w.slots.filter((s:any)=>Number.isFinite(s.input.currentCapacity)&&s.input.currentCapacity>0&&s.minutes>s.input.currentCapacity).map((s:any)=>{
  const current=assessPlanningFloorV25(s,v.profile,s.minutes,{simulation:true}),alternative=assessPlanningFloorV25(s,v.profile,s.input.currentCapacity,{simulation:true});
  const previousCounterproposal=baselineV24.floorCounterproposals.find((x:any)=>x.result.calendar.weeks.some((w:any)=>w.slots.some((t:any)=>t.key===s.key&&t.minutes===alternative.minutes)));
  return{slotKey:s.key,current,alternative,complement:evaluateFloorComplementV25(alternative,previousCounterproposal)};
 }));
 const recovery=r.calendar.weeks.flatMap((w:any)=>w.slots.filter((s:any)=>s.input.hardFailures.includes('documented_adverse_recovery_hold')).map((s:any)=>replayRecoveryV25({slotKey:s.key,sourceId:s.card.id,sourceHash:digest(s.card),minutes:s.minutes,currentCapacityMinutes:s.input.currentCapacity,synthetic:true},[],clock,{simulation:true,nativeSuspension:{reason:'documented_adverse_recovery_hold',observedAt:null}})));
 const physiology=consumeRunCostV25(null,v.prepared.diagnostic._rawInput,v.prepared.diagnostic.runMLSS,clock,{simulation:true,verifiedArtifacts:{}});
 return{version:'det-v25-prescription-contracts-1',caseId:v.caseId,baselineV24,alternatives,physiology,recovery,reservationsChanged:0,nativeRefusalsRemoved:0,individualDoseApprovals:0,expertHumanReviews:0,operationalAuthorization:false,scope:'additional decision packets; original four-week candidate and every native issue retained'};
}
