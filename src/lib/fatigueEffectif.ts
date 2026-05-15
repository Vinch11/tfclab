import { computePotentielEffectif, getScoreColor, getPotentielTargets, getTargets, getWeightsBySport, generateAthleteReadiness, computePillarCalculations, type PotentielInput, type PotentielResult, computePotentielSignature } from "@/lib/potentielPhysiologiqueEffectif";
// =============================================
// FATIGUE INDEX™ — Two For Coaching Lab
// Système officiel de quantification de la fatigue
// Source unique de vérité
// =============================================
//
// DÉFINITION OFFICIELLE :
// "La fatigue dans Two For Coaching Lab représente le niveau de contrainte
// physiologique et fonctionnelle récente susceptible de limiter
// l'expression du potentiel de performance, indépendamment du niveau de forme."
//
// CE N'EST PAS :
// - une blessure
// - un diagnostic médical
// - une valeur absolue
//
// C'EST :
// - un INDICE fonctionnel d'état du système
//
// =============================================

import { TTEEffectif, getTTETarget } from "./tteEffectif";
import { getCRRTargets } from "./chargeRecenteReference";
import { type PotentielPhysiologiqueEffectif } from "@/lib/potentielPhysiologiqueEffectif";
type PotentielPhysiologiqueEffectifCompat = PotentielPhysiologiqueEffectif;
import { VLamaxEffectif } from "./vlamaxEffectif";

// =============================================
// DÉFINITION OFFICIELLE (pour affichage UI)
// =============================================

export const FATIGUE_INDEX_DEFINITION = `La fatigue dans Two For Coaching Lab représente le niveau de contrainte
physiologique et fonctionnelle récente susceptible de limiter
l'expression du potentiel de performance,
indépendamment du niveau de forme.

Ce n'est PAS :
• une blessure
• un diagnostic médical  
• une valeur absolue

C'est :
• un INDICE fonctionnel d'état du système`;

export const FATIGUE_INDEX_DISCLAIMER = `Cet indice est un outil d'aide à la décision.
Il ne remplace ni l'expertise du coach,
ni un suivi médical.`;

export const FATIGUE_POSITIVE_NOTE = `Une fatigue élevée n'est pas négative en soi.
Elle devient problématique si elle empêche l'absorption de la charge.`;

export const FATIGUE_METHODOLOGY = {
  title: "FatigueIndex™ – Two For Coaching Lab",
  definition: FATIGUE_INDEX_DEFINITION,
  pillars: [
    {
      id: "charge",
      name: "Charge récente",
      weight: 40,
      emoji: "📊",
      description: "Basée sur TSS 7j, nombre de séances consécutives et densité d'intensité. Normalisée par rapport au profil de l'athlète."
    },
    {
      id: "durability",
      name: "Durabilité / TTE",
      weight: 25,
      emoji: "⏱️",
      description: "Si TTE effectif est bas par rapport à la cible → fatigue plus impactante. Un même TSS fatigue plus un athlète peu durable."
    },
    {
      id: "metabolic",
      name: "Profil métabolique",
      weight: 20,
      emoji: "🧬",
      description: "VLamax élevé = fatigue glycolytique plus rapide. VLamax bas = fatigue plus progressive."
    },
    {
      id: "subjective",
      name: "Signaux subjectifs",
      weight: 15,
      emoji: "💭",
      description: "Check-in fatigue / stress (1–10). Cohérence avec les données physiologiques. Ne jamais surpondérer seul."
    }
  ],
  formula: `FatigueIndex (%) =
  0.40 × ChargeScore
+ 0.25 × DurabilityPenalty
+ 0.20 × MetabolicPenalty
+ 0.15 × SubjectiveScore

Chaque sous-score est normalisé sur 0–100.`,
  disclaimer: FATIGUE_INDEX_DISCLAIMER
};

// =============================================
// ÉCHELLE OFFICIELLE D'INTERPRÉTATION
// =============================================

export interface FatigueLevel {
  min: number;
  max: number;
  label: string;
  shortLabel: string;
  description: string;
  color: "success" | "info" | "warning" | "destructive" | "critical";
  colorClass: string;
  badgeClass: string;
}

