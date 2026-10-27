import{validateV5Budget}from'./v5-budget.mjs';
/** Finite offline runner; no network, patching or automatic session restart. */
import{readFileSync,writeFileSync,renameSync,mkdirSync,readdirSync}from'node:fs';import{spawnSync}from'node:child_process';import{createHash}from'node:crypto';
const path='docs/det-engine/v5/state.json';const hash=x=>createHash('sha256').update(x).digest('hex');
const save=s=>{writeFileSync(path+'.tmp',JSON.stringify(s,null,2));renameSync(path+'.tmp',path);};
const sourceFingerprint=()=>hash(['experimental/det-engine','scripts/det-engine'].flatMap(dir=>readdirSync(dir).filter(n=>/\.(ts|mjs)$/.test(n)).sort().map(n=>dir+'/'+n+':'+hash(readFileSync(dir+'/'+n)))).join('\n'));
const[id,...args]=process.argv.slice(2);const s=JSON.parse(readFileSync(path));
const allowed=args[0]==='node_modules/vitest/vitest.mjs'&&args.includes('run')&&args.includes('--maxWorkers=1')||args[0]==='node_modules/typescript/bin/tsc'||id==='validation'&&args[0]==='scripts/det-engine/v5-validate.mjs'||['audit','publication'].includes(id)&&args[0]==='-e';if(!allowed)throw Error('COMMAND_OUTSIDE_OFFLINE_REGISTRY');
const old=validateV5Budget(s,id);
const branch=spawnSync('git',['branch','--show-current'],{encoding:'utf8'});if(branch.stdout.trim()!=='experiment/det-engine')throw Error('BRANCH');
const source=sourceFingerprint(),outputRoot=process.env.TFCL_DET_V5_OUT??process.env.TFCL_DET_V4_OUT??null;
if(old?.status==='passed'){const a=old.attempts.at(-1);if(a.source===source&&JSON.stringify(a.command)===JSON.stringify(args)&&a.outputRoot===outputRoot&&hash(readFileSync(a.output))===a.sha256){console.log(JSON.stringify({id,idempotent:true,status:'passed'}));process.exit(0);}if(!process.env.TFCL_DET_V5_REVISION_REASON)throw Error('EXPLICIT_REVISION_REASON_REQUIRED');}
if((old?.attempts.length??0)>=3)throw Error('ATTEMPT_LIMIT');
const u=old??{id,attempts:[]};if(!old)s.units.push(u);const a={startedAt:Date.now(),command:args,status:'running',source,outputRoot,revisionReason:process.env.TFCL_DET_V5_REVISION_REASON??null};u.attempts.push(a);u.status='running';s.activeUnit={id,attempt:u.attempts.length,pid:process.pid};save(s);
const out=`docs/det-engine/v5/evidence/${id}-${u.attempts.length}.txt`;mkdirSync('docs/det-engine/v5/evidence',{recursive:true});
const r=spawnSync(process.execPath,args,{encoding:'utf8',env:{...process.env,NODE_OPTIONS:'--max-old-space-size=2048'},timeout:Math.max(1,Math.floor(Math.min(720000,s.deadline*1000-Date.now()))),maxBuffer:64*1024*1024});
writeFileSync(out,(r.stdout??'')+(r.stderr??''));Object.assign(a,{completedAt:Date.now(),status:r.status===0&&!r.error?'passed':'failed',exitCode:r.status,error:r.error?.code,output:out,sha256:hash(readFileSync(out))});u.status=a.status;s.activeUnit=null;save(s);console.log(JSON.stringify(a));process.exitCode=a.status==='passed'?0:1;
