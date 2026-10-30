/** Explicit V3 budget grant. No daemon, production workflow, source patcher or network client. */
import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {validateComparison} from './v2-supervisor.mjs';
export const POLICY={durationSeconds:3600,maxCycles:12,maxConsecutiveNoProgress:3,maxCommandMs:900000,maxWorkers:1,maxHeapMb:2048,paidApiCalls:0};
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const fileHash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
export function remainingMs(state,now=Date.now()){return Math.max(0,Math.floor(state.deadline*1000-now));}
export function assertBudget(state,now=Date.now()){
 if(!Number.isFinite(state.deadline)||state.deadline-state.startedAt>POLICY.durationSeconds+.01)throw Error('INVALID_AUTHORIZED_BUDGET');
 if(!remainingMs(state,now))throw Error('DURATION_LIMIT');
 if(state.cycles.length>=POLICY.maxCycles)throw Error('CYCLE_LIMIT');
}
export function globalStallCount(state){let count=0;for(const c of [...state.cycles].reverse()){if(!['audit','progression','placement','continuation'].includes(c.cause))continue;if(c.accepted)break;count++;}return count;}
function save(path,state){mkdirSync(dirname(path),{recursive:true});writeFileSync(`${path}.tmp`,JSON.stringify(state,null,2)+'\n');renameSync(`${path}.tmp`,path);}
function readBundle(path){const b=readFileSync(path);return JSON.parse(path.endsWith('.gz')?gunzipSync(b).toString():b.toString());}
function sourceHash(root){const paths=[];function walk(path){for(const entry of readdirSync(join(root,path),{withFileTypes:true})){const next=join(path,entry.name);if(entry.isDirectory())walk(next);else if(/\.(ts|mjs)$/.test(next))paths.push(next);}}
 walk('experimental/det-engine');walk('scripts/det-engine');return hash(paths.sort().map(path=>[path,hash(readFileSync(join(root,path)).toString())]));}
