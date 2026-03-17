/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PACING ENVELOPE™ TFCL — Couloir Physiologique de Pacing
 * Two For Coaching Lab Method™
 * 
 * CONCEPT CLÉ (inspiré Dan Lorang):
 * Le pacing n'est PAS un % de FTP ni une allure fixe.
 * Le pacing EST un couloir sécurisé + des zones à risque + des règles comportementales.
 * 
 * DÉFINITION OFFICIELLE:
 * Le Pacing Envelope™ est un intervalle d'intensité physiologiquement autorisé
 * pour une course donnée, basé sur le profil métabolique réel de l'athlète.
 * 
 * PRINCIPE FONDAMENTAL:
 * TFCL NE PRESCRIT PAS une allure. TFCL EXPLIQUE, SIMULE, CADRE.
 * Le coach garde toujours la main.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { VLamaxEffectif } from "../vlamaxEffectif";
import type { TTEEffectif } from "../tteEffectif";
import type { FatMaxTFCLResult } from "./fatmaxTFCL";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type RaceObjective = "IM" | "70.3" | "Marathon" | "Semi" | "10km";
export type EnvelopeZone = "UNDEREXPLOITATION" | "OPTIMAL" | "TOLERATED" | "FORBIDDEN";
export type EnvelopeConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type PacingProfile = "sensitive" | "balanced" | "tolerant";

export interface PacingEnvelopeInput {
  // Sources unifiées TFCL (LECTURE SEULE)
  vlamaxEffectif: VLamaxEffectif | null;
  tteEffectif: TTEEffectif | null;
  fatmax: FatMaxTFCLResult | null;
  
  // État athlète
  raceReadinessScore: number | null;    // 0-100
  fatigueIndex: number | null;          // 0-100
  
  // Course
  raceObjective: RaceObjective;
  sport: "bike" | "run";
  
  // Références (optionnel)
  ftp?: number | null;                   // W
  vma?: number | null;                   // km/h
  paceThreshold?: number | null;         // sec/km
  weight?: number | null;                // kg
}

export type IntensityReferenceBase = 
  | "fatmax"
  | "race_intensity"  
  | "ftp"
  | "vma"
  | "threshold_pace";

export interface EnvelopeBoundary {
  lowPct: number;      // % de la référence - limite basse optimale
  centerPct: number;   // % de la référence - centre de l'enveloppe
  highPct: number;     // % de la référence - limite haute optimale
  toleratedPct: number; // % de la référence - limite zone tolérée
  forbiddenPct: number; // % de la référence - début zone interdite
  
  // TFCL V2: Référence d'intensité explicite
  referenceBase: IntensityReferenceBase;
  referenceLabel: string;
  referenceShortLabel: string;
  isFallbackReference: boolean;
}

export interface EnvelopeZoneDefinition {
  zone: EnvelopeZone;
  label: string;
  description: string;
  rangePct: [number, number]; // [min, max] %
  color: string;
  message: string;
  riskLevel: number; // 0-100
}

export interface PacingProfile_Metadata {
  type: PacingProfile;
  label: string;
  description: string;
  badge?: string;
  warningMessage?: string;
}

export interface PacingEnvelopeResult {
  // Enveloppe calculée
  boundary: EnvelopeBoundary;
  zones: EnvelopeZoneDefinition[];
  
  // Profil de sensibilité
  pacingProfile: PacingProfile_Metadata;
  
  // Largeur de l'enveloppe (clé méthodologique)
  envelopeWidth: number; // en % points
  envelopeWidthLabel: string;
  
  // Confiance
  confidence: number; // 0-1
  confidenceLevel: EnvelopeConfidenceLevel;
  confidenceLabel: string;
  
  // Ajustements Race Readiness
  readinessAdjustment: number; // % points de réduction si faible readiness
  readinessMessage: string | null;
  
  // Métadonnées
  raceObjective: RaceObjective;
  sport: "bike" | "run";
  
  // Sources utilisées (transparence)
  sourcesUsed: string[];
  missingData: string[];
  
