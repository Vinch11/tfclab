/**
 * TWO FOR COACHING LAB METHOD™ — Nutrition Prédictive V2
 * 
 * Estimation des besoins glucidiques (g/h) en fonction du PROFIL MÉTABOLIQUE.
 * 
 * DONNÉES D'ENTRÉE UNIFIÉES :
 * - vlamaxEffectif (valeur + confiance)
 * - tteEffectif (min)
 * - sport (bike / run)
 * - durée cible (race ou séance)
 * - intensité cible (% FTP ou allure)
 * - poids (kg)
 * 
 * ❌ Ne PAS utiliser de données nutritionnelles déclaratives.
 * 
 * CE MODULE CONSEILLE. Il n'automatise rien.
 * Ces valeurs sont des ESTIMATIONS, pas une prescription médicale.
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';
import { computeBaseRateMader } from './nutritionUnified';

// =============================================
// TYPES V2
// =============================================

export type NutritionRiskV2 = 'low' | 'moderate' | 'high' | 'critical';

export interface NutritionContributor {
  id: string;
  label: string;
  value: string;
  adjustment: number;  // g/h
  direction: 'up' | 'down' | 'neutral';
  explanation: string;
}

export interface NutritionPredictiveV2 {
  // Plage glucides recommandée (g/h)
  carbsMin: number;
  carbsMax: number;
  carbsCentral: number;
  
  // Risque glycogène (déplétion)
  glycogenRisk: NutritionRiskV2;
  glycogenRiskLabel: string;
  glycogenRiskScore: number;  // 0-4
  
  // Confiance
  confidence: number;
  
  // Sport et contexte
  sport: 'velo' | 'cap' | 'triathlon';
  sportLabel: string;
  baseRate: number;  // Taux de base (g/h)
  
  // Durée et intensité
  targetDurationHours: number | null;
  targetIntensityPct: number | null;
  
  // Contributeurs détaillés
  contributors: NutritionContributor[];
  
  // Message pédagogique
  whyThisNumber: string;
  
  // Recommandations
  recommendations: string[];
  
  // Avertissements
  warnings: string[];
  
  // Disclaimer
  disclaimer: string;
}

export interface NutritionV2Input {
  // VLamax effectif
  vlamaxValue: number | null;
  vlamaxConfidence?: number;
  
  // VO2max (ml/kg/min) — utilisé par le modèle Mader
  vo2max?: number | null;
  
  // TTE effectif
  tteMin: number | null;
  
  // Sport
  // 'triathlon' : mappé sur 'cap' pour le calcul de base Mader (source
  // canonique unique, cf. computeBaseRateMader) puis corrigé en interne par
  // le facteur de tolérance digestive triathlon (0.90, entre vélo 1.0 et CAP
  // 0.82) — même méthode que nutritionPredictive.ts::computeNutritionEstimate,
  // pour que les deux moteurs affichent le même chiffre pour un même athlète.
  sport: 'velo' | 'cap' | 'triathlon';
  
  // Durée cible (heures)
  targetDurationHours: number | null;
  
  // Intensité cible (% FTP ou seuil)
  targetIntensityPct: number | null;
  
  // Poids (kg)
  weightKg: number | null;
  
  // Gut training avancé (entraînement digestif validé)
  // Si true, permet des apports jusqu'à 120 g/h
  advancedGutTraining?: boolean;
}

// =============================================
// CONSTANTES OFFICIELLES TFCL™
// =============================================

/**
 * Bornes de nutrition (g/h)
 * 
 * STANDARD: 40-90 g/h — athlète sans entraînement digestif spécifique
 * ADVANCED: 90-120 g/h — athlète avec "gut training" validé
 * 
 * Références scientifiques:
 * - Burke L.M. et al. (2019): Elite marathoners up to 90-100 g/h
 * - Jeukendrup A. (2017): World Tour cyclists achieving 100-120 g/h
 * - Pfeiffer B. et al. (2012): Ironman athletes 90-108 g/h
 * - Viribay A. et al. (2020): 120 g/h achievable with training
 */
