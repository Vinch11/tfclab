import { criticalEnvelope, parseStoredCriticalMetrics } from '../criticalMetrics';
import { parseStoredDurability } from '../durability/longSessionDurability';

/** Read the evidence behind the reference assessment. A fitted pair cannot be split
 * into an earlier fit by simply discarding one of its later efforts. */
export function reportFieldEvidence(snapshot: { date: string; critical_metrics?: unknown } | null | undefined) {
  const envelope = criticalEnvelope(snapshot?.critical_metrics);
  const critical = parseStoredCriticalMetrics(envelope);
  const durability = parseStoredDurability(envelope);
  const cutoff = snapshot?.date;
  for (const key of ['running', 'cycling', 'runningPower'] as const) {
    const metric = critical[key];
    if (!metric) continue;
    const sport = key === 'cycling' ? 'cycling' : 'running';
    if (metric.efforts.some(e => !e || e.sport !== sport || (key === 'running' && e.measurement === 'power')
      || (key !== 'running' && e.measurement === 'distance') || (cutoff && e.date > cutoff))
      || (cutoff && metric.latestEffortDate > cutoff)) delete critical[key];
  }
  for (const sport of ['bike', 'run'] as const) {
    if (durability[sport]?.sessions.some(s => cutoff && s.date > cutoff)) delete durability[sport];
  }
  // Preserve unrelated protocol fields. A rejected fit can be mentioned in the
  // coach's illustrated review, but must never resurface in secondary tables.
  const projected: Record<string, unknown> = { ...envelope, durability };
  for (const key of ['running', 'cycling', 'runningPower'] as const) {
    const metric = critical[key];
    if (metric && metric.coachReview?.verdict !== 'reject') projected[key] = metric;
    else delete projected[key];
  }
  return { critical, durability, projected };
}
