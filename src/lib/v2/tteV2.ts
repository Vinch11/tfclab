/**
 * TTE & Durabilité V2 — Time To Exhaustion at Threshold
 * 
 * RENOMMAGE : "TTE" → "Durabilité au seuil (TTE modelled)"
 * 
 * Sources scientifiques :
 * - Jones A.M. & Burnley M. (2009) – Critical power
 * - Poole D.C. et al. (2016) – Endurance capacity
 * - Seiler S. (2010) – Polarized training
 * 
 * MODÈLE V2 :
 * - Ne pas lier uniquement à TSS
 * - Facteur "qualité de charge" 
 * - Historique TTE, % séances seuil, stabilité FC/puissance
 */

import { PHYSIOLOGICAL_BOUNDS, CONFIDENCE_LEVELS } from './scientificConfig';

// =============================================
// TYPES V2
// =============================================

export interface TTERangeV2 {
  // Valeur centrale (minutes)
  central: number;
  
  // Plage réaliste
  min: number;
  max: number;
  
  // Niveau de confiance (0-1)
  confidence: number;
  
  // Source principale
  source: TTESourceV2;
  
  // Cible selon objectif
  target: number;
  
  // Status par rapport à la cible
  status: TTEStatusV2;
  statusLabel: string;
  statusMessage: string;
  
  // Indice de durabilité (0-100)
  durabilityIndex: number;
  durabilityLabel: string;
  
  // Alerte si TTE fragile
  isFragile: boolean;
  fragileReason?: string;
  
  // Facteurs utilisés
  factors: TTEFactorV2[];
  
  // Avertissements
  warnings: string[];
}

export type TTESourceV2 = 
  | 'observed'      // TTE observé en test
  | 'estimated'     // Estimé via charge/durabilité
  | 'historical'    // Basé sur historique
  | 'unknown';

export type TTEStatusV2 = 
  | 'excellent'     // > 110% cible
  | 'on_target'     // 95-110% cible
  | 'approaching'   // 85-95% cible
  | 'below'         // 70-85% cible
  | 'critical';     // < 70% cible

export interface TTEFactorV2 {
  id: string;
  label: string;
  value: string;
  contribution: number; // -100 à +100
  confidence: number;
}

export interface TTEV2Input {
  // TTE observé (priorité maximale)
  tte_observed_min?: number | null;
  
  // Charge récente
  tss_7d?: number | null;
  tss_30d_avg?: number | null;
  
  // Qualité de charge
  threshold_sessions_pct?: number | null;  // % séances ≥ seuil
  z2_volume_pct?: number | null;           // % volume Z2
  
  // Stabilité
  fc_stability_pct?: number | null;        // % stabilité FC en effort long
  power_stability_pct?: number | null;     // % stabilité puissance
  hr_drift_pct?: number | null;            // Dérive cardiaque
  
  // Cohérence pacing
  pacing_consistency?: number | null;      // Score cohérence pacing (0-1)
  
  // Historique
  tte_historical?: number | null;          // Dernier TTE connu
  historical_date?: string | null;
  
  // Contexte
  ftp?: number | null;
  objectif?: string;
  age?: number | null;
}

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getTTETargetV2(objectif: string, age?: number | null): number {
  const obj = (objectif || "").toLowerCase();
  
  let baseTarget: number;
  if (obj.includes("ironman") || obj.includes("im") || obj.includes("ultra")) {
    baseTarget = 55;
  } else if (obj.includes("70.3") || obj.includes("half") || obj.includes("marathon")) {
    baseTarget = 50;
  } else if (obj.includes("olympic") || obj.includes("sprint") || obj.includes("semi")) {
    baseTarget = 45;
  } else {
    baseTarget = 48;
  }
  
  // Ajustement âge
  if (age !== null && age !== undefined && age >= 30) {
    if (age >= 55) return Math.max(baseTarget - 8, 35);
    if (age >= 50) return Math.max(baseTarget - 6, 36);
    if (age >= 45) return Math.max(baseTarget - 4, 38);
    if (age >= 40) return Math.max(baseTarget - 3, 40);
    return Math.max(baseTarget - 2, 42);
  }
  
  return baseTarget;
}

