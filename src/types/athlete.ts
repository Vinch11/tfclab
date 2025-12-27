export type ObjectifType = "IM" | "703";
export type SexeType = "M" | "F";

export interface Athlete {
  id: string;
  poids: number;
  objectif: ObjectifType;
  sexe: SexeType;
  // Additional useful fields
  nom?: string;
  prenom?: string;
  ftp?: number;
  vo2max?: number;
  fcMax?: number;
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
  ftp: 320,
  vo2max: 65,
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
