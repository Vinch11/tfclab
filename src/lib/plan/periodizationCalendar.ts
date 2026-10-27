import { periodizationBounds, phaseWithinPeriodization, reducedFondationWeeksPostPeak, type PeriodizationPhase } from "../../../supabase/functions/_shared/periodizationBounds";
import { computeObjectiveCycleSegments, type ClassifiableRaceGoal } from "./multiObjectiveClassification";
import { normalizeSizingAmbition, taperWeeksForObjective } from "@/engines/plan/sessionSizingMatrix";
interface CalendarConfig {
  objective?: string; weeksAvailable?: number; fondationDurationWeeks?: number; ambition?: string;
  ambitionMeta?: { effective?: string }; identifiedLimitersRaw?: string[]; identifiedLimiters?: string[];
  raceGoals?: ClassifiableRaceGoal[]; planStartDate?: string; globalTotalWeeks?: number; globalWeekOffset?: number; windowRegenPhase?: string;
  windowWeekPhases?: Record<number, PeriodizationPhase>;
}
/** Engine-owned local-week calendar. Legacy callers without calculated periodization retain their existing fallback. */
export function buildPeriodizationCalendar(config: CalendarConfig): Record<number, PeriodizationPhase> | undefined {
  if ((!config.fondationDurationWeeks && !config.windowWeekPhases) || !config.weeksAvailable) return undefined;
  const total = config.globalTotalWeeks ?? config.weeksAvailable, offset = config.globalWeekOffset ?? 0;
  const calendar: Record<number, PeriodizationPhase> = {};
  const segments = computeObjectiveCycleSegments(config.raceGoals, config.planStartDate, total)
    ?? [{ startWeek: 1, endWeek: total, objective: config.objective ?? "" }];
  for (let w = 1; w <= config.weeksAvailable; w++) {
    if (config.windowWeekPhases?.[w]) { calendar[w] = config.windowWeekPhases[w]; continue; }
    if (["base", "build", "peak", "taper"].includes(config.windowRegenPhase ?? "")) { calendar[w] = config.windowRegenPhase as PeriodizationPhase; continue; }
    const global = w + offset, index = segments.findIndex(s => global >= s.startWeek && global <= s.endWeek);
    if (index < 0) { calendar[w] = "base"; continue; }
    const seg = segments[index], length = seg.endWeek - seg.startWeek + 1;
    const bounds = periodizationBounds(length, taperWeeksForObjective(seg.objective),
      normalizeSizingAmbition(config.ambitionMeta?.effective ?? config.ambition) === "finisher",
      config.identifiedLimitersRaw?.[0] ?? config.identifiedLimiters?.[0] ?? "",
      index === 0 ? config.fondationDurationWeeks : reducedFondationWeeksPostPeak(length));
    calendar[w] = phaseWithinPeriodization(global - seg.startWeek + 1, bounds);
  }
  return calendar;
}