  // Textes
  disclaimer: string;
  methodology: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

// Intensités de course validées par données terrain (TrainingPeaks, études scientifiques)
// Sources: Kona power files, études Springer Sport Sciences for Health (2025)
// Ces valeurs représentent les intensités MOYENNES observées sur le circuit
const RACE_BASE_INTENSITY: Record<RaceObjective, number> = {
  IM: 72,       // Age-groupers: 65-75% | Pros: 78-82% → moyenne réaliste
  "70.3": 78,   // Consensus: 75-80% | Pros: 80-85%
  Marathon: 78, // ~78-82% VMA pour un marathon bien exécuté
  Semi: 84,     // ~82-88% VMA pour un semi-marathon
  "10km": 92,   // ~90-95% VMA pour un 10km
};

// Largeur de base par objectif (plus long = plus étroit car moins de marge d'erreur)
const RACE_BASE_WIDTH: Record<RaceObjective, number> = {
  IM: 5,       // ±5% = étroit car durée longue (8-17h)
  "70.3": 6,   // ±6% = modéré
  Marathon: 5, // ±5% = étroit
  Semi: 7,     // ±7% = plus large
  "10km": 10,  // ±10% = large car durée courte
};

export const PACING_ENVELOPE_DEFINITIONS = {
  official: `Le Pacing Envelope™ TFCL est un couloir physiologique d'intensité autorisée, 
basé sur le profil métabolique de l'athlète. Les intensités sont exprimées en % de FTP (vélo) 
ou VMA (course), correspondant aux intensités réelles de compétition.`,

  disclaimer: `TFCL NE PRESCRIT PAS une allure. TFCL EXPLIQUE, SIMULE et CADRE la décision.
Le coach garde toujours la main sur la décision finale.`,

  methodology: `Calcul basé sur:
• Intensité de course selon objectif (centre de l'enveloppe)
• VLamax effectif (détermine la largeur — basse = étroit)
• TTE effectif (stabilise l'enveloppe — élevé = plus robuste)
• FatMax TFCL™ (indicateur métabolique, ajuste les limites)
• Race Readiness (réduit le plafond si faible)`,

  sensitive_profile: `Ce profil métabolique offre un rendement élevé mais une faible tolérance aux erreurs.
La discipline prime sur la puissance instantanée.`,

  lorang_philosophy: `"Les 30 premières minutes sont NON NÉGOCIABLES." — Philosophie Dan Lorang
L'erreur précoce coûte plus qu'elle ne rapporte. Favoriser TOUJOURS les negative splits.`,

  negative_split_strategy: `STRATÉGIE NEGATIVE SPLIT TFCL:
• Phase 1 (0-20%): Départ CONSERVATEUR — bas de l'enveloppe
• Phase 2 (20-70%): Installation PROGRESSIVE vers le centre
• Phase 3 (>70%): Montée CONTRÔLÉE vers le haut si disponibilité
→ L'accumulation de lactate en début de course compromet la performance finale.`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function computeGlobalConfidence(input: PacingEnvelopeInput): number {
  let confidence = 0.5;
  
  if (input.vlamaxEffectif?.value != null) {
    confidence += 0.15 * input.vlamaxEffectif.confidence;
  }
  if (input.tteEffectif && input.tteEffectif.source !== "unknown") {
    confidence += 0.15 * input.tteEffectif.confidence;
  }
  if (input.fatmax != null) {
    confidence += 0.1 * input.fatmax.confidence;
  }
  if (input.raceReadinessScore != null) {
    confidence += 0.1;
  }
  
  return clamp(confidence, 0.3, 0.95);
}

function getConfidenceLevel(confidence: number): EnvelopeConfidenceLevel {
  if (confidence >= 0.8) return "HIGH";
  if (confidence >= 0.6) return "MEDIUM";
  return "LOW";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "Élevée";
  if (confidence >= 0.6) return "Moyenne";
  return "Faible";
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le Pacing Envelope™ TFCL selon la méthodologie Dan Lorang
 * 
 * LOGIQUE CORRIGÉE:
 * 
 * A) Centre de l'enveloppe = INTENSITÉ DE COURSE (pas FatMax!)
 *    - L'intensité de course est TOUJOURS au-dessus de FatMax en compétition
 *    - 70.3: ~76-80% FTP | IM: ~68-72% FTP | Marathon: ~72-75% VMA
 *    - FatMax (~55-65% FTP) sert de PLANCHER, pas de centre
 * 
 * B) Largeur de l'enveloppe:
 *    - VLamax basse → enveloppe étroite (±4-6%) car moins de marge glycolytique
 *    - VLamax élevée → enveloppe plus large (±8-12%)
 *    - TTE élevé → stabilité accrue
 *    - Race Readiness faible → réduction du plafond
 * 
 * C) FatMax sert à:
 *    - Définir le plancher métabolique (en dessous = sous-exploitation)
 *    - Ajuster la limite basse de l'enveloppe
 */
