/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL INTENSITY REFERENCE ENGINE™ — Moteur d'intensité référencée
 * Two For Coaching Lab Method™
 * 
 * RÈGLE FONDAMENTALE:
 * Toute intensité affichée doit être définie comme:
 * → "X % DE [RÉFÉRENCE PHYSIOLOGIQUE EXPLICITE]"
 * 
 * Une intensité sans référence n'a aucune valeur physiologique.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Sport = "bike" | "run" | "swim";

export type IntensityReferenceType =
  // Metabolic targets (priority 1)
  | "fatmax"
  | "race_intensity"
  | "metabolic_threshold" // LT2
  // Power/speed based (priority 2)
  | "ftp"
  | "vma"
  | "threshold_pace"
  // Max capacity (priority 3 - VO2max work)
  | "map"
  | "pma";

export type EnergySystem = "aerobic" | "mixed" | "glycolytic";

export interface IntensityReference {
  type: IntensityReferenceType;
  label: string;
  shortLabel: string;
  description: string;
  sport: Sport | "all";
  priority: number;
  isFallback: boolean;
  energySystemThresholds: {
    aerobic: number;    // Below this % = aerobic dominant
    mixed: number;      // Below this % = mixed, above = glycolytic
  };
}

export interface ResolvedIntensity {
  // Core values
  percentValue: number;
  referenceType: IntensityReferenceType;
  referenceLabel: string;
  referenceShortLabel: string;
  
  // Physiological context
  energySystem: EnergySystem;
  energySystemLabel: string;
  energySystemColor: string;
  
  // Quality indicators
  isFallback: boolean;
  isEstimation: boolean;
  confidence: number;
  
  // Display
  displayText: string;
  tooltipText: string;
  physiologicalPhrase: string;
  
  // Raw reference value used for calculation
  referenceValue: number | null;
  absoluteValue: number | null;
}

export interface IntensityInput {
  sport: Sport;
  context: "endurance" | "threshold" | "vo2max" | "race" | "general";
  
  // Available physiological data
  fatmaxPct?: number | null;
  raceIntensityPct?: number | null;
  metabolicThresholdPct?: number | null;
  
  // Power/speed based data
  ftp?: number | null;
  vma?: number | null;
  thresholdPace?: number | null;  // sec/km
  map?: number | null;
  pma?: number | null;
  
  // Target intensity (the value to express)
  targetPower?: number | null;
  targetPace?: number | null;     // sec/km
  targetPctFTP?: number | null;
  targetPctVMA?: number | null;
  
