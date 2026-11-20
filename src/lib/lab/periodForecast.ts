import type { DbSnapshot } from "@/hooks/useCloudData";
import { pickReferenceSnapshot } from "@/lib/referenceSnapshot";
import { validTestDate } from "@/lib/testMeasurementReview";
import {
  fitBikeOnNolio,
  fitRunOnNolio,
  type EnvelopePoint,
} from "./nolioCalibration";
import type { LabSport } from "./loadCharacteristics";

/** Evaluate the old curve versus repeating the previous record, on exactly the same later efforts. */
export function periodForecast(
  sport: LabSport,
  prior: EnvelopePoint[],
  later: EnvelopePoint[],
  cutoff: string,
  end: string,
  athleteId: string,
  snapshots: DbSnapshot[],
) {
  if (!validTestDate(cutoff) || !validTestDate(end) || end <= cutoff) return [];
  const before = prior.filter(
    (p) =>
      validTestDate(p.date) &&
      p.date <= cutoff &&
      p.value > 0 &&
      Number.isFinite(p.value),
  );
  const byDuration = new Map(before.map((p) => [p.durationSec, p]));
  const snapshot =
    sport === "bike"
      ? pickReferenceSnapshot(
          snapshots.filter(
            (s) =>
              s.date <= cutoff &&
              !!s.created_at &&
              s.created_at.slice(0, 10) <= cutoff &&
              !!s.updated_at &&
              s.updated_at.slice(0, 10) <= cutoff,
          ),
          athleteId,
        )
      : null;
  const bike =
    snapshot &&
    fitBikeOnNolio(
      {
        vo2max: snapshot.vo2max ?? null,
        poids: snapshot.weight_kg ?? null,
        vlamaxEffectif: { value: null, source: "unknown", confidence: 0 },
      },
      before,
    );
  const run = sport === "run" ? fitRunOnNolio(before) : null;
  return later.flatMap((p) => {
    const base = byDuration.get(p.durationSec);
    if (
      !base ||
      !validTestDate(p.date) ||
      p.date <= cutoff ||
      p.date > end ||
      !Number.isFinite(p.value) ||
      p.value <= 0
    )
      return [];
    const estimated =
      sport === "bike"
        ? bike?.points.find((v) => v.durationSec === p.durationSec)?.fitted
        : run && p.durationSec >= 180 && p.durationSec <= 1200
          ? run.csKmh / 3.6 + run.dPrimeM / p.durationSec
          : null;
    if (!estimated || estimated <= 0) return [];
    const toUnit = (n: number) => (sport === "run" ? 1000 / n : n);
    const observed = toUnit(p.value),
      prediction = toUnit(estimated),
      baseline = toUnit(base.value);
    return [
      {
        seconds: p.durationSec,
        date: p.date,
        observed,
        prediction,
        baseline,
        modelError: Math.abs(prediction - observed),
        baselineError: Math.abs(baseline - observed),
      },
    ];
  });
}
