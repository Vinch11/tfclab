// =============================================
// RUN INJURY RISK — Two For Coaching Lab
// Indice de Risque Blessure spécifique Course à Pied (CAP)
// =============================================
//
// DÉFINITION OFFICIELLE :
// Le Risque Blessure CAP est un indice composite qui évalue la probabilité
// de blessure liée aux contraintes mécaniques spécifiques à la course à pied,
// en tenant compte de la fatigue, du profil métabolique, de la durabilité et de la charge.
//
// IL SERT À :
// - Alerter sur les situations à risque élevé
// - Guider les décisions de charge CAP
// - Proposer des options au coach (sans imposer)
//
// IL NE SERT PAS À :
// - Diagnostiquer une blessure
// - Remplacer un avis médical
// - Appliquer automatiquement des modifications
//
// =============================================

import { FatigueEffectif } from "./fatigueEffectif";
import { VLamaxEffectif } from "./vlamaxEffectif";
import { TTEEffectif, getTTETarget } from "./tteEffectif";

// =============================================
// TYPES
// =============================================

export type RunInjuryRiskLevel = "FAIBLE" | "MODERE" | "ELEVE" | "CRITIQUE";

export interface RunInjuryRiskDriver {
  label: string;
  value: string;
  component: number;     // Contribution brute (0-100)
  weight: number;        // Poids dans le calcul
  impact: "low" | "medium" | "high" | "critical";
}

export interface RunInjuryRiskEnvelope {
  score: number;                   // 0-100
  level: RunInjuryRiskLevel;
  levelLabel: string;
  levelColor: "success" | "info" | "warning" | "destructive";
  confidence: number;              // 0-1
  drivers: RunInjuryRiskDriver[];  // Détail des facteurs
  why: string;                     // Explication synthétique
  guardrails: string[];            // Ce que le coach doit surveiller
  coachOptions: string[];          // Options proposées au coach (max 3)
  inputsUsed: {
    fatiguePct: number | null;
    vlamaxValue: number | null;
    tteValue: number | null;
    loadValue: number | null;
    age: number | null;
    objectif: string;
  };
  disclaimer: string;
}

export interface ComputeRunInjuryRiskParams {
  fatigueEffectif: FatigueEffectif;
  vlamaxEffectif?: VLamaxEffectif | null;
  tteEffectif?: TTEEffectif | null;
  tss7d?: number | null;          // Charge globale
  runLoad7d?: number | null;      // Charge CAP spécifique (si disponible)
  age?: number | null;
  objectif: string;
}

// =============================================
// ÉCHELLES OFFICIELLES
// =============================================

export const RUN_INJURY_RISK_SCALE = {
  FAIBLE: { min: 0, max: 25, label: "Faible", color: "success" as const, description: "Risque mécanique faible. CAP normale autorisée." },
  MODERE: { min: 26, max: 50, label: "Modéré", color: "info" as const, description: "Vigilance sur la densité de qualité CAP." },
  ELEVE: { min: 51, max: 75, label: "Élevé", color: "warning" as const, description: "Limiter intensité CAP, privilégier vélo pour charge." },
  CRITIQUE: { min: 76, max: 100, label: "Critique", color: "destructive" as const, description: "Réduction charge CAP recommandée. Priorité récupération." },
};

// Guideline Fatigue Vélo (pour affichage en mode staff)
export const FATIGUE_VELO_GUIDELINE = [
  { range: "<30%", interpretation: "Séances qualitatives OK. Intensité et densité autorisées." },
  { range: "30–45%", interpretation: "Intensité possible mais contrôlée. Éviter accumulation densité." },
  { range: "45–60%", interpretation: "Priorité tempo/Z2. Limiter VO2 et sprints." },
  { range: ">60%", interpretation: "Récupération active uniquement. Pas de qualité." },
];

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getRiskLevel(score: number): RunInjuryRiskLevel {
  if (score <= 25) return "FAIBLE";
  if (score <= 50) return "MODERE";
  if (score <= 75) return "ELEVE";
  return "CRITIQUE";
}

function getRiskLevelInfo(level: RunInjuryRiskLevel) {
  return RUN_INJURY_RISK_SCALE[level];
}

