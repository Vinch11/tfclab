/**
 * Rapport de Performance TFCL™ (structure type INSCYD) — types d'entrée.
 *
 * Le builder HTML est PUR : toute la physiologie est résolue en amont par
 * `computePerformanceReport` (modèle Mader-Heck calibré, moteurs TFCL).
 */

export interface PerfKpi {
  label: string;
  value: string;
  unit: string;
}

export interface PerfGaugeRow {
  label: string;
  unit: string;
  value: number | null;
  display: string;
  scale: [number, number];
  target: [number, number] | null;
  color: string;
  lowerIsBetter?: boolean;
}

export interface PerfCurvePoint {
  power: number;
  intensity: number;
  lactate: number;
  production: number;
  clearance: number;
  fatGh: number;
  carbGh: number;
  aerobicPct: number;
}

export interface PerfZoneRow {
  id: string;
  label: string;
  absolute: string;
  heartRate: string;
  lactate: string;
  substrate: string;
  adaptation: string;
}

export interface PerfScenario {
  label: string;
  detail: string;
  mlss: number;
  deltaW: number;
  tteMin: number | null;
}

export interface PerfLimiter {
  rank: number;
  title: string;
  emoji: string;
  severityLabel: string;
  impact: number;
  fieldFeeling: string;
  mechanism: string;
}

export interface PerfStrength {
  title: string;
  emoji: string;
  detail: string;
}

export interface PerfBlock {
  phase: string;
  weeksRange: string;
  focus: string;
  keySession: string;
}

export interface PerfTargetRow {
  marker: string;
  current: string;
  target: string;
  horizon: string;
}

export interface PerformanceReportInput {
  /** Identité */
  athleteName: string;
  identity: Array<{ label: string; value: string }>;
  generatedAt: string;
  snapshotDate: string | null;
  logoBase64: string | null;

  /** Vue d'ensemble */
  kpis: PerfKpi[];
  gauges: PerfGaugeRow[];
  overview: string;
  consequence: string;

  /** Physiologie résolue */
  physio: {
    vo2max: number | null;
    vlamax: number | null;
    mlssW: number | null;
    mlssWkg: number | null;
    mlssPctVo2: number | null;
    vo2W: number | null;
    fatMaxW: number | null;
    fatMaxG: number | null;
    carbMaxGH: number | null;
    carbMaxW: number | null;
    tteMin: number | null;
    lt1W: number | null;
    lt2W: number | null;
    weightKg: number | null;
    ftp: number | null;
    vma: number | null;
    economy: number | null;
    fcMax: number | null;
    fcRest: number | null;
    fcThreshold: number | null;
    raceCarbNeedGH: number | null;
    /** Réserve totale de glycogène (muscle + foie) — cf. getGlycogenStore(). */
    glycogenStoreG: number | null;
    glycogenStoreKcal: number | null;
  };

  /** Tables & courbes */
  parameterRows: Array<{
    name: string;
    detail: string;
    verdict: string;
    meaning: string;
    pill: { label: string; tone: "ok" | "mid" | "bad" | "na" };
  }>;
  curve: PerfCurvePoint[];
  zones: PerfZoneRow[];
  zoneSourceLabel: string;
  fueling: Array<[string, string, string, string]>;
  scenarios: PerfScenario[];
  strengths: PerfStrength[];
  limiters: PerfLimiter[];
  blockStructure: PerfBlock[];
  actions: Array<{ title: string; body: string }>;
  controls: string[];
  targets: PerfTargetRow[];
  missingNote: string | null;
}
