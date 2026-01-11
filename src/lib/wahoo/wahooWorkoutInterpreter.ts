/**
 * Wahoo SYSTM Workout Interpreter
 * Translates external workout sessions (Wahoo SYSTM style) into Two For Coaching Lab
 * physiological effects for staff-grade analysis.
 * 
 * This module does NOT modify or replace sessions.
 * It only provides physiological interpretation and contextual alerts.
 */

import type { TemplateSession } from "@/lib/templates/docxTemplateLoader";

// ============= TYPES =============

export type ZoneDominante = "Z1" | "Z2" | "Z3" | "Z4a" | "Z4b" | "Z5" | "Z6" | "Z7";

export type EffetDirection = "up" | "down" | "neutral";

export type StressLevel = "faible" | "modéré" | "élevé";

export type CAPRiskLevel = "faible" | "modéré" | "élevé";

export interface WahooWorkoutEffect {
  zoneDominante: ZoneDominante;
  effetVLamax: EffetDirection;
  effetTTE: EffetDirection;
  stressNeuromusculaire: StressLevel;
  risqueCAP: CAPRiskLevel;
}

export interface WahooWorkoutMapping {
  patterns: RegExp[];
  category: string;
  effect: WahooWorkoutEffect;
  description: string;
  staffNote: string;
}

export interface PhysiologicalReading {
  isWahooSession: boolean;
  matchedPattern?: string;
  category?: string;
  effect?: WahooWorkoutEffect;
  description?: string;
  staffNote?: string;
  // Athlete-contextual alerts
  alerts: PhysiologicalAlert[];
}

export interface PhysiologicalAlert {
  type: "warning" | "info" | "positive";
  message: string;
  detail?: string;
}

export interface AthleteContext {
  vlamaxEffectif: number | null;
  vlamaxSeuil: number; // Target based on objective
  tteEffectif: number | null;
  tteTarget: number;
  fatigueState?: string | null;
  sportPrincipal?: string;
  objectif?: string;
}

// ============= WAHOO WORKOUT MAPPINGS =============

/**
 * Complete mapping table for Wahoo SYSTM workouts
 * Based on the most common workout patterns
 */
