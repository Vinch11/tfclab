import { compassFlow } from '../coachingCompass/compassFlow';
import { buildFactorStates, glycolyticHypothesis, rankWithHypothesis } from '../coachingCompass/factorStates';
import type { CoachingCompassInput, TFCLCoachingCompassResult } from '../coachingCompass/types';

/** Both editions use the same two readings as DashboardLimiters. */
export function buildReportBrief(input: CoachingCompassInput, compass: TFCLCoachingCompassResult) {
  const flow = compassFlow(input, compass);
  const states = buildFactorStates(input, compass);
  const ranked = rankWithHypothesis(states, glycolyticHypothesis(flow.overlap));
  const supports = states.sections.flatMap(({ sport, rows }) =>
    rows.filter(row => row.value != null && row.state === 'inside' && row.key !== 'demand'
      && !ranked.some(gap => gap.sport === sport && gap.r.key === row.key)).map(r => ({ sport, r })));
  return { flow, ranked, supports, unmeasured: states.unmeasured };
}

export type ReportBrief = ReturnType<typeof buildReportBrief>;
export type CalendarEntry = { date: string; phase: string | null; title: string };