function getTTEStatus(tte: number, target: number): TTEStatusV2 {
  const ratio = tte / target;
  if (ratio >= 1.10) return 'excellent';
  if (ratio >= 0.95) return 'on_target';
  if (ratio >= 0.85) return 'approaching';
  if (ratio >= 0.70) return 'below';
  return 'critical';
}

function getStatusLabel(status: TTEStatusV2): string {
  switch (status) {
    case 'excellent': return '✅ Excellent';
    case 'on_target': return '🟢 Dans la cible';
    case 'approaching': return '🟡 En approche';
    case 'below': return '🟠 En dessous';
    case 'critical': return '🔴 Critique';
  }
}

function getStatusMessage(status: TTEStatusV2, tte: number, target: number): string {
  const diff = tte - target;
  switch (status) {
    case 'excellent': 
      return `TTE supérieur à la cible (+${diff} min). Durabilité excellente.`;
    case 'on_target': 
      return `TTE dans la zone cible. Durabilité adaptée à l'objectif.`;
    case 'approaching': 
      return `TTE proche de la cible (${Math.abs(diff)} min de gap). Progression en cours.`;
    case 'below': 
      return `TTE en dessous de la cible (${Math.abs(diff)} min de gap). Travail de durabilité recommandé.`;
    case 'critical': 
      return `TTE insuffisant (${Math.abs(diff)} min de gap). Priorité à construire la base aérobie.`;
  }
}

function getDurabilityIndex(tte: number, target: number): number {
  // Score 0-100 basé sur le ratio vs cible
  const ratio = tte / target;
  if (ratio >= 1.20) return 100;
  if (ratio >= 1.10) return 90;
  if (ratio >= 1.00) return 80;
  if (ratio >= 0.90) return 65;
  if (ratio >= 0.80) return 50;
  if (ratio >= 0.70) return 35;
  return 20;
}

function getDurabilityLabel(index: number): string {
  if (index >= 85) return '💎 Très élevée';
  if (index >= 70) return '🟢 Élevée';
  if (index >= 55) return '🟡 Modérée';
  if (index >= 40) return '🟠 Limitée';
  return '🔴 Faible';
}

// =============================================
// ESTIMATION QUALITÉ DE CHARGE
// =============================================

