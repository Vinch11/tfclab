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
 * Seuils de profil VLamax ajustés selon l'âge
 * Un VLamax de 0.49 à 50 ans = "élevé" (profil glycolytique)
 * Un VLamax de 0.49 à 25 ans = "modéré" (profil équilibré/débutant)
 * 
 * L'âge abaisse les seuils car:
 * - La capacité glycolytique diminue naturellement avec l'âge
 * - Une VLamax "normale" à 50 ans équivaut à une VLamax "haute" à 25 ans
 */
export interface AgeAdjustedVLamaxThresholds {
  diesel: number;       // < diesel = Diesel Ultra-Endurant
  endurant: number;     // < endurant = Endurant
  equilibre: number;    // < equilibre = Équilibré
  explosif: number;     // < explosif = Explosif
  // >= explosif = Sprinter
}

/**
 * Retourne les seuils de profil VLamax ajustés par âge
 * 
 * < 30 ans: seuils standards (référence)
 * 30-39 ans: seuils abaissés de 0.03
 * 40-49 ans: seuils abaissés de 0.08
 * ≥ 50 ans: seuils abaissés de 0.12
 */
export function getAgeAdjustedVLamaxThresholds(age: number | null): AgeAdjustedVLamaxThresholds {
  // Seuils de référence (< 30 ans)
  const baseThresholds: AgeAdjustedVLamaxThresholds = {
    diesel: 0.35,
    endurant: 0.45,
    equilibre: 0.55,
    explosif: 0.65,
  };

  if (age === null || age < 30) {
    return baseThresholds;
  }

  // Réduction progressive des seuils avec l'âge
  let reduction = 0;
  if (age < 40) {
    reduction = 0.03;
  } else if (age < 50) {
    reduction = 0.08;
  } else {
    reduction = 0.12;
  }

  return {
    diesel: baseThresholds.diesel - reduction,
    endurant: baseThresholds.endurant - reduction,
    equilibre: baseThresholds.equilibre - reduction,
    explosif: baseThresholds.explosif - reduction,
  };
}

/**
 * Détermine le profil VLamax ajusté par âge
 */
export type VLamaxProfil = "diesel" | "endurant" | "equilibre" | "explosif" | "sprinter";

export function getAgeAdjustedVLamaxProfil(
  vlamax: number | null,
  age: number | null
): { profil: VLamaxProfil; label: string; ageContext: string | null } {
  if (vlamax === null) {
    return { profil: "equilibre", label: "Non défini", ageContext: null };
  }

  const thresholds = getAgeAdjustedVLamaxThresholds(age);
  const ageCategory = computeAgeAdjustmentIndex(age);

  let profil: VLamaxProfil;
  let label: string;

  if (vlamax < thresholds.diesel) {
    profil = "diesel";
    label = "Diesel Ultra-Endurant";
  } else if (vlamax < thresholds.endurant) {
    profil = "endurant";
    label = "Endurant";
  } else if (vlamax < thresholds.equilibre) {
    profil = "equilibre";
    label = "Équilibré";
  } else if (vlamax < thresholds.explosif) {
    profil = "explosif";
    label = "Explosif";
  } else {
    profil = "sprinter";
    label = "Sprinter";
  }

  // Message contexte âge
  let ageContext: string | null = null;
  if (age !== null && age >= 40) {
    // Calculer ce que serait le profil sans ajustement
    const baseThresholds = getAgeAdjustedVLamaxThresholds(null);
    let baseProfil: VLamaxProfil;
    if (vlamax < baseThresholds.diesel) baseProfil = "diesel";
    else if (vlamax < baseThresholds.endurant) baseProfil = "endurant";
    else if (vlamax < baseThresholds.equilibre) baseProfil = "equilibre";
    else if (vlamax < baseThresholds.explosif) baseProfil = "explosif";
    else baseProfil = "sprinter";

    if (profil !== baseProfil) {
      ageContext = `À ${age} ans, une VLamax de ${vlamax.toFixed(2)} correspond à un profil "${label}" (équivalent à "${getProfilLabelFromProfil(baseProfil)}" chez un athlète < 30 ans)`;
    } else {
      ageContext = `Ajustement âge (${ageCategory.label}) pris en compte`;
    }
  }

  return { profil, label, ageContext };
}

function getProfilLabelFromProfil(profil: VLamaxProfil): string {
  switch (profil) {
    case "diesel": return "Diesel Ultra-Endurant";
    case "endurant": return "Endurant";
    case "equilibre": return "Équilibré";
    case "explosif": return "Explosif";
    case "sprinter": return "Sprinter";
  }
}