function getDriverImpact(component: number): "low" | "medium" | "high" | "critical" {
  if (component <= 30) return "low";
  if (component <= 50) return "medium";
  if (component <= 70) return "high";
  return "critical";
}

// =============================================
// CALCUL DES COMPOSANTES
// =============================================

/**
 * 1) Fatigue Component (30%)
 * Direct mapping du score de fatigue
 */
function computeFatigueComponent(fatiguePct: number): number {
  return clamp(fatiguePct, 0, 100);
}

/**
 * 2) VLamax Component (20%)
 * VLamax élevé = coût énergétique plus élevé = risque mécanique accru en CAP
 */
function computeVlamaxComponent(vlamaxValue: number | null): { component: number; known: boolean } {
  if (vlamaxValue === null) {
    return { component: 50, known: false }; // Valeur neutre
  }
  
  // Mapping pour CAP
  if (vlamaxValue <= 0.35) return { component: 10, known: true };  // Excellent
  if (vlamaxValue <= 0.45) return { component: 25, known: true };  // Bon
  if (vlamaxValue <= 0.55) return { component: 50, known: true };  // Modéré
  if (vlamaxValue <= 0.65) return { component: 75, known: true };  // Élevé
  return { component: 90, known: true };                          // Très élevé
}

/**
 * 3) TTE Component (20%)
 * TTE bas = moins de robustesse = risque accru
 */
function computeTTEComponent(tteValue: number | null, objectif: string, age: number | null): { component: number; known: boolean } {
  if (tteValue === null) {
    return { component: 50, known: false };
  }

  // Délègue à la source unique (physiologicalTargets.ts via tteEffectif.ts)
  // au lieu d'une table locale figée. Avant ce fix : `getTTETarget` était
  // importé (ligne 25) mais jamais appelé — la table locale ci-dessous avait
  // divergé de la cible canonique de 5 à 8 min selon l'objectif (703: 50 au
  // lieu de 45, TrailCourt: 42 au lieu de 50 via l'alias Trail...), biaisant
  // ce composant du score de risque blessure (poids 20%) dans les deux sens
  // selon l'objectif (audit Batch 3).
  const target = getTTETarget(objectif, age);

  // Plus TTE est bas vs cible, plus le risque augmente
  const ratio = tteValue / target;
  const component = clamp(100 - ratio * 100, 0, 100);

  return { component, known: true };
}

/**
 * 4) Load Component (20%)
 * Charge CAP mécanique
 */
function computeLoadComponent(
  runLoad7d: number | null, 
  tss7d: number | null
): { component: number; known: boolean; isProxy: boolean } {
  // Charge CAP spécifique disponible
  if (runLoad7d !== null && runLoad7d > 0) {
    // Map 0-500 TSS CAP vers 0-100
    const component = clamp((runLoad7d / 500) * 100, 0, 100);
    return { component, known: true, isProxy: false };
  }
  
  // Proxy via charge globale
  if (tss7d !== null && tss7d > 0) {
    // Map 0-600 TSS global vers 0-100 avec facteur prudent
    const component = clamp((tss7d / 600) * 100, 0, 100);
    return { component, known: true, isProxy: true };
  }
  
  return { component: 50, known: false, isProxy: false };
}

/**
 * 5) Age Component (10%)
 * Âge influence la récupération mécanique
 */
