/** Offline bounded validation controller. No API, git push, production or shell execution. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import {compareEvidence,checkLimits} from './gates.mjs';
const root=process.cwd();
const out=resolve(process.argv[2]??'/tmp/tfcl-det-loop');
const baselinePath=process.argv[3];
const maxIterations=3,maxDurationMs=1800000,maxWorkers=2,maxHeapMb=2048;
const started=Date.now();
mkdirSync(out,{recursive:true});
const log=event=>appendFileSync(`${out}/journal.jsonl`,JSON.stringify({elapsedMs:Date.now()-started,...event})+'\n');
const git=(...args)=>spawnSync('git',args,{encoding:'utf8',maxBuffer:1024*1024});
const branch=git('branch','--show-current').stdout.trim();
if(!branch.startsWith('experiment/det-engine'))throw Error('EXPERIMENTAL_BRANCH_REQUIRED');
const version={commit:git('rev-parse','HEAD').stdout.trim(),branch,
 sourceHash:createHash('sha256').update(readFileSync('experimental/det-engine/engine.ts')).digest('hex'),
 trackedDirty:!!git('status','--porcelain','--untracked-files=no').stdout.trim(),
 untrackedFiles:git('ls-files','--others','--exclude-standard').stdout.trim().split('\n').filter(Boolean),
 testHash:createHash('sha256').update(readFileSync('experimental/det-engine/engine.test.ts')).digest('hex')};
const policy={maxIterations,maxDurationMs,maxWorkers,maxHeapMb,apiBudgetUsd:0,
 automaticMerge:false,deployment:false,paidModels:false,patchApplication:false};
writeFileSync(`${out}/policy.json`,JSON.stringify({policy,version},null,2));
const run=(name,args,extraEnv={})=>{
 const remaining=maxDurationMs-(Date.now()-started);
 if(remaining<=0)throw Error('DURATION_LIMIT');
 const fd=awaitLog(name);
 const execution=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,...extraEnv,NODE_OPTIONS:`--max-old-space-size=${maxHeapMb}`},
  timeout:Math.min(remaining,900000),encoding:'utf8',maxBuffer:32*1024*1024});
 writeFileSync(fd,(execution.stdout??'')+(execution.stderr??''));
 log({name,exitCode:execution.status,error:execution.error?.message});
 return execution.status===0&&!execution.error;
};
function awaitLog(name){return `${out}/${name}.log`;}
const baseline=baselinePath?JSON.parse(readFileSync(baselinePath,'utf8')):undefined;
// Repairs are performed by the development session between explicit invocations.
// No arbitrary command/agent is granted access; failed evidence always stops this invocation.
for(let iteration=1;iteration<=maxIterations;iteration++){
 const evidence=`${out}/iteration-${iteration}`;
 const stop=checkLimits({iteration,elapsedMs:Date.now()-started,...policy});
 if(stop){log({stop});process.exitCode=1;break;}
 log({event:'iteration_start',iteration,version});
 if(!run(`types-${iteration}`,['node_modules/typescript/bin/tsc','--noEmit','-p','experimental/det-engine/tsconfig.json'])){log({stop:'type_failure'});process.exitCode=1;break;}
 if(!run(`tests-${iteration}`,['node_modules/vitest/vitest.mjs','run','--config','experimental/det-engine/vitest.config.ts',`--maxWorkers=${maxWorkers}`,'experimental/det-engine/engine.test.ts'],{TFCL_DET_MATRIX_OUT:evidence})){
  log({stop:'test_failure'});process.exitCode=1;break;
 }
 const rows=JSON.parse(readFileSync(`${evidence}/matrix.json`,'utf8'));
 const regression=compareEvidence(baseline,rows);
 writeFileSync(`${evidence}/comparison.json`,JSON.stringify({baselineProvided:!!baseline,regressedCases:regression},null,2));
 if(regression.length){log({stop:'regression',cases:regression});process.exitCode=1;break;}
 const failures=rows.filter(r=>!r.constraintsSatisfied);
 writeFileSync(`${evidence}/analysis.json`,JSON.stringify({unresolved:failures.length,
  reasons:Object.fromEntries([...new Set(failures.map(r=>r.reason??'final_constraints'))].map(reason=>[reason,failures.filter(r=>(r.reason??'final_constraints')===reason).length]))},null,2));
 // A repeat without implementation changes adds no evidence. Stop for engineering/scientific review.
 log({stop:failures.length?'review_required':'validation_complete',unresolved:failures.length});
 break;
}
