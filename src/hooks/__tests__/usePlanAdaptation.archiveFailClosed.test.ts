import {act,renderHook} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const mocks=vi.hoisted(()=>({
  archiveInsert:vi.fn(),planUpsert:vi.fn(),archiveReply:vi.fn(),planReply:vi.fn(),archiveRead:vi.fn(),
  archiveRows:new Map<string,Record<string,unknown>>(),
  archiveSelect:vi.fn(),planSelect:vi.fn(),archiveSingle:vi.fn(),planSingle:vi.fn(),
  checkGuard:vi.fn(),patch:vi.fn(),journal:vi.fn(),validate:vi.fn(),
  buildWindow:vi.fn(),mergeWindow:vi.fn(),generate:vi.fn(),reset:vi.fn(),
  windowRef:{current:null as unknown},
  toastError:vi.fn(),toastSuccess:vi.fn(),
}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
  if(table==='plan_versions')return {insert:mocks.archiveInsert,
    select:(cols:string)=>{mocks.archiveSelect(cols);return {eq:(_c:string,id:string)=>({maybeSingle:()=>mocks.archiveRead(id)})};}};
  if(table==='plans')return {upsert:mocks.planUpsert};
  throw Error('Unexpected table: '+table);
}}}));
vi.mock('@/hooks/useAITrainingPlan',()=>({useAITrainingPlan:()=>({
  isLoading:false,chunkProgress:0,reset:mocks.reset,generatePlan:mocks.generate,
  lastParsedPlanRef:mocks.windowRef,lastResponseRef:{current:''},response:'',
})}));
vi.mock('@/engines/plan/planPatcher',()=>({
  applyDeload:mocks.patch,redistributeMissedSession:mocks.patch,
  swapModality:mocks.patch,shiftRaceDate:mocks.patch,
}));
vi.mock('@/engines/plan/planWindowRegen',()=>({
  buildWindowRegenConfig:mocks.buildWindow,mergeWindowIntoPlan:mocks.mergeWindow,
}));
vi.mock('@/engines/plan/planAdaptationJournal',()=>({
  checkAdaptationGuard:mocks.checkGuard,journalAdaptation:mocks.journal,
  listRecentAdaptations:vi.fn(()=>[]),
}));
vi.mock('@/engines/plan/computePlan',()=>({
  postProcessParsedPlan:(plan:unknown)=>({plan}),
}));
vi.mock('@/engines/plan/planValidator',()=>({validatePlan:mocks.validate}));
vi.mock('sonner',()=>({toast:{info:vi.fn(),warning:vi.fn(),
  error:mocks.toastError,success:mocks.toastSuccess}}));

import {usePlanAdaptation,type ApplyPatchArgs} from '../usePlanAdaptation';

const source=readFileSync(resolve(process.cwd(),'src/hooks/usePlanAdaptation.ts'),'utf8');
const original={title:'QA non-prescriptive',totalWeeks:1,phases:[],
  _coachLimiterOrder:['tte','aerobic_ceiling'],
  weeks:[{weekNumber:1,sessions:[{durationMin:40}]}]};
const modified={...original,weeks:[{weekNumber:1,sessions:[{durationMin:45}]}]};
type Route='patch'|'window';

function requestPatch():ApplyPatchArgs {
  return {athleteId:'synthetic-athlete',coachId:'synthetic-coach',
    currentPlan:structuredClone(original),triggeredBy:'manual',kind:'deload',
    options:{},planConfig:{objective:'Marathon'},
  } as unknown as ApplyPatchArgs;
}
async function invoke(route:Route){
  const hook=renderHook(()=>usePlanAdaptation());
  let result:unknown;
  await act(async()=>{
    if(route==='patch')result=await hook.result.current.applyPatch(requestPatch());
    else result=await hook.result.current.regenerateWindow({
      athleteId:'synthetic-athlete',coachId:'synthetic-coach',triggeredBy:'manual',
      currentPlan:structuredClone(original),baseConfig:{objective:'Marathon'},
      fromWeek:1,toWeek:1,athleteData:{nom:'synthetic'},
    } as unknown as Parameters<typeof hook.result.current.regenerateWindow>[0]);
  });
  return {hook,result};
}
function expectNoSuccess(){
  expect(mocks.journal).not.toHaveBeenCalled();
  expect(mocks.toastSuccess).not.toHaveBeenCalled();
}

