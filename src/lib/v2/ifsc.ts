/**
 * TWO FOR COACHING LAB METHOD™ — Indice de Force Spécifique Cycliste (IFSC™)
 * 
 * Cet indice vise à :
 * - Estimer la capacité de l'athlète à produire et soutenir du couple
 * - Contextualiser la cadence de travail
 * - Éclairer les choix force / vélocité
 * - Sécuriser la lecture VLamax / TTE en cyclisme
 * 
 * IFSC™ n'est PAS une mesure directe.
 * C'est un indice composite interprétatif.
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';
import type { VLamaxEffectif } from '../vlamaxEffectif';
import type { TTEEffectif } from '../tteEffectif';

// ============================================
// TYPES
// ============================================

export type IFSCLevel = 'fragile' | 'limited' | 'functional' | 'robust' | 'exceptional';

export interface IFSCResult {
  score: number;           // 0-100
  level: IFSCLevel;
  label: string;
  message: string;
  staffNote: string;
  confidence: number;      // 0-1
  components: {
    ftpKgContribution: number;
    tteContribution: number;
    vlamaxPenalty: number;
  };
}

export interface IFSCInput {
  ftp: number | null;
  weightKg: number | null;
  tteMin: number | null;
  tteSource: string;
  vlamax: number | null;
  vlamaxConfidence: number;
  spontaneousCadenceRpm?: number | null;
  objectif: string;
  age?: number | null;
}

export interface CadenceForceMatrix {
  ifscLevel: IFSCLevel;
  cadenceLevel: 'high' | 'moderate' | 'low' | 'unknown';
  interpretation: string;
  risk: 'low' | 'medium' | 'high';
  recommendation: string;
}

// ============================================
// 1️⃣ PRINCIPE MÉTHODOLOGIQUE OFFICIEL
// ============================================

export const IFSC_PRINCIPLE = {
  id: 'principle',
  title: "Principe Méthodologique",
  icon: "💪",
  
  officialText: `La performance longue distance ne dépend pas de la cadence,
mais de la capacité à produire un couple soutenable à coût métabolique maîtrisé.`,
  
  clarification: "L'IFSC™ ne cherche PAS la force maximale, mais la force *tolérable et durable*.",
  
  keyPoints: [
    "Force soutenable > Force maximale",
    "Coût métabolique maîtrisé",
    "Durabilité du couple sur longue distance"
  ]
};

// ============================================
// 2️⃣ DONNÉES UTILISÉES
// ============================================

export const IFSC_DATA_SOURCES = {
  id: 'data_sources',
  title: "Données Utilisées",
  icon: "📊",
  description: "Aucun capteur exotique requis",
  
  sources: [
    { id: 'ftp', label: 'FTP', description: 'Depuis le profil référence', required: true },
    { id: 'weight', label: 'Poids', description: 'Pour calcul FTP/kg', required: true },
    { id: 'tte', label: 'TTE effectif', description: 'Durabilité au seuil', required: true },
    { id: 'vlamax', label: 'VLamax effectif', description: 'Profil métabolique', required: true },
    { id: 'cadence', label: 'Cadence spontanée', description: 'Si disponible', required: false },
    { id: 'objectif', label: 'Objectif', description: 'IM / 70.3 / autre', required: true },
    { id: 'age', label: 'Âge', description: 'Optionnel', required: false }
  ],
  
  note: "Aucune donnée n'est recalculée ailleurs."
};

// ============================================
// 4️⃣ ÉCHELLE OFFICIELLE IFSC™
// ============================================

export interface IFSCScaleLevel {
  level: IFSCLevel;
  min: number;
  max: number;
  label: string;
  message: string;
  color: string;
  bgColor: string;
}

export const IFSC_SCALE: IFSCScaleLevel[] = [
  {
    level: 'fragile',
    min: 0,
    max: 30,
    label: "Force fragile",
    message: "Le couple coûte cher, attention aux basses cadences prolongées.",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30"
  },
  {
    level: 'limited',
    min: 31,
    max: 55,
    label: "Force limitée",
    message: "Le travail force doit être progressif et encadré.",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30"
  },
  {
    level: 'functional',
    min: 56,
    max: 75,
    label: "Force fonctionnelle",
    message: "Couple bien toléré, profil robuste longue distance.",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30"
  },
  {
    level: 'robust',
    min: 76,
    max: 90,
    label: "Force très robuste",
    message: "Capacité à soutenir de la force spécifique sans dérive.",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30"
  },
  {
    level: 'exceptional',
    min: 91,
    max: 100,
    label: "Exceptionnel",
    message: "Profil élite force-endurance.",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30"
  }
];

// ============================================
// 5️⃣ MATRICE CADENCE × FORCE
// ============================================

export const CADENCE_FORCE_MATRIX: CadenceForceMatrix[] = [
  {
    ifscLevel: 'fragile',
    cadenceLevel: 'high',
    interpretation: "Vélocité compensatoire",
    risk: 'medium',
    recommendation: "La cadence élevée compense un déficit de force. Travail force progressif recommandé."
  },
  {
    ifscLevel: 'fragile',
    cadenceLevel: 'moderate',
    interpretation: "Zone de vigilance",
    risk: 'medium',
    recommendation: "Force fragile mais cadence non compensatoire. Focus sur durabilité."
  },
  {
    ifscLevel: 'fragile',
    cadenceLevel: 'low',
    interpretation: "Risque métabolique & musculaire",
    risk: 'high',
    recommendation: "Éviter les basses cadences prolongées. Risque de fatigue excessive."
  },
  {
    ifscLevel: 'limited',
    cadenceLevel: 'high',
    interpretation: "Compensation probable",
    risk: 'low',
    recommendation: "Stratégie adaptée au profil. Travail force pour diversifier."
  },
  {
    ifscLevel: 'limited',
    cadenceLevel: 'moderate',
    interpretation: "Équilibre fragile",
    risk: 'low',
    recommendation: "Zone acceptable. Développer la force progressivement."
  },
  {
    ifscLevel: 'limited',
    cadenceLevel: 'low',
    interpretation: "Risque surcharge",
    risk: 'medium',
    recommendation: "Surveiller la fatigue musculaire. Limiter durée basse cadence."
  },
  {
    ifscLevel: 'functional',
    cadenceLevel: 'high',
    interpretation: "Choix tactique valide",
    risk: 'low',
    recommendation: "Force correcte, cadence élevée par choix. Pas de correction nécessaire."
  },
  {
    ifscLevel: 'functional',
    cadenceLevel: 'moderate',
    interpretation: "Efficacité mécanique",
    risk: 'low',
    recommendation: "Équilibre optimal longue distance. Maintenir ce profil."
  },
  {
    ifscLevel: 'functional',
    cadenceLevel: 'low',
    interpretation: "Profil force assumé",
    risk: 'low',
    recommendation: "Force bien tolérée. Surveiller charge mécanique."
  },
  {
    ifscLevel: 'robust',
    cadenceLevel: 'high',
    interpretation: "Réserve de force inexploitée",
    risk: 'low',
    recommendation: "Potentiel force élevé. Peut varier les stratégies."
  },
  {
    ifscLevel: 'robust',
    cadenceLevel: 'moderate',
    interpretation: "Profil élite longue distance",
    risk: 'low',
    recommendation: "Configuration optimale. Maintenir et développer."
  },
  {
    ifscLevel: 'robust',
    cadenceLevel: 'low',
    interpretation: "Spécialiste force",
    risk: 'low',
    recommendation: "Profil rare et robuste. Attention surcharge mécanique à très long terme."
  },
  {
    ifscLevel: 'exceptional',
    cadenceLevel: 'high',
    interpretation: "Polyvalence maximale",
    risk: 'low',
    recommendation: "Capacité à performer dans toutes configurations."
  },
  {
    ifscLevel: 'exceptional',
    cadenceLevel: 'moderate',
    interpretation: "Excellence",
    risk: 'low',
    recommendation: "Profil élite complet."
  },
  {
    ifscLevel: 'exceptional',
    cadenceLevel: 'low',
    interpretation: "Dominance force",
    risk: 'low',
    recommendation: "Capacité exceptionnelle à soutenir du couple."
  }
];

// ============================================
// 8️⃣ GARDE-FOU SCIENTIFIQUE
// ============================================

export const IFSC_SAFEGUARD = {
  id: 'safeguard',
  title: "Garde-fou scientifique",
  icon: "⚠️",
  
  text: `L'IFSC™ est une estimation fonctionnelle.
Il doit être interprété avec le contexte de charge, fatigue et objectif.`,
  
  badge: "Indice composite — interprétation staff",
  
  limitations: [
    "Ne remplace pas une évaluation force en laboratoire",
    "Sensible à la qualité des données d'entrée",
    "Doit être croisé avec les observations terrain"
  ]
};

// ============================================
// FONCTION DE CALCUL IFSC™
// ============================================

/**
 * Calcule l'IFSC™ (Indice de Force Spécifique Cycliste)
 * 
 * Formule conceptuelle :
 * IFSC_raw = (FTP / poids) × (TTE / 60) × (1 / (1 + VLamax))
 * Puis normalisation sur 0–100
 */
