/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PACING SCENARIO SIMULATOR™ — Simulation de Conséquences Métaboliques
 * Two For Coaching Lab Method™
 * 
 * CONCEPT:
 * Simule les conséquences métaboliques des erreurs de pacing.
 * Génère des scénarios IF/THEN pour l'éducation athlète/coach.
 * 
 * PRINCIPE FONDAMENTAL:
 * Ces scénarios sont EXPLICATIFS, non bloquants.
 * Ils sont affichés uniquement comme aide à la décision.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { PacingEnvelopeResult, RaceObjective } from "./pacingEnvelopeEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ScenarioType = "pacing_error" | "early_push" | "sustained_overdrive" | "glycogen_crisis" | "heat_stress";
export type ConsequenceSeverity = "minor" | "moderate" | "major" | "critical";
export type RacePhase = "first_third" | "middle_third" | "last_third";

export interface PacingScenario {
  id: string;
  type: ScenarioType;
  title: string;
  
  // Condition (IF)
  condition: {
    description: string;
    intensityOverPct: number;        // % au-dessus de l'enveloppe haute
    durationMinutes: number;         // durée de l'erreur
    phase: RacePhase;                // quand dans la course
  };
  
  // Conséquence (THEN)
  consequence: {
    description: string;
    severity: ConsequenceSeverity;
    glycogenImpactPct: number;       // % de déplétion glycogène additionnelle
    performanceLossPct: number;      // % de perte de performance estimée
    breakpointKm?: number;           // km où la conséquence se manifeste
    timeToImpactMin?: number;        // minutes avant que l'impact ne se manifeste
  };
  
  // Message pédagogique
  pedagogicalMessage: string;
  coachAction: string;
  
  // Visuel
  icon: string;
  color: string;
}

export interface ScenarioSimulationInput {
  envelope: PacingEnvelopeResult;
  raceObjective: RaceObjective;
  vlamaxValue: number | null;
  tteMin: number | null;
  raceDistanceKm: number;
  raceDurationMin: number;
}

export interface ScenarioSimulationResult {
  scenarios: PacingScenario[];
  mostLikelyScenario: PacingScenario | null;
  criticalScenarios: PacingScenario[];
  
  // Résumé
  totalRiskLevel: number; // 0-100
  primaryWarning: string;
  
