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
  intensityType: 
    // Recovery
    | "RECOVERY" 
    // Endurance long
    | "Z2_LONG" | "Z2_ULTRA_LONG" | "Z2_EASY"
    // Tempo/Threshold
    | "TEMPO" | "TEMPO_LONG_STABLE" | "THRESHOLD" | "SWEET_SPOT_LONG" 
    // Specific pace
    | "SPECIFIC" | "AS_TARGET"
    // Speed/VO2
    | "VO2" | "SPEED" | "INTERVAL_SHORT" | "INTERVAL_LONG"
    // Force
    | "FORCE" | "FORCE_LOW_CADENCE" | "HILLS_FORCE"
    // CAP economy
    | "LONG_RUN" | "LONG_RUN_FAST_FINISH" | "STRIDES_ECONOMY"
    // Brick
    | "BRICK" | "BRICK_ULTRA" 
    // Other
    | "OTHER";
  isKey: boolean;
  loadTag: "low" | "medium" | "high" | "very_high" | "extreme";
  estimatedDurationMin: number;
  blocTotalMin: number;
  isBrick?: boolean;
  fatigueTransfer?: boolean;
  // CAP-specific flags (Dan Lorang)
  mechanicalStress?: boolean; // true for hills, intervals, high impact
  metabolicStress?: boolean; // true for tempo, specific pace
}

// ============= IRONMAN FULL DISTANCE SPECIFIC THRESHOLDS =============

const IMFULL_THRESHOLDS = {
  // VLamax thresholds (stricter than IM Kona)
  vlamax_warning: 0.50,
  vlamax_critical: 0.60,
  // TTE thresholds (higher requirements)
  tte_warning: 50,
  tte_critical: 45,
  tte_redflag: 40, // RED FLAG - risque abandon
  // TSS 7d thresholds - bike
  tss7d_bike_warning: 550,
  tss7d_bike_critical: 650,
  // TSS 7d thresholds - run
  tss7d_run_warning: 350,
  tss7d_run_critical: 420,
  // Duration thresholds
  long_ride_ultra_min: 240, // 4h = Z2_ULTRA_LONG
  long_ride_very_long: 300, // 5h
  long_run_ultra_min: 120, // 2h
  brick_ultra_threshold: 150, // 2h30 total
  brick_excessive_run: 90, // >90min CAP after 4h+ bike = excessive
  // Taper
  taper_week_threshold: 21, // 3-4 weeks taper for full IM
  // Nutrition targets
  nutrition_bike_min: 90, // g/h for perf
  nutrition_bike_max: 120, // g/h for Kona
  nutrition_run_min: 60, // g/h
  nutrition_run_max: 90, // g/h for elite
};

// Legacy IM thresholds (alias for backwards compatibility)
const IM_THRESHOLDS = {
  vlamax_warning: 0.45,
  vlamax_critical: 0.55,
  tte_warning: 50,
  tte_critical: 45,
  tss7d_high: 500,
  long_ride_min_duration: 180, // 3h
  long_run_min_duration: 75,
  brick_key_threshold: 120, // 2h total
  taper_week_threshold: 22, // After week 22 = taper for 24-week plan
};

// ============= SEMI-MARATHON SPECIFIC THRESHOLDS (Dan Lorang) =============

const SEMI_THRESHOLDS = {
  vlamax_warning: 0.70,
  vlamax_critical: 0.80,
  tte_warning: 45,
  tte_critical: 40,
  weekly_volume_km_warning: 90,
  weekly_volume_km_critical: 110,
  long_run_max: 120, // 2h max
  intensity_sessions_max: 2, // max 2 intensity sessions/week
  mechanical_sessions_warning: 2, // 2+ mechanical stress sessions = warning
  economy_score_good: 70,
  economy_score_ok: 55,
  taper_week_threshold: 10, // For 12-week plan
};

// ============= MARATHON SPECIFIC THRESHOLDS (Dan Lorang) =============

const MARATHON_THRESHOLDS = {
  vlamax_warning: 0.60,
  vlamax_critical: 0.75,
  tte_warning: 50,
  tte_critical: 45,
  tss7d_warning: 450,
  tss7d_critical: 550,
  weekly_volume_km_warning: 90,
  weekly_volume_km_critical: 110,
  weekly_volume_km_elite: 140,
  long_run_key_duration: 90, // 1h30
  long_run_very_long: 150, // 2h30
  long_run_max_frequency: 1, // max 1 very long run per week
  as42_bloc_warning: 40, // 40min total AS42
  intensity_sessions_max: 2, // max 2 intensity sessions/week for non-elite
  mechanical_sessions_warning: 2,
  run_economy_good: 75,
  run_economy_ok: 55,
  taper_week_threshold: 22, // After week 22 = taper for 24-week plan
};

// Marathon ELITE thresholds (stricter)
const MARATHON_ELITE_THRESHOLDS = {
  vlamax_warning: 0.50,
  vlamax_critical: 0.60,
  tte_warning: 55,
  tte_critical: 50,
  economy_score_min: 85,
};

// ============= IRONMAN 70.3 SPECIFIC THRESHOLDS =============

const IM703_THRESHOLDS = {
  vlamax_warning: 0.50,
  vlamax_critical: 0.60,
  tte_warning: 45,
  tte_critical: 40,
  tss7d_bike_warning: 450,
  tss7d_bike_critical: 550,
  tss7d_run_warning: 300,
  tss7d_run_critical: 380,
  long_ride_min_duration: 150, // 2h30
  long_ride_key_duration: 180, // 3h
  as703_run_bloc_warning: 40, // 40min allure 703
  brick_min_duration: 120, // 2h
  taper_week_threshold: 21, // After week 21 = taper for 24-week plan (3 weeks)
  nutrition_bike_min: 80, // g/h
  nutrition_run_min: 50, // g/h
};

/**
 * Check if template is IM Full type (Ironman full distance - not 70.3)
 */
function isIMFullTemplate(templateId: string): boolean {
  const id = templateId.toLowerCase();
  // Ironman full but NOT 70.3
  return (id.includes("kona") || id.includes("ironman-full") || id.includes("imfull") || id.includes("elite") ||
         (id.includes("im") && !id.includes("703") && !id.includes("70.3"))) || 
         (id.includes("ironman") && !id.includes("703") && !id.includes("70.3"));
}

/**
 * Check if template is Kona/Elite level (highest tier)
 */
function isKonaTemplate(templateId: string): boolean {
  const id = templateId.toLowerCase();
  return id.includes("kona") || id.includes("elite");
}

/**
 * Check if template is IM/Kona type (full Ironman distance) - LEGACY ALIAS
 */
function isIMTemplate(templateId: string): boolean {
  return isIMFullTemplate(templateId);
}

/**
 * Check if template is Semi-Marathon type
 */
function isSemiTemplate(templateId: string): boolean {
  const id = templateId.toLowerCase();
  return id.includes("semi") || id.includes("21k") || id.includes("21.1");
}

/**
 * Check if template is Marathon type (full marathon, not semi)
 */
function isMarathonTemplate(templateId: string): boolean {
  const id = templateId.toLowerCase();
  return (id.includes("marathon") && !id.includes("semi")) || id.includes("42k") || id.includes("42.195");
}

/**
 * Check if template is any CAP pure type (Semi or Marathon)
 */
function isCAPTemplate(templateId: string): boolean {
  return isSemiTemplate(templateId) || isMarathonTemplate(templateId);
}

/**
 * Check if template is Ironman 70.3 type
 */
