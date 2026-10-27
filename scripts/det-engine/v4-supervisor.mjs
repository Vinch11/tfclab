/** V4 finite work units; no daemon, source patching, deployment or network client. */
import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {digest} from './v2-supervisor.mjs';
export const UNITS=['audit','progression','ironman-contracts','ironman-matrix','trail-generator','trail-matrix','reference-matrix','validation','reporting','publication'];
export function check(state,id,now=Date.now()){
 if(!UNITS.includes(id))throw Error('UNKNOWN_UNIT');
 if(now>=state.deadline*1000||state.deadline-state.startedAt>3600.01)throw Error('DURATION_LIMIT');
 if(state.activeUnit&&state.activeUnit.id!==id)throw Error('OTHER_UNIT_ACTIVE');
 if(!state.units.some(u=>u.id===id)&&state.units.length>=10)throw Error('UNIT_LIMIT');
}
const save=(path,s)=>{mkdirSync(dirname(path),{recursive:true});writeFileSync(path+'.tmp',JSON.stringify(s,null,2)+'\n');renameSync(path+'.tmp',path);};
export function begin(path,id){const s=JSON.parse(readFileSync(path));check(s,id);const prior=s.units.find(u=>u.id===id);if(prior?.status==='passed')return prior;if(prior?.attempts>=3)throw Error('ATTEMPT_LIMIT');
 if(s.activeUnit)throw Error('ACTIVE_OR_INTERRUPTED_UNIT_REQUIRES_PROCESS_CHECK');
 const unit=prior??{id,startedAt:Date.now(),attempts:0,status:'running'};if(prior?.proof){unit.history??=[];unit.history.push({attempt:unit.attempts,proof:unit.proof,completedAt:unit.completedAt});}unit.attempts++;unit.status='running';if(!prior)s.units.push(unit);s.activeUnit={id,startedAt:Date.now()};save(path,s);return unit;}
export function revise(path,id,reason){const s=JSON.parse(readFileSync(path));check(s,id);if(s.activeUnit)throw Error('ACTIVE_UNIT');const u=s.units.find(u=>u.id===id);if(!u||u.status!=='passed'||u.attempts>=3)throw Error('REVISION_NOT_ALLOWED');u.status='revision_requested';u.revisionReason=reason;save(path,s);return u;}
export function finish(path,id,proof){const s=JSON.parse(readFileSync(path));const u=s.units.find(u=>u.id===id);if(!u)throw Error('UNIT_NOT_RESERVED');if(u.status==='passed'){if(digest(u.proof)!==digest(proof))throw Error('PROOF_CHANGED');return u;}
 if(s.activeUnit?.id!==id)throw Error('ACTIVE_UNIT_MISMATCH');u.status=proof.ok?'passed':'failed';u.completedAt=Date.now();u.proof=proof;s.activeUnit=null;s.elapsedSeconds=Date.now()/1000-s.startedAt;save(path,s);return u;}