export const FATIGUE_SCALE: FatigueLevel[] = [
  {
    min: 0,
    max: 30,
    label: "Fatigue faible",
    shortLabel: "🟢 Faible",
    description: "Fraîcheur maximale. Potentiel pleinement exprimable. Conditions optimales pour la performance ou test.",
    color: "success",
    colorClass: "text-green-600 dark:text-green-400",
    badgeClass: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50"
  },
  {
    min: 30,
    max: 55,
    label: "Fatigue modérée",
    shortLabel: "🟡 Modérée",
    description: "Fatigue gérable. Charge en cours d'absorption. Capacité légèrement réduite mais fonctionnelle.",
    color: "warning",
    colorClass: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50"
  },
  {
    min: 55,
    max: 75,
    label: "Fatigue élevée",
    shortLabel: "🟠 Élevée",
    description: "Attention qualité des séances. Risque de stagnation si maintenue. Réduire l'intensité recommandé.",
    color: "destructive",
    colorClass: "text-orange-600 dark:text-orange-400",
    badgeClass: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/50"
  },
  {
    min: 75,
    max: 100,
    label: "Fatigue critique",
    shortLabel: "🔴 Critique",
    description: "Zone rouge. Risque de surperformance ou blessure. Priorité absolue à la récupération.",
    color: "critical",
    colorClass: "text-red-600 dark:text-red-400",
    badgeClass: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50"
  }
];

// =============================================
// TYPES
// =============================================

export interface FatigueContributions {
  chargeRecente: number;      // 0-100 (Charge récente - 40%)
  fatiguePercue: number;      // 0-100 (Signaux subjectifs - 15%)
  tte: number;                // 0-100 (TTE/Durabilité - 25%)
  fraicheur: number;          // 0-100 (Profil métabolique - 20%)
  modulateurs: number;        // 0-100 (Facteurs modérateurs)
}

export interface FatigueEffectif {
  score: number;                    // 0-100 (FatigueIndex final)
  level: FatigueLevel;              // Niveau d'interprétation
  contributions: FatigueContributions;
  contributionsWeighted: {          // Contributions pondérées (pour affichage)
    chargeRecente: number;          // × 0.40
    fatiguePercue: number;          // × 0.15
    tte: number;                    // × 0.25
    fraicheur: number;              // × 0.20
    modulateurs: number;
  };
  confidence: number;               // 0-1
  reasonsMissing: string[];         // Données manquantes
  messageAthlete: string;           // Message court pour l'athlète
  messageStaff: string;             // Message détaillé pour le staff
  recommendations: string[];        // Recommandations automatiques
  inputsUsed: {
    tss7d: number | null;
    tss7dHabituel: number | null;
    fatiguePercue: number | null;
    tteEffectif: number | null;
    tteTarget: number | null;
    potentielPhysiologique: number | null;
    age: number | null;
    vlamax: number | null;
  };
}

export interface ComputeFatigueParams {
  tss7d?: number | null;
  tss7dHabituel?: number | null;     // Charge habituelle de référence (si disponible)
  fatiguePercue?: number | null;     // NEW: Fatigue perçue (1-10, 1=frais, 10=épuisé)
  tteEffectif: TTEEffectif;
  potentielPhysiologique?: PotentielPhysiologiqueEffectifCompat | null;  // NULLABLE: peut être null si pas encore calculé
  vlamaxEffectif?: VLamaxEffectif | null;
  age?: number | null;
  objectif: string;
}

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function getFatigueLevel(score: number): FatigueLevel {
  for (const level of FATIGUE_SCALE) {
    if (score >= level.min && score < level.max) {
      return level;
    }
  }
  return FATIGUE_SCALE[FATIGUE_SCALE.length - 1];
}

// =============================================
// CALCUL DES SOUS-INDICES
// Pondérations FatigueIndex™ officielles:
// - Charge récente: 40%
// - Durabilité/TTE: 25%
// - Profil métabolique: 20%
// - Signaux subjectifs: 15%
// =============================================

/**
 * A) Indice Charge Récente (40%)
 * Compare TSS 7j à la charge habituelle
 * Plus la charge est élevée, plus la fatigue augmente
 */
