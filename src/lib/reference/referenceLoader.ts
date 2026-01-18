/**
 * TFCL Reference Loader - Chargement des datasets
 * Two For Coaching Lab Method™
 */

import cyclingReference from "@/data/tfcl_reference/cycling_reference.json";
import triathlonReference from "@/data/tfcl_reference/triathlon_reference.json";
import runningReference from "@/data/tfcl_reference/running_reference.json";

import { 
  ReferenceDataset, 
  ReferenceStats, 
  buildReferenceStats,
  ClusterStats,
  findBestMatchingCluster,
  getClusterLabel,
} from "./referenceStats";

import {
  CalibrationEnvelope,
  computeCalibrationEnvelope,
} from "./referenceCalibration";

import {
  buildClusterSelectionEnvelope,
  ClusterSelectionEnvelope,
  ClusterSelectorInput,
  SportReference,
} from "./clusterSelector";

// =============================================
// TYPES
// =============================================

export type SportType = "cycling" | "triathlon" | "running";

export interface TFCLReferenceSystem {
  cycling: ReferenceStats;
  triathlon: ReferenceStats;
  running: ReferenceStats;
}

export interface AutoCalibratedVLamax {
  calibration: CalibrationEnvelope;
  clusterSelection: ClusterSelectionEnvelope;
}

// =============================================
// LOADER
// =============================================

let _cachedStats: TFCLReferenceSystem | null = null;

/**
 * Charge et met en cache les statistiques de tous les datasets
 */
export function loadAllReferenceStats(): TFCLReferenceSystem {
  if (_cachedStats) return _cachedStats;
  
  _cachedStats = {
    cycling: buildReferenceStats(cyclingReference as ReferenceDataset),
    triathlon: buildReferenceStats(triathlonReference as ReferenceDataset),
    running: buildReferenceStats(runningReference as ReferenceDataset),
  };
  
  return _cachedStats;
}

/**
 * Récupère les stats pour un sport spécifique
 */
export function getReferenceStats(sport: SportType): ReferenceStats {
  const all = loadAllReferenceStats();
  return all[sport];
}

// =============================================
// CLUSTER MATCHING (LEGACY - kept for compatibility)
// =============================================

/**
 * Mapping objectif → cluster suggéré
 * @deprecated Use autoSelectClusterAndCalibrate instead
 */
export const OBJECTIVE_TO_CLUSTER: Record<string, { sport: SportType; type: string }> = {
  // Triathlon
  "IM": { sport: "triathlon", type: "AG_Perf_Long" },
  "703": { sport: "triathlon", type: "AG_Perf_Long" },
  "OD": { sport: "triathlon", type: "AG_Sprint" },
  "Sprint": { sport: "triathlon", type: "AG_Sprint" },
  
  // Running
  "Marathon": { sport: "running", type: "Sub330_Marathon" },
  "Semi": { sport: "running", type: "Sub330_Marathon" },
  "10K": { sport: "running", type: "Elite_5K10K" },
  "Trail": { sport: "running", type: "Ultra_Trail" },
  "Ultra": { sport: "running", type: "Ultra_Trail" },
  
  // Cycling
  "CLM": { sport: "cycling", type: "Amateur_Perf" },
  "Gravel": { sport: "cycling", type: "Amateur_Perf" },
  "Route": { sport: "cycling", type: "Amateur_Perf" },
};

/**
 * Détermine le cluster approprié en fonction de l'objectif et du niveau
 * @deprecated Use autoSelectClusterAndCalibrate instead
 */
export function suggestCluster(
  objectif: string,
  sport?: SportType,
  sex?: "H" | "F"
): ClusterStats | null {
  const mapping = OBJECTIVE_TO_CLUSTER[objectif];
  
  if (mapping) {
    const stats = getReferenceStats(mapping.sport);
    return findBestMatchingCluster(stats, mapping.type, sex);
  }
  
  // Fallback sur le sport si fourni
  if (sport) {
    const stats = getReferenceStats(sport);
    // Prendre le cluster le plus générique
    const fallbackType = sport === "triathlon" ? "AG_Perf_Long" 
      : sport === "running" ? "Sub330_Marathon" 
      : "Amateur_Perf";
    return findBestMatchingCluster(stats, fallbackType, sex);
  }
  
  return null;
}

