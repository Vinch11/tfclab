/**
 * Annotation Engine V2
 * Generates precise, actionable staff-grade annotations
 * With riskScore, options, and specific thresholds
 */

import type { TemplateWeek, TemplateSession } from "@/lib/templates/docxTemplateLoader";
import { getTemplateProfiles, getClosestProfile, type TemplateProfile, type TemplateProfilePair } from "@/data/templateProfiles";

// ============= TYPES =============

export type AnnotationScopeV2 = "PLAN" | "WEEK" | "SESSION";
export type SeverityV2 = 0 | 1 | 2 | 3;

export interface AnnotationV2 {
  id: string;
  scope: AnnotationScopeV2;
  weekNumber?: number;
  day?: string;
  sessionTitle?: string;
  severity: SeverityV2;
  riskScore: number; // 0-100
  title: string;
  message: string;
  why: string;
  options: string[];
  confidence: number; // 0-1
}

export interface AthleteSignalsV2 {
  objectif: string;
  sportPrincipal?: string;
  vlamax: { value: number | null; source: string; confidence: number } | null;
  tte: { value: number | null; source: string; confidence: number } | null;
  ftpKg: number | null;
  tss7d: number | null;
  fatigueState?: string | null;
  age?: number | null;
  poids?: number | null;
}

export interface AnnotationEngineV2Params {
  templateId: string;
  athleteSignals: AthleteSignalsV2;
  weeks: TemplateWeek[];
}

export interface SessionClassification {
  sport: string;
  intensityType: "RECOVERY" | "Z2_LONG" | "TEMPO" | "THRESHOLD" | "SPECIFIC" | "VO2" | "SPEED" | "FORCE" | "OTHER";
  isKey: boolean;
  loadTag: "low" | "medium" | "high" | "very_high";
  estimatedDurationMin: number;
  blocTotalMin: number;
}

// ============= SESSION CLASSIFICATION =============

