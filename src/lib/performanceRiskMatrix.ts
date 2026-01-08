/**
 * MATRICE D'AIDE À LA DÉCISION STAFF
 * Performance-Risk Matrix bi-dimensionnelle
 * 
 * AXE X: Risque Blessure (CAP prioritairement)
 * AXE Y: Risque Performance
 * 
 * Affiche AVANT (état actuel) et APRÈS (projection post-recommandations)
 */

import { CAPInjuryRiskResult, computeCAPInjuryRisk } from "@/lib/capInjuryRisk";

// =============================================
// TYPES
// =============================================

export type RiskLevel = "low" | "moderate" | "high";

export interface MatrixPosition {
  x: RiskLevel; // Risque Blessure
  y: RiskLevel; // Risque Performance
  xNumeric: number; // 0-2
  yNumeric: number; // 0-2
}

export interface MatrixPoint {
  position: MatrixPosition;
  label: string;
  color: string;
}

export interface PerformanceRiskMatrixResult {
  before: MatrixPoint;
  after: MatrixPoint;
  injuryRiskLabel: string;
  performanceRiskLabel: string;
  interpretation: string;
  improvementSummary: string;
  disclaimer: string;
}

export interface ComputeMatrixParams {
  // CAP Injury Risk (source unifiée)
  capInjuryRisk: CAPInjuryRiskResult;
  
  // VLamax effectif
  vlamaxValue: number | null;
  vlamaxConfidence: number;
  
  // TTE effectif
  tteValue: number | null;
  tteConfidence: number;
  
  // Race Readiness
  raceReadinessScore: number | null;
  
  // Objectif
  objectif: string;
}

// =============================================
// SEUILS PAR OBJECTIF
// =============================================

interface ObjectifTargets {
  vlamaxIdeal: number;
  vlamaxModerate: number;
  tteIdeal: number;
  tteModerate: number;
  readinessGood: number;
  readinessModerate: number;
}

function getTargetsForObjectif(objectif: string): ObjectifTargets {
  const normalized = objectif.toLowerCase();
  
  if (normalized.includes("semi") || normalized.includes("21k")) {
    return {
      vlamaxIdeal: 0.45,
      vlamaxModerate: 0.55,
      tteIdeal: 50,
      tteModerate: 42,
      readinessGood: 75,
      readinessModerate: 55,
    };
  }
  
  if (normalized.includes("marathon") && !normalized.includes("semi")) {
    return {
      vlamaxIdeal: 0.40,
      vlamaxModerate: 0.50,
      tteIdeal: 55,
      tteModerate: 45,
      readinessGood: 80,
      readinessModerate: 60,
    };
  }
  
  if (normalized.includes("70.3") || normalized.includes("703") || normalized.includes("half")) {
    return {
      vlamaxIdeal: 0.42,
      vlamaxModerate: 0.52,
      tteIdeal: 52,
      tteModerate: 44,
      readinessGood: 75,
      readinessModerate: 55,
    };
  }
  
  if (normalized.includes("ironman") || normalized.includes("kona") || normalized.includes("im")) {
    return {
      vlamaxIdeal: 0.35,
      vlamaxModerate: 0.45,
      tteIdeal: 58,
      tteModerate: 48,
      readinessGood: 80,
      readinessModerate: 60,
    };
  }
  
  // Default
  return {
    vlamaxIdeal: 0.45,
    vlamaxModerate: 0.55,
    tteIdeal: 50,
    tteModerate: 42,
    readinessGood: 75,
    readinessModerate: 55,
  };
}

// =============================================
// CALCUL RISQUE BLESSURE (AXE X)
// =============================================

function computeInjuryRiskLevel(capInjuryRisk: CAPInjuryRiskResult): RiskLevel {
  // Mapping direct depuis l'indice CAP existant
  if (capInjuryRisk.level <= 1) return "low";
  if (capInjuryRisk.level === 2) return "moderate";
  return "high";
}

function getInjuryRiskLabel(level: RiskLevel): string {
  switch (level) {
    case "low": return "Faible";
    case "moderate": return "Modéré";
    case "high": return "Élevé";
  }
}

// =============================================
// CALCUL RISQUE PERFORMANCE (AXE Y)
// =============================================