// =============================================
// AUTO CLUSTER SELECTION V2
// =============================================

/**
 * Sélection automatique du cluster et calibration VLamax
 * NOUVELLE API RECOMMANDÉE
 */
export function autoSelectClusterAndCalibrate(
  value: number,
  input: ClusterSelectorInput
): AutoCalibratedVLamax | null {
  // 1. Build cluster selection envelope
  const clusterSelection = buildClusterSelectionEnvelope(input);
  
  // 2. Get reference stats for the selected sport
  const stats = getReferenceStats(clusterSelection.sportRef as SportType);
  
  // 3. Find the cluster stats
  const clusterStats = findBestMatchingCluster(
    stats, 
    clusterSelection.clusterId, 
    input.sex
  );
  
  if (!clusterStats) {
    return null;
  }
  
  // 4. Compute calibration envelope
  const calibration = computeCalibrationEnvelope(
    value,
    clusterSelection.sportRef,
    clusterStats,
    clusterSelection.clusterLabel
  );
  
  // 5. Adjust calibration confidence based on cluster selection confidence
  const adjustedCalibration: CalibrationEnvelope = {
    ...calibration,
    confidence_adjustment: calibration.confidence_adjustment * clusterSelection.confidence,
  };
  
  // 6. Add cluster selection warnings to calibration
  if (clusterSelection.confidence < 0.6) {
    adjustedCalibration.warnings = [
      ...adjustedCalibration.warnings,
      "Référentiel approximatif — interprétation prudente requise",
    ];
  }
  
  return {
    calibration: adjustedCalibration,
    clusterSelection,
  };
}

// =============================================
// LEGACY CALIBRATION (kept for compatibility)
// =============================================

/**
 * Calibre une valeur VLamax avec le référentiel approprié
 * @deprecated Use autoSelectClusterAndCalibrate for full auto-selection
 */
export function calibrateVLamax(
  value: number,
  objectif: string,
  sex?: "H" | "F",
  forceSport?: SportType
): CalibrationEnvelope | null {
  // Use new auto-selection system
  const result = autoSelectClusterAndCalibrate(value, {
    objectif,
    sex,
    sportFocus: forceSport === "cycling" ? "bike" : forceSport === "running" ? "run" : undefined,
  });
  
  return result?.calibration || null;
}

/**
 * Calibre une valeur VLamax avec contexte complet (VO2max, etc.)
 * NOUVELLE API RECOMMANDÉE
 */
export function calibrateVLamaxWithContext(
  value: number,
  objectif: string,
  options: {
    sex?: "H" | "F";
    vo2max?: number;
    sportFocus?: "bike" | "run" | "swim" | "all";
    forceCluster?: string;
  }
): AutoCalibratedVLamax | null {
  return autoSelectClusterAndCalibrate(value, {
    objectif,
    sex: options.sex,
    vo2max: options.vo2max,
    vlamax: value,
    sportFocus: options.sportFocus,
    forceCluster: options.forceCluster,
  });
}

// =============================================
// ACADEMY CONTENT
// =============================================

