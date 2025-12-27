// =============================================
// STORE ATHLÈTES - Gestion multi-athlètes NOLIO
// =============================================

import { Athlete, defaultAthlete, getDernierSnapshot } from "@/types/athlete";
import { SnapshotNolio, creerSnapshotExemple, estimerTTE, estimerTTESport, scoreConfiance, calculerAgeSnapshot, calculerPrecision, VLamaxAvecConfiance } from "@/types/snapshotNolio";
import { ObjectifType, SexeType } from "@/types/athlete";

// Storage key
const STORAGE_KEY = "loranglab-athletes-data";

// Create new athlete
export function creerAthlete(
  id: string,
  nom: string,
  sexe: SexeType,
  objectif: ObjectifType,
  masse_grasse: number
): Athlete {
  return {
    id,
    nom,
    sexe,
    objectif,
    masse_grasse,
    historique: [],
  };
}

// Load all athletes from localStorage
export function chargerAthletes(): Athlete[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Erreur chargement athlètes:", e);
  }
  return [];
}

// Save all athletes to localStorage
export function sauvegarderAthletes(athletes: Athlete[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(athletes));
}

// Add athlete to collection
export function ajouterAthlete(
  athletes: Athlete[],
  athlete: Athlete
): Athlete[] {
  return [...athletes, athlete];
}

// Remove athlete from collection
export function supprimerAthlete(
  athletes: Athlete[],
  athleteId: string
): Athlete[] {
  return athletes.filter((a) => a.id !== athleteId);
}

// Update athlete in collection
export function mettreAJourAthlete(
  athletes: Athlete[],
  updatedAthlete: Athlete
): Athlete[] {
  return athletes.map((a) =>
    a.id === updatedAthlete.id ? updatedAthlete : a
  );
}

// Add snapshot to athlete
export function ajouterSnapshot(
  athletes: Athlete[],
  athleteId: string,
  snapshot: SnapshotNolio
): Athlete[] {
  return athletes.map((a) => {
    if (a.id === athleteId) {
      return {
        ...a,
        historique: [...(a.historique || []), snapshot],
      };
    }
    return a;
  });
}

// Remove snapshot from athlete
export function supprimerSnapshot(
  athletes: Athlete[],
  athleteId: string,
  snapshotId: string
): Athlete[] {
  return athletes.map((a) => {
    if (a.id === athleteId) {
      return {
        ...a,
        historique: a.historique.filter((s) => s.id !== snapshotId),
      };
    }
    return a;
  });
}

// Compare evolution for an athlete
export interface ComparaisonEvolution {
  date: string;
  ftp: number;
  vo2max: number;
  vlamax: number;
  tte: number;
  confiance: number;
}

export function comparerEvolution(athlete: Athlete, objectif: ObjectifType): ComparaisonEvolution[] {
  if (!athlete.historique || athlete.historique.length === 0) {
    return [];
  }

  return athlete.historique.map((snapshot) => {
    const vlamax = calculVLamaxSnapshot(snapshot, objectif);
    const tte = estimerTTE(snapshot.ftp, snapshot.tss_7j);
    
    return {
      date: snapshot.date,
      ftp: snapshot.ftp,
      vo2max: snapshot.vo2max || 0,
      vlamax,
      tte,
      confiance: scoreConfiance(snapshot),
    };
  });
}

// Calculate VLamax from snapshot - Multi-sport (Phase 1 Base Solide)
export function calculVLamaxSnapshot(snapshot: SnapshotNolio, objectif: ObjectifType): number {
  // Vélo - formule complète avec index glycolytique
  if (snapshot.sport === "vélo") {
    if (!snapshot.ftp || !snapshot.pmax_5s) return 0.25;
    
    const G = snapshot.pmax_5s / snapshot.poids;
    const O = snapshot.ftp / snapshot.poids;
    const TTE = estimerTTESport(snapshot) / 60;

    const indexGlyco = (0.45 * G) - (0.30 * O) - (0.25 * TTE);
    let vlamax = 0.25 + (indexGlyco * 0.45);

    if (objectif === "IM") vlamax = Math.min(vlamax, 0.45);
    if (objectif === "703") vlamax = Math.min(vlamax, 0.55);

    return Math.max(0.25, Number(vlamax.toFixed(2)));
  }
  
  // Course - formule avec VMA et correction TTE
  if (snapshot.sport === "course") {
    const vma = snapshot.vma || 15;
    const tte = estimerTTESport(snapshot);
    const vlamax = 0.25 + 0.4 * ((vma / 20) - 0.7) - 0.1 * (tte / 60);
    return Math.max(0.25, Number(vlamax.toFixed(2)));
  }
  
  // Natation - formule avec pace 100m
  if (snapshot.sport === "natation") {
    const pace100 = snapshot.pace100 || 2;
    const vlamax = 0.25 + 0.3 * (2 / pace100);
    return Math.max(0.25, Number(vlamax.toFixed(2)));
  }
  
  return 0.25;
}

