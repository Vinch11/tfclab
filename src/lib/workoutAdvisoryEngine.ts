/**
 * WorkoutAdvisoryEngine™ — Two For Coaching Lab
 * 
 * Moteur de recommandations de séances externes (Wahoo SYSTM, Zwift, Rouvy)
 * piloté par les indices physiologiques unifiés.
 * 
 * CE MOTEUR NE PLANIFIE JAMAIS À LA PLACE DU COACH.
 * Il suggère, déconseille et JUSTIFIE.
 * 
 * Sources utilisées (OBLIGATOIRES):
 * - FatigueIndex (0–100 %)
 * - VLamaxEffectif (valeur + source + confiance)
 * - TTEEffectif (valeur + cible)
 * - Objectif sportif (IM / 70.3 / Marathon / Semi)
 * - Sport (vélo / CAP)
 */

import { VLamaxEffectif } from "./vlamaxEffectif";
import { TTEEffectif, getTTETarget } from "./tteEffectif";
import { getVLamaxThreshold } from "./physiologicalTargets";

// =============================================
// TYPES PRINCIPAUX
// =============================================

export type AdvisoryStatus = "RECOMMENDED" | "CAUTION" | "DISCOURAGED";

export type IntensityType = "VO2" | "THRESHOLD" | "TEMPO" | "Z2" | "FORCE" | "NEURO" | "RECOVERY";

export type LoadLevel = "LOW" | "MODERATE" | "HIGH";

export type DurationClass = "SHORT" | "MEDIUM" | "LONG";

export type Platform = "WAHOO" | "ZWIFT" | "ROUVY";

/**
 * Tags physiologiques normalisés pour chaque séance
 */
export interface WorkoutPhysioTags {
  intensity_type: IntensityType;
  metabolic_load: LoadLevel;
  glycolytic_stress: LoadLevel;
  neuromuscular_stress: LoadLevel;
  duration_class: DurationClass;
}

/**
 * Contexte athlète pour le moteur de recommandations
 */
export interface AdvisoryContext {
  // FatigueIndex (0-100%)
  fatigueIndex: number;
  
  // VLamax Effectif
  vlamaxEffectif: VLamaxEffectif;
  
  // TTE Effectif
  tteEffectif: TTEEffectif;
  
  // Objectif sportif
  objectif: string; // IM, 70.3, Marathon, Semi, etc.
  
  // Sport principal
  sport: "bike" | "run" | "tri";
}

/**
 * Sortie du moteur pour une séance
 */
export interface WorkoutAdvisory {
  workout_id: string;
  workout_name: string;
  platform: Platform;
  
  // Statut de recommandation
  status: AdvisoryStatus;
  status_label: string;
  status_emoji: string;
  status_color: string;
  
  // Justification pédagogique
  why: string;
  why_details: string[];
  
  // Données utilisées pour la décision
  data_used: {
    fatigue_pct: number;
    vlamax: number | null;
    tte_min: number;
    objectif: string;
  };
  
  // Alternative suggérée si déconseillée
  alternative_suggestion?: string;
  
  // Tags physiologiques de la séance
  physio_tags: WorkoutPhysioTags;
  
  // Confiance de la recommandation
  confidence: number;
}

/**
 * Sortie globale du moteur
 */
export interface AdvisoryEngineOutput {
  advisories: WorkoutAdvisory[];
  summary: {
    recommended_count: number;
    caution_count: number;
    discouraged_count: number;
  };
  context_summary: string;
  guard_message?: string;
}

// =============================================
// TAGS PHYSIOLOGIQUES PAR SÉANCE (BASE DE DONNÉES)
// =============================================

/**
 * Table de mapping des séances externes vers tags physiologiques
 * Clé: ID de la séance (normalisé)
 */