export function plan(id,out){
 const env={NODE_OPTIONS:'--max-old-space-size=2048',TFCL_DET_MATRIX_OUT:'',TFCL_DET_V2_OUT:'',TFCL_DET_V3_QUALITY_OUT:'',TFCL_DET_V3_IM_OUT:'',TFCL_DET_V3_TRAIL_OUT:'',TFCL_DET_V3_CONTINUE_OUT:'',TFCL_DET_V3_PROGRESSION_OUT:'',TFCL_DET_V3_PLACEMENT_OUT:'',TFCL_DET_V3_IM_REVIEW_OUT:'',TFCL_DET_V4_OUT:out};
 const files={audit:'v4-audit',progression:'v4-progression','ironman-contracts':'v4-ironman','ironman-matrix':'v4-ironman-matrix','trail-generator':'v4-trail','trail-matrix':'v4-trail-matrix','reference-matrix':'v4-reference'};
 if(files[id])return [{name:id,args:['node_modules/vitest/vitest.mjs','run','--config','experimental/det-engine/vitest.v3.config.ts',`experimental/det-engine/${files[id]}.test.ts`,'--maxWorkers=1'],env}];
 if(id==='validation')return [
  {name:'types',args:['node_modules/typescript/bin/tsc','--noEmit','-p','experimental/det-engine/tsconfig.json'],env},
  {name:'node-tests',args:['--test','scripts/det-engine/gates.test.mjs','scripts/det-engine/v2-diagnostic.test.mjs','scripts/det-engine/v2-supervisor.test.mjs','scripts/det-engine/v3-supervisor.test.mjs','scripts/det-engine/v4-supervisor.test.mjs'],env},
  {name:'current-trail-matrix',args:['node_modules/vitest/vitest.mjs','run','--config','experimental/det-engine/vitest.v3.config.ts','experimental/det-engine/v4-trail-matrix.test.ts','--maxWorkers=1'],env:{...env,TFCL_DET_V4_OUT:join(out,'trail-current'),TFCL_DET_V4_TRAIL_COMPARE:'docs/det-engine/v4/checkpoints/trail-r3/candidate.json.gz'}},
  {name:'experimental-tests',args:['node_modules/vitest/vitest.mjs','run','--config','experimental/det-engine/vitest.v3.config.ts','--maxWorkers=1'],env:{...env,TFCL_DET_V4_OUT:''}},
  {name:'historical-tests',args:['node_modules/vitest/vitest.mjs','run','--maxWorkers=1'],env:{...env,TFCL_DET_V4_OUT:''}}];
 throw Error('MANUAL_UNIT_REQUIRES_EVIDENCE');
}
function sourceFingerprint(root){const files=[];for(const dir of ['experimental/det-engine','scripts/det-engine'])for(const n of readdirSync(join(root,dir)))if(/\.(ts|mjs)$/.test(n))files.push([join(dir,n),digest(readFileSync(join(root,dir,n),'utf8'))]);return digest(files);}
export function run(root,path,id,out){const branch=spawnSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'});if(branch.status!==0||!branch.stdout.trim().startsWith('experiment/det-engine'))throw Error('EXPERIMENTAL_BRANCH_REQUIRED');
 const existing=JSON.parse(readFileSync(path)).units.find(u=>u.id===id);if(existing?.status==='passed'){
  if(existing.proof.source!==sourceFingerprint(root))throw Error('COMPLETED_UNIT_SOURCE_CHANGED');
  for(const [p,h] of Object.entries(existing.proof.artifacts??{}))if(!existsSync(p)||digest(readFileSync(p).toString('base64'))!==h)throw Error('COMPLETED_EVIDENCE_CHANGED');return {...existing,idempotent:true};}
 const reservation=JSON.parse(readFileSync(path)).activeUnit;
 if(!reservation)begin(path,id);else if(reservation.id!==id)throw Error('OTHER_UNIT_ACTIVE');
 const s=JSON.parse(readFileSync(path)),source=sourceFingerprint(root);mkdirSync(out,{recursive:true});const commands=[];
 for(const c of plan(id,out)){
  const remaining=Math.min(720000,s.deadline*1000-Date.now());if(remaining<=0){commands.push({name:c.name,ok:false,status:'budget_exhausted'});break;}
  const start=Date.now(),r=spawnSync(process.execPath,c.args,{cwd:root,env:{...process.env,...c.env},encoding:'utf8',timeout:remaining,maxBuffer:64*1024*1024});
  writeFileSync(join(out,c.name+'.txt'),(r.stdout??'')+(r.stderr??''));commands.push({name:c.name,args:c.args,ok:r.status===0&&!r.error,status:r.error?.code==='ETIMEDOUT'?'interrupted':r.error?'unavailable':r.status===0?'passed':'failed',exitCode:r.status,error:r.error?.code,elapsedMs:Date.now()-start});if(!commands.at(-1).ok)break;
 }
 const artifacts=Object.fromEntries(readdirSync(out).filter(n=>/\.(json|gz|txt)$/.test(n)).map(n=>[join(out,n),digest(readFileSync(join(out,n)).toString('base64'))]));
 const proof={ok:commands.every(c=>c.ok),source,commands,artifacts,reservation:reservation??{id,startedAt:Date.now()}};writeFileSync(join(out,'execution.json'),JSON.stringify(proof,null,2));return finish(path,id,proof);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const[action,path,id,out]=process.argv.slice(2);const result=action==='begin'?begin(path,id):action==='finish'?finish(path,id,JSON.parse(readFileSync(out))):action==='revise'?revise(path,id,out):action==='run'?run(process.cwd(),path,id,out):(()=>{throw Error('UNKNOWN_ACTION');})();process.stdout.write(JSON.stringify({id:result.id,status:result.status,idempotent:result.idempotent})+'\n');if(result.status==='failed')process.exitCode=1;}catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}}
