import { computePotentielEffectif, type PotentielPhysiologiqueEffectif, getScoreColor, getPotentielTargets, getTargets, getWeightsBySport, generateAthleteReadiness, computePillarCalculations, type PotentielInput, type PotentielResult, computePotentielSignature } from "@/lib/potentielPhysiologiqueEffectif";
/**
 * Staff Briefing - Two For Coaching Lab
 * Module C: Briefing Staff automatique clé en main
 * 
 * Génère un briefing complet pour chaque athlète basé sur:
 * - VLamax effectif, TTE effectif, FTP/kg
 * - Objectif, Sport
 * - Nutrition prédictive + timing (module B)
 * - Potentiel Physiologique, Running Economy
 */

import type { VLamaxEffectif } from "./vlamaxEffectif";
import type { TTEEffectif } from "./tteEffectif";
import type { EnergyDriftResult } from "./energyDrift";
import type { NutritionTimingResult } from "./nutritionTiming";
import type { RunEconomyLabel } from "./runningEconomySnapshot";

// =============================================
// TYPES
// =============================================

export type PriorityLabel = 
  | "Baisser la dépendance glucidique"
  | "Augmenter endurance au seuil (TTE)"
  | "Construire puissance durable"
  | "Consolider / affûter";

export type AlertSeverity = "critical" | "warning" | "info";

export interface BriefingAlert {
  severity: AlertSeverity;
  icon: "🔴" | "🟠" | "🔵";
  message: string;
  action: string;
}

export interface PacingVelo {
  ifRange: string;
  ifMin: number;
  ifMax: number;
  consignes: string[];
}

export interface PacingCAP {
  strategie: string;
  limites: string[];
}

export interface WeekPlanItem {
  seance: string;
  description?: string;
}

export interface StaffBriefing {
  // Métadonnées
  athleteName: string;
  objectif: string;
  sport: "velo" | "cap" | "triathlon";
  generatedAt: string;
  
  // 1) Résumé exécutable (30 sec)
  executiveSummary: {
    template: string;
    priority: PriorityLabel;
    nutritionRisk: string;
    economyLabel: string;
  };
  
  // 2) Pacing vélo
  pacingVelo: PacingVelo | null;
  
  // 3) Pacing CAP
  pacingCAP: PacingCAP | null;
  
  // 4) Nutrition
  nutrition: {
    carbsRange: string;
    phases: { name: string; value: string }[];
    riskBadge: string;
    warning: string | null;
  };
  
  // 5) Alertes prioritaires (top 3)
  alerts: BriefingAlert[];
  
  // 6) Plan mini-semaine
  weekPlan: WeekPlanItem[];
  
  // 7) Checklist course
  checklist: string[];
  
  // Données insuffisantes
  isDataInsufficient: boolean;
  missingFields: string[];
  sportWarning: string | null;
}

export interface ComputeStaffBriefingParams {
  athleteName: string;
  objectif: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  ftpKg: number | null;
  ftp: number | null;
  poids: number | null;
  potentielPhysiologique: PotentielPhysiologiqueEffectif;
  energyDrift: EnergyDriftResult;
  nutritionTiming: NutritionTimingResult;
  economyScore: number | null;
  economyLabel: RunEconomyLabel;
  hasActiveSnapshot: boolean;
}

// =============================================
// CONSTANTES
// =============================================

const IF_RANGES: Record<string, { min: number; max: number }> = {
  IM: { min: 0.68, max: 0.75 },
  Ironman: { min: 0.68, max: 0.75 },
  Ultra: { min: 0.65, max: 0.72 },
  "70.3": { min: 0.78, max: 0.85 },
  "703": { min: 0.78, max: 0.85 },
  Half: { min: 0.78, max: 0.85 },
  Marathon: { min: 0.80, max: 0.88 },
  Semi: { min: 0.85, max: 0.95 },
  Sprint: { min: 0.90, max: 0.98 },
  Olympic: { min: 0.85, max: 0.92 },
};

const LONG_OBJECTIVES = ["IM", "Ironman", "Ultra", "Marathon", "Trail", "TrailLong"];
const CAP_OBJECTIVES = ["Marathon", "Semi", "Trail", "TrailLong", "Course"];

// =============================================
// LOGIQUE MÉTIER
// =============================================