export const NUTRITION_BOUNDS = {
  // Athlètes standards (pas de gut training spécifique)
  STANDARD: { min: 40, max: 90 },
  
  // Athlètes avec gut training avancé validé
  ADVANCED: { min: 50, max: 120 },
  
  // Seuil à partir duquel un warning est affiché
  GUT_TRAINING_THRESHOLD: 90,
};

export const NUTRITION_PHILOSOPHY = {
  principle: `VLamax élevé → dépendance glucides ↑
TTE court → tolérance glycogène ↓
Durée longue → risque déplétion ↑
CAP > Vélo → coût glycogène ↑ à intensité égale`,
  
  disclaimer: `Ces valeurs sont des estimations basées sur
le profil métabolique, pas une prescription médicale.`,
  
  safeguard: `Ce module CONSEILLE. Il n'automatise rien.
La décision finale appartient à l'athlète et son encadrement.`,
  
  gutTraining: `Apports > 90 g/h nécessitent un entraînement digestif
progressif sur 4-8 semaines. Références: Jeukendrup 2017, Viribay 2020.`
};

export const NUTRITION_RISK_SCALE = {
  low: { 
    min: 0, max: 1, 
    label: "Faible", 
    color: 'success' as const,
    message: "Risque de déplétion glycogène contrôlé." 
  },
  moderate: { 
    min: 2, max: 2, 
    label: "Modéré", 
    color: 'info' as const,
    message: "Attention à la stratégie nutritionnelle." 
  },
  high: { 
    min: 3, max: 3, 
    label: "Élevé", 
    color: 'warning' as const,
    message: "Risque significatif. Nutrition critique." 
  },
  critical: { 
    min: 4, max: 4, 
    label: "Critique", 
    color: 'destructive' as const,
    message: "Déplétion probable. Stratégie nutritionnelle impérative." 
  }
};

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getRiskFromScore(score: number): NutritionRiskV2 {
  if (score <= 1) return 'low';
  if (score === 2) return 'moderate';
  if (score === 3) return 'high';
  return 'critical';
}

function getRiskLabel(risk: NutritionRiskV2): string {
  return NUTRITION_RISK_SCALE[risk].label;
}

// =============================================
// FORMULE V2 OFFICIELLE TFCL™
// =============================================

// Audit 2D F26 — `computeBaseRateMader` est désormais importé en tête de
// fichier depuis `nutritionUnified` (source canonique unique).

/**
 * Étape B — Modulation par VLamax
 * Si VLamax < 0.35 → -10 g/h  
 * Si VLamax 0.35–0.55 → neutre  
 * Si VLamax > 0.55 → +10 à +20 g/h
 */
function computeVlamaxAdjustment(vlamax: number | null): { adjustment: number; explanation: string } {
  if (vlamax === null) {
    return { adjustment: 0, explanation: "VLamax inconnue — modulation neutre" };
  }
  
  if (vlamax < 0.35) {
    return { adjustment: -10, explanation: "VLamax basse (<0.35) → économie glucidique naturelle" };
  }
  if (vlamax <= 0.55) {
    return { adjustment: 0, explanation: "VLamax équilibrée (0.35-0.55) → besoins standards" };
  }
  if (vlamax <= 0.65) {
    return { adjustment: 10, explanation: "VLamax élevée (>0.55) → dépendance glucidique accrue" };
  }
  return { adjustment: 20, explanation: "VLamax très élevée (>0.65) → forte combustion glucidique" };
}

/**
 * Étape C — Modulation par TTE
 * Si TTE < 45 min → +10 g/h  
 * Si TTE > 55 min → -5 g/h
 */
