import { compareSnapshotsNewestFirst } from "@/lib/referenceSnapshot";
import { parseStoredDurability } from "@/lib/durability/longSessionDurability";
import { storedPerformance } from "@/lib/coachingCompass/performanceComparison";
import { reviewedTte, validTestDate } from "@/lib/testMeasurementReview";
import {
  predictRaceDurationMin,
  AMBITION_LEVEL_TO_PREDICTOR,
} from "@/lib/raceTimePredictor";
import type { RaceChronos } from "@/engines/diagnostic/raceTimeEstimator";
import type { Tables } from "@/integrations/supabase/types";
import type { DbSnapshot, DbTest } from "@/hooks/useCloudData";
import { rankedFieldGaps } from "@/lib/coachingCompass/rankedFieldGaps";
import { objectiveDemands } from "@/lib/coachingCompass/objectiveDemands";
import { detectUnifiedLimiter } from "@/lib/v2/unifiedLimiterDetection";
import { estimateProfileFatMaxPctFTP } from "@/lib/v2/fatmaxTFCL";
import { fieldDayObservations } from "@/lib/fieldDayObservations";
import { fieldHoldBounds } from "@/lib/diagnostic/fieldHold";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif } from "@/lib/tteEffectif";
import type { AmbitionLevel } from "@/types/ambitionLevel";

/** Historical replay uses only fields stored on the chosen date and explicit scenario assumptions. */
export function replayPriorities(
  original: DbSnapshot,
  goal: string,
  ambition: AmbitionLevel,
  age: number | null,
  tests: DbTest[] = [],
) {
  if ([original.created_at, original.updated_at].some(stamp => stamp && stamp.slice(0,10) > original.date)) return [];
  const row = fieldDayObservations(original);
  const kind = objectiveDemands(goal)?.kind;
  if (!kind) return [];
  const tri = kind === "tri";
  const sport = tri ? "bike" : "run";
  const available = tests.filter(t => t.athlete_id === row.athlete_id && t.coach_id === row.coach_id &&
    validTestDate(t.date.slice(0,10)) && t.date.slice(0,10) <= row.date &&
    (!t.raw || typeof t.raw !== "object" || Array.isArray(t.raw) || !validTestDate(t.raw.testDate) || t.raw.testDate <= row.date));
  const vla = computeVLamaxEffectif({ athleteId: row.athlete_id, objectif: goal, sportOverride: tri ? "velo" : "cap",
    asOf: row.date, tests: available, snapshots: [row] });
  const tte = computeTTEEffectif({ ...row, sport, objectif: goal, age });
  const limiter = detectUnifiedLimiter({
    objectif: goal,
    ambition,
    age,
    sportFocus: tri ? "tri" : "run",
    vma: row.vma ?? null,
    vo2max: row.vo2max ?? null,
    ftpKg: tri && row.weight_kg && row.ftp ? row.ftp / row.weight_kg : null,
    vlamax: vla.value,
    vlamaxSource: vla.v2?.source ?? vla.source,
    fieldVlamax: vla.details?.fieldRange,
    fieldHold: fieldHoldBounds(available, row.athlete_id, sport, tri ? row.ftp : row.pace_threshold_sec_per_km, row.date),
    tte: tte.tte_min > 0 ? tte.tte_min : null,
    tteSource: tte.source === "estimated" ? "load_or_ftp" : tte.source,
    fatmax: tri
      ? estimateProfileFatMaxPctFTP(
          vla.value,
          row.vo2max ?? null,
          row.weight_kg ?? null,
          row.ftp ?? null,
        )
      : null,
    fatmaxSource: "model",
    wprimeKj: null,
    economyScore: row.run_economy_score ?? null,
    availabilityScore: null,
    hasHealthAlerts: false,
  });
  return rankedFieldGaps(limiter);
}

/** Use only independent, dated road results stored on the original bilan as predictors. */
export function raceForecastReview(
  first: DbSnapshot,
  next: DbSnapshot,
  goal: string,
  ambition: AmbitionLevel,
) {
  if (
    first.athlete_id !== next.athlete_id ||
    next.date <= first.date ||
    objectiveDemands(goal)?.kind !== "road"
  )
    return null;
  const knownByCutoff = [first.created_at, first.updated_at].every(
    (t) => t && validTestDate(t.slice(0, 10)) && t.slice(0, 10) <= first.date,
  );
  if (!knownByCutoff) return null;
  const performed = storedPerformance(goal, next);
  if (
    !performed ||
    !validTestDate(performed.date) ||
    performed.date <= first.date ||
    performed.date > next.date
  )
    return null;
  const old = storedPerformance(goal, first);
  const baseline =
    old && validTestDate(old.date) && old.date <= first.date
      ? old.seconds
      : null;
  const fields = first as DbSnapshot & Partial<Tables<"snapshots">>;
  const chronos: RaceChronos = {};
  for (const distance of ["5k", "10k", "20k", "half", "marathon"] as const) {
    const date = fields[`time_${distance}_date`],
      sec = fields[`time_${distance}_sec`];
    if (
      validTestDate(date) &&
      date <= first.date &&
      typeof sec === "number" &&
      sec > 0
    )
      chronos[`time_${distance}_sec`] = sec;
  }
  const predicted = predictRaceDurationMin({
    objective: goal,
    ambition: AMBITION_LEVEL_TO_PREDICTOR[ambition],
    raceChronos: chronos,
    vmaKmh: first.vma,
    thresholdPaceSecPerKm: first.pace_threshold_sec_per_km,
  });
  if (!predicted) return null;
  const predictedSeconds = Math.round(predicted.targetRaceDurationMin * 60);
  return {
    date: performed.date,
    observed: performed.seconds,
    predictedSeconds,
    source: predicted.source,
    baseline,
    error: Math.abs(predictedSeconds - performed.seconds),
    baselineError:
      baseline == null ? null : Math.abs(baseline - performed.seconds),
  };
}

