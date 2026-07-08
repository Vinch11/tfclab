/**
 * TWO FOR COACHING LAB METHOD™ — Plages de Cadence de Travail
 * 
 * Ce module :
 * - Ne définit JAMAIS une cadence idéale unique
 * - Propose des plages de travail contextuelles
 * - Relie cadence ↔ VLamax ↔ TTE ↔ objectif
 * - Sert uniquement à guider l'entraînement (staff-grade)
 * 
 * Ce module ne corrige pas l'athlète, il éclaire le coach.
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';
import type { VLamaxEffectif } from '../vlamaxEffectif';
import type { TTEEffectif } from '../tteEffectif';
import { getVlamaxTarget } from './vlamaxTargets';


// ============================================
// TYPES
// ============================================

export type SportType = 'bike' | 'run';
export type RangeCategory = 'force_metabolique' | 'economie_cible' | 'reequilibrage' | 'observation_only';

export interface CadenceWorkRange {
  id: RangeCategory;
  name: string;
  rpmMin: number;
  rpmMax: number;
  zones: string[];
  objective: string;
  message: string;
  staffNote?: string;
}

export interface CadenceRangeResult {
  sport: SportType;
  ranges: CadenceWorkRange[];
  mainMessage: string;
  badge: string;
  isObservationOnly: boolean;
  context: {
    vlamaxStatus: 'high' | 'moderate' | 'low' | 'unknown';
    tteStatus: 'insufficient' | 'correct' | 'good' | 'unknown';
    spontaneousCadence?: 'high' | 'moderate' | 'low' | 'unknown';
  };
}

export interface CadenceWorkRangesInput {
  sport: SportType;
  vlamaxEffectif: VLamaxEffectif | null;
  tteEffectif: TTEEffectif | null;
  objectif: string;
  spontaneousCadenceRpm?: number | null;
  age?: number | null;
}

// ============================================
// 1️⃣ PRINCIPE MÉTHODOLOGIQUE OFFICIEL
// ============================================

export const METHODOLOGICAL_PRINCIPLE = {
  id: 'principle',
  title: "Principe Méthodologique Officiel",
  icon: "📋",
  officialText: `Two For Coaching Lab ne prescrit pas une cadence cible.
Il identifie des plages de travail pertinentes selon le profil physiologique et l'objectif.`,
  considerations: [
    {
      id: "strategy",
      label: "Stratégie mécanique",
      description: "La cadence est un outil, pas une qualité"
    },
    {
      id: "training",
      label: "Outil d'entraînement",
      description: "Sert à développer des qualités spécifiques"
    },
    {
      id: "not_goal",
      label: "Jamais une finalité",
      description: "Aucune cadence n'est 'bonne' ou 'mauvaise' isolément"
    }
  ]
};

// ============================================
// 2️⃣ DONNÉES UTILISÉES (LECTURE SEULE)
// ============================================

export const DATA_SOURCES = {
  id: 'data_sources',
  title: "Données Utilisées",
  icon: "📊",
  description: "Le module lit ces données sans les recalculer",
  sources: [
    { id: 'vlamax', label: 'VLamax Effectif', description: 'Valeur + confiance' },
    { id: 'tte', label: 'TTE Effectif', description: 'Durabilité au seuil' },
    { id: 'objectif', label: 'Objectif', description: 'IM / 70.3 / Marathon / Semi' },
    { id: 'sport', label: 'Sport', description: 'Vélo / CAP' },
    { id: 'cadence', label: 'Cadence spontanée', description: 'Si disponible via plateformes' },
    { id: 'age', label: 'Âge', description: 'Si renseigné' }
  ]
};

// ============================================
// 3️⃣ PLAGES DE TRAVAIL VÉLO
// ============================================

export const BIKE_WORK_RANGES: Record<string, CadenceWorkRange> = {
  force_metabolique: {
    id: 'force_metabolique',
    name: "Force métabolique",
    rpmMin: 55,
    rpmMax: 65,
    zones: ["Z2", "Tempo"],
    objective: "Réduire coût glycolytique / augmenter couple tolérable",
    message: "Cette plage vise à rendre la puissance plus durable, pas à rouler lent.",
    staffNote: "Applicable si VLamax élevé ET TTE insuffisant. Ne pas dépasser 20-30min par séance au début."
  },
  economie_cible: {
    id: 'economie_cible',
    name: "Économie cible",
    rpmMin: 75,
    rpmMax: 85,
    zones: ["Z2", "Allure course"],
    objective: "Efficacité longue durée",
    message: "Zone souvent observée chez les profils longue distance robustes.",
    staffNote: "Zone de travail principale pour profils équilibrés. Compatible avec volume important."
  },
  reequilibrage: {
    id: 'reequilibrage',
    name: "Rééquilibrage mécanique",
    rpmMin: 65,
    rpmMax: 75,
    zones: ["Z2", "Tempo"],
    objective: "Renforcer ce qui rend la cadence élevée coûteuse",
    message: "On ne change pas ta cadence naturelle, on renforce ce qui la rend coûteuse.",
    staffNote: "Pour athlètes avec cadence spontanée >95 rpm et force limitée. Travail progressif."
  }
};

// ============================================
// 4️⃣ CAP : OBSERVATION UNIQUEMENT
// ============================================

export const CAP_OBSERVATION = {
  id: 'cap_observation',
  title: "Course à pied : Observation uniquement",
  icon: "👀",
  safeguard: "En course à pied, la cadence n'est PAS manipulée comme en vélo.",
  interpretation: {
    highCadenceHighVlamax: {
      observation: "Cadence élevée + VLamax élevé",
      meaning: "Coût musculaire potentiel",
      action: "Observation — pas prescription"
    },
    lowCadenceLowTTE: {
      observation: "Cadence basse + TTE faible",
      meaning: "Risque mécanique",
      action: "Observation — pas prescription"
    }
  },
  displayLabel: "Observation — pas prescription"
};

// ============================================
// 5️⃣ SEUILS DE RÉFÉRENCE
// ============================================

export const THRESHOLDS = {
  // ⚠️  VLamax : cibles issues de la SOURCE UNIQUE `vlamaxTargets.ts`.
  //     high = borne haute de la plage cible ; low = borne basse.
  //     Discipline = vélo par défaut (module partagé bike/run ; le sport
  //     est repassé au niveau appelant si besoin d'affiner).
  // TTE thresholds
  tte: {
    insufficient: 40,
    correct: 50,
    good: 60
  },
  // Cadence spontanée
  cadence: {
    high: 95,
    moderate_low: 80,
    low: 70
  }
};

// ============================================
// FONCTIONS PRINCIPALES
// ============================================

/**
 * Détermine le statut VLamax par rapport à l'objectif (SOURCE UNIQUE).
 */
