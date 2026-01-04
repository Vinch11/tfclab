// =============================================
// AGE ADJUSTMENT - Module de modulation par l'âge
// Two For Coaching Lab - Version Staff-Grade
// =============================================
//
// PRINCIPE FONDAMENTAL :
// L'âge NE MODIFIE PAS les valeurs mesurées (FTP, VLamax, TTE, VO₂max)
// L'âge MODIFIE leur interprétation, leur pondération et les recommandations
//
// =============================================

/**
 * Age Adjustment Index (AAI)
 * Indice interne non affiché à l'utilisateur
 * Sert à pondérer les scores, alertes et recommandations
 */
export interface AgeAdjustmentIndex {
  age: number;
  aai: number; // 0.85 à 1.0
  category: "young" | "prime" | "master1" | "master2";
  label: string;
  riskMultiplier: number; // Multiplicateur de risque (1.0 à 1.25)
}

/**
 * Cibles TTE ajustées par âge et objectif
 */
export interface AgeTTETargets {
  ironman: { min: number; ideal: number };
  half: { min: number; ideal: number };
  marathon: { min: number; ideal: number };
  default: { min: number; ideal: number };
}

/**
 * Interprétation VLamax ajustée par âge
 */
export interface AgeVLamaxInterpretation {
  riskLevel: "exploitable" | "surveiller" | "risque" | "prioritaire";
  label: string;
  messageStaff: string;
  actionPrioritaire: string;
}

/**
 * Ajustement nutrition par âge
 */
export interface AgeNutritionAdjustment {
  carbReductionFactor: number; // 1.0 à 0.75
  toleranceReductionPct: number; // 0 à 25%
  messageStaff: string;
}

// =============================================
// CALCUL DE L'ÂGE À PARTIR DE LA DATE DE NAISSANCE
// =============================================

/**
 * Calcule l'âge en années révolues
 */
