/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL DIAGNOSTIC ENGINE™ — Types
 * Single unified diagnostic output for the entire platform
 * 
 * PRINCIPE : "Voici l'état de l'athlète"
 * Fusionne Compas, Potentiel Physiologique, Ambition, DRE, Effectifs, Risque Blessure
 * 
 * CONSOMMATEURS :
 * - Decision Engine (stratégie, workout advisory, simulation)
 * - Plan Engine (générateur IA, périodisation)
 * - UI (Dashboard, Staff Report, PDF Export)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import type { TTEEffectif } from "@/lib/tteEffectif";
import type { FatigueEffectif } from "@/lib/fatigueEffectif";
import type { UnifiedLimiterResult, UnifiedLimiter, UnifiedLever } from "@/lib/v2/unifiedLimiterDetection";
import type { PotentielV2Result } from "@/lib/v2/potentielTypes";
import type { InjuryRiskEnvelope } from "@/lib/v2/injuryRiskUnified";
import type { RunInjuryRiskEnvelope } from "@/lib/runInjuryRisk";
import type { ObjectiveTargets, VLamaxTargets } from "@/lib/physiologicalTargets";
import type { AmbitionLevel } from "@/types/ambitionLevel";
import type { DecisionReliabilityResult } from "@/lib/v2/decisionReliabilityEngine";
import type { RunMLSSPrediction, RunMLSSCrossValidation } from "@/lib/v2/runMLSSPredictor";

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT — Ce que le Diagnostic Engine reçoit
// ═══════════════════════════════════════════════════════════════════════════════

export interface DiagnosticInput {
  // Identité athlète
  athleteId: string;
  athleteName?: string;
  age: number | null;
  sex: "M" | "F" | null;
  weightKg: number | null;
  
  // Objectif & Ambition
  objectif: string;
  ambition: AmbitionLevel;
  sportFocus: "bike" | "run" | "tri";
  
  // Données physiologiques brutes (snapshot actif)
  vo2max: number | null;
  ftp: number | null;
  ftpKg: number | null;
  pmax5s: number | null;
  p30sW: number | null;
  p60sW: number | null;
  map5minW: number | null;
  vma: number | null;
  css: number | null;
  
  // VLamax
  vlamax: number | null;
  vlamaxRun: number | null;
  vlamaxSource: string | null;
  vlamaxProtocol: string | null;
  vlamaxIsReference: boolean;
  /** Optionnel — VLamax effectif déjà calculé en amont. Si fourni, devient la source unique pour garantir cohérence d'affichage. */
  vlamaxEffectifPrecomputed?: VLamaxEffectif;
  
  // TTE
  tteObservedMin: number | null;
  /** TTE CAP observé (séparé du TTE vélo). Utilisé quand sportFocus === "run". */
  tteObservedMinRun?: number | null;
  tteMode: string | null;
  tss7d: number | null;
  
  // Fatigue / Disponibilité
  fatigueState: string | null;
  
  // Course à pied
  runEconomyScore: number | null;
  runHrDriftPct: number | null;
  paceThresholdSecPerKm: number | null;
  runningPower1s: number | null;
  runningPower5s: number | null;
  runningPower30s: number | null;
  runningPower60s: number | null;
  runningPower5min: number | null;
  runningPowerThreshold: number | null;
  sprint15sDistance: number | null;
  
  // Vélo complémentaire
  bikeCadenceRpm: number | null;
  bikeHrDriftFlag: boolean;
  protocolQuality: number | null;
  
  // W' / CP
  wprimeKj: number | null;
  cpDataQuality: "good" | "suspect" | "implausible" | null;
  
  // FatMax
  fatmax: number | null;
  
  // Flags
  forceDevMode: boolean;
  giIssuesFlag: boolean;
  
  // DRE (optionnel — enrichi si disponible)
  dreInput?: DecisionReliabilityInput;
  
  // Check-in data (optionnel)
  checkinData?: CheckinData;

  // ─── Chronos course (RAW — alimente raceTimeEstimator) ───────────
  raceChronos?: {
    time_5k_sec?: number | null;
    time_10k_sec?: number | null;
    time_20k_sec?: number | null;
    time_half_sec?: number | null;
    time_marathon_sec?: number | null;
    time_5k_date?: string | null;
    time_10k_date?: string | null;
    time_20k_date?: string | null;
    time_half_date?: string | null;
    time_marathon_date?: string | null;
  };

  // F-24 : durée cible de course (min) pour évaluer la Durabilité dans le limiter
  targetRaceDurationMin?: number | null;
}

