/** Observed provider read quantum for raw m/s workout targets, 7 Nov 2026.
 * Directional read comparison only: never change a sent body or round watts,
 * doses, source paces, descriptions, identities or non-target numeric fields. */
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
function sameSpeedAtReadPrecision(read:unknown,sent:unknown):boolean{
 if(typeof read!=='number'||typeof sent!=='number'||!Number.isFinite(read)||!Number.isFinite(sent)||read<=0||sent<=0)return false;
 const eps=8*Number.EPSILON*Math.max(1,Math.abs(read),Math.abs(sent));
 // A precise changed value must not be hidden by rounding both sides.
 // Only an actual read on the hundredth-m/s grid is eligible. A tie may be
 // rounded either way (the observed 3.125 -> 3.12 uses the lower tie).
 return Math.abs(read*100-Math.round(read*100))<=eps*100&&Math.abs(read-sent)<=.005+eps;
}
export function alignSpeedReadPrecision(read:unknown,sent:unknown):unknown{
 let visited=0;
 function walk(r:unknown,s:unknown,target:boolean,depth:number):unknown{
  if(++visited>20000||depth>24)return r;
  if(Array.isArray(r)&&Array.isArray(s))return r.map((v,i)=>walk(v,s[i],target,depth+1));
  if(!obj(r)||!obj(s))return r;
  if(target&&r.type==='raw'&&s.type==='raw'&&r.unit==='m/s'&&s.unit==='m/s'){
   // Missing range bounds, inverted bounds and collapsed ranges remain distinct.
   if(('value_max' in r)!==('value_max' in s))return r;
   if('value_max' in r){
    if(typeof r.value!=='number'||typeof r.value_max!=='number'||typeof s.value!=='number'||typeof s.value_max!=='number')return r;
    if(r.value>r.value_max||s.value>s.value_max)return r;
    if(r.value===r.value_max&&s.value!==s.value_max)return r;
   }
   const out={...r};for(const k of ['value','value_max'])if(sameSpeedAtReadPrecision(r[k],s[k]))out[k]=s[k];return out;
  }
  const out={...r};for(const k of ['targets','steps','sets'])if(k in r&&k in s)out[k]=walk(r[k],s[k],k==='targets',depth+1);return out;
 }
 return walk(read,sent,false,0);
}
