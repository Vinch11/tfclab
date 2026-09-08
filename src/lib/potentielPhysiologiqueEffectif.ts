/**
 * Potentiel Physiologique Effectif — Legacy stub
 * Module supprimé. Ce fichier fournit des stubs pour la rétrocompatibilité.
 */

import type { PotentielV2Result } from "./v2/potentielTypes";
import { computeRichPotentielV2, type UnifiedReadinessInput } from "./readinessSource";

export interface RunningEconomyData {
  [key: string]: any;
  label: string;
  score: number;
  efficiency: number;
  cadence_ok: boolean;
  hr_drift_ok: boolean;
  pace_efficiency: number;
}

export interface PotentielPhysiologiqueEffectif {
  [key: string]: any;
  score: number;
  rawScore?: number;
  label: string;
  color: string;
  confidence: number;
  isInsufficient: boolean;
  messageStaff?: string;
  wasCappedByNutrition?: boolean;
  nutritionalCapReason?: string;
  wasCappedByEconomy?: boolean;
  economyCapReason?: string;
  reasonsMissing?: string[];
  nutritionalRiskIndex?: number;
  runningEconomy?: RunningEconomyData;
  details?: {
    vlamax: number;
    endurance: number;
    puissance: number;
    fraicheur: number;
  };
}

export interface ComputePotentielPhysiologiqueEffectifParams {
  objectif: string;
  vlamaxEffectif: { value: number; confidence: number };
  tteEffectif: { tte_min: number; confidence: number };
  ftp: number | null;
  poids?: number;
  fatigue_ok?: boolean;
  seance_specifique_validee?: boolean;
  fcMax?: number | null;
  deriveCardiaque?: number | null;
  athleteAge?: number | null;
  ambition?: string;
  tss7d?: number | null;
}