function determineSport(objectif: string): "velo" | "cap" | "triathlon" {
  const obj = objectif.toUpperCase();
  if (obj.includes("IM") || obj.includes("IRONMAN") || obj.includes("70.3") || obj.includes("703") || obj.includes("HALF") || obj.includes("OLYMPIC") || obj.includes("SPRINT")) {
    return "triathlon";
  }
  if (obj.includes("MARATHON") || obj.includes("SEMI") || obj.includes("TRAIL") || obj.includes("COURSE")) {
    return "cap";
  }
  return "velo";
}

function determinePriority(params: {
  vlamax: number | null;
  tteMin: number | null;
  tteTarget: number | null;
  ftpKg: number | null;
  objectif: string;
}): PriorityLabel {
  const { vlamax, tteMin, tteTarget, ftpKg, objectif } = params;
  
  const isLongDistance = LONG_OBJECTIVES.some(o => objectif.toUpperCase().includes(o.toUpperCase()));
  
  // VLamax élevé + objectif long
  if (vlamax !== null && vlamax > 0.65 && isLongDistance) {
    return "Baisser la dépendance glucidique";
  }
  
  // TTE insuffisant
  if (tteMin !== null && tteMin < tteTarget - 5) {
    return "Augmenter endurance au seuil (TTE)";
  }
  
  // FTP/kg faible (cibles approximatives)
  const ftpKgTarget = objectif.toUpperCase().includes("IM") ? 4.6 : 4.5;
  if (ftpKg !== null && ftpKg < ftpKgTarget * 0.85) {
    return "Construire puissance durable";
  }
  
  return "Consolider / affûter";
}

function computePacingVelo(params: {
  objectif: string;
  vlamax: number | null;
  tteMin: number | null;
  tteTarget: number | null;
  potentielPhysiologiqueScore: number;
}): PacingVelo | null {
  const { objectif, vlamax, tteMin, tteTarget, potentielPhysiologiqueScore } = params;
  
  const baseRange = IF_RANGES[objectif] || IF_RANGES["703"];
  let ifMin = baseRange.min;
  let ifMax = baseRange.max;
  
  const consignes: string[] = [];
  
  // Ajustements
  if (vlamax !== null && vlamax > 0.65) {
    ifMin -= 0.02;
    ifMax -= 0.02;
    consignes.push("VLamax élevé → réduire IF de 2%");
  }
  
  if (tteMin !== null && tteMin < tteTarget - 5) {
    ifMin -= 0.02;
    ifMax -= 0.02;
    consignes.push("TTE faible → éviter longues sections au seuil");
  }
  
  if (potentielPhysiologiqueScore < 60) {
    ifMin -= 0.03;
    ifMax -= 0.03;
    consignes.push("Potentiel Physiologique < 60 → pacing conservateur");
  }
  
  // Consignes standards
  consignes.unshift("Démarrage contrôlé (10-20' sous cible)");
  consignes.push("Stabilité: éviter les pics d'intensité");
  consignes.push("Fin: ne pas dépasser la cible sauf feeling excellent");
  
  return {
    ifRange: `${Math.round(ifMin * 100)}–${Math.round(ifMax * 100)}%`,
    ifMin: Math.round(ifMin * 100),
    ifMax: Math.round(ifMax * 100),
    consignes,
  };
}

function computePacingCAP(params: {
  economyScore: number | null;
  energyDriftLevel: string;
}): PacingCAP {
  const { economyScore, energyDriftLevel } = params;
  
  const limites: string[] = [];
  let strategie: string;
  
  if (economyScore !== null && economyScore < 50) {
    strategie = "Pacing conservateur: prioriser régularité, réduire ambition";
    limites.push("Économie fragile → éviter les accélérations");
  } else if (economyScore !== null && economyScore > 70) {
    strategie = "Pacing agressif possible si nutrition OK";
    limites.push("Negative split envisageable");
  } else {
    strategie = "Pacing standard: départ prudent, negative split recommandé";
  }
  
  if (energyDriftLevel === "high") {
    limites.push("⚠️ Risque dérive élevé → cap sur pacing conservateur");
  } else if (energyDriftLevel === "moderate") {
    limites.push("Risque dérive modéré → surveiller le rythme");
  }
  
  return { strategie, limites };
}

