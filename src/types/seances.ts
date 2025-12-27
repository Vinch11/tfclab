// =============================================
// BIBLIOTHÈQUE DES SÉANCES D'ENTRAÎNEMENT
// Multi-sport: Vélo / Course / Natation
// Basée sur la méthodologie Dan Lorang
// =============================================

import { SportType } from "@/types/snapshotNolio";

export type CodeSeanceVelo = "A1" | "A2" | "A3" | "B1" | "B2" | "C1" | "D1";
export type CodeSeanceCourse = "R1" | "R2" | "R3" | "R4";
export type CodeSeanceNatation = "N1" | "N2" | "N3";
export type CodeSeance = CodeSeanceVelo | CodeSeanceCourse | CodeSeanceNatation;

export interface Seance {
  code: CodeSeance;
  nom: string;
  sport: SportType;
  objectif: string;
  intensite: string;
  duree?: string;
  format?: string;
  description: string;
  zone: "Z2" | "Sweet Spot" | "Threshold" | "VO2" | "Race Pace" | "Technique";
}

// Bibliothèque complète des séances - VÉLO
export const SEANCES_VELO: Record<CodeSeanceVelo, Seance> = {
  A1: {
    code: "A1",
    nom: "Endurance Fondamentale",
    sport: "vélo",
    objectif: "VLamax ↓",
    intensite: "78–82% FTP",
    duree: "60–120 min",
    description: "Travail aérobie pur pour réduire la capacité glycolytique. Cadence libre, respiration nasale possible.",
    zone: "Z2",
  },
  A2: {
    code: "A2",
    nom: "Sweet Spot Progressif",
    sport: "vélo",
    objectif: "VLamax ↓ / TTE ↑",
    intensite: "84–88% FTP",
    format: "3x20 → 2x30 → 1x60",
    description: "Travail au sweet spot avec blocs progressifs. Excellent pour baisser VLamax tout en augmentant l'endurance au seuil.",
    zone: "Sweet Spot",
  },
  A3: {
    code: "A3",
    nom: "Tempo sous Fatigue",
    sport: "vélo",
    objectif: "Tempo sous fatigue",
    intensite: "80–82% FTP",
    format: "Z2 + Tempo",
    description: "Longue sortie Z2 suivie de blocs tempo. Simule les conditions de fin de course Ironman.",
    zone: "Sweet Spot",
  },
  B1: {
    code: "B1",
    nom: "Threshold Blocs",
    sport: "vélo",
    objectif: "TTE ↑",
    intensite: "95–100% FTP",
    format: "3x20 → 2x30",
    description: "Travail au seuil lactique pour augmenter le Time to Exhaustion. Récupération 5-8 min entre les blocs.",
    zone: "Threshold",
  },
  B2: {
    code: "B2",
    nom: "Over-Under Doux",
    sport: "vélo",
    objectif: "Seuil stable",
    intensite: "95–102% FTP",
    format: "Over-Under doux",
    description: "Alternance au-dessus et en-dessous du seuil pour améliorer la clearance lactate sans trop stimuler VLamax.",
    zone: "Threshold",
  },
  C1: {
    code: "C1",
    nom: "VO2max Maintien",
    sport: "vélo",
    objectif: "VO2 maintien",
    intensite: "110–115% FTP",
    format: "8–12x1'",
    description: "Intervalles courts à haute intensité pour maintenir le VO2max. À utiliser avec parcimonie pour éviter hausse VLamax.",
    zone: "VO2",
  },
  D1: {
    code: "D1",
    nom: "Race Pace IM",
    sport: "vélo",
    objectif: "Race Pace IM",
    intensite: "72–78% FTP",
    duree: "2h30–4h30",
    description: "Simulation allure course Ironman. Travail en nutrition et hydratation inclus.",
    zone: "Race Pace",
  },
};

