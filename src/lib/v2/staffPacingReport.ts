/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STAFF PACING REPORT V2™ — Rapport Coach-Grade
 * Two For Coaching Lab Method™
 * 
 * CONCEPT:
 * Génère un rapport technique complet pour le coach.
 * Sections: Profil de tolérance, Envelope technique, Scénarios d'erreur,
 * Stratégie de communication, Lien simulation.
 * 
 * OBJECTIF:
 * Expliquer AU COACH pourquoi le pacing est critique pour ce profil,
 * où se situe le risque principal, quelles erreurs sont les plus coûteuses,
 * et comment encadrer l'athlète sans le brider.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { PacingEnvelopeResult, RaceObjective } from "./pacingEnvelopeEngine";
import type { DisciplineRulesResult, DisciplineRule } from "./pacingDisciplineRules";
import type { ScenarioSimulationResult, PacingScenario } from "./pacingScenarioSimulator";
import type { VLamaxEffectif } from "../vlamaxEffectif";
import type { TTEEffectif } from "../tteEffectif";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StaffPacingReportInput {
  athleteName: string;
  envelope: PacingEnvelopeResult;
  rules: DisciplineRulesResult;
  scenarios: ScenarioSimulationResult;
  vlamaxEffectif: VLamaxEffectif | null;
  tteEffectif: TTEEffectif | null;
  potentielPhysiologiqueScore: number | null;
  raceObjective: RaceObjective;
}

export interface ToleranceProfile {
  summary: string;
  badge: string | null;
  badgeColor: string;
  metrics: Array<{
    label: string;
    value: string;
    confidence: string;
    status: "good" | "warning" | "critical";
  }>;
  interpretation: string;
}

export interface EnvelopeTechnical {
  boundary: {
    low: number;
    center: number;
    high: number;
    tolerated: number;
  };
  width: number;
  widthLabel: string;
  justification: string;
  sources: string[];
}

export interface ErrorScenario {
  id: string;
  title: string;
  condition: string;
  consequence: string;
  severity: "moderate" | "major" | "critical";
  impact: string;
  coachAction: string;
}

export interface CoachCommunication {
  phrases: string[];
  approach: string;
  warnings: string[];
  encouragements: string[];
}

export interface SimulationLink {
  message: string;
  warning: string;
  recommendation: string;
}

export interface StaffPacingReportResult {
  // Header
  title: string;
  subtitle: string;
  athleteName: string;
  raceObjective: RaceObjective;
  generatedAt: string;
  
  // Sections
  toleranceProfile: ToleranceProfile;
  envelopeTechnical: EnvelopeTechnical;
  errorScenarios: ErrorScenario[];
  coachCommunication: CoachCommunication;
  simulationLink: SimulationLink;
  