function computePerformanceRiskLevel(params: {
  vlamaxValue: number | null;
  tteValue: number | null;
  raceReadinessScore: number | null;
  targets: ObjectifTargets;
}): RiskLevel {
  const { vlamaxValue, tteValue, raceReadinessScore, targets } = params;
  
  let score = 0;
  let factorsCount = 0;
  
  // VLamax scoring (0-2)
  if (vlamaxValue !== null) {
    if (vlamaxValue <= targets.vlamaxIdeal) {
      score += 0;
    } else if (vlamaxValue <= targets.vlamaxModerate) {
      score += 1;
    } else {
      score += 2;
    }
    factorsCount++;
  }
  
  // TTE scoring (0-2)
  if (tteValue !== null) {
    if (tteValue >= targets.tteIdeal) {
      score += 0;
    } else if (tteValue >= targets.tteModerate) {
      score += 1;
    } else {
      score += 2;
    }
    factorsCount++;
  }
  
  // Race Readiness scoring (0-2)
  if (raceReadinessScore !== null) {
    if (raceReadinessScore >= targets.readinessGood) {
      score += 0;
    } else if (raceReadinessScore >= targets.readinessModerate) {
      score += 1;
    } else {
      score += 2;
    }
    factorsCount++;
  }
  
  if (factorsCount === 0) return "moderate"; // Default si aucune donnée
  
  const avgScore = score / factorsCount;
  
  if (avgScore < 0.7) return "low";
  if (avgScore < 1.5) return "moderate";
  return "high";
}

function getPerformanceRiskLabel(level: RiskLevel): string {
  switch (level) {
    case "low": return "Faible (profil robuste)";
    case "moderate": return "Modéré (profil perfectible)";
    case "high": return "Élevé (verrous physiologiques)";
  }
}

// =============================================
// PROJECTION "APRÈS" RECOMMANDATIONS
// =============================================

function projectAfterRecommendations(params: {
  vlamaxValue: number | null;
  tteValue: number | null;
  raceReadinessScore: number | null;
  capInjuryRisk: CAPInjuryRiskResult;
  objectif: string;
}): { injuryLevel: RiskLevel; perfLevel: RiskLevel } {
  const { vlamaxValue, tteValue, raceReadinessScore, capInjuryRisk, objectif } = params;
  const targets = getTargetsForObjectif(objectif);
  
  // Projections optimistes mais réalistes
  // VLamax: -0.05 à -0.08 après 8-12 semaines de travail aérobie
  const projectedVlamax = vlamaxValue !== null 
    ? Math.max(0.25, vlamaxValue - 0.06) 
    : null;
  
  // TTE: +8 à +12 min après travail endurance structuré
  const projectedTTE = tteValue !== null 
    ? Math.min(65, tteValue + 10) 
    : null;
  
  // Race Readiness: +10 à +15 points si les ajustements sont appliqués
  const projectedReadiness = raceReadinessScore !== null 
    ? Math.min(95, raceReadinessScore + 12) 
    : null;
  
  // Recalculer CAP injury risk avec valeurs projetées
  const projectedCapRisk = computeCAPInjuryRisk({
    vlamaxValue: projectedVlamax,
    tteValue: projectedTTE,
    objectif,
  });
  
  const injuryLevel = computeInjuryRiskLevel(projectedCapRisk);
  
  const perfLevel = computePerformanceRiskLevel({
    vlamaxValue: projectedVlamax,
    tteValue: projectedTTE,
    raceReadinessScore: projectedReadiness,
    targets,
  });
  
  return { injuryLevel, perfLevel };
}

// =============================================
// GÉNÉRATION INTERPRÉTATION TEXTUELLE
// =============================================

function generateInterpretation(before: MatrixPosition, after: MatrixPosition): string {
  const beforeZone = getZoneDescription(before);
  const afterZone = getZoneDescription(after);
  
  if (before.xNumeric === after.xNumeric && before.yNumeric === after.yNumeric) {
    return `Le profil se maintient dans une zone ${beforeZone}. Les ajustements proposés visent à consolider cette position.`;
  }
  
  const xDelta = before.xNumeric - after.xNumeric;
  const yDelta = before.yNumeric - after.yNumeric;
  
  const improvements: string[] = [];
  if (xDelta > 0) improvements.push("réduction du risque blessure CAP");
  if (yDelta > 0) improvements.push("amélioration du potentiel performance");
  
  if (improvements.length === 0) {
    return `Actuellement en zone ${beforeZone}. Les recommandations visent à optimiser le profil.`;
  }
  
  return `Actuellement en zone ${beforeZone}. Les ajustements proposés visent une ${improvements.join(" et ")}, déplaçant le profil vers une zone ${afterZone}.`;
}

