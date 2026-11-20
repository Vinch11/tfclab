import type { CoachingCompassInput } from "./types";

export function rankedFieldGaps(
  diagnosis: CoachingCompassInput["limiterResult"],
) {
  const rankedMetrics = new Set(
    diagnosis?.categoryRanking?.flatMap((group) =>
      group.metrics.map((metric) => metric.metric),
    ),
  );
  return (diagnosis?.gapAnalysis ?? [])
    .flatMap((metric) => {
      const hypothesis = metric.fieldHypothesisImpact != null;
      const impact = hypothesis
        ? metric.fieldHypothesisImpact
        : metric.weightedImpact;
      if (metric.value == null || !impact || impact <= 0) return [];
      if (
        !hypothesis &&
        (metric.prescriptionApplicable === false ||
          !rankedMetrics.has(metric.metric))
      )
        return [];
      return [{ metric, impact, hypothesis }];
    })
    .sort((a, b) => b.impact - a.impact);
}
