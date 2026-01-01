// =============================================
// GÉNÉRATEUR SEMAINE TYPE - Multi-Sport
// FIX 12: Filtrage par objectif + sports autorisés
// =============================================

import { Athlete, getDernierSnapshot } from "@/types/athlete";
import { estimerTTESport, SportType, SnapshotNolio } from "@/types/snapshotNolio";
import { calculVLamaxSnapshot } from "@/lib/athleteStore";
import { SEANCES, Seance, seancesParSport, determinerPriorite, PrioriteCoaching } from "@/types/seances";
import { getDernierSnapshotParSport } from "@/lib/raceReadiness";
import { 
  getAllowedSports, 
  isSportAllowed, 
  isRunningOnlyGoal as checkRunningOnly,
  isTriathlonGoal,
  type ProModules,
  type AllowedSport 
} from "@/lib/allowedSports";

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
  autoCorrige?: boolean; // ✅ FIX 12: badge "Auto-corrigé"
}

export interface SemaineType {
  athleteNom: string;
  objectif: string;
  priorite: PrioriteCoaching;
  vlamax: number;
  tte: number;
  semaine: JourSemaine[];
  volumeTotal: string;
  nbSeancesCles: number;
  sportsAutorises: AllowedSport[]; // ✅ FIX 12: affichage explicite
}

// ✅ FIX 12: Utilise allowedSports.ts
const isRunningOnlyGoal = (objectif: string): boolean => checkRunningOnly(objectif);

// Planning type multi-sport pour triathlon (IM, 703)
const PLANNING_MULTISPORT: Array<{ jour: string; sport: SportType; estCle: boolean }> = [
  { jour: "Lundi", sport: "natation", estCle: false },
  { jour: "Mardi", sport: "vélo", estCle: true },
  { jour: "Mercredi", sport: "course", estCle: false },
  { jour: "Jeudi", sport: "vélo", estCle: true },
  { jour: "Vendredi", sport: "natation", estCle: false },
  { jour: "Samedi", sport: "vélo", estCle: true },
  { jour: "Dimanche", sport: "course", estCle: true },
];

// Planning type running-only pour Semi/Marathon/Trail
const PLANNING_RUNNING: Array<{ jour: string; sport: SportType; estCle: boolean; type: "cle" | "endurance" | "recup" | "longue" | "repos" }> = [
  { jour: "Lundi", sport: "course", estCle: false, type: "repos" },
  { jour: "Mardi", sport: "course", estCle: true, type: "cle" },
  { jour: "Mercredi", sport: "course", estCle: false, type: "endurance" },
  { jour: "Jeudi", sport: "course", estCle: true, type: "cle" },
  { jour: "Vendredi", sport: "course", estCle: false, type: "recup" },
  { jour: "Samedi", sport: "course", estCle: false, type: "endurance" },
  { jour: "Dimanche", sport: "course", estCle: true, type: "longue" },
];

// Planning cross-training (course + vélo récup)
const PLANNING_CROSSTRAINING: Array<{ jour: string; sport: SportType; estCle: boolean; type: "cle" | "endurance" | "recup" | "longue" | "repos" | "velo_recup" }> = [
  { jour: "Lundi", sport: "course", estCle: false, type: "repos" },
  { jour: "Mardi", sport: "course", estCle: true, type: "cle" },
  { jour: "Mercredi", sport: "vélo", estCle: false, type: "velo_recup" }, // Vélo Z1/Z2 récup
  { jour: "Jeudi", sport: "course", estCle: true, type: "cle" },
  { jour: "Vendredi", sport: "course", estCle: false, type: "recup" },
  { jour: "Samedi", sport: "course", estCle: false, type: "endurance" },
  { jour: "Dimanche", sport: "course", estCle: true, type: "longue" },
];