function computeTTEAdjustment(tte: number | null): { adjustment: number; explanation: string } {
  if (tte === null) {
    return { adjustment: 0, explanation: "TTE inconnu — modulation neutre" };
  }
  
  if (tte < 45) {
    return { adjustment: 10, explanation: "TTE court (<45 min) → tolérance glycogène réduite" };
  }
  if (tte > 55) {
    return { adjustment: -5, explanation: "TTE long (>55 min) → meilleure endurance glycogène" };
  }
  return { adjustment: 0, explanation: "TTE standard (45-55 min) → besoins neutres" };
}

/**
 * Étape D — Modulation par durée
 * Durée > 3h → +5 à +10 g/h  
 * Durée > 4h → fractionner + sel prioritaire
 */
function computeDurationAdjustment(durationHours: number | null): { adjustment: number; explanation: string; warnings: string[] } {
  const warnings: string[] = [];
  
  if (durationHours === null) {
    return { adjustment: 0, explanation: "Durée inconnue — modulation neutre", warnings };
  }
  
  if (durationHours > 4) {
    warnings.push("Durée > 4h : fractionner les apports, priorité hydratation + sel");
    return { adjustment: 10, explanation: "Durée très longue (>4h) → besoins augmentés + fractionnement", warnings };
  }
  if (durationHours > 3) {
    return { adjustment: 5, explanation: "Durée longue (>3h) → besoins légèrement augmentés", warnings };
  }
  if (durationHours < 1.5) {
    return { adjustment: -5, explanation: "Durée courte (<1h30) → besoins réduits", warnings };
  }
  return { adjustment: 0, explanation: "Durée standard (1h30-3h) — besoins neutres", warnings };
}

/**
 * Étape E — Modulation par intensité
 */
function computeIntensityAdjustment(intensityPct: number | null): { adjustment: number; explanation: string } {
  if (intensityPct === null) {
    return { adjustment: 0, explanation: "Intensité inconnue — modulation neutre" };
  }
  
  if (intensityPct >= 85) {
    return { adjustment: 10, explanation: "Intensité haute (≥85%) → combustion glucidique maximale" };
  }
  if (intensityPct >= 75) {
    return { adjustment: 5, explanation: "Intensité seuil (75-85%) → besoins augmentés" };
  }
  if (intensityPct <= 60) {
    return { adjustment: -10, explanation: "Intensité basse (≤60%) → économie glucidique" };
  }
  return { adjustment: 0, explanation: "Intensité modérée (60-75%) — besoins neutres" };
}

/**
 * Indice de risque nutritionnel (0-4)
 * +1 si VLamax > 0.55
 * +1 si TTE < 45
 * +1 si durée > 3h
 * +1 si CAP
 */
function computeGlycogenRiskScore(input: NutritionV2Input): number {
  let score = 0;
  
  if (input.vlamaxValue !== null && input.vlamaxValue > 0.55) score++;
  if (input.tteMin !== null && input.tteMin < 45) score++;
  if (input.targetDurationHours !== null && input.targetDurationHours > 3) score++;
  if (input.sport === 'cap') score++;
  
  return clamp(score, 0, 4);
}

// =============================================
// FONCTION PRINCIPALE V2
// =============================================

