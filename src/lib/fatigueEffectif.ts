// =============================================
// FATIGUE FONCTIONNELLE — Two For Coaching Lab
// Source unique de vérité
// =============================================
//
// DÉFINITION OFFICIELLE :
// "La fatigue correspond à une diminution estimée de la capacité de l'athlète 
// à exprimer son potentiel physiologique actuel, en raison de la charge récente, 
// de la durabilité à l'effort (TTE), de la fraîcheur métabolique et de facteurs individuels.
// Ce score est un indicateur fonctionnel d'aide à la décision, et non une mesure biologique directe."
//
// =============================================

import { TTEEffectif, getTTETarget } from "./tteEffectif";
import { RaceReadinessEffectif } from "./raceReadinessEffectif";
import { VLamaxEffectif } from "./vlamaxEffectif";

// =============================================
// DÉFINITION OFFICIELLE (pour affichage UI)
// =============================================

export const FATIGUE_METHODOLOGY = {
  title: "Fatigue fonctionnelle – Two For Coaching Lab",
  definition: `La fatigue correspond à une diminution estimée de la capacité de l'athlète à exprimer son potentiel physiologique actuel, en raison de la charge récente, de la durabilité à l'effort (TTE), de la fraîcheur métabolique, du ressenti subjectif et de facteurs individuels.

Ce score combine données objectives (TSS, TTE) et subjectives (fatigue perçue par l'athlète). C'est un indicateur fonctionnel d'aide à la décision, et non une mesure biologique directe.`,
  pillars: [
    {
      name: "Charge récente",
      weight: 30,
      description: "Comparaison de la charge hebdomadaire (TSS 7j) à la charge habituelle de l'athlète. Plus la charge récente est élevée, plus la fatigue augmente."
    },
    {
      name: "Fatigue perçue (subjective)",
      weight: 20,
      description: "Ressenti de l'athlète sur une échelle de 1 (frais) à 10 (épuisé). Cette donnée subjective capture ce que les métriques objectives ne détectent pas toujours."
    },
    {
      name: "Durabilité – TTE effectif",
      weight: 20,
      description: "Comparaison du TTE effectif à la cible selon l'objectif. Un TTE inférieur à la cible indique une fatigue accrue ou un manque de robustesse."
    },
    {
      name: "Fraîcheur métabolique (Race Readiness)",
      weight: 20,
      description: "Utilise le score Race Readiness déjà calculé. Plus la fraîcheur est basse, plus la fatigue augmente."
    },
    {
      name: "Facteurs modérateurs individuels",
      weight: 10,
      description: "Âge de l'athlète et profil VLamax. Un VLamax bas = fatigue plus lente mais récupération plus longue. Un VLamax élevé = fatigue rapide mais récupération plus courte."
    }
  ],
  formula: `Fatigue (%) = 
    0.30 × Indice Charge Récente 
  + 0.20 × Indice Fatigue Perçue
  + 0.20 × Indice TTE 
  + 0.20 × Indice Fraîcheur 
  + 0.10 × Indice Modulateurs`,
  disclaimer: "Les scores sont des estimations combinant données objectives et subjectives. Ils doivent être interprétés avec le contexte. Le jugement du coach prime sur l'algorithme."
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
    max: 15,
    label: "Très frais",
    shortLabel: "Frais",
    description: "Potentiel pleinement exprimable. Conditions optimales pour la performance.",
    color: "success",
    colorClass: "text-green-600 dark:text-green-400",
    badgeClass: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50"
  },
  {
    min: 15,
    max: 30,
    label: "Fatigue légère",
    shortLabel: "Légère",
    description: "Charge bien absorbée. Capacité quasi-intacte.",
    color: "info",
    colorClass: "text-blue-600 dark:text-blue-400",
    badgeClass: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/50"
  },
  {
    min: 30,
    max: 45,
    label: "Fatigue modérée",
    shortLabel: "Modérée",
    description: "Vigilance sur l'intensité. Capacité à exprimer le potentiel légèrement réduite.",
    color: "warning",
    colorClass: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50"
  },
  {
    min: 45,
    max: 60,
    label: "Fatigue élevée",
    shortLabel: "Élevée",
    description: "Risque de stagnation ou surmenage. Réduire l'intensité recommandé.",
    color: "destructive",
    colorClass: "text-orange-600 dark:text-orange-400",
    badgeClass: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/50"
  },
  {
    min: 60,
    max: 100,
    label: "Fatigue critique",
    shortLabel: "Critique",
    description: "Priorité récupération. Risque de blessure ou surentraînement.",
    color: "critical",
    colorClass: "text-red-600 dark:text-red-400",
    badgeClass: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50"
  }
];