function is703Template(templateId: string): boolean {
  const id = templateId.toLowerCase();
  return id.includes("703") || id.includes("70.3");
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

// Patterns robustes pour détecter les séances de repos
const REST_SESSION_PATTERNS = [
  /^\s*off\s*$/i,                           // Titre exactement "OFF"
  /\brepos\s*(complet|total|actif)?\b/i,    // "repos", "repos complet", etc.
  /\brest\s*(day)?\b/i,                     // "rest", "rest day"
  /\bjour\s+(de\s+)?repos\b/i,              // "jour de repos", "jour repos"
  /\brécup(ération)?\s*(complète|passive|active)?\b/i,  // "récup", "récupération"
  /\brecovery\b/i,                          // "recovery"
];

function isRestOrRecoverySession(session: TemplateSession): boolean {
  const title = (session.title || "").trim();
  const details = (session.details || "").trim();
  const description = (session.description || "").trim();
  const sport = (session.sport || session.discipline || "").toLowerCase();
  
  // Check if title is exactly "OFF" (case insensitive)
  if (/^\s*off\s*$/i.test(title)) return true;
  
  // Check sport field for rest indicators
  if (sport.includes("repos") || sport.includes("off") || sport.includes("rest")) return true;
  
  // Check all text fields against patterns
  const textToCheck = `${title} ${details} ${description}`;
  return REST_SESSION_PATTERNS.some(pattern => pattern.test(textToCheck));
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
  else if (sport.includes("brick") || sport.includes("enchaînement") || sport.includes("enchainement")) sportNormalized = "brick";
  
  const estimatedDuration = parseDurationFromText(details);
  
  // Recovery / Rest - Use robust detection first
  if (isRestOrRecoverySession(session) || sportNormalized === "rest") {
    intensityType = "RECOVERY";
    loadTag = "low";
  }
  // BRICK ULTRA (IM Full specific - bike 4h+ + run)
  else if ((sportNormalized === "brick" || combined.includes("brick") || combined.includes("enchaînement")) && 
           (estimatedDuration >= IMFULL_THRESHOLDS.brick_ultra_threshold || combined.includes("long brick") || combined.includes("ultra"))) {
    intensityType = "BRICK_ULTRA";
    isKey = true;
    loadTag = "extreme";
  }
  // Brick sessions (IM specific)
  else if (sportNormalized === "brick" || combined.includes("brick") || combined.includes("enchaînement") || 
           (combined.includes("vélo") && combined.includes("cap"))) {
    intensityType = "BRICK";
    isKey = true;
    loadTag = estimatedDuration >= 180 ? "very_high" : "high";
  }
  // Force Low Cadence (IM specific)
  else if (combined.includes("50rpm") || combined.includes("55rpm") || combined.includes("60rpm") || 
           combined.includes("low cadence") || combined.includes("basse cadence") || 
           combined.includes("gros braquet") || combined.includes("big gear")) {
    intensityType = "FORCE_LOW_CADENCE";
    isKey = true;
    loadTag = "medium";
  }
  // Marathon-specific: AS42, allure marathon, MP
  else if (combined.includes("as42") || combined.includes("allure marathon") || combined.includes("marathon pace") || 
           combined.includes("mp") || combined.includes("allure 42")) {
    intensityType = "SPECIFIC";
    isKey = true;
    loadTag = estimatedDuration >= 60 ? "very_high" : "high";
  }
  // Marathon-specific: AS21, semi pace, seuil haut
  else if (combined.includes("as21") || combined.includes("semi pace") || combined.includes("allure semi") ||
           combined.includes("seuil haut") || combined.includes("half pace")) {
    intensityType = "THRESHOLD";
    isKey = true;
    loadTag = "high";
  }
  // Marathon-specific: Strides, lignes droites, drills (low risk speed)
  else if (combined.includes("strides") || combined.includes("lignes droites") || combined.includes("technique") ||
           combined.includes("drills") || combined.includes("gammes") || combined.includes("éducatif")) {
    intensityType = "SPEED";
    isKey = false; // Low risk speed work
    loadTag = "low";
  }
  // IM Specific pace work
  else if (combined.includes("im pace") || combined.includes("allure im") || combined.includes("race pace") ||
           combined.includes("allure ironman") || combined.includes("steady") || combined.includes("allure course")) {
    intensityType = "SPECIFIC";
    isKey = true;
    loadTag = estimatedDuration >= 120 ? "very_high" : "high";
  }
  // CAP: Hills/Force (high mechanical stress)
  else if ((sportNormalized === "run" && (combined.includes("côte") || combined.includes("hill") || combined.includes("montée"))) ||
           combined.includes("hills force") || combined.includes("force côte")) {
    intensityType = "HILLS_FORCE";
    isKey = true;
    loadTag = "high";
  }
  // CAP: Short intervals (high mechanical stress) - 200m, 400m, etc.
  else if (sportNormalized === "run" && combined.match(/\d+\s*x\s*(100|200|300|400|500)m/i)) {
    intensityType = "INTERVAL_SHORT";
    isKey = true;
    loadTag = "high";
  }
  // CAP: Long intervals - 800m, 1000m, 1600m, 2000m
  else if (sportNormalized === "run" && combined.match(/\d+\s*x\s*(800|1000|1200|1600|2000)m/i)) {
    intensityType = "INTERVAL_LONG";
    isKey = true;
    loadTag = "high";
  }
  // CAP: Long run with fast finish
  else if (sportNormalized === "run" && (combined.includes("fast finish") || combined.includes("finish rapide") || 
           combined.includes("progressif") || combined.includes("negative split"))) {
    intensityType = "LONG_RUN_FAST_FINISH";
    isKey = true;
    loadTag = "very_high";
  }
  // VO2max / Speed work (VMA, 400m, 1000m, etc.)
  else if (combined.includes("vma") || combined.includes("vo2") || combined.includes("30/30") || combined.includes("30\"") || 
           combined.match(/\d+\s*x\s*(200|300|400|600|1000)m/i) || combined.includes("z6") || combined.includes("z7") ||
           combined.includes("sprint") || combined.includes("piste")) {
    intensityType = combined.includes("sprint") || combined.includes("force max") ? "SPEED" : "VO2";
    isKey = true;
    loadTag = "high";
  }
  // Threshold / Tempo / Specific
  else if (combined.includes("seuil") || combined.includes("threshold") || combined.includes("z5") || 
           combined.includes("z4b")) {
    intensityType = "THRESHOLD";
    isKey = true;
    loadTag = "high";
  }
  // Sweet Spot Long (IM Full specific)
  else if (combined.includes("sweet spot") || combined.includes("sweetspot") || 
           (combined.includes("z3") && combined.includes("z4") && estimatedDuration >= 30)) {
    intensityType = "SWEET_SPOT_LONG";
    isKey = true;
    loadTag = estimatedDuration >= 45 ? "high" : "medium";
  }
  // Tempo Long Stable (IM Full specific)
  else if ((combined.includes("tempo") && (combined.includes("long") || combined.includes("stable") || estimatedDuration >= 40)) ||
           combined.includes("tempo long stable")) {
    intensityType = "TEMPO_LONG_STABLE";
    isKey = true;
    loadTag = estimatedDuration >= 60 ? "high" : "medium";
  }
  // Tempo (Z3-Z4a)
  else if (combined.includes("tempo") || combined.includes("z3") || combined.includes("z4a")) {
    intensityType = "TEMPO";
    isKey = true;
    loadTag = "medium";
  }
  // Z2 Ultra Long (IM Full specific - 4h+ bike, 2h+ run)
  else if ((sportNormalized === "bike" && estimatedDuration >= IMFULL_THRESHOLDS.long_ride_ultra_min) ||
           (sportNormalized === "run" && estimatedDuration >= IMFULL_THRESHOLDS.long_run_ultra_min) ||
           combined.includes("ultra") || combined.match(/[5-7]h/)) {
    intensityType = "Z2_ULTRA_LONG";
    isKey = true;
    loadTag = estimatedDuration >= 300 ? "extreme" : "very_high";
  }
  // Long Run detection (SL, sortie longue, 2h, 2h30, 3h)
  else if ((sportNormalized === "run" && estimatedDuration >= 90) ||
           combined.includes("sortie longue") || combined.includes("sl") || combined.includes("long run") ||
           combined.match(/[2-3]h[0-3]?[0-9]?/) || combined.includes("2h") || combined.includes("2h30") || combined.includes("3h")) {
    intensityType = "Z2_LONG";
    isKey = estimatedDuration >= 90;
    loadTag = estimatedDuration >= 150 ? "very_high" : estimatedDuration >= 90 ? "high" : "medium";
  }
  // Long Ride (IM specific - 4h+, 5h, 6h)
  else if ((sportNormalized === "bike" && estimatedDuration >= 180) || 
           combined.includes("long ride") || combined.includes("sortie longue vélo") ||
           combined.match(/[4-7]h/)) {
    intensityType = "Z2_LONG";
    isKey = true;
    loadTag = estimatedDuration >= 240 ? "very_high" : "high";
  }
  // Z2 Long
  else if (combined.includes("sortie longue") || combined.includes("long") || 
           (combined.includes("z2") && (estimatedDuration >= 75 || combined.includes("1h30") || combined.includes("1h45") || combined.includes("2h")))) {
    intensityType = "Z2_LONG";
    isKey = estimatedDuration >= 75;
    loadTag = estimatedDuration >= 120 ? "high" : "medium";
  }
  // Force work (general)
  else if (combined.includes("force") || combined.includes("côte") || combined.includes("hill")) {
    intensityType = "FORCE";
    isKey = true;
    loadTag = "medium";
  }
  // Z2 Long
  else if (combined.includes("sortie longue") || combined.includes("long") || 
           (combined.includes("z2") && (estimatedDuration >= 75 || combined.includes("1h30") || combined.includes("1h45") || combined.includes("2h")))) {
    intensityType = "Z2_LONG";
    isKey = estimatedDuration >= 75;
    loadTag = estimatedDuration >= 120 ? "high" : "medium";
  }
  // Force work (general)
  else if (combined.includes("force") || combined.includes("côte") || combined.includes("hill")) {
    intensityType = "FORCE";
    isKey = true;
    loadTag = "medium";
  }
  // General Z2
  else if (combined.includes("footing") || combined.includes("z2") || combined.includes("z1") || 
           combined.includes("endurance") || combined.includes("cool")) {
    intensityType = "Z2_LONG";
    loadTag = estimatedDuration >= 60 ? "medium" : "low";
  }
  
  const blocTotal = estimateBlocDuration(details);
  
  // Determine CAP-specific flags (Dan Lorang methodology)
  const mechanicalStressTypes: SessionClassification["intensityType"][] = [
    "HILLS_FORCE", "INTERVAL_SHORT", "INTERVAL_LONG", "VO2", "SPEED", "FORCE"
  ];
  const metabolicStressTypes: SessionClassification["intensityType"][] = [
    "TEMPO", "TEMPO_LONG_STABLE", "THRESHOLD", "SPECIFIC", "AS_TARGET", "LONG_RUN_FAST_FINISH"
  ];
  
  const mechanicalStress = mechanicalStressTypes.includes(intensityType) || 
                          combined.includes("côte") || combined.includes("hill") ||
                          combined.includes("intervalle") || combined.includes("sprint");
  const metabolicStress = metabolicStressTypes.includes(intensityType) ||
                         combined.includes("tempo") || combined.includes("seuil") ||
                         combined.includes("allure");
  
  return {
    sport: sportNormalized,
    intensityType,
    isKey,
    loadTag,
    estimatedDurationMin: estimatedDuration,
    blocTotalMin: blocTotal,
    mechanicalStress,
    metabolicStress,
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
  
  // ============= IRONMAN FULL DISTANCE SPECIFIC PLAN ANNOTATIONS =============
  
  const isIMFull = isIMFullTemplate(templateId);
  const isKona = isKonaTemplate(templateId);
  const age = athleteSignals.age;
  const totalWeeks = weeks.length;
  
  if (isIMFull) {
    // IM-PLAN-1: VLamax incompatible pour Ironman Full
    if (vlamaxValue != null && vlamaxValue > IMFULL_THRESHOLDS.vlamax_warning) {
      const isCritical = vlamaxValue > IMFULL_THRESHOLDS.vlamax_critical;
      const severity: SeverityV2 = isCritical ? 3 : 2;
      const riskScore = isCritical ? 95 : 80;
      
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity,
        riskScore,
        title: isCritical ? "Profil métabolique INCOMPATIBLE Ironman" : "VLamax élevé pour Ironman Full",
        message: isCritical 
          ? "VLamax beaucoup trop élevé pour un Ironman Full. Le coût glucidique sera excessif sur 8-17h. Risque DNF très élevé."
          : "Risque de dépendance glucidique élevé sur une durée de 8-17h. La gestion énergétique sera le facteur limitant.",
        why: `VLamax = ${vlamaxValue.toFixed(2)} mmol/L/s > seuil IM ${IMFULL_THRESHOLDS.vlamax_warning} (${isCritical ? "CRITIQUE >0.60" : "Warning"}). Cible perf IM: 0.25-0.40.`,
        options: [
          "Supprimer toutes séances VO2/sprints en phase spécifique",
          "Renforcer Z2 ultra-long (4h+ vélo) + force basse cadence (50-60 rpm)",
          "Ajouter séances fasted Z2 (1-2h) pour oxydation lipidique",
          "Nutrition obligatoire: 90-110 g/h vélo testé + 60-75 g/h CAP"
        ],
        confidence: vlamax?.confidence || 0.85,
      });
    }
    
    // IM-PLAN-2: TTE critique pour Ironman Full
    if (tteValue != null && tteValue < IMFULL_THRESHOLDS.tte_warning) {
      const isCritical = tteValue < IMFULL_THRESHOLDS.tte_critical;
      const isRedFlag = tteValue < IMFULL_THRESHOLDS.tte_redflag;
      const severity: SeverityV2 = isRedFlag ? 3 : isCritical ? 3 : 2;
      const riskScore = isRedFlag ? 98 : isCritical ? 90 : 75;
      
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity,
        riskScore,
        title: isRedFlag ? "TTE RED FLAG - Risque abandon IM" : "Durabilité insuffisante pour Ironman",
        message: isRedFlag 
          ? "TTE extrêmement bas. Impossible de maintenir l'allure stable sur 180km vélo + marathon. Risque d'abandon très élevé."
          : "TTE trop bas → difficulté à tenir l'intensité stable sur 180km vélo et à alimenter correctement sur le marathon.",
        why: `TTE = ${tteValue.toFixed(0)} min < seuil IM ${IMFULL_THRESHOLDS.tte_warning} min (${isRedFlag ? "RED FLAG <40" : isCritical ? "CRITIQUE <45" : "Warning"}). Cible IM perf: ≥55 min, Kona: ≥60 min.`,
        options: [
          "Remplacer toutes séances VO2 par TEMPO_LONG_STABLE / SWEET_SPOT_LONG (30-60')",
          "Allonger progressivement blocs steady sur vélo (2×45' → 2×60' → 2×75')",
          "Intégrer blocs IM pace vélo: 2×60' puis 2×90'",
          "Ajouter 2 semaines de consolidation avant phase spécifique"
        ],
        confidence: tte?.confidence || 0.85,
      });
    }
    
    // IM-PLAN-3: Trop de CAP vs vélo
    const bikeKeyCount = weeks.reduce((count, week) => {
      return count + week.sessions.filter(s => {
        const c = classifySession(s);
        return c.sport === "bike" && c.isKey;
      }).length;
    }, 0);
    
    const runKeyCount = weeks.reduce((count, week) => {
      return count + week.sessions.filter(s => {
        const c = classifySession(s);
        return c.sport === "run" && c.isKey;
      }).length;
    }, 0);
    
    if (runKeyCount > bikeKeyCount * 0.8) {
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity: 2,
        riskScore: 65,
        title: "CAP trop agressive pour Ironman Full",
        message: "Le vélo conditionne la CAP en Ironman. Un Ironman se GAGNE sur le vélo, se PERD sur la CAP.",
        why: `Séances clés CAP (${runKeyCount}) ≈ Séances clés vélo (${bikeKeyCount}). Le vélo doit largement dominer.`,
        options: [
          "Alléger CAP qualité (max 1 séance seuil/semaine)",
          "Transférer le stress vers le vélo (tempo long, sweet spot)",
          "CAP = préserver les jambes, pas accumuler fatigue",
          "Prioriser bricks Z2 CAP plutôt que CAP seuil isolée"
        ],
        confidence: 0.8,
      });
    }
    
    // IM-NUTRI-1: Nutrition vélo critique
    if ((vlamaxValue != null && vlamaxValue > IMFULL_THRESHOLDS.vlamax_warning) || (tteValue != null && tteValue < IMFULL_THRESHOLDS.tte_critical)) {
      const severity: SeverityV2 = (vlamaxValue ?? 0) > IMFULL_THRESHOLDS.vlamax_critical ? 3 : 2;
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity,
        riskScore: severity === 3 ? 85 : 70,
        title: "Besoin nutritionnel vélo CRITIQUE pour IM",
        message: "Risque de déplétion glycogène majeur. La nutrition vélo conditionne la survie sur le marathon.",
        why: `VLamax=${vlamaxValue?.toFixed(2) ?? "?"} / TTE=${tteValue?.toFixed(0) ?? "?"} → besoin glucidique très élevé sur 5-7h de vélo.`,
        options: [
          "Objectif: 90-120 g/h vélo (selon tolérance) - OBLIGATOIRE",
          "Fractionnement strict: toutes les 10-15 min",
          "Validation digestive sur 3-4 sorties longues (4h+) avant course",
          "Plan B si intolérance: réduire intensité vélo immédiatement"
        ],
        confidence: 0.9,
      });
    }
    
    // IM-NUTRI-2: Nutrition CAP sous-estimée
    annotations.push({
      id: generateId(),
      scope: "PLAN",
      severity: 2,
      riskScore: 60,
      title: "Nutrition CAP post-vélo critique",
      message: "Effondrement probable après 25-30km si nutrition insuffisante. L'estomac est sensibilisé après 5-7h de vélo.",
      why: "IM = marathon après 180km vélo. Réserves épuisées + stress GI élevé.",
      options: [
        "Objectif: 60-90 g/h CAP (selon profil et tolérance)",
        "Formats liquides/gels légers (éviter solides sauf tolérance prouvée)",
        "Gel T2 + prise toutes les 15-20min sur marathon",
        "Tester sur chaque brick long (vélo 4h+ + CAP 1h+)"
      ],
      confidence: 0.85,
    });
    
    // IM-AGE-1: Athlète master Ironman
    if (age != null && age >= 40) {
      const isHighRiskAge = age >= 50;
      const severity: SeverityV2 = (tss7d != null && tss7d > IMFULL_THRESHOLDS.tss7d_bike_warning) ? 3 : isHighRiskAge ? 2 : 1;
      
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity,
        riskScore: severity === 3 ? 75 : severity === 2 ? 60 : 50,
        title: "Athlète master Ironman: vigilance récupération",
        message: "Avec l'âge, la tolérance aux blocs ultra-longs et la récupération diminuent. Sur IM, la fraîcheur le jour J prime sur le volume.",
        why: `Âge = ${age} ans → risque musculo-tendineux ↑ ; récupération plus lente ; capacité glycolytique peut augmenter.`,
        options: [
          "Ajouter 1-2 jours Z2 easy ou repos supplémentaire / semaine",
          "Réduire densité séances qualité CAP (max 1/semaine en phase spécifique)",
          "Favoriser vélo indoor pour réduire contraintes mécaniques",
          "Surveillance HRV/fatigue quotidienne obligatoire"
        ],
        confidence: 0.85,
      });
    }
    
    // Kona-specific: profil ultra-strict
    if (isKona) {
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity: 1,
        riskScore: 40,
        title: "Niveau Kona/Elite: exigences maximales",
        message: "Ce profil vise les performances Kona-level. Les marges d'erreur sont quasi nulles. Priorité: cohérence physiologique parfaite.",
        why: `Template Kona/Elite → VLamax cible: 0.20-0.35, TTE cible: ≥60min, FTP/kg: ≥4.8.`,
        options: [
          "Chaque séance compte: 0 séance ratée, 0 improvisation",
          "Nutrition parfaitement calibrée: 100-120 g/h vélo, 70-90 g/h CAP",
          "Taper optimal: 4 semaines progressives, pas de stress final",
          "Récupération sacrée: sommeil 8h+, HRV stable"
        ],
        confidence: 0.9,
      });
    }
  }
  
  // Legacy alias for isIM (for backwards compatibility with existing code)
  const isIM = isIMFull;
  
  // ============= MARATHON SPECIFIC PLAN ANNOTATIONS =============
  
  const isMarathon = isMarathonTemplate(templateId);
  const runEconomyScore = (athleteSignals as any).runEconomyScore ?? null;
  
  if (isMarathon) {
    // MAR-PLAN-1: Check if template is CAP-dominant
    const bikeSwimKeyCount = weeks.reduce((count, week) => {
      return count + week.sessions.filter(s => {
        const c = classifySession(s);
        return (c.sport === "bike" || c.sport === "swim") && c.isKey;
      }).length;
    }, 0);
    
    if (bikeSwimKeyCount > 3) {
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity: 2,
        riskScore: 55,
        title: "Template Marathon doit rester CAP dominant",
        message: "Le marathon est une épreuve CAP pure: la qualité doit être prioritairement en course à pied.",
        why: `${bikeSwimKeyCount} séances clés vélo/natation détectées dans le plan.`,
        options: [
          "Remplacer qualité bike/swim par CAP tempo/seuil",
          "Conserver bike uniquement en Z2 récupération active",
          "Réserver natation pour récupération/mobilité"
        ],
        confidence: 0.75,
      });
    }
    
    // MAR-PLAN-2: VLamax trop haut pour marathon
    if (vlamaxValue != null && vlamaxValue > MARATHON_THRESHOLDS.vlamax_warning) {
      const isCritical = vlamaxValue > MARATHON_THRESHOLDS.vlamax_critical;
      const severity: SeverityV2 = isCritical ? 3 : 2;
      const riskScore = isCritical ? 90 : 70;
      
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity,
        riskScore,
        title: "Profil trop glycolytique pour marathon",
        message: "VLamax élevé → dépendance glucidique importante. Risque de 'mur' augmenté significativement.",
        why: `VLamax = ${vlamaxValue.toFixed(2)} > seuil marathon ${MARATHON_THRESHOLDS.vlamax_warning} (${isCritical ? "CRITIQUE >0.60" : "Warning"}). Cible perf: 0.30-0.45.`,
        options: [
          "Augmenter volume Z2 longue + tempo bas (Z3)",
          "Limiter séances VO2/vitesse denses",
          "Sécuriser nutrition (60-80g/h testé en sortie longue)",
          "Ajouter côtes longues (2-3min) pour oxydation lipidique"
        ],
        confidence: vlamax?.confidence || 0.8,
      });
    }
    
    // MAR-PLAN-3: Durabilité insuffisante
    if (tteValue != null && tteValue < MARATHON_THRESHOLDS.tte_warning) {
      const isCritical = tteValue < MARATHON_THRESHOLDS.tte_critical;
      const severity: SeverityV2 = isCritical ? 3 : 2;
      const riskScore = isCritical ? 85 : 65;
      
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity,
        riskScore,
        title: "Durabilité insuffisante pour marathon",
        message: "Le plan devient risqué si l'athlète ne tient pas longtemps proche du seuil. Effondrement probable après 25-30km.",
        why: `TTE = ${tteValue.toFixed(0)} min < seuil marathon ${MARATHON_THRESHOLDS.tte_warning} (${isCritical ? "CRITIQUE <40" : "Warning"}). Cible: ≥50min.`,
        options: [
          "Allonger tempo long (Z3 haut, 30-45')",
          "Fractionner les séances spécifiques AS42",
          "Ajouter 1 semaine consolidation toutes les 3 semaines",
          "Prioriser régularité sur intensité"
        ],
        confidence: tte?.confidence || 0.8,
      });
    }
    
    // MAR-ECONOMY-1: Économie de course insuffisante
    if (runEconomyScore != null && runEconomyScore < MARATHON_THRESHOLDS.run_economy_ok) {
      const severity: SeverityV2 = runEconomyScore < 40 ? 3 : 2;
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity,
        riskScore: 75,
        title: "Économie CAP fragile",
        message: "La performance marathon dépend fortement du coût énergétique. Une économie faible augmente la consommation glucidique.",
        why: `Économie score = ${runEconomyScore} (<55 = insuffisant). Score cible perf: ≥75.`,
        options: [
          "Réduire densité séances spécifiques hautes",
          "Ajouter travail technique/strides régulier",
          "Renforcer endurance stable (régularité pace)",
          "Travailler cadence course (180+ pas/min)"
        ],
        confidence: 0.75,
      });
    }
    
    // MAR-NUTRI-1: Nutrition marathon réaliste
    if (vlamaxValue != null && vlamaxValue > MARATHON_THRESHOLDS.vlamax_warning) {
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity: 2,
        riskScore: 70,
        title: "Nutrition marathon = facteur limitant",
        message: "Besoin glucidique élevé mais tolérance CAP limitée (estomac secoué). Stratégie à tester absolument.",
        why: `VLamax = ${vlamaxValue.toFixed(2)} → consommation glycogène ↑. Durée marathon = risque 'mur' élevé.`,
        options: [
          "Tester 60-80 g/h à l'entraînement (sorties longues)",
          "Fractionner prises toutes les 10-15min (gels/boisson)",
          "Tester plusieurs marques/types de gels",
          "Prévoir plan B si GI issues (réduire intensité)"
        ],
        confidence: 0.8,
      });
    }
    
    // MAR-AGE-1: Athlète master - priorité mécanique CAP
    if (age != null && age >= 40) {
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity: 1,
        riskScore: 50,
        title: "Athlète master: priorité mécanique",
        message: "Le risque tendineux/musculaire augmente avec l'âge en CAP. La charge mécanique doit être gérée attentivement.",
        why: `Âge = ${age} ans → tendons/muscles plus fragiles ; récupération plus lente.`,
        options: [
          "Limiter 3 séances 'dures' CAP dans la même semaine",
          "Ajouter renfo/PPG 2-3x/semaine",
          "Favoriser surfaces souples (herbe, piste, sentier)",
          "Surveillance fatigue quotidienne"
        ],
        confidence: 0.8,
      });
    }
    
    // MAR-TSS-1: Charge CAP élevée
    if (tss7d != null && tss7d > MARATHON_THRESHOLDS.tss7d_warning) {
      const isCritical = tss7d > MARATHON_THRESHOLDS.tss7d_critical;
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity: isCritical ? 3 : 2,
        riskScore: isCritical ? 80 : 60,
        title: "Charge CAP actuelle élevée",
        message: "La charge mécanique CAP est déjà élevée. Attention au risque blessure.",
        why: `TSS 7j = ${tss7d.toFixed(0)} > seuil ${MARATHON_THRESHOLDS.tss7d_warning} (${isCritical ? "CRITIQUE" : "Warning"}).`,
        options: [
          "Réduire volume semaine 1 de 20-30%",
          "Privilégier cross-training (vélo/natation) 1-2x/semaine",
          "Surveiller douleurs tendineuses (Achille, rotule, fascia)"
        ],
        confidence: 0.8,
      });
    }
  }
  
  // ============= SEMI-MARATHON SPECIFIC PLAN ANNOTATIONS (Dan Lorang) =============
  
  const isSemi = isSemiTemplate(templateId);
  
  if (isSemi) {
    // SEMI-PLAN-1: VLamax trop élevé pour semi
    if (vlamaxValue != null && vlamaxValue > SEMI_THRESHOLDS.vlamax_warning) {
      const isCritical = vlamaxValue > SEMI_THRESHOLDS.vlamax_critical;
      const severity: SeverityV2 = isCritical ? 3 : 2;
      const riskScore = isCritical ? 85 : 65;
      
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity,
        riskScore,
        title: "Profil trop glycolytique pour semi-marathon",
        message: "VLamax élevé → risque de surconsommation glucidique sur 1h20-2h d'effort au seuil.",
        why: `VLamax = ${vlamaxValue.toFixed(2)} > seuil semi ${SEMI_THRESHOLDS.vlamax_warning} (${isCritical ? "CRITIQUE" : "Warning"}). Cible perf: 0.40-0.65.`,
        options: [
          "Réduire intervalles courts (200-400m)",
          "Augmenter volume Z2 stable",
          "Ajouter tempo long stable (30-40')",
          "Limiter VMA à 1x/semaine max"
        ],
        confidence: vlamax?.confidence || 0.8,
      });
    }
    
    // SEMI-PLAN-2: TTE insuffisant pour semi
    if (tteValue != null && tteValue < SEMI_THRESHOLDS.tte_warning) {
      const isCritical = tteValue < SEMI_THRESHOLDS.tte_critical;
      const severity: SeverityV2 = isCritical ? 3 : 2;
      const riskScore = isCritical ? 85 : 65;
      
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity,
        riskScore,
        title: "Durabilité insuffisante pour semi-marathon",
        message: "TTE trop bas → impossible de tenir l'allure cible sur toute la distance. Effondrement probable après 15km.",
        why: `TTE = ${tteValue.toFixed(0)} min < seuil semi ${SEMI_THRESHOLDS.tte_warning} (${isCritical ? "CRITIQUE <40" : "Warning"}). Cible: ≥45min.`,
        options: [
          "Allonger les blocs tempo (25-35')",
          "Ajouter long run spécifique avec finish AS21",
          "Supprimer intensité secondaire (VO2 court)",
          "Prioriser régularité sur intensité"
        ],
        confidence: tte?.confidence || 0.8,
      });
    }
    
    // SEMI-INT-1: Trop d'intensité
    const intensitySessions = weeks.reduce((count, week) => {
      return count + week.sessions.filter(s => {
        const c = classifySession(s);
        return c.isKey && (c.intensityType === "VO2" || c.intensityType === "SPEED" || 
               c.intensityType === "INTERVAL_SHORT" || c.intensityType === "INTERVAL_LONG" ||
               c.intensityType === "THRESHOLD");
      }).length;
    }, 0);
    
    const avgIntensityPerWeek = intensitySessions / Math.max(weeks.length, 1);
    
    if (avgIntensityPerWeek > SEMI_THRESHOLDS.intensity_sessions_max) {
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity: 2,
        riskScore: 60,
        title: "Intensité excessive pour semi-marathon",
        message: "L'économie de course se dégrade sous fatigue chronique. Plus de qualité ≠ plus de performance.",
        why: `Moyenne ${avgIntensityPerWeek.toFixed(1)} séances intensité/semaine > max recommandé (${SEMI_THRESHOLDS.intensity_sessions_max}).`,
        options: [
          "Réduire VMA/intervalles courts",
          "Favoriser allure cible AS21",
          "Transformer VO2 en tempo long",
          "Max 2 séances intensité/semaine"
        ],
        confidence: 0.8,
      });
    }
    
    // SEMI-AGE-1: Athlète Master semi
    if (age != null && age >= 40) {
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity: 2,
        riskScore: 55,
        title: "Profil master – vigilance mécanique",
        message: "Tolérance mécanique réduite avec l'âge. L'intensité doit être espacée et la récupération renforcée.",
        why: `Âge = ${age} ans → tendons/muscles plus vulnérables ; récupération allongée.`,
        options: [
          "Espacer intensité de 72h minimum",
          "Augmenter jours récupération active",
          "Renfo/PPG 2-3x/semaine obligatoire",
          "Favoriser surfaces souples"
        ],
        confidence: 0.8,
      });
    }
  }

  // ============= IRONMAN 70.3 SPECIFIC PLAN ANNOTATIONS =============
  
  const is703 = is703Template(templateId);
  
  if (is703) {
    // 703-PLAN-1: Check bike dominance (vélo doit primer sur CAP)
    const bikeKeyCount = weeks.reduce((count, week) => {
      return count + week.sessions.filter(s => {
        const c = classifySession(s);
        return c.sport === "bike" && c.isKey;
      }).length;
    }, 0);
    
    const runKeyCount = weeks.reduce((count, week) => {
      return count + week.sessions.filter(s => {
        const c = classifySession(s);
        return c.sport === "run" && c.isKey;
      }).length;
    }, 0);
    
    if (runKeyCount > bikeKeyCount) {
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity: 2,
        riskScore: 60,
        title: "Priorité vélo insuffisante pour 70.3",
        message: "En 70.3, la performance CAP dépend fortement du vélo. Le vélo doit avoir la priorité en termes de séances clés.",
        why: `Séances clés CAP (${runKeyCount}) > Séances clés vélo (${bikeKeyCount}). Le rapport devrait être inversé.`,
        options: [
          "Alléger CAP, renforcer tempo/seuil vélo",
          "Transférer intensité vers le vélo",
          "CAP = préserver jambes post-vélo, pas accumuler fatigue"
        ],
        confidence: 0.8,
      });
    }
    
    // 703-PLAN-2: VLamax trop élevé pour 70.3
    if (vlamaxValue != null && vlamaxValue > IM703_THRESHOLDS.vlamax_warning) {
      const isCritical = vlamaxValue > IM703_THRESHOLDS.vlamax_critical;
      const severity: SeverityV2 = isCritical ? 3 : 2;
      const riskScore = isCritical ? 85 : 70;
      
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity,
        riskScore,
        title: "Profil trop glycolytique pour 70.3",
        message: "VLamax élevé → coût glucidique élevé, baisse de durabilité sur les 4-6h de course.",
        why: `VLamax = ${vlamaxValue.toFixed(2)} > seuil 70.3 ${IM703_THRESHOLDS.vlamax_warning} (${isCritical ? "CRITIQUE" : "Warning"}). Cible perf: 0.28-0.45.`,
        options: [
          "Augmenter volume Z2 vélo long",
          "Ajouter force basse cadence (50-60 rpm)",
          "Limiter VO2 non spécifique",
          "Renforcer nutrition: 80-100 g/h vélo"
        ],
        confidence: vlamax?.confidence || 0.8,
      });
    }
    
    // 703-PLAN-3: TTE insuffisant pour 70.3
    if (tteValue != null && tteValue < IM703_THRESHOLDS.tte_warning) {
      const isCritical = tteValue < IM703_THRESHOLDS.tte_critical;
      const severity: SeverityV2 = isCritical ? 3 : 2;
      const riskScore = isCritical ? 85 : 65;
      
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity,
        riskScore,
        title: "Durabilité insuffisante pour 70.3",
        message: "Difficile de tenir l'allure course longtemps avec ce TTE. Risque d'effondrement sur le semi après vélo.",
        why: `TTE = ${tteValue.toFixed(0)} min < seuil 70.3 ${IM703_THRESHOLDS.tte_warning} (${isCritical ? "CRITIQUE" : "Warning"}). Cible: ≥50min.`,
        options: [
          "Tempo vélo long (30-45' Z3 haut)",
          "Seuil stable prolongé sur vélo",
          "Bricks progressifs avec focus durabilité",
          "Réduire VO2, augmenter sweet spot"
        ],
        confidence: tte?.confidence || 0.8,
      });
    }
    
    // 703-NUTRI-1: Nutrition vélo sous-estimée
    if (vlamaxValue != null && vlamaxValue > IM703_THRESHOLDS.vlamax_warning) {
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity: 2,
        riskScore: 70,
        title: "Besoin glucidique vélo élevé pour 70.3",
        message: "Risque d'hypoglycémie sur le run si nutrition vélo insuffisante.",
        why: `VLamax = ${vlamaxValue.toFixed(2)} → dépendance glucidique ↑. Objectif: 80-100 g/h vélo.`,
        options: [
          "Tester 80-100 g/h vélo à l'entraînement",
          "Fractionner toutes les 10-15 min",
          "Valider tolérance digestive sur long rides",
          "Prévoir backup nutrition (gels de secours)"
        ],
        confidence: 0.85,
      });
    }
    
    // 703-NUTRI-2: Nutrition CAP post-vélo
    annotations.push({
      id: generateId(),
      scope: "PLAN",
      severity: 1,
      riskScore: 50,
      title: "Nutrition CAP post-vélo critique",
      message: "La transition vélo→CAP est très exigeante. La nutrition CAP doit être testée sur bricks.",
      why: "70.3 = semi marathon après 90km vélo. L'estomac est sensibilisé.",
      options: [
        "Tester 50-70 g/h CAP post-vélo",
        "Privilégier formats liquides/gels légers",
        "Réduire intensité nutrition si GI issues",
        "Valider timing: gel T2 puis toutes les 15-20min"
      ],
      confidence: 0.8,
    });
    
    // 703-AGE-1: Athlète master
    if (age != null && age >= 40) {
      annotations.push({
        id: generateId(),
        scope: "PLAN",
        severity: 1,
        riskScore: 50,
        title: "Athlète master 70.3: vigilance récupération",
        message: "Accumulation vélo + CAP augmente le risque blessure. Prioriser récupération.",
        why: `Âge = ${age} ans → récupération plus lente ; tendons/muscles plus fragiles.`,
        options: [
          "Limiter bricks durs à 1/semaine max",
          "Plus de Z2 récupération entre séances clés",
          "Favoriser vélo indoor pour réduire contraintes",
          "Surveillance HRV/fatigue"
        ],
        confidence: 0.8,
      });
    }
  }
  
  // ============= WEEK-LEVEL ANNOTATIONS =============
  
  weeks.forEach((week) => {
    const sessionsClassified = week.sessions.map((s) => ({
      session: s,
      classification: classifySession(s),
    }));
    
    const runSessions = sessionsClassified.filter((s) => s.classification.sport === "run");
    const bikeSessions = sessionsClassified.filter((s) => s.classification.sport === "bike");
    const brickSessions = sessionsClassified.filter((s) => s.classification.sport === "brick" || s.classification.intensityType === "BRICK" || s.classification.intensityType === "BRICK_ULTRA");
    const keyRunSessions = runSessions.filter((s) => s.classification.isKey);
    
    const hasLongRun = runSessions.some((s) => s.classification.intensityType === "Z2_LONG" && s.classification.estimatedDurationMin >= 75);
    const hasUltraLongRun = runSessions.some((s) => s.classification.intensityType === "Z2_ULTRA_LONG" || s.classification.estimatedDurationMin >= IMFULL_THRESHOLDS.long_run_ultra_min);
    const hasLongRide = bikeSessions.some((s) => s.classification.estimatedDurationMin >= IM_THRESHOLDS.long_ride_min_duration);
    const hasUltraLongRide = bikeSessions.some((s) => s.classification.intensityType === "Z2_ULTRA_LONG" || s.classification.estimatedDurationMin >= IMFULL_THRESHOLDS.long_ride_ultra_min);
    const hasBrick = brickSessions.length > 0 || sessionsClassified.some(s => s.classification.intensityType === "BRICK");
    const hasBrickUltra = sessionsClassified.some(s => s.classification.intensityType === "BRICK_ULTRA");
    const hasThreshold = runSessions.some((s) => s.classification.intensityType === "THRESHOLD" || s.classification.intensityType === "SPECIFIC");
    const hasTempoRun = runSessions.some((s) => s.classification.intensityType === "TEMPO" || s.classification.intensityType === "TEMPO_LONG_STABLE");
    const hasSpeed = runSessions.some((s) => s.classification.intensityType === "VO2" || s.classification.intensityType === "SPEED");
    const vo2Count = runSessions.filter((s) => s.classification.intensityType === "VO2" || s.classification.intensityType === "SPEED").length;
    
    // ============= IRONMAN FULL WEEK-LEVEL ANNOTATIONS =============
    
    if (isIMFull) {
      // IM-WEEK-1: Semaine à risque extrême (long bike 5h+ + brick long + tempo CAP)
      const hasUltraStress = hasUltraLongRide || hasBrickUltra || hasUltraLongRun;
      const imFullKeyCount = [hasUltraLongRide || hasLongRide, hasBrick || hasBrickUltra, hasLongRun || hasUltraLongRun, hasTempoRun || hasThreshold].filter(Boolean).length;
      const isHighLoadIMFull = tss7d != null && tss7d > IMFULL_THRESHOLDS.tss7d_bike_warning;
      const isCriticalLoadIMFull = tss7d != null && tss7d > IMFULL_THRESHOLDS.tss7d_bike_critical;
      
      if ((hasUltraStress && imFullKeyCount >= 2) || (imFullKeyCount >= 3 && isHighLoadIMFull) || isCriticalLoadIMFull) {
        const severity: SeverityV2 = isCriticalLoadIMFull || (hasUltraStress && hasBrickUltra) ? 3 : 2;
        annotations.push({
          id: generateId(),
          scope: "WEEK",
          weekNumber: week.weekNumber,
          severity,
          riskScore: severity === 3 ? 95 : 85,
          title: "Semaine IM Full à RISQUE MAJEUR",
          message: "Accumulation de stress irréversible. Cette semaine peut compromettre tout le plan si mal gérée.",
          why: `Semaine ${week.weekNumber}: ${hasUltraLongRide ? "Ultra Long Ride (5h+) ✓" : hasLongRide ? "Long Ride (4h+) ✓" : ""} ${hasBrickUltra ? "Brick Ultra ✓" : hasBrick ? "Brick ✓" : ""} ${hasTempoRun ? "Tempo CAP ✓" : ""} ${isHighLoadIMFull ? `+ TSS élevé (${tss7d?.toFixed(0)})` : ""}`,
          options: [
            "Conserver UNIQUEMENT le long bike - c'est la priorité #1",
            "Alléger toute la CAP de la semaine (Z2 uniquement)",
            "Supprimer toute intensité secondaire",
            "Insérer 48h de repos complet après brick"
          ],
          confidence: 0.95,
        });
      }
      
      // IM-BRICK-1: Brick mal calibré (CAP >90min après vélo 4h+)
      const brickUltraSessions = sessionsClassified.filter(s => s.classification.intensityType === "BRICK_ULTRA");
      if (brickUltraSessions.length > 0) {
        const brickSession = brickUltraSessions[0];
        const estimatedRunAfterBike = brickSession.classification.estimatedDurationMin - IMFULL_THRESHOLDS.long_ride_ultra_min;
        
        if (estimatedRunAfterBike > IMFULL_THRESHOLDS.brick_excessive_run) {
          annotations.push({
            id: generateId(),
            scope: "WEEK",
            weekNumber: week.weekNumber,
            severity: 3,
            riskScore: 90,
            title: "Brick EXCESSIF - CAP trop longue après vélo long",
            message: "Risque de blessure et dette métabolique majeure. La CAP post-vélo 4h+ doit rester courte.",
            why: `Brick avec CAP estimée ≈${estimatedRunAfterBike}min après vélo ultra-long. Maximum recommandé: 60-75min.`,
            options: [
              "Limiter CAP brick à max 60min Z2",
              "Fractionner: brick court + CAP séparée 24h après",
              "Z2 uniquement sur la CAP, pas d'intensité",
              "Reporter le brick ultra si fatigue semaine précédente"
            ],
            confidence: 0.9,
          });
        }
      }
      
      // IM-TAPER-1: Affûtage mal calibré (3-4 dernières semaines)
      const isTaperWeekIMFull = week.weekNumber > totalWeeks - 4 || (totalWeeks >= 20 && week.weekNumber > IMFULL_THRESHOLDS.taper_week_threshold);
      
      if (isTaperWeekIMFull) {
        const longSessionsInTaper = sessionsClassified.filter(s => s.classification.estimatedDurationMin > 120);
        const thresholdBlocksInTaper = sessionsClassified.filter(s => 
          (s.classification.intensityType === "THRESHOLD" || s.classification.intensityType === "SPECIFIC") &&
          s.classification.blocTotalMin > 15
        );
        
        if (longSessionsInTaper.length >= 2 || thresholdBlocksInTaper.length >= 2) {
          annotations.push({
            id: generateId(),
            scope: "WEEK",
            weekNumber: week.weekNumber,
            severity: 2,
            riskScore: 70,
            title: "Affûtage IM: volume trop haut",
            message: "La fraîcheur CONDITIONNE la performance IM. Les dernières semaines = repos + rappels uniquement.",
            why: `Semaine ${week.weekNumber} (taper): ${longSessionsInTaper.length} séance(s) >2h + ${thresholdBlocksInTaper.length} bloc(s) seuil`,
            options: [
              "Réduction progressive: -30% S-3, -50% S-2, -70% S-1",
              "Max 1h30 vélo, max 45min run dernières semaines",
              "Intensité uniquement en rappels courts (10-15' Z4)",
              "Priorité absolue: sommeil 8h+, nutrition parfaite, stress 0"
            ],
            confidence: 0.9,
          });
        }
      }
    }
    
    // Legacy IM rules (for backwards compatibility)
    if (isIM && !isIMFull) {
      const imKeyCount = [hasLongRide, hasBrick, hasLongRun].filter(Boolean).length;
      const isHighLoad = tss7d != null && tss7d > IM_THRESHOLDS.tss7d_high;
      
      if (imKeyCount >= 2 && (isHighLoad || imKeyCount === 3)) {
        annotations.push({
          id: generateId(),
          scope: "WEEK",
          weekNumber: week.weekNumber,
          severity: 3,
          riskScore: 85,
          title: "Semaine très agressive IM (risque blessure/fatigue)",
          message: "Accumulation de stress spécifique IM dans une même semaine. Risque élevé de surentraînement ou blessure.",
          why: `Semaine ${week.weekNumber}: ${hasLongRide ? "Long Ride (3h+) ✓" : ""} ${hasBrick ? "Brick ✓" : ""} ${hasLongRun ? "Long Run ✓" : ""} ${isHighLoad ? `+ TSS 7j élevé (${tss7d?.toFixed(0)})` : ""}`,
          options: [
            "Alléger la CAP (durée ou intensité) autour du brick",
            "Garder long ride, mais raccourcir long run de 20-30%",
            "Insérer 24-48h recovery supplémentaire entre blocs",
            "Reporter une séance clé à la semaine suivante"
          ],
          confidence: 0.9,
        });
      }
    }
    
    // ============= MARATHON WEEK-LEVEL ANNOTATIONS =============
    
    if (isMarathon) {
      // MAR-WEEK-1: Triade CAP à risque blessure (Long + Threshold + Speed)
      const isHighLoad = tss7d != null && tss7d > MARATHON_THRESHOLDS.tss7d_warning;
      const estimatedFatigueWeek = keyRunSessions.length >= 4 ? 8 : keyRunSessions.length >= 3 ? 7 : 5;
      
      if (hasLongRun && hasThreshold && hasSpeed && (isHighLoad || estimatedFatigueWeek >= 7)) {
        annotations.push({
          id: generateId(),
          scope: "WEEK",
          weekNumber: week.weekNumber,
          severity: 3,
          riskScore: 85,
          title: "Risque blessure CAP élevé (triade)",
          message: "Long + seuil + vitesse sous charge haute. Combinaison dangereuse pour tendons/muscles.",
          why: `Semaine ${week.weekNumber}: Long Run + Seuil + Vitesse ${isHighLoad ? `+ TSS 7j élevé (${tss7d?.toFixed(0)})` : ""}`,
          options: [
            "Conserver long run, alléger la vitesse (strides courts uniquement)",
            "Remplacer VO2 par tempo (Z3 haut)",
            "Insérer journée recovery + réduire volume total",
            "Espacer séances clés de 72h minimum"
          ],
          confidence: 0.9,
        });
      }
      
      // MAR-WEEK-2: Long run trop agressif pour profil fragile
      const veryLongRun = runSessions.find(s => 
        s.classification.intensityType === "Z2_LONG" && 
        s.classification.estimatedDurationMin >= MARATHON_THRESHOLDS.long_run_very_long
      );
      
      if (veryLongRun && (tteValue != null && tteValue < 45 || vlamaxValue != null && vlamaxValue > 0.55)) {
        annotations.push({
          id: generateId(),
          scope: "WEEK",
          weekNumber: week.weekNumber,
          severity: 2,
          riskScore: 70,
          title: "Sortie longue agressive pour profil actuel",
          message: "Long run très coûteux métaboliquement pour ce profil. Risque de fatigue excessive.",
          why: `Long run ≈${veryLongRun.classification.estimatedDurationMin}min + TTE=${tteValue?.toFixed(0) ?? "?"} + VLamax=${vlamaxValue?.toFixed(2) ?? "?"}`,
          options: [
            "Réduire durée de 10-20%",
            "Fractionner allure marathon (blocs plus courts)",
            "Prioriser régularité plutôt qu'allure",
            "Bien tester nutrition pendant la sortie"
          ],
          confidence: 0.8,
        });
      }
      
      // MAR-TAPER-1: Dernières semaines = réduire volume, garder rappels
      const isMarathonTaperWeek = week.weekNumber > totalWeeks - 2 || (totalWeeks >= 20 && week.weekNumber > MARATHON_THRESHOLDS.taper_week_threshold);
      
      if (isMarathonTaperWeek) {
        const longRunsInTaper = runSessions.filter(s => s.classification.estimatedDurationMin > 90);
        const thresholdBlocksInTaper = runSessions.filter(s => 
          (s.classification.intensityType === "THRESHOLD" || s.classification.intensityType === "SPECIFIC") &&
          s.classification.blocTotalMin > 20
        );
        
        if (longRunsInTaper.length >= 1 || thresholdBlocksInTaper.length >= 2) {
          annotations.push({
            id: generateId(),
            scope: "WEEK",
            weekNumber: week.weekNumber,
            severity: 2,
            riskScore: 65,
            title: "Affûtage marathon: volume trop haut",
            message: "Le taper vise fraîcheur + rappels courts. Réduire la charge mécanique CAP.",
            why: `Semaine ${week.weekNumber} (taper): ${longRunsInTaper.length} long run >1h30 + ${thresholdBlocksInTaper.length} bloc(s) seuil`,
            options: [
              "Raccourcir long run (max 1h)",
              "Garder intensité en rappels courts (strides + tempo 10-15')",
              "Priorité: sommeil, nutrition, hydratation, mobilité",
              "Éviter nouvelles chaussures/surfaces"
            ],
            confidence: 0.85,
          });
        }
      }
    }
    
    // ============= IRONMAN 70.3 WEEK-LEVEL ANNOTATIONS =============
    
    if (is703) {
      const hasLongRide703 = bikeSessions.some(s => s.classification.estimatedDurationMin >= IM703_THRESHOLDS.long_ride_min_duration);
      const hasBrickIntense = brickSessions.some(s => 
        s.classification.estimatedDurationMin >= IM703_THRESHOLDS.brick_min_duration ||
        s.classification.loadTag === "high" || s.classification.loadTag === "very_high"
      );
      const hasVO2Session = sessionsClassified.some(s => s.classification.intensityType === "VO2" && s.classification.isKey);
      
      // 703-WEEK-1: Semaine trop agressive (Long bike + Brick intense + VO2)
      const key703Count = [hasLongRide703, hasBrickIntense, hasVO2Session].filter(Boolean).length;
      const isHighLoad703 = tss7d != null && tss7d > IM703_THRESHOLDS.tss7d_bike_warning;
      
      if (key703Count >= 2 && (isHighLoad703 || key703Count === 3)) {
        annotations.push({
          id: generateId(),
          scope: "WEEK",
          weekNumber: week.weekNumber,
          severity: 3,
          riskScore: 85,
          title: "Semaine 70.3 à risque de surmenage",
          message: "Accumulation de stress métabolique: long vélo + brick + VO2. Risque fatigue/blessure.",
          why: `Semaine ${week.weekNumber}: ${hasLongRide703 ? "Long Bike (2h30+) ✓" : ""} ${hasBrickIntense ? "Brick intense ✓" : ""} ${hasVO2Session ? "VO2 ✓" : ""} ${isHighLoad703 ? `+ TSS élevé (${tss7d?.toFixed(0)})` : ""}`,
          options: [
            "Conserver long bike, alléger brick (Z2 run)",
            "Reporter VO2 à la semaine suivante",
            "Réduire volume brick de 20%",
            "Insérer jour recovery entre blocs"
          ],
          confidence: 0.9,
        });
      }
      
      // 703-WEEK-2: Brick mal positionné (après VO2 ou force)
      const vo2OrForceSessions = sessionsClassified.filter(s => 
        s.classification.intensityType === "VO2" || 
        s.classification.intensityType === "FORCE" ||
        s.classification.intensityType === "FORCE_LOW_CADENCE"
      );
      
      if (hasBrickIntense && vo2OrForceSessions.length >= 1) {
        // Check if brick is day after hard session (simplified check)
        annotations.push({
          id: generateId(),
          scope: "WEEK",
          weekNumber: week.weekNumber,
          severity: 2,
          riskScore: 60,
          title: "Brick potentiellement mal positionné",
          message: "Brick placé la même semaine que séance vélo VO2/Force intense. Qualité CAP peut être compromise.",
          why: `Semaine ${week.weekNumber}: Brick + séances vélo intenses (${vo2OrForceSessions.map(s => s.session.title).join(", ")})`,
          options: [
            "Brick après tempo/seuil plutôt qu'après VO2/force",
            "CAP du brick en Z2 uniquement",
            "Espacer brick et séances intenses de 48h min",
            "Réduire volume du brick"
          ],
          confidence: 0.75,
        });
      }
      
      // 703-TAPER-1: Taper mal calibré (3 dernières semaines)
      const is703TaperWeek = week.weekNumber > totalWeeks - 3 || (totalWeeks >= 20 && week.weekNumber > IM703_THRESHOLDS.taper_week_threshold);
      
      if (is703TaperWeek) {
        const longSessions703Taper = sessionsClassified.filter(s => s.classification.estimatedDurationMin > 120);
        const keySessions703Taper = sessionsClassified.filter(s => s.classification.isKey && s.classification.loadTag === "high");
        
        if (longSessions703Taper.length >= 2 || keySessions703Taper.length >= 3) {
          annotations.push({
            id: generateId(),
            scope: "WEEK",
            weekNumber: week.weekNumber,
            severity: 2,
            riskScore: 65,
            title: "Affûtage 70.3 trop chargé",
            message: "La fraîcheur conditionne la performance. Réduire volume, conserver rappels courts.",
            why: `Semaine ${week.weekNumber} (taper): ${longSessions703Taper.length} séances >2h + ${keySessions703Taper.length} séances clés intenses`,
            options: [
              "Réduire volume de 30-50%",
              "Conserver rappels courts (10-15' seuil max)",
              "Max 1 brick court (1h) avec CAP Z2",
              "Priorité: sommeil, nutrition, récupération"
            ],
            confidence: 0.85,
          });
        }
      }
    }
    
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
        title: `${keyRunSessions.length} séances clés CAP cette semaine`,
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
    const isTaperWeek = isIM && (week.weekNumber > totalWeeks - 2 || (totalWeeks >= 20 && week.weekNumber > IM_THRESHOLDS.taper_week_threshold));
    
    // Count key sessions this week for fatigue estimation
    const weekKeyCount = week.sessions.filter(s => classifySession(s).isKey).length;
    const estimatedFatigue = weekKeyCount >= 4 ? 8 : weekKeyCount >= 3 ? 7 : weekKeyCount >= 2 ? 5 : 3;
    
    week.sessions.forEach((session) => {
      const classification = classifySession(session);
      
      // IM-SESSION-1: Long ride spécifique trop intense pour VLamax haut
      if (
        isIM &&
        classification.sport === "bike" &&
        classification.intensityType === "SPECIFIC" &&
        vlamaxValue != null &&
        vlamaxValue > IM_THRESHOLDS.vlamax_critical &&
        classification.blocTotalMin >= 60
      ) {
        annotations.push({
          id: generateId(),
          scope: "SESSION",
          weekNumber: week.weekNumber,
          day: session.day,
          sessionTitle: session.title,
          severity: 2,
          riskScore: 70,
          title: "Bloc spécifique long coûteux en glycogène",
          message: "Avec VLamax élevé, ce bloc spécifique de 60min+ augmente fortement la dépense glucidique et le risque de déplétion.",
          why: `VLamax = ${vlamaxValue.toFixed(2)} (>0.55) + bloc spécifique ≈${classification.blocTotalMin} min`,
          options: [
            "Fractionner blocs (ex: 3×20' au lieu de 1×60')",
            "Rester sous l'allure IM (Z4a) au lieu du seuil Z4b",
            "Tester fueling 90-100 g/h pendant la séance",
            "Réduire le bloc à 45' max"
          ],
          confidence: 0.75,
        });
      }
      
      // IM-SESSION-2: Low cadence mal placé sous fatigue
      if (
        isIM &&
        classification.intensityType === "FORCE_LOW_CADENCE" &&
        estimatedFatigue >= 7
      ) {
        annotations.push({
          id: generateId(),
          scope: "SESSION",
          weekNumber: week.weekNumber,
          day: session.day,
          sessionTitle: session.title,
          severity: 2,
          riskScore: 65,
          title: "Force basse cadence sous fatigue élevée",
          message: "Le cardio peut sembler bas mais la contrainte musculaire est très élevée. Risque tendon/genou/lombaires.",
          why: `Force low cadence = stress périphérique intense. Semaine dense (${weekKeyCount} séances clés) → fatigue estimée élevée.`,
          options: [
            "Réduire le nombre de répétitions de 30%",
            "Monter cadence temporairement (60-70 rpm)",
            "Déplacer de 48h après repos",
            "Remplacer par tempo Z3 classique"
          ],
          confidence: 0.7,
        });
      }
      
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
      
      // Rule: Long run/ride nutrition reminder
      if (
        classification.intensityType === "Z2_LONG" &&
        classification.estimatedDurationMin >= 90 &&
        vlamaxValue != null &&
        vlamaxValue > 0.50
      ) {
        const isVeryLong = classification.estimatedDurationMin >= 180;
        annotations.push({
          id: generateId(),
          scope: "SESSION",
          weekNumber: week.weekNumber,
          day: session.day,
          sessionTitle: session.title,
          severity: isVeryLong ? 2 : 1,
          riskScore: isVeryLong ? 55 : 40,
          title: `Nutrition à sécuriser pour ${isVeryLong ? "sortie très longue" : "sortie longue"}`,
          message: "Avec le profil glycolytique actuel, cette sortie longue nécessite une nutrition testée et validée.",
          why: `VLamax = ${vlamaxValue.toFixed(2)} → besoin glucidique ↑, durée ≈ ${classification.estimatedDurationMin} min`,
          options: isIM ? [
            `Objectif: ${classification.sport === "bike" ? "80-100" : "50-80"} g/h glucides`,
            "Fractionner prises toutes les 10-15min",
            "Surveiller signes GI (nausées, ballonnements)",
            "Prévoir backup nutrition (gel de secours)"
          ] : [
            "Tester 60-80g/h glucides",
            "Fractionner prises toutes les 15min",
            "Surveiller signes GI",
            "Prévoir backup nutrition"
          ],
          confidence: 0.8,
        });
      }
      
      // IM-specific: Brick session nutrition
      if (
        isIM &&
        classification.intensityType === "BRICK" &&
        classification.estimatedDurationMin >= 120
      ) {
        annotations.push({
          id: generateId(),
          scope: "SESSION",
          weekNumber: week.weekNumber,
          day: session.day,
          sessionTitle: session.title,
          severity: 1,
          riskScore: 45,
          title: "Brick long: opportunité de test nutrition",
          message: "Ce brick est l'occasion idéale de tester la stratégie nutritionnelle course (transition vélo→CAP).",
          why: `Brick ≈${classification.estimatedDurationMin} min → simuler conditions course IM.`,
          options: [
            "Tester nutrition vélo jusqu'à T2 (80-100g/h)",
            "Tester nutrition CAP post-vélo (50-80g/h)",
            "Valider la tolérance digestive après effort vélo",
            "Noter sensations + ajuster pour prochain brick"
          ],
          confidence: 0.85,
        });
      }
      
      // ============= MARATHON SESSION-LEVEL ANNOTATIONS =============
      
      if (isMarathon) {
        // MAR-SESSION-1: Bloc AS42 trop long vs TTE
        if (
          classification.intensityType === "SPECIFIC" &&
          classification.sport === "run" &&
          tteValue != null &&
          tteValue < 45 &&
          classification.blocTotalMin >= MARATHON_THRESHOLDS.as42_bloc_warning
        ) {
          const riskScore = Math.min(85, 60 + (classification.blocTotalMin - 40) + (45 - tteValue));
          annotations.push({
            id: generateId(),
            scope: "SESSION",
            weekNumber: week.weekNumber,
            day: session.day,
            sessionTitle: session.title,
            severity: 2,
            riskScore,
            title: "Bloc allure marathon long vs durabilité",
            message: "Risque de dérive FC et d'échec de séance clé. L'athlète risque de casser sur ce bloc.",
            why: `Bloc AS42 ≈${classification.blocTotalMin}min + TTE=${tteValue.toFixed(0)}min (< seuil 45').`,
            options: [
              "Fractionner: 4×10' au lieu de 2×20'",
              "Z4a (marathon bas) plutôt que Z4b",
              "Réduire intensité si dérive FC >5%",
              "Prévoir nutrition pendant la séance"
            ],
            confidence: 0.8,
          });
        }
        
        // MAR-SESSION-2: VO2/Speed avec VLamax haut
        if (
          (classification.intensityType === "VO2" || classification.intensityType === "SPEED") &&
          classification.isKey && // Only key speed work, not strides
          vlamaxValue != null &&
          vlamaxValue > MARATHON_THRESHOLDS.vlamax_warning
        ) {
          annotations.push({
            id: generateId(),
            scope: "SESSION",
            weekNumber: week.weekNumber,
            day: session.day,
            sessionTitle: session.title,
            severity: 2,
            riskScore: 60,
            title: "Séance VO2/vitesse sur profil glycolytique",
            message: "Cette séance renforce la filière glycolytique. À limiter pour un marathon.",
            why: `VLamax=${vlamaxValue.toFixed(2)} + séance ${classification.intensityType}.`,
            options: [
              "Transformer en côtes longues (2-3min) au lieu de sprints",
              "Réduire volume de 20-30%",
              "Remplacer par tempo long Z3",
              "Limiter à 1 séance VO2/semaine max"
            ],
            confidence: 0.75,
          });
        }
        
        // MAR-SESSION-3: Long run nutrition reminder
        if (
          classification.intensityType === "Z2_LONG" &&
          classification.sport === "run" &&
          classification.estimatedDurationMin >= MARATHON_THRESHOLDS.long_run_key_duration &&
          vlamaxValue != null &&
          vlamaxValue > MARATHON_THRESHOLDS.vlamax_warning
        ) {
          const isVeryLong = classification.estimatedDurationMin >= MARATHON_THRESHOLDS.long_run_very_long;
          annotations.push({
            id: generateId(),
            scope: "SESSION",
            weekNumber: week.weekNumber,
            day: session.day,
            sessionTitle: session.title,
            severity: isVeryLong ? 2 : 1,
            riskScore: isVeryLong ? 60 : 45,
            title: `Nutrition à tester ${isVeryLong ? "(sortie très longue)" : "(sortie longue)"}`,
            message: "Opportunité de tester le fueling course. Avec ce profil, la nutrition est critique.",
            why: `VLamax=${vlamaxValue.toFixed(2)} + durée ≈${classification.estimatedDurationMin}min.`,
            options: [
              "Tester 60-80 g/h glucides",
              "Fractionner prises toutes les 10-15min",
              "Valider marque/type de gels",
              "Noter sensations GI + ajuster"
            ],
            confidence: 0.8,
          });
        }
        
        // MAR-SESSION-4: Long run + profil fragile (TTE bas ou économie faible)
        if (
          classification.intensityType === "Z2_LONG" &&
          classification.sport === "run" &&
          classification.estimatedDurationMin >= MARATHON_THRESHOLDS.long_run_very_long &&
          tteValue != null &&
          tteValue < 45
        ) {
          annotations.push({
            id: generateId(),
            scope: "SESSION",
            weekNumber: week.weekNumber,
            day: session.day,
            sessionTitle: session.title,
            severity: 2,
            riskScore: 65,
            title: "Sortie très longue vs profil durabilité",
            message: "Cette sortie longue sera coûteuse. Risque de fatigue résiduelle importante.",
            why: `Durée ≈${classification.estimatedDurationMin}min + TTE=${tteValue.toFixed(0)}min.`,
            options: [
              "Réduire durée de 15-20%",
              "Privilégier régularité au lieu d'allure marathon",
              "Fractionner avec pauses actives",
              "Surveiller récupération 48-72h après"
            ],
            confidence: 0.75,
          });
        }
      }
      
      // ============= IRONMAN 70.3 SESSION-LEVEL ANNOTATIONS =============
      
      if (is703) {
        // 703-SESSION-1: CAP spécifique trop longue vs TTE
        if (
          classification.intensityType === "SPECIFIC" &&
          classification.sport === "run" &&
          tteValue != null &&
          tteValue < IM703_THRESHOLDS.tte_warning &&
          classification.blocTotalMin >= IM703_THRESHOLDS.as703_run_bloc_warning
        ) {
          const riskScore = Math.min(85, 60 + (classification.blocTotalMin - 40) + (45 - tteValue));
          annotations.push({
            id: generateId(),
            scope: "SESSION",
            weekNumber: week.weekNumber,
            day: session.day,
            sessionTitle: session.title,
            severity: 2,
            riskScore,
            title: "Bloc CAP spécifique long vs durabilité",
            message: "Risque de dérive et fatigue excessive. Qualité de séance compromise.",
            why: `Bloc AS703 ≈${classification.blocTotalMin}min + TTE=${tteValue.toFixed(0)}min (< seuil 45').`,
            options: [
              "Fractionner blocs (4×10' au lieu de 2×20')",
              "Réduire intensité (Z4a au lieu de Z4b)",
              "Tester en conditions brick (post-vélo léger)",
              "Prévoir nutrition pendant la séance"
            ],
            confidence: 0.8,
          });
        }
        
        // 703-SESSION-2: Long ride nutrition
        if (
          classification.sport === "bike" &&
          classification.intensityType === "Z2_LONG" &&
          classification.estimatedDurationMin >= IM703_THRESHOLDS.long_ride_min_duration &&
          vlamaxValue != null &&
          vlamaxValue > IM703_THRESHOLDS.vlamax_warning
        ) {
          const isVeryLong = classification.estimatedDurationMin >= IM703_THRESHOLDS.long_ride_key_duration;
          annotations.push({
            id: generateId(),
            scope: "SESSION",
            weekNumber: week.weekNumber,
            day: session.day,
            sessionTitle: session.title,
            severity: isVeryLong ? 2 : 1,
            riskScore: isVeryLong ? 60 : 45,
            title: `Nutrition vélo 70.3 ${isVeryLong ? "(sortie longue clé)" : ""}`,
            message: "Opportunité de tester le fueling course. Avec ce profil, 80-100g/h requis.",
            why: `VLamax=${vlamaxValue.toFixed(2)} + durée ≈${classification.estimatedDurationMin}min.`,
            options: [
              "Tester 80-100 g/h glucides",
              "Fractionner toutes les 10-15min",
              "Valider tolérance digestive",
              "Noter sensations + ajuster"
            ],
            confidence: 0.8,
          });
        }
        
        // 703-SESSION-3: Brick long = test nutrition complet
        if (
          classification.intensityType === "BRICK" &&
          classification.estimatedDurationMin >= IM703_THRESHOLDS.brick_min_duration
        ) {
          annotations.push({
            id: generateId(),
            scope: "SESSION",
            weekNumber: week.weekNumber,
            day: session.day,
            sessionTitle: session.title,
            severity: 1,
            riskScore: 50,
            title: "Brick 70.3: test nutrition complet",
            message: "Ce brick est l'occasion idéale de tester nutrition vélo + transition + CAP.",
            why: `Brick ≈${classification.estimatedDurationMin}min → simuler conditions 70.3.`,
            options: [
              "Nutrition vélo: 80-100g/h jusqu'à T2",
              "Gel T2 + nutrition CAP: 50-70g/h",
              "Valider tolérance digestive post-vélo",
              "Noter sensations + ajuster stratégie"
            ],
            confidence: 0.85,
          });
        }
        
        // 703-SESSION-4: Séance vélo intense (VO2/Force) + profil glycolytique
        if (
          classification.sport === "bike" &&
          (classification.intensityType === "VO2" || classification.intensityType === "FORCE") &&
          vlamaxValue != null &&
          vlamaxValue > IM703_THRESHOLDS.vlamax_critical
        ) {
          annotations.push({
            id: generateId(),
            scope: "SESSION",
            weekNumber: week.weekNumber,
            day: session.day,
            sessionTitle: session.title,
            severity: 2,
            riskScore: 60,
            title: "Séance vélo intense sur profil glycolytique élevé",
            message: "Cette séance peut maintenir la dépendance glucidique. À limiter en phase spécifique.",
            why: `VLamax=${vlamaxValue.toFixed(2)} (>0.60) + séance ${classification.intensityType}.`,
            options: [
              "Transformer en tempo long Z3 (30-45')",
              "Réduire volume VO2 de 20%",
              "Ajouter force basse cadence à la place",
              "Limiter à 1 séance VO2/semaine"
            ],
            confidence: 0.75,
          });
        }
        
        // 703-SESSION-5: CAP post-vélo avec TTE fragile
        if (
          classification.sport === "run" &&
          classification.isKey &&
          tteValue != null &&
          tteValue < IM703_THRESHOLDS.tte_critical
        ) {
          annotations.push({
            id: generateId(),
            scope: "SESSION",
            weekNumber: week.weekNumber,
            day: session.day,
            sessionTitle: session.title,
            severity: 2,
            riskScore: 65,
            title: "Séance CAP clé avec durabilité fragile",
            message: "Avec ce TTE, la CAP post-vélo sera très exigeante. Prioriser durabilité vélo d'abord.",
            why: `TTE=${tteValue.toFixed(0)}min (< seuil 40min).`,
            options: [
              "Réduire volume/intensité CAP",
              "Prioriser bricks Z2 CAP",
              "Renforcer tempo vélo long avant CAP qualité",
              "Surveiller dérive FC sur chaque séance"
            ],
            confidence: 0.8,
          });
        }
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

// ============= IM RISK SUMMARY HELPER =============

export interface IMRiskSummary {
  metabolicRisk: "low" | "moderate" | "high";
  durabilityRisk: "low" | "moderate" | "high";
  injuryRisk: "low" | "moderate" | "high";
}

export function computeIMRiskSummary(
  vlamaxValue: number | null,
  tteValue: number | null,
  weekKeyCount: number
): IMRiskSummary {
  // Metabolic risk based on VLamax
  let metabolicRisk: IMRiskSummary["metabolicRisk"] = "low";
  if (vlamaxValue != null) {
    if (vlamaxValue > IM_THRESHOLDS.vlamax_critical) metabolicRisk = "high";
    else if (vlamaxValue > IM_THRESHOLDS.vlamax_warning) metabolicRisk = "moderate";
  }
  
  // Durability risk based on TTE
  let durabilityRisk: IMRiskSummary["durabilityRisk"] = "low";
  if (tteValue != null) {
    if (tteValue < IM_THRESHOLDS.tte_critical) durabilityRisk = "high";
    else if (tteValue < IM_THRESHOLDS.tte_warning) durabilityRisk = "moderate";
  }
  
  // Injury risk based on week density
  let injuryRisk: IMRiskSummary["injuryRisk"] = "low";
  if (weekKeyCount >= 4) injuryRisk = "high";
  else if (weekKeyCount >= 3) injuryRisk = "moderate";
  
  return { metabolicRisk, durabilityRisk, injuryRisk };
}

// ============= MARATHON RISK SUMMARY HELPER =============

export interface MarathonRiskSummary {
  injuryRisk: "low" | "moderate" | "high";
  metabolicRisk: "low" | "moderate" | "high";
  durabilityRisk: "low" | "moderate" | "high";
  nutritionRisk: "low" | "moderate" | "high";
}

export function computeMarathonRiskSummary(
  vlamaxValue: number | null,
  tteValue: number | null,
  weekKeyCount: number,
  tss7d: number | null
): MarathonRiskSummary {
  // Injury risk based on week density + TSS
  let injuryRisk: MarathonRiskSummary["injuryRisk"] = "low";
  if (weekKeyCount >= 4 || (tss7d != null && tss7d > MARATHON_THRESHOLDS.tss7d_critical)) injuryRisk = "high";
  else if (weekKeyCount >= 3 || (tss7d != null && tss7d > MARATHON_THRESHOLDS.tss7d_warning)) injuryRisk = "moderate";
  
  // Metabolic risk (mur) based on VLamax
  let metabolicRisk: MarathonRiskSummary["metabolicRisk"] = "low";
  if (vlamaxValue != null) {
    if (vlamaxValue > MARATHON_THRESHOLDS.vlamax_critical) metabolicRisk = "high";
    else if (vlamaxValue > MARATHON_THRESHOLDS.vlamax_warning) metabolicRisk = "moderate";
  }
  
  // Durability risk based on TTE
  let durabilityRisk: MarathonRiskSummary["durabilityRisk"] = "low";
  if (tteValue != null) {
    if (tteValue < MARATHON_THRESHOLDS.tte_critical) durabilityRisk = "high";
    else if (tteValue < MARATHON_THRESHOLDS.tte_warning) durabilityRisk = "moderate";
  }
  
  // Nutrition risk = high if VLamax high + TTE low
  let nutritionRisk: MarathonRiskSummary["nutritionRisk"] = "low";
  if (vlamaxValue != null && vlamaxValue > MARATHON_THRESHOLDS.vlamax_warning) {
    nutritionRisk = vlamaxValue > MARATHON_THRESHOLDS.vlamax_critical ? "high" : "moderate";
  }
  
  return { injuryRisk, metabolicRisk, durabilityRisk, nutritionRisk };
}

// ============= IRONMAN 70.3 RISK SUMMARY HELPER =============

export interface IM703RiskSummary {
  metabolicRisk: "low" | "moderate" | "high";
  durabilityRisk: "low" | "moderate" | "high";
  bikeDominanceOk: boolean;
  capPostBikeRisk: "low" | "moderate" | "high";
  nutritionBikeRisk: "low" | "moderate" | "high";
  nutritionRunRisk: "low" | "moderate" | "high";
  overallRisk: "low" | "moderate" | "high";
}

export function compute703RiskSummary(
  vlamaxValue: number | null,
  tteValue: number | null,
  bikeKeyCount: number,
  runKeyCount: number,
  tss7d: number | null
): IM703RiskSummary {
  // Metabolic risk based on VLamax
  let metabolicRisk: IM703RiskSummary["metabolicRisk"] = "low";
  if (vlamaxValue != null) {
    if (vlamaxValue > IM703_THRESHOLDS.vlamax_critical) metabolicRisk = "high";
    else if (vlamaxValue > IM703_THRESHOLDS.vlamax_warning) metabolicRisk = "moderate";
  }
  
  // Durability risk based on TTE
  let durabilityRisk: IM703RiskSummary["durabilityRisk"] = "low";
  if (tteValue != null) {
    if (tteValue < IM703_THRESHOLDS.tte_critical) durabilityRisk = "high";
    else if (tteValue < IM703_THRESHOLDS.tte_warning) durabilityRisk = "moderate";
  }
  
  // Bike dominance check
  const bikeDominanceOk = bikeKeyCount >= runKeyCount;
  
  // CAP post-bike risk = combination of TTE + VLamax
  let capPostBikeRisk: IM703RiskSummary["capPostBikeRisk"] = "low";
  if ((tteValue != null && tteValue < IM703_THRESHOLDS.tte_critical) || 
      (vlamaxValue != null && vlamaxValue > IM703_THRESHOLDS.vlamax_critical)) {
    capPostBikeRisk = "high";
  } else if ((tteValue != null && tteValue < IM703_THRESHOLDS.tte_warning) || 
             (vlamaxValue != null && vlamaxValue > IM703_THRESHOLDS.vlamax_warning)) {
    capPostBikeRisk = "moderate";
  }
  
  // Nutrition bike risk
  let nutritionBikeRisk: IM703RiskSummary["nutritionBikeRisk"] = "low";
  if (vlamaxValue != null) {
    if (vlamaxValue > IM703_THRESHOLDS.vlamax_critical) nutritionBikeRisk = "high";
    else if (vlamaxValue > IM703_THRESHOLDS.vlamax_warning) nutritionBikeRisk = "moderate";
  }
  
  // Nutrition run risk = same as bike but slightly higher concern
  let nutritionRunRisk: IM703RiskSummary["nutritionRunRisk"] = "low";
  if (vlamaxValue != null && vlamaxValue > IM703_THRESHOLDS.vlamax_warning) {
    nutritionRunRisk = vlamaxValue > IM703_THRESHOLDS.vlamax_critical ? "high" : "moderate";
  }
  
  // Overall risk
  const riskScores = [metabolicRisk, durabilityRisk, capPostBikeRisk, nutritionBikeRisk].map(r => 
    r === "high" ? 3 : r === "moderate" ? 2 : 1
  );
  const avgRisk = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;
  let overallRisk: IM703RiskSummary["overallRisk"] = "low";
  if (avgRisk >= 2.5) overallRisk = "high";
  else if (avgRisk >= 1.8) overallRisk = "moderate";
  
  return { 
    metabolicRisk, 
    durabilityRisk, 
    bikeDominanceOk, 
    capPostBikeRisk, 
    nutritionBikeRisk, 
    nutritionRunRisk, 
    overallRisk 
  };
}

// ============= IRONMAN FULL DISTANCE RISK SUMMARY HELPER =============

export interface IMFullRiskSummary {
  compatibility: "ok" | "limite" | "incompatible";
  vlamaxReadiness: "ok" | "warning" | "critical";
  tteReadiness: "ok" | "warning" | "critical" | "redflag";
  bikeDominantScore: "ok" | "à renforcer";
  capPostBikeRisk: "stable" | "fragile" | "critique";
  nutritionBikeRisk: "low" | "moderate" | "high" | "critical";
  nutritionRunRisk: "low" | "moderate" | "high";
  dnfRisk: "LOW" | "MEDIUM" | "HIGH";
}

export function computeIMFullRiskSummary(
  vlamaxValue: number | null,
  tteValue: number | null,
  bikeKeyCount: number,
  runKeyCount: number,
  tss7d: number | null
): IMFullRiskSummary {
  // Compatibility check
  let compatibility: IMFullRiskSummary["compatibility"] = "ok";
  if ((vlamaxValue != null && vlamaxValue > IMFULL_THRESHOLDS.vlamax_critical) || 
      (tteValue != null && tteValue < IMFULL_THRESHOLDS.tte_redflag)) {
    compatibility = "incompatible";
  } else if ((vlamaxValue != null && vlamaxValue > IMFULL_THRESHOLDS.vlamax_warning) || 
             (tteValue != null && tteValue < IMFULL_THRESHOLDS.tte_critical)) {
    compatibility = "limite";
  }
  
  // VLamax readiness
  let vlamaxReadiness: IMFullRiskSummary["vlamaxReadiness"] = "ok";
  if (vlamaxValue != null) {
    if (vlamaxValue > IMFULL_THRESHOLDS.vlamax_critical) vlamaxReadiness = "critical";
    else if (vlamaxValue > IMFULL_THRESHOLDS.vlamax_warning) vlamaxReadiness = "warning";
  }
  
  // TTE readiness
  let tteReadiness: IMFullRiskSummary["tteReadiness"] = "ok";
  if (tteValue != null) {
    if (tteValue < IMFULL_THRESHOLDS.tte_redflag) tteReadiness = "redflag";
    else if (tteValue < IMFULL_THRESHOLDS.tte_critical) tteReadiness = "critical";
    else if (tteValue < IMFULL_THRESHOLDS.tte_warning) tteReadiness = "warning";
  }
  
  // Bike dominant score
  const bikeDominantScore: IMFullRiskSummary["bikeDominantScore"] = bikeKeyCount >= runKeyCount * 1.2 ? "ok" : "à renforcer";
  
  // CAP post-bike risk
  let capPostBikeRisk: IMFullRiskSummary["capPostBikeRisk"] = "stable";
  if (tteReadiness === "redflag" || tteReadiness === "critical" || vlamaxReadiness === "critical") {
    capPostBikeRisk = "critique";
  } else if (tteReadiness === "warning" || vlamaxReadiness === "warning") {
    capPostBikeRisk = "fragile";
  }
  
  // Nutrition bike risk (stricter for IM Full)
  let nutritionBikeRisk: IMFullRiskSummary["nutritionBikeRisk"] = "low";
  if (vlamaxValue != null) {
    if (vlamaxValue > IMFULL_THRESHOLDS.vlamax_critical) nutritionBikeRisk = "critical";
    else if (vlamaxValue > IMFULL_THRESHOLDS.vlamax_warning) nutritionBikeRisk = "high";
    else if (vlamaxValue > 0.40) nutritionBikeRisk = "moderate";
  }
  
  // Nutrition run risk
  let nutritionRunRisk: IMFullRiskSummary["nutritionRunRisk"] = "low";
  if (vlamaxValue != null && vlamaxValue > IMFULL_THRESHOLDS.vlamax_warning) {
    nutritionRunRisk = vlamaxValue > IMFULL_THRESHOLDS.vlamax_critical ? "high" : "moderate";
  }
  
  // DNF risk
  let dnfRisk: IMFullRiskSummary["dnfRisk"] = "LOW";
  const riskFactors = [
    compatibility === "incompatible" ? 3 : compatibility === "limite" ? 2 : 0,
    vlamaxReadiness === "critical" ? 3 : vlamaxReadiness === "warning" ? 1 : 0,
    tteReadiness === "redflag" ? 4 : tteReadiness === "critical" ? 2 : tteReadiness === "warning" ? 1 : 0,
    capPostBikeRisk === "critique" ? 2 : capPostBikeRisk === "fragile" ? 1 : 0,
    nutritionBikeRisk === "critical" ? 2 : nutritionBikeRisk === "high" ? 1 : 0,
  ];
  const totalRisk = riskFactors.reduce((a, b) => a + b, 0);
  if (totalRisk >= 8) dnfRisk = "HIGH";
  else if (totalRisk >= 4) dnfRisk = "MEDIUM";
  
  return {
    compatibility,
    vlamaxReadiness,
    tteReadiness,
    bikeDominantScore,
    capPostBikeRisk,
    nutritionBikeRisk,
    nutritionRunRisk,
    dnfRisk
  };
}

// ============= CAP (SEMI/MARATHON) RISK SUMMARY HELPER (Dan Lorang) =============

export interface CAPRiskSummary {
  economyScore: "faible" | "moyen" | "élevé";
  vlamaxCompatibility: "ok" | "warning" | "critical";
  tteReadiness: "ok" | "warning" | "critical";
  mechanicalRiskIndex: "LOW" | "MEDIUM" | "HIGH";
  nutritionReadiness: "ok" | "à tester" | "critique";
  injuryRisk: "LOW" | "MEDIUM" | "HIGH";
}

export function computeCAPRiskSummary(
  vlamaxValue: number | null,
  tteValue: number | null,
  economyScore: number | null,
  weekMechanicalSessions: number,
  weekIntensitySessions: number,
  isMarathon: boolean
): CAPRiskSummary {
  const thresholds = isMarathon ? MARATHON_THRESHOLDS : SEMI_THRESHOLDS;
  
  // Economy score
  let economyScoreLevel: CAPRiskSummary["economyScore"] = "moyen";
  if (economyScore != null) {
    if (economyScore >= (isMarathon ? 75 : 70)) economyScoreLevel = "élevé";
    else if (economyScore < (isMarathon ? 55 : 55)) economyScoreLevel = "faible";
  }
  
  // VLamax compatibility
  let vlamaxCompatibility: CAPRiskSummary["vlamaxCompatibility"] = "ok";
  if (vlamaxValue != null) {
    if (vlamaxValue > thresholds.vlamax_critical) vlamaxCompatibility = "critical";
    else if (vlamaxValue > thresholds.vlamax_warning) vlamaxCompatibility = "warning";
  }
  
  // TTE readiness
  let tteReadiness: CAPRiskSummary["tteReadiness"] = "ok";
  if (tteValue != null) {
    if (tteValue < thresholds.tte_critical) tteReadiness = "critical";
    else if (tteValue < thresholds.tte_warning) tteReadiness = "warning";
  }
  
  // Mechanical risk index (based on weekly mechanical stress sessions)
  let mechanicalRiskIndex: CAPRiskSummary["mechanicalRiskIndex"] = "LOW";
  if (weekMechanicalSessions >= 3) mechanicalRiskIndex = "HIGH";
  else if (weekMechanicalSessions >= 2) mechanicalRiskIndex = "MEDIUM";
  
  // Nutrition readiness
  let nutritionReadiness: CAPRiskSummary["nutritionReadiness"] = "ok";
  if (vlamaxValue != null && vlamaxValue > thresholds.vlamax_warning) {
    nutritionReadiness = vlamaxValue > thresholds.vlamax_critical ? "critique" : "à tester";
  }
  
  // Injury risk (combination of factors)
  let injuryRisk: CAPRiskSummary["injuryRisk"] = "LOW";
  const riskFactors = [
    mechanicalRiskIndex === "HIGH" ? 3 : mechanicalRiskIndex === "MEDIUM" ? 1 : 0,
    weekIntensitySessions > 2 ? 2 : weekIntensitySessions === 2 ? 1 : 0,
    tteReadiness === "critical" ? 2 : tteReadiness === "warning" ? 1 : 0,
    economyScoreLevel === "faible" ? 1 : 0,
  ];
  const totalRisk = riskFactors.reduce((a, b) => a + b, 0);
  if (totalRisk >= 5) injuryRisk = "HIGH";
  else if (totalRisk >= 3) injuryRisk = "MEDIUM";
  
  return {
    economyScore: economyScoreLevel,
    vlamaxCompatibility,
    tteReadiness,
    mechanicalRiskIndex,
    nutritionReadiness,
    injuryRisk
  };
}
