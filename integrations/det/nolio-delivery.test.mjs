import assert from 'node:assert/strict';
import {test} from 'node:test';
import {deliverToNolio,scopeFor} from './nolioDelivery.ts';
const scope=scopeFor('week-9');
const saved={status:'ARCHIVED',planVersionId:'same-version'};
test('reprend un lot déjà envoyé et relit chaque page avant de confirmer l’envoi',async()=>{
  const calls=[];
  const responses=[saved,{status:'PREPARED',total:4,confirmed:1},{status:'PROGRESS',total:4,confirmed:3},
    {status:'DONE',total:4,confirmed:4},{status:'VERIFIED',expected:4,totalConfirmed:4,present:2,nextIndex:2},
    {status:'VERIFIED',expected:4,totalConfirmed:4,present:2,nextIndex:null}];
  const receipt=await deliverToNolio(async job=>{calls.push(job);return responses.shift();},{},scope,new AbortController().signal,()=>{});
  assert.match(receipt,/4 activité/);assert.deepEqual(calls.map(c=>c.action),['archive','prepare','send','send','verify','verify']);
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
