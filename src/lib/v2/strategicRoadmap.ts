/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STRATEGIC ROADMAP ENGINE — TFCL METHOD™
 * Metabolic-Aware Training Periodization
 * 
 * Generates personalized training phases based on:
 * - Athlete's objective (IM, 703, Marathon, Semi)
 * - Detected limiters from the Unified Limiter Engine
 * - Gap analysis for physiological targets
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  type UnifiedLimiter,
  type UnifiedLever,
  type UnifiedGapAnalysis,
  type UnifiedLimiterResult,
  LIMITER_INFO,
  LEVER_INFO,
} from "./unifiedLimiterDetection";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RoadmapPhase {
  id: number;
  name: string;
  subtitle: string;
  startWeek: number;
  endWeek: number;
  color: string;
  levers: string[];        // Active TFCL levers for this phase
  targets: string[];        // Physiological targets to reach by end of phase
  focus: string;            // One-liner describing the phase focus
}

export interface StrategicRoadmap {
  title: string;
  totalWeeks: number;
  phases: RoadmapPhase[];
  limiterSummary: string;
  personalized: boolean;    // true if adapted to athlete profile
}

export interface RoadmapInput {
  objectif: string | null;
  limiterResult: UnifiedLimiterResult | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BASE PHASES BY OBJECTIVE
// ═══════════════════════════════════════════════════════════════════════════════

interface BasePhaseTemplate {
  name: string;
  subtitle: string;
  baseStartWeek: number;
  baseEndWeek: number;
  color: string;
  baseFocus: string;
  baseLevers: string[];
}

function getBasePhases(goal: string): { templates: BasePhaseTemplate[]; totalWeeks: number; title: string } {
  switch (goal) {
    case "IM":
      return {
        title: "Roadmap Stratégique : 24 Semaines vers l'Ironman",
        totalWeeks: 24,
        templates: [
          { name: "Neuro & Vélocité", subtitle: "Phase 1: Vitesse/VO2Max", baseStartWeek: 1, baseEndWeek: 4, color: "#D9DDF7", baseFocus: "Développer le plafond aérobie et la vélocité neuromusculaire", baseLevers: ["VO2max intervals", "Sprints neuromusculaires"] },
          { name: "Force Endurance K3", subtitle: "Phase 2: Force & Seuil", baseStartWeek: 5, baseEndWeek: 8, color: "#9AA6F0", baseFocus: "Convertir la puissance en endurance de force", baseLevers: ["SFR", "Sweet Spot"] },
          { name: "Spécifique & Big Week", subtitle: "Phase 3: Spécifique", baseStartWeek: 9, baseEndWeek: 18, color: "#5555E0", baseFocus: "Volume d'intensité spécifique race-pace", baseLevers: ["Race Pace", "Briques", "Train Low"] },
          { name: "Fraîcheur & Densité", subtitle: "Phase 4: Affûtage", baseStartWeek: 20, baseEndWeek: 24, color: "#7FD3AE", baseFocus: "Supercompensation et fraîcheur musculaire", baseLevers: ["Taper progressif", "Openers"] },
        ],
      };
    case "703":
      return {
        title: "Roadmap Stratégique : 24 Semaines vers le 70.3",
        totalWeeks: 24,
        templates: [
          { name: "Neuro & Vélocité", subtitle: "Phase 1: Vitesse/VO2Max", baseStartWeek: 1, baseEndWeek: 5, color: "#D9DDF7", baseFocus: "Développer VO2max et rappels de vitesse", baseLevers: ["VO2max intervals", "Sprints"] },
          { name: "Force Endurance", subtitle: "Phase 2: Force & Seuil", baseStartWeek: 6, baseEndWeek: 10, color: "#9AA6F0", baseFocus: "Force spécifique et seuil fonctionnel", baseLevers: ["SFR", "Tempo"] },
          { name: "Spécifique Race Pace", subtitle: "Phase 3: Spécifique", baseStartWeek: 11, baseEndWeek: 19, color: "#5555E0", baseFocus: "Intensité cible 70.3 et briques", baseLevers: ["Race Pace", "Briques"] },
          { name: "Affûtage", subtitle: "Phase 4: Affûtage", baseStartWeek: 21, baseEndWeek: 24, color: "#7FD3AE", baseFocus: "Fraîcheur et activation", baseLevers: ["Taper", "Openers"] },
        ],
      };
    case "Marathon":
      return {
        title: "Roadmap Stratégique : 24 Semaines vers le Marathon",
        totalWeeks: 24,
        templates: [
          { name: "Base Aérobie", subtitle: "Phase 1: Endurance", baseStartWeek: 1, baseEndWeek: 6, color: "#D9DDF7", baseFocus: "Construire le socle aérobie et l'économie de course", baseLevers: ["Volume Z2", "Cadence drills"] },
          { name: "Développement", subtitle: "Phase 2: Seuil & Force", baseStartWeek: 7, baseEndWeek: 12, color: "#9AA6F0", baseFocus: "Seuil lactique et force endurance", baseLevers: ["Tempo runs", "Hill repeats"] },
          { name: "Spécifique Marathon", subtitle: "Phase 3: Allure Cible", baseStartWeek: 13, baseEndWeek: 20, color: "#5555E0", baseFocus: "Allure marathon et sorties longues spécifiques", baseLevers: ["Marathon Pace", "Long runs progressifs"] },
          { name: "Affûtage", subtitle: "Phase 4: Affûtage", baseStartWeek: 21, baseEndWeek: 24, color: "#7FD3AE", baseFocus: "Réduction de volume et fraîcheur", baseLevers: ["Taper", "Strides"] },
        ],
      };
    case "Semi":
      return {
        title: "Roadmap Stratégique : 12 Semaines vers le Semi-Marathon",
        totalWeeks: 12,
        templates: [
          { name: "Base & Vitesse", subtitle: "Phase 1: VO2Max", baseStartWeek: 1, baseEndWeek: 3, color: "#D9DDF7", baseFocus: "VO2max et vitesse de base", baseLevers: ["VO2max intervals", "Fartlek"] },
          { name: "Développement Seuil", subtitle: "Phase 2: Seuil", baseStartWeek: 4, baseEndWeek: 7, color: "#9AA6F0", baseFocus: "Seuil et endurance spécifique", baseLevers: ["Tempo", "Progression runs"] },
          { name: "Spécifique Semi", subtitle: "Phase 3: Allure Cible", baseStartWeek: 8, baseEndWeek: 10, color: "#5555E0", baseFocus: "Allure semi-marathon et confiance", baseLevers: ["Half Marathon Pace", "Dress rehearsal"] },
          { name: "Affûtage", subtitle: "Phase 4: Affûtage", baseStartWeek: 11, baseEndWeek: 12, color: "#7FD3AE", baseFocus: "Mini-taper et activation", baseLevers: ["Taper", "Openers"] },
        ],
      };
    default:
      return {
        title: "Roadmap Stratégique d'Entraînement",
        totalWeeks: 24,
        templates: [
          { name: "Construction", subtitle: "Phase 1: Base", baseStartWeek: 1, baseEndWeek: 6, color: "#D9DDF7", baseFocus: "Fondations aérobies", baseLevers: ["Volume Z2"] },
          { name: "Développement", subtitle: "Phase 2: Build", baseStartWeek: 7, baseEndWeek: 12, color: "#9AA6F0", baseFocus: "Développement des qualités", baseLevers: ["Seuil", "Force"] },
          { name: "Spécifique", subtitle: "Phase 3: Peak", baseStartWeek: 13, baseEndWeek: 20, color: "#5555E0", baseFocus: "Intensité spécifique", baseLevers: ["Race Pace"] },
          { name: "Affûtage", subtitle: "Phase 4: Taper", baseStartWeek: 21, baseEndWeek: 24, color: "#7FD3AE", baseFocus: "Supercompensation", baseLevers: ["Taper"] },
        ],
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITER → PHASE ADAPTATION RULES
// ═══════════════════════════════════════════════════════════════════════════════

function adaptPhasesToLimiter(
  templates: BasePhaseTemplate[],
  totalWeeks: number,
  limiter: UnifiedLimiterResult,
): RoadmapPhase[] {
  const { primaryLimiter, primaryLever, gapAnalysis } = limiter;

  // Find the worst gaps for target generation
  const limitingGaps = gapAnalysis
    .filter(g => g.status === "limiting")
    .sort((a, b) => a.weightedImpact - b.weightedImpact); // most negative first

  // Phase duration adjustments based on primary limiter
  const durationShifts = getDurationShifts(primaryLimiter, totalWeeks);

  return templates.map((tmpl, idx) => {
    const shift = durationShifts[idx] || { startDelta: 0, endDelta: 0 };
    const startWeek = Math.max(1, tmpl.baseStartWeek + shift.startDelta);
    const endWeek = Math.min(totalWeeks, tmpl.baseEndWeek + shift.endDelta);

    // Enrich levers based on limiter
    const enrichedLevers = [...tmpl.baseLevers];
    const targets: string[] = [];
    const nameOverride = getPhaseNameOverride(idx, primaryLimiter, tmpl.name);
    const focusOverride = getPhaseFocusOverride(idx, primaryLimiter, tmpl.baseFocus);

    // Add limiter-specific levers and targets
    if (idx === 0) {
      // Phase 1: address the primary weakness early
      addPhase1Adaptations(primaryLimiter, primaryLever, enrichedLevers, targets, limitingGaps);
    } else if (idx === 1) {
      // Phase 2: conversion and secondary limiters  
      addPhase2Adaptations(primaryLimiter, primaryLever, enrichedLevers, targets, limitingGaps);
    } else if (idx === 2) {
      // Phase 3: specific endurance under race conditions
      addPhase3Adaptations(primaryLimiter, enrichedLevers, targets, limitingGaps);
    } else if (idx === 3) {
      // Phase 4: taper always stays clean
      targets.push("Fraîcheur optimale");
      if (primaryLimiter === "glycolytic") {
        enrichedLevers.push("Sprint Ban maintenu");
      }
    }

    return {
      id: idx + 1,
      name: nameOverride,
      subtitle: tmpl.subtitle,
      startWeek,
      endWeek,
      color: tmpl.color,
      levers: [...new Set(enrichedLevers)],
      targets,
      focus: focusOverride,
    };
  });
}

function getDurationShifts(limiter: UnifiedLimiter, totalWeeks: number): { startDelta: number; endDelta: number }[] {
  // Adjust phase durations based on the primary limiter
  // Positive endDelta = phase gets longer, negative = shorter
  switch (limiter) {
    case "aerobic_engine":
      // Extend Phase 1 (VO2max work) by 2 weeks, compress Phase 3
      return [
        { startDelta: 0, endDelta: 2 },    // Phase 1: +2 weeks
        { startDelta: 2, endDelta: 1 },     // Phase 2: shift right, +1
        { startDelta: 3, endDelta: -1 },    // Phase 3: starts later, -1
        { startDelta: 0, endDelta: 0 },     // Phase 4: unchanged
      ];
    case "glycolytic":
      // Extend Phase 2 (VLamax reduction) and Phase 3 (train low)
      return [
        { startDelta: 0, endDelta: -1 },    // Phase 1: -1 week
        { startDelta: -1, endDelta: 2 },     // Phase 2: starts earlier, +3 weeks total
        { startDelta: 2, endDelta: 0 },      // Phase 3: shift
        { startDelta: 0, endDelta: 0 },      // Phase 4: unchanged
      ];
    case "anaerobic_capacity":
      // Similar to glycolytic but with more Phase 1 sprint/power focus
      return [
        { startDelta: 0, endDelta: 1 },      // Phase 1: +1 (anaerobic development)
        { startDelta: 1, endDelta: 0 },       // Phase 2: shift
        { startDelta: 1, endDelta: 0 },       // Phase 3: shift
        { startDelta: 0, endDelta: 0 },       // Phase 4: unchanged
      ];
    case "specific_endurance":
      // Extend Phase 3 (TTE development)
      return [
        { startDelta: 0, endDelta: 0 },
        { startDelta: 0, endDelta: -1 },     // Phase 2: -1
        { startDelta: -1, endDelta: 2 },     // Phase 3: +3 total
        { startDelta: 2, endDelta: 0 },      // Phase 4: shift
      ];
    case "metabolic_efficiency":
      // More time on fat oxidation in Phase 2-3
      return [
        { startDelta: 0, endDelta: 0 },
        { startDelta: 0, endDelta: 1 },      // Phase 2: +1
        { startDelta: 1, endDelta: 0 },      // Phase 3: shift
        { startDelta: 0, endDelta: 0 },
      ];
    default:
      return [
        { startDelta: 0, endDelta: 0 },
        { startDelta: 0, endDelta: 0 },
        { startDelta: 0, endDelta: 0 },
        { startDelta: 0, endDelta: 0 },
      ];
  }
}

function getPhaseNameOverride(phaseIdx: number, limiter: UnifiedLimiter, baseName: string): string {
  if (phaseIdx === 0) {
    if (limiter === "aerobic_engine") return "Chantier VO2max";
    if (limiter === "neuromuscular") return "Force & Économie";
    if (limiter === "anaerobic_capacity") return "Développement W'";
  }
  if (phaseIdx === 1) {
    if (limiter === "glycolytic") return "Chantier VLamax ↓";
    if (limiter === "metabolic_efficiency") return "Fat Adaptation";
    if (limiter === "specific_endurance") return "TTE Builder";
  }
  if (phaseIdx === 2) {
    if (limiter === "specific_endurance") return "Endurance Spécifique +";
    if (limiter === "glycolytic") return "Train Low & Race Pace";
  }
  return baseName;
}

function getPhaseFocusOverride(phaseIdx: number, limiter: UnifiedLimiter, baseFocus: string): string {
  if (phaseIdx === 0 && limiter === "aerobic_engine") {
    return "Priorité absolue : développer le plafond aérobie (VO2max / FTP)";
  }
  if (phaseIdx === 1 && limiter === "glycolytic") {
    return "Réduire VLamax par le travail en endurance et sweet spot prolongé";
  }
  if (phaseIdx === 1 && limiter === "metabolic_efficiency") {
    return "Développer l'oxydation des graisses par des sorties à jeun et Z2 prolongées";
  }
  if (phaseIdx === 2 && limiter === "specific_endurance") {
    return "Allonger le TTE par des blocs spécifiques de tempo prolongé";
  }
  return baseFocus;
}

function addPhase1Adaptations(
  limiter: UnifiedLimiter,
  lever: UnifiedLever,
  levers: string[],
  targets: string[],
  gaps: UnifiedGapAnalysis[],
) {
  switch (limiter) {
    case "aerobic_engine":
      levers.push("VO2max focus ++", "Intervalles longs");
      const vo2Gap = gaps.find(g => g.metric.includes("VO2") || g.metric.includes("vo2"));
      if (vo2Gap) targets.push(`VO2max → ${vo2Gap.target.toFixed(0)} ml/min/kg`);
      break;
    case "glycolytic":
      levers.push("Sprint Ban ⛔");
      targets.push("Maintenir VLamax stable (pas d'augmentation)");
      break;
    case "neuromuscular":
      levers.push("Force Max", "Plyométrie");
      targets.push("Économie +10%");
      break;
    case "anaerobic_capacity":
      levers.push("Sprints courts", "Développement puissance max");
      const wGap = gaps.find(g => g.metric.includes("W'"));
      if (wGap) targets.push(`W' → ${wGap.target.toFixed(0)} kJ`);
      break;
    default:
      break;
  }
}

function addPhase2Adaptations(
  limiter: UnifiedLimiter,
  lever: UnifiedLever,
  levers: string[],
  targets: string[],
  gaps: UnifiedGapAnalysis[],
) {
  switch (limiter) {
    case "glycolytic":
      levers.push("Sweet Spot prolongé", "Z2 volume ++", "Sprint Ban ⛔");
      const vGap = gaps.find(g => g.metric.includes("VLa") || g.metric.includes("vlamax"));
      if (vGap) targets.push(`VLamax → < ${vGap.target.toFixed(2)} mmol/L/s`);
      break;
    case "specific_endurance":
      levers.push("Tempo prolongé", "Endurance de force");
      const tteGap = gaps.find(g => g.metric.includes("TTE") || g.metric.includes("tte"));
      if (tteGap) targets.push(`TTE → > ${tteGap.target.toFixed(0)} min`);
      break;
    case "metabolic_efficiency":
      levers.push("Train Low", "Sorties à jeun");
      targets.push("FatMax +15% FTP");
      break;
    case "aerobic_engine":
      levers.push("FTP intervals");
      const ftpGap = gaps.find(g => g.metric.includes("FTP") || g.metric.includes("ftp"));
      if (ftpGap) targets.push(`FTP/kg → ${ftpGap.target.toFixed(1)} W/kg`);
      break;
    default:
      break;
  }
}

function addPhase3Adaptations(
  limiter: UnifiedLimiter,
  levers: string[],
  targets: string[],
  gaps: UnifiedGapAnalysis[],
) {
  switch (limiter) {
    case "glycolytic":
      levers.push("Train Low protocols", "Gut Training");
      targets.push("Autonomie glycogène suffisante pour la course");
      break;
    case "specific_endurance":
      levers.push("Tempo long", "Race Simulation prolongée");
      targets.push("TTE validé en conditions de course");
      break;
    case "metabolic_efficiency":
      levers.push("Train Low avancé", "Nutrition périodisée");
      targets.push("FatMax stabilisé aux intensités de course");
      break;
    default:
      targets.push("Potentiel Physiologique > 70%");
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function computeStrategicRoadmap(input: RoadmapInput): StrategicRoadmap {
  const goal = input.objectif || "IM";
  const { templates, totalWeeks, title } = getBasePhases(goal);

  if (!input.limiterResult || input.limiterResult.primaryLimiter === "none") {
    // No limiter detected → use base phases without adaptation
    return {
      title,
      totalWeeks,
      phases: templates.map((t, idx) => ({
        id: idx + 1,
        name: t.name,
        subtitle: t.subtitle,
        startWeek: t.baseStartWeek,
        endWeek: t.baseEndWeek,
        color: t.color,
        levers: t.baseLevers,
        targets: [],
        focus: t.baseFocus,
      })),
      limiterSummary: "Profil équilibré — périodisation standard",
      personalized: false,
    };
  }

  const phases = adaptPhasesToLimiter(templates, totalWeeks, input.limiterResult);
  const limiterInfo = LIMITER_INFO[input.limiterResult.primaryLimiter];

  return {
    title,
    totalWeeks,
    phases,
    limiterSummary: `${limiterInfo.emoji} Limiteur principal : ${limiterInfo.label} — ${input.limiterResult.limiterExplanation}`,
    personalized: true,
  };
}
