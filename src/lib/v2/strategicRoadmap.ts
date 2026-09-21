/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STRATEGIC ROADMAP ENGINE — TFCL METHOD™
 * Metabolic-Aware Training Periodization
 *
 * Generates personalized training phases based on:
 * - Athlete's objective (IM, 703, Marathon, Semi)
 * - Detected limiters from the Unified Limiter Engine
 * - Gap analysis for physiological targets
 *
 * ⚠️ PÉRIMÈTRE (audit "système de périodisation") : ce moteur produit un
 * APERÇU VISUEL par objectif pour les rapports/diagnostic — ce n'est PAS le
 * même moteur que celui qui structure le plan réellement généré (supabase/
 * functions/ai-training-plan/promptHelpers.ts::buildStructuredDiagnosticBlock
 * + systemPrompt.ts). Depuis l'audit "système de périodisation" (suite), il
 * segmente les plans multi-objectifs (`RoadmapInput.raceGoals`) et nomme un
 * "Chantier [Limiteur]" dédié pour le limiteur VLamax/TTE/VO2max — mais deux
 * écarts subsistent, à garder en tête si ce fichier est modifié :
 * 1. Cette segmentation et ce nommage réutilisent une classification/matrice
 *    PORTÉE côté client (`src/lib/plan/multiObjectiveClassification.ts`,
 *    MIROIR du serveur) — toute évolution du serveur (source de vérité pour
 *    la génération réelle) doit être reportée manuellement ici aussi.
 * 2. Les templates IM/703/Semi placent VO2max dès la Phase 1 ("intensité
 *    précoce") quand ce N'EST PAS le limiteur détecté — un principe que
 *    systemPrompt.ts qualifie explicitement d'heuristique interne TFCL SANS
 *    source externe vérifiée (l'attribution antérieure à Dan Lorang a été
 *    retirée faute de source primaire confirmée ; à l'inverse, le template
 *    Marathon démarre par la base aérobie). Le composant `RoadmapStrategique`
 *    porte un tooltip signalant cette incertitude au coach ; ne pas le
 *    supprimer sans re-vérifier ce point.
 * 3. La segmentation multi-objectifs n'est câblée QUE sur l'appel depuis
 *    `RoadmapStrategique.tsx` (Index.tsx — vue diagnostic/dashboard). Les
 *    exports PDF (`ExportTools.tsx`, `athleteProfileReport/mapPayloadToReport.ts`)
 *    appellent `computeStrategicRoadmap` sans `raceGoals`/`planStartDate` —
 *    leur `ExportPayload` ne porte pas ces champs. Un PDF exporté pour un
 *    athlète multi-objectifs affichera donc encore un cycle unique tant que
 *    ce payload n'est pas étendu.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  type UnifiedLimiter,
  type UnifiedLever,
  type UnifiedGapAnalysis,
  type UnifiedLimiterResult,
  type AerobicWeaknessDetail,
  LIMITER_INFO,
  LEVER_INFO,
} from "./unifiedLimiterDetection";
import { classifyMultiObjectiveGoalsClient, type ClassifiableRaceGoal } from "../plan/multiObjectiveClassification";
import { taperWeeksForObjective } from "@/engines/plan/sessionSizingMatrix";

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
  /**
   * Audit "système de périodisation" : quand ≥2 pics de forme complets sont
   * détectés (cf. `classifyMultiObjectiveGoalsClient`), la roadmap segmente
   * en plusieurs cycles au lieu d'un unique cycle vers `objectif` — sinon un
   * plan Marathon+IM affichait une frise vers l'IM seule, sans le Marathon.
   * `planStartDate` est requis pour situer les dates dans le calendrier des
   * semaines (ISO "YYYY-MM-DD").
   */
  raceGoals?: ClassifiableRaceGoal[];
  planStartDate?: string;
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
          // Fix (audit "estimations de temps/stratégies") : Phase 3 se
          // terminait S18 et Phase 4 démarrait S20 — S19 n'appartenait à
          // aucune phase (trou visible dans la frise RoadmapStrategique.tsx).
          { name: "Spécifique & Big Week", subtitle: "Phase 3: Spécifique", baseStartWeek: 9, baseEndWeek: 19, color: "#5555E0", baseFocus: "Volume d'intensité spécifique race-pace", baseLevers: ["Race Pace", "Briques", "Train Low"] },
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
          // Fix (audit "estimations de temps/stratégies") : Phase 3 se
          // terminait S19 et Phase 4 démarrait S21 — S20 n'appartenait à
          // aucune phase (même trou que le template IM ci-dessus).
          { name: "Spécifique Race Pace", subtitle: "Phase 3: Spécifique", baseStartWeek: 11, baseEndWeek: 20, color: "#5555E0", baseFocus: "Intensité cible 70.3 et briques", baseLevers: ["Race Pace", "Briques"] },
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
  const { primaryLimiter, primaryLever, gapAnalysis, aerobicWeaknessDetail } = limiter;

  // Find the worst gaps for target generation
  const limitingGaps = gapAnalysis
    .filter(g => g.status === "limiting")
    .sort((a, b) => a.weightedImpact - b.weightedImpact); // most negative first

  // Phase duration adjustments based on primary limiter
  const durationShifts = getDurationShifts(primaryLimiter, totalWeeks);

  const phases = templates.map((tmpl, idx) => {
    const shift = durationShifts[idx] || { startDelta: 0, endDelta: 0 };
    const startWeek = Math.max(1, tmpl.baseStartWeek + shift.startDelta);
    // Filet de sécurité : endWeek ne doit jamais être < startWeek (phase de
    // largeur négative) même si un futur delta mal calibré l'y pousserait.
    const endWeek = Math.max(startWeek, Math.min(totalWeeks, tmpl.baseEndWeek + shift.endDelta));

    // Enrich levers based on limiter. Bug réel corrigé (audit "système de
    // périodisation") : les templates IM/703/Semi ont "VO2max intervals"
    // câblé dans les leviers de BASE de leur Phase 1 — un simple ajout de
    // leviers ne suffisait pas à retirer VO2max de la Fondation quand
    // l'exception s'applique (VO2max spécifiquement limitant) ; ce filtre
    // retire toute mention VO2max des leviers hérités du template dans ce cas.
    const stripVo2maxFromPhase1 = idx === 0 && primaryLimiter === "aerobic_engine" && isVo2maxSpecificWeakness(aerobicWeaknessDetail);
    const enrichedLevers = stripVo2maxFromPhase1
      ? tmpl.baseLevers.filter((l) => !/vo2max/i.test(l))
      : [...tmpl.baseLevers];
    const targets: string[] = [];
    const nameOverride = getPhaseNameOverride(idx, primaryLimiter, tmpl.name, aerobicWeaknessDetail);
    const focusOverride = getPhaseFocusOverride(idx, primaryLimiter, tmpl.baseFocus, aerobicWeaknessDetail);

    // Add limiter-specific levers and targets
    if (idx === 0) {
      // Phase 1: address the primary weakness early
      addPhase1Adaptations(primaryLimiter, primaryLever, enrichedLevers, targets, limitingGaps, aerobicWeaknessDetail);
    } else if (idx === 1) {
      // Phase 2: conversion and secondary limiters
      addPhase2Adaptations(primaryLimiter, primaryLever, enrichedLevers, targets, limitingGaps, aerobicWeaknessDetail);
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

  // Fix (audit "estimations de temps/stratégies") : startWeek/endWeek
  // ci-dessus sont recalculés INDÉPENDAMMENT pour chaque phase depuis les
  // bornes du template de base + son propre delta — rien ne garantit que la
  // phase N+1 démarre juste après la fin de la phase N. Constaté concrètement
  // sur le template Marathon (pourtant contigu à la base) avec le shift
  // "aerobic_engine" : Phase 2 finissait S13, Phase 3 recalculée démarrait
  // S16 → 2 semaines (S14-S15) n'appartenaient plus à aucune phase, alors
  // qu'aucun trou n'existait avant décalage. RoadmapStrategique.tsx affiche
  // ces bornes comme une frise de Gantt (largeur = endWeek-startWeek+1) : un
  // tel trou est un blanc visible et non expliqué pour le coach. On rechaîne
  // donc chaque phase sur la fin réelle de la précédente plutôt que de
  // recalculer un point de départ indépendant — la position du DÉBUT de la
  // phase N+1 reste pilotée par son propre delta (le rationnel du limiteur
  // pour QUAND cette phase démarre est préservé), c'est la phase N qui
  // s'étire pour combler l'écart, jamais l'inverse (on ne fait pas démarrer
  // une phase plus tôt que ce que son delta prévoit).
  enforceContiguousPhases(phases, totalWeeks);

  return phases;
}

/**
 * Extrait de l'ancien corps de `adaptPhasesToLimiter` (audit "système de
 * périodisation") pour être appliqué aussi au chemin SANS limiteur — le
 * rescale proportionnel d'un template (`rescaleTemplates`, pour un cycle
 * multi-objectifs) arrondit chaque borne indépendamment et peut donc, lui
 * aussi, introduire un trou ou un chevauchement, exactement comme un shift
 * de limiteur pouvait déjà le faire (cf. commentaire historique ci-dessus).
 */
function enforceContiguousPhases(phases: { startWeek: number; endWeek: number }[], totalWeeks: number): void {
  for (let i = 1; i < phases.length; i++) {
    const prev = phases[i - 1];
    const curr = phases[i];
    if (curr.startWeek > prev.endWeek + 1) {
      prev.endWeek = curr.startWeek - 1;
    } else if (curr.startWeek <= prev.endWeek) {
      curr.startWeek = prev.endWeek + 1;
      if (curr.startWeek > curr.endWeek) curr.endWeek = curr.startWeek;
    }
  }
  if (phases.length > 0) {
    if (phases[0].startWeek > 1) phases[0].startWeek = 1;
    const last = phases[phases.length - 1];
    if (last.endWeek < totalWeeks) last.endWeek = totalWeeks;
  }
}

// Fix (audit "estimations de temps/stratégies") : les deltas ci-dessous ont
// été calibrés en semaines ABSOLUES pour les templates ~24 semaines (IM,
// 70.3, Marathon, générique) mais étaient appliqués tels quels même sur le
// template Semi (12 semaines, phases 2x plus courtes) — proportionnellement
// deux fois plus agressifs. Constaté concrètement : Semi × "aerobic_engine"
// recalculait Phase 3 avec startWeek=11 > endWeek=9 (phase inversée, largeur
// négative dans la frise RoadmapStrategique.tsx). `getDurationShifts` mis à
// l'échelle du plan réel (référence 24 semaines) au lieu d'appliquer ces
// semaines fixes brutes.
const DURATION_SHIFT_REFERENCE_WEEKS = 24;

function getDurationShifts(limiter: UnifiedLimiter, totalWeeks: number): { startDelta: number; endDelta: number }[] {
  const scale = totalWeeks / DURATION_SHIFT_REFERENCE_WEEKS;
  return getRawDurationShifts(limiter).map(({ startDelta, endDelta }) => ({
    startDelta: Math.round(startDelta * scale),
    endDelta: Math.round(endDelta * scale),
  }));
}

function getRawDurationShifts(limiter: UnifiedLimiter): { startDelta: number; endDelta: number }[] {
  // Deltas calibrés pour un plan de référence à 24 semaines (cf.
  // DURATION_SHIFT_REFERENCE_WEEKS) — mis à l'échelle par getDurationShifts
  // avant application, jamais utilisés bruts.
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

// Audit "système de périodisation" : `systemPrompt.ts` (génération réelle du
// plan) pose une exception explicite — "EXCEPTION si Limiteur #1 = VO2max
// bas : NE PAS placer de VO2max en Fondation. Le stimulus VO2max est réservé
// au Bloc Chantier dédié [...] pour concentrer l'effort sur le limiteur au
// lieu de le diluer en priming précoce." Cette frise faisait l'INVERSE :
// elle renommait la PHASE 1 (Fondation) en "Chantier VO2max" et y plaçait le
// travail VO2max, contredisant directement cette règle. `aerobicWeaknessDetail`
// (vo2max_low vs ftp_kg_low, cf. unifiedLimiterDetection.ts) permet de
// distinguer les deux cas que le prompt traite différemment — `aerobic_engine`
// seul est trop grossier (il fusionne les deux limiteurs de la matrice
// "Séquençage par Limiteur Principal", qui ont des placements Fondation
// différents).
function isVo2maxSpecificWeakness(detail: AerobicWeaknessDetail | undefined): boolean {
  return detail === "vo2max_low" || detail === "both_low";
}

function getPhaseNameOverride(phaseIdx: number, limiter: UnifiedLimiter, baseName: string, aerobicDetail?: AerobicWeaknessDetail): string {
  if (phaseIdx === 0) {
    if (limiter === "neuromuscular") return "Force & Économie";
    if (limiter === "anaerobic_capacity") return "Développement W'";
    // aerobic_engine + VO2max spécifiquement limitant : PAS de renommage
    // "Chantier VO2max" ici (cf. note ci-dessus) — le nom de base du template
    // ("Force + Z2", selon la matrice) reste approprié.
  }
  if (phaseIdx === 1) {
    if (limiter === "aerobic_engine" && isVo2maxSpecificWeakness(aerobicDetail)) return "Chantier VO2max";
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

function getPhaseFocusOverride(phaseIdx: number, limiter: UnifiedLimiter, baseFocus: string, aerobicDetail?: AerobicWeaknessDetail): string {
  if (phaseIdx === 0 && limiter === "aerobic_engine" && !isVo2maxSpecificWeakness(aerobicDetail)) {
    // FTP/kg bas (pas VO2max) : la Fondation garde le priming aérobie général.
    return "Développer le plafond aérobie général (Force + Z2) avant le travail spécifique FTP en Chantier";
  }
  if (phaseIdx === 1 && limiter === "aerobic_engine" && isVo2maxSpecificWeakness(aerobicDetail)) {
    return "Priorité absolue : développer le plafond aérobie (VO2max) — concentré ici, pas dilué en Fondation";
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
  aerobicDetail?: AerobicWeaknessDetail,
) {
  switch (limiter) {
    case "aerobic_engine":
      // VO2max spécifiquement limitant : réservé au Chantier (Phase 2), cf.
      // note au-dessus de getPhaseNameOverride. FTP/kg bas (pas VO2max) :
      // le priming VO2max général reste légitime en Fondation.
      if (isVo2maxSpecificWeakness(aerobicDetail)) {
        levers.push("Force max", "Z2 croissant");
      } else {
        levers.push("VO2max focus ++", "Intervalles longs");
        const vo2Gap = gaps.find(g => g.metric.includes("VO2") || g.metric.includes("vo2"));
        if (vo2Gap) targets.push(`VO2max → ${vo2Gap.target.toFixed(0)} ml/min/kg`);
      }
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
  aerobicDetail?: AerobicWeaknessDetail,
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
    case "aerobic_engine": {
      // VO2max spécifiquement limitant : le Chantier concentré (Billat
      // 2-3x/sem, matrice "Séquençage par Limiteur Principal" de
      // systemPrompt.ts), pas seulement du FTP générique.
      if (isVo2maxSpecificWeakness(aerobicDetail)) {
        levers.push("VO2max Billat 2-3x/sem", "Intervalles longs");
      } else {
        levers.push("FTP intervals");
      }
      const ftpGap = gaps.find(g => g.metric.includes("FTP") || g.metric.includes("ftp"));
      if (ftpGap) targets.push(`FTP/kg → ${ftpGap.target.toFixed(1)} W/kg`);
      const vo2Gap = gaps.find(g => g.metric.includes("VO2") || g.metric.includes("vo2"));
      if (vo2Gap) targets.push(`VO2max → ${vo2Gap.target.toFixed(0)} ml/min/kg`);
      break;
    }
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

function parseIsoDateUtcClient(iso?: string): number | undefined {
  if (!iso) return undefined;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function computeGoalWeekClient(planStartDate: string | undefined, raceDate: string | undefined): number | undefined {
  const startUtc = parseIsoDateUtcClient(planStartDate);
  const raceUtc = parseIsoDateUtcClient(raceDate);
  if (startUtc === undefined || raceUtc === undefined) return undefined;
  const days = Math.round((raceUtc - startUtc) / (24 * 3600 * 1000));
  return days >= 0 ? Math.floor(days / 7) + 1 : undefined;
}

interface RoadmapCycleSegment { startWeek: number; endWeek: number; objective: string; goalWeek: number }

const ROADMAP_REGEN_WEEKS_BETWEEN_PEAKS = 2; // cohérent avec promptHelpers.ts (MULTI_OBJECTIVE_REGEN_WEEKS_BETWEEN_PEAKS)

/** Mirror (même intention) de `computeMultiObjectiveSegments` (promptHelpers.ts, serveur). */
function computeRoadmapCycleSegments(raceGoals: ClassifiableRaceGoal[], planStartDate: string | undefined): RoadmapCycleSegment[] | null {
  const fullPeaks = classifyMultiObjectiveGoalsClient(raceGoals)
    .filter((c) => c.isFullPeak && c.goal.raceDate)
    .map((c) => ({ ...c, goalWeek: computeGoalWeekClient(planStartDate, c.goal.raceDate) }))
    .filter((c): c is typeof c & { goalWeek: number } => typeof c.goalWeek === "number" && c.goalWeek >= 1)
    .sort((a, b) => a.goalWeek - b.goalWeek);

  if (fullPeaks.length < 2) return null;

  const totalWeeks = fullPeaks[fullPeaks.length - 1].goalWeek;
  const segments: RoadmapCycleSegment[] = [];
  let cursor = 1;
  fullPeaks.forEach((c, i) => {
    const isLastSegment = i === fullPeaks.length - 1;
    const segEnd = isLastSegment ? totalWeeks : c.goalWeek;
    if (segEnd - cursor + 1 >= 2) {
      segments.push({ startWeek: cursor, endWeek: segEnd, objective: String(c.goal.objective || ""), goalWeek: c.goalWeek });
    }
    cursor = segEnd + ROADMAP_REGEN_WEEKS_BETWEEN_PEAKS + 1;
  });
  return segments.length > 0 ? segments : null;
}

/**
 * Reproportionne un template (calibré pour `fromWeeks` semaines, ex. 24 pour
 * IM/703/Marathon, 12 pour Semi) sur une longueur de cycle réelle différente
 * — nécessaire car un cycle post-pic (audit "système de périodisation")
 * n'a aucune raison de faire 24 semaines. `adaptPhasesToLimiter` scale déjà
 * ses DELTAS de limiteur proportionnellement (DURATION_SHIFT_REFERENCE_WEEKS)
 * mais pas les bornes de BASE du template — sans ce rescale, un cycle plus
 * court que `fromWeeks` verrait ses phases de fin dépasser sa propre durée.
 */
function rescaleTemplates(templates: BasePhaseTemplate[], fromWeeks: number, toWeeks: number): BasePhaseTemplate[] {
  if (fromWeeks === toWeeks || fromWeeks <= 0) return templates;
  const scale = toWeeks / fromWeeks;
  return templates.map((t) => ({
    ...t,
    baseStartWeek: Math.max(1, Math.round(t.baseStartWeek * scale)),
    baseEndWeek: Math.max(1, Math.round(t.baseEndWeek * scale)),
  }));
}

function computePhasesForCycle(objective: string, cycleWeeks: number, limiterResult: UnifiedLimiterResult | null): RoadmapPhase[] {
  const { templates: rawTemplates, totalWeeks: nativeWeeks } = getBasePhases(objective);
  const templates = rescaleTemplates(rawTemplates, nativeWeeks, cycleWeeks);
  if (!limiterResult || limiterResult.primaryLimiter === "none") {
    const phases = templates.map((t, idx) => ({
      id: idx + 1,
      name: t.name,
      subtitle: t.subtitle,
      startWeek: t.baseStartWeek,
      endWeek: t.baseEndWeek,
      color: t.color,
      levers: t.baseLevers,
      targets: [],
      focus: t.baseFocus,
    }));
    // Bug réel corrigé (audit "système de périodisation") : `rescaleTemplates`
    // arrondit chaque borne indépendamment — sur un cycle dont la longueur
    // diffère du template natif (24 ou 12 sem), ça peut introduire un trou ou
    // un chevauchement d'1 semaine entre deux phases, même sans limiteur.
    enforceContiguousPhases(phases, cycleWeeks);
    return phases;
  }
  return adaptPhasesToLimiter(templates, cycleWeeks, limiterResult);
}

export function computeStrategicRoadmap(input: RoadmapInput): StrategicRoadmap {
  // Audit "système de périodisation" : plan multi-objectifs (≥2 pics de
  // forme complets datés) → un cycle de phases PAR pic, pas un unique cycle
  // vers `input.objectif` qui ignorerait les courses intermédiaires (même
  // principe que promptHelpers.ts::buildStructuredDiagnosticBlock, PR #215).
  const cycleSegments = (input.raceGoals && input.raceGoals.length > 1)
    ? computeRoadmapCycleSegments(input.raceGoals, input.planStartDate)
    : null;

  if (cycleSegments) {
    const totalWeeks = cycleSegments[cycleSegments.length - 1].endWeek;
    const phases: RoadmapPhase[] = [];
    let nextId = 1;
    cycleSegments.forEach((seg, i) => {
      // Bug réel corrigé (audit "système de périodisation") : entre deux
      // cycles, l'intervalle de régénération (S`prevEnd+1`-S`seg.startWeek-1`)
      // n'appartenait à AUCUNE phase — un blanc visible et non expliqué dans
      // la frise de Gantt (même principe déjà appliqué ailleurs dans ce
      // fichier : "un tel trou est un blanc visible et non expliqué pour le
      // coach"). Insère une phase "Régénération" explicite plutôt qu'un trou.
      if (i > 0) {
        const prevEnd = cycleSegments[i - 1].endWeek;
        if (seg.startWeek - 1 >= prevEnd + 1) {
          phases.push({
            id: nextId++,
            name: "Régénération post-pic",
            subtitle: "Vraie récupération",
            startWeek: prevEnd + 1,
            endWeek: seg.startWeek - 1,
            color: "#C7CEDB",
            levers: ["Volume -40%", "Pas d'intensité"],
            targets: ["Récupération réelle avant le cycle suivant"],
            focus: `Récupération avant de relancer la montée en charge vers ${seg.objective}`,
          });
        }
      }
      const cycleWeeks = seg.endWeek - seg.startWeek + 1;
      const cyclePhases = computePhasesForCycle(seg.objective, cycleWeeks, input.limiterResult);
      const off = seg.startWeek - 1;
      const cycleLabel = ` (Cycle ${i + 1}/${cycleSegments.length} — ${seg.objective})`;
      cyclePhases.forEach((p) => {
        phases.push({
          ...p,
          id: nextId++,
          name: i === 0 ? p.name : `${p.name}${cycleLabel}`,
          startWeek: p.startWeek + off,
          endWeek: p.endWeek + off,
        });
      });
    });
    const limiterInfo = input.limiterResult && input.limiterResult.primaryLimiter !== "none"
      ? LIMITER_INFO[input.limiterResult.primaryLimiter]
      : null;
    return {
      title: `Roadmap Stratégique multi-objectifs : ${cycleSegments.length} cycles sur ${totalWeeks} semaines`,
      totalWeeks,
      phases,
      limiterSummary: limiterInfo
        ? `${limiterInfo.emoji} Limiteur principal : ${limiterInfo.label} — ${input.limiterResult!.limiterExplanation}`
        : `${cycleSegments.length} pics de forme complets, chacun avec son propre cycle`,
      personalized: !!(input.limiterResult && input.limiterResult.primaryLimiter !== "none"),
    };
  }

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
