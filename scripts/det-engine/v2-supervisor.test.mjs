import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {POLICY,digest,createSupervisor,beginCycle,finishCycle,saveState,loadState,validateComparison,prepareRepair,applyRepair,rollbackRepair,resumeRepair,prioritizeDiagnostic,assertExperimentalBranch,applyRegisteredRecipe,rejectRegisteredRepair,executeRegisteredCycle,validationCommandPlan} from './v2-supervisor.mjs';
const branch='experiment/det-engine';
const rows=()=>[{id:'a',technicallyConstructed:true,constraintsSatisfied:true,executedControls:['safety'],issues:[]},{id:'b',technicallyConstructed:false,constraintsSatisfied:false,executedControls:[],issues:[]}];
const evidence=()=>({version:'fixture',controls:[{id:'safety',version:'v1'}],rows:rows()});
const checks={unit:true,nonRegression:true,sporting:true,replay:true};
function begin(state,id='one',cause='cause',now=1){return beginCycle(state,{id,cause,sourceHash:'source',recipeId:'recipe',scope:'global',now});}
function finish(state,id,comparison,now=2,tests=checks){return finishCycle(state,{id,comparison,tests,now});}
function comparison(){const e=evidence();return validateComparison(e,e,e);}

test('same controls and exact replay prove reproducibility without a scientific GO',()=>{
 const e=evidence(),c=validateComparison(e,e,e);assert.equal(c.noCriticalRegression,true);assert.equal(c.reproduced,true);assert.equal(c.scientificGoAttested,false);
});
test('new controls are exposed, never called measured sporting regressions',()=>{
 const old=evidence(),next=evidence();next.controls=[{id:'safety',version:'v2'}];next.rows[0].constraintsSatisfied=false;
 next.rows[0].issues=[{code:'safety',severity:'error',week:1}];
 const c=validateComparison(old,next,next);assert.equal(c.regressions.length,0);assert.equal(c.unattributed.length,2);assert.equal(c.noCriticalRegression,true);
});
test('same-control new critical regression rejects despite more constructed plans',()=>{
 const old=evidence(),next=evidence();next.rows[1].technicallyConstructed=true;next.rows[0].issues=[{code:'safety',severity:'critical',week:2}];next.rows[0].constraintsSatisfied=false;
 const c=validateComparison(old,next,next);assert.equal(c.improvedConstruction,1);assert.equal(c.noCriticalRegression,false);
 const state=createSupervisor({branch,baseline:old,now:0});begin(state);assert.equal(finish(state,'one',c).status,'rejected');
});
test('newly assembled invalid plan is newly exposed, not a previously valid plan regression',()=>{
 const old=evidence(),next=evidence();next.rows[1].technicallyConstructed=true;next.rows[1].issues=[{code:'safety',severity:'error'}];
 const c=validateComparison(old,next,next);assert.equal(c.regressions.length,0);assert.equal(c.newlyExposed.length,1);assert.equal(c.improvedConformance,0);
});
test('missing/duplicate cases and nondeterministic replay cannot pass',()=>{
 const e=evidence(),next=evidence();next.rows.pop();assert.equal(validateComparison(e,next,next).noCriticalRegression,false);
 const duplicate=evidence();duplicate.rows[1].id='a';assert.throws(()=>validateComparison(e,duplicate,duplicate),/DUPLICATE/);
 const replay=evidence();replay.rows[0].nodes=123;assert.equal(validateComparison(e,e,replay).reproduced,false);
});
test('begin/resume/finish is idempotent and does not double-count attempts',()=>{
 const state=createSupervisor({branch,baseline:evidence(),now:0});begin(state);begin(state);assert.equal(state.cycles.length,1);assert.equal(state.attempts.cause,1);
 const c=comparison();finish(state,'one',c);finish(state,'one',c);assert.equal(state.events.filter(e=>e.type==='cycle_finished').length,1);
 assert.throws(()=>beginCycle(state,{id:'one',cause:'other',sourceHash:'source',recipeId:'recipe'}),/COLLISION/);
});
test('state persists atomically and rejected evidence cannot be silently replaced',()=>{
 const dir=mkdtempSync(join(tmpdir(),'det-supervisor-'));try{
  const path=join(dir,'state.json'),state=createSupervisor({branch,baseline:evidence(),now:0});begin(state);saveState(path,state);const resumed=loadState(path);
  const rejected=finish(resumed,'one',comparison(),2,{...checks,sporting:false});assert.equal(rejected.status,'rejected');saveState(path,resumed);
  assert.equal(loadState(path).cycles[0].decision,'validation_failure');assert.throws(()=>finish(resumed,'one',comparison()),/EVIDENCE_CHANGED/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('12-cycle, per-cause, duration and two-global-no-progress budgets stop without a repeat loop',()=>{
 let state=createSupervisor({branch,baseline:evidence(),now:0});state.cycles=Array.from({length:12},(_,i)=>({id:String(i)}));assert.throws(()=>begin(state),/CYCLE_LIMIT/);
 state=createSupervisor({branch,baseline:evidence(),now:0});state.attempts.cause=3;assert.throws(()=>begin(state),/CAUSE_REASSESSMENT/);
 state=createSupervisor({branch,baseline:evidence(),now:0});state.elapsedMs=POLICY.maxDurationMs;assert.throws(()=>begin(state),/DURATION_LIMIT/);
 state=createSupervisor({branch,baseline:evidence(),now:0});begin(state,'a');finish(state,'a',comparison());begin(state,'b','other');finish(state,'b',comparison());assert.throws(()=>begin(state,'c','third'),/STRATEGIC_REASSESSMENT/);
 assert.equal(POLICY.apiBudgetUsd,0);
});
test('production branch and policy mutation are refused',()=>{
 assert.throws(()=>assertExperimentalBranch('main'),/EXPERIMENTAL/);assert.throws(()=>assertExperimentalBranch('experiment/det-engine-malicious-main/../main')&&null);
 const state=createSupervisor({branch,baseline:evidence()});state.policy={...POLICY,maxCycles:99};assert.throws(()=>begin(state),/POLICY_CHANGED/);
});
test('repair restores only owned experimental bytes and preserves independent changes',()=>{
 const root=mkdtempSync(join(tmpdir(),'det-repair-'));try{
  mkdirSync(join(root,'experimental/det-engine'),{recursive:true});const path=join(root,'experimental/det-engine/engine.ts');writeFileSync(path,'original');
  const recipe={id:'recipe',cause:'cause',hypothesis:'falsifiable fixture hypothesis',modifications:[{path:'experimental/det-engine/engine.ts',beforeSha256:digest('original'),afterContent:'candidate'}]};
  const snapshot=prepareRepair(root,recipe);applyRepair(root,snapshot);resumeRepair(root,snapshot);assert.equal(readFileSync(path,'utf8'),'candidate');
  assert.deepEqual(rollbackRepair(root,snapshot).conflicts,[]);assert.equal(readFileSync(path,'utf8'),'original');
  resumeRepair(root,snapshot);writeFileSync(path,'independent edit');assert.deepEqual(rollbackRepair(root,snapshot).conflicts,['experimental/det-engine/engine.ts']);assert.equal(readFileSync(path,'utf8'),'independent edit');assert.throws(()=>resumeRepair(root,snapshot),/CONFLICT/);
  assert.throws(()=>prepareRepair(root,{...recipe,modifications:[{...recipe.modifications[0],path:'src/engines/plan/planValidator.ts'}]}),/FORBIDDEN/);
  assert.throws(()=>prepareRepair(root,{...recipe,modifications:[{...recipe.modifications[0],path:'experimental/det-engine/engine.test.ts'}]}),/FORBIDDEN/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('prioritization skips exhausted causes instead of repeating them',()=>{
 const state=createSupervisor({branch,baseline:evidence()});state.attempts.high=3;
 assert.equal(prioritizeDiagnostic({rootCauseCounts:{high:100,remaining:2}},state)[0].id,'remaining');
});

test('registered recipe survives interruption, resumes once and restores only its own file',()=>{
 const root=mkdtempSync(join(tmpdir(),'det-registered-'));try{
  mkdirSync(join(root,'experimental/det-engine'),{recursive:true});const path=join(root,'experimental/det-engine/engine.ts');writeFileSync(path,'before');
  const statePath=join(root,'state.json');saveState(statePath,createSupervisor({branch,baseline:evidence(),now:0}));
  const recipe={id:'safe_fixture',cycleId:'cycle_1',cause:'fixture',hypothesis:'candidate bytes should pass controls',modifications:[{path:'experimental/det-engine/engine.ts',beforeSha256:digest('before'),afterContent:'after'}]};
  const snapshot=join(root,'proofs');applyRegisteredRecipe(root,statePath,recipe,snapshot,{branch,now:1});
  applyRegisteredRecipe(root,statePath,recipe,snapshot,{branch,now:2});assert.equal(loadState(statePath).attempts.fixture,1);assert.equal(readFileSync(path,'utf8'),'after');
  const cycle=rejectRegisteredRepair(root,statePath,'cycle_1','unit_failure',3);assert.equal(cycle.status,'rejected');assert.equal(readFileSync(path,'utf8'),'before');
  // A resumed completed cycle is a no-op; it cannot replay rejected bytes.
  applyRegisteredRecipe(root,statePath,recipe,snapshot,{branch,now:4});assert.equal(readFileSync(path,'utf8'),'before');assert.equal(loadState(statePath).cycles.length,1);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('new critical multiplicity is detected and accepted improvements cannot be regressed via stale baselines',()=>{
 const old=evidence();old.rows[0].issues=[{code:'safety',severity:'error',week:1}];old.rows[0].constraintsSatisfied=false;
 const next=structuredClone(old);next.rows[0].issues.push({code:'safety',severity:'error',week:1});assert.equal(validateComparison(old,next,next).regressions.length,1);
 const state=createSupervisor({branch,baseline:evidence(),now:0});begin(state,'first');
 const improved=evidence();improved.rows[1].technicallyConstructed=true;improved.rows[1].constraintsSatisfied=true;
 finish(state,'first',validateComparison(evidence(),improved,improved));begin(state,'second','another');
 assert.throws(()=>finish(state,'second',comparison()),/BASELINE_NOT_LAST_ACCEPTED/);
});

test('end-to-end supervisor retains a validated recipe and rolls back a rejected alternative (orchestration test double only)',()=>{
 const root=mkdtempSync(join(tmpdir(),'det-cycle-'));try{
  mkdirSync(join(root,'experimental/det-engine'),{recursive:true});const source=join(root,'experimental/det-engine/engine.ts');writeFileSync(source,'initial');
  const initial=evidence(),statePath=join(root,'state.json'),baselinePath=join(root,'baseline.json');writeFileSync(baselinePath,JSON.stringify(initial));saveState(statePath,createSupervisor({branch,baseline:initial}));
  const improved=evidence();improved.rows[1].technicallyConstructed=true;improved.rows[1].constraintsSatisfied=true;
  const mockValidation=(_root,out)=>{mkdirSync(join(out,'matrix'),{recursive:true});for(const name of ['candidate','replay'])writeFileSync(join(out,'matrix',`${name}.json`),JSON.stringify(improved));return [{name:'orchestration_test_double',ok:true}];};
  const recipe={id:'r1',cycleId:'c1',cause:'fixture',hypothesis:'test lifecycle only',modifications:[{path:'experimental/det-engine/engine.ts',beforeSha256:digest('initial'),afterContent:'accepted'}]};
  const accepted=executeRegisteredCycle(root,statePath,recipe,join(root,'out1'),baselinePath,{branch,validationRunner:mockValidation});assert.equal(accepted.status,'accepted');assert.equal(readFileSync(source,'utf8'),'accepted');
  const failed={...recipe,id:'r2',cycleId:'c2',modifications:[{...recipe.modifications[0],beforeSha256:digest('accepted'),afterContent:'bad candidate'}]};
  const rejected=executeRegisteredCycle(root,statePath,failed,join(root,'out2'),baselinePath,{branch,validationRunner:()=>[{name:'orchestration_test_double',ok:false}]});assert.equal(rejected.status,'rejected');assert.equal(readFileSync(source,'utf8'),'accepted');
  assert.equal(loadState(statePath).cycles.length,2);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('different rule codes under the same broad control and week cannot mask a regression',()=>{
 const old=evidence(),next=evidence();old.rows[0].constraintsSatisfied=false;next.rows[0].constraintsSatisfied=false;
 old.rows[0].issues=[{control:'safety',code:'old_rule',severity:'error',week:4}];
 next.rows[0].issues=[{control:'safety',code:'new_rule',severity:'error',week:4}];
 const c=validateComparison(old,next,next);assert.equal(c.regressions.length,1);assert.equal(c.regressions[0].issue.code,'new_rule');
});
test('newly executed extra control cannot falsely attribute aggregate conformance loss',()=>{
 const old=evidence(),next=evidence();next.controls.push({id:'new_control',version:'1'});next.rows[0].executedControls.push('new_control');next.rows[0].constraintsSatisfied=false;
 next.rows[0].issues=[{control:'new_control',code:'new_rule',severity:'error',week:1}];
 const c=validateComparison(old,next,next);assert.equal(c.regressions.length,0);assert.equal(c.unattributed.length,2);
});
test('message-only legacy week is normalized without treating different titles as new rules',()=>{
 const old=evidence(),next=evidence();old.rows[0].constraintsSatisfied=false;next.rows[0].constraintsSatisfied=false;
 old.rows[0].issues=[{control:'safety',code:'B13',severity:'error',message:'S2 : séance A'}];
 next.rows[0].issues=[{control:'safety',code:'B13',severity:'error',message:'S2 : séance B'}];
 assert.equal(validateComparison(old,next,next).regressions.length,0);
 next.rows[0].issues[0].message='S3 : séance B';assert.equal(validateComparison(old,next,next).regressions.length,1);
});

test('comparable critical multiset reductions count as progress without requiring a new conformant plan',()=>{
 const old=evidence(),next=evidence();old.rows[0].constraintsSatisfied=false;next.rows[0].constraintsSatisfied=false;
 old.rows[0].issues=[{control:'safety',code:'dose',severity:'error',week:1},{control:'safety',code:'dose',severity:'error',week:1},{control:'safety',code:'recovery',severity:'error',week:2}];
 next.rows[0].issues=[{control:'safety',code:'dose',severity:'error',week:1},{control:'safety',code:'recovery',severity:'error',week:2}];
 const c=validateComparison(old,next,next);assert.equal(c.improvedDefects,1);assert.equal(c.improvedConformance,0);assert.equal(c.improvedConstruction,0);assert.equal(c.improvement,true);assert.equal(c.defectReductions[0].count,1);
});
test('gross defect reduction never cancels a different newly introduced critical failure',()=>{
 const old=evidence(),next=evidence();old.rows[0].constraintsSatisfied=false;next.rows[0].constraintsSatisfied=false;
 old.rows[0].issues=[{control:'safety',code:'dose',severity:'error',week:1},{control:'safety',code:'dose',severity:'error',week:2}];
 next.rows[0].issues=[{control:'safety',code:'specificity',severity:'error',week:1}];
 const c=validateComparison(old,next,next);assert.equal(c.improvedDefects,2);assert.equal(c.regressions.length,1);assert.equal(c.noCriticalRegression,false);assert.equal(c.improvement,false);
});
test('missing plan, missing applicability, or changed control cannot be counted as repaired defects',()=>{
 const old=evidence();old.rows[0].constraintsSatisfied=false;old.rows[0].issues=[{control:'safety',code:'dose',severity:'error',week:1}];
 const lostPlan=structuredClone(old);lostPlan.rows[0].technicallyConstructed=false;lostPlan.rows[0].issues=[];assert.equal(validateComparison(old,lostPlan,lostPlan).improvedDefects,0);
 const missing=structuredClone(old);missing.rows[0].issues=[];missing.rows[0].executedControls=[];assert.equal(validateComparison(old,missing,missing).improvedDefects,0);
 const newControl=structuredClone(old);newControl.rows[0].issues=[];newControl.controls[0].version='changed';assert.equal(validateComparison(old,newControl,newControl).improvedDefects,0);
});

test('fixed validation runner selects V2 bundle output and disables legacy matrix without invoking production suite',()=>{
 const plan=validationCommandPlan('/tmp/evidence');assert.deepEqual(plan.map(([name])=>name),['types','supervisor-tests','diagnostic-tests','engine-tests']);
 const engine=plan.find(([name])=>name==='engine-tests');assert.equal(engine[2].TFCL_DET_V2_OUT,'/tmp/evidence/matrix');assert.equal(engine[2].TFCL_DET_MATRIX_OUT,'');
 assert.equal(engine[1].includes('experimental/det-engine/vitest.config.ts'),true);
 assert.equal(validationCommandPlan('/tmp/evidence',{global:false}).at(-1)[2].TFCL_DET_V2_OUT,'');assert.equal(POLICY.apiBudgetUsd,0);
});

test('development can reject a genuinely passing no-progress proposal without falsifying test results',()=>{
 const initial=evidence(),state=createSupervisor({branch,baseline:initial,now:0});begin(state,'no_progress');
 const c=validateComparison(initial,initial,initial);assert.equal(c.improvement,false);
 const result=finishCycle(state,{id:'no_progress',comparison:c,tests:checks,retain:false,now:2});
 assert.equal(result.status,'rejected');assert.equal(result.decision,'development_rejected_no_progress');assert.deepEqual(result.tests,checks);assert.equal(result.retainRequested,false);
 assert.equal(state.currentBaselineHash,digest(initial));assert.equal(state.globalWithoutImprovement,1);
 finishCycle(state,{id:'no_progress',comparison:c,tests:checks,retain:false,now:3});assert.equal(state.events.filter(e=>e.type==='cycle_finished').length,1);
 assert.throws(()=>finishCycle(state,{id:'no_progress',comparison:c,tests:checks,now:3}),/EVIDENCE_CHANGED/);
});
test('no-progress rejection cannot mislabel a measured improvement',()=>{
 const initial=evidence(),next=evidence();next.rows[1].technicallyConstructed=true;
 const state=createSupervisor({branch,baseline:initial});begin(state,'improved');
 assert.throws(()=>finishCycle(state,{id:'improved',comparison:validateComparison(initial,next,next),tests:checks,retain:false}),/NO_PROGRESS_REJECTION_REQUIRES_NO_IMPROVEMENT/);
});
