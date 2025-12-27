// =============================================
// BIBLIOTHÈQUE DES SÉANCES D'ENTRAÎNEMENT
// Basée sur la méthodologie Dan Lorang
// =============================================

export type CodeSeance = "A1" | "A2" | "A3" | "B1" | "B2" | "C1" | "D1";

export interface Seance {
  code: CodeSeance;
  nom: string;
  objectif: string;
  intensite: string;
  duree?: string;
  format?: string;
  description: string;
  zone: "Z2" | "Sweet Spot" | "Threshold" | "VO2" | "Race Pace";
}

// Bibliothèque complète des séances
export const SEANCES: Record<CodeSeance, Seance> = {
  A1: {
    code: "A1",
    nom: "Endurance Fondamentale",
    objectif: "VLamax ↓",
    intensite: "78–82% FTP",
    duree: "60–120 min",
    description: "Travail aérobie pur pour réduire la capacité glycolytique. Cadence libre, respiration nasale possible.",
    zone: "Z2",
  },
  A2: {
    code: "A2",
    nom: "Sweet Spot Progressif",
    objectif: "VLamax ↓ / TTE ↑",
    intensite: "84–88% FTP",
    format: "3x20 → 2x30 → 1x60",
    description: "Travail au sweet spot avec blocs progressifs. Excellent pour baisser VLamax tout en augmentant l'endurance au seuil.",
    zone: "Sweet Spot",
  },
  A3: {
    code: "A3",
    nom: "Tempo sous Fatigue",
    objectif: "Tempo sous fatigue",
    intensite: "80–82% FTP",
    format: "Z2 + Tempo",
    description: "Longue sortie Z2 suivie de blocs tempo. Simule les conditions de fin de course Ironman.",
    zone: "Sweet Spot",
  },
  B1: {
    code: "B1",
    nom: "Threshold Blocs",
    objectif: "TTE ↑",
    intensite: "95–100% FTP",
    format: "3x20 → 2x30",
    description: "Travail au seuil lactique pour augmenter le Time to Exhaustion. Récupération 5-8 min entre les blocs.",
    zone: "Threshold",
  },
  B2: {
    code: "B2",
    nom: "Over-Under Doux",
    objectif: "Seuil stable",
    intensite: "95–102% FTP",
    format: "Over-Under doux",
    description: "Alternance au-dessus et en-dessous du seuil pour améliorer la clearance lactate sans trop stimuler VLamax.",
    zone: "Threshold",
  },
  C1: {
    code: "C1",
    nom: "VO2max Maintien",
    objectif: "VO2 maintien",
    intensite: "110–115% FTP",
    format: "8–12x1'",
    description: "Intervalles courts à haute intensité pour maintenir le VO2max. À utiliser avec parcimonie pour éviter hausse VLamax.",
    zone: "VO2",
  },
  D1: {
    code: "D1",
    nom: "Race Pace IM",
    objectif: "Race Pace IM",
    intensite: "72–78% FTP",
    duree: "2h30–4h30",
    description: "Simulation allure course Ironman. Travail en nutrition et hydratation inclus.",
    zone: "Race Pace",
  },
};

// Types de priorités
export type PrioriteCoaching = "Réduire VLamax" | "Augmenter TTE" | "Maintenir équilibre";

// Mapping priorité → séances recommandées
export function seancesParPriorite(priorite: PrioriteCoaching): Seance[] {
  const codes: CodeSeance[] = (() => {
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

  return codes.map(code => SEANCES[code]);
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
