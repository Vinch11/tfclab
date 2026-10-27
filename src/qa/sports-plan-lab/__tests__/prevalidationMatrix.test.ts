import {it,expect,vi} from 'vitest';
import {writeFileSync,mkdirSync} from 'node:fs';
import historical from '../../../../docs/plan-generator/global-p0-evidence/residual-classification.json';
import {catalogueForWeek} from '../../../../supabase/functions/_shared/sessionCatalogueContract';
import {WorkoutLibrary} from '@/lib/workoutLibrary';
import {buildRepairWorkoutMetadata} from '@/lib/plan/repairCatalogMetadata';
import baseline from './catalogueCountingBaseline.json';
import {planningCases,supplementaryPlanningCases,preparePlanningCaseContext} from '../planningMatrix';
import {prevalidateGenerationScope} from '@/hooks/useAITrainingPlan';
it.skipIf(!process.env.TFCL_PREVALIDATION_MATRIX)('runs actual prevalidation preparation across the existing 600 synthetic configurations without a model',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('OFFLINE_NETWORK_FORBIDDEN');});
 try{
  const rows=[...planningCases(),...supplementaryPlanningCases()].map(spec=>{
   const {prepared}=preparePlanningCaseContext(spec);
   const report=prevalidateGenerationScope(prepared.athleteData,{...prepared.planConfig,_outputFormat:"json"});
   return {id:spec.id,objective:spec.objective,ambition:spec.ambition,effectiveAmbition:prepared.planConfig.ambition,level:spec.level,load:spec.load,format:spec.format??'continuous',report};
  });
  const out=process.env.TFCL_PREVALIDATION_MATRIX!;
  mkdirSync(out,{recursive:true});writeFileSync(`${out}/matrix.json`,JSON.stringify({referenceCommit:baseline.referenceCommit,rows:rows.map(r=>({...r,report:{...r.report,weeks:r.report.weeks.map(w=>({...w,eligible:w.eligible.map(c=>({id:c.id,sport:c.sport,intentFamily:c.intentFamily})),excludedCount:w.excluded.length,excluded:undefined}))}}))}));
  expect(rows).toHaveLength(600);
  for(const id of baseline.blockedIds)expect(rows.find(r=>r.id===id)?.report.status,id).toBe('blocked');
  for(const row of rows)expect(row.report.issues.some(i=>i.code==='window_phase_contract_conflict'),row.id).toBe(false);
  expect(fetch).not.toHaveBeenCalled();

 }finally{fetch.mockRestore();vi.useRealTimers();}
},600000);
it.each(['5K','10K','Semi','Marathon','TrailMountain','Sprint','Olympic','703','IM'] as const)('shares preparation for %s without claiming deterministic quotas for a dedicated route',objective=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 try{
  const spec=planningCases().find(c=>c.objective===objective&&c.level==='light'&&c.ambition==='finisher'&&c.load==='unknown')!;
  const {prepared}=preparePlanningCaseContext(spec);const report=prevalidateGenerationScope(prepared.athleteData,{...prepared.planConfig,_outputFormat:"json"});
  expect(report.weeks).toHaveLength(prepared.planConfig.weeksAvailable!);
  expect(report.weeks.every(w=>w.phase&&Array.isArray(w.eligible))).toBe(true);
  if(objective.startsWith('Trail'))expect(report.issues.some(i=>i.code==='deterministic_quota_not_available')).toBe(true);
 }finally{vi.useRealTimers();}
},60000);

it("preserves the 11 historical diversity warnings on their original contracts",()=>{
  // Replay the 11 original contracts, not their potentially different window scopes.
  expect(historical.catalogue).toHaveLength(11);
  for(const original of historical.catalogue){
   const ids=new Set(original.selectedEligibleIds);
   const catalog=WorkoutLibrary.filter(w=>ids.has(w.id)).map(buildRepairWorkoutMetadata);
   const result=catalogueForWeek(catalog,{objective:original.objective,phase:original.phase,weekType:original.weekType},{[original.sport]:{min:original.required}});
   expect(result.missingSports).toEqual([]);expect(result.limitedDiversitySports).toContain(original.sport);
  }
});
