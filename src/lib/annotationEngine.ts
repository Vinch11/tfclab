/**
 * Moteur d'annotations staff-grade pour les templates de programmation
 * Two For Coaching Lab (Vince's Lab)
 * 
 * Ce moteur lit les données effectives et un plan/template,
 * puis produit des annotations sans modifier le plan.
 */

// ============================================
// 1.0 IMPORTS
// ============================================
import { 
  getVLamaxRange as getCentralVLamaxRange, 
  getTTETarget as getCentralTTETarget,
  VLamaxTargets 
} from "@/lib/physiologicalTargets";

// ============================================
// 1.1 TYPES
// ============================================

export type AnnotationSeverity = 0 | 1 | 2 | 3;
export type AnnotationType = "COHERENCE" | "RISK" | "OPTIMIZATION" | "PEDAGOGY";
export type PlanSport = "bike" | "run" | "swim" | "strength" | "other";
export type WorkoutType = 
  | "Z2" 
  | "Z2_LONG" 
  | "TEMPO" 
  | "TEMPO_LONG" 
  | "THRESHOLD" 
  | "THRESHOLD_LONG" 
  | "VO2" 
  | "SPEED" 
  | "BRICK" 
  | "RECOVERY" 
  | "FORCE_LOW_CADENCE" 
  | "OTHER";

export interface PlanWorkout {
  id: string;
  dateLabel?: string; // ex "S3 - Mardi", ou "2026-01-10"
  sport: PlanSport;
  type: WorkoutType;
  durationMin?: number;
  intensityHint?: string; // libre: "Z2", "Seuil", "VO2", etc
  keySession?: boolean;
  notes?: string;
}

export interface AthleteSignals {
  athleteId: string;
  objectif: "IM" | "703" | "Marathon" | "Semi" | string;
  vlamax: { value: number | null; source: string; confidence: number } | null;
  tte: { value: number | null; source: string; confidence: number } | null;
  ftpKg?: number | null;
  load7d?: number | null; // tss_7d
  fatigueScore?: number | null; // optionnel (si monitoring)
  age?: number | null;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  severity: AnnotationSeverity;
  title: string;
  message: string;
  why: string;
  suggestedChange?: string;
  confidence: number; // 0..1 (hérite de la donnée dominante)
  scope: "PLAN" | "WEEK" | "DAY";
  relatedWorkoutIds?: string[];
}

// ============================================
// 1.2 RÉFÉRENTIEL STAFF (CIBLES)
// ============================================

export interface VLamaxRange {
  min: number;
  max: number;
}

export function getVLamaxTargetRange(objectif: string): VLamaxRange {
  const range = getCentralVLamaxRange(objectif);
  return { min: range.min, max: range.max };
}

export function getTTETarget(objectif: string): number {
  return getCentralTTETarget(objectif);
}

export function severityFromGapVLamax(
  value: number,
  range: VLamaxRange,
  _objectif: string
): AnnotationSeverity {
  if (value <= range.max) return 0;
  if (value > range.max && value <= range.max + 0.05) return 2;
  return 3;
}

// ============================================
// 1.3 ANALYSE PLAN - HELPERS
// ============================================

export function countBySport(plan: PlanWorkout[]): Record<PlanSport, number> {
  const counts: Record<PlanSport, number> = {
    bike: 0,
    run: 0,
    swim: 0,
    strength: 0,
    other: 0,
  };
  
  plan.forEach((w) => {
    counts[w.sport] = (counts[w.sport] || 0) + 1;
  });
  
  return counts;
}

export function countKeyBySport(plan: PlanWorkout[]): Record<PlanSport, number> {
  const counts: Record<PlanSport, number> = {
    bike: 0,
    run: 0,
    swim: 0,
    strength: 0,
    other: 0,
  };
  
  plan.filter((w) => w.keySession).forEach((w) => {
    counts[w.sport] = (counts[w.sport] || 0) + 1;
  });
  
  return counts;
}

const QUALITY_TYPES: WorkoutType[] = ["VO2", "SPEED", "THRESHOLD", "THRESHOLD_LONG", "TEMPO", "TEMPO_LONG", "BRICK"];

export function countQualityBySport(plan: PlanWorkout[]): Record<PlanSport, number> {
  const counts: Record<PlanSport, number> = {
    bike: 0,
    run: 0,
    swim: 0,
    strength: 0,
    other: 0,
  };
  
  plan.filter((w) => QUALITY_TYPES.includes(w.type)).forEach((w) => {
    counts[w.sport] = (counts[w.sport] || 0) + 1;
  });
  
  return counts;
}

