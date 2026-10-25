import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateCase, DEFAULT_A1 } from '../../../scripts/quality/a1/adapter.mjs';
import { prepareCase, caseIds, expertExpectations } from '../../../scripts/quality/a1/cases.mjs';
import { validateReview, compareToExpert } from '../../../scripts/quality/a1/review.mjs';
import { WorkoutLibrary } from '@/lib/workoutLibrary';

const dirs: string[] = [];
const directory = () => { const path = mkdtempSync(join(tmpdir(), 'tfcl-a1-test-')); dirs.push(path); return path; };
afterEach(() => { for (const path of dirs.splice(0)) rmSync(path, { recursive: true, force: true }); });
const config = { enabled: true, authorized: true, authorizationId: 'MOCK_AUTHORIZATION_ONLY', budgetUsd: 2,
  model: 'mock-model', inputUsdPerMillion: 10, outputUsdPerMillion: 50 };
const args = () => ({ caseId: 'ref-06', missionId: 'mock-mission', stateDir: directory(), config, apiKey: 'FAKE_KEY_CANARY' });
function mockReview(id = 'ref-06') {
  const bundle = prepareCase(id), expectation = expertExpectations[id];
  const evidence = new Map<string, string>(bundle.evidence.map(e => [e.id, e.content] as [string, string]));
  const citations = (ids: string[]) => ids.map(evidenceId => ({ evidenceId, quote: evidence.get(evidenceId).slice(0, 80) }));
  return { caseId: id, bundleHash: bundle.bundleHash, decision: expectation.violated.length ? 'reject' : 'escalate',
    criteria: bundle.applicableCriteria.map(criterion => ({ id: criterion,
      status: expectation.uncertain.includes(criterion) ? 'uncertain' : expectation.violated.includes(criterion) ? 'violated' : 'met',
      citations: citations(id === 'ref-01' ? ['profile'] : criterion === 'session_equivalence' ? ['prescription', 'catalogue'] : ['profile']),
      reason: 'MOCK: checks schema and source references only; not a model performance claim.' })), observations: [], limitations: ['Partial evidence only.'] };
}
function transport(review = mockReview(), mutate = (response) => response) {
  return vi.fn(async (url, init) => {
    if (url.endsWith('/input_tokens')) return Response.json({ object: 'response.input_tokens', input_tokens: 1000 });
    return Response.json(mutate({ id: 'resp_mock', status: 'completed', model: 'mock-model', usage: { input_tokens: 1000, output_tokens: 500 },
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(review) }] }] }));
  });
}

