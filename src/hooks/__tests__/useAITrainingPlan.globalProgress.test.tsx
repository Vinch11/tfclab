import {it,expect,vi} from 'vitest';
import {renderHook,act,waitFor} from '@testing-library/react';
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:async()=>({data:{session:{access_token:'SYNTHETIC_ONLY'}}})}}}));
vi.mock('@/lib/plan/historicalCatalogUsage',async original=>({...await original<typeof import('@/lib/plan/historicalCatalogUsage')>(),fetchHistoricalCatalogUsage:vi.fn(async()=>new Map())}));
vi.mock('@/lib/plan/planGenerationStats',()=>({logPlanStat:vi.fn()}));
vi.mock('@/lib/plan/planReleasePreflight',()=>({currentPlanReleaseHeaders:vi.fn(async()=>({}))}));
vi.mock('@/lib/plan/engineDispatch',async original=>({...await original<typeof import('@/lib/plan/engineDispatch')>(),qaEngineChoiceEnabled:()=>true}));
import {useAITrainingPlan} from '../useAITrainingPlan';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
it('real normal IA hook resolves QA JSON before windowing and displays16 while requesting S1–S12',async()=>{
 let finish!:(r:Response)=>void;const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>new Promise<Response>(resolve=>{finish=resolve;}));
 const {athleteData,planConfig}=preparePrevalidationFixture('B-MARATHON',{ambition:'age_group',trainingLevel:'trained',weeksAvailable:16,weeklyHours:8,sessionsPerWeek:5,maxSessionsPerDay:2,strengthSessionsPerWeek:1});
 const before=JSON.stringify(planConfig);const {result}=renderHook(()=>useAITrainingPlan());let pending:Promise<void>|undefined;
 try{
  act(()=>{pending=result.current.generatePlanWindowed(athleteData,{...planConfig,_outputFormat:undefined});});
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1),{timeout:30000});
  const request=JSON.parse(String(fetch.mock.calls[0][1]?.body));
  expect(request.planConfig.weeksAvailable).toBe(12);expect(request.planConfig.globalTotalWeeks).toBe(16);
  expect(result.current.chunkProgress?.totalWeeks).toBe(16);expect(result.current.chunkProgress?.totalChunks).toBe(4);
  const event='event: error\ndata: '+JSON.stringify({code:'SCHEMA_FAIL',chunkIndex:0,message:'SYNTHETIC failure'})+'\n\n';
  await act(async()=>{finish(new Response(event,{status:200,headers:{'Content-Type':'text/event-stream'}}));await pending;});
  expect(fetch).toHaveBeenCalledTimes(1);expect(result.current.parsedPlan).toBeNull();expect(result.current.isLoading).toBe(false);expect(JSON.stringify(planConfig)).toBe(before);
 }finally{fetch.mockRestore();}
},60000);