export function calculateAge(birthDate: string | Date | null | undefined): number | null {
  if (!birthDate) return null;
  
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (isNaN(birth.getTime())) return null;
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

// =============================================
// AGE ADJUSTMENT INDEX (AAI)
// =============================================

/**
 * Calcule l'Age Adjustment Index (AAI)
 * Indice interne utilisé pour pondérer les recommandations
 * 
 * < 30 ans : AAI = 1.00 (référence)
 * 30-39 ans : AAI = 0.95
 * 40-49 ans : AAI = 0.90
 * ≥ 50 ans : AAI = 0.85
 */
export function computeAgeAdjustmentIndex(age: number | null): AgeAdjustmentIndex {
  if (age === null || age < 0) {
    // Pas d'âge connu → pas d'ajustement (conservateur)
    return {
      age: 0,
      aai: 1.0,
      category: "prime",
      label: "Âge non renseigné",
      riskMultiplier: 1.0,
    };
  }

  if (age < 30) {
    return {
      age,
      aai: 1.0,
      category: "young",
      label: "< 30 ans",
      riskMultiplier: 1.0,
    };
  }

  if (age < 40) {
    return {
      age,
      aai: 0.95,
      category: "prime",
      label: "30-39 ans",
      riskMultiplier: 1.05,
    };
  }

  if (age < 50) {
    return {
      age,
      aai: 0.90,
      category: "master1",
      label: "40-49 ans",
      riskMultiplier: 1.15,
    };
  }

  return {
    age,
    aai: 0.85,
    category: "master2",
    label: "50+ ans",
    riskMultiplier: 1.25,
  };
}

// =============================================
// CIBLES TTE AJUSTÉES PAR ÂGE
// =============================================

/**
 * Retourne les cibles TTE ajustées selon l'âge et l'objectif
 * 
 * Exemple Ironman :
 * - < 30 ans → cible 60 min
 * - 30-40 ans → cible 55-60 min
 * - 40-50 ans → cible 50-55 min
 * - ≥ 50 ans → cible 45-50 min
 */
export function getTTETargetsByAge(age: number | null): AgeTTETargets {
  const ageIndex = computeAgeAdjustmentIndex(age);

  switch (ageIndex.category) {
    case "young":
      return {
        ironman: { min: 55, ideal: 60 },
        half: { min: 50, ideal: 55 },
        marathon: { min: 50, ideal: 55 },
        default: { min: 45, ideal: 50 },
      };
    case "prime":
      return {
        ironman: { min: 52, ideal: 58 },
        half: { min: 48, ideal: 53 },
        marathon: { min: 48, ideal: 53 },
        default: { min: 43, ideal: 48 },
      };
    case "master1":
      return {
        ironman: { min: 48, ideal: 53 },
        half: { min: 45, ideal: 50 },
        marathon: { min: 45, ideal: 50 },
        default: { min: 40, ideal: 45 },
      };
    case "master2":
      return {
        ironman: { min: 45, ideal: 50 },
        half: { min: 42, ideal: 47 },
        marathon: { min: 42, ideal: 47 },
        default: { min: 38, ideal: 43 },
      };
  }
}

/**
 * Retourne la cible TTE pour un objectif spécifique, ajustée à l'âge
 */
export function getTTETargetForAge(objectif: string, age: number | null): { min: number; ideal: number } {
  const targets = getTTETargetsByAge(age);
  const obj = (objectif || "").toLowerCase();

  if (obj.includes("ironman") || obj.includes("im") || obj.includes("ultra")) {
    return targets.ironman;
  }
  if (obj.includes("70.3") || obj.includes("half") || obj.includes("marathon")) {
    return targets.half;
  }
  return targets.default;
}

// =============================================
// INTERPRÉTATION VLAMAX AJUSTÉE PAR ÂGE
// =============================================

/**
 * Interprète le VLamax en fonction de l'âge
 * La valeur ne change pas, mais le niveau de risque glycolytique dépend de l'âge
 * 
 * < 30 ans : VLamax élevé = Exploitable
 * 30-40 ans : VLamax élevé = À surveiller
 * 40-50 ans : VLamax élevé = Risque métabolique
 * ≥ 50 ans : VLamax élevé = Priorité de réduction
 */
export function interpretVLamaxByAge(
  vlamax: number | null,
  age: number | null
): AgeVLamaxInterpretation {
  const ageIndex = computeAgeAdjustmentIndex(age);

  // VLamax faible → toujours OK quel que soit l'âge
  if (vlamax === null || vlamax <= 0.35) {
    return {
      riskLevel: "exploitable",
      label: "Optimal",
      messageStaff: "VLamax dans la zone économe. Profil favorable pour longue distance.",
      actionPrioritaire: "Maintenir le profil actuel.",
    };
  }

  // VLamax modéré (0.35-0.50)
  if (vlamax <= 0.50) {
    switch (ageIndex.category) {
      case "young":
        return {
          riskLevel: "exploitable",
          label: "Acceptable",
          messageStaff: "VLamax modéré, exploitable sur objectifs longs avec bonne nutrition.",
          actionPrioritaire: "Optimisation progressive possible.",
        };
      case "prime":
        return {
          riskLevel: "surveiller",
          label: "À surveiller",
          messageStaff: "VLamax modéré. La récupération et l'économie métabolique méritent attention.",
          actionPrioritaire: "Surveiller la dérive en course longue.",
        };
      case "master1":
      case "master2":
        return {
          riskLevel: "surveiller",
          label: "Vigilance",
          messageStaff: "VLamax modéré mais contexte master → surveillance accrue recommandée.",
          actionPrioritaire: "Envisager séances A (endurance longue) pour optimiser le profil.",
        };
    }
  }

  // VLamax élevé (0.50-0.70)
  if (vlamax <= 0.70) {
    switch (ageIndex.category) {
      case "young":
        return {
          riskLevel: "surveiller",
          label: "À surveiller",
          messageStaff: "VLamax élevé mais métabolisme jeune. Réduction progressive recommandée pour objectifs longs.",
          actionPrioritaire: "Réduire séances haute intensité, augmenter volume Z2.",
        };
      case "prime":
        return {
          riskLevel: "risque",
          label: "Risque modéré",
          messageStaff: "VLamax élevé + tranche 30-40 ans. Risque de dérive métabolique en compétition longue.",
          actionPrioritaire: "Priorité : réduction VLamax avant prochaine course.",
        };
      case "master1":
        return {
          riskLevel: "risque",
          label: "Risque métabolique",
          messageStaff: "VLamax élevé à 40+ ans. Tolérance au stress métabolique réduite. Action prioritaire.",
          actionPrioritaire: "Bloc de 4-6 semaines Z2 dominant + réduction intensité.",
        };
      case "master2":
        return {
          riskLevel: "prioritaire",
          label: "Priorité de réduction",
          messageStaff: "VLamax élevé à 50+ ans = risque majeur. La réduction du VLamax doit être la priorité absolue.",
          actionPrioritaire: "Urgence : 6-8 semaines volume Z2, aucune séance B.",
        };
    }
  }

  // VLamax très élevé (> 0.70)
  switch (ageIndex.category) {
    case "young":
      return {
        riskLevel: "risque",
        label: "Risque élevé",
        messageStaff: "VLamax très élevé. Même à cet âge, profil inadapté pour longue distance.",
        actionPrioritaire: "Priorité absolue : réduire VLamax avant toute préparation spécifique.",
      };
    case "prime":
      return {
        riskLevel: "prioritaire",
        label: "Prioritaire",
        messageStaff: "VLamax très élevé + 30+ ans. Profil à risque pour tout format > Olympic.",
        actionPrioritaire: "Bloc 6+ semaines volume pur. Pas de compétition longue avant réduction significative.",
      };
    case "master1":
    case "master2":
      return {
        riskLevel: "prioritaire",
        label: "Alerte",
        messageStaff: "VLamax critique pour un master. Risque majeur de défaillance métabolique.",
        actionPrioritaire: "Contre-indication relative aux formats longs sans travail préalable de 8+ semaines.",
      };
  }
}

// =============================================
// AJUSTEMENT NUTRITION PAR ÂGE
// =============================================

/**
 * Calcule l'ajustement nutritionnel en fonction de l'âge
 * 
 * Exemple à TTE égal :
 * - Athlète jeune → 80-100 g/h
 * - Athlète master → 60-80 g/h
 */
export function getAgeNutritionAdjustment(age: number | null): AgeNutritionAdjustment {
  const ageIndex = computeAgeAdjustmentIndex(age);

  switch (ageIndex.category) {
    case "young":
      return {
        carbReductionFactor: 1.0,
        toleranceReductionPct: 0,
        messageStaff: "Tolérance digestive standard. Objectifs nutritionnels sans ajustement.",
      };
    case "prime":
      return {
        carbReductionFactor: 0.95,
        toleranceReductionPct: 5,
        messageStaff: "Légère réduction des cibles glucidiques recommandée (-5%). Tester en entraînement.",
      };
    case "master1":
      return {
        carbReductionFactor: 0.88,
        toleranceReductionPct: 12,
        messageStaff: "Réduction de 12% des apports glucidiques. Tolérance digestive potentiellement réduite à 40+ ans.",
      };
    case "master2":
      return {
        carbReductionFactor: 0.80,
        toleranceReductionPct: 20,
        messageStaff: "Réduction de 20% des apports glucidiques. Prioriser la fraîcheur et une nutrition plus conservative.",
      };
  }
}

/**
 * Applique l'ajustement d'âge aux recommandations nutritionnelles
 */
export function adjustCarbsByAge(
  carbsMin: number,
  carbsMax: number,
  age: number | null
): { adjustedMin: number; adjustedMax: number; reductionApplied: boolean } {
  const adjustment = getAgeNutritionAdjustment(age);
  
  if (adjustment.carbReductionFactor >= 1.0) {
    return {
      adjustedMin: carbsMin,
      adjustedMax: carbsMax,
      reductionApplied: false,
    };
  }

  return {
    adjustedMin: Math.round(carbsMin * adjustment.carbReductionFactor),
    adjustedMax: Math.round(carbsMax * adjustment.carbReductionFactor),
    reductionApplied: true,
  };
}

// =============================================
// AJUSTEMENT RACE READINESS PAR ÂGE
// =============================================

/**
 * Ajuste le risque Race Readiness en fonction de l'âge
 * À niveau de préparation égal, l'âge modifie la tolérance au stress métabolique
 */
export function adjustRaceReadinessRiskByAge(
  baseScore: number,
  age: number | null
): {
  adjustedRiskLevel: "low" | "moderate" | "high";
  priorityFreshness: boolean;
  priorityNutrition: boolean;
  messageStaff: string;
} {
  const ageIndex = computeAgeAdjustmentIndex(age);

  // Score de base élevé (80+) → risque faible quel que soit l'âge
  if (baseScore >= 80) {
    const priorityFreshness = ageIndex.category === "master1" || ageIndex.category === "master2";
    return {
      adjustedRiskLevel: "low",
      priorityFreshness,
      priorityNutrition: priorityFreshness,
      messageStaff: priorityFreshness
        ? "Score élevé mais profil master → fraîcheur et nutrition restent prioritaires."
        : "Score élevé. Profil cohérent avec l'objectif.",
    };
  }

  // Score modéré (60-79)
  if (baseScore >= 60) {
    switch (ageIndex.category) {
      case "young":
        return {
          adjustedRiskLevel: "low",
          priorityFreshness: false,
          priorityNutrition: false,
          messageStaff: "Score modéré mais profil jeune. Marge de progression et de tolérance.",
        };
      case "prime":
        return {
          adjustedRiskLevel: "moderate",
          priorityFreshness: true,
          priorityNutrition: false,
          messageStaff: "Score modéré. Attention à la fraîcheur pré-course.",
        };
      case "master1":
      case "master2":
        return {
          adjustedRiskLevel: "high",
          priorityFreshness: true,
          priorityNutrition: true,
          messageStaff: "Score modéré + profil master = niveau de risque plus élevé. Priorité sur fraîcheur et nutrition.",
        };
    }
  }

  // Score faible (<60)
  switch (ageIndex.category) {
    case "young":
      return {
        adjustedRiskLevel: "moderate",
        priorityFreshness: false,
        priorityNutrition: false,
        messageStaff: "Score faible. Travail de fond nécessaire mais tolérance encore présente.",
      };
    case "prime":
      return {
        adjustedRiskLevel: "high",
        priorityFreshness: true,
        priorityNutrition: true,
        messageStaff: "Score faible + 30+ ans. Objectif actuel à reconsidérer ou préparation à prolonger.",
      };
    case "master1":
    case "master2":
      return {
        adjustedRiskLevel: "high",
        priorityFreshness: true,
        priorityNutrition: true,
        messageStaff: "Score faible + profil master = risque élevé. Reporter l'objectif ou réduire l'ambition recommandé.",
      };
  }
}

// =============================================
// TEXTE PÉDAGOGIQUE
// =============================================

export const AGE_METHODOLOGY = {
  title: "Pourquoi l'âge est pris en compte",
  mainText: `Two For Coaching Lab n'abaisse pas vos performances avec l'âge.
Il ajuste l'interprétation physiologique pour proposer des recommandations plus sûres, plus durables et plus efficaces.

À valeur égale, le contexte physiologique n'est pas le même à 25 ou 45 ans.`,
  
  principles: [
    "L'âge ne modifie PAS vos valeurs mesurées (FTP, VLamax, TTE)",
    "L'âge MODIFIE l'interprétation et les recommandations",
    "Un VLamax de 0.55 à 25 ans ≠ un VLamax de 0.55 à 50 ans",
    "Les cibles TTE sont ajustées pour être réalistes et sécuritaires",
    "La nutrition est adaptée à la tolérance physiologique liée à l'âge",
  ],
  
  staffNote: `À niveau de préparation égal, l'âge modifie la tolérance au stress métabolique.
Les recommandations sont ajustées en conséquence.`,
  
  disclaimer: "Ces ajustements sont basés sur la littérature scientifique et l'expérience de terrain. Ils ne remplacent pas un avis médical.",
};