export const WORKOUT_PHYSIO_TAGS: Record<string, WorkoutPhysioTags> = {
  // === WAHOO SYSTM ===
  
  // Récupération
  "recovery_ride": {
    intensity_type: "RECOVERY",
    metabolic_load: "LOW",
    glycolytic_stress: "LOW",
    neuromuscular_stress: "LOW",
    duration_class: "SHORT"
  },
  "easy_spin": {
    intensity_type: "RECOVERY",
    metabolic_load: "LOW",
    glycolytic_stress: "LOW",
    neuromuscular_stress: "LOW",
    duration_class: "SHORT"
  },
  
  // Z2 Endurance
  "endurance_1_0": {
    intensity_type: "Z2",
    metabolic_load: "LOW",
    glycolytic_stress: "LOW",
    neuromuscular_stress: "LOW",
    duration_class: "MEDIUM"
  },
  "endurance_1_5": {
    intensity_type: "Z2",
    metabolic_load: "LOW",
    glycolytic_stress: "LOW",
    neuromuscular_stress: "LOW",
    duration_class: "MEDIUM"
  },
  "endurance_2_0": {
    intensity_type: "Z2",
    metabolic_load: "MODERATE",
    glycolytic_stress: "LOW",
    neuromuscular_stress: "LOW",
    duration_class: "LONG"
  },
  "long_endurance_ride": {
    intensity_type: "Z2",
    metabolic_load: "MODERATE",
    glycolytic_stress: "LOW",
    neuromuscular_stress: "LOW",
    duration_class: "LONG"
  },
  
  // Tempo / Durabilité
  "sustained_tempo": {
    intensity_type: "TEMPO",
    metabolic_load: "MODERATE",
    glycolytic_stress: "MODERATE",
    neuromuscular_stress: "LOW",
    duration_class: "MEDIUM"
  },
  "sweet_spot": {
    intensity_type: "TEMPO",
    metabolic_load: "MODERATE",
    glycolytic_stress: "MODERATE",
    neuromuscular_stress: "LOW",
    duration_class: "MEDIUM"
  },
  "over_under_intervals": {
    intensity_type: "THRESHOLD",
    metabolic_load: "HIGH",
    glycolytic_stress: "HIGH",
    neuromuscular_stress: "MODERATE",
    duration_class: "MEDIUM"
  },
  
  // Force Endurance
  "tempo_low_cadence": {
    intensity_type: "FORCE",
    metabolic_load: "MODERATE",
    glycolytic_stress: "LOW",
    neuromuscular_stress: "MODERATE",
    duration_class: "MEDIUM"
  },
  "strength_endurance": {
    intensity_type: "FORCE",
    metabolic_load: "MODERATE",
    glycolytic_stress: "LOW",
    neuromuscular_stress: "HIGH",
    duration_class: "MEDIUM"
  },
  
  // Threshold
  "threshold": {
    intensity_type: "THRESHOLD",
    metabolic_load: "HIGH",
    glycolytic_stress: "HIGH",
    neuromuscular_stress: "MODERATE",
    duration_class: "MEDIUM"
  },
  "team_scream": {
    intensity_type: "THRESHOLD",
    metabolic_load: "HIGH",
    glycolytic_stress: "HIGH",
    neuromuscular_stress: "MODERATE",
    duration_class: "MEDIUM"
  },
  
  // VO2max
  "nine_hammers": {
    intensity_type: "VO2",
    metabolic_load: "HIGH",
    glycolytic_stress: "HIGH",
    neuromuscular_stress: "HIGH",
    duration_class: "MEDIUM"
  },
  "the_shovel": {
    intensity_type: "VO2",
    metabolic_load: "HIGH",
    glycolytic_stress: "HIGH",
    neuromuscular_stress: "HIGH",
    duration_class: "MEDIUM"
  },
  "a_very_dark_place": {
    intensity_type: "VO2",
    metabolic_load: "HIGH",
    glycolytic_stress: "HIGH",
    neuromuscular_stress: "HIGH",
    duration_class: "MEDIUM"
  },
  "half_monty": {
    intensity_type: "VO2",
    metabolic_load: "HIGH",
    glycolytic_stress: "HIGH",
    neuromuscular_stress: "MODERATE",
    duration_class: "MEDIUM"
  },
  "full_frontal": {
    intensity_type: "VO2",
    metabolic_load: "HIGH",
    glycolytic_stress: "HIGH",
    neuromuscular_stress: "HIGH",
    duration_class: "MEDIUM"
  },
  
  // Neuromusculaire
  "cadence_builds": {
    intensity_type: "NEURO",
    metabolic_load: "MODERATE",
    glycolytic_stress: "MODERATE",
    neuromuscular_stress: "HIGH",
    duration_class: "SHORT"
  },
  "power_station": {
    intensity_type: "NEURO",
    metabolic_load: "HIGH",
    glycolytic_stress: "HIGH",
    neuromuscular_stress: "HIGH",
    duration_class: "SHORT"
  },
  
  // === ZWIFT ===
  
  "zwift_sweet_spot_base": {
    intensity_type: "TEMPO",
    metabolic_load: "MODERATE",
    glycolytic_stress: "MODERATE",
    neuromuscular_stress: "LOW",
    duration_class: "MEDIUM"
  },
  "zwift_ftp_builder": {
    intensity_type: "THRESHOLD",
    metabolic_load: "HIGH",
    glycolytic_stress: "HIGH",
    neuromuscular_stress: "MODERATE",
    duration_class: "MEDIUM"
  },
  "zwift_vo2_intervals": {
    intensity_type: "VO2",
    metabolic_load: "HIGH",
    glycolytic_stress: "HIGH",
    neuromuscular_stress: "HIGH",
    duration_class: "SHORT"
  },
  "zwift_endurance": {
    intensity_type: "Z2",
    metabolic_load: "LOW",
    glycolytic_stress: "LOW",
    neuromuscular_stress: "LOW",
    duration_class: "MEDIUM"
  },
  
  // === ROUVY ===
  
  "rouvy_long_ride": {
    intensity_type: "Z2",
    metabolic_load: "LOW",
    glycolytic_stress: "LOW",
    neuromuscular_stress: "LOW",
    duration_class: "LONG"
  },
  "rouvy_climb_intervals": {
    intensity_type: "FORCE",
    metabolic_load: "MODERATE",
    glycolytic_stress: "MODERATE",
    neuromuscular_stress: "HIGH",
    duration_class: "MEDIUM"
  }
};

