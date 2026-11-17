import { fitCriticalEfforts, type CriticalEffort } from '@/lib/criticalEfforts';
import { toStoredCritical } from '@/lib/criticalMetrics';
import { CRITICAL_SPEED_ASSESSMENT } from './criticalSpeedAssessment';
import type { NolioRecordRow } from '@/lib/lab/nolioCalibration';

export function criticalSpeedTestRows(start: string): CriticalEffort[] {
  return CRITICAL_SPEED_ASSESSMENT.durationsSec.map((durationSec, i) => {
    const date = new Date(`${start}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + CRITICAL_SPEED_ASSESSMENT.offsetsDays[i]);
    return { id: `cs-${start}-${durationSec}`, sport: 'running', measurement: 'distance', durationSec, value: 0,
      date: date.toISOString().slice(0, 10), session: `${CRITICAL_SPEED_ASSESSMENT.version} · ${durationSec / 60} min`, conditions: '', source: 'manual', confirmed: false };
  });
}

/** Stored Nolio PAR time records are speed in m/s; no power or undated record is eligible. */
export function criticalSpeedRecords(rows: NolioRecordRow[], from: string, to: string): CriticalEffort[] {
  const best = new Map<number, CriticalEffort>();
  for (const r of rows) {
    const date = r.date_recorded?.slice(0, 10);
    if (r.cat !== 'par' || r.record_type !== 'time' || ![2, 52].includes(r.sport_id) || !date || date < from || date > to || r.item_seconds < 120 || r.item_seconds > 900 || !(r.value > 0) || !Number.isFinite(r.value)) continue;
    const value = r.value * r.item_seconds;
    const current = best.get(r.item_seconds);
    if (!current || value > current.value) best.set(r.item_seconds, { id: `nolio-cs-${date}-${r.sport_id}-${r.item_seconds}`, sport: 'running', measurement: 'distance', durationSec: r.item_seconds, value, date, session: `Record Nolio ${r.sport_id} · ${date}`, conditions: r.sport_id === 52 ? 'Course indoor · conditions à vérifier' : 'Course outdoor · conditions à vérifier', source: 'nolio', confirmed: false });
  }
  return [...best.values()].sort((a, b) => a.durationSec - b.durationSec);
}

export function reviewCriticalSpeed(efforts: CriticalEffort[], coachApproved: boolean, today: string) {
  const fit = fitCriticalEfforts(efforts, 'running', today);
  return { fit, stored: toStoredCritical(fit, efforts, coachApproved, today) };
}