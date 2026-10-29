/** One isolated safety unit within the original deadline. Does not reopen/renew the three general validation attempts. */
import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import {runLoggedProcess} from './v18-process.mjs';
const R='docs/det-engine/v26',s=JSON.parse(fs.readFileSync(R+'/state.json')),deadline=Date.parse(s.deadline);
if(s.status!=='running'||Date.now()>=deadline||s.units.length>10||s.units.find(u=>u.unit===8)?.status!=='in_progress'||s.safetyValidationLimit!==1||s.safetyValidationUsed||s.validationAttempts!==3||s.automaticRestart)throw Error('V26_SINGLE_SAFETY_UNIT_NOT_AVAILABLE');
if(spawnSync('git',['branch','--show-current'],{encoding:'utf8'}).stdout.trim()!=='experiment/det-engine')throw Error('EXPERIMENT_BRANCH_REQUIRED');
const previous=R+'/evidence/validation-3',receipts=JSON.parse(fs.readFileSync(previous+'/commands.json'));
if(receipts.length!==9||receipts.some(c=>c.status!==0||c.error))throw Error('PRIOR_VALIDATION_NOT_COMPLETE');
const hash=b=>createHash('sha256').update(b).digest('hex');
const legacy=receipts.filter(c=>c.name.endsWith('_non_regression')).map(c=>({...c,reusedFrom:previous+'/'+c.name+'.txt',logSha256:hash(fs.readFileSync(previous+'/'+c.name+'.txt'))}));
if(legacy.length!==6)throw Error('LEGACY_RECEIPTS_REQUIRED');
const out=R+'/evidence/validation-safety';if(fs.existsSync(out))throw Error('FRESH_SAFETY_OUTPUT_REQUIRED');fs.mkdirSync(out);s.safetyValidationUsed=true;fs.writeFileSync(R+'/state.json',JSON.stringify(s,null,2)+'\n');
const pins=JSON.parse(fs.readFileSync(R+'/baseline-files.json'));
for(const f of fs.readdirSync('experimental/det-engine'))if(f.startsWith('v26-')||f==='vitest.v26.config.ts')pins['experimental/det-engine/'+f]=hash(fs.readFileSync('experimental/det-engine/'+f));
for(const f of['scripts/det-engine/v26-run.mjs','scripts/det-engine/v26-safety-run.mjs',R+'/inputs.json',R+'/evidence/v21c-protocol-index.json',R+'/evidence/pr425-readonly.json',R+'/evidence/pr425-file-0.json',R+'/evidence/pr425-file-1.json'])pins[f]=hash(fs.readFileSync(f));
const verify=()=>{for(const[f,h]of Object.entries(pins))if(hash(fs.readFileSync(f))!==h)throw Error('V26_SOURCE_CHANGED:'+f);};verify();
fs.writeFileSync(out+'/executed-source-pins.json',JSON.stringify(pins,null,2)+'\n');
fs.writeFileSync(out+'/reused-non-regression.json',JSON.stringify({reason:'Only new V26 composition/adoption tests changed. All prior modules and six legacy test configurations remain byte-identical; TypeScript is rerun.',sourceCommands:previous+'/commands.json',sourceCommandsSha256:hash(fs.readFileSync(previous+'/commands.json')),receipts:legacy},null,2)+'\n');
const env={...process.env,NODE_OPTIONS:'--max-old-space-size=2048',PYTHONDONTWRITEBYTECODE:'1'};for(const k of Object.keys(env))if(/^TFCL_DET_/.test(k))delete env[k];
const cmd=['node_modules/vitest/vitest.mjs','run','--config','experimental/det-engine/vitest.v26.config.ts'];
const commands=[['build',cmd,{TFCL_DET_V26_OUT:out+'/build'}],['replay',cmd,{TFCL_DET_V26_OUT:out+'/replay'}],['types',['node_modules/typescript/bin/tsc','--noEmit','-p','experimental/det-engine/tsconfig.json'],{}]],done=[];
for(const[name,args,extra]of commands){const left=deadline-Date.now();if(left<1000)throw Error('V26_DEADLINE');const r=await runLoggedProcess(process.execPath,args,{env:{...env,...extra},logFile:out+'/'+name+'.txt',timeoutMs:Math.min(180000,left),maxBytes:12582912});done.push({name,args,...r});fs.writeFileSync(out+'/commands.json',JSON.stringify(done,null,2)+'\n');console.log(name,r.status);if(r.status!==0||r.error)throw Error('V26_SAFETY_VALIDATION_FAILED:'+name);}
verify();console.log('Safety unit completed within original budget; no automatic restart.');
