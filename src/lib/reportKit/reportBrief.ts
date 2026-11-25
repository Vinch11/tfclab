import { compassFlow } from '../coachingCompass/compassFlow';
import { buildFactorStates, glycolyticHypothesis, rankWithHypothesis } from '../coachingCompass/factorStates';
import type { CoachingCompassInput, TFCLCoachingCompassResult } from '../coachingCompass/types';
import { vo2maxVmaMismatch } from '../zones/vo2maxCoherence';

/** Both editions use the same two readings as DashboardLimiters. */
export function buildReportBrief(input: CoachingCompassInput, compass: TFCLCoachingCompassResult) {
  const flow = compassFlow(input, compass);
  const states = buildFactorStates(input, compass);
  const ranked = rankWithHypothesis(states, glycolyticHypothesis(flow.overlap));
  // Une VO₂max incohérente avec la VMA (souvent une valeur de montre) n'est pas un point d'appui.
  const doubtfulVo2 = vo2maxVmaMismatch(input.vo2max, input.vma);
  const supports = states.sections.flatMap(({ sport, rows }) =>
    rows.filter(row => row.value != null && row.state === 'inside' && row.key !== 'demand'
      && !(doubtfulVo2 && row.key === 'vo2max')
      // VO₂max commune aux sports : point d'appui seulement si elle est dans le repère de chaque sport
      // (les repères vélo et course diffèrent ; sinon le texte contredirait la jauge de l'autre sport).
      && !(row.key === 'vo2max' && states.sections.some(sec => sec.rows.some(r => r.key === 'vo2max' && r.value != null && r.state !== 'inside')))
      && !ranked.some(gap => gap.sport === sport && gap.r.key === row.key)).map(r => ({ sport, r })));
  return { flow, sections: states.sections, ranked, supports, unmeasured: states.unmeasured, doubtfulVo2 };
}

export type ReportBrief = ReturnType<typeof buildReportBrief>;
export type CalendarEntry = { date: string; phase: string | null; title: string };