export function commandPlan(kind,out,input){
 const env={NODE_OPTIONS:'--max-old-space-size=2048',TFCL_DET_MATRIX_OUT:'',TFCL_DET_V2_OUT:'',TFCL_DET_V3_INPUT:input??'',
  TFCL_DET_V3_QUALITY_OUT:'',TFCL_DET_V3_IM_OUT:'',TFCL_DET_V3_TRAIL_OUT:'',TFCL_DET_V3_PROGRESSION_OUT:'',TFCL_DET_V3_PLACEMENT_OUT:'',TFCL_DET_V3_CONTINUE_OUT:'',TFCL_DET_V3_IM_REVIEW_OUT:''};
 const test={audit:['v3-quality.test.ts','TFCL_DET_V3_QUALITY_OUT'],ironman:['v3-ironman.test.ts','TFCL_DET_V3_IM_OUT'],trail:['v3-trail.test.ts','TFCL_DET_V3_TRAIL_OUT'],progression:['v3-progression.test.ts','TFCL_DET_V3_PROGRESSION_OUT'],placement:['v3-placement.test.ts','TFCL_DET_V3_PLACEMENT_OUT'],continuation:['v3-continuation.test.ts','TFCL_DET_V3_CONTINUE_OUT']}[kind];
 if(test)return [{name:kind,command:'node',args:['node_modules/vitest/vitest.mjs','run','--config','experimental/det-engine/vitest.v3.config.ts',`experimental/det-engine/${test[0]}`,'--maxWorkers=1'],env:{...env,[test[1]]:out}}];
 if(kind==='validation')return [
  {name:'types',command:'node',args:['node_modules/typescript/bin/tsc','--noEmit','-p','experimental/det-engine/tsconfig.json'],env},
  {name:'node-tests',command:'node',args:['--test','scripts/det-engine/gates.test.mjs','scripts/det-engine/v2-diagnostic.test.mjs','scripts/det-engine/v2-supervisor.test.mjs','scripts/det-engine/v3-supervisor.test.mjs'],env},
  {name:'experimental-tests',command:'node',args:['node_modules/vitest/vitest.mjs','run','--config','experimental/det-engine/vitest.v3.config.ts','--maxWorkers=1'],env},
  {name:'historical-tests',command:'node',args:['node_modules/vitest/vitest.mjs','run','--maxWorkers=1'],env}];
 throw Error('UNKNOWN_FIXED_COMMAND');
}
export function runStep(root,statePath,kind,out,input){
 const state=JSON.parse(readFileSync(statePath));state.steps??=[];
 const branch=spawnSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'});if(branch.status!==0||!branch.stdout.trim().startsWith('experiment/det-engine'))throw Error('EXPERIMENTAL_BRANCH_REQUIRED');
 const source=sourceHash(root),key=hash([kind,source,input?fileHash(input):null]);
 const completed=state.steps.find(s=>s.key===key&&s.status==='passed');
 if(completed){const evidenceRoot=state.archivedOutputs?.[completed.out]??completed.out;
  if(!existsSync(join(root,evidenceRoot,'execution.json'))&&!existsSync(join(evidenceRoot,'execution.json')))throw Error('MISSING_COMPLETED_EVIDENCE');
  for(const [path,expected] of Object.entries(completed.evidenceHashes??{})){const archived=path.startsWith(completed.out+'/')?resolve(root,evidenceRoot,path.slice(completed.out.length+1)):path;if(!existsSync(archived)||fileHash(archived)!==expected)throw Error('COMPLETED_EVIDENCE_CHANGED');}
  return {...completed,idempotent:true};}
 if(state.activeStep)throw Error('ACTIVE_OR_INTERRUPTED_RUN_REQUIRES_PROCESS_CHECK');assertBudget(kind==='validation'?{...state,cycles:[]}:state);
 if(['audit','progression','placement','continuation'].includes(kind)){
  const priorPath=state.lastAccepted?.path??join(root,'docs/det-engine/v2/final/candidate.json.gz');
  const expected=state.lastAccepted?.canonicalSha256??hash(readBundle(priorPath));
  if(hash(readBundle(input??join(root,'docs/det-engine/v2/final/candidate.json.gz')))!==expected)throw Error('BASELINE_NOT_LAST_ACCEPTED');
 }
 const priorGlobal=state.cycles.filter(c=>['audit','progression','placement','continuation'].includes(c.cause)).length;
 if(['audit','progression','placement','continuation'].includes(kind)&&globalStallCount(state)>=2&&state.strategyReviewedThrough!==priorGlobal)throw Error('STRATEGIC_REEVALUATION_REQUIRED');
 const cause=kind,attempts=state.cycles.filter(c=>c.cause===cause);
 let noProgress=0;for(const c of [...attempts].reverse()){if(c.accepted)break;noProgress++;}if(noProgress>=POLICY.maxConsecutiveNoProgress)throw Error('CAUSE_ATTEMPTS_EXHAUSTED');
 const step={id:`v3-${state.steps.length+1}-${kind}`,key,kind,source,out,input:input??null,status:'running',startedAt:Date.now()};
 state.activeStep=step;save(statePath,state);mkdirSync(out,{recursive:true});const commands=[];
 for(const command of commandPlan(kind,out,input)){
  const allowance=Math.min(POLICY.maxCommandMs,remainingMs(state));if(!allowance){commands.push({name:command.name,ok:false,status:'budget_exhausted'});break;}
  const start=Date.now(),r=spawnSync(command.command,command.args,{cwd:root,env:{...process.env,...command.env},encoding:'utf8',timeout:allowance,maxBuffer:64*1024*1024});
  writeFileSync(join(out,`${command.name}.txt`),(r.stdout??'')+(r.stderr??''));
  commands.push({name:command.name,args:command.args,ok:r.status===0&&!r.error,status:r.error?.code==='ETIMEDOUT'?'interrupted':r.error?'unavailable':r.status===0?'passed':'failed',exitCode:r.status,signal:r.signal,error:r.error?.code,elapsedMs:Date.now()-start,timeoutMs:allowance});
  if(!commands.at(-1).ok)break;
 }
 let comparison=null,accepted=false;
 if(commands.every(c=>c.ok)&&['audit','progression','placement','continuation'].includes(kind)){
  const baseline=readBundle(input??join(root,'docs/det-engine/v2/final/candidate.json.gz'));
  comparison=validateComparison(baseline,readBundle(join(out,'candidate.json.gz')),readBundle(join(out,'replay.json.gz')));
  const warnings=bundle=>bundle.rows.reduce((n,r)=>n+r.issues.filter(i=>i.severity==='warning').length,0);
  comparison.warningOccurrencesBefore=warnings(baseline);comparison.warningOccurrencesAfter=warnings(readBundle(join(out,'candidate.json.gz')));
  comparison.warningImprovement=comparison.warningOccurrencesAfter<comparison.warningOccurrencesBefore;
  accepted=comparison.noCriticalRegression&&comparison.reproduced&&(comparison.improvement||comparison.warningImprovement);
 }
 const result={...step,status:commands.every(c=>c.ok)?'passed':'failed',completedAt:Date.now(),commands,comparison,accepted,
  evidenceHashes:Object.fromEntries(['candidate.json.gz','replay.json.gz','quality.json','summary.json','candidates.json.gz','envelopes.json.gz'].map(n=>join(out,n)).filter(existsSync).map(path=>[path,fileHash(path)])),
  decision:commands.some(c=>!c.ok)?'validation_failed_partial_not_retained':comparison?accepted?(comparison.improvement?'measured_critical_improvement_guarded':'measured_warning_improvement_guarded'):'no_measured_improvement_or_comparison_failure':'experimental_evaluation_only'};
 writeFileSync(join(out,'execution.json'),JSON.stringify(result,null,2)+'\n');state.steps.push(result);state.activeStep=null;
 if(kind!=='validation')state.cycles.push({id:step.id,cause,accepted,decision:result.decision,out});
 if(accepted)state.lastAccepted={version:readBundle(join(out,'candidate.json.gz')).version,path:join(out,'candidate.json.gz'),sha256:fileHash(join(out,'candidate.json.gz')),hashEncoding:'raw_file_sha256',canonicalSha256:hash(readBundle(join(out,'candidate.json.gz')))};
 state.elapsedSeconds=(Date.now()/1000-state.startedAt);state.remainingSeconds=remainingMs(state)/1000;save(statePath,state);return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [kind,state,out,input]=process.argv.slice(2);if(!kind||!state||!out)throw Error('USAGE: kind state.json output [baseline.json.gz]');
  if(kind==='reassess'){const s=JSON.parse(readFileSync(state));if(s.activeStep)throw Error('ACTIVE_RUN');s.strategyReviews??=[];s.strategyReviews.push({at:Date.now(),reason:out,through:s.cycles.length});s.strategyReviewedThrough=s.cycles.filter(c=>['audit','progression','placement','continuation'].includes(c.cause)).length;save(state,s);process.stdout.write('strategy_review_recorded\n');}
  else{const r=runStep(process.cwd(),resolve(state),kind,resolve(out),input?resolve(input):undefined);process.stdout.write(JSON.stringify({id:r.id,status:r.status,accepted:r.accepted,decision:r.decision,idempotent:r.idempotent})+'\n');if(r.status!=='passed')process.exitCode=1;}}catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
}