function generateAlerts(params: {
  nutritionRiskBadge: string;
  tteMin: number | null;
  tteTarget: number | null;
  vlamax: number | null;
  economyScore: number | null;
  potentielPhysiologiqueScore: number;
  vlamaxConfidence: number;
  tteConfidence: number;
  objectif: string;
}): BriefingAlert[] {
  const { nutritionRiskBadge, tteMin, tteTarget, vlamax, economyScore, potentielPhysiologiqueScore, vlamaxConfidence, tteConfidence, objectif } = params;
  
  const alerts: BriefingAlert[] = [];
  const isLongDistance = LONG_OBJECTIVES.some(o => objectif.toUpperCase().includes(o.toUpperCase()));
  
  // CRITIQUES
  if (nutritionRiskBadge === "HIGH" || nutritionRiskBadge === "Élevé") {
    alerts.push({
      severity: "critical",
      icon: "🔴",
      message: "Risque nutritionnel élevé",
      action: "Tester le protocole nutrition 2× avant la course",
    });
  }
  
  if (tteMin !== null && tteMin < tteTarget - 5) {
    alerts.push({
      severity: "critical",
      icon: "🔴",
      message: "TTE insuffisant",
      action: "Intégrer 1 séance seuil longue / semaine",
    });
  }
  
  if (vlamax !== null && vlamax > 0.70 && isLongDistance) {
    alerts.push({
      severity: "critical",
      icon: "🔴",
      message: "VLamax trop élevé pour objectif long",
      action: "Augmenter volume Z2, réduire glycolytique",
    });
  }
  
  // WARNINGS
  if (economyScore !== null && economyScore < 50) {
    alerts.push({
      severity: "warning",
      icon: "🟠",
      message: "Économie de course fragile",
      action: "Travailler la technique et le relâchement",
    });
  }
  
  if (potentielPhysiologiqueScore < 60) {
    alerts.push({
      severity: "warning",
      icon: "🟠",
      message: "Potentiel Physiologique insuffisant",
      action: "Revoir les paramètres clés avant la course",
    });
  }
  
  if (vlamaxConfidence < 0.6) {
    alerts.push({
      severity: "warning",
      icon: "🟠",
      message: "Confiance VLamax faible",
      action: "Réaliser un test VLamax validé",
    });
  }
  
  if (tteConfidence < 0.6) {
    alerts.push({
      severity: "warning",
      icon: "🟠",
      message: "Confiance TTE faible",
      action: "Mesurer un TTE observé (test ou sortie longue)",
    });
  }
  
  // Trier par gravité et limiter à 3
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return alerts.slice(0, 3);
}