function estimateLoadQuality(input: TTEV2Input): { score: number; factors: TTEFactorV2[] } {
  const factors: TTEFactorV2[] = [];
  let score = 50; // Base neutre
  
  // 1) Volume threshold sessions (séances ≥ seuil)
  if (input.threshold_sessions_pct !== null && input.threshold_sessions_pct !== undefined) {
    const pct = input.threshold_sessions_pct;
    let contribution = 0;
    
    // Optimal : 20-30% de séances seuil
    if (pct >= 20 && pct <= 30) {
      contribution = 15;
    } else if (pct >= 15 && pct <= 35) {
      contribution = 8;
    } else if (pct > 40) {
      contribution = -10; // Trop d'intensité
    } else if (pct < 10) {
      contribution = -5;  // Pas assez de qualité
    }
    
    score += contribution;
    factors.push({
      id: 'threshold_sessions',
      label: 'Séances seuil',
      value: `${pct}%`,
      contribution,
      confidence: 0.8
    });
  }
  
  // 2) Volume Z2
  if (input.z2_volume_pct !== null && input.z2_volume_pct !== undefined) {
    const pct = input.z2_volume_pct;
    let contribution = 0;
    
    // Optimal : 70-80% Z2
    if (pct >= 70 && pct <= 85) {
      contribution = 15;
    } else if (pct >= 60 && pct < 70) {
      contribution = 5;
    } else if (pct < 50) {
      contribution = -10; // Pas assez de base
    }
    
    score += contribution;
    factors.push({
      id: 'z2_volume',
      label: 'Volume Z2',
      value: `${pct}%`,
      contribution,
      confidence: 0.75
    });
  }
  
  // 3) Stabilité FC
  if (input.fc_stability_pct !== null && input.fc_stability_pct !== undefined) {
    const pct = input.fc_stability_pct;
    let contribution = 0;
    
    if (pct >= 95) contribution = 10;
    else if (pct >= 90) contribution = 5;
    else if (pct < 85) contribution = -10;
    
    score += contribution;
    factors.push({
      id: 'fc_stability',
      label: 'Stabilité FC',
      value: `${pct}%`,
      contribution,
      confidence: 0.85
    });
  }
  
  // 4) Dérive cardiaque
  if (input.hr_drift_pct !== null && input.hr_drift_pct !== undefined) {
    const drift = input.hr_drift_pct;
    let contribution = 0;
    
    if (drift <= 5) contribution = 10;  // Excellente stabilité
    else if (drift <= 8) contribution = 5;
    else if (drift <= 12) contribution = 0;
    else if (drift <= 15) contribution = -10;
    else contribution = -20; // Dérive critique
    
    score += contribution;
    factors.push({
      id: 'hr_drift',
      label: 'Dérive FC',
      value: `${drift}%`,
      contribution,
      confidence: 0.9
    });
  }
  
  // 5) Cohérence pacing
  if (input.pacing_consistency !== null && input.pacing_consistency !== undefined) {
    const pacing = input.pacing_consistency * 100;
    let contribution = 0;
    
    if (pacing >= 95) contribution = 8;
    else if (pacing >= 85) contribution = 4;
    else if (pacing < 75) contribution = -8;
    
    score += contribution;
    factors.push({
      id: 'pacing',
      label: 'Cohérence pacing',
      value: `${pacing.toFixed(0)}%`,
      contribution,
      confidence: 0.7
    });
  }
  
  return { score: clamp(score, 0, 100), factors };
}

// =============================================
// FONCTION PRINCIPALE V2
// =============================================

