// =============================================
// MODÈLE ATHLÈTE - Simplifié pour NOLIO
// =============================================

import { SnapshotNolio } from "./snapshotNolio";
import { AmbitionLevel } from "./ambitionLevel";

export type ObjectifType = "IM" | "703" | "Sprint" | "Olympic" | "Marathon" | "Semi" | "5K" | "10K" | "StartToRun" | "Trail" | "TrailShort" | "TrailMountain" | "TrailUltra";
export type SexeType = "M" | "F";

// Re-export for convenience
export type { AmbitionLevel } from "./ambitionLevel";

// Références physiologiques pour le calcul des zones
export interface AthleteRefs {
  fcMax: number | null;      // FCmax en bpm
  vma: number | null;        // VMA en km/h
  ftp: number | null;        // FTP vélo en W
  css: number | null;        // CSS natation en sec/100m
  // F8 — Profil ergogénique (pilote stack suppléments)
  hasRepeatedEfforts?: boolean; // Course explosive / sprints répétés
  bicarbTested?: boolean;       // Tolérance NaHCO₃ déjà testée
  vegetarian?: boolean;          // Régime végétarien/vegan
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
  // Date de naissance pour calcul AAI (Age Adjustment Index)
  dateNaissance?: string;
  // Niveau d'ambition (modifie les seuils physiologiques)
  ambition?: AmbitionLevel;
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
  createdAt?: string;
  updatedAt?: string;
}

// Valeurs par défaut - ✅ FIX 11: ZÉRO valeur inventée (null/undefined)
export const defaultAthlete: Athlete = {
  id: "",
  nom: "Nouvel Athlète",
  sexe: "M",
  objectif: "IM",
  masse_grasse: undefined as any, // ✅ FIX 11: pas de 18% par défaut
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
    case "Sprint":
      return "Sprint";
    case "Olympic":
      return "Olympique";
    case "5K":
      return "5 km";
    case "10K":
      return "10 km";
    case "StartToRun":
      return "Start to Run";
    case "Marathon":
      return "Marathon";
    case "Semi":
      return "Semi-Marathon";
    case "Trail":
      return "Trail (général)";
    case "TrailShort":
      return "Trail court (20–40km)";
    case "TrailMountain":
      return "Trail montagne (40–80km)";
    case "TrailUltra":
      return "Ultra trail (80km+)";
    default:
      return objectif;
  }
};

// Helper pour normaliser les objectifs trail
export const normalizeTrailGoal = (goal: ObjectifType): ObjectifType => {
  if (goal === "Trail") return "TrailMountain";
  return goal;
};

export const isTrailGoal = (goal: ObjectifType): boolean => {
  return ["Trail", "TrailShort", "TrailMountain", "TrailUltra"].includes(goal);
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

// ⚠️ DEPRECATED — Zones figées (ftp*0.55, ftp*0.85, ftp*1.2) supprimées.
// Les zones effectives sont désormais dérivées de Mader α=1.98 (MLSS calibré N=44)
// via `findMLSSPower` (`@/lib/v2/maderMetabolicModel`) et de la prescription du
// moteur diagnostic. Ne pas réintroduire de coefficients FTP figés.

// Obtenir le dernier snapshot d'un athlète
export const getDernierSnapshot = (athlete: Athlete): SnapshotNolio | null => {
  if (!athlete.historique || athlete.historique.length === 0) return null;
  return athlete.historique[athlete.historique.length - 1];
};

// Obtenir les données actuelles depuis le dernier snapshot
// ✅ FIX 11: retourne null au lieu de fallbacks inventés
export const getAthleteActuel = (athlete: Athlete) => {
  const snapshot = getDernierSnapshot(athlete);
  if (!snapshot) {
    return {
      poids: null,
      ftp: null,
      pmax_5s: null,
      vo2max: null,
      hrv: null,
      tss_7j: null,
    };
  }
  return {
    poids: snapshot.poids ?? null,
    ftp: snapshot.ftp ?? null,
    pmax_5s: snapshot.pmax_5s ?? null,
    vo2max: snapshot.vo2max ?? null,
    hrv: snapshot.hrv ?? null,
    tss_7j: snapshot.tss_7j ?? null,
  };
};
