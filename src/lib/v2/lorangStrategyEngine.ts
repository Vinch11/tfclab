/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LORANG STRATEGY ENGINE – TFCL METHOD™
 * Two For Coaching Lab Official
 * 
 * Moteur décisionnel avancé transformant profil physiologique + disponibilité
 * en leviers d'entraînement concrets, inspirés de la méthodologie Dan Lorang.
 * 
 * PHILOSOPHIE :
 * - Ne cherche PAS la précision labo absolue
 * - Maximise la robustesse décisionnelle
 * - Explicite quoi faire / quoi éviter / pourquoi
 * - La décision coach prime sur l'algorithme
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES PRINCIPAUX
// ═══════════════════════════════════════════════════════════════════════════════

export type LorangLimiter = 
  | 'motor'           // Limiteur moteur (VO2max)
  | 'glycolytic'      // Limiteur glycolytique (VLamax trop haute)
  | 'metabolic'       // Limiteur métabolique (FatMax / glycogène)
  | 'neuromuscular'   // Limiteur neuromusculaire (force / économie)
  | 'availability';   // Limiteur disponibilité (fatigue / stress)

export type LorangLever = 
  | 'force_max'           // Force Max (gym lourde)
  | 'sfr_force_endurance' // SFR / Force Endurance
  | 'train_low'           // Train Low / Sleep Low
  | 'gut_training'        // Gut Training
  | 'heat_training'       // Heat Training
  | 'hrv_adaptation';     // HRV Rule-Based Adaptation

export type LorangProhibition = 
  | 'sprints'
  | 'micro_intervals'
  | 'erratic_pacing'
  | 'vo2_heavy_blocks'
  | 'train_low';

export type ConfidenceLevel = 'high' | 'moderate' | 'low';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LorangStrategyInput {
  // Données physiologiques
  physiology: {
    vo2max: number | null;
    vo2maxTarget: number;
    vlamax: number | null;
    vlamaxTarget: number;
    tte: number | null;
    tteTarget: number;
    fatmax: number | null;
    fatmaxTarget: number;
    economy: number | null;  // Score économie (0-100)
  };
  
  // Contexte athlète
  athlete: {
    age: number | null;
    discipline: 'IM' | '703' | 'marathon' | 'semi' | '10k' | 'cycling' | 'trail';
    ambition: 'finisher' | 'age_group' | 'competitor' | 'elite';
    hasGIIssues: boolean;
  };
  
  // Disponibilité
  availability: {
    score: number;          // 0-100
    level: 'high' | 'moderate' | 'low' | 'critical';
    hasAlerts: boolean;
    hrvOutOfRange2Days: boolean;  // HRV hors plage 2 jours consécutifs
  };
  
  // Symptômes terrain (optionnel)
  symptoms?: {
    earlyBurn: boolean;        // Brûlure précoce
    lateExplosion: boolean;    // Explosion tardive
    heavyLegs: boolean;        // Jambes lourdes cardio OK
    digestiveIssues: boolean;  // Problèmes digestifs
    lowCeiling: boolean;       // Plafond bas
    hrDrift: boolean;          // Dérive cardiaque
    noExplosivity: boolean;    // Pas d'explosivité
  };
  
  // Contexte temporel
  context: {
    daysToRace: number | null;
    isRaceWeek: boolean;
    currentPhase: 'base' | 'build' | 'peak' | 'taper' | 'recovery';
  };
  
  // Données charge
  load?: {
    tss7d: number | null;
    tss28d: number | null;
  };
}

export interface LorangLeverActivation {
  lever: LorangLever;
  label: string;
  icon: string;
  priority: 1 | 2 | 3;  // 1 = prioritaire
  reason: string;
  prescription: string[];
  warnings: string[];
  isStaffOnly: boolean;
  safetyChecklist?: string[];
}

export interface LorangProhibitionRule {
  prohibition: LorangProhibition;
  label: string;
  reason: string;
  explanation: string;
}

export interface LorangStrategyResult {
  // Limiteur principal identifié
  primaryLimiter: LorangLimiter;
  limiterLabel: string;
  limiterIcon: string;
  limiterExplanation: string;
  
  // Leviers activés (max 3)
  activatedLevers: LorangLeverActivation[];
  
