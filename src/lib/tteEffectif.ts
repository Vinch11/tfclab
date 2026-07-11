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
  tte_min: number;
  source: TTESource;
  confidence: number; // 0 à 1
  label: string;
  target?: number;
  status?: "ok" | "warning" | "critical";
  status_message?: string;
}

interface ComputeTTEEffectifParams {
  ftp?: number | null;
  tss_7d?: number | null;
  tss_7j?: number | null; // Legacy mapping
  tte_mode?: TTEMode | string | null;
  tte_observed_min?: number | null;
  /** TTE CAP observé (séparé du TTE vélo). Utilisé quand sport === "run". */
  tte_observed_min_run?: number | null;
  /** "bike" (défaut) ou "run" — détermine quel champ TTE observé utiliser. */
  sport?: "bike" | "run" | null;
  objectif?: string;
  /** F33: Age en années pour ajuster la cible TTE (masters athletes) */
  age?: number | null;
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

/**
 * Calcule le TTE effectif selon la hiérarchie:
 * A) OBSERVED: TTE mesuré directement (tte_observed_min) → confiance 0.95
 * B) LOAD: Estimé via TSS_7d → confiance 0.7
 * C) FTP-based fallback → confiance 0.5
 * D) Unknown: Aucune donnée → tte_min = 0, confiance 0.2
 *
 * F33: `age` est propagé à `getTTETarget` pour ajustement masters (30+, 40+, 50+).
 */
export function computeTTEEffectif(params: ComputeTTEEffectifParams): TTEEffectif {
  // Normalize tss_7j -> tss_7d (legacy mapping)
  const tss_7d = params.tss_7d ?? params.tss_7j ?? null;
  const { ftp, tte_mode, objectif, age } = params;

  // Sport-aware : on choisit le champ TTE observé pertinent (run vs bike).
  // Si `sport` n'est pas passé, on l'infère (dans l'ordre) :
  //   1. objectif run-only (Marathon/Semi/10K/5K/Trail*/StartToRun) → "run"
  //   2. présence exclusive de tte_observed_min_run (et pas de bike) → "run"
  //   3. défaut historique → "bike"
  // Cela évite qu'un caller "oublié" retombe silencieusement sur bike pour un coureur.
  let sport: "bike" | "run" = params.sport ?? "bike";
  if (params.sport == null) {
    const objLower = (objectif ?? "").toLowerCase();
    const runOnlyObjective =
      /marathon|semi|10\s?k|5\s?k|trail|ultra|start\s?to\s?run|utmb|ccc|occ|skyrun|sky\s?run|vk\s|hardrock|western\s?states/.test(objLower);
    const hasRunOnly = (params.tte_observed_min_run ?? null) != null && (params.tte_observed_min ?? null) == null;
    if (runOnlyObjective || hasRunOnly) sport = "run";
  }
  const observedRaw = sport === "run"
    ? (params.tte_observed_min_run ?? null)
    : (params.tte_observed_min ?? null);


  const target = getTTETargetFromPro(objectif || "", age ?? null);

  // A) OBSERVED - Priorité maximale
  // - bike : on conserve le gating historique (tte_mode === "OBSERVED")
  // - run  : la simple présence de `tte_observed_min_run` suffit (CAPTestSheet
  //          n'écrit pas tte_mode pour ne pas écraser le mode vélo).
  const observedGate = sport === "run"
    ? (observedRaw != null && observedRaw > 0)
    : (tte_mode === "OBSERVED" && observedRaw != null && observedRaw > 0);
  if (observedGate && observedRaw != null) {
    const evaluation = evaluerTTE({ tte_min: observedRaw, tteMin: observedRaw, source: "observed", confidence: 0.95, label: "" }, objectif || "", age ?? null);
    return {
      tte_min: observedRaw,
      source: "observed",
      confidence: 0.95,
      label: `${observedRaw} min (mesuré)`,
      target,
      status: evaluation.status,
      status_message: evaluation.message
    };
  }

  // B) LOAD - Estimation via TSS_7d
  if (tss_7d != null && tss_7d > 0) {
    const tteResult = calculTTE({
      ftp: ftp ?? null,
      tss_7d,
      tte_mode: "LOAD",
      tte_observed_min: null
    });

    // F38: NE PAS faker 45 min si l'estimation LOAD a échoué — fall-through D
    if (tteResult.tteMin != null && tteResult.tteMin > 0) {
      const evaluation = evaluerTTE(tteResult, objectif || "", age ?? null);
      return {
        tte_min: tteResult.tteMin,
        source: "estimated",
        confidence: 0.7,
        label: `~${tteResult.tteMin} min (estimé)`,
        target,
        status: evaluation.status,
        status_message: evaluation.message
      };
    }
  }

  // C) FTP-based fallback
  if (ftp != null && ftp > 0) {
    // Estimation grossière basée sur FTP seul
    // FTP élevé suggère meilleure endurance, mais confiance faible
    const estimatedTTE = Math.min(60, Math.max(35, Math.round(35 + (ftp - 200) * 0.05)));
    const evaluation = evaluerTTE({ tte_min: estimatedTTE, tteMin: estimatedTTE, source: "estimated", confidence: 0.5, label: "" }, objectif || "", age ?? null);
    
    return {
      tte_min: estimatedTTE,
      source: "estimated",
      confidence: 0.5,
      label: `~${estimatedTTE} min (approx.)`,
      target,
      status: evaluation.status,
      status_message: evaluation.message
    };
  }

  // D) Unknown - Aucune donnée exploitable (politique projet : pas de neutre artificiel)
  return {
    tte_min: 0,
    source: "unknown",
    confidence: 0.2,
    label: "— (données manquantes)",
    target,
    status: "warning",
    status_message: "Aucune donnée TTE disponible (ni mesurée, ni TSS 7j, ni FTP)"
  };
}

// =============================================
// HELPERS UI
// =============================================

/**
 * Formate le label TTE pour affichage UI
 */
export function formatTTELabel(result: TTEEffectif): string {
  if (result.source === "unknown") {
    return "—";
  }
  if (result.source === "observed") {
    return `${result.tte_min} min (mesuré)`;
  }
  return `~${result.tte_min} min (estimé)`;
}

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

export function getStatusColor(status: "ok" | "warning" | "critical" | undefined): string {
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
  if (tte.source === "unknown") return "—";
  return `${tte.tte_min} min`;
}

/**
 * Formate le TTE avec une plage adaptative basée sur la confiance
 * Confiance haute → plage étroite, Confiance faible → plage large
 */
export function formatTTEWithRange(tte: TTEEffectif): string {
  if (tte.source === "unknown") return "—";
  
  // TTE mesuré = valeur exacte, pas de plage
  if (tte.source === "observed") {
    return `${tte.tte_min} min`;
  }
  
  // Pour les estimations: marge selon la confiance (précision adaptative)
  let marginMin: number;
  if (tte.confidence >= 0.75) {
    marginMin = 3; // ±3 min
  } else if (tte.confidence >= 0.55) {
    marginMin = 5; // ±5 min
  } else if (tte.confidence >= 0.4) {
    marginMin = 8; // ±8 min
  } else {
    marginMin = 12; // ±12 min
  }
  
  const low = Math.max(20, tte.tte_min - marginMin);
  const high = Math.min(90, tte.tte_min + marginMin);
  
  return `${tte.tte_min} min [${low}–${high}]`;
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

/**
 * Helper pour vérifier si le TTE est disponible/exploitable
 */
export function isTTEAvailable(tte: TTEEffectif): boolean {
  return tte.source !== "unknown" && tte.confidence > 0.2;
}

// =============================================
// CONVERSION VERS SCORE ENVELOPE (Staff-Grade)
// =============================================

import { 
  ScoreEnvelope, 
  ScoreSource, 
  buildTTEEnvelope 
} from "./scoreEnvelope";

/**
 * Convertit un TTEEffectif en ScoreEnvelope universel
 */
export function toTTEEnvelope(
  tte: TTEEffectif, 
  objectif: string
): ScoreEnvelope {
  // Mapper les sources TTE -> ScoreSource
  const sourceMap: Record<TTESource, ScoreSource> = {
    observed: "MEASURED",
    estimated: "ESTIMATED",
    unknown: "UNKNOWN",
  };

  const source = sourceMap[tte.source];
  
  // Générer les détails contextuels
  const why: string[] = [];
  
  if (tte.status_message) {
    why.push(tte.status_message);
  }

  return buildTTEEnvelope(
    tte.tte_min,
    source,
    tte.confidence,
    objectif,
    tte.target,
    { why }
  );
}