function getVlamaxStatus(
  vlamax: VLamaxEffectif | null,
  objectif: string,
  sport: SportType = 'bike',
): 'high' | 'moderate' | 'low' | 'unknown' {
  if (!vlamax || vlamax.value === null) return 'unknown';
  const target = getVlamaxTarget(objectif, sport);
  if (vlamax.value > target.max) return 'high';
  if (vlamax.value < target.min) return 'low';
  return 'moderate';
}


/**
 * Détermine le statut TTE
 */
function getTTEStatus(
  tte: TTEEffectif | null
): 'insufficient' | 'correct' | 'good' | 'unknown' {
  if (!tte || tte.source === 'unknown') return 'unknown';
  
  if (tte.tte_min < THRESHOLDS.tte.insufficient) return 'insufficient';
  if (tte.tte_min >= THRESHOLDS.tte.good) return 'good';
  return 'correct';
}

/**
 * Détermine le statut de cadence spontanée
 */
function getCadenceStatus(
  rpm: number | null | undefined
): 'high' | 'moderate' | 'low' | 'unknown' {
  if (rpm === null || rpm === undefined) return 'unknown';
  
  if (rpm > THRESHOLDS.cadence.high) return 'high';
  if (rpm < THRESHOLDS.cadence.moderate_low) return 'low';
  return 'moderate';
}

/**
 * Calcule les plages de cadence de travail recommandées
 * 
 * LOGIQUE VÉLO:
 * A) VLamax élevé + TTE insuffisant → Force métabolique
 * B) VLamax modéré + TTE correct → Économie cible
 * C) Cadence spontanée très élevée → Rééquilibrage mécanique
 * 
 * LOGIQUE CAP:
 * → Observation uniquement, pas de prescription
 */