  // Interdictions actives
  prohibitions: LorangProhibitionRule[];
  hasSprintBan: boolean;
  
  // Niveau de confiance
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  confidenceReasons: string[];
  
  // Synthèse décision
  summary: {
    mainAction: string;
    whyThis: string;
    whyNotOthers: string;
  };
  
  // Message athlète
  athleteMessage: string;
  
  // Intégration templates
  templateSuggestion: {
    weekType: 'force' | 'endurance' | 'vo2' | 'recovery' | 'mixed';
    weekLabel: string;
    reasoning: string;
  };
  
  // Disclaimer
  disclaimer: string;
  
  // Version
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES LORANG OFFICIELLES
// ═══════════════════════════════════════════════════════════════════════════════

export const LORANG_PHILOSOPHY = {
  principle: "Un athlète n'est jamais optimisé sur tous les fronts simultanément. " +
    "L'art du coaching est de choisir LE bon levier au bon moment.",
  
  disclaimer: "TFCL ne cherche PAS la précision absolue d'un laboratoire. " +
    "TFCL cherche la décision la plus robuste pour orienter l'entraînement. " +
    "La décision coach prime toujours sur l'algorithme.",
  
  athleteExplanation: "Cette stratégie identifie ton facteur limitant principal " +
    "et les leviers prioritaires pour progresser. " +
    "Elle s'adapte à ton profil, ta disponibilité et tes objectifs.",
};

export const LIMITER_DEFINITIONS: Record<LorangLimiter, {
  label: string;
  icon: string;
  description: string;
  symptoms: string[];
}> = {
  motor: {
    label: "Moteur aérobie",
    icon: "🫁",
    description: "Le plafond aérobie (VO2max) limite la performance. " +
      "L'athlète manque de 'cylindrée' pour soutenir des intensités élevées.",
    symptoms: ["Plafond bas", "Incapacité à accélérer", "Essoufflement rapide"],
  },
  glycolytic: {
    label: "Métabolisme glycolytique",
    icon: "🔥",
    description: "La VLamax trop élevée consomme le glycogène trop rapidement. " +
      "L'athlète 's'explose' sur les efforts longs.",
    symptoms: ["Brûlure précoce", "Explosion tardive", "Fatigue fin de course"],
  },
  metabolic: {
    label: "Efficacité énergétique",
    icon: "⛽",
    description: "L'oxydation des lipides (FatMax) ou la gestion du glycogène limite. " +
      "L'athlète manque d'autonomie énergétique.",
    symptoms: ["Problèmes digestifs", "Mur énergétique", "Dépendance aux glucides"],
  },
  neuromuscular: {
    label: "Neuromusculaire",
    icon: "💪",
    description: "La force ou l'économie musculaire limite. " +
      "L'athlète 'pédale carré' ou manque de puissance spécifique.",
    symptoms: ["Jambes lourdes cardio OK", "Économie faible", "Manque de force"],
  },
  availability: {
    label: "Disponibilité",
    icon: "🔋",
    description: "La fatigue, le stress ou le manque de récupération limitent. " +
      "L'athlète ne peut pas absorber la charge nécessaire.",
    symptoms: ["Fatigue chronique", "HRV perturbée", "Stress élevé"],
  },
};

export const LEVER_DEFINITIONS: Record<LorangLever, {
  label: string;
  icon: string;
  description: string;
  isStaffOnly: boolean;
}> = {
  force_max: {
    label: "Force Max",
    icon: "🏋️",
    description: "Renforcement neuromusculaire en salle (85-95% 1RM, 3-5 reps)",
    isStaffOnly: false,
  },
  sfr_force_endurance: {
    label: "SFR / Force Endurance",
    icon: "⚙️",
    description: "Travail à basse cadence (40-60 rpm) en zone Sweet Spot/Tempo",
    isStaffOnly: false,
  },
  train_low: {
    label: "Train Low / Sleep Low",
    icon: "🌙",
    description: "Entraînement à jeun ou avec glycogène réduit",
    isStaffOnly: true,
  },
  gut_training: {
    label: "Gut Training",
    icon: "🍌",
    description: "Progression tolérance glucides (60→90→110 g/h)",
    isStaffOnly: false,
  },
  heat_training: {
    label: "Heat Training",
    icon: "🌡️",
    description: "Acclimatation chaleur (30-45 min stress thermique modéré)",
    isStaffOnly: false,
  },
  hrv_adaptation: {
    label: "Adaptation HRV",
    icon: "💓",
    description: "Remplacement séance clé par Z2 si HRV hors plage 2j consécutifs",
    isStaffOnly: false,
  },
};

export const PROHIBITION_DEFINITIONS: Record<LorangProhibition, {
  label: string;
  reason: string;
}> = {
  sprints: {
    label: "Sprints",
    reason: "Augmenterait la VLamax, contre-productif pour l'objectif",
  },
  micro_intervals: {
    label: "Micro-intervalles explosifs",
    reason: "Sollicite le système glycolytique rapide",
  },
  erratic_pacing: {
    label: "Pacing erratique",
    reason: "Surconsommation glycogène par variations d'intensité",
  },
  vo2_heavy_blocks: {
    label: "Blocs VO2 lourds",
    reason: "Incompatible avec le travail de force max",
  },
  train_low: {
    label: "Train Low",
    reason: "Risque RED-S ou fatigue excessive dans ce contexte",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIQUE D'IDENTIFICATION DU LIMITEUR
// ═══════════════════════════════════════════════════════════════════════════════

function identifyPrimaryLimiter(input: LorangStrategyInput): {
  limiter: LorangLimiter;
  reasons: string[];
  confidence: ConfidenceLevel;
} {
  const { physiology, availability, symptoms } = input;
  const reasons: string[] = [];
  
  // Priorité 1: Disponibilité critique
  if (availability.level === 'critical' || availability.hasAlerts) {
    return {
      limiter: 'availability',
      reasons: ["Disponibilité critique ou alertes actives"],
      confidence: 'high',
    };
  }
  
  // Calcul des écarts vs cibles
  const vo2maxGap = physiology.vo2max !== null 
    ? (physiology.vo2max - physiology.vo2maxTarget) / physiology.vo2maxTarget 
    : null;
  const vlamaxGap = physiology.vlamax !== null 
    ? (physiology.vlamax - physiology.vlamaxTarget) / physiology.vlamaxTarget 
    : null;
  const tteGap = physiology.tte !== null 
    ? (physiology.tte - physiology.tteTarget) / physiology.tteTarget 
    : null;
  const fatmaxGap = physiology.fatmax !== null 
    ? (physiology.fatmax - physiology.fatmaxTarget) / physiology.fatmaxTarget 
    : null;
  
  // Scores de limitation (plus négatif = plus limitant)
  const scores: { limiter: LorangLimiter; score: number; reason: string }[] = [];
  
  // VO2max
  if (vo2maxGap !== null && vo2maxGap < -0.1) {
    scores.push({
      limiter: 'motor',
      score: vo2maxGap * 100,
      reason: `VO2max ${Math.abs(vo2maxGap * 100).toFixed(0)}% sous la cible`,
    });
  }
  
  // VLamax (inversé: trop haute = limitant)
  if (vlamaxGap !== null && vlamaxGap > 0.15) {
    scores.push({
      limiter: 'glycolytic',
      score: -vlamaxGap * 100,
      reason: `VLamax ${(vlamaxGap * 100).toFixed(0)}% au-dessus de la cible`,
    });
  }
  
  // FatMax
  if (fatmaxGap !== null && fatmaxGap < -0.15) {
    scores.push({
      limiter: 'metabolic',
      score: fatmaxGap * 100,
      reason: `FatMax ${Math.abs(fatmaxGap * 100).toFixed(0)}% sous la cible`,
    });
  }
  
  // Économie / Neuromusculaire
  const economyScore = physiology.economy ?? 50;
  if (economyScore < 50) {
    scores.push({
      limiter: 'neuromuscular',
      score: economyScore - 100,
      reason: `Économie faible (${economyScore}/100)`,
    });
  }
  
  // Symptômes terrain (ajustement)
  if (symptoms) {
    if (symptoms.earlyBurn || symptoms.lateExplosion) {
      const existing = scores.find(s => s.limiter === 'glycolytic');
      if (existing) existing.score -= 20;
      else scores.push({ limiter: 'glycolytic', score: -30, reason: "Symptômes glycolytiques terrain" });
    }
    if (symptoms.heavyLegs && !symptoms.hrDrift) {
      const existing = scores.find(s => s.limiter === 'neuromuscular');
      if (existing) existing.score -= 20;
      else scores.push({ limiter: 'neuromuscular', score: -30, reason: "Jambes lourdes mais cardio OK" });
    }
    if (symptoms.digestiveIssues) {
      const existing = scores.find(s => s.limiter === 'metabolic');
      if (existing) existing.score -= 15;
      else scores.push({ limiter: 'metabolic', score: -25, reason: "Problèmes digestifs déclarés" });
    }
    if (symptoms.lowCeiling || symptoms.noExplosivity) {
      const existing = scores.find(s => s.limiter === 'motor');
      if (existing) existing.score -= 15;
      else scores.push({ limiter: 'motor', score: -25, reason: "Plafond bas ou pas d'explosivité" });
    }
  }
  
  // Disponibilité modérée/faible = facteur aggravant
  if (availability.level === 'low') {
    scores.push({
      limiter: 'availability',
      score: -40,
      reason: "Disponibilité faible",
    });
  }
  
  // Tri par score (plus négatif en premier)
  scores.sort((a, b) => a.score - b.score);
  
  if (scores.length === 0) {
    return {
      limiter: 'motor',
      reasons: ["Aucun limiteur identifié clairement — focus moteur par défaut"],
      confidence: 'low',
    };
  }
  
  const primary = scores[0];
  const allReasons = scores.slice(0, 3).map(s => s.reason);
  
  // Confiance basée sur clarté du gap
  const gapClarity = scores.length > 1 
    ? Math.abs(scores[0].score - scores[1].score) 
    : 50;
  
  const confidence: ConfidenceLevel = gapClarity > 20 ? 'high' 
    : gapClarity > 10 ? 'moderate' 
    : 'low';
  
  return {
    limiter: primary.limiter,
    reasons: allReasons,
    confidence,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVATION DES LEVIERS
// ═══════════════════════════════════════════════════════════════════════════════

function activateLevers(
  input: LorangStrategyInput,
  primaryLimiter: LorangLimiter
): LorangLeverActivation[] {
  const levers: LorangLeverActivation[] = [];
  const { physiology, athlete, availability, context } = input;
  
  // LEVIER 1: Force Max
  const shouldActivateForceMax = (
    (athlete.age !== null && athlete.age > 35) ||
    (physiology.economy !== null && physiology.economy < 50) ||
    primaryLimiter === 'neuromuscular'
  ) && availability.level !== 'critical' && !context.isRaceWeek;
  
  if (shouldActivateForceMax) {
    levers.push({
      lever: 'force_max',
      label: LEVER_DEFINITIONS.force_max.label,
      icon: LEVER_DEFINITIONS.force_max.icon,
      priority: primaryLimiter === 'neuromuscular' ? 1 : 2,
      reason: athlete.age && athlete.age > 35 
        ? "Âge >35 ans — maintien force neuromusculaire essentiel"
        : "Économie faible — renforcement musculaire nécessaire",
      prescription: [
        "Gym lourde 85–95% 1RM",
        "3–5 répétitions par série",
        "2–3 séries max",
        "1–2x/semaine (hors semaines de course)",
      ],
      warnings: [
        "Ne pas combiner avec gros blocs VO2 la même semaine",
        "Récupération 48h minimum avant séance clé",
      ],
      isStaffOnly: false,
    });
  }
  
  // LEVIER 2: SFR / Force Endurance
  const shouldActivateSFR = (
    primaryLimiter === 'glycolytic' ||
    (physiology.vlamax !== null && physiology.vlamax > physiology.vlamaxTarget * 1.1)
  ) && availability.level !== 'critical';
  
  if (shouldActivateSFR) {
    levers.push({
      lever: 'sfr_force_endurance',
      label: LEVER_DEFINITIONS.sfr_force_endurance.label,
      icon: LEVER_DEFINITIONS.sfr_force_endurance.icon,
      priority: primaryLimiter === 'glycolytic' ? 1 : 2,
      reason: "VLamax élevée — travail basse cadence pour réduire sollicitation glycolytique",
      prescription: [
        "Cadence 40–60 rpm",
        "Zone Sweet Spot / Tempo",
        "Blocs de 10–20 min",
        "2–3x/semaine en phase Build",
      ],
      warnings: [
        "Progression progressive de la durée",
        "Surveiller les tensions genoux",
      ],
      isStaffOnly: false,
    });
  }
  
  // LEVIER 3: Train Low (Staff Only)
  const isLongDistance = ['IM', '703', 'marathon', 'trail'].includes(athlete.discipline);
  const daysToRace = context.daysToRace ?? 999;
  const shouldActivateTrainLow = (
    isLongDistance &&
    availability.score > 60 &&
    daysToRace > 14 &&
    (primaryLimiter === 'metabolic' || primaryLimiter === 'glycolytic')
  );
  
  if (shouldActivateTrainLow) {
    levers.push({
      lever: 'train_low',
      label: LEVER_DEFINITIONS.train_low.label,
      icon: LEVER_DEFINITIONS.train_low.icon,
      priority: 3,
      reason: "Objectif longue distance — amélioration oxydation lipidique",
      prescription: [
        "Sorties à jeun ou glycogène réduit",
        "Max 1–2x/semaine",
        "Intensité Z1-Z2 uniquement",
        "Ravitaillement normal post-séance",
      ],
      warnings: [
        "⚠️ Protocole Staff uniquement",
        "Interdit <14j avant course",
        "Risque RED-S — surveiller signes",
      ],
      isStaffOnly: true,
      safetyChecklist: [
        "Pas de signes de sous-alimentation chronique",
        "Cycles hormonaux normaux (femmes)",
        "Pas de perte de poids non intentionnelle",
        "Sommeil et humeur stables",
      ],
    });
  }
  
  // LEVIER 4: Gut Training
  const shouldActivateGutTraining = (
    isLongDistance &&
    (athlete.hasGIIssues || input.symptoms?.digestiveIssues)
  ) && availability.level !== 'critical';
  
  if (shouldActivateGutTraining) {
    levers.push({
      lever: 'gut_training',
      label: LEVER_DEFINITIONS.gut_training.label,
      icon: LEVER_DEFINITIONS.gut_training.icon,
      priority: primaryLimiter === 'metabolic' ? 1 : 2,
      reason: "Problèmes GI ou objectif longue distance — entraînement tolérance glucides",
      prescription: [
        "Progression 60 → 90 → 110 g/h",
        "Simulation nutrition course sur sorties longues",
        "Tester différents produits",
        "Journal des tolérances",
      ],
      warnings: [
        "Progression sur 4-6 semaines minimum",
        "Ne pas forcer si nausées persistantes",
      ],
      isStaffOnly: false,
    });
  }
  
  // LEVIER 5: Heat Training (optionnel — activable si prépa chaleur)
  // Non activé par défaut, à intégrer sur demande
  
  // LEVIER 6: HRV Adaptation
  if (availability.hrvOutOfRange2Days) {
    levers.push({
      lever: 'hrv_adaptation',
      label: LEVER_DEFINITIONS.hrv_adaptation.label,
      icon: LEVER_DEFINITIONS.hrv_adaptation.icon,
      priority: 1,  // Toujours prioritaire si activé
      reason: "HRV hors plage 2 jours consécutifs — adaptation automatique",
      prescription: [
        "Remplacer séance clé par Z2 60-90min",
        "Maintenir durée, réduire intensité",
        "Réévaluer après 24-48h",
      ],
      warnings: [
        "Règle Lorang officielle",
        "Ne pas ignorer — risque surmenage",
      ],
      isStaffOnly: false,
    });
  }
  
  // Limiter à 3 leviers max, triés par priorité
  return levers
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RÈGLES D'INTERDICTION
// ═══════════════════════════════════════════════════════════════════════════════

function computeProhibitions(
  input: LorangStrategyInput,
  primaryLimiter: LorangLimiter,
  activatedLevers: LorangLeverActivation[]
): LorangProhibitionRule[] {
  const prohibitions: LorangProhibitionRule[] = [];
  const { physiology, athlete, availability } = input;
  
  const isLongDistance = ['IM', '703', 'marathon', 'trail'].includes(athlete.discipline);
  const vlamaxTooHigh = physiology.vlamax !== null && 
    physiology.vlamax > physiology.vlamaxTarget * 1.1;
  
  // Sprint Ban Mode
  if (isLongDistance && (vlamaxTooHigh || primaryLimiter === 'glycolytic')) {
    prohibitions.push({
      prohibition: 'sprints',
      label: PROHIBITION_DEFINITIONS.sprints.label,
      reason: PROHIBITION_DEFINITIONS.sprints.reason,
      explanation: "Les sprints sollicitent fortement le système glycolytique rapide, " +
        "ce qui augmenterait la VLamax. Or, pour un objectif longue distance, " +
        "on cherche à la réduire pour optimiser l'utilisation des lipides.",
    });
    
    prohibitions.push({
      prohibition: 'micro_intervals',
      label: PROHIBITION_DEFINITIONS.micro_intervals.label,
      reason: PROHIBITION_DEFINITIONS.micro_intervals.reason,
      explanation: "Les micro-intervalles explosifs (10-20s all-out) développent " +
        "la puissance glycolytique, incompatible avec l'objectif de réduction VLamax.",
    });
    
    prohibitions.push({
      prohibition: 'erratic_pacing',
      label: PROHIBITION_DEFINITIONS.erratic_pacing.label,
      reason: PROHIBITION_DEFINITIONS.erratic_pacing.reason,
      explanation: "Un pacing irrégulier (accélérations/décélérations) surconsomme " +
        "le glycogène par rapport à un effort régulier. Privilégier un effort constant.",
    });
  }
  
  // Interdiction blocs VO2 si Force Max activé
  const forceMaxActive = activatedLevers.some(l => l.lever === 'force_max');
  if (forceMaxActive) {
    prohibitions.push({
      prohibition: 'vo2_heavy_blocks',
      label: PROHIBITION_DEFINITIONS.vo2_heavy_blocks.label,
      reason: PROHIBITION_DEFINITIONS.vo2_heavy_blocks.reason,
      explanation: "Le travail de force max nécessite une récupération neuromusculaire " +
        "incompatible avec les blocs VO2 intensifs. Séparer ces stimuli dans le temps.",
    });
  }
  
  // Interdiction Train Low si disponibilité faible
  if (availability.level === 'low' || availability.level === 'critical') {
    prohibitions.push({
      prohibition: 'train_low',
      label: PROHIBITION_DEFINITIONS.train_low.label,
      reason: PROHIBITION_DEFINITIONS.train_low.reason,
      explanation: "La disponibilité actuelle ne permet pas les protocoles restrictifs. " +
        "Priorité à la récupération et à l'alimentation adéquate.",
    });
  }
  
  return prohibitions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUGGESTION TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

function suggestTemplateWeek(
  primaryLimiter: LorangLimiter,
  activatedLevers: LorangLeverActivation[],
  context: LorangStrategyInput['context']
): LorangStrategyResult['templateSuggestion'] {
  // Phase taper/recovery = toujours récup
  if (context.currentPhase === 'taper' || context.currentPhase === 'recovery') {
    return {
      weekType: 'recovery',
      weekLabel: "Semaine Récupération",
      reasoning: "Phase de récupération/affûtage — maintien sans surcharge",
    };
  }
  
  // Force Max prioritaire
  const forceMaxPriority = activatedLevers.find(l => l.lever === 'force_max' && l.priority === 1);
  if (forceMaxPriority) {
    return {
      weekType: 'force',
      weekLabel: "Semaine Force / Neuro",
      reasoning: "Limiteur neuromusculaire identifié — priorité au renforcement",
    };
  }
  
  // Limiteur moteur
  if (primaryLimiter === 'motor') {
    return {
      weekType: 'vo2',
      weekLabel: "Semaine Développement VO2",
      reasoning: "Plafond aérobie limitant — focus développement moteur",
    };
  }
  
  // Limiteur glycolytique
  if (primaryLimiter === 'glycolytic') {
    return {
      weekType: 'endurance',
      weekLabel: "Semaine Endurance / SFR",
      reasoning: "VLamax trop élevée — volume Z2 + travail force endurance",
    };
  }
  
  // Défaut
  return {
    weekType: 'mixed',
    weekLabel: "Semaine Équilibrée",
    reasoning: "Profil sans limiteur majeur — maintien des acquis",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export function computeLorangStrategy(input: LorangStrategyInput): LorangStrategyResult {
  // 1. Identification du limiteur
  const limiterResult = identifyPrimaryLimiter(input);
  const limiterDef = LIMITER_DEFINITIONS[limiterResult.limiter];
  
  // 2. Activation des leviers
  const activatedLevers = activateLevers(input, limiterResult.limiter);
  
  // 3. Calcul des interdictions
  const prohibitions = computeProhibitions(input, limiterResult.limiter, activatedLevers);
  const hasSprintBan = prohibitions.some(p => p.prohibition === 'sprints');
  
  // 4. Suggestion template
  const templateSuggestion = suggestTemplateWeek(
    limiterResult.limiter, 
    activatedLevers, 
    input.context
  );
  
  // 5. Synthèse
  const primaryLever = activatedLevers[0];
  const summary = {
    mainAction: primaryLever 
      ? `Focus ${primaryLever.label}` 
      : "Maintenir l'équilibre actuel",
    whyThis: limiterResult.reasons[0] || "Profil équilibré",
    whyNotOthers: prohibitions.length > 0
      ? `Éviter: ${prohibitions.map(p => p.label).join(', ')}`
      : "Aucune contre-indication majeure",
  };
  
  // 6. Message athlète
  const athleteMessage = generateAthleteMessage(limiterResult.limiter, activatedLevers, hasSprintBan);
  
  // 7. Confiance globale
  const confidenceLabel = limiterResult.confidence === 'high' ? "Élevée"
    : limiterResult.confidence === 'moderate' ? "Modérée"
    : "Faible";
  
  return {
    primaryLimiter: limiterResult.limiter,
    limiterLabel: limiterDef.label,
    limiterIcon: limiterDef.icon,
    limiterExplanation: limiterDef.description,
    
    activatedLevers,
    
    prohibitions,
    hasSprintBan,
    
    confidence: limiterResult.confidence,
    confidenceLabel,
    confidenceReasons: limiterResult.reasons,
    
    summary,
    athleteMessage,
    templateSuggestion,
    
    disclaimer: LORANG_PHILOSOPHY.disclaimer,
    version: METHOD_VERSION_DISPLAY,
  };
}

function generateAthleteMessage(
  limiter: LorangLimiter,
  levers: LorangLeverActivation[],
  hasSprintBan: boolean
): string {
  const limiterMessages: Record<LorangLimiter, string> = {
    motor: "Ton plafond aérobie peut encore progresser. On va travailler ton 'moteur' avec des séances d'intensité ciblées.",
    glycolytic: "Ton système glycolytique consomme trop vite ton carburant. On va l'optimiser avec du travail d'endurance spécifique.",
    metabolic: "Ton efficacité énergétique peut progresser. Focus sur l'utilisation des lipides et la tolérance glucides.",
    neuromuscular: "Tes muscles peuvent gagner en force et en économie. Un travail neuromusculaire ciblé va t'aider.",
    availability: "Ta récupération est prioritaire. On adapte le plan pour te permettre de régénérer avant de charger.",
  };
  
  let message = limiterMessages[limiter];
  
  if (hasSprintBan) {
    message += " On évite les sprints pour l'instant — ils iraient à l'encontre de ton objectif.";
  }
  
  if (levers.length > 0) {
    message += ` Levier principal : ${levers[0].label}.`;
  }
  
  return message;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS COMPLÉMENTAIRES
// ═══════════════════════════════════════════════════════════════════════════════

export function getAvailabilityLevel(score: number): 'high' | 'moderate' | 'low' | 'critical' {
  if (score >= 70) return 'high';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'low';
  return 'critical';
}

export function getAvailabilityEmoji(level: 'high' | 'moderate' | 'low' | 'critical'): string {
  switch (level) {
    case 'high': return '🟢';
    case 'moderate': return '🟡';
    case 'low': return '🟠';
    case 'critical': return '🔴';
  }
}