export interface DecisionReliabilityInput {
  protocolQualityScore: number;
  perceivedFatigue: number;
  sensorsCalibrated: boolean;
  sleepQuality: string;
  nutritionPreTest: string;
  environmentalConditions: string;
  isReferenceWeek: boolean;
}

export interface CheckinData {
  sleep: number | null;
  fatigue: number | null;
  soreness: number | null;
  stress: number | null;
  motivation: number | null;
  painFlag: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT — Le diagnostic unifié
// ═══════════════════════════════════════════════════════════════════════════════

export interface AthleteDiagnostic {
  // ─── Identité ─────────────────────────────────────
  athleteId: string;
  objectif: string;
  ambition: AmbitionLevel;
  sportFocus: "bike" | "run" | "tri";
  
  // ─── 1. Indices Effectifs ─────────────────────────
  effectifs: {
    vlamax: VLamaxEffectif;
    tte: TTEEffectif;
    fatigue: FatigueEffectif;
  };
  
  // ─── 2. Limiteur Unifié (ex-Compas) ───────────────
  limiter: UnifiedLimiterResult;
  
  // ─── 3. Readiness (ex-Potentiel Physiologique) ─────────────
  readiness: PotentielV2Result;
  
  // ─── 4. Cibles Physiologiques ─────────────────────
  targets: {
    current: ObjectiveTargets;
    vlamaxRange: VLamaxTargets;
    adjustedForAge: boolean;
  };
  
  // ─── 5. Risque Blessure ───────────────────────────
  injuryRisk: {
    run: RunInjuryRiskEnvelope | null;
    bike: InjuryRiskEnvelope | null;
  };
  
  // ─── 6. Fiabilité (DRE) ──────────────────────────
  reliability: DecisionReliabilityResult | null;

  // ─── 6bis. Run MLSS (Modèle C — cross-validator + fallback) ───
  // null si sportFocus=bike ou si VLamax run / CE indisponibles
  runMLSS: {
    /** MLSS_pct observé (dérivé de pace_threshold/VMA), null si pace_threshold absent */
    observedPct: number | null;
    /** MLSS_pct prédit par Modèle C depuis VLamax run + CE, null si inputs insuffisants */
    prediction: RunMLSSPrediction | null;
    /** Cross-validation (severity ok/warning/critical), null si observed ou prediction manquant */
    crossValidation: RunMLSSCrossValidation | null;
    /** Source effective utilisée par les consommateurs : "observed" si pace_threshold dispo, sinon "predicted" (fallback) */
    effectivePct: number | null;
    effectiveSource: "observed" | "predicted" | "none";
  } | null;
  
  // ─── 6bis bis. Race Chrono Estimate (RAW — Riegel/VDOT/ACSM) ─────
  // null si aucun chrono saisi. Source: "race_chrono", reliability raw_*.
  // Sert de fallback effectif (paceThreshold, vo2max, CE, durabilité).
  raceChronoEstimate: import("./raceTimeEstimator").RaceTimeEstimate | null;
  
  // ─── 7. Synthèse Décisionnelle ────────────────────
  synthesis: DiagnosticSynthesis;
  
  // ─── Données brutes (pour les bridges Decision Engine) ──
  _rawInput: DiagnosticInput;
  
  // ─── Métadonnées ──────────────────────────────────
  meta: {
    timestamp: string;
    version: string;
    confidenceGlobal: number;  // min de toutes les confiances
    dataCompleteness: number;  // 0-1, ratio données présentes
    disclaimer: string;
  };
}

export interface DiagnosticSynthesis {
  // Résumé en une phrase
  headline: string;
  
  // Priorités (L1/L2) — dérivées du limiteur
  priorities: {
    L1: { limiter: UnifiedLimiter; lever: UnifiedLever; label: string };
    L2: { limiter: UnifiedLimiter; lever: UnifiedLever; label: string } | null;
  };
  
  // Score global simplifié (0-100)
  globalScore: number;
  globalCategory: "critical" | "developing" | "solid" | "ready";
  
  // Alertes prioritaires (max 3)
  alerts: DiagnosticAlert[];
  
  // Points forts identifiés
  strengths: string[];
}

export interface DiagnosticAlert {
  severity: "info" | "warning" | "critical";
  message: string;
  source: string;  // Quel sous-module a généré l'alerte
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const DIAGNOSTIC_ENGINE_VERSION = "1.0.0";
export const DIAGNOSTIC_ENGINE_DISCLAIMER = 
  "Two For Coaching Lab éclaire la décision, il ne remplace pas le coach. " +
  "Ce diagnostic est une aide à la décision, non une prescription.";
