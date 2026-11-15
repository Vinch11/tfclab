import { parseSessionDurationMin } from '@/engines/plan/planValidator';
import type { ParsedSession } from '@/lib/aiPlanParser';
import { normalizeRepairSport } from '../../../supabase/functions/_shared/repairSportingEquivalence';

/** Actual scheduled time, not model-reported weekly headings. Missing durations
 * remain unknown; strength is separate but never removed from the total. */
export function weeklyTimeBreakdown(sessions: ParsedSession[]) {
  let endurance = 0, strength = 0, missing = 0;
  for (const s of sessions) {
    if (s.isRest || s.sport === 'rest') continue;
    const duration = parseSessionDurationMin(s);
    if (duration === null || !Number.isFinite(duration) || duration <= 0) { missing++; continue; }
    if (normalizeRepairSport(s.sport) === 'strength') strength += duration;
    else endurance += duration;
  }
  return { endurance, strength, total: endurance + strength, missing };
}
export function formatScheduledMinutes(minutes: number) {
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)}h${String(rounded % 60).padStart(2, '0')}`;
}