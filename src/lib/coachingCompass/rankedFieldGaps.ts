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

type FieldGap = ReturnType<typeof rankedFieldGaps>[number];

const fieldUnits: Record<string, string> = {
  VMA: "km/h",
  "FTP/kg": "W/kg",
  VO2max: "ml/kg/min",
  TTE: "min",
  VLamax: "mmol/L/s",
  FatMax: "% FTP",
  "Durabilité (découplage)": "%",
};
const format = (value: number) =>
  value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Keep the sport and units of the engine's target; decoupling has a reversed score convention. */
export function describeFieldGap({ metric, hypothesis }: FieldGap) {
  const unit = fieldUnits[metric.metric];
  const { value, target, weight } = metric;
  const signed = (n: number) => (n > 0 ? "+" : "") + format(n);
  const comparison =
    unit && Number.isFinite(value) && Number.isFinite(target)
      ? `${format(value!)} ${unit} pour un repère de ${format(target!)} ${unit} (écart ${signed(value! - target!)} ${unit.startsWith("%") ? "points" : unit})`
      : null;
  const confidence = hypothesis
    ? "Confiance limitée · estimation du modèle"
    : metric.metric === "Durabilité (découplage)"
      ? "Indice indirect · conditions de séance à vérifier"
      : "Valeur du bilan · confirmation terrain à vérifier";
  return {
    comparison,
    confidence,
    importance: Number.isFinite(weight) ? format(weight!) : null,
  };
}
