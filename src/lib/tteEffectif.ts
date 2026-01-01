// =============================================
// TTE EFFECTIF - Source unique de vérité
// Utilise directement les données Cloud (snapshots)
// =============================================

import { calculTTE, getTTETarget as getTTETargetFromPro, evaluerTTE, TTEMode, TTEResult } from "./ttePro";

// Re-export getTTETarget
export const getTTETarget = getTTETargetFromPro;

// =============================================
// TYPES
// =============================================

export type TTESource = "observed" | "estimated" | "unknown";

export interface TTEEffectif {
  tteMin: number | null;
  source: TTESource;
  confidence: number; // 0 à 1
  label: string;
  target: number;
  status: "ok" | "warning" | "critical";
  statusMessage: string;
}

interface ComputeTTEEffectifParams {
  ftp: number | null;
  tss_7d: number | null;
  tte_mode: TTEMode | string | null;
  tte_observed_min: number | null;
  objectif: string;
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

/**
 * Calcule le TTE effectif selon la hiérarchie:
 * 1) OBSERVED: TTE mesuré directement (tte_observed_min) → confiance 0.95
 * 2) LOAD: Estimé via TSS_7d → confiance 0.7
 * 3) FTP-based fallback → confiance 0.5
 * 4) Unknown: Aucune donnée → tteMin = null
 */
export function computeTTEEffectif(params: ComputeTTEEffectifParams): TTEEffectif {
  const { ftp, tss_7d, tte_mode, tte_observed_min, objectif } = params;

  const target = getTTETargetFromPro(objectif);

  // Check if we have ANY data to compute TTE
  const hasObserved = tte_mode === "OBSERVED" && tte_observed_min != null;
  const hasLoad = tss_7d != null && tss_7d > 0;
  const hasFtp = ftp != null && ftp > 0;

  if (!hasObserved && !hasLoad && !hasFtp) {
    // No data available
    return {
      tteMin: null,
      source: "unknown",
      confidence: 0,
      label: "TTE (non disponible)",
      target,
      status: "critical",
      statusMessage: "Aucune donnée TTE disponible"
    };
  }

  // Compute TTE using existing ttePro logic
  const tteResult = calculTTE({
    ftp,
    tss_7d,
    tte_mode: (tte_mode as TTEMode) || "LOAD",
    tte_observed_min
  });

  // Map source
  const source: TTESource = tteResult.source;

  // Evaluate status against target
  const evaluation = evaluerTTE(tteResult, objectif);

  return {
    tteMin: tteResult.tteMin,
    source,
    confidence: tteResult.confidence,
    label: tteResult.label,
    target,
    status: evaluation.status,
    statusMessage: evaluation.message
  };
}

// =============================================
// HELPERS UI
// =============================================

export function getSourceColor(source: TTESource): string {
  switch (source) {
    case "observed":
      return "text-green-600 dark:text-green-400";
    case "estimated":
      return "text-amber-600 dark:text-amber-400";
    case "unknown":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

export function getSourceBgColor(source: TTESource): string {
  switch (source) {
    case "observed":
      return "bg-green-100 dark:bg-green-900/30";
    case "estimated":
      return "bg-amber-100 dark:bg-amber-900/30";
    case "unknown":
      return "bg-muted";
    default:
      return "bg-muted";
  }
}

export function getStatusColor(status: "ok" | "warning" | "critical"): string {
  switch (status) {
    case "ok":
      return "text-green-600 dark:text-green-400";
    case "warning":
      return "text-amber-600 dark:text-amber-400";
    case "critical":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}

export function formatTTEDisplay(tte: TTEEffectif): string {
  if (tte.tteMin === null) return "—";
  return `${tte.tteMin} min`;
}

export function getSourceLabel(source: TTESource): string {
  switch (source) {
    case "observed":
      return "mesuré";
    case "estimated":
      return "estimé";
    case "unknown":
      return "inconnu";
    default:
      return source;
  }
}
