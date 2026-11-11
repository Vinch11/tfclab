import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';

// Pass the output filename followed by the disjoint JSONL shards from form-matrix.spec.ts.
const [output,...inputs]=process.argv.slice(2);
if(!output || !inputs.length)throw Error('Précisez le fichier de résultat et les matrices JSONL.');
const evidence=new URL('../../../release/det/evidence/',import.meta.url);
const baseline=JSON.parse(readFileSync(new URL('2026-11-10-reprise.json',evidence),'utf8'));
const oracle=JSON.parse(readFileSync(new URL('coach-reference-oracle.json',evidence),'utf8'));
const key=r=>[r.objective,r.level,r.ambition].join('/');
const results=inputs.flatMap(path=>readFileSync(path,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)));
const byKey=new Map(results.map(r=>[key(r),r]));
assert.equal(byKey.size,results.length,'Chaque cellule doit figurer une seule fois.');
const previous=new Map(baseline.matrix.map(r=>[key(r),r]));
assert.deepEqual([...byKey.keys()].sort(),[...previous.keys()].sort(),'Toutes les cellules de référence doivent être rejouées.');
const sorted=[...previous.keys()].map(k=>byKey.get(k));
for(const old of baseline.matrix.filter(r=>r.status==='assembled'))assert.equal(byKey.get(key(old)).status,'assembled',key(old));
for(const old of oracle.referenceRefusals){
  const row=byKey.get(key(old));
  if(old.expectedDecision==='evaluate_diagnostic'){
    assert.equal(row.status,'assembled',key(row));assert.deepEqual(row.limiters,[],key(row));
  }
  if(old.objective==='IM' && old.level==='light')assert.equal(row.status,'assembled',key(row));
  if(old.expectedDecision==='missing_data'){
    assert.equal(row.decision?.kind,'missing_data',key(row));
    assert.deepEqual(row.decision.fields,['loadHistory.recentWeeklyHours','trailLongRunLimits.recentMinutes','trailLongRunLimits.peakMinutes'],key(row));
  }
  if(row.status==='assembled')continue;
  assert.equal(row.status,'refused',key(old));
  assert(row.reasons?.length && row.decision?.kind,key(old));
  if(row.decision.kind==='missing_data' || row.decision.kind==='incompatible')assert(row.decision.fields.length>0,key(old));
}
const assembled=sorted.filter(r=>r.status==='assembled');
const refused=sorted.filter(r=>r.status==='refused');
const count=(rows,get)=>Object.fromEntries([...new Set(rows.map(get))].map(k=>[k,rows.filter(r=>get(r)===k).length]));
const version=JSON.parse(readFileSync(new URL('../dist/manifest.json',evidence),'utf8')).version;
const summary={referenceCount:previous.size,detCases:assembled.length+refused.length,assembled:assembled.length,
  completeReferencePlansPreserved:baseline.matrix.filter(r=>r.status==='assembled').length,
  refusalByDecision:count(refused,r=>r.decision.kind),outsideDet:sorted.filter(r=>r.status==='outside_det').length,
  syntheticFullPlanPrecheck:{complete:assembled.filter(r=>r.exportCheck.complete).length,
    incomplete:assembled.filter(r=>!r.exportCheck.complete).length},
  catalogueSourcesUsed:new Set(assembled.flatMap(r=>r.sourceIds)).size};
writeFileSync(output,JSON.stringify({baseline:oracle.baseline,workerVersion:version,summary,
  scope:'Situations synthétiques du formulaire. Les précontrôles utilisent les séances produites et des associations Nolio simulées. Les observations terrain, la revue indépendante d’un coach et la réception physique ne sont pas mesurées par la matrice.',
  objectives:[...new Set(sorted.map(r=>r.objective))].map(objective=>({objective,status:count(sorted.filter(r=>r.objective===objective),r=>r.decision?.kind??r.status)})),
  resolvedReferenceRefusals:oracle.referenceRefusals.map(r=>{const latest=byKey.get(key(r));return{objective:r.objective,level:r.level,ambition:r.ambition,previousReason:r.firstBlock,expected:r.expectedDecision,result:latest.decision??latest.status,reason:latest.reasons?.[0]};}),matrix:sorted},null,1)+'\n');
console.log(JSON.stringify(summary));
