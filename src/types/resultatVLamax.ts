export interface ResultatVLamax {
  vlamax: number;           // VLamax en mmol/L/s
  ig: number;               // Indice Glycolytique (0-100)
  confiance: number;        // Niveau de confiance (0-100%)
  delta_6sem: number;       // Variation sur 6 semaines en %
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
};

// Compute VLamax result from athlete data and test history
export const computeResultatVLamax = (
  ftp: number,
  poids: number,
  vo2max: number,
  pmax5s: number,
  previousVlamax?: number
): ResultatVLamax => {
  if (!ftp || !poids || !pmax5s) {
    return defaultResultatVLamax;
  }

  const ftpWkg = ftp / poids;
  const pmaxWkg = pmax5s / poids;
  const anaerobicRatio = pmaxWkg / ftpWkg;

  // VLamax estimation (simplified model based on power profile)
  const vlamax = Math.max(0.2, Math.min(0.9, 0.15 + (anaerobicRatio - 2.5) * 0.15));

  // Indice Glycolytique: higher VLamax = higher glycolytic reliance
  // IG = 0-100 scale, 50 being balanced
  const ig = Math.round(Math.min(100, Math.max(0, (vlamax - 0.2) / 0.7 * 100)));

  // Confidence score based on data completeness
  let confiance = 50; // Base confidence
  if (ftp > 0) confiance += 15;
  if (poids > 0) confiance += 10;
  if (vo2max > 0) confiance += 15;
  if (pmax5s > 0) confiance += 10;
  confiance = Math.min(100, confiance);

  // Delta 6 weeks calculation
  const delta_6sem = previousVlamax && previousVlamax > 0
    ? Math.round(((vlamax - previousVlamax) / previousVlamax) * 100)
    : 0;

  // Determine athlete profile
  let profil: ResultatVLamax["profil"];
  if (vlamax < 0.30) profil = "diesel";
  else if (vlamax < 0.40) profil = "endurant";
  else if (vlamax < 0.50) profil = "equilibre";
  else if (vlamax < 0.60) profil = "explosif";
  else profil = "sprinter";

  // Estimate FatMax power (zone of max fat oxidation)
  // Typically around 60-75% of FTP, lower VLamax = higher FatMax %
  const fatmaxPercent = 0.55 + (0.65 - vlamax) * 0.3;
  const fatmax = Math.round(ftp * fatmaxPercent);

  // Estimate CarboMax power (where carbs become dominant)
  // Typically 75-90% FTP, depends on VLamax
  const carbomaxPercent = 0.75 + (0.50 - vlamax) * 0.2;
  const carbomax = Math.round(ftp * Math.min(0.95, carbomaxPercent));

  // Crossover point as % of FTP
  const crossover = Math.round((fatmaxPercent + carbomaxPercent) / 2 * 100);

  return {
    vlamax: parseFloat(vlamax.toFixed(3)),
    ig,
    confiance,
    delta_6sem,
    profil,
    fatmax,
    carbomax,
    crossover,
    dateCalcul: new Date().toISOString(),
  };
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