export function computeNutritionV2(input: NutritionV2Input): NutritionPredictiveV2 | null {
  const { vlamaxValue, vlamaxConfidence = 0.7, vo2max, tteMin, sport, targetDurationHours, targetIntensityPct, weightKg } = input;
  
  // Poids obligatoire pour le calcul de base
  if (weightKg === null || weightKg <= 0) {
    return null;
  }
  
  // Sans aucune donnée physiologique (VLamax + TTE), l'estimation est trop générique
  if (vlamaxValue === null && tteMin === null) {
    return null;
  }
  
  const warnings: string[] = [];
  const contributors: NutritionContributor[] = [];

  // Étape A — Taux de base via modèle Mader
  // `computeBaseRateMader` (source canonique unique) ne connaît que
  // 'velo'|'cap' — 'triathlon' est mappé sur 'cap' pour ce calcul, puis
  // corrigé juste en dessous (même méthode que nutritionPredictive.ts).
  const unifiedSport: 'velo' | 'cap' = sport === 'velo' ? 'velo' : 'cap';
  const maderResult = computeBaseRateMader(weightKg, unifiedSport, vo2max, vlamaxValue, targetIntensityPct, targetDurationHours);
  // Ajustement triathlon : réintroduit le facteur 0.90 (vs 0.82 CAP, 1.0
  // vélo) — annule le -18% CAP appliqué par computeBaseRateMader puis
  // applique le -10% triathlon. Bug corrigé (audit nutrition/multi-objectifs) :
  // avant ce fix, un athlète IM/70.3 recevait ici le taux vélo NON corrigé
  // (facteur 1.0, le plus généreux) alors que nutritionPredictive.ts
  // affichait pour le MÊME athlète, dans le MÊME rapport, un taux corrigé
  // (0.90) — deux chiffres différents pour la même prescription.
  const baseRate = sport === 'triathlon' ? Math.round(maderResult.baseRate / 0.82 * 0.90) : maderResult.baseRate;
  contributors.push({
    id: 'base',
    label: 'Taux de base (Mader)',
    value: `${baseRate} g/h`,
    adjustment: baseRate,
    direction: 'neutral',
    explanation: maderResult.method === 'mader'
      ? `Oxydation totale : ${maderResult.totalOxidation} g/h → apport exogène : ${baseRate} g/h${sport === 'triathlon' ? ' (ajusté tolérance digestive triathlon)' : ''}`
      : `Estimation (VO2max/VLamax estimés) → oxydation ${maderResult.totalOxidation} g/h → exogène ${baseRate} g/h${sport === 'triathlon' ? ' (ajusté tolérance digestive triathlon)' : ''}`
  });
  
  // VLamax: déjà intégrée dans le modèle Mader (calculateCarbOxidation)
  // Pas d'ajustement additionnel pour éviter le double-comptage
  
  // Étape B — Modulation TTE (non modélisé par Mader → ajustement légitime)
  const tteAdj = computeTTEAdjustment(tteMin);
  if (tteAdj.adjustment !== 0) {
    contributors.push({
      id: 'tte',
      label: 'Modulation TTE',
      value: tteMin !== null ? `${tteMin} min` : '—',
      adjustment: tteAdj.adjustment,
      direction: tteAdj.adjustment > 0 ? 'up' : 'down',
      explanation: tteAdj.explanation
    });
  }
  
  // Étape D — Modulation durée
  const durationAdj = computeDurationAdjustment(targetDurationHours);
  if (durationAdj.adjustment !== 0) {
    contributors.push({
      id: 'duration',
      label: 'Modulation durée',
      value: targetDurationHours !== null ? `${targetDurationHours}h` : '—',
      adjustment: durationAdj.adjustment,
      direction: durationAdj.adjustment > 0 ? 'up' : 'down',
      explanation: durationAdj.explanation
    });
  }
  warnings.push(...durationAdj.warnings);
  
  // Intensité: déjà intégrée dans le modèle Mader (calculateCarbOxidation)
  // Pas d'ajustement additionnel pour éviter le double-comptage
  
  // Calcul final (seuls TTE et durée ajustent, car non modélisés par Mader)
  const totalAdjustment = tteAdj.adjustment + durationAdj.adjustment;
  const rawResult = baseRate + totalAdjustment;
  
  // Déterminer les bornes selon le niveau de gut training
  const advancedGutTraining = input.advancedGutTraining ?? false;
  const bounds = advancedGutTraining ? NUTRITION_BOUNDS.ADVANCED : NUTRITION_BOUNDS.STANDARD;
  
  // Étape F — Bornage final (adapté au niveau de gut training)
  // Standard: 40-90 g/h | Advanced: 50-120 g/h
  const carbsCentral = clamp(Math.round(rawResult), bounds.min, bounds.max);
  const carbsMin = clamp(carbsCentral - 5, bounds.min, bounds.max);
  const carbsMax = clamp(carbsCentral + 5, bounds.min, bounds.max);
  
  // Ajouter un contributeur si gut training avancé actif
  if (advancedGutTraining) {
    contributors.push({
      id: 'gut_training',
      label: 'Gut Training Avancé',
      value: 'Activé',
      adjustment: 0,
      direction: 'up',
      explanation: 'Bornes étendues (50-120 g/h) — entraînement digestif validé'
    });
  }
  
  // Risque glycogène
  const riskScore = computeGlycogenRiskScore(input);
  const glycogenRisk = getRiskFromScore(riskScore);
  
  // Confiance
  let confidence = 0.50;
  if (vlamaxValue !== null) confidence += 0.15;
  if (tteMin !== null) confidence += 0.10;
  if (targetDurationHours !== null) confidence += 0.10;
  if (targetIntensityPct !== null) confidence += 0.10;
  if (vlamaxConfidence > 0.7) confidence += 0.05;
  confidence = clamp(confidence, 0.45, 0.90);
  
  // Message pédagogique
  const whyThisNumber = generateWhyThisNumber(input, carbsCentral, contributors);
  
  // Recommandations
  const recommendations = generateRecommendations(glycogenRisk, sport, targetDurationHours);
  
  // Warnings supplémentaires
  if (sport === 'cap' && carbsCentral >= 75) {
    warnings.push("Besoins élevés en CAP — risque digestif. Entraînement digestif recommandé.");
  }
  if (vlamaxValue !== null && vlamaxValue > 0.60) {
    warnings.push("Profil glycolytique — forte dépendance glucidique. Considérer travail VLamax.");
  }
  if (glycogenRisk === 'critical') {
    warnings.push("Risque de déplétion élevé — stratégie nutritionnelle impérative.");
  }
  
  // Warning si besoins > 90 g/h sans gut training avancé
  if (carbsCentral > NUTRITION_BOUNDS.GUT_TRAINING_THRESHOLD && !advancedGutTraining) {
    warnings.push(`Besoins > ${NUTRITION_BOUNDS.GUT_TRAINING_THRESHOLD} g/h — entraînement digestif progressif sur 4-8 semaines requis.`);
  }
  
  // Warning si gut training activé
  if (advancedGutTraining && carbsCentral >= 100) {
    warnings.push("Apports ≥100 g/h — valider la tolérance en conditions d'entraînement avant la course.");
  }
  
  return {
    carbsMin,
    carbsMax,
    carbsCentral,
    glycogenRisk,
    glycogenRiskLabel: getRiskLabel(glycogenRisk),
    glycogenRiskScore: riskScore,
    confidence,
    sport,
    sportLabel: sport === 'cap' ? 'Course à Pied' : sport === 'triathlon' ? 'Triathlon' : 'Vélo',
    baseRate,
    targetDurationHours,
    targetIntensityPct,
    contributors,
    whyThisNumber,
    recommendations,
    warnings,
    disclaimer: NUTRITION_PHILOSOPHY.disclaimer
  };
}