// =============================================
// TYPES
// =============================================

export interface FatigueContributions {
  chargeRecente: number;      // 0-100
  fatiguePercue: number;      // 0-100 (NEW: subjective)
  tte: number;                // 0-100
  fraicheur: number;          // 0-100
  modulateurs: number;        // 0-100
}

export interface FatigueEffectif {
  score: number;                    // 0-100 (score final)
  level: FatigueLevel;              // Niveau d'interprétation
  contributions: FatigueContributions;
  contributionsWeighted: {          // Contributions pondérées (pour affichage)
    chargeRecente: number;
    fatiguePercue: number;
    tte: number;
    fraicheur: number;
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
    raceReadiness: number | null;
    age: number | null;
    vlamax: number | null;
  };
}

export interface ComputeFatigueParams {
  tss7d?: number | null;
  tss7dHabituel?: number | null;     // Charge habituelle de référence (si disponible)
  fatiguePercue?: number | null;     // NEW: Fatigue perçue (1-10, 1=frais, 10=épuisé)
  tteEffectif: TTEEffectif;
  raceReadiness: RaceReadinessEffectif;
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
// =============================================

/**
 * A) Indice Charge Récente (35%)
 * Compare TSS 7j à la charge habituelle
 * Plus la charge est élevée, plus la fatigue augmente
 */
function computeChargeRecenteIndex(
  tss7d: number | null,
  tss7dHabituel: number | null
): { index: number; confidence: number } {
  // Si pas de TSS, estimation neutre
  if (tss7d === null || tss7d === undefined) {
    return { index: 40, confidence: 0.3 };
  }

  // Charge habituelle par défaut si non fournie
  const chargeRef = tss7dHabituel ?? 450; // Valeur moyenne raisonnable

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
    confidence: tss7dHabituel ? 0.9 : 0.6 
  };
}

/**
 * B) Indice TTE (25%)
 * Compare TTE effectif à la cible selon l'objectif
 * TTE inférieur = fatigue ou manque de robustesse
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
 * NEW: Indice Fatigue Perçue (20%)
 * Convertit le ressenti 1-10 en indice 0-100
 * 1=Frais (0%), 5=Neutre (45%), 10=Épuisé (100%)
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
 * C) Indice Fraîcheur / Race Readiness (25%)
 * Inverse du Race Readiness (haut RR = faible fatigue)
 */
function computeFraicheurIndex(
  raceReadiness: RaceReadinessEffectif
): { index: number; confidence: number } {
  const rr = raceReadiness.score;

  // Inverse : RR élevé = fatigue basse
  // RR 85+ = fatigue 10%, RR 50 = fatigue 50%, RR 30 = fatigue 75%
  const index = clamp(100 - rr, 0, 100);

  return { 
    index, 
    confidence: raceReadiness.confidence 
  };
}

/**
 * D) Indice Modulateurs Individuels (15%)
 * Âge + Profil VLamax
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
    raceReadiness, 
    vlamaxEffectif,
    age,
    objectif 
  } = params;

  const reasonsMissing: string[] = [];

  // Calcul des sous-indices
  const chargeResult = computeChargeRecenteIndex(tss7d ?? null, tss7dHabituel ?? null);
  const fatiguePercueResult = computeFatiguePercueIndex(fatiguePercue ?? null);
  const tteResult = computeTTEIndex(tteEffectif, objectif);
  const fraicheurResult = computeFraicheurIndex(raceReadiness);
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

  // Pondérations (nouvelles: 30/20/20/20/10)
  const weights = {
    chargeRecente: 0.30,
    fatiguePercue: 0.20,
    tte: 0.20,
    fraicheur: 0.20,
    modulateurs: 0.10
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
      raceReadiness: raceReadiness.score,
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
  lines.push(`• Fraîcheur métabolique : +${weighted.fraicheur}% (indice brut: ${contributions.fraicheur}%)`);
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
