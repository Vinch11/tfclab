import assert from 'node:assert/strict';
import {test} from 'node:test';
import {deliverToNolio,scopeFor} from './nolioDelivery.ts';
const scope=scopeFor('week-9');
const saved={status:'ARCHIVED',planVersionId:'same-version'};
const match=i=>({opKey:'operation-'+i,sessionKey:'seance-'+i,date:'2027-02-01',path:'/api/v2/planned/trainings/',sentId:'id-'+i,readId:'id-'+i});
test('reprend un lot déjà envoyé et relit chaque page avant de confirmer l’envoi',async()=>{
  const calls=[];
  const responses=[saved,{status:'PREPARED',total:4,confirmed:1},{status:'PROGRESS',total:4,confirmed:3},
    {status:'DONE',total:4,confirmed:4},{status:'VERIFIED',expected:4,totalConfirmed:4,present:2,nextIndex:2,planVersionId:saved.planVersionId,matched:[match(0),match(1)]},
    {status:'VERIFIED',expected:4,totalConfirmed:4,present:2,nextIndex:null,planVersionId:saved.planVersionId,matched:[match(2),match(3)]}];
  const receipt=await deliverToNolio(async job=>{calls.push(job);return responses.shift();},{},scope,new AbortController().signal,()=>{});
  assert.match(receipt.message,/4 activité/);assert.deepEqual(receipt.matched,[0,1,2,3].map(match));assert.deepEqual(calls.map(c=>c.action),['archive','prepare','send','send','verify','verify']);
  assert(calls.slice(1).every(c=>c.planVersionId==='same-version' && c.scope===scope));
  assert.equal(calls.at(-1).fromIndex,2);
});
test('garde une traduction incomplète hors du calendrier et une relecture incertaine visible',async()=>{
  const results=[saved,{status:'REFUSED',reason:'scope_incomplete',refused:[{session:'S9-J3-0',reason:'sport_reference_missing:bike'}]}];
  await assert.rejects(deliverToNolio(async()=>results.shift(),{},scope,new AbortController().signal,()=>{}),/sport_reference_missing:bike/);
  assert.equal(results.length,0);
  const unsure=[saved,{status:'PREPARED',total:1,confirmed:1},{status:'VERIFIED',expected:1,totalConfirmed:1,present:0,unknown:[{}]}];
  await assert.rejects(deliverToNolio(async()=>unsure.shift(),{},scope,new AbortController().signal,()=>{}),/présence et le contenu/);
});

test('exige des identifiants concordants, uniques et liés à la version archivée',async()=>{
  const complete={status:'VERIFIED',expected:2,totalConfirmed:2,present:2,nextIndex:null,planVersionId:saved.planVersionId,matched:[match(0),match(1)]};
  for(const broken of [{matched:undefined},{planVersionId:'autre version'},{matched:[match(0),{...match(1),readId:'autre'}]},{matched:[match(0),match(0)]}]){
    const calls=[saved,{status:'PREPARED',total:2,confirmed:2},{...complete,...broken}];
    await assert.rejects(deliverToNolio(async()=>calls.shift(),{},scope,new AbortController().signal,()=>{}),/identifiants/i);
  }
});