describe('A1 admission and persistent mission bounds — no real network', () => {
  it('keeps the mission-specific default policy at three iterations, thirty minutes and zero USD', () => {
    expect(DEFAULT_A1).toMatchObject({ enabled: false, authorized: false, budgetUsd: 0, maxIterations: 3, maxMissionSeconds: 1800, model: null });
  });
  it('defaults to zero network and remains disabled with an API key', async () => {
    const fetchImpl = transport();
    expect((await evaluateCase({ caseId: 'ref-06', apiKey: 'FAKE', fetchImpl })).code).toBe('api_disabled');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('authorization, budget and key are independent admission gates', async () => {
    const p = args(), fetchImpl = transport();
    expect((await evaluateCase({ ...p, config: { ...config, authorized: false }, fetchImpl })).code).toBe('authorization_required');
    expect((await evaluateCase({ ...p, config: { ...config, budgetUsd: 0 }, fetchImpl })).code).toBe('budget_not_authorized');
    expect((await evaluateCase({ ...p, apiKey: undefined, fetchImpl })).code).toBe('api_key_missing');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('cannot raise the three-iteration or thirty-minute A1 bounds', async () => {
    const p = args(), fetchImpl = transport();
    expect((await evaluateCase({ ...p, config: { ...config, maxIterations: 4 }, fetchImpl })).code).toBe('invalid_configuration');
    expect((await evaluateCase({ ...p, config: { ...config, maxMissionSeconds: 1801 }, fetchImpl })).code).toBe('invalid_configuration');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('validates a mocked Responses result and sends strict output with no tools/storage', async () => {
    const p = args(), fetchImpl = transport();
    const result = await evaluateCase({ ...p, fetchImpl });
    expect(result.state).toBe('review_received'); expect(result.eligibleForMerge).toBe(false);
    expect(result.requestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const sent = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(sent.store).toBe(false); expect(sent.tools).toBeUndefined(); expect(sent.text.format.strict).toBe(true);
    expect(sent.input).not.toContain('expertExpectations'); expect(sent.input).not.toContain('false_defect');
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.openai.com/v1/responses/input_tokens');
    expect(fetchImpl.mock.calls[1][1].redirect).toBe('error');
    expect(readFileSync(join(p.stateDir, 'mock-mission.json'), 'utf8')).not.toContain(p.apiKey);
  });
  it('retains worst-case reservation across successful calls and restart', async () => {
    const p = args(), fetchImpl = transport(), cfg = { ...config, budgetUsd: 0.36 };
    expect((await evaluateCase({ ...p, config: cfg, fetchImpl })).state).toBe('review_received');
    expect((await evaluateCase({ ...p, config: cfg, fetchImpl })).code).toBe('budget_limit');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(readFileSync(join(p.stateDir, 'mock-mission.json'), 'utf8')).reservedUsd).toBe(0.36);
    expect((await evaluateCase({ ...p, fetchImpl })).code).toBe('mission_configuration_changed');
  });
  it('accepts a reasoning item without persisting or exposing its contents', async () => {
    const result = await evaluateCase({ ...args(), fetchImpl: transport(mockReview(), r => ({ ...r,
      output: [{ type: 'reasoning', summary: [{ text: 'DO_NOT_PERSIST_REASONING' }] }, ...r.output] })) });
    expect(result.state).toBe('review_received'); expect(JSON.stringify(result)).not.toContain('DO_NOT_PERSIST_REASONING');
  });
  it('stops a fourth call across independent invocations of the same mission', async () => {
    const p = args(), fetchImpl = transport();
    for (let n = 0; n < 3; n++) expect((await evaluateCase({ ...p, fetchImpl })).state).toBe('review_received');
    expect((await evaluateCase({ ...p, fetchImpl })).code).toBe('iteration_limit'); expect(fetchImpl).toHaveBeenCalledTimes(6);
  });
  it('stops at the persisted mission deadline', async () => {
    const p = args(), fetchImpl = transport();
    await evaluateCase({ ...p, fetchImpl, now: () => 1000 });
    expect((await evaluateCase({ ...p, fetchImpl, now: () => 1801000 })).code).toBe('mission_deadline'); expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it('refuses concurrent or malformed mission state without network', async () => {
    const p = args(), fetchImpl = transport();
    writeFileSync(join(p.stateDir, 'mock-mission.json.lock'), 'held');
    expect((await evaluateCase({ ...p, fetchImpl })).code).toBe('mission_locked'); expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('rejects an unapproved case rather than accepting arbitrary athlete input', async () => {
    const fetchImpl = transport(); expect((await evaluateCase({ ...args(), caseId: '/tmp/athlete.json', fetchImpl })).code).toBe('case_not_approved'); expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('timeout stops without retry, keeps the reservation and never echoes the key', async () => {
    const p = args(), cfg = { ...config, requestTimeoutMs: 5 };
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const result = await evaluateCase({ ...p, config: cfg, fetchImpl });
    expect(result.code).toBe('request_timeout'); expect(JSON.stringify(result)).not.toContain(p.apiKey);
    expect((await evaluateCase({ ...p, config: cfg, fetchImpl })).code).toBe('mission_halted'); expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['usage_unverified', (r) => ({ ...r, usage: null })],
    ['response_incomplete', (r) => ({ ...r, status: 'incomplete' })],
    ['model_version_mismatch', (r) => ({ ...r, model: 'different-model' })],
    ['model_refusal', (r) => ({ ...r, output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'FAKE_KEY_CANARY' }] }] })],
    ['invalid_review_json', (r) => ({ ...r, output: [{ type: 'message', content: [{ type: 'output_text', text: 'FAKE_KEY_CANARY' }] }] })],
    ['unexpected_output', (r) => ({ ...r, output: [{ type: 'function_call' }] })],
  ])('stops on %s and emits only technical error codes', async (code, mutate) => {
    const result = await evaluateCase({ ...args(), fetchImpl: transport(mockReview(), mutate) });
    expect(result.code).toBe(code); expect(JSON.stringify(result)).not.toContain('FAKE_KEY_CANARY');
  });
  it('HTTP failure does not echo response bodies or throw unstructured errors', async () => {
    const result = await evaluateCase({ ...args(), fetchImpl: async () => new Response('PRIVATE_CANARY', { status: 401 }) });
    expect(result.code).toBe('api_http_error'); expect(JSON.stringify(result)).not.toContain('PRIVATE_CANARY');
  });
  it('counts the full input before generation and refuses an oversized input', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ input_tokens: 16001 }));
    expect((await evaluateCase({ ...args(), fetchImpl })).code).toBe('input_token_limit'); expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('halts when the reference evaluator misses a known catalogue conflict', async () => {
    const report = mockReview('ref-05'); report.criteria[0].status = 'met';
    const result = await evaluateCase({ ...args(), caseId: 'ref-05', fetchImpl: transport(report) });
    expect(result.code).toBe('expert_disagreement');
  });
});

describe('A1 evidence and expert references — mock agreement is not measured model accuracy', () => {
  it.each(caseIds)('%s has reproducible evidence and an explicit expert comparison', id => {
    expect(prepareCase(id)).toEqual(prepareCase(id));
    expect(compareToExpert(mockReview(id), prepareCase(id)).ok).toBe(true);
  });
  it('preserves real catalogue metadata rather than widening phase or intensity', () => {
    for (const id of ['ref-02', 'ref-03', 'ref-04', 'ref-05']) {
      const meta = JSON.parse(prepareCase(id).evidence.find(e => e.id === 'catalogue').content);
      const actual = WorkoutLibrary.find(w => w.id === meta.id)!;
      for (const key of Object.keys(meta)) expect(meta[key]).toEqual(actual[key]);
    }
  });
  it('marks missing historical limiters/confidence instead of constructing them', () => {
    const bundle = prepareCase('ref-01'); const profile = JSON.parse(bundle.evidence.find(e => e.id === 'profile').content);
    expect(profile.orderedLimiters).toBeNull(); expect(profile.diagnosticConfidence).toBeNull();
    const session = JSON.parse(bundle.evidence.find(e => e.id === 'plan.S1.session.0').content);
    expect(session.dayIndex).toBeTypeOf('number'); expect(session.dayName).toBeTypeOf('string');
    const report = mockReview('ref-01'); report.criteria.find(c => c.id === 'limiter_translation').status = 'met';
    expect(compareToExpert(report, bundle).ok).toBe(false);
    const serialized = JSON.stringify(bundle);
    expect(serialized).not.toContain('QA Synthetic Beginner'); expect(serialized).not.toContain('"nom"'); expect(serialized).not.toContain('"age"');
  });
  it('rejects fabricated citations and stale bundles', () => {
    const bundle = prepareCase('ref-06'), report = mockReview(); report.criteria[0].citations[0].quote = 'INVENTED QUOTE';
    expect(validateReview(report, bundle).code).toBe('unsupported_citation');
    expect(validateReview({ ...mockReview(), bundleHash: '0'.repeat(64) }, bundle).code).toBe('stale_review');
  });
  it('detects a missed known defect and a false defect in a valid variant', () => {
    const missed = mockReview('ref-05'); missed.criteria[0].status = 'met'; expect(compareToExpert(missed, prepareCase('ref-05')).ok).toBe(false);
    const falsePositive = mockReview(); falsePositive.criteria[0].status = 'violated'; expect(compareToExpert(falsePositive, prepareCase('ref-06')).ok).toBe(false);
    expect(compareToExpert({ ...mockReview(), decision: 'reject' }, prepareCase('ref-06')).ok).toBe(false);
  });
  it('keeps facts, hypotheses and non-evaluable separate and rejects unknown fields', () => {
    const bundle = prepareCase('ref-07'), report = mockReview('ref-07');
    const citation = report.criteria[0].citations[0];
    report.observations.push({ epistemic: 'not_evaluable', severity: 'info', statement: 'No duration recorded.', citations: [citation] });
    expect(validateReview(report, bundle).ok).toBe(true);
    expect(validateReview({ ...report, privateRawModel: 'PRIVATE' }, bundle).ok).toBe(false);
  });
});
