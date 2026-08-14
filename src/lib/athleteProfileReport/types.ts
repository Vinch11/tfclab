/**
 * Rapport Profil Athlète — types d'entrée du builder HTML.
 *
 * Le builder est PUR : il ne calcule aucune physiologie, il met en page des
 * données déjà résolues par les moteurs (diagnostic, limiteurs, zones, roadmap).
 */

export type MetricStatus = "ok" | "warn" | "bad" | "missing";

export interface ReportMetric {
  key: string;
  label: string;
  /** null / 0 ⇒ "Données insuffisantes" (politique TFCL : jamais de valeur inventée). */
  value: number | null;
  unit: string;
  decimals?: number;
  /** Bornes de l'échelle de la jauge. */
  scale?: [number, number];
  /** Zone cible affichée en vert sur la jauge. */
  target?: [number, number];
  status: MetricStatus;
  /** Une phrase : ce que ça veut dire concrètement. */
  meaning: string;
  /** Origine de la donnée (mesurée, estimée, records…). */
  source?: string | null;
  /** 0–1 */
  confidence?: number | null;
}

export interface ReportRadarAxis {
  label: string;
  shortLabel: string;
  score: number; // 0-100
  value: number | null;
  target: number | null;
  unit: string;
}

export interface ReportLimiter {
  rank: number;
  title: string;
  emoji: string;
  severityLabel: string;
  /** 0-100 — poids relatif du limiteur. */
  impact: number;
  /** Ce que tu ressens sur le terrain. */
  fieldFeeling: string;
  /** Le mécanisme physiologique vulgarisé. */
  mechanism: string;
  /** Métriques qui ont conduit au diagnostic. */
  evidence: string[];
}

export interface ReportLever {
  title: string;
  emoji: string;
  description: string;
  adaptations: string[];
  workouts: string[];
  priority: number;
}

export interface ReportZoneRow {
  id: string;
  label: string;
  condition: string;
  pctRef: string;
  refLabel: string;
  absolute: string | null;
  heartRate: string | null;
}

export interface ReportZoneSet {
  sportLabel: string;
  source: "derived" | "standard";
  confidence: number;
  anchors: string[];
  fallbackReason: string | null;
  zones: ReportZoneRow[];
}

export interface ReportPhase {
  id: number;
  name: string;
  subtitle: string;
  startWeek: number;
  endWeek: number;
  color: string;
  focus: string;
  levers: string[];
  targets: string[];
}

export interface ReportRoadmap {
  title: string;
  totalWeeks: number;
  phases: ReportPhase[];
  limiterSummary: string;
  personalized: boolean;
}

export interface ReportTargetProgress {
  label: string;
  current: number | null;
  target: number | null;
  unit: string;
  decimals?: number;
  /** 0-100 */
  progress: number | null;
  reached: boolean;
}

export interface AthleteProfileReportInput {
  athleteName: string;
  objectifLabel: string;
  ambitionLabel: string;
  age: number | null;
  generatedAt: string;
  snapshotDate: string | null;
  dataCompleteness: number; // 0-100

  readiness: {
    score: number;
    label: string;
    confidence: number;
    message: string;
  };

  profileNarrative: string;
  metrics: ReportMetric[];
  radar: ReportRadarAxis[];
  economyAxis: ReportRadarAxis | null;
  targetProgress: ReportTargetProgress[];

  limiters: ReportLimiter[];
  levers: ReportLever[];
  decision: {
    block: string;
    durationWeeks: number;
    workouts: string[];
    physiologicalTargets: string[];
    prohibitions: string[];
    athleteMessage: string;
  } | null;

  zoneSets: ReportZoneSet[];
  roadmap: ReportRoadmap | null;
  nextSteps: string[];
  glossary: Array<{ term: string; definition: string }>;
  logoBase64?: string | null;
}