  // Métadonnées
  methodology: string;
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const PHASE_LABELS: Record<RacePhase, string> = {
  first_third: "Premier tiers",
  middle_third: "Tiers médian",
  last_third: "Dernier tiers",
};

const SEVERITY_COLORS: Record<ConsequenceSeverity, string> = {
  minor: "green",
  moderate: "orange",
  major: "red",
  critical: "darkred",
};

export const SCENARIO_DEFINITIONS = {
  methodology: `Les scénarios sont calculés selon:
• VLamax (sensibilité métabolique)
• TTE (durabilité)
• Format de course (durée totale)
• Intensité de dépassement`,

  disclaimer: `Ces scénarios sont EXPLICATIFS et non prédictifs.
Ils illustrent les conséquences typiques d'erreurs de pacing.
Chaque athlète réagit différemment selon son historique et ses adaptations.`,

  pedagogical_intro: `Une erreur précoce coûte plus qu'elle ne rapporte.
Ce n'est pas une question de courage mais de biologie.`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// GÉNÉRATION DE SCÉNARIOS
// ═══════════════════════════════════════════════════════════════════════════════

function generateBaseScenarios(input: ScenarioSimulationInput): PacingScenario[] {
  const { envelope, raceObjective, vlamaxValue, tteMin, raceDistanceKm, raceDurationMin } = input;
  const scenarios: PacingScenario[] = [];
  
  // Facteurs de sensibilité
  const isSensitiveProfile = vlamaxValue != null && vlamaxValue < 0.4;
  const hasLowTTE = tteMin != null && tteMin < 45;
  const isLongRace = raceDurationMin > 180;
  
  // Calculer les seuils dynamiques
  const moderateOverPct = isSensitiveProfile ? 8 : 12;
  const severeOverPct = isSensitiveProfile ? 12 : 18;
  const criticalOverPct = isSensitiveProfile ? 15 : 22;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SCÉNARIO 1: Erreur précoce modérée
  // ─────────────────────────────────────────────────────────────────────────────
  scenarios.push({
    id: "early_moderate_push",
    type: "early_push",
    title: "Départ trop rapide (modéré)",
    condition: {
      description: `Dépassement de +${moderateOverPct}% pendant 5-10 min dans le premier tiers`,
      intensityOverPct: moderateOverPct,
      durationMinutes: 7,
      phase: "first_third",
    },
    consequence: {
      description: "Déplétion glycogénique anticipée, baisse de performance dans le dernier tiers",
      severity: isSensitiveProfile ? "major" : "moderate",
      glycogenImpactPct: isSensitiveProfile ? 12 : 8,
      performanceLossPct: isSensitiveProfile ? 4 : 2,
      breakpointKm: Math.round(raceDistanceKm * 0.7),
      timeToImpactMin: Math.round(raceDurationMin * 0.6),
    },
    pedagogicalMessage: "Cette erreur compromet les bénéfices métaboliques construits à l'entraînement.",
    coachAction: "Rappeler la règle des 30 premières minutes. Freiner immédiatement.",
    icon: "⚡",
    color: isSensitiveProfile ? "red" : "orange",
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCÉNARIO 2: Départ explosif
  // ─────────────────────────────────────────────────────────────────────────────
  scenarios.push({
    id: "explosive_start",
    type: "early_push",
    title: "Départ explosif",
    condition: {
      description: `Dépassement de +${criticalOverPct}% pendant > 5 min au départ`,
      intensityOverPct: criticalOverPct,
      durationMinutes: 5,
      phase: "first_third",
    },
    consequence: {
      description: "Déplétion glycogénique rapide, rupture probable avant la fin",
      severity: "critical",
      glycogenImpactPct: isSensitiveProfile ? 25 : 18,
      performanceLossPct: isSensitiveProfile ? 10 : 6,
      breakpointKm: Math.round(raceDistanceKm * 0.55),
      timeToImpactMin: Math.round(raceDurationMin * 0.45),
    },
    pedagogicalMessage: "Un départ explosif = dette métabolique impossible à rembourser sur longue distance.",
    coachAction: "STOP immédiat. Revenir sous l'enveloppe. Accepter de perdre du temps maintenant.",
    icon: "💥",
    color: "darkred",
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCÉNARIO 3: Overdrive soutenu milieu de course
  // ─────────────────────────────────────────────────────────────────────────────
  scenarios.push({
    id: "sustained_mid_overdrive",
    type: "sustained_overdrive",
    title: "Surintensité maintenue (mi-course)",
    condition: {
      description: `Maintien à +${moderateOverPct}% pendant 15-20 min dans le tiers médian`,
      intensityOverPct: moderateOverPct,
      durationMinutes: 17,
      phase: "middle_third",
    },
    consequence: {
      description: "Épuisement progressif des réserves, final compromis",
      severity: isLongRace ? "major" : "moderate",
      glycogenImpactPct: hasLowTTE ? 15 : 10,
      performanceLossPct: hasLowTTE ? 5 : 3,
      breakpointKm: Math.round(raceDistanceKm * 0.8),
      timeToImpactMin: Math.round(raceDurationMin * 0.75),
    },
    pedagogicalMessage: "Le milieu de course n'est pas le moment de combler un retard.",
    coachAction: "Revenir à la zone optimale. Protéger le final.",
    icon: "📈",
    color: "orange",
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SCÉNARIO 4: Crise glycogénique
  // ─────────────────────────────────────────────────────────────────────────────
  if (isLongRace) {
    scenarios.push({
      id: "glycogen_crisis",
      type: "glycogen_crisis",
      title: "Crise glycogénique (bonk)",
      condition: {
        description: `Multiples dépassements cumulés + nutrition insuffisante`,
        intensityOverPct: severeOverPct,
        durationMinutes: 30, // cumulé
        phase: "last_third",
      },
      consequence: {
        description: "Effondrement brutal, incapacité à maintenir l'effort, marche forcée possible",
        severity: "critical",
        glycogenImpactPct: 40,
        performanceLossPct: 25,
        breakpointKm: Math.round(raceDistanceKm * 0.7),
      },
      pedagogicalMessage: "Le bonk n'est pas une fatalité, c'est le résultat d'erreurs cumulées.",
      coachAction: "Prévention : respecter l'enveloppe + nutrition programmée.",
      icon: "🔋",
      color: "darkred",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCÉNARIO 5: Profil sensible spécifique
  // ─────────────────────────────────────────────────────────────────────────────
  if (isSensitiveProfile) {
    scenarios.push({
      id: "sensitive_profile_error",
      type: "pacing_error",
      title: "Erreur profil sensible",
      condition: {
        description: `Tout dépassement > +5% pendant > 3 min (profil VLamax < 0.4)`,
        intensityOverPct: 5,
        durationMinutes: 3,
        phase: "first_third",
      },
      consequence: {
        description: "Perturbation métabolique disproportionnée à l'effort",
        severity: "major",
        glycogenImpactPct: 15,
        performanceLossPct: 5,
        timeToImpactMin: Math.round(raceDurationMin * 0.4),
      },
      pedagogicalMessage: "Ce profil amplifie les conséquences de chaque erreur. La marge n'existe pas.",
      coachAction: "Discipline absolue. Préférer sous-performer que déborder.",
      icon: "🟣",
      color: "purple",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCÉNARIO 6: TTE faible spécifique
  // ─────────────────────────────────────────────────────────────────────────────
  if (hasLowTTE && isLongRace) {
    scenarios.push({
      id: "low_tte_drift",
      type: "pacing_error",
      title: "Dérive par faible durabilité",
      condition: {
        description: `Maintien au plafond de l'enveloppe pendant > 30 min (TTE < 45)`,
        intensityOverPct: 0, // au plafond, pas au-dessus
        durationMinutes: 30,
        phase: "middle_third",
      },
      consequence: {
        description: "Dérive progressive, incapacité à maintenir l'intensité cible",
        severity: "moderate",
        glycogenImpactPct: 8,
        performanceLossPct: 4,
        timeToImpactMin: 45,
      },
      pedagogicalMessage: "Un TTE faible signifie que même l'intensité 'correcte' devient difficile à tenir.",
      coachAction: "Viser le bas de l'enveloppe. Protéger la durabilité.",
      icon: "📉",
      color: "orange",
    });
  }

  return scenarios;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère les scénarios de simulation pour l'aide à la décision
 */
export function simulatePacingScenarios(input: ScenarioSimulationInput): ScenarioSimulationResult {
  const scenarios = generateBaseScenarios(input);
  
  // Identifier les scénarios critiques
  const criticalScenarios = scenarios.filter(s => s.consequence.severity === "critical");
  
  // Scénario le plus probable (heuristique basée sur les erreurs fréquentes)
  const mostLikelyScenario = scenarios.find(s => 
    s.type === "early_push" && s.consequence.severity !== "critical"
  ) || scenarios[0];
  
  // Calcul du risque total
  let totalRiskLevel = 30; // base
  if (input.vlamaxValue != null && input.vlamaxValue < 0.4) totalRiskLevel += 20;
  if (input.tteMin != null && input.tteMin < 45) totalRiskLevel += 15;
  if (input.raceDurationMin > 180) totalRiskLevel += 10;
  totalRiskLevel = Math.min(90, totalRiskLevel);
  
  // Message principal
  let primaryWarning: string;
  if (criticalScenarios.length > 0) {
    primaryWarning = "Risque de scénarios critiques identifié. Discipline maximale requise.";
  } else if (input.vlamaxValue != null && input.vlamaxValue < 0.4) {
    primaryWarning = "Profil sensible — chaque erreur a un coût élevé.";
  } else {
    primaryWarning = "Respecter l'enveloppe pour éviter les conséquences simulées.";
  }

  return {
    scenarios,
    mostLikelyScenario,
    criticalScenarios,
    totalRiskLevel,
    primaryWarning,
    methodology: SCENARIO_DEFINITIONS.methodology,
    disclaimer: SCENARIO_DEFINITIONS.disclaimer,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS UI
// ═══════════════════════════════════════════════════════════════════════════════

export function getSeverityColor(severity: ConsequenceSeverity): string {
  switch (severity) {
    case "minor":
      return "text-green-600 dark:text-green-400";
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

export function getSeverityBgColor(severity: ConsequenceSeverity): string {
  switch (severity) {
    case "minor":
      return "bg-green-100 dark:bg-green-900/30";
    case "moderate":
      return "bg-orange-100 dark:bg-orange-900/30";
    case "major":
      return "bg-red-100 dark:bg-red-900/30";
    case "critical":
      return "bg-red-200 dark:bg-red-900/50";
    default:
      return "bg-muted";
  }
}

export function getSeverityLabel(severity: ConsequenceSeverity): string {
  switch (severity) {
    case "minor":
      return "Mineur";
    case "moderate":
      return "Modéré";
    case "major":
      return "Majeur";
    case "critical":
      return "Critique";
    default:
      return severity;
  }
}

export function getPhaseLabel(phase: RacePhase): string {
  return PHASE_LABELS[phase];
}

/**
 * Formate l'impact pour affichage
 */
export function formatConsequenceImpact(scenario: PacingScenario): string {
  const { glycogenImpactPct, performanceLossPct } = scenario.consequence;
  return `Glycogène: -${glycogenImpactPct}% | Perf: -${performanceLossPct}%`;
}
