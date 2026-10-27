import { QA_PROFILES } from '@/lib/plan/qa/syntheticProfiles';
import {buildPilotDiagnosticInput,buildPilotFormConfig} from '@/lib/plan/qa/preparePilotTrainingPlanContext';
import {prepareTrainingPlanContext} from '@/engines/plan/prepareTrainingPlanContext';
import type {PlanFormConfig} from '@/engines/plan/planConfigBuilder';
/** Existing fictitious physiology only. Never reads a coach/athlete database. */
export function preparePrevalidationFixture(id:string,overrides:Partial<PlanFormConfig>={}) {
 const normalized=Object.fromEntries(Object.entries(overrides).map(([key,value])=>[key,value===null?undefined:value])) as Partial<PlanFormConfig>;
 const fixture=QA_PROFILES.find(p=>p.id===id);
 if(!fixture)throw new Error(`UNKNOWN_OFFLINE_FIXTURE:${id}`);
 return prepareTrainingPlanContext({diagnosticInput:buildPilotDiagnosticInput(fixture),athleteData:structuredClone(fixture.athleteData),
  formConfig:{...buildPilotFormConfig(fixture.planConfig),...normalized}});
}
