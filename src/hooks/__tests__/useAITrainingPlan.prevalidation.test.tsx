import {it,expect,vi} from 'vitest';
import {renderHook,act} from '@testing-library/react';
vi.mock('@/lib/plan/historicalCatalogUsage',async original=>({...await original<typeof import('@/lib/plan/historicalCatalogUsage')>(),fetchHistoricalCatalogUsage:vi.fn(async()=>new Map())}));
vi.mock('@/lib/plan/planGenerationStats',()=>({logPlanStat:vi.fn()}));
vi.mock('@/lib/plan/planReleasePreflight',()=>({currentPlanReleaseHeaders:vi.fn(async()=>({}))}));
import {useAITrainingPlan} from '../useAITrainingPlan';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {currentPlanReleaseHeaders} from '@/lib/plan/planReleasePreflight';
it('real generation hook stops before release preflight and HTTP POST for a demonstrated contradiction',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('UNEXPECTED_NETWORK');});
 const fixture=preparePrevalidationFixture('B-10K',{ambition:'competitor',trainingLevel:'trained',maxSessionsPerDay:1,weeksAvailable:12});
 const {result}=renderHook(()=>useAITrainingPlan());
 try{
  act(()=>result.current.setResponse("Plan courant conservé"));
  await act(async()=>{await result.current.generatePlan(fixture.athleteData,fixture.planConfig);});
  expect(result.current.response).toBe("Plan courant conservé");
  expect(result.current.prevalidation?.status).toBe('blocked');
  expect(currentPlanReleaseHeaders).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
it('read-only preview preserves the current plan state and does not use authentication or transport',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('UNEXPECTED_NETWORK');});
 const fixture=preparePrevalidationFixture('B-10K');const {result}=renderHook(()=>useAITrainingPlan());
 try{
  act(()=>result.current.setResponse('État courant à conserver'));
  let preview:Awaited<ReturnType<typeof result.current.prevalidateTrainingPlan>>;
  await act(async()=>{preview=await result.current.prevalidateTrainingPlan(fixture.athleteData,fixture.planConfig);});
  expect(preview!.weeks.length).toBe(fixture.planConfig.weeksAvailable);
  expect(result.current.response).toBe('État courant à conserver');expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
import {planningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
it('checks the complete mixed-window scope without flattening weekly phases',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('UNEXPECTED_NETWORK');});
 try{
  const spec=planningCases().find(c=>c.id==='703:light:competitor:unknown')!;
  const {prepared}=preparePlanningCaseContext(spec);const {result}=renderHook(()=>useAITrainingPlan());
  await act(async()=>{await result.current.prevalidateTrainingPlan(prepared.athleteData,{...prepared.planConfig,_outputFormat:'json'});});
  expect(result.current.prevalidation?.issues.some(i=>i.code==='window_phase_contract_conflict')).toBe(false);
  expect(result.current.prevalidation?.weeks.every(w=>w.phase===w.expectedPhase)).toBe(true);expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();vi.useRealTimers();}
});
import * as decisionMatrix from '@/lib/v2/tfclDecisionMatrix';
it('a physiological calculation failure blocks the real hook before any release or model fetch',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('UNEXPECTED_NETWORK');});
 const spy=vi.spyOn(decisionMatrix,'computeTFCLDecisionMatrix').mockImplementation(()=>{throw Error('SENSITIVE_MESSAGE_SENTINEL');});
 try{
  const fixture=preparePrevalidationFixture('B-10K');
  const {result}=renderHook(()=>useAITrainingPlan());
  vi.mocked(currentPlanReleaseHeaders).mockClear();
  await act(async()=>{await result.current.generatePlan(fixture.athleteData,fixture.planConfig);});
  expect(result.current.prevalidation?.issues).toContainEqual({week:0,code:'decision_matrix_failed',severity:'blocking'});
  expect(result.current.prevalidation?.status).toBe('blocked');
  expect(currentPlanReleaseHeaders).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
  expect(JSON.stringify(result.current.prevalidation)).not.toContain('SENSITIVE_MESSAGE_SENTINEL');
 }finally{fetch.mockRestore();spy.mockRestore();}
});
it('an invalid duration is reported as a missing planning parameter without requests',async()=>{
 const {result}=renderHook(()=>useAITrainingPlan());
 const fixture=preparePrevalidationFixture('B-10K');
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('UNEXPECTED_NETWORK');});
 try{
  let preview:Awaited<ReturnType<typeof result.current.prevalidateTrainingPlan>>;
  await act(async()=>{preview=await result.current.prevalidateTrainingPlan(fixture.athleteData,{...fixture.planConfig,weeksAvailable:0});});
  expect(preview!.issues).toEqual([{week:0,code:'prevalidation_duration_invalid',severity:'blocking'}]);
  expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