export function computeCadenceWorkRanges(input: CadenceWorkRangesInput): CadenceRangeResult {
  const { sport, vlamaxEffectif, tteEffectif, objectif, spontaneousCadenceRpm } = input;
  
  const vlamaxStatus = getVlamaxStatus(vlamaxEffectif, objectif);
  const tteStatus = getTTEStatus(tteEffectif);
  const cadenceStatus = getCadenceStatus(spontaneousCadenceRpm);
  
  const context = {
    vlamaxStatus,
    tteStatus,
    spontaneousCadence: cadenceStatus
  };

  // ========== CAP : OBSERVATION UNIQUEMENT ==========
  if (sport === 'run') {
    return {
      sport: 'run',
      ranges: [],
      mainMessage: CAP_OBSERVATION.safeguard,
      badge: CAP_OBSERVATION.displayLabel,
      isObservationOnly: true,
      context
    };
  }

  // ========== VÉLO : PLAGES DE TRAVAIL ==========
  const ranges: CadenceWorkRange[] = [];

  // A) VLamax élevé ET TTE insuffisant → Force métabolique
  if (vlamaxStatus === 'high' && (tteStatus === 'insufficient' || tteStatus === 'correct')) {
    ranges.push(BIKE_WORK_RANGES.force_metabolique);
  }

  // B) VLamax modéré/bas + TTE correct/bon → Économie cible
  if ((vlamaxStatus === 'moderate' || vlamaxStatus === 'low') && 
      (tteStatus === 'correct' || tteStatus === 'good')) {
    ranges.push(BIKE_WORK_RANGES.economie_cible);
  }

  // C) Cadence spontanée très élevée (>95 rpm) → Rééquilibrage
  if (cadenceStatus === 'high') {
    // Ajouter uniquement si pas déjà de plage force
    if (!ranges.some(r => r.id === 'force_metabolique')) {
      ranges.push(BIKE_WORK_RANGES.reequilibrage);
    }
  }

  // Si aucune plage déterminée mais données disponibles → Économie par défaut
  if (ranges.length === 0 && vlamaxStatus !== 'unknown' && tteStatus !== 'unknown') {
    ranges.push(BIKE_WORK_RANGES.economie_cible);
  }

  // Message principal
  let mainMessage = METHODOLOGICAL_PRINCIPLE.officialText;
  if (ranges.length > 0) {
    mainMessage = ranges[0].message;
  }

  return {
    sport: 'bike',
    ranges,
    mainMessage,
    badge: "Outil de travail — pas une consigne",
    isObservationOnly: false,
    context
  };
}

// ============================================
// HELPERS POUR L'UI
// ============================================

export function getRangeColorClass(rangeId: RangeCategory): string {
  switch (rangeId) {
    case 'force_metabolique':
      return 'border-amber-500 bg-amber-50 dark:bg-amber-950/30';
    case 'economie_cible':
      return 'border-green-500 bg-green-50 dark:bg-green-950/30';
    case 'reequilibrage':
      return 'border-blue-500 bg-blue-50 dark:bg-blue-950/30';
    default:
      return 'border-muted bg-muted/50';
  }
}

export function getRangeIconClass(rangeId: RangeCategory): string {
  switch (rangeId) {
    case 'force_metabolique':
      return '💪';
    case 'economie_cible':
      return '⚡';
    case 'reequilibrage':
      return '🔄';
    default:
      return '📊';
  }
}

export function formatRpmRange(range: CadenceWorkRange): string {
  return `${range.rpmMin}–${range.rpmMax} rpm`;
}

export function formatZones(range: CadenceWorkRange): string {
  return range.zones.join(' / ');
}

// ============================================
// GÉNÉRATION D'ANNOTATIONS STAFF
// ============================================

export interface CadenceRangeAnnotation {
  title: string;
  context: string;
  recommendation: string;
  why: string;
  tone: 'info' | 'action' | 'caution';
}

export function generateCadenceRangeAnnotation(
  result: CadenceRangeResult
): CadenceRangeAnnotation | null {
  if (result.isObservationOnly) {
    return {
      title: "Cadence CAP — Observation",
      context: "Course à pied : la cadence n'est pas un levier d'entraînement direct",
      recommendation: CAP_OBSERVATION.displayLabel,
      why: "En CAP, la manipulation de la cadence ne suit pas la même logique qu'en vélo. Risques mécaniques prioritaires.",
      tone: 'info'
    };
  }

  if (result.ranges.length === 0) {
    return null;
  }

  const mainRange = result.ranges[0];
  
  return {
    title: `Plage ${mainRange.name}`,
    context: `${formatRpmRange(mainRange)} en ${formatZones(mainRange)}`,
    recommendation: mainRange.message,
    why: mainRange.objective,
    tone: mainRange.id === 'force_metabolique' ? 'action' : 'info'
  };
}

// ============================================
// INTÉGRATION CHATBOT
// ============================================

export interface CadenceRangeChatbotQA {
  question: string;
  keywords: string[];
  answer: string;
}

