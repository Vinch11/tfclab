import test from 'node:test';import assert from 'node:assert/strict';
import {POLICY,remainingMs,assertBudget,commandPlan,globalStallCount} from './v3-supervisor.mjs';
test('new grant is bounded by sixty minutes and cannot silently extend itself',()=>{
 const s={startedAt:100,deadline:3700,cycles:[]};assert.equal(remainingMs(s,200000),3500000);assertBudget(s,200000);
 assert.throws(()=>assertBudget(s,3700000),/DURATION_LIMIT/);assert.throws(()=>assertBudget({...s,deadline:4000},200000),/INVALID_AUTHORIZED_BUDGET/);
 assert.throws(()=>assertBudget({...s,cycles:Array(12)},200000),/CYCLE_LIMIT/);assert.equal(POLICY.paidApiCalls,0);
});
test('two global cycles without progress require strategy review; focused scientific probes do not hide that stall',()=>{
 const state={cycles:[{cause:'audit',accepted:true},{cause:'progression',accepted:false},{cause:'trail',accepted:false},{cause:'placement',accepted:false}]};
 assert.equal(globalStallCount(state),2);state.cycles.push({cause:'continuation',accepted:true});assert.equal(globalStallCount(state),0);
});
test('only fixed offline commands run and replay inputs remain explicit',()=>{
 assert.throws(()=>commandPlan('shell','/tmp/out'),/UNKNOWN_FIXED_COMMAND/);
 const c=commandPlan('continuation','/tmp/out','/tmp/input.json.gz')[0];assert.equal(c.command,'node');assert.equal(c.env.TFCL_DET_V3_INPUT,'/tmp/input.json.gz');assert.equal(c.env.TFCL_DET_V3_CONTINUE_OUT,'/tmp/out');assert.equal(c.env.TFCL_DET_V2_OUT,'');
 assert.equal(commandPlan('validation','/tmp/out').at(-1).name,'historical-tests');
});