describe('adaptation persistence — exact archive and current-plan receipts',()=>{
  beforeEach(()=>{
    vi.resetAllMocks();
    vi.stubGlobal('fetch',()=>{throw Error('PERSISTENCE_TEST_NETWORK_FORBIDDEN');});
    mocks.checkGuard.mockResolvedValue({allowed:true,reason:null});
    mocks.patch.mockReturnValue({plan:structuredClone(modified),
      diff:[{weekNumber:1}],warnings:[]});
    mocks.validate.mockReturnValue({issues:[]});
    mocks.journal.mockResolvedValue(undefined);
    mocks.generate.mockResolvedValue(undefined);
    mocks.windowRef.current=structuredClone(modified);
    mocks.buildWindow.mockReturnValue({config:{objective:'Marathon'},athleteData:{}});
    mocks.mergeWindow.mockReturnValue(structuredClone(modified));
    mocks.archiveRows.clear();
    const store=(row:Record<string,unknown>)=>mocks.archiveRows.set(row.id as string,structuredClone(row));
    mocks.archiveReply.mockImplementation(async(row)=>{store(row);return {error:null};});
    mocks.archiveRead.mockImplementation(async(id:string)=>({data:mocks.archiveRows.get(id)??null,error:null}));
    mocks.archiveInsert.mockImplementation((row)=>mocks.archiveReply(row));
    mocks.planReply.mockImplementation(async(row)=>({data:structuredClone(row),error:null}));
    mocks.planUpsert.mockImplementation((rows)=>{
      mocks.planSingle.mockImplementation(()=>mocks.planReply(rows[0]));
      mocks.planSelect.mockReturnValue({single:mocks.planSingle});
      return {select:mocks.planSelect};
    });
  });
  afterEach(()=>{vi.unstubAllGlobals();});
  it('archive passes through the append-only saver (content identity), never a random UUID or UPDATE',()=>{
    expect(source).not.toContain('crypto.randomUUID');
    expect(source).toContain('new AppendOnlyPlanVersionSaver({ transport: supabasePlanVersionTransport(supabase) })');
    expect(source).not.toMatch(/from\("plan_versions"\)[\s\S]{0,80}\.update\(/);
  });
  it('archives before persisting on both adaptation routes',()=>{
    expect(source.match(/await archiveThenPersist\(/g)).toHaveLength(2);
    expect(source).not.toMatch(/await archive\(/);
  });
  describe.each(['patch','window'] as const)('%s route',route=>{
    it('does not overwrite or announce success after an archive RLS refusal',async()=>{
      mocks.archiveReply.mockResolvedValue({error:{code:'42501',message:'synthetic denied'}});
      const {hook,result}=await invoke(route);
      expect(result).toBeNull();
      expect(mocks.archiveInsert).toHaveBeenCalledOnce();
      expect(mocks.archiveInsert.mock.calls[0][0].plan_json).toEqual(original);
      expect(mocks.planUpsert).not.toHaveBeenCalled();
      expectNoSuccess();
      expect(mocks.toastError).toHaveBeenCalled();
      expect(hook.result.current.isApplying).toBe(false);hook.unmount();
    });
    it('does not overwrite after a success status without an archive row',async()=>{
      mocks.archiveReply.mockResolvedValue({error:null});
      const {hook,result}=await invoke(route);
      expect(result).toBeNull();
      expect(mocks.planUpsert).not.toHaveBeenCalled();
      expectNoSuccess();
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/Archive du plan courant non confirmée/));hook.unmount();
    });
    it('does not overwrite after an archive receipt for another coach',async()=>{
      mocks.archiveReply.mockImplementation(async(row)=>{mocks.archiveRows.set(row.id,{...row,coach_id:'other'});return {error:null};});
      const {hook,result}=await invoke(route);
      expect(result).toBeNull();expect(mocks.planUpsert).not.toHaveBeenCalled();
      expectNoSuccess();expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/BLOCKED/));hook.unmount();
    });
    it('lost archive ACK then retry with a new hook instance ⇒ one archive row, same id',async()=>{
      let first=true;
      mocks.archiveReply.mockImplementation(async(row)=>{mocks.archiveRows.set(row.id,structuredClone(row));if(first){first=false;throw new TypeError('ack lost');}return {error:null};});
      mocks.planReply.mockImplementationOnce(async()=>{throw Error('current lost');});
      const r1=await invoke(route); r1.hook.unmount();
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/État partiel/));
      const r2=await invoke(route); r2.hook.unmount();
      expect(r2.result).not.toBeNull();
      expect(mocks.archiveRows.size).toBe(1);
      expect(mocks.archiveInsert).toHaveBeenCalledTimes(1);
    });
    it('does not journal or announce success when the current-plan write fails',async()=>{
      mocks.planReply.mockResolvedValue({data:null,error:{code:'42501',message:'synthetic denied'}});
      const {hook,result}=await invoke(route);
      expect(result).toBeNull();
      expect(mocks.archiveInsert).toHaveBeenCalledOnce();
      expect(mocks.planUpsert).toHaveBeenCalledOnce();
      expectNoSuccess();expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/État partiel/));
      expect(hook.result.current.isApplying).toBe(false);hook.unmount();
    });
    it.each(['empty-receipt','transport-rejection'] as const)(
      'retains uncertainty without retry after a simulated commit and %s',async failure=>{
        let canonical:unknown=original;
        mocks.planReply.mockImplementation(async(row)=>{
          canonical=structuredClone(row.plan_json);
          if(failure==='transport-rejection')throw Error('synthetic connection lost after commit');
          return {data:null,error:null};
        });
        const {hook,result}=await invoke(route);
        expect(result).toBeNull();
        expect(canonical).toEqual(modified);
        expect(mocks.archiveInsert).toHaveBeenCalledOnce();
        expect(mocks.planUpsert).toHaveBeenCalledOnce();
        expectNoSuccess();expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/État partiel/));hook.unmount();
      });
    it('rejects a changed plan in the current-plan receipt',async()=>{
      mocks.planReply.mockImplementation(async(row)=>({
        data:{...row,plan_json:original},error:null,
      }));
      const {hook,result}=await invoke(route);
      expect(result).toBeNull();expectNoSuccess();
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/État partiel/));hook.unmount();
    });
    it('journals and reports success only after both exact row receipts',async()=>{
      const order:string[]=[];
      mocks.archiveReply.mockImplementation(async(row)=>{
        order.push('archive');mocks.archiveRows.set(row.id,structuredClone(row));return {error:null};
      });
      mocks.planReply.mockImplementation(async(row)=>{
        order.push('persist');return {data:structuredClone(row),error:null};
      });
      mocks.journal.mockImplementation(async()=>{order.push('journal');});
      const {hook,result}=await invoke(route);
      expect(result).not.toBeNull();
      expect(order).toEqual(['archive','persist','journal']);
      expect(mocks.archiveInsert.mock.calls[0][0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8/);
      expect(mocks.planSelect).toHaveBeenCalledWith('athlete_id,coach_id,plan_json,updated_at');
      expect(mocks.planSingle).toHaveBeenCalledOnce();
      expect(mocks.planUpsert.mock.calls[0][0][0].plan_json).toEqual(modified);
      expect(mocks.toastSuccess).toHaveBeenCalledOnce();
      expect(hook.result.current.isApplying).toBe(false);hook.unmount();
    });
    it('keeps exact-receipt checks when the coach confirms pending critical issues',async()=>{
      mocks.validate.mockReturnValue({issues:[{severity:'error',rule:'synthetic',message:'synthetic'}]});
      mocks.archiveReply.mockResolvedValue({error:null});
      const {hook,result}=await invoke(route);
      expect(result).toBeNull();expect(mocks.archiveInsert).not.toHaveBeenCalled();
      expect(hook.result.current.pendingCriticalIssues).toHaveLength(1);
      let confirmed:unknown;
      await act(async()=>{confirmed=await hook.result.current.confirmPendingSave();});
      expect(confirmed).toBeNull();
      expect(mocks.planUpsert).not.toHaveBeenCalled();expectNoSuccess();
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/Archive du plan courant non confirmée/));
      expect(hook.result.current.pendingCriticalIssues).toBeNull();
      expect(hook.result.current.isApplying).toBe(false);hook.unmount();
    });
    it('refuses a DET structured plan explicitly, without archive or AI post-processing',async()=>{
      const det=structuredClone(original) as Record<string,unknown>;
      (det.weeks as Array<{sessions:Array<Record<string,unknown>>}>)[0].sessions[0].detStructuredWorkout={schema:'det-structured-workout-v1'};
      const hook=renderHook(()=>usePlanAdaptation()); let res:unknown='x';
      await act(async()=>{res=route==='patch'
        ? await hook.result.current.applyPatch({...requestPatch(),currentPlan:det} as unknown as ApplyPatchArgs)
        : await hook.result.current.regenerateWindow({athleteId:'synthetic-athlete',coachId:'synthetic-coach',triggeredBy:'manual',currentPlan:det,baseConfig:{},fromWeek:1,toWeek:1,athleteData:{}} as never);});
      expect(res).toBeNull(); expect(mocks.patch).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
      expect(mocks.archiveInsert).not.toHaveBeenCalled(); expect(mocks.planUpsert).not.toHaveBeenCalled();
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/Adaptation refusée : ce plan provient de DET Engine/));hook.unmount();
    });
  });
});