  // Explicit reference if known
  explicitReference?: IntensityReferenceType;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFERENCE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const INTENSITY_REFERENCES: Record<IntensityReferenceType, IntensityReference> = {
  fatmax: {
    type: "fatmax",
    label: "FatMax",
    shortLabel: "FatMax",
    description: "Intensité maximale d'oxydation des lipides",
    sport: "all",
    priority: 1,
    isFallback: false,
    energySystemThresholds: { aerobic: 90, mixed: 105 },
  },
  race_intensity: {
    type: "race_intensity",
    label: "Allure Course",
    shortLabel: "Allure",
    description: "Intensité cible de compétition",
    sport: "all",
    priority: 1,
    isFallback: false,
    energySystemThresholds: { aerobic: 85, mixed: 100 },
  },
  metabolic_threshold: {
    type: "metabolic_threshold",
    label: "Seuil Métabolique (LT2)",
    shortLabel: "Seuil",
    description: "Seuil lactique 2 / MLSS",
    sport: "all",
    priority: 1,
    isFallback: false,
    energySystemThresholds: { aerobic: 80, mixed: 100 },
  },
  ftp: {
    type: "ftp",
    label: "FTP (Functional Threshold Power)",
    shortLabel: "FTP",
    description: "Puissance seuil fonctionnelle",
    sport: "bike",
    priority: 2,
    isFallback: true,
    energySystemThresholds: { aerobic: 75, mixed: 100 },
  },
  vma: {
    type: "vma",
    label: "VMA (Vitesse Maximale Aérobie)",
    shortLabel: "VMA",
    description: "Vitesse à VO2max",
    sport: "run",
    priority: 2,
    isFallback: true,
    energySystemThresholds: { aerobic: 70, mixed: 85 },
  },
  threshold_pace: {
    type: "threshold_pace",
    label: "Allure Seuil",
    shortLabel: "Seuil",
    description: "Allure au seuil lactique",
    sport: "run",
    priority: 2,
    isFallback: true,
    energySystemThresholds: { aerobic: 85, mixed: 100 },
  },
  map: {
    type: "map",
    label: "MAP (Puissance Maximale Aérobie)",
    shortLabel: "MAP",
    description: "Puissance à VO2max",
    sport: "bike",
    priority: 3,
    isFallback: false,
    energySystemThresholds: { aerobic: 60, mixed: 85 },
  },
  pma: {
    type: "pma",
    label: "PMA (Puissance Maximale Aérobie)",
    shortLabel: "PMA",
    description: "Puissance à VO2max",
    sport: "bike",
    priority: 3,
    isFallback: false,
    energySystemThresholds: { aerobic: 60, mixed: 85 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENERGY SYSTEM COLORS
// ═══════════════════════════════════════════════════════════════════════════════

export const ENERGY_SYSTEM_CONFIG: Record<EnergySystem, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  aerobic: {
    label: "Aérobie dominant",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-300 dark:border-green-700",
    description: "Oxydation lipidique prioritaire, faible stress glycolytique",
  },
  mixed: {
    label: "Zone mixte",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    borderColor: "border-orange-300 dark:border-orange-700",
    description: "Contribution glycolytique croissante, gestion métabolique requise",
  },
  glycolytic: {
    label: "Glycolyse dominante",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-300 dark:border-red-700",
    description: "Sollicitation glycolytique majeure, durabilité limitée",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE RESOLUTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve an intensity value to its physiological reference
 */
export function resolveIntensity(input: IntensityInput): ResolvedIntensity | null {
  const { sport, context, explicitReference } = input;

  // Determine best reference based on hierarchy
  const { reference, pctValue, refValue, isEstimation } = selectBestReference(input);
  
  if (!reference || pctValue == null) {
    return null;
  }

  // Determine energy system
  const energySystem = determineEnergySystem(pctValue, reference);
  const energyConfig = ENERGY_SYSTEM_CONFIG[energySystem];

  // Calculate absolute value if possible
  let absoluteValue: number | null = null;
  if (refValue != null) {
    absoluteValue = Math.round(refValue * (pctValue / 100));
  }

  // Build display texts
  const displayText = `${pctValue}% de ${reference.shortLabel}`;
  
  const tooltipText = `Cette intensité est exprimée en pourcentage de ${reference.label}. ` +
    `Elle correspond à une sollicitation métabolique spécifique (${energyConfig.label.toLowerCase()}), ` +
    `et non à un simple pourcentage de puissance/vitesse.`;

  const physiologicalPhrase = buildPhysiologicalPhrase(pctValue, reference, energySystem);

  // Confidence based on fallback status
  let confidence = 0.85;
  if (reference.isFallback) confidence = 0.65;
  if (isEstimation) confidence *= 0.8;

  return {
    percentValue: pctValue,
    referenceType: reference.type,
    referenceLabel: reference.label,
    referenceShortLabel: reference.shortLabel,
    energySystem,
    energySystemLabel: energyConfig.label,
    energySystemColor: energyConfig.color,
    isFallback: reference.isFallback,
    isEstimation,
    confidence,
    displayText,
    tooltipText,
    physiologicalPhrase,
    referenceValue: refValue,
    absoluteValue,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFERENCE SELECTION HIERARCHY
// ═══════════════════════════════════════════════════════════════════════════════

interface ReferenceSelection {
  reference: IntensityReference | null;
  pctValue: number | null;
  refValue: number | null;
  isEstimation: boolean;
}

function selectBestReference(input: IntensityInput): ReferenceSelection {
  const { sport, context } = input;

  // Priority 1: Metabolic targets (if available)
  if (input.fatmaxPct != null && context !== "vo2max") {
    return {
      reference: INTENSITY_REFERENCES.fatmax,
      pctValue: Math.round(input.fatmaxPct),
      refValue: null,
      isEstimation: false,
    };
  }

  if (input.raceIntensityPct != null && (context === "race" || context === "endurance")) {
    return {
      reference: INTENSITY_REFERENCES.race_intensity,
      pctValue: Math.round(input.raceIntensityPct),
      refValue: null,
      isEstimation: false,
    };
  }

  if (input.metabolicThresholdPct != null && context === "threshold") {
    return {
      reference: INTENSITY_REFERENCES.metabolic_threshold,
      pctValue: Math.round(input.metabolicThresholdPct),
      refValue: null,
      isEstimation: false,
    };
  }

  // Priority 2: Sport-specific power/speed based
  if (sport === "bike") {
    // VO2max work uses MAP/PMA
    if (context === "vo2max" && (input.map != null || input.pma != null)) {
      const mapValue = input.map ?? input.pma;
      if (mapValue != null && input.targetPower != null) {
        return {
          reference: INTENSITY_REFERENCES.map,
          pctValue: Math.round((input.targetPower / mapValue) * 100),
          refValue: mapValue,
          isEstimation: false,
        };
      }
    }

    // FTP fallback
    if (input.ftp != null) {
      let pctValue: number | null = null;
      
      if (input.targetPctFTP != null) {
        pctValue = Math.round(input.targetPctFTP);
      } else if (input.targetPower != null) {
        pctValue = Math.round((input.targetPower / input.ftp) * 100);
      }
      
      if (pctValue != null) {
        return {
          reference: INTENSITY_REFERENCES.ftp,
          pctValue,
          refValue: input.ftp,
          isEstimation: true,
        };
      }
    }
  }

  if (sport === "run") {
    // VMA reference
    if (input.vma != null) {
      let pctValue: number | null = null;
      
      if (input.targetPctVMA != null) {
        pctValue = Math.round(input.targetPctVMA);
      } else if (input.targetPace != null) {
        // Convert pace to speed and calculate %VMA
        const targetSpeed = 1000 / input.targetPace; // m/s
        const vmaSpeed = input.vma / 3.6; // km/h to m/s
        pctValue = Math.round((targetSpeed / vmaSpeed) * 100);
      }
      
      if (pctValue != null) {
        return {
          reference: INTENSITY_REFERENCES.vma,
          pctValue,
          refValue: input.vma,
          isEstimation: true,
        };
      }
    }

    // Threshold pace fallback
    if (input.thresholdPace != null && input.targetPace != null) {
      const pctValue = Math.round((input.thresholdPace / input.targetPace) * 100);
      return {
        reference: INTENSITY_REFERENCES.threshold_pace,
        pctValue,
        refValue: input.thresholdPace,
        isEstimation: true,
      };
    }
  }

  return { reference: null, pctValue: null, refValue: null, isEstimation: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENERGY SYSTEM DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════════

function determineEnergySystem(pctValue: number, reference: IntensityReference): EnergySystem {
  const { aerobic, mixed } = reference.energySystemThresholds;
  
  if (pctValue <= aerobic) {
    return "aerobic";
  } else if (pctValue <= mixed) {
    return "mixed";
  }
  return "glycolytic";
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHYSIOLOGICAL PHRASE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function buildPhysiologicalPhrase(
  pctValue: number,
  reference: IntensityReference,
  energySystem: EnergySystem
): string {
  const refName = reference.shortLabel;

  switch (energySystem) {
    case "aerobic":
      if (reference.type === "fatmax") {
        return `${pctValue}% de ${refName} – priorité oxydation lipidique, faible stress glycolytique.`;
      }
      return `${pctValue}% de ${refName} – zone aérobie, sollicitation glycolytique minimale.`;
    
    case "mixed":
      return `${pctValue}% de ${refName} – zone mixte, gestion de l'intensité recommandée.`;
    
    case "glycolytic":
      return `${pctValue}% de ${refName} – glycolyse dominante, attention à la durabilité.`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format intensity for display with reference
 */
export function formatIntensityWithRef(
  pctValue: number,
  referenceType: IntensityReferenceType
): string {
  const ref = INTENSITY_REFERENCES[referenceType];
  return `${pctValue}% de ${ref.shortLabel}`;
}

/**
 * Check if an intensity display is valid (has explicit reference)
 */
export function isValidIntensityDisplay(displayText: string): boolean {
  // Must contain "% de" pattern
  return /\d+\s*%\s*de\s+\w+/i.test(displayText);
}

/**
 * Get warning for intensity without reference
 */
export function getIntensityWarning(): string {
  return "Attention : sortie de l'enveloppe métabolique planifiée.";
}

/**
 * Get all available references for a sport
 */
export function getReferencesForSport(sport: Sport): IntensityReference[] {
  return Object.values(INTENSITY_REFERENCES)
    .filter(ref => ref.sport === sport || ref.sport === "all")
    .sort((a, b) => a.priority - b.priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF REPORT SECTION DATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface IntensityReferenceSummary {
  referencesUsed: Array<{
    type: IntensityReferenceType;
    label: string;
    isFallback: boolean;
    justification: string;
  }>;
  limitations: string[];
  disclaimer: string;
}

export function generateIntensityReferenceSummary(
  usedReferences: IntensityReferenceType[],
  hasFatmaxData: boolean,
  hasFTPData: boolean,
  hasVMAData: boolean
): IntensityReferenceSummary {
  const referencesUsed = usedReferences.map(type => {
    const ref = INTENSITY_REFERENCES[type];
    let justification = "";
    
    switch (type) {
      case "fatmax":
        justification = "Référence métabolique prioritaire, déterminée par analyse VLamax.";
        break;
      case "race_intensity":
        justification = "Intensité cible calculée pour l'objectif de course.";
        break;
      case "ftp":
        justification = hasFatmaxData 
          ? "Utilisé en complément pour les intensités supra-seuil."
          : "Fallback utilisé en absence de données métaboliques.";
        break;
      case "vma":
        justification = "Référence de vitesse maximale aérobie pour la course à pied.";
        break;
      case "map":
      case "pma":
        justification = "Utilisé pour les efforts à VO2max.";
        break;
      default:
        justification = "Référence standard.";
    }
    
    return {
      type,
      label: ref.label,
      isFallback: ref.isFallback,
      justification,
    };
  });

  const limitations: string[] = [];
  if (!hasFatmaxData) {
    limitations.push("Données FatMax non disponibles – intensités métaboliques estimées.");
  }
  if (!hasFTPData && !hasVMAData) {
    limitations.push("Aucune référence de puissance/vitesse seuil disponible.");
  }

  return {
    referencesUsed,
    limitations,
    disclaimer: "Une intensité exprimée sans référence n'a aucune valeur physiologique. " +
      "Les pourcentages affichés sont toujours relatifs à une capacité mesurée ou estimée.",
  };
}
