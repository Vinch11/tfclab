/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNIFIED READINESS SOURCE — Two For Coaching Lab™
 *
 * Source de vérité unique pour le score "Readiness" / "Potentiel Physiologique"
 * affiché dans :
 *   - RaceSimulationPage (onglet Staff, métrique Potentiel Physiologique)
 *   - staffPacingReport (badge "Readiness réduit", interprétation)
 *   - pacingEnvelopeEngine (readinessAdjustment)
 *   - pacingDisciplineRules (warnings de discipline)
 *
 * Tous les seuils sont centralisés ici pour éviter toute contradiction
 * d'affichage entre la métrique et le badge.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { computeDiagnostic } from "@/engines/diagnostic/computeDiagnostic";
import type { DiagnosticInput } from "@/engines/diagnostic/types";
import type { VLamaxEffectif } from "./vlamaxEffectif";
import type { TTEEffectif } from "./tteEffectif";
import type { AmbitionLevel } from "@/types/ambitionLevel";
import { DEFAULT_AMBITION } from "@/types/ambitionLevel";
import type { PotentielV2Result } from "./v2/potentielTypes";

// ═══════════════════════════════════════════════════════════════════════════════
// SEUILS UNIFIÉS — modifier ICI uniquement
// ═══════════════════════════════════════════════════════════════════════════════

