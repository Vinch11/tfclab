import fs from'node:fs';import zlib from'node:zlib';
import{v23Cases,prepareV23Case}from'./v23-cases';import{originalCard,targetedTiming}from'./v14-sources';import{materializeV25Fixtures}from'./v25-fixtures';
export function loadV25TestData(){
 const a=JSON.parse(fs.readFileSync('docs/det-engine/v22/inputs.json','utf8')),b=JSON.parse(fs.readFileSync('docs/det-engine/v23/inputs.json','utf8')),spec=JSON.parse(fs.readFileSync('docs/det-engine/v25/inputs.json','utf8'));
 const source=JSON.parse(fs.readFileSync('docs/det-engine/v25/evidence/pr424-readonly.json','utf8'));
 const old=JSON.parse(zlib.gunzipSync(fs.readFileSync('docs/det-engine/v24/evidence/validation-2/build/results.json.gz')).toString());
 const raw424={...JSON.parse(fs.readFileSync('docs/det-engine/v24/evidence/validation-2/build/physiology-handoff.json','utf8')).external.raw};delete raw424.runningEconomyCostMlKgKm;
 const canonical=new Map<string,any>(zlib.gunzipSync(fs.readFileSync('docs/det-engine/v19/cycle-1/evidence/validation-2/build/catalogue.jsonl.gz')).toString().trim().split('\n').map((l:string)=>{const x=JSON.parse(l);return[x.legacyId,x];}));
 const cases=v23Cases(a,b),prepared=cases.map((c:any)=>prepareV23Case(c,a));
 const seed=old[1].result.result.calendar.weeks[2].slots.find((s:any)=>s.card.id==='SEILER_RUN_Z1_EASY_LONG');
 const fixtures=materializeV25Fixtures(spec,source,raw424,seed);
 return{a,b,spec,source,old,raw424,canonical,cases,prepared,fixtures};
}
