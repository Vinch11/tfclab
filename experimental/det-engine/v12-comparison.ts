import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';
import type{V10Profile}from'./v10-profiles';import{buildMesocycle}from'./v11-mesocycle';
import{progressionCandidate,recoveryCandidate,type ProgressionModel,type RecoveryModel}from'./v12-models';
import{baselineAudit}from'./v12-audit';import{prescriptionRecords}from'./v12-prescription';import{V12_SPEC,postureGate,type PostureResponse}from'./v12-contract';
export function compareProfile(p:V10Profile){
 const base=buildMesocycle(p);
 const archived=JSON.parse(gunzipSync(readFileSync('docs/det-engine/v11/evidence/final/mesocycles.json.gz')).toString()).find((x:{profile:string;model:string})=>x.profile===p.id&&x.model==='separated_exposures');
 const baselinePlanIdentical=JSON.stringify(base.plan)===JSON.stringify(archived.plan);
 if(!baselinePlanIdentical)throw Error('V11_BASELINE_NOT_REPRODUCED');
 const progression=V12_SPEC.progressionModels.map(m=>progressionCandidate(p,m as ProgressionModel,base));
 const recovery=V12_SPEC.recoveryModels.map(m=>recoveryCandidate(p,m as RecoveryModel,base));
 const selected=progression.find(x=>x.model==='technical_segmentation'&&x.status==='retained_conditional')??progression.find(x=>x.model==='justified_maintenance')!;
 if(!selected.attempt||!selected.attempt.passesExecuted)throw Error('NO_REVIEWABLE_FULL_BLOCK');
 const prototype:PostureResponse={synthetic:true,sourceId:'C_BIKE_AERO_POSITION_DRILLS',week:1,quality:'usable',comparable:true,recovered:true,pain:false,stablePosition:true,provenance:'explicit V12 future-response thought experiment, not inherited observation or actual athlete data'};
 const gates=[{case:'missing_response',observation:null,result:postureGate()},...([{case:'usable_scripted_response',o:prototype},{case:'symptom',o:{...prototype,pain:true}},{case:'unrecovered',o:{...prototype,recovered:false}},{case:'unknown_symptom',o:{...prototype,pain:null}},{case:'unstable_position',o:{...prototype,stablePosition:false}}]).map(x=>({case:x.case,observation:x.o,result:postureGate(x.o)}))];
 const divergences=selected.attempt.weeks.flatMap((w,index)=>w.offers.flatMap(o=>{const old=base.weeks[index].offers.find(a=>a.role.id===o.role.id)!;return old.card.id===o.card.id&&old.minutes===o.minutes?[]:[{week:w.context.week,role:o.role.id,before:{source:old.card.id,minutes:old.minutes},after:{source:o.card.id,minutes:o.minutes},nominalTimeChangeOnly:o.card.id===old.card.id&&!o.sourceEvidence.terrainSpecific,physiologicalLoadEquivalent:false}];}));
 return{version:V12_SPEC.version,profile:p.id,input:{focus:p.focusSport,focusEvidence:p.evidence,history:p.config.loadHistory,normalCaps:p.normalCaps,longCaps:p.longCaps,limiter:p.config.identifiedLimitersRaw,diagnostic:p.config.physiologicalTrace?.diagnostic,availability:p.availableDays},baselinePlanIdentical,baselineAudit:baselineAudit(p,base),progression,recovery,selected:{model:selected.model,status:selected.status,attempt:selected.attempt,records:prescriptionRecords(p,selected.attempt),divergences,gates,readiness:'review_dossier_only; individual protocol-time feasibility and future responses not established',actualObservationsAdded:0,expertReviewed:false}};
}
