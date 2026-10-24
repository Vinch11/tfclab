/** Existing quota convention: each brick replaces one standalone bike slot.
 * Shared by validation and insertion capacity checks; no sporting policy change.
 */
export function effectiveSessionQuota(
  quota: { bike: { min: number; max: number }; totalSessions?: { min: number; max: number } },
  brickCount: number,
) {
  const shift = Math.max(0, brickCount);
  return {
    bike: { min: Math.max(0, quota.bike.min - shift), max: Math.max(0, quota.bike.max - shift) },
    totalSessions: {
      min: Math.max(0, (quota.totalSessions?.min ?? 0) - shift),
      max: Math.max(0, (quota.totalSessions?.max ?? Infinity) - shift),
    },
  };
}

/** Same five disciplines as weekly quota validation; recovery/rest are not quota slots. */
export function countQuotaSessions(sessions: ReadonlyArray<{ sport?: string; isRest?: boolean }>): number {
  return sessions.filter(s => !s.isRest && ["swim", "bike", "run", "brick", "strength"].includes(s.sport ?? "")).length;
}
