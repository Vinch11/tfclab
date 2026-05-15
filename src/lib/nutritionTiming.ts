/**
 * Nutrition Timing Staff-Grade - Vince's Lab
 * Module B: Timing par phases + Plan nutritionnel complet
 * 
 * Sources: VLamax effectif, TTE effectif, Objectif, Sport, Dérive énergétique
 */

import type { EnergyDriftResult, EnergyDriftLevel } from "./energyDrift";
import { computeBaseRateMader } from "./v2/nutritionUnified";

// =============================================
// TYPES
// =============================================

export type DigestiveTolerance = "LOW" | "MEDIUM" | "HIGH";
export type GutTrainingLevel = "untrained" | "developing" | "trained" | "elite";
export type NutritionRiskBadge = "OK" | "WATCH" | "HIGH";

export interface NutritionPhase {
  name: "START" | "MID" | "LATE";
  label: string;
  timeRange: string;
  carbsGh: string;
  frequency: string;
  notes: string[];
}

export interface NutritionTimingResult {
  // Glucides cibles
  carbsTarget: number;
  carbsMin: number;
  carbsMax: number;
  carbsRangeLabel: string;
  
  // Phases timing
  phases: NutritionPhase[];
  
  // Plan staff (bullet points)
  staffPlan: string[];
  
  // Alertes
  alerts: string[];
  
  // Badge risque
  riskBadge: NutritionRiskBadge;
  riskBadgeLabel: string;
  riskBadgeColor: "success" | "warning" | "destructive";
  riskBadgeReason: string;
  
  // Données calculées
  details: {
    sport: "velo" | "cap";
    objectif: string;
    baseCarbs: number;
    vlamaxAdj: number;
    objectifAdj: number;
    toleranceAdj: number;
    digestiveTolerance: DigestiveTolerance;
    energyDriftLevel: EnergyDriftLevel;
  };
  
  // Insuffisance
  isDataInsufficient: boolean;
  missingFields: string[];
}

export interface ComputeNutritionTimingParams {
  vlamax: number | null;
  tteMin: number | null;
  tteTarget: number;
  objectif: string;
  sport: "velo" | "cap";
  digestiveTolerance: DigestiveTolerance;
  energyDrift: EnergyDriftResult;
  /** F1 — Niveau d'entraînement digestif (gut training). Default: "trained" */
  gutTrainingLevel?: GutTrainingLevel;
  /** F27 — Si fournis, baseRate calculé via `nutritionUnified.computeBaseRateMader` (canonique). */
  vo2max?: number | null;
  weightKg?: number | null;
  targetIntensityPct?: number | null;
  targetDurationHours?: number | null;
}

// =============================================
// CONSTANTES STAFF-GRADE
// =============================================

// Durées estimées par objectif (en minutes)
const OBJECTIF_DURATION: Record<string, { velo: number; cap: number }> = {
  IM: { velo: 300, cap: 210 },      // 5h vélo, 3h30 CAP
  Ironman: { velo: 300, cap: 210 },
  "70.3": { velo: 150, cap: 105 },  // 2h30 vélo, 1h45 CAP
  "703": { velo: 150, cap: 105 },
  Half: { velo: 150, cap: 105 },
  Marathon: { velo: 0, cap: 210 },  // 3h30
  Semi: { velo: 0, cap: 100 },      // 1h40
  Trail: { velo: 0, cap: 240 },     // 4h
  TrailLong: { velo: 0, cap: 360 }, // 6h
  Ultra: { velo: 0, cap: 600 },     // 10h
};

// =============================================
// LOGIQUE MÉTIER
// =============================================

function getVLamaxCarbFactor(vlamax: number): number {
  if (vlamax < 0.40) return -10;
  if (vlamax <= 0.55) return 0;
  if (vlamax <= 0.70) return 15;
  return 25;
}

function getObjectifAdjustment(objectif: string, sport: "velo" | "cap"): number {
  const obj = objectif.toUpperCase();
  
  // IM / Ultra
  if (obj.includes("IM") || obj.includes("IRONMAN") || obj.includes("ULTRA")) {
    return sport === "velo" ? 10 : 5;
  }
  
  // 70.3 / Marathon
  if (obj.includes("70.3") || obj.includes("703") || obj.includes("HALF") || obj.includes("MARATHON")) {
    if (obj.includes("SEMI")) return 0; // Semi = court
    return sport === "velo" ? 5 : 0;
  }
  
  // Semi / Court
  return 0;
}

