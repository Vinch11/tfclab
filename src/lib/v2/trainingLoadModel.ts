// CTL / ATL / TSB engine — standard PMC (Performance Management Chart) EMA.
//
// Conventions :
//   CTL_today = CTL_yesterday + (TSS_today - CTL_yesterday) / 42
//   ATL_today = ATL_yesterday + (TSS_today - ATL_yesterday) /  7
//   TSB_today = CTL_yesterday - ATL_yesterday   (uses YESTERDAY's values, PMC standard)
//
// Missing-day policy (documented): a day without any session is treated as TSS=0
// (real rest). It is NOT treated as "missing data". Consequence: an athlete that
// forgets to sync will look like they rested. Sync-gap detection is a separate
// concern handled upstream.

export type SportBucket = "swim" | "bike" | "run" | "other" | "global";

export type DailyTssRow = {
  date: string; // YYYY-MM-DD
  sport: SportBucket;
  tss: number;
};

export type PmcPoint = {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
};

export type PmcSeries = Record<SportBucket, PmcPoint[]>;

export const CTL_TAU = 42;
export const ATL_TAU = 7;

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map((v) => parseInt(v, 10));
  const [yb, mb, db] = b.split("-").map((v) => parseInt(v, 10));
  const A = Date.UTC(ya, ma - 1, da);
  const B = Date.UTC(yb, mb - 1, db);
  return Math.round((B - A) / 86400000);
}

/**
 * Compute CTL/ATL/TSB series over a continuous daily range.
 * Missing days => TSS=0 (real rest).
 */
export function computePmc(
  daily: Array<{ date: string; tss: number }>,
  opts?: { startDate?: string; endDate?: string; seedCtl?: number; seedAtl?: number },
): PmcPoint[] {
  if (daily.length === 0 && !opts?.startDate) return [];

  const byDate = new Map<string, number>();
  for (const row of daily) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + (Number(row.tss) || 0));
  }

  const sortedDates = Array.from(byDate.keys()).sort();
  const start = opts?.startDate ?? sortedDates[0];
  const end = opts?.endDate ?? sortedDates[sortedDates.length - 1];
  if (!start || !end) return [];

  const n = diffDays(start, end);
  if (n < 0) return [];

  let ctl = opts?.seedCtl ?? 0;
  let atl = opts?.seedAtl ?? 0;
  const out: PmcPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const date = addDays(start, i);
    const tss = byDate.get(date) ?? 0;
    const prevCtl = ctl;
    const prevAtl = atl;
    ctl = prevCtl + (tss - prevCtl) / CTL_TAU;
    atl = prevAtl + (tss - prevAtl) / ATL_TAU;
    out.push({
      date,
      tss,
      ctl: round2(ctl),
      atl: round2(atl),
      tsb: round2(prevCtl - prevAtl),
    });
  }
  return out;
}

/**
 * Compute PMC per sport bucket AND for the daily global total.
 */
export function computePmcAllSports(
  rows: DailyTssRow[],
  opts?: { startDate?: string; endDate?: string },
): PmcSeries {
  const buckets: SportBucket[] = ["swim", "bike", "run", "other", "global"];
  const perSport = new Map<SportBucket, Array<{ date: string; tss: number }>>();
  const globalMap = new Map<string, number>();

  for (const b of buckets) perSport.set(b, []);

  for (const r of rows) {
    if (r.sport === "global") {
      globalMap.set(r.date, (globalMap.get(r.date) ?? 0) + (Number(r.tss) || 0));
      continue;
    }
    perSport.get(r.sport)?.push({ date: r.date, tss: r.tss });
    globalMap.set(r.date, (globalMap.get(r.date) ?? 0) + (Number(r.tss) || 0));
  }

  const globalArr = Array.from(globalMap.entries()).map(([date, tss]) => ({ date, tss }));

  const out: PmcSeries = {
    swim: computePmc(perSport.get("swim") ?? [], opts),
    bike: computePmc(perSport.get("bike") ?? [], opts),
    run: computePmc(perSport.get("run") ?? [], opts),
    other: computePmc(perSport.get("other") ?? [], opts),
    global: computePmc(globalArr, opts),
  };
  return out;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Map a Nolio sport_id to our bucket. */
export function nolioSportIdToBucket(sportId: number | null | undefined): SportBucket {
  const id = Number(sportId);
  if (id === 19) return "swim";
  if (id === 14 || id === 18) return "bike";
  if (id === 2 || id === 52) return "run";
  return "other";
}

/**
 * Sync-gap detector.
 * Flags an athlete as "possibly stopped syncing" when the last `gapDays` days
 * (default 5) are all TSS=0 AND the `historyDays` window before that (default 14)
 * had at least `minActiveDays` active days (default 3). This prevents interpreting
 * a sync outage as "athlete freshness".
 *
 * Input: chronologically ordered daily TSS rows for one sport bucket (usually 'global').
 */
export function detectSyncGap(
  daily: Array<{ date: string; tss: number }>,
  opts?: { gapDays?: number; historyDays?: number; minActiveDays?: number; referenceDate?: string },
): { flagged: boolean; gapDays: number; lastActiveDate: string | null; reason: string } {
  const gapDays = opts?.gapDays ?? 5;
  const historyDays = opts?.historyDays ?? 14;
  const minActiveDays = opts?.minActiveDays ?? 3;

  if (daily.length === 0) {
    return { flagged: false, gapDays: 0, lastActiveDate: null, reason: "no_data" };
  }
  const byDate = new Map<string, number>();
  for (const r of daily) byDate.set(r.date, (byDate.get(r.date) ?? 0) + (Number(r.tss) || 0));

  const today = opts?.referenceDate ?? new Date().toISOString().slice(0, 10);
  // Count consecutive TSS=0 days from today backwards
  let consecutiveZero = 0;
  let lastActive: string | null = null;
  for (let i = 0; i < 60; i++) {
    const d = addDays(today, -i);
    const tss = byDate.get(d) ?? 0;
    if (tss > 0) { lastActive = d; break; }
    consecutiveZero += 1;
  }

  if (consecutiveZero < gapDays) {
    return { flagged: false, gapDays: consecutiveZero, lastActiveDate: lastActive, reason: "recent_activity" };
  }

  // Count active days in the historyDays window BEFORE the current gap
  const historyEnd = addDays(today, -consecutiveZero); // last day that could have activity
  let activeInHistory = 0;
  for (let i = 0; i < historyDays; i++) {
    const d = addDays(historyEnd, -i);
    if ((byDate.get(d) ?? 0) > 0) activeInHistory += 1;
  }

  if (activeInHistory < minActiveDays) {
    return { flagged: false, gapDays: consecutiveZero, lastActiveDate: lastActive, reason: "no_prior_pattern" };
  }
  return {
    flagged: true,
    gapDays: consecutiveZero,
    lastActiveDate: lastActive,
    reason: `Aucune séance depuis ${consecutiveZero} jours alors que l'athlète synchronisait régulièrement (${activeInHistory} jours actifs sur les ${historyDays} précédents). Vérifier la synchronisation Nolio.`,
  };
}
