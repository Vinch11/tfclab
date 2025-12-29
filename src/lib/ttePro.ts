// =============================================
// TTE PRO - Time To Exhaustion Calculations
// =============================================

export type TTEMode = "LOAD" | "OBSERVED";

export interface TTEInput {
  ftp: number | null;
  tss_7d: number | null;
  tte_mode: TTEMode | null;
  tte_observed_min: number | null;
}

export interface TTEResult {
  tte_min: number;
  source: "observed" | "estimated";
  confidence: number; // 0-1
  label: string;
}

/**
 * Estimate TTE from weekly training load (TSS 7d)
 * Based on Dan Lorang methodology:
 * - Higher chronic load → better endurance → higher TTE
 * - Baseline ~40min, scales with load
 */
export function estimerTTEFromLoad(tss7d: number): number {
  // Baseline TTE around 40 min
  // Each 100 TSS adds ~2-3 min up to a ceiling
  const baseline = 40;
  const loadFactor = Math.min(tss7d / 100, 8) * 2.5; // Cap at ~60 min
  return Math.round(baseline + loadFactor);
}

/**
 * Calculate TTE with mode selection
 * - OBSERVED: Use direct measurement from test
 * - LOAD: Estimate from TSS 7d
 */
export function calculTTE(input: TTEInput): TTEResult {
  const { ftp, tss_7d, tte_mode, tte_observed_min } = input;

  // If observed mode and we have a value, use it
  if (tte_mode === "OBSERVED" && tte_observed_min != null) {
    return {
      tte_min: tte_observed_min,
      source: "observed",
      confidence: 0.95,
      label: `${tte_observed_min} min (mesuré)`,
    };
  }

  // Estimate from load
  if (tss_7d != null && tss_7d > 0) {
    const estimated = estimerTTEFromLoad(tss_7d);
    return {
      tte_min: estimated,
      source: "estimated",
      confidence: 0.7,
      label: `~${estimated} min (estimé)`,
    };
  }

  // Fallback: estimate from FTP if available
  if (ftp != null && ftp > 0) {
    // Rough heuristic: higher FTP often correlates with better TTE
    const ftpBased = Math.round(35 + (ftp / 300) * 15);
    return {
      tte_min: Math.min(ftpBased, 55),
      source: "estimated",
      confidence: 0.5,
      label: `~${Math.min(ftpBased, 55)} min (approx)`,
    };
  }

  // Default fallback
  return {
    tte_min: 45,
    source: "estimated",
    confidence: 0.3,
    label: "~45 min (défaut)",
  };
}

/**
 * Get TTE target based on objective
 */
export function getTTETarget(objectif: string): number {
  const obj = (objectif || "").toLowerCase();
  if (obj.includes("ironman") || obj.includes("im") || obj.includes("ultra")) {
    return 55;
  }
  if (obj.includes("70.3") || obj.includes("half") || obj.includes("marathon")) {
    return 50;
  }
  if (obj.includes("olympic") || obj.includes("sprint")) {
    return 40;
  }
  return 45; // Default
}

/**
 * Evaluate TTE status relative to goal
 */
export function evaluerTTE(
  tteResult: TTEResult,
  objectif: string
): { status: "ok" | "warning" | "critical"; message: string } {
  const target = getTTETarget(objectif);
  const diff = tteResult.tte_min - target;

  if (diff >= 0) {
    return {
      status: "ok",
      message: `TTE ≥ cible (${target} min) ✓`,
    };
  }

  if (diff >= -5) {
    return {
      status: "warning",
      message: `TTE proche de la cible (-${Math.abs(diff)} min)`,
    };
  }

  return {
    status: "critical",
    message: `TTE insuffisant (-${Math.abs(diff)} min vs cible ${target})`,
  };
}

/**
 * Format TTE for display
 */
export function formatTTE(tte: number | null): string {
  if (tte == null) return "—";
  return `${tte} min`;
}
