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
 * 6. Catalog adherence (TFCL™ IDs vs [Custom])
 * 7. Race day presence in race week
 * 8. Weekly structure completeness (7-day coverage)
 * 9. Rest day presence
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

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
  /** Unique day indices covered by sessions */
  coveredDays: number;
  /** Has at least one rest-only day */
  hasRestDay: boolean;
  /** Has a race day session (🏁 or "course"/"race" sport with race indicators) */
  hasRaceDaySession: boolean;
}

export interface PlanValidationResult {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  issues: ValidationIssue[];
  weekMetrics: WeekMetrics[];
  summary: {
    polarizationScore: number;
    loadPatternScore: number;
    keySessionsScore: number;
    progressionScore: number;
    sportRatioScore: number;
    catalogRatioScore: number;
    structureScore: number;
    limiterAlignmentScore: number;
    overallComment: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENSITY CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

const LOW_INTENSITY_PATTERNS = /z[12]|endurance|ef\b|footing|récup|recovery|easy|facile|aérobie|z2|zone\s*[12]|fondament|repos actif|régénér|souplesse|mobilité|technique|drill|gammes|éducatif/i;
const MID_INTENSITY_PATTERNS = /z3|tempo\b|allure\s*marathon|sweet\s*spot|zone\s*3|endurance\s*active|fartlek\s*léger/i;
const HIGH_INTENSITY_PATTERNS = /z[4-7]|seuil|threshold|vo2|vma|interval|fractionné|sprint|hiit|30\/30|pma|over.under|norvégienne|billat|canova|race.pace|race.sim|compétition|course\b.*\brace|🏁|force\s*max|plio|rønnestad|sfr|côtes?\s*\d/i;
const KEY_SESSION_PATTERNS = /🔑|clé|key|séance\s*clé|interval|seuil|vo2|vma|sortie\s*longue|sl\b|long\s*run|brick|race.sim|test|compétition|🏁/i;
const DELOAD_PATTERNS = /décharge|deload|récup|recovery|repos|allégé|réduit|taper|affûtage|régénér/i;
const RACE_PATTERNS = /🏁|course\b|race|compétition|épreuve|objectif|marathon|ironman|triathlon|semi|trail|10k/i;
const RACE_DAY_PATTERNS = /🏁|jour\s*(de\s*)?course|jour\s*j|race\s*day|compétition|épreuve/i;

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

function isRaceDaySession(session: ParsedSession): boolean {
  if (session.isRest) return false;
  const text = `${session.sport} ${session.title} ${session.details}`;
  return RACE_DAY_PATTERNS.test(text);
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

  // Race week detection — check theme AND session content
  const isRaceWeek = RACE_PATTERNS.test(themeText) || 
    week.sessions.some(s => RACE_PATTERNS.test(`${s.title} ${s.details}`));

  // Key sessions
  const keySessions = activeSessions.filter(isKeySession).length;

  // Day coverage: unique day indices with sessions
  const dayIndices = new Set(week.sessions.filter(s => s.dayIndex >= 0).map(s => s.dayIndex));
  const coveredDays = dayIndices.size;

  // Rest day: a day index where ONLY rest sessions exist
  const activeDayIndices = new Set(activeSessions.filter(s => s.dayIndex >= 0).map(s => s.dayIndex));
  const restOnlyDays = [...dayIndices].filter(d => !activeDayIndices.has(d));
  const hasRestDay = restOnlyDays.length > 0 || restDays > 0;

  // Race day session
  const hasRaceDaySession = week.sessions.some(isRaceDaySession);

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
    coveredDays,
    hasRestDay,
    hasRaceDaySession,
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
  Trail:    { run: [70, 85] },
  TrailUltra: { run: [65, 80] },
};

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

  // Find target ratios
  const obj = (objective || "").replace(/\s/g, "");
  const target = SPORT_RATIO_TARGETS[obj] || SPORT_RATIO_TARGETS[obj.toUpperCase()];

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
    if (swimPct < target.swim[0] - 5 || swimPct > target.swim[1] + 5) {
      issues.push({
        rule: "sport_ratio",
        severity: swimPct < target.swim[0] - 10 || swimPct > target.swim[1] + 10 ? "error" : "warning",
        message: `Natation ${swimPct}% (cible ${target.swim[0]}-${target.swim[1]}%)`,
        detail: `Total: Nat ${swimPct}%, Vélo ${bikePct}%, Course ${runPct}%`,
      });
      deviations++;
    }
  }

