// =============================================
// STORE ATHLÈTES - Gestion multi-athlètes NOLIO
// =============================================

import { Athlete, defaultAthlete, getDernierSnapshot } from "@/types/athlete";
import { SnapshotNolio, creerSnapshotExemple, estimerTTE, estimerTTESport, scoreConfiance, calculerAgeSnapshot, calculerPrecision, VLamaxAvecConfiance, SportType } from "@/types/snapshotNolio";
import { ObjectifType, SexeType } from "@/types/athlete";
import { computeVLamaxBikeV2Enhanced, type VLamaxBikeV2EnhancedInput } from "@/lib/v2/vlamaxBikeV2Enhanced";
import { computeVLamaxRunV2Enhanced, type VLamaxRunV2EnhancedInput } from "@/lib/v2/vlamaxRunV2Enhanced";

// Storage key
const STORAGE_KEY = "vinceslab-athletes-data";

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

/**
 * Calculate VLamax from snapshot — V2 Pipeline (Mader + Score G + W')
 * 
 * Remplace l'ancienne formule legacy (index glycolytique + caps par objectif).
 * Délègue au moteur V2 Enhanced pour le vélo, conserve des formules
 * simplifiées pour course et natation (pas encore de modèle Mader running).
 * 
 * IMPORTANT: Aucun plafonnement par objectif — la VLamax est une mesure
 * physiologique indépendante de l'objectif de course.
 */
export function calculVLamaxSnapshot(snapshot: SnapshotNolio, objectif: ObjectifType): number {
  // Vélo — Pipeline V2 Enhanced (Mader + Score G + W')
  if (snapshot.sport === "vélo") {
    if (!snapshot.ftp || !snapshot.pmax_5s) return 0.25;
    
    const input: VLamaxBikeV2EnhancedInput = {
      ftp: snapshot.ftp,
      pmax_5s: snapshot.pmax_5s,
      p30s_w: snapshot.p30s_w ?? null,
      p60s_w: snapshot.p60s_w ?? null,
      map5min_w: snapshot.map5min_w ?? null,
      weight_kg: snapshot.poids,
      tte_min: estimerTTESport(snapshot),
      vo2max: snapshot.vo2max ?? null,
      protocol_quality: (snapshot.protocol_quality as 1|2|3|4|5) ?? undefined,
      objectif,
    };
    
    const result = computeVLamaxBikeV2Enhanced(input);
    return Number(result.value.toFixed(2));
  }
  
  // Course — Pipeline V2 Enhanced (VMA/Seuil + Score G puissance)
  if (snapshot.sport === "course") {
    const paceThresholdSec = snapshot.allure_seuil
      ? snapshot.allure_seuil * 60  // min/km → sec/km
      : null;
    
    const input: VLamaxRunV2EnhancedInput = {
      runPowerThreshold: snapshot.running_power_threshold ?? 0,
      runPower1s: snapshot.running_power_1s ?? null,
      runPower5s: snapshot.running_power_5s ?? null,
      runPower30s: snapshot.running_power_30s ?? null,
      runPower60s: snapshot.running_power_60s ?? null,
      runPower5min: snapshot.running_power_5min ?? null,
      tteMin: estimerTTESport(snapshot),
      weightKg: snapshot.poids ?? null,
      vma: snapshot.vma ?? null,
      paceThresholdSecPerKm: paceThresholdSec,
    };
    
    const result = computeVLamaxRunV2Enhanced(input);
    return Number(result.value.toFixed(2));
  }
  
  // Natation — formule avec pace 100m (pas de cap par objectif)
  if (snapshot.sport === "natation") {
    const pace100 = snapshot.pace100 || 2;
    const vlamax = 0.25 + 0.3 * (2 / pace100);
    return Math.max(0.20, Math.min(0.90, Number(vlamax.toFixed(2))));
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

// Create empty athlete (NO demo data)
export function creerAthleteVierge(
  nom: string,
  objectif: ObjectifType = "IM",
  sexe: SexeType = "M"
): Athlete {
  return {
    id: crypto.randomUUID(),
    nom: nom.trim() || "Nouvel athlète",
    sexe,
    objectif,
    masse_grasse: 0,
    historique: [],
    tests: [],
    refs: {
      fcMax: null,
      vma: null,
      ftp: null,
      css: null
    },
    vo2max: undefined
  };
}

// DEPRECATED: Returns empty array - no more demo athletes
export function creerAthleteExemple(): Athlete {
  return creerAthleteVierge("Nouvel athlète");
}

// DEPRECATED: Returns empty array - no more demo athletes
export function creerAthletesExempleMultiSport(): Athlete[] {
  console.warn("creerAthletesExempleMultiSport() is deprecated - demo data disabled");
  return [];
}

// Compare evolution for a specific sport
export function comparerEvolutionSport(athlete: Athlete, sport: SportType): ComparaisonEvolution[] {
  if (!athlete.historique || athlete.historique.length === 0) {
    return [];
  }

  return athlete.historique
    .filter((h) => h.sport === sport)
    .map((snapshot) => {
      const vlamax = calculVLamaxSnapshot(snapshot, athlete.objectif);
      const tte = estimerTTESport(snapshot);
      
      return {
        date: snapshot.date,
        ftp: snapshot.ftp || 0,
        vo2max: snapshot.vo2max || 0,
        vlamax,
        tte,
        confiance: scoreConfiance(snapshot),
      };
    });
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
