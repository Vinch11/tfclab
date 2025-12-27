// =============================================
// GÉNÉRATEUR SEMAINE TYPE - Dan Lorang
// =============================================

import { Athlete, getDernierSnapshot } from "@/types/athlete";
import { estimerTTE } from "@/types/snapshotNolio";
import { calculVLamaxSnapshot } from "@/lib/athleteStore";
import { SEANCES, Seance, seancesParPriorite, determinerPriorite, PrioriteCoaching } from "@/types/seances";

export interface JourSemaine {
  jour: string;
  type: string;
  nom?: string;
  objectif: string;
  intensite?: string;
  duree?: string;
  format?: string;
  contenu?: string;
  description?: string;
  estCle: boolean;
}

export interface SemaineType {
  athleteNom: string;
  objectif: "IM" | "703";
  priorite: PrioriteCoaching;
  vlamax: number;
  tte: number;
  semaine: JourSemaine[];
  volumeTotal: string;
  nbSeancesCles: number;
}

// Générer la semaine type basée sur le profil athlète
export function genererSemaineType(athlete: Athlete): SemaineType | null {
  const snapshot = getDernierSnapshot(athlete);
  if (!snapshot) return null;

  const tte = estimerTTE(snapshot.ftp, snapshot.tss_7j);
  const vlamax = calculVLamaxSnapshot(snapshot, athlete.objectif);
  const priorite = determinerPriorite(vlamax, tte, athlete.objectif);
  const seancesRecommandees = seancesParPriorite(priorite);

  const semaine: JourSemaine[] = [];

  // LUNDI - Repos / Mobilité
  semaine.push({
    jour: "Lundi",
    type: "Repos",
    nom: "Repos actif",
    objectif: "Récupération",
    contenu: "Off ou 30-40' Z1 + mobilité",
    estCle: false,
  });

  // MARDI - Séance Clé 1 (Priorité)
  const seance1 = seancesRecommandees[0];
  semaine.push({
    jour: "Mardi",
    type: seance1.code,
    nom: seance1.nom,
    objectif: seance1.objectif,
    intensite: seance1.intensite,
    duree: seance1.duree,
    format: seance1.format,
    description: seance1.description,
    estCle: true,
  });

  // MERCREDI - Endurance
  semaine.push({
    jour: "Mercredi",
    type: "Z2",
    nom: "Endurance fondamentale",
    objectif: "Base aérobie",
    contenu: "1h15-1h45 Z2",
    intensite: "65-75% FTP",
    estCle: false,
  });

  // JEUDI - Séance Clé 2 (Priorité secondaire)
  const seance2 = seancesRecommandees[1] || seancesRecommandees[0];
  semaine.push({
    jour: "Jeudi",
    type: seance2.code,
    nom: seance2.nom,
    objectif: seance2.objectif,
    intensite: seance2.intensite,
    duree: seance2.duree,
    format: seance2.format,
    description: seance2.description,
    estCle: true,
  });

  // VENDREDI - Repos actif
  semaine.push({
    jour: "Vendredi",
    type: "Z1",
    nom: "Repos actif",
    objectif: "Fraîcheur",
    contenu: "45' Z1 + gainage",
    intensite: "< 65% FTP",
    estCle: false,
  });

  // SAMEDI - Spécifique course (D1)
  const seanceD1 = SEANCES["D1"];
  semaine.push({
    jour: "Samedi",
    type: "D1",
    nom: seanceD1.nom,
    objectif: seanceD1.objectif,
    intensite: seanceD1.intensite,
    duree: seanceD1.duree,
    description: seanceD1.description,
    estCle: true,
  });

  // DIMANCHE - Variable selon priorité/objectif
  if (priorite === "Maintenir équilibre" && athlete.objectif === "703") {
    const seanceC1 = SEANCES["C1"];
    semaine.push({
      jour: "Dimanche",
      type: "C1",
      nom: seanceC1.nom,
      objectif: seanceC1.objectif,
      intensite: seanceC1.intensite,
      format: seanceC1.format,
      description: seanceC1.description,
      estCle: false,
    });
  } else {
    semaine.push({
      jour: "Dimanche",
      type: "Long",
      nom: "Endurance longue",
      objectif: "Volume aérobie",
      contenu: "2h-3h Z2",
      intensite: "65-75% FTP",
      estCle: false,
    });
  }

  // Calcul volume estimé
  const volumeTotal = athlete.objectif === "IM" ? "12-16h" : "10-14h";
  const nbSeancesCles = semaine.filter(j => j.estCle).length;

  return {
    athleteNom: athlete.nom,
    objectif: athlete.objectif,
    priorite,
    vlamax,
    tte,
    semaine,
    volumeTotal,
    nbSeancesCles,
  };
}