// =============================================
// RÈGLES DE DÉCISION (STAFF-GRADE)
// =============================================

/**
 * Seuils de fatigue pour les règles de décision
 */
export const FATIGUE_THRESHOLDS = {
  CRITICAL: 75,      // > 75% → fatigue critique
  HIGH: 55,          // 56-75% → fatigue élevée
  MODERATE: 30,      // 31-55% → fatigue modérée
  LOW: 0             // 0-30% → fatigue faible
};

/**
 * Messages pédagogiques standards
 */
export const ADVISORY_MESSAGES = {
  FATIGUE_CRITICAL: "Fatigue critique : priorité à l'absorption, pas à la stimulation.",
  VLAMAX_HIGH_LONG_DISTANCE: "Profil glycolytique élevé : cette séance accentue la dépendance glucidique.",
  TTE_LOW: "TTE insuffisant : priorité à la durabilité plutôt qu'à la puissance instantanée.",
  BALANCED_LOW_FATIGUE: "Contexte favorable : bonne fenêtre pour stimuler le plafond.",
  COACH_VALIDATION: "⚠️ Objectif très exigeant – validation coach recommandée"
};

/**
 * Évalue si une séance est compatible avec le contexte athlète
 */
function evaluateWorkoutCompatibility(
  tags: WorkoutPhysioTags,
  context: AdvisoryContext
): { status: AdvisoryStatus; reasons: string[]; alternative?: string } {
  const reasons: string[] = [];
  let status: AdvisoryStatus = "RECOMMENDED";
  let alternative: string | undefined;

  const isLongDistance = ["IM", "Ironman", "Marathon", "703", "70.3", "Half", "TrailLong", "Ultra"].includes(context.objectif);
  const vlamaxThreshold = getVLamaxThreshold(context.objectif);
  const tteTarget = getTTETarget(context.objectif);
  
  // === RÈGLE A: FATIGUE PRIORITAIRE (GARDE-FOU) ===
  // Si FatigueIndex > 75% → marquer toute séance HIGH glycolytic ou VO2 comme "Déconseillée"
  if (context.fatigueIndex > FATIGUE_THRESHOLDS.CRITICAL) {
    if (tags.glycolytic_stress === "HIGH" || tags.intensity_type === "VO2") {
      status = "DISCOURAGED";
      reasons.push(ADVISORY_MESSAGES.FATIGUE_CRITICAL);
      reasons.push(`Fatigue actuelle : ${context.fatigueIndex.toFixed(0)}%`);
      alternative = "Z2 longue ou Force basse cadence";
    } else if (tags.metabolic_load === "HIGH") {
      status = "CAUTION";
      reasons.push("Fatigue élevée : réduire l'intensité si possible.");
    }
  }

  // === RÈGLE B: VLAMAX ÉLEVÉ (OBJECTIFS LONGUE DISTANCE) ===
  if (context.vlamaxEffectif.value !== null && context.vlamaxEffectif.value > vlamaxThreshold && isLongDistance) {
    // Recommander Z2 longues et FORCE basse cadence
    if (tags.intensity_type === "Z2" || tags.intensity_type === "FORCE") {
      if (status === "RECOMMENDED") {
        reasons.push("Cohérent avec l'objectif de baisser VLamax pour longue distance.");
      }
    }
    // Déconseiller VO2 courts et sprints répétés
    else if (tags.intensity_type === "VO2" || tags.intensity_type === "NEURO") {
      if (status !== "DISCOURAGED") {
        status = "DISCOURAGED";
      }
      reasons.push(ADVISORY_MESSAGES.VLAMAX_HIGH_LONG_DISTANCE);
      reasons.push(`VLamax actuel : ${context.vlamaxEffectif.value.toFixed(2)} mmol/L/s (cible < ${vlamaxThreshold.toFixed(2)} pour ${context.objectif})`);
      alternative = "Endurance Z2 prolongée ou Force-endurance basse cadence";
    }
  }

  // === RÈGLE C: TTE FAIBLE ===
  if (context.tteEffectif.tte_min < tteTarget - 5) {
    // Recommander TEMPO long et THRESHOLD steady
    if (tags.intensity_type === "TEMPO" || (tags.intensity_type === "THRESHOLD" && tags.duration_class !== "SHORT")) {
      if (status === "RECOMMENDED") {
        reasons.push("Excellent choix pour développer la durabilité au seuil.");
      }
    }
    // Déconseiller séances très fractionnées
    else if (tags.intensity_type === "VO2" || tags.intensity_type === "NEURO") {
      if (status !== "DISCOURAGED") {
        status = status === "RECOMMENDED" ? "CAUTION" : status;
      }
      reasons.push(ADVISORY_MESSAGES.TTE_LOW);
      reasons.push(`TTE actuel : ${context.tteEffectif.tte_min} min (cible : ${tteTarget} min pour ${context.objectif})`);
      if (!alternative) {
        alternative = "Tempo soutenu ou Threshold steady-state";
      }
    }
  }

  // === RÈGLE D: PROFIL ÉQUILIBRÉ + FAIBLE FATIGUE ===
  if (
    context.fatigueIndex < 40 &&
    (context.vlamaxEffectif.value === null || context.vlamaxEffectif.value <= vlamaxThreshold)
  ) {
    // Autoriser séances VO2 / neuromusculaires
    if (tags.intensity_type === "VO2" || tags.intensity_type === "NEURO") {
      if (status === "RECOMMENDED" && reasons.length === 0) {
        reasons.push(ADVISORY_MESSAGES.BALANCED_LOW_FATIGUE);
      }
    }
  }

  // === GARDE-FOU ÉTHIQUE ===
  if (status === "RECOMMENDED" && reasons.length === 0) {
    reasons.push("Compatible avec votre profil physiologique actuel.");
  }

  return { status, reasons, alternative };
}

