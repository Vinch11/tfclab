import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {Worker} from 'node:worker_threads';
import {receipt} from './receipt.mjs';

const from=(file)=>new URL(file,import.meta.url);
const manifest=JSON.parse(readFileSync(from('../dist/manifest.json'),'utf8'));
const compressed=readFileSync(from('../dist/'+manifest.entry));
const workerSource=gunzipSync(compressed);
const hash=data=>createHash('sha256').update(data).digest('hex');
assert.equal(hash(compressed),manifest.sha256);assert.equal(hash(workerSource),manifest.workerSha256);
assert.equal(compressed.length,manifest.bytes);
const shim=`const {parentPort}=require('node:worker_threads');
globalThis.self=globalThis; globalThis.postMessage=value=>parentPort.postMessage(value);
globalThis.fetch=()=>{throw Error('Network access in DET worker')}; console.log=console.warn=()=>{};`;
const subscriber=";parentPort.on('message',data=>globalThis.onmessage({data}));";
async function run(job){
  const worker=new Worker(shim+workerSource.toString()+subscriber,{eval:true});
  try{return await new Promise((resolve,reject)=>{
    worker.once('error',reject);
    worker.once('message',r=>r.ok&&r.version===manifest.version?resolve(r.value):reject(Error(r.error??'Version incorrecte')));
    worker.postMessage(job);
  });}finally{await worker.terminate();}
}
const input=JSON.parse(readFileSync(from('./ordinary-clm.json'),'utf8'));
console.log(JSON.stringify(await receipt(run,input)));

// This fully synthetic 32-week/12-slot request exhausted the previous
// release's S1 search. Run the shipped worker, not a source-only adapter.
const long=JSON.parse(readFileSync(from('./ordinary-long-im.json'),'utf8'));
const plan=await run({action:'generate',input:long});
const proposal=plan._detSourceProposal;
assert.equal(plan._provenance.engineVersion,manifest.version);
assert.equal(proposal.weeks.length,32);
assert.deepEqual(proposal.limiterOrder,long.config.identifiedLimitersRaw);
assert.equal(proposal.checks.some(c=>c.status==='blocked'),false);
assert(proposal.weeks.every(w=>w.knownMinutes<=long.config.weeklyHours*60));
for(const raw of proposal.limiterOrder)assert(proposal.checks.some(c=>c.code==='ranked_limiter_work'&&c.message.includes(' · '+raw+' · ')));
console.log(JSON.stringify({case:'synthetic-long-IM',weeks:32,ranked:proposal.limiterOrder,repairWeeks:proposal.checks.filter(c=>c.code==='adaptive_search').map(c=>c.week)}));

for (const [goal,fixture,level] of [
  ['703','ordinary-light-703','light'],['10K','ordinary-light-10K','light'],
  ['TrailShort','ordinary-light-TrailShort','light'],['Marathon','ordinary-high-marathon','highly_trained']
]){
  const input=JSON.parse(readFileSync(from('./'+fixture+'.json'),'utf8'));
  const result=await run({action:'generate',input});
  const p=result._detSourceProposal;
  const components=p.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components)));
  assert.equal(result._provenance.engineVersion,manifest.version);
  assert.equal(p.weeks.length,input.config.weeksAvailable);
  assert.deepEqual(p.limiterOrder,input.config.identifiedLimitersRaw);
  assert(p.weeks.every(w=>w.knownMinutes<=input.config.weeklyHours*60));
  assert.equal(p.checks.some(c=>c.status==='blocked'),false);
  if(level==='light')assert(components.every(c=>['untrained','light'].includes(c.review.minimumLevel)));
  for(const label of p.limiterOrder)assert(p.checks.some(c=>c.code==='ranked_limiter_work'&&c.message.includes(' · '+label+' · ')));
  if(goal==='TrailShort'){
    assert(components.some(c=>c.sourceId==='V3P_RUN_216'));
    assert(components.filter(c=>c.sport==='run').every(c=>c.targets.status==='unresolved' && c.targets.targets.length===0));
    assert(p.checks.some(c=>c.code==='trail_route_review' && c.status==='pending'));
  }
  console.log(JSON.stringify({case:goal,level,weeks:p.weeks.length,ranked:p.limiterOrder,
    sources:[...new Set(components.map(c=>c.sourceId))].sort()}));
}
