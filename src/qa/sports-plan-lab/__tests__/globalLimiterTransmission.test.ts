import { OBJECTIVE_PROFILE } from "../planningMatrix";
import { describe,it,expect } from 'vitest';
import { QA_PROFILES } from '@/lib/plan/qa/syntheticProfiles';
import { buildPilotDiagnosticInput,buildPilotFormConfig } from '@/lib/plan/qa/preparePilotTrainingPlanContext';
import { prepareTrainingPlanContext } from '@/engines/plan/prepareTrainingPlanContext';
import { buildWorkoutCatalog } from '@/lib/workoutCatalogBuilder';

describe('existing physiological priorities remain independent of coach load category',()=>{
 for(const objective of ['5K','10K','Semi','Marathon','TrailShort','TrailMountain','703','IM']) it(objective,()=>{
  const profile=QA_PROFILES.find(p=>p.id===OBJECTIVE_PROFILE[objective as keyof typeof OBJECTIVE_PROFILE])!;
  const order=['VLamax','FatMax','VMA','VO2max','Wprime'];
  const prepare=(trainingLevel:'light'|'highly_trained',coachLimiterOrder=order)=>prepareTrainingPlanContext({
   diagnosticInput:{...buildPilotDiagnosticInput(profile),objectif:objective,tss7d:null,snapshotDate:null},
   athleteData:profile.athleteData,coachLimiterOrder,
   formConfig:{...buildPilotFormConfig(profile.planConfig),objective,ambition:'world_class',trainingLevel,weeklyHours:undefined},
  });
  const light=prepare('light'),trained=prepare('highly_trained');
  const identified=light.planConfig.identifiedLimitersRaw??[];
  // A native fixture without demonstrated gaps must not acquire invented limiters.
  expect(trained.planConfig.identifiedLimitersRaw??[]).toEqual(identified);
  expect(light.planConfig.recentLoad?.source).toBe('MANUAL');
  expect(light.planConfig.recentLoad?.status).toBe('unknown');
  if(!objective.startsWith('Trail')) expect(light.planConfig.weeklyHoursSource).toBe('internal-matrix');
  expect(light.planConfig.ambitionMeta?.trainingLevelSource).toBe('manual');
  if(!objective.startsWith('Trail')) expect(light.planConfig.volumeRamp!.week1HoursMax).toBeLessThanOrEqual(trained.planConfig.volumeRamp!.week1HoursMax);
  else expect(light.planConfig.volumeRamp).toBeUndefined(); // Dedicated trail route has no road matrix; no invented capacity.
  expect(prepare('light',[...identified].reverse()).planConfig.identifiedLimitersRaw??[]).toEqual([...identified].reverse());
 });
 it('limiter changes affect actual catalogue ranking on a controlled identical case',()=>{
  const options={maxItems:30,strictPhaseFilter:true,phaseOverride:['build' as const],rotationSeed:0};
  const a=buildWorkoutCatalog('10K',5,8,12,{...options,limiters:['VLamax','FatMax']}).map(e=>e.id);
  const b=buildWorkoutCatalog('10K',5,8,12,{...options,limiters:['VO2max','VMA']}).map(e=>e.id);
  expect(a).not.toEqual(b);
 });
});
