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
    prohibitionComplianceScore: number;
    phaseCoherenceScore: number;
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
  Trail:    { run: [70, 85] },
  TrailShort: { run: [70, 85] },
  TrailMountain: { run: [65, 80] },
  TrailUltra: { run: [65, 80] },
};

/** Normalize objective string to a known key (mirrors edge function logic) */
function normalizeObjectiveKey(obj: string): string {
  const lower = obj.toLowerCase();
  if (lower.includes("70.3") || lower === "703") return "703";
  if (lower.includes("ironman") || lower === "im") return "IM";
  if (lower.includes("semi")) return "Semi";
  if (lower.includes("marathon")) return "Marathon";
  if (lower.includes("trail") && lower.includes("ultra")) return "TrailUltra";
  if (lower.includes("trail") && (lower.includes("montagne") || lower.includes("mountain"))) return "TrailMountain";
  if (lower.includes("trail") && (lower.includes("court") || lower.includes("short"))) return "TrailShort";
  if (lower.includes("trail")) return "Trail";
  if (lower.includes("10")) return "10K";
  if (lower.includes("5k") || lower === "5km") return "5K";
  return obj;
}

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
// MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

// RACE DAY PRESENCE VALIDATION (Rule 9)
const RACE_DAY_PATTERNS = /🏁|jour\s*j|course\s*objectif|race\s*day|compétition|épreuve\s*(objectif|cible)|jour\s*de\s*(course|compétition)/i;

function validateRaceDayPresence(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  if (plan.weeks.length === 0) return { issues, score: 100 };

  const lastWeek = plan.weeks[plan.weeks.length - 1];
  const allSessions = lastWeek.sessions || [];
  const hasRaceDay = allSessions.some(s => {
    const text = `${s.title || ""} ${s.description || ""} ${s.type || ""}`;
    return RACE_DAY_PATTERNS.test(text);
  });

  if (!hasRaceDay) {
    issues.push({
      rule: "race_day",
      severity: "error",
      week: plan.weeks.length,
      message: `🏁 Jour de course absent — la dernière semaine (S${plan.weeks.length}) ne contient aucune séance "Jour J" ou "🏁 COURSE OBJECTIF"`,
      detail: "La dernière semaine doit inclure le jour de la compétition avec stratégie de pacing et consignes nutrition",
    });
    return { issues, score: 0 };
  }

  return { issues, score: 100 };
}

export function validatePlan(plan: ParsedPlan, objective?: string, prohibitions?: string[]): PlanValidationResult {
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
  const raceDayPresence = validateRaceDayPresence(plan);

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
  ];

  // Weighted score (9 rules)
  const weights = {
    polarization: 0.16,
    loadPattern: 0.11,
    keySessions: 0.11,
    progression: 0.09,
    sportRatio: 0.09,
    catalogRatio: 0.07,
    prohibitionCompliance: 0.17,
    phaseCoherence: 0.11,
    raceDayPresence: 0.09,
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
    raceDayPresence.score * weights.raceDayPresence
  );

  // Grade
  const grade = weightedScore >= 85 ? "A" : weightedScore >= 70 ? "B" : weightedScore >= 55 ? "C" : weightedScore >= 40 ? "D" : "F";

  // Summary comment
  const errorCount = allIssues.filter(i => i.severity === "error").length;
  const warningCount = allIssues.filter(i => i.severity === "warning").length;
  const prohibitionViolations = prohibitionCompliance.issues.filter(i => i.severity === "error").length;
  const phaseErrors = phaseCoherence.issues.filter(i => i.severity === "error").length;
  const raceDayMissing = raceDayPresence.issues.filter(i => i.severity === "error").length;
  const overallComment = prohibitionViolations > 0
    ? `🚫 ${prohibitionViolations} VIOLATION(S) DE PROHIBITION DÉTECTÉE(S) — Plan NON CONFORME au diagnostic physiologique`
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
  lines.push("");
  lines.push(`**${result.summary.overallComment}**`);

  if (result.issues.length > 0) {
    lines.push("");
    lines.push("### Détails");
    
    // Prohibition violations first (most critical)
    const prohibitionErrors = result.issues.filter(i => i.rule === "prohibition_compliance");
    const phaseErrors = result.issues.filter(i => i.rule === "phase_coherence" && i.severity === "error");
    const otherErrors = result.issues.filter(i => i.severity === "error" && i.rule !== "prohibition_compliance" && i.rule !== "phase_coherence");
    const warnings = result.issues.filter(i => i.severity === "warning");

    if (prohibitionErrors.length > 0) {
      lines.push("\n**🚫 Violations de prohibition (CRITIQUE — incohérence avec le diagnostic) :**");
      prohibitionErrors.forEach(e => lines.push(`- ${e.message}`));
      if (prohibitionErrors[0]?.detail) lines.push(`  → ${prohibitionErrors[0].detail}`);
    }
    if (phaseErrors.length > 0) {
      lines.push("\n**📦 Incohérences de phase (CRITIQUE — périodisation non conforme) :**");
      phaseErrors.forEach(e => lines.push(`- ${e.message}`));
      if (phaseErrors[0]?.detail) lines.push(`  → ${phaseErrors[0].detail}`);
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
