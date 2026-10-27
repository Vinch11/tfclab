/** Experimental, local supervisor. No API, arbitrary shell, git checkout/reset or deployment. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const POLICY = Object.freeze({maxCycles:12,maxAttemptsPerCause:3,maxGlobalWithoutImprovement:2,maxDurationMs:1800000,maxWorkers:2,maxHeapMb:2048,commandTimeoutMs:900000,apiBudgetUsd:0});
const critical = issue => ['error','critical','blocking'].includes(issue.severity);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,canonical(value[k])])) : value;
export const digest = value => createHash('sha256').update(typeof value==='string'?value:JSON.stringify(canonical(value))).digest('hex');
const load = path => JSON.parse(readFileSync(path,'utf8'));
function atomic(path,value){mkdirSync(dirname(path),{recursive:true});const tmp=`${path}.tmp`;writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');renameSync(tmp,path);}
function indexRows(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('EVIDENCE_ROWS_REQUIRED');
 const ids=rows.map(r=>r.id);if(ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw Error('DUPLICATE_OR_INVALID_CASE_ID');
 return new Map(rows.map(r=>[r.id,r]));
}
function controlsById(evidence){return new Map((evidence.controls??[]).map(c=>[c.id,c]));}
function issueKey(issue){const week=issue.week??Number(issue.message?.match(/^S(\d+)\s*:/)?.[1]??0);return `${issue.control??'unclassified'}:${issue.code}:${week}:${issue.severity}`;}
/** Both control version AND per-case applicability must be attested before attributing a sporting regression. */
function comparableIssue(issue,old,next,before,after){
 const id=issue.control??issue.code, a=before.get(id), b=after.get(id);
 return a&&b&&a.version===b.version&&old.executedControls?.includes(id)&&next.executedControls?.includes(id);
}
export function validateComparison(baseline,candidate,replay){
 const previous=indexRows(baseline.rows),current=indexRows(candidate.rows);
 const coverageLost=[...previous.keys()].filter(id=>!current.has(id));
 const coverageAdded=[...current.keys()].filter(id=>!previous.has(id));
 const oldControls=controlsById(baseline),newControls=controlsById(candidate);
 const regressions=[],newlyExposed=[],unattributed=[],defectReductions=[];
 let improvedConformance=0,improvedConstruction=0,improvedDefects=0;
 for(const [id,old] of previous){
  const next=current.get(id);if(!next)continue;
  if(old.technicallyConstructed&&!next.technicallyConstructed)regressions.push({id,kind:'lost_construction'});
  if(old.constraintsSatisfied&&!next.constraintsSatisfied){
   const comparable=(old.executedControls??[]).length>0&&digest([...(old.executedControls??[])].sort())===digest([...(next.executedControls??[])].sort())&&(old.executedControls??[]).every(control=>oldControls.get(control)?.version===newControls.get(control)?.version&&next.executedControls?.includes(control));
   (comparable?regressions:unattributed).push({id,kind:comparable?'lost_conformance':'conformance_instrumentation_changed'});
  }
  if(!old.constraintsSatisfied&&next.constraintsSatisfied)improvedConformance++;
  if(!old.technicallyConstructed&&next.technicallyConstructed)improvedConstruction++;
  const oldFailures=new Map(),oldIssueByKey=new Map();for(const issue of (old.issues??[]).filter(critical)){const key=issueKey(issue);oldFailures.set(key,(oldFailures.get(key)??0)+1);oldIssueByKey.set(key,issue);}
  for(const issue of (next.issues??[]).filter(critical)){
   const key=issueKey(issue);if((oldFailures.get(key)??0)>0){oldFailures.set(key,oldFailures.get(key)-1);continue;}
   const item={id,kind:'critical_issue',issue};
   if(!old.technicallyConstructed&&next.technicallyConstructed){newlyExposed.push(item);continue;}
   if(comparableIssue(issue,old,next,oldControls,newControls))regressions.push(item);
   else unattributed.push({...item,kind:'control_not_comparable'});
  }
  // Gross reductions are explicit, never netted against a newly introduced failure.
  // Losing the plan or no longer executing a control is not a corrected defect.
  if(!old.technicallyConstructed||next.technicallyConstructed)for(const [key,count] of oldFailures){
   const issue=oldIssueByKey.get(key);
   if(count>0&&comparableIssue(issue,old,next,oldControls,newControls)){
    improvedDefects+=count;defectReductions.push({id,control:issue.control??issue.code,code:issue.code,week:issue.week??Number(issue.message?.match(/^S(\d+)\s*:/)?.[1]??0),severity:issue.severity,count});
   }
  }
 }
 const reproduced=!!replay&&digest(candidate.rows)===digest(replay.rows)&&digest(candidate.controls??[])===digest(replay.controls??[]);
 // Unknown applicability is visible and prevents a GO claim, without calling it a measured regression.
 const noCriticalRegression=!coverageLost.length&&!regressions.length;
 return {coverageLost,coverageAdded,regressions,newlyExposed,unattributed,reproduced,noCriticalRegression,
  improvedConformance,improvedConstruction,improvedDefects,defectReductions,
  improvement:noCriticalRegression&&reproduced&&!unattributed.length&&(improvedConformance>0||improvedConstruction>0||improvedDefects>0),
  scientificGoAttested:false,baselineHash:digest(baseline),candidateHash:digest(candidate)};
}
/** Diagnostic role ranks measured causes separately from hypotheses. Unknown is never a justified refusal. */
export function prioritizeDiagnostic(diagnostic,state){
 const causes=(diagnostic.causes??Object.entries(diagnostic.rootCauseCounts??{}).map(([id,count])=>({id,count})))
  .map(c=>({...c,id:c.id??c.cause??c.category,count:c.count??c.cases??0}));
 return causes.filter(c=>(state.attempts[c.id]??0)<POLICY.maxAttemptsPerCause)
  .sort((a,b)=>(b.strictSafety===true)-(a.strictSafety===true)||b.count-a.count||String(a.id).localeCompare(String(b.id)));
}
export function assertExperimentalBranch(branch){if(!/^experiment\/det-engine(?:$|[-/][A-Za-z0-9_/-]+$)/.test(branch))throw Error('EXPERIMENTAL_BRANCH_REQUIRED');}
export function createSupervisor({branch,baseline,now=Date.now()}){
 assertExperimentalBranch(branch);indexRows(baseline.rows);
 return {schemaVersion:2,branch,baselineHash:digest(baseline),currentBaselineHash:digest(baseline),baselineVersion:baseline.version,createdAt:now,elapsedMs:0,
  policy:POLICY,cycles:[],attempts:{},globalWithoutImprovement:0,activeCycle:null,events:[{sequence:1,type:'initialized',baselineHash:digest(baseline)}]};
}
function event(state,type,detail={}){state.events.push({sequence:state.events.length+1,type,...detail});}
function checkState(state,branch){
 assertExperimentalBranch(branch);if(branch!==state.branch)throw Error('BRANCH_CHANGED');
 if(digest(state.policy)!==digest(POLICY))throw Error('POLICY_CHANGED');
}
export function beginCycle(state,{id,cause,sourceHash,recipeId,scope='targeted',branch=state.branch,now=Date.now()}){
 checkState(state,branch);
 const prior=state.cycles.find(c=>c.id===id);
 if(prior){if(prior.cause!==cause||prior.sourceHash!==sourceHash||prior.recipeId!==recipeId)throw Error('IDEMPOTENCY_KEY_COLLISION');return prior;}
 if(state.activeCycle)throw Error('CYCLE_ALREADY_ACTIVE');
 if(state.cycles.length>=POLICY.maxCycles)throw Error('CYCLE_LIMIT');
 if(state.elapsedMs>=POLICY.maxDurationMs)throw Error('DURATION_LIMIT');
 if((state.attempts[cause]??0)>=POLICY.maxAttemptsPerCause)throw Error('CAUSE_REASSESSMENT_REQUIRED');
 if(state.globalWithoutImprovement>=POLICY.maxGlobalWithoutImprovement)throw Error('STRATEGIC_REASSESSMENT_REQUIRED');
 if(!/^[A-Za-z0-9_-]+$/.test(id??'')||!cause||!sourceHash||!recipeId)throw Error('CYCLE_PROVENANCE_REQUIRED');
 const cycle={id,cause,sourceHash,recipeId,scope,status:'running',startedAt:now};
 state.attempts[cause]=(state.attempts[cause]??0)+1;state.cycles.push(cycle);state.activeCycle=id;event(state,'cycle_started',{id,cause,sourceHash,recipeId});return cycle;
}
export function finishCycle(state,{id,comparison,tests,artifactHashes={},now=Date.now()}){
 const cycle=state.cycles.find(c=>c.id===id);if(!cycle)throw Error('UNKNOWN_CYCLE');
 const evidenceHash=digest({comparison,tests,artifactHashes});
 if(cycle.status!=='running'){if(cycle.evidenceHash!==evidenceHash)throw Error('COMPLETED_CYCLE_EVIDENCE_CHANGED');return cycle;}
 if(state.activeCycle!==id)throw Error('ACTIVE_CYCLE_MISMATCH');
 if(comparison.baselineHash!==state.currentBaselineHash)throw Error('BASELINE_NOT_LAST_ACCEPTED');
 const allChecks=['unit','nonRegression','sporting','replay'].every(key=>tests[key]===true);
 const accepted=allChecks&&comparison.noCriticalRegression&&comparison.reproduced&&!comparison.unattributed.length;
 Object.assign(cycle,{status:accepted?'accepted':'rejected',finishedAt:now,evidenceHash,comparison,tests,artifactHashes,
  decision:accepted?'retain_experimental_change':!allChecks?'validation_failure':!comparison.reproduced?'non_deterministic':comparison.unattributed.length?'controls_not_comparable':'critical_regression'});
 state.elapsedMs+=Math.max(0,now-cycle.startedAt-(cycle.validationAccountedMs??0));state.activeCycle=null;
 if(accepted)state.currentBaselineHash=comparison.candidateHash;
 if(cycle.scope==='global')state.globalWithoutImprovement=accepted&&comparison.improvement?0:state.globalWithoutImprovement+1;
 event(state,'cycle_finished',{id,status:cycle.status,decision:cycle.decision,comparisonHash:digest(comparison)});return cycle;
}
/** Development role: approved manifest, exact content hashes, experimental source only. No arbitrary executable repair code. */
function safeSource(root,path){
 if(isAbsolute(path)||!/^experimental\/det-engine\/[A-Za-z0-9_/-]+\.ts$/.test(path)||/(?:^|\/)(?:\.\.|[^/]*\.(?:test|spec)|vitest\.config)/.test(path)||path.endsWith('vitest.config.ts'))throw Error('REPAIR_PATH_FORBIDDEN');
 const absolute=resolve(root,path);if(relative(root,absolute).startsWith('..'))throw Error('REPAIR_PATH_ESCAPE');
 if(!existsSync(absolute)||lstatSync(absolute).isSymbolicLink()||realpathSync(absolute)!==absolute)throw Error('REPAIR_SOURCE_NOT_REGULAR');
 return absolute;
}
export function prepareRepair(root,recipe){
 if(!recipe.id||!recipe.cause||!recipe.hypothesis||!recipe.modifications?.length)throw Error('REPAIR_MANIFEST_REQUIRED');
 if(new Set(recipe.modifications.map(m=>m.path)).size!==recipe.modifications.length)throw Error('REPAIR_DUPLICATE_PATH');
 return recipe.modifications.map(m=>{
  const path=safeSource(root,m.path),before=readFileSync(path,'utf8');
  if(digest(before)!==m.beforeSha256)throw Error('REPAIR_BASE_CHANGED');
  if(typeof m.afterContent!=='string')throw Error('REPAIR_CONTENT_REQUIRED');
  return {path:m.path,before,after:m.afterContent,beforeHash:digest(before),afterHash:digest(m.afterContent)};
 });
}
export function applyRepair(root,snapshot){
 for(const change of snapshot){const path=safeSource(root,change.path);if(digest(readFileSync(path,'utf8'))!==change.beforeHash)throw Error('REPAIR_BASE_CHANGED');}
 for(const change of snapshot)writeFileSync(safeSource(root,change.path),change.after);
}
/** Repair role restores only bytes it owns. Concurrent/unrelated edits cause an explicit conflict; no destructive checkout. */
export function rollbackRepair(root,snapshot){
 const conflicts=[];
 for(const change of snapshot){const path=safeSource(root,change.path),current=digest(readFileSync(path,'utf8'));
  if(current===change.beforeHash)continue;
  if(current!==change.afterHash){conflicts.push(change.path);continue;}
  writeFileSync(path,change.before);
 }
 return {restored:snapshot.filter(s=>!conflicts.includes(s.path)).map(s=>s.path),conflicts};
}
export function resumeRepair(root,snapshot){
 // Atomic manifests permit idempotent recovery from a partial application.
 for(const change of snapshot){const current=digest(readFileSync(safeSource(root,change.path),'utf8'));
  if(current!==change.beforeHash&&current!==change.afterHash)throw Error('RESUME_SOURCE_CONFLICT');
 }
 for(const change of snapshot)if(digest(readFileSync(safeSource(root,change.path),'utf8'))===change.beforeHash)writeFileSync(safeSource(root,change.path),change.after);
}
/** Apply/resume a registered content recipe; snapshot and state precede mutation. */
export function applyRegisteredRecipe(root,statePath,recipe,snapshotRoot,{branch,now=Date.now()}={}){
 const state=loadState(statePath);checkState(state,branch??state.branch);
 const id=recipe.cycleId;if(!/^[A-Za-z0-9_-]+$/.test(id??''))throw Error('CYCLE_ID_REQUIRED');
 const snapshotPath=resolve(snapshotRoot,id,'snapshot.json');
 const previous=state.cycles.find(c=>c.id===id);
 if(previous&&previous.status!=='running'){
  if(previous.recipeHash!==digest(recipe))throw Error('IDEMPOTENCY_KEY_COLLISION');return previous;
 }
 let snapshot;
 if(existsSync(snapshotPath)){
  const recorded=load(snapshotPath);if(recorded.recipeHash!==digest(recipe))throw Error('SNAPSHOT_RECIPE_CHANGED');snapshot=recorded.snapshot;
 }else{
  snapshot=prepareRepair(root,recipe);atomic(snapshotPath,{recipeHash:digest(recipe),snapshot});
 }
 const cycle=beginCycle(state,{id,cause:recipe.cause,sourceHash:digest(snapshot.map(s=>({path:s.path,hash:s.beforeHash}))),recipeId:recipe.id,scope:recipe.scope??'targeted',branch:branch??state.branch,now});
 cycle.recipeHash=digest(recipe);cycle.snapshotPath=snapshotPath;saveState(statePath,state);
 resumeRepair(root,snapshot);event(state,'repair_applied',{id,snapshotHash:digest(snapshot)});saveState(statePath,state);return cycle;
}
export function rejectRegisteredRepair(root,statePath,id,reason='experimental_change_rejected',now=Date.now()){
 const state=loadState(statePath),cycle=state.cycles.find(c=>c.id===id);if(!cycle?.snapshotPath)throw Error('OWNED_SNAPSHOT_REQUIRED');
 if(cycle.status==='accepted')throw Error('ACCEPTED_REPAIR_REQUIRES_NEW_CYCLE');
 const snapshot=load(cycle.snapshotPath).snapshot;
 const restoration=rollbackRepair(root,snapshot);cycle.restoration=restoration;
 if(cycle.status==='running'){
  cycle.status='rejected';cycle.finishedAt=now;cycle.decision=reason;state.elapsedMs+=Math.max(0,now-cycle.startedAt-(cycle.validationAccountedMs??0));state.activeCycle=null;
  if(cycle.scope==='global')state.globalWithoutImprovement++;
 }
 event(state,'repair_rejected',{id,reason,restoration});saveState(statePath,state);return cycle;
}
export function saveState(path,state){atomic(path,state);}
export function loadState(path){const state=load(path);if(state.schemaVersion!==2)throw Error('STATE_SCHEMA_VERSION');return state;}
/** Fixed plan is inspectable/testable without running a sporting simulation twice. */
export function validationCommandPlan(out,{global=true}={}){
 return [['types',['node_modules/typescript/bin/tsc','--noEmit','-p','experimental/det-engine/tsconfig.json'],{}],
  ['supervisor-tests',['scripts/det-engine/v2-supervisor.test.mjs'],{}],
  ['diagnostic-tests',['scripts/det-engine/v2-diagnostic.test.mjs'],{}],
  ['engine-tests',['node_modules/vitest/vitest.mjs','run','--config','experimental/det-engine/vitest.config.ts',`--maxWorkers=${POLICY.maxWorkers}`],{TFCL_DET_V2_OUT:global?resolve(out,'matrix'):'',TFCL_DET_MATRIX_OUT:''}]];
}
/** Validator role uses a fixed command plan. It cannot run a shell/paid API or production workflow. */
export function runValidation(root,out,{remainingMs=POLICY.maxDurationMs,global=true}={}){
 mkdirSync(out,{recursive:true});const started=Date.now(),runs=[];
 const commands=validationCommandPlan(out,{global});
 for(const [name,args,env] of commands){
  const remaining=remainingMs-(Date.now()-started);if(remaining<=0){runs.push({name,ok:false,error:'DURATION_LIMIT'});break;}
  const result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,...env,NODE_OPTIONS:`--max-old-space-size=${POLICY.maxHeapMb}`},encoding:'utf8',timeout:Math.min(remaining,POLICY.commandTimeoutMs),maxBuffer:32*1024*1024});
  writeFileSync(resolve(out,`${name}.txt`),(result.stdout??'')+(result.stderr??''));
  const evidence={name,ok:result.status===0&&!result.error,exitCode:result.status,error:result.error?.message};runs.push(evidence);if(!evidence.ok)break;
 }
 atomic(resolve(out,'execution.json'),{runs,elapsedMs:Date.now()-started,policy:POLICY});return runs;
}
/** End-to-end local registered cycle: durable application → fixed validation → comparison → retain or owned-byte rollback. */
export function executeRegisteredCycle(root,statePath,recipe,out,baselinePath,{branch,validationRunner=runValidation}={}){
 const cycle=applyRegisteredRecipe(root,statePath,recipe,resolve(out,'repairs'),{branch});
 if(cycle.status!=='running')return cycle;
 const state=loadState(statePath),remaining=POLICY.maxDurationMs-state.elapsedMs-Math.max(0,Date.now()-cycle.startedAt);
 if(remaining<=0)return rejectRegisteredRepair(root,statePath,cycle.id,'duration_limit');
 const runs=validationRunner(root,resolve(out,'validation'),{remainingMs:remaining,global:true});
 if(!runs.every(r=>r.ok))return rejectRegisteredRepair(root,statePath,cycle.id,'validation_failure');
 const folder=resolve(out,'validation/matrix');
 try{
  const baseline=load(baselinePath),candidate=load(resolve(folder,'candidate.json')),replay=load(resolve(folder,'replay.json'));
  const comparison=validateComparison(baseline,candidate,replay);
  const latest=loadState(statePath),result=finishCycle(latest,{id:cycle.id,comparison,tests:{unit:true,nonRegression:comparison.noCriticalRegression,sporting:true,replay:comparison.reproduced},artifactHashes:{baseline:digest(baseline),candidate:digest(candidate),replay:digest(replay)}});
  saveState(statePath,latest);atomic(resolve(out,'decision.json'),result);
  if(result.status==='rejected')return rejectRegisteredRepair(root,statePath,cycle.id,result.decision);
  return result;
 }catch(error){return rejectRegisteredRepair(root,statePath,cycle.id,`controller_failure:${error.message}`);}
}
export function orchestrationPlan(diagnostic,state){
 return {diagnosticVersion:diagnostic.version,priorities:prioritizeDiagnostic(diagnostic,state),
 roles:{diagnostic:'measured causes and explicit hypotheses',development:'exact-hash experimental repair manifest',validation:'fixed local checks and per-control versioned evidence',repair:'owned-byte rollback or conflict isolation',supervisor:'atomic durable state, budgets and idempotent decisions'},
 permanentProcess:false,paidApiCalls:0,productionAuthorization:false};
}
function actualBranch(root){const r=spawnSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'});if(r.status!==0||r.error)throw Error('GIT_BRANCH_UNAVAILABLE');return r.stdout.trim();}
export function main(args=process.argv.slice(2)){
 const [command,statePath,...rest]=args;if(!command||!statePath)throw Error('Usage: v2-supervisor.mjs init|begin|finish|status|validate STATE ...');
 const root=process.cwd(),branch=actualBranch(root);assertExperimentalBranch(branch);
 if(command==='init'){
  const baseline=load(rest[0]);if(existsSync(statePath)){const state=loadState(statePath);checkState(state,branch);if(state.baselineHash!==digest(baseline))throw Error('BASELINE_CHANGED');return state;}
  const state=createSupervisor({branch,baseline});saveState(statePath,state);return state;
 }
 const state=loadState(statePath);checkState(state,branch);
 if(command==='status')return state;
 if(command==='execute-recipe')return executeRegisteredCycle(root,statePath,load(rest[0]),rest[1],rest[2],{branch});
 if(command==='apply-recipe')return applyRegisteredRecipe(root,statePath,load(rest[0]),rest[1],{branch});
 if(command==='reject-recipe')return rejectRegisteredRepair(root,statePath,rest[0],rest[1]);
 if(command==='begin'){const specification=load(rest[0]);const cycle=beginCycle(state,{...specification,branch});saveState(statePath,state);return cycle;}
 if(command==='finish'){
  const input=load(rest[0]),baseline=load(input.baseline),candidate=load(input.candidate),replay=load(input.replay);
  const cycle=finishCycle(state,{id:input.id,comparison:validateComparison(baseline,candidate,replay),tests:input.tests,artifactHashes:{baseline:digest(baseline),candidate:digest(candidate),replay:digest(replay)}});saveState(statePath,state);return cycle;
 }
 if(command==='validate'){
  if(state.activeValidation)throw Error('VALIDATION_ALREADY_RUNNING_OR_INTERRUPTED');
  const reservation=Math.max(0,POLICY.maxDurationMs-state.elapsedMs);if(!reservation)throw Error('DURATION_LIMIT');
  state.activeValidation={startedAt:Date.now(),reservedMs:reservation,out:resolve(rest[0])};event(state,'validation_reserved',{reservedMs:reservation});saveState(statePath,state);
  const start=Date.now(),runs=runValidation(root,rest[0],{remainingMs:reservation});
  const consumed=Date.now()-start;state.elapsedMs+=consumed;if(state.activeCycle){const cycle=state.cycles.find(c=>c.id===state.activeCycle);cycle.validationAccountedMs=(cycle.validationAccountedMs??0)+consumed;}state.activeValidation=null;event(state,'validation_finished',{runs});saveState(statePath,state);return runs;
 }
 if(command==='recover-validation'){
  if(state.activeValidation){state.elapsedMs+=state.activeValidation.reservedMs;event(state,'interrupted_validation_charged',{reservation:state.activeValidation});state.activeValidation=null;saveState(statePath,state);}return state;
 }
 throw Error('UNKNOWN_COMMAND');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=main();process.stdout.write(JSON.stringify(result,null,2)+'\n');if(result.status==='rejected')process.exitCode=1;}
 catch(error){process.stderr.write(`${error.message}\n`);process.exitCode=1;}
}
