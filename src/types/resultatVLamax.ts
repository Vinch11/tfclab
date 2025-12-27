import { TestMetabolique } from "./testMetabolique";

export interface ResultatVLamax {
  vlamax: number;           // VLamax en mmol/L/s
  ig: number;               // Indice Glycolytique (valeur brute du calcul)
  confiance: number;        // Niveau de confiance (0-1, ex: 0.8 = 80%)
  delta_6sem: number;       // Variation sur 6 semaines (différence absolue)
  historique?: number[];    // Historique des valeurs VLamax
  // Additional computed fields
  profil?: "diesel" | "endurant" | "equilibre" | "explosif" | "sprinter";
  fatmax?: number;          // Puissance FatMax estimée (W)
  carbomax?: number;        // Puissance CarboMax estimée (W)
  crossover?: number;       // Point de crossover (%FTP)
  dateCalcul?: string;
}

export const defaultResultatVLamax: ResultatVLamax = {
  vlamax: 0,
  ig: 0,
  confiance: 0,
  delta_6sem: 0,
  historique: [],
};

/**
 * Calcul VLamax selon la formule fournie
 * 
 * IG = (0.4 * G) + (0.35 * (R / poids)) - (0.25 * O) - (0.3 * T)
 * où:
 *   G = pmax_5s / poids
 *   O = cp / poids  
 *   R = (pmax_5s - cp) * 6
 *   T = tte / 40
 * 
 * VLamax = 0.25 + (IG * 0.45), borné entre 0.25 et 1.0
 */
export const calculVLamax = (
  test: TestMetabolique,
  poids: number,
  vlamax_6sem_avant?: number
): ResultatVLamax => {
  if (!test.pmax_5s || !test.cp || !poids) {
    return defaultResultatVLamax;
  }

  // Calcul des composantes
  const G = test.pmax_5s / poids;           // Puissance glycolytique relative
  const O = test.cp / poids;                 // Puissance oxydative relative
  const R = (test.pmax_5s - test.cp) * 6;   // Réserve anaérobie
  const T = (test.tte || 3600) / 40;         // Facteur temps (default 1h si non défini)

  // Calcul IG (Indice Glycolytique)
  const IG = (0.4 * G) + (0.35 * (R / poids)) - (0.25 * O) - (0.3 * T);

  // Conversion IG -> VLamax
  let vlamax = 0.25 + (IG * 0.45);
  if (vlamax < 0.25) vlamax = 0.25;
  if (vlamax > 1.0) vlamax = 1.0;

  // Variation 6 semaines (différence absolue)
  const delta_6sem = vlamax_6sem_avant ? vlamax - vlamax_6sem_avant : 0;

  // Confiance par défaut (peut être adaptée selon la qualité des données)
  const confiance = 0.8;

  // Détermination du profil athlète
  let profil: ResultatVLamax["profil"];
  if (vlamax < 0.35) profil = "diesel";
  else if (vlamax < 0.45) profil = "endurant";
  else if (vlamax < 0.55) profil = "equilibre";
  else if (vlamax < 0.65) profil = "explosif";
  else profil = "sprinter";

  // Estimation FatMax (zone oxydation lipidique max)
  const fatmaxPercent = 0.55 + (0.65 - vlamax) * 0.3;
  const fatmax = Math.round(test.cp * fatmaxPercent);

  // Estimation CarboMax (transition glucidique)
  const carbomaxPercent = 0.75 + (0.50 - vlamax) * 0.2;
  const carbomax = Math.round(test.cp * Math.min(0.95, carbomaxPercent));

  // Point de crossover
  const crossover = Math.round((fatmaxPercent + carbomaxPercent) / 2 * 100);

  return {
    vlamax: parseFloat(vlamax.toFixed(3)),
    ig: parseFloat(IG.toFixed(3)),
    confiance,
    delta_6sem: parseFloat(delta_6sem.toFixed(3)),
    profil,
    fatmax,
    carbomax,
    crossover,
    dateCalcul: new Date().toISOString(),
  };
};

// Legacy function for backward compatibility (uses simplified inputs)
export const computeResultatVLamax = (
  ftp: number,
  poids: number,
  vo2max: number,
  pmax5s: number,
  previousVlamax?: number,
  tte: number = 3600
): ResultatVLamax => {
  // Create a test object from individual values
  const test: TestMetabolique = {
    id: "temp",
    date: new Date().toISOString(),
    pmax_5s: pmax5s,
    cp: ftp,
    tte: tte,
  };
  
  return calculVLamax(test, poids, previousVlamax);
};

// Get profile label in French
export const getProfilLabel = (profil: ResultatVLamax["profil"]): string => {
  switch (profil) {
    case "diesel": return "Diesel Ultra-Endurant";
    case "endurant": return "Endurant";
    case "equilibre": return "Équilibré";
    case "explosif": return "Explosif";
    case "sprinter": return "Sprinter";
    default: return "Non défini";
  }
};

// Get profile color
export const getProfilColor = (profil: ResultatVLamax["profil"]): string => {
  switch (profil) {
    case "diesel": return "text-blue-400";
    case "endurant": return "text-primary";
    case "equilibre": return "text-success";
    case "explosif": return "text-accent";
    case "sprinter": return "text-purple-400";
    default: return "text-muted-foreground";
  }
};

// Recommendations based on VLamax and objective
export const getRecommendations = (
  resultat: ResultatVLamax,
  objectif: "IM" | "703"
): string[] => {
  const recs: string[] = [];

  if (objectif === "IM") {
    // Ironman needs lower VLamax for fat oxidation
    if (resultat.vlamax > 0.45) {
      recs.push("Réduire le VLamax avec des sorties longues Z2 (4-6h)");
      recs.push("Éviter les efforts glycolytiques intenses (sprints, intervalles courts)");
      recs.push("Privilégier les séances tempo longues (sweet spot 2x30-40min)");
    } else if (resultat.vlamax > 0.35) {
      recs.push("VLamax correct pour IM, continuer les sorties longues");
      recs.push("Ajouter des séances au seuil pour améliorer le CP");
    } else {
      recs.push("Excellent profil Ironman! VLamax optimal");
      recs.push("Focus sur la VO2max pour gagner en puissance absolue");
    }
  } else {
    // 70.3 can tolerate slightly higher VLamax
    if (resultat.vlamax > 0.55) {
      recs.push("Réduire légèrement le VLamax pour 70.3");
      recs.push("Sorties longues Z2 (3-4h) + tempo");
    } else if (resultat.vlamax < 0.35) {
      recs.push("VLamax un peu bas pour 70.3, ajouter quelques sprints");
      recs.push("Intervalles courts (30s-1min) pour stimuler la glycolyse");
    } else {
      recs.push("Profil équilibré pour 70.3");
      recs.push("Travailler la puissance au seuil et la VO2max");
    }
  }

  return recs;
};