export const WAHOO_WORKOUT_MAPPINGS: WahooWorkoutMapping[] = [
  // ===== ENDURANCE / Z2 =====
  {
    patterns: [
      /endurance\s*1\.?\d*/i,
      /endurance\s*(base|foundation)/i,
      /zone\s*2/i,
      /easy\s*ride/i,
      /recovery\s*ride/i,
    ],
    category: "Endurance / Z2",
    effect: {
      zoneDominante: "Z2",
      effetVLamax: "down",
      effetTTE: "up",
      stressNeuromusculaire: "faible",
      risqueCAP: "faible",
    },
    description: "Séance d'endurance fondamentale. Développe l'oxydation lipidique et l'efficacité aérobie.",
    staffNote: "Séance clé pour la réduction du VLamax. Idéale en phase de base ou récupération active.",
  },

  // ===== TEMPO / Z3 =====
  {
    patterns: [
      /tempo\s*(with\s*varying\s*cadence)?/i,
      /tempo\s*\d*/i,
      /zone\s*3/i,
      /sweetspot/i,
      /sweet\s*spot/i,
    ],
    category: "Tempo / Durabilité",
    effect: {
      zoneDominante: "Z3",
      effetVLamax: "down",
      effetTTE: "up",
      stressNeuromusculaire: "modéré",
      risqueCAP: "modéré",
    },
    description: "Travail au tempo (88-95% FTP). Favorise la durabilité et l'économie énergétique.",
    staffNote: "Attention si profil déjà très glycolytique (VLamax haute) : peut devenir agressif.",
  },

  // ===== THRESHOLD / FTP =====
  {
    patterns: [
      /threshold/i,
      /ftp\s*work/i,
      /seuil/i,
      /lt2/i,
      /lactate\s*threshold/i,
      /power\s*station/i,
    ],
    category: "Seuil / FTP",
    effect: {
      zoneDominante: "Z4a",
      effetVLamax: "neutral",
      effetTTE: "up",
      stressNeuromusculaire: "modéré",
      risqueCAP: "modéré",
    },
    description: "Travail au seuil lactique (95-105% FTP). Améliore la puissance durable.",
    staffNote: "Nécessite un TTE suffisant pour être absorbée. Éviter si TTE < 40 min.",
  },

  // ===== VO2MAX / MAP =====
  {
    patterns: [
      /map/i,
      /vo2\s*max/i,
      /vo2max/i,
      /pma/i,
      /max\s*aerobic/i,
      /zone\s*5/i,
      /5\s*min\s*power/i,
    ],
    category: "VO2max / MAP",
    effect: {
      zoneDominante: "Z5",
      effetVLamax: "up",
      effetTTE: "down",
      stressNeuromusculaire: "élevé",
      risqueCAP: "élevé",
    },
    description: "Travail à PMA (106-120% FTP). Développe la puissance aérobie maximale.",
    staffNote: "ATTENTION : Augmente le VLamax. À utiliser avec parcimonie si objectif IM/70.3.",
  },

  // ===== ANAEROBIC / AC =====
  {
    patterns: [
      /anaerobic/i,
      /\bac\b/i,
      /anaerobic\s*capacity/i,
      /zone\s*6/i,
      /30\/30/i,
      /micro\s*burst/i,
    ],
    category: "Anaérobie / AC",
    effect: {
      zoneDominante: "Z6",
      effetVLamax: "up",
      effetTTE: "down",
      stressNeuromusculaire: "élevé",
      risqueCAP: "élevé",
    },
    description: "Travail anaérobie (120-150% FTP). Développe la capacité glycolytique.",
    staffNote: "CONTRE-PRODUCTIF pour IM/70.3 si répété. Réserver aux situations spécifiques.",
  },

  // ===== SPRINT / NM =====
  {
    patterns: [
      /sprint/i,
      /\bnm\b/i,
      /neuromuscular/i,
      /short\s*kom/i,
      /explosive/i,
      /zone\s*7/i,
      /max\s*sprint/i,
    ],
    category: "Sprint / NM",
    effect: {
      zoneDominante: "Z7",
      effetVLamax: "up",
      effetTTE: "down",
      stressNeuromusculaire: "élevé",
      risqueCAP: "élevé",
    },
    description: "Travail neuromusculaire explosif (>150% FTP). Puissance maximale courte.",
    staffNote: "Très glycolytique. À proscrire en phase spécifique IM sauf activation pré-course.",
  },

  // ===== KOM / CLIMBING =====
  {
    patterns: [
      /kom/i,
      /climb/i,
      /mountain/i,
      /hill/i,
      /force\s*(reps|work)/i,
      /low\s*cadence/i,
    ],
    category: "Force / Montagne",
    effect: {
      zoneDominante: "Z4b",
      effetVLamax: "neutral",
      effetTTE: "neutral",
      stressNeuromusculaire: "élevé",
      risqueCAP: "modéré",
    },
    description: "Travail de force spécifique. Recrutement musculaire à basse cadence.",
    staffNote: "Utile pour le recrutement mais coût neuromusculaire élevé. Récupération importante.",
  },

  // ===== OVER-UNDER =====
  {
    patterns: [
      /over[\s-]*under/i,
      /ou\s*intervals/i,
      /surge/i,
      /threshold\s*surge/i,
    ],
    category: "Over-Under",
    effect: {
      zoneDominante: "Z4a",
      effetVLamax: "neutral",
      effetTTE: "up",
      stressNeuromusculaire: "modéré",
      risqueCAP: "modéré",
    },
    description: "Alternance seuil/sur-seuil. Développe la tolérance au lactate et le recyclage.",
    staffNote: "Excellent pour le TTE si bien placé. Éviter en fatigue accumulée.",
  },

  // ===== CADENCE DRILLS =====
  {
    patterns: [
      /cadence\s*(drill|work|pyramid)/i,
      /spin\s*ups/i,
      /leg\s*speed/i,
      /high\s*cadence/i,
    ],
    category: "Technique Cadence",
    effect: {
      zoneDominante: "Z2",
      effetVLamax: "neutral",
      effetTTE: "neutral",
      stressNeuromusculaire: "faible",
      risqueCAP: "faible",
    },
    description: "Travail technique de vélocité. Améliore le coup de pédale.",
    staffNote: "Séance de qualité technique sans charge métabolique majeure.",
  },

  // ===== RACE SIMULATION =====
  {
    patterns: [
      /race\s*sim/i,
      /race\s*prep/i,
      /time\s*trial/i,
      /\btt\b/i,
      /full\s*distance/i,
      /half\s*distance/i,
      /70\.3/i,
    ],
    category: "Simulation Course",
    effect: {
      zoneDominante: "Z3",
      effetVLamax: "down",
      effetTTE: "up",
      stressNeuromusculaire: "élevé",
      risqueCAP: "modéré",
    },
    description: "Simulation d'effort course. Valide le pacing et la nutrition.",
    staffNote: "Séance coûteuse mais essentielle en phase spécifique. Max 2x avant course.",
  },

  // ===== RECOVERY =====
  {
    patterns: [
      /recovery/i,
      /active\s*recovery/i,
      /flush/i,
      /easy/i,
      /zone\s*1/i,
      /spin/i,
    ],
    category: "Récupération",
    effect: {
      zoneDominante: "Z1",
      effetVLamax: "neutral",
      effetTTE: "neutral",
      stressNeuromusculaire: "faible",
      risqueCAP: "faible",
    },
    description: "Récupération active. Favorise le retour parasympathique.",
    staffNote: "Essentielle après séances clés. Ne pas transformer en tempo déguisé.",
  },
];