// =============================================
// FONCTION PRINCIPALE DU MOTEUR
// =============================================

/**
 * Génère les recommandations pour une liste de séances
 */
export function generateWorkoutAdvisories(
  workoutIds: string[],
  context: AdvisoryContext,
  platform: Platform = "WAHOO"
): AdvisoryEngineOutput {
  const advisories: WorkoutAdvisory[] = [];
  
  for (const workoutId of workoutIds) {
    const normalizedId = workoutId.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const tags = WORKOUT_PHYSIO_TAGS[normalizedId] || getDefaultPhysioTags();
    
    const { status, reasons, alternative } = evaluateWorkoutCompatibility(tags, context);
    
    const advisory: WorkoutAdvisory = {
      workout_id: workoutId,
      workout_name: formatWorkoutName(workoutId),
      platform,
      
      status,
      status_label: getStatusLabel(status),
      status_emoji: getStatusEmoji(status),
      status_color: getStatusColor(status),
      
      why: reasons[0] || "Aucune contre-indication majeure.",
      why_details: reasons,
      
      data_used: {
        fatigue_pct: context.fatigueIndex,
        vlamax: context.vlamaxEffectif.value,
        tte_min: context.tteEffectif.tte_min,
        objectif: context.objectif
      },
      
      alternative_suggestion: alternative,
      physio_tags: tags,
      
      confidence: computeConfidence(context, tags)
    };
    
    advisories.push(advisory);
  }
  
  // Calculer le résumé
  const summary = {
    recommended_count: advisories.filter(a => a.status === "RECOMMENDED").length,
    caution_count: advisories.filter(a => a.status === "CAUTION").length,
    discouraged_count: advisories.filter(a => a.status === "DISCOURAGED").length
  };
  
  // Générer le message contextuel
  const context_summary = generateContextSummary(context);
  
  // Message de garde si fatigue critique
  const guard_message = context.fatigueIndex > FATIGUE_THRESHOLDS.CRITICAL
    ? ADVISORY_MESSAGES.FATIGUE_CRITICAL
    : undefined;
  
  return {
    advisories,
    summary,
    context_summary,
    guard_message
  };
}

/**
 * Génère une recommandation unique pour une séance
 */
