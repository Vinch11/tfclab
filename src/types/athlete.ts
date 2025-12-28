// =============================================
// MODÈLE ATHLÈTE - Simplifié pour NOLIO
// =============================================

import { SnapshotNolio } from "./snapshotNolio";

export type ObjectifType = "IM" | "703" | "Marathon" | "Semi";
export type SexeType = "M" | "F";

// Références physiologiques pour le calcul des zones
export interface AthleteRefs {
  fcMax: number | null;      // FCmax en bpm
  vma: number | null;        // VMA en km/h
  ftp: number | null;        // FTP vélo en W
  css: number | null;        // CSS natation en sec/100m
}

// Import des types de tests
import type { StoredTestResult } from "./testLibrary";

// Athlète simplifié avec historique de snapshots
export interface Athlete {
  id: string;
  nom: string;
  sexe: SexeType;
  objectif: ObjectifType;
  masse_grasse: number;       // %
  // Historique des snapshots Nolio
  historique: SnapshotNolio[];
  // Tests physiologiques (bibliothèque)
  tests?: StoredTestResult[];
  // Références physiologiques pour les zones
  refs?: AthleteRefs;
  // VO2max estimée
  vo2max?: number;
  // Métadonnées optionnelles
  prenom?: string;
  email?: string;
  dateNaissance?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Valeurs par défaut
export const defaultAthlete: Athlete = {
  id: "",
  nom: "Nouvel Athlète",
  sexe: "M",
  objectif: "IM",
  masse_grasse: 18,
  historique: [],
  tests: [],
};

// Helper functions
export const getObjectifLabel = (objectif: ObjectifType): string => {
  switch (objectif) {
    case "IM":
      return "Ironman";
    case "703":
      return "70.3 / Half Ironman";
    case "Marathon":
      return "Marathon";
    case "Semi":
      return "Semi-Marathon";
    default:
      return objectif;
  }
};

export const getSexeLabel = (sexe: SexeType): string => {
  switch (sexe) {
    case "M":
      return "Homme";
    case "F":
      return "Femme";
    default:
      return sexe;
  }
};

// Estimation VO2max depuis FTP
export const estimerVO2max = (ftp: number, poids: number): number => {
  return (ftp / poids) * 12.0; // approximation cycliste
};

// Zones d'entraînement
export interface ZonesEntrainement {
  zone_aerobie: number;
  zone_seuil: number;
  zone_sprint: number;
}

export const calculerZonesEntrainement = (ftp: number): ZonesEntrainement => {
  return {
    zone_aerobie: Math.round(ftp * 0.55),
    zone_seuil: Math.round(ftp * 0.85),
    zone_sprint: Math.round(ftp * 1.2),
  };
};

// Obtenir le dernier snapshot d'un athlète
export const getDernierSnapshot = (athlete: Athlete): SnapshotNolio | null => {
  if (!athlete.historique || athlete.historique.length === 0) return null;
  return athlete.historique[athlete.historique.length - 1];
};

// Obtenir les données actuelles depuis le dernier snapshot
export const getAthleteActuel = (athlete: Athlete) => {
  const snapshot = getDernierSnapshot(athlete);
  if (!snapshot) {
    return {
      poids: 70,
      ftp: 0,
      pmax_5s: 0,
      vo2max: 0,
      hrv: 0,
      tss_7j: 0,
    };
  }
  return {
    poids: snapshot.poids,
    ftp: snapshot.ftp,
    pmax_5s: snapshot.pmax_5s,
    vo2max: snapshot.vo2max || 0,
    hrv: snapshot.hrv || 0,
    tss_7j: snapshot.tss_7j,
  };
};