export function computeTTEV2(input: TTEV2Input): TTERangeV2 {
  const warnings: string[] = [];
  const target = getTTETargetV2(input.objectif || "", input.age);
  
  let central: number;
  let confidence: number;
  let source: TTESourceV2;
  let factors: TTEFactorV2[] = [];
  let isFragile = false;
  let fragileReason: string | undefined;
  
  // A) Priorité 1 : TTE observé
  if (input.tte_observed_min !== null && input.tte_observed_min !== undefined && input.tte_observed_min > 0) {
    central = input.tte_observed_min;
    confidence = CONFIDENCE_LEVELS.MEASURED_FIELD.value;
    source = 'observed';
    
    factors.push({
      id: 'observed',
      label: 'TTE mesuré',
      value: `${central} min`,
      contribution: 100,
      confidence: 0.95
    });
  }
  // B) Priorité 2 : Estimation via charge + qualité
  else if (input.tss_7d !== null && input.tss_7d !== undefined && input.tss_7d > 0) {
    // Estimation de base via TSS
    const baseline = 40;
    const loadFactor = Math.min(input.tss_7d / 100, 8) * 2.0;
    let baseEstimate = baseline + loadFactor;
    
    // Ajustement via qualité de charge
    const { score: qualityScore, factors: qualityFactors } = estimateLoadQuality(input);
    factors = qualityFactors;
    
    // Score qualité impacte le TTE
    // qualityScore 50 = neutre, > 70 = bonus, < 30 = malus
    const qualityMultiplier = 0.8 + (qualityScore / 100) * 0.4; // 0.8 à 1.2
    central = Math.round(baseEstimate * qualityMultiplier);
    
    central = clamp(central, PHYSIOLOGICAL_BOUNDS.TTE.MIN, PHYSIOLOGICAL_BOUNDS.TTE.MAX);
    confidence = CONFIDENCE_LEVELS.ESTIMATED_MODERATE.value;
    source = 'estimated';
    
    // Détecter fragilité
    if (input.hr_drift_pct !== null && input.hr_drift_pct !== undefined && input.hr_drift_pct > 12) {
      isFragile = true;
      fragileReason = 'Dérive cardiaque élevée — TTE potentiellement instable';
    }
    if (qualityScore < 35) {
      isFragile = true;
      fragileReason = fragileReason 
        ? fragileReason + ' + Qualité de charge insuffisante'
        : 'Qualité de charge insuffisante';
    }
  }
  // C) Priorité 3 : Historique
  else if (input.tte_historical !== null && input.tte_historical !== undefined) {
    central = input.tte_historical;
    confidence = CONFIDENCE_LEVELS.ESTIMATED_WEAK.value;
    source = 'historical';
    warnings.push('TTE basé sur données historiques — peut avoir évolué');
    
    factors.push({
      id: 'historical',
      label: 'TTE historique',
      value: `${central} min`,
      contribution: 50,
      confidence: 0.5
    });
  }
  // D) Priorité 4 : FTP-based fallback
  else if (input.ftp !== null && input.ftp !== undefined && input.ftp > 0) {
    central = Math.min(60, Math.max(35, Math.round(35 + (input.ftp - 200) * 0.04)));
    confidence = CONFIDENCE_LEVELS.ESTIMATED_WEAK.value;
    source = 'estimated';
    warnings.push('Estimation approximative basée sur FTP seul');
    
    factors.push({
      id: 'ftp_fallback',
      label: 'Estimation FTP',
      value: `FTP ${input.ftp}W`,
      contribution: 30,
      confidence: 0.4
    });
  }
  // E) Unknown
  else {
    central = 45;
    confidence = CONFIDENCE_LEVELS.UNKNOWN.value;
    source = 'unknown';
    warnings.push('Données insuffisantes — valeur par défaut');
  }
  
  // Calcul de l'incertitude basée sur la confiance
  const uncertaintyBase = 10 * (1 - confidence);
  const uncertainty = Math.max(3, uncertaintyBase);
  
  // Status
  const status = getTTEStatus(central, target);
  
  // Durabilité
  const durabilityIndex = getDurabilityIndex(central, target);
  
  return {
    central,
    min: Math.max(PHYSIOLOGICAL_BOUNDS.TTE.MIN, Math.round(central - uncertainty)),
    max: Math.min(PHYSIOLOGICAL_BOUNDS.TTE.MAX, Math.round(central + uncertainty)),
    confidence,
    source,
    target,
    status,
    statusLabel: getStatusLabel(status),
    statusMessage: getStatusMessage(status, central, target),
    durabilityIndex,
    durabilityLabel: getDurabilityLabel(durabilityIndex),
    isFragile,
    fragileReason,
    factors,
    warnings
  };
}

// =============================================
// HELPERS UI
// =============================================

export function formatTTERangeLabel(range: TTERangeV2): string {
  return `${range.min} – ${range.max} min`;
}

export function getTTEStatusColor(status: TTEStatusV2): string {
  switch (status) {
    case 'excellent': return 'text-green-600 dark:text-green-400';
    case 'on_target': return 'text-green-600 dark:text-green-400';
    case 'approaching': return 'text-amber-600 dark:text-amber-400';
    case 'below': return 'text-orange-600 dark:text-orange-400';
    case 'critical': return 'text-red-600 dark:text-red-400';
  }
}

export function getTTEStatusBadgeClass(status: TTEStatusV2): string {
  switch (status) {
    case 'excellent':
    case 'on_target':
      return 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50';
    case 'approaching':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50';
    case 'below':
      return 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/50';
    case 'critical':
      return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50';
  }
}