export function computeIFSC(input: IFSCInput): IFSCResult | null {
  const { ftp, weightKg, tteMin, vlamax, vlamaxConfidence, objectif } = input;
  
  // Vérification des données minimales requises
  if (ftp === null || weightKg === null || weightKg <= 0 || tteMin === null || vlamax === null) {
    return null;
  }
  
  // ===== CALCUL DES COMPOSANTS =====
  
  // 1. Contribution FTP/kg (normalisée sur référence 4.0 W/kg)
  const ftpKg = ftp / weightKg;
  const ftpKgNormalized = Math.min(1.5, ftpKg / 4.0); // Cap à 1.5 (6 W/kg)
  
  // 2. Contribution TTE (normalisée sur référence 60 min)
  const tteNormalized = Math.min(1.5, tteMin / 60); // Cap à 1.5 (90 min)
  
  // 3. Pénalité VLamax (plus VLamax est haut, moins on tolère le couple)
  // VLamax 0.30 → pénalité faible, VLamax 0.60 → pénalité forte
  const vlamaxPenalty = 1 / (1 + vlamax);
  
  // ===== CALCUL BRUT =====
  const ifscRaw = ftpKgNormalized * tteNormalized * vlamaxPenalty;
  
  // ===== NORMALISATION 0-100 =====
  // Calibration : ifscRaw typique entre 0.3 et 1.2
  // On mappe sur 0-100 avec ajustement
  const ifscScore = Math.round(Math.min(100, Math.max(0, ifscRaw * 75)));
  
  // ===== AJUSTEMENT PAR OBJECTIF =====
  // Pour IM, on valorise légèrement plus le TTE
  let adjustedScore = ifscScore;
  if (objectif === 'IM' || objectif === 'Ironman') {
    adjustedScore = Math.round(ifscScore * 1.05); // +5% pour IM
  }
  adjustedScore = Math.min(100, adjustedScore);
  
  // ===== DÉTERMINATION DU NIVEAU =====
  const scaleLevel = IFSC_SCALE.find(s => adjustedScore >= s.min && adjustedScore <= s.max) 
    || IFSC_SCALE[0];
  
  // ===== CONFIANCE =====
  // Basée sur la confiance VLamax et la source TTE
  let confidence = vlamaxConfidence * 0.6;
  if (input.tteSource === 'observed') confidence += 0.3;
  else if (input.tteSource === 'estimated') confidence += 0.15;
  confidence = Math.min(1, confidence);
  
  // ===== NOTE STAFF =====
  let staffNote = "";
  if (adjustedScore <= 30) {
    staffNote = "Privilégier le travail vélocité/économie avant force. Progression lente recommandée.";
  } else if (adjustedScore <= 55) {
    staffNote = "Potentiel de développement force présent. Intégrer travail basse cadence progressif.";
  } else if (adjustedScore <= 75) {
    staffNote = "Profil équilibré. Peut alterner travail force et économie selon objectif.";
  } else {
    staffNote = "Capacité force élevée. Peut exploiter stratégies variées de cadence.";
  }
  
  return {
    score: adjustedScore,
    level: scaleLevel.level,
    label: scaleLevel.label,
    message: scaleLevel.message,
    staffNote,
    confidence,
    components: {
      ftpKgContribution: Math.round(ftpKgNormalized * 100),
      tteContribution: Math.round(tteNormalized * 100),
      vlamaxPenalty: Math.round((1 - vlamaxPenalty) * 100)
    }
  };
}