function computeChargeRecenteIndex(
  tss7d: number | null,
  tss7dHabituel: number | null,
  objectif: string | null = null
): { index: number; confidence: number } {
  // Si pas de TSS, estimation neutre
  if (tss7d === null || tss7d === undefined) {
    return { index: 40, confidence: 0.3 };
  }

  // F36/F37: défaut objectif-aware (CRR.chargeOptimale) au lieu de 450 hardcodé
  const objectiveRef = objectif ? getCRRTargets(objectif).chargeOptimale : null;
  const chargeRef = tss7dHabituel ?? objectiveRef ?? 450;

  // Ratio charge récente / charge habituelle
  const ratio = tss7d / chargeRef;

  // Mapping non-linéaire : ratio > 1.3 = fatigue élevée, < 0.7 = frais
  let index: number;
  if (ratio <= 0.5) {
    index = 5; // Très frais (tapering)
  } else if (ratio <= 0.7) {
    index = 15; // Frais
  } else if (ratio <= 0.9) {
    index = 30; // Légèrement fatigué
  } else if (ratio <= 1.1) {
    index = 45; // Modéré
  } else if (ratio <= 1.3) {
    index = 65; // Élevé
  } else if (ratio <= 1.5) {
    index = 80; // Très élevé
  } else {
    index = 95; // Critique
  }

  return {
    index: clamp(index, 0, 100),
    confidence: tss7dHabituel ? 0.9 : (objectiveRef != null ? 0.75 : 0.55)
  };
}

/**
 * B) Indice Durabilité / TTE (25%)
 * Compare TTE effectif à la cible selon l'objectif
 * TTE inférieur = fatigue plus impactante (un même TSS fatigue plus un athlète peu durable)
 */
function computeTTEIndex(
  tteEffectif: TTEEffectif,
  objectif: string
): { index: number; confidence: number } {
  const target = getTTETarget(objectif);
  const tte = tteEffectif.tte_min;

  if (tteEffectif.source === "unknown") {
    return { index: 50, confidence: 0.2 };
  }

  // Ratio TTE actuel / cible
  const ratio = tte / target;

  // Mapping : TTE >= cible = frais, TTE < 80% cible = fatigue élevée
  let index: number;
  if (ratio >= 1.1) {
    index = 10; // Excellent
  } else if (ratio >= 1.0) {
    index = 20; // Cible atteinte
  } else if (ratio >= 0.9) {
    index = 35; // Proche cible
  } else if (ratio >= 0.8) {
    index = 50; // Modéré
  } else if (ratio >= 0.7) {
    index = 70; // Fatigue ou manque robustesse
  } else {
    index = 90; // Critique
  }

  return { 
    index: clamp(index, 0, 100), 
    confidence: tteEffectif.confidence 
  };
}

/**
 * D) Indice Signaux Subjectifs (15%)
 * Convertit le ressenti 1-10 en indice 0-100
 * Cohérence avec les données physiologiques. Ne jamais surpondérer seul.
 */
function computeFatiguePercueIndex(
  fatiguePercue: number | null
): { index: number; confidence: number } {
  // Si pas de donnée subjective, estimation neutre avec faible confiance
  if (fatiguePercue === null || fatiguePercue === undefined) {
    return { index: 45, confidence: 0.2 };
  }

  // Mapping linéaire: 1 → 0%, 5 → 45%, 10 → 100%
  // Formule: (fatiguePercue - 1) * 100 / 9
  const index = clamp(Math.round((fatiguePercue - 1) * 100 / 9), 0, 100);

  // Confiance élevée car donnée directe de l'athlète
  return { 
    index, 
    confidence: 0.9 
  };
}

/**
 * C) Indice Profil Métabolique (20%)
 * VLamax élevé = fatigue glycolytique plus rapide
 * VLamax bas = fatigue plus progressive
 * Combiné avec la fraîcheur métabolique du Potentiel Physiologique
 */
function computeFraicheurIndex(
  potentielPhysiologique: PotentielPhysiologiqueEffectif | null | undefined
): { index: number; confidence: number } {
  // Gestion robuste si potentielPhysiologique est null/undefined
  if (!potentielPhysiologique || potentielPhysiologique.score == null) {
    return { index: 50, confidence: 0.3 }; // Valeur neutre
  }

  const rr = potentielPhysiologique.score;

  // Inverse : RR élevé = fatigue basse
  // RR 85+ = fatigue 10%, RR 50 = fatigue 50%, RR 30 = fatigue 75%
  const index = clamp(100 - rr, 0, 100);

  return { 
    index, 
    confidence: potentielPhysiologique.confidence 
  };
}

/**
 * E) Indice Modulateurs Individuels (facteur correctif interne)
 * Âge + ajustements fins
 * Note: Ce facteur est intégré dans le calcul métabolique
 */
