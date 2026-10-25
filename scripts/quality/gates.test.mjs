import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, reserveCall } from './gates.mjs';
const packet = () => ({ baseSha: 'a'.repeat(40), candidateSha: 'b'.repeat(40), evidenceHash: 'c'.repeat(64),
  softwarePassed: true, newCritical: 0, requiredCriteria: ['load_progression'], evidenceIds: ['fixture', 'cases'],
  measurements: [{ id: 'known-defect', before: 95, after: 165, expected: 165 }, { id: 'control', before: 30, after: 30, expected: 30 }] });
const review = () => ({ baseSha: 'a'.repeat(40), candidateSha: 'b'.repeat(40), evidenceHash: 'c'.repeat(64), mode: 'mock',
  decision: 'accept', criteria: [{ id: 'load_progression', status: 'met', evidenceIds: ['cases'], reason: 'Same fixture, expected total preserved.' }] });
test('mock acceptance never becomes a real scientific approval', () => assert.equal(decide(packet(), review()).state, 'demo_only'));
test('green software can be scientifically rejected', () => assert.equal(decide(packet(), { ...review(), decision: 'reject' }).reason, 'scientific_rejection'));
test('regression stops before any favorable review', () => {
  const p = packet(); p.measurements[1].after = 0; assert.equal(decide(p, review()).reason, 'regression');
});
test('uncertainty escalates', () => { const r = review(); r.criteria[0].status = 'uncertain'; assert.equal(decide(packet(), r).reason, 'scientific_uncertainty'); });
test('new commit invalidates the review', () => assert.equal(decide(packet(), { ...review(), candidateSha: 'd'.repeat(40) }).reason, 'stale_review'));
test('fabricated citation fails closed', () => { const r = review(); r.criteria[0].evidenceIds = ['not-in-bundle']; assert.equal(decide(packet(), r).reason, 'invalid_review'); });
test('missing review fails closed', () => assert.equal(decide(packet(), null).reason, 'scientific_review_missing'));
test('missing criterion fails closed', () => assert.equal(decide(packet(), { ...review(), criteria: [] }).reason, 'invalid_review'));
test('duplicate criteria fail closed', () => { const p = packet(); p.requiredCriteria.push('load_progression'); assert.equal(decide(p, review()).reason, 'invalid_evidence'); });
test('unknown review fields fail closed', () => assert.equal(decide(packet(), { ...review(), score: 100 }).reason, 'invalid_review'));
test('unmet target fails closed', () => { const p = packet(); p.measurements[0].after = 100; assert.equal(decide(p, review()).reason, 'target_not_met'); });
test('software failure and new critical stop', () => {
  assert.equal(decide({ ...packet(), softwarePassed: false }, review()).reason, 'software_failure');
  assert.equal(decide({ ...packet(), newCritical: 1 }, review()).reason, 'new_critical');
});
test('iteration cap and elapsed deadline stop', () => {
  assert.equal(decide(packet(), review(), { iteration: 4 }).reason, 'iteration_limit');
  assert.equal(decide(packet(), review(), { elapsedSeconds: 1800 }).reason, 'time_limit');
  assert.equal(decide(packet(), { ...review(), decision: 'iterate' }, { iteration: 3 }).reason, 'iteration_limit');
});
test('forged OpenAI mode does not authenticate a review', () => assert.equal(decide(packet(), { ...review(), mode: 'openai' }).reason, 'untrusted_review_provenance'));
const policy = { maxApiUsd: 5, maxCalls: 6, maxInputTokensPerCall: 16000, maxOutputTokensPerCall: 4000 };
const request = { inputTokens: 16000, outputTokens: 4000, inputUsdPerMillion: 10, outputUsdPerMillion: 50 };
test('worst-case reservation includes full input/output', () => {
  const result = reserveCall({ calls: 0, reservedUsd: 0 }, request, policy); assert.equal(result.costUsd, 0.36); assert.equal(result.ledger.calls, 1);
});
test('zero budget prohibits all paid dispatch', () => assert.equal(reserveCall({ calls: 0, reservedUsd: 0 }, request, { ...policy, maxApiUsd: 0 }).reason, 'budget_limit'));
test('reservations survive timeout and cannot silently refund themselves', () => {
  const held = reserveCall({ calls: 0, reservedUsd: 0 }, request, { ...policy, maxApiUsd: 0.36 });
  assert.equal(reserveCall(held.ledger, request, { ...policy, maxApiUsd: 0.36 }).reason, 'budget_limit');
});
test('missing price/count, token cap and call cap stop', () => {
  assert.equal(reserveCall({ calls: 0, reservedUsd: 0 }, { ...request, inputUsdPerMillion: NaN }, policy).reason, 'invalid_budget_evidence');
  assert.equal(reserveCall({ calls: 0, reservedUsd: 0 }, { ...request, outputTokens: 4001 }, policy).reason, 'token_limit');
  assert.equal(reserveCall({ calls: 6, reservedUsd: 0 }, request, policy).reason, 'call_limit');
});
