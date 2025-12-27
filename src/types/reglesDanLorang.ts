import { Athlete } from "./athlete";
import { ResultatVLamax } from "./resultatVLamax";

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
 * et l'état "Race Ready"
 */
export function reglesDanLorang(
  athlete: Athlete,
  resultat: ResultatVLamax,
  tte: number, // en minutes
  ftp_kg: number,
  seance_specifique_validee: boolean,
  fatigue_ok: boolean
): ReglesDanLorangResult {
  let priorite: PrioriteType = "";
  const alertes: string[] = [];

  // VLamax trop élevée pour l'objectif
  if (
    (athlete.objectif === "IM" && resultat.vlamax > 0.40) ||
    (athlete.objectif === "703" && resultat.vlamax > 0.45)
  ) {
    priorite = "VLAMAX_DOWN";
    alertes.push("VLamax trop élevée pour l'objectif");
  }

  // Hausse non désirée du VLamax
  if (resultat.delta_6sem > 0.05) {
    priorite = "VLAMAX_DOWN";
    alertes.push("Hausse VLamax non souhaitée (+0.05)");
  }

  // VLamax trop basse
  if (resultat.vlamax < 0.28) {
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

  // Race Ready check
  const vlmaxOk = resultat.vlamax >= 0.25 && resultat.vlamax <= 0.45;
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

// Recommandations par priorité
export const getRecommandationsPriorite = (priorite: PrioriteType): string[] => {
  switch (priorite) {
    case "VLAMAX_DOWN":
      return [
        "Privilégier les sorties longues Z2 (4-6h)",
        "Éviter les sprints et intervalles courts",
        "Séances tempo longues (sweet spot 2x30-40min)",
        "Limiter les efforts > 120% FTP",
      ];
    case "VLAMAX_UP":
      return [
        "Ajouter des sprints courts (5-10s max)",
        "Intervalles courts haute intensité (30s-1min)",
        "Séances de force explosive",
        "Réduire le volume Z2 très long",
      ];
    case "TTE_UP":
      return [
        "Séances au seuil prolongées (2x20-30min)",
        "Intervalles longs à 95-105% FTP",
        "Sorties tempo soutenues",
        "Travail de résistance mentale",
      ];
    case "FTP_UTIL":
      return [
        "Blocs de travail au seuil (sweet spot)",
        "Intervalles VO2max (3-5min à 105-115% FTP)",
        "Progression du volume au seuil",
        "Travail de force spécifique",
      ];
    default:
      return [
        "Maintenir l'équilibre actuel",
        "Affûtage pré-compétition",
        "Récupération et fraîcheur",
      ];
  }
};

// Calcul du score Race Readiness (0-100)
export const calculateRaceReadinessScore = (
  athlete: Athlete,
  resultat: ResultatVLamax,
  tte: number,
  ftp_kg: number,
  seance_specifique_validee: boolean,
  fatigue_ok: boolean
): number => {
  let score = 0;

  // VLamax (25 points)
  if (resultat.vlamax >= 0.25 && resultat.vlamax <= 0.45) {
    score += 25;
  } else if (resultat.vlamax >= 0.20 && resultat.vlamax <= 0.50) {
    score += 15;
  } else {
    score += 5;
  }

  // TTE (25 points)
  const tteTarget = athlete.objectif === "IM" ? 55 : 45;
  if (tte >= tteTarget) {
    score += 25;
  } else if (tte >= tteTarget * 0.8) {
    score += 15;
  } else {
    score += 5;
  }

  // FTP (25 points)
  const ftpTarget = athlete.objectif === "IM" ? 4.6 : 4.8;
  if (ftp_kg >= ftpTarget) {
    score += 25;
  } else if (ftp_kg >= ftpTarget * 0.9) {
    score += 15;
  } else {
    score += 5;
  }

  // Séance spécifique (15 points)
  if (seance_specifique_validee) {
    score += 15;
  }

  // Fatigue (10 points)
  if (fatigue_ok) {
    score += 10;
  }

  return score;
};