export const ACADEMY_REFERENCE_MODULE = {
  id: "reference-tfcl",
  title: "Référentiel TFCL — Profils observés",
  description: "Comprendre et utiliser le référentiel interne Two For Coaching Lab",
  sections: [
    {
      title: "Qu'est-ce qu'un référentiel ?",
      content: `
Un référentiel est un ensemble de données observées permettant de **contextualiser** les valeurs individuelles.

Le référentiel TFCL compile des profils métaboliques de cyclistes, triathlètes et coureurs de différents niveaux.

**Ce qu'il est :**
- Un repère comparatif
- Un outil de validation
- Une aide à l'interprétation

**Ce qu'il n'est pas :**
- Une norme médicale
- Un objectif à atteindre
- Une mesure de performance
      `.trim(),
    },
    {
      title: "Différences par sport",
      content: `
**Cyclisme**
- Large spectre : loisir → élite → piste
- VLamax très variable (0.26 à 0.88)
- Influence forte de la spécialité

**Triathlon**
- Profils plus homogènes sur longue distance
- VLamax généralement basse (0.24 à 0.45 pour LD)
- Sprint/OD : VLamax plus haute acceptable

**Course à pied**
- Marathon : VLamax très basse (0.19 à 0.38)
- Trail : profil ultra-aérobie privilégié
- 5K/10K : VLamax plus élevée acceptable
      `.trim(),
    },
    {
      title: "Lecture des percentiles",
      content: `
**P10-P25** : Valeurs basses dans le cluster
**P25-P75** : Plage centrale (50% des profils)
**P75-P90** : Valeurs hautes dans le cluster

**Interprétation :**
- IN_RANGE (P25-P75) → Valeur cohérente
- EDGE (P10-P25 ou P75-P90) → Limite, vérifier
- OUTLIER (<P10 ou >P90) → Inhabituel, investiguer
      `.trim(),
    },
    {
      title: "Avertissement",
      content: `
⚠️ **Référentiel = repère comparatif, pas objectif à atteindre.**

Le référentiel TFCL :
- Ne remplace pas un test laboratoire
- Doit être utilisé avec discernement
- Nécessite une interprétation coach

Une valeur "hors norme" n'est pas nécessairement problématique si elle correspond au profil et aux objectifs de l'athlète.
      `.trim(),
    },
  ],
};

// =============================================
// PDF EXPORT CONTENT
// =============================================

export interface VLamaxPDFSection {
  value: number;
  source: string;
  confidence: number;
  calibration: CalibrationEnvelope | null;
  clusterSelection?: ClusterSelectionEnvelope;
  text: string;
}

/**
 * Génère la section VLamax pour le PDF staff
 * Version améliorée avec Auto Cluster Selection
 */
export function generateVLamaxPDFSection(
  value: number,
  source: string,
  confidence: number,
  objectif: string,
  options?: {
    sex?: "H" | "F";
    vo2max?: number;
  }
): VLamaxPDFSection {
  const result = autoSelectClusterAndCalibrate(value, {
    objectif,
    sex: options?.sex,
    vo2max: options?.vo2max,
    vlamax: value,
  });
  
  let text: string;
  
  if (result) {
    const { calibration, clusterSelection } = result;
    
    text = `VLamax estimée : ${value.toFixed(2)} mmol/L/s (confiance ${(confidence * 100).toFixed(0)}%).

Référentiel utilisé : ${clusterSelection.clusterLabel} (confiance ${(clusterSelection.confidence * 100).toFixed(0)}%)
${clusterSelection.rationale.map(r => `• ${r}`).join("\n")}

Dans ce référentiel, la valeur correspond à P${calibration.percentile}.
Plage observée (P25–P75) : ${calibration.range_p25_p75.low.toFixed(2)}–${calibration.range_p25_p75.high.toFixed(2)}.
Plage large (P10–P90) : ${calibration.range_p10_p90.low.toFixed(2)}–${calibration.range_p10_p90.high.toFixed(2)}.

Interprétation : ${calibration.interpretation}`;
    
    if (source === "estimated" || source === "snapshot") {
      text += "\n\nNote : estimation modélisée, confirmation labo recommandée si enjeu compétitif élevé.";
    }
    
    if (clusterSelection.confidence < 0.6) {
      text += "\n\n⚠️ Référentiel approximatif — données incomplètes. Interprétation prudente requise.";
    }
    
    return {
      value,
      source,
      confidence,
      calibration,
      clusterSelection,
      text,
    };
  }
  
  text = `VLamax estimée : ${value.toFixed(2)} mmol/L/s (confiance ${(confidence * 100).toFixed(0)}%).
Aucun référentiel applicable pour l'objectif "${objectif}".
Interprétation limitée — utiliser avec prudence.`;
  
  return {
    value,
    source,
    confidence,
    calibration: null,
    text,
  };
}