  if (target.bike) {
    checks++;
    if (bikePct < target.bike[0] - 5 || bikePct > target.bike[1] + 5) {
      issues.push({
        rule: "sport_ratio",
        severity: bikePct < target.bike[0] - 10 || bikePct > target.bike[1] + 10 ? "error" : "warning",
        message: `Vélo ${bikePct}% (cible ${target.bike[0]}-${target.bike[1]}%)`,
        detail: `Total: Nat ${swimPct}%, Vélo ${bikePct}%, Course ${runPct}%`,
      });
      deviations++;
    }
  }

  if (target.run) {
    checks++;
    if (runPct < target.run[0] - 5 || runPct > target.run[1] + 5) {
      issues.push({
        rule: "sport_ratio",
        severity: runPct < target.run[0] - 10 || runPct > target.run[1] + 10 ? "error" : "warning",
        message: `Course ${runPct}% (cible ${target.run[0]}-${target.run[1]}%)`,
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

const CATALOG_ID_PATTERN = /\b[A-Z]{1,3}_(?:BIKE|RUN|SWIM|TR|STR|BR|RECOVERY)[A-Z0-9_]+/g;
const CUSTOM_PATTERN = /\[Custom\]/gi;

function validateCatalogRatio(plan: ParsedPlan): { issues: ValidationIssue[]; score: number; catalogPct: number } {
  const issues: ValidationIssue[] = [];
  let catalogSessions = 0;
  let customSessions = 0;
  let totalKeySessions = 0;

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.isRest) continue;
      const text = `${session.title} ${session.details}`;
      const isKey = KEY_SESSION_PATTERNS.test(text);
      if (!isKey) continue;

      totalKeySessions++;
      const hasCatalogId = CATALOG_ID_PATTERN.test(text);
      const isCustom = CUSTOM_PATTERN.test(text);

      if (hasCatalogId) {
        catalogSessions++;
      } else if (isCustom) {
        customSessions++;
      }
      // Reset regex lastIndex
      CATALOG_ID_PATTERN.lastIndex = 0;
      CUSTOM_PATTERN.lastIndex = 0;
    }
  }

  if (totalKeySessions === 0 || plan.weeks.length < 4) {
    return { issues: [], score: 70, catalogPct: 0 };
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
  return { issues, score, catalogPct };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURE VALIDATION (Rules 7, 8, 9)
// ═══════════════════════════════════════════════════════════════════════════════

/** Rule 7: Race day must exist in race weeks */
function validateRaceDay(metrics: WeekMetrics[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const raceWeeks = metrics.filter(m => m.isRaceWeek);

  if (raceWeeks.length === 0) {
    return { issues: [], score: 100 }; // No race weeks to validate
  }

  let compliant = 0;
  for (const wm of raceWeeks) {
    if (!wm.hasRaceDaySession) {
      issues.push({
        rule: "race_day",
        severity: "error",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: Semaine de course sans séance "🏁 Jour de Course" détectée — le jour de course est remplacé par Repos ou une séance classique`,
        detail: `Thème: "${wm.theme}". Le jour de la course DOIT contenir une entrée sport="🏁 Course" avec "JOUR DE COURSE".`,
      });
    } else {
      compliant++;
    }
  }

  const score = raceWeeks.length > 0 ? Math.round((compliant / raceWeeks.length) * 100) : 100;
  return { issues, score };
}

/** Rule 8: Each week should cover 7 days */
function validateWeeklyStructure(metrics: WeekMetrics[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  let compliant = 0;

  for (const wm of metrics) {
    if (wm.coveredDays < 5) {
      issues.push({
        rule: "weekly_structure",
        severity: "warning",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: Seulement ${wm.coveredDays}/7 jours couverts — structure incomplète`,
        detail: `Un plan complet doit spécifier une activité ou repos pour chaque jour de la semaine.`,
      });
    } else {
      compliant++;
    }
  }

  const score = metrics.length > 0 ? Math.round((compliant / metrics.length) * 100) : 100;
  return { issues, score };
}

/** Rule 9: Each non-deload week should have at least 1 rest day */
function validateRestDays(metrics: WeekMetrics[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  let compliant = 0;

  for (const wm of metrics) {
    if (wm.isDeload) {
      compliant++;
      continue;
    }

    if (!wm.hasRestDay) {
      issues.push({
        rule: "rest_day",
        severity: "warning",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: Aucun jour de repos complet détecté — risque de surmenage`,
        detail: `Recommandation: minimum 1 jour de repos complet par semaine.`,
      });
    } else {
      compliant++;
    }
  }

  const score = metrics.length > 0 ? Math.round((compliant / metrics.length) * 100) : 100;
  return { issues, score };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITER ALIGNMENT VALIDATION (Rule 10)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps limiter keywords (from formatLimitersForPrompt) to expected session patterns.
 * If the plan's key sessions don't contain sessions targeting a limiter, it's flagged.
 */
const LIMITER_SESSION_PATTERNS: Record<string, { label: string; patterns: RegExp }> = {
  "VO2max": {
    label: "VO2max / Moteur aérobie",
    patterns: /vo2|vma|interval.*(?:3|4|5)\s*min|pma|30\/30|billat|norvégi|z5|zone\s*5|VO2max/i,
  },
  "FTP/kg": {
    label: "FTP/kg / Seuil",
    patterns: /ftp|seuil|threshold|sweet\s*spot|z4|zone\s*4|over.under|tempo\s*long|cruise/i,
  },
  "VLamax": {
    label: "VLamax (réduction glycolytique)",
    patterns: /z2|endurance\s*fond|ef\b|train\s*low|aérobie|zone\s*2|long\s*ride|sortie\s*longue|sl\b|sprint\s*ban|endurance|fondament/i,
  },
  "TTE": {
    label: "TTE / Durabilité au seuil",
    patterns: /tte|seuil\s*long|threshold\s*ext|sweet\s*spot|tempo|z3.*long|z4.*long|over.under|cruise\s*interval|endurance\s*active/i,
  },
  "Économie": {
    label: "Économie de course",
    patterns: /économie|economy|cadence|drill|éducatif|gammes|technique|foulée|strides|plio|force\s*pied|renfo.*pied|côtes?\s*court/i,
  },
  "FatMax": {
    label: "FatMax / Oxydation lipidique",
    patterns: /fatmax|fat\s*ox|train\s*low|z2\s*long|endurance\s*fond|jeûn|glycog|zone\s*2.*long|sortie\s*longue|sl\b|aérobie\s*long/i,
  },
  "Robustesse": {
    label: "Robustesse / Durabilité",
    patterns: /durabilit|robustesse|sortie\s*longue|sl\b|long\s*run|long\s*ride|brick|z2\s*long|endurance\s*long|fatigue\s*resist/i,
  },
};

function detectLimiterFromPromptText(limiterText: string): string | null {
  // Extract the metric name from formatted limiter strings
  // e.g. "### Limiteur #1 — VO2max (Impact: 85.0/100)" → "VO2max"
  // e.g. "🎯 LIMITEUR PRIMAIRE : VLamax trop haute" → "VLamax"
  for (const metric of Object.keys(LIMITER_SESSION_PATTERNS)) {
    if (limiterText.includes(metric)) return metric;
  }
  // Also match common French labels
  if (/moteur\s*aérobie/i.test(limiterText)) return "VO2max";
  if (/glycolytique|vlamax/i.test(limiterText)) return "VLamax";
  if (/durabilité|robustesse/i.test(limiterText)) return "Robustesse";
  if (/économie/i.test(limiterText)) return "Économie";
  if (/fatmax|lipid/i.test(limiterText)) return "FatMax";
  if (/tte|seuil/i.test(limiterText)) return "TTE";
  if (/ftp/i.test(limiterText)) return "FTP/kg";
  return null;
}

function validateLimiterAlignment(
  metrics: WeekMetrics[],
  plan: ParsedPlan,
  identifiedLimiters?: string[]
): { issues: ValidationIssue[]; score: number; details: Record<string, { found: number; total: number }> } {
  const issues: ValidationIssue[] = [];
  const details: Record<string, { found: number; total: number }> = {};

  if (!identifiedLimiters || identifiedLimiters.length === 0) {
    return { issues: [], score: 100, details };
  }

  // Extract unique limiter metrics from the prompt text (ordered by priority)
  const detectedMetrics: string[] = [];
  for (const text of identifiedLimiters) {
    const metric = detectLimiterFromPromptText(text);
    if (metric && !detectedMetrics.includes(metric)) {
      detectedMetrics.push(metric);
    }
  }

  if (detectedMetrics.length === 0) {
    return { issues: [], score: 100, details };
  }

  // ── Split plan into chronological thirds (Base / Build / Spécifique) ────
  const loadWeeks = metrics.filter(m => !m.isDeload && !m.isRaceWeek);
  const totalLoadWeeks = loadWeeks.length || 1;

  const thirdLen = Math.max(1, Math.ceil(loadWeeks.length / 3));
  const phases = {
    base: loadWeeks.slice(0, thirdLen),
    build: loadWeeks.slice(thirdLen, thirdLen * 2),
    specific: loadWeeks.slice(thirdLen * 2),
  };

  // Helper: count weeks with matching sessions in a phase
  function countMatchesInPhase(phaseWeeks: WeekMetrics[], pattern: RegExp): number {
    let matches = 0;
    for (const wm of phaseWeeks) {
      const week = plan.weeks.find(w => w.weekNumber === wm.weekNumber);
      if (!week) continue;
      const hasMatch = week.sessions.some(s => {
        if (s.isRest) return false;
        const text = `${s.sport} ${s.title} ${s.details}`;
        return pattern.test(text);
      });
      if (hasMatch) matches++;
    }
    return matches;
  }

  let totalScore = 0;
  let totalWeight = 0;

  for (let i = 0; i < Math.min(detectedMetrics.length, 3); i++) {
    const metric = detectedMetrics[i];
    const config = LIMITER_SESSION_PATTERNS[metric];
    if (!config) continue;

    const label = config.label;
    const rank = i + 1; // 1 = primary, 2 = secondary, 3 = tertiary

    // Count matches per phase
    const baseMatches = countMatchesInPhase(phases.base, config.patterns);
    const buildMatches = countMatchesInPhase(phases.build, config.patterns);
    const specificMatches = countMatchesInPhase(phases.specific, config.patterns);
    const totalMatches = baseMatches + buildMatches + specificMatches;

    details[metric] = { found: totalMatches, total: totalLoadWeeks };

    // ── Chronological validation (Block Periodization) ─────────────────
    // Limiter #1: MUST dominate Base phase (≥70% coverage), present in Build (≥50%)
    // Limiter #2: Can be light in Base, MUST dominate Build phase (≥60%)
    // Limiter #3+: Addressed in Specific phase primarily (≥40%)

    const basePct = phases.base.length > 0 ? Math.round((baseMatches / phases.base.length) * 100) : 0;
    const buildPct = phases.build.length > 0 ? Math.round((buildMatches / phases.build.length) * 100) : 0;
    const specificPct = phases.specific.length > 0 ? Math.round((specificMatches / phases.specific.length) * 100) : 0;

    if (rank === 1) {
      // Primary limiter: must dominate Base, remain present throughout
      const weight = 3;
      totalWeight += weight;

      if (basePct < 50) {
        issues.push({
          rule: "limiter_alignment",
          severity: basePct < 30 ? "error" : "warning",
          message: `Limiteur #1 "${label}" : seulement ${basePct}% de couverture en phase Base (cible ≥70%) — le limiteur primaire doit dominer les premières semaines`,
          detail: `Base: ${baseMatches}/${phases.base.length} sem, Build: ${buildMatches}/${phases.build.length}, Spé: ${specificMatches}/${phases.specific.length}`,
        });
        totalScore += Math.min(100, basePct * (100 / 70)) * weight * 0.5;
      } else if (basePct < 70) {
        issues.push({
          rule: "limiter_alignment",
          severity: "warning",
          message: `Limiteur #1 "${label}" : ${basePct}% de couverture en phase Base (cible ≥70%)`,
          detail: `Base: ${baseMatches}/${phases.base.length} sem, Build: ${buildMatches}/${phases.build.length}, Spé: ${specificMatches}/${phases.specific.length}`,
        });
        totalScore += 70 * weight;
      } else {
        totalScore += 100 * weight;
      }

      // Check it doesn't disappear completely in Build
      if (buildPct < 30 && phases.build.length >= 2) {
        issues.push({
          rule: "limiter_alignment",
          severity: "warning",
          message: `Limiteur #1 "${label}" : disparaît en phase Build (${buildPct}%) — le maintien est nécessaire même quand le #2 monte`,
        });
      }

    } else if (rank === 2) {
      // Secondary limiter: light in Base, dominant in Build
      const weight = 2;
      totalWeight += weight;

      if (buildPct < 40) {
        issues.push({
          rule: "limiter_alignment",
          severity: buildPct < 20 ? "error" : "warning",
          message: `Limiteur #2 "${label}" : seulement ${buildPct}% de couverture en phase Build (cible ≥60%) — le limiteur secondaire doit monter en Build`,
          detail: `Base: ${baseMatches}/${phases.base.length} sem, Build: ${buildMatches}/${phases.build.length}, Spé: ${specificMatches}/${phases.specific.length}`,
        });
        totalScore += Math.min(100, buildPct * (100 / 60)) * weight * 0.5;
      } else if (buildPct < 60) {
        issues.push({
          rule: "limiter_alignment",
          severity: "warning",
          message: `Limiteur #2 "${label}" : ${buildPct}% de couverture en phase Build (cible ≥60%)`,
        });
        totalScore += 70 * weight;
      } else {
        totalScore += 100 * weight;
      }

    } else {
      // Tertiary+ limiter: addressed in Specific or throughout
      const weight = 1;
      totalWeight += weight;
      const globalPct = Math.round((totalMatches / totalLoadWeeks) * 100);

      if (globalPct < 25) {
        issues.push({
          rule: "limiter_alignment",
          severity: "warning",
          message: `Limiteur #${rank} "${label}" : ${globalPct}% de couverture globale (cible ≥40%) — intégrer via séances complémentaires en phase Spécifique`,
          detail: `Base: ${baseMatches}/${phases.base.length} sem, Build: ${buildMatches}/${phases.build.length}, Spé: ${specificMatches}/${phases.specific.length}`,
        });
        totalScore += Math.min(100, globalPct * (100 / 40)) * weight * 0.5;
      } else {
        totalScore += Math.min(100, globalPct * (100 / 40)) * weight;
      }
    }
  }

  const score = totalWeight > 0 ? Math.round(totalScore / (totalWeight * 100) * 100) : 100;
  return { issues, score: Math.min(100, Math.max(0, score)), details };
}



// MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function validatePlan(plan: ParsedPlan, objective?: string, identifiedLimiters?: string[]): PlanValidationResult {
  // Extract metrics for each week
  const weekMetrics = plan.weeks.map(extractWeekMetrics);

  // Run all validation rules
  const polarization = validatePolarization(weekMetrics);
  const loadPattern = validateLoadPattern(weekMetrics);
  const keySessions = validateKeySessions(weekMetrics);
  const progression = validateProgression(weekMetrics);
  const sportRatio = validateSportRatio(weekMetrics, objective);
  const catalogRatio = validateCatalogRatio(plan);
  const raceDay = validateRaceDay(weekMetrics);
  const weeklyStructure = validateWeeklyStructure(weekMetrics);
  const restDays = validateRestDays(weekMetrics);
  const limiterAlignment = validateLimiterAlignment(weekMetrics, plan, identifiedLimiters);

  // Combine structure scores (Rules 7+8+9)
  const structureScore = Math.round(
    raceDay.score * 0.40 +
    weeklyStructure.score * 0.30 +
    restDays.score * 0.30
  );

  // Combine all issues
  const allIssues = [
    ...polarization.issues,
    ...loadPattern.issues,
    ...keySessions.issues,
    ...progression.issues,
    ...sportRatio.issues,
    ...catalogRatio.issues,
    ...raceDay.issues,
    ...weeklyStructure.issues,
    ...restDays.issues,
    ...limiterAlignment.issues,
  ];

  // Has limiters? Include limiter alignment in scoring
  const hasLimiters = identifiedLimiters && identifiedLimiters.length > 0;

  // Weighted score (8 rule groups when limiters are present)
  const weights = hasLimiters ? {
    polarization: 0.16,
    loadPattern: 0.15,
    keySessions: 0.15,
    progression: 0.10,
    sportRatio: 0.08,
    catalogRatio: 0.06,
    structure: 0.12,
    limiterAlignment: 0.18,
  } : {
    polarization: 0.20,
    loadPattern: 0.18,
    keySessions: 0.18,
    progression: 0.12,
    sportRatio: 0.10,
    catalogRatio: 0.07,
    structure: 0.15,
    limiterAlignment: 0,
  };

  const weightedScore = Math.round(
    polarization.score * weights.polarization +
    loadPattern.score * weights.loadPattern +
    keySessions.score * weights.keySessions +
    progression.score * weights.progression +
    sportRatio.score * weights.sportRatio +
    catalogRatio.score * weights.catalogRatio +
    structureScore * weights.structure +
    limiterAlignment.score * weights.limiterAlignment
  );

  // Grade
  const grade = weightedScore >= 85 ? "A" : weightedScore >= 70 ? "B" : weightedScore >= 55 ? "C" : weightedScore >= 40 ? "D" : "F";

  // Summary comment
  const errorCount = allIssues.filter(i => i.severity === "error").length;
  const warningCount = allIssues.filter(i => i.severity === "warning").length;
  const overallComment = errorCount === 0 && warningCount === 0
    ? "✅ Plan conforme aux standards élite TFCL™"
    : errorCount === 0
    ? `⚠️ ${warningCount} avertissement(s) mineur(s) — plan globalement conforme`
    : `❌ ${errorCount} problème(s) critique(s) et ${warningCount} avertissement(s) détectés`;

  return {
    score: weightedScore,
    grade,
    issues: allIssues,
    weekMetrics,
    summary: {
      polarizationScore: polarization.score,
      loadPatternScore: loadPattern.score,
      keySessionsScore: keySessions.score,
      progressionScore: progression.score,
      sportRatioScore: sportRatio.score,
      catalogRatioScore: catalogRatio.score,
      structureScore,
      limiterAlignmentScore: limiterAlignment.score,
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
  lines.push(`| Structure (Race/Jours/Repos) | ${result.summary.structureScore}/100 | ${result.summary.structureScore >= 75 ? "✅" : result.summary.structureScore >= 50 ? "⚠️" : "❌"} |`);
  if (result.summary.limiterAlignmentScore > 0) {
    lines.push(`| Cohérence Limiteurs | ${result.summary.limiterAlignmentScore}/100 | ${result.summary.limiterAlignmentScore >= 75 ? "✅" : result.summary.limiterAlignmentScore >= 50 ? "⚠️" : "❌"} |`);
  }
  lines.push("");
  lines.push(`**${result.summary.overallComment}**`);

  if (result.issues.length > 0) {
    lines.push("");
    lines.push("### Détails");
    
    const errors = result.issues.filter(i => i.severity === "error");
    const warnings = result.issues.filter(i => i.severity === "warning");

    if (errors.length > 0) {
      lines.push("\n**❌ Erreurs critiques :**");
      errors.forEach(e => lines.push(`- ${e.message}`));
    }
    if (warnings.length > 0) {
      lines.push("\n**⚠️ Avertissements :**");
      warnings.slice(0, 10).forEach(w => lines.push(`- ${w.message}`));
      if (warnings.length > 10) lines.push(`- ... et ${warnings.length - 10} autres`);
    }
  }

  return lines.join("\n");
}
