/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RACE READINESS → SIMULATION CONNECTOR
 * Two For Coaching Lab Method™
 * 
 * PRINCIPE FONDAMENTAL:
 * Race Simulation est conditionnellement activée et paramétrée par Race Readiness.
 * Race Readiness a TOUJOURS priorité sur la Simulation.
 * La Simulation sert la robustesse décisionnelle, pas la performance maximale.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { RaceReadinessV2Category, RaceReadinessV2Result } from "./raceReadinessV2";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type SimulationAccessStatus = 'RED' | 'ORANGE' | 'GREEN' | 'BLUE';

export interface SimulationAccessResult {
  status: SimulationAccessStatus;
  enabled: boolean;
  accessLevel: 'disabled' | 'limited' | 'standard' | 'advanced';
  message: string;
  explanation: string;
  modifiers: SimulationModifiers;
  warnings: string[];
  recommendations: string[];
}

export interface SimulationModifiers {
  // Multiplicateurs d'intensité
  effectiveFtpMultiplier: [number, number];     // [min, max] multiplicateur FTP effectif
  effectiveThresholdMultiplier: [number, number]; // Pour la CAP
  
  // Décalages FatMax
  fatmaxShiftPct: number;                        // Décalage négatif = plus conservateur
  
  // Modificateurs de déplétion glycogène
  glycogenDepletionRateMultiplier: number;       // >1 = plus rapide
  
  // TTE effectif
  tteUsableMultiplier: number;                   // <1 = moins utilisable
  
  // Zones de risque
  riskZoneWidening: number;                      // >1 = zones plus larges
  
  // Scénarios autorisés
  allowedScenarios: ('conservative' | 'optimal' | 'aggressive')[];
  
  // Pacing
  negativeSplitAllowed: boolean;
  lateRaceIntensityBoostAllowed: boolean;
}