export const CADENCE_RANGE_CHATBOT_QA: CadenceRangeChatbotQA[] = [
  {
    question: "Quelle cadence dois-je viser ?",
    keywords: ['cadence', 'viser', 'idéale', 'cible', 'quelle'],
    answer: `Two For Coaching Lab ne prescrit pas une cadence cible unique.

Nous identifions des plages de travail pertinentes selon :
• Votre VLamax (profil métabolique)
• Votre TTE (durabilité)
• Votre objectif (IM, 70.3, Marathon...)

La cadence est un outil d'entraînement, pas une finalité.
Consultez la carte "Plages de travail recommandées" pour voir les plages adaptées à votre profil.`
  },
  {
    question: "Pourquoi travailler à basse cadence ?",
    keywords: ['basse cadence', 'force', '55', '60', '65', 'pourquoi'],
    answer: `Le travail basse cadence (55-65 rpm) vise à :
• Réduire le coût glycolytique par coup de pédale
• Augmenter le couple tolérable sur longue durée
• Développer les fibres lentes

Ce travail est recommandé si :
• Votre VLamax est élevé par rapport à votre objectif
• Votre TTE est insuffisant

Message clé : Cette plage vise à rendre la puissance plus durable, pas à rouler lent.`
  },
  {
    question: "Puis-je appliquer la même logique en course à pied ?",
    keywords: ['course à pied', 'cap', 'running', 'même', 'logique'],
    answer: `Non, en course à pied, la cadence n'est PAS manipulée comme en vélo.

La différence fondamentale :
• Vélo : la cadence est un levier d'entraînement actif
• CAP : la cadence est une observation, pas une prescription

En CAP, nous analysons la cadence pour identifier des risques potentiels, mais nous ne proposons pas de plages de travail spécifiques.

L'application affiche "Observation — pas prescription" pour la course à pied.`
  }
];

export function findCadenceRangeChatbotAnswer(question: string): CadenceRangeChatbotQA | null {
  const questionLower = question.toLowerCase();
  
  for (const qa of CADENCE_RANGE_CHATBOT_QA) {
    const matchCount = qa.keywords.filter(kw => questionLower.includes(kw.toLowerCase())).length;
    if (matchCount >= 2) {
      return qa;
    }
  }
  
  return null;
}

// ============================================
// DOCUMENT COMPLET (ACADEMY)
// ============================================

export const CADENCE_WORK_RANGES_DOCUMENT = {
  title: "Plages de Cadence de Travail",
  subtitle: "Two For Coaching Lab Method™",
  version: METHOD_VERSION_DISPLAY,
  sections: [
    { 
      id: 'principle', 
      title: METHODOLOGICAL_PRINCIPLE.title, 
      icon: METHODOLOGICAL_PRINCIPLE.icon, 
      content: METHODOLOGICAL_PRINCIPLE 
    },
    { 
      id: 'data', 
      title: DATA_SOURCES.title, 
      icon: DATA_SOURCES.icon, 
      content: DATA_SOURCES 
    },
    { 
      id: 'bike_ranges', 
      title: "Plages Vélo", 
      icon: "🚴", 
      content: Object.values(BIKE_WORK_RANGES) 
    },
    { 
      id: 'cap_observation', 
      title: CAP_OBSERVATION.title, 
      icon: CAP_OBSERVATION.icon, 
      content: CAP_OBSERVATION 
    }
  ]
};

export const ACADEMY_CADENCE_RANGES_MODULE = {
  id: "cadence_work_ranges",
  title: "Plages de Cadence de Travail",
  icon: "🎯",
  description: "Comprendre les plages de travail contextuelles selon le profil",
  isRequired: false,
  estimatedTime: "8 min",
  chapters: [
    {
      id: "principle",
      title: "Principe méthodologique",
      content: METHODOLOGICAL_PRINCIPLE.officialText,
      keyPoints: [
        "Pas de cadence idéale unique",
        "Plages contextuelles selon profil",
        "La cadence est un outil, pas une finalité"
      ]
    },
    {
      id: "bike_ranges",
      title: "Plages de travail vélo",
      content: "Trois plages principales selon le profil VLamax/TTE",
      keyPoints: [
        "Force métabolique : 55-65 rpm (VLamax élevé + TTE faible)",
        "Économie cible : 75-85 rpm (profil équilibré)",
        "Rééquilibrage : 65-75 rpm (cadence spontanée très haute)"
      ]
    },
    {
      id: "cap_difference",
      title: "Différence vélo vs CAP",
      content: CAP_OBSERVATION.safeguard,
      keyPoints: [
        "En CAP : observation uniquement",
        "Pas de plages prescrites",
        "Risques mécaniques prioritaires"
      ]
    }
  ]
};