  // Métadonnées
  disclaimer: string;
  methodology: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const PROFILE_SUMMARIES = {
  sensitive: `Ce profil présente une excellente efficience métabolique, mais une faible tolérance aux erreurs de pacing précoces. La performance dépend davantage de la discipline que de la capacité maximale.`,
  
  balanced: `Ce profil présente un équilibre métabolique standard. La tolérance aux erreurs est modérée, mais la discipline reste le facteur clé de performance.`,
  
  tolerant: `Ce profil peut absorber des écarts modérés grâce à une capacité glycolytique élevée. Attention cependant : le glycogène reste limité sur longue distance.`,
  
  low_readiness: `L'état de forme actuel réduit la marge de manœuvre. Toute erreur de pacing aura des conséquences amplifiées. Approche conservatrice recommandée.`,
};

const COACH_PHRASE_TEMPLATES = [
  "Aujourd'hui, ton avantage est invisible.",
  "Si tu respectes ça, les autres viendront à toi.",
  "Ce n'est pas une course au début.",
  "La discipline est ta plus grande force.",
  "Les 30 premières minutes conditionnent tout le reste.",
  "Laisser partir les autres est une stratégie gagnante.",
  "Ta course commence quand les autres commencent à souffrir.",
];

const SIMULATION_LINK_CONTENT = {
  message: "La simulation de course est un outil de discipline, pas une prédiction.",
  warning: "L'impact d'une erreur de pacing est toujours supérieur au gain espéré.",
  recommendation: "Utiliser la simulation pour illustrer les conséquences des scénarios d'erreur, pas pour promettre un temps cible.",
};

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère le rapport Staff Pacing V2 complet
 */
export function generateStaffPacingReport(input: StaffPacingReportInput): StaffPacingReportResult {
  const {
    athleteName,
    envelope,
    rules,
    scenarios,
    vlamaxEffectif,
    tteEffectif,
    potentielPhysiologiqueScore,
    raceObjective,
  } = input;

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION A: Profil de tolérance au pacing
  // ─────────────────────────────────────────────────────────────────────────────
  const toleranceProfile = generateToleranceProfile(
    envelope,
    vlamaxEffectif,
    tteEffectif,
    potentielPhysiologiqueScore
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION B: Pacing Envelope technique
  // ─────────────────────────────────────────────────────────────────────────────
  const envelopeTechnical = generateEnvelopeTechnical(envelope);

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION C: Scénarios d'erreur
  // ─────────────────────────────────────────────────────────────────────────────
  const errorScenarios = generateErrorScenarios(scenarios);

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION D: Stratégie de communication coach
  // ─────────────────────────────────────────────────────────────────────────────
  const coachCommunication = generateCoachCommunication(envelope, rules);

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION E: Lien avec simulation
  // ─────────────────────────────────────────────────────────────────────────────
  const simulationLink: SimulationLink = {
    message: SIMULATION_LINK_CONTENT.message,
    warning: SIMULATION_LINK_CONTENT.warning,
    recommendation: SIMULATION_LINK_CONTENT.recommendation,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Résultat final
  // ─────────────────────────────────────────────────────────────────────────────
  return {
    title: "Tactical Pacing & Decision Robustness",
    subtitle: `Rapport Staff — ${athleteName}`,
    athleteName,
    raceObjective,
    generatedAt: new Date().toISOString(),
    toleranceProfile,
    envelopeTechnical,
    errorScenarios,
    coachCommunication,
    simulationLink,
    disclaimer: `Ce rapport ne prescrit aucune allure. Il explique, simule et cadre la décision. Le coach reste décisionnaire final.`,
    methodology: envelope.methodology,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GÉNÉRATEURS DE SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateToleranceProfile(
  envelope: PacingEnvelopeResult,
  vlamaxEffectif: VLamaxEffectif | null,
  tteEffectif: TTEEffectif | null,
  potentielPhysiologiqueScore: number | null
): ToleranceProfile {
  // Utilise la source unifiée — seuils centralisés dans src/lib/readinessSource.ts
  // pour éviter toute contradiction d'affichage entre la métrique et le badge.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { interpretReadinessScore } = require("../readinessSource") as typeof import("../readinessSource");
  const readiness = interpretReadinessScore(potentielPhysiologiqueScore);

  // Déterminer le résumé
  let summary = PROFILE_SUMMARIES.balanced;
  let badge: string | null = readiness.badge;
  let badgeColor: string = readiness.badgeColor;

  if (envelope.pacingProfile.type === "sensitive") {
    summary = PROFILE_SUMMARIES.sensitive;
    badge = "🟣 Profil pacing-sensible";
    badgeColor = "purple";
  } else if (readiness.isReduced) {
    summary = PROFILE_SUMMARIES.low_readiness;
  } else if (envelope.pacingProfile.type === "tolerant") {
    summary = PROFILE_SUMMARIES.tolerant;
  }

  // Métriques
  const metrics = [];
  
  if (vlamaxEffectif?.value != null) {
    const vlamaxStatus = vlamaxEffectif.value < 0.35 ? "critical" 
      : vlamaxEffectif.value < 0.45 ? "warning" : "good";
    metrics.push({
      label: "VLamax effectif",
      value: `${vlamaxEffectif.value.toFixed(2)} mmol/L/s`,
      confidence: `${Math.round(vlamaxEffectif.confidence * 100)}%`,
      status: vlamaxStatus as "good" | "warning" | "critical",
    });
  }
  
  if (tteEffectif) {
    const tteStatus = tteEffectif.tte_min < 40 ? "warning" 
      : tteEffectif.tte_min >= 55 ? "good" : "warning";
    metrics.push({
      label: "TTE effectif",
      value: `${tteEffectif.tte_min} min`,
      confidence: `${Math.round(tteEffectif.confidence * 100)}%`,
      status: tteStatus as "good" | "warning" | "critical",
    });
  }
  
  if (readiness.score != null) {
    metrics.push({
      label: readiness.metricLabel,
      value: `${readiness.score}%`,
      confidence: "—",
      status: readiness.status,
    });
  }

  // Interprétation
  const interpretation = envelope.pacingProfile.description || 
    "Profil standard — respect des zones recommandé.";

  return {
    summary,
    badge,
    badgeColor,
    metrics,
    interpretation,
  };
}

function generateEnvelopeTechnical(envelope: PacingEnvelopeResult): EnvelopeTechnical {
  const { boundary, envelopeWidth, envelopeWidthLabel, sourcesUsed, missingData } = envelope;
  
  // Justification
  let justification = "Enveloppe calculée selon ";
  if (sourcesUsed.length > 0) {
    justification += sourcesUsed.join(", ");
  }
  if (missingData.length > 0) {
    justification += `. Données manquantes : ${missingData.join(", ")}.`;
  }

  return {
    boundary: {
      low: boundary.lowPct,
      center: boundary.centerPct,
      high: boundary.highPct,
      tolerated: boundary.toleratedPct,
    },
    width: envelopeWidth,
    widthLabel: envelopeWidthLabel,
    justification,
    sources: sourcesUsed,
  };
}

function generateErrorScenarios(scenarios: ScenarioSimulationResult): ErrorScenario[] {
  return scenarios.scenarios.slice(0, 4).map(scenario => ({
    id: scenario.id,
    title: scenario.title,
    condition: scenario.condition.description,
    consequence: scenario.consequence.description,
    severity: scenario.consequence.severity === "minor" ? "moderate" : scenario.consequence.severity,
    impact: `Glycogène: -${scenario.consequence.glycogenImpactPct}% | Perf: -${scenario.consequence.performanceLossPct}%`,
    coachAction: scenario.coachAction,
  }));
}

function generateCoachCommunication(
  envelope: PacingEnvelopeResult,
  rules: DisciplineRulesResult
): CoachCommunication {
  // Sélectionner 3-4 phrases coach
  const phrases = COACH_PHRASE_TEMPLATES.slice(0, 4);
  
  // Approche
  let approach = "Communication standard — rappeler les règles de discipline.";
  if (envelope.pacingProfile.type === "sensitive") {
    approach = "Communication ferme — insister sur la non-négociabilité des premières minutes.";
  } else if (envelope.readinessAdjustment > 0) {
    approach = "Communication rassurante — valoriser la prudence comme stratégie.";
  }
  
  // Warnings
  const warnings: string[] = [];
  if (rules.showSensitiveBadge) {
    warnings.push("Ce profil ne tolère pas les pics précoces.");
  }
  if (envelope.readinessAdjustment > 0) {
    warnings.push("Readiness réduit — enveloppe ajustée vers le bas.");
  }
  warnings.push("Toute dérive prolongée compromet le final.");
  
  // Encouragements
  const encouragements = [
    "La discipline sera récompensée.",
    "Les autres viendront vers toi dans le dernier tiers.",
    "Chaque minute de patience au début = minutes gagnées à la fin.",
  ];

  return {
    phrases,
    approach,
    warnings,
    encouragements,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS UI
// ═══════════════════════════════════════════════════════════════════════════════

export function getMetricStatusColor(status: "good" | "warning" | "critical"): string {
  switch (status) {
    case "good":
      return "text-green-600 dark:text-green-400";
    case "warning":
      return "text-orange-600 dark:text-orange-400";
    case "critical":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}

export function getMetricStatusBg(status: "good" | "warning" | "critical"): string {
  switch (status) {
    case "good":
      return "bg-green-100 dark:bg-green-900/30";
    case "warning":
      return "bg-orange-100 dark:bg-orange-900/30";
    case "critical":
      return "bg-red-100 dark:bg-red-900/30";
    default:
      return "bg-muted";
  }
}

export function getSeverityColor(severity: ErrorScenario["severity"]): string {
  switch (severity) {
    case "moderate":
      return "text-orange-600 dark:text-orange-400";
    case "major":
      return "text-red-600 dark:text-red-400";
    case "critical":
      return "text-red-800 dark:text-red-300";
    default:
      return "text-muted-foreground";
  }
}

export function getSeverityBadgeColor(severity: ErrorScenario["severity"]): string {
  switch (severity) {
    case "moderate":
      return "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700";
    case "major":
      return "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700";
    case "critical":
      return "bg-red-200 dark:bg-red-900/50 border-red-400 dark:border-red-600";
    default:
      return "bg-muted";
  }
}