// Calculate VLamax with confidence and precision - Multi-sport
export function calculVLamaxAvecConfiance(snapshot: SnapshotNolio, objectif: ObjectifType): VLamaxAvecConfiance {
  const vlamax = calculVLamaxSnapshot(snapshot, objectif);
  const confiance = scoreConfiance(snapshot);
  const precision = calculerPrecision(confiance);
  const ageSnapshot = calculerAgeSnapshot(snapshot.date);
  
  return {
    vlamax,
    confiance,
    precision,
    ageSnapshot
  };
}

// Get VLamax history for athlete
export function getHistoriqueVlamax(athlete: Athlete): number[] {
  if (!athlete.historique || athlete.historique.length === 0) {
    return [];
  }

  return athlete.historique.map((snapshot) => 
    calculVLamaxSnapshot(snapshot, athlete.objectif)
  );
}

// Create example athlete with snapshot data
export function creerAthleteExemple(): Athlete {
  const athlete = creerAthlete(
    crypto.randomUUID(),
    "Athlète Exemple",
    "M",
    "IM",
    18
  );

  // Add example snapshots - multi-sport
  athlete.historique = [
    {
      id: crypto.randomUUID(),
      date: "2025-01-15",
      sport: "vélo",
      ftp: 280,
      pmax_5s: 1050,
      poids: 70,
      vo2max: 52,
      hrv: 60,
      fc_max: 190,
      fc_repos: 50,
      tss_7j: 450,
      tss_28j: 1800,
      source: "nolio",
    },
    {
      id: crypto.randomUUID(),
      date: "2025-03-10",
      sport: "course",
      poids: 70,
      vma: 17.5,
      allure_seuil: 4.3,
      vo2max: 53,
      hrv: 58,
      source: "nolio",
    },
    {
      id: crypto.randomUUID(),
      date: "2025-04-05",
      sport: "natation",
      poids: 70,
      pace100: 98,
      css: 1.65,
      vo2max: 50,
      source: "nolio",
    },
    {
      id: crypto.randomUUID(),
      date: "2025-06-20",
      sport: "vélo",
      ftp: 295,
      pmax_5s: 1070,
      poids: 69,
      vo2max: 54,
      hrv: 65,
      fc_max: 190,
      fc_repos: 48,
      tss_7j: 550,
      tss_28j: 2200,
      source: "nolio",
    },
  ];

  return athlete;
}

// Dashboard data for an athlete
export interface DashboardData {
  athleteNom: string;
  objectif: ObjectifType;
  dateTest: string;
  vlamax: number;
  ftp_kg: number;
  vo2max: number;
  tte: number;
  priorite: string;
  seancesRecommandees: string[];
  confianceDonnees: number;
}

export function getDashboardData(athlete: Athlete): DashboardData | null {
  const snapshot = getDernierSnapshot(athlete);
  if (!snapshot) return null;

  const vlamax = calculVLamaxSnapshot(snapshot, athlete.objectif);
  const tte = estimerTTE(snapshot.ftp, snapshot.tss_7j);
  const ftp_kg = snapshot.ftp / snapshot.poids;

  // Determine priority
  let priorite = "Maintenir équilibre";
  if (athlete.objectif === "IM" && vlamax > 0.40) priorite = "Réduire VLamax";
  else if (athlete.objectif === "703" && vlamax > 0.45) priorite = "Réduire VLamax";
  else if (tte < 55) priorite = "Augmenter TTE";

  // Get recommended sessions
  let seances: string[] = [];
  if (priorite === "Réduire VLamax") seances = ["A1", "A2", "A3"];
  else if (priorite === "Augmenter TTE") seances = ["B1", "B2", "A2"];
  else seances = ["A1", "D1", "C1"];

  return {
    athleteNom: athlete.nom,
    objectif: athlete.objectif,
    dateTest: snapshot.date,
    vlamax,
    ftp_kg: Number(ftp_kg.toFixed(2)),
    vo2max: snapshot.vo2max || 0,
    tte,
    priorite,
    seancesRecommandees: seances,
    confianceDonnees: scoreConfiance(snapshot),
  };
}