function getToleranceAdjustment(tolerance: DigestiveTolerance): number {
  switch (tolerance) {
    case "LOW": return -15;
    case "MEDIUM": return 0;
    case "HIGH": return 10;
  }
}

// F1 — Plafonds glucides selon gut training (King 2022, Viribay 2020, Costa 2023)
// Vélo : 60 / 90 / 120 / 150 g/h ; CAP -25 % (Pfeiffer 2012)
const GUT_CAP_BIKE: Record<GutTrainingLevel, number> = {
  untrained: 60,
  developing: 90,
  trained: 120,
  elite: 150,
};
function getCarbCap(sport: "velo" | "cap", level: GutTrainingLevel): number {
  const base = GUT_CAP_BIKE[level];
  return sport === "cap" ? Math.round(base * 0.75) : base;
}
function getCarbFloor(sport: "velo" | "cap"): number {
  return sport === "velo" ? 30 : 25;
}

function clampCarbs(carbs: number, sport: "velo" | "cap", gutLevel: GutTrainingLevel): number {
  return Math.max(getCarbFloor(sport), Math.min(getCarbCap(sport, gutLevel), carbs));
}

// F2 — Multiplicateur durée-dépendant sur la cible glucidique
// Basé sur la fraction exogène recommandée (Stellingwerff 2014, Burke 2019)
// La base sport (70 vélo / 55 cap) est calibrée pour ~3h ; on la pondère par durée.
function getDurationMultiplier(durationMin: number): number {
  if (durationMin < 60) return 0.55;   // <1h : sucres optionnels
  if (durationMin < 90) return 0.70;   // 60-90 min : 30-50 g/h
  if (durationMin < 180) return 1.00;  // 90-180 min : cible nominale
  if (durationMin < 360) return 1.20;  // 3-6h : +20 % (glycogen sparing)
  return 1.35;                          // >6h : +35 % (ultra)
}

function getEstimatedDuration(objectif: string, sport: "velo" | "cap"): number {
  const config = OBJECTIF_DURATION[objectif] || OBJECTIF_DURATION["Marathon"];
  return config[sport] || 180; // 3h par défaut
}

// =============================================
// GÉNÉRATION DES PHASES
// =============================================