// =============================================
// GÉNÉRATION TEXTES
// =============================================

function generateWhyThisNumber(
  input: NutritionV2Input,
  result: number,
  contributors: NutritionContributor[]
): string {
  const parts: string[] = [];
  
  parts.push(`Ce chiffre de ${result} g/h est calculé via le modèle Mader (oxydation totale de glucides à l'intensité cible), ajusté pour l'apport exogène nécessaire.`);
  
  if (input.vlamaxValue !== null) {
    if (input.vlamaxValue > 0.55) {
      parts.push(`Votre VLamax élevée (${input.vlamaxValue.toFixed(2)}) indique une forte dépendance aux glucides.`);
    } else if (input.vlamaxValue < 0.35) {
      parts.push(`Votre VLamax basse (${input.vlamaxValue.toFixed(2)}) vous permet une économie glucidique naturelle.`);
    }
  }
  
  if (input.tteMin !== null && input.tteMin < 45) {
    parts.push(`Votre TTE court (${input.tteMin} min) suggère une tolérance glycogène plus limitée.`);
  }
  
  if (input.sport === 'cap') {
    parts.push("En course à pied, le coût énergétique est supérieur au vélo à intensité égale.");
  }
  
  return parts.join(" ");
}

function generateRecommendations(
  risk: NutritionRiskV2,
  sport: 'velo' | 'cap' | 'triathlon',
  duration: number | null
): string[] {
  const recs: string[] = [];
  
  switch (risk) {
    case 'low':
      recs.push("Stratégie nutritionnelle standard applicable");
      recs.push("Tester en conditions d'entraînement avant la course");
      break;
    case 'moderate':
      recs.push("Planifier la stratégie nutritionnelle avec attention");
      recs.push("Tester les produits et le timing en entraînement");
      recs.push("Prévoir une marge de sécurité (+10%)");
      break;
    case 'high':
      recs.push("Entraînement digestif progressif recommandé");
      recs.push("Tester systématiquement en conditions de course");
      recs.push("Considérer le travail métabolique (VLamax)");
      recs.push("Fractionner les apports pour optimiser l'absorption");
      break;
    case 'critical':
      recs.push("Stratégie nutritionnelle prioritaire et impérative");
      recs.push("Entraînement digestif obligatoire sur plusieurs semaines");
      recs.push("Travail métabolique pour réduire la dépendance glucidique");
      recs.push("Consultation nutritionniste sportif recommandée");
      break;
  }
  
  if (sport === 'cap') {
    recs.push("Privilégier les formes liquides ou gels très dilués");
  }
  
  if (duration !== null && duration > 4) {
    recs.push("Alterner glucides + sels minéraux sur la durée");
    recs.push("Prévoir des apports solides si toléré");
  }
  
  return recs;
}

