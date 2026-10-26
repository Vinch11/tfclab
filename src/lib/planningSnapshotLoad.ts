import { SNAPSHOT_LOAD_FRESHNESS_DAYS } from "./chargeRecenteReference";

/** Planning-only gate. Never mutates historical TSS or physiological computations.
 * Reuses the existing 14-calendar-day CRR convention, not a validated safety cutoff.
 * A generic updated_at is not evidence that the TSS was measured again.
 */
export function resolvePlanningSnapshotLoad(tss7d: number | null | undefined, snapshotDate?: string | null,
  now: Date = new Date()): { tss7d: number | null; reason: "recent" | "missing-value" | "missing-date" | "invalid-date" | "future-date" | "stale" } {
  if (typeof tss7d !== "number" || !Number.isFinite(tss7d) || tss7d <= 0) return { tss7d: null, reason: "missing-value" };
  if (!snapshotDate) return { tss7d: null, reason: "missing-date" };
  const date = new Date(snapshotDate);
  if (!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(snapshotDate) || !Number.isFinite(date.getTime())
    || date.toISOString().slice(0, 10) !== snapshotDate.slice(0, 10) || !Number.isFinite(now.getTime()))
    return { tss7d: null, reason: "invalid-date" };
  const calendarDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const ageDays = (calendarDay(now) - calendarDay(date)) / 86_400_000;
  if (ageDays < 0) return { tss7d: null, reason: "future-date" };
  if (ageDays > SNAPSHOT_LOAD_FRESHNESS_DAYS) return { tss7d: null, reason: "stale" };
  return { tss7d, reason: "recent" };
}
