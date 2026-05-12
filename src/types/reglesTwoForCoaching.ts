import { Athlete, getDernierSnapshot, ObjectifType } from "./athlete";
import { SnapshotNolio, scoreConfiance, estimerTTE } from "./snapshotNolio";
import { isVlamaxInRange, getVLamaxRange } from "@/lib/physiologicalTargets";
// Note: calculVLamaxSnapshot is no longer imported here — VLamax is passed as parameter to reglesTwoForCoaching()

export type PrioriteType = "VLAMAX_DOWN" | "VLAMAX_UP" | "TTE_UP" | "FTP_UTIL" | "ENDURANCE_UP" | "VITESSE_UP" | "";

export interface ReglesTwoForCoachingResult {
  priorite: PrioriteType;
  priorites: PrioriteType[]; // All priorities ranked by importance
  alertes: string[];
  race_ready: boolean;
}

// Alias for backwards compatibility
export type ReglesDanLorangResult = ReglesTwoForCoachingResult;

export interface PotentielInputs {
  seance_specifique_validee: boolean;
  fatigue_ok: boolean;
}

/**
 * Règles Two For Coaching Lab™ pour déterminer les priorités d'entraînement
 * Basé sur le modèle Snapshot
 * S'inspire des travaux de Mader, Heck et des approches de l'école allemande
 * Étendu pour Marathon/Semi
 */
export function reglesTwoForCoaching(
  athlete: Athlete,
  vlamax: number,
  tte: number,
  ftp_kg: number,
  seance_specifique_validee: boolean,
  fatigue_ok: boolean
): ReglesTwoForCoachingResult {
  const priorites: PrioriteType[] = [];
  const alertes: string[] = [];

  // ✅ AUDIT FIX : utiliser la source unique (objectif × ambition × sport offset)
  // Ces règles legacy sont conservées pour TwoForCoachingAnalysis — délègue à physiologicalTargets.
  const vlamaxRange = getVLamaxRange(athlete.objectif);

  if (vlamax > vlamaxRange.max) {
    priorites.push("VLAMAX_DOWN");
    alertes.push(`VLamax (${vlamax.toFixed(2)}) > cible max ${vlamaxRange.max.toFixed(2)} pour ${athlete.objectif}`);
  } else if (vlamax < vlamaxRange.min) {
    priorites.push("VLAMAX_UP");
    alertes.push(`VLamax (${vlamax.toFixed(2)}) < cible min ${vlamaxRange.min.toFixed(2)} pour ${athlete.objectif}`);
  }

  // Marathon: priorité endurance (TTE)
  if (athlete.objectif === "Marathon" && tte < 60) {
    priorites.push("ENDURANCE_UP");
    alertes.push("Endurance insuffisante pour marathon");
  }

  // Semi-Marathon: endurance
  if (athlete.objectif === "Semi" && tte < 50) {
    priorites.push("ENDURANCE_UP");
    alertes.push("Endurance insuffisante pour semi");
  }

  // TTE insuffisante (triathlon)
  if (
    (athlete.objectif === "IM" && tte < 55) ||
    (athlete.objectif === "703" && tte < 45)
  ) {
    if (!priorites.includes("TTE_UP")) {
      priorites.push("TTE_UP");
    }
    alertes.push("TTE insuffisante pour l'objectif");
  }

  // FTP faible (vélo uniquement pour triathlon)
  const ftpTarget = getFtpTarget(athlete.objectif);
  if ((athlete.objectif === "IM" || athlete.objectif === "703") && ftp_kg < ftpTarget) {
    priorites.push("FTP_UTIL");
    alertes.push(`FTP insuffisant (cible: ${ftpTarget} W/kg)`);
  }

  // Masse grasse élevée
  if (athlete.masse_grasse > 20) {
    alertes.push("Masse grasse élevée (>20%)");
  }

  // Race Ready check
  const vlmaxOk = isVlamaxOk(vlamax, athlete.objectif);
  const tteOk = isTteOk(tte, athlete.objectif);
  const ftpOk = ftp_kg >= ftpTarget || athlete.objectif === "Marathon" || athlete.objectif === "Semi";

  const race_ready =
    vlmaxOk &&
    tteOk &&
    ftpOk;

  return {
    priorite: priorites[0] || "",
    priorites,
    alertes,
    race_ready,
  };
}

/** @deprecated Use reglesTwoForCoaching instead */
export const reglesDanLorang = reglesTwoForCoaching;

// Helpers pour objectifs
function getFtpTarget(objectif: ObjectifType): number {
  switch (objectif) {
    case "IM": return 4.6;
    case "703": return 4.8;
    default: return 0; // Marathon/Semi n'ont pas de cible FTP vélo
  }
}

function isVlamaxOk(vlamax: number, objectif: ObjectifType): boolean {
  // ✅ AUDIT FIX : délégué à la source unique
  return isVlamaxInRange(vlamax, objectif);
}

function isTteOk(tte: number, objectif: ObjectifType): boolean {
  switch (objectif) {
    case "IM": return tte >= 55;
    case "703": return tte >= 45;
    case "Marathon": return tte >= 60;
    case "Semi": return tte >= 50;
    default: return tte >= 45;
  }
}

// Labels pour les priorités
export const getPrioriteLabel = (priorite: PrioriteType): string => {
  switch (priorite) {
    case "VLAMAX_DOWN":
      return "Réduire le VLamax";
    case "VLAMAX_UP":
      return "Augmenter le VLamax";
    case "TTE_UP":
      return "Améliorer le TTE";
    case "FTP_UTIL":
      return "Développer le FTP";
    case "ENDURANCE_UP":
      return "Augmenter l'endurance";
    case "VITESSE_UP":
      return "Améliorer la vitesse";
    default:
      return "Aucune priorité";
  }
};

// Couleurs pour les priorités
export const getPrioriteColor = (priorite: PrioriteType): string => {
  switch (priorite) {
    case "VLAMAX_DOWN":
      return "text-blue-400";
    case "VLAMAX_UP":
      return "text-accent";
    case "TTE_UP":
      return "text-warning";
    case "FTP_UTIL":
      return "text-primary";
    case "ENDURANCE_UP":
      return "text-success";
    case "VITESSE_UP":
      return "text-orange-400";
    default:
      return "text-success";
  }
};

// Séances recommandées par priorité
export const getSeancesRecommandees = (priorite: PrioriteType): string[] => {
  switch (priorite) {
    case "VLAMAX_DOWN":
      return ["A1", "A2", "A3", "E1"];
    case "TTE_UP":
      return ["B1", "B2", "F2"];
    case "VLAMAX_UP":
      return ["C1", "F1"];
    case "ENDURANCE_UP":
      return ["E1", "F2", "E2"];
    case "VITESSE_UP":
      return ["F1", "F2"];
    default:
      return ["A1", "D1"];
  }
};

// Séances spécifiques par objectif
export const getSeancesSpecifiques = (objectif: ObjectifType): string[] => {
  switch (objectif) {
    case "IM":
      return ["D1"];
    case "703":
      return ["B1"];
    case "Marathon":
      return ["E1", "F2"];
    case "Semi":
      return ["F1", "F2"];
    default:
      return [];
  }
};
