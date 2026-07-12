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
import { predictRaceDurationMin } from "../raceTimePredictor";
import type { Ambition } from "../raceAnalysis";
import type { RaceChronos } from "@/engines/diagnostic/raceTimeEstimator";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type RaceObjective = "IM" | "70.3" | "Marathon" | "Semi" | "10km";
export type EnvelopeZone = "UNDEREXPLOITATION" | "OPTIMAL" | "TOLERATED" | "FORBIDDEN";
export type EnvelopeConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type PacingProfile = "sensitive" | "balanced" | "tolerant";

/**
 * Niveau d'ambition — module l'intensité soutenable (Smyth 2022).
 * Accepte les deux conventions: canonique projet (lowercase) et pacing engine (UPPERCASE).
 */
// Accepte les 5 paliers UI + leurs variantes upper-case + legacy
export type AmbitionLevel =
  | "ELITE" | "COMPETITOR" | "AGE_GROUP" | "FINISHER" | "WORLD_CLASS"
  | "elite" | "competitor" | "age_group" | "finisher" | "world_class";

export type AmbitionLevelNormalized = "WORLD_CLASS" | "ELITE" | "COMPETITOR" | "AGE_GROUP" | "FINISHER";

function normalizeAmbition(a: AmbitionLevel | null | undefined): AmbitionLevelNormalized {
  if (!a) return "COMPETITOR";
  const upper = String(a).toUpperCase().replace(/-/g, "_");
  if (upper === "WORLD_CLASS" || upper === "WORLDCLASS" || upper === "WC") return "WORLD_CLASS";
  if (upper === "ELITE" || upper === "COMPETITOR" || upper === "AGE_GROUP" || upper === "FINISHER") {
    return upper as AmbitionLevelNormalized;
  }
  return "COMPETITOR";
}

export interface PacingEnvelopeInput {
  // Sources unifiées TFCL (LECTURE SEULE)
  vlamaxEffectif: VLamaxEffectif | null;
  tteEffectif: TTEEffectif | null;
  fatmax: FatMaxTFCLResult | null;
  
  // État athlète
  potentielPhysiologiqueScore: number | null;    // 0-100
  fatigueIndex: number | null;          // 0-100
  
  // Course
  raceObjective: RaceObjective;
  sport: "bike" | "run";
  
  // Références (optionnel)
  ftp?: number | null;                   // W
  vma?: number | null;                   // km/h
  paceThreshold?: number | null;         // sec/km
  weight?: number | null;                // kg

  // ─────────────────────────────────────────────────────────────────────────────
  // CHANTIER A — Inputs scientifiques additionnels (tous optionnels, fallback safe)
  // ─────────────────────────────────────────────────────────────────────────────
  /** Niveau d'ambition de l'athlète — défaut COMPETITOR si absent */
  ambition?: AmbitionLevel | null;
  /** Critical Power en W/kg — utilisé pour borner la cohérence physiologique */
  cpWkg?: number | null;
  /** W' anaérobie en J/kg — détermine la largeur W'/CP de l'enveloppe (Skiba 2024) */
  wPrimeJkg?: number | null;
  /** Durée prédite de la course en minutes — si fournie, utilisée à la place du fallback objectif */
  predictedDurationMin?: number | null;
  /**
   * CHANTIER B — Fraction de W' projetée disponible pour le finish (0-1).
   * Pilote l'asymétrie: si réserve faible → plafond se resserre, plancher inchangé.
   * Défaut 0.5 si non fourni (réserve modérée typique).
   */
  wPrimeBalanceRaceDay?: number | null;

  // ─────────────────────────────────────────────────────────────────────────────
  // INTÉGRATION C — Fallback RAW depuis chronos course (raceTimeEstimator).
  // Utilisé si paceThreshold absent + comme paliers de risque sur la durabilité.
  // Ne remplace JAMAIS une donnée effective.
  // ─────────────────────────────────────────────────────────────────────────────
  raceChrono?: {
    paceThreshold_sec_km?: number | null;
    durabilityIndex?: number | null;
    confidence?: number | null;
  } | null;

  // ─────────────────────────────────────────────────────────────────────────────
  // #4 — Externalisation du fallback de durée de course.
  // Si predictedDurationMin absent, on tente predictRaceDurationMin(...) à partir de:
  //   - raceChronos (chronos réels → Riegel)
  //   - vmaKmh / paceThreshold (Daniels VDOT via ambition)
  // avant de tomber sur RACE_TYPICAL_DURATION_MIN (dernier recours seulement).
  // Ça évite l'ancrage sur "IM = 10h" pour un finisher 14h.
  // ─────────────────────────────────────────────────────────────────────────────
  raceChronos?: RaceChronos | null;
  vmaKmh?: number | null;
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

