import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {describe,it,expect,vi} from 'vitest';
import {QA_COACHES} from '../../../../supabase/functions/_shared/nolioV2/oauth';
import {exportCapabilities} from '../../../../supabase/functions/_shared/nolioV2/exportCapabilities';
import {verifySportingRelease} from '../../../../supabase/functions/_shared/nolioV2/sportingRelease';
const A='573e045a-bbea-4e37-a30f-33183b9fbe13',B='6b4c1722-2105-4889-ab14-41bab798cdf7',P='22222222-2222-4222-8222-222222222222',ATH='33333333-3333-4333-8333-333333333333';
function endpoint(name:string,actor:string,owner=actor,backend='lkjesdacgpolrwfxulbo'){
 let handler:(r:Request)=>Promise<Response>=null as never;
 const writes=vi.fn(),network=vi.fn(()=>{throw Error('NETWORK_FORBIDDEN');});
 const client={auth:{getClaims:async()=>({data:{claims:{sub:actor}},error:null})},rpc:async()=>({data:false,error:null}),from:(table:string)=>{
  const filters:Record<string,unknown>={};const q={select:()=>q,eq:(k:string,v:unknown)=>{filters[k]=v;return q;},order:()=>q,limit:()=>q,insert:writes,maybeSingle:async()=>{
   if(table==='plan_versions')return {data:filters.coach_id===owner?{id:P,coach_id:owner,athlete_id:ATH,plan_json:{}}:null,error:null};
   if(table==='athletes')return {data:filters.coach_id===owner?{id:ATH}:null,error:null};
   if(table==='nolio_v2_connections')return {data:{refs:{}},error:null};
   return {data:null,error:null};
  }};return q;
 }};
 const source=readFileSync(`supabase/functions/${name}/index.ts`,'utf8').replace(/^import[\s\S]*?;\s*\n/gm,'');
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const deps={Deno:{env:{get:(k:string)=>k==='SUPABASE_URL'?`https://${backend}.supabase.co`:k==='SUPABASE_ANON_KEY'?'SYNTH_ANON':k==='SUPABASE_SERVICE_ROLE_KEY'?'SYNTH_SERVICE':undefined},serve:(fn:typeof handler)=>{handler=fn;}},createClient:()=>client,corsHeaders:{},QA_COACHES,exportCapabilities,verifySportingRelease,CHECKED_IN_PLAN_RELEASE_INFO:{releaseId:'a'.repeat(64),components:{'det-engine':'b'.repeat(64)}},preparePlan:async()=>({planSha256:'a'.repeat(64),refsSha256:'b'.repeat(64),opsSha256:'c'.repeat(64)}),parseReview:()=>null,matchingCoachReview:()=>false,fetch:network};
 new Function(...Object.keys(deps),code)(...Object.values(deps));
 return {run:()=>handler(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer SYNTHETIC_JWT','Content-Type':'application/json'},body:JSON.stringify({planVersionId:P,action:name==='nolio-v2-send-plan'?'capabilities':'load'})})),writes,network};
}
describe('actual QA handler account/ownership policy',()=>{
 it.each(['nolio-v2-send-plan','qa-plan-coach-review'])('%s permits either owned QA account even without a staff role',async name=>{
  for(const actor of [A,B]){const e=endpoint(name,actor);expect((await e.run()).status).toBe(200);expect(e.writes).not.toHaveBeenCalled();expect(e.network).not.toHaveBeenCalled();}
 });
 it.each(['nolio-v2-send-plan','qa-plan-coach-review'])('%s refuses another coach’s plan and another backend before network or writes',async name=>{
  for(const e of [endpoint(name,A,B),endpoint(name,A,A,'OTHER_BACKEND'),endpoint(name,'44444444-4444-4444-8444-444444444444')]){const r=await e.run();expect([403,404]).toContain(r.status);expect(e.writes).not.toHaveBeenCalled();expect(e.network).not.toHaveBeenCalled();}
 });
});