// ============= PATTERN DETECTION =============

/**
 * Patterns known to identify Wahoo SYSTM sessions
 */
const WAHOO_SESSION_INDICATORS = [
  // Explicit Wahoo patterns
  /wahoo/i,
  /systm/i,
  /sufferfest/i,
  
  // Common Wahoo workout naming conventions
  /endurance\s*\d+\.?\d*/i,
  /tempo\s+with\s+varying/i,
  /short\s+kom/i,
  /long\s+kom/i,
  /\bmap\b/i,
  /\bac\b/i,
  /\bnm\b/i,
  /power\s+station/i,
  /nine\s+hammers/i,
  /team\s+scream/i,
  /the\s+chores/i,
  /half\s+is\s+easy/i,
  /angels/i,
  /blender/i,
  /defender/i,
  /the\s+shovel/i,
  /fight\s+club/i,
  /grunter\s+von\s+agony/i,
  /hell\s+hath\s+no\s+fury/i,
  /violator/i,
  /a\s+very\s+dark\s+place/i,
  /revolver/i,
  /the\s+wretched/i,
  /igniter/i,
  /extra\s+shot/i,
  /goat/i,
  /cobbler/i,
  /elements\s+of\s+style/i,
  /the\s+knack/i,
  /there\s+is\s+no\s+try/i,
  /downward\s+spiral/i,
  /rubber\s+glove/i,
  /primers/i,
  /yoga/i,
  /strength/i,
  /cadence\s+(builds|drills|pyramid)/i,
];

/**
 * Check if a session appears to be from Wahoo SYSTM or similar external platform
 */
export function isWahooLikeSession(session: TemplateSession): boolean {
  const textToCheck = [
    session.title,
    session.details,
    session.description,
    session.notes,
  ].filter(Boolean).join(" ").toLowerCase();

  return WAHOO_SESSION_INDICATORS.some((pattern) => pattern.test(textToCheck));
}

