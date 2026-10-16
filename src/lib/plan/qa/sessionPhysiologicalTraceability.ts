import type { PlanConfig } from "@/hooks/useAITrainingPlan";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";
import { buildRepairWorkoutMetadata } from "@/lib/plan/repairCatalogMetadata";
import { classifyIntentEvidence, type IntentFamily } from "@/lib/plan/intentFamily";
import {
  HIGH_IMPACT_SESSION_PATTERNS,
  PROHIBITION_SESSION_PATTERNS,
  resolveProhibitionKeys,
} from "@/lib/limiterSessionPatterns";
import { isLevelPrerequisiteIncompatible } from "@/lib/plan/levelPrerequisiteCompatibility";

export type SessionTraceStatus = "verified" | "uncertain" | "not_verified" | "not_applicable";
export type SessionTraceSeverity = "info" | "warning" | "critical";

export interface SessionTraceAnomaly {
  code:
    | "intention_not_identified"
    | "catalog_not_in_generation"
    | "catalog_metadata_missing"
    | "dose_duration_out_of_range"
    | "dose_intensity_exceeds_catalog"
    | "dose_structure_differs_from_catalog"
    | "final_intent_differs_from_catalog"
    | "prohibition_conflict"
    | "level_prerequisite_conflict"
    | "load_intensity_conflict"
    | "injury_risk_conflict"
    | "priority_not_represented"
    | "causal_link_not_verified";
  severity: SessionTraceSeverity;
  message: string;
  weekNumber?: number;
  dayName?: string;
  catalogId?: string | null;
}

export interface SessionDoseTrace {
  status: "verified" | "uncertain" | "not_verified" | "conflict";
  duration: {
    valueMin: number;
    catalogRangeMin: [number, number] | null;
    status: "verified" | "not_verified" | "conflict";
  };
  intensity: {
    zones: string[];
    maxZone: number | null;
    catalogMaxZone: number | null;
    status: "verified" | "not_verified" | "conflict";
  };
  repetitions: Array<{ count: number; value: number; unit: "s" | "min" | "m" }>;
  recoverySeconds: number[];
  volume: { workSeconds: number | null; distanceMeters: number | null };
  structure: {
    status: "verified" | "not_verified" | "conflict";
    catalogRepetitions: Array<{ count: number; value: number; unit: "s" | "min" | "m" }>;
    catalogRecoverySeconds: number[];
  };
}

export interface SessionPhysiologicalAttribution {
  sessionKey: string;
  weekNumber: number;
  dayName: string;
  title: string;
  catalogId: string | null;
  status: SessionTraceStatus;
  limiter: { metric: string; priority: number } | null;
  lever: { id: string; label: string; priority: number } | null;
  intention: {
    family: IntentFamily;
    source: "catalog_metadata";
    finalEvidence: "pattern" | "zone_fallback" | "unclassified";
  } | null;
  dose: SessionDoseTrace;
  justification: string;
  anomalies: SessionTraceAnomaly[];
}

export interface SessionPhysiologicalTraceabilityReport {
  version: 1;
  generatedAt: string;
  sessions: SessionPhysiologicalAttribution[];
  anomalies: SessionTraceAnomaly[];
  summary: {
    activeSessions: number;
    verified: number;
    uncertain: number;
    notVerified: number;
    critical: number;
    warnings: number;
  };
  context: {
    diagnosticConfidence: number | null;
    strategyConfidence: string | null;
    trainingLevel: string | null;
    trainingLevelSource: string | null;
    recentLoadStatus: string | null;
    constraints: "present_not_structurally_verified" | "missing";
    history: "recent_load_only" | "not_verified";
    attributionMeaning: string;
  };
  limitations: string[];
}

interface LeverContract {
  intents: IntentFamily[];
  limiterKeys: string[];
}