// Bibliothèque des séances - COURSE
export const SEANCES_COURSE: Record<CodeSeanceCourse, Seance> = {
  R1: {
    code: "R1",
    nom: "Seuil 10km",
    sport: "course",
    objectif: "TTE ↑",
    intensite: "90–95% VMA",
    duree: "40–60 min",
    description: "Travail au seuil pour améliorer l'endurance à haute intensité. Idéal pour préparer le segment course.",
    zone: "Threshold",
  },
  R2: {
    code: "R2",
    nom: "Endurance Longue",
    sport: "course",
    objectif: "VLamax ↓",
    intensite: "70–75% VMA",
    duree: "60–90 min",
    description: "Sortie longue en endurance fondamentale. Travail aérobie et économie de course.",
    zone: "Z2",
  },
  R3: {
    code: "R3",
    nom: "Fractionné VO2",
    sport: "course",
    objectif: "VO2 maintien",
    intensite: "100–105% VMA",
    format: "6–10x400m",
    description: "Intervalles courts pour développer et maintenir le VO2max. Récupération trot.",
    zone: "VO2",
  },
  R4: {
    code: "R4",
    nom: "Allure Course IM",
    sport: "course",
    objectif: "Race Pace",
    intensite: "80–85% VMA",
    duree: "45–75 min",
    description: "Simulation allure marathon Ironman. Focus sur l'économie et la régularité.",
    zone: "Race Pace",
  },
};

// Bibliothèque des séances - NATATION
export const SEANCES_NATATION: Record<CodeSeanceNatation, Seance> = {
  N1: {
    code: "N1",
    nom: "Technique + Endurance",
    sport: "natation",
    objectif: "Technique",
    intensite: "Z2",
    duree: "45–60 min",
    description: "Travail technique avec éducatifs et endurance aérobie. Focus sur l'efficacité du mouvement.",
    zone: "Technique",
  },
  N2: {
    code: "N2",
    nom: "Sprint / VO2max",
    sport: "natation",
    objectif: "VO2 maintien",
    intensite: "Z4–Z5",
    format: "8x50–100m",
    description: "Séries courtes à haute intensité pour développer la puissance et le VO2max en natation.",
    zone: "VO2",
  },
  N3: {
    code: "N3",
    nom: "CSS Endurance",
    sport: "natation",
    objectif: "TTE ↑",
    intensite: "CSS",
    format: "5–8x200m",
    description: "Travail au seuil critique de nage. Améliore la capacité à maintenir une allure soutenue.",
    zone: "Threshold",
  },
};

// Toutes les séances combinées
export const SEANCES: Record<CodeSeance, Seance> = {
  ...SEANCES_VELO,
  ...SEANCES_COURSE,
  ...SEANCES_NATATION,
};

// Types de priorités
export type PrioriteCoaching = "Réduire VLamax" | "Augmenter TTE" | "Maintenir équilibre";

// Mapping priorité → séances recommandées par sport
export function seancesParSport(priorite: PrioriteCoaching, sport: SportType): Seance[] {
  if (sport === "vélo") {
    return seancesParPriorite(priorite);
  }
  
  if (sport === "course") {
    const codes: CodeSeanceCourse[] = (() => {
      switch (priorite) {
        case "Réduire VLamax":
          return ["R2", "R4"];
        case "Augmenter TTE":
          return ["R1", "R4"];
        case "Maintenir équilibre":
        default:
          return ["R2", "R1", "R3"];
      }
    })();
    return codes.map(code => SEANCES_COURSE[code]);
  }
  
  if (sport === "natation") {
    const codes: CodeSeanceNatation[] = (() => {
      switch (priorite) {
        case "Réduire VLamax":
          return ["N1", "N3"];
        case "Augmenter TTE":
          return ["N3", "N1"];
        case "Maintenir équilibre":
        default:
          return ["N1", "N2", "N3"];
      }
    })();
    return codes.map(code => SEANCES_NATATION[code]);
  }
  
  return [];
}

// Mapping priorité → séances recommandées (vélo par défaut)
export function seancesParPriorite(priorite: PrioriteCoaching): Seance[] {
  const codes: CodeSeanceVelo[] = (() => {
    switch (priorite) {
      case "Réduire VLamax":
        return ["A1", "A2", "A3"];
      case "Augmenter TTE":
        return ["B1", "B2", "A2"];
      case "Maintenir équilibre":
      default:
        return ["A1", "D1", "C1"];
    }
  })();

  return codes.map(code => SEANCES_VELO[code]);
}

// Déterminer la priorité coaching
export function determinerPriorite(
  vlamax: number,
  tte: number,
  objectif: "IM" | "703"
): PrioriteCoaching {
  if (objectif === "IM" && vlamax > 0.40) return "Réduire VLamax";
  if (objectif === "703" && vlamax > 0.45) return "Réduire VLamax";
  if (tte < 55) return "Augmenter TTE";
  return "Maintenir équilibre";
}
