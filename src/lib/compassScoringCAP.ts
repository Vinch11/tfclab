/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * METABOLIC PERFORMANCE COMPASS™ — SCORING CAP (Course à Pied)
 * Two For Coaching Lab — Running-Specific 6-Axis Compass
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * MODE ADAPTATIF CAP — 6 AXES SPÉCIFIQUES :
 * 1. VO2max — Capacité aérobie maximale
 * 2. VLamax CAP — Profil glycolytique course
 * 3. Économie — Running Economy index
 * 4. Durabilité — Résistance à la fatigue (TTE / Drift)
 * 5. vVO2max — Vitesse à VO2max
 * 6. Allure Seuil — Performance au seuil lactique
 * 
 * ISOLATION STRICTE :
 * - Aucune donnée vélo (FTP, Watts) n'est utilisée
 * - Toutes les métriques sont en unités running (pace, km/h)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { RunningEconomyV2, computeRunningEconomyV2 } from './v2/runningEconomyV2';
import { VLamaxCapEstimate, estimateVLamaxCap, canEstimateVLamaxCap } from './v2/vlamaxCapEstimator';
import { getVLamaxRange, getTTETargetByAmbition } from './physiologicalTargets';
import { AmbitionLevel, DEFAULT_AMBITION } from '@/types/ambitionLevel';
import { getAgeAdjustedTargets } from './ageAdjustment';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CompassCAPAxisScore {
  score: number;              // 0-100
  rawScore: number;           // Score avant ajustement
  label: string;              // Nom de l'axe
  shortLabel: string;         // Nom court pour radar
  explanation: string;        // Explication pédagogique
  formula: string;            // Formule utilisée (mode staff)
  inputs: Record<string, number | string | null>;
  confidence: number;         // 0-1
  source: string;
  icon: string;               // Emoji
  color: string;              // Couleur pour le graphique
}

export interface CompassCAPScores {
  // Les 6 axes CAP
  vo2max: CompassCAPAxisScore;
  vlamaxCap: CompassCAPAxisScore;
  economy: CompassCAPAxisScore;
  durability: CompassCAPAxisScore;
  vVO2max: CompassCAPAxisScore;
  paceThreshold: CompassCAPAxisScore;
  
  // Synthèse
  globalScore: number;
  globalLabel: string;
  globalColor: "success" | "warning" | "destructive";
  dataCompleteness: number;
  mainLimitation: string | null;
  mainStrength: string | null;
  
  // Métadonnées
  isRunningMode: true;
  objectif: string;
  ambition: AmbitionLevel;
}

export interface CompassCAPInput {
  // Données physiologiques CAP
  vo2max: number | null;          // ml/kg/min
  vma: number | null;             // km/h
  vlamaxCap: number | null;       // mmol/L/s (VLamax CAP estimée ou mesurée)
  
  // Allures
  paceThresholdSecPerKm: number | null;  // sec/km
  paceEnduranceSecPerKm: number | null;  // sec/km (allure Z2)
  
  // Durabilité
  tteMin: number | null;          // TTE en minutes
  hrDriftPct: number | null;      // % dérive cardiaque
  
  // Économie
  economyIndex: number | null;    // 0-100 (RunningEconomyV2.index)
  economyLevel: string | null;    // EconomyLevelV2
  
  // FC
  fcMax: number | null;
  fcEndurance: number | null;
  
  // Sprint (pour VLamax CAP si pas fournie)
  sprint15sDistance: number | null;
  runningPowerMax: number | null;
  
