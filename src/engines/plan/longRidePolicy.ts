import { normalizeSizingObjective, type SizingFloors, type WeekType, type WeeklyQuota } from './sessionSizingMatrix';
import type { PeriodizationPhase } from '../../../supabase/functions/_shared/periodizationBounds';

/** Coaching ranges, NOT trial-derived optimal doses. See docs/long-ride-policy.md.
 * Existing level/injury ramp is applied by the caller after this phase reference.
 * Running maintenance, short triathlon and LCW never inherit this policy. */
export const LONG_RIDE_PHASE_RANGES = {
  IM: { base: [150, 210], build: [210, 300], peak: [270, 330] },
  '703': { base: [120, 150], build: [150, 210], peak: [180, 240] },
} as const;

export interface LongRideContext {
  objective: string;
  phase?: PeriodizationPhase;
  weekType: WeekType;
  phaseWeek: number;
  phaseWeeks: number;
  priorities?: readonly string[];
  isLCW?: boolean;
  isMaintenance?: boolean;
}

export function applyLongRidePhasePolicy(floors: SizingFloors, context: LongRideContext): SizingFloors {
  const key = normalizeSizingObjective(context.objective);
  if ((key !== 'IM' && key !== '703') || !context.phase || context.phase === 'taper'
    || context.weekType === 'taper' || context.weekType === 'race'
    || context.isLCW || context.isMaintenance || !floors.longRideWeekly) return floors;
  const [lo, hi] = LONG_RIDE_PHASE_RANGES[key][context.phase];
  const progress = Math.max(0, Math.min(1, (context.phaseWeek - 1) / Math.max(1, context.phaseWeeks - 1)));
  // The stored coach priority modulates base/build; specific peak prioritises
  // race endurance. This does not infer an unrecorded phase workstream. No sensor
  // durability estimate or shared VO2max is introduced into limiter rankings.
  const first = context.priorities?.[0] ?? '';
  const qualityFirst = /vo.?2|vma|pma|ftp|mlss|seuil/i.test(first) && !/tte|durabil/i.test(first);
  const position = context.phase === 'peak' || !qualityFirst ? progress : progress * 0.5;
  const reference = lo + (hi - lo) * position;
  const min = Math.round(reference * (context.weekType === 'recovery' ? 0.7 : 1) / 5) * 5;
  return { ...floors, slLongRideMin: min, dedicatedLongRide: true };
}

/** Use the engine's actual phase calendar, including regenerated windows. */
export function phasePosition(calendar: Record<number, PeriodizationPhase> | undefined, week: number) {
  const phase = calendar?.[week];
  if (!phase) return { phase, phaseWeek: 1, phaseWeeks: 1 };
  let start = week, end = week;
  while (calendar?.[start - 1] === phase) start--;
  while (calendar?.[end + 1] === phase) end++;
  return { phase, phaseWeek: week - start + 1, phaseWeeks: end - start + 1 };
}

/** A brick replaces a bike slot: reserve one standalone slot without raising
 * the total. On compressed recovery weeks the brick, not the ride, is removed. */
export function protectDedicatedRideQuota(quota: WeeklyQuota, floors: SizingFloors): WeeklyQuota {
  if (!floors.dedicatedLongRide || quota.bike.min < 1 || quota.bike.min - quota.brick.min >= 1) return quota;
  const maxBricks = Math.max(0, quota.bike.min - 1);
  const removed = quota.brick.min - Math.min(quota.brick.min, maxBricks);
  // Reassign the freed brick slot to an autonomous bike, keeping totals intact.
  return { ...quota,
    bike: { min: quota.bike.min + removed, max: quota.bike.max + removed },
    brick: { min: Math.min(quota.brick.min, maxBricks), max: Math.min(quota.brick.max, maxBricks) } };
}