import{digest}from'./v9-prospective';import{originalCard,targetedTiming}from'./v14-sources';import{assessPlanningFloorV25}from'./v25-floor';import{consumeRunCostV25,type RunCostTransferV25,type VerifiedCostArtifactV25}from'./v25-physiology';import{replayRecoveryV25,type RecoveryObservationV25,type RecoveryEventV25}from'./v25-recovery';
/** Materialize preregistered parameters and actual source bindings before evaluating decisions. */
export function materializeV25Fixtures(spec:any,readOnly424:any,raw424:any,seedSlot:any){
 const artifact=readOnly424.files.find((f:any)=>f.path.endsWith('economy-contract.test.ts'));
 const sourceRef=readOnly424.ref+':'+artifact.path,explicitCosts=(artifact.content.match(/runningEconomyCostMlKgKm:\s*\d+/g)??[]).map((s:string)=>Number(s.split(':')[1].trim()));
 if(!explicitCosts.length||new Set(explicitCosts).size!==1||explicitCosts[0]!==spec.physiologyCases[0].value)throw Error('V25_EXPLICIT_SOURCE_CLAIM_UNAVAILABLE');
 const verifiedArtifacts:Record<string,VerifiedCostArtifactV25>={[artifact.contentSha256]:{sourceRef,claims:[{quantity:'running_oxygen_cost',unit:'ml_O2/kg/km',value:explicitCosts[0],methodId:spec.physiologyCases[0].method.id,rawInputHash:digest(raw424),synthetic:true}]}};
 const floors=spec.floorCases.map((f:any)=>{const card=originalCard(f.sourceId);return{...f,slot:{...structuredClone(seedSlot),key:'synthetic:v25:'+f.id,card,timing:targetedTiming(card),input:{...structuredClone(seedSlot.input),currentCapacity:f.capacity},role:{...structuredClone(seedSlot.role),currentCapacity:f.capacity}},proposedMinutes:f.minutes};});
 const shared=spec.physiologyCases[0];
 const physiology=spec.physiologyCases.map((f:any)=>({id:f.id,raw:structuredClone(raw424),envelope:{...shared,...f,version:'det-v25-run-cost-1',sourceRef,sourceArtifactHash:artifact.contentSha256,rawInputHash:digest(raw424),observedAt:'2026-10-29T10:00:00Z',validThrough:'2026-11-10T23:59:59Z',synthetic:true}as RunCostTransferV25}));
 const c=spec.recoveryCommon,card=originalCard(c.sourceId),sourceHash=digest(card);
 const recovery=spec.recoveryCases.map((f:any)=>{
  const cap=f.capacityMinutes??c.currentCapacityMinutes;
  const subject={slotKey:c.subject,sourceId:c.sourceId,sourceHash,minutes:c.targetMinutes,currentCapacityMinutes:cap,synthetic:true};
  const common={slotKey:c.subject,sourceId:c.sourceId,sourceHash,recordedAt:c.observedAt,validThrough:c.validThrough,synthetic:true,response:'adverse',recovered:false,pain:c.pain,symptoms:c.symptoms,restriction:c.restriction,previousToleranceDocumented:c.previousToleranceDocumented,previousCompletedMinutes:c.previousCompletedMinutes,toleranceProvenance:c.toleranceProvenance,referenceUsable:c.referenceUsable,microcycleCompatible:c.microcycleCompatible,capacityMinutes:cap,capacityProvenance:f.capacityMinutes!=null?'separate preregistered synthetic lower envelope; not produced by recovery':c.capacityProvenance}as RecoveryObservationV25;
  const reassessment={...common,...f,recordedAt:c.reassessmentAt};delete (reassessment as any).id;
  const events:RecoveryEventV25[]=[{kind:'adverse_response',at:c.observedAt,observation:common},{kind:'request_reassessment',at:'2026-11-09T09:00:00Z'},{kind:'document_reassessment',at:c.reassessmentAt,observation:reassessment as RecoveryObservationV25}];
  return{id:f.id,subject,events,asOf:c.asOf};
 });return{floors,physiology,recovery,verifiedArtifacts};
}
export function executeV25Fixtures(fixtures:ReturnType<typeof materializeV25Fixtures>,profile:any,native424:any,clock:string){
 return{floors:fixtures.floors.map(f=>({id:f.id,decision:assessPlanningFloorV25(f.slot,profile,f.proposedMinutes,{simulation:true})})),physiology:fixtures.physiology.map(f=>({id:f.id,decision:consumeRunCostV25(f.envelope,f.raw,native424,clock,{simulation:true,verifiedArtifacts:fixtures.verifiedArtifacts})})),recovery:fixtures.recovery.map(f=>({id:f.id,decision:replayRecoveryV25(f.subject,f.events,f.asOf,{simulation:true})}))};
}