// ✅ FIX 12: Générer la semaine type avec filtrage par objectif + modules Pro
export function genererSemaineType(
  athlete: Athlete, 
  proModules?: ProModules
): SemaineType | null {
  const snapshot = getDernierSnapshot(athlete);
  if (!snapshot) return null;

  // ✅ FIX 12: Calculer les sports autorisés
  const sportsAutorises = getAllowedSports(athlete.objectif, proModules);
  const runningOnly = isRunningOnlyGoal(athlete.objectif) && !proModules?.triathlon;
  const useCrossTraining = runningOnly && proModules?.crosstraining;

  // Calculer priorité depuis le snapshot course (pour running) ou vélo (pour triathlon)
  const sportPrincipal: SportType = runningOnly ? "course" : "vélo";
  const snapshotPrincipal = getDernierSnapshotParSport(athlete, sportPrincipal) || snapshot;
  const tte = estimerTTESport(snapshotPrincipal);
  const vlamax = calculVLamaxSnapshot(snapshotPrincipal, athlete.objectif);
  const priorite = determinerPriorite(vlamax, tte, athlete.objectif);

  const semaine: JourSemaine[] = [];

  // =============================================
  // RUNNING-ONLY: Semi, Marathon, Trail*
  // =============================================
  if (runningOnly) {
    const seancesCourse = seancesParSport(priorite, "course");

    for (const planning of PLANNING_RUNNING) {
      if (planning.type === "repos") {
        semaine.push({
          jour: planning.jour,
          sport: "course",
          type: "Repos",
          nom: "Repos actif",
          objectif: "Récupération",
          contenu: "Off ou mobilité / stretching",
          estCle: false,
        });
      } else if (planning.type === "longue") {
        // Sortie longue spécifique
        semaine.push({
          jour: planning.jour,
          sport: "course",
          type: "SL",
          nom: "Sortie Longue",
          objectif: "Endurance fondamentale",
          intensite: "Z2",
          duree: athlete.objectif === "Marathon" || athlete.objectif.includes("Ultra") ? "2h-3h" : "1h30-2h",
          format: "Continu",
          description: "Sortie longue en endurance fondamentale",
          estCle: true,
        });
      } else if (planning.type === "cle" && seancesCourse.length > 0) {
        // Séance clé - prendre la première recommandée
        const seance = seancesCourse[0];
        semaine.push({
          jour: planning.jour,
          sport: "course",
          type: seance.code,
          nom: seance.nom,
          objectif: seance.objectif,
          intensite: seance.intensite,
          duree: seance.duree,
          format: seance.format,
          description: seance.description,
          estCle: true,
        });
      } else if (planning.type === "recup") {
        semaine.push({
          jour: planning.jour,
          sport: "course",
          type: "Récup",
          nom: "Footing récup",
          objectif: "Récupération active",
          intensite: "Z1",
          duree: "30-40 min",
          format: "Continu facile",
          description: "Footing très léger en récupération",
          estCle: false,
        });
      } else {
        // Endurance
        semaine.push({
          jour: planning.jour,
          sport: "course",
          type: "EF",
          nom: "Endurance fondamentale",
          objectif: "Base aérobie",
          intensite: "Z2",
          duree: "45-60 min",
          format: "Continu",
          description: "Footing en endurance fondamentale",
          estCle: false,
        });
      }
    }
  } else {
    // =============================================
    // TRIATHLON: IM, 703 -> multi-sport
    // =============================================
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
  }

  // =============================================
  // ✅ FIX 12: GARDE-FOU FINAL - Filtrer sports non autorisés
  // =============================================
  semaine.forEach((jour) => {
    if (!isSportAllowed(jour.sport, athlete.objectif, proModules)) {
      // Remplacement intelligent selon le sport interdit
      if (jour.sport === "natation") {
        // Natation -> Course Z2 ou repos
        jour.sport = "course";
        jour.type = jour.estCle ? "EF" : "Récup";
        jour.nom = "Course (adapté)";
        jour.objectif = "Endurance active";
        jour.intensite = "Z2";
        jour.autoCorrige = true;
      } else if (jour.sport === "vélo") {
        // Vélo -> Course facile ou repos
        if (useCrossTraining && jour.intensite && ["Z1", "Z2"].some(z => jour.intensite?.includes(z))) {
          // Vélo récup autorisé en cross-training - on garde
        } else {
          jour.sport = "course";
          jour.type = jour.estCle ? "EF" : "Récup";
          jour.nom = "Course (adapté)";
          jour.objectif = "Récupération active";
          jour.intensite = "Z1-Z2";
          jour.autoCorrige = true;
        }
      }
    }
  });

  // Calcul volume estimé selon objectif
  const getVolumeEstime = () => {
    switch (athlete.objectif) {
      case "IM": return "14-18h";
      case "703": return "10-14h";
      case "Marathon": return "8-12h";
      case "Semi": return "6-10h";
      case "TrailShort": return "8-12h";
      case "Trail":
      case "TrailMountain": return "10-14h";
      case "TrailUltra": return "12-18h";
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
    sportsAutorises, // ✅ FIX 12
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
      case "TrailShort": return "8-12h";
      case "Trail":
      case "TrailMountain": return "10-14h";
      case "TrailUltra": return "12-18h";
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
    sportsAutorises: [sport as AllowedSport], // ✅ FIX 12: sport unique
  };
}