function generatePhases(params: {
  carbsTarget: number;
  energyDriftLevel: EnergyDriftLevel;
  tteMin: number | null;
  tteTarget: number;
  objectif: string;
  sport: "velo" | "cap";
  digestiveTolerance: DigestiveTolerance;
}): NutritionPhase[] {
  const { carbsTarget, energyDriftLevel, tteMin, tteTarget, objectif, sport, digestiveTolerance } = params;
  
  const duration = getEstimatedDuration(objectif, sport);
  const tteFactor = tteMin !== null ? (tteMin < tteTarget - 5 ? "risk" : tteMin < tteTarget ? "vigilance" : "ok") : "ok";
  
  // Calcul des bornes de phases
  const midStart = 30; // START = 0-30min
  const lateStart = Math.round(duration * 0.7);
  
  // ===== START PHASE =====
  let startCarbs: string;
  let startDelay: string;
  let startNotes: string[] = [];
  
  if (energyDriftLevel === "low") {
    startCarbs = "30–40";
    startDelay = "15–20min";
    startNotes.push("Début progressif recommandé");
  } else if (energyDriftLevel === "moderate") {
    startCarbs = "40–50";
    startDelay = "10–15min";
    startNotes.push("Démarrage anticipé conseillé");
    if (tteFactor === "risk") {
      startNotes.push("TTE faible → start très tôt");
    }
  } else {
    startCarbs = "50–60";
    startDelay = "5–10min";
    startNotes.push("⚠️ Démarrage précoce obligatoire");
    startNotes.push("Nutrition agressive dès le départ");
  }
  
  if (digestiveTolerance === "LOW") {
    startNotes.push("Fractionner en petites prises liquides");
  }
  
  // ===== MID PHASE =====
  let midCarbs = `${carbsTarget - 5}–${carbsTarget + 5}`;
  let midNotes: string[] = [
    "Atteindre la cible pleine",
    "Fractionner toutes les 10–15 min"
  ];
  
  if (sport === "cap") {
    midNotes.push("Privilégier les formes liquides/gels");
  }
  
  if (digestiveTolerance === "LOW") {
    midNotes.push("Prises plus petites et plus fréquentes");
  }
  
  // ===== LATE PHASE =====
  let lateCarbs: string;
  let lateNotes: string[] = [];
  
  if (energyDriftLevel === "low") {
    lateCarbs = `${carbsTarget - 5}–${carbsTarget + 5}`;
    lateNotes.push("Maintenir le rythme établi");
  } else if (energyDriftLevel === "moderate") {
    const boost = 10;
    lateCarbs = `${carbsTarget}–${carbsTarget + boost}`;
    lateNotes.push(`+${boost} g/h possible si besoin`);
    lateNotes.push("+1 prise toutes les 20 min");
  } else {
    const boost = 15;
    lateCarbs = `${carbsTarget + 5}–${carbsTarget + boost}`;
    lateNotes.push(`⚠️ Renforcement obligatoire: +${boost} g/h`);
    lateNotes.push("+1 prise toutes les 15 min");
    lateNotes.push("Rappel sodium/hydratation");
  }
  
  return [
    {
      name: "START",
      label: "Démarrage",
      timeRange: `0 → ${midStart} min`,
      carbsGh: startCarbs,
      frequency: `Dès ${startDelay}`,
      notes: startNotes,
    },
    {
      name: "MID",
      label: "Phase principale",
      timeRange: `${midStart} → ${lateStart} min`,
      carbsGh: midCarbs,
      frequency: "Toutes les 10–15 min",
      notes: midNotes,
    },
    {
      name: "LATE",
      label: "Phase finale",
      timeRange: `${lateStart} min → fin`,
      carbsGh: lateCarbs,
      frequency: energyDriftLevel === "high" ? "Toutes les 15 min" : "Toutes les 15–20 min",
      notes: lateNotes,
    },
  ];
}

// =============================================
// GÉNÉRATION DU PLAN STAFF
// =============================================

function generateStaffPlan(params: {
  carbsTarget: number;
  phases: NutritionPhase[];
  energyDriftLevel: EnergyDriftLevel;
  sport: "velo" | "cap";
  digestiveTolerance: DigestiveTolerance;
  vlamax: number;
}): string[] {
  const { carbsTarget, phases, energyDriftLevel, sport, digestiveTolerance, vlamax } = params;
  
  const plan: string[] = [];
  
  // Cible principale
  plan.push(`🎯 Cible: ${carbsTarget} g/h (${carbsTarget - 10}–${carbsTarget + 10} g/h)`);
  
  // Timing
  plan.push(`⏱️ Start: ${phases[0].frequency} avec ${phases[0].carbsGh} g/h`);
  
  // Adaptation sport
  if (sport === "cap") {
    plan.push("🏃 CAP: privilégier gels/liquides, éviter solides");
  } else {
    plan.push("🚴 Vélo: mix gels + solides possibles");
  }
  
  // Tolérance digestive
  if (digestiveTolerance === "LOW") {
    plan.push("⚠️ Tolérance basse: fractionner ++, éviter fructose pur");
  } else if (digestiveTolerance === "HIGH") {
    plan.push("✅ Tolérance haute: marge pour augmenter si besoin");
  }
  
  // VLamax warning
  if (vlamax > 0.55) {
    plan.push("🔥 VLamax élevé: dépendance glucidique importante");
  }
  
  // Dérive
  if (energyDriftLevel === "high") {
    plan.push("🚨 Risque dérive élevé: pacing conservateur + nutrition agressive");
  } else if (energyDriftLevel === "moderate") {
    plan.push("⚡ Risque dérive modéré: surveiller la régularité des apports");
  }
  
  return plan;
}

// =============================================
// GÉNÉRATION DES ALERTES
// =============================================

