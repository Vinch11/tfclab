import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {runLoggedProcess} from './v18-process.mjs';
const R='docs/det-engine/v26',s=JSON.parse(fs.readFileSync(R+'/state.json')),deadline=Date.parse(s.deadline);
if(s.status!=='running'||Date.now()>=deadline||deadline-Date.parse(s.startedAt)>3600000||s.units.length>10||s.maxUnits!==10||s.automaticRestart)throw Error('V26_BUDGET_OR_CLOSURE');
if(spawnSync('git',['branch','--show-current'],{encoding:'utf8'}).stdout.trim()!=='experiment/det-engine')throw Error('EXPERIMENT_BRANCH_REQUIRED');
const n=(s.validationAttempts??0)+1;if(n>3)throw Error('V26_ATTEMPTS');const out=R+'/evidence/validation-'+n;if(fs.existsSync(out))throw Error('FRESH_OUTPUT_REQUIRED');fs.mkdirSync(out);
s.validationAttempts=n;fs.writeFileSync(R+'/state.json',JSON.stringify(s,null,2)+'\n');
const hash=b=>createHash('sha256').update(b).digest('hex'),pins=JSON.parse(fs.readFileSync(R+'/baseline-files.json'));
for(const f of fs.readdirSync('experimental/det-engine'))if(f.startsWith('v26-')||f==='vitest.v26.config.ts')pins['experimental/det-engine/'+f]=hash(fs.readFileSync('experimental/det-engine/'+f));
for(const f of['scripts/det-engine/v26-run.mjs',R+'/inputs.json',R+'/evidence/v21c-protocol-index.json',R+'/evidence/pr425-readonly.json',R+'/evidence/pr425-file-0.json',R+'/evidence/pr425-file-1.json'])pins[f]=hash(fs.readFileSync(f));
const verify=()=>{for(const[f,h]of Object.entries(pins))if(hash(fs.readFileSync(f))!==h)throw Error('PINNED_SOURCE_CHANGED:'+f);};verify();fs.writeFileSync(out+'/executed-source-pins.json',JSON.stringify(pins,null,2)+'\n');
const env={...process.env,NODE_OPTIONS:'--max-old-space-size=2048',PYTHONDONTWRITEBYTECODE:'1'};for(const k of Object.keys(env))if(/^TFCL_DET_/.test(k))delete env[k];
const cmd=c=>['node_modules/vitest/vitest.mjs','run','--config','experimental/det-engine/'+c];
const commands=[['build',cmd('vitest.v26.config.ts'),{TFCL_DET_V26_OUT:out+'/build'}],['replay',cmd('vitest.v26.config.ts'),{TFCL_DET_V26_OUT:out+'/replay'}],['coach_floor_non_regression',cmd('vitest.coach-floor.config.ts'),{}],['v25_non_regression',cmd('vitest.v25.config.ts'),{}],['v24_non_regression',cmd('vitest.v24.config.ts'),{}],['v23_non_regression',cmd('vitest.v23.config.ts'),{}],['v22_non_regression',cmd('vitest.v22.config.ts'),{}],['multiobjective_non_regression',cmd('vitest.v22-regression.config.ts'),{}],['types',['node_modules/typescript/bin/tsc','--noEmit','-p','experimental/det-engine/tsconfig.json'],{}]];
const receipts=[];for(const[name,args,extra]of commands){const left=deadline-Date.now();if(left<1000)throw Error('V26_DEADLINE');const r=await runLoggedProcess(process.execPath,args,{env:{...env,...extra},logFile:out+'/'+name+'.txt',timeoutMs:Math.min(180000,left),maxBytes:12582912});receipts.push({name,args,...r});fs.writeFileSync(out+'/commands.json',JSON.stringify(receipts,null,2)+'\n');console.log(name,r.status);if(r.status!==0||r.error)throw Error('V26_VALIDATION_FAILED:'+name);}
verify();console.log('V26 bounded validation finished; no restart.');
