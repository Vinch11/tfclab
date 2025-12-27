export type ObjectifType = "IM" | "703";
export type SexeType = "M" | "F";

export interface Athlete {
  id: string;
  poids: number;
  objectif: ObjectifType;
  sexe: SexeType;
  vo2max: number;             // ml/kg/min
  masse_grasse: number;       // %
  masse_musculaire: number;   // %
  fc_max: number;             // bpm
  fc_repos: number;           // bpm
  hrv: number;                // ms
  sommeil: number;            // heures
  fatigue_subjective: number; // 1-10
  // Additional useful fields
  nom?: string;
  prenom?: string;
  ftp?: number;
  vlamax?: number;
  dateNaissance?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const defaultAthlete: Athlete = {
  id: "",
  poids: 70,
  objectif: "IM",
  sexe: "M",
  vo2max: 52,
  masse_grasse: 18,
  masse_musculaire: 45,
  fc_max: 190,
  fc_repos: 50,
  hrv: 60,
  sommeil: 7,
  fatigue_subjective: 4,
  ftp: 320,
  vlamax: 0.42,
};

// Helper functions
export const getObjectifLabel = (objectif: ObjectifType): string => {
  switch (objectif) {
    case "IM":
      return "Ironman";
    case "703":
      return "70.3 / Half Ironman";
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
