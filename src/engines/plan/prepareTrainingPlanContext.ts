import { resolvePlanningSnapshotLoad } from "@/lib/planningSnapshotLoad";
import { computeDiagnostic, type AthleteDiagnostic, type DiagnosticInput } from "@/engines/diagnostic";
import { computeDecision, type DecisionInput, type TrainingPrescription } from "@/engines/decision";
import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";
import { buildPlanAthleteDataFromDiagnostic, buildPlanConfigFromDiagnostic, type PlanFormConfig } from "./planConfigBuilder";

export type PhysiologicalEvidenceStatus =
  | "calculated"
  | "transmitted"
  | "consumed"
  | "missing"
  | "not_verified";

export interface PhysiologicalTraceItem {
  status: PhysiologicalEvidenceStatus;
  origin: string;
  consumers: string[];
  detail?: string;
}

export interface TrainingPlanPhysiologicalTrace {
  version: 1;
  diagnostic: {
    executed: boolean;
    confidenceGlobal: number | null;
    dataCompleteness: number | null;
    limiters: Array<{
      metric: string;
      priority: number;
      status: string;
      value: number | null;
      target: number | null;
      weightedImpact: number;
    }>;
    uncertainty: string[];
  };
  decision: {
    executed: boolean;
    source: "lorang" | "matrix" | "diagnostic_fallback" | "unavailable";
    calculationIssues?: TrainingPrescription["strategy"]["calculationIssues"];
    confidence: "high" | "moderate" | "low" | "unknown";
    primaryAction: string | null;
    levers: Array<{
      id: string;
      label: string;
      priority: number;
      reason: string;
      adaptations: string[];
    }>;
    prohibitions: Array<{ id: string; label: string; reason: string }>;
    trainingFocus: { do: string[]; avoid: string[] };
    weekType: string | null;
  };
  transmission: {
    identifiedLimitersRaw: PhysiologicalTraceItem;
    activeLevers: PhysiologicalTraceItem;
    prohibitions: PhysiologicalTraceItem;
    strategyContext: PhysiologicalTraceItem;
    prescriptionIntent: PhysiologicalTraceItem;
  };
}

export interface PrepareTrainingPlanContextInput {
  diagnosticInput?: DiagnosticInput;
  diagnostic?: AthleteDiagnostic;
  athleteData?: PlanAthleteData;
  formConfig: PlanFormConfig;
  coachLimiterOrder?: string[];
  decisionContext?: Partial<DecisionInput["context"]>;
  fcMax?: number | null;
}

export interface PreparedTrainingPlanContext {
  diagnostic: AthleteDiagnostic;
  decision: TrainingPrescription;
  athleteData: PlanAthleteData;
  planConfig: PlanConfig;
  trace: TrainingPlanPhysiologicalTrace;
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map(value => value?.trim()).filter((value): value is string => !!value))];
}

function daysToRace(raceDate: string | undefined): number | null {
  if (!raceDate) return null;
  const race = new Date(`${raceDate}T12:00:00`);
  if (Number.isNaN(race.getTime())) return null;
  return Math.max(0, Math.ceil((race.getTime() - Date.now()) / 86_400_000));
}

function buildDecisionInput(
  diagnostic: AthleteDiagnostic,
  formConfig: PlanFormConfig,
  override?: Partial<DecisionInput["context"]>,
): DecisionInput {
  const remainingDays = override?.daysToRace ?? daysToRace(formConfig.raceDate);
  return {
    diagnostic,
    context: {
      daysToRace: remainingDays,
      isRaceWeek: override?.isRaceWeek ?? (remainingDays !== null && remainingDays <= 7),
      currentPhase: override?.currentPhase ?? "base",
    },
    load: {
      tss7d: resolvePlanningSnapshotLoad(diagnostic._rawInput.tss7d, diagnostic._rawInput.snapshotDate).tss7d,
      tss28d: null,
    },
  };
}

function decisionSource(decision: TrainingPrescription): TrainingPlanPhysiologicalTrace["decision"]["source"] {
  if (decision.strategy._lorangResult) return "lorang";
  if (decision.strategy._matrixResult) return "matrix";
  if (decision.strategy.primaryAction) return "diagnostic_fallback";
  return "unavailable";
}