export function getWorkoutAdvisory(
  workoutId: string,
  context: AdvisoryContext,
  platform: Platform = "WAHOO"
): WorkoutAdvisory {
  const result = generateWorkoutAdvisories([workoutId], context, platform);
  return result.advisories[0];
}

// =============================================
// HELPERS
// =============================================

function getDefaultPhysioTags(): WorkoutPhysioTags {
  return {
    intensity_type: "TEMPO",
    metabolic_load: "MODERATE",
    glycolytic_stress: "MODERATE",
    neuromuscular_stress: "MODERATE",
    duration_class: "MEDIUM"
  };
}

function getStatusLabel(status: AdvisoryStatus): string {
  switch (status) {
    case "RECOMMENDED": return "Recommandée";
    case "CAUTION": return "Acceptable avec prudence";
    case "DISCOURAGED": return "Déconseillée actuellement";
  }
}

function getStatusEmoji(status: AdvisoryStatus): string {
  switch (status) {
    case "RECOMMENDED": return "🟢";
    case "CAUTION": return "🟡";
    case "DISCOURAGED": return "🔴";
  }
}

function getStatusColor(status: AdvisoryStatus): string {
  switch (status) {
    case "RECOMMENDED": return "text-green-600 dark:text-green-400";
    case "CAUTION": return "text-amber-600 dark:text-amber-400";
    case "DISCOURAGED": return "text-red-600 dark:text-red-400";
  }
}

function formatWorkoutName(workoutId: string): string {
  return workoutId
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function computeConfidence(context: AdvisoryContext, tags: WorkoutPhysioTags): number {
  // La confiance dépend de la qualité des données d'entrée
  const vlamaxConfidence = context.vlamaxEffectif.confidence;
  const tteConfidence = context.tteEffectif.confidence ?? 0.5;
  
  // Moyenne pondérée
  return (vlamaxConfidence * 0.4 + tteConfidence * 0.4 + 0.8 * 0.2);
}

function generateContextSummary(context: AdvisoryContext): string {
  const fatigueLevelText = 
    context.fatigueIndex > 75 ? "critique" :
    context.fatigueIndex > 55 ? "élevée" :
    context.fatigueIndex > 30 ? "modérée" : "faible";
  
  return `Fatigue ${fatigueLevelText} (${context.fatigueIndex.toFixed(0)}%), ` +
    `VLamax ${context.vlamaxEffectif.value?.toFixed(2) ?? "N/A"} mmol/L/s, ` +
    `TTE ${context.tteEffectif.tte_min} min, ` +
    `objectif ${context.objectif}`;
}

// =============================================
// TEXTES PÉDAGOGIQUES (ACADEMY)
// =============================================

export const WORKOUT_ADVISORY_DISCLAIMER = `Two For Coaching Lab ne remplace pas le coach.
Les recommandations sont des aides à la décision,
pas des prescriptions automatiques.`;

export const ACADEMY_WORKOUT_CHAPTER = {
  title: "Pourquoi certaines séances sont déconseillées (même si populaires)",
  sections: [
    {
      title: "Fatigue masquée",
      content: `Une fatigue élevée peut être invisible dans les métriques de forme,
mais elle limite la capacité d'adaptation. Ajouter du stress intense
sur un système fatigué augmente le risque de surentraînement.`
    },
    {
      title: "Confusion intensité / efficacité",
      content: `Une séance intense n'est pas forcément la plus efficace.
L'adaptation physiologique dépend du contexte : profil métabolique,
objectif, et état de fatigue actuel.`
    },
    {
      title: "Différence stimulus vs adaptation",
      content: `Le stimulus d'entraînement doit correspondre au besoin de développement.
Si votre VLamax est déjà élevé pour un objectif Ironman,
ajouter des séances VO2 n'améliore pas votre profil longue distance.`
    }
  ]
};

// =============================================
// ASSISTANT CHAT INTEGRATION
// =============================================

export const ASSISTANT_WORKOUT_RESPONSE = {
  question: "Pourquoi mon objectif n'est pas un chiffre précis ?",
  answer: `Parce que la physiologie humaine fonctionne par plages de probabilité,
pas par valeurs fixes. Two For Coaching Lab privilégie la précision réaliste
plutôt que la promesse irréaliste.`,
  extended: `Les recommandations de séances tiennent compte de :
• Votre niveau de fatigue actuel (FatigueIndex)
• Votre profil métabolique (VLamax)
• Votre durabilité au seuil (TTE)
• Votre objectif sportif

C'est pourquoi une même séance peut être recommandée un jour
et déconseillée le lendemain.`
};