// =============================================
// HELPERS UI
// =============================================

export function getNutritionRiskColor(risk: NutritionRiskV2): string {
  switch (risk) {
    case 'low': return 'text-success';
    case 'moderate': return 'text-primary';
    case 'high': return 'text-warning';
    case 'critical': return 'text-destructive';
  }
}

export function getNutritionBadgeClass(risk: NutritionRiskV2): string {
  switch (risk) {
    case 'low':
      return 'bg-success/20 text-success border-success/50';
    case 'moderate':
      return 'bg-primary/20 text-primary border-primary/50';
    case 'high':
      return 'bg-warning/20 text-warning border-warning/50';
    case 'critical':
      return 'bg-destructive/20 text-destructive border-destructive/50';
  }
}

export function formatCarbsRange(nutrition: NutritionPredictiveV2): string {
  return `${nutrition.carbsMin}–${nutrition.carbsMax} g/h`;
}

export function getNutritionRiskIcon(risk: NutritionRiskV2): string {
  switch (risk) {
    case 'low': return '✅';
    case 'moderate': return '⚠️';
    case 'high': return '🔶';
    case 'critical': return '🛑';
  }
}

// =============================================
// MODULE ACADEMY
// =============================================

export const ACADEMY_NUTRITION_MODULE = {
  id: 'nutrition-predictive-v2',
  title: 'Nutrition Prédictive V2',
  icon: '🍎',
  duration: '12 min',
  
  sections: [
    {
      id: 'principle',
      title: 'Le principe',
      content: `La nutrition prédictive V2 estime vos besoins glucidiques (g/h)
en fonction de votre PROFIL MÉTABOLIQUE réel, pas de valeurs génériques.

VLamax élevé → Plus de glucides nécessaires
TTE court → Moins de tolérance aux stocks bas
CAP → Coût supérieur au vélo à intensité égale`
    },
    {
      id: 'formula',
      title: 'La formule',
      content: `MODÈLE MADER (V2)
Le taux de base est dérivé de l'oxydation totale de glucides
calculée par le modèle Mader-Heck (VO2max, VLamax, poids, intensité).

L'apport EXOGÈNE recommandé = oxydation totale × (1 - couverture glycogène)
La couverture glycogène diminue avec la durée de l'effort.

MODULATIONS SECONDAIRES
• TTE < 45 min : +10 g/h (déplétion plus rapide)
• TTE > 55 min : -5 g/h (meilleure endurance)
• Durée > 3h : +5 à +10 g/h
• Intensité ≥ 85% : +10 g/h

BORNAGE : 30-90 g/h (standard) | 50-120 g/h (gut training avancé)`
    },
    {
      id: 'risk',
      title: "L'indice de risque",
      content: `Le risque de déplétion glycogène est calculé sur 4 facteurs :
• VLamax > 0.55 : +1
• TTE < 45 min : +1
• Durée > 3h : +1
• Sport = CAP : +1

Score 0-1 → Faible
Score 2 → Modéré
Score 3 → Élevé
Score 4 → Critique`
    },
    {
      id: 'limits',
      title: 'Limites et précautions',
      content: `Ce module CONSEILLE, il n'automatise rien.

Ces valeurs sont des ESTIMATIONS basées sur le profil métabolique.
Ce n'est pas une prescription médicale.

Toujours tester en entraînement avant une compétition.
Consulter un nutritionniste sportif pour les cas critiques.`
    }
  ]
};

