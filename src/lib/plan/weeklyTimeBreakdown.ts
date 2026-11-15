import { parseSessionDurationMin } from '@/engines/plan/planValidator';
import type { ParsedSession } from '@/lib/aiPlanParser';
import { normalizeRepairSport } from '../../../supabase/functions/_shared/repairSportingEquivalence';

/** Weekly working time excludes strength regardless of its duration metadata.
 * Keep strength as a session count; only missing endurance durations affect time. */
export function weeklyTimeBreakdown(sessions: ParsedSession[]) {
  let endurance = 0, strengthSessions = 0, missing = 0;
  for (const s of sessions) {
    if (s.isRest || s.sport === 'rest') continue;
    if (normalizeRepairSport(s.sport) === 'strength') { strengthSessions++; continue; }
    const duration = parseSessionDurationMin(s);
    if (duration === null || !Number.isFinite(duration) || duration <= 0) { missing++; continue; }
    endurance += duration;
  }
  return { endurance, strengthSessions, missing };
}
export function formatScheduledMinutes(minutes: number) {
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)}h${String(rounded % 60).padStart(2, '0')}`;
}