import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { expertExpectations } from './cases.mjs';
const criteria = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/quality/scientific-review.schema.json'))).properties.criteria.items.properties.id.enum;
const citation = z.object({ evidenceId: z.string(), quote: z.string().min(1).max(240) }).strict();
export const reviewSchema = z.object({
  caseId: z.string(), bundleHash: z.string().regex(/^[a-f0-9]{64}$/),
  decision: z.enum(['accept', 'reject', 'iterate', 'escalate']),
  criteria: z.array(z.object({ id: z.enum(criteria), status: z.enum(['met', 'violated', 'uncertain']),
    citations: z.array(citation).min(1), reason: z.string().min(1).max(1500) }).strict()),
  observations: z.array(z.object({ epistemic: z.enum(['fact', 'hypothesis', 'not_evaluable']),
    severity: z.enum(['info', 'warning', 'critical']), statement: z.string().min(1).max(1500),
    citations: z.array(citation).min(1) }).strict()),
  limitations: z.array(z.string().min(1).max(1000)),
}).strict();

// Explicit API schema; runtime Zod plus citation checks remain authoritative.
const str = { type: 'string' };
const obj = properties => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const arr = items => ({ type: 'array', items });
const cite = obj({ evidenceId: str, quote: str });
export const responseSchema = obj({ caseId: str, bundleHash: str,
  decision: { type: 'string', enum: ['accept', 'reject', 'iterate', 'escalate'] },
  criteria: arr(obj({ id: { type: 'string', enum: criteria }, status: { type: 'string', enum: ['met', 'violated', 'uncertain'] }, citations: arr(cite), reason: str })),
  observations: arr(obj({ epistemic: { type: 'string', enum: ['fact', 'hypothesis', 'not_evaluable'] },
    severity: { type: 'string', enum: ['info', 'warning', 'critical'] }, statement: str, citations: arr(cite) })), limitations: arr(str) });

export function validateReview(value, bundle) {
  const parsed = reviewSchema.safeParse(value);
  if (!parsed.success) return { ok: false, code: 'invalid_review_schema' };
  const review = parsed.data;
  if (review.caseId !== bundle.caseId || review.bundleHash !== bundle.bundleHash) return { ok: false, code: 'stale_review' };
  const ids = review.criteria.map(c => c.id);
  if (ids.length !== bundle.applicableCriteria.length || new Set(ids).size !== ids.length ||
      bundle.applicableCriteria.some(id => !ids.includes(id))) return { ok: false, code: 'criterion_coverage' };
  const evidence = new Map(bundle.evidence.map(e => [e.id, e.content]));
  for (const item of [...review.criteria, ...review.observations]) {
    if (item.citations.some(c => !evidence.has(c.evidenceId) || !evidence.get(c.evidenceId).includes(c.quote)))
      return { ok: false, code: 'unsupported_citation' };
  }
  if (review.decision === 'accept' && (review.criteria.some(c => c.status !== 'met') ||
      review.observations.some(o => o.epistemic === 'fact' && o.severity === 'critical')))
    return { ok: false, code: 'inconsistent_acceptance' };
  return { ok: true, review };
}

/** Expert comparison is LOCAL, never sent as an answer key to the API.
 * This tests agreement with explicit references, not scientific truth in general. */
export function compareToExpert(review, bundle) {
  const validation = validateReview(review, bundle);
  if (!validation.ok) return validation;
  const expected = expertExpectations[bundle.caseId];
  const statuses = new Map(review.criteria.map(c => [c.id, c.status]));
  const mismatches = [];
  for (const kind of ['uncertain', 'violated']) for (const id of expected[kind]) {
    if (statuses.get(id) !== kind) mismatches.push(`${id}:${kind}_expected`);
  }
  for (const id of expected.notViolated) if (statuses.get(id) === 'violated') mismatches.push(`${id}:false_defect`);
  if (['ref-06', 'ref-07'].includes(bundle.caseId) && review.observations.some(o => o.epistemic === 'fact' && o.severity === 'critical'))
    mismatches.push('unsupported_critical_fact');
  if (['ref-06', 'ref-07'].includes(bundle.caseId) && review.decision === 'reject') mismatches.push('unsupported_rejection');
  if (expected.violated.includes('session_equivalence')) {
    const cites = review.criteria.find(c => c.id === 'session_equivalence').citations.map(c => c.evidenceId);
    if (!['prescription', 'catalogue'].every(id => cites.includes(id))) mismatches.push('comparison_requires_both_sides');
  }
  return { ok: mismatches.length === 0, code: mismatches.length ? 'expert_disagreement' : 'reference_agreement', mismatches };
}