export function computePacingEnvelope(input: PacingEnvelopeInput): PacingEnvelopeResult | null {
  const {
    vlamaxEffectif,
    tteEffectif,
    fatmax,
    raceReadinessScore,
    fatigueIndex,
    raceObjective,
    sport,
  } = input;

  const sourcesUsed: string[] = [];
  const missingData: string[] = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Centre de l'enveloppe = INTENSITÉ DE COURSE (pas FatMax!)
  // L'intensité de course pour un 70.3 est ~76-80% FTP, pas 62% (FatMax)
  // ─────────────────────────────────────────────────────────────────────────────
  let centerPct: number = RACE_BASE_INTENSITY[raceObjective];
  
  // Ajustement fin si FatMax disponible (athlètes à haute FatMax peuvent tenir plus haut)
  if (fatmax != null && fatmax.centerPctFTP > 0) {
    sourcesUsed.push("FatMax TFCL™");
    
    // Si FatMax haute (>68% FTP), l'athlète peut soutenir une intensité légèrement plus élevée
    if (fatmax.centerPctFTP > 68) {
      centerPct = Math.min(centerPct + 2, 88); // Boost max +2%
    }
    // Si FatMax très basse (<55% FTP), l'athlète devra être plus conservateur
    else if (fatmax.centerPctFTP < 55) {
      centerPct = Math.max(centerPct - 2, 65); // Réduction max -2%
    }
  } else {
    missingData.push("FatMax");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Largeur de l'enveloppe (clé méthodologique)
  // ─────────────────────────────────────────────────────────────────────────────
  let baseWidth = RACE_BASE_WIDTH[raceObjective];
  
  // Ajustement VLamax
  const vlamaxValue = vlamaxEffectif?.value ?? null;
  if (vlamaxValue != null) {
    sourcesUsed.push("VLamax effectif");
    
    if (vlamaxValue < 0.35) {
      // VLamax basse → enveloppe TRÈS étroite (profil sensible)
      baseWidth = Math.max(4, baseWidth - 2);
    } else if (vlamaxValue < 0.45) {
      // VLamax modérée-basse → légère réduction
      baseWidth = Math.max(5, baseWidth - 1);
    } else if (vlamaxValue > 0.55) {
      // VLamax élevée → enveloppe plus large (plus de tolérance)
      baseWidth = Math.min(12, baseWidth + 2);
    }
  } else {
    missingData.push("VLamax");
    // Sans VLamax, élargir par prudence
    baseWidth += 2;
  }

  // Ajustement TTE
  if (tteEffectif && tteEffectif.source !== "unknown") {
    sourcesUsed.push("TTE effectif");
    
    if (tteEffectif.tte_min >= 55) {
      // TTE élevé → plus stable, enveloppe légèrement plus étroite
      baseWidth = Math.max(4, baseWidth - 1);
    } else if (tteEffectif.tte_min < 40) {
      // TTE faible → moins robuste, élargir par prudence
      baseWidth = Math.min(12, baseWidth + 1);
    }
  } else {
    missingData.push("TTE");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Ajustement Race Readiness
  // ─────────────────────────────────────────────────────────────────────────────
  let readinessAdjustment = 0;
  let readinessMessage: string | null = null;
  
  if (raceReadinessScore != null) {
    sourcesUsed.push("Potentiel Physiologique");
    
    if (raceReadinessScore < 60) {
      // Readiness faible → réduire le haut de l'enveloppe
      readinessAdjustment = Math.round((60 - raceReadinessScore) * 0.1);
      readinessMessage = "Aujourd'hui, la robustesse prime sur l'ambition.";
    } else if (raceReadinessScore < 75) {
      readinessAdjustment = 1;
      readinessMessage = "État modéré — rester dans la zone optimale.";
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Ajustement Fatigue
  // ─────────────────────────────────────────────────────────────────────────────
  if (fatigueIndex != null && fatigueIndex > 50) {
    sourcesUsed.push("Fatigue quantifiée");
    readinessAdjustment += Math.round((fatigueIndex - 50) * 0.05);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Calcul des limites
  // ─────────────────────────────────────────────────────────────────────────────
  const effectiveWidth = Math.max(3, baseWidth);
  const lowPct = clamp(centerPct - effectiveWidth, 50, 90);
  const highPct = clamp(centerPct + effectiveWidth - readinessAdjustment, lowPct + 2, 95);
  const toleratedPct = clamp(highPct + 10, highPct + 5, 100);
  const forbiddenPct = toleratedPct;

  // TFCL V2: Référence d'intensité explicite
  // Le pacing est TOUJOURS exprimé en % de FTP (vélo) ou VMA (course)
  // FatMax n'est PAS la référence - c'est un indicateur métabolique
  let referenceBase: IntensityReferenceBase;
  let referenceLabel: string;
  let referenceShortLabel: string;
  let isFallbackReference: boolean;

  if (sport === "bike") {
    referenceBase = "ftp";
    referenceLabel = "FTP (Functional Threshold Power)";
    referenceShortLabel = "FTP";
    isFallbackReference = input.ftp == null;
  } else {
    referenceBase = "vma";
    referenceLabel = "VMA (Vitesse Maximale Aérobie)";
    referenceShortLabel = "VMA";
    isFallbackReference = input.vma == null;
  }

  const boundary: EnvelopeBoundary = {
    lowPct: Math.round(lowPct),
    centerPct: Math.round(centerPct),
    highPct: Math.round(highPct),
    toleratedPct: Math.round(toleratedPct),
    forbiddenPct: Math.round(forbiddenPct),
    referenceBase,
    referenceLabel,
    referenceShortLabel,
    isFallbackReference,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6: Définition des zones
  // ─────────────────────────────────────────────────────────────────────────────
  const zones: EnvelopeZoneDefinition[] = [
    {
      zone: "UNDEREXPLOITATION",
      label: "Zone sous-exploitation",
      description: "Sécurité élevée, rendement sous-optimal",
      rangePct: [0, boundary.lowPct - 5],
      color: "blue",
      message: "Intensité trop basse — marge de manœuvre disponible",
      riskLevel: 10,
    },
    {
      zone: "OPTIMAL",
      label: "Zone Optimale TFCL™",
      description: "Oxydation énergétique optimale — zone cible",
      rangePct: [boundary.lowPct, boundary.highPct],
      color: "green",
      message: "Intensité cible — équilibre performance/sécurité",
      riskLevel: 20,
    },
    {
      zone: "TOLERATED",
      label: "Zone tolérée",
      description: "Tolérable ponctuellement — discipline requise",
      rangePct: [boundary.highPct + 1, boundary.toleratedPct],
      color: "orange",
      message: "Écart toléré ponctuel — retour rapide requis",
      riskLevel: 60,
    },
    {
      zone: "FORBIDDEN",
      label: "Zone interdite",
      description: "Activation glycolytique excessive — risque majeur",
      rangePct: [boundary.toleratedPct + 1, 100],
      color: "red",
      message: "INTERDIT — déplétion glycogène et rupture probable",
      riskLevel: 90,
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 7: Profil de sensibilité au pacing
  // ─────────────────────────────────────────────────────────────────────────────
  let pacingProfileType: PacingProfile;
  let pacingProfileLabel: string;
  let pacingProfileDescription: string;
  let pacingBadge: string | undefined;
  let pacingWarning: string | undefined;

  if (vlamaxValue != null && vlamaxValue < 0.35) {
    pacingProfileType = "sensitive";
    pacingProfileLabel = "🟣 Profil sensible au pacing";
    pacingProfileDescription = PACING_ENVELOPE_DEFINITIONS.sensitive_profile;
    pacingBadge = "SENSIBLE";
    pacingWarning = "Ce profil ne tolère pas les pics précoces.";
  } else if (vlamaxValue != null && vlamaxValue > 0.55) {
    pacingProfileType = "tolerant";
    pacingProfileLabel = "Profil tolérant";
    pacingProfileDescription = "Ce profil peut absorber des écarts modérés mais reste soumis aux règles de base.";
  } else {
    pacingProfileType = "balanced";
    pacingProfileLabel = "Profil équilibré";
    pacingProfileDescription = "Profil standard — respect des zones recommandé.";
  }

  const pacingProfile: PacingProfile_Metadata = {
    type: pacingProfileType,
    label: pacingProfileLabel,
    description: pacingProfileDescription,
    badge: pacingBadge,
    warningMessage: pacingWarning,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 8: Confiance et métadonnées
  // ─────────────────────────────────────────────────────────────────────────────
  const confidence = computeGlobalConfidence(input);
  const confidenceLevel = getConfidenceLevel(confidence);
  const confidenceLabel = getConfidenceLabel(confidence);

  let envelopeWidthLabel: string;
  if (effectiveWidth <= 5) {
    envelopeWidthLabel = "Très étroit (discipline maximale)";
  } else if (effectiveWidth <= 7) {
    envelopeWidthLabel = "Étroit (discipline élevée)";
  } else if (effectiveWidth <= 9) {
    envelopeWidthLabel = "Modéré (discipline standard)";
  } else {
    envelopeWidthLabel = "Large (tolérance élevée)";
  }

  return {
    boundary,
    zones,
    pacingProfile,
    envelopeWidth: effectiveWidth,
    envelopeWidthLabel,
    confidence,
    confidenceLevel,
    confidenceLabel,
    readinessAdjustment,
    readinessMessage,
    raceObjective,
    sport,
    sourcesUsed,
    missingData,
    disclaimer: PACING_ENVELOPE_DEFINITIONS.disclaimer,
    methodology: PACING_ENVELOPE_DEFINITIONS.methodology,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS UI
// ═══════════════════════════════════════════════════════════════════════════════

export function getZoneColor(zone: EnvelopeZone): string {
  switch (zone) {
    case "UNDEREXPLOITATION":
      return "text-blue-600 dark:text-blue-400";
    case "OPTIMAL":
      return "text-green-600 dark:text-green-400";
    case "TOLERATED":
      return "text-orange-600 dark:text-orange-400";
    case "FORBIDDEN":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}

export function getZoneBgColor(zone: EnvelopeZone): string {
  switch (zone) {
    case "UNDEREXPLOITATION":
      return "bg-blue-100 dark:bg-blue-900/30";
    case "OPTIMAL":
      return "bg-green-100 dark:bg-green-900/30";
    case "TOLERATED":
      return "bg-orange-100 dark:bg-orange-900/30";
    case "FORBIDDEN":
      return "bg-red-100 dark:bg-red-900/30";
    default:
      return "bg-muted";
  }
}

export function getZoneChartColor(zone: EnvelopeZone): string {
  switch (zone) {
    case "UNDEREXPLOITATION":
      return "#3b82f6"; // blue-500
    case "OPTIMAL":
      return "#22c55e"; // green-500
    case "TOLERATED":
      return "#f97316"; // orange-500
    case "FORBIDDEN":
      return "#ef4444"; // red-500
    default:
      return "#6b7280"; // gray-500
  }
}

/**
 * Détermine dans quelle zone se trouve une intensité donnée
 */
export function getIntensityZone(
  intensityPct: number, 
  envelope: PacingEnvelopeResult
): EnvelopeZoneDefinition | null {
  const { boundary, zones } = envelope;
  
  if (intensityPct < boundary.lowPct - 5) {
    return zones.find(z => z.zone === "UNDEREXPLOITATION") || null;
  }
  if (intensityPct <= boundary.highPct) {
    return zones.find(z => z.zone === "OPTIMAL") || null;
  }
  if (intensityPct <= boundary.toleratedPct) {
    return zones.find(z => z.zone === "TOLERATED") || null;
  }
  return zones.find(z => z.zone === "FORBIDDEN") || null;
}

/**
 * Formate l'enveloppe pour affichage compact
 */
export function formatEnvelopeRange(envelope: PacingEnvelopeResult): string {
  const { boundary } = envelope;
  return `${boundary.lowPct}–${boundary.highPct}%`;
}

/**
 * Formate l'enveloppe avec le centre
 */
export function formatEnvelopeWithCenter(envelope: PacingEnvelopeResult): string {
  const { boundary } = envelope;
  return `${boundary.centerPct}% [${boundary.lowPct}–${boundary.highPct}]`;
}
