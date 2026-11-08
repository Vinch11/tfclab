import {parsePaceSeconds} from './paceTarget.ts';
type Obj=Record<string,unknown>;
const obj=(x:unknown):x is Obj=>!!x&&typeof x==='object'&&!Array.isArray(x);
/** Diagnostic bodies ONLY. Never return operations, receipts or send authority.
 * Full-workout variants preserve the exact physical target interval. Isolated
 * syntax probes are explicitly non-prescriptive and can ONLY use dry_run. */
export function paceTransportProbes(body:Obj):Array<{test:string;body:Obj}>{
 const probes=[{test:'original',body:structuredClone(body)}];
 const samples:Array<{step:Obj;target:Obj}>=[];
 function visit(nodes:unknown,mode:'collect'|'mps'|'speed_order'){
  if(!Array.isArray(nodes))return;
  for(const n of nodes){
   if(!obj(n))continue;
   visit(n.steps,mode);
   if(n.kind!=='step'||!Array.isArray(n.targets))continue;
   for(const t of n.targets){
    if(!obj(t)||t.type!=='raw'||!['/km','/100m'].includes(String(t.unit)))continue;
    const a=parsePaceSeconds(t.value),b=t.value_max===undefined?a:parsePaceSeconds(t.value_max);
    if(a===null||b===null)continue;
    if(mode==='collect')samples.push({step:n,target:t});
    else if(mode==='speed_order'){
     if(b>a){const old=t.value;t.value=t.value_max;t.value_max=old;}
    }else{
     const d=t.unit==='/km'?1000:100,lo=d/Math.max(a,b),hi=d/Math.min(a,b);
     t.unit='m/s';t.value=lo;if(t.value_max!==undefined)t.value_max=hi;
    }
   }
  }
 }
 visit(body.workout,'collect');if(!samples.length)return probes;
 for(const [test,mode] of [['exact_numeric_mps','mps'],['pace_speed_order','speed_order']] as const){
  const copy=structuredClone(body);visit(copy.workout,mode);probes.push({test,body:copy});
 }
 for(const [test,decimal] of [['single_integer_pace',false],['single_fractional_pace',true]] as const){
  const sample=samples.flatMap(s=>[s.target.value,s.target.value_max].filter(v=>typeof v==='string'&&v.includes('.')===decimal).map(value=>({...s,value}))).find(s=>obj(s.step.duration));
  if(!sample)continue;
  const step=structuredClone(sample.step);step.targets=[{type:'raw',unit:sample.target.unit,value:sample.value}];
  probes.push({test,body:{...structuredClone(body),name:'TFCLab — diagnostic de format (simulation)',description:'Diagnostic technique non prescriptif — dry_run uniquement.',duration:step.duration,workout:[step]}});
 }
 return probes.slice(0,5);
}
