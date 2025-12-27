// =============================================
// GÉNÉRATEUR SEMAINE TYPE - Multi-Sport
// =============================================

import { Athlete, getDernierSnapshot } from "@/types/athlete";
import { estimerTTESport, SportType, SnapshotNolio } from "@/types/snapshotNolio";
import { calculVLamaxSnapshot } from "@/lib/athleteStore";
import { SEANCES, Seance, seancesParSport, determinerPriorite, PrioriteCoaching } from "@/types/seances";
import { getDernierSnapshotParSport } from "@/lib/raceReadiness";

export interface JourSemaine {
  jour: string;
  sport: SportType;
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
  objectif: "IM" | "703" | "Marathon" | "Semi";
  priorite: PrioriteCoaching;
  vlamax: number;
  tte: number;
  semaine: JourSemaine[];
  volumeTotal: string;
  nbSeancesCles: number;
}

// Planning type multi-sport pour la semaine
const PLANNING_MULTISPORT: Array<{ jour: string; sport: SportType; estCle: boolean }> = [
  { jour: "Lundi", sport: "natation", estCle: false },
  { jour: "Mardi", sport: "vélo", estCle: true },
  { jour: "Mercredi", sport: "course", estCle: false },
  { jour: "Jeudi", sport: "vélo", estCle: true },
  { jour: "Vendredi", sport: "natation", estCle: false },
  { jour: "Samedi", sport: "vélo", estCle: true },
  { jour: "Dimanche", sport: "course", estCle: true },
];

// Générer la semaine type Multi-Sport
export function genererSemaineType(athlete: Athlete): SemaineType | null {
  const snapshot = getDernierSnapshot(athlete);
  if (!snapshot) return null;

  // Calculer priorité depuis le dernier snapshot vélo (principal)
  const snapshotVelo = getDernierSnapshotParSport(athlete, "vélo") || snapshot;
  const tte = estimerTTESport(snapshotVelo);
  const vlamax = calculVLamaxSnapshot(snapshotVelo, athlete.objectif);
  const priorite = determinerPriorite(vlamax, tte, athlete.objectif);

  const semaine: JourSemaine[] = [];

  for (const planning of PLANNING_MULTISPORT) {
    const sportSnapshot = getDernierSnapshotParSport(athlete, planning.sport);
    const sportPriorite = sportSnapshot 
      ? determinerPriorite(
          calculVLamaxSnapshot(sportSnapshot, athlete.objectif),
          estimerTTESport(sportSnapshot),
          athlete.objectif
        )
      : priorite;

    const seancesRecommandees = seancesParSport(sportPriorite, planning.sport);

    if (planning.estCle && seancesRecommandees.length > 0) {
      // Séance clé - prendre la première recommandée
      const seance = seancesRecommandees[0];
      semaine.push({
        jour: planning.jour,
        sport: planning.sport,
        type: seance.code,
        nom: seance.nom,
        objectif: seance.objectif,
        intensite: seance.intensite,
        duree: seance.duree,
        format: seance.format,
        description: seance.description,
        estCle: true,
      });
    } else if (seancesRecommandees.length > 0) {
      // Séance secondaire ou récup
      const seance = seancesRecommandees[seancesRecommandees.length > 1 ? 1 : 0];
      semaine.push({
        jour: planning.jour,
        sport: planning.sport,
        type: seance.code,
        nom: seance.nom,
        objectif: seance.objectif,
        intensite: seance.intensite,
        duree: seance.duree,
        format: seance.format,
        description: seance.description,
        estCle: false,
      });
    } else {
      // Pas de données pour ce sport - séance générique
      semaine.push({
        jour: planning.jour,
        sport: planning.sport,
        type: "Z2",
        nom: `Endurance ${planning.sport}`,
        objectif: "Base aérobie",
        contenu: "45-60 min Z2",
        estCle: false,
      });
    }
  }

  // Calcul volume estimé selon objectif
  const getVolumeEstime = () => {
    switch (athlete.objectif) {
      case "IM": return "14-18h";
      case "703": return "10-14h";
      case "Marathon": return "8-12h";
      case "Semi": return "6-10h";
      default: return "10-14h";
    }
  };
  const volumeTotal = getVolumeEstime();
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

// Générer semaine type pour un sport spécifique
export function genererSemaineTypeSport(athlete: Athlete, sport: SportType): SemaineType | null {
  const snapshot = getDernierSnapshotParSport(athlete, sport);
  if (!snapshot) return null;

  const tte = estimerTTESport(snapshot);
  const vlamax = calculVLamaxSnapshot(snapshot, athlete.objectif);
  const priorite = determinerPriorite(vlamax, tte, athlete.objectif);
  const seancesRecommandees = seancesParSport(priorite, sport);

  const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const semaine: JourSemaine[] = [];

  for (let i = 0; i < 7; i++) {
    const estCle = i === 1 || i === 3 || i === 5; // Mardi, Jeudi, Samedi
    const seanceIndex = estCle ? (i % seancesRecommandees.length) : (seancesRecommandees.length - 1);
    const seance = seancesRecommandees[seanceIndex] || seancesRecommandees[0];

    if (i === 0 || i === 4) {
      // Lundi et Vendredi - repos
      semaine.push({
        jour: jours[i],
        sport,
        type: "Repos",
        nom: "Repos actif",
        objectif: "Récupération",
        contenu: "Off ou mobilité",
        estCle: false,
      });
    } else if (seance) {
      semaine.push({
        jour: jours[i],
        sport,
        type: seance.code,
        nom: seance.nom,
        objectif: seance.objectif,
        intensite: seance.intensite,
        duree: seance.duree,
        format: seance.format,
        description: seance.description,
        estCle,
      });
    }
  }

  const getVolumeEstimeSport = () => {
    switch (athlete.objectif) {
      case "IM": return "12-16h";
      case "703": return "10-14h";
      case "Marathon": return "8-12h";
      case "Semi": return "6-10h";
      default: return "10-14h";
    }
  };
  const volumeTotal = getVolumeEstimeSport();
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
