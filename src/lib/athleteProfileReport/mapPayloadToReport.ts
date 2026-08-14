/**
 * mapPayloadToReport — adapte le payload d'export (ExportTools) vers l'entrée
 * du builder « Rapport Profil Athlète ».
 *
 * Aucune physiologie n'est recalculée ici, hormis la dérivation des zones
 * d'entraînement (moteur `deriveTrainingZones`, source unique déjà utilisée
 * par l'UI et l'export Nolio).
 */

import { getLimiterImpactCopy } from "@/lib/limiterImpactCopy";
import { LIMITER_INFO } from "@/lib/v2/unifiedLimiterDetection";
import {
  deriveTrainingZones,
  estimateRunThresholdPaceSecPerKm,
  type DerivedZoneSet,
} from "@/lib/zones/deriveTrainingZones";
import { computeStrategicRoadmap } from "@/engines/decision";
import type {
  AthleteProfileReportInput,
  MetricStatus,
  ReportLimiter,
  ReportMetric,
  ReportZoneSet,
} from "./types";

const CATEGORY_TO_LIMITER: Record<string, string> = {
  aerobic_power: "aerobic_engine",
  glycolytic: "glycolytic",
  metabolic_endurance: "specific_endurance",
  durability: "specific_endurance",
  neuromuscular: "neuromuscular",
  unknown: "none",
};

const SEVERITY_LABEL: Record<string, string> = {
  none: "faible",
  mild: "légère",
  moderate: "modérée",
  severe: "élevée",
};

function statusFromRange(
  v: number | null,
  target?: [number, number],
  lowerIsBetter = false,
): MetricStatus {
  if (v == null || !Number.isFinite(v) || v === 0) return "missing";
  if (!target) return "ok";
  const [lo, hi] = target;
  if (v >= lo && v <= hi) return "ok";
  const distance = v < lo ? (lo - v) / Math.max(1e-6, lo) : (v - hi) / Math.max(1e-6, hi);
  const wrongSide = lowerIsBetter ? v > hi : v < lo;
  if (!wrongSide) return "ok";
  return distance > 0.15 ? "bad" : "warn";
}

function mapZoneSet(set: DerivedZoneSet, sportLabel: string): ReportZoneSet {
  return {
    sportLabel,
    source: set.source,
    confidence: set.confidence,
    anchors: set.anchors ?? [],
    fallbackReason: set.fallbackReason,
    zones: set.zones.map((z) => ({
      id: z.id,
      label: z.label,
      condition: z.condition,
      pctRef: `${Math.round(z.pctRef.min)}–${Math.round(z.pctRef.max)} %`,
      refLabel: z.refLabel,
      absolute: z.absolute,
      heartRate: z.heartRate,
    })),
  };
}