export function findBackToBackKeys(plan: PlanWorkout[]): PlanWorkout[][] {
  const backToBackPairs: PlanWorkout[][] = [];
  
  for (let i = 0; i < plan.length - 1; i++) {
    if (plan[i].keySession && plan[i + 1].keySession) {
      backToBackPairs.push([plan[i], plan[i + 1]]);
    }
  }
  
  return backToBackPairs;
}

function getTotalQualitySessions(plan: PlanWorkout[]): number {
  return plan.filter((w) => QUALITY_TYPES.includes(w.type)).length;
}

function hasWorkoutType(plan: PlanWorkout[], sport: PlanSport, types: WorkoutType[]): boolean {
  return plan.some((w) => w.sport === sport && types.includes(w.type));
}

function generateId(): string {
  return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// 1.4 RÈGLES D'ANNOTATIONS
// ============================================

function isRunGoal(objectif: string): boolean {
  return objectif === "Marathon" || objectif === "Semi";
}

function isTriGoal(objectif: string): boolean {
  return objectif === "IM" || objectif === "703";
}

/**
 * RÈGLE 1 — Cohérence objectif CAP vs plan multi-sport
 */
function ruleCapCoherence(signals: AthleteSignals, plan: PlanWorkout[]): Annotation | null {
  if (!isRunGoal(signals.objectif)) return null;
  
  const keyBySport = countKeyBySport(plan);
  const qualityBySport = countQualityBySport(plan);
  
  const nonRunKeys = (keyBySport.bike || 0) + (keyBySport.swim || 0);
  const nonRunQuality = (qualityBySport.bike || 0) + (qualityBySport.swim || 0);
  
  if (nonRunKeys > 0 || nonRunQuality > 2) {
    return {
      id: generateId(),
      type: "RISK",
      severity: 2,
      scope: "PLAN",
      title: "Plan non cohérent avec objectif CAP",
      message: "Ce template contient des séances clés vélo/natation alors que l'objectif est course à pied.",
      why: `Objectif=${signals.objectif}. Séances clés non-CAP: ${nonRunKeys}. Qualité non-CAP: ${nonRunQuality}.`,
      suggestedChange: "Remplacer les séances qualité non-CAP par CAP tempo/seuil ou Z2 CAP.",
      confidence: 0.9,
    };
  }
  
  return null;
}

/**
 * RÈGLE 2 — VLamax trop haut pour IM/70.3
 */
function ruleVLamaxTooHigh(signals: AthleteSignals, _plan: PlanWorkout[]): Annotation | null {
  if (!isTriGoal(signals.objectif)) return null;
  if (!signals.vlamax || signals.vlamax.value === null) return null;
  
  const range = getVLamaxTargetRange(signals.objectif);
  const v = signals.vlamax.value;
  
  if (v > range.max) {
    const severity = severityFromGapVLamax(v, range, signals.objectif);
    
    return {
      id: generateId(),
      type: "RISK",
      severity,
      scope: "WEEK",
      title: "Profil trop glycolytique pour l'objectif",
      message: "VLamax élevé → dépendance glucides + dérive fatigue plus probable.",
      why: `VLamax=${v.toFixed(2)} vs cible ${range.min.toFixed(2)}-${range.max.toFixed(2)} (objectif ${signals.objectif}).`,
      suggestedChange: "Ajouter 1 séance FORCE basse cadence + 1 Z2 long. Réduire sprints/VO2 cette semaine.",
      confidence: signals.vlamax.confidence,
    };
  }
  
  return null;
}

/**
 * RÈGLE 3 — VLamax trop bas (diesel extrême)
 */
function ruleVLamaxTooLow(signals: AthleteSignals, plan: PlanWorkout[]): Annotation | null {
  if (!signals.vlamax || signals.vlamax.value === null) return null;
  
  const range = getVLamaxTargetRange(signals.objectif);
  const v = signals.vlamax.value;
  
  if (v < range.min) {
    const speedSessions = plan.filter((w) => 
      w.type === "SPEED" || w.type === "VO2"
    ).length;
    
    if (speedSessions < 1) {
      return {
        id: generateId(),
        type: "OPTIMIZATION",
        severity: 1,
        scope: "WEEK",
        title: "Profil très diesel → risque de perte de vitesse",
        message: "VLamax bas + absence de stimuli vitesse → plafonnement possible.",
        why: `VLamax=${v.toFixed(2)} sous ${range.min.toFixed(2)}. Stimuli vitesse/VO2 insuffisants (${speedSessions} séances).`,
        suggestedChange: "Ajouter 1 rappel vitesse court (sprints/strides) par semaine.",
        confidence: signals.vlamax.confidence,
      };
    }
  }
  
  return null;
}

/**
 * RÈGLE 4 — TTE trop bas vs cible
 */
function ruleTTETooLow(signals: AthleteSignals, _plan: PlanWorkout[]): Annotation | null {
  if (!signals.tte || signals.tte.value === null) return null;
  
  const target = getTTETarget(signals.objectif);
  const tte = signals.tte.value;
  
  if (tte < target - 5) {
    return {
      id: generateId(),
      type: "RISK",
      severity: 2,
      scope: "WEEK",
      title: "TTE insuffisant pour l'objectif",
      message: "Prioriser tempo/seuil longs plutôt que VO2 court.",
      why: `TTE=${tte}min < cible=${target}min.`,
      suggestedChange: "Swap 1 séance VO2 → TEMPO_LONG ou ajouter THRESHOLD_LONG (2×20 / 3×15).",
      confidence: signals.tte.confidence,
    };
  }
  
  return null;
}

/**
 * RÈGLE 5 — TTE ok mais densité de qualité trop forte
 */
function ruleQualityDensity(signals: AthleteSignals, plan: PlanWorkout[]): Annotation | null {
  if (!signals.tte || signals.tte.value === null) return null;
  
  const target = getTTETarget(signals.objectif);
  const tte = signals.tte.value;
  
  // TTE doit être OK pour cette règle
  if (tte < target - 5) return null;
  
  const nbQuality = getTotalQualitySessions(plan);
  const highFatigue = signals.fatigueScore !== null && signals.fatigueScore !== undefined && signals.fatigueScore >= 7;
  const highLoad = signals.load7d !== null && signals.load7d !== undefined && signals.load7d > 500;
  
  if (nbQuality >= 3 && (highFatigue || highLoad)) {
    return {
      id: generateId(),
      type: "RISK",
      severity: 2,
      scope: "WEEK",
      title: "Densité de qualité trop élevée",
      message: "Risque d'assimilation insuffisante malgré TTE correct.",
      why: `Qualité=${nbQuality}/sem. fatigue=${signals.fatigueScore ?? "n/a"} load7d=${signals.load7d ?? "n/a"}.`,
      suggestedChange: "Retirer 1 séance qualité (remplacer par Z2/recovery).",
      confidence: Math.min(signals.tte.confidence, 0.7),
    };
  }
  
  return null;
}

/**
 * RÈGLE 6 — CAP: risque blessure si triade (long + seuil + vitesse) + charge haute
 */
function ruleCapInjuryRisk(signals: AthleteSignals, plan: PlanWorkout[]): Annotation | null {
  if (!isRunGoal(signals.objectif)) return null;
  
  const hasLong = hasWorkoutType(plan, "run", ["Z2_LONG"]);
  const hasThreshold = hasWorkoutType(plan, "run", ["THRESHOLD", "THRESHOLD_LONG", "TEMPO", "TEMPO_LONG"]);
  const hasSpeed = hasWorkoutType(plan, "run", ["SPEED", "VO2"]);
  
  if (!hasLong || !hasThreshold || !hasSpeed) return null;
  
  const highLoad = signals.load7d !== null && signals.load7d !== undefined && signals.load7d > 450;
  const highFatigue = signals.fatigueScore !== null && signals.fatigueScore !== undefined && signals.fatigueScore >= 7;
  
  if (highLoad || highFatigue) {
    return {
      id: generateId(),
      type: "RISK",
      severity: 3,
      scope: "WEEK",
      title: "Risque blessure CAP élevé",
      message: "Triade CAP (long + seuil + vitesse) sous charge haute = risque.",
      why: `Long+Seuil+Vitesse détectés, load7d=${signals.load7d ?? "n/a"}, fatigue=${signals.fatigueScore ?? "n/a"}.`,
      suggestedChange: "Garder 2/3 séances, alléger la 3e ou déplacer.",
      confidence: 0.75,
    };
  }
  
  return null;
}

/**
 * RÈGLE 7 — Séances clés consécutives (back-to-back)
 */
function ruleBackToBackKeys(signals: AthleteSignals, plan: PlanWorkout[]): Annotation | null {
  const backToBack = findBackToBackKeys(plan);
  
  if (backToBack.length > 0) {
    const pairs = backToBack.map((pair) => 
      `${pair[0].type}(${pair[0].sport}) → ${pair[1].type}(${pair[1].sport})`
    ).join(", ");
    
    const relatedIds = backToBack.flatMap((pair) => [pair[0].id, pair[1].id]);
    
    return {
      id: generateId(),
      type: "RISK",
      severity: 2,
      scope: "WEEK",
      title: "Séances clés consécutives",
      message: "Deux séances clés consécutives limitent la récupération et l'assimilation.",
      why: `Enchaînements détectés: ${pairs}.`,
      suggestedChange: "Intercaler une séance Z2 ou RECOVERY entre les séances clés.",
      confidence: 0.8,
      relatedWorkoutIds: relatedIds,
    };
  }
  
  return null;
}

/**
 * RÈGLE 8 — FTP/kg bas pour objectif long
 */
function ruleFTPKgLow(signals: AthleteSignals, _plan: PlanWorkout[]): Annotation | null {
  if (!signals.ftpKg || signals.ftpKg === null) return null;
  
  const thresholds: Record<string, number> = {
    "IM": 3.5,
    "703": 3.2,
    "Marathon": 0, // pas applicable
    "Semi": 0,
  };
  
  const threshold = thresholds[signals.objectif] ?? 3.0;
  
  if (threshold === 0) return null; // CAP
  
  if (signals.ftpKg < threshold) {
    return {
      id: generateId(),
      type: "OPTIMIZATION",
      severity: 1,
      scope: "PLAN",
      title: "FTP/kg à améliorer pour l'objectif",
      message: `FTP/kg actuel (${signals.ftpKg.toFixed(2)}) en dessous du seuil recommandé pour ${signals.objectif}.`,
      why: `FTP/kg=${signals.ftpKg.toFixed(2)} < cible ~${threshold} W/kg pour ${signals.objectif}.`,
      suggestedChange: "Prioriser séances seuil/tempo vélo + travail force. Surveiller poids si pertinent.",
      confidence: 0.7,
    };
  }
  
  return null;
}

// ============================================
// FONCTION PRINCIPALE
// ============================================

/**
 * Génère les annotations pour un plan donné basées sur les signaux athlète.
 * @param signals Données effectives de l'athlète (VLamax, TTE, etc.)
 * @param plan Liste des séances du template
 * @param staffMode Active le mode staff (toutes les annotations)
 * @returns Liste d'annotations triées par sévérité décroissante
 */
export function generatePlanAnnotations(
  signals: AthleteSignals,
  plan: PlanWorkout[],
  staffMode: boolean = true
): Annotation[] {
  if (!staffMode) {
    // Mode simplifié: seulement les règles critiques
    return [];
  }
  
  const annotations: Annotation[] = [];
  
  // Appliquer toutes les règles
  const rules = [
    ruleCapCoherence,
    ruleVLamaxTooHigh,
    ruleVLamaxTooLow,
    ruleTTETooLow,
    ruleQualityDensity,
    ruleCapInjuryRisk,
    ruleBackToBackKeys,
    ruleFTPKgLow,
  ];
  
  rules.forEach((rule) => {
    const annotation = rule(signals, plan);
    if (annotation) {
      annotations.push(annotation);
    }
  });
  
  // Trier par sévérité décroissante
  annotations.sort((a, b) => b.severity - a.severity);
  
  return annotations;
}

// ============================================
// HELPERS UI
// ============================================

export function getSeverityColor(severity: AnnotationSeverity): string {
  switch (severity) {
    case 3:
      return "text-red-600 dark:text-red-400";
    case 2:
      return "text-orange-600 dark:text-orange-400";
    case 1:
      return "text-yellow-600 dark:text-yellow-400";
    default:
      return "text-muted-foreground";
  }
}

export function getSeverityBgColor(severity: AnnotationSeverity): string {
  switch (severity) {
    case 3:
      return "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700";
    case 2:
      return "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700";
    case 1:
      return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700";
    default:
      return "bg-muted border-border";
  }
}

export function getSeverityLabel(severity: AnnotationSeverity): string {
  switch (severity) {
    case 3:
      return "Critique";
    case 2:
      return "Important";
    case 1:
      return "Optimisation";
    default:
      return "Info";
  }
}

export function getTypeIcon(type: AnnotationType): string {
  switch (type) {
    case "RISK":
      return "⚠️";
    case "COHERENCE":
      return "🎯";
    case "OPTIMIZATION":
      return "💡";
    case "PEDAGOGY":
      return "📚";
    default:
      return "ℹ️";
  }
}

export function getTypeLabel(type: AnnotationType): string {
  switch (type) {
    case "RISK":
      return "Risque";
    case "COHERENCE":
      return "Cohérence";
    case "OPTIMIZATION":
      return "Optimisation";
    case "PEDAGOGY":
      return "Pédagogie";
    default:
      return type;
  }
}