// ============================================
// LECTURE CROISÉE CADENCE × FORCE
// ============================================

export function getCadenceForceInterpretation(
  ifscLevel: IFSCLevel,
  cadenceRpm: number | null | undefined
): CadenceForceMatrix | null {
  // Déterminer le niveau de cadence
  let cadenceLevel: 'high' | 'moderate' | 'low' | 'unknown' = 'unknown';
  
  if (cadenceRpm !== null && cadenceRpm !== undefined) {
    if (cadenceRpm > 92) cadenceLevel = 'high';
    else if (cadenceRpm >= 78) cadenceLevel = 'moderate';
    else cadenceLevel = 'low';
  }
  
  if (cadenceLevel === 'unknown') return null;
  
  // Trouver dans la matrice
  return CADENCE_FORCE_MATRIX.find(
    m => m.ifscLevel === ifscLevel && m.cadenceLevel === cadenceLevel
  ) || null;
}

// ============================================
// HELPERS UI
// ============================================

export function getIFSCScaleInfo(level: IFSCLevel): IFSCScaleLevel {
  return IFSC_SCALE.find(s => s.level === level) || IFSC_SCALE[0];
}

export function getIFSCColor(level: IFSCLevel): string {
  return getIFSCScaleInfo(level).color;
}

export function getIFSCBgColor(level: IFSCLevel): string {
  return getIFSCScaleInfo(level).bgColor;
}

