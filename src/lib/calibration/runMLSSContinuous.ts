/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUN MLSS CONTINUOUS CALIBRATION ENGINE — TFCL™
 *
 * Détection automatique des dérives sur le diagnostic Run MLSS (Modèle C),
 * via une fenêtre glissante de 42 jours sur les traces persistées dans
 * `calibration_evidence` (evidence_type = "RUN_MLSS_MODEL_C_TRACE").
 *
 * 3 AXES DE DÉRIVE SURVEILLÉS :
 *   1. effectivePct (MLSS observé/prédit, % VO2max)
 *   2. vlamaxRun  (mmol/L/s)
 *   3. runningEconomy / CE (ml O2/kg/km)
 *
 * MÉTHODE :
 *   - Régression linéaire simple (slope par jour) pondérée par confiance
 *   - Comparaison first-half vs second-half (split temporel à mi-fenêtre)
 *   - Coefficient de variation (CV) intra-fenêtre pour bruit
 *
 * COHÉRENCE AVEC L'EXISTANT :
 *   - Mêmes constantes que VLamax (window 42j, lock 4 sem.)
 *   - Trace pure, n'altère AUCUN calcul ; alimente alertes coach uniquement
 *   - Aligné avec mem://logic/continuous-calibration-alert-triggers
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { RunMLSSTracePayload } from "@/lib/v2/runMLSSTracePersistence";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const RUN_MLSS_CALIBRATION_WINDOW_DAYS = 42;
export const RUN_MLSS_MIN_TRACES_FOR_DRIFT = 4;   // sous ce seuil → pas d'analyse
export const RUN_MLSS_MIN_DAYS_SPAN = 14;         // span temporel minimum (jours)