/**
 * Vérifie si le VLamax est adapté à l'objectif en tenant compte de l'âge
 * Retourne un status avec message pédagogique
 */
export interface VLamaxAgeStatus {
  status: "optimal" | "acceptable" | "work_needed";
  level: "low" | "moderate" | "high" | "very_high";
  message: string;
  ageImpact: string;
  actions: string[];
}

export function getVLamaxAgeStatus(
  vlamax: number | null,
  age: number | null,
  objectif: string
): VLamaxAgeStatus {
  if (vlamax === null) {
    return {
      status: "work_needed",
      level: "moderate",
      message: "VLamax non disponible",
      ageImpact: "",
      actions: ["Effectuer un test VLamax"]
    };
  }

  const isLongDistance = /im|ironman|703|marathon|ultra|trail/i.test(objectif);
  const { profil, label, ageContext } = getAgeAdjustedVLamaxProfil(vlamax, age);
  const ageIndex = computeAgeAdjustmentIndex(age);
  
  let status: VLamaxAgeStatus["status"];
  let level: VLamaxAgeStatus["level"];
  let message: string;
  let actions: string[] = [];

  if (isLongDistance) {
    // Pour longue distance, on veut un VLamax bas
    switch (profil) {
      case "diesel":
      case "endurant":
        status = "optimal";
        level = "low";
        message = `Profil ${label} — excellent pour ${objectif}`;
        actions = ["Maintenir le volume Z2", "Éviter les séances sprint intensives"];
        break;
      case "equilibre":
        status = ageIndex.category === "young" ? "acceptable" : "work_needed";
        level = "moderate";
        message = ageIndex.category === "young" 
          ? `Profil ${label} — acceptable avec marge de progression`
          : `Profil ${label} — travail prioritaire pour ${objectif}`;
        actions = ageIndex.category === "young"
          ? ["Augmenter progressivement le volume Z2", "Réduire les intervalles courts"]
          : ["Bloc 6+ semaines Z2 dominant", "Réduire intensité haute"];
        break;
      case "explosif":
        status = "work_needed";
        level = "high";
        message = `Profil ${label} — adaptation métabolique nécessaire`;
        actions = ["Réorienter vers endurance longue", "Limiter les sprints", "Patience: 12-24 semaines"];
        break;
      case "sprinter":
        status = "work_needed";
        level = "very_high";
        message = `Profil ${label} — réorientation majeure requise pour ${objectif}`;
        actions = ["Priorité absolue: réduire VLamax", "8+ semaines volume pur", "Éviter toute séance glycolytique"];
        break;
    }

    // Ajustement selon l'âge pour les profils à risque
    if (ageIndex.category === "master1" || ageIndex.category === "master2") {
      if (profil === "equilibre" || profil === "explosif") {
        status = "work_needed";
        actions.unshift("Priorité fraîcheur et récupération");
      }
    }
  } else {
    // Pour courte distance, on tolère un VLamax plus haut
    switch (profil) {
      case "diesel":
        status = "acceptable";
        level = "low";
        message = `Profil ${label} — peut limiter les performances en sprint`;
        actions = ["Ajouter des intervalles courts si souhaité", "Travail force/vitesse"];
        break;
      case "endurant":
      case "equilibre":
        status = "optimal";
        level = "moderate";
        message = `Profil ${label} — équilibré pour ${objectif}`;
        actions = ["Maintenir l'équilibre actuel"];
        break;
      case "explosif":
      case "sprinter":
        status = "optimal";
        level = "high";
        message = `Profil ${label} — adapté aux efforts explosifs`;
        actions = ["Maintenir le travail de puissance"];
        break;
    }
  }

  return {
    status,
    level,
    message,
    ageImpact: ageContext || (age !== null && age >= 30 
      ? `Seuils ajustés pour ${ageIndex.label}` 
      : ""),
    actions
  };
}

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
  const thresholds = getAgeAdjustedVLamaxThresholds(age);

  // VLamax faible → toujours OK quel que soit l'âge
  if (vlamax === null || vlamax < thresholds.endurant) {
    return {
      riskLevel: "exploitable",
      label: "Optimal",
      messageStaff: "VLamax dans la zone économe. Profil favorable pour longue distance.",
      actionPrioritaire: "Maintenir le profil actuel.",
    };
  }

  // VLamax modéré (equilibre)
  if (vlamax < thresholds.equilibre) {
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

  // VLamax élevé (explosif)
  if (vlamax < thresholds.explosif) {
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

  // VLamax très élevé (> explosif = sprinter)
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
// CIBLES AJUSTÉES PAR OBJECTIF ET AMBITION
// Source unique pour tous les composants (Radar, Compass, PDF, etc.)
// =============================================
// 
// IMPORTANT: La VLamax n'est PAS ajustée par l'âge.
// Elle est définie UNIQUEMENT par l'objectif et l'ambition de l'athlète.
// Seul TTE peut être ajusté légèrement pour les masters.
// =============================================

import { 
  getVLamaxRange, 
  getTTETargetByAmbition, 
  getFtpKgTargetByAmbition 
} from "@/lib/physiologicalTargets";
import { AmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";

export interface AgeAdjustedTargets {
  vlamaxOptimal: number;
  vlamaxMax: number;
  tteTarget: number;
  ftpKgTarget: number;
  ageAdjustmentApplied: boolean;
  ageCategory: "young" | "prime" | "master1" | "master2";
  explanation: string;
}

/**
 * Retourne les cibles VLamax/TTE/FTP basées sur l'objectif et l'ambition
 * 
 * MODIFICATION IMPORTANTE (2024):
 * - VLamax n'est PLUS ajustée par l'âge
 * - VLamax dépend UNIQUEMENT de l'objectif et de l'ambition
 * - Seul TTE peut être légèrement réduit pour les masters (meilleure récupération)
 * 
 * Logique:
 * - La cible VLamax représente le profil métabolique idéal pour l'objectif
 * - Un athlète de 50 ans visant un IM avec ambition "elite" a la même cible VLamax
 *   qu'un athlète de 25 ans avec le même objectif et ambition
 */
export function getAgeAdjustedTargets(
  objectif: string,
  age: number | null,
  ambition: AmbitionLevel = DEFAULT_AMBITION
): AgeAdjustedTargets {
  // Récupérer les cibles de base depuis la source unique (objectif + ambition)
  const baseVlamaxRange = getVLamaxRange(objectif, ambition);
  const baseTteTarget = getTTETargetByAmbition(objectif, ambition);
  const baseFtpKgTarget = getFtpKgTargetByAmbition(objectif, ambition);
  
  const ageIndex = computeAgeAdjustmentIndex(age);
  
  // VLamax: PAS d'ajustement par âge - définie par objectif + ambition uniquement
  const vlamaxOptimal = baseVlamaxRange.optimal;
  const vlamaxMax = baseVlamaxRange.max;
  
  // TTE: Légère réduction pour les masters (récupération plus longue)
  // Mais la cible reste exigeante pour garantir la performance
  let tteReduction = 0;
  switch (ageIndex.category) {
    case "young":
    case "prime":
      // Pas de réduction pour < 40 ans
      break;
    case "master1":
      tteReduction = 3; // -3 min sur TTE cible (40-49 ans)
      break;
    case "master2":
      tteReduction = 5; // -5 min sur TTE cible (50+ ans)
      break;
  }
  
  const tteTarget = Math.max(35, baseTteTarget - tteReduction);
  
  // FTP/kg n'est pas ajusté par l'âge (mesure objective de performance)
  
  let explanation = "";
  if (ageIndex.category === "young" || ageIndex.category === "prime" || age === null) {
    explanation = `Cibles définies par objectif (${objectif}) et ambition`;
  } else {
    explanation = `Cibles définies par objectif et ambition. TTE ajusté pour ${ageIndex.label} (-${tteReduction} min)`;
  }
  
  return {
    vlamaxOptimal,
    vlamaxMax,
    tteTarget,
    ftpKgTarget: baseFtpKgTarget,
    ageAdjustmentApplied: tteReduction > 0,
    ageCategory: ageIndex.category,
    explanation,
  };
}

/**
 * Version simplifiée pour les composants qui n'ont besoin que de VLamax optimal
 * Note: Retourne la cible basée sur objectif + ambition (pas d'ajustement d'âge)
 */
export function getAgeAdjustedVLamaxOptimal(
  objectif: string,
  age: number | null,
  ambition?: AmbitionLevel
): number {
  // L'âge n'affecte plus la VLamax cible - on délègue directement
  return getVLamaxRange(objectif, ambition || DEFAULT_AMBITION).optimal;
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
    "L'âge MODIFIE l'interprétation et les recommandations de récupération",
    "La VLamax cible dépend de votre OBJECTIF et AMBITION, pas de votre âge",
    "Les cibles TTE sont légèrement ajustées pour les masters (récupération)",
    "La nutrition est adaptée à la tolérance physiologique liée à l'âge",
  ],
  
  staffNote: `La VLamax cible est définie par l'objectif et l'ambition de l'athlète.
L'âge influence l'interprétation du profil et les recommandations, pas la cible elle-même.`,
  
  disclaimer: "Ces ajustements sont basés sur la littérature scientifique et l'expérience de terrain. Ils ne remplacent pas un avis médical.",
};