export function computePotentielEffectif(params: ComputePotentielPhysiologiqueEffectifParams): PotentielPhysiologiqueEffectif {
  const { vlamaxEffectif, tteEffectif } = params;

  // Politique projet : "Missing Data → Return 0, display 'Données insuffisantes'".
  // Confiance < 0.3 = pas de donnée exploitable → score 0 (pas de neutre artificiel).
  const TTE_UNKNOWN = !tteEffectif || tteEffectif.confidence < 0.3 || !(tteEffectif.tte_min > 0);
  const VLA_UNKNOWN = !vlamaxEffectif || vlamaxEffectif.confidence < 0.3 || !(vlamaxEffectif.value > 0);

  const vlamaxScore = VLA_UNKNOWN
    ? 0
    : vlamaxEffectif.value <= 0.35 ? 90 : vlamaxEffectif.value <= 0.50 ? 70 : 50;

  const tteScore = TTE_UNKNOWN
    ? 0
    : tteEffectif.tte_min >= 45 ? 90 : tteEffectif.tte_min >= 30 ? 70 : 50;

  // Si l'un des deux scores est manquant, on n'agrège pas une moyenne trompeuse.
  const knownScores = [vlamaxScore, tteScore].filter(s => s > 0);
  const score = knownScores.length === 0
    ? 0
    : Math.round(knownScores.reduce((a, b) => a + b, 0) / knownScores.length);

  const isInsufficient = TTE_UNKNOWN || VLA_UNKNOWN;
  const label = isInsufficient
    ? "Données insuffisantes"
    : score >= 80 ? "Prêt" : score >= 60 ? "En progression" : "À développer";
  const color = isInsufficient
    ? "muted"
    : score >= 80 ? "success" : score >= 60 ? "warning" : "destructive";
  const confidence = Math.min(vlamaxEffectif?.confidence ?? 0, tteEffectif?.confidence ?? 0);

  const reasonsMissing: string[] = [];
  if (TTE_UNKNOWN) reasonsMissing.push("TTE manquant ou confiance < 0.3");
  if (VLA_UNKNOWN) reasonsMissing.push("VLamax manquante ou confiance < 0.3");

  return {
    score, rawScore: score, label, color, confidence,
    isInsufficient,
    messageStaff: isInsufficient
      ? `Score non calculable : ${reasonsMissing.join(" ; ")}`
      : `Score physiologique: ${score}/100 (${label})`,
    wasCappedByNutrition: false, nutritionalCapReason: undefined,
    wasCappedByEconomy: false, economyCapReason: undefined,
    reasonsMissing, nutritionalRiskIndex: 0,
    runningEconomy: undefined,
    details: { vlamax: vlamaxScore, endurance: tteScore, puissance: score, fraicheur: TTE_UNKNOWN && VLA_UNKNOWN ? 0 : 80 },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTATEUR — Moteur riche (PotentielV2Result) → forme legacy PotentielPhysiologiqueEffectif
//
// Bug réel corrigé (audit "estimations physiologiques", Cluster 2) : deux
// moteurs de "Potentiel Physiologique" totalement indépendants coexistaient.
// computePotentielEffectif ci-dessus (2 facteurs, VLamax+TTE en 3 paliers
// chacun) alimentait le Dashboard, RaceSimulationPage, l'assistant IA et les
// recommandations Wahoo — pendant que le moteur riche à 4 piliers
// (computeDecisionTFCL, dérivé du gap-analysis unifié VO2max/FTP-kg/VLamax/
// TTE/Économie/W′, ajusté par âge) n'alimentait QUE l'export PDF. Pour un
// même athlète (VO2max=55, FTP/kg=3.5, VLamax=0.45, TTE=40min, 40 ans,
// IM/age_group) : 70 "En progression" (stub) vs 91 "Prêt" (moteur riche) —
// verdicts opposés selon l'écran.
//
// Cet adaptateur permet aux consommateurs historiques de la forme
// PotentielPhysiologiqueEffectif de recevoir le résultat du moteur riche
// sans réécrire leur code : ils lisent toujours .score/.label/.color/etc.
// ═══════════════════════════════════════════════════════════════════════════════

function colorForCategory(category: PotentielV2Result["readiness"]["category"]): string {
  switch (category) {
    case "ready":
    case "solid":
      return "success";
    case "in_progress":
      return "warning";
    case "preparation_required":
    default:
      return "destructive";
  }
}

export function adaptPotentielV2ToLegacyShape(v2: PotentielV2Result): PotentielPhysiologiqueEffectif {
  const { readiness, potential, availability, flags } = v2;
  const isInsufficient = flags.dataIncomplete;
  const label = isInsufficient ? "Données insuffisantes" : readiness.categoryLabel;
  const color = isInsufficient ? "muted" : colorForCategory(readiness.category);

  return {
    score: readiness.score,
    rawScore: readiness.rawScore,
    label,
    color,
    confidence: readiness.confidenceGlobal,
    isInsufficient,
    messageStaff: isInsufficient
      ? "Score non calculable : données insuffisantes pour le diagnostic complet"
      : `Score physiologique: ${readiness.score}/100 (${readiness.categoryLabel})`,
    wasCappedByNutrition: false,
    wasCappedByEconomy: false,
    reasonsMissing: isInsufficient ? ["Données insuffisantes pour le diagnostic complet"] : [],
    nutritionalRiskIndex: 0,
    runningEconomy: undefined,
    details: {
      vlamax: potential.sources.metabolic.value,
      endurance: potential.sources.tolerance.value,
      puissance: potential.sources.aerobic.value,
      fraicheur: availability.score,
    },
    // Champs consommés via cast `as any` par certains appelants historiques
    // (ex: Index.tsx compassInputMemo) — désormais des valeurs réelles du
    // moteur riche plutôt que des fallbacks silencieux.
    potential: potential.score,
    availability: availability.score,
    governingFactor: "potential",
  };
}

/** Résultat "données insuffisantes" cohérent avec l'adaptateur ci-dessus, pour les cas où le diagnostic complet n'a pas pu être calculé (pas de snapshot, pas d'athlète). */
export function insufficientPotentielResult(): PotentielPhysiologiqueEffectif {
  return {
    score: 0,
    rawScore: 0,
    label: "Données insuffisantes",
    color: "muted",
    confidence: 0,
    isInsufficient: true,
    messageStaff: "Score non calculable : données insuffisantes pour le diagnostic complet",
    wasCappedByNutrition: false,
    wasCappedByEconomy: false,
    reasonsMissing: ["Données insuffisantes pour le diagnostic complet"],
    nutritionalRiskIndex: 0,
    runningEconomy: undefined,
    details: { vlamax: 0, endurance: 0, puissance: 0, fraicheur: 0 },
    potential: 0,
    availability: 0,
    governingFactor: "potential",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REMPLACEMENT RICHE DE computePotentielEffectif (Cluster 2, Phase 3)
//
// Bug réel corrigé (audit "estimations physiologiques", Cluster 2) : outre
// le Dashboard et RaceSimulationPage (PR #153/#154), 7 autres appelants du
// stub 2 facteurs computePotentielEffectif ci-dessus subsistaient
// (WeekSelectorTFCL, WahooPersonalizedRecommendations, ExportTools second
// usage, FatigueComparisonChart, DashboardRecommendationsCard,
// getAssistantContext, TemplatesPage) — chacun pouvait afficher/utiliser un
// score "Potentiel Physiologique" différent de celui du Dashboard pour le
// même athlète.
//
// computePotentielEffectifRich est un remplacement direct (même forme de
// retour PotentielPhysiologiqueEffectif) mais backé par le moteur riche à 4
// piliers via computeRichPotentielV2 (readinessSource.ts) +
// adaptPotentielV2ToLegacyShape ci-dessus, garantissant la même source de
// vérité partout.
// ═══════════════════════════════════════════════════════════════════════════════

export function computePotentielEffectifRich(input: UnifiedReadinessInput): PotentielPhysiologiqueEffectif {
  const v2 = computeRichPotentielV2(input);
  if (!v2) {
    return insufficientPotentielResult();
  }
  return adaptPotentielV2ToLegacyShape(v2);
}

// ═══ Utility stubs ═══
export function getTargets(_objectif: string, ..._args: any[]): any {
  return { vlamax: { min: 0.15, max: 0.50, optimal: 0.30 }, tte: { min: 30, target: 50 }, durabilityMin: 40 };
}

export function getWeightsBySport(_sport: string): any {
  return { vlamax: 0.30, endurance: 0.30, puissance: 0.20, fraicheur: 0.20 };
}

export function getPotentielTargets(_objectif: string, _age?: number | null, _ambition?: string) {
  return { score: 70, vlamax: 0.30, vlamaxIdeal: 0.30, tte: 45, tteTarget: 45, ftpKgTarget: 3.5 };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "hsl(var(--success))";
  if (score >= 60) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

export function generateAthleteReadiness(..._args: unknown[]): any {
  return "Potentiel Physiologique module removed.";
}

export function computePillarCalculations(..._args: unknown[]): any {
  return { pillars: [], totalScore: 0 };
}

// ═══ Potentiel Physiologique Signature ═══
export interface PotentielInput {
  [key: string]: any;
  objectif: string;
  vlamaxValue: number;
  vlamaxConfidence: number;
  tteMin: number;
  tteConfidence: number;
  ftpKg: number | null;
  vo2max: number | null;
  fatmaxPct?: number | null;
  economyScore?: number | null;
  fatigueScore?: number | null;
  ambition?: string;
  physiology?: unknown;
}

export interface PotentielResult {
  [key: string]: any;
  score: number;
  label: string;
  pillars: { name: string; score: number; weight: number }[];
  mainStrength: string | null;
  mainWeakness: string | null;
  confidence: number;
  confidenceLabel?: string;
  confidenceReasons?: string[];
  decisionZone?: string;
  decisionIcon?: string;
  potentialLabel?: string;
  potentialScore?: number;
  potentialReasons?: string[];
  availabilityLabel?: string;
  availabilityScore?: number;
  availabilityReasons?: string[];
  recommendation?: string;
}

export function computePotentielSignature(input: PotentielInput): PotentielResult {
  const vScore = input.vlamaxValue <= 0.35 ? 90 : input.vlamaxValue <= 0.50 ? 70 : 50;
  const tScore = input.tteMin >= 45 ? 90 : input.tteMin >= 30 ? 70 : 50;
  const pScore = input.ftpKg ? (input.ftpKg >= 4.0 ? 90 : input.ftpKg >= 3.0 ? 70 : 50) : 60;
  const score = Math.round(vScore * 0.35 + tScore * 0.35 + pScore * 0.30);
  const label = score >= 80 ? "Prêt" : score >= 60 ? "En progression" : "À développer";
  
  return {
    score, label,
    pillars: [
      { name: "Métabolique", score: vScore, weight: 0.35 },
      { name: "Endurance", score: tScore, weight: 0.35 },
      { name: "Puissance", score: pScore, weight: 0.30 },
    ],
    mainStrength: vScore >= tScore && vScore >= pScore ? "Métabolique" : tScore >= pScore ? "Endurance" : "Puissance",
    mainWeakness: vScore <= tScore && vScore <= pScore ? "Métabolique" : tScore <= pScore ? "Endurance" : "Puissance",
    confidence: Math.min(input.vlamaxConfidence, input.tteConfidence),
    confidenceLabel: "Indicatif",
    confidenceReasons: ["Stub — Potentiel Physiologique module removed"],
    decisionZone: label,
    decisionIcon: score >= 80 ? "🟢" : score >= 60 ? "🟠" : "🔴",
    potentialLabel: label,
    potentialScore: score,
    potentialReasons: [],
    availabilityLabel: "N/A",
    availabilityScore: 0,
    availabilityReasons: ["Module retiré"],
    recommendation: label,
  };
}