// Seuils de dérive par métrique (sur la durée totale de la fenêtre)
export const DRIFT_THRESHOLDS = {
  effectivePct: {
    info: 1.5,      // ±1.5 pts %VO2max
    warning: 2.5,   // ±2.5 pts → coach alerté
    critical: 4.0,  // ±4 pts → recalibration recommandée
  },
  vlamaxRun: {
    info: 0.03,     // ±0.03 mmol/L/s
    warning: 0.05,  // ≈ 1 SD intra-individuelle typique
    critical: 0.08, // ≈ changement structurel
  },
  runningEconomy: {
    info: 3,        // ±3 ml O2/kg/km
    warning: 5,
    critical: 8,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type DriftMetric = "effectivePct" | "vlamaxRun" | "runningEconomy";
export type DriftSeverity = "none" | "info" | "warning" | "critical";
export type DriftDirection = "rising" | "falling" | "stable";

export interface RunMLSSTraceLike {
  id: string;
  date: string;
  payload: RunMLSSTracePayload;
}

export interface MetricDrift {
  metric: DriftMetric;
  label: string;
  unit: string;
  /** Nombre de points exploitables pour cette métrique */
  n: number;
  /** Première et dernière valeur observées (ordre chronologique) */
  firstValue: number | null;
  lastValue: number | null;
  /** Moyenne first-half / second-half */
  firstHalfMean: number | null;
  secondHalfMean: number | null;
  /** Delta absolu sur la fenêtre (slope × span) */
  deltaOverWindow: number | null;
  /** Pente normalisée par jour */
  slopePerDay: number | null;
  /** Coefficient de variation (σ/μ) — bruit relatif */
  cv: number | null;
  /** Direction physiologique */
  direction: DriftDirection;
  severity: DriftSeverity;
  message: string;
}

export interface RunMLSSDriftReport {
  windowDays: number;
  windowStart: string;
  windowEnd: string;
  tracesCount: number;
  daysSpan: number;
  /** Sources observées dans la fenêtre (mix observed/predicted) */
  sourceMix: {
    observed: number;
    predicted: number;
  };
  /** Statut global = max severity des 3 métriques */
  globalSeverity: DriftSeverity;
  /** Recalibration recommandée (≥ warning sur ≥1 axe critique) */
  recalibrationRecommended: boolean;
  recalibrationReason: string | null;
  metrics: {
    effectivePct: MetricDrift;
    vlamaxRun: MetricDrift;
    runningEconomy: MetricDrift;
  };
  notes: string[];
  /** True si trop peu de données → rapport non fiable */
  insufficientData: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

interface Point {
  x: number; // days since window start
  y: number; // metric value
  w: number; // weight (confidence)
}

/** Régression linéaire pondérée — retourne slope (par unité de x) ou null */
function weightedLinearSlope(points: Point[]): number | null {
  if (points.length < 2) return null;
  const totalW = points.reduce((s, p) => s + p.w, 0);
  if (totalW <= 0) return null;
  const meanX = points.reduce((s, p) => s + p.w * p.x, 0) / totalW;
  const meanY = points.reduce((s, p) => s + p.w * p.y, 0) / totalW;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += p.w * (p.x - meanX) * (p.y - meanY);
    den += p.w * (p.x - meanX) * (p.x - meanX);
  }
  if (den === 0) return null;
  return num / den;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values)!;
  const v = values.reduce((s, x) => s + (x - m) ** 2, 0) / values.length;
  return Math.sqrt(v);
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs((a.getTime() - b.getTime()) / 86400000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

interface ExtractedSeries {
  points: Point[];
  ordered: Array<{ date: Date; value: number; w: number }>;
}

function extractSeries(
  traces: RunMLSSTraceLike[],
  windowStart: Date,
  picker: (p: RunMLSSTracePayload) => number | null,
): ExtractedSeries {
  const ordered = traces
    .map((t) => {
      const v = picker(t.payload);
      if (v == null || !Number.isFinite(v)) return null;
      const date = new Date(t.date);
      // Confidence comme poids ; fallback 0.5 si absent
      const conf =
        t.payload.predictionConfidence ??
        (t.payload.effectiveSource === "observed" ? 0.9 : 0.6);
      return { date, value: v, w: Math.max(0.2, Math.min(1, conf)) };
    })
    .filter((x): x is { date: Date; value: number; w: number } => x !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const points: Point[] = ordered.map((o) => ({
    x: daysBetween(o.date, windowStart),
    y: o.value,
    w: o.w,
  }));
  return { points, ordered };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRIFT DETECTION (single metric)
// ═══════════════════════════════════════════════════════════════════════════════

function classifySeverity(
  absDelta: number,
  thresholds: { info: number; warning: number; critical: number },
): DriftSeverity {
  if (absDelta >= thresholds.critical) return "critical";
  if (absDelta >= thresholds.warning) return "warning";
  if (absDelta >= thresholds.info) return "info";
  return "none";
}

function buildDriftMessage(
  label: string,
  unit: string,
  delta: number | null,
  severity: DriftSeverity,
  direction: DriftDirection,
): string {
  if (delta == null) return `${label} : données insuffisantes`;
  const sign = delta > 0 ? "+" : "";
  const arrow = direction === "rising" ? "↗" : direction === "falling" ? "↘" : "→";
  switch (severity) {
    case "critical":
      return `${arrow} ${label} dérive critique (${sign}${delta.toFixed(2)} ${unit}) — recalibration recommandée`;
    case "warning":
      return `${arrow} ${label} dérive notable (${sign}${delta.toFixed(2)} ${unit}) — re-tester sous 7-14 j`;
    case "info":
      return `${arrow} ${label} évolution mineure (${sign}${delta.toFixed(2)} ${unit})`;
    default:
      return `${arrow} ${label} stable (${sign}${delta.toFixed(2)} ${unit})`;
  }
}

function analyzeMetric(
  metric: DriftMetric,
  label: string,
  unit: string,
  series: ExtractedSeries,
  spanDays: number,
  thresholds: { info: number; warning: number; critical: number },
): MetricDrift {
  const n = series.ordered.length;
  if (n < 2 || spanDays < RUN_MLSS_MIN_DAYS_SPAN) {
    return {
      metric,
      label,
      unit,
      n,
      firstValue: series.ordered[0]?.value ?? null,
      lastValue: series.ordered[n - 1]?.value ?? null,
      firstHalfMean: null,
      secondHalfMean: null,
      deltaOverWindow: null,
      slopePerDay: null,
      cv: null,
      direction: "stable",
      severity: "none",
      message: `${label} : données insuffisantes (n=${n}, span ${spanDays.toFixed(0)} j)`,
    };
  }

  const slope = weightedLinearSlope(series.points); // unité / jour
  const deltaOverWindow = slope != null ? slope * spanDays : null;

  const half = Math.floor(n / 2);
  const firstHalf = series.ordered.slice(0, half).map((o) => o.value);
  const secondHalf = series.ordered.slice(n - half).map((o) => o.value);
  const fhm = mean(firstHalf);
  const shm = mean(secondHalf);

  const all = series.ordered.map((o) => o.value);
  const m = mean(all)!;
  const sd = stdDev(all) ?? 0;
  const cv = m !== 0 ? sd / Math.abs(m) : null;

  // Critère combiné : on prend max entre |slope×span| et |Δhalves|
  const halfDelta = fhm != null && shm != null ? shm - fhm : null;
  const candidates = [deltaOverWindow, halfDelta].filter(
    (x): x is number => x != null,
  );
  const refDelta =
    candidates.length > 0
      ? candidates.reduce((acc, x) =>
          Math.abs(x) > Math.abs(acc) ? x : acc,
        )
      : null;

  const direction: DriftDirection =
    refDelta == null || Math.abs(refDelta) < thresholds.info * 0.5
      ? "stable"
      : refDelta > 0
      ? "rising"
      : "falling";

  const severity =
    refDelta == null ? "none" : classifySeverity(Math.abs(refDelta), thresholds);

  return {
    metric,
    label,
    unit,
    n,
    firstValue: series.ordered[0].value,
    lastValue: series.ordered[n - 1].value,
    firstHalfMean: fhm,
    secondHalfMean: shm,
    deltaOverWindow: refDelta,
    slopePerDay: slope,
    cv,
    direction,
    severity,
    message: buildDriftMessage(label, unit, refDelta, severity, direction),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function maxSeverity(...sevs: DriftSeverity[]): DriftSeverity {
  const order: DriftSeverity[] = ["none", "info", "warning", "critical"];
  return sevs.reduce(
    (acc, s) => (order.indexOf(s) > order.indexOf(acc) ? s : acc),
    "none" as DriftSeverity,
  );
}

/**
 * Analyse les traces Run MLSS sur la fenêtre 42j et produit un rapport de dérive.
 *
 * @param traces Traces RUN_MLSS_MODEL_C_TRACE chargées (typiquement via loadRunMLSSTraces)
 * @param referenceDate Date de référence (par défaut : maintenant)
 */
export function analyzeRunMLSSDrift(
  traces: RunMLSSTraceLike[],
  referenceDate: Date = new Date(),
): RunMLSSDriftReport {
  const windowEnd = new Date(referenceDate);
  const windowStart = new Date(referenceDate);
  windowStart.setDate(windowStart.getDate() - RUN_MLSS_CALIBRATION_WINDOW_DAYS);

  // Filtrer fenêtre
  const inWindow = traces
    .filter((t) => {
      const d = new Date(t.date);
      return d >= windowStart && d <= windowEnd;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const sourceMix = {
    observed: inWindow.filter((t) => t.payload.effectiveSource === "observed").length,
    predicted: inWindow.filter((t) => t.payload.effectiveSource === "predicted").length,
  };

  const notes: string[] = [];
  const insufficientData = inWindow.length < RUN_MLSS_MIN_TRACES_FOR_DRIFT;

  // Span effectif des données
  const firstDate = inWindow[0]?.date ? new Date(inWindow[0].date) : null;
  const lastDate = inWindow.length
    ? new Date(inWindow[inWindow.length - 1].date)
    : null;
  const spanDays = firstDate && lastDate ? daysBetween(lastDate, firstDate) : 0;

  if (insufficientData) {
    notes.push(
      `Trop peu de traces sur la fenêtre 42 j (n=${inWindow.length}, min ${RUN_MLSS_MIN_TRACES_FOR_DRIFT}) — analyse non fiable`,
    );
  }
  if (!insufficientData && spanDays < RUN_MLSS_MIN_DAYS_SPAN) {
    notes.push(
      `Span temporel limité (${spanDays.toFixed(0)} j) — élargir la fenêtre d'observation`,
    );
  }
  if (sourceMix.observed > 0 && sourceMix.predicted > 0) {
    notes.push(
      `Mix observé/prédit (${sourceMix.observed}/${sourceMix.predicted}) — la dérive peut refléter un changement de source plutôt qu'une évolution physiologique réelle`,
    );
  }

  // Extraire 3 séries
  const sEffective = extractSeries(inWindow, windowStart, (p) => p.effectivePct);
  const sVla = extractSeries(inWindow, windowStart, (p) => p.inputs?.vlamaxRun ?? null);
  const sCe = extractSeries(inWindow, windowStart, (p) => p.inputs?.runningEconomy ?? null);

  const driftEffective = analyzeMetric(
    "effectivePct",
    "MLSS effectif",
    "%VO2max",
    sEffective,
    spanDays,
    DRIFT_THRESHOLDS.effectivePct,
  );
  const driftVla = analyzeMetric(
    "vlamaxRun",
    "VLamax run",
    "mmol/L/s",
    sVla,
    spanDays,
    DRIFT_THRESHOLDS.vlamaxRun,
  );
  const driftCe = analyzeMetric(
    "runningEconomy",
    "Économie de course (CE)",
    "mlO₂/kg/km",
    sCe,
    spanDays,
    DRIFT_THRESHOLDS.runningEconomy,
  );

  const globalSeverity = insufficientData
    ? "none"
    : maxSeverity(driftEffective.severity, driftVla.severity, driftCe.severity);

  // Recalibration recommandée :
  //  - critical sur ≥1 axe, OU
  //  - warning sur ≥2 axes simultanés, OU
  //  - warning sur effectivePct (axe central)
  const warningCount = [driftEffective, driftVla, driftCe].filter(
    (m) => m.severity === "warning" || m.severity === "critical",
  ).length;

  let recalibrationRecommended = false;
  let recalibrationReason: string | null = null;

  if (!insufficientData) {
    if (globalSeverity === "critical") {
      recalibrationRecommended = true;
      const critMetric = [driftEffective, driftVla, driftCe].find(
        (m) => m.severity === "critical",
      );
      recalibrationReason = critMetric?.message ?? "Dérive critique détectée";
    } else if (warningCount >= 2) {
      recalibrationRecommended = true;
      recalibrationReason = `Dérives convergentes sur ${warningCount} métriques — re-tester pace seuil + VLamax`;
    } else if (driftEffective.severity === "warning") {
      recalibrationRecommended = true;
      recalibrationReason = driftEffective.message;
    }
  }

  return {
    windowDays: RUN_MLSS_CALIBRATION_WINDOW_DAYS,
    windowStart: windowStart.toISOString().split("T")[0],
    windowEnd: windowEnd.toISOString().split("T")[0],
    tracesCount: inWindow.length,
    daysSpan: Math.round(spanDays),
    sourceMix,
    globalSeverity,
    recalibrationRecommended,
    recalibrationReason,
    metrics: {
      effectivePct: driftEffective,
      vlamaxRun: driftVla,
      runningEconomy: driftCe,
    },
    notes,
    insufficientData,
  };
}
