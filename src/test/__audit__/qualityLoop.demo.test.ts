/** Inactive-system demonstration. Candidate is a test double, never an engine patch. */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fixture from '@/lib/plan/qa/__tests__/fixtures/2026-10-15_B-5K-BEGINNER_run1.json';
import { jsonPlanToParsedPlan } from '@/lib/plan/jsonPlanToParsedPlan';
import { parseSessionDurationMin } from '@/engines/plan/planValidator';
import type { ParsedSession } from '@/lib/aiPlanParser';
// Node-only offline control plane; not imported by the product.
import { decide, reserveCall } from '../../../scripts/quality/gates.mjs';

const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const fixturePath = 'src/lib/plan/qa/__tests__/fixtures/2026-10-15_B-5K-BEGINNER_run1.json';
const parsed = jsonPlanToParsedPlan(structuredClone(fixture.output.mergedPlan));
// Proposed behavior ONLY in this test double. The real function stays unchanged.
function proposedDuration(session: ParsedSession) {
  if (session.isRest) return 0;
  if (typeof session.durationMin === 'number' && Number.isFinite(session.durationMin) && session.durationMin > 0) return session.durationMin;
  return parseSessionDurationMin(session);
}
const sum = (week: number, fn: typeof parseSessionDurationMin) => parsed.weeks.find(w => w.weekNumber === week)!
  .sessions.reduce((total, session) => total + (fn(session) ?? 0), 0);

describe('quality-loop demonstration without a model or an engine change', () => {
  it('measures the existing defect, simulates a candidate, rejects a regression and stops', () => {
    const legacy = { ...parsed.weeks[0].sessions[0], isRest: false, durationMin: undefined, title: 'Endurance', details: '30min Z2' };
    const rest = { ...legacy, isRest: true, durationMin: 120 };
    const measurements = [
      { id: 'B5K-S8-total', before: sum(8, parseSessionDurationMin), after: sum(8, proposedDuration), expected: 165 },
      { id: 'B5K-S12-total', before: sum(12, parseSessionDurationMin), after: sum(12, proposedDuration), expected: 87 },
      { id: 'legacy-no-structured-duration', before: parseSessionDurationMin(legacy), after: proposedDuration(legacy), expected: 30 },
      { id: 'rest-stays-zero', before: parseSessionDurationMin(rest), after: proposedDuration(rest), expected: 0 },
    ];
    expect(measurements.map(m => m.before)).toEqual([95, 0, 30, 0]);
    expect(measurements.map(m => m.after)).toEqual([165, 87, 30, 0]);
    const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const trackedDirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim().length > 0;
    const evidence = { fixtureSha256: hash(readFileSync(fixturePath)), measurements,
      candidateKind: 'test_double_only', candidateSourceSha256: hash(proposedDuration.toString()),
      testSourceSha256: hash(readFileSync('src/test/__audit__/qualityLoop.demo.test.ts')) };
    const packet = { baseSha: revision, candidateSha: revision, evidenceHash: hash(JSON.stringify(evidence)),
      softwarePassed: true, newCritical: 0, requiredCriteria: ['load_progression', 'evidence_limits'],
      evidenceIds: ['fixture', 'measurements', 'test-double'], measurements };
    const review = { baseSha: revision, candidateSha: revision, evidenceHash: packet.evidenceHash,
      mode: 'mock', decision: 'accept', criteria: packet.requiredCriteria.map(id => ({ id, status: 'met',
        evidenceIds: ['measurements', 'test-double'], reason: 'Simulation checks totals only; no claim about effective intensity or training efficacy.' })) };
    const acceptedSimulation = decide(packet, review);
    const scientificRejection = decide(packet, { ...review, decision: 'reject' });
    const regression = structuredClone(packet); regression.measurements[2].after = 0;
    const rejectedRegression = decide(regression, review);
    const stoppedAtLimit = decide(packet, { ...review, decision: 'iterate' }, { iteration: 3 });
    const zeroBudgetStop = reserveCall({ calls: 0, reservedUsd: 0 },
      { inputTokens: 16000, outputTokens: 4000, inputUsdPerMillion: 10, outputUsdPerMillion: 50 },
      { maxApiUsd: 0, maxCalls: 6, maxInputTokensPerCall: 16000, maxOutputTokensPerCall: 4000 });
    expect(acceptedSimulation.state).toBe('demo_only');
    expect(scientificRejection.reason).toBe('scientific_rejection');
    expect(rejectedRegression.reason).toBe('regression');
    expect(stoppedAtLimit.reason).toBe('iteration_limit');
    expect(zeroBudgetStop.reason).toBe('budget_limit');
    if (process.env.TFCL_QUALITY_DEMO_OUT) {
      const directory = resolve(process.env.TFCL_QUALITY_DEMO_OUT); mkdirSync(directory, { recursive: true });
      const report = { mode: 'offline_mock_only', revision, trackedDirty, apiCalls: 0, apiUsd: 0, evidence, packet, review,
        outcomes: { acceptedSimulation, scientificRejection, rejectedRegression, stoppedAtLimit, zeroBudgetStop },
        limitation: 'No actual candidate commit or independent scientific API review. Same SHA identifies code inspected; test-double has its own hash.' };
      writeFileSync(resolve(directory, 'demo.json'), JSON.stringify(report, null, 2));
      writeFileSync(resolve(directory, 'decisions.jsonl'), Object.entries(report.outcomes).map(([scenario, decision]) => JSON.stringify({ revision,
        evidenceHash: packet.evidenceHash, mode: report.mode, scenario, decision })).join('\n') + '\n');
    }
  });
});