function computeModulateursIndex(
  age: number | null,
  vlamaxEffectif: VLamaxEffectif | null
): { index: number; confidence: number } {
  let index = 40; // Valeur neutre par défaut
  let confidence = 0.5;
  let factors = 0;

  // Effet de l'âge
  if (age !== null) {
    factors++;
    if (age >= 55) {
      // Plus de 55 ans : récupération plus lente
      index += 15;
    } else if (age >= 50) {
      index += 10;
    } else if (age >= 45) {
      index += 5;
    } else if (age <= 30) {
      // Jeunes : récupération plus rapide
      index -= 10;
    } else if (age <= 35) {
      index -= 5;
    }
    confidence = 0.7;
  }

  // Effet du VLamax
  if (vlamaxEffectif && vlamaxEffectif.value !== null) {
    factors++;
    const vlamax = vlamaxEffectif.value;
    
    // VLamax bas = fatigue plus lente MAIS récupération plus longue
    // VLamax élevé = fatigue rapide MAIS récupération plus courte
    // Pour simplifier : VLamax élevé = sensibilité accrue à la charge
    if (vlamax >= 0.55) {
      index += 10; // Glycolytique : fatigue plus rapide
    } else if (vlamax >= 0.45) {
      index += 5;
    } else if (vlamax <= 0.30) {
      index -= 10; // Oxydatif pur : résistance à la fatigue
    } else if (vlamax <= 0.35) {
      index -= 5;
    }
    
    confidence = factors > 1 ? 0.8 : 0.7;
  }

  return { 
    index: clamp(index, 0, 100), 
    confidence 
  };
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computeFatigueEffectif(params: ComputeFatigueParams): FatigueEffectif {
  const { 
    tss7d, 
    tss7dHabituel,
    fatiguePercue,
    tteEffectif, 
    potentielPhysiologique, 
    vlamaxEffectif,
    age,
    objectif 
  } = params;

  const reasonsMissing: string[] = [];

  // Calcul des sous-indices
  const chargeResult = computeChargeRecenteIndex(tss7d ?? null, tss7dHabituel ?? null);
  const fatiguePercueResult = computeFatiguePercueIndex(fatiguePercue ?? null);
  const tteResult = computeTTEIndex(tteEffectif, objectif);
  const fraicheurResult = computeFraicheurIndex(potentielPhysiologique);
  const modulateursResult = computeModulateursIndex(age ?? null, vlamaxEffectif ?? null);

  // Tracker les données manquantes
  if (tss7d === null || tss7d === undefined) {
    reasonsMissing.push("TSS 7 jours");
  }
  if (fatiguePercue === null || fatiguePercue === undefined) {
    reasonsMissing.push("Fatigue perçue (check-in)");
  }
  if (tteEffectif.source === "unknown") {
    reasonsMissing.push("TTE effectif");
  }
  if (age === null || age === undefined) {
    reasonsMissing.push("Âge de l'athlète");
  }

  // Contributions brutes
  const contributions: FatigueContributions = {
    chargeRecente: chargeResult.index,
    fatiguePercue: fatiguePercueResult.index,
    tte: tteResult.index,
    fraicheur: fraicheurResult.index,
    modulateurs: modulateursResult.index
  };

  // Pondérations FatigueIndex™ officielles (40/25/20/15)
  // - Charge récente: 40%
  // - Durabilité/TTE: 25%
  // - Profil métabolique: 20% (fraîcheur + modulateurs combinés)
  // - Signaux subjectifs: 15%
  const weights = {
    chargeRecente: 0.40,      // A) Charge récente
    fatiguePercue: 0.15,      // D) Signaux subjectifs
    tte: 0.25,                // B) Durabilité / TTE
    fraicheur: 0.12,          // C) Profil métabolique (partie fraîcheur)
    modulateurs: 0.08         // C) Profil métabolique (partie VLamax/âge)
  };

  // Contributions pondérées
  const contributionsWeighted = {
    chargeRecente: Math.round(contributions.chargeRecente * weights.chargeRecente),
    fatiguePercue: Math.round(contributions.fatiguePercue * weights.fatiguePercue),
    tte: Math.round(contributions.tte * weights.tte),
    fraicheur: Math.round(contributions.fraicheur * weights.fraicheur),
    modulateurs: Math.round(contributions.modulateurs * weights.modulateurs)
  };

  // Score final
  const rawScore = 
    contributions.chargeRecente * weights.chargeRecente +
    contributions.fatiguePercue * weights.fatiguePercue +
    contributions.tte * weights.tte +
    contributions.fraicheur * weights.fraicheur +
    contributions.modulateurs * weights.modulateurs;

  const score = clamp(Math.round(rawScore), 0, 100);

  // Confiance moyenne pondérée
  const confidence = clamp(
    chargeResult.confidence * weights.chargeRecente +
    fatiguePercueResult.confidence * weights.fatiguePercue +
    tteResult.confidence * weights.tte +
    fraicheurResult.confidence * weights.fraicheur +
    modulateursResult.confidence * weights.modulateurs,
    0, 1
  );

  // Niveau d'interprétation
  const level = getFatigueLevel(score);

  // Messages
  const messageAthlete = generateAthleteMessage(score, level);
  const messageStaff = generateStaffMessage(score, level, contributions, contributionsWeighted);
  const recommendations = generateRecommendations(score, level, contributions);

  return {
    score,
    level,
    contributions,
    contributionsWeighted,
    confidence,
    reasonsMissing,
    messageAthlete,
    messageStaff,
    recommendations,
    inputsUsed: {
      tss7d: tss7d ?? null,
      tss7dHabituel: tss7dHabituel ?? null,
      fatiguePercue: fatiguePercue ?? null,
      tteEffectif: tteEffectif.tte_min,
      tteTarget: getTTETarget(objectif),
      potentielPhysiologique: potentielPhysiologique?.score ?? null,
      age: age ?? null,
      vlamax: vlamaxEffectif?.value ?? null
    }
  };
}

// =============================================
// GÉNÉRATEURS DE MESSAGES
// =============================================

function generateAthleteMessage(score: number, level: FatigueLevel): string {
  return `${level.label} – ${level.description}`;
}

function generateStaffMessage(
  score: number, 
  level: FatigueLevel,
  contributions: FatigueContributions,
  weighted: FatigueContributions
): string {
  const lines: string[] = [];
  
  lines.push(`Fatigue fonctionnelle : ${score}% (${level.label})`);
  lines.push("");
  lines.push("Décomposition :");
  lines.push(`• Charge récente : +${weighted.chargeRecente}% (indice brut: ${contributions.chargeRecente}%)`);
  lines.push(`• Fatigue perçue : +${weighted.fatiguePercue}% (indice brut: ${contributions.fatiguePercue}%)`);
  lines.push(`• TTE effectif : +${weighted.tte}% (indice brut: ${contributions.tte}%)`);
  lines.push(`• Disponibilité métabolique : +${weighted.fraicheur}% (indice brut: ${contributions.fraicheur}%)`);
  lines.push(`• Facteurs individuels : +${weighted.modulateurs}% (indice brut: ${contributions.modulateurs}%)`);
  
  return lines.join("\n");
}

function generateRecommendations(
  score: number,
  level: FatigueLevel,
  contributions: FatigueContributions
): string[] {
  const recs: string[] = [];

  if (score < 15) {
    recs.push("Conditions optimales pour une séance clé ou une compétition");
    recs.push("Profiter de la fraîcheur pour tester les intensités hautes");
  } else if (score < 30) {
    recs.push("Charge bien absorbée, continuer le programme normalement");
  } else if (score < 45) {
    recs.push("Surveiller les sensations sur les séances intensives");
    if (contributions.chargeRecente > 60) {
      recs.push("Envisager une journée de récupération active");
    }
  } else if (score < 60) {
    recs.push("Réduire l'intensité des prochaines séances");
    recs.push("Prioriser la récupération : sommeil, nutrition, hydratation");
    if (contributions.tte > 60) {
      recs.push("Le TTE est impacté – éviter les efforts prolongés");
    }
  } else {
    recs.push("PRIORITÉ RÉCUPÉRATION : repos ou récupération active uniquement");
    recs.push("Pas de séance intensive avant retour sous 45% de fatigue");
    recs.push("Surveiller les signes de surentraînement : sommeil, humeur, appétit");
  }

  return recs;
}

// =============================================
// EXPORTS HELPERS UI
// =============================================

export function getFatigueIcon(score: number): string {
  if (score < 15) return "🔋"; // Batterie pleine
  if (score < 30) return "⚡"; // Énergie
  if (score < 45) return "⚠️"; // Attention
  if (score < 60) return "🔻"; // Baisse
  return "🛑"; // Stop
}

export function getFatigueColorClass(score: number): string {
  return getFatigueLevel(score).colorClass;
}

export function getFatigueBadgeClass(score: number): string {
  return getFatigueLevel(score).badgeClass;
}
