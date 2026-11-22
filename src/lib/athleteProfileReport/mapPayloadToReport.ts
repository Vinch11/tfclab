import { reportSportDurability, reportSportZoneSets } from '@/lib/reportKit/sportDiagramData';
/**
 * mapPayloadToReport — adapte le payload d'export (ExportTools) vers l'entrée
 * du builder « Rapport Profil Athlète ».
 *
 * Aucune physiologie n'est recalculée ici, hormis la dérivation des zones
 * d'entraînement (moteur `deriveTrainingZones`, source unique déjà utilisée
 * par l'UI et l'export Nolio).
 */

import { reportSports } from '@/lib/reportKit/story';
import { getObjectifLabel } from '@/types/athlete';
import { compassReportRows, compassSportReportRows, compassTteReportRows } from '@/lib/coachingCompass/reportPresentation';

import { computeStrategicRoadmap } from "@/engines/decision";
import type {
  AthleteProfileReportInput,
} from "./types";

export function reportRoadmap(payload: Parameters<typeof computeStrategicRoadmap>[0]) {
  if (!payload.objectif) return null;
  try {
    return computeStrategicRoadmap(payload);
  } catch {
    return null;
  }
}

export function mapExportPayloadToProfileReport(
  payload: any,
  opts: { ambitionLabel: string; generatedAt: string; logoBase64?: string | null },
): AthleteProfileReportInput {
  const compass = payload.coachingCompass;
  const limiterResult = payload.unifiedLimiter;
  const refs = payload.effectiveRefs;
  const goal = payload.athlete?.goal ?? null;

  // ── Leviers ───────────────────────────────────────────────────────────────
  const levers = compass?.leverage
    ? [
        {
          title: compass.leverage.label,
          emoji: compass.leverage.icon ?? "🎯",
          description: compass.leverage.description,
          adaptations: compass.leverage.expectedAdaptations ?? [],
          workouts: compass.leverage.workoutExamples ?? [],
          priority: compass.leverage.priority ?? 1,
        },
      ]
    : [];

  const lorangLevers: any[] = payload.lorangResult?.activatedLevers ?? [];
  for (const l of lorangLevers.slice(0, 4)) {
    const title = l.leverLabel ?? l.label ?? "Levier";
    if (levers.some((x) => x.title?.trim().toLowerCase() === String(title).trim().toLowerCase())) continue;
    levers.push({
      title: l.leverLabel ?? l.label ?? "Levier",
      emoji: l.emoji ?? "⚙️",
      description: l.rationale ?? l.description ?? "",
      adaptations: l.expectedAdaptations ?? [],
      workouts: l.sessionTypes ?? l.workouts ?? [],
      priority: l.priority ?? 2,
    });
  }

  // ── Zones et durabilité : projection partagée, sans nouveau calcul physiologique ──
  const zoneSets = reportSportZoneSets(payload);
  const durabilityDataBySport = reportSportDurability(payload);
  const sports = reportSports(payload.athlete?.goal, compass?.presentation?.sport === 'run');

  // ── Narratif profil ───────────────────────────────────────────────────────
  const narrative = [
    limiterResult?.limiterExplanation ?? compass?.limiter?.description ?? "",
    compass?.decision?.athleteMessage ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const nextSteps: string[] = [];
  if (compass?.decision) {
    nextSteps.push(
      `Enchaîner le bloc **${compass.decision.recommendedBlock}** pendant ${compass.decision.durationWeeks} semaines.`,
    );
  }
  if (limiterResult?.missingMetrics?.length) {
    nextSteps.push(
      `Compléter les données manquantes pour affiner le diagnostic : ${limiterResult.missingMetrics.slice(0, 4).join(", ")}.`,
    );
  }
  nextSteps.push("Refaire un point de contrôle (test terrain) dans 6 à 8 semaines pour affiner tes repères.");

  return {
    athleteName: payload.athlete?.name ?? "Athlète",
    sports,
    durabilityDataBySport,
    brief: payload.reportBrief,
    calendar: payload.calendar,
    swimming: !/duathlon/i.test(goal ?? '') && (compass?.presentation?.sport === 'triathlon' || /^(IM|703|Olympic|Sprint|Ironman)$/i.test(goal ?? ''))
      ? { css: refs?.css > 0 ? Math.round(refs.css) : null } : undefined,
    nextRace: payload.nextRace,
    objectifLabel: goal ? getObjectifLabel(goal) : "ton prochain objectif",
    ambitionLabel: opts.ambitionLabel,
    age: payload.ageAdjustment?.age ?? null,
    generatedAt: opts.generatedAt,
    snapshotDate: payload.effectiveSnapshot?.date ?? null,
    dataCompleteness: payload.completude?.score ?? compass?.profile?.dataCompleteness ?? 0,
    readiness: {
      score: payload.potentielPhysiologique?.score ?? 0,
      label: payload.potentielPhysiologique?.label ?? "—",
      confidence: payload.potentielPhysiologique?.confidence ?? 0,
      message:
        compass?.decision?.athleteMessage ??
        payload.potentielPhysiologique?.messageStaff ??
        "Voici l'état actuel de ton potentiel physiologique.",
    },
    profileNarrative: narrative || "Profil en cours de constitution : réalise les tests recommandés pour l'affiner.",
    metrics: compass ? compassReportRows(compass).map(axis => ({
      key: axis.key, label: axis.label, value: axis.value, unit: axis.unit,
      decimals: axis.unit === 'mmol/L/s' ? 2 : 1,
      target: axis.target != null ? [axis.target, axis.target] as [number, number] : undefined,
      status: axis.value == null || axis.value <= 0 ? 'missing' as const : axis.source !== 'observed' && axis.source !== 'test_labo' ? 'warn' as const : axis.score >= 100 ? 'ok' as const : 'warn' as const,
      source: axis.source,
      meaning: axis.key === 'tte' ? 'Durée au seuil ; ne mesure pas la robustesse après effort prolongé.' : axis.key === 'fatmax' ? 'Zone lipidique vélo modélisée, non mesurée ; pas une note de préparation.' : 'Repère et cible interne issus du compass ; interprétation selon la provenance.',
    })) : [],
    sportReferences: compass?.presentation?.sportReferences,
    sportTte: compass ? compassTteReportRows(compass) : [],
    sportComparisons: compass ? { bike: compassSportReportRows(compass, 'bike'), run: compassSportReportRows(compass, 'run') } : {},
    radar: (compass?.presentation?.axes ?? compass?.radarAxes ?? []).map((a: any) => ({
      source: a.source,
      label: a.label,
      shortLabel: a.shortLabel,
      score: a.score,
      value: a.value,
      target: a.target,
      unit: a.unit,
    })),
    economyAxis: compass?.economyModifier
      ? {
          label: compass.economyModifier.label,
          shortLabel: compass.economyModifier.shortLabel,
          score: compass.economyModifier.score,
          value: compass.economyModifier.value,
          target: compass.economyModifier.target,
          unit: compass.economyModifier.unit,
        }
      : null,
    targetProgress: compass ? compassReportRows(compass).filter(r => !['fatmax', 'tte'].includes(r.key)).map(r => ({ label: r.label, current: r.value, target: r.target, unit: r.unit, decimals: r.unit === 'mmol/L/s' ? 2 : 1, progress: r.score, reached: r.value != null && r.value > 0 && r.score >= 100 })) : [],
    limiters: [],
    levers,
    decision: compass?.decision
      ? {
          block: compass.decision.recommendedBlock,
          durationWeeks: compass.decision.durationWeeks,
          workouts: compass.decision.primaryWorkouts ?? [],
          physiologicalTargets: compass.decision.physiologicalTargets ?? [],
          prohibitions: compass.decision.prohibitions ?? [],
          athleteMessage: compass.decision.athleteMessage ?? "",
        }
      : null,
    zoneSets,
    roadmap: goal && payload.effectiveSnapshot?.source !== "finisher-express" ? reportRoadmap({ objectif: goal, limiterResult, raceGoals: payload.raceGoals, planStartDate: payload.planStartDate }) : null,
    nextSteps,
    glossary: [
      { term: "VO₂max", definition: "Quantité maximale d'oxygène utilisable par minute : la cylindrée de ton moteur." },
      { term: "VLamax", definition: "Vitesse maximale de production de lactate : ton « moteur sucre »." },
      { term: "Seuil (MLSS)", definition: "Intensité la plus haute que tu peux tenir sans accumuler de lactate." },
      { term: "TTE", definition: "Temps tenu au seuil selon sa provenance ; distinct de la robustesse après effort prolongé." },
      { term: "FatMax", definition: "Intensité où tu brûles le plus de graisses par minute." },
      { term: "Limiteur", definition: "Le maillon faible qui plafonne ta performance aujourd'hui." },
      { term: "Levier", definition: "Le type d'entraînement qui corrige un limiteur donné." },
      { term: "Zones", definition: "Plages d'intensité calées sur ta physiologie, pas sur une grille générique." },
    ],
    logoBase64: opts.logoBase64 ?? null,
  };
}