function generateAlerts(params: {
  vlamax: number;
  tteMin: number | null;
  tteTarget: number;
  energyDriftLevel: EnergyDriftLevel;
  digestiveTolerance: DigestiveTolerance;
  carbsTarget: number;
  sport: "velo" | "cap";
}): string[] {
  const { vlamax, tteMin, tteTarget, energyDriftLevel, digestiveTolerance, carbsTarget, sport } = params;
  
  const alerts: string[] = [];
  
  // VLamax + TTE combo
  if (vlamax > 0.55 && tteMin !== null && tteMin < tteTarget - 5) {
    alerts.push("⚠️ VLamax haut + TTE insuffisant: risque de défaillance nutritionnelle majeur");
  }
  
  // Dérive élevée
  if (energyDriftLevel === "high") {
    alerts.push("🚨 Risque de dérive énergétique élevé: adapter le pacing");
  }
  
  // Tolérance vs besoins
  if (digestiveTolerance === "LOW" && carbsTarget > 60) {
    alerts.push("⚠️ Besoins élevés avec tolérance basse: tester le protocole à l'entraînement");
  }
  
  // CAP haute intensité
  if (sport === "cap" && carbsTarget > 70) {
    alerts.push("⚠️ CAP: besoins > 70g/h = limite de tolérance digestive");
  }
  
  return alerts;
}

// =============================================
// CALCUL DU BADGE RISQUE
// =============================================