/**
 * Find matching Wahoo workout mapping for a session
 */
function findWorkoutMapping(session: TemplateSession): WahooWorkoutMapping | null {
  const textToCheck = [
    session.title,
    session.details,
    session.description,
    session.notes,
  ].filter(Boolean).join(" ");

  for (const mapping of WAHOO_WORKOUT_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(textToCheck)) {
        return mapping;
      }
    }
  }

  return null;
}

// ============= CONTEXTUAL ALERTS =============

/**
 * Generate athlete-specific alerts based on their profile and the workout effect
 */
function generateContextualAlerts(
  effect: WahooWorkoutEffect,
  category: string,
  context: AthleteContext
): PhysiologicalAlert[] {
  const alerts: PhysiologicalAlert[] = [];

  // VLamax-based alerts
  if (context.vlamaxEffectif !== null) {
    const vlamaxHigh = context.vlamaxEffectif > context.vlamaxSeuil;
    
    if (vlamaxHigh && effect.effetVLamax === "up") {
      alerts.push({
        type: "warning",
        message: "Séance très glycolytique pour ce profil",
        detail: `VLamax actuel (${context.vlamaxEffectif.toFixed(2)}) déjà au-dessus du seuil objectif (${context.vlamaxSeuil.toFixed(2)}). Cette séance risque d'aggraver le déséquilibre.`,
      });
    }

    if (vlamaxHigh && effect.effetVLamax === "down") {
      alerts.push({
        type: "positive",
        message: "Séance pertinente pour ce profil",
        detail: `Le VLamax élevé (${context.vlamaxEffectif.toFixed(2)}) sera sollicité à la baisse par ce type de séance.`,
      });
    }
  }

  // TTE-based alerts
  if (context.tteEffectif !== null) {
    const tteLow = context.tteEffectif < context.tteTarget;

    if (tteLow && effect.effetTTE === "up") {
      alerts.push({
        type: "positive",
        message: "Séance pertinente pour développer la durabilité",
        detail: `TTE actuel (${context.tteEffectif} min) inférieur à la cible (${context.tteTarget} min). Cette séance aide à progresser.`,
      });
    }

    if (tteLow && effect.effetTTE === "down" && effect.stressNeuromusculaire === "élevé") {
      alerts.push({
        type: "warning",
        message: "Charge élevée avec TTE insuffisant",
        detail: `Avec un TTE de ${context.tteEffectif} min, cette séance à stress élevé peut compromettre la récupération.`,
      });
    }
  }

  // Fatigue-based alerts
  if (context.fatigueState === "high" || context.fatigueState === "élevé") {
    if (effect.stressNeuromusculaire === "élevé" || effect.risqueCAP === "élevé") {
      alerts.push({
        type: "warning",
        message: "Attention : état de fatigue élevé",
        detail: "Cette séance à haute charge neuromusculaire est déconseillée en période de fatigue accumulée.",
      });
    }
  }

  // Objective-based alerts
  if (context.objectif) {
    const isIMObjective = /ironman|im|70\.3|703|triathlon/i.test(context.objectif);
    
    if (isIMObjective && effect.effetVLamax === "up") {
      alerts.push({
        type: "info",
        message: "Incohérence possible avec objectif longue distance",
        detail: "Les séances augmentant le VLamax sont à utiliser avec parcimonie pour les objectifs Ironman/70.3.",
      });
    }
  }

  return alerts;
}

// ============= MAIN INTERPRETER =============

/**
 * Interpret a session and generate physiological reading
 * This is the main entry point for the Wahoo interpreter
 */
