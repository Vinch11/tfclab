// Offline control-plane primitives. No network, shell, deployment or model client.
const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const CRITERIA = new Set(['limiter_translation', 'session_equivalence', 'intensity_dose',
  'load_progression', 'recovery_periodization', 'constraints_events', 'evidence_limits']);
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const strings = value => Array.isArray(value) && value.length > 0 && value.every(x => typeof x === 'string' && x.length > 0);
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const stopped = reason => ({ state: 'stopped', reason, eligibleForMerge: false, eligibleForDeployment: false });

/** Reserve the full worst-case charge BEFORE dispatch. Timeout retains reservation.
 * Persist serially in a trusted controller before sending; this pure helper is not
 * a network proxy or a durable ledger. No automatic refund or retry exists here. */
export function reserveCall(ledger, request, policy) {
  if (!ledger || !request || !policy ||
      !['calls', 'reservedEur'].every(k => finite(ledger[k])) || !Number.isInteger(ledger.calls) ||
      !['inputTokens', 'outputTokens', 'inputUsdPerMillion', 'outputUsdPerMillion', 'eurPerUsd'].every(k => finite(request[k])) ||
      !Number.isInteger(request.inputTokens) || !Number.isInteger(request.outputTokens) ||
      request.inputTokens === 0 || request.outputTokens === 0 ||
      request.inputUsdPerMillion === 0 || request.outputUsdPerMillion === 0 || request.eurPerUsd === 0 ||
      !['maxApiEur', 'maxCalls', 'maxInputTokensPerCall', 'maxOutputTokensPerCall'].every(k => finite(policy[k]))) {
    return stopped('invalid_budget_evidence');
  }
  if (request.inputTokens > policy.maxInputTokensPerCall || request.outputTokens > policy.maxOutputTokensPerCall)
    return stopped('token_limit');
  if (ledger.calls >= policy.maxCalls) return stopped('call_limit');
  if (policy.apiEnabled !== true) return stopped('api_disabled');
  // Round EUR reservations upward; exchange rate must be supplied explicitly.
  const cost = Math.ceil(request.inputTokens * request.inputUsdPerMillion + request.outputTokens * request.outputUsdPerMillion) / 1e6;
  const costEur = Math.ceil(cost * request.eurPerUsd * 1e6) / 1e6;
  if (Math.round(ledger.reservedEur * 1e6) + Math.round(costEur * 1e6) > Math.floor(policy.maxApiEur * 1e6)) return stopped('budget_limit');
  return { state: 'reserved', costUsd: cost, costEur, ledger: { calls: ledger.calls + 1, reservedEur: (Math.round(ledger.reservedEur * 1e6) + Math.round(costEur * 1e6)) / 1e6 } };
}

/** Numeric demonstration cases; not a replacement for any sporting validator.
 * trustedReview is supplied out-of-band by a FUTURE authenticated controller,
 * never copied from the model's JSON. No such controller is installed here. */
export function decide(packet, review, { iteration = 1, elapsedSeconds = 0,
  maxIterations = 5, maxMissionSeconds = 1800, trustedReview = false } = {}) {
  if (!Number.isInteger(iteration) || iteration < 1 || !Number.isInteger(maxIterations) || maxIterations < 1 ||
      !finite(elapsedSeconds) || !finite(maxMissionSeconds) || maxMissionSeconds === 0) return stopped('invalid_limits');
  if (iteration > maxIterations) return stopped('iteration_limit');
  if (elapsedSeconds >= maxMissionSeconds) return stopped('time_limit');
  if (!packet || !SHA.test(packet.baseSha) || !SHA.test(packet.candidateSha) || !HASH.test(packet.evidenceHash) ||
      !strings(packet.requiredCriteria) || new Set(packet.requiredCriteria).size !== packet.requiredCriteria.length ||
      packet.requiredCriteria.some(x => !CRITERIA.has(x)) || !strings(packet.evidenceIds) ||
      !Array.isArray(packet.measurements) || packet.measurements.length === 0 ||
      !packet.measurements.every(m => m && typeof m.id === 'string' && [m.before, m.after, m.expected].every(finite)) ||
      !Number.isInteger(packet.newCritical) || packet.newCritical < 0) return stopped('invalid_evidence');
  if (packet.softwarePassed !== true) return stopped('software_failure');
  if (packet.newCritical > 0) return stopped('new_critical');
  if (packet.measurements.some(m => m.before === m.expected && m.after !== m.expected)) return stopped('regression');
  if (packet.measurements.some(m => m.after !== m.expected)) return stopped('target_not_met');
  if (!packet.measurements.some(m => m.before !== m.expected)) return stopped('no_baseline_defect');
  if (review == null) return stopped('scientific_review_missing');
  const keys = ['baseSha', 'candidateSha', 'evidenceHash', 'mode', 'decision', 'criteria'];
  if (!exact(review, keys) || !['mock', 'openai'].includes(review.mode) ||
      !['accept', 'reject', 'iterate', 'escalate'].includes(review.decision) || !Array.isArray(review.criteria) ||
      review.criteria.length !== packet.requiredCriteria.length ||
      new Set(review.criteria.map(c => c?.id)).size !== review.criteria.length ||
      !review.criteria.every(c => exact(c, ['id', 'status', 'evidenceIds', 'reason']) && packet.requiredCriteria.includes(c.id) &&
        ['met', 'violated', 'uncertain'].includes(c.status) && strings(c.evidenceIds) &&
        c.evidenceIds.every(id => packet.evidenceIds.includes(id)) && typeof c.reason === 'string' && c.reason.trim().length > 0)) return stopped('invalid_review');
  if (['baseSha', 'candidateSha', 'evidenceHash'].some(k => review[k] !== packet[k])) return stopped('stale_review');
  if (review.criteria.some(c => c.status === 'violated') || review.decision === 'reject') return stopped('scientific_rejection');
  if (review.criteria.some(c => c.status === 'uncertain') || review.decision === 'escalate') return stopped('scientific_uncertainty');
  if (review.decision === 'iterate') return iteration >= maxIterations ? stopped('iteration_limit') :
    { state: 'iterate', eligibleForMerge: false, eligibleForDeployment: false };
  if (review.mode === 'mock') return { state: 'demo_only', eligibleForMerge: false, eligibleForDeployment: false };
  if (!trustedReview) return stopped('untrusted_review_provenance');
  return { state: 'eligible_for_draft', eligibleForMerge: false, eligibleForDeployment: false };
}