export interface SimulationContextMessage {
  type: 'info' | 'warning' | 'critical';
  icon: string;
  title: string;
  content: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mapping Race Readiness V2 Category → Simulation Access Status
 */
const CATEGORY_TO_STATUS: Record<RaceReadinessV2Category, SimulationAccessStatus> = {
  preparation_required: 'RED',
  in_progress: 'ORANGE',
  solid: 'GREEN',
  ready: 'BLUE',
};

/**
 * Configuration des modificateurs par statut
 */
const STATUS_MODIFIERS: Record<SimulationAccessStatus, SimulationModifiers> = {
  RED: {
    // Pas de simulation
    effectiveFtpMultiplier: [0, 0],
    effectiveThresholdMultiplier: [0, 0],
    fatmaxShiftPct: 0,
    glycogenDepletionRateMultiplier: 1,
    tteUsableMultiplier: 0,
    riskZoneWidening: 1,
    allowedScenarios: [],
    negativeSplitAllowed: false,
    lateRaceIntensityBoostAllowed: false,
  },
  ORANGE: {
    // Simulation limitée avec contraintes conservatrices
    effectiveFtpMultiplier: [0.92, 0.95],
    effectiveThresholdMultiplier: [0.92, 0.95],
    fatmaxShiftPct: -7.5, // Décalage -5 à -10% (moyenne)
    glycogenDepletionRateMultiplier: 1.125, // +10-15% (moyenne)
    tteUsableMultiplier: 0.85, // TTE réduit
    riskZoneWidening: 1.3, // Zones élargies
    allowedScenarios: ['conservative', 'optimal'], // Agressif interdit
    negativeSplitAllowed: false,
    lateRaceIntensityBoostAllowed: false,
  },
  GREEN: {
    // Simulation standard
    effectiveFtpMultiplier: [0.97, 1.00],
    effectiveThresholdMultiplier: [0.97, 1.00],
    fatmaxShiftPct: 0,
    glycogenDepletionRateMultiplier: 1.0,
    tteUsableMultiplier: 1.0,
    riskZoneWidening: 1.0,
    allowedScenarios: ['conservative', 'optimal', 'aggressive'],
    negativeSplitAllowed: false,
    lateRaceIntensityBoostAllowed: false,
  },
  BLUE: {
    // Simulation avancée avec options ambitieuses
    effectiveFtpMultiplier: [1.00, 1.03],
    effectiveThresholdMultiplier: [1.00, 1.03],
    fatmaxShiftPct: 0,
    glycogenDepletionRateMultiplier: 1.0,
    tteUsableMultiplier: 1.0,
    riskZoneWidening: 0.85, // Marges plus étroites mais avec warnings
    allowedScenarios: ['conservative', 'optimal', 'aggressive'],
    negativeSplitAllowed: true,
    lateRaceIntensityBoostAllowed: true,
  },
};

/**
 * Messages par statut
 */
const STATUS_MESSAGES: Record<SimulationAccessStatus, { message: string; explanation: string }> = {
  RED: {
    message: "Simulation désactivée : la disponibilité physiologique actuelle ne permet pas une décision de course fiable.",
    explanation: "Le profil nécessite du développement ou la disponibilité est trop faible. Priorité : récupération ou objectif secondaire.",
  },
  ORANGE: {
    message: "Simulation limitée : contraintes appliquées pour refléter la disponibilité réduite.",
    explanation: "Les paramètres sont modérés (FTP effectif réduit, zones élargies, scénario agressif désactivé) pour une décision prudente.",
  },
  GREEN: {
    message: "Simulation standard activée : paramètres nominaux utilisés.",
    explanation: "Le profil et la disponibilité permettent une analyse fiable avec toutes les options de pacing.",
  },
  BLUE: {
    message: "Simulation avancée activée : options ambitieuses disponibles.",
    explanation: "Conditions optimales détectées. Stratégies agressives et negative split possibles avec visualisation des risques.",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Détermine l'accès et les modificateurs de simulation basés sur Race Readiness
 */
export function computeSimulationAccess(
  raceReadiness: RaceReadinessV2Result | null,
  overrideScore?: number
): SimulationAccessResult {
  // Si pas de Race Readiness, utiliser le score override ou bloquer
  let status: SimulationAccessStatus;
  
  if (raceReadiness) {
    status = CATEGORY_TO_STATUS[raceReadiness.readiness.category];
    
    // Ajustements basés sur les flags critiques
    if (raceReadiness.flags.healthAlert || raceReadiness.flags.injuryRiskHigh) {
      // Forcer RED si alerte critique
      status = 'RED';
    } else if (raceReadiness.flags.fatigueCritical && status !== 'RED') {
      // Rétrograder à ORANGE si fatigue critique
      status = status === 'BLUE' ? 'GREEN' : 
               status === 'GREEN' ? 'ORANGE' : status;
    }
  } else if (overrideScore !== undefined) {
    // Mapping du score vers le statut
    if (overrideScore >= 80) status = 'BLUE';
    else if (overrideScore >= 65) status = 'GREEN';
    else if (overrideScore >= 50) status = 'ORANGE';
    else status = 'RED';
  } else {
    // Par défaut : ORANGE (prudent)
    status = 'ORANGE';
  }
  
  const modifiers = STATUS_MODIFIERS[status];
  const { message, explanation } = STATUS_MESSAGES[status];
  
  // Générer les warnings
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  if (status === 'RED') {
    warnings.push("Simulation de course désactivée");
    recommendations.push("Priorité à la récupération");
    recommendations.push("Objectif secondaire recommandé");
  } else if (status === 'ORANGE') {
    warnings.push("Pacing agressif non disponible");
    warnings.push("Paramètres physiologiques modérés");
    recommendations.push("Choisir un objectif réaliste");
    recommendations.push("Prévoir une marge de sécurité");
  } else if (status === 'BLUE') {
    warnings.push("Stratégies ambitieuses avec risques explicites");
    recommendations.push("Negative split possible si préparé");
    recommendations.push("Surveillance continue recommandée");
  }
  
  // Ajouter les flags spécifiques si présents
  if (raceReadiness?.flags.dataIncomplete) {
    warnings.push("Données incomplètes — confiance réduite");
  }
  
  return {
    status,
    enabled: status !== 'RED',
    accessLevel: status === 'RED' ? 'disabled' :
                 status === 'ORANGE' ? 'limited' :
                 status === 'GREEN' ? 'standard' : 'advanced',
    message,
    explanation,
    modifiers,
    warnings,
    recommendations,
  };
}

/**
 * Applique les modificateurs aux paramètres de simulation
 */
export function applySimulationModifiers(
  baseParams: {
    ftp?: number | null;
    vma?: number | null;
    paceThreshold?: number | null;
    fatmaxCenterPct?: number | null;
    fatmaxRange?: [number, number] | null;
    tteMin?: number | null;
  },
  modifiers: SimulationModifiers
): {
  effectiveFtp: number | null;
  effectiveFtpRange: [number, number] | null;
  effectiveVma: number | null;
  effectivePaceThreshold: number | null;
  effectiveFatmaxPct: number | null;
  effectiveFatmaxRange: [number, number] | null;
  effectiveTte: number | null;
} {
  const { ftp, vma, paceThreshold, fatmaxCenterPct, fatmaxRange, tteMin } = baseParams;
  
  // FTP effectif
  let effectiveFtp: number | null = null;
  let effectiveFtpRange: [number, number] | null = null;
  if (ftp) {
    effectiveFtp = ftp * ((modifiers.effectiveFtpMultiplier[0] + modifiers.effectiveFtpMultiplier[1]) / 2);
    effectiveFtpRange = [
      Math.round(ftp * modifiers.effectiveFtpMultiplier[0]),
      Math.round(ftp * modifiers.effectiveFtpMultiplier[1]),
    ];
  }
  
  // VMA effectif
  const effectiveVma = vma ? vma * ((modifiers.effectiveThresholdMultiplier[0] + modifiers.effectiveThresholdMultiplier[1]) / 2) : null;
  
  // Allure seuil effective
  const effectivePaceThreshold = paceThreshold ? 
    Math.round(paceThreshold / ((modifiers.effectiveThresholdMultiplier[0] + modifiers.effectiveThresholdMultiplier[1]) / 2)) : null;
  
  // FatMax effectif avec décalage
  const effectiveFatmaxPct = fatmaxCenterPct ? fatmaxCenterPct + modifiers.fatmaxShiftPct : null;
  const effectiveFatmaxRange: [number, number] | null = fatmaxRange ? [
    fatmaxRange[0] + modifiers.fatmaxShiftPct,
    fatmaxRange[1] + modifiers.fatmaxShiftPct,
  ] : null;
  
  // TTE effectif
  const effectiveTte = tteMin ? Math.round(tteMin * modifiers.tteUsableMultiplier) : null;
  
  return {
    effectiveFtp,
    effectiveFtpRange,
    effectiveVma,
    effectivePaceThreshold,
    effectiveFatmaxPct,
    effectiveFatmaxRange,
    effectiveTte,
  };
}

/**
 * Génère le graphique de décision (données pour Recharts)
 */
export function generateDecisionChartData(
  intensitySteps: number[],
  fatmaxPct: number,
  riskBoundary: number,
  status: SimulationAccessStatus
): Array<{
  intensity: number;
  fatOxidation: number;
  carbOxidation: number;
  riskIndex: number;
  zone: 'safe' | 'risk' | 'forbidden';
}> {
  return intensitySteps.map(intensity => {
    // Modèle simplifié d'oxydation
    const fatOxidation = Math.max(0, 100 - Math.pow((intensity - fatmaxPct) / 15, 2) * 50);
    const carbOxidation = Math.min(100, Math.pow((intensity - 50) / 30, 2) * 100);
    
    // Indice de risque cumulatif
    let riskIndex = 0;
    if (intensity > fatmaxPct) {
      riskIndex = Math.pow((intensity - fatmaxPct) / 10, 1.5) * 30;
    }
    if (intensity > 85) {
      riskIndex += (intensity - 85) * 3;
    }
    
    // Zone
    let zone: 'safe' | 'risk' | 'forbidden';
    if (status === 'RED') {
      zone = 'forbidden';
    } else if (intensity <= fatmaxPct - 5) {
      zone = 'safe';
    } else if (intensity <= riskBoundary) {
      zone = 'risk';
    } else {
      zone = 'forbidden';
    }
    
    return {
      intensity,
      fatOxidation: Math.round(fatOxidation),
      carbOxidation: Math.round(carbOxidation),
      riskIndex: Math.min(100, Math.round(riskIndex)),
      zone,
    };
  });
}

/**
 * Génère les messages contextuels pour l'UI
 */
export function getSimulationContextMessages(
  access: SimulationAccessResult,
  raceReadiness?: RaceReadinessV2Result | null
): SimulationContextMessage[] {
  const messages: SimulationContextMessage[] = [];
  
  // Message principal basé sur le statut
  if (access.status === 'RED') {
    messages.push({
      type: 'critical',
      icon: '🔴',
      title: 'Simulation non disponible',
      content: access.message,
    });
    messages.push({
      type: 'info',
      icon: '💡',
      title: 'Recommandation',
      content: 'Objectif secondaire ou report de course recommandé. Consultez le Race Readiness pour plus de détails.',
    });
  } else if (access.status === 'ORANGE') {
    messages.push({
      type: 'warning',
      icon: '🟠',
      title: 'Simulation limitée',
      content: access.message,
    });
    messages.push({
      type: 'info',
      icon: '⚡',
      title: 'Paramètres ajustés',
      content: `FTP effectif: ${Math.round(access.modifiers.effectiveFtpMultiplier[0] * 100)}-${Math.round(access.modifiers.effectiveFtpMultiplier[1] * 100)}% • FatMax décalé de ${access.modifiers.fatmaxShiftPct}%`,
    });
  } else if (access.status === 'BLUE') {
    messages.push({
      type: 'info',
      icon: '🔵',
      title: 'Mode avancé activé',
      content: access.message,
    });
    if (access.modifiers.negativeSplitAllowed) {
      messages.push({
        type: 'info',
        icon: '🚀',
        title: 'Stratégies disponibles',
        content: 'Negative split et intensité finale élevée possibles. Risques explicitement visualisés.',
      });
    }
  }
  
  // Ajouter les flags si présents
  if (raceReadiness?.flags.healthAlert) {
    messages.push({
      type: 'critical',
      icon: '⚠️',
      title: 'Alerte santé',
      content: 'Consulter avant effort intense.',
    });
  }
  
  if (raceReadiness?.flags.dataIncomplete) {
    messages.push({
      type: 'warning',
      icon: '📊',
      title: 'Données partielles',
      content: 'Confiance réduite sur les estimations.',
    });
  }
  
  return messages;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS POUR L'UI
// ═══════════════════════════════════════════════════════════════════════════════

export const SIMULATION_ACCESS_DEFINITIONS = {
  title: "Performance Potentielle × Disponibilité → Décision",
  principle: `TFCL cherche la zone de décision robuste, pas l'optimum théorique.
Un athlète peut être très fort mais non prêt, prêt mais limité, 
ou suffisamment fort ET suffisamment disponible.`,
  disclaimer: `Cette simulation ne prédit pas un résultat exact.
Elle compare des scénarios en fonction de votre disponibilité actuelle.`,
};

export const ACCESS_LEVEL_COLORS = {
  disabled: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30' },
  limited: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
  standard: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  advanced: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
};

export const ACCESS_STATUS_LABELS: Record<SimulationAccessStatus, { label: string; emoji: string }> = {
  RED: { label: 'Non disponible', emoji: '🔴' },
  ORANGE: { label: 'Limité', emoji: '🟠' },
  GREEN: { label: 'Standard', emoji: '🟢' },
  BLUE: { label: 'Avancé', emoji: '🔵' },
};
