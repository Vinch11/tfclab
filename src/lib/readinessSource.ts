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

import { computePotentielEffectif } from "./potentielPhysiologiqueEffectif";
import type { VLamaxEffectif } from "./vlamaxEffectif";
import type { TTEEffectif } from "./tteEffectif";

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
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le Readiness unifié à partir du Potentiel Physiologique Effectif.
 * Source : `computePotentielEffectif` (même fonction que Dashboard / Diagnostic).
 *
 * Règle "Données insuffisantes" : si `isInsufficient`, retourne `score: null`
 * et `level: "insufficient"` — le badge "Readiness réduit" n'est pas affiché.
 */
export function computeUnifiedReadiness(input: UnifiedReadinessInput): UnifiedReadiness {
  const { vlamaxEffectif, tteEffectif, objectif, ftp, weightKg, athleteAge, ambition, tss7d } = input;

  // Garde "Données insuffisantes" — Core memory rule
  if (!vlamaxEffectif || !tteEffectif) {
    return {
      score: null,
      level: "insufficient",
      metricLabel: "Potentiel Physiologique",
      status: "warning",
      badge: null,
      badgeColor: "gray",
      isReduced: false,
      confidence: 0,
    };
  }

  const potentiel = computePotentielEffectif({
    objectif,
    vlamaxEffectif: { value: vlamaxEffectif.value ?? 0, confidence: vlamaxEffectif.confidence ?? 0 },
    tteEffectif: { tte_min: tteEffectif.tte_min ?? 0, confidence: tteEffectif.confidence ?? 0 },
    ftp: ftp ?? null,
    poids: weightKg ?? undefined,
    athleteAge: athleteAge ?? null,
    ambition,
    tss7d: tss7d ?? null,
  });

  if (potentiel.isInsufficient) {
    return {
      score: null,
      level: "insufficient",
      metricLabel: "Potentiel Physiologique",
      status: "warning",
      badge: null,
      badgeColor: "gray",
      isReduced: false,
      confidence: potentiel.confidence,
    };
  }

  return interpretReadinessScore(potentiel.score, potentiel.confidence);
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
