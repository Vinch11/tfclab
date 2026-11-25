import { getVLamaxRange, getTTETargetByAmbition } from "@/lib/physiologicalTargets";
import type { CoachingCompassInput, RadarAxis, TFCLCoachingCompassResult } from "./types";
import { buildSportReferences, compassDisplaySport } from './sportPresentation';
import { buildDisciplineAxes } from './disciplineAxes';
import { computeRunningCompassDiagnostic, computeCyclingCompassDiagnostic } from '@/engines/diagnostic';
import type { AmbitionLevel } from '@/types/ambitionLevel';

// Read-only view: never write these values back into diagnosis or plan contracts.
/** `key` : la VLamax calculée par les tests TFCL s'affiche « Mesure TFCL » (choix coach du 25/11/2026). */
export function metricSourceLabel(source: string, key?: string): string {
  if (key && /^vlamax/.test(key) && source !== "test_labo" && source !== "unknown") return "🏃 Mesure TFCL · tests de terrain";
  if (source === "test_labo") return "🧪 Labo";
  if (source === "observed") return "🏃 Test terrain déclaré";
  if (source === "test_terrain" || source === "test") return "🏃 Terrain — à confirmer";
  if (source === "snapshot") return "📋 Bilan — provenance à confirmer";
  if (source === "records") return "📐 Estimation par records";
  if (source === "coach") return "✍️ Saisie coach";
  if (source === "watch") return "⌚ Montre";
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
      const value = tte && Number.isFinite(tte.tte_min) && tte.tte_min > 0 ? tte.tte_min : null;
      const target = getTTETargetByAmbition(input.objectif, (input.ambition || 'age_group') as AmbitionLevel, input.athleteAge);
      return { ...axis, key: 'tte', label: 'Tenue au seuil · TTE', shortLabel: 'TTE', value, target,
        score: value != null && target > 0 ? Math.min(100, Math.round(100 * value / target)) : 0,
        unit: 'min', source: value != null ? tte?.source : 'unknown' };
    }
    const key = metricKeys[axis.key];
    const metric = key ? compass.profile[key] : null;
    const source = metric && typeof metric === "object" ? metric.source : "unknown";
    if (axis.key === 'vlamax' && sport === 'run' && input.sportFocus !== 'run') return { ...axis, label: 'VLamax course', shortLabel: 'VLamax course', value: null, score: 0, source: 'unknown' };
    if (sport === 'run' && axis.key === 'vo2max' && !input.vo2max) return { ...axis, value: null, score: 0, source: 'unknown' };
    const qualifier = sport === 'triathlon' && ['vlamax', 'fatmax', 'ftpkg'].includes(axis.key) ? ' vélo' : '';
    if (qualifier && input.sportFocus === 'run') return { ...axis, label: axis.label + qualifier, shortLabel: axis.shortLabel + qualifier, value: null, score: 0, source: 'unknown' };
    // VO₂max : la provenance déclarée dans la fiche remplace « Bilan — provenance à confirmer ».
    const vo2Source = input.vo2maxOrigin === 'lab' ? 'test_labo' : input.vo2maxOrigin === 'estimated' ? 'estimation' : input.vo2maxOrigin === 'entered' ? 'coach' : source;
    const declared = axis.key === 'vma' ? input.vmaSource : axis.key === 'ftpkg' ? input.ftpSource : null;
    return { ...axis, label: axis.label + qualifier, shortLabel: axis.shortLabel + qualifier, source: axis.key === "vo2max" ? (!input.vo2max ? "estimation" : vo2Source) : declared ?? source };
  });
  // Preserve the engine's ranked categories and their original metric order.
  const ranked = input.limiterResult?.categoryRanking?.flatMap(c => c.metrics) ?? input.limiterResult?.gapAnalysis ?? [];
  const priorityMetrics = ranked.filter(g => g.weightedImpact > 0 && g.prescriptionApplicable !== false).map(g => g.metric);
  const disciplines = sport === 'triathlon' ? buildDisciplineAxes(input, axes) : undefined;
  const runningDiagnostic = disciplines?.runningDiagnostic ?? (sport === 'run' ? computeRunningCompassDiagnostic({ objectif: input.objectif, ambition: (input.ambition || 'age_group') as AmbitionLevel, age: input.athleteAge, vma: input.vma, vo2max: input.vo2max, vo2Source: 'snapshot', vmaSource: input.vmaSource ?? undefined, paceThresholdSecPerKm: input.paceThresholdSecPerKm, vlamax: input.vlamaxRunReference ?? (input.sportFocus === 'run' ? input.vlamaxEffectif : null), tte: input.sportFocus === 'run' ? input.tteEffectif : input.tteEffectifRun ?? null, economy: input.runEconomyScore, drift: input.hrDriftPct }) : undefined);
  return {
    axes,
    disciplineAxes: disciplines,
    runningDiagnostic,
    cyclingDiagnostic: disciplines?.cyclingDiagnostic ?? (sport === 'bike' ? computeCyclingCompassDiagnostic({ axes, ftp: input.ftp, vo2Shared: false, vlamaxUpper: getVLamaxRange(input.objectif, input.ambition as AmbitionLevel, "bike").max }) : undefined),
    sport,
    sportReferences: buildSportReferences(input),
    priorityMetrics,
    fieldNotes: input.limiterResult?.gapAnalysis.flatMap(g => g.fieldEstimateNote ? [g.fieldEstimateNote] : []),
    wprimeReview: priorityMetrics.some(m => /^W['′]/i.test(m)),
    tteBike: sport !== 'run' && input.sportFocus !== 'run' ? input.tteEffectif : null,
    tteRun: sport === 'bike' ? null : input.sportFocus === "run" ? input.tteEffectif : input.tteEffectifRun ?? null,
    decouplingRun: sport === 'bike' ? null : input.hrDriftPct,
    economy: { ...compass.economyModifier, source: compass.profile.runningEconomy.source },
  };
}