export function getRiskColor(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'low': return 'text-green-600 dark:text-green-400';
    case 'medium': return 'text-amber-600 dark:text-amber-400';
    case 'high': return 'text-red-600 dark:text-red-400';
  }
}

export function formatIFSCScore(score: number): string {
  return `${score}/100`;
}

// ============================================
// GÉNÉRATION ANNOTATIONS STAFF
// ============================================

export interface IFSCAnnotation {
  title: string;
  score: string;
  level: string;
  interpretation: string;
  recommendation: string;
  cadenceNote?: string;
}

export function generateIFSCAnnotation(
  ifsc: IFSCResult,
  cadenceRpm?: number | null
): IFSCAnnotation {
  const annotation: IFSCAnnotation = {
    title: "Force Spécifique Cycliste (IFSC™)",
    score: formatIFSCScore(ifsc.score),
    level: ifsc.label,
    interpretation: ifsc.message,
    recommendation: ifsc.staffNote
  };
  
  const matrixResult = getCadenceForceInterpretation(ifsc.level, cadenceRpm);
  if (matrixResult) {
    annotation.cadenceNote = `${matrixResult.interpretation} — ${matrixResult.recommendation}`;
  }
  
  return annotation;
}

// ============================================
// CHATBOT Q&A
// ============================================

export interface IFSCChatbotQA {
  question: string;
  keywords: string[];
  answer: string;
}

export const IFSC_CHATBOT_QA: IFSCChatbotQA[] = [
  {
    question: "C'est quoi l'IFSC ?",
    keywords: ['ifsc', 'force spécifique', 'indice force', 'quoi'],
    answer: `L'IFSC™ (Indice de Force Spécifique Cycliste) est un indicateur composite qui estime votre capacité à produire et soutenir du couple sur longue durée.

**Ce qu'il mesure :**
• Durabilité de votre force, pas la force maximale
• Coût métabolique de la production de couple
• Compatibilité avec votre profil VLamax/TTE

**Comment il est calculé :**
Il combine votre FTP/kg, votre TTE et votre VLamax pour estimer si vous tolérez bien les efforts à couple élevé.

⚠️ C'est une estimation fonctionnelle, pas une mesure directe. À interpréter avec le contexte.`
  },
  {
    question: "Pourquoi mon IFSC est bas alors que je suis fort ?",
    keywords: ['ifsc', 'bas', 'fort', 'force', 'pourquoi'],
    answer: `Un IFSC bas ne signifie pas que vous manquez de force maximale. Il indique que votre force n'est pas durable sur longue distance.

**Causes possibles :**
• VLamax élevé : votre système glycolytique se fatigue vite sur les efforts à couple élevé
• TTE insuffisant : vous tenez moins longtemps à intensité seuil
• Décalage FTP/poids : puissance absolue correcte mais ratio faible

**Que faire :**
• Travail force basse cadence (55-65 rpm) progressif
• Développer le TTE avec du tempo long
• Réduire le VLamax via endurance Z2

L'IFSC peut s'améliorer significativement avec un entraînement adapté.`
  },
  {
    question: "Comment améliorer mon IFSC ?",
    keywords: ['améliorer', 'ifsc', 'augmenter', 'progresser', 'force'],
    answer: `Pour améliorer votre IFSC™, il faut travailler sur ses trois composants :

**1. Améliorer FTP/kg**
• Travail au seuil régulier
• Sweet spot / tempo long
• Gestion du poids

**2. Augmenter le TTE**
• Sorties longues en endurance
• Tempo prolongé (30-60 min)
• Éviter l'intensité excessive

**3. Réduire le VLamax**
• Endurance Z2 longue
• Force basse cadence (50-65 rpm)
• Éviter les sprints répétés

La clé est la durabilité, pas la force maximale. Progression lente et régulière recommandée.`
  }
];