// =============================================
// CONTENU PDF
// =============================================

export const PDF_NUTRITION_SECTION = {
  title: 'Nutrition Prédictive V2',
  subtitle: 'Estimation des besoins glucidiques',
  
  generateContent: (nutrition: NutritionPredictiveV2): string => {
    return `BESOINS GLUCIDIQUES ESTIMÉS
Plage recommandée : ${nutrition.carbsMin}–${nutrition.carbsMax} g/h
Valeur centrale : ${nutrition.carbsCentral} g/h

RISQUE DE DÉPLÉTION GLYCOGÈNE
Niveau : ${nutrition.glycogenRiskLabel} (score ${nutrition.glycogenRiskScore}/4)

CONTEXTE
Sport : ${nutrition.sportLabel}
Durée cible : ${nutrition.targetDurationHours ? nutrition.targetDurationHours + 'h' : 'Non spécifiée'}
Intensité : ${nutrition.targetIntensityPct ? nutrition.targetIntensityPct + '%' : 'Non spécifiée'}

POURQUOI CE CHIFFRE
${nutrition.whyThisNumber}

RECOMMANDATIONS
${nutrition.recommendations.map(r => `• ${r}`).join('\n')}

${nutrition.warnings.length > 0 ? `AVERTISSEMENTS\n${nutrition.warnings.map(w => `⚠️ ${w}`).join('\n')}` : ''}

---
${NUTRITION_PHILOSOPHY.disclaimer}`;
  }
};

// =============================================
// CHATBOT Q&A
// =============================================

export const NUTRITION_CHATBOT_QA = [
  {
    question: "Comment est calculé mon besoin en glucides ?",
    answer: "Le calcul utilise le modèle Mader pour estimer votre oxydation totale de glucides (basée sur VO2max, VLamax, poids, intensité), puis dérive l'apport exogène nécessaire en soustrayant la couverture glycogène endogène. Des ajustements TTE, durée et intensité affinent le résultat."
  },
  {
    question: "Pourquoi mon risque glycogène est élevé ?",
    answer: "Le risque augmente avec : VLamax > 0.55 (+1), TTE < 45 min (+1), durée > 3h (+1), et sport = CAP (+1). Un score de 3-4 indique un risque élevé à critique."
  },
  {
    question: "Ces valeurs remplacent-elles un nutritionniste ?",
    answer: "Non. Ces valeurs sont des estimations basées sur votre profil métabolique. Pour une stratégie nutritionnelle personnalisée, consultez un nutritionniste sportif."
  },
  {
    question: "Pourquoi la CAP demande plus de glucides que le vélo ?",
    answer: "À intensité égale, la course à pied a un coût énergétique supérieur au vélo en raison de l'impact mécanique et du travail musculaire différent."
  }
];
