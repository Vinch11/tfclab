// =============================================
// AUTO-TAGGING ENGINE - Running Templates
// Two For Coaching Lab - Week Selector TFCL™
// =============================================

import type { 
  RunningWeek, 
  RunningWeekMeta, 
  RunningPhase, 
  WeekFocus,
  InjuryRiskTag,
  RunSessionType,
  RunningSession 
} from "@/types/runningTemplate";
import type { TemplateWeek, TemplateSession } from "@/lib/templates/docxTemplateLoader";

// =============================================
// SESSION TYPE DETECTION
// =============================================

/**
 * Détecte le type de session à partir du texte
 */
export function detectSessionType(session: TemplateSession): RunSessionType {
  const text = `${session.title || ""} ${session.details || ""} ${session.type || ""}`.toLowerCase();
  
  // REST
  if (text.includes("repos") || text.includes("off") || text === "") {
    return "REST";
  }
  
  // RECOVERY
  if (text.includes("récup") || text.includes("recovery") || text.includes("régénération")) {
    return "RECOVERY";
  }
  
  // VO2 / VMA
  if (text.includes("vma") || text.includes("vo2") || 
      text.match(/z5|z6|z7/i) || text.match(/\d+\s*[x×]\s*\d+["']/)) {
    return "VO2";
  }
  
  // THRESHOLD / SEUIL
  if (text.includes("seuil") || text.includes("threshold") || 
      text.match(/z4b?/i) || text.includes("10km") || text.includes("allure semi")) {
    return "THRESHOLD";
  }
  
  // TEMPO
  if (text.includes("tempo") || text.includes("sweet spot") ||
      text.match(/z3|z4a/i) || text.includes("allure marathon")) {
    return "TEMPO";
  }
  
  // HILLS / CÔTES
  if (text.includes("côte") || text.includes("hills") || text.includes("montée") ||
      text.includes("force spé")) {
    return "HILLS";
  }
  
  // SPRINT
  if (text.includes("sprint") || text.includes("vitesse") || 
      text.match(/z7/i) || text.includes("strides") || text.includes("lignes droites")) {
    return "SPRINT";
  }
  
  // LONGRUN
  if (text.includes("long") || text.includes("sortie longue") || 
      text.match(/1h[34]0|1h45|2h|2h00|2h15|2h30/i)) {
    return "LONGRUN";
  }
  
  // Z2 / Endurance
  if (text.match(/z2|z1/i) || text.includes("endurance") || 
      text.includes("footing") || text.includes("fondamental")) {
    return "Z2";
  }
  
  return "Z2"; // Default
}

/**
 * Détecte si c'est une séance clé
 */
export function isKeySession(session: TemplateSession): boolean {
  const text = `${session.title || ""} ${session.details || ""} ${session.notes || ""}`.toLowerCase();
  const type = detectSessionType(session);
  
  // Keywords explicites
  if (text.includes("clé") || text.includes("séance clé") || 
      text.includes("juge de paix") || text.includes("test")) {
    return true;
  }
  
  // Types intrinsèquement clés
  if (["VO2", "THRESHOLD", "LONGRUN", "HILLS"].includes(type)) {
    return true;
  }
  
  return false;
}

/**
 * Parse la durée depuis le texte
 */
function parseDurationFromText(text: string): number {
  if (!text) return 0;
  
  // Match "1h30", "2h00", "1h"
  const hourMinMatch = text.match(/(\d+)h(\d+)?/i);
  if (hourMinMatch) {
    const hours = parseInt(hourMinMatch[1], 10);
    const minutes = hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) : 0;
    return hours * 60 + minutes;
  }
  
  // Match "45'", "50'"
  const minOnlyMatch = text.match(/(\d+)[''′]/);
  if (minOnlyMatch) {
    return parseInt(minOnlyMatch[1], 10);
  }
  
  return 0;
}

// =============================================
// AUTO-TAGGING FUNCTIONS
// =============================================

/**
 * Détecte la phase de la semaine
 */
export function detectPhase(
  weekNumber: number, 
  totalWeeks: number,
  sessions: TemplateSession[]
): RunningPhase {
  const ratio = weekNumber / totalWeeks;
  
  // Analyse du contenu
  const sessionTypes = sessions.map(s => detectSessionType(s));
  const hasVO2 = sessionTypes.some(t => t === "VO2");
  const hasThreshold = sessionTypes.some(t => t === "THRESHOLD");
  const hasLongRun = sessionTypes.some(t => t === "LONGRUN");
  const restCount = sessionTypes.filter(t => t === "REST" || t === "RECOVERY").length;
  const totalDuration = sessions.reduce((acc, s) => {
    const dur = parseDurationFromText(s.details || "");
    return acc + dur;
  }, 0);
  
  // TAPER: dernières semaines, volume réduit
  if (weekNumber > totalWeeks - 2 || (ratio > 0.9 && restCount >= 3)) {
    return "TAPER";
  }
  
  // SPECIFIC: Long run + tempo/allure course
  if (ratio > 0.6 && hasLongRun && (hasThreshold || sessions.some(s => 
    (s.details || "").toLowerCase().includes("allure")))) {
    return "SPECIFIC";
  }
  
  // BUILD: Seuil/VO2 fréquents
  if (ratio > 0.25 && (hasVO2 || hasThreshold)) {
    return "BUILD";
  }
  
  // BASE: Majorité Z2 + technique
  return "BASE";
}

/**
 * Détecte le focus de la semaine
 */
export function detectFocus(sessions: TemplateSession[]): WeekFocus {
  const sessionTypes = sessions.map(s => detectSessionType(s));
  const text = sessions.map(s => `${s.title || ""} ${s.details || ""}`).join(" ").toLowerCase();
  
  // Count types
  const vo2Count = sessionTypes.filter(t => t === "VO2" || t === "SPRINT").length;
  const thresholdCount = sessionTypes.filter(t => t === "THRESHOLD" || t === "TEMPO").length;
  const longRunCount = sessionTypes.filter(t => t === "LONGRUN").length;
  const z2Count = sessionTypes.filter(t => t === "Z2").length;
  
  // SPEED: sprints/VO2 courts
  if (vo2Count >= 2 || text.includes("vitesse") || text.includes("vma courte")) {
    return "SPEED";
  }
  
  // VO2: intervalles VO2max
  if (vo2Count >= 1 && text.match(/\d+\s*[x×]\s*(1'|2'|3')/)) {
    return "VO2";
  }
  
  // TTE: beaucoup tempo/seuil longs
  if (thresholdCount >= 2 || text.match(/(3|4|5)\s*[x×]\s*(8'|10'|12'|15')/)) {
    return "TTE";
  }
  
  // ECONOMY: technique/allure stable
  if (text.includes("technique") || text.includes("gammes") || 
      text.includes("économie") || text.includes("cadence")) {
    return "ECONOMY";
  }
  
  // ENDURANCE: Z2 + long run dominants
  if (z2Count >= 3 || longRunCount >= 1) {
    return "ENDURANCE";
  }
  
  return "ENDURANCE"; // Default
}

/**
 * Calcule le niveau de charge (1-5)
 */
export function computeLoadLevel(sessions: TemplateSession[]): 1 | 2 | 3 | 4 | 5 {
  const totalMinutes = sessions.reduce((acc, s) => {
    return acc + parseDurationFromText(s.details || "");
  }, 0);
  
  const activeSessions = sessions.filter(s => {
    const type = detectSessionType(s);
    return type !== "REST" && type !== "RECOVERY";
  }).length;
  
  // Score combiné durée + nombre de séances
  const score = (totalMinutes / 60) + (activeSessions * 0.5);
  
  if (score <= 4) return 1;
  if (score <= 6) return 2;
  if (score <= 8) return 3;
  if (score <= 10) return 4;
  return 5;
}

/**
 * Calcule la densité d'intensité (1-5)
 */
export function computeIntensityDensity(sessions: TemplateSession[]): 1 | 2 | 3 | 4 | 5 {
  const intenseSessions = sessions.filter(s => {
    const type = detectSessionType(s);
    return ["VO2", "THRESHOLD", "TEMPO", "HILLS", "SPRINT"].includes(type);
  }).length;
  
  if (intenseSessions <= 1) return 1;
  if (intenseSessions === 2) return 2;
  if (intenseSessions === 3) return 3;
  if (intenseSessions === 4) return 4;
  return 5;
}

/**
 * Calcule le niveau du long run (1-5)
 */
export function computeLongrunLevel(sessions: TemplateSession[]): 1 | 2 | 3 | 4 | 5 {
  let maxLongRunDuration = 0;
  
  sessions.forEach(s => {
    const type = detectSessionType(s);
    if (type === "LONGRUN" || (s.title || "").toLowerCase().includes("long")) {
      const duration = parseDurationFromText(s.details || "");
      maxLongRunDuration = Math.max(maxLongRunDuration, duration);
    }
  });
  
  if (maxLongRunDuration <= 60) return 1;
  if (maxLongRunDuration <= 80) return 2;
  if (maxLongRunDuration <= 100) return 3;
  if (maxLongRunDuration <= 120) return 4;
  return 5;
}

/**
 * Calcule le tag de risque blessure
 */
export function computeInjuryRiskTag(
  intensityDensity: number,
  longrunLevel: number
): InjuryRiskTag {
  if (longrunLevel >= 4 && intensityDensity >= 4) {
    return "HIGH";
  }
  if (longrunLevel >= 4 || intensityDensity >= 4) {
    return "MED";
  }
  return "LOW";
}

// =============================================
// MAIN AUTO-TAG FUNCTION
// =============================================

/**
 * Génère les métadonnées auto-taggées pour une semaine
 */
export function autoTagWeek(
  week: TemplateWeek,
  totalWeeks: number
): RunningWeekMeta {
  const sessions = week.sessions;
  
  const loadLevel = computeLoadLevel(sessions);
  const intensityDensity = computeIntensityDensity(sessions);
  const longrunLevel = computeLongrunLevel(sessions);
  
  return {
    phase: detectPhase(week.weekNumber, totalWeeks, sessions),
    focus: detectFocus(sessions),
    load_level: loadLevel,
    intensity_density: intensityDensity,
    longrun_level: longrunLevel,
    injury_risk_tag: computeInjuryRiskTag(intensityDensity, longrunLevel),
    isTagged: false, // Auto-tagged, not validated by coach
  };
}

/**
 * Convertit une TemplateSession en RunningSession
 */
export function convertToRunningSession(session: TemplateSession): RunningSession {
  const type = detectSessionType(session);
  const duration = parseDurationFromText(session.details || "");
  
  // Extract intensity hint from details
  let intensityHint: string | undefined;
  const zoneMatch = (session.details || "").match(/Z\d[ab]?/i);
  if (zoneMatch) {
    intensityHint = zoneMatch[0].toUpperCase();
  }
  
  return {
    sport: "run",
    day: session.day || "",
    title: session.title || session.type || "",
    type,
    isKey: isKeySession(session),
    duration_min: duration,
    intensity_hint: intensityHint,
    notes: session.notes,
    details: session.details,
  };
}

/**
 * Génère un résumé de la semaine
 */
export function generateWeekSummary(meta: RunningWeekMeta): string {
  const phaseLabels: Record<string, string> = {
    BASE: "Construction",
    BUILD: "Développement",
    SPECIFIC: "Spécifique",
    TAPER: "Affûtage"
  };
  
  const focusLabels: Record<string, string> = {
    TTE: "TTE/Seuil",
    VO2: "VO2max",
    ECONOMY: "Économie",
    ENDURANCE: "Endurance",
    SPEED: "Vitesse"
  };
  
  const loadLabels = ["", "Légère", "Modérée", "Moyenne", "Chargée", "Pic de charge"];
  
  return `${phaseLabels[meta.phase]} – ${focusLabels[meta.focus]} (${loadLabels[meta.load_level]})`;
}
