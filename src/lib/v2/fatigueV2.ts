/**
 * TWO FOR COACHING LAB METHOD™ — Fatigue Quantifiée V2
 * 
 * La fatigue est un ÉTAT MULTIFACTORIEL, pas une valeur unique.
 * 
 * TFCL utilise 3 PILIERS :
 * 1. CHARGE — TSS_7d, évolution TSS
 * 2. RÉPONSE — TTE effectif, Potentiel Physiologique fraîcheur
 * 3. RESSENTI — Check-in fatigue / stress (1-10)
 * 
 * FORMULE V2 :
 * Fatigue = 100 - moyenne pondérée (Charge 40%, Réponse 35%, Ressenti 25%)
 * 
 * Sources scientifiques :
 * - Impellizzeri F.M. et al. (2019) – Training load
 * - Halson S.L. (2014) – Recovery monitoring  
 * - Saw A.E. et al. (2016) – Subjective measures
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';

// =============================================
// TYPES V2
// =============================================

export type FatigueLevelV2 = 'fresh' | 'functional' | 'elevated' | 'critical';

export type FatiguePillarV2 = 'charge' | 'response' | 'feeling';

export type FatigueOriginV2 = 'charge' | 'response' | 'feeling' | 'mixed';

export interface FatiguePillarResult {
  id: FatiguePillarV2;
  label: string;
  icon: string;
  score: number;           // 0-100 (score normalisé du pilier)
  weight: number;          // Poids dans la formule
  contribution: number;    // score × weight
  confidence: number;      // 0-1
  explanation: string;
  details: string[];
}

export interface FatigueFonctionnelleV2 {
  // Score global (0-100%)
  score: number;
  
  // Niveau catégorisé
  level: FatigueLevelV2;
  levelLabel: string;
  levelEmoji: string;
  levelDescription: string;
  
  // Confiance
  confidence: number;
  
  // Origine principale de la fatigue
  origin: FatigueOriginV2;
  originLabel: string;
  
  // Décomposition par pilier
  pillars: {
    charge: FatiguePillarResult;
    response: FatiguePillarResult;
    feeling: FatiguePillarResult;
  };
  
  // Explication "D'où vient ta fatigue aujourd'hui"
  whyFatigued: string;
  
  // Recommandations (non automatiques)
  recommendations: string[];
  
  // Tendance (si données historiques)
  trend: 'improving' | 'stable' | 'worsening' | null;
  trendLabel: string | null;
  
  // Advisory layer triggers
  advisoryTriggers: {
    showAlert: boolean;
    priorityRecovery: boolean;
    suggestDeload: boolean;
    injuryWarning: boolean;
  };
  
  // Avertissements
  warnings: string[];
  
  // Disclaimer
  disclaimer: string;
}

export interface FatigueV2Input {
  // ===== PILIER 1: CHARGE =====
  tss7d: number | null;               // TSS des 7 derniers jours
  tssTarget: number | null;           // TSS cible/habituel (ex: 500)
  tssTrend?: 'rising' | 'stable' | 'falling' | null;  // Tendance TSS
  
  // ===== PILIER 2: RÉPONSE =====
  tteEffectif: number | null;         // TTE effectif (min)
  tteTarget?: number | null;          // TTE cible
  tteStability?: 'stable' | 'slight_drop' | 'significant_drop' | null;
  potentielPhysiologiqueFreshness?: number | null;  // 0-100
  
  // ===== PILIER 3: RESSENTI (source: fatigue_state du snapshot) =====
  // Remplace les anciens champs check-in (checkinFatigue/checkinStress/sleepQuality)
  // L'app fonctionne par snapshots, pas par check-ins quotidiens
  fatigueState?: 'fresh' | 'ok' | 'fatigued' | 'high' | 'injured' | string | null;
  
  // ===== CONTEXTE =====
  age?: number | null;
  objectif?: string;
  previousScore?: number | null;      // Pour calcul tendance
}

// =============================================
// CONSTANTES OFFICIELLES TFCL™
// =============================================

export const FATIGUE_PHILOSOPHY = {
  concept: `La fatigue est un ÉTAT MULTIFACTORIEL, pas une valeur unique.
TFCL utilise 3 piliers : Charge, Réponse, Ressenti.`,
  
  disclaimer: `La fatigue est une estimation contextuelle,
pas un diagnostic médical.`,
  
  formula: `Fatigue = 100 - moyenne pondérée :
• 0.40 × Score_Charge
• 0.35 × Score_Réponse  
• 0.25 × Score_Ressenti (fatigue_state du snapshot)`
};

export const FATIGUE_SCALE = {
  fresh: { 
    min: 0, max: 30, 
    label: "Frais", 
    color: 'success' as const,
    emoji: '🟢',
    message: "Fraîcheur maximale. Potentiel pleinement exprimable."
  },
  functional: { 
    min: 30, max: 50, 
    label: "Fatigue fonctionnelle", 
    color: 'info' as const,
    emoji: '🟡',
    message: "Fatigue normale d'entraînement. Charge en absorption."
  },
  elevated: { 
    min: 50, max: 70, 
    label: "Fatigue accumulée", 
    color: 'warning' as const,
    emoji: '🟠',
    message: "Attention qualité des séances. Surveiller récupération."
  },
  critical: { 
    min: 70, max: 100, 
    label: "Risque surcharge", 
    color: 'destructive' as const,
    emoji: '🔴',
    message: "Zone rouge. Priorité absolue à la récupération."
  }
};

const WEIGHTS: Record<FatiguePillarV2, number> = {
  charge: 0.40,
  response: 0.35,
  feeling: 0.25
};

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getLevel(score: number): FatigueLevelV2 {
  if (score < 30) return 'fresh';
  if (score < 50) return 'functional';
  if (score < 70) return 'elevated';
  return 'critical';
}

function getLevelInfo(level: FatigueLevelV2) {
  return FATIGUE_SCALE[level];
}

function getOrigin(pillars: { charge: FatiguePillarResult; response: FatiguePillarResult; feeling: FatiguePillarResult }): FatigueOriginV2 {
  const scores = [
    { id: 'charge' as const, score: pillars.charge.score },
    { id: 'response' as const, score: pillars.response.score },
    { id: 'feeling' as const, score: pillars.feeling.score }
  ];
  
  // Trouver le pilier avec le score le plus haut (= plus fatigué)
  scores.sort((a, b) => b.score - a.score);
  
  const maxScore = scores[0].score;
  const secondScore = scores[1].score;
  
  // Si les deux premiers sont proches, c'est mixte
  if (maxScore - secondScore < 10) {
    return 'mixed';
  }
  
  return scores[0].id;
}

function getOriginLabel(origin: FatigueOriginV2): string {
  switch (origin) {
    case 'charge': return '📊 Charge récente';
    case 'response': return '🧬 Réponse physiologique';
    case 'feeling': return '😰 Ressenti';
    case 'mixed': return '⚖️ Multifactoriel';
  }
}

function getTrend(current: number, previous: number | null): 'improving' | 'stable' | 'worsening' | null {
  if (previous === null) return null;
  
  const diff = current - previous;
  if (diff <= -5) return 'improving';
  if (diff >= 5) return 'worsening';
  return 'stable';
}

function getTrendLabel(trend: 'improving' | 'stable' | 'worsening' | null): string | null {
  if (trend === null) return null;
  switch (trend) {
    case 'improving': return '📈 En amélioration';
    case 'stable': return '➖ Stable';
    case 'worsening': return '📉 En dégradation';
  }
}

// =============================================
// CALCUL PILIER 1 : CHARGE
// =============================================

function computeChargePillar(input: FatigueV2Input): FatiguePillarResult {
  const { tss7d, tssTarget, tssTrend } = input;
  
  let score = 50; // Default neutre
  let confidence = 0.5;
  const details: string[] = [];
  
  // Score basé sur ratio TSS
  if (tss7d !== null && tss7d >= 0) {
    const target = tssTarget ?? 450; // Référence par défaut
    const ratio = tss7d / target;
    
    // Charge_score = clamp(TSS_7d / TSS_cible × 100, 0, 120)
    score = clamp(ratio * 100, 0, 120);
    
    // Normaliser sur 0-100 pour le calcul final
    score = clamp(score, 0, 100);
    
    confidence = tssTarget !== null ? 0.85 : 0.65;
    details.push(`TSS 7j: ${tss7d} (cible: ${target})`);
    details.push(`Ratio: ${(ratio * 100).toFixed(0)}%`);
  } else {
    details.push("TSS non disponible — estimation par défaut");
  }
  
  // Ajustement tendance
  if (tssTrend === 'rising') {
    score += 10;
    details.push("Tendance TSS ↑ (+10)");
  } else if (tssTrend === 'falling') {
    score -= 5;
    details.push("Tendance TSS ↓ (-5)");
  }
  
  score = clamp(score, 0, 100);
  
  const explanation = score > 70 
    ? "Charge récente élevée — accumulation fatigue"
    : score > 50 
      ? "Charge modérée — fatigue normale d'entraînement"
      : "Charge contrôlée — récupération favorisée";
  
  return {
    id: 'charge',
    label: 'Charge',
    icon: '📊',
    score,
    weight: WEIGHTS.charge,
    contribution: Math.round(score * WEIGHTS.charge),
    confidence,
    explanation,
    details
  };
}

// =============================================
// CALCUL PILIER 2 : RÉPONSE
// =============================================

function computeResponsePillar(input: FatigueV2Input): FatiguePillarResult {
  const { tteEffectif, tteTarget, tteStability, potentielPhysiologiqueFreshness } = input;
  
  let score = 50;
  let confidence = 0.5;
  const details: string[] = [];
  
  // Score basé sur stabilité TTE
  if (tteStability !== null && tteStability !== undefined) {
    switch (tteStability) {
      case 'stable':
        score = 20; // 80-100 inversé
        details.push("TTE stable → réponse optimale");
        confidence = 0.80;
        break;
      case 'slight_drop':
        score = 50; // 60-80 inversé
        details.push("TTE légèrement diminué → fatigue fonctionnelle");
        confidence = 0.75;
        break;
      case 'significant_drop':
        score = 80; // <60 inversé
        details.push("TTE en chute nette → fatigue significative");
        confidence = 0.85;
        break;
    }
  } else if (tteEffectif !== null && tteTarget !== null) {
    // Calcul basé sur ratio TTE/cible
    const ratio = tteEffectif / tteTarget;
    if (ratio >= 1.0) {
      score = 20;
      details.push(`TTE ${tteEffectif} min ≥ cible ${tteTarget} min`);
    } else if (ratio >= 0.9) {
      score = 35;
      details.push(`TTE légèrement sous la cible (${(ratio * 100).toFixed(0)}%)`);
    } else if (ratio >= 0.8) {
      score = 55;
      details.push(`TTE diminué (${(ratio * 100).toFixed(0)}% de la cible)`);
    } else {
      score = 75;
      details.push(`TTE en chute (${(ratio * 100).toFixed(0)}% de la cible)`);
    }
    confidence = 0.70;
  } else if (tteEffectif !== null) {
    // TTE sans cible — estimation
    const defaultTarget = 50;
    const ratio = tteEffectif / defaultTarget;
    score = clamp(100 - ratio * 100, 0, 100);
    details.push(`TTE ${tteEffectif} min (cible estimée: ${defaultTarget} min)`);
    confidence = 0.55;
  } else {
    details.push("TTE non disponible");
  }
  
  // Intégration Potentiel Physiologique fraîcheur
  if (potentielPhysiologiqueFreshness !== null && potentielPhysiologiqueFreshness !== undefined) {
    // Fraîcheur élevée = moins fatigué
    const freshnessScore = clamp(100 - potentielPhysiologiqueFreshness, 0, 100);
    score = (score + freshnessScore) / 2;
    details.push(`Fraîcheur Potentiel Physiologique: ${potentielPhysiologiqueFreshness}%`);
    confidence = Math.max(confidence, 0.70);
  }
  
  score = clamp(score, 0, 100);
  
  const explanation = score > 60
    ? "Réponse physiologique dégradée — durabilité impactée"
    : score > 40
      ? "Réponse normale — capacités maintenues"
      : "Réponse optimale — fraîcheur physiologique";
  
  return {
    id: 'response',
    label: 'Réponse',
    icon: '🧬',
    score,
    weight: WEIGHTS.response,
    contribution: Math.round(score * WEIGHTS.response),
    confidence,
    explanation,
    details
  };
}

// =============================================
// CALCUL PILIER 3 : RESSENTI
// =============================================

function computeFeelingPillar(input: FatigueV2Input): FatiguePillarResult {
  const { fatigueState } = input;

  // F34: Mapping canonique aligné sur fatigueStateMapping.ts (1-10 ×10)
  // fresh=20, ok=40, fatigued=60, high=80, injured=100. Higher = more fatigue.
  const FATIGUE_STATE_SCORES: Record<string, { score: number; label: string }> = {
    fresh:    { score: 20,  label: "Frais — bien récupéré" },
    ok:       { score: 40,  label: "Normal — état standard" },
    fatigued: { score: 60,  label: "Fatigué — récupération conseillée" },
    high:     { score: 80,  label: "Fatigue élevée — repos recommandé" },
    injured:  { score: 100, label: "Blessé — arrêt nécessaire" },
  };
  
  const details: string[] = [];
  let score = 50;
  let confidence = 0.4;
  
  if (fatigueState && FATIGUE_STATE_SCORES[fatigueState]) {
    const mapped = FATIGUE_STATE_SCORES[fatigueState];
    score = mapped.score;
    confidence = 0.70;
    details.push(`État snapshot: ${mapped.label}`);
  } else {
    details.push("Aucun état de fatigue renseigné dans le snapshot — estimation par défaut");
  }
  
  score = clamp(score, 0, 100);
  
  const explanation = score > 60
    ? "Ressenti de fatigue élevé — récupération prioritaire"
    : score > 40
      ? "Ressenti modéré — surveillance recommandée"
      : "Bon ressenti — état subjectif favorable";
  
  return {
    id: 'feeling',
    label: 'Ressenti',
    icon: '😊',
    score,
    weight: WEIGHTS.feeling,
    contribution: Math.round(score * WEIGHTS.feeling),
    confidence,
    explanation,
    details
  };
}

// =============================================
// GÉNÉRATION TEXTES
// =============================================

function generateWhyFatigued(
  score: number,
  pillars: { charge: FatiguePillarResult; response: FatiguePillarResult; feeling: FatiguePillarResult },
  origin: FatigueOriginV2
): string {
  const level = getLevel(score);
  
  if (level === 'fresh') {
    return "Tu es frais ! Tous les indicateurs sont au vert. C'est le moment idéal pour les séances clés.";
  }
  
  const parts: string[] = [];
  
  if (pillars.charge.score > 60) {
    parts.push(`ta charge récente est élevée (${pillars.charge.score}%)`);
  }
  if (pillars.response.score > 60) {
    parts.push(`ta réponse physiologique montre des signes de fatigue`);
  }
  if (pillars.feeling.score > 60) {
    parts.push(`ton ressenti indique de la fatigue`);
  }
  
  if (parts.length === 0) {
    return "Fatigue modérée, probablement liée à l'accumulation normale d'entraînement.";
  }
  
  const mainReason = parts.join(", ");
  return `Aujourd'hui, ta fatigue vient principalement de : ${mainReason}.`;
}

function generateRecommendations(
  score: number,
  pillars: { charge: FatiguePillarResult; response: FatiguePillarResult; feeling: FatiguePillarResult }
): string[] {
  const level = getLevel(score);
  const recs: string[] = [];
  
  if (level === 'fresh') {
    recs.push("Profiter de cette fraîcheur pour les séances qualitatives");
    return recs;
  }
  
  if (level === 'functional') {
    recs.push("Maintenir le plan d'entraînement avec surveillance");
    if (pillars.feeling.score > 50) {
      recs.push("Attention au ressenti — écouter son corps");
    }
    return recs;
  }
  
  // Elevated ou Critical
  if (pillars.charge.score > 60) {
    recs.push("Réduire la charge de 20-30% cette semaine");
  }
  if (pillars.response.score > 60) {
    recs.push("Allonger les temps de récupération entre séances");
  }
  if (pillars.feeling.score > 60) {
    recs.push("Prioriser le sommeil (7-9h) et la gestion du stress");
  }
  
  if (level === 'critical') {
    recs.push("Semaine de récupération active fortement recommandée");
    recs.push("Envisager consultation si persistance > 7 jours");
  }
  
  return recs;
}

function generateAdvisoryTriggers(score: number, trend: 'improving' | 'stable' | 'worsening' | null) {
  const level = getLevel(score);
  
  return {
    showAlert: score > 60,
    priorityRecovery: score > 60,
    suggestDeload: score > 75,
    injuryWarning: score > 75 || (score > 60 && trend === 'worsening')
  };
}

// =============================================
// FONCTION PRINCIPALE V2
// =============================================

export function computeFatigueV2(input: FatigueV2Input): FatigueFonctionnelleV2 {
  const warnings: string[] = [];
  
  // Calcul des 3 piliers
  const chargePillar = computeChargePillar(input);
  const responsePillar = computeResponsePillar(input);
  const feelingPillar = computeFeelingPillar(input);
  
  const pillars = {
    charge: chargePillar,
    response: responsePillar,
    feeling: feelingPillar
  };
  
  // Score final = moyenne pondérée des piliers
  const rawScore = 
    chargePillar.score * chargePillar.weight +
    responsePillar.score * responsePillar.weight +
    feelingPillar.score * feelingPillar.weight;
  
  const score = clamp(Math.round(rawScore), 0, 100);
  
  // Confiance moyenne pondérée
  const confidence = clamp(
    chargePillar.confidence * chargePillar.weight +
    responsePillar.confidence * responsePillar.weight +
    feelingPillar.confidence * feelingPillar.weight,
    0.4, 0.95
  );
  
  // Niveau et infos
  const level = getLevel(score);
  const levelInfo = getLevelInfo(level);
  
  // Origine principale
  const origin = getOrigin(pillars);
  
  // Tendance
  const trend = getTrend(score, input.previousScore ?? null);
  
  // Génération textes
  const whyFatigued = generateWhyFatigued(score, pillars, origin);
  const recommendations = generateRecommendations(score, pillars);
  const advisoryTriggers = generateAdvisoryTriggers(score, trend);
  
  // Warnings
  if (level === 'critical' && trend === 'worsening') {
    warnings.push("Fatigue critique en aggravation — intervention urgente recommandée");
  }
  if (chargePillar.score > 70 && feelingPillar.score > 70) {
    warnings.push("Cumul charge + ressenti élevé — risque de surmenage");
  }
  if (advisoryTriggers.injuryWarning) {
    warnings.push("Risque blessure accru — prudence sur les intensités");
  }
  
  return {
    score,
    level,
    levelLabel: levelInfo.label,
    levelEmoji: levelInfo.emoji,
    levelDescription: levelInfo.message,
    confidence,
    origin,
    originLabel: getOriginLabel(origin),
    pillars,
    whyFatigued,
    recommendations,
    trend,
    trendLabel: getTrendLabel(trend),
    advisoryTriggers,
    warnings,
    disclaimer: FATIGUE_PHILOSOPHY.disclaimer
  };
}

// =============================================
// HELPERS UI
// =============================================

export function getFatigueLevelColor(level: FatigueLevelV2): string {
  switch (level) {
    case 'fresh': return 'text-success';
    case 'functional': return 'text-primary';
    case 'elevated': return 'text-warning';
    case 'critical': return 'text-destructive';
  }
}

export function getFatigueBadgeClass(level: FatigueLevelV2): string {
  switch (level) {
    case 'fresh':
      return 'bg-success/20 text-success border-success/50';
    case 'functional':
      return 'bg-primary/20 text-primary border-primary/50';
    case 'elevated':
      return 'bg-warning/20 text-warning border-warning/50';
    case 'critical':
      return 'bg-destructive/20 text-destructive border-destructive/50';
  }
}

export function getFatigueProgressColor(score: number): string {
  if (score < 30) return 'bg-success';
  if (score < 50) return 'bg-primary';
  if (score < 70) return 'bg-warning';
  return 'bg-destructive';
}

export function getFatigueIcon(level: FatigueLevelV2): string {
  return FATIGUE_SCALE[level].emoji;
}

// =============================================
// MODULE ACADEMY
// =============================================

export const ACADEMY_FATIGUE_MODULE = {
  id: 'fatigue-quantifiee',
  title: 'Comprendre la fatigue quantifiée',
  icon: '😴',
  duration: '12 min',
  
  sections: [
    {
      id: 'concept',
      title: 'Le concept',
      content: `La fatigue n'est PAS un chiffre unique.
C'est un ÉTAT MULTIFACTORIEL basé sur 3 piliers :

📊 CHARGE — Volume et intensité récents (TSS)
🧬 RÉPONSE — Comment ton corps répond (TTE, fraîcheur)
😊 RESSENTI — Ce que tu ressens (stress, sommeil)`
    },
    {
      id: 'formula',
      title: 'La formule TFCL™',
      content: `Fatigue = moyenne pondérée des 3 piliers :

• Charge : 40%
• Réponse : 35%  
• Ressenti : 25%

Chaque pilier est normalisé sur 0-100.
Le score final est également sur 0-100.`
    },
    {
      id: 'interpretation',
      title: 'Interprétation',
      content: `< 30 → FRAIS
Potentiel pleinement exprimable. Moment idéal pour les séances clés.

30-50 → FATIGUE FONCTIONNELLE
Fatigue normale d'entraînement. Charge en cours d'absorption.

50-70 → FATIGUE ACCUMULÉE
Attention à la qualité des séances. Risque stagnation.

> 70 → RISQUE SURCHARGE
Zone rouge. Priorité absolue à la récupération.`
    },
    {
      id: 'errors',
      title: 'Erreurs fréquentes',
      content: `❌ "Score bas = pas assez d'entraînement"
→ Non, score bas = fraîcheur = opportunité de performance

❌ "Je me sens bien donc pas fatigué"
→ Le ressenti n'est qu'un pilier. Charge et réponse comptent aussi.

❌ "Score élevé = je dois m'arrêter"
→ Non, score élevé = adapter, pas forcément stopper.`
    },
    {
      id: 'coach-cases',
      title: 'Cas pratiques coach',
      content: `CAS 1 : Athlète à 65% fatigue, ressenti OK
→ La charge et/ou la réponse sont élevées. Surveiller TTE.

CAS 2 : Athlète à 45% fatigue, mauvais ressenti
→ Fatigue fonctionnelle normale mais stress perçu élevé.
→ Vérifier facteurs extra-sportifs.

CAS 3 : Athlète à 80% fatigue depuis 5 jours
→ Surcharge probable. Semaine récup active recommandée.`
    }
  ]
};

// =============================================
// CONTENU PDF
// =============================================

export const PDF_FATIGUE_SECTION = {
  title: 'Fatigue Quantifiée V2',
  subtitle: 'État multifactoriel TFCL™',
  
  generateContent: (fatigue: FatigueFonctionnelleV2, history14d?: number[]): string => {
    let content = `SCORE ACTUEL
Fatigue : ${fatigue.score}% — ${fatigue.levelLabel}
Confiance : ${Math.round(fatigue.confidence * 100)}%
Origine principale : ${fatigue.originLabel}

DÉCOMPOSITION PAR PILIER
📊 Charge : ${fatigue.pillars.charge.score}% (×${fatigue.pillars.charge.weight} = ${fatigue.pillars.charge.contribution}%)
🧬 Réponse : ${fatigue.pillars.response.score}% (×${fatigue.pillars.response.weight} = ${fatigue.pillars.response.contribution}%)
😊 Ressenti : ${fatigue.pillars.feeling.score}% (×${fatigue.pillars.feeling.weight} = ${fatigue.pillars.feeling.contribution}%)

EXPLICATION
${fatigue.whyFatigued}

RECOMMANDATIONS
${fatigue.recommendations.map(r => `• ${r}`).join('\n')}
`;

    if (history14d && history14d.length > 0) {
      content += `
HISTORIQUE 14 JOURS
${history14d.map((s, i) => `J-${14 - i}: ${s}%`).join(' | ')}

TENDANCE
${fatigue.trendLabel || 'Non disponible'}
`;
    }

    if (fatigue.warnings.length > 0) {
      content += `
AVERTISSEMENTS
${fatigue.warnings.map(w => `⚠️ ${w}`).join('\n')}
`;
    }

    content += `
---
${fatigue.disclaimer}`;

    return content;
  },
  
  generateEvolutionPrevisible: (currentScore: number, trend: string | null): string => {
    if (trend === 'improving') {
      return `Évolution prévisible : Amélioration attendue si maintien récupération.
Score projeté J+7 : ${Math.max(currentScore - 10, 15)}–${Math.max(currentScore - 5, 20)}%`;
    }
    if (trend === 'worsening') {
      return `Évolution prévisible : Dégradation probable sans intervention.
Score projeté J+7 : ${Math.min(currentScore + 5, 95)}–${Math.min(currentScore + 15, 100)}%
Action recommandée : Réduction charge immédiate.`;
    }
    return `Évolution prévisible : Stabilisation attendue.
Score projeté J+7 : ${Math.max(currentScore - 5, 10)}–${Math.min(currentScore + 5, 90)}%`;
  }
};

// =============================================
// CHATBOT Q&A
// =============================================

export const FATIGUE_CHATBOT_QA = [
  {
    question: "Comment est calculée ma fatigue ?",
    answer: "Ta fatigue est calculée à partir de 3 piliers : Charge (40%), Réponse physiologique (35%), et Ressenti (25%). Chaque pilier est évalué sur 0-100, puis la moyenne pondérée donne ton score final."
  },
  {
    question: "Pourquoi ma fatigue est élevée alors que je me sens bien ?",
    answer: "Le ressenti n'est qu'un pilier (25%). Si ta charge récente est élevée ou si ta réponse physiologique (TTE) montre des signes de fatigue, ton score global peut être élevé malgré un bon ressenti."
  },
  {
    question: "Que faire si ma fatigue dépasse 70% ?",
    answer: "Au-delà de 70%, la récupération devient prioritaire. Réduire la charge de 20-30%, privilégier le sommeil, et surveiller l'évolution. Si ça persiste plus de 7 jours, envisager une semaine de récupération active."
  },
  {
    question: "La fatigue est-elle un diagnostic médical ?",
    answer: "Non. La fatigue quantifiée est une estimation contextuelle basée sur des données d'entraînement, pas un diagnostic médical. En cas de fatigue persistante ou de symptômes inhabituels, consulter un professionnel de santé."
  }
];

// Legacy exports for compatibility
export type FatigueComponentV2 = FatiguePillarResult;

export interface FatigueV2InputLegacy extends FatigueV2Input {
  tss7dHabituel?: number | null;
  sessionCount7d?: number | null;
  intensitySessions7d?: number | null;
  stressLevel?: number | null;
  recoveryRating?: number | null;
  hrv?: number | null;
  tteMin?: number | null;
  performanceVariability?: number | null;
  fatiguePercue?: number | null;
  vlamaxValue?: number | null;
}