export function interpretWahooSession(
  session: TemplateSession,
  context: AthleteContext,
  forceInterpret: boolean = false
): PhysiologicalReading {
  // Check if this looks like a Wahoo session
  const isWahoo = forceInterpret || isWahooLikeSession(session);

  if (!isWahoo) {
    return {
      isWahooSession: false,
      alerts: [],
    };
  }

  // Find matching workout mapping
  const mapping = findWorkoutMapping(session);

  if (!mapping) {
    // Session looks like Wahoo but no pattern match
    return {
      isWahooSession: true,
      alerts: [{
        type: "info",
        message: "Séance externe non reconnue",
        detail: "Cette séance semble provenir d'une plateforme externe mais le pattern n'est pas dans notre base.",
      }],
    };
  }

  // Generate contextual alerts
  const alerts = generateContextualAlerts(mapping.effect, mapping.category, context);

  return {
    isWahooSession: true,
    matchedPattern: mapping.category,
    category: mapping.category,
    effect: mapping.effect,
    description: mapping.description,
    staffNote: mapping.staffNote,
    alerts,
  };
}

// ============= DISPLAY HELPERS =============

/**
 * Get color class for effect direction
 */
export function getEffetColor(effet: EffetDirection): string {
  switch (effet) {
    case "up":
      return "text-red-600 dark:text-red-400";
    case "down":
      return "text-green-600 dark:text-green-400";
    case "neutral":
      return "text-muted-foreground";
  }
}

/**
 * Get arrow symbol for effect direction
 */
export function getEffetSymbol(effet: EffetDirection): string {
  switch (effet) {
    case "up":
      return "↑";
    case "down":
      return "↓";
    case "neutral":
      return "=";
  }
}

/**
 * Get color class for stress level
 */
export function getStressColor(level: StressLevel): string {
  switch (level) {
    case "faible":
      return "text-green-600 dark:text-green-400";
    case "modéré":
      return "text-amber-600 dark:text-amber-400";
    case "élevé":
      return "text-red-600 dark:text-red-400";
  }
}

/**
 * Get color class for CAP risk level
 */
export function getRiskColor(level: CAPRiskLevel): string {
  switch (level) {
    case "faible":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "modéré":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "élevé":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }
}

/**
 * Get zone color class
 */
export function getZoneColor(zone: ZoneDominante): string {
  const zoneColors: Record<ZoneDominante, string> = {
    Z1: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    Z2: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    Z3: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    Z4a: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    Z4b: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    Z5: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    Z6: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    Z7: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  };
  return zoneColors[zone] || "bg-muted text-muted-foreground";
}

// ============= OBJECTIVE-BASED THRESHOLDS =============

/**
 * Get VLamax threshold based on athlete objective
 */
export function getVLamaxThreshold(objectif: string | undefined): number {
  if (!objectif) return 0.45;
  
  const obj = objectif.toLowerCase();
  if (obj.includes("im") || obj.includes("ironman") || obj.includes("kona")) {
    return 0.35; // Very strict for full IM
  }
  if (obj.includes("70.3") || obj.includes("703") || obj.includes("half")) {
    return 0.40; // Strict for 70.3
  }
  if (obj.includes("marathon")) {
    return 0.38; // Strict for marathon
  }
  if (obj.includes("semi") || obj.includes("half")) {
    return 0.45; // More lenient for half marathon
  }
  return 0.45; // Default
}

/**
 * Get TTE target based on athlete objective
 */
export function getTTETarget(objectif: string | undefined): number {
  if (!objectif) return 45;
  
  const obj = objectif.toLowerCase();
  if (obj.includes("im") || obj.includes("ironman") || obj.includes("kona")) {
    return 55; // High for full IM
  }
  if (obj.includes("70.3") || obj.includes("703") || obj.includes("half")) {
    return 50; // High for 70.3
  }
  if (obj.includes("marathon")) {
    return 50; // High for marathon
  }
  if (obj.includes("semi") || obj.includes("half")) {
    return 40; // Lower for half marathon
  }
  return 45; // Default
}
