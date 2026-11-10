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
