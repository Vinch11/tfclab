import{QA_PROFILES}from'@/lib/plan/qa/syntheticProfiles';
import{buildPilotDiagnosticInput,buildPilotFormConfig}from'@/lib/plan/qa/preparePilotTrainingPlanContext';
import{prepareTrainingPlanContext}from'@/engines/plan/prepareTrainingPlanContext';
import{prepareGenerationContracts}from'@/lib/plan/prepareGenerationContracts';
import type{V10Profile}from'./v10-profiles';
/** Adapter to existing context/preparation; raw cases must be archived before diagnostics. */
export function registeredCases(spec:any){const seed=QA_PROFILES.find(p=>p.id==='B-IM')!,c=spec.common;
 return spec.cases.map((s:any)=>{const raw={...buildPilotDiagnosticInput(seed),...s.rawOverrides,athleteId:'synthetic:v22:'+s.id,athleteName:'Synthetic V22 '+s.id,objectif:c.objective,ambition:c.ambition,sportFocus:'tri',tss7d:null,snapshotDate:null,protocolQuality:null,vlamaxSource:s.rawOverrides.vlamax==null?null:'synthetic_estimate',fatigueState:null};raw.ftpKg=raw.ftp!=null?raw.ftp/raw.weightKg:null;
 const form={...buildPilotFormConfig(seed.planConfig),objective:c.objective,ambition:c.ambition,trainingLevel:c.trainingLevel,weeklyHours:c.weeklyHours,weeksAvailable:c.weeksAvailable,planStartDate:c.planStartDate,raceDate:c.raceDate,raceGoals:[{objective:c.objective,raceDate:c.raceDate,priority:'A'}],sessionsPerWeek:c.sessionsPerWeek,maxSessionsPerDay:c.maxSessionsPerDay,strengthSessionsPerWeek:c.strengthSessionsPerWeek,deloadCadenceWeeks:c.deloadCadenceWeeks,constraints:c.constraints,loadHistory:c.history};return{id:s.id,raw,form,evidence:s.fieldEvidence};});}
export function prepareV22Case(input:any,spec:any){const prepared=prepareTrainingPlanContext({diagnosticInput:input.raw,formConfig:input.form,decisionContext:{daysToRace:115,currentPhase:'base',isRaceWeek:false}});const c=spec.common;
 const config={...prepared.planConfig,physiologicalTrace:prepared.trace};
 const p={id:input.id,family:'ironman',athlete:prepared.athleteData,config,focusSport:c.defaultFocusSport,normalCaps:{...c.normalCaps},longCaps:{...c.longCaps},evidence:c.historyProvenance,vertical:null,fixture:null,availableDays:[...c.availableDays],maxDaily:c.maxDaily,minRest:c.minRest,synthetic:true,prep:prepareGenerationContracts(prepared.athleteData,config,{rotationSeed:0})}as V10Profile;
 return{input,prepared,profile:p};}