  // Contexte
  objectif: string;
  ambition?: AmbitionLevel;
  athleteAge?: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES & CIBLES CAP
// ═══════════════════════════════════════════════════════════════════════════════

const CLAMP = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Cibles VO2max par objectif et ambition (ml/kg/min)
function getVO2maxTarget(objectif: string, ambition: AmbitionLevel): number {
  const baseTargets: Record<string, number> = {
    "5K": 55,
    "10K": 55,
    "Semi": 52,
    "Marathon": 50,
    "Trail": 52,
    "TrailCourt": 50,
    "TrailLong": 48,
    "TrailUltra": 45,
    "IM": 50,
    "Ironman": 48,
    "703": 52,
  };
  
  const ambitionMod: Record<AmbitionLevel, number> = {
    finisher: -5,
    age_group: 0,
    competitor: +3,
    elite: +7,         // Qualifiable
    world_class: +11,  // Elite top 3% — VO2max cible plus exigeante
  };
  
  const key = Object.keys(baseTargets).find(k => 
    objectif.toLowerCase().includes(k.toLowerCase())
  ) || "Marathon";
  
  return (baseTargets[key] || 50) + (ambitionMod[ambition] || 0);
}

// Cibles vVO2max par objectif (km/h)
function getVVO2maxTarget(objectif: string, ambition: AmbitionLevel): number {
  const baseTargets: Record<string, number> = {
    "5K": 18,
    "10K": 17.5,
    "Semi": 17,
    "Marathon": 16.5,
    "Trail": 16,
    "TrailLong": 15,
    "TrailUltra": 14,
    "IM": 15,
  };
  
  const ambitionMod: Record<AmbitionLevel, number> = {
    finisher: -1.5,
    age_group: 0,
    competitor: +1,
    elite: +2.5,        // Qualifiable
    world_class: +4,    // Elite top 3% — vVO2max plus haute
  };
  
  const key = Object.keys(baseTargets).find(k => 
    objectif.toLowerCase().includes(k.toLowerCase())
  ) || "Marathon";
  
  return (baseTargets[key] || 16) + (ambitionMod[ambition] || 0);
}

// Cibles allure seuil par objectif (sec/km → cible plus basse = meilleur)
function getPaceThresholdTarget(objectif: string, ambition: AmbitionLevel): number {
  const baseTargets: Record<string, number> = {
    "5K": 210,       // 3:30/km
    "10K": 225,      // 3:45/km
    "Semi": 240,     // 4:00/km
    "Marathon": 255, // 4:15/km
    "Trail": 270,    // 4:30/km
    "TrailLong": 300,// 5:00/km
    "TrailUltra": 330, // 5:30/km
    "IM": 285,       // 4:45/km
  };
  
  const ambitionMod: Record<AmbitionLevel, number> = {
    finisher: +30,
    age_group: 0,
    competitor: -15,
    elite: -30,           // Qualifiable
    world_class: -45,     // Elite top 3% — allure seuil ~45 s/km plus rapide
  };
  
  const key = Object.keys(baseTargets).find(k => 
    objectif.toLowerCase().includes(k.toLowerCase())
  ) || "Marathon";
  
  return (baseTargets[key] || 255) + (ambitionMod[ambition] || 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCUL DES 6 AXES
// ═══════════════════════════════════════════════════════════════════════════════

// AXE 1 : VO2max
function computeVO2maxAxis(
  vo2max: number | null,
  objectif: string,
  ambition: AmbitionLevel
): CompassCAPAxisScore {
  const target = getVO2maxTarget(objectif, ambition);
  
  if (vo2max === null || vo2max <= 0) {
    return {
      score: 0, rawScore: 0,
      label: "VO₂max", shortLabel: "VO₂max",
      explanation: "VO₂max non renseigné — aucune estimation possible",
      formula: "Données manquantes",
      inputs: { vo2max: null, target },
      confidence: 0, source: "unknown",
      icon: "🫁", color: "hsl(200, 70%, 50%)"
    };
  }
  
  const rawScore = (vo2max / target) * 100;
  const score = CLAMP(Math.round(rawScore), 0, 100);
  
  let explanation = "";
  if (score >= 100) {
    explanation = `VO₂max excellent (${vo2max} ≥ ${target} ml/kg/min cible)`;
  } else if (score >= 85) {
    explanation = `VO₂max proche de l'objectif (${vo2max} ml/kg/min)`;
  } else if (score >= 70) {
    explanation = `VO₂max en progression (${vo2max} vs ${target} cible)`;
  } else {
    explanation = `VO₂max insuffisant pour ${objectif} (${vo2max} << ${target})`;
  }
  
  return {
    score, rawScore: Math.round(rawScore),
    label: "VO₂max", shortLabel: "VO₂max",
    explanation,
    formula: `VO2_score = (${vo2max} / ${target}) × 100 = ${rawScore.toFixed(0)}`,
    inputs: { vo2max, target },
    confidence: 0.85, source: "snapshot",
    icon: "🫁", color: "hsl(200, 70%, 50%)"
  };
}

// AXE 2 : VLamax CAP
function computeVLamaxCAPAxis(
  vlamaxCap: number | null,
  objectif: string,
  ambition: AmbitionLevel
): CompassCAPAxisScore {
  // CAP-explicit: applique l'offset sport=cap (+0.05/+0.07/+0.06 vs vélo)
  const vlamaxRange = getVLamaxRange(objectif, ambition, "cap");
  const optimal = vlamaxRange.optimal;
  const max = vlamaxRange.max;
  
  if (vlamaxCap === null) {
    return {
      score: 0, rawScore: 0,
      label: "VLamax CAP", shortLabel: "VLamax",
      explanation: "VLamax CAP non renseignée — aucune estimation possible",
      formula: "Données manquantes",
      inputs: { vlamaxCap: null, optimal, max },
      confidence: 0, source: "unknown",
      icon: "⚡", color: "hsl(45, 90%, 50%)"
    };
  }
  
  let score: number;
  let explanation: string;
  
  if (vlamaxCap <= optimal) {
    score = 100;
    explanation = `VLamax CAP optimale (${vlamaxCap.toFixed(2)} ≤ ${optimal}) — profil oxydatif idéal`;
  } else if (vlamaxCap <= max) {
    const deviation = vlamaxCap - optimal;
    const plage = max - optimal;
    score = Math.round(100 - (deviation / plage) * 25);
    explanation = `VLamax CAP acceptable (${vlamaxCap.toFixed(2)}) — légèrement au-dessus de l'idéal`;
  } else {
    const excess = vlamaxCap - max;
    score = Math.max(20, Math.round(75 - excess * 150));
    explanation = `VLamax CAP élevée (${vlamaxCap.toFixed(2)} > ${max}) — profil glycolytique excessif`;
  }
  
  return {
    score: CLAMP(score, 0, 100), rawScore: score,
    label: "VLamax CAP", shortLabel: "VLamax",
    explanation,
    formula: `VLamax_score = 100 - écart_relatif × pénalité`,
    inputs: { vlamaxCap: Math.round(vlamaxCap * 100) / 100, optimal, max },
    confidence: 0.75, source: "estimation",
    icon: "⚡", color: "hsl(45, 90%, 50%)"
  };
}

// AXE 3 : Économie de Course
function computeEconomyAxis(
  economyIndex: number | null,
  economyLevel: string | null
): CompassCAPAxisScore {
  if (economyIndex === null) {
    return {
      score: 0, rawScore: 0,
      label: "Économie", shortLabel: "Économie",
      explanation: "Économie de course non renseignée — aucune estimation possible",
      formula: "Données manquantes",
      inputs: { economyIndex: null, economyLevel: null },
      confidence: 0, source: "unknown",
      icon: "🦶", color: "hsl(160, 60%, 45%)"
    };
  }
  
  const score = CLAMP(economyIndex, 0, 100);
  let explanation = "";
  
  if (score >= 85) {
    explanation = "Économie excellente — foulée efficace, atout compétitif";
  } else if (score >= 70) {
    explanation = "Bonne économie — des gains marginaux possibles";
  } else if (score >= 50) {
    explanation = "Économie moyenne — potentiel d'amélioration technique";
  } else {
    explanation = "Économie faible — priorité au travail technique";
  }
  
  return {
    score, rawScore: economyIndex,
    label: "Économie", shortLabel: "Économie",
    explanation,
    formula: `Economy_score = ${economyIndex}`,
    inputs: { economyIndex, economyLevel },
    confidence: 0.7, source: "computed",
    icon: "🦶", color: "hsl(160, 60%, 45%)"
  };
}

// AXE 4 : Durabilité
function computeDurabilityAxis(
  tteMin: number | null,
  hrDriftPct: number | null,
  objectif: string,
  ambition: AmbitionLevel
): CompassCAPAxisScore {
  const tteTarget = getTTETargetByAmbition(objectif, ambition);
  
  // Si aucune donnée
  if (tteMin === null && hrDriftPct === null) {
    return {
      score: 0, rawScore: 0,
      label: "Durabilité", shortLabel: "Durabilité",
      explanation: "Durabilité non renseignée — aucune estimation possible",
      formula: "Données manquantes",
      inputs: { tteMin: null, hrDriftPct: null, tteTarget },
      confidence: 0, source: "unknown",
      icon: "💪", color: "hsl(280, 60%, 55%)"
    };
  }
  
  let tteScore = 50;
  let driftScore = 50;
  let confidence = 0.4;
  
  // Score TTE
  if (tteMin !== null && tteMin > 0) {
    tteScore = CLAMP(Math.round((tteMin / tteTarget) * 100), 0, 100);
    confidence += 0.25;
  }
  
  // Score dérive cardiaque (inversé : moins de drift = meilleur)
  if (hrDriftPct !== null) {
    if (hrDriftPct <= 4) driftScore = 100;
    else if (hrDriftPct <= 6) driftScore = 85;
    else if (hrDriftPct <= 10) driftScore = 70;
    else if (hrDriftPct <= 15) driftScore = 50;
    else driftScore = 30;
    confidence += 0.2;
  }
  
  // Combinaison pondérée
  const hasTTE = tteMin !== null;
  const hasDrift = hrDriftPct !== null;
  let score: number;
  
  if (hasTTE && hasDrift) {
    score = Math.round(tteScore * 0.6 + driftScore * 0.4);
  } else if (hasTTE) {
    score = tteScore;
  } else {
    score = driftScore;
  }
  
  let explanation = "";
  if (score >= 85) {
    explanation = "Durabilité excellente — excellente résistance à la fatigue";
  } else if (score >= 70) {
    explanation = "Bonne durabilité — gestion de l'effort solide";
  } else if (score >= 50) {
    explanation = "Durabilité modérée — attention en fin de course";
  } else {
    explanation = "Durabilité limitée — risque de décrochage en seconde partie";
  }
  
  return {
    score, rawScore: score,
    label: "Durabilité", shortLabel: "Durabilité",
    explanation,
    formula: `Durability = ${hasTTE ? `TTE(${tteMin}/${tteTarget})` : ''}${hasTTE && hasDrift ? ' + ' : ''}${hasDrift ? `Drift(${hrDriftPct}%)` : ''}`,
    inputs: { tteMin, hrDriftPct, tteTarget },
    confidence: CLAMP(confidence, 0, 0.9), source: hasTTE ? "snapshot" : "estimation",
    icon: "💪", color: "hsl(280, 60%, 55%)"
  };
}

// AXE 5 : vVO2max
function computeVVO2maxAxis(
  vma: number | null,
  objectif: string,
  ambition: AmbitionLevel
): CompassCAPAxisScore {
  const target = getVVO2maxTarget(objectif, ambition);
  
  if (vma === null || vma <= 0) {
    return {
      score: 0, rawScore: 0,
      label: "vVO₂max", shortLabel: "vVO₂max",
      explanation: "VMA non renseignée — aucune estimation possible",
      formula: "Données manquantes",
      inputs: { vma: null, target },
      confidence: 0, source: "unknown",
      icon: "🚀", color: "hsl(340, 70%, 55%)"
    };
  }
  
  const rawScore = (vma / target) * 100;
  const score = CLAMP(Math.round(rawScore), 0, 100);
  
  let explanation = "";
  if (score >= 100) {
    explanation = `vVO₂max excellente (${vma} ≥ ${target} km/h cible)`;
  } else if (score >= 85) {
    explanation = `vVO₂max proche de l'objectif (${vma} km/h)`;
  } else if (score >= 70) {
    explanation = `vVO₂max en progression (${vma} vs ${target} km/h cible)`;
  } else {
    explanation = `vVO₂max insuffisante pour ${objectif} (${vma} << ${target} km/h)`;
  }
  
  return {
    score, rawScore: Math.round(rawScore),
    label: "vVO₂max", shortLabel: "vVO₂max",
    explanation,
    formula: `vVO2_score = (${vma} / ${target}) × 100 = ${rawScore.toFixed(0)}`,
    inputs: { vma, target },
    confidence: 0.85, source: "snapshot",
    icon: "🚀", color: "hsl(340, 70%, 55%)"
  };
}

// AXE 6 : Allure Seuil
function computePaceThresholdAxis(
  paceThresholdSecPerKm: number | null,
  objectif: string,
  ambition: AmbitionLevel
): CompassCAPAxisScore {
  const target = getPaceThresholdTarget(objectif, ambition);
  
  if (paceThresholdSecPerKm === null || paceThresholdSecPerKm <= 0) {
    return {
      score: 0, rawScore: 0,
      label: "Allure Seuil", shortLabel: "Seuil",
      explanation: "Allure seuil non renseignée — aucune estimation possible",
      formula: "Données manquantes",
      inputs: { pace: null, target },
      confidence: 0, source: "unknown",
      icon: "⏱️", color: "hsl(25, 85%, 50%)"
    };
  }
  
  // Score inversé : allure plus basse = meilleur score
  const rawScore = (target / paceThresholdSecPerKm) * 100;
  const score = CLAMP(Math.round(rawScore), 0, 100);
  
  const formatPace = (sec: number) => {
    const min = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${min}:${s.toString().padStart(2, '0')}/km`;
  };
  
  let explanation = "";
  if (score >= 100) {
    explanation = `Allure seuil excellente (${formatPace(paceThresholdSecPerKm)} ≤ ${formatPace(target)} cible)`;
  } else if (score >= 85) {
    explanation = `Allure seuil proche de l'objectif (${formatPace(paceThresholdSecPerKm)})`;
  } else if (score >= 70) {
    explanation = `Allure seuil en progression (${formatPace(paceThresholdSecPerKm)} vs ${formatPace(target)})`;
  } else {
    explanation = `Allure seuil insuffisante pour ${objectif}`;
  }
  
  return {
    score, rawScore: Math.round(rawScore),
    label: "Allure Seuil", shortLabel: "Seuil",
    explanation,
    formula: `Pace_score = (${target} / ${paceThresholdSecPerKm}) × 100 = ${rawScore.toFixed(0)}`,
    inputs: { pace: paceThresholdSecPerKm, paceFormatted: formatPace(paceThresholdSecPerKm), target, targetFormatted: formatPace(target) },
    confidence: 0.85, source: "snapshot",
    icon: "⏱️", color: "hsl(25, 85%, 50%)"
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE — COMPASS CAP
// ═══════════════════════════════════════════════════════════════════════════════

export function computeCompassCAPScores(input: CompassCAPInput): CompassCAPScores {
  const ambition = input.ambition || DEFAULT_AMBITION;
  const objectif = input.objectif || "Marathon";
  
  // Estimer VLamax CAP si non fournie mais données disponibles
  let vlamaxCap = input.vlamaxCap;
  if (vlamaxCap === null && canEstimateVLamaxCap({
    vma: input.vma,
    paceThresholdSecPerKm: input.paceThresholdSecPerKm,
    sprint15sDistance: input.sprint15sDistance,
    runningPowerMax: input.runningPowerMax,
  })) {
    const estimate = estimateVLamaxCap({
      vma: input.vma,
      paceThresholdSecPerKm: input.paceThresholdSecPerKm,
      sprint15sDistance: input.sprint15sDistance,
      runningPowerMax: input.runningPowerMax,
    });
    vlamaxCap = estimate.value;
  }
  
  // Calculer les 6 axes
  const vo2max = computeVO2maxAxis(input.vo2max, objectif, ambition);
  const vlamaxCapAxis = computeVLamaxCAPAxis(vlamaxCap, objectif, ambition);
  const economy = computeEconomyAxis(input.economyIndex, input.economyLevel);
  const durability = computeDurabilityAxis(input.tteMin, input.hrDriftPct, objectif, ambition);
  const vVO2max = computeVVO2maxAxis(input.vma, objectif, ambition);
  const paceThreshold = computePaceThresholdAxis(input.paceThresholdSecPerKm, objectif, ambition);
  
  // Score global (moyenne pondérée adaptée CAP)
  // Pondérations: VO2max 15%, VLamax 20%, Économie 20%, Durabilité 20%, vVO2max 10%, Seuil 15%
  const globalScore = Math.round(
    vo2max.score * 0.15 +
    vlamaxCapAxis.score * 0.20 +
    economy.score * 0.20 +
    durability.score * 0.20 +
    vVO2max.score * 0.10 +
    paceThreshold.score * 0.15
  );
  
  // Label et couleur
  let globalLabel: string;
  let globalColor: "success" | "warning" | "destructive";
  
  if (globalScore >= 80) {
    globalLabel = "Profil CAP Optimal";
    globalColor = "success";
  } else if (globalScore >= 65) {
    globalLabel = "Bon Équilibre CAP";
    globalColor = "success";
  } else if (globalScore >= 50) {
    globalLabel = "En Progression";
    globalColor = "warning";
  } else {
    globalLabel = "À Développer";
    globalColor = "destructive";
  }
  
  // Identifier forces et limitations
  const axes = [
    { name: "VO₂max", score: vo2max.score },
    { name: "VLamax CAP", score: vlamaxCapAxis.score },
    { name: "Économie", score: economy.score },
    { name: "Durabilité", score: durability.score },
    { name: "vVO₂max", score: vVO2max.score },
    { name: "Allure Seuil", score: paceThreshold.score },
  ];
  
  const sorted = [...axes].sort((a, b) => b.score - a.score);
  const mainStrength = sorted[0].score >= 70 ? sorted[0].name : null;
  const mainLimitation = sorted[5].score < 70 ? sorted[5].name : null;
  
  // Complétude des données
  let dataCount = 0;
  if (input.vo2max !== null) dataCount++;
  if (vlamaxCap !== null) dataCount++;
  if (input.economyIndex !== null) dataCount++;
  if (input.tteMin !== null || input.hrDriftPct !== null) dataCount++;
  if (input.vma !== null) dataCount++;
  if (input.paceThresholdSecPerKm !== null) dataCount++;
  const dataCompleteness = Math.round((dataCount / 6) * 100);
  
  return {
    vo2max,
    vlamaxCap: vlamaxCapAxis,
    economy,
    durability,
    vVO2max,
    paceThreshold,
    globalScore,
    globalLabel,
    globalColor,
    dataCompleteness,
    mainLimitation,
    mainStrength,
    isRunningMode: true,
    objectif,
    ambition,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS POUR CHART DATA
// ═══════════════════════════════════════════════════════════════════════════════

export function getCompassCAPChartData(scores: CompassCAPScores) {
  return [
    {
      axis: "VO₂max",
      axisShort: "VO₂max",
      icon: scores.vo2max.icon,
      current: scores.vo2max.score,
      target: 80,
      explanation: scores.vo2max.explanation,
      color: scores.vo2max.color,
      fullMark: 100,
    },
    {
      axis: "VLamax\nCAP",
      axisShort: "VLamax",
      icon: scores.vlamaxCap.icon,
      current: scores.vlamaxCap.score,
      target: 80,
      explanation: scores.vlamaxCap.explanation,
      color: scores.vlamaxCap.color,
      fullMark: 100,
    },
    {
      axis: "Économie",
      axisShort: "Économie",
      icon: scores.economy.icon,
      current: scores.economy.score,
      target: 80,
      explanation: scores.economy.explanation,
      color: scores.economy.color,
      fullMark: 100,
    },
    {
      axis: "Durabilité",
      axisShort: "Durabilité",
      icon: scores.durability.icon,
      current: scores.durability.score,
      target: 80,
      explanation: scores.durability.explanation,
      color: scores.durability.color,
      fullMark: 100,
    },
    {
      axis: "vVO₂max",
      axisShort: "vVO₂max",
      icon: scores.vVO2max.icon,
      current: scores.vVO2max.score,
      target: 80,
      explanation: scores.vVO2max.explanation,
      color: scores.vVO2max.color,
      fullMark: 100,
    },
    {
      axis: "Allure\nSeuil",
      axisShort: "Seuil",
      icon: scores.paceThreshold.icon,
      current: scores.paceThreshold.score,
      target: 80,
      explanation: scores.paceThreshold.explanation,
      color: scores.paceThreshold.color,
      fullMark: 100,
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  getVO2maxTarget,
  getVVO2maxTarget,
  getPaceThresholdTarget,
};
