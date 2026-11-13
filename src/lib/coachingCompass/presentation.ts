import type { CoachingCompassInput, RadarAxis, TFCLCoachingCompassResult } from "./types";
import { buildSportReferences, compassDisplaySport } from './sportPresentation';
import { buildDisciplineAxes } from './disciplineAxes';
import { computeRunningCompassDiagnostic } from '@/engines/diagnostic';
import type { AmbitionLevel } from '@/types/ambitionLevel';

// Read-only view: never write these values back into diagnosis or plan contracts.
export function metricSourceLabel(source: string): string {
  if (source === "test_labo") return "🧪 Labo";
  if (source === "observed") return "🏃 Test terrain déclaré";
  if (source === "test_terrain" || source === "test") return "🏃 Terrain — à confirmer";
  if (source === "snapshot") return "📋 Bilan — provenance à confirmer";
  if (source === "records") return "📐 Estimation par records";
  if (source === "unknown") return "Données insuffisantes";
  return "📐 Estimation";
}

export function axisAssessment(axis: RadarAxis): string {
  if (axis.value == null || !Number.isFinite(axis.value) || axis.value <= 0) return "Données insuffisantes";
  if (axis.target == null || axis.target <= 0) return 'Comparaison non définie';
  if (axis.source !== "test_labo" && axis.source !== "observed") return "À confirmer";
  return axis.score >= 100 ? "Cible interne atteinte" : "À développer";
}

export function buildCompassPresentation(input: CoachingCompassInput, compass: TFCLCoachingCompassResult) {
  const sport = compassDisplaySport(input);
  const metricKeys: Record<string, keyof TFCLCoachingCompassResult["profile"]> = {
    vo2max: "vo2max", vlamax: "vlamax", ftpkg: "ftpKg", vma: "vma", fatmax: "fatmax", wprime: "wPrime",
  };
  const axes = compass.radarAxes.filter(axis => axis.key !== 'wprime' && !(sport === 'triathlon' && axis.key === 'durability') && !(sport === 'run' && ['ftpkg', 'fatmax'].includes(axis.key)) && !(sport === 'bike' && axis.key === 'vma')).map(axis => {
    if (axis.key === "durability") {
      const tte = sport === 'run' && input.sportFocus !== 'run' ? input.tteEffectifRun : input.tteEffectif;
      if (!tte) return { ...axis, key: 'tte', label: 'TTE course', shortLabel: 'TTE course', value: null, target: null, score: 0, unit: 'min', source: 'unknown' };
      return { ...axis, key: "tte", label: "Endurance au seuil (indice TTE)", shortLabel: "TTE", value: tte.tte_min > 0 ? tte.tte_min : null,
        // Same internal benchmark as the historical axis, expressed in minutes.
        target: axis.value && axis.target && tte.tte_min > 0 ? Math.round(tte.tte_min / axis.value * axis.target) : null,
        unit: "min", source: tte.source };
    }
    const key = metricKeys[axis.key];
    const metric = key ? compass.profile[key] : null;
    const source = metric && typeof metric === "object" ? metric.source : "unknown";
    if (axis.key === 'vlamax' && sport === 'run' && input.sportFocus !== 'run') return { ...axis, label: 'VLamax course', shortLabel: 'VLamax course', value: null, score: 0, source: 'unknown' };
    if (sport === 'run' && axis.key === 'vo2max' && !input.vo2max) return { ...axis, value: null, score: 0, source: 'unknown' };
    const qualifier = sport === 'triathlon' && ['vlamax', 'fatmax', 'ftpkg'].includes(axis.key) ? ' vélo' : '';
    if (qualifier && input.sportFocus === 'run') return { ...axis, label: axis.label + qualifier, shortLabel: axis.shortLabel + qualifier, value: null, score: 0, source: 'unknown' };
    return { ...axis, label: axis.label + qualifier, shortLabel: axis.shortLabel + qualifier, source: axis.key === "vo2max" && !input.vo2max ? "estimation" : source };
  });
  // Preserve the engine's ranked categories and their original metric order.
  const ranked = input.limiterResult?.categoryRanking?.flatMap(c => c.metrics) ?? input.limiterResult?.gapAnalysis ?? [];
  const priorityMetrics = ranked.filter(g => g.weightedImpact > 0 && g.prescriptionApplicable !== false).map(g => g.metric);
  const disciplines = sport === 'triathlon' ? buildDisciplineAxes(input, axes) : undefined;
  const runningDiagnostic = disciplines?.runningDiagnostic ?? (sport === 'run' ? computeRunningCompassDiagnostic({ objectif: input.objectif, ambition: (input.ambition || 'age_group') as AmbitionLevel, age: input.athleteAge, vma: input.vma, vo2max: input.vo2max, vo2Source: 'snapshot', paceThresholdSecPerKm: input.paceThresholdSecPerKm, vlamax: input.vlamaxRunReference ?? (input.sportFocus === 'run' ? input.vlamaxEffectif : null), tte: input.sportFocus === 'run' ? input.tteEffectif : input.tteEffectifRun ?? null, economy: input.runEconomyScore, drift: input.hrDriftPct }) : undefined);
  return {
    axes,
    disciplineAxes: disciplines,
    runningDiagnostic,
    sport,
    sportReferences: buildSportReferences(input),
    priorityMetrics,
    wprimeReview: priorityMetrics.some(m => /^W['′]/i.test(m)),
    tteBike: sport !== 'run' && input.sportFocus !== 'run' ? input.tteEffectif : null,
    tteRun: sport === 'bike' ? null : input.sportFocus === "run" ? input.tteEffectif : input.tteEffectifRun ?? null,
    decouplingRun: sport === 'bike' ? null : input.hrDriftPct,
    economy: { ...compass.economyModifier, source: compass.profile.runningEconomy.source },
  };
}