export function findIFSCChatbotAnswer(question: string): IFSCChatbotQA | null {
  const questionLower = question.toLowerCase();
  
  for (const qa of IFSC_CHATBOT_QA) {
    const matchCount = qa.keywords.filter(kw => questionLower.includes(kw.toLowerCase())).length;
    if (matchCount >= 2) {
      return qa;
    }
  }
  
  return null;
}

// ============================================
// ACADEMY MODULE
// ============================================

export const ACADEMY_IFSC_MODULE = {
  id: "cycling_force",
  title: "Force, cadence et illusion de vélocité",
  icon: "💪",
  description: "Comprendre la force spécifique cycliste et son rôle en longue distance",
  isRequired: false,
  estimatedTime: "12 min",
  
  chapters: [
    {
      id: "principle",
      title: "Le principe clé",
      content: IFSC_PRINCIPLE.officialText,
      keyPoints: [
        "Force soutenable > Force maximale",
        "Coût métabolique maîtrisé",
        "La cadence n'est pas une qualité en soi"
      ]
    },
    {
      id: "velocity_illusion",
      title: "L'illusion de la vélocité",
      content: "Une cadence élevée n'est pas toujours le signe d'un bon aérobie. Elle peut compenser un déficit de force spécifique.",
      keyPoints: [
        "Cadence élevée ≠ économie",
        "Peut masquer une faiblesse de force",
        "VLamax élevé favorise la vélocité compensatoire"
      ]
    },
    {
      id: "vlamax_role",
      title: "Le rôle du VLamax",
      content: "Un VLamax élevé rend le couple coûteux métaboliquement. L'athlète préfère alors mouliner pour réduire la contrainte par coup de pédale.",
      keyPoints: [
        "VLamax élevé → couple coûteux",
        "Préférence pour cadence haute",
        "Réduire VLamax améliore la tolérance force"
      ]
    },
    {
      id: "fatigue_link",
      title: "Lien avec fatigue et blessure",
      content: "Un travail force mal dosé peut accélérer la fatigue et augmenter le risque de blessure. L'IFSC aide à calibrer ce travail.",
      keyPoints: [
        "Force fragile = prudence basse cadence",
        "Progression lente essentielle",
        "Surveiller les signes de surcharge"
      ]
    }
  ]
};

// ============================================
// DOCUMENT COMPLET
// ============================================

export const IFSC_DOCUMENT = {
  title: "Indice de Force Spécifique Cycliste (IFSC™)",
  subtitle: "Two For Coaching Lab Method™",
  version: METHOD_VERSION_DISPLAY,
  sections: [
    { id: 'principle', title: IFSC_PRINCIPLE.title, icon: IFSC_PRINCIPLE.icon, content: IFSC_PRINCIPLE },
    { id: 'data', title: IFSC_DATA_SOURCES.title, icon: IFSC_DATA_SOURCES.icon, content: IFSC_DATA_SOURCES },
    { id: 'scale', title: "Échelle IFSC™", icon: "📏", content: IFSC_SCALE },
    { id: 'matrix', title: "Matrice Cadence × Force", icon: "🔀", content: CADENCE_FORCE_MATRIX },
    { id: 'safeguard', title: IFSC_SAFEGUARD.title, icon: IFSC_SAFEGUARD.icon, content: IFSC_SAFEGUARD }
  ]
};