function computeAgeComponent(age: number | null): { component: number; known: boolean } {
  if (age === null) {
    return { component: 25, known: false };
  }
  
  if (age < 30) return { component: 10, known: true };
  if (age < 40) return { component: 20, known: true };
  if (age < 50) return { component: 35, known: true };
  return { component: 50, known: true };
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computeRunInjuryRisk(params: ComputeRunInjuryRiskParams): RunInjuryRiskEnvelope {
  const {
    fatigueEffectif,
    vlamaxEffectif,
    tteEffectif,
    tss7d,
    runLoad7d,
    age,
    objectif,
  } = params;

  // Extraire les valeurs
  const fatiguePct = fatigueEffectif.score;
  const vlamaxValue = vlamaxEffectif?.value ?? null;
  const tteValue = tteEffectif?.tte_min ?? null;

  // Calculer les composantes
  const fatigueComp = computeFatigueComponent(fatiguePct);
  const vlamaxResult = computeVlamaxComponent(vlamaxValue);
  const tteResult = computeTTEComponent(tteValue, objectif, age ?? null);
  const loadResult = computeLoadComponent(runLoad7d ?? null, tss7d ?? null);
  const ageResult = computeAgeComponent(age ?? null);

  // Pondérations officielles
  const WEIGHTS = {
    fatigue: 0.30,
    vlamax: 0.20,
    tte: 0.20,
    load: 0.20,
    age: 0.10,
  };

  // Score final
  const rawScore = 
    fatigueComp * WEIGHTS.fatigue +
    vlamaxResult.component * WEIGHTS.vlamax +
    tteResult.component * WEIGHTS.tte +
    loadResult.component * WEIGHTS.load +
    ageResult.component * WEIGHTS.age;

  const score = clamp(Math.round(rawScore), 0, 100);

  // Confiance
  let confidence = 0.6; // Base
  if (vlamaxResult.known) confidence += 0.15;
  if (tteResult.known) confidence += 0.15;
  if (loadResult.known) confidence += loadResult.isProxy ? 0.05 : 0.10;
  if (ageResult.known) confidence += 0.10;
  confidence = clamp(confidence, 0, 0.95);

  // Niveau de risque
  const level = getRiskLevel(score);
  const levelInfo = getRiskLevelInfo(level);

  // Construire les drivers
  const drivers: RunInjuryRiskDriver[] = [
    {
      label: "Fatigue fonctionnelle",
      value: `${fatiguePct}%`,
      component: fatigueComp,
      weight: WEIGHTS.fatigue,
      impact: getDriverImpact(fatigueComp),
    },
    {
      label: "VLamax",
      value: vlamaxValue !== null ? `${vlamaxValue.toFixed(2)}` : "—",
      component: vlamaxResult.component,
      weight: WEIGHTS.vlamax,
      impact: getDriverImpact(vlamaxResult.component),
    },
    {
      label: "TTE effectif",
      value: tteValue !== null ? `${tteValue} min` : "—",
      component: tteResult.component,
      weight: WEIGHTS.tte,
      impact: getDriverImpact(tteResult.component),
    },
    {
      label: loadResult.isProxy ? "Charge (proxy global)" : "Charge CAP",
      value: runLoad7d !== null ? `${runLoad7d} TSS` : tss7d !== null ? `~${tss7d} TSS` : "—",
      component: loadResult.component,
      weight: WEIGHTS.load,
      impact: getDriverImpact(loadResult.component),
    },
    {
      label: "Âge",
      value: age !== null ? `${age} ans` : "—",
      component: ageResult.component,
      weight: WEIGHTS.age,
      impact: getDriverImpact(ageResult.component),
    },
  ];

  // Explication synthétique
  const why = generateWhy(score, level, drivers, objectif);

  // Guardrails et options selon le niveau
  const guardrails = generateGuardrails(level, drivers);
  const coachOptions = generateCoachOptions(level, fatiguePct);

  return {
    score,
    level,
    levelLabel: levelInfo.label,
    levelColor: levelInfo.color,
    confidence,
    drivers,
    why,
    guardrails,
    coachOptions,
    inputsUsed: {
      fatiguePct,
      vlamaxValue,
      tteValue,
      loadValue: runLoad7d ?? tss7d ?? null,
      age: age ?? null,
      objectif,
    },
    disclaimer: "Indicateur d'aide à la décision. Ne remplace pas un avis médical ni le jugement du coach.",
  };
}

// =============================================
// GÉNÉRATEURS DE TEXTE
// =============================================

function generateWhy(
  score: number, 
  level: RunInjuryRiskLevel, 
  drivers: RunInjuryRiskDriver[],
  objectif: string
): string {
  const highImpactDrivers = drivers.filter(d => d.impact === "high" || d.impact === "critical");
  
  if (level === "FAIBLE") {
    return `Risque CAP faible (${score}%). Les indicateurs sont dans les zones vertes pour ${objectif}. CAP normale autorisée.`;
  }
  
  if (level === "MODERE") {
    const factors = highImpactDrivers.map(d => d.label).join(", ") || "charge globale";
    return `Risque CAP modéré (${score}%). Facteurs à surveiller : ${factors}. Vigilance recommandée sur la densité de qualité.`;
  }
  
  if (level === "ELEVE") {
    const factors = highImpactDrivers.map(d => `${d.label} (${d.value})`).join(", ");
    return `Risque CAP élevé (${score}%). Facteurs critiques : ${factors}. Limiter intensité CAP, privilégier vélo pour maintenir la charge.`;
  }
  
  // CRITIQUE
  const factors = highImpactDrivers.map(d => `${d.label}: ${d.value}`).join(", ");
  return `Risque CAP critique (${score}%). Alerte : ${factors}. Réduction charge CAP fortement recommandée. Priorité à la récupération.`;
}

function generateGuardrails(level: RunInjuryRiskLevel, drivers: RunInjuryRiskDriver[]): string[] {
  const guardrails: string[] = [];
  
  switch (level) {
    case "FAIBLE":
      guardrails.push("Maintenir le monitoring habituel");
      break;
      
    case "MODERE":
      guardrails.push("Surveiller densité de qualité CAP");
      guardrails.push("Privilégier Z2 sur sorties longues");
      guardrails.push("Éviter triade long + seuil + vitesse dans la même semaine");
      break;
      
    case "ELEVE":
      guardrails.push("Limiter intensité CAP haute (seuil, VMA)");
      guardrails.push("Privilégier vélo pour charge cardiovasculaire");
      guardrails.push("Insérer journée recovery entre qualités CAP");
      guardrails.push("Réduire volume CAP de 10-20%");
      break;
      
    case "CRITIQUE":
      guardrails.push("Réduction significative charge CAP recommandée");
      guardrails.push("Priorité absolue à la récupération");
      guardrails.push("Surveillance douleur/raideur/inflammation");
      guardrails.push("Pas de qualité CAP avant retour sous 50% de risque");
      break;
  }
  
  // Ajouter guardrails spécifiques selon drivers critiques
  const criticalDrivers = drivers.filter(d => d.impact === "critical");
  if (criticalDrivers.some(d => d.label.includes("Fatigue"))) {
    guardrails.push("La fatigue élevée amplifie le risque mécanique CAP");
  }
  if (criticalDrivers.some(d => d.label.includes("VLamax"))) {
    guardrails.push("VLamax élevé = coût énergétique accru en CAP");
  }
  
  return guardrails;
}

function generateCoachOptions(level: RunInjuryRiskLevel, fatiguePct: number): string[] {
  if (level === "FAIBLE" || level === "MODERE") {
    return [];
  }
  
  const options: string[] = [];
  
  if (level === "ELEVE") {
    options.push("Remplacer qualité CAP par vélo Z3/Z4");
    options.push("Réduire volume CAP de 15%");
    options.push("Ajouter journée recovery complète");
  } else {
    // CRITIQUE
    options.push("Passer en mode récupération active (3-5 jours)");
    options.push("Remplacer toute qualité CAP par vélo Z2");
    options.push("Consultation préventive si douleurs");
  }
  
  return options.slice(0, 3); // Max 3 options
}

// =============================================
// HELPERS UI
// =============================================

export function getRunInjuryRiskIcon(level: RunInjuryRiskLevel): string {
  switch (level) {
    case "FAIBLE": return "✅";
    case "MODERE": return "⚠️";
    case "ELEVE": return "🔶";
    case "CRITIQUE": return "🛑";
  }
}

export function getRunInjuryRiskColorClass(level: RunInjuryRiskLevel): string {
  switch (level) {
    case "FAIBLE": return "text-green-600 dark:text-green-400";
    case "MODERE": return "text-blue-600 dark:text-blue-400";
    case "ELEVE": return "text-amber-600 dark:text-amber-400";
    case "CRITIQUE": return "text-red-600 dark:text-red-400";
  }
}

export function getRunInjuryRiskBadgeClass(level: RunInjuryRiskLevel): string {
  switch (level) {
    case "FAIBLE": return "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50";
    case "MODERE": return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/50";
    case "ELEVE": return "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50";
    case "CRITIQUE": return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50";
  }
}
