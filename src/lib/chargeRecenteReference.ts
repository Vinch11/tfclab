// =============================================
// CHARGE RÉCENTE DE RÉFÉRENCE (CRR)
// Source unique de vérité pour la charge d'entraînement
// Two For Coaching Lab – Staff-Grade
// =============================================

/**
 * DÉFINITION OFFICIELLE :
 * 
 * CRR = Charge d'entraînement réellement absorbée par l'athlète
 * sur les 7 derniers jours, exprimée en TSS.
 * 
 * Utilisée comme entrée principale pour :
 * - TTE effectif (estimation mode LOAD)
 * - Axe Robustesse du Metabolic Performance Compass
 * - Race Readiness (facteur fraîcheur)
 * 
 * Hiérarchie des sources :
 * 1. NOLIO   → Import automatique (confiance max)
 * 2. SNAPSHOT → Valeur validée par le coach
 * 3. MANUAL  → Saisie manuelle staff
 * 4. UNKNOWN → Aucune donnée (déclenche avertissement)
 */

// =============================================
// TYPES
// =============================================

export type CRRSource = "NOLIO" | "SNAPSHOT" | "MANUAL" | "UNKNOWN";

export interface ChargeRecenteReference {
  value: number | null;          // TSS sur 7 jours
  source: CRRSource;
  confidence: number;            // 0.0 → 1.0
  lastUpdated: string | null;    // ISO date
  label: string;                 // Affichage UI
  isValid: boolean;              // true si exploitable
  warningMessage: string | null; // Message si problème
}

export interface CRRTargets {
  objectif: string;
  chargeMinimale: number;   // TSS minimum pour l'objectif
  chargeOptimale: number;   // TSS optimal
  chargeMaximale: number;   // TSS au-delà = surcharge
}

// =============================================
// CIBLES PAR OBJECTIF
// =============================================

export const CRR_TARGETS_BY_OBJECTIF: Record<string, CRRTargets> = {
  // Ironman / Ultra
  IM: { objectif: "Ironman", chargeMinimale: 400, chargeOptimale: 550, chargeMaximale: 800 },
  Ironman: { objectif: "Ironman", chargeMinimale: 400, chargeOptimale: 550, chargeMaximale: 800 },
  Ultra: { objectif: "Ultra", chargeMinimale: 350, chargeOptimale: 500, chargeMaximale: 750 },
  
  // 70.3 / Half
  "703": { objectif: "70.3", chargeMinimale: 300, chargeOptimale: 450, chargeMaximale: 650 },
  Half: { objectif: "Half", chargeMinimale: 300, chargeOptimale: 450, chargeMaximale: 650 },
  
  // Marathon / Semi
  Marathon: { objectif: "Marathon", chargeMinimale: 250, chargeOptimale: 400, chargeMaximale: 600 },
  Semi: { objectif: "Semi", chargeMinimale: 200, chargeOptimale: 350, chargeMaximale: 550 },
  Course: { objectif: "Course", chargeMinimale: 150, chargeOptimale: 300, chargeMaximale: 500 },
  
  // Trail
  Trail: { objectif: "Trail", chargeMinimale: 300, chargeOptimale: 450, chargeMaximale: 700 },
  TrailCourt: { objectif: "Trail Court", chargeMinimale: 200, chargeOptimale: 350, chargeMaximale: 550 },
  TrailLong: { objectif: "Trail Long", chargeMinimale: 400, chargeOptimale: 550, chargeMaximale: 800 },
  
  // Sprint / Olympique
  Sprint: { objectif: "Sprint", chargeMinimale: 150, chargeOptimale: 300, chargeMaximale: 500 },
  Olympic: { objectif: "Olympic", chargeMinimale: 200, chargeOptimale: 350, chargeMaximale: 550 },
};

const DEFAULT_CRR_TARGETS: CRRTargets = {
  objectif: "Général",
  chargeMinimale: 250,
  chargeOptimale: 400,
  chargeMaximale: 650
};

// =============================================
// FONCTION PRINCIPALE
// =============================================

export interface ComputeCRRParams {
  tss7d: number | null;             // Valeur brute du snapshot
  snapshotDate?: string | null;     // Date du snapshot (création)
  snapshotUpdatedAt?: string | null;// Date de dernière mise à jour du snapshot
  nolioTss7d?: number | null;       // Si import Nolio disponible
  manualOverride?: number | null;   // Saisie manuelle staff
}

/**
 * Calcule la Charge Récente de Référence selon la hiérarchie officielle
 */
