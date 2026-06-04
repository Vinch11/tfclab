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
  tteMin: number; // camelCase alias for UI
  source: "observed" | "estimated";
  confidence: number; // 0-1
  label: string;
}

/**
 * Estimate TTE from weekly training load (TSS 7d)
 * Based on Two For Coaching Lab™ methodology:
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
      tteMin: tte_observed_min,
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
      tteMin: estimated,
      source: "estimated",
      confidence: 0.7,
      label: `~${estimated} min (estimé)`,
    };
  }

  // Fallback: estimate from FTP if available
  if (ftp != null && ftp > 0) {
    // Rough heuristic: higher FTP often correlates with better TTE
    const ftpBased = Math.round(35 + (ftp / 300) * 15);
    const capped = Math.min(ftpBased, 55);
    return {
      tte_min: capped,
      tteMin: capped,
      source: "estimated",
      confidence: 0.5,
      label: `~${capped} min (approx)`,
    };
  }

  // Default fallback
  return {
    tte_min: 45,
    tteMin: 45,
    source: "estimated",
    confidence: 0.3,
    label: "~45 min (défaut)",
  };
}

/**
 * Get TTE target based on objective.
 *
 * R4 : délègue à `getTTETargetByAmbition` (source unique = physiologicalTargets.ts).
 * R5 : ajustement d'âge propagé via la matrice canonique.
 *
 * Signature legacy conservée : si `ambition` n'est pas fourni, on prend "age_group"
 * pour rester aligné avec les baselines historiques (45–55 min selon objectif).
 */
export function getTTETarget(
  objectif: string,
  age?: number | null,
  ambition: import("@/types/ambitionLevel").AmbitionLevel = "age_group",
): number {
  return getTTETargetByAmbition(objectif, ambition, age ?? null);
}


/**
 * Evaluate TTE status relative to goal
 */
export function evaluerTTE(
  tteResult: TTEResult,
  objectif: string,
  age?: number | null
): { status: "ok" | "warning" | "critical"; message: string } {
  const target = getTTETarget(objectif, age ?? null);
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

// =============================================
// computeTTEPro - Wrapper with camelCase interface
// Used by UI components
// =============================================

export interface TTEProInput {
  ftp: number | null;
  tss7d: number | null;
  tteObservedMin: number | null;
  mode: TTEMode | null;
}

/**
 * Compute TTE Pro - main entry point for UI
 */
export function computeTTEPro(input: TTEProInput): TTEResult {
  return calculTTE({
    ftp: input.ftp,
    tss_7d: input.tss7d,
    tte_mode: input.mode,
    tte_observed_min: input.tteObservedMin,
  });
}