function getZoneDescription(pos: MatrixPosition): string {
  if (pos.xNumeric <= 0 && pos.yNumeric <= 0) return "optimale (faible risque, haute performance)";
  if (pos.xNumeric >= 2 && pos.yNumeric >= 2) return "critique (risques élevés)";
  if (pos.xNumeric >= 2) return "à risque blessure";
  if (pos.yNumeric >= 2) return "limitée en performance";
  return "intermédiaire";
}

function generateImprovementSummary(before: MatrixPosition, after: MatrixPosition): string {
  const xDelta = before.xNumeric - after.xNumeric;
  const yDelta = before.yNumeric - after.yNumeric;
  
  if (xDelta === 0 && yDelta === 0) {
    return "Consolidation du profil actuel.";
  }
  
  const parts: string[] = [];
  if (xDelta > 0) parts.push(`Risque blessure: ${getInjuryRiskLabel(numToLevel(before.xNumeric))} → ${getInjuryRiskLabel(numToLevel(after.xNumeric))}`);
  if (yDelta > 0) parts.push(`Risque perf: ${getInjuryRiskLabel(numToLevel(before.yNumeric))} → ${getInjuryRiskLabel(numToLevel(after.yNumeric))}`);
  
  return parts.join(" | ") || "Optimisation ciblée en cours.";
}

function numToLevel(n: number): RiskLevel {
  if (n <= 0) return "low";
  if (n === 1) return "moderate";
  return "high";
}

function levelToNum(level: RiskLevel): number {
  switch (level) {
    case "low": return 0;
    case "moderate": return 1;
    case "high": return 2;
  }
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computePerformanceRiskMatrix(params: ComputeMatrixParams): PerformanceRiskMatrixResult {
  const {
    capInjuryRisk,
    vlamaxValue,
    tteValue,
    raceReadinessScore,
    objectif,
  } = params;
  
  const targets = getTargetsForObjectif(objectif);
  
  // AVANT: état actuel
  const injuryRiskBefore = computeInjuryRiskLevel(capInjuryRisk);
  const perfRiskBefore = computePerformanceRiskLevel({
    vlamaxValue,
    tteValue,
    raceReadinessScore,
    targets,
  });
  
  const beforePosition: MatrixPosition = {
    x: injuryRiskBefore,
    y: perfRiskBefore,
    xNumeric: levelToNum(injuryRiskBefore),
    yNumeric: levelToNum(perfRiskBefore),
  };
  
  // APRÈS: projection post-recommandations
  const projected = projectAfterRecommendations({
    vlamaxValue,
    tteValue,
    raceReadinessScore,
    capInjuryRisk,
    objectif,
  });
  
  const afterPosition: MatrixPosition = {
    x: projected.injuryLevel,
    y: projected.perfLevel,
    xNumeric: levelToNum(projected.injuryLevel),
    yNumeric: levelToNum(projected.perfLevel),
  };
  
  return {
    before: {
      position: beforePosition,
      label: "AVANT",
      color: "gray",
    },
    after: {
      position: afterPosition,
      label: "APRÈS (projection)",
      color: "primary",
    },
    injuryRiskLabel: getInjuryRiskLabel(injuryRiskBefore),
    performanceRiskLabel: getPerformanceRiskLabel(perfRiskBefore),
    interpretation: generateInterpretation(beforePosition, afterPosition),
    improvementSummary: generateImprovementSummary(beforePosition, afterPosition),
    disclaimer: "Cette matrice est une aide à la décision. Le coach reste décisionnaire. La projection APRÈS est basée sur des hypothèses d'amélioration réalistes si les recommandations sont appliquées.",
  };
}

// =============================================
// HELPERS POUR AFFICHAGE
// =============================================

export function getMatrixCellColor(x: number, y: number): string {
  // Coin optimal (0,0)
  if (x === 0 && y === 0) return "bg-green-100 dark:bg-green-900/30";
  // Coin critique (2,2)
  if (x === 2 && y === 2) return "bg-red-100 dark:bg-red-900/30";
  // Zones intermédiaires
  if (x + y <= 1) return "bg-green-50 dark:bg-green-900/20";
  if (x + y >= 3) return "bg-red-50 dark:bg-red-900/20";
  return "bg-amber-50 dark:bg-amber-900/20";
}

export function getMatrixCellLabel(x: number, y: number): string {
  if (x === 0 && y === 0) return "Zone Optimale";
  if (x === 2 && y === 2) return "Zone Critique";
  if (x === 0 && y === 2) return "Perf limitée, blessure OK";
  if (x === 2 && y === 0) return "Perf OK, risque blessure";
  if (x === 1 && y === 1) return "Zone Intermédiaire";
  return "";
}