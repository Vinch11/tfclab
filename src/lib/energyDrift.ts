/**
 * Dérive Énergétique - Vince's Lab
 * Indicateur de RISQUE métabolique basé sur:
 * - VLamax effectif
 * - TTE effectif
 * - Objectif de course
 * - TSS 7d (indicateur de préparation récente)
 * 
 * Ce n'est PAS un indicateur de charge, mais un indicateur de RISQUE.
 */

import type { VLamaxEffectif } from "./vlamaxEffectif";
import type { TTEEffectif } from "./tteEffectif";

// =============================================
// TYPES
// =============================================

export type EnergyDriftLevel = "low" | "moderate" | "high";

export interface EnergyDriftResult {
  level: EnergyDriftLevel;
  label: string;
  color: "success" | "warning" | "destructive";
  icon: "🟢" | "🟡" | "🔴";
  criticalTime: string | null; // Estimation du moment critique (ex: "~2h30")
  messageStaff: string;
  factors: {
    vlamax: "protective" | "neutral" | "risk";
    tte: "protective" | "vigilance" | "risk";
    objectif: "high_tolerance" | "medium_tolerance" | "low_tolerance";
  };
  details: {
    vlamaxValue: number | null;
    tteValue: number | null;
    tteTarget: number | null;
    tteDelta: number | null;
    objectifDuration: string;
  };
}

export interface ComputeEnergyDriftParams {
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  objectif: string;
  tss7d?: number | null;
  sport?: "velo" | "cap";
}

// =============================================
// CONSTANTES STAFF-GRADE
// =============================================

// Durées estimées par objectif (pour calculer le moment critique)
const OBJECTIF_DURATION: Record<string, { duration: string; hoursMin: number; tolerance: "high" | "medium" | "low" }> = {
  // Longue distance - faible tolérance à la dérive
  IM: { duration: "9-17h", hoursMin: 9, tolerance: "low" },
  Ironman: { duration: "9-17h", hoursMin: 9, tolerance: "low" },
  Ultra: { duration: "10h+", hoursMin: 10, tolerance: "low" },
  TrailLong: { duration: "8h+", hoursMin: 8, tolerance: "low" },
  
  // Moyenne distance - tolérance moyenne
  "70.3": { duration: "4-6h", hoursMin: 4, tolerance: "medium" },
  "703": { duration: "4-6h", hoursMin: 4, tolerance: "medium" },
  Half: { duration: "4-6h", hoursMin: 4, tolerance: "medium" },
  Marathon: { duration: "3-5h", hoursMin: 3, tolerance: "medium" },
  Trail: { duration: "4-8h", hoursMin: 4, tolerance: "medium" },
  
  // Courte distance - tolérance élevée
  Semi: { duration: "1h30-2h30", hoursMin: 1.5, tolerance: "high" },
  TrailCourt: { duration: "2-4h", hoursMin: 2, tolerance: "high" },
  Course: { duration: "1-3h", hoursMin: 1, tolerance: "high" },
  Olympic: { duration: "2-3h", hoursMin: 2, tolerance: "high" },
  Sprint: { duration: "1-1h30", hoursMin: 1, tolerance: "high" },
};

// =============================================
// LOGIQUE MÉTIER
// =============================================

function getVLamaxFactor(vlamax: number | null): "protective" | "neutral" | "risk" {
  if (vlamax === null) return "neutral";
  if (vlamax < 0.40) return "protective";
  if (vlamax <= 0.55) return "neutral";
  return "risk";
}

function getTTEFactor(tte: number | null, tteTarget: number | null): "protective" | "vigilance" | "risk" {
  if (tte === null || tteTarget === null) return "vigilance";
  const delta = tte - tteTarget;
  if (delta >= 0) return "protective";
  if (delta >= -5) return "vigilance";
  return "risk";
}

function getObjectifTolerance(objectif: string): "high_tolerance" | "medium_tolerance" | "low_tolerance" {
  const config = OBJECTIF_DURATION[objectif] || OBJECTIF_DURATION["Marathon"];
  return `${config.tolerance}_tolerance` as "high_tolerance" | "medium_tolerance" | "low_tolerance";
}

