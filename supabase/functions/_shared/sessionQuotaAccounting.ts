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

/** Necessary calendar-capacity bound under existing layout rules, not a
 * constructive scheduling proof: one session of each sport per day; brick
 * excludes standalone run/bike/strength; strength has at most one companion. */
export function hasWeeklyCalendarCapacity(quota: {
 swim:{min:number;max:number};bike:{min:number;max:number};run:{min:number;max:number};
 brick:{min:number;max:number};strength:{min:number;max:number};
 totalSessions:{min:number;max:number};maxSessionsPerDay:number;minFullRestDays:number;
}, availableDays:number):boolean {
 const days=Math.max(0,Math.min(availableDays,7-quota.minFullRestDays));
 if(quota.swim.min>days || quota.strength.min>days)return false;
 for(let bricks=quota.brick.min;bricks<=Math.min(quota.brick.max,days);bricks++){
  const effective=effectiveSessionQuota(quota,bricks);
  if(quota.run.min+bricks>days || effective.bike.min+bricks>days || quota.strength.min+bricks>days)continue;
  const brickDayCapacity=Math.min(quota.maxSessionsPerDay,quota.swim.max>0?2:1);
  const capacity=days*quota.maxSessionsPerDay-bricks*(quota.maxSessionsPerDay-brickDayCapacity)
    -quota.strength.min*Math.max(0,quota.maxSessionsPerDay-2);
  const minimum=quota.swim.min+effective.bike.min+quota.run.min+bricks+quota.strength.min;
  if(Math.max(minimum,effective.totalSessions.min)<=Math.min(capacity,effective.totalSessions.max))return true;
 }
 return false;
}