function buildTrace(
  diagnostic: AthleteDiagnostic,
  decision: TrainingPrescription,
  planConfig: PlanConfig,
): TrainingPlanPhysiologicalTrace {
  const rankedGaps = [...diagnostic.limiter.gapAnalysis]
    .filter(gap => gap.weightedImpact > 0)
    .sort((a, b) => b.weightedImpact - a.weightedImpact);
  const uncertainty: string[] = [];
  if (diagnostic.meta.dataCompleteness < 0.75) {
    uncertainty.push(`Données physiologiques incomplètes (${Math.round(diagnostic.meta.dataCompleteness * 100)}%).`);
  }
  if (diagnostic.meta.confidenceGlobal < 0.7) {
    uncertainty.push(`Confiance diagnostique limitée (${Math.round(diagnostic.meta.confidenceGlobal * 100)}%).`);
  }
  if (rankedGaps.length === 0) uncertainty.push("Aucun limiteur classable avec les données disponibles.");

  const strategySource = decisionSource(decision);
  const hasLimiters = (planConfig.identifiedLimitersRaw?.length ?? 0) > 0;
  const hasLevers = (planConfig.activeLevers?.length ?? 0) > 0;
  const hasProhibitions = (planConfig.prohibitions?.length ?? 0) > 0;

  return {
    version: 1,
    diagnostic: {
      executed: true,
      confidenceGlobal: diagnostic.meta.confidenceGlobal ?? null,
      dataCompleteness: diagnostic.meta.dataCompleteness ?? null,
      limiters: rankedGaps.map((gap, index) => ({
        metric: gap.metric,
        priority: index + 1,
        status: gap.status,
        value: gap.value ?? null,
        target: gap.target ?? null,
        weightedImpact: gap.weightedImpact,
      })),
      uncertainty,
    },
    decision: {
      executed: true,
      source: strategySource,
      calculationIssues: [...(decision.strategy.calculationIssues ?? [])],
      confidence: decision.strategy.confidence ?? "unknown",
      primaryAction: decision.strategy.primaryAction || null,
      levers: [...decision.strategy.levers]
        .sort((a, b) => a.priority - b.priority)
        .map(lever => ({
          id: lever.lever,
          label: lever.label,
          priority: lever.priority,
          reason: lever.reason,
          adaptations: [...lever.prescription],
        })),
      prohibitions: decision.strategy.prohibitions.map(rule => ({
        id: rule.prohibition,
        label: rule.label,
        reason: rule.reason,
      })),
      trainingFocus: {
        do: [...(decision.strategy.trainingFocus?.do ?? [])],
        avoid: [...(decision.strategy.trainingFocus?.avoid ?? [])],
      },
      weekType: decision.strategy.weekType ?? null,
    },
    transmission: {
      identifiedLimitersRaw: {
        status: hasLimiters ? "consumed" : "missing",
        origin: "diagnostic.limiter.gapAnalysis",
        consumers: hasLimiters ? ["workoutCatalogBuilder.scoreWorkout", "edge.buildStructuredDiagnosticBlock", "server.reconciler"] : [],
        detail: hasLimiters ? `Ordre transmis: ${planConfig.identifiedLimitersRaw!.join(" > ")}` : undefined,
      },
      activeLevers: {
        status: hasLevers ? "consumed" : "missing",
        origin: decision.strategy.levers.length > 0
          ? "decision.strategy.levers"
          : "diagnostic.limiter.primaryLever/secondaryLever",
        consumers: hasLevers ? ["edge.buildStructuredDiagnosticBlock"] : [],
        detail: "Les leviers guident le modèle dans le prompt; ils ne constituent pas encore un filtre déterministe du catalogue.",
      },
      prohibitions: {
        status: hasProhibitions ? "consumed" : "missing",
        origin: "planConfigBuilder + decision.strategy.prohibitions",
        consumers: hasProhibitions ? ["workoutCatalogBuilder.prohibitions", "edge.buildStructuredDiagnosticBlock"] : [],
      },
      strategyContext: {
        status: strategySource === "unavailable" ? "missing" : "consumed",
        origin: `decision.strategy (${strategySource})`,
        consumers: strategySource === "unavailable" ? [] : ["edge.buildStructuredDiagnosticBlock"],
        detail: "Action, confiance, adaptations et focus sont transmis au générateur; le type de semaine reste une recommandation descriptive.",
      },
      prescriptionIntent: {
        status: "not_verified",
        origin: "plan final généré",
        consumers: [],
        detail: "Le catalogue et le prompt reçoivent le contexte causal, mais aucune preuve locale ne relie encore chaque séance finale à un levier précis.",
      },
    },
  };
}

export function prepareTrainingPlanContext(input: PrepareTrainingPlanContextInput): PreparedTrainingPlanContext {
  if (!input.diagnostic && !input.diagnosticInput) {
    throw new Error("prepareTrainingPlanContext requiert diagnostic ou diagnosticInput");
  }
  const diagnostic = input.diagnostic ?? computeDiagnostic(input.diagnosticInput!);
  const decision = computeDecision(buildDecisionInput(diagnostic, input.formConfig, input.decisionContext));
  const builtConfig = buildPlanConfigFromDiagnostic(diagnostic, input.formConfig, input.coachLimiterOrder);

  const strategicLevers = [...decision.strategy.levers]
    .sort((a, b) => a.priority - b.priority)
    .map(lever => lever.label);
  const strategicProhibitions = decision.strategy.prohibitions.map(rule =>
    `🚫 STRATÉGIE — ${rule.label}: ${rule.reason}. ${rule.explanation}`,
  );
  const planConfig: PlanConfig = {
    ...builtConfig,
    activeLevers: unique(strategicLevers.length > 0 ? strategicLevers : builtConfig.activeLevers ?? []),
    prohibitions: unique([...(builtConfig.prohibitions ?? []), ...strategicProhibitions]),
    strategyContext: {
      source: decisionSource(decision),
      primaryAction: decision.strategy.primaryAction || null,
      confidence: decision.strategy.confidence ?? "unknown",
      levers: [...decision.strategy.levers]
        .sort((a, b) => a.priority - b.priority)
        .map(lever => ({
          id: lever.lever,
          label: lever.label,
          priority: lever.priority,
          reason: lever.reason,
          adaptations: [...lever.prescription],
        })),
      trainingFocus: {
        do: [...(decision.strategy.trainingFocus?.do ?? [])],
        avoid: [...(decision.strategy.trainingFocus?.avoid ?? [])],
      },
      recommendedWeekType: decision.strategy.weekType ?? null,
    },
  };
  const athleteData = input.athleteData
    ? { ...input.athleteData }
    : buildPlanAthleteDataFromDiagnostic(diagnostic);
  if (input.fcMax !== undefined) athleteData.fcMax = input.fcMax;

  const trace = buildTrace(diagnostic, decision, planConfig);
  planConfig.physiologicalTrace = trace;
  return { diagnostic, decision, athleteData, planConfig, trace };
}