function generateWeekPlan(priority: PriorityLabel, sport: "velo" | "cap" | "triathlon"): WeekPlanItem[] {
  switch (priority) {
    case "Baisser la dépendance glucidique":
      return sport === "cap" 
        ? [
            { seance: "Long Z2 90–150min", description: "Endurance fondamentale" },
            { seance: "Sweet spot 2×30–40min", description: "Tempo contrôlé" },
            { seance: "Nutrition training", description: "60–80 g/h à l'entraînement" },
          ]
        : [
            { seance: "Long Z2 3–5h", description: "Endurance fondamentale vélo" },
            { seance: "Sweet spot long 2×30–40min", description: "Tempo contrôlé" },
            { seance: "Nutrition training", description: "60–80 g/h à l'entraînement" },
          ];
    
    case "Augmenter endurance au seuil (TTE)":
      return [
        { seance: "Seuil 2×20–30min", description: "Construire l'endurance au seuil" },
        { seance: "Over-under 3×12min", description: "Stress métabolique contrôlé" },
        { seance: "Tempo progressif", description: "Sortie avec montée en intensité" },
      ];
    
    case "Construire puissance durable":
      return sport === "cap"
        ? [
            { seance: "Tempo 2×20min", description: "Développer le seuil" },
            { seance: "Fractionné 6×800m", description: "VO2 spécifique CAP" },
            { seance: "Endurance 90–120min", description: "Volume de base" },
          ]
        : [
            { seance: "Sweet spot 3×20min", description: "Développer FTP" },
            { seance: "VO2 4×4min", description: "Puissance aérobie" },
            { seance: "Endurance 2–3h", description: "Volume de base" },
          ];
    
    case "Consolider / affûter":
    default:
      return [
        { seance: "Activation légère", description: "Maintenir les sensations" },
        { seance: "Spécifique court", description: "Rappels d'intensité race pace" },
        { seance: "Récupération active", description: "Favoriser la fraîcheur" },
      ];
  }
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computeStaffBriefing(params: ComputeStaffBriefingParams): StaffBriefing {
  const {
    athleteName,
    objectif,
    vlamaxEffectif,
    tteEffectif,
    ftpKg,
    ftp,
    poids,
    potentielPhysiologique,
    energyDrift,
    nutritionTiming,
    economyScore,
    economyLabel,
    hasActiveSnapshot,
  } = params;
  
  // Déterminer le sport
  const sport = determineSport(objectif);
  
  // Vérification snapshot
  if (!hasActiveSnapshot) {
    return {
      athleteName,
      objectif,
      sport,
      generatedAt: new Date().toISOString(),
      executiveSummary: {
        template: "",
        priority: "Consolider / affûter",
        nutritionRisk: "—",
        economyLabel: "—",
      },
      pacingVelo: null,
      pacingCAP: null,
      nutrition: {
        carbsRange: "—",
        phases: [],
        riskBadge: "—",
        warning: null,
      },
      alerts: [],
      weekPlan: [],
      checklist: [],
      isDataInsufficient: true,
      missingFields: ["Ajoutez un snapshot pour activer le briefing staff."],
      sportWarning: null,
    };
  }
  
  // Vérifier les données manquantes
  const missingFields: string[] = [];
  if (vlamaxEffectif.value === null) missingFields.push("VLamax");
  if (tteEffectif.tte_min === null || tteEffectif.source === "unknown") missingFields.push("TTE");
  if (ftpKg === null && (ftp === null || poids === null)) missingFields.push("FTP/kg");
  
  // Warning sport
  let sportWarning: string | null = null;
  const isCapObjectif = CAP_OBJECTIVES.some(o => objectif.toUpperCase().includes(o.toUpperCase()));
  const isVeloObjectif = objectif.toUpperCase().includes("VELO");
  if (!isCapObjectif && !isVeloObjectif && sport === "triathlon") {
    // OK pour triathlon
  } else if (sport === "cap" && !isCapObjectif) {
    sportWarning = "Sport principal non défini → sélectionnez Vélo/Course pour briefing.";
  }
  
  const vlamax = vlamaxEffectif.value;
  const tteMin = tteEffectif.tte_min;
  const tteTarget = tteEffectif.target ?? 45;
  const vlamaxConf = vlamaxEffectif.confidence;
  const tteConf = tteEffectif.confidence;
  
  // Priorité
  const priority = determinePriority({ vlamax, tteMin, tteTarget, ftpKg, objectif });
  
  // Résumé exécutable
  const economyLabelFr = economyLabel === "excellent" ? "Excellente" 
    : economyLabel === "good" ? "Bonne" 
    : economyLabel === "fragile" ? "Fragile" 
    : "Non évaluée";
  
  const executiveTemplate = `Objectif: ${objectif}. Profil: VLamax ${vlamax?.toFixed(2) ?? "—"} (conf ${Math.round(vlamaxConf * 100)}%), TTE ${tteMin ?? "—"}' (conf ${Math.round(tteConf * 100)}%), FTP/kg ${ftpKg?.toFixed(1) ?? "—"}.
Priorité: ${priority}. Risque nutrition: ${nutritionTiming.riskBadgeLabel}. Économie CAP: ${economyLabelFr}.`;
  
  // Pacing
  const pacingVelo = (sport === "velo" || sport === "triathlon") 
    ? computePacingVelo({ objectif, vlamax, tteMin, tteTarget, potentielPhysiologiqueScore: potentielPhysiologique.score })
    : null;
  
  const pacingCAP = (sport === "cap" || sport === "triathlon")
    ? computePacingCAP({ economyScore, energyDriftLevel: energyDrift.level })
    : null;
  
  // Nutrition (depuis module B)
  const nutritionWarning = nutritionTiming.riskBadge === "HIGH" 
    ? "⚠️ Testez ce protocole à l'entraînement + fractionnez toutes les 10 min."
    : null;
  
  const nutritionPhases = nutritionTiming.phases.map(p => ({
    name: p.label,
    value: p.carbsGh,
  }));
  
  // Alertes
  const alerts = generateAlerts({
    nutritionRiskBadge: nutritionTiming.riskBadge,
    tteMin,
    tteTarget,
    vlamax,
    economyScore,
    potentielPhysiologiqueScore: potentielPhysiologique.score,
    vlamaxConfidence: vlamaxConf,
    tteConfidence: tteConf,
    objectif,
  });
  
  // Plan semaine
  const weekPlan = generateWeekPlan(priority, sport);
  
  // Checklist course
  const checklist = [
    "Plan nutrition testé 2× en conditions réelles",
    "Pacing défini + limites (IF ou allure)",
    "Sodium/hydratation validés",
  ];
  
  return {
    athleteName,
    objectif,
    sport,
    generatedAt: new Date().toISOString(),
    executiveSummary: {
      template: executiveTemplate,
      priority,
      nutritionRisk: nutritionTiming.riskBadgeLabel,
      economyLabel: economyLabelFr,
    },
    pacingVelo,
    pacingCAP,
    nutrition: {
      carbsRange: nutritionTiming.carbsRangeLabel,
      phases: nutritionPhases,
      riskBadge: nutritionTiming.riskBadgeLabel,
      warning: nutritionWarning,
    },
    alerts,
    weekPlan,
    checklist,
    isDataInsufficient: missingFields.length > 0,
    missingFields,
    sportWarning,
  };
}

// =============================================
// HELPERS UI
// =============================================

export function formatBriefingForClipboard(briefing: StaffBriefing): string {
  const lines: string[] = [];
  
  lines.push("═══════════════════════════════════════");
  lines.push(`BRIEFING STAFF – ${briefing.athleteName}`);
  lines.push(`Objectif: ${briefing.objectif} | Sport: ${briefing.sport}`);
  lines.push("═══════════════════════════════════════");
  lines.push("");
  
  // Résumé
  lines.push("📋 RÉSUMÉ EXÉCUTIF");
  lines.push(briefing.executiveSummary.template);
  lines.push("");
  
  // Pacing Vélo
  if (briefing.pacingVelo) {
    lines.push("🚴 PACING VÉLO");
    lines.push(`IF recommandé: ${briefing.pacingVelo.ifRange} FTP`);
    briefing.pacingVelo.consignes.forEach(c => lines.push(`  • ${c}`));
    lines.push("");
  }
  
  // Pacing CAP
  if (briefing.pacingCAP) {
    lines.push("🏃 PACING CAP");
    lines.push(briefing.pacingCAP.strategie);
    briefing.pacingCAP.limites.forEach(l => lines.push(`  • ${l}`));
    lines.push("");
  }
  
  // Nutrition
  lines.push("🍎 NUTRITION");
  lines.push(`Glucides: ${briefing.nutrition.carbsRange}`);
  lines.push(`Timing: ${briefing.nutrition.phases.map(p => `${p.name}: ${p.value}`).join(" | ")}`);
  lines.push(`Risque: ${briefing.nutrition.riskBadge}`);
  if (briefing.nutrition.warning) {
    lines.push(briefing.nutrition.warning);
  }
  lines.push("");
  
  // Alertes
  if (briefing.alerts.length > 0) {
    lines.push("⚠️ ALERTES PRIORITAIRES");
    briefing.alerts.forEach(a => {
      lines.push(`${a.icon} ${a.message}`);
      lines.push(`   → ${a.action}`);
    });
    lines.push("");
  }
  
  // Plan semaine
  lines.push("📅 PLAN MINI-SEMAINE");
  briefing.weekPlan.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.seance}${item.description ? ` (${item.description})` : ""}`);
  });
  lines.push("");
  
  // Checklist
  lines.push("✅ CHECKLIST COURSE");
  briefing.checklist.forEach((item, i) => {
    lines.push(`${i + 1}. ${item}`);
  });
  lines.push("");
  
  lines.push("───────────────────────────────────────");
  lines.push(`Généré par 24C Lab | ${new Date(briefing.generatedAt).toLocaleDateString("fr-FR")}`);
  
  return lines.join("\n");
}
