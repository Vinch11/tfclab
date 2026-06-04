/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL PLAN VALIDATOR™ — Post-Generation Quality Control
 * 
 * Validates AI-generated training plans against elite coaching principles:
 * 1. Polarization 80/20 (Seiler)
 * 2. Load/Deload pattern 3:1 or 2:1 (Rhea)
 * 3. Key sessions presence per week
 * 4. Volume progression across weeks
 * 5. Sport ratio coherence
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";
import type { PlanAthleteData } from "./types";
import { extractCatalogId } from "@/lib/catalogIdExtractor";
import { detectInterval, isCyclingSession } from "./wbalPostProcessor";
import {
  analyzeCriticalPower,
  effectiveWprime,
  prescribeIntervalRecovery,
  calculateTau,
} from "@/lib/v2/criticalPowerModel";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  rule: string;
  severity: ValidationSeverity;
  week?: number;
  message: string;
  detail?: string;
}

export interface WeekMetrics {
  weekNumber: number;
  theme: string;
  totalSessions: number;
  activeSessions: number;
  restDays: number;
  sports: Record<string, number>;
  /** Estimated intensity distribution from session titles/details */
  intensityProfile: {
    lowPct: number;   // Z1-Z2 (easy, endurance, récupération)
    midPct: number;   // Z3 (tempo, allure marathon)
    highPct: number;  // Z4-Z7 (seuil, VO2, VMA, sprint, intervalles)
  };
  /** Whether this looks like a deload/recovery week */
  isDeload: boolean;
  /** Whether this looks like a race week */
  isRaceWeek: boolean;
  /** Key sessions count (🔑 or intensity sessions) */
  keySessions: number;
}

export interface LimiterCoverageItem {
  rank: number;        // 1-4
  key: string;         // e.g. "vo2max", "vlamax"
  hits: number;
  totalKeySessions: number;
  pct: number;         // 0-100
  target: number;      // expected min %
  status: "ok" | "low" | "absent";
}

export interface CatalogUsageStats {
  uniqueCatalogIds: number;
  catalogSessions: number;
  customSessions: number;
  totalKeySessions: number;
  untaggedSessions: number;
}

export interface PlanValidationResult {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  issues: ValidationIssue[];
  weekMetrics: WeekMetrics[];
  limiterCoverage: LimiterCoverageItem[];
  catalogStats: CatalogUsageStats;
  summary: {
    polarizationScore: number;
    loadPatternScore: number;
    keySessionsScore: number;
    progressionScore: number;
    sportRatioScore: number;
    catalogRatioScore: number;
    prohibitionComplianceScore: number;
    phaseCoherenceScore: number;
    raceDayScore: number;
    limiterCoherenceScore: number;
    wbalFeasibilityScore: number;
    overallComment: string;
  };
}