export const READINESS_THRESHOLDS = {
  /** Score < ce seuil ⇒ "Readiness réduit" (badge orange + approche conservatrice) */
  REDUCED: 65,
  /** Score < ce seuil ⇒ état modéré */
  MODERATE: 75,
  /** Score >= ce seuil ⇒ état optimal */
  OPTIMAL: 80,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ReadinessLevel = "insufficient" | "reduced" | "moderate" | "optimal";

export interface UnifiedReadiness {
  /** Score 0-100, ou null si données insuffisantes */
  score: number | null;
  level: ReadinessLevel;
  /** Label court pour métriques (ex. "Potentiel Physiologique") */
  metricLabel: string;
  /** Status pour code couleur (cohérent avec staffPacingReport) */
  status: "good" | "warning" | "critical";
  /** Badge à afficher (ex. "⚠️ Readiness réduit"), ou null */
  badge: string | null;
  /** Couleur du badge */
  badgeColor: "gray" | "orange" | "purple" | "green";
  /** Vrai si le score doit déclencher une approche conservatrice */
  isReduced: boolean;
  /** Confidence 0-1 héritée du Potentiel Physiologique Effectif */
  confidence: number;
}

export interface UnifiedReadinessInput {
  objectif: string;
  vlamaxEffectif: VLamaxEffectif | null;
  tteEffectif: TTEEffectif | null;
  ftp?: number | null;
  weightKg?: number | null;
  athleteAge?: number | null;
  ambition?: string;
  tss7d?: number | null;
  /**
   * Bug réel corrigé (audit "estimations physiologiques", Cluster 2) : ces
   * champs étaient absents et computeUnifiedReadiness retombait sur le
   * stub 2 facteurs (VLamax+TTE) au lieu du moteur riche à 4 piliers
   * (computeDecisionTFCL) déjà utilisé pour le Dashboard/PDF — 21 points
   * d'écart et verdict opposé pour le même athlète selon l'écran. Tous
   * optionnels : absents, le diagnostic tourne quand même (dataIncomplete
   * pénalise juste la confiance), comme pour tout autre appelant de
   * computeDiagnostic.
   */
  vo2max?: number | null;
  pmax5s?: number | null;
  p30sW?: number | null;
  p60sW?: number | null;
  map5minW?: number | null;
  vma?: number | null;
  sportFocus?: "bike" | "run" | "tri";
  sex?: "M" | "F" | null;
  runEconomyScore?: number | null;
  wprimeKj?: number | null;
  fatmax?: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

const INSUFFICIENT_READINESS: UnifiedReadiness = {
  score: null,
  level: "insufficient",
  metricLabel: "Potentiel Physiologique",
  status: "warning",
  badge: null,
  badgeColor: "gray",
  isReduced: false,
  confidence: 0,
};

/**
 * Construit le DiagnosticInput et calcule le résultat brut du moteur riche
 * (computeDiagnostic → computeDecisionTFCL) à partir d'un VLamaxEffectif/
 * TTEEffectif déjà calculés — LA MÊME logique que le Dashboard (Index.tsx)
 * et l'export PDF (ExportTools.tsx). Fonction interne partagée par
 * computeUnifiedReadiness (ci-dessous) et par computePotentielEffectifRich
 * (potentielPhysiologiqueEffectif.ts), pour que tous les écrans consommant
 * le "Potentiel Physiologique" passent par le même calcul, sans dupliquer
 * la construction du DiagnosticInput à chaque appelant.
 *
 * Retourne `null` si vlamaxEffectif ou tteEffectif est absent — Core memory
 * rule "Données insuffisantes" : chaque appelant doit alors afficher un
 * score null / "Données insuffisantes" plutôt qu'un neutre fabriqué.
 */
export function computeRichPotentielV2(input: UnifiedReadinessInput): PotentielV2Result | null {
  const { vlamaxEffectif, tteEffectif, objectif, ftp, weightKg, athleteAge, ambition, tss7d } = input;

  if (!vlamaxEffectif || !tteEffectif) {
    return null;
  }

  const ftpKg = ftp && weightKg && weightKg > 0 ? ftp / weightKg : null;

  const diagnosticInput: DiagnosticInput = {
    athleteId: "readiness-source",
    age: athleteAge ?? null,
    sex: input.sex ?? null,
    weightKg: weightKg ?? null,
    objectif,
    ambition: (ambition as AmbitionLevel) || DEFAULT_AMBITION,
    sportFocus: input.sportFocus ?? "bike",
    vo2max: input.vo2max ?? null,
    ftp: ftp ?? null,
    ftpKg,
    pmax5s: input.pmax5s ?? null,
    p30sW: input.p30sW ?? null,
    p60sW: input.p60sW ?? null,
    map5minW: input.map5minW ?? null,
    vma: input.vma ?? null,
    css: null,
    vlamax: vlamaxEffectif.value ?? null,
    vlamaxRun: null,
    vlamaxSource: null,
    vlamaxProtocol: null,
    vlamaxIsReference: false,
    vlamaxEffectifPrecomputed: vlamaxEffectif,
    tteObservedMin: tteEffectif.tte_min ?? null,
    tteMode: "observed",
    tss7d: tss7d ?? null,
    tteEffectifPrecomputed: tteEffectif,
    fatigueState: null,
    runEconomyScore: input.runEconomyScore ?? null,
    runHrDriftPct: null,
    paceThresholdSecPerKm: null,
    runningPower1s: null,
    runningPower5s: null,
    runningPower30s: null,
    runningPower60s: null,
    runningPower5min: null,
    runningPowerThreshold: null,
    sprint15sDistance: null,
    bikeCadenceRpm: null,
    bikeHrDriftFlag: false,
    protocolQuality: null,
    wprimeKj: input.wprimeKj ?? null,
    cpDataQuality: null,
    fatmax: input.fatmax ?? null,
    forceDevMode: false,
    giIssuesFlag: false,
  };

  return computeDiagnostic(diagnosticInput).readiness;
}

/**
 * Calcule le Readiness unifié à partir du moteur Diagnostic riche à 4 piliers
 * — LA MÊME source que le Dashboard (Index.tsx) et l'export PDF
 * (ExportTools.tsx), garantissant un score identique partout où
 * computeUnifiedReadiness est utilisé (RaceSimulationPage, staffPacingReport,
 * pacingEnvelopeEngine, pacingDisciplineRules).
 *
 * Règle "Données insuffisantes" : si le diagnostic signale des données
 * incomplètes en dessous du seuil, retourne `score: null` et
 * `level: "insufficient"` — le badge "Readiness réduit" n'est pas affiché.
 */
export function computeUnifiedReadiness(input: UnifiedReadinessInput): UnifiedReadiness {
  const v2 = computeRichPotentielV2(input);

  // Garde "Données insuffisantes" — Core memory rule
  if (!v2) {
    return INSUFFICIENT_READINESS;
  }

  // ⚠️ PotentielV2Result imbrique un sous-objet `readiness` (score/category/...)
  // sous le champ `readiness` lui-même — piège de nommage, voir
  // adaptPotentielV2ToLegacyShape qui déstructure de la même façon.
  const { readiness: potentiel, flags } = v2;

  if (flags.dataIncomplete) {
    return { ...INSUFFICIENT_READINESS, confidence: potentiel.confidenceGlobal };
  }

  return interpretReadinessScore(potentiel.score, potentiel.confidenceGlobal);
}

/**
 * Interprète un score PPE déjà calculé selon les seuils unifiés.
 * Utile pour les modules qui reçoivent le score en prop (ex. staffPacingReport).
 */
export function interpretReadinessScore(
  score: number | null,
  confidence: number = 0,
): UnifiedReadiness {
  if (score == null) {
    return {
      score: null,
      level: "insufficient",
      metricLabel: "Potentiel Physiologique",
      status: "warning",
      badge: null,
      badgeColor: "gray",
      isReduced: false,
      confidence,
    };
  }

  if (score < READINESS_THRESHOLDS.REDUCED) {
    return {
      score,
      level: "reduced",
      metricLabel: "Potentiel Physiologique",
      status: "critical",
      badge: "⚠️ Readiness réduit",
      badgeColor: "orange",
      isReduced: true,
      confidence,
    };
  }

  if (score < READINESS_THRESHOLDS.MODERATE) {
    return {
      score,
      level: "moderate",
      metricLabel: "Potentiel Physiologique",
      status: "warning",
      badge: null,
      badgeColor: "gray",
      isReduced: false,
      confidence,
    };
  }

  return {
    score,
    level: "optimal",
    metricLabel: "Potentiel Physiologique",
    status: "good",
    badge: null,
    badgeColor: "green",
    isReduced: false,
    confidence,
  };
}