function parseDurationFromText(text: string): number {
  if (!text) return 0;
  
  // Match "2h30", "1h15", etc.
  const hourMinMatch = text.match(/(\d+)h(\d+)?/i);
  if (hourMinMatch) {
    const h = parseInt(hourMinMatch[1], 10);
    const m = hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) : 0;
    return h * 60 + m;
  }
  
  // Match "45'", "30'"
  const minMatch = text.match(/(\d+)['′]/);
  if (minMatch) return parseInt(minMatch[1], 10);
  
  return 0;
}

function estimateBlocDuration(text: string): number {
  if (!text) return 0;
  
  // Match patterns like "3x10'", "2x20", "4x6'", "3x3000m"
  const blocMatch = text.match(/(\d+)\s*x\s*(\d+)['′]?/i);
  if (blocMatch) {
    const reps = parseInt(blocMatch[1], 10);
    const duration = parseInt(blocMatch[2], 10);
    // If duration > 100, it's probably meters not minutes
    if (duration > 100) {
      // Estimate: 1km ~= 4-5min at threshold
      return Math.round(reps * (duration / 1000) * 4.5);
    }
    return reps * duration;
  }
  
  // Match "30' continu", "40' Z3"
  const continuMatch = text.match(/(\d+)['′]\s*(continu|z[3-5])/i);
  if (continuMatch) {
    return parseInt(continuMatch[1], 10);
  }
  
  return 0;
}

export function classifySession(session: TemplateSession): SessionClassification {
  const title = (session.title || "").toLowerCase();
  const details = (session.details || "").toLowerCase();
  const sport = (session.sport || session.discipline || "").toLowerCase();
  const combined = `${title} ${details}`;
  
  let intensityType: SessionClassification["intensityType"] = "OTHER";
  let isKey = false;
  let loadTag: SessionClassification["loadTag"] = "medium";
  
  // Determine sport
  let sportNormalized = "other";
  if (sport.includes("cap") || sport.includes("course") || sport.includes("run")) sportNormalized = "run";
  else if (sport.includes("vélo") || sport.includes("bike") || sport.includes("velo")) sportNormalized = "bike";
  else if (sport.includes("natation") || sport.includes("swim")) sportNormalized = "swim";
  else if (sport.includes("repos") || sport.includes("off")) sportNormalized = "rest";
  
  // Recovery / Rest
  if (combined.includes("repos") || combined.includes("récup") || combined.includes("recovery") || combined.includes("off") || sportNormalized === "rest") {
    intensityType = "RECOVERY";
    loadTag = "low";
  }
  // VO2max / Speed work
  else if (combined.includes("vma") || combined.includes("vo2") || combined.includes("30/30") || combined.includes("30\"") || 
           combined.match(/\d+\s*x\s*(200|300|400|600)m/i) || combined.includes("z6") || combined.includes("z7") ||
           combined.includes("sprint")) {
    intensityType = combined.includes("sprint") || combined.includes("force max") ? "SPEED" : "VO2";
    isKey = true;
    loadTag = "high";
  }
  // Threshold / Tempo / Specific
  else if (combined.includes("seuil") || combined.includes("threshold") || combined.includes("z5") || 
           combined.includes("z4b") || combined.includes("as21") || combined.includes("allure semi")) {
    intensityType = combined.includes("spé") || combined.includes("as21") ? "SPECIFIC" : "THRESHOLD";
    isKey = true;
    loadTag = "high";
  }
  // Tempo (Z3-Z4a)
  else if (combined.includes("tempo") || combined.includes("z3") || combined.includes("z4a") || 
           combined.includes("allure marathon") || combined.includes("as42")) {
    intensityType = "TEMPO";
    isKey = true;
    loadTag = "medium";
  }
  // Z2 Long
  else if (combined.includes("sortie longue") || combined.includes("long") || 
           (combined.includes("z2") && (parseDurationFromText(details) >= 75 || combined.includes("1h30") || combined.includes("1h45") || combined.includes("2h")))) {
    intensityType = "Z2_LONG";
    isKey = true;
    loadTag = "high";
  }
  // Force work
  else if (combined.includes("force") || combined.includes("côte") || combined.includes("50rpm") || 
           combined.includes("60rpm") || combined.includes("low cadence") || combined.includes("gros braquet")) {
    intensityType = "FORCE";
    isKey = true;
    loadTag = "medium";
  }
  // General Z2
  else if (combined.includes("footing") || combined.includes("z2") || combined.includes("z1") || 
           combined.includes("endurance") || combined.includes("cool")) {
    intensityType = "Z2_LONG";
    loadTag = parseDurationFromText(details) >= 60 ? "medium" : "low";
  }
  
  const estimatedDuration = parseDurationFromText(details);
  const blocTotal = estimateBlocDuration(details);
  
  return {
    sport: sportNormalized,
    intensityType,
    isKey,
    loadTag,
    estimatedDurationMin: estimatedDuration,
    blocTotalMin: blocTotal,
  };
}

// ============= ANNOTATION GENERATION =============

function generateId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateTemplateAnnotationsV2(params: AnnotationEngineV2Params): AnnotationV2[] {
  const { templateId, athleteSignals, weeks } = params;
  const annotations: AnnotationV2[] = [];
  
  // Get template profiles
  const profiles = getTemplateProfiles(templateId);
  if (!profiles) {
    return annotations; // No profiles defined for this template
  }
  
  const { vlamax, tte, ftpKg, tss7d, fatigueState, poids } = athleteSignals;
  const vlamaxValue = vlamax?.value ?? null;
  const tteValue = tte?.value ?? null;
  
  // Compute athlete's FTP/kg if possible
  const athleteFtpKg = ftpKg ?? (poids && athleteSignals.objectif ? null : null);
  
  // Determine closest profile
  const profileMatch = getClosestProfile(vlamaxValue, tteValue, athleteFtpKg, profiles);
  
  // ============= PLAN-LEVEL ANNOTATIONS =============
  
  // Rule A: Profile match assessment
  annotations.push({
    id: generateId(),
    scope: "PLAN",
    severity: profileMatch.closest === "PERFORMANCE" ? 1 : 2,
    riskScore: profileMatch.closest === "PERFORMANCE" ? 25 : 55,
    title: `Profil athlète → ${profileMatch.closest === "PERFORMANCE" ? "Compatible Performance" : "Adapté Intermédiaire"}`,
    message: profileMatch.closest === "PERFORMANCE" 
      ? "Le profil actuel correspond aux exigences du plan performance. Surveiller la récupération sur les semaines à haute densité."
      : "Le profil actuel est plus proche du niveau intermédiaire. Des ajustements seront nécessaires pour éviter la surcharge.",
    why: profileMatch.details,
    options: profileMatch.closest === "PERFORMANCE" 
      ? ["Maintenir le volume prévu", "Surveiller dérive FC sur séances spécifiques"]
      : ["Réduire la densité de séances qualité", "Allonger les récupérations inter-blocs", "Envisager 1 semaine de consolidation supplémentaire"],
    confidence: 0.85,
  });
  
  // Rule B: VLamax too high for performance template
  if (vlamaxValue != null && vlamaxValue > profiles.performance.targets.vlamax_max) {
    const excess = vlamaxValue - profiles.performance.targets.vlamax_max;
    const severity: SeverityV2 = excess > 0.15 ? 3 : 2;
    const riskScore = Math.min(95, 60 + Math.round(excess * 200));
    
    annotations.push({
      id: generateId(),
      scope: "PLAN",
      severity,
      riskScore,
      title: "Profil trop glycolytique pour ce plan",
      message: "La dépendance glucidique actuelle risque de compromettre les séances spécifiques longues et la course elle-même.",
      why: `VLamax = ${vlamaxValue.toFixed(2)} mmol/L/s > cible max ${profiles.performance.targets.vlamax_max.toFixed(2)} (source: ${vlamax?.source || "?"}, confiance: ${Math.round((vlamax?.confidence || 0) * 100)}%)`,
      options: [
        "Réduire séances VMA/VO2 courtes en phase 1-2",
        "Ajouter Force basse cadence (côtes longues 2-3min)",
        "Prolonger les sorties Z2 (+15-20%)",
        "Fractionner les séances seuil (3×8' au lieu de 2×12')"
      ],
      confidence: vlamax?.confidence || 0.7,
    });
  }
  
  // Rule C: TTE too low for threshold blocks
  if (tteValue != null && tteValue < profiles.performance.targets.tte_min) {
    const deficit = profiles.performance.targets.tte_min - tteValue;
    const severity: SeverityV2 = deficit > 10 ? 3 : 2;
    const riskScore = Math.min(90, 50 + deficit * 3);
    
    annotations.push({
      id: generateId(),
      scope: "PLAN",
      severity,
      riskScore,
      title: "Durabilité au seuil insuffisante",
      message: "Les séances spécifiques (Z4b, AS21) risquent d'être trop difficiles à maintenir. Risque d'effondrement en course.",
      why: `TTE = ${tteValue.toFixed(0)} min < cible ${profiles.performance.targets.tte_min} min (source: ${tte?.source || "?"}, confiance: ${Math.round((tte?.confidence || 0) * 100)}%)`,
      options: [
        "Prioriser Tempo long (Z3 haut) avant Seuil dur",
        "Fractionner les blocs seuil (4×6' au lieu de 2×12')",
        "Ajouter séances Sweet Spot (Z3/Z4a frontière) 30-40'",
        "Surveiller étroitement dérive FC sur chaque séance clé"
      ],
      confidence: tte?.confidence || 0.7,
    });
  }
  
  // Rule D: High TSS + stress
  if (tss7d != null && tss7d > 600) {
    const riskScore = Math.min(85, 55 + Math.round((tss7d - 600) / 10));
    annotations.push({
      id: generateId(),
      scope: "PLAN",
      severity: 2,
      riskScore,
      title: "Charge actuelle élevée",
      message: "La charge récente (TSS 7j) est déjà élevée. Démarrer ce plan sans période de récupération augmente le risque de surentraînement.",
      why: `TSS 7j = ${tss7d.toFixed(0)}${fatigueState ? ` (état: ${fatigueState})` : ""}`,
      options: [
        "Alléger la semaine 1 de 20-30%",
        "Remplacer une séance qualité par Z2",
        "Surveiller HRV/sommeil quotidiennement"
      ],
      confidence: 0.8,
    });
  }
  
  // ============= WEEK-LEVEL ANNOTATIONS =============
  
  weeks.forEach((week) => {
    const sessionsClassified = week.sessions.map((s) => ({
      session: s,
      classification: classifySession(s),
    }));
    
    const runSessions = sessionsClassified.filter((s) => s.classification.sport === "run");
    const keyRunSessions = runSessions.filter((s) => s.classification.isKey);
    
    const hasLongRun = runSessions.some((s) => s.classification.intensityType === "Z2_LONG" && s.classification.estimatedDurationMin >= 75);
    const hasThreshold = runSessions.some((s) => s.classification.intensityType === "THRESHOLD" || s.classification.intensityType === "SPECIFIC");
    const hasSpeed = runSessions.some((s) => s.classification.intensityType === "VO2" || s.classification.intensityType === "SPEED");
    const vo2Count = runSessions.filter((s) => s.classification.intensityType === "VO2" || s.classification.intensityType === "SPEED").length;
    
    // Rule: Triad CAP risk (Long + Threshold + Speed in same week)
    if (hasLongRun && hasThreshold && hasSpeed) {
      annotations.push({
        id: generateId(),
        scope: "WEEK",
        weekNumber: week.weekNumber,
        severity: 3,
        riskScore: 85,
        title: "Triade CAP à risque",
        message: "Longue sortie + seuil + vitesse dans la même semaine = risque blessure significatif, surtout si TTE faible ou fatigue accumulée.",
        why: `Semaine ${week.weekNumber} contient: sortie longue + séance seuil + séance VO2/vitesse`,
        options: [
          "Déplacer la séance vitesse de 48h (reporter à la semaine suivante)",
          "Alléger la séance seuil (-15% volume)",
          "Transformer la séance vitesse en tempo (Z3 haut)",
          "Réduire la sortie longue de 15min"
        ],
        confidence: 0.9,
      });
    }
    
    // Rule: High VO2 density + high VLamax
    if (vlamaxValue != null && vlamaxValue > 0.55 && vo2Count >= 2) {
      annotations.push({
        id: generateId(),
        scope: "WEEK",
        weekNumber: week.weekNumber,
        severity: 2,
        riskScore: 65,
        title: "Densité VO2 élevée pour profil glycolytique",
        message: "Trop de séances vitesse/VO2 risque de maintenir ou augmenter la dépendance glucidique.",
        why: `VLamax = ${vlamaxValue.toFixed(2)} (>0.55) + ${vo2Count} séances VO2/vitesse cette semaine`,
        options: [
          "Remplacer une séance VO2 par tempo long Z3 (30-40')",
          "Ajouter Force endurance (côtes longues) à la place de vitesse pure",
          "Espacer les séances VO2 de 72h minimum"
        ],
        confidence: 0.8,
      });
    }
    
    // Rule: Week summary - key session count
    const weekRiskLevel = keyRunSessions.length >= 4 ? 3 : keyRunSessions.length >= 3 ? 2 : 1;
    if (keyRunSessions.length >= 3) {
      annotations.push({
        id: generateId(),
        scope: "WEEK",
        weekNumber: week.weekNumber,
        severity: weekRiskLevel as SeverityV2,
        riskScore: 40 + keyRunSessions.length * 12,
        title: `${keyRunSessions.length} séances clés cette semaine`,
        message: "Densité élevée de séances qualité. Récupération et nutrition devront être optimales.",
        why: `${keyRunSessions.length} séances clés CAP: ${keyRunSessions.map(s => s.session.title).join(", ")}`,
        options: [
          "Assurer 48h entre séances clés",
          "Nutrition renforcée (60-90g glucides/h sur séances longues)",
          "Sommeil prioritaire (8h+)"
        ],
        confidence: 0.85,
      });
    }
  });
  
  // ============= SESSION-LEVEL ANNOTATIONS =============
  
  weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      const classification = classifySession(session);
      
      // Rule: Threshold block too long for current TTE
      if (
        (classification.intensityType === "THRESHOLD" || classification.intensityType === "SPECIFIC") &&
        tteValue != null &&
        tteValue < 45 &&
        classification.blocTotalMin >= 30
      ) {
        const riskScore = Math.min(85, 55 + (classification.blocTotalMin - 30) + (45 - tteValue));
        
        annotations.push({
          id: generateId(),
          scope: "SESSION",
          weekNumber: week.weekNumber,
          day: session.day,
          sessionTitle: session.title,
          severity: 2,
          riskScore,
          title: "Bloc seuil long vs TTE actuel",
          message: "Le bloc de travail au seuil est potentiellement trop long pour la durabilité actuelle.",
          why: `TTE = ${tteValue.toFixed(0)} min, bloc total ≈ ${classification.blocTotalMin} min (${session.details?.slice(0, 50) || ""})`,
          options: [
            "Fractionner davantage (ex: 4×8' au lieu de 2×15')",
            "Réduire légèrement l'intensité (Z4a au lieu de Z4b)",
            "Ajouter 30\" de récupération dans chaque bloc"
          ],
          confidence: 0.75,
        });
      }
      
      // Rule: Speed work with high VLamax
      if (
        classification.intensityType === "SPEED" &&
        vlamaxValue != null &&
        vlamaxValue > 0.60
      ) {
        annotations.push({
          id: generateId(),
          scope: "SESSION",
          weekNumber: week.weekNumber,
          day: session.day,
          sessionTitle: session.title,
          severity: 2,
          riskScore: 55,
          title: "Séance vitesse pure sur profil glycolytique",
          message: "Cette séance risque de renforcer la filière glycolytique déjà dominante.",
          why: `VLamax = ${vlamaxValue.toFixed(2)} (élevé) + séance type SPEED`,
          options: [
            "Transformer en côtes longues (2-3min) plutôt que sprints courts",
            "Réduire le nombre de répétitions de 20%",
            "Allonger les récupérations (+50%)"
          ],
          confidence: 0.7,
        });
      }
      
      // Rule: Long run nutrition reminder
      if (
        classification.intensityType === "Z2_LONG" &&
        classification.estimatedDurationMin >= 90 &&
        vlamaxValue != null &&
        vlamaxValue > 0.50
      ) {
        annotations.push({
          id: generateId(),
          scope: "SESSION",
          weekNumber: week.weekNumber,
          day: session.day,
          sessionTitle: session.title,
          severity: 1,
          riskScore: 40,
          title: "Nutrition à sécuriser pour sortie longue",
          message: "Avec le profil glycolytique actuel, cette sortie longue nécessite une nutrition testée et validée.",
          why: `VLamax = ${vlamaxValue.toFixed(2)} → besoin glucidique ↑, durée ≈ ${classification.estimatedDurationMin} min`,
          options: [
            "Tester 60-80g/h glucides",
            "Fractionner prises toutes les 15min",
            "Surveiller signes GI",
            "Prévoir backup nutrition"
          ],
          confidence: 0.8,
        });
      }
    });
  });
  
  // Sort by scope priority: PLAN > WEEK > SESSION, then by weekNumber, then by severity
  annotations.sort((a, b) => {
    const scopeOrder = { PLAN: 0, WEEK: 1, SESSION: 2 };
    if (scopeOrder[a.scope] !== scopeOrder[b.scope]) {
      return scopeOrder[a.scope] - scopeOrder[b.scope];
    }
    if ((a.weekNumber || 0) !== (b.weekNumber || 0)) {
      return (a.weekNumber || 0) - (b.weekNumber || 0);
    }
    return b.severity - a.severity;
  });
  
  return annotations;
}

// ============= UI HELPERS =============

export function getSeverityColorV2(severity: SeverityV2): string {
  switch (severity) {
    case 0: return "bg-muted text-muted-foreground";
    case 1: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case 2: return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case 3: return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    default: return "bg-muted text-muted-foreground";
  }
}

export function getSeverityLabelV2(severity: SeverityV2): string {
  switch (severity) {
    case 0: return "Info";
    case 1: return "Note";
    case 2: return "Attention";
    case 3: return "Risque";
    default: return "Info";
  }
}

export function getRiskScoreColor(riskScore: number): string {
  if (riskScore >= 75) return "text-red-600 dark:text-red-400";
  if (riskScore >= 50) return "text-amber-600 dark:text-amber-400";
  if (riskScore >= 25) return "text-blue-600 dark:text-blue-400";
  return "text-green-600 dark:text-green-400";
}

export function getScopeIcon(scope: AnnotationScopeV2): string {
  switch (scope) {
    case "PLAN": return "📋";
    case "WEEK": return "📅";
    case "SESSION": return "🏃";
    default: return "📝";
  }
}
