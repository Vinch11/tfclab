import { CRITICAL_POLICY, type CriticalEffort, type CriticalFit, type CriticalSport } from './criticalEfforts';

/**
 * Stored critical metrics on a snapshot (`snapshots.critical_metrics`).
 * - `estimate`: fitted from records/unconfirmed efforts — shown, never adjusts sessions.
 * - `confirmed`: eligible fit (≥3 confirmed efforts, quality checks passed) + explicit coach approval.
 * cycling: critical = CP (W), reserve = W′ (J). running: critical = CS (m/s), reserve = D′ (m).
 */
export interface StoredCriticalSport {
  critical: number;
  reserve: number;
  status: 'estimate' | 'confirmed';
  efforts: CriticalEffort[];
  r2: number | null;
  residualPct: number;
  sensitivityPct: number | null;
  warnings: string[];
  savedAt: string;
  latestEffortDate: string;
}
export type StoredCriticalMetrics = Partial<Record<CriticalSport, StoredCriticalSport>>;

export function toStoredCritical(fit: CriticalFit, efforts: CriticalEffort[], coachApproved: boolean, today: string): StoredCriticalSport | null {
  if (fit.status === 'insufficient' || !(fit.critical > 0) || !(fit.reserve > 0)) return null;
  const dates = efforts.map(e => e.date).filter(Boolean).sort();
  return {
    critical: fit.critical, reserve: fit.reserve,
    status: fit.status === 'eligible' && coachApproved ? 'confirmed' : 'estimate',
    efforts, r2: fit.r2, residualPct: fit.residualPct, sensitivityPct: fit.sensitivityPct,
    warnings: [...fit.errors, ...fit.warnings], savedAt: today, latestEffortDate: dates[dates.length - 1] ?? '',
  };
}

const finitePositive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

export function parseStoredCriticalMetrics(raw: unknown): StoredCriticalMetrics {
  let value = raw;
  if (typeof raw === 'string') { try { value = JSON.parse(raw); } catch { return {}; } }
  if (!value || typeof value !== 'object') return {};
  const out: StoredCriticalMetrics = {};
  for (const sport of ['running', 'cycling'] as const) {
    const s = (value as Record<string, unknown>)[sport] as Partial<StoredCriticalSport> | undefined;
    if (!s || !finitePositive(s.critical) || !finitePositive(s.reserve) || (s.status !== 'estimate' && s.status !== 'confirmed')) continue;
    out[sport] = { ...s, efforts: Array.isArray(s.efforts) ? s.efforts : [], warnings: Array.isArray(s.warnings) ? s.warnings : [], latestEffortDate: s.latestEffortDate ?? '', savedAt: s.savedAt ?? '', r2: s.r2 ?? null, residualPct: s.residualPct ?? 0, sensitivityPct: s.sensitivityPct ?? null } as StoredCriticalSport;
  }
  return out;
}

/** Only coach-confirmed, recent values may produce session proposals. */
export function criticalForSessions(metrics: StoredCriticalMetrics, sport: CriticalSport, today: string): { value: StoredCriticalSport | null; reason: string | null } {
  const m = metrics[sport];
  if (!m) return { value: null, reason: 'Données insuffisantes' };
  if (m.status !== 'confirmed') return { value: null, reason: 'Estimation non validée par le coach' };
  const age = (Date.parse(today + 'T00:00:00Z') - Date.parse(m.latestEffortDate + 'T00:00:00Z')) / 86400000;
  if (!Number.isFinite(age) || age < 0 || age > CRITICAL_POLICY.maxAgeDays) return { value: null, reason: `Tests de plus de ${CRITICAL_POLICY.maxAgeDays} jours — à refaire` };
  return { value: m, reason: null };
}
