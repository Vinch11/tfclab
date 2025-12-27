import { Athlete, getDernierSnapshot } from "./athlete";
import { SnapshotNolio, scoreConfiance, estimerTTE } from "./snapshotNolio";
import { calculVLamaxSnapshot } from "@/lib/athleteStore";

export type PrioriteType = "VLAMAX_DOWN" | "VLAMAX_UP" | "TTE_UP" | "FTP_UTIL" | "";

export interface ReglesDanLorangResult {
  priorite: PrioriteType;
  alertes: string[];
  race_ready: boolean;
}

export interface RaceReadinessInputs {
  seance_specifique_validee: boolean;
  fatigue_ok: boolean;
}

/**
 * Règles Dan Lorang pour déterminer les priorités d'entraînement
 * Basé sur le modèle Snapshot NOLIO
 */
export function reglesDanLorang(
  athlete: Athlete,
  vlamax: number,
  tte: number,
  ftp_kg: number,
  seance_specifique_validee: boolean,
  fatigue_ok: boolean
): ReglesDanLorangResult {
  let priorite: PrioriteType = "";
  const alertes: string[] = [];

  // VLamax trop élevée pour l'objectif
  if (
    (athlete.objectif === "IM" && vlamax > 0.40) ||
    (athlete.objectif === "703" && vlamax > 0.45)
  ) {
    priorite = "VLAMAX_DOWN";
    alertes.push("VLamax trop élevée pour l'objectif");
  }

  // VLamax trop basse
  if (vlamax < 0.28) {
    priorite = "VLAMAX_UP";
    alertes.push("VLamax trop basse (<0.28)");
  }

  // TTE insuffisante
  if (
    (athlete.objectif === "IM" && tte < 55) ||
    (athlete.objectif === "703" && tte < 45)
  ) {
    priorite = "TTE_UP";
    alertes.push("TTE insuffisante pour l'objectif");
  }

  // FTP faible
  const ftpTarget = athlete.objectif === "IM" ? 4.6 : 4.8;
  if (ftp_kg < ftpTarget) {
    priorite = "FTP_UTIL";
    alertes.push(`FTP insuffisant (cible: ${ftpTarget} W/kg)`);
  }

  // Masse grasse élevée
  if (athlete.masse_grasse > 20) {
    alertes.push("Masse grasse élevée (>20%)");
  }

  // Race Ready check
  const vlmaxOk = vlamax >= 0.25 && vlamax <= 0.45;
  const tteOk =
    (athlete.objectif === "IM" && tte >= 55) ||
    (athlete.objectif === "703" && tte >= 45);
  const ftpOk = ftp_kg >= ftpTarget;

  const race_ready =
    vlmaxOk &&
    tteOk &&
    ftpOk &&
    seance_specifique_validee &&
    fatigue_ok;

  return {
    priorite,
    alertes,
    race_ready,
  };
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
    default:
      return "text-success";
  }
};

// Séances recommandées par priorité
export const getSeancesRecommandees = (priorite: PrioriteType): string[] => {
  switch (priorite) {
    case "VLAMAX_DOWN":
      return ["A1", "A2", "A3"];
    case "TTE_UP":
      return ["B1", "B2"];
    case "VLAMAX_UP":
      return ["C1"];
    default:
      return ["A1", "D1"];
  }
};

// Séances spécifiques par objectif
export const getSeancesSpecifiques = (objectif: "IM" | "703"): string[] => {
  switch (objectif) {
    case "IM":
      return ["D1"];
    case "703":
      return ["B1"];
    default:
      return [];
  }
};