export type LimiterGapLike = {
  metric: string;
  weightedImpact: number;
  status?: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// INTENSITY CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

const LOW_INTENSITY_PATTERNS = /z[12]|endurance|ef\b|footing|récup|recovery|easy|facile|aérobie|z2|zone\s*[12]|fondament|repos actif|régénér|souplesse|mobilité|technique|drill|gammes|éducatif/i;
const MID_INTENSITY_PATTERNS = /z3|tempo\b|allure\s*marathon|sweet\s*spot|zone\s*3|endurance\s*active|fartlek\s*léger/i;
const HIGH_INTENSITY_PATTERNS = /z[4-7]|seuil|threshold|vo2|vma|interval|fractionné|sprint|hiit|30\/30|pma|over.under|norvégienne|billat|canova|race.pace|race.sim|compétition|course\b.*\brace|🏁|force\s*max|plio|rønnestad|sfr|côtes?\s*\d/i;
const KEY_SESSION_PATTERNS = /🔑|clé|key|séance\s*clé|interval|seuil|threshold|vo2|vma|sortie\s*longue|\bsl\b|long\s*(?:run|ride)|brick|race(?:[\s_.-]*sim|[\s_.-]*pace|[\s_.-]*power)|test|compétition|🏁|\bsst\b|sweet[\s_-]*spot|over.?under|train[\s_-]*low|fat\s*(?:max|ox)|lipid|tempo|norv[ée]gi|norwegian|double[\s_-]*threshold|pma|sprint|c[ôo]te|sfr|r[øo]nnestad|plio|strides|drill|force\s*max|[àa]\s*jeun|fasted|mlss|ftp|durabilit|simulation|endurance[\s_-]*long|z2[\s_-]*long|30[\/_ -]?30|allure|gut[\s_-]*train|back[\s_-]*to[\s_-]*back|renfo|ppg|muscul|gainage|core\b|strength/i;
const DELOAD_PATTERNS = /décharge|deload|récup|recovery|repos|allégé|réduit|taper|affûtage|régénér/i;
const RACE_PATTERNS = /🏁|course\b|race|compétition|épreuve|objectif|marathon|ironman|triathlon|semi|trail|10k/i;

function classifySessionIntensity(session: ParsedSession): "low" | "mid" | "high" {
  const text = `${session.sport} ${session.title} ${session.details}`.toLowerCase();
  
  if (session.isRest) return "low";
  
  // Check high first (most specific patterns)
  if (HIGH_INTENSITY_PATTERNS.test(text)) return "high";
  if (MID_INTENSITY_PATTERNS.test(text)) return "mid";
  
  // Default: strength/renfo sessions count as mid, everything else as low
  if (/renfo|muscul|strength|ppg|gainage|core|poids/i.test(text)) return "mid";
  
  return "low";
}

function isKeySession(session: ParsedSession): boolean {
  if (session.isRest) return false;
  const text = `${session.title} ${session.details}`;
  return KEY_SESSION_PATTERNS.test(text);
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEEK METRICS EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

function extractWeekMetrics(week: ParsedWeek): WeekMetrics {
  const activeSessions = week.sessions.filter(s => !s.isRest);
  const restDays = new Set(
    week.sessions.filter(s => s.isRest).map(s => s.dayIndex)
  ).size;

  // Sport distribution
  const sports: Record<string, number> = {};
  for (const s of activeSessions) {
    const sport = normalizeSport(s.sport);
    sports[sport] = (sports[sport] || 0) + 1;
  }

  // Intensity distribution
  let low = 0, mid = 0, high = 0;
  for (const s of activeSessions) {
    const intensity = classifySessionIntensity(s);
    if (intensity === "low") low++;
    else if (intensity === "mid") mid++;
    else high++;
  }
  const total = low + mid + high || 1;

  // Deload detection
  const themeText = `${week.theme} ${week.phase}`.toLowerCase();
  const isDeload = DELOAD_PATTERNS.test(themeText) || activeSessions.length <= 3;

  // Race week detection
  const isRaceWeek = week.sessions.some(s => RACE_PATTERNS.test(`${s.title} ${s.details}`));

  // Key sessions
  const keySessions = activeSessions.filter(isKeySession).length;

  return {
    weekNumber: week.weekNumber,
    theme: week.theme,
    totalSessions: week.sessions.length,
    activeSessions: activeSessions.length,
    restDays,
    sports,
    intensityProfile: {
      lowPct: Math.round((low / total) * 100),
      midPct: Math.round((mid / total) * 100),
      highPct: Math.round((high / total) * 100),
    },
    isDeload,
    isRaceWeek,
    keySessions,
  };
}

function normalizeSport(sport: string): string {
  const s = sport.toLowerCase().trim();
  if (/nat|swim|crawl|piscine/i.test(s)) return "Natation";
  if (/vélo|bike|cycl|vtt/i.test(s)) return "Vélo";
  if (/cap|course|run|trail|footing/i.test(s)) return "Course";
  if (/renfo|muscul|strength|ppg|force|gainage|core/i.test(s)) return "Renfo";
  if (/brick|transition/i.test(s)) return "Brick";
  if (/repos|rest|off/i.test(s)) return "Repos";
  return sport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RULES
// ═══════════════════════════════════════════════════════════════════════════════

/** Rule 1: Polarization 80/20 (Seiler) */
function validatePolarization(metrics: WeekMetrics[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  let compliant = 0;

  for (const wm of metrics) {
    if (wm.isDeload || wm.isRaceWeek || wm.activeSessions < 3) {
      compliant++;
      continue;
    }

    const { lowPct, midPct, highPct } = wm.intensityProfile;

    // Low should be 70-85%, high 15-25%, mid < 10% ideally
    if (lowPct < 60) {
      issues.push({
        rule: "polarization",
        severity: "error",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: Distribution non polarisée — seulement ${lowPct}% en Z1-Z2 (cible ≥ 75%)`,
        detail: `Low: ${lowPct}%, Mid: ${midPct}%, High: ${highPct}%`,
      });
    } else if (lowPct < 70) {
      issues.push({
        rule: "polarization",
        severity: "warning",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: Polarisation marginale — ${lowPct}% en Z1-Z2 (recommandé ≥ 75%)`,
      });
      compliant += 0.5;
    } else {
      compliant++;
    }

    if (midPct > 25) {
      issues.push({
        rule: "polarization",
        severity: "warning",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: Trop de Z3 "black hole" — ${midPct}% (cible < 10%)`,
      });
    }
  }

  const total = metrics.filter(m => !m.isDeload && !m.isRaceWeek && m.activeSessions >= 3).length || 1;
  return { issues, score: Math.round((compliant / total) * 100) };
}

/** Rule 2: Load/Deload pattern 3:1 or 2:1 */
function validateLoadPattern(metrics: WeekMetrics[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  if (metrics.length < 4) {
    return { issues: [], score: 100 }; // Too short to validate
  }

  // Check that deload weeks appear at regular intervals
  let maxConsecutiveLoad = 0;
  let currentStreak = 0;
  let deloadCount = 0;

  for (const wm of metrics) {
    if (wm.isDeload || wm.isRaceWeek) {
      if (currentStreak > maxConsecutiveLoad) maxConsecutiveLoad = currentStreak;
      currentStreak = 0;
      deloadCount++;
    } else {
      currentStreak++;
    }
  }
  if (currentStreak > maxConsecutiveLoad) maxConsecutiveLoad = currentStreak;

  // Expected: deload every 2-4 weeks
  const expectedDeloads = Math.floor((metrics.length - 1) / 3); // 3:1 pattern
  const minDeloads = Math.max(1, Math.floor(metrics.length / 5)); // 4:1 at worst

  if (deloadCount < minDeloads) {
    issues.push({
      rule: "load_pattern",
      severity: "error",
      message: `Seulement ${deloadCount} semaine(s) de décharge sur ${metrics.length} semaines (minimum attendu: ${minDeloads})`,
      detail: `Pattern recommandé: 3:1 (3 semaines charge + 1 décharge) ou 2:1`,
    });
  }

  if (maxConsecutiveLoad > 4) {
    issues.push({
      rule: "load_pattern",
      severity: "error",
      message: `${maxConsecutiveLoad} semaines consécutives sans décharge (max recommandé: 3-4)`,
      detail: `Risque de surcharge chronique. Insérer une semaine de décharge (-30 à -40% volume).`,
    });
  } else if (maxConsecutiveLoad === 4) {
    issues.push({
      rule: "load_pattern",
      severity: "warning",
      message: `4 semaines consécutives de charge — acceptable en 4:1 mais surveiller la fatigue`,
    });
  }

  // Score: penalize missing deloads
  const ratio = deloadCount / Math.max(1, expectedDeloads);
  const streakPenalty = maxConsecutiveLoad > 4 ? 20 : maxConsecutiveLoad === 4 ? 5 : 0;
  return { issues, score: Math.max(0, Math.min(100, Math.round(ratio * 100) - streakPenalty)) };
}

/** Rule 3: Key sessions presence */
function validateKeySessions(metrics: WeekMetrics[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  let compliant = 0;

  for (const wm of metrics) {
    if (wm.isDeload || wm.isRaceWeek) {
      compliant++;
      continue;
    }

    if (wm.keySessions === 0) {
      issues.push({
        rule: "key_sessions",
        severity: "error",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: Aucune séance clé détectée (attendu: 1-3 séances d'intensité/semaine)`,
      });
    } else if (wm.keySessions === 1 && wm.activeSessions >= 5) {
      issues.push({
        rule: "key_sessions",
        severity: "warning",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: Seulement 1 séance clé pour ${wm.activeSessions} séances actives (recommandé: 2-3)`,
      });
      compliant += 0.5;
    } else if (wm.keySessions > 4) {
      issues.push({
        rule: "key_sessions",
        severity: "warning",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: ${wm.keySessions} séances clés — risque de surcharge d'intensité`,
      });
      compliant += 0.5;
    } else {
      compliant++;
    }
  }

  const total = metrics.filter(m => !m.isDeload && !m.isRaceWeek).length || 1;
  return { issues, score: Math.round((compliant / total) * 100) };
}

/** Rule 4: Volume progression */
function validateProgression(metrics: WeekMetrics[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  if (metrics.length < 3) return { issues: [], score: 100 };

  // Track active sessions as volume proxy (we don't have duration data from parsed plan)
  const loadWeeks = metrics.filter(m => !m.isDeload && !m.isRaceWeek);
  
  if (loadWeeks.length < 3) return { issues: [], score: 100 };

  // Check overall progression trend: first third vs last third
  const thirdLen = Math.max(1, Math.floor(loadWeeks.length / 3));
  const firstThird = loadWeeks.slice(0, thirdLen);
  const lastThird = loadWeeks.slice(-thirdLen);

  const avgFirst = firstThird.reduce((s, w) => s + w.activeSessions, 0) / firstThird.length;
  const avgLast = lastThird.reduce((s, w) => s + w.activeSessions, 0) / lastThird.length;

  // Volume should generally increase or stay stable (not decrease)
  if (avgLast < avgFirst * 0.85) {
    issues.push({
      rule: "progression",
      severity: "warning",
      message: `Volume en baisse: moyenne ${avgFirst.toFixed(1)} séances/sem (début) → ${avgLast.toFixed(1)} (fin)`,
      detail: `Une progression positive est attendue hors semaines de décharge et taper.`,
    });
  }

  // Check for sudden jumps (> +30% week to week)
  for (let i = 1; i < metrics.length; i++) {
    const prev = metrics[i - 1];
    const curr = metrics[i];
    if (prev.isDeload || curr.isDeload || curr.isRaceWeek || prev.activeSessions < 3) continue;

    const jump = (curr.activeSessions - prev.activeSessions) / Math.max(1, prev.activeSessions);
    if (jump > 0.35) {
      issues.push({
        rule: "progression",
        severity: "warning",
        week: curr.weekNumber,
        message: `S${curr.weekNumber}: Saut de volume +${Math.round(jump * 100)}% vs S${prev.weekNumber} (${prev.activeSessions} → ${curr.activeSessions} séances)`,
        detail: `Progression recommandée: +5-10%/semaine maximum.`,
      });
    }
  }

  // Check that intensity increases over the plan (key sessions should increase mid-plan)
  const firstHalfKeys = metrics.slice(0, Math.floor(metrics.length / 2))
    .filter(m => !m.isDeload)
    .reduce((s, m) => s + m.keySessions, 0);
  const secondHalfKeys = metrics.slice(Math.floor(metrics.length / 2))
    .filter(m => !m.isDeload && !m.isRaceWeek)
    .reduce((s, m) => s + m.keySessions, 0);

  // It's OK if second half has same or fewer key sessions (taper effect)
  // But first half having 0 is a problem
  if (firstHalfKeys === 0 && loadWeeks.length > 4) {
    issues.push({
      rule: "progression",
      severity: "error",
      message: `Aucune séance clé dans la première moitié du plan`,
    });
  }

  const progressionOk = avgLast >= avgFirst * 0.85 && issues.filter(i => i.severity === "error").length === 0;
  return { issues, score: progressionOk ? 90 : 60 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPORT RATIO VALIDATION (Rule 5)
// ═══════════════════════════════════════════════════════════════════════════════

const SPORT_RATIO_TARGETS: Record<string, { swim?: [number, number]; bike?: [number, number]; run?: [number, number] }> = {
  IM:       { swim: [15, 20], bike: [45, 55], run: [25, 35] },
  "703":    { swim: [15, 20], bike: [40, 50], run: [30, 40] },
  Marathon: { run: [85, 100] },
  Semi:     { run: [85, 100] },
  "10K":    { run: [85, 100] },
  "5K":     { run: [85, 100] },
  Trail:    { run: [70, 85] },
  TrailShort: { run: [70, 80] },
  TrailMountain: { run: [65, 80] },
  TrailUltra: { run: [65, 75] },
};

// Use shared normalizer — keep edge function's copy in sync manually
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";

function validateSportRatio(
  metrics: WeekMetrics[],
  objective?: string
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  // Aggregate sport counts across all non-deload weeks
  const totals: Record<string, number> = {};
  for (const wm of metrics) {
    if (wm.isDeload || wm.isRaceWeek) continue;
    for (const [sport, count] of Object.entries(wm.sports)) {
      totals[sport] = (totals[sport] || 0) + count;
    }
  }

  // Only count primary sports (exclude Renfo, Repos)
  const swim = (totals["Natation"] || 0);
  const bike = (totals["Vélo"] || 0);
  const run = (totals["Course"] || 0) + Math.round((totals["Brick"] || 0) * 0.5);
  const bikeAdj = bike + Math.round((totals["Brick"] || 0) * 0.5);
  const primaryTotal = swim + bikeAdj + run;

  if (primaryTotal < 10) {
    return { issues: [], score: 80 }; // Not enough data
  }

  const swimPct = Math.round((swim / primaryTotal) * 100);
  const bikePct = Math.round((bikeAdj / primaryTotal) * 100);
  const runPct = Math.round((run / primaryTotal) * 100);

  // Find target ratios using proper normalization
  const objKey = normalizeObjectiveKey(objective || "");
  const target = SPORT_RATIO_TARGETS[objKey];

  if (!target) {
    // No specific target — just check basic diversity for triathlon-like plans
    if (swim > 0 && bike > 0 && run > 0) {
      return { issues: [], score: 90 };
    }
    return { issues: [], score: 80 };
  }

  let deviations = 0;
  let checks = 0;

  if (target.swim) {
    checks++;
    if (swimPct < target.swim[0] - 3 || swimPct > target.swim[1] + 3) {
      issues.push({
        rule: "sport_ratio",
        severity: swimPct < target.swim[0] - 8 || swimPct > target.swim[1] + 8 ? "error" : "warning",
        message: `Natation ${swimPct}% (cible ${target.swim[0]}-${target.swim[1]}%, tolérance ±3%)`,
        detail: `Total: Nat ${swimPct}%, Vélo ${bikePct}%, Course ${runPct}%`,
      });
      deviations++;
    }
  }

  if (target.bike) {
    checks++;
    if (bikePct < target.bike[0] - 3 || bikePct > target.bike[1] + 3) {
      issues.push({
        rule: "sport_ratio",
        severity: bikePct < target.bike[0] - 8 || bikePct > target.bike[1] + 8 ? "error" : "warning",
        message: `Vélo ${bikePct}% (cible ${target.bike[0]}-${target.bike[1]}%, tolérance ±3%)`,
        detail: `Total: Nat ${swimPct}%, Vélo ${bikePct}%, Course ${runPct}%`,
      });
      deviations++;
    }
  }

  if (target.run) {
    checks++;
    if (runPct < target.run[0] - 3 || runPct > target.run[1] + 3) {
      issues.push({
        rule: "sport_ratio",
        severity: runPct < target.run[0] - 8 || runPct > target.run[1] + 8 ? "error" : "warning",
        message: `Course ${runPct}% (cible ${target.run[0]}-${target.run[1]}%, tolérance ±3%)`,
        detail: `Total: Nat ${swimPct}%, Vélo ${bikePct}%, Course ${runPct}%`,
      });
      deviations++;
    }
  }

  const score = checks > 0 ? Math.round(((checks - deviations) / checks) * 100) : 80;
  return { issues, score };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOGUE/CUSTOM RATIO VALIDATION (Rule 6)
// ═══════════════════════════════════════════════════════════════════════════════

const CATALOG_ID_PATTERN = /\b(?:[A-D]_(?:BIKE|RUN|SWIM|TR|STR|BR|RECOVERY|10K|703|IM|MAR|SEMI|HEAT|TAPER|RECUP|RACE|MENTAL|HALF|PAP|ALTITUDE|RESP|PRE)[A-Za-z0-9_]+|(?:BRICK|ENR|V[0-9]|TPL|RS|BR)_[A-Za-z0-9_]+)/g;
const CUSTOM_PATTERN = /\[Custom\]/gi;

function validateCatalogRatio(plan: ParsedPlan): { issues: ValidationIssue[]; score: number; catalogPct: number; catalogStats: CatalogUsageStats } {
  const issues: ValidationIssue[] = [];
  let catalogSessions = 0;
  let customSessions = 0;
  let totalKeySessions = 0;
  const uniqueCatalogIds = new Set<string>();

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.isRest) continue;
      const text = `${session.title} ${session.details}`;
      const isKey = KEY_SESSION_PATTERNS.test(text);
      if (!isKey) continue;

      totalKeySessions++;
      CATALOG_ID_PATTERN.lastIndex = 0;
      const match = CATALOG_ID_PATTERN.exec(text);
      const isCustom = CUSTOM_PATTERN.test(text);

      if (match) {
        catalogSessions++;
        uniqueCatalogIds.add(match[0]);
      } else if (isCustom) {
        customSessions++;
      }
      CATALOG_ID_PATTERN.lastIndex = 0;
      CUSTOM_PATTERN.lastIndex = 0;
    }
  }

  const stats: CatalogUsageStats = {
    uniqueCatalogIds: uniqueCatalogIds.size,
    catalogSessions,
    customSessions,
    totalKeySessions,
    untaggedSessions: totalKeySessions - catalogSessions - customSessions,
  };

  if (totalKeySessions === 0 || plan.weeks.length < 4) {
    return { issues: [], score: 70, catalogPct: 0, catalogStats: stats };
  }

  const catalogPct = Math.round((catalogSessions / totalKeySessions) * 100);
  const customPct = Math.round((customSessions / totalKeySessions) * 100);
  const untaggedPct = 100 - catalogPct - customPct;

  if (catalogPct < 50) {
    issues.push({
      rule: "catalog_ratio",
      severity: "warning",
      message: `Seulement ${catalogPct}% de séances clés utilisent le catalogue TFCL™ (cible ≥80%)`,
      detail: `Catalogue: ${catalogSessions}/${totalKeySessions}, Custom: ${customSessions}, Non-tagué: ${totalKeySessions - catalogSessions - customSessions}`,
    });
  } else if (catalogPct < 80) {
    issues.push({
      rule: "catalog_ratio",
      severity: "warning",
      message: `${catalogPct}% de séances clés utilisent le catalogue (cible ≥80%)`,
      detail: `Catalogue: ${catalogSessions}/${totalKeySessions}, Custom: ${customSessions}`,
    });
  }

  if (untaggedPct > 30) {
    issues.push({
      rule: "catalog_ratio",
      severity: "info",
      message: `${untaggedPct}% de séances clés sans ID catalogue ni tag [Custom] — traçabilité réduite`,
    });
  }

  const score = catalogPct >= 80 ? 100 : catalogPct >= 60 ? 75 : catalogPct >= 40 ? 50 : 30;
  return { issues, score, catalogPct, catalogStats: stats };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE COHERENCE VALIDATION (Rule 8)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canonical phase ordering for TFCL™ Hybride Lorang periodization.
 * Higher index = later in the plan. Phases must not regress.
 */
const PHASE_ORDER: Record<string, number> = {
  // Metabolic naming (preferred)
  "fondation": 1, "adaptation": 1,
  "chantier": 2, "développement": 2, "build": 2,
  "consolidation": 3,
  "race-specific": 4, "race specific": 4, "spécifique": 4, "specific": 4,
  "affûtage": 5, "taper": 5, "affutage": 5,
};

/** Phase-specific session patterns — sessions expected in each phase */
const PHASE_SESSION_SIGNATURES: Record<number, { expected: RegExp; forbidden: RegExp }> = {
  1: { // Fondation: Force max, VO2max courts, Z2 volume, technique
    expected: /force\s*max|z2|endurance|technique|drill|gammes|éducatif|VO2.{0,10}court|reverse/i,
    forbidden: /race.?pace|simulation\s*(ironman|marathon|70\.3|course)|gut\s*train|affûtage|taper/i,
  },
  2: { // Chantier: Limiteur-specific concentrated work
    expected: /chantier|limiteur|norvégi|billat|sweet\s*spot|train\s*low|sfr|seuil/i,
    forbidden: /taper|affûtage|supercomp|activation\s*j-?2/i,
  },
  3: { // Consolidation: Limiter #2, maintain #1, volume toward peak
    expected: /consolid|maintien|rappel|seuil|allure|durabilité/i,
    forbidden: /taper|affûtage|supercomp/i,
  },
  4: { // Race-Specific: Race-pace, simulations, Gut Training
    expected: /race.?pace|simulation|brique|gut\s*train|allure\s*course|spécifique/i,
    forbidden: /force\s*max\s*3.?[45]|adaptation|fondation.*progressi/i,
  },
  5: { // Affûtage/Taper: Volume reduction, activation, rappels courts
    expected: /taper|affûtage|rappel|activation|supercomp|-\d{2,3}%\s*vol|réduction/i,
    forbidden: /chantier|force\s*max|blocs?\s*concentré|build/i,
  },
};

/** Acceptable phase duration range in weeks */
const PHASE_DURATION_RANGE: Record<number, [number, number]> = {
  1: [2, 6],   // Fondation
  2: [2, 6],   // Chantier
  3: [2, 6],   // Consolidation
  4: [2, 6],   // Race-Specific
  5: [1, 3],   // Affûtage
};

function getPhaseIndex(phaseName: string): number | null {
  const lower = phaseName.toLowerCase().trim();
  for (const [key, idx] of Object.entries(PHASE_ORDER)) {
    if (lower.includes(key)) return idx;
  }
  return null;
}

function validatePhaseCoherence(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  if (!plan.phases || plan.phases.length < 2) {
    // Can't validate if no phases parsed
    if (plan.weeks.length >= 6) {
      issues.push({
        rule: "phase_coherence",
        severity: "warning",
        message: `Plan de ${plan.weeks.length} semaines sans structure de phases/blocs détectée — périodisation incertaine`,
      });
      return { issues, score: 50 };
    }
    return { issues: [], score: 80 };
  }

  let score = 100;

  // 1. Phase ordering — no regression
  let lastPhaseIdx = 0;
  for (const phase of plan.phases) {
    const idx = getPhaseIndex(phase.name);
    if (idx === null) continue;
    if (idx < lastPhaseIdx) {
      issues.push({
        rule: "phase_coherence",
        severity: "error",
        message: `Régression de phase détectée : "${phase.name}" (${phase.weeks}) apparaît APRÈS une phase plus avancée`,
        detail: `La périodisation doit progresser : Fondation → Chantier → Consolidation → Race-Specific → Affûtage. Pas de retour en arrière.`,
      });
      score -= 25;
    }
    lastPhaseIdx = idx;
  }

  // 2. Phase durations — check each phase's week count
  for (const phase of plan.phases) {
    const idx = getPhaseIndex(phase.name);
    if (idx === null) continue;
    const range = PHASE_DURATION_RANGE[idx];
    if (!range) continue;

    // Parse weeks range like "S1-S4" or "Semaines 1-4"
    const weekMatch = phase.weeks.match(/(\d+)\s*[-–àto]\s*(\d+)/);
    if (weekMatch) {
      const duration = parseInt(weekMatch[2]) - parseInt(weekMatch[1]) + 1;
      if (duration < range[0]) {
        issues.push({
          rule: "phase_coherence",
          severity: "warning",
          message: `Phase "${phase.name}" trop courte : ${duration} sem (minimum ${range[0]})`,
          detail: `Un bloc de ${duration} semaine(s) ne permet pas d'adaptations physiologiques significatives.`,
        });
        score -= 10;
      } else if (duration > range[1]) {
        issues.push({
          rule: "phase_coherence",
          severity: "warning",
          message: `Phase "${phase.name}" trop longue : ${duration} sem (maximum recommandé ${range[1]})`,
          detail: `Les blocs concentrés > ${range[1]} sem perdent en spécificité. Considérer un découpage.`,
        });
        score -= 5;
      }
    }
  }

  // 3. Session-phase alignment — check that session content matches declared phase
  for (const week of plan.weeks) {
    const phaseIdx = getPhaseIndex(week.phase);
    if (phaseIdx === null) continue;
    const signatures = PHASE_SESSION_SIGNATURES[phaseIdx];
    if (!signatures) continue;

    for (const session of week.sessions) {
      if (session.isRest) continue;
      const text = `${session.title} ${session.details}`;

      if (signatures.forbidden.test(text)) {
        issues.push({
          rule: "phase_coherence",
          severity: "warning",
          week: week.weekNumber,
          message: `S${week.weekNumber}: "${session.title}" inadapté en phase "${week.phase}" — contenu typique d'une phase différente`,
          detail: `Vérifier la cohérence entre le contenu de séance et la phase déclarée.`,
        });
        score -= 3;
      }
    }
  }

  // 4. Final phase should be Affûtage/Taper for plans ≥ 8 weeks
  if (plan.weeks.length >= 8 && plan.phases.length >= 2) {
    const lastPhase = plan.phases[plan.phases.length - 1];
    const lastIdx = getPhaseIndex(lastPhase.name);
    if (lastIdx !== null && lastIdx < 5) {
      issues.push({
        rule: "phase_coherence",
        severity: "warning",
        message: `Le plan se termine par "${lastPhase.name}" — un bloc d'affûtage est attendu pour les plans ≥ 8 semaines`,
      });
      score -= 10;
    }
  }

  // 5. Reverse Periodization check — Fondation should contain some intensity
  if (plan.phases.length >= 2) {
    const fondationPhase = plan.phases.find(p => getPhaseIndex(p.name) === 1);
    if (fondationPhase) {
      const fondationWeeks = plan.weeks.filter(w => getPhaseIndex(w.phase) === 1);
      const hasIntensity = fondationWeeks.some(w =>
        w.sessions.some(s => /vo2|interval|force\s*max|VO2max|fractionné/i.test(`${s.title} ${s.details}`))
      );
      if (!hasIntensity && fondationWeeks.length >= 2) {
        issues.push({
          rule: "phase_coherence",
          severity: "info",
          message: `Bloc Fondation sans intensité détectée — la Reverse Periodization Lorang recommande des blocs VO2max courts dès la phase 1`,
        });
        score -= 5;
      }
    }
  }

  return { issues, score: Math.max(0, Math.min(100, score)) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROHIBITION VIOLATION DETECTION (Rule 7)
// ═══════════════════════════════════════════════════════════════════════════════

/** Patterns that indicate Sprint Ban violations */
const SPRINT_BAN_VIOLATION_PATTERNS = /tabata|sprint\s*(all[- ]out|neuro|max)|(\d+\s*[×x]\s*\d{1,2}s\s*(sprint|all[- ]out))|micro[- ]interv|drop\s*jump|hurdle\s*rebound|band\s*sprint|plyo\s*explo/i;
/** Patterns that indicate heavy VO2max violations (≥5min @>110% FTP) */
const VO2MAX_HEAVY_VIOLATION_PATTERNS = /[5-9]\s*[×x]\s*5\s*(?:min|')\s*@?\s*(?:1[1-9]\d|115|120)\s*%\s*FTP|tabata\s*vo2|30\/30\s*(?:long|×\s*[2-9]\d)/i;

function validateProhibitionCompliance(
  plan: ParsedPlan,
  prohibitions?: string[]
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  if (!prohibitions || prohibitions.length === 0) {
    return { issues: [], score: 100 };
  }

  const hasSprintBan = prohibitions.some(p => /sprint\s*ban/i.test(p));
  const hasVO2Restriction = prohibitions.some(p => /restriction\s*vo2/i.test(p));

  if (!hasSprintBan && !hasVO2Restriction) {
    return { issues: [], score: 100 };
  }

  let violations = 0;

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.isRest) continue;
      const text = `${session.title} ${session.details}`.toLowerCase();

      if (hasSprintBan && SPRINT_BAN_VIOLATION_PATTERNS.test(text)) {
        violations++;
        issues.push({
          rule: "prohibition_compliance",
          severity: "error",
          week: week.weekNumber,
          message: `S${week.weekNumber}: 🚫 VIOLATION SPRINT BAN — "${session.title}" contient des sprints/Tabata/pliométrie explosive interdits`,
          detail: `Le profil VLamax élevé interdit ce type de séance. Remplacer par Sweet Spot, seuil ou Z2 volume.`,
        });
      }

      if (hasVO2Restriction && VO2MAX_HEAVY_VIOLATION_PATTERNS.test(text)) {
        violations++;
        issues.push({
          rule: "prohibition_compliance",
          severity: "error",
          week: week.weekNumber,
          message: `S${week.weekNumber}: 🚫 VIOLATION VO2max LOURD — "${session.title}" programme des blocs VO2max ≥5min @>110% FTP`,
          detail: `Seuls les intervalles courts (3-4×3min @105-110% FTP) sont autorisés. Remplacer par sweet spot ou seuil.`,
        });
      }
    }
  }

  const totalSessions = plan.weeks.reduce((sum, w) => sum + w.sessions.filter(s => !s.isRest).length, 0);
  const violationRate = totalSessions > 0 ? violations / totalSessions : 0;
  const score = violations === 0 ? 100 : violationRate < 0.05 ? 60 : violationRate < 0.1 ? 30 : 0;

  return { issues, score };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITER ↔ SESSION COHERENCE VALIDATION (Rule 10)
// ═══════════════════════════════════════════════════════════════════════════════

/** Maps limiter keywords to expected session content patterns.
 * IMPORTANT: Patterns are MUTUALLY EXCLUSIVE to prevent priority-dedup from starving lower-rank limiters.
 * Each limiter has its own distinctive patterns that don't overlap with others.
 * A session matching L1 is NOT double-counted for L2/L3/L4 (priority dedup in validator),
 * EXCEPT for proven physiological synergies defined in VLAMAX_CO_CONTRIBUTOR_PATTERNS.
 *
 * OVERLAP AUDIT (2026-04-04):
 * - VLamax vs FatMax: VLamax = glycolytic suppression (train low + Z2 long volume). FatMax = fat oxidation (fat max, lipid, oxydation).
 * - TTE vs FTP: TTE = sustained threshold endurance (seuil continu LONG, norvégienne, MLSS). FTP = power at threshold (sweet spot, over-under, FTP watts).
 * - VLamax vs Durabilité: VLamax = metabolic context (train low, glycolytique). Durabilité = distance context (sortie longue, SL, brick, finish rapide).
 */
const LIMITER_SESSION_PATTERNS: Record<string, RegExp> = {
  // VO2max: High-intensity aerobic intervals — VMA, Billat, PMA, short fractionné
  "vo2max": /vo2|vma|billat|30[\/_ -]?30|interval.*(?:court|rapide)|fractionn|1[01]\d%\s*ftp|pma|z[56]|zone\s*[56]|interval.*(?:z[56]|intense|vo2|vma|haute)|r[ée]p[ée]t|lactate[\s_-]*shuttle/i,

  // VLamax (réduction): Z2 long + train low + endurance fondamentale + SST long (co-contributor)
  "vlamax": /train[\s_-]*low|fasted|[àa]\s*jeun|z2.*(?:long|>?\s*[4-9]\d|>?\s*1[0-9]\d\s*min)|z2[\s_-]*long|ef\b.*(?:long|[4-9]\d|1[0-9]\d\s*min)|endurance.*(?:fondament|longue|foncier)|endurance[\s_-]*long|fondament|glycoly|a[ée]robie\s*(?:pur|fondament|base)|ef\s+z2\s+(?:[4-9]\d|1\d{2})\s*min|heat[\s_-]*acclim|altitude[\s_-]*easy/i,

  // TTE: Sustained threshold endurance — seuil, threshold (bare), tempo, allure spécifique, race pace
  // Now matches: "threshold" alone, "tempo" alone, "seuil" alone, "allure" patterns, "race pace" blocks
  "tte": /seuil|threshold|tempo|allure\s*(?:marathon|semi|course|10k|5k|70\.?3|im\b|ironman|spécifiq|race)|norv[ée]gi|norwegian|mlss|double[\s_-]*threshold|cruise(?:\s*interval)?|race[\s_-]*pace|continu.*z[45]|z[45].*(?:continu|soutenu|bloc)|endurance.*seuil|interval.*seuil|marathon[\s_-]*pace|css/i,

  // FatMax: Fat oxidation specific — fat max, lipid, oxydation lipidique, glycogène, gut training
  "fatmax": /fat\s*(?:max|ox)|lipid|oxydation|glycogène|gut[\s_-]*training|nutrition.*course/i,

  // Économie: Neuromuscular economy — côtes, SFR, force, plio, strides, drill, technique
  // Now matches: strength, force, renfo, gainage, core, PPG, proprio, mobilité, hill, descente
  "économie": /c[ôo]te|sfr|r[øo]nnestad|plio|strides|gammes|drill|cadence|technique|éducatif|low[\s_-]*cadence|force[\s_-]*low[\s_-]*cadence|strength|force|renfo|gainage|core\b|ppg|proprio|muscul|pr[ée]vention|mobilit|hip|hanche|eccentric|excentri|descen|a[ée]ro[\s_-]*hold|bilateral|respir|inspirat/i,

  // FTP: Power at threshold — sweet spot, over-under, FTP intervals
  "ftp": /\bsst\b|sweet[\s_-]*spot|over.?under|race[\s_-]*power|ftp\s*(?:interval|bloc|continu|test)|threshold.*(?:power|puissance)|seuil.*(?:puissance|watts|ftp)|tempo\s*(?:ftp|power)|cp[\s_-]*w[\s_-]*prime|cp.*test/i,

  // Durabilité: Long-distance endurance — sortie longue, long run, brick, simulation, endurance spécifique
  // Now matches: "long" alone in run/ride context, "endurance" with distance context, "back to back", "progressive", "steady long"
  "durabilit": /sortie\s*longue|\bsl\b|long\s*(?:run|ride)|brick|finish.*rapide|durabilité|simulation|course.*longue|back[\s_-]*to[\s_-]*back|progressive|steady[\s_-]*long|endurance\s*(?:im|marathon|semi|spécif|longue)|rolling|neg[\s_-]*split|fartlek/i,

  // Sprint: Sprint/neuromuscular power
  "sprint": /sprint|neuro.*muscul|explo|plyo|force\s*max|vitesse\s*max/i,

  // Pmax: Peak power
  "pmax": /pmax|sprint.*(?:max|all.out)|force\s*max|r[øo]nnestad.*(?:sprint|force)/i,
};

const LIMITER_ALIAS_HINTS: Array<{ pattern: RegExp; aliases: string }> = [
  {
    pattern: /norwegian|norv[ée]gi|double[\s_-]*threshold|mlss|threshold[\s_-]*long|tempo[\s_-]*long|cruise/i,
    aliases: "seuil continu norvégienne mlss threshold long tte",
  },
  {
    pattern: /\bsst\b|sweet[\s_-]*spot|over[\s_-]*under|race[\s_-]*(?:power|pace).*(?:3[\sx_/-]*20|2[\sx_/-]*20|20)|ftp/i,
    aliases: "sweet spot over under ftp seuil puissance race pace threshold power",
  },
  {
    pattern: /train[\s_-]*low|fasted|z2[\s_-]*long|endurance[\s_-]*long|fondation[\s_-]*z2|aerobic[\s_-]*(?:base|endurance)/i,
    aliases: "train low à jeun z2 long endurance fondamentale aérobie pure vlamax",
  },
  {
    pattern: /sfr|low[\s_-]*cadence|force[\s_-]*low[\s_-]*cadence|cadence[\s_-]*(?:40|50|60)|r[øo]nnestad/i,
    aliases: "sfr force basse cadence économie vlamax",
  },
  {
    pattern: /vo2|vma|pma|billat|30[\/_ -]?30/i,
    aliases: "vo2max vma pma billat",
  },
  {
    pattern: /long[\s_-]*run|sortie[\s_-]*longue|brick|race[\s_-]*sim|simulation/i,
    aliases: "sortie longue long run brick durabilité simulation course",
  },
  {
    pattern: /fatmax|fat[\s_-]*(?:ox|max)|lipid|oxydation/i,
    aliases: "fatmax fat max lipid oxydation glycogène train low vlamax",
  },
  {
    pattern: /hill|côte|cote|tech|éducatif|gamme|strides|drill/i,
    aliases: "côtes technique économie strides drill gammes éducatif",
  },
  {
    pattern: /over[\s_-]*under|over_under/i,
    aliases: "over under ftp sweet spot seuil puissance threshold power",
  },
];

const FALLBACK_ZONE_MAP: Record<string, RegExp> = {
  "vo2max": /z[56]|zone\s*[56]|vo2|vma|pma/i,
  "tte": /seuil|threshold|tempo|z4|zone\s*4|race[\s_-]*pace|allure|css/i,
  "ftp": /\bsst\b|sweet[\s_-]*spot|over.?under|ftp|race[\s_-]*power|cp/i,
  "durabilit": /sortie\s*longue|\bsl\b|long(?:\s*(?:run|ride))?|brick|progressive|fartlek|back.to.back|steady/i,
  "vlamax": /z2|endurance|ef\b|train[\s_-]*low|fasted|heat|altitude/i,
  "fatmax": /fat[\s_-]*(?:max|ox)|lipid|oxydation|glycogène|gut/i,
  "économie": /côte|sfr|strides|drill|gammes|technique|éducatif|hill|tech|strength|force|renfo|core|ppg|proprio|mobilit|gainage/i,
};

function buildLimiterMatchText(session: ParsedSession): string {
  const rawText = `${session.sport} ${session.title} ${session.details}`.toLowerCase();
  const catalogId = extractCatalogId(session.title, session.details)?.toLowerCase() ?? "";
  const catalogText = catalogId.replace(/_/g, " ");
  const aliasText = LIMITER_ALIAS_HINTS
    .filter(({ pattern }) => pattern.test(rawText) || (catalogText ? pattern.test(catalogText) : false))
    .map(({ aliases }) => aliases)
    .join(" ");

  return `${rawText} ${catalogText} ${aliasText}`.trim();
}

function detectLimiterKeyFromText(limiterText: string): string | null {
  const lower = limiterText.toLowerCase();
  if (/vo2max/i.test(lower)) return "vo2max";
  if (/vlamax/i.test(lower)) return "vlamax";
  if (/tte|time.to.exhaust/i.test(lower)) return "tte";
  if (/fatmax|fat\s*ox|lipid/i.test(lower)) return "fatmax";
  if (/[ée]conom/i.test(lower)) return "économie";
  if (/ftp.*kg|ftp\/kg|puissance.*a[ée]rob/i.test(lower)) return "ftp";
  if (/durabilit/i.test(lower)) return "durabilit";
  if (/sprint|pmax|neuro/i.test(lower)) return "sprint";
  return null;
}

function detectLimiterKeyFromMetric(metric: string): string | null {
  const lower = metric.toLowerCase();
  if (/vo2max|vma/i.test(lower)) return "vo2max";
  if (/vlamax/i.test(lower)) return "vlamax";
  if (/tte/i.test(lower)) return "tte";
  if (/fatmax|fat\s*ox|lipid/i.test(lower)) return "fatmax";
  if (/[ée]conom/i.test(lower)) return "économie";
  if (/ftp.*kg|ftp\/kg|puissance.*a[ée]rob/i.test(lower)) return "ftp";
  if (/durabilit/i.test(lower)) return "durabilit";
  if (/sprint|pmax|neuro/i.test(lower)) return "sprint";
  return null;
}

export function deriveLimiterKeysFromGapAnalysis(
  gapAnalysis: LimiterGapLike[],
  coachLimiterOrder?: string[]
): string[] {
  if (!gapAnalysis || gapAnalysis.length === 0) return [];

  let rankedGaps = [...gapAnalysis]
    .filter((gap) => gap.weightedImpact > 0 && gap.status !== "unknown")
    .sort((a, b) => b.weightedImpact - a.weightedImpact);

  if (coachLimiterOrder && coachLimiterOrder.length > 0) {
    rankedGaps = rankedGaps.sort((a, b) => {
      const idxA = coachLimiterOrder.indexOf(a.metric);
      const idxB = coachLimiterOrder.indexOf(b.metric);
      const posA = idxA >= 0 ? idxA : 999;
      const posB = idxB >= 0 ? idxB : 999;
      if (posA !== posB) return posA - posB;
      return b.weightedImpact - a.weightedImpact;
    });
  }

  const limiterKeys: string[] = [];
  for (const gap of rankedGaps) {
    const key = detectLimiterKeyFromMetric(gap.metric);
    if (key && !limiterKeys.includes(key)) limiterKeys.push(key);
    if (limiterKeys.length >= 4) break;
  }

  return limiterKeys;
}

function validateLimiterCoherence(
  plan: ParsedPlan,
  identifiedLimiters?: string[],
  identifiedLimiterKeys?: string[]
): { issues: ValidationIssue[]; score: number; coverage: LimiterCoverageItem[] } {
  const issues: ValidationIssue[] = [];
  const coverage: LimiterCoverageItem[] = [];

  if (((!identifiedLimiters || identifiedLimiters.length === 0) && (!identifiedLimiterKeys || identifiedLimiterKeys.length === 0)) || plan.weeks.length < 3) {
    return { issues, score: 100, coverage };
  }

  const limiterKeys: string[] = [];

  if (identifiedLimiterKeys && identifiedLimiterKeys.length > 0) {
    for (const key of identifiedLimiterKeys) {
      if (key && !limiterKeys.includes(key)) limiterKeys.push(key);
      if (limiterKeys.length >= 4) break;
    }
  } else if (identifiedLimiters) {
    // Fallback for legacy callers: extract from prompt text
    for (const limText of identifiedLimiters) {
      const key = detectLimiterKeyFromText(limText);
      if (key && !limiterKeys.includes(key)) limiterKeys.push(key);
      if (limiterKeys.length >= 4) break;
    }
  }

  if (limiterKeys.length === 0) return { issues, score: 80, coverage };

  // Count sessions that match each limiter's expected patterns
  // Priority dedup: each session is assigned to the HIGHEST-PRIORITY limiter it matches (L1 > L2 > L3 > L4)
  // EXCEPTION: Proven synergies allow double-counting (e.g. seuil long → TTE + VLamax, SFR → Économie + VLamax)
  const limiterHits: Record<string, number> = {};
  let totalKeySessions = 0;

  // Co-contributor patterns: sessions that contribute to VLamax reduction via proven synergies
  // - Seuil long continu (TTE work) → glycolytic depletion → VLamax↓ (Billat, Bosquet 2002)
  // - SFR / Force basse cadence → Type I fiber recruitment → VLamax↓ (Rønnestad 2015)
  // - Sweet Spot long → forced Type IIa aerobic recruitment + glycogen depletion → VLamax↓
  //   (especially at low cadence 55-65 RPM: maximal IIa stress in aerobic mode)
  const VLAMAX_CO_CONTRIBUTOR_PATTERNS = /seuil\s*(?:continu|long|2[×x]|1[×x])|norv[ée]gi|mlss|tempo\s*(?:long|continu|soutenu)|sfr|r[øo]nnestad|force\s*(?:basse|50|40|60)\s*(?:rpm|cadence)|cadence\s*(?:basse|lente|50|40|60)|seuil.*(?:\d+\s*min)|interval.*seuil|\bsst\b|sweet[\s_-]*spot/i;
  const TTE_FTP_CROSSOVER_PATTERNS = /\bsst\b|sweet[\s_-]*spot|over.?under|ftp|threshold(?:[\s_-]*(?:power|long|cruise))?|race[\s_-]*(?:pace|power).*(?:2[\sx_/-]*20|3[\sx_/-]*20|20\s*min)|tempo\s*(?:long|continu)|double[\s_-]*threshold|norwegian/i;

  const hasVlamaxLimiter = limiterKeys.includes("vlamax");
  const hasFtpLimiter = limiterKeys.includes("ftp");
  const hasTteLimiter = limiterKeys.includes("tte");

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.isRest) continue;
      const rawText = `${session.title} ${session.details}`;
      if (!KEY_SESSION_PATTERNS.test(rawText)) continue;
      const text = buildLimiterMatchText(session);

      // Assign to highest-priority matching limiter
      let assignedKey: string | null = null;
      for (const lKey of limiterKeys) {
        const pattern = LIMITER_SESSION_PATTERNS[lKey];
        if (pattern && pattern.test(text)) {
          limiterHits[lKey] = (limiterHits[lKey] || 0) + 1;
          assignedKey = lKey;
          break; // Priority dedup: stop at first (highest-rank) match
        }
      }

      // Fallback: if no limiter matched but session has zone/intensity markers,
      // try a relaxed match (e.g. "Z5" → vo2max, "seuil" → tte, "sortie longue" → durabilité)
      if (!assignedKey) {
        for (const lKey of limiterKeys) {
          const fallback = FALLBACK_ZONE_MAP[lKey];
          if (fallback && fallback.test(text)) {
            limiterHits[lKey] = (limiterHits[lKey] || 0) + 1;
            assignedKey = lKey;
            break;
          }
        }
      }

      // Double-counting for proven VLamax co-contributors:
      // If session was assigned to TTE or Économie, also count it for VLamax (if VLamax is a limiter)
      let isLimiterRelevant = assignedKey !== null;

      if (hasVlamaxLimiter && assignedKey !== "vlamax" && (assignedKey === "tte" || assignedKey === "économie" || assignedKey === "ftp")) {
        if (VLAMAX_CO_CONTRIBUTOR_PATTERNS.test(text)) {
          limiterHits["vlamax"] = (limiterHits["vlamax"] || 0) + 1;
          isLimiterRelevant = true;
        }
      }

      if (hasTteLimiter && hasFtpLimiter && TTE_FTP_CROSSOVER_PATTERNS.test(text)) {
        if (assignedKey === "tte") {
          limiterHits["ftp"] = (limiterHits["ftp"] || 0) + 1;
          isLimiterRelevant = true;
        } else if (assignedKey === "ftp") {
          limiterHits["tte"] = (limiterHits["tte"] || 0) + 1;
          isLimiterRelevant = true;
        }
      }

      if (isLimiterRelevant) {
        totalKeySessions++;
      }
    }
  }

  if (totalKeySessions === 0) return { issues, score: 50, coverage };

  // Target thresholds per rank
  const TARGET_BY_RANK = [30, 15, 5, 5];
  let score = 100;

  for (let i = 0; i < limiterKeys.length; i++) {
    const lKey = limiterKeys[i];
    const hits = limiterHits[lKey] || 0;
    const pct = Math.round((hits / totalKeySessions) * 100);
    const target = TARGET_BY_RANK[i] ?? 5;
    const rank = i + 1;
    const status: LimiterCoverageItem["status"] = pct >= target ? "ok" : pct >= target / 3 ? "low" : "absent";

    coverage.push({ rank, key: lKey, hits, totalKeySessions, pct, target, status });

    // Scoring & issues
    if (i === 0) {
      // L1
      if (pct < 15) {
        issues.push({
          rule: "limiter_coherence",
          severity: "error",
          message: `Limiteur #1 (${lKey}) quasi-absent des séances clés : ${pct}% de correspondance (cible ≥${target}%)`,
          detail: `Le plan ne travaille pas suffisamment le limiteur principal détecté par le diagnostic. ${hits}/${totalKeySessions} séances clés ciblent ce limiteur.`,
        });
        score -= 40;
      } else if (pct < target) {
        issues.push({
          rule: "limiter_coherence",
          severity: "warning",
          message: `Limiteur #1 (${lKey}) sous-représenté dans les séances clés : ${pct}% (cible ≥${target}%)`,
          detail: `${hits}/${totalKeySessions} séances clés ciblent ce limiteur.`,
        });
        score -= 15;
      }
    } else if (i === 1) {
      // L2
      if (pct < 5) {
        issues.push({
          rule: "limiter_coherence",
          severity: "warning",
          message: `Limiteur #2 (${lKey}) absent des séances clés : ${pct}% (cible ≥${target}%)`,
          detail: `${hits}/${totalKeySessions} séances clés ciblent ce limiteur secondaire.`,
        });
        score -= 15;
      }
    } else {
      // L3/L4
      if (pct < 5) {
        issues.push({
          rule: "limiter_coherence",
          severity: "info",
          message: `Limiteur #${rank} (${lKey}) non ciblé : ${pct}% des séances clés (recommandé ≥${target}%)`,
          detail: `${hits}/${totalKeySessions} séances clés. Non injecté dans le prompt — couverture attendue via synergies ou séances secondaires.`,
        });
        score -= 5;
      }
    }
  }

  return { issues, score: Math.max(0, score), coverage };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

// RACE DAY PRESENCE VALIDATION (Rule 9)
const RACE_DAY_PATTERNS = /🏁|jour\s*j|course\s*objectif|race\s*day|compétition|épreuve\s*(objectif|cible)|jour\s*de\s*(course|compétition)/i;

function validateRaceDayPresence(plan: ParsedPlan, raceWeekNumbers?: number[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  if (plan.weeks.length === 0) return { issues, score: 100 };

  // Determine which weeks should contain a race day
  const targetWeeks: number[] = raceWeekNumbers && raceWeekNumbers.length > 0
    ? raceWeekNumbers
    : [plan.weeks[plan.weeks.length - 1].weekNumber]; // fallback: last week

  let score = 100;
  const penaltyPerMissing = Math.floor(100 / targetWeeks.length);

  for (const weekNum of targetWeeks) {
    const week = plan.weeks.find(w => w.weekNumber === weekNum);
    if (!week) continue;

    const allSessions = week.sessions || [];
    const realSessions = allSessions.filter(s => !s.isRest);
    const hasRaceDay = allSessions.some(s => {
      const text = `${s.title || ""} ${s.details || ""} ${s.sport || ""}`;
      return RACE_DAY_PATTERNS.test(text);
    });

    if (!hasRaceDay) {
      issues.push({
        rule: "race_day",
        severity: "error",
        week: weekNum,
        message: `🏁 Jour de course absent — S${weekNum} ne contient aucune séance "Jour J" ou "🏁 COURSE OBJECTIF"`,
        detail: "Cette semaine doit inclure le jour de la compétition avec stratégie de pacing et consignes nutrition",
      });
      score -= penaltyPerMissing;
    }

    // Race Week completeness: minimum 5 real sessions expected
    const MIN_RACE_WEEK_SESSIONS = 5;
    if (realSessions.length < MIN_RACE_WEEK_SESSIONS) {
      issues.push({
        rule: "race_day",
        severity: "warning",
        week: weekNum,
        message: `⚠️ Race Week sous-peuplée — S${weekNum} : seulement ${realSessions.length} séance(s) réelle(s) sur ${MIN_RACE_WEEK_SESSIONS} attendues`,
        detail: "La semaine de course doit inclure rappels race-pace, activation pré-course et Jour J",
      });
      score = Math.min(score, 50);
    }
  }

  return { issues, score: Math.max(0, score) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 11: W'BAL FEASIBILITY (Skiba 2012)
// Détecte les intervalles cyclistes où la combinaison intensité/durée/repos
// dépasse la capacité W' de l'athlète (séances physiologiquement infaisables).
// No-op si l'athlète n'a pas de CP/W' calculable.
// ═══════════════════════════════════════════════════════════════════════════════
function validateWbalFeasibility(
  plan: ParsedPlan,
  athleteData?: PlanAthleteData
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  if (!athleteData) {
    return { issues: [], score: 100 };
  }

  const cpResult = analyzeCriticalPower({
    pmax_5s: athleteData.pmax5s ?? null,
    p30s_w: athleteData.p30s ?? null,
    p60s_w: athleteData.p60s ?? null,
    map5min_w: athleteData.map5min ?? null,
    ftp: athleteData.ftp ?? null,
    weight_kg: athleteData.weightKg ?? null,
  });

  if (!cpResult) {
    return { issues: [], score: 100 };
  }

  const cp = cpResult.effectiveCP;
  const wprime = effectiveWprime(cpResult.wprime);
  const ftp = athleteData.ftp ?? cp;
  const wKJ = Math.round(wprime / 100) / 10;

  let scanned = 0;
  let infeasible = 0;
  let tight = 0;

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.isRest) continue;
      if (!isCyclingSession(session)) continue;

      const detected = detectInterval(session.details);
      if (!detected) continue;

      scanned++;

      const refWatts = detected.intensityRef === "FTP" ? ftp : cp;
      const intervalPowerW = Math.round((refWatts * detected.pctIntensity) / 100);

      // Sub-CP intervals: W' n'est pas drainé → toujours faisable
      if (intervalPowerW <= cp) continue;

      // Coût d'1 rep vs W' total (cap physiologique strict)
      const singleRepCostJ = (intervalPowerW - cp) * detected.durationSec;
      if (singleRepCostJ > wprime) {
        infeasible++;
        issues.push({
          rule: "wbal_feasibility",
          severity: "error",
          week: week.weekNumber,
          message: `S${week.weekNumber} — "${session.title}" : 1 rep dépasse W' disponible`,
          detail: `Coût ${Math.round(singleRepCostJ / 100) / 10}kJ > W'=${wKJ}kJ (CP=${cp}W, ${intervalPowerW}W = ${detected.pctIntensity}%${detected.intensityRef}, ${detected.durationSec}s). L'athlète atteindra l'épuisement avant la fin du 1er intervalle.`,
        });
        continue;
      }

      // Simulation multi-rep avec le repos prescrit par le plan
      const prescription = prescribeIntervalRecovery(cp, wprime, intervalPowerW, detected.durationSec, 0);
      const tau = calculateTau(cp, 0); // Skiba 2015 — recoveryPower=0 (passive)
      const wCostPerRep = singleRepCostJ;

      let simWbal = wprime;
      let achievableReps = 0;
      for (let r = 0; r < detected.reps; r++) {
        simWbal = simWbal - wCostPerRep;
        if (simWbal <= 0) break;
        achievableReps++;
        if (r < detected.reps - 1) {
          const depletedNow = wprime - simWbal;
          simWbal = wprime - depletedNow * Math.exp(-detected.originalRestSec / tau);
        }
      }

      if (achievableReps < detected.reps) {
        infeasible++;
        issues.push({
          rule: "wbal_feasibility",
          severity: "error",
          week: week.weekNumber,
          message: `S${week.weekNumber} — "${session.title}" : ${achievableReps}/${detected.reps} reps réalisables`,
          detail: `W'=${wKJ}kJ, CP=${cp}W, ${intervalPowerW}W, repos ${detected.originalRestSec}s → épuisement avant le rep #${achievableReps + 1}. Repos W'bal optimal : ${prescription.optimalRecoverySec}s pour ${prescription.maxReps} reps max.`,
        });
      } else if (prescription.maxReps < detected.reps) {
        // Réalisable au sens strict mais marge W'bal serrée vs optimal
        tight++;
        issues.push({
          rule: "wbal_feasibility",
          severity: "warning",
          week: week.weekNumber,
          message: `S${week.weekNumber} — "${session.title}" : marge W'bal serrée`,
          detail: `${detected.reps} reps demandés, repos ${detected.originalRestSec}s court. Repos optimal W'bal : ${prescription.optimalRecoverySec}s pour préserver la qualité des derniers intervalles.`,
        });
      }
    }
  }

  if (scanned === 0) {
    return { issues: [], score: 100 };
  }

  const failureRate = infeasible / scanned;
  const tightRate = tight / scanned;
  const score = Math.max(0, Math.round(100 - failureRate * 100 - tightRate * 30));

  return { issues, score };
}

export function validatePlan(
  plan: ParsedPlan,
  objective?: string,
  prohibitions?: string[],
  raceWeekNumbers?: number[],
  identifiedLimiters?: string[],
  identifiedLimiterKeys?: string[],
  athleteData?: PlanAthleteData
): PlanValidationResult {
  // Extract metrics for each week
  const weekMetrics = plan.weeks.map(extractWeekMetrics);

  // Run all validation rules
  const polarization = validatePolarization(weekMetrics);
  const loadPattern = validateLoadPattern(weekMetrics);
  const keySessions = validateKeySessions(weekMetrics);
  const progression = validateProgression(weekMetrics);
  const sportRatio = validateSportRatio(weekMetrics, objective);
  const catalogRatio = validateCatalogRatio(plan);
  const prohibitionCompliance = validateProhibitionCompliance(plan, prohibitions);
  const phaseCoherence = validatePhaseCoherence(plan);
  const raceDayPresence = validateRaceDayPresence(plan, raceWeekNumbers);
  const limiterCoherence = validateLimiterCoherence(plan, identifiedLimiters, identifiedLimiterKeys);
  const wbalFeasibility = validateWbalFeasibility(plan, athleteData);

  // Combine all issues
  const allIssues = [
    ...polarization.issues,
    ...loadPattern.issues,
    ...keySessions.issues,
    ...progression.issues,
    ...sportRatio.issues,
    ...catalogRatio.issues,
    ...prohibitionCompliance.issues,
    ...phaseCoherence.issues,
    ...raceDayPresence.issues,
    ...limiterCoherence.issues,
    ...wbalFeasibility.issues,
  ];

  // Weighted score (11 rules)
  const weights = {
    polarization: 0.13,
    loadPattern: 0.09,
    keySessions: 0.09,
    progression: 0.07,
    sportRatio: 0.07,
    catalogRatio: 0.05,
    prohibitionCompliance: 0.14,
    phaseCoherence: 0.09,
    raceDayPresence: 0.07,
    limiterCoherence: 0.10,
    wbalFeasibility: 0.10,
  };
  const weightedScore = Math.round(
    polarization.score * weights.polarization +
    loadPattern.score * weights.loadPattern +
    keySessions.score * weights.keySessions +
    progression.score * weights.progression +
    sportRatio.score * weights.sportRatio +
    catalogRatio.score * weights.catalogRatio +
    prohibitionCompliance.score * weights.prohibitionCompliance +
    phaseCoherence.score * weights.phaseCoherence +
    raceDayPresence.score * weights.raceDayPresence +
    limiterCoherence.score * weights.limiterCoherence +
    wbalFeasibility.score * weights.wbalFeasibility
  );

  // Grade
  const grade = weightedScore >= 85 ? "A" : weightedScore >= 70 ? "B" : weightedScore >= 55 ? "C" : weightedScore >= 40 ? "D" : "F";

  // Summary comment
  const errorCount = allIssues.filter(i => i.severity === "error").length;
  const warningCount = allIssues.filter(i => i.severity === "warning").length;
  const prohibitionViolations = prohibitionCompliance.issues.filter(i => i.severity === "error").length;
  const phaseErrors = phaseCoherence.issues.filter(i => i.severity === "error").length;
  const raceDayMissing = raceDayPresence.issues.filter(i => i.severity === "error").length;
  const limiterErrors = limiterCoherence.issues.filter(i => i.severity === "error").length;
  const wbalErrors = wbalFeasibility.issues.filter(i => i.severity === "error").length;
  const overallComment = prohibitionViolations > 0
    ? `🚫 ${prohibitionViolations} VIOLATION(S) DE PROHIBITION DÉTECTÉE(S) — Plan NON CONFORME au diagnostic physiologique`
    : wbalErrors > 0
    ? `⚡ ${wbalErrors} séance(s) infaisable(s) selon le W'bal de l'athlète — intensité, durée ou repos à revoir`
    : limiterErrors > 0
    ? `⚠️ ${limiterErrors} incohérence(s) limiteur↔séances — le plan ne cible pas les limiteurs détectés par le diagnostic`
    : raceDayMissing > 0
    ? `🏁 Jour de course absent de la dernière semaine — le plan doit inclure le Jour J`
    : phaseErrors > 0
    ? `⚠️ ${phaseErrors} incohérence(s) de phase détectée(s) — périodisation à corriger`
    : errorCount === 0 && warningCount === 0
    ? "✅ Plan conforme aux standards élite TFCL™"
    : errorCount === 0
    ? `⚠️ ${warningCount} avertissement(s) mineur(s) — plan globalement conforme`
    : `❌ ${errorCount} problème(s) critique(s) et ${warningCount} avertissement(s) détectés`;

  return {
    score: weightedScore,
    grade,
    issues: allIssues,
    weekMetrics,
    limiterCoverage: limiterCoherence.coverage,
    catalogStats: catalogRatio.catalogStats,
    summary: {
      polarizationScore: polarization.score,
      loadPatternScore: loadPattern.score,
      keySessionsScore: keySessions.score,
      progressionScore: progression.score,
      sportRatioScore: sportRatio.score,
      catalogRatioScore: catalogRatio.score,
      prohibitionComplianceScore: prohibitionCompliance.score,
      phaseCoherenceScore: phaseCoherence.score,
      raceDayScore: raceDayPresence.score,
      limiterCoherenceScore: limiterCoherence.score,
      wbalFeasibilityScore: wbalFeasibility.score,
      overallComment,
    },
  };
}

/**
 * Format validation result as a human-readable markdown string
 */
export function formatValidationReport(result: PlanValidationResult): string {
  const lines: string[] = [];
  
  lines.push(`## 📊 Rapport Qualité TFCL™ — Score: ${result.score}/100 (${result.grade})`);
  lines.push("");
  lines.push(`| Critère | Score | Statut |`);
  lines.push(`|---------|-------|--------|`);
  lines.push(`| Polarisation 80/20 | ${result.summary.polarizationScore}/100 | ${result.summary.polarizationScore >= 75 ? "✅" : result.summary.polarizationScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| Décharge 3:1/2:1 | ${result.summary.loadPatternScore}/100 | ${result.summary.loadPatternScore >= 75 ? "✅" : result.summary.loadPatternScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| Séances clés | ${result.summary.keySessionsScore}/100 | ${result.summary.keySessionsScore >= 75 ? "✅" : result.summary.keySessionsScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| Progression volume | ${result.summary.progressionScore}/100 | ${result.summary.progressionScore >= 75 ? "✅" : result.summary.progressionScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| Ratio sportif | ${result.summary.sportRatioScore}/100 | ${result.summary.sportRatioScore >= 75 ? "✅" : result.summary.sportRatioScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| Catalogue TFCL™ | ${result.summary.catalogRatioScore}/100 | ${result.summary.catalogRatioScore >= 75 ? "✅" : result.summary.catalogRatioScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 🚫 Conformité prohibitions | ${result.summary.prohibitionComplianceScore}/100 | ${result.summary.prohibitionComplianceScore >= 75 ? "✅" : result.summary.prohibitionComplianceScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 📦 Cohérence des phases | ${result.summary.phaseCoherenceScore}/100 | ${result.summary.phaseCoherenceScore >= 75 ? "✅" : result.summary.phaseCoherenceScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 🏁 Jour de course | ${result.summary.raceDayScore}/100 | ${result.summary.raceDayScore >= 100 ? "✅" : "❌"} |`);
  lines.push(`| 🎯 Cohérence limiteurs↔séances | ${result.summary.limiterCoherenceScore}/100 | ${result.summary.limiterCoherenceScore >= 75 ? "✅" : result.summary.limiterCoherenceScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| ⚡ Faisabilité W'bal | ${result.summary.wbalFeasibilityScore}/100 | ${result.summary.wbalFeasibilityScore >= 90 ? "✅" : result.summary.wbalFeasibilityScore >= 70 ? "⚠️" : "❌"} |`);
  lines.push("");
  lines.push(`**${result.summary.overallComment}**`);

  if (result.issues.length > 0) {
    lines.push("");
    lines.push("### Détails");
    
    // Prohibition violations first (most critical)
    const prohibitionErrors = result.issues.filter(i => i.rule === "prohibition_compliance");
    const phaseErrors = result.issues.filter(i => i.rule === "phase_coherence" && i.severity === "error");
    const raceDayErrors = result.issues.filter(i => i.rule === "race_day");
    const wbalErrors = result.issues.filter(i => i.rule === "wbal_feasibility" && i.severity === "error");
    const otherErrors = result.issues.filter(i => i.severity === "error" && !["prohibition_compliance", "phase_coherence", "race_day", "wbal_feasibility"].includes(i.rule));
    const warnings = result.issues.filter(i => i.severity === "warning");

    if (prohibitionErrors.length > 0) {
      lines.push("\n**🚫 Violations de prohibition (CRITIQUE — incohérence avec le diagnostic) :**");
      prohibitionErrors.forEach(e => lines.push(`- ${e.message}`));
      if (prohibitionErrors[0]?.detail) lines.push(`  → ${prohibitionErrors[0].detail}`);
    }
    if (wbalErrors.length > 0) {
      lines.push("\n**⚡ Séances infaisables selon le W'bal de l'athlète (Skiba 2012) :**");
      wbalErrors.slice(0, 8).forEach(e => {
        lines.push(`- ${e.message}`);
        if (e.detail) lines.push(`  → ${e.detail}`);
      });
      if (wbalErrors.length > 8) lines.push(`- ... et ${wbalErrors.length - 8} autres séances infaisables`);
    }
    if (phaseErrors.length > 0) {
      lines.push("\n**📦 Incohérences de phase (CRITIQUE — périodisation non conforme) :**");
      phaseErrors.forEach(e => lines.push(`- ${e.message}`));
      if (phaseErrors[0]?.detail) lines.push(`  → ${phaseErrors[0].detail}`);
    }
    if (raceDayErrors.length > 0) {
      lines.push("\n**🏁 Jour de course manquant :**");
      raceDayErrors.forEach(e => lines.push(`- ${e.message}`));
    }
    if (otherErrors.length > 0) {
      lines.push("\n**❌ Erreurs critiques :**");
      otherErrors.forEach(e => lines.push(`- ${e.message}`));
    }
    if (warnings.length > 0) {
      lines.push("\n**⚠️ Avertissements :**");
      warnings.slice(0, 10).forEach(w => lines.push(`- ${w.message}`));
      if (warnings.length > 10) lines.push(`- ... et ${warnings.length - 10} autres`);
    }
  }

  return lines.join("\n");
}