function computeRiskBadge(params: {
  energyDriftLevel: EnergyDriftLevel;
  digestiveTolerance: DigestiveTolerance;
  vlamax: number;
  tteMin: number | null;
  tteTarget: number;
}): { badge: NutritionRiskBadge; label: string; color: "success" | "warning" | "destructive"; reason: string } {
  const { energyDriftLevel, digestiveTolerance, vlamax, tteMin, tteTarget } = params;
  
  // ÉLEVÉ
  if (energyDriftLevel === "high") {
    return {
      badge: "HIGH",
      label: "Élevé",
      color: "destructive",
      reason: "Risque de dérive énergétique élevé",
    };
  }
  
  if (vlamax > 0.65 && tteMin !== null && tteMin < tteTarget - 5) {
    return {
      badge: "HIGH",
      label: "Élevé",
      color: "destructive",
      reason: "VLamax > 0.65 avec TTE insuffisant",
    };
  }
  
  // À SURVEILLER
  if (energyDriftLevel === "moderate" || digestiveTolerance === "LOW") {
    return {
      badge: "WATCH",
      label: "À surveiller",
      color: "warning",
      reason: energyDriftLevel === "moderate" 
        ? "Risque de dérive modéré" 
        : "Tolérance digestive basse",
    };
  }
  
  // OK
  return {
    badge: "OK",
    label: "OK",
    color: "success",
    reason: "Profil métabolique et digestif favorable",
  };
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computeNutritionTiming(params: ComputeNutritionTimingParams): NutritionTimingResult {
  const { vlamax, tteMin, tteTarget, objectif, sport, digestiveTolerance, energyDrift } = params;
  const gutTrainingLevel: GutTrainingLevel = params.gutTrainingLevel ?? "trained";

  // Vérification données insuffisantes
  const missingFields: string[] = [];
  if (vlamax === null) missingFields.push("VLamax");
  if (tteMin === null) missingFields.push("TTE");
  if (!objectif) missingFields.push("Objectif");
  
  if (missingFields.length > 0) {
    return {
      carbsTarget: 0,
      carbsMin: 0,
      carbsMax: 0,
      carbsRangeLabel: "—",
      phases: [],
      staffPlan: [],
      alerts: [],
      riskBadge: "WATCH",
      riskBadgeLabel: "Données insuffisantes",
      riskBadgeColor: "warning",
      riskBadgeReason: `Champs manquants: ${missingFields.join(", ")}`,
      details: {
        sport,
        objectif,
        baseCarbs: 0,
        vlamaxAdj: 0,
        objectifAdj: 0,
        toleranceAdj: 0,
        digestiveTolerance,
        energyDriftLevel: energyDrift.level,
      },
      isDataInsufficient: true,
      missingFields,
    };
  }
  
  // Calcul des glucides cibles
  // Audit 2D F27 — si vo2max + weightKg fournis, on délègue baseRate à la
  // source canonique unique (`nutritionUnified.computeBaseRateMader`).
  // Sinon fallback heuristique legacy (constantes par sport).
  const useCanonical = params.vo2max != null && params.weightKg != null && params.weightKg > 0;
  const baseCarbs = useCanonical
    ? computeBaseRateMader(
        params.weightKg!,
        sport,
        params.vo2max ?? null,
        vlamax,
        params.targetIntensityPct ?? null,
        params.targetDurationHours ?? null,
      ).baseRate
    : (sport === "velo" ? 70 : 55);
  const vlamaxAdj = useCanonical ? 0 : getVLamaxCarbFactor(vlamax!);
  const objectifAdj = useCanonical ? 0 : getObjectifAdjustment(objectif, sport);
  const toleranceAdj = getToleranceAdjustment(digestiveTolerance);

  // F2 — Modulation durée-dépendante (Stellingwerff 2014, Burke 2019)
  // Désactivée si calcul canonique (déjà intégrée dans computeBaseRateMader).
  const durationMin = getEstimatedDuration(objectif, sport);
  const durationMult = useCanonical ? 1 : getDurationMultiplier(durationMin);

  let carbsTarget = (baseCarbs + vlamaxAdj + objectifAdj + toleranceAdj) * durationMult;
  carbsTarget = Math.round(clampCarbs(carbsTarget, sport, gutTrainingLevel));

  // Range (±10 ou ±5 selon tolérance), bornées par les caps gut
  const range = digestiveTolerance === "LOW" ? 5 : 10;
  const carbsMin = Math.max(getCarbFloor(sport), carbsTarget - range);
  const carbsMax = Math.min(getCarbCap(sport, gutTrainingLevel), carbsTarget + range);
  
  // Génération des phases
  const phases = generatePhases({
    carbsTarget,
    energyDriftLevel: energyDrift.level,
    tteMin,
    tteTarget,
    objectif,
    sport,
    digestiveTolerance,
  });
  
  // Génération du plan staff
  const staffPlan = generateStaffPlan({
    carbsTarget,
    phases,
    energyDriftLevel: energyDrift.level,
    sport,
    digestiveTolerance,
    vlamax: vlamax!,
  });
  
  // Génération des alertes
  const alerts = generateAlerts({
    vlamax: vlamax!,
    tteMin,
    tteTarget,
    energyDriftLevel: energyDrift.level,
    digestiveTolerance,
    carbsTarget,
    sport,
  });
  
  // Badge risque
  const riskBadgeResult = computeRiskBadge({
    energyDriftLevel: energyDrift.level,
    digestiveTolerance,
    vlamax: vlamax!,
    tteMin,
    tteTarget,
  });
  
  return {
    carbsTarget,
    carbsMin,
    carbsMax,
    carbsRangeLabel: `${carbsMin}–${carbsMax} g/h (cible ${carbsTarget} g/h)`,
    phases,
    staffPlan,
    alerts,
    riskBadge: riskBadgeResult.badge,
    riskBadgeLabel: riskBadgeResult.label,
    riskBadgeColor: riskBadgeResult.color,
    riskBadgeReason: riskBadgeResult.reason,
    details: {
      sport,
      objectif,
      baseCarbs,
      vlamaxAdj,
      objectifAdj,
      toleranceAdj,
      digestiveTolerance,
      energyDriftLevel: energyDrift.level,
    },
    isDataInsufficient: false,
    missingFields: [],
  };
}

// =============================================
// HELPERS UI
// =============================================

export function getToleranceLabel(tolerance: DigestiveTolerance): string {
  switch (tolerance) {
    case "LOW": return "Basse";
    case "MEDIUM": return "Moyenne";
    case "HIGH": return "Élevée";
  }
}

export function getRiskBadgeIcon(badge: NutritionRiskBadge): string {
  switch (badge) {
    case "OK": return "✅";
    case "WATCH": return "⚠️";
    case "HIGH": return "🚨";
  }
}

// Texte pédagogique "Pourquoi?"
export const NUTRITION_TIMING_EXPLANATION = `Cette recommandation est calculée à partir de votre profil métabolique :
• VLamax (tendance à consommer des glucides)
• TTE (endurance au seuil)
• Objectif de course

Plus le risque de dérive est élevé, plus la nutrition doit démarrer tôt et être régulière.`;

export const NUTRITION_TIMING_DISCLAIMER = "Ce plan ne remplace pas un protocole clinique. Testez à l'entraînement.";
