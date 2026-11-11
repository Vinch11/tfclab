import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';

const [output,...files]=process.argv.slice(2);
if(!output || !files.length)throw Error('Précisez la sortie JSON et les rejeux JSONL.');
const reference=JSON.parse(readFileSync(new URL('../../../release/det/evidence/coach-matrix.json',import.meta.url),'utf8'));
const key=r=>[r.objective,r.level,r.ambition].join('/');
const byKey=new Map();
for(const file of files){
  for(const line of readFileSync(file,'utf8').trim().split('\n').filter(Boolean)){
    const row=JSON.parse(line);
    assert(!byKey.has(key(row)),'Rejeu en double : '+key(row));
    byKey.set(key(row),row);
  }
}
const missing=reference.matrix.filter(r=>r.decision?.kind==='missing_data');
assert.deepEqual([...byKey.keys()].sort(),missing.map(key).sort(),'Chaque demande initiale doit avoir un rejeu.');
const cases=missing.map(original=>{
  const row=byKey.get(key(original));
  const input={loadHistory:row.history,...row.supplied};
  for(const field of original.decision.fields){
    const value=field.split('.').reduce((at,name)=>at?.[name],input);
    assert(value!==undefined && value!==null && value!=='','Observation manquante pour '+key(row)+' : '+field);
  }
  if(row.status==='refused'){
    assert(row.reasons?.length && ['engine_limit','incompatible'].includes(row.decision?.kind),key(row));
  }else assert(row.status==='assembled' && row.weeks===row.horizon,key(row));
  return {...row,firstRequest:original.decision.fields};
});
const count=rows=>rows.reduce((counts,r)=>{
  const result=r.status==='assembled'?'assembled':r.decision.kind;
  counts[result]=(counts[result]??0)+1;
  return counts;
},{});
const objectives=Object.fromEntries([...new Set(cases.map(r=>r.objective))].map(o=>[o,count(cases.filter(r=>r.objective===o))]));
const data={workerVersion:reference.workerVersion,baseline:reference.baseline,
  protocol:'Rejeu synthétique des cas auxquels DET demande une donnée. Trois heures récentes pendant quatre semaines et, selon la discipline, 75 min de vélo facile, 65 min de sortie longue à pied, 75 min de sortie trail avec plafond à 105 min ou deux fractions de trois minutes au seuil. Les tests renseignent les champs de la première demande. Les minutes de séance et les opérations de précontrôle sont des mesures techniques.',
  counts:count(cases),objectives,cases};
writeFileSync(output,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(data.counts));
