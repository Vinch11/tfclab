import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareEvidence,checkLimits} from './gates.mjs';
const fixture=()=>Array.from({length:600},(_,i)=>({id:String(i),technicallyConstructed:true,constraintsSatisfied:true,issues:[]}));
test('stops on lost construction or conformity, per case',()=>{
 const old=fixture(),next=fixture();next[1].technicallyConstructed=false;next[2].constraintsSatisfied=false;
 assert.deepEqual(compareEvidence(old,next),['1','2']);
});
test('stops on new critical issue even when totals improve',()=>{
 const old=fixture(),next=fixture();old[0].constraintsSatisfied=false;
 next[1].issues.push({code:'recovery',week:2,severity:'critical'});
 assert.deepEqual(compareEvidence(old,next),['1']);
});
test('refuses missing and duplicated coverage',()=>{
 assert.throws(()=>compareEvidence(fixture(),fixture().slice(1)),/COVERAGE/);
 const rows=fixture();rows[1].id='0';assert.throws(()=>compareEvidence([],rows),/COVERAGE/);
});
test('accepts unchanged evidence without certifying scientific relevance',()=>assert.deepEqual(compareEvidence(fixture(),fixture()),[]));
test('duration, iteration and zero API budget have hard stops',()=>{
 const context={iteration:3,elapsedMs:1,maxIterations:3,maxDurationMs:10,apiBudgetUsd:0};
 assert.equal(checkLimits(context),null);
 assert.equal(checkLimits({...context,iteration:4}),'iteration_limit');
 assert.equal(checkLimits({...context,elapsedMs:10}),'duration_limit');
 assert.equal(checkLimits({...context,apiBudgetUsd:1}),'paid_api_forbidden');
});