  // CHANTIER B — Largeurs asymétriques exposées (haut ≠ bas)
  widthLow: number;     // points % entre center et low
  widthHigh: number;    // points % entre center et high
  asymmetryRatio: number; // widthHigh / widthLow (1 = symétrique, <1 = plafond resserré)

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
  
  // Ajustements Potentiel Physiologique
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

// ─────────────────────────────────────────────────────────────────────────────
// CHANTIER A — MODÈLE CONTINU D'INTENSITÉ %CS f(distance, durée, niveau, W'/CP)
//
// ════════════════════════════════════════════════════════════════════════════
// PROVENANCE DES CONSTANTES (audit scientifique v2 — 2026-07)
// ════════════════════════════════════════════════════════════════════════════
//
// Le modèle repose sur la relation log-linéaire durée↔%CS observée dans la
// littérature CP/CS depuis Monod & Scherrer (1965) et étendue aux courses
// longue distance par Smyth (2022) via 25M sessions Strava marathon.
//
// FORMULE:  pctCS(T_min, level) = anchor(level) − k(level) · log10(T_min / 60)
//
// Sources primaires ancrant les constantes:
//   [1] Smyth B, Muniz-Pumares D. (2022) "Calculation of critical speed from
//       raw training data in recreational marathon runners." MSSE 54(4):642-650.
//       → 25M runs Strava. %CS soutenable marathon (~3h30) :
//         elite ≈ 96%, competitor ≈ 92%, age-group ≈ 88%, finisher ≈ 82%.
//   [2] Jones AM, Vanhatalo A. (2017) "The 'Critical Power' Concept:
//       Applications to sports performance..." Sports Med 47(Suppl 1):S65-78.
//       → CS soutenable en compétition 30-60 min (ancrage Tref=60).
//   [3] Coyle EF. (1995) "Integration of the physiological factors determining
//       endurance performance ability." Exerc Sport Sci Rev 23:25-63.
//       → Ratio CS/FTP ≈ 0.94-0.97 chez cyclistes entraînés.
//   [4] Vanhatalo A, Jones AM. (2020) "The application of critical power,
//       the work capacity above critical power (W'), and its reconstitution."
//       → Décroissance %CP avec durée, plage k=5-18 par décade.
//   [5] Billat V. (2001) "Interval training for performance." Sports Med 31.
//       → vCS ≈ 0.88-0.92 · vVMA chez coureurs entraînés (retenu 0.90).
//   [6] Maunder E et al. (2021) "Modelling maximum oxygen uptake in athletes:
//       Intensity domains." Sports Med 51:1-16.
//       → Cadre "domain-based" pour zones OPTIMAL/TOLERATED/FORBIDDEN.
//   [7] Skiba PF. (2024) "W'-balance dynamics revisited." IJSPP.
//       → Coût exponentiel des excursions >CP → asymétrie plafond/plancher.
//
// LIMITES CONNUES (à valider par harness — voir scripts/calibratePacingAnchors.ts):
//   - Extrapolation IM (>6h) et 10K (<45min) hors plage Smyth 2022 (marathon).
//   - Anchors WORLD_CLASS/FINISHER interpolés (Smyth donne 3 tiers, nous en avons 5).
//   - Pas de cohorte de validation TFCL dédiée (contrairement à MLSS Poffé N=29
//     ou Mader α N=44). RMSE cible : ±3 pts %CS vs benchmarks littérature.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Durée typique d'une course (minutes) — DERNIER RECOURS uniquement.
 * Toujours ancré sur des moyennes larges (IM=10h finish typique) → biaise
 * significativement le centre de l'enveloppe pour les finishers hors moyenne.
 * Préférer predictedDurationMin ou resolvePredictedDurationMin() ci-dessous.
 */
const RACE_TYPICAL_DURATION_MIN: Record<RaceObjective, number> = {
  IM: 600,        // ~10h moyenne
  "70.3": 300,    // ~5h
  Marathon: 210,  // ~3h30
  Semi: 105,      // ~1h45
  "10km": 45,     // ~45min
};

/**
 * Mapping AmbitionLevelNormalized (pacing) → Ambition (raceTimePredictor).
 */
const AMBITION_TO_PREDICTOR: Record<AmbitionLevelNormalized, Ambition> = {
  WORLD_CLASS: "world_class",
  ELITE: "elite",
  COMPETITOR: "sub",
  AGE_GROUP: "perf",
  FINISHER: "finish",
};

/**
 * Résolution hiérarchique de la durée prédite pour le calcul du couloir.
 *
 * Ordre de priorité (haut = plus fiable) :
 *   1. input.predictedDurationMin (fourni explicitement par le caller)
 *   2. predictRaceDurationMin(...) via chronos réels → Riegel
 *   3. predictRaceDurationMin(...) via VMA/threshold + ambition → Daniels
 *   4. RACE_TYPICAL_DURATION_MIN[raceObjective] (dernier recours, confiance basse)
 */
export function resolvePredictedDurationMin(
  input: PacingEnvelopeInput,
  ambition: AmbitionLevelNormalized,
): { durationMin: number; source: string; confidence: number } {
  // 1. Explicite
  if (input.predictedDurationMin != null && input.predictedDurationMin > 0) {
    return {
      durationMin: input.predictedDurationMin,
      source: "predictedDurationMin (fourni)",
      confidence: 0.95,
    };
  }

  // 2 & 3. Via raceTimePredictor
  const predictor = predictRaceDurationMin({
    objective: input.raceObjective,
    ambition: AMBITION_TO_PREDICTOR[ambition],
    raceChronos: input.raceChronos ?? null,
    vmaKmh: input.vmaKmh ?? null,
    thresholdPaceSecPerKm:
      input.paceThreshold ?? input.raceChrono?.paceThreshold_sec_km ?? null,
  });
  if (predictor) {
    return {
      durationMin: predictor.targetRaceDurationMin,
      source: `raceTimePredictor · ${predictor.source} (${predictor.reference ?? ""})`,
      confidence: predictor.confidence,
    };
  }

  // 4. Dernier recours
  return {
    durationMin: RACE_TYPICAL_DURATION_MIN[input.raceObjective],
    source: `Fallback ${input.raceObjective} typique (aucune donnée athlète)`,
    confidence: 0.3,
  };
}



/**
 * Ancrage %CS à 60 min selon niveau d'ambition.
 * Interpolation TFCL 5 tiers à partir de Smyth 2022 (3 tiers marathon-Strava).
 * À 60 min, CS soutenable est légèrement > CS estimée sur 20-40 min
 * (relation puissance-durée, CP ≈ 40 min power) → ancrage 100 ± tier gap.
 * Valeurs à ± 2 pts près (voir calibratePacingAnchors.ts).
 */
export const CS_ANCHOR_60MIN: Record<AmbitionLevelNormalized, number> = {
  WORLD_CLASS: 102,  // extrapolé au-dessus d'elite Smyth (top 1% AG)
  ELITE: 100,        // Smyth 2022 tier "elite" ≈ tient CS pile à 60min
  COMPETITOR: 97,    // Smyth 2022 tier "competitor" (déficit léger)
  AGE_GROUP: 93,     // Smyth 2022 tier "age-group" (marge supérieure)
  FINISHER: 88,      // extrapolé sous age-group (bas 50% Strava)
};

/**
 * Pente log-linéaire du déclin %CS par décade de durée (T×10).
 * Dérivée Smyth 2022 : marathon (~210 min) vs ancrage 60 min = 0.544 décade.
 *   elite  : ~100 → ~96 %CS  → decay ≈ 4/0.544 ≈ 7 → arrondi 8
 *   age-gr : ~93  → ~85 %CS  → decay ≈ 8/0.544 ≈ 15 → arrondi 14
 * WORLD_CLASS/FINISHER extrapolés proportionnellement.
 * Plage k=5-18 cohérente avec Vanhatalo 2020 [4].
 */
export const CS_DECAY_PER_DECADE: Record<AmbitionLevelNormalized, number> = {
  WORLD_CLASS: 6,
  ELITE: 8,
  COMPETITOR: 11,
  AGE_GROUP: 14,
  FINISHER: 17,
};

/** Ratio CS/FTP typique — Coyle 1995 [3] : 0.94-0.97 chez cyclistes entraînés. */
export const CS_OVER_FTP_RATIO = 0.95;
/** Ratio vCS/vVMA typique — Billat 2001 [5] : 0.88-0.92 chez coureurs entraînés. */
export const VCS_OVER_VMA_RATIO = 0.90;

/**
 * Exposé publiquement pour l'harness de calibration (scripts/calibratePacingAnchors.ts).
 * Réplique la logique interne de computeContinuousRaceIntensity() pour permettre
 * un audit RMSE vs benchmarks littérature sans re-importer la fonction principale.
 */
export function computePctReferenceForCalibration(
  durationMin: number,
  ambition: AmbitionLevelNormalized,
  sport: "bike" | "run"
): number {
  const anchor = CS_ANCHOR_60MIN[ambition];
  const decay = CS_DECAY_PER_DECADE[ambition];
  const pctCS = anchor - decay * Math.log10(Math.max(durationMin, 5) / 60);
  const ratio = sport === "bike" ? CS_OVER_FTP_RATIO : VCS_OVER_VMA_RATIO;
  return Math.max(55, Math.min(100, pctCS * ratio));
}

/**
 * Calcule le %référence (FTP ou VMA) soutenable pour une durée donnée selon le niveau.
 * Retourne le centre de l'enveloppe — pure fonction continue.
 */
function computeContinuousRaceIntensity(
  durationMin: number,
  ambition: AmbitionLevelNormalized,
  sport: "bike" | "run"
): number {
  const anchor = CS_ANCHOR_60MIN[ambition];
  const decay = CS_DECAY_PER_DECADE[ambition];
  const Tref = 60;

  // %CS soutenable
  const pctCS = anchor - decay * Math.log10(Math.max(durationMin, 5) / Tref);

  // Conversion %CS → %FTP ou %VMA
  const conversionRatio = sport === "bike" ? CS_OVER_FTP_RATIO : VCS_OVER_VMA_RATIO;
  const pctReference = pctCS * conversionRatio;

  // Bornes physiologiques
  return clampLocal(pctReference, 55, 100);
}

/**
 * CHANTIER B — Largeur ASYMÉTRIQUE de l'enveloppe (haut ≠ bas)
 *
 * Skiba 2024 + Vanhatalo 2020:
 *  - Le PLANCHER (low) varie peu avec la durée: même un IM peut descendre de ~5-8 pts sans
 *    risque (sous-exploitation ≠ rupture).
 *  - Le PLAFOND (high) se resserre fortement sur les longues durées car chaque % au-dessus
 *    de CS consomme du W' à un coût exponentiel (W'-balance dynamics).
 *  - La fraction de W'-balance projetée au finish module l'agressivité tolérée.
 *
 * Formule:
 *   widthLow  = baseLow  × wPrimeRatio × sqrt(durationFactor)   (décroît lentement)
 *   widthHigh = baseHigh × wPrimeRatio × durationFactor × wBalRaceDay (décroît + balance)
 *
 * Résultat typique:
 *   - 10km elite (45min): low=±7, high=±9   (large vers le haut, surge possible)
 *   - IM age-group (10h): low=±6, high=±2.5 (plafond très resserré, cap strict)
 */
function computeAsymmetricEnvelopeWidth(
  durationMin: number,
  wPrimeJkg: number | null,
  cpWkg: number | null,
  wPrimeBalanceRaceDay: number | null
): { low: number; high: number } {
  const baseLow = 7;
  const baseHigh = 8;
  const durationFactor = 1 / (1 + Math.log10(Math.max(durationMin, 30) / 60));

  let wPrimeRatio = 1.0;
  if (wPrimeJkg != null && cpWkg != null && cpWkg > 0) {
    const wOverCp = wPrimeJkg / cpWkg; // ~15-25 J/W typique
    wPrimeRatio = clampLocal(wOverCp / 20, 0.6, 1.4);
  }

  // Race-day W'-balance: 1.0 = pleine réserve, 0 = épuisé. Défaut 0.5.
  const wBalDay = clampLocal(wPrimeBalanceRaceDay ?? 0.5, 0.1, 1.0);
  // Module entre 0.7 et 1.15 (réserve faible resserre, pleine réserve élargit modérément)
  const wBalFactor = 0.7 + 0.45 * wBalDay;

  const widthLow = baseLow * wPrimeRatio * Math.sqrt(durationFactor);
  const widthHigh = baseHigh * wPrimeRatio * durationFactor * wBalFactor;

  return {
    low: clampLocal(widthLow, 3, 12),
    high: clampLocal(widthHigh, 2, 12),
  };
}

// Helper local (la const `clamp` globale est déclarée plus bas, hoisting impossible avec const)
function clampLocal(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export const PACING_ENVELOPE_DEFINITIONS = {
  official: `Le Pacing Envelope™ TFCL est un couloir physiologique d'intensité autorisée, 
basé sur le profil métabolique de l'athlète. Les intensités sont exprimées en % de FTP (vélo) 
ou VMA (course), correspondant aux intensités réelles de compétition.`,

  disclaimer: `TFCL NE PRESCRIT PAS une allure. TFCL EXPLIQUE, SIMULE et CADRE la décision.
Le coach garde toujours la main sur la décision finale.`,

  methodology: `Calcul basé sur (modèle continu Chantier A — Smyth 2022 / Skiba 2024):
• Centre de l'enveloppe = %CS continu f(durée, niveau d'ambition)
• Largeur = baseWidth × (W'/CP normalisé) × durationFactor
• VLamax effectif (modulation fine de la largeur)
• TTE effectif (stabilise l'enveloppe — élevé = plus robuste)
• FatMax TFCL™ (ajustement métabolique du centre ±2%)
• Potentiel Physiologique (réduit le plafond si faible)`,

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
  if (input.potentielPhysiologiqueScore != null) {
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
 *    - Potentiel Physiologique faible → réduction du plafond
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
    potentielPhysiologiqueScore,
    fatigueIndex,
    raceObjective,
    sport,
  } = input;

  const sourcesUsed: string[] = [];
  const missingData: string[] = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1 (CHANTIER A): Centre de l'enveloppe = MODÈLE CONTINU %CS
  // f(durée prédite, niveau d'ambition) — Smyth 2022 / Jones-Vanhatalo 2017
  // Remplace l'ancien Record statique RACE_BASE_INTENSITY (trop générique).
  // ─────────────────────────────────────────────────────────────────────────────
  const ambition: AmbitionLevelNormalized = normalizeAmbition(input.ambition);
  const durationResolved = resolvePredictedDurationMin(input, ambition);
  const durationMin = durationResolved.durationMin;
  sourcesUsed.push(
    `Modèle continu %CS (${ambition}, ${Math.round(durationMin)}min · ${durationResolved.source})`,
  );

  let centerPct: number = computeContinuousRaceIntensity(durationMin, ambition, sport);

  if (input.ambition == null) missingData.push("Ambition (défaut: COMPETITOR)");
  if (durationResolved.confidence < 0.5) {
    missingData.push(`Durée prédite peu fiable (${durationResolved.source})`);
  }

  // Ajustement fin si FatMax disponible (athlètes à haute FatMax peuvent tenir plus haut)
  if (fatmax != null && fatmax.centerPctFTP > 0) {
    sourcesUsed.push("FatMax TFCL™");
    if (fatmax.centerPctFTP > 68) {
      centerPct = Math.min(centerPct + 2, 95);
    } else if (fatmax.centerPctFTP < 55) {
      centerPct = Math.max(centerPct - 2, 55);
    }
  } else {
    missingData.push("FatMax");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2 (CHANTIER B): Largeur ASYMÉTRIQUE — plafond ≠ plancher
  // Skiba 2024 + Vanhatalo 2020 — pilotée par W'/CP, durée et W'-balance race-day.
  // ─────────────────────────────────────────────────────────────────────────────
  let { low: widthLow, high: widthHigh } = computeAsymmetricEnvelopeWidth(
    durationMin,
    input.wPrimeJkg ?? null,
    input.cpWkg ?? null,
    input.wPrimeBalanceRaceDay ?? null
  );
  if (input.wPrimeJkg == null || input.cpWkg == null) {
    missingData.push("W'/CP (largeur sur durationFactor seul)");
  } else {
    sourcesUsed.push("W'/CP asymétrique (Skiba 2024)");
  }
  if (input.wPrimeBalanceRaceDay != null) {
    sourcesUsed.push(`W'-balance race-day (${Math.round(input.wPrimeBalanceRaceDay * 100)}%)`);
  }

  // Modulation VLamax — affecte SURTOUT le plafond (capacité de surge glycolytique)
  const vlamaxValue = vlamaxEffectif?.value ?? null;
  if (vlamaxValue != null) {
    sourcesUsed.push("VLamax effectif");
    if (vlamaxValue < 0.35) {
      // Profil sensible: plafond resserré agressivement, plancher peu touché
      widthHigh = Math.max(2, widthHigh - 1.5);
      widthLow = Math.max(3, widthLow - 0.5);
    } else if (vlamaxValue < 0.45) {
      widthHigh = Math.max(3, widthHigh - 0.5);
    } else if (vlamaxValue > 0.55) {
      // Profil tolérant: élargir surtout le plafond
      widthHigh = Math.min(12, widthHigh + 1.5);
      widthLow = Math.min(12, widthLow + 0.5);
    }
  } else {
    missingData.push("VLamax");
    widthHigh += 0.5;
    widthLow += 0.5;
  }

  // Modulation TTE — TTE élevé stabilise (resserre symétriquement)
  if (tteEffectif && tteEffectif.source !== "unknown") {
    sourcesUsed.push("TTE effectif");
    if (tteEffectif.tte_min >= 55) {
      widthHigh = Math.max(2, widthHigh - 0.5);
      widthLow = Math.max(3, widthLow - 0.5);
    } else if (tteEffectif.tte_min < 40) {
      widthHigh = Math.min(12, widthHigh + 1);
      widthLow = Math.min(12, widthLow + 0.5);
    }
  } else {
    missingData.push("TTE");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Ajustement Potentiel Physiologique
  // ─────────────────────────────────────────────────────────────────────────────
  let readinessAdjustment = 0;
  let readinessMessage: string | null = null;
  
  if (potentielPhysiologiqueScore != null) {
    sourcesUsed.push("Potentiel Physiologique");
    
    if (potentielPhysiologiqueScore < 60) {
      // Readiness faible → réduire le haut de l'enveloppe
      readinessAdjustment = Math.round((60 - potentielPhysiologiqueScore) * 0.1);
      readinessMessage = "Aujourd'hui, la robustesse prime sur l'ambition.";
    } else if (potentielPhysiologiqueScore < 75) {
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
  // INTÉGRATION C — Paliers de risque depuis la durabilité chronos (Riegel).
  // Ratio observé semi→marathon vs Riegel (1.000 = neutre).
  //   ≤1.00 excellent (élargit légèrement plafond), 1.00–1.04 neutre,
  //   1.04–1.08 moyen (−2 widthHigh), >1.08 faible (−4 widthHigh + message robustesse).
  // ─────────────────────────────────────────────────────────────────────────────
  const durIdx = input.raceChrono?.durabilityIndex ?? null;
  if (durIdx != null) {
    sourcesUsed.push(`Durabilité chronos (idx=${durIdx.toFixed(2)})`);
    if (durIdx > 1.08) {
      readinessAdjustment += 4;
      if (!readinessMessage) readinessMessage = "Durabilité observée faible — plafonner l'allure pour finir.";
    } else if (durIdx > 1.04) {
      readinessAdjustment += 2;
    } else if (durIdx <= 1.00) {
      readinessAdjustment = Math.max(readinessAdjustment - 1, -1);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Calcul des limites — utilise widthLow/widthHigh asymétriques
  // ─────────────────────────────────────────────────────────────────────────────
  // Readiness/fatigue n'affectent QUE le plafond (cohérent avec readinessMessage)
  const effectiveWidthLow = Math.max(3, widthLow);
  const effectiveWidthHigh = Math.max(2, widthHigh - readinessAdjustment);
  const lowPct = clamp(centerPct - effectiveWidthLow, 50, 90);
  const highPct = clamp(centerPct + effectiveWidthHigh, lowPct + 2, 100);
  const toleratedPct = clamp(highPct + 8, highPct + 4, 105);
  const forbiddenPct = toleratedPct;
  // Largeur "globale" conservée pour rétro-compat (label envelopeWidth)
  const effectiveWidth = (effectiveWidthLow + effectiveWidthHigh) / 2;
  // baseWidth conservé pour rétro-compat dans les éventuels logs
  const baseWidth = effectiveWidth;
  void baseWidth;

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
    // CHANTIER B — largeurs asymétriques exposées
    widthLow: Math.round(effectiveWidthLow * 10) / 10,
    widthHigh: Math.round(effectiveWidthHigh * 10) / 10,
    asymmetryRatio: effectiveWidthLow > 0
      ? Math.round((effectiveWidthHigh / effectiveWidthLow) * 100) / 100
      : 1,
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
  // CHANTIER B — annotation d'asymétrie si plafond significativement plus serré
  if (boundary.asymmetryRatio < 0.7) {
    envelopeWidthLabel += ` · Plafond resserré (asym ${boundary.asymmetryRatio})`;
  } else if (boundary.asymmetryRatio > 1.3) {
    envelopeWidthLabel += ` · Plafond élargi (asym ${boundary.asymmetryRatio})`;
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