// Contrat volontairement fermé : seuls les liens directement justifiés par
// les conditions d'activation du Lorang Strategy Engine sont vérifiables.
// Tout levier inconnu reste not_verified au lieu d'être deviné par son titre.
const LEVER_CONTRACTS: Record<string, LeverContract> = {
  vo2_intervals: { intents: ["vo2"], limiterKeys: ["vo2max"] },
  threshold_work: { intents: ["seuil"], limiterKeys: ["ftp", "vma", "tte"] },
  z2_volume: {
    intents: ["endurance_fondamentale", "fatmax"],
    limiterKeys: ["tte", "vlamax", "fatmax", "durabilite"],
  },
  force_max: { intents: ["force"], limiterKeys: ["economie"] },
  sfr_force_endurance: { intents: ["force"], limiterKeys: ["vlamax", "economie"] },
  train_low: { intents: ["fatmax"], limiterKeys: ["vlamax", "fatmax"] },
  hrv_adaptation: { intents: ["recuperation"], limiterKeys: [] },
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function canonicalLimiter(metric: string): string | null {
  const value = normalize(metric).replace(/[^a-z0-9]/g, "");
  if (value.includes("vo2max")) return "vo2max";
  if (value.includes("vlamax")) return "vlamax";
  if (value === "vma" || value.includes("vitessemaximaleaerobie")) return "vma";
  if (value.includes("tte")) return "tte";
  if (value.includes("fatmax")) return "fatmax";
  if (value.includes("ftp")) return "ftp";
  if (value.includes("econom")) return "economie";
  if (value.includes("durabil")) return "durabilite";
  if (value.includes("sprint")) return "sprint";
  if (value.includes("pmax")) return "pmax";
  return null;
}

function zoneMax(zones: string[]): number | null {
  let max = 0;
  for (const zone of zones) {
    for (const match of String(zone).matchAll(/z\s*([1-7])/gi)) max = Math.max(max, Number(match[1]));
  }
  return max > 0 ? max : null;
}

function extractRepetitions(text: string): SessionDoseTrace["repetitions"] {
  const repetitions: SessionDoseTrace["repetitions"] = [];
  for (const match of text.matchAll(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(min|s|m)\b/gi)) {
    repetitions.push({
      count: Number(match[1]),
      value: Number(match[2].replace(",", ".")),
      unit: match[3].toLowerCase() as "s" | "min" | "m",
    });
  }
  return repetitions;
}

function extractRecoverySeconds(text: string): number[] {
  const recoveries: number[] = [];
  for (const match of text.matchAll(/(?:r(?:ecup|écup)?|recuperation|récupération)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(min|s|'|’|")/gi)) {
    const value = Number(match[1].replace(",", "."));
    recoveries.push(match[2].toLowerCase() === "s" ? value : value * 60);
  }
  return recoveries;
}

function sameRepetitions(
  actual: SessionDoseTrace["repetitions"],
  expected: SessionDoseTrace["repetitions"],
): boolean {
  return actual.length === expected.length && actual.every((item, index) => {
    const reference = expected[index];
    return item.count === reference.count && item.value === reference.value && item.unit === reference.unit;
  });
}

function parseDose(session: MergedSession, workout: LibraryWorkout | null): SessionDoseTrace {
  const metadata = workout ? buildRepairWorkoutMetadata(workout) : null;
  const durationStatus = !metadata
    ? "not_verified" as const
    : session.durationMin >= metadata.durationMin[0] && session.durationMin <= metadata.durationMin[1]
      ? "verified" as const
      : "conflict" as const;
  const finalMax = zoneMax(session.zones);
  const catalogMax = metadata && metadata.mainZoneMax > 0 ? metadata.mainZoneMax : null;
  const intensityStatus = finalMax === null || catalogMax === null
    ? "not_verified" as const
    : finalMax <= catalogMax
      ? "verified" as const
      : "conflict" as const;

  const evidence = `${session.title} ${session.details}`;
  const repetitions = extractRepetitions(evidence);
  const recoverySeconds = extractRecoverySeconds(evidence);
  const catalogEvidence = workout
    ? workout.structure.map(part => `${part.part} ${part.text} ${part.zones.join(" ")}`).join(" ")
    : "";
  const catalogRepetitions = extractRepetitions(catalogEvidence);
  const catalogRecoverySeconds = extractRecoverySeconds(catalogEvidence);
  const hasComparableStructure = catalogRepetitions.length > 0 || catalogRecoverySeconds.length > 0;
  const repetitionMatches = catalogRepetitions.length === 0 || sameRepetitions(repetitions, catalogRepetitions);
  const recoveryMatches = catalogRecoverySeconds.length === 0 || (
    recoverySeconds.length === catalogRecoverySeconds.length &&
    recoverySeconds.every((value, index) => Math.abs(value - catalogRecoverySeconds[index]) <= 1)
  );
  const structureStatus = !hasComparableStructure
    ? "not_verified" as const
    : repetitionMatches && recoveryMatches
      ? "verified" as const
      : "conflict" as const;
  let workSeconds = 0;
  let distanceMeters = 0;
  for (const repetition of repetitions) {
    if (repetition.unit === "s") workSeconds += repetition.count * repetition.value;
    if (repetition.unit === "min") workSeconds += repetition.count * repetition.value * 60;
    if (repetition.unit === "m") distanceMeters += repetition.count * repetition.value;
  }

  const status = durationStatus === "conflict" || intensityStatus === "conflict" || structureStatus === "conflict"
    ? "conflict" as const
    : durationStatus === "verified" && intensityStatus === "verified"
      ? "verified" as const
      : durationStatus === "verified" || intensityStatus === "verified"
        ? "uncertain" as const
        : "not_verified" as const;

  return {
    status,
    duration: { valueMin: session.durationMin, catalogRangeMin: metadata?.durationMin ?? null, status: durationStatus },
    intensity: { zones: [...session.zones], maxZone: finalMax, catalogMaxZone: catalogMax, status: intensityStatus },
    repetitions,
    recoverySeconds,
    volume: { workSeconds: workSeconds || null, distanceMeters: distanceMeters || null },
    structure: { status: structureStatus, catalogRepetitions, catalogRecoverySeconds },
  };
}

function workoutEvidence(workout: LibraryWorkout, session: MergedSession): string {
  return [
    workout.id,
    workout.objectif,
    workout.when,
    workout.avoid,
    ...(workout.tags ?? []),
    ...workout.structure.flatMap(part => [part.part, part.text, ...part.zones]),
    session.title,
    session.details,
    ...session.zones,
  ].join(" ");
}

function findCausalPair(
  intent: IntentFamily,
  planConfig: PlanConfig,
): { limiter: SessionPhysiologicalAttribution["limiter"]; lever: SessionPhysiologicalAttribution["lever"] } {
  const limiters = (planConfig.identifiedLimitersRaw ?? []).map((metric, index) => ({
    metric,
    priority: index + 1,
    key: canonicalLimiter(metric),
  }));
  const levers = [...(planConfig.strategyContext?.levers ?? [])].sort((a, b) => a.priority - b.priority);
  for (const limiter of limiters) {
    if (!limiter.key) continue;
    for (const lever of levers) {
      const contract = LEVER_CONTRACTS[lever.id];
      if (!contract || !contract.intents.includes(intent) || !contract.limiterKeys.includes(limiter.key)) continue;
      return {
        limiter: { metric: limiter.metric, priority: limiter.priority },
        lever: { id: lever.id, label: lever.label, priority: lever.priority },
      };
    }
  }
  return { limiter: null, lever: null };
}

function anomaly(
  session: MergedSession,
  code: SessionTraceAnomaly["code"],
  severity: SessionTraceSeverity,
  message: string,
): SessionTraceAnomaly {
  return {
    code,
    severity,
    message,
    weekNumber: session.weekNumber,
    dayName: session.dayName,
    catalogId: session.catalogId,
  };
}

export interface SessionTraceabilityInput {
  plan: MergedPlan;
  planConfig: PlanConfig;
  allowedCatalogIds?: string[];
  catalog?: LibraryWorkout[];
  now?: Date;
}

export function buildSessionPhysiologicalTraceability(
  input: SessionTraceabilityInput,
): SessionPhysiologicalTraceabilityReport {
  const catalog = input.catalog ?? WorkoutLibrary;
  const byId = new Map(catalog.map(workout => [workout.id.toUpperCase(), workout]));
  const allowed = input.allowedCatalogIds ? new Set(input.allowedCatalogIds.map(id => id.toUpperCase())) : null;
  const prohibitionKeys = resolveProhibitionKeys(input.planConfig.prohibitions);
  const trainingSignal = input.planConfig.ambitionMeta
    ? {
        trainingLevel: input.planConfig.ambitionMeta.trainingLevel,
        trainingLevelSource: input.planConfig.ambitionMeta.trainingLevelSource,
      }
    : null;
  const diagnosticConfidence = input.planConfig.physiologicalTrace?.diagnostic.confidenceGlobal ?? null;
  const strategyConfidence = input.planConfig.strategyContext?.confidence ?? null;
  const uncertainContext = diagnosticConfidence !== null && diagnosticConfidence < 0.7 ||
    strategyConfidence === "low" || strategyConfidence === "unknown" || strategyConfidence === null;

  const sessions: SessionPhysiologicalAttribution[] = [];
  const globalAnomalies: SessionTraceAnomaly[] = [];

  for (const week of input.plan.weeks) {
    for (const session of week.sessions) {
      const sessionKey = `S${session.weekNumber}-${session.dayIndex}-${session.catalogId ?? "custom"}`;
      if (session.isRest) {
        sessions.push({
          sessionKey,
          weekNumber: session.weekNumber,
          dayName: session.dayName,
          title: session.title,
          catalogId: null,
          status: "not_applicable",
          limiter: null,
          lever: null,
          intention: null,
          dose: parseDose(session, null),
          justification: "Jour de repos : aucune attribution physiologique de séance requise.",
          anomalies: [],
        });
        continue;
      }

      const localAnomalies: SessionTraceAnomaly[] = [];
      const workout = session.catalogId ? byId.get(session.catalogId.toUpperCase()) ?? null : null;
      if (!session.catalogId || !workout) {
        localAnomalies.push(anomaly(
          session,
          session.catalogId ? "catalog_metadata_missing" : "intention_not_identified",
          "warning",
          session.catalogId
            ? `Métadonnées catalogue introuvables pour ${session.catalogId}; chaîne causale non vérifiée.`
            : "Séance custom sans catalogId : intention physiologique non vérifiable automatiquement.",
        ));
      }
      if (session.catalogId && allowed && !allowed.has(session.catalogId.toUpperCase())) {
        localAnomalies.push(anomaly(
          session,
          "catalog_not_in_generation",
          "critical",
          `${session.catalogId} n'appartenait pas au catalogue injecté pour cette génération.`,
        ));
      }

      const dose = parseDose(session, workout);
      if (dose.duration.status === "conflict") {
        localAnomalies.push(anomaly(
          session,
          "dose_duration_out_of_range",
          "warning",
          `Durée ${dose.duration.valueMin} min hors plage catalogue ${dose.duration.catalogRangeMin?.join("–")} min.`,
        ));
      }
      if (dose.intensity.status === "conflict") {
        localAnomalies.push(anomaly(
          session,
          "dose_intensity_exceeds_catalog",
          "critical",
          `Intensité finale Z${dose.intensity.maxZone} au-dessus du plafond principal catalogue Z${dose.intensity.catalogMaxZone}.`,
        ));
      }
      if (dose.structure.status === "conflict") {
        localAnomalies.push(anomaly(
          session,
          "dose_structure_differs_from_catalog",
          "warning",
          "Répétitions ou récupération finales différentes de la structure catalogue.",
        ));
      }

      let intention: SessionPhysiologicalAttribution["intention"] = null;
      let limiter: SessionPhysiologicalAttribution["limiter"] = null;
      let lever: SessionPhysiologicalAttribution["lever"] = null;
      if (workout) {
        const metadata = buildRepairWorkoutMetadata(workout);
        const finalEvidence = classifyIntentEvidence(
          `${session.title} ${session.details} ${session.zones.join(" ")}`,
          dose.intensity.maxZone ?? 0,
        );
        intention = {
          family: metadata.intentFamily,
          source: "catalog_metadata",
          finalEvidence: finalEvidence.source,
        };
        if (metadata.intentFamily === "other") {
          localAnomalies.push(anomaly(
            session,
            "intention_not_identified",
            "warning",
            `${metadata.id} ne porte aucune famille d'intention vérifiable.`,
          ));
        }
        if (
          finalEvidence.source === "pattern" &&
          finalEvidence.family !== "other" &&
          finalEvidence.family !== metadata.intentFamily
        ) {
          localAnomalies.push(anomaly(
            session,
            "final_intent_differs_from_catalog",
            "critical",
            `Le texte final exprime l'intention ${finalEvidence.family}, alors que ${metadata.id} porte ${metadata.intentFamily}, même si l'intensité peut être voisine.`,
          ));
        }

        ({ limiter, lever } = findCausalPair(metadata.intentFamily, input.planConfig));
        if (!limiter || !lever) {
          localAnomalies.push(anomaly(
            session,
            "causal_link_not_verified",
            "info",
            `Intention ${metadata.intentFamily} identifiée, mais aucun couple limiteur–levier actif ne la justifie de façon déterministe.`,
          ));
        }

        const evidence = workoutEvidence(workout, session);
        for (const key of prohibitionKeys) {
          if (PROHIBITION_SESSION_PATTERNS[key]?.test(evidence)) {
            localAnomalies.push(anomaly(
              session,
              "prohibition_conflict",
              "critical",
              `La séance correspond à la prohibition active « ${key} ».`,
            ));
          }
        }
        if (isLevelPrerequisiteIncompatible(workout.id, trainingSignal)) {
          localAnomalies.push(anomaly(
            session,
            "level_prerequisite_conflict",
            "critical",
            `${workout.id} exige un niveau/ancienneté incompatible avec le signal mesuré ${trainingSignal?.trainingLevel}.`,
          ));
        }
        const recentLoad = input.planConfig.recentLoad?.status;
        if ((recentLoad === "high" || recentLoad === "overload") && session.isKeySession && metadata.mainZoneMax >= 4) {
          localAnomalies.push(anomaly(
            session,
            "load_intensity_conflict",
            "warning",
            `Séance clé Z${metadata.mainZoneMax} programmée avec une charge récente ${recentLoad}.`,
          ));
        }
        const risk = normalize(session.sport).includes("bike")
          ? input.planConfig.injuryRisk?.bike
          : input.planConfig.injuryRisk?.run;
        if (risk && (risk.level === "ELEVE" || risk.level === "CRITIQUE")) {
          const impactPattern = normalize(session.sport).includes("bike")
            ? HIGH_IMPACT_SESSION_PATTERNS.bike_force
            : new RegExp(`${HIGH_IMPACT_SESSION_PATTERNS.run_long.source}|${HIGH_IMPACT_SESSION_PATTERNS.run_intensity.source}`, "i");
          if (impactPattern.test(evidence)) {
            localAnomalies.push(anomaly(
              session,
              "injury_risk_conflict",
              "warning",
              `Séance à impact significatif avec risque blessure ${risk.level.toLowerCase()} (${risk.why}).`,
            ));
          }
        }
      }

      const critical = localAnomalies.some(item => item.severity === "critical");
      let status: SessionTraceStatus = "not_verified";
      if (workout && intention && intention.family !== "other") {
        if (limiter && lever && dose.status === "verified" && !critical && !uncertainContext) status = "verified";
        else status = "uncertain";
      }
      const justification = status === "verified"
        ? `${workout!.id} relie L${limiter!.priority} ${limiter!.metric} au levier #${lever!.priority} ${lever!.label}; intention ${intention!.family}, durée et intensité dans le contrat catalogue.`
        : status === "uncertain"
          ? `Intention/dose partiellement vérifiables, mais ${critical ? "une incompatibilité est détectée" : "la chaîne limiteur–levier–dose ou sa confiance reste incomplète"}.`
          : "Données structurées insuffisantes pour attribuer cette séance sans invention.";

      sessions.push({
        sessionKey,
        weekNumber: session.weekNumber,
        dayName: session.dayName,
        title: session.title,
        catalogId: session.catalogId,
        status,
        limiter,
        lever,
        intention,
        dose,
        justification,
        anomalies: localAnomalies,
      });
      globalAnomalies.push(...localAnomalies);
    }
  }

  const active = sessions.filter(session => session.status !== "not_applicable");
  const topLimiter = input.planConfig.identifiedLimitersRaw?.[0];
  if (topLimiter) {
    const topVerified = active.filter(session => session.limiter?.priority === 1 && session.status === "verified").length;
    const lowerVerified = active.filter(session => (session.limiter?.priority ?? 0) > 1 && session.status === "verified").length;
    if (topVerified === 0 && lowerVerified > 0) {
      globalAnomalies.push({
        code: "priority_not_represented",
        severity: "warning",
        message: `Le limiteur prioritaire ${topLimiter} n'a aucune séance causalement vérifiée, alors que des priorités secondaires en ont ${lowerVerified}.`,
      });
    }
  }

  return {
    version: 1,
    generatedAt: (input.now ?? new Date()).toISOString(),
    sessions,
    anomalies: globalAnomalies,
    summary: {
      activeSessions: active.length,
      verified: active.filter(session => session.status === "verified").length,
      uncertain: active.filter(session => session.status === "uncertain").length,
      notVerified: active.filter(session => session.status === "not_verified").length,
      critical: globalAnomalies.filter(item => item.severity === "critical").length,
      warnings: globalAnomalies.filter(item => item.severity === "warning").length,
    },
    context: {
      diagnosticConfidence,
      strategyConfidence,
      trainingLevel: input.planConfig.ambitionMeta?.trainingLevel ?? null,
      trainingLevelSource: input.planConfig.ambitionMeta?.trainingLevelSource ?? null,
      recentLoadStatus: input.planConfig.recentLoad?.status ?? null,
      constraints: input.planConfig.constraints ? "present_not_structurally_verified" : "missing",
      history: input.planConfig.recentLoad ? "recent_load_only" : "not_verified",
      attributionMeaning: "verified = identité catalogue finale, contrat d'intention, couple limiteur–levier actif et dose structurée concordent; ce statut ne repose jamais sur le prompt seul.",
    },
    limitations: [
      "Une séance custom ou sans métadonnées catalogue reste not_verified.",
      "Les contraintes en texte libre sont signalées mais ne sont pas prétendues vérifiées sans règle structurée dédiée.",
      "La charge récente est prise en compte; l'historique longitudinal complet des séances n'est pas disponible dans ce pipeline.",
      "Le plan final ne conserve pas encore un journal structuré de toutes les substitutions serveur/client; une intention finale contradictoire est détectable, mais l'intention d'origine peut rester inconnue.",
      "Les répétitions, récupérations et volumes sont extraits comme preuves; leur cohérence n'est affirmée que lorsque le contrat catalogue fournit une borne comparable.",
    ],
  };
}
