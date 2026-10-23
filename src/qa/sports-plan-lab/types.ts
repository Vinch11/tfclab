import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";
import type { PhysiologicalIntent, WorkoutPrerequisites } from "@/types/workoutLibrary";

export type CanonicalSport = "swim" | "bike" | "run" | "brick" | "strength" | "recovery" | "rest" | "unknown";
export type FindingSeverity = "critical" | "warning" | "not_verifiable";
export type CoverageStatus = "checked" | "partial" | "not_verifiable";

export interface ReferenceScenario {
  id: string;
  label: string;
  fixtureNotice: "synthetic_non_clinical";
  athleteData: Partial<PlanAthleteData>;
  planConfig: PlanConfig;
  expectations: {
    objectiveFamily: "5k" | "10k" | "half" | "marathon" | "trail" | "tri_sprint" | "tri_olympic" | "70.3" | "ironman";
    requiredSports: CanonicalSport[];
    forbiddenSports?: CanonicalSport[];
    cardioShareRanges?: Partial<Record<"swim" | "bike" | "run", [number, number]>>;
    finalRaceTokens: string[];
    intermediateRaces?: Array<{ family: string; tokens: string[]; expectedWeek: number }>;
    minimumStrengthSessionsPerWeek?: number;
    allowedDayIndexes?: number[];
    allowedSportsByDay?: Partial<Record<number, CanonicalSport[]>>;
    maxWeeklyVolumeIncreasePct?: number;
    approvedAdvancedSessionIds?: string[];
  };
}

export interface NormalizedSession {
  weekNumber: number;
  phase: string;
  dayName: string;
  dayIndex: number | null;
  sport: CanonicalSport;
  title: string;
  details: string;
  durationMin: number | null;
  zones: string[];
  isRest: boolean;
  isKeySession: boolean | null;
  catalogId: string | null;
  finalPhysiologicalIntent: PhysiologicalIntent | null;
}

export interface NormalizedWeek {
  weekNumber: number;
  phase: string;
  theme: string;
  notes: string;
  sessions: NormalizedSession[];
}

export interface NormalizedPlan {
  title: string;
  totalWeeks: number;
  weeks: NormalizedWeek[];
  sourceShape: "direct" | "mergedPlan" | "finalMergedPlan" | "output.mergedPlan" | "output.finalMergedPlan";
}

export interface CatalogEvidence {
  id: string;
  sport: CanonicalSport;
  objective: string;
  physiology: { primary: PhysiologicalIntent; secondary: PhysiologicalIntent[] } | null;
  prerequisites: WorkoutPrerequisites | null;
}

export interface PlanFinding {
  code: string;
  severity: FindingSeverity;
  message: string;
  weekNumber?: number;
  sessionRef?: string;
  evidence?: string;
}

export interface WeeklySummary {
  weekNumber: number;
  phase: string;
  theme: string;
  knownDurationMin: number;
  unknownDurationSessions: number;
  sessions: number;
  keySessions: number | null;
  bySportMin: Partial<Record<CanonicalSport, number>>;
  rawZoneMinutes: Record<string, number>;
  deloadEvidence: "declared" | "volume_drop" | "none" | "not_verifiable";
}

export interface DisciplineSummary {
  sport: CanonicalSport;
  sessions: number;
  knownDurationMin: number;
  unknownDurationSessions: number;
  cardioShare: number | null;
}

export interface ControlCoverage {
  control: string;
  status: CoverageStatus;
  detail: string;
}

export interface SportsPlanQaReport {
  schemaVersion: 1;
  generatedAt: string;
  scenario: { id: string; label: string; objective: string };
  plan: { title: string; totalWeeks: number; sourceShape: NormalizedPlan["sourceShape"] };
  disciplines: DisciplineSummary[];
  weeks: WeeklySummary[];
  findings: PlanFinding[];
  critical: PlanFinding[];
  warnings: PlanFinding[];
  notVerifiable: PlanFinding[];
  coverage: ControlCoverage[];
  limitations: string[];
}