function estimateCriticalTime(params: {
  vlamaxFactor: "protective" | "neutral" | "risk";
  tteFactor: "protective" | "vigilance" | "risk";
  objectifConfig: { hoursMin: number; tolerance: "high" | "medium" | "low" };
  tteValue: number | null;
}): string | null {
  const { vlamaxFactor, tteFactor, objectifConfig, tteValue } = params;
  
  // Si tolérance élevée, pas de moment critique avant la fin
  if (objectifConfig.tolerance === "high") {
    return null;
  }
  
  // Base de calcul selon le TTE
  let baseHours = tteValue !== null ? (tteValue / 60) * 2.5 : objectifConfig.hoursMin * 0.6;
  
  // Ajustements selon les facteurs
  if (vlamaxFactor === "risk") {
    baseHours *= 0.75; // Dérive plus précoce
  } else if (vlamaxFactor === "protective") {
    baseHours *= 1.15;
  }
  
  if (tteFactor === "risk") {
    baseHours *= 0.8;
  } else if (tteFactor === "protective") {
    baseHours *= 1.1;
  }
  
  // Clamp selon la durée de l'objectif
  baseHours = Math.max(1, Math.min(baseHours, objectifConfig.hoursMin * 0.8));
  
  // Formatage
  const hours = Math.floor(baseHours);
  const minutes = Math.round((baseHours - hours) * 60);
  
  if (hours === 0) {
    return `~${minutes}min`;
  } else if (minutes === 0) {
    return `~${hours}h`;
  } else {
    return `~${hours}h${minutes.toString().padStart(2, "0")}`;
  }
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computeEnergyDrift(params: ComputeEnergyDriftParams): EnergyDriftResult {
  const { vlamaxEffectif, tteEffectif, objectif, tss7d, sport } = params;
  
  const vlamax = vlamaxEffectif.value;
  const tte = tteEffectif.tte_min;
  const tteTarget = tteEffectif.target ?? null;
  
  // Calcul des facteurs
  const vlamaxFactor = getVLamaxFactor(vlamax);
  const tteFactor = getTTEFactor(tte, tteTarget);
  const objectifTolerance = getObjectifTolerance(objectif);
  
  const objectifConfig = OBJECTIF_DURATION[objectif] || OBJECTIF_DURATION["Marathon"];
  
  // Calcul du TTEDelta
  const tteDelta = (tte !== null && tteTarget !== null) ? tte - tteTarget : null;
  
  // =============================================
  // LOGIQUE DE SCORING
  // =============================================
  
  let riskScore = 0;
  
  // VLamax contribution
  if (vlamaxFactor === "risk") riskScore += 2;
  else if (vlamaxFactor === "neutral") riskScore += 1;
  // protective = 0
  
  // TTE contribution  
  if (tteFactor === "risk") riskScore += 2;
  else if (tteFactor === "vigilance") riskScore += 1;
  // protective = 0
  
  // Objectif contribution
  if (objectifTolerance === "low_tolerance") riskScore += 1;
  // medium/high = 0
  
  // Bonus masquage TSS : charge élevée sans TTE élevé = vigilance supplémentaire
  if (tss7d !== null && tss7d !== undefined && tss7d > 600 && tteFactor !== "protective") {
    riskScore += 1;
  }
  
  // =============================================
  // DÉTERMINATION DU NIVEAU
  // =============================================
  
  let level: EnergyDriftLevel;
  let label: string;
  let color: "success" | "warning" | "destructive";
  let icon: "🟢" | "🟡" | "🔴";
  let messageStaff: string;
  
  if (riskScore <= 1) {
    level = "low";
    label = "Faible";
    color = "success";
    icon = "🟢";
    messageStaff = "Dérive énergétique peu probable avant la fin de l'épreuve si la nutrition est respectée.";
  } else if (riskScore <= 3) {
    level = "moderate";
    label = "Modéré";
    color = "warning";
    icon = "🟡";
    const criticalTime = estimateCriticalTime({ vlamaxFactor, tteFactor, objectifConfig, tteValue: tte });
    messageStaff = criticalTime 
      ? `Dérive énergétique possible après ${criticalTime}. Vigilance sur le pacing et les apports glucidiques.`
      : "Dérive énergétique possible en fin d'épreuve. Vigilance sur le pacing et les apports glucidiques.";
  } else {
    level = "high";
    label = "Élevé";
    color = "destructive";
    icon = "🔴";
    messageStaff = "Risque élevé de dérive énergétique précoce. Nutrition agressive et pacing conservateur recommandés.";
  }
  
  // Calcul du moment critique
  const criticalTime = level !== "low" 
    ? estimateCriticalTime({ vlamaxFactor, tteFactor, objectifConfig, tteValue: tte })
    : null;
  
  return {
    level,
    label,
    color,
    icon,
    criticalTime,
    messageStaff,
    factors: {
      vlamax: vlamaxFactor,
      tte: tteFactor,
      objectif: objectifTolerance,
    },
    details: {
      vlamaxValue: vlamax,
      tteValue: tte,
      tteTarget,
      tteDelta,
      objectifDuration: objectifConfig.duration,
    },
  };
}

// =============================================
// HELPERS UI
// =============================================

export function getEnergyDriftBadgeVariant(level: EnergyDriftLevel): "default" | "secondary" | "destructive" | "outline" {
  switch (level) {
    case "low": return "secondary";
    case "moderate": return "default";
    case "high": return "destructive";
  }
}

export function getFactorLabel(factor: "protective" | "neutral" | "risk" | "vigilance"): string {
  switch (factor) {
    case "protective": return "Protecteur";
    case "neutral": return "Neutre";
    case "vigilance": return "Vigilance";
    case "risk": return "Risque";
  }
}

export function getFactorColor(factor: "protective" | "neutral" | "risk" | "vigilance"): string {
  switch (factor) {
    case "protective": return "text-success";
    case "neutral": return "text-muted-foreground";
    case "vigilance": return "text-warning";
    case "risk": return "text-destructive";
  }
}