export function computeCRR(params: ComputeCRRParams): ChargeRecenteReference {
  const { tss7d, snapshotDate, snapshotUpdatedAt, nolioTss7d, manualOverride } = params;
  
  // 1. NOLIO (priorité maximale)
  if (nolioTss7d != null && nolioTss7d > 0) {
    return {
      value: nolioTss7d,
      source: "NOLIO",
      confidence: 0.95,
      lastUpdated: new Date().toISOString().split("T")[0],
      label: `${nolioTss7d} TSS/7j (Nolio)`,
      isValid: true,
      warningMessage: null
    };
  }
  
  // 2. SNAPSHOT (validé par coach)
  if (tss7d != null && tss7d > 0) {
    // Utiliser updated_at si disponible, sinon date de création
    const referenceDate = snapshotUpdatedAt || snapshotDate;
    const age = referenceDate ? getDaysAgo(referenceDate) : null;
    const isRecent = age !== null && age <= 14;
    
    return {
      value: tss7d,
      source: "SNAPSHOT",
      confidence: isRecent ? 0.85 : 0.65,
      lastUpdated: snapshotUpdatedAt || snapshotDate || null,
      label: `${tss7d} TSS/7j (Snapshot)`,
      isValid: true,
      warningMessage: !isRecent && age !== null
        ? `Données mises à jour il y a ${age} jours`
        : null
    };
  }
  
  // 3. MANUAL (saisie staff)
  if (manualOverride != null && manualOverride > 0) {
    return {
      value: manualOverride,
      source: "MANUAL",
      confidence: 0.70,
      lastUpdated: new Date().toISOString().split("T")[0],
      label: `${manualOverride} TSS/7j (Manuel)`,
      isValid: true,
      warningMessage: "Valeur saisie manuellement – vérifier la cohérence"
    };
  }
  
  // 4. UNKNOWN (aucune donnée)
  return {
    value: null,
    source: "UNKNOWN",
    confidence: 0,
    lastUpdated: null,
    label: "— (non renseigné)",
    isValid: false,
    warningMessage: "Charge récente inconnue. Les estimations TTE et Robustesse seront limitées."
  };
}

// =============================================
// SCORE DE CHARGE (pour Compass)
// =============================================

export interface ChargeScore {
  score: number;        // 0-100
  status: "low" | "optimal" | "high" | "overload" | "unknown";
  explanation: string;
  recommendation: string;
}

/**
 * Calcule le score de charge pour l'axe Robustesse du Compass
 * Formule: Charge_score = clamp((CRR / Charge_cible) * 100, 0, 120)
 */
export function computeChargeScore(
  crr: ChargeRecenteReference,
  objectif: string
): ChargeScore {
  const targets = getCRRTargets(objectif);
  
  // CRR inconnue
  if (!crr.isValid || crr.value === null) {
    return {
      score: 50, // Score neutre
      status: "unknown",
      explanation: "Charge récente non renseignée – score neutre appliqué",
      recommendation: "Renseignez la charge (TSS 7j) pour un score fiable"
    };
  }
  
  const value = crr.value;
  
  // Sous la charge minimale
  if (value < targets.chargeMinimale) {
    const ratio = value / targets.chargeMinimale;
    const score = Math.round(ratio * 60); // 0-60
    return {
      score: Math.max(20, score),
      status: "low",
      explanation: `Charge insuffisante (${value} < ${targets.chargeMinimale} TSS)`,
      recommendation: "Augmenter progressivement le volume d'entraînement"
    };
  }
  
  // Zone optimale
  if (value >= targets.chargeMinimale && value <= targets.chargeOptimale) {
    const position = (value - targets.chargeMinimale) / (targets.chargeOptimale - targets.chargeMinimale);
    const score = Math.round(70 + position * 30); // 70-100
    return {
      score: Math.min(100, score),
      status: "optimal",
      explanation: `Charge optimale (${value} TSS/7j)`,
      recommendation: "Maintenir cette charge et surveiller la récupération"
    };
  }
  
  // Au-dessus de l'optimal mais acceptable
  if (value > targets.chargeOptimale && value <= targets.chargeMaximale) {
    const excess = (value - targets.chargeOptimale) / (targets.chargeMaximale - targets.chargeOptimale);
    const score = Math.round(100 - excess * 20); // 80-100
    return {
      score,
      status: "high",
      explanation: `Charge élevée (${value} TSS/7j)`,
      recommendation: "Surveiller la fatigue et prévoir une récupération"
    };
  }
  
  // Surcharge
  const overloadRatio = value / targets.chargeMaximale;
  const score = Math.max(30, Math.round(80 - (overloadRatio - 1) * 50));
  return {
    score,
    status: "overload",
    explanation: `Surcharge détectée (${value} > ${targets.chargeMaximale} TSS)`,
    recommendation: "⚠️ Risque de surentraînement – réduire la charge"
  };
}

// =============================================
// HELPERS
// =============================================

function getDaysAgo(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getCRRTargets(objectif: string): CRRTargets {
  return CRR_TARGETS_BY_OBJECTIF[objectif] || DEFAULT_CRR_TARGETS;
}

// =============================================
// UI HELPERS
// =============================================

export function getCRRSourceColor(source: CRRSource): string {
  switch (source) {
    case "NOLIO":
      return "text-green-600 dark:text-green-400";
    case "SNAPSHOT":
      return "text-blue-600 dark:text-blue-400";
    case "MANUAL":
      return "text-amber-600 dark:text-amber-400";
    case "UNKNOWN":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

export function getCRRSourceBgColor(source: CRRSource): string {
  switch (source) {
    case "NOLIO":
      return "bg-green-100 dark:bg-green-900/30";
    case "SNAPSHOT":
      return "bg-blue-100 dark:bg-blue-900/30";
    case "MANUAL":
      return "bg-amber-100 dark:bg-amber-900/30";
    case "UNKNOWN":
      return "bg-muted";
    default:
      return "bg-muted";
  }
}

export function getCRRStatusColor(status: ChargeScore["status"]): string {
  switch (status) {
    case "optimal":
      return "text-green-600 dark:text-green-400";
    case "high":
      return "text-amber-600 dark:text-amber-400";
    case "low":
      return "text-blue-600 dark:text-blue-400";
    case "overload":
      return "text-red-600 dark:text-red-400";
    case "unknown":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

export function getCRRConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "Excellent";
  if (confidence >= 0.7) return "Bon";
  if (confidence >= 0.5) return "Modéré";
  if (confidence > 0) return "Faible";
  return "Inconnu";
}