/** Subsequent evidence for the original priority, keeping the original coaching target fixed. */
export function followupEvidence(
  rank: ReturnType<typeof rankedFieldGaps>[number],
  first: DbSnapshot,
  next: DbSnapshot,
  goal: string,
  tests: DbTest[],
) {
  if (first.athlete_id !== next.athlete_id || next.date <= first.date)
    return [];
  const sport = objectiveDemands(goal)?.kind === "tri" ? "bike" : "run";
  const inWindow = (date: unknown): date is string =>
    validTestDate(date) && first.date < date && date <= next.date;
  const { metric, target } = rank.metric;
  if (metric === "TTE" || metric === "VMA") {
    return tests.flatMap((t) => {
      if (
        t.athlete_id !== first.athlete_id ||
        !t.raw ||
        typeof t.raw !== "object" ||
        Array.isArray(t.raw)
      )
        return [];
      const raw = t.raw;
      if (!inWindow(raw.testDate) || !Number.isFinite(target)) return [];
      const isTte = metric === "TTE";
      const observed =
        isTte && t.sport === sport && reviewedTte(raw, sport)
          ? raw.tte_minutes
          : !isTte && t.sport === "run" && raw.conditionsConfirmed === true
            ? raw.vma
            : null;
      if (
        typeof observed !== "number" ||
        !Number.isFinite(observed) ||
        observed <= 0
      )
        return [];
      const unit = isTte ? "min" : "km/h",
        difference = observed - target!;
      return [
        {
          id: t.id,
          date: raw.testDate,
          text: `${t.name} · ${observed} ${unit} · ${Math.abs(difference).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${unit} ${difference < 0 ? "sous" : difference > 0 ? "au-dessus de" : "d’écart avec"} l’ancien repère de ${target!.toLocaleString("fr-FR")} ${unit}.`,
        },
      ];
    });
  }
  if (metric === "FTP/kg" || metric === "VO2max") {
    const unit = metric === "FTP/kg" ? "W/kg" : "ml/kg/min";
    const value =
      metric === "FTP/kg"
        ? next.ftp && next.weight_kg && next.weight_kg > 0
          ? next.ftp / next.weight_kg
          : null
        : next.vo2max;
    if (
      value == null ||
      value <= 0 ||
      !Number.isFinite(value) ||
      !Number.isFinite(target)
    )
      return [];
    const read = (n: number) =>
      n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    return [
      {
        id: next.id,
        date: next.date,
        text: `Bilan suivant · ${read(value)} ${unit} pour le repère initial de ${read(target!)} ${unit}. Vérifier la date et le protocole du nouveau test avant de confirmer une évolution.`,
      },
    ];
  }
  if (!rank.hypothesis && !metric.startsWith("Durabilité")) return [];
  const sessions =
    parseStoredDurability(next.critical_metrics)[sport]?.sessions ?? [];
  const fresh = sessions.filter(
    (s) => inWindow(s.date?.slice(0, 10)) && Number.isFinite(s.changePct),
  );
  return [...new Map(fresh.map((s) => [s.id, s])).values()].map((s) => ({
    id: s.id,
    date: s.date.slice(0, 10),
    text: `${s.name} · ${s.durationMin} min · variation de ${s.changePct} % entre début et fin. Ce résultat renseigne la tenue de l’effort. La cause métabolique reste à vérifier.`,
  }));
}

/** One prospective comparison per dated race, with identical cases for both errors. */
export function roadForecastCohort(
  rows: DbSnapshot[],
  adults: { id: string; dateNaissance?: string | null }[],
  coachId: string,
  asOf: string,
  goal: string,
  ambition: AmbitionLevel,
  minMinutes: number,
  maxMinutes: number,
) {
  const results: { model: number; baseline: number; athlete: string }[] = [];
  if (objectiveDemands(goal)?.kind !== "road") return null;
  for (const person of adults) {
    if (!validTestDate(person.dateNaissance)) continue;
    const adultSince =
      String(Number(person.dateNaissance.slice(0, 4)) + 18) +
      person.dateNaissance.slice(4);
    const history = rows
      .filter(
        (s) =>
          s.athlete_id === person.id &&
          s.coach_id === coachId &&
          s.date >= adultSince &&
          s.date <= asOf,
      )
      .sort(compareSnapshotsNewestFirst);
    const seen = new Set<string>();
    for (const resultRow of [...history].reverse()) {
      const race = storedPerformance(goal, resultRow);
      if (
        !race ||
        !validTestDate(race.date) ||
        race.date > resultRow.date ||
        seen.has(race.date)
      )
        continue;
      for (const first of history) {
        if (first.date >= race.date || first.objectif !== goal) continue;
        const score = raceForecastReview(first, resultRow, goal, ambition);
        if (!score || score.baseline == null || score.baselineError == null)
          continue;
        seen.add(race.date);
        const minutes = score.baseline / 60;
        if (minutes >= minMinutes && minutes <= maxMinutes)
          results.push({
            model: score.error,
            baseline: score.baselineError,
            athlete: person.id,
          });
        break;
      }
    }
  }
  if (!results.length) return null;
  return {
    races: results.length,
    athletes: new Set(results.map((r) => r.athlete)).size,
    modelError: results.reduce((sum, r) => sum + r.model, 0) / results.length,
    baselineError:
      results.reduce((sum, r) => sum + r.baseline, 0) / results.length,
  };
}