export function mapExportPayloadToProfileReport(
  payload: any,
  opts: { ambitionLabel: string; generatedAt: string; logoBase64?: string | null },
): AthleteProfileReportInput {
  const compass = payload.coachingCompass;
  const limiterResult = payload.unifiedLimiter;
  const refs = payload.effectiveRefs;
  const snap = payload.effectiveSnapshot;
  const goal = payload.athlete?.goal ?? null;

  // ── Métriques clés ────────────────────────────────────────────────────────
  const ftpKg =
    refs?.ftp && refs?.weightKg ? Number((refs.ftp / refs.weightKg).toFixed(2)) : null;
  const ambitionTargets = payload.ambition?.targets;

  const metrics: ReportMetric[] = [
    {
      key: "vo2max",
      label: "VO₂max — cylindrée du moteur",
      value: refs?.vo2max ?? null,
      unit: "ml/kg/min",
      decimals: 1,
      scale: [30, 80],
      target: [50, 70],
      status: statusFromRange(refs?.vo2max ?? null, [50, 70]),
      meaning:
        "La quantité maximale d'oxygène que ton corps peut utiliser. Plus elle est haute, plus ton plafond de performance est élevé.",
      source: refs?.sources?.vo2max ?? null,
    },
    {
      key: "vlamax",
      label: "VLamax — vitesse de production de lactate",
      value: payload.vlamax?.value ?? null,
      unit: "mmol/L/s",
      decimals: 2,
      scale: [0.2, 1.0],
      target: ambitionTargets?.vlamax
        ? [ambitionTargets.vlamax.min, ambitionTargets.vlamax.max]
        : [0.3, 0.5],
      status: statusFromRange(
        payload.vlamax?.value ?? null,
        ambitionTargets?.vlamax
          ? [ambitionTargets.vlamax.min, ambitionTargets.vlamax.max]
          : [0.3, 0.5],
        true,
      ),
      meaning:
        "À quelle vitesse tu produis du lactate. Trop haute, tu brûles tes sucres trop vite en endurance ; trop basse, tu manques d'explosivité.",
      source: payload.vlamax?.source ?? null,
      confidence: payload.vlamax?.confidence ?? null,
    },
    {
      key: "tte",
      label: "TTE — endurance au seuil",
      value: payload.tte?.tte_min ?? null,
      unit: "min",
      decimals: 0,
      scale: [10, 90],
      target: ambitionTargets?.tte_min
        ? [ambitionTargets.tte_min, ambitionTargets.tte_min + 20]
        : undefined,
      status: statusFromRange(
        payload.tte?.tte_min ?? null,
        ambitionTargets?.tte_min
          ? [ambitionTargets.tte_min, ambitionTargets.tte_min + 20]
          : undefined,
      ),
      meaning:
        "Le temps que tu peux tenir à ton seuil. C'est ta durabilité : deux athlètes avec le même seuil ne tiennent pas le même temps.",
      source: payload.tte?.source ?? null,
      confidence: payload.tte?.confidence ?? null,
    },
    {
      key: "ftpkg",
      label: "FTP / kg — puissance relative",
      value: ftpKg,
      unit: "W/kg",
      decimals: 2,
      scale: [1.5, 6],
      target: ambitionTargets?.ftp_kg_min
        ? [ambitionTargets.ftp_kg_min, ambitionTargets.ftp_kg_min + 0.8]
        : undefined,
      status: statusFromRange(
        ftpKg,
        ambitionTargets?.ftp_kg_min
          ? [ambitionTargets.ftp_kg_min, ambitionTargets.ftp_kg_min + 0.8]
          : undefined,
      ),
      meaning:
        "La puissance que tu peux tenir environ une heure, rapportée à ton poids. C'est le meilleur repère de niveau à vélo.",
      source: refs?.sources?.ftp ?? null,
    },
    {
      key: "fatmax",
      label: "FatMax — intensité de meilleure combustion des graisses",
      value: payload.fatmaxTFCL?.fatmaxPctFTP ?? compass?.profile?.fatmax?.value ?? null,
      unit: "% FTP",
      decimals: 0,
      scale: [40, 90],
      target: [60, 78],
      status: statusFromRange(
        payload.fatmaxTFCL?.fatmaxPctFTP ?? compass?.profile?.fatmax?.value ?? null,
        [60, 78],
      ),
      meaning:
        "L'intensité où tu utilises le plus de graisses. Plus elle est haute, moins tu dépends du ravitaillement en course longue.",
      source: compass?.profile?.fatmax?.source ?? null,
    },
    {
      key: "vma",
      label: "VMA — vitesse maximale aérobie",
      value: refs?.vma ?? null,
      unit: "km/h",
      decimals: 1,
      scale: [10, 24],
      target: [16, 21],
      status: statusFromRange(refs?.vma ?? null, [16, 21]),
      meaning:
        "La vitesse à laquelle tu atteins ton VO₂max en course. Elle sert de base à toutes tes allures d'entraînement.",
      source: refs?.sources?.vma ?? null,
    },
  ];

  // ── Limiteurs ─────────────────────────────────────────────────────────────
  const ranking: any[] = Array.isArray(limiterResult?.categoryRanking)
    ? limiterResult.categoryRanking.slice(0, 3)
    : [];
  const maxImpact = Math.max(1, ...ranking.map((r) => r.totalImpact ?? 0));

  const limiters: ReportLimiter[] = ranking.map((entry, i) => {
    const limiterKey = CATEGORY_TO_LIMITER[entry.category] ?? "none";
    const info = (LIMITER_INFO as any)[limiterKey] ?? { label: entry.category, emoji: "•" };
    const copy = getLimiterImpactCopy(limiterKey as any);
    return {
      rank: i + 1,
      title: info.label,
      emoji: info.emoji,
      severityLabel:
        i === 0 ? (SEVERITY_LABEL[limiterResult?.severity ?? "moderate"] ?? "modérée") : "secondaire",
      impact: Math.round(((entry.totalImpact ?? 0) / maxImpact) * 100),
      fieldFeeling: copy.sentence1,
      mechanism: copy.sentence2,
      evidence: (entry.metrics ?? [])
        .slice(0, 4)
        .map((m: any) => `${m.metric} : écart ${m.gap > 0 ? "+" : ""}${Math.round(m.gap)} %`),
    };
  });

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
  for (const l of lorangLevers.slice(0, 3)) {
    levers.push({
      title: l.leverLabel ?? l.label ?? "Levier",
      emoji: l.emoji ?? "⚙️",
      description: l.rationale ?? l.description ?? "",
      adaptations: l.expectedAdaptations ?? [],
      workouts: l.sessionTypes ?? l.workouts ?? [],
      priority: l.priority ?? 2,
    });
  }

  // ── Zones ─────────────────────────────────────────────────────────────────
  const vlamaxRun = (snap?.vlamax_run ?? null) as number | null;
  const paceThreshold =
    (snap?.pace_threshold_sec_per_km as number | null) ??
    estimateRunThresholdPaceSecPerKm(refs?.vma ?? null, payload.runMLSS?.effectivePct ?? null);

  const zoneSets: ReportZoneSet[] = [];
  const bike = deriveTrainingZones({
    sport: "bike",
    ftp: refs?.ftp ?? null,
    fcMax: refs?.fcMax ?? null,
    vlamax: payload.vlamax?.value ?? null,
    vo2max: refs?.vo2max ?? null,
    weightKg: refs?.weightKg ?? null,
  });
  const run = deriveTrainingZones({
    sport: "run",
    vma: refs?.vma ?? null,
    paceThresholdSecPerKm: typeof paceThreshold === "number" ? paceThreshold : null,
    paceThresholdEstimated: snap?.pace_threshold_sec_per_km == null,
    fcMax: refs?.fcMax ?? null,
    vlamax: vlamaxRun ?? payload.vlamax?.value ?? null,
    vo2max: refs?.vo2max ?? null,
    weightKg: refs?.weightKg ?? null,
  });
  if (refs?.ftp) zoneSets.push(mapZoneSet(bike, "Vélo"));
  if (refs?.vma || paceThreshold) zoneSets.push(mapZoneSet(run, "Course à pied"));

  // ── Roadmap ───────────────────────────────────────────────────────────────
  let roadmap = null;
  try {
    const r = computeStrategicRoadmap({ objectif: goal, limiterResult });
    roadmap = {
      title: r.title,
      totalWeeks: r.totalWeeks,
      phases: r.phases,
      limiterSummary: r.limiterSummary,
      personalized: r.personalized,
    };
  } catch {
    roadmap = null;
  }

  // ── Progression vers la cible d'ambition ──────────────────────────────────
  const currentAmbition = (payload.ambition?.allTargets ?? []).find(
    (t: any) => t.ambition === payload.ambition?.current,
  );
  const targetProgress = currentAmbition
    ? [
        {
          label: "VLamax",
          current: payload.vlamax?.value ?? null,
          target: currentAmbition.targets.vlamax.optimal,
          unit: "mmol/L/s",
          decimals: 2,
          progress: currentAmbition.progress.vlamax,
          reached: (currentAmbition.progress.vlamax ?? 0) >= 100,
        },
        {
          label: "TTE (endurance au seuil)",
          current: payload.tte?.tte_min ?? null,
          target: currentAmbition.targets.tte_min,
          unit: "min",
          decimals: 0,
          progress: currentAmbition.progress.tte,
          reached: (currentAmbition.progress.tte ?? 0) >= 100,
        },
        {
          label: "FTP / kg",
          current: ftpKg,
          target: currentAmbition.targets.ftp_kg_min,
          unit: "W/kg",
          decimals: 2,
          progress: currentAmbition.progress.ftpKg,
          reached: (currentAmbition.progress.ftpKg ?? 0) >= 100,
        },
      ]
    : [];

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
  nextSteps.push("Refaire un point de contrôle (test terrain) dans 6 à 8 semaines pour mesurer les progrès.");

  return {
    athleteName: payload.athlete?.name ?? "Athlète",
    objectifLabel: goal ?? "Objectif non défini",
    ambitionLabel: opts.ambitionLabel,
    age: payload.ageAdjustment?.age ?? null,
    generatedAt: opts.generatedAt,
    snapshotDate: snap?.date ?? null,
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
    metrics,
    radar: (compass?.radarAxes ?? []).map((a: any) => ({
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
    targetProgress,
    limiters,
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
    roadmap,
    nextSteps,
    glossary: [
      { term: "VO₂max", definition: "Quantité maximale d'oxygène utilisable par minute : la cylindrée de ton moteur." },
      { term: "VLamax", definition: "Vitesse maximale de production de lactate : ton « moteur sucre »." },
      { term: "Seuil (MLSS)", definition: "Intensité la plus haute que tu peux tenir sans accumuler de lactate." },
      { term: "TTE", definition: "Temps que tu peux tenir à ton seuil : ta durabilité." },
      { term: "FatMax", definition: "Intensité où tu brûles le plus de graisses par minute." },
      { term: "Limiteur", definition: "Le maillon faible qui plafonne ta performance aujourd'hui." },
      { term: "Levier", definition: "Le type d'entraînement qui corrige un limiteur donné." },
      { term: "Zones", definition: "Plages d'intensité calées sur ta physiologie, pas sur une grille générique." },
    ],
    logoBase64: opts.logoBase64 ?? null,
  };
}
