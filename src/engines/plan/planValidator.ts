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
import { HIGH_IMPACT_SESSION_PATTERNS } from "@/lib/limiterSessionPatterns";
import { detectInterval, detectAllIntervals, isCyclingSession } from "./wbalPostProcessor";
import {
  analyzeCriticalPower,
  effectiveWprime,
  prescribeIntervalRecovery,
  calculateTau,
} from "@/lib/v2/criticalPowerModel";
import { LIMITER_SESSION_PATTERNS } from "@/lib/limiterSessionPatterns";

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
  /** Whether this is an explicitly-named threshold block (norvégien double-seuil,
   *  Sweet Spot étendu) — méthodologie différente et volontairement non polarisée,
   *  cf. THRESHOLD_BLOCK_PATTERNS. */
  isThresholdBlock: boolean;
  /** Key sessions count (🔑 or intensity sessions) */
  keySessions: number;
  /** F-23: Real total weekly duration extracted from session text (minutes) */
  totalDurationMin: number;
  /** F-23: Total duration of key sessions only (minutes) */
  keyDurationMin: number;
  /** F-23: Number of sessions with a parseable duration (sample size) */
  sessionsWithDuration: number;
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
    /** Lot 3 : conformité activeSessions/jour et sessions/semaine vs config coach */
    sessionDensityScore: number;
    /** Lot 4 : conformité tags Lorang A-D vs polarisation Seiler (source: systemPrompt L528-536) */
    lorangCategoriesScore: number;
    /** Conformité charge à impact élevé (CAP/vélo) vs risque blessure CRITIQUE (injuryRiskUnified.ts) */
    injuryRiskComplianceScore: number;
    /** #18 lot 1 : titre H1 conforme à la RÈGLE #0 (BLOQUANTE) */
    titleFormatScore: number;
    /** #18 lot 1 : pas de "Bloc N" dupliqué ni de récap stratégique dont la numérotation redémarre */
    strategicRecapUniquenessScore: number;
    /** #18 lot 1 : jours "Repos" réellement complets (pas de récup active), ≥1/semaine */
    restDayCoherenceScore: number;
    /** #18 lot 1 : pas de séance identique au même jour 2 semaines consécutives */
    antiRepetitionScore: number;
    /** #18 lot 2 : Renfo Fondation présent chaque semaine (Start to Run uniquement — 100 sinon) */
    startToRunStrengthScore: number;
    /** #18 lot 2 : week-end back-to-back présent sur le bloc spécifique (Trail Montagne/Ultra uniquement — 100 sinon) */
    trailBackToBackScore: number;
    /** #18 lot 2 : D+ chiffré sur les séances CAP/Trail (objectifs trail uniquement — 100 sinon) */
    trailDPlusPresenceScore: number;
    /** #18 lot 2 : plancher 2-3 séances/jour (IM/70.3 World Class/Elite/Competitor uniquement — 100 sinon) */
    dailySessionFloorScore: number;
    overallComment: string;
  };
  /** Lot 4 : distribution A/B/C/D par semaine + par plan */
  lorangCategories: LorangCategoryDistribution;

}

/** Lot 4 — catégorisation Lorang A/B/C/D d'une séance (source: systemPrompt L528-536). */
export type LorangCategory = "A" | "B" | "C" | "D" | "unknown";

export interface LorangWeekBreakdown {
  weekNumber: number;
  isDeload: boolean;
  A: number;
  B: number;
  C: number;
  D: number;
  unknown: number;
  active: number;
  hasHighOrThreshold: boolean; // ≥1 A OU B (obligatoire hors décharge)
}

export interface LorangCategoryDistribution {
  totalActive: number;
  tagged: number;
  taggedPct: number;
  A: number; APct: number;
  B: number; BPct: number;
  C: number; CPct: number;
  D: number; DPct: number;
  weeks: LorangWeekBreakdown[];
}


/** Lot 3 — config coach à respecter (sessions/semaine + max/jour) */
export interface SessionDensityConfig {
  sessionsPerWeek?: number;    // cible coach
  maxSessionsPerDay?: number;  // plafond coach (défaut 2)
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
// Audit — l'ancien RACE_PATTERNS (mots génériques "course"/"race"/"objectif"/
// "marathon"/"ironman"/"triathlon"/"semi"/"trail"/"10k") matchait la quasi-
// totalité des thèmes de semaine normaux (ex. "Chantier Trail Montagne",
// "Consolidation — Allure Course") et désexemptait silencieusement plusieurs
// règles (anti_repetition, daily_session_floor, session_density, Rule 1
// Lorang) sur des semaines qui n'étaient PAS la semaine de course. Remplacé
// par RACE_DAY_PATTERNS (déjà utilisé par validateRaceDayPresence, seul
// signal fiable : marqueurs explicites de jour de course, pas juste une
// mention de l'objectif). Testé au niveau SÉANCE (weekHasRaceDay), pas sur
// le thème de la semaine — un thème peut mentionner l'objectif sans que la
// semaine soit celle de la course.
const RACE_DAY_PATTERNS = /🏁|jour\s*j|course\s*objectif|race\s*day|compétition|épreuve\s*(objectif|cible)|jour\s*de\s*(course|compétition)/i;

/** Vrai si la semaine contient une séance de jour de course réel (pas juste
 *  un thème qui mentionne l'objectif) — cf. RACE_DAY_PATTERNS ci-dessus. */
function weekHasRaceDay(week: ParsedWeek): boolean {
  return week.sessions.some((s) => RACE_DAY_PATTERNS.test(`${s.title || ""} ${s.details || ""} ${s.sport || ""}`));
}

/** Blocs explicitement nommés comme seuil concentré (méthode norvégienne
 *  double-seuil, Sweet Spot étendu) — cf. audit méthodologique Niveau 2 :
 *  ces semaines appliquent délibérément un modèle différent du polarisé
 *  Seiler (volume seuil élevé et contrôlé plutôt que 80/20), documenté comme
 *  tel dans systemPrompt.ts (FEWSHOT_NORVEGIENNE_SEMI, table Chantier). Ce
 *  n'est pas un plan qui rate la polarisation — c'est un plan qui suit une
 *  autre méthodologie sourcée sur CES semaines précisément nommées comme
 *  telles, à exempter du Rule 1 comme isDeload/isRaceWeek. */
const THRESHOLD_BLOCK_PATTERNS = /norvégien|double.?seuil|sweet.?spot/i;

// Strides / accélérations progressives : accroche neuromusculaire courte
// (10-30s × 4-10 répétitions) greffée en fin de séance EF — Seiler classe
// ces séances Z1-Z2 (volume négligeable, aucun stress métabolique), c'est
// le vocabulaire canonique de CETTE bibliothèque pour les distinguer d'un
// vrai bloc fractionné (30/30, VO2max, seuil, Norvégien...). Sans le garde
// ci-dessous, la simple mention de zone dans "45' Z2 + 6x20" accélérations
// progressives (Z2→Z5)" basculait toute la séance "high" — alors que la
// fiche catalogue correspondante ("EF + Strides", Cat A OBLIGATOIRE) est
// explicitement conçue pour rester polarisée.
const STRIDES_TAIL_PATTERN = /\bstrides?\b|acc[ée]l[ée]rations?\s*progressives?/i;
const GENUINE_INTERVAL_WORK_PATTERN = /seuil|threshold|vo2|vma\b|fractionn[ée]|30\s*\/\s*30|norv[ée]gien|billat|canova|over.under|\bsst\b|sweet\s*spot|pma/i;

function classifySessionIntensity(session: ParsedSession): "low" | "mid" | "high" {
  const text = `${session.sport} ${session.title} ${session.details}`.toLowerCase();

  if (session.isRest) return "low";

  if (STRIDES_TAIL_PATTERN.test(text) && !GENUINE_INTERVAL_WORK_PATTERN.test(text)) {
    return "low";
  }

  // Check high first (most specific patterns)
  if (HIGH_INTENSITY_PATTERNS.test(text)) return "high";
  if (MID_INTENSITY_PATTERNS.test(text)) return "mid";

  // Default: strength/renfo sessions count as mid, everything else as low
  if (/renfo|muscul|strength|ppg|gainage|core|poids/i.test(text)) return "mid";

  return "low";
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPS PAR ZONE (Rule 1 — polarisation 80/20, fidèle à Seiler)
// ═══════════════════════════════════════════════════════════════════════════════
// Seiler mesure la polarisation en TEMPS passé par zone, pas en nombre de
// séances. `classifySessionIntensity` classe une séance ENTIÈRE dans un seul
// bucket dès qu'un pattern matche n'importe où dans le texte — une séance
// "55min Z2 + 5min seuil" comptait donc 100% "high", pas 92% "low"/8% "high".
// Le fix des strides (ci-dessus) corrige le cas le plus flagrant, mais le
// problème de fond restait : on découpe maintenant le texte en clauses et on
// pondère chaque clause par sa propre durée avant de les agréger.

/** Découpe une séance en clauses (phrases/segments), unité d'analyse pour le
 *  temps par zone — chaque bloc warm-up/main/cool-down est typiquement sa
 *  propre clause dans le texte généré. */
function splitIntoClauses(text: string): string[] {
  return text
    .split(/[.;|]|\s+puis\s+|\s+→\s+/i)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/** Minutes mentionnées dans une clause (heures, minutes, répétitions×durée). */
function clauseDurationMin(clause: string): number {
  let total = 0;

  const hRe = /(\d+)\s*h\s*(\d{1,2})?(?!\d)/g;
  let m: RegExpExecArray | null;
  while ((m = hRe.exec(clause)) !== null) {
    const h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    if (h >= 0 && h <= 12 && min < 60) total += h * 60 + min;
  }

  // "6 x 20min", "2x20'" — répétitions × minutes
  const repMinRe = /(\d{1,2})\s*x\s*(\d{1,3})\s*(?:min(?:utes?)?|')(?!\d)/gi;
  while ((m = repMinRe.exec(clause)) !== null) {
    const reps = parseInt(m[1], 10);
    const mins = parseInt(m[2], 10);
    if (reps > 0 && reps <= 30 && mins > 0 && mins <= 60) total += reps * mins;
  }

  // "6x20s", "10x30"" — répétitions × secondes (strides, 30/30…)
  const repSecRe = /(\d{1,2})\s*x\s*(\d{1,3})\s*(?:s\b|"|″|sec)/gi;
  while ((m = repSecRe.exec(clause)) !== null) {
    const reps = parseInt(m[1], 10);
    const secs = parseInt(m[2], 10);
    if (reps > 0 && reps <= 40 && secs > 0 && secs <= 180) total += (reps * secs) / 60;
  }

  // Minutes nues — seulement si rien de plus spécifique n'a matché dans la
  // clause (évite de compter deux fois "20min" déjà capté par repMinRe).
  if (total === 0) {
    const mRe = /(?<!\d)(\d{1,3})\s*(?:min(?:utes?)?|'|′)(?!\d)/g;
    while ((m = mRe.exec(clause)) !== null) {
      const mm = parseInt(m[1], 10);
      if (mm >= 1 && mm <= 300) total += mm;
    }
  }

  return total;
}

/** Classe une clause (pas la séance entière) — même logique que
 *  classifySessionIntensity, appliquée à un fragment de texte. */
function clauseTier(clause: string): "low" | "mid" | "high" {
  const t = clause.toLowerCase();
  if (STRIDES_TAIL_PATTERN.test(t) && !GENUINE_INTERVAL_WORK_PATTERN.test(t)) return "low";
  if (HIGH_INTENSITY_PATTERNS.test(t)) return "high";
  if (MID_INTENSITY_PATTERNS.test(t)) return "mid";
  if (/renfo|muscul|strength|ppg|gainage|core|poids/i.test(t)) return "mid";
  return "low";
}

interface SessionZoneMinutes { low: number; mid: number; high: number }

/**
 * Estime la répartition low/mid/high EN MINUTES d'une séance, en pondérant
 * chaque clause par sa propre durée plutôt que de classer la séance entière
 * dans un seul bucket. Le temps non capté par une clause reconnaissable
 * (transitions, WU/CD non zonés explicitement) est crédité à "low" — repli
 * conservateur et physiologiquement fondé (un WU/CD non précisé est presque
 * toujours easy). Si aucune clause n'est exploitable du tout, on retombe sur
 * la classification globale historique (texte non structuré / legacy).
 */
function estimateSessionZoneMinutes(
  session: ParsedSession,
  totalDurationMin: number | null,
): SessionZoneMinutes {
  const acc: SessionZoneMinutes = { low: 0, mid: 0, high: 0 };
  if (session.isRest || !totalDurationMin || totalDurationMin <= 0) return acc;

  const text = `${session.title} ${session.details}`;
  const clauses = splitIntoClauses(text);
  let captured = 0;
  for (const clause of clauses) {
    const mins = clauseDurationMin(clause);
    if (mins <= 0) continue;
    acc[clauseTier(clause)] += mins;
    captured += mins;
  }

  if (captured > totalDurationMin) {
    const scale = totalDurationMin / captured;
    acc.low *= scale;
    acc.mid *= scale;
    acc.high *= scale;
    captured = totalDurationMin;
  }

  const remainder = totalDurationMin - captured;
  if (remainder > 0) {
    if (captured === 0) {
      acc[classifySessionIntensity(session)] += remainder;
    } else {
      acc.low += remainder;
    }
  }
  return acc;
}

function isKeySession(session: ParsedSession): boolean {
  if (session.isRest) return false;
  // Signal structuré posé par l'IA elle-même (chemin JSON, défaut prod) : plus fiable
  // que la détection regex, qui a un historique de faux négatifs (cf. audits
  // AUDIT_LIMITEURS_SEANCES_V1-V3 — porte d'entrée trop restrictive). Le regex reste
  // le seul signal disponible sur le chemin Markdown legacy (isKeySession undefined).
  if (session.isKeySession === true) return true;
  const text = `${session.title} ${session.details}`;
  return KEY_SESSION_PATTERNS.test(text);
}

/**
 * F-23: Extract session duration in minutes from title + details.
 * Handles formats: "1h30", "1h", "90min", "45'", "45 min", "2h 15'".
 * Returns null if no duration found (do not invent a value).
 * If multiple durations appear (e.g. WU + main + CD), returns their SUM
 * up to a sane cap (4h) — typical for tri/trail bricks.
 */
export function parseSessionDurationMin(session: ParsedSession): number | null {
  if (session.isRest) return 0;
  const text = `${session.title} ${session.details}`.toLowerCase();
  if (!text.trim()) return null;

  let total = 0;
  let found = false;

  // "1h", "1h30", "2 h 15" — hours (+ optional minutes)
  const hRe = /(\d+)\s*h\s*(\d{1,2})?(?!\d)/g;
  let m: RegExpExecArray | null;
  while ((m = hRe.exec(text)) !== null) {
    const h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    if (h >= 0 && h <= 12 && min < 60) {
      total += h * 60 + min;
      found = true;
    }
  }

  // "45min", "45 min", "45'", "45′" — pure minutes (avoid "30/30" or rep counts by requiring a unit)
  const mRe = /(?<!\d)(\d{1,3})\s*(?:min(?:utes?)?|'|′)(?!\d)/g;
  while ((m = mRe.exec(text)) !== null) {
    const mm = parseInt(m[1], 10);
    // Skip very small values that are likely interval lengths (e.g. "3'" in "5x3'")
    // Heuristic: minutes >= 15 are likely session durations, smaller are intervals
    if (mm >= 15 && mm <= 300) {
      total += mm;
      found = true;
    }
  }

  if (!found) return null;
  // Cap at 4h (single session) to avoid runaway sums from rep durations
  return Math.min(total, 240);
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

  // Deload detection
  const themeText = `${week.theme} ${week.phase}`.toLowerCase();
  const isDeload = DELOAD_PATTERNS.test(themeText) || activeSessions.length <= 3;

  // Race week detection
  const isRaceWeek = weekHasRaceDay(week);

  // Threshold block detection (Niveau 2) — nommage explicite du bloc/thème
  const isThresholdBlock = THRESHOLD_BLOCK_PATTERNS.test(themeText);

  // Key sessions
  const keySessions = activeSessions.filter(isKeySession).length;

  // F-23: Real durations (sum of parseable session durations) + intensity
  // distribution EN TEMPS (pas en nombre de séances — cf. estimateSessionZoneMinutes).
  let totalDurationMin = 0;
  let keyDurationMin = 0;
  let sessionsWithDuration = 0;
  let low = 0, mid = 0, high = 0;
  for (const s of activeSessions) {
    const d = parseSessionDurationMin(s);
    if (d !== null && d > 0) {
      totalDurationMin += d;
      sessionsWithDuration++;
      if (isKeySession(s)) keyDurationMin += d;
    }
    const zoneMinutes = estimateSessionZoneMinutes(s, d);
    low += zoneMinutes.low;
    mid += zoneMinutes.mid;
    high += zoneMinutes.high;
  }
  const total = low + mid + high || 1;

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
    isThresholdBlock,
    keySessions,
    totalDurationMin,
    keyDurationMin,
    sessionsWithDuration,
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
    // Semaines exclues de l'évaluation (décharge / course / bloc seuil concentré
    // explicitement nommé — norvégien double-seuil, Sweet Spot étendu, cf. audit
    // Niveau 2 / <3 séances) : elles ne comptent NI au numérateur NI au
    // dénominateur (sinon score > 100).
    if (wm.isDeload || wm.isRaceWeek || wm.isThresholdBlock || wm.activeSessions < 3) {
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
  return { issues, score: Math.max(0, Math.min(100, Math.round((compliant / total) * 100))) };

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
    // Décharge / semaine de course : hors périmètre d'évaluation (num. ET dénom.)
    if (wm.isDeload || wm.isRaceWeek) {
      continue;
    }


    if (wm.keySessions === 0) {
      issues.push({
        rule: "key_sessions",
        severity: "error",
        week: wm.weekNumber,
        // Audit fix — ce message annonçait "1-3" alors que le code plus bas
        // (2-4 = pleinement conforme, >4 = avertissement) et le prompt
        // (systemPrompt.ts, "Cible : 2-4 séances 🔑 par semaine") ciblent
        // tous deux 2-4. 4 formulations différentes existaient pour la même
        // règle avant ce fix — désormais toutes alignées sur 2-4.
        message: `S${wm.weekNumber}: Aucune séance clé détectée (attendu: 2-4 séances d'intensité/semaine)`,
      });
    } else if (wm.keySessions === 1 && wm.activeSessions >= 5) {
      issues.push({
        rule: "key_sessions",
        severity: "warning",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: Seulement 1 séance clé pour ${wm.activeSessions} séances actives (recommandé: 2-4)`,
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
  return { issues, score: Math.max(0, Math.min(100, Math.round((compliant / total) * 100))) };
}

/** Rule 4: Volume progression — F-23: uses real durations when ≥60% of sessions have one */
function validateProgression(metrics: WeekMetrics[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  if (metrics.length < 3) return { issues: [], score: 100 };

  const loadWeeks = metrics.filter(m => !m.isDeload && !m.isRaceWeek);
  if (loadWeeks.length < 3) return { issues: [], score: 100 };

  // F-23: prefer real weekly duration if coverage is decent (≥60% sessions parsed)
  const useDuration = loadWeeks.every(w => w.activeSessions === 0 || w.sessionsWithDuration / Math.max(1, w.activeSessions) >= 0.6)
    && loadWeeks.some(w => w.totalDurationMin > 0);
  const volumeOf = (w: WeekMetrics) => useDuration ? w.totalDurationMin : w.activeSessions;
  const volUnit = useDuration ? "min" : "séances";

  // Trend: first third vs last third
  const thirdLen = Math.max(1, Math.floor(loadWeeks.length / 3));
  const firstThird = loadWeeks.slice(0, thirdLen);
  const lastThird = loadWeeks.slice(-thirdLen);

  const avgFirst = firstThird.reduce((s, w) => s + volumeOf(w), 0) / firstThird.length;
  const avgLast = lastThird.reduce((s, w) => s + volumeOf(w), 0) / lastThird.length;

  if (avgLast < avgFirst * 0.85) {
    issues.push({
      rule: "progression",
      severity: "warning",
      message: `Volume en baisse: moyenne ${avgFirst.toFixed(0)}${volUnit}/sem (début) → ${avgLast.toFixed(0)}${volUnit} (fin)`,
      detail: `Une progression positive est attendue hors semaines de décharge et taper.${useDuration ? " (Calculé sur durées réelles)" : ""}`,
    });
  }

  // Sudden jumps (> +30% week to week)
  for (let i = 1; i < metrics.length; i++) {
    const prev = metrics[i - 1];
    const curr = metrics[i];
    if (prev.isDeload || curr.isDeload || curr.isRaceWeek || prev.activeSessions < 3) continue;

    const prevVol = volumeOf(prev);
    const currVol = volumeOf(curr);
    if (prevVol < (useDuration ? 60 : 3)) continue;

    const jump = (currVol - prevVol) / Math.max(1, prevVol);
    if (jump > 0.35) {
      issues.push({
        rule: "progression",
        severity: "warning",
        week: curr.weekNumber,
        message: `S${curr.weekNumber}: Saut de volume +${Math.round(jump * 100)}% vs S${prev.weekNumber} (${prevVol.toFixed(0)} → ${currVol.toFixed(0)} ${volUnit})`,
        detail: `Progression recommandée: +5-10%/semaine maximum.${useDuration ? " (Calculé sur durées réelles)" : ""}`,
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
  // Audit fix — absents jusqu'ici : le contrôle de ratio par sport retombait
  // silencieusement sur un simple "3 sports présents ?" pour ces deux
  // objectifs (cf. normalizeObjectiveKey.ts). Plages agrégées (min des mins,
  // max des maxs) sur les 5 paliers d'ambition de sportRatioMatrix.ts
  // (edge function — Bevegård/Millet 2011, ITU pathway 2020, Etxebarria 2019).
  Sprint:   { swim: [18, 28], bike: [40, 50], run: [28, 34] },
  Olympic:  { swim: [15, 24], bike: [45, 52], run: [28, 34] },
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

const CATALOG_ID_PATTERN = /\b(?:[A-D]_(?:BIKE|RUN|SWIM|TR|STR|BR|RECOVERY|10K|703|IM|MAR|SEMI|HEAT|TAPER|RECUP|RACE|MENTAL|HALF|PAP|ALTITUDE|RESP|PRE)[A-Za-z0-9_]+|(?:BRICK|ENR|V[0-9]|TPL|RS|BR|URBAN|EXPE)_[A-Za-z0-9_]+)/g;
const CUSTOM_PATTERN = /\[Custom\]/gi;

// ═══════════════════════════════════════════════════════════════════════════════
// SPORT-OBJECTIVE COHERENCE — bloque trail dans plans triathlon/CAP route
// ═══════════════════════════════════════════════════════════════════════════════

const OFFSPORT_TRAIL_RX = /\b([A-D]_TR(?:50)?_[A-Z0-9_]+|[A-Z]+_TRAIL_[A-Z0-9_]+|TRAIL_[A-Z0-9_]+|EXPE_HORS_VILLE_[A-Z0-9_]+|URBAN_[A-Z0-9_]+|HEDGEHOG_[A-Z0-9_]+|V3_TRAIL_[A-Z0-9_]+)\b/i;

function isNonTrailObjective(objective?: string): boolean {
  const o = (objective || "").toLowerCase();
  if (!o) return false;
  const isTrail = o.includes("trail") || o.includes("utmb") || o.includes("ccc") || o.includes("occ") ||
    (o.includes("ultra") && !o.includes("ironman"));
  if (isTrail) return false;
  const isTri = o.includes("70.3") || o === "703" || o.includes("ironman") || o === "im" || o.includes("triathlon");
  const isRoad = o.includes("semi") || o.includes("marathon") ||
    o.includes("10k") || o.includes("10 km") || o.includes("10km") ||
    o.includes("5k") || o.includes("5 km") || o.includes("5km") ||
    o.includes("start") || o.includes("débutant") || o.includes("beginner");
  return isTri || isRoad;
}

function validateSportObjectiveCoherence(
  plan: ParsedPlan,
  objective?: string,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  if (!isNonTrailObjective(objective)) return { issues, score: 100 };
  let violations = 0;
  let totalSessions = 0;
  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      totalSessions++;
      const text = `${s.title || ""} ${s.details || ""}`;
      if (OFFSPORT_TRAIL_RX.test(text)) {
        violations++;
        issues.push({
          rule: "sport_objective_coherence",
          severity: "error",
          week: week.weekNumber,
          message: `S${week.weekNumber} ${s.dayName} — séance trail interdite dans un plan "${objective}"`,
          detail: s.title || "",
        });
      }
    }
  }
  const score = totalSessions === 0 ? 100 : Math.max(0, 100 - Math.round((violations / totalSessions) * 400));
  return { issues, score };
}


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
      // Phase 1C-A : préférer session.catalogId (JSON path structuré),
      // fallback regex title+details pour le chemin Markdown legacy.
      const structuredId = (session as unknown as { catalogId?: string | null }).catalogId;
      const ids: string[] = [];
      if (typeof structuredId === "string" && structuredId.trim().length > 0) {
        ids.push(structuredId.trim());
      } else {
        CATALOG_ID_PATTERN.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = CATALOG_ID_PATTERN.exec(text)) !== null) {
          ids.push(m[0]);
        }
        CATALOG_ID_PATTERN.lastIndex = 0;
      }
      const isCustom = CUSTOM_PATTERN.test(text);
      CUSTOM_PATTERN.lastIndex = 0;

      if (ids.length > 0) {
        catalogSessions++;
        for (const id of ids) uniqueCatalogIds.add(id);
      } else if (isCustom) {
        customSessions++;
      }
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
// Audit — chemin JSON (défaut prod, cf. isJsonBetaEnabled) : le schéma impose
// `phase` ∈ {"base","build","peak","taper"} (planSchema.ts), un vocabulaire à
// 4 valeurs strictement différent des 5 noms de bloc français ci-dessous.
// "base" ne matchait aucune clé → tout contrôle de contenu Fondation était
// silencieusement sauté sur la quasi-totalité des plans de prod. Alias
// ajoutés ci-dessous pour les 4 valeurs JSON, alignés sur le mapping déjà
// utilisé côté catalogue (jsonPlanHandler.ts, resolvePhaseCatalog) :
// base→Fondation, build→Chantier/Consolidation (les deux collapsent sur la
// même valeur JSON, PHASE_SESSION_SIGNATURES[2] élargie en conséquence),
// peak→Race-Specific (PAS un "Peak compressé" séparé — cf. note historique
// ci-dessous), taper→Affûtage (déjà aliasé).
//
// Ancienne régression corrigée ici : une clé "peak" séparée (index 3.5)
// avait été ajoutée pour le scénario Ultra-Trail compressé (garde-fou
// promptHelpers.ts, "Peak 1 sem"). Mais "peak" est la valeur JSON UNIVERSELLE
// pour Race-Specific (tous objectifs confondus, cf. resolvePhaseCatalog) —
// cette clé interceptait donc aussi le Race-Specific normal de tous les
// autres plans (IM, 70.3, Marathon...) et flaguait à tort leur contenu
// race-pace/simulation pourtant explicitement exigé. Le cas Ultra-Trail
// compressé est maintenant traité par objectif dans validatePhaseCoherence
// (isUltraCompressedTrail), pas par une clé PHASE_ORDER dédiée.
const PHASE_ORDER: Record<string, number> = {
  // Metabolic naming (preferred)
  "fondation": 1, "adaptation": 1, "base": 1,
  "chantier": 2, "développement": 2, "build": 2,
  "consolidation": 3,
  "race-specific": 4, "race specific": 4, "spécifique": 4, "specific": 4, "peak": 4,
  "affûtage": 5, "taper": 5, "affutage": 5,
};

/** Phase-specific session patterns — sessions expected in each phase */
const PHASE_SESSION_SIGNATURES: Record<number, { expected: RegExp; forbidden: RegExp }> = {
  1: { // Fondation: Force max, VO2max courts, Z2 volume, technique
    expected: /force\s*max|z2|endurance|technique|drill|gammes|éducatif|VO2.{0,10}court|reverse/i,
    forbidden: /race.?pace|simulation\s*(ironman|marathon|70\.3|course)|gut\s*train|affûtage|taper/i,
  },
  2: { // Chantier/Consolidation : la valeur JSON "build" collapse les deux
    // (cf. resolvePhaseCatalog) — signature élargie pour couvrir le contenu
    // attendu des deux, pas seulement Chantier, sinon un plan JSON dont le
    // "build" recouvre en réalité une Consolidation se fait flaguer à tort.
    expected: /chantier|limiteur|norvégi|billat|sweet\s*spot|train\s*low|sfr|seuil|consolid|maintien|rappel|allure|durabilité/i,
    forbidden: /taper|affûtage|supercomp|activation\s*j-?2/i,
  },
  3: { // Consolidation (nommage Markdown explicite uniquement — le chemin JSON
    // n'atteint jamais cet index, cf. "build" ci-dessus) : Limiter #2, maintain #1
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

/** Signature dédiée pour le segment "Peak" du garde-fou Ultra-Trail compressé
 *  (promptHelpers.ts, "Fondation 2 sem · Build 2 sem · Peak 1 sem · Taper 1
 *  sem") : volume Z2 + D+ progressif, JAMAIS de VMA/seuil dur ni de
 *  race-pace/simulation — garde-fou "finir sans blessure". Remplace
 *  PHASE_SESSION_SIGNATURES[4] uniquement quand isUltraCompressedTrail est
 *  vrai (cf. validatePhaseCoherence) : sur tout autre plan, la valeur JSON
 *  "peak" désigne le Race-Specific normal (PHASE_SESSION_SIGNATURES[4]),
 *  qui EXIGE exactement le contenu interdit ici. */
const ULTRA_COMPRESSED_PEAK_SESSION_SIGNATURE = {
  expected: /z2|endurance|d\+|dénivelé|volume|technique/i,
  forbidden: /race.?pace|simulation|vma|seuil\s*(dur|long)|fractionn|force\s*max\s*3.?[45]/i,
};

/** Contenu "spécificité de course" — race-pace, simulations, allure course, gut
 *  training, briques orientées course. Sert à vérifier que le bloc Race-Specific
 *  concentre effectivement plus de ce travail que les blocs antérieurs, comme
 *  le prescrit le prompt de génération (Lorang/Canova : spécificité concentrée
 *  près de la course, pas diluée sur tout le plan) — mais que rien ne vérifiait
 *  jusqu'ici après coup sur le plan généré. */
const RACE_SPECIFICITY_PATTERN = /race.?pace|race.?sim|simulation\s*(ironman|marathon|70\.3|course|semi)|allure\s*(course|marathon|semi)|gut\s*train|brique.*(race|course)/i;

/** Acceptable phase duration range in weeks */
const PHASE_DURATION_RANGE: Record<number, [number, number]> = {
  1: [2, 6],   // Fondation
  2: [2, 6],   // Chantier
  3: [2, 6],   // Consolidation
  4: [2, 6],   // Race-Specific (sauf scénario Ultra-Trail compressé, cf. isUltraCompressedTrail)
  5: [1, 3],   // Affûtage
};
/** Plage dédiée pour le segment "Peak" du garde-fou Ultra-Trail compressé
 *  (promptHelpers.ts, "Fondation 2 sem · Build 2 sem · Peak 1 sem · Taper 1
 *  sem") — remplace PHASE_DURATION_RANGE[4] uniquement quand
 *  isUltraCompressedTrail est vrai, cf. validatePhaseCoherence. */
const ULTRA_COMPRESSED_PEAK_DURATION_RANGE: [number, number] = [1, 2];

function getPhaseIndex(phaseName: string): number | null {
  const lower = phaseName.toLowerCase().trim();
  for (const [key, idx] of Object.entries(PHASE_ORDER)) {
    if (lower.includes(key)) return idx;
  }
  return null;
}

/**
 * Reconstruit la structure de phases à partir du champ `phase` des semaines
 * lorsque le plan n'expose pas de bloc "Phases" (chemin JSON / plans legacy).
 * Purement dérivé : aucune invention de contenu.
 */
export function derivePhasesFromWeeks(plan: ParsedPlan): ParsedPlan["phases"] {
  const derived: ParsedPlan["phases"] = [];
  let current: { name: string; start: number; end: number } | null = null;
  for (const w of plan.weeks) {
    const name = (w.phase || "").trim();
    if (!name) continue;
    if (current && current.name.toLowerCase() === name.toLowerCase()) {
      current.end = w.weekNumber;
    } else {
      if (current) derived.push({ name: current.name, weeks: `S${current.start}-S${current.end}` });
      current = { name, start: w.weekNumber, end: w.weekNumber };
    }
  }
  if (current) derived.push({ name: current.name, weeks: `S${current.start}-S${current.end}` });
  return derived;
}

function validatePhaseCoherence(plan: ParsedPlan, objective?: string): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  // Source unique : bloc "Phases" déclaré, sinon reconstruction depuis les semaines.
  const phases = plan.phases && plan.phases.length >= 2 ? plan.phases : derivePhasesFromWeeks(plan);

  if (phases.length < 2) {
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

  // Scénario Ultra-Trail compressé (garde-fou promptHelpers.ts, "DÉLAI
  // SOUS-CRITIQUE" — même condition de déclenchement que ce garde-fou) : la
  // valeur JSON "peak" y désigne le segment compressé "Peak 1 sem", pas le
  // Race-Specific standard — cf. constantes ULTRA_COMPRESSED_PEAK_*.
  const isUltraCompressedTrail = normalizeObjectiveKey(objective || "") === "TrailUltra" && plan.weeks.length <= 6;

  // 1. Phase ordering — no regression
  let lastPhaseIdx = 0;
  for (const phase of phases) {

    const idx = getPhaseIndex(phase.name);
    if (idx === null) continue;
    if (idx < lastPhaseIdx) {
      // Niveau 2 : un cycle Chantier↔Consolidation explicitement répété (nouveau
      // bloc plus spécifique après consolidation d'un premier limiteur) est une
      // structure Issurin légitime, pas une régression — cf. Block Periodization
      // par limiteur (systemPrompt.ts). On ne tolère ce recul QUE dans la fenêtre
      // Chantier(2)/Consolidation(3) : un retour à Fondation(1), ou un recul
      // depuis Race-Specific(4)/Affûtage(5) déjà atteint, reste une vraie erreur.
      const isToleratedBlockCycle = idx >= 2 && idx <= 3 && lastPhaseIdx <= 3;
      if (!isToleratedBlockCycle) {
        issues.push({
          rule: "phase_coherence",
          severity: "error",
          message: `Régression de phase détectée : "${phase.name}" (${phase.weeks}) apparaît APRÈS une phase plus avancée`,
          detail: `La périodisation doit progresser : Fondation → Chantier → Consolidation → Race-Specific → Affûtage. Pas de retour en arrière (un nouveau cycle Chantier↔Consolidation reste toléré).`,
        });
        score -= 25;
      }
    }
    lastPhaseIdx = idx;
  }

  // 2. Phase durations — check each phase's week count
  for (const phase of phases) {
    const idx = getPhaseIndex(phase.name);
    if (idx === null) continue;
    const range = idx === 4 && isUltraCompressedTrail ? ULTRA_COMPRESSED_PEAK_DURATION_RANGE : PHASE_DURATION_RANGE[idx];
    if (!range) continue;

    // Parse weeks range like "S1-S4", "S1-S6" (préfixe "S" sur les deux
    // nombres, format produit par derivePhasesFromWeeks ET par l'exemple
    // JSON du prompt lui-même, systemPromptJSON.ts) ou "Semaines 1-4".
    const weekMatch = phase.weeks.match(/(\d+)\s*[-–àto]\s*S?(\d+)/i);
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
    const signatures = phaseIdx === 4 && isUltraCompressedTrail
      ? ULTRA_COMPRESSED_PEAK_SESSION_SIGNATURE
      : PHASE_SESSION_SIGNATURES[phaseIdx];
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
  if (plan.weeks.length >= 8 && phases.length >= 2) {
    const lastPhase = phases[phases.length - 1];
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
  if (phases.length >= 2) {
    const fondationPhase = phases.find(p => getPhaseIndex(p.name) === 1);
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

  // 6. Race-specificity ramp — le bloc Race-Specific doit concentrer davantage
  // de travail allure course / simulations / gut training que les blocs
  // antérieurs (Lorang/Canova : la spécificité de course se construit près de
  // l'échéance, elle n'est pas répartie uniformément sur tout le plan). Le
  // prompt de génération le demande déjà explicitement ; rien ne vérifiait
  // jusqu'ici que le plan produit s'y conforme réellement.
  if (phases.length >= 2) {
    const raceSpecificActive = plan.weeks
      .filter(w => getPhaseIndex(w.phase) === 4)
      .flatMap(w => w.sessions.filter(s => !s.isRest));

    if (raceSpecificActive.length >= 2) {
      const raceSpecificFrac =
        raceSpecificActive.filter(s => RACE_SPECIFICITY_PATTERN.test(`${s.title} ${s.details}`)).length /
        raceSpecificActive.length;

      if (raceSpecificFrac === 0) {
        issues.push({
          rule: "phase_coherence",
          severity: "warning",
          message: `Bloc Race-Specific sans aucune séance allure course/race-pace/simulation détectée — la spécificité de course attendue dans ce bloc (Lorang/Canova) est absente`,
        });
        score -= 8;
      } else {
        const chantierActive = plan.weeks
          .filter(w => getPhaseIndex(w.phase) === 2)
          .flatMap(w => w.sessions.filter(s => !s.isRest));

        if (chantierActive.length >= 2) {
          const chantierFrac =
            chantierActive.filter(s => RACE_SPECIFICITY_PATTERN.test(`${s.title} ${s.details}`)).length /
            chantierActive.length;

          if (raceSpecificFrac <= chantierFrac) {
            issues.push({
              rule: "phase_coherence",
              severity: "info",
              message: `Le bloc Race-Specific (${Math.round(raceSpecificFrac * 100)}% de séances allure course/simulation) ne concentre pas plus de spécificité que le bloc Chantier (${Math.round(chantierFrac * 100)}%) — la logique Lorang/Canova voudrait une densité croissante vers la course`,
            });
            score -= 5;
          }
        }
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
          detail: `Le profil VLamax élevé interdit ce type de séance (all-out ≤20s, pmax, neuromusculaire pur). Remplacer par Sweet Spot, seuil ou Z2 volume. Rappel : 30/30 Billat à 100-110% VMA reste AUTORISÉ (VO2max, pas sprint).`,
        });
      }

      // FIX #4 (audit Cath juillet 2026, Étage B) — Sous Sprint Ban, une séance
      // custom (sans catalogId TFCL) qui mentionne sprint/pmax/neuro/all-out est
      // rejetée MÊME si le pattern strict SPRINT_BAN_VIOLATION_PATTERNS ne match pas.
      // Force l'IA à utiliser des IDs catalogue plutôt qu'inventer des séances sprint.
      if (hasSprintBan && !SPRINT_BAN_VIOLATION_PATTERNS.test(text)) {
        const catalogId = extractCatalogId(session.title, session.details);
        const isCustom = /\[custom\]/i.test(text) || !catalogId;
        const mentionsSprintFamily = /\b(sprint|pmax|neuromuscul|all[- ]out|explosif|plyo|pliom[ée]tri|force[\s-]*vitesse)\b/i.test(text);
        if (isCustom && mentionsSprintFamily) {
          violations++;
          issues.push({
            rule: "prohibition_compliance",
            severity: "error",
            week: week.weekNumber,
            message: `S${week.weekNumber}: 🚫 SPRINT BAN — séance CUSTOM "${session.title}" mentionne sprint/pmax/neuromusculaire sans ID catalogue TFCL`,
            detail: `Sous Sprint Ban, toute séance de la famille sprint/pmax/neuro DOIT provenir du catalogue (avec ID validé). Interdit d'inventer des formats [Custom] sprint. Remplacer par un ID VO2max/seuil/Z2 du catalogue.`,
          });
        }
      }

      if (hasVO2Restriction && VO2MAX_HEAVY_VIOLATION_PATTERNS.test(text)) {
        violations++;
        issues.push({
          rule: "prohibition_compliance",
          severity: "error",
          week: week.weekNumber,
          message: `S${week.weekNumber}: 🚫 VIOLATION VO2max LOURD — "${session.title}" programme des blocs VO2max ≥5min @>110% FTP`,
          detail: `Seuls les intervalles courts (3-4×3min @105-110% FTP) sont autorisés. Les 30/30 courts (≤10min total) restent OK ; interdits : 30/30 longs ≥20 répétitions. Remplacer par sweet spot ou seuil.`,
        });
      }
    }
  }

  const totalSessions = plan.weeks.reduce((sum, w) => sum + w.sessions.filter(s => !s.isRest).length, 0);
  const violationRate = totalSessions > 0 ? violations / totalSessions : 0;
  const score = violations === 0 ? 100 : violationRate < 0.05 ? 60 : violationRate < 0.1 ? 30 : 0;

  return { issues, score };
}

/**
 * Rule: Injury risk compliance — le risque blessure calculé (Fatigue + VLamax +
 * TTE, injuryRiskUnified.ts) était jusqu'ici affiché au coach mais jamais
 * vérifié sur le plan généré : `scoreWorkout` applique un malus (pas une
 * exclusion) sur les séances à impact élevé, donc un plan qui les prescrit
 * quand même reste possible. Cette règle ferme la boucle : au niveau CRITIQUE,
 * un plan qui garde une charge à impact élevé "normale" (comme si le risque
 * n'existait pas) est une vraie violation de sécurité, pas juste sous-optimal
 * — même tier que le Sprint Ban (bloque la sauvegarde, cf. PR#3).
 * ÉLEVÉ reste volontairement non bloquant (avertissement ailleurs dans le
 * plan, mais pas de blocage) : c'est un niveau de vigilance, pas d'alerte.
 */
function validateInjuryRiskCompliance(
  plan: ParsedPlan,
  injuryRisk?: { run?: { level: string }; bike?: { level: string } },
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  const runCritique = injuryRisk?.run?.level === "CRITIQUE";
  const bikeCritique = injuryRisk?.bike?.level === "CRITIQUE";
  if (!runCritique && !bikeCritique) return { issues: [], score: 100 };

  // Pas zéro : une progression totalement à l'arrêt n'est ni réaliste ni
  // souhaitable. Le seuil intercepte un plan qui ignore le risque, pas un
  // plan prudent qui garde un minimum de qualité.
  const MAX_HIGH_IMPACT_PER_WEEK_CRITIQUE = 2;

  let violationWeeks = 0;
  let evaluableWeeks = 0;

  for (const week of plan.weeks) {
    const activeSessions = week.sessions.filter(s => !s.isRest);
    if (activeSessions.length === 0) continue;
    evaluableWeeks++;

    let highImpactCount = 0;
    for (const session of activeSessions) {
      const sport = normalizeSport(session.sport);
      const text = `${session.title} ${session.details}`.toLowerCase();
      if (runCritique && sport === "Course" &&
          (HIGH_IMPACT_SESSION_PATTERNS.run_long.test(text) || HIGH_IMPACT_SESSION_PATTERNS.run_intensity.test(text))) {
        highImpactCount++;
      }
      if (bikeCritique && sport === "Vélo" && HIGH_IMPACT_SESSION_PATTERNS.bike_force.test(text)) {
        highImpactCount++;
      }
    }

    if (highImpactCount > MAX_HIGH_IMPACT_PER_WEEK_CRITIQUE) {
      violationWeeks++;
      issues.push({
        rule: "injury_risk_compliance",
        severity: "error",
        week: week.weekNumber,
        message: `S${week.weekNumber}: 🚨 Risque blessure CRITIQUE non respecté — ${highImpactCount} séances à impact mécanique élevé (max recommandé ${MAX_HIGH_IMPACT_PER_WEEK_CRITIQUE}/sem)`,
        detail: `Le diagnostic signale un risque blessure critique (${runCritique ? "CAP" : ""}${runCritique && bikeCritique ? " + " : ""}${bikeCritique ? "Vélo" : ""}). Réduire les sorties longues / fractionné-côtes (CAP) ou le travail force basse cadence (vélo) cette semaine.`,
      });
    }
  }

  const score = evaluableWeeks === 0
    ? 100
    : Math.max(0, Math.round(((evaluableWeeks - violationWeeks) / evaluableWeeks) * 100));
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
// LIMITER_SESSION_PATTERNS est importé en haut du fichier depuis
// src/lib/limiterSessionPatterns.ts (source unique).


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
  // - Sweet Spot long À BASSE CADENCE (55-65 RPM) → forced Type IIa aerobic recruitment +
  //   glycogen depletion → VLamax↓. Un Sweet Spot standard (cadence normale) est un travail
  //   FTP, pas un stimulus VLamax prouvé (cf. promptHelpers.ts L1389 : la matrice ne prescrit
  //   ce lever QUE qualifié "basse cadence"). D'où l'exigence du même qualificatif ici — retirer
  //   \bsst\b|sweet[\s_-]*spot bruts gonflait artificiellement la couverture VLamax (double
  //   comptage sur un simple Sweet Spot FTP classique).
  const VLAMAX_CO_CONTRIBUTOR_PATTERNS = /seuil\s*(?:continu|long|2[×x]|1[×x])|norv[ée]gi|mlss|tempo\s*(?:long|continu|soutenu)|sfr|r[øo]nnestad|force\s*(?:basse|50|40|60)\s*(?:rpm|cadence)|cadence\s*(?:basse|lente|50|40|60)|(?:basse|lente)\s*cadence|\b(?:4\d|5\d|60)\s*(?:rpm|tr\/?min)\b|seuil.*(?:\d+\s*min)|interval.*seuil/i;
  const TTE_FTP_CROSSOVER_PATTERNS = /\bsst\b|sweet[\s_-]*spot|over.?under|ftp|threshold(?:[\s_-]*(?:power|long|cruise))?|race[\s_-]*(?:pace|power).*(?:2[\sx_/-]*20|3[\sx_/-]*20|20\s*min)|tempo\s*(?:long|continu)|double[\s_-]*threshold|norwegian/i;

  const hasVlamaxLimiter = limiterKeys.includes("vlamax");
  const hasFtpLimiter = limiterKeys.includes("ftp");
  const hasTteLimiter = limiterKeys.includes("tte");

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.isRest) continue;
      const rawText = `${session.title} ${session.details}`;
      // Porte d'entrée "séance clé" : signal structuré posé par l'IA (chemin JSON, défaut
      // prod) en priorité, sinon fallback regex (seul signal dispo côté Markdown legacy).
      if (session.isKeySession !== true && !KEY_SESSION_PATTERNS.test(rawText)) continue;
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
// RACE_DAY_PATTERNS déplacé plus haut (ligne ~197, avec DELOAD_PATTERNS) —
// désormais réutilisé aussi par weekHasRaceDay() pour toutes les exemptions
// "semaine de course" du fichier, plus seulement cette règle.

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

    // Race Week completeness: minimum 4 real sessions expected — aligné sur
    // le prompt (systemPrompt.ts, RÈGLES INVIOLABLES §4) et sur son propre
    // exemple few-shot (FEWSHOT_RACEWEEK_MARATHON : 4 séances réelles hors
    // repos). Audit fix — ce garde-fou exigeait 5, le prompt exigeait 6, et
    // l'exemple donné à l'IA comme référence n'en démontrait que 4 : un plan
    // fidèle à l'exemple était donc rejeté par ce garde-fou.
    const MIN_RACE_WEEK_SESSIONS = 4;
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

      const blocks = detectAllIntervals(session.details);
      if (blocks.length === 0) continue;

      for (const detected of blocks) {
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
  }

  if (scanned === 0) {
    return { issues: [], score: 100 };
  }

  const failureRate = infeasible / scanned;
  const tightRate = tight / scanned;
  const score = Math.max(0, Math.round(100 - failureRate * 100 - tightRate * 30));

  return { issues, score };
}

/**
 * Lot 3 — Rule 12: Session density (sessions/semaine + max sessions/jour).
 * Vérifie que le plan respecte la config coach envoyée à l'IA :
 *  • activeSessions par semaine ∈ [target−1 ; target+1] (deload/race semaine exclus)
 *  • aucun jour ne dépasse `maxSessionsPerDay` (défaut 2)
 */
function validateSessionDensity(
  plan: ParsedPlan,
  cfg?: SessionDensityConfig,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const maxPerDay = cfg?.maxSessionsPerDay ?? 2;
  const target = cfg?.sessionsPerWeek;
  let compliant = 0;
  let scanned = 0;

  for (const w of plan.weeks) {
    const active = w.sessions.filter((s) => !s.isRest);

    // Density par jour
    const byDay = new Map<number, number>();
    for (const s of active) {
      if (s.dayIndex == null || s.dayIndex < 0) continue;
      byDay.set(s.dayIndex, (byDay.get(s.dayIndex) ?? 0) + 1);
    }
    for (const [day, count] of byDay) {
      if (count > maxPerDay) {
        issues.push({
          rule: "session_density",
          severity: "error",
          week: w.weekNumber,
          message: `S${w.weekNumber}: ${count} séances le jour ${day + 1} (max autorisé ${maxPerDay})`,
        });
      }
    }

    // Sessions/semaine vs cible coach
    if (target && target > 0) {
      scanned++;
      const isDeload = DELOAD_PATTERNS.test(`${w.theme} ${w.phase}`.toLowerCase());
      const isRaceWeek = weekHasRaceDay(w);
      if (isDeload || isRaceWeek) {
        compliant++;
        continue;
      }
      const delta = active.length - target;
      if (Math.abs(delta) <= 1) {
        compliant++;
      } else if (Math.abs(delta) === 2) {
        issues.push({
          rule: "session_density",
          severity: "warning",
          week: w.weekNumber,
          message: `S${w.weekNumber}: ${active.length} séances vs cible coach ${target} (Δ${delta > 0 ? "+" : ""}${delta})`,
        });
        compliant += 0.5;
      } else {
        issues.push({
          rule: "session_density",
          severity: "error",
          week: w.weekNumber,
          message: `S${w.weekNumber}: ${active.length} séances vs cible coach ${target} (Δ${delta > 0 ? "+" : ""}${delta}) — hors tolérance ±1`,
        });
      }
    }
  }

  const score = scanned > 0
    ? Math.round((compliant / scanned) * 100) - Math.min(30, issues.filter((i) => i.severity === "error" && /jour/.test(i.message)).length * 10)
    : Math.max(0, 100 - issues.length * 20);
  return { issues, score: Math.max(0, Math.min(100, score)) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOT 4 — Rule 13 : Lorang A/B/C/D categories (systemPrompt L528-536)
// A = HIT (Z5/Z6, VO2/VMA)        cible 15-20% vol
// B = Seuil / Sweet Spot (Z4)      cible ≤ ~15% vol (Z3 >30' compte B)
// C = Endurance fondamentale (Z1-Z2) cible 75-85% vol
// D = Récupération stricte
// Règle : hors décharge, chaque semaine ≥ 1 séance A OU B.
//
// Audit fix — les seuils de ce garde-fou (35% A+B / 55% C au niveau hebdo,
// 30% A+B / 60% C au niveau global) étaient nettement plus laxistes que ce
// que le prompt demande explicitement (POLARIZED TRAINING, §3 : 80% Z1-Z2 /
// 0-5% Z3 / 15-20% Z4-Z5+, soit A+B ≤ 25% max ; table A-D : C = 75-85%), ET
// divergents entre eux (deux paires de chiffres différentes pour la même
// règle). Un plan à 34% A+B passait le contrôle hebdo sans avertissement
// alors que le prompt vise ≤25% — le garde-fou n'empêchait quasiment rien de
// ce qu'il prétendait vérifier. Seuils unifiés ci-dessous, utilisés
// identiquement aux deux niveaux (hebdo et global).
// ═══════════════════════════════════════════════════════════════════════════════

/** A+B combinés ne doivent pas dépasser 25% du volume (0-5% Z3 + 15-20% Z4-Z5+, cf. prompt §3). */
const LORANG_HI_INTENSITY_MAX_PCT = 25;
/** C (endurance fondamentale) doit représenter au moins 75% du volume (cf. table A-D, prompt). */
const LORANG_ENDURANCE_MIN_PCT = 75;

const LORANG_EXPLICIT_TAG_RX = /\[\s*([ABCD])\s*\]/i;
const LORANG_CATALOG_PREFIX_RX = /\b([ABCD])_(?:BIKE|RUN|SWIM|TR|STR|BR|RECOVERY|10K|703|IM|MAR|SEMI|HEAT|TAPER|RECUP|RACE|MENTAL|HALF|PAP|ALTITUDE|RESP|PRE)/;
const LORANG_A_RX = /vo2|vma|billat|30[\/_ -]?30|15[\/_ -]?15|pma|tabata|z\s*[56]|zone\s*[56]|hiit|sprint\s*(?:max|all.?out)|neuro\s*muscul/i;
const LORANG_B_RX = /seuil|threshold|mlss|sweet[\s_-]*spot|\bsst\b|over.?under|ftp|cruise|norvégi|norwegian|double[\s_-]*threshold|race[\s_-]*pace|allure\s*(?:course|semi|marathon|10k|5k|70\.?3|im\b|ironman|spécifiq)|tempo\s*(?:long|\d{2,3}\s*min|\d+\s*x\s*\d+)|z\s*4/i;
const LORANG_D_RX = /décharge|recovery\s*ride|spin\s*facile|yoga|marche|mobilit|souplesse|activation\s*courte|régénér/i;

function classifyLorang(session: ParsedSession): LorangCategory {
  if (session.isRest) return "D";
  const text = `${session.title} ${session.details}`;
  // 1) explicit tag [A]/[B]/[C]/[D]
  const explicit = text.match(LORANG_EXPLICIT_TAG_RX);
  if (explicit) return explicit[1].toUpperCase() as LorangCategory;
  // 2) catalog ID prefix
  const catalog = text.match(LORANG_CATALOG_PREFIX_RX);
  if (catalog) return catalog[1].toUpperCase() as LorangCategory;
  // 3) keyword fallback (A > B > D > C)
  if (LORANG_A_RX.test(text)) return "A";
  if (LORANG_B_RX.test(text)) return "B";
  if (LORANG_D_RX.test(text)) return "D";
  // 4) low-intensity endurance = C by default when we can identify at least a sport session
  if (LOW_INTENSITY_PATTERNS.test(text)) return "C";
  return "unknown";
}

function validateLorangCategories(
  plan: ParsedPlan,
  objective?: string,
  ambition?: string,
): { issues: ValidationIssue[]; score: number; distribution: LorangCategoryDistribution } {
  const issues: ValidationIssue[] = [];
  const weeks: LorangWeekBreakdown[] = [];
  let A = 0, B = 0, C = 0, D = 0, unknown = 0, totalActive = 0, tagged = 0;

  // Batch 2 — Règle 1 (≥1 séance A/B par semaine) exemptée pour Finisher et
  // Start to Run : la "Grille Volume/Intensité par Ambition" (systemPrompt.ts)
  // prescrit explicitement 1-2 séances clés/semaine pour Finisher et 0 pour
  // Start to Run — ces plans sont censés être quasi-exclusivement Z1-Z2
  // (doctrine "pas d'intensités max", périodisation linéaire progressive).
  // Sans cette exemption, un plan strictement conforme à cette doctrine se
  // faisait pénaliser en erreur quasiment chaque semaine par une règle
  // pensée pour les niveaux Age Group+/objectifs intenses. Les règles 2/4
  // (polarisation, distribution globale) restent actives — seule la règle 1
  // (présence stricte d'A/B) est exemptée.
  const amb = (ambition || "").toLowerCase();
  const isFinisherOrStartToRun = amb === "finisher" || normalizeObjectiveKey(objective || "") === "StartToRun";

  for (const w of plan.weeks) {
    const active = w.sessions.filter((s) => !s.isRest);
    const weekThemeText = `${w.theme} ${w.phase}`.toLowerCase();
    const isDeload = DELOAD_PATTERNS.test(weekThemeText) || active.length <= 3;
    // Niveau 2 : bloc seuil concentré explicitement nommé (norvégien double-seuil,
    // Sweet Spot étendu) — même exemption que Rule 1, cf. THRESHOLD_BLOCK_PATTERNS.
    const isThresholdBlock = THRESHOLD_BLOCK_PATTERNS.test(weekThemeText);
    const bd: LorangWeekBreakdown = {
      weekNumber: w.weekNumber, isDeload,
      A: 0, B: 0, C: 0, D: 0, unknown: 0,
      active: active.length, hasHighOrThreshold: false,
    };
    for (const s of active) {
      const cat = classifyLorang(s);
      bd[cat === "unknown" ? "unknown" : cat]++;
      totalActive++;
      // consider "tagged" any session with explicit tag OR catalog ID
      const text = `${s.title} ${s.details}`;
      if (LORANG_EXPLICIT_TAG_RX.test(text) || LORANG_CATALOG_PREFIX_RX.test(text)) tagged++;
    }
    bd.hasHighOrThreshold = bd.A > 0 || bd.B > 0;
    A += bd.A; B += bd.B; C += bd.C; D += bd.D; unknown += bd.unknown;
    weeks.push(bd);

    // Règle 1 : hors décharge/race, ≥1 A ou B (exemptée Finisher/Start to Run, cf. commentaire ci-dessus)
    const isRaceWeek = weekHasRaceDay(w);
    if (!isDeload && !isRaceWeek && !isFinisherOrStartToRun && !bd.hasHighOrThreshold && bd.active >= 3) {
      issues.push({
        rule: "lorang_categories",
        severity: "error",
        week: w.weekNumber,
        message: `S${w.weekNumber} : aucune séance Lorang A (HIT) ni B (seuil) — chaque semaine hors décharge doit en contenir au moins 1`,
      });
    }

    // Règle 2 : polarisation intra-semaine (hors décharge / bloc seuil concentré)
    if (!isDeload && !isThresholdBlock && bd.active >= 4) {
      const hiPct = ((bd.A + bd.B) / bd.active) * 100;
      if (hiPct > LORANG_HI_INTENSITY_MAX_PCT) {
        issues.push({
          rule: "lorang_categories",
          severity: "warning",
          week: w.weekNumber,
          message: `S${w.weekNumber} : ${Math.round(hiPct)}% A+B (cible ≤ ${LORANG_HI_INTENSITY_MAX_PCT}%) — polarisation Seiler compromise`,
        });
      }
      const cPct = (bd.C / bd.active) * 100;
      if (cPct < LORANG_ENDURANCE_MIN_PCT) {
        issues.push({
          rule: "lorang_categories",
          severity: "warning",
          week: w.weekNumber,
          message: `S${w.weekNumber} : ${Math.round(cPct)}% C (endurance fondamentale) — cible ${LORANG_ENDURANCE_MIN_PCT}-85%`,
        });
      }
    }
  }

  const pct = (n: number) => (totalActive > 0 ? Math.round((n / totalActive) * 100) : 0);
  const taggedPct = totalActive > 0 ? Math.round((tagged / totalActive) * 100) : 0;

  // Règle 3 : taux d'étiquetage explicite (tag [A-D] ou ID catalogue A_/B_/...)
  if (totalActive >= 10 && taggedPct < 50) {
    issues.push({
      rule: "lorang_categories",
      severity: "warning",
      message: `Seulement ${taggedPct}% des séances portent un tag Lorang [A/B/C/D] ou ID catalogue — traçabilité méthodologique réduite (cible ≥70%)`,
    });
  }

  // Règle 4 : distribution globale polarisée
  const APct = pct(A), BPct = pct(B), CPct = pct(C);
  if (totalActive >= 12) {
    if (APct + BPct > LORANG_HI_INTENSITY_MAX_PCT) {
      issues.push({
        rule: "lorang_categories",
        severity: "warning",
        message: `Distribution globale ${APct + BPct}% A+B / ${CPct}% C — dépasse la cible polarisée Seiler (≤${LORANG_HI_INTENSITY_MAX_PCT}% A+B)`,
      });
    }
    if (CPct < LORANG_ENDURANCE_MIN_PCT) {
      issues.push({
        rule: "lorang_categories",
        severity: "warning",
        message: `Seulement ${CPct}% de séances C (endurance fondamentale) sur l'ensemble du plan — cible ≥ ${LORANG_ENDURANCE_MIN_PCT}%`,
      });
    }
  }

  // Score : pondère erreurs (semaine sans A|B) et distributions hors cible
  const errs = issues.filter((i) => i.severity === "error").length;
  const warns = issues.filter((i) => i.severity === "warning").length;
  let score = 100 - errs * 20 - warns * 6;
  // bonus si tagged ≥ 70%
  if (taggedPct >= 70) score = Math.min(100, score + 5);
  score = Math.max(0, Math.min(100, score));

  const distribution: LorangCategoryDistribution = {
    totalActive, tagged, taggedPct,
    A, APct, B, BPct, C, CPct, D, DPct: pct(D),
    weeks,
  };
  return { issues, score, distribution };
}

// ═══════════════════════════════════════════════════════════════════════════════
// #18 — RÈGLES INVIOLABLE/OBLIGATOIRE SANS CONTRÔLE POST-GÉNÉRATION (lot 1+2)
// ═══════════════════════════════════════════════════════════════════════════════
// Audit méthodologique : 10 règles marquées INVIOLABLE/OBLIGATOIRE/BLOQUANTE
// dans systemPrompt.ts n'avaient aucun contrôle correspondant dans ce fichier
// — un plan pouvait les violer sans jamais faire baisser son score QA.
// Lot 1 (Rule 14-17, ci-dessous après Rule 18-21) : titre H1, unicité du
// récap stratégique, cohérence jour de repos, anti-répétition — pondérées
// dans PLAN_VALIDATION_WEIGHTS.
// Lot 2 (Rule 18-21 ci-dessous) : renfo Start-to-Run, back-to-back trail,
// ramp D+, plancher séances/jour élite. Ces 4 règles sont spécifiques à un
// objectif/une ambition — comme sportObjective/injuryRiskCompliance déjà
// dans ce fichier, elles alimentent `issues` et `summary` mais restent HORS
// du score pondéré (pas de rééquilibrage de PLAN_VALIDATION_WEIGHTS pour
// elles) : elles ne s'appliquent qu'à une minorité de plans (Start-to-Run,
// Trail Montagne/Ultra, IM/70.3 Elite+), donc les inclure au score pondéré
// global pénaliserait à tort tous les autres plans à poids constant, ou
// nécessiterait un rééquilibrage à chaque fois qu'aucune de ces règles ne
// s'applique — pas justifié pour des règles conditionnelles. Composition
// séances clés trail (5e règle du lot 2 initialement prévue) délibérément
// DIFFÉRÉE : matcher 3-5 catégories de contenu par objectif de façon fiable
// en regex aurait un taux de faux positifs trop élevé pour la confiance
// qu'on veut donner à ce score — laissé en note de suivi (cf. PR #43).

/** Rule 18 : Renforcement Fondation OBLIGATOIRE chaque semaine (Start to Run,
 *  systemPrompt.ts S2R_STRENGTH_PROGRESSION : "Chaque semaine DOIT contenir 2
 *  séances 'Renforcement fondation' (1 seule en dernière semaine)" — limiteur
 *  d'un débutant étant musculo-squelettique, ce bloc prévient la blessure. */
const S2R_STRENGTH_PATTERN = /renforcement\s*fondation|S2R_STR_FOUNDATION/i;

function validateStartToRunWeeklyStrength(
  plan: ParsedPlan,
  objective?: string,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  if (normalizeObjectiveKey(objective || "") !== "StartToRun") return { issues, score: 100 };

  const lastWeekNumber = Math.max(...plan.weeks.map((w) => w.weekNumber));
  let weeksChecked = 0;
  let weeksOk = 0;
  for (const week of plan.weeks) {
    weeksChecked++;
    const strengthCount = week.sessions.filter(
      (s) => !s.isRest && S2R_STRENGTH_PATTERN.test(`${s.title} ${s.details} ${s.catalogId ?? ""}`),
    ).length;
    const minExpected = week.weekNumber === lastWeekNumber ? 1 : 2;
    if (strengthCount < minExpected) {
      issues.push({
        rule: "start_to_run_strength",
        severity: "error",
        week: week.weekNumber,
        message: `S${week.weekNumber}: ${strengthCount} séance(s) "Renforcement fondation" (attendu ≥${minExpected}) — OBLIGATOIRE chaque semaine pour Start to Run (prévention blessure musculo-squelettique)`,
      });
    } else {
      weeksOk++;
    }
  }
  const score = weeksChecked === 0 ? 100 : Math.round((weeksOk / weeksChecked) * 100);
  return { issues, score };
}

/** Rule 19 : Back-to-back weekend OBLIGATOIRE (Trail Montagne/Ultra, Chantier/
 *  Peak/Consolidation) — systemPrompt.ts : "Back-to-back OBLIGATOIRE en
 *  Build/Peak" / "B2B OBLIGATOIRE" (Trail Ultra). Vérifie la PRÉSENCE d'au
 *  moins un week-end Samedi+Dimanche actifs sur le bloc spécifique — pas
 *  chaque semaine (le prompt ne le demande pas non plus), ce serait trop
 *  strict pour un pattern qui revient périodiquement dans le bloc. */
function validateTrailBackToBack(
  plan: ParsedPlan,
  objective?: string,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const objKey = normalizeObjectiveKey(objective || "");
  if (objKey !== "TrailMountain" && objKey !== "TrailUltra") return { issues, score: 100 };

  // Chantier(2)/Consolidation(3)/Peak compressé(3.5) — le bloc "spécifique"
  // du plan trail, hors Fondation et Affûtage.
  const specificWeeks = plan.weeks.filter((w) => {
    const idx = getPhaseIndex(w.phase);
    return idx !== null && idx >= 2 && idx <= 4;
  });
  if (specificWeeks.length === 0) return { issues, score: 100 };

  const hasBackToBack = specificWeeks.some((w) => {
    const saturdayActive = w.sessions.some((s) => !s.isRest && s.dayIndex === 5);
    const sundayActive = w.sessions.some((s) => !s.isRest && s.dayIndex === 6);
    return saturdayActive && sundayActive;
  });

  if (!hasBackToBack) {
    issues.push({
      rule: "trail_back_to_back",
      severity: "warning",
      message: `Aucun week-end back-to-back (SL J1 + sortie technique J2) détecté sur le bloc spécifique — OBLIGATOIRE pour ${objKey === "TrailUltra" ? "Trail Ultra" : "Trail Montagne"} (simule la fatigue cumulée trail, cf. systemPrompt.ts)`,
    });
    return { issues, score: 50 };
  }
  return { issues, score: 100 };
}

/** Rule 20 : D+ (dénivelé) chiffré OBLIGATOIRE pour trail (systemPrompt.ts,
 *  "RÈGLES D+ — OBLIGATOIRE POUR TRAIL" : "CHAQUE séance trail doit
 *  mentionner le D+ cible"). Vérifie la présence d'un D+ chiffré sur les
 *  séances CAP/Trail — la progression hebdomadaire chiffrée n'est PAS
 *  vérifiée ici (nécessiterait un seuil de tolérance arbitraire sur une
 *  extraction texte forcément approximative — trop de faux positifs pour la
 *  confiance qu'on veut donner à ce score). */
const DPLUS_MENTION_PATTERN = /D\+|dénivelé|\bDplus\b/i;

function validateTrailDPlusPresence(
  plan: ParsedPlan,
  objective?: string,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const objKey = normalizeObjectiveKey(objective || "");
  const isTrailObjective = objKey === "TrailShort" || objKey === "TrailMountain" || objKey === "TrailUltra" || objKey === "Trail";
  if (!isTrailObjective) return { issues, score: 100 };

  let trailSessions = 0;
  let missingDPlus = 0;
  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      if (normalizeSport(s.sport) !== "Course") continue;
      trailSessions++;
      if (!DPLUS_MENTION_PATTERN.test(`${s.title} ${s.details}`)) {
        missingDPlus++;
      }
    }
  }
  if (trailSessions === 0) return { issues, score: 100 };

  const missingPct = missingDPlus / trailSessions;
  if (missingPct > 0.3) {
    issues.push({
      rule: "trail_dplus_presence",
      severity: missingPct > 0.6 ? "warning" : "info",
      message: `${missingDPlus}/${trailSessions} séances CAP/Trail sans D+ chiffré — chaque séance trail doit mentionner le D+ cible (OBLIGATOIRE, systemPrompt.ts)`,
    });
  }
  const score = Math.max(0, Math.round((1 - missingPct) * 100));
  return { issues, score };
}

/** Rule 21 : Plancher séances/jour Elite+ (systemPrompt.ts "DOUBLES & TRIPLES
 *  SÉANCES — OBLIGATOIRE" : "Si un jour n'a qu'1 séance pour Elite/Competitor
 *  IM/70.3 (hors repos), c'est une ERREUR" / promptHelpers.ts:1769-1800 "Un
 *  jour avec 1 seule séance (hors repos) est une ERREUR GRAVE pour World
 *  Class/Elite/Competitor"). `ambition` utilise les clés internes en vigueur
 *  dans promptHelpers.ts : "world_class"/"elite"/"competitor" — PAS "Elite"
 *  au sens historique du label UI (relabellisé "Qualifiable", cf.
 *  ambitionLevel.ts). Nécessite le nouveau paramètre `ambition` de
 *  validatePlan (non disponible pour les autres règles de ce fichier). */
function validateDailySessionFloor(
  plan: ParsedPlan,
  objective?: string,
  ambition?: string,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const objKey = normalizeObjectiveKey(objective || "");
  const isTriIMor703 = objKey === "IM" || objKey === "703";
  const amb = (ambition || "").toLowerCase();
  const isHighAmbition = amb === "world_class" || amb === "elite" || amb === "competitor";
  if (!isTriIMor703 || !isHighAmbition) return { issues, score: 100 };

  let daysChecked = 0;
  let daysViolating = 0;
  for (const week of plan.weeks) {
    const themeText = `${week.theme} ${week.phase}`.toLowerCase();
    if (DELOAD_PATTERNS.test(themeText) || weekHasRaceDay(week)) continue;

    const byDay = new Map<number, ParsedSession[]>();
    for (const s of week.sessions) {
      if (!byDay.has(s.dayIndex)) byDay.set(s.dayIndex, []);
      byDay.get(s.dayIndex)!.push(s);
    }
    for (const sessions of byDay.values()) {
      const active = sessions.filter((s) => !s.isRest);
      if (active.length === 0) continue; // jour repos complet — 1/semaine autorisé
      daysChecked++;
      if (active.length < 2) {
        daysViolating++;
        issues.push({
          rule: "daily_session_floor",
          severity: "error",
          week: week.weekNumber,
          message: `S${week.weekNumber} ${active[0].dayName}: 1 seule séance ("${active[0].title}") — ERREUR GRAVE pour ambition ${amb} (World Class/Elite/Competitor IM/70.3 : 2-3 séances/jour, sauf 1 jour repos/semaine)`,
        });
      }
    }
  }
  const score = daysChecked === 0 ? 100 : Math.max(0, 100 - Math.round((daysViolating / daysChecked) * 100));
  return { issues, score };
}

/** Rule 14 : Titre H1 (systemPrompt.ts "RÈGLE #0 — BLOQUANTE").
 *  Gabarit : "Plan TFCL™ — <FORMAT_COURSE> <NOM_ATHLETE> — <N> semaines" — le
 *  "#" de tête est déjà retiré par le parser (aiPlanParser.ts). Le milieu doit
 *  contenir au moins 2 tokens (format course + nom athlète) : un titre du
 *  type "Plan TFCL™ — 70.3 — 12 semaines" (nom athlète omis, cf. exemple
 *  INTERDIT explicite du prompt) ne doit pas passer.
 */
const H1_TITLE_PATTERN = /^Plan TFCL™ — \S+(?:\s+\S+)+ — \d+\s*semaines?$/u;

function validateTitleFormat(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const title = (plan.title || "").trim();
  if (!title) {
    issues.push({
      rule: "title_format",
      severity: "warning",
      message: `Titre H1 absent — attendu "Plan TFCL™ — <format course> <nom athlète> — <N> semaines"`,
    });
    return { issues, score: 50 };
  }
  if (!H1_TITLE_PATTERN.test(title)) {
    issues.push({
      rule: "title_format",
      severity: "error",
      message: `Titre H1 non conforme au gabarit RÈGLE #0 : "${title}"`,
      detail: `Attendu "Plan TFCL™ — <FORMAT_COURSE> <NOM_ATHLETE> — <N> semaines" (nom athlète et nombre de semaines requis, jamais un slogan comme "Structure Qualifiable").`,
    });
    return { issues, score: 30 };
  }
  return { issues, score: 100 };
}

/** Rule 15 : Unicité du Récapitulatif Stratégique (systemPrompt.ts, "bloquante").
 *  Deux signaux structurels d'une table dupliquée : (a) un même "Bloc N"
 *  apparaît plusieurs fois parmi les phases parsées, (b) la numérotation "#"
 *  du récap (StrategicLimiter.rank) n'est pas strictement croissante/continue
 *  depuis 1 — signe classique d'un redémarrage à 1 en milieu de table. */
function validateStrategicRecapUniqueness(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  let score = 100;

  const blocNumbers = plan.phases
    .map((p) => p.name.match(/^Bloc\s+(\d+)/i)?.[1])
    .filter((n): n is string => !!n);
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const n of blocNumbers) {
    if (seen.has(n)) duplicated.add(n);
    seen.add(n);
  }
  if (duplicated.size > 0) {
    issues.push({
      rule: "strategic_recap",
      severity: "error",
      message: `Bloc ${[...duplicated].join(", ")} apparaît plusieurs fois dans le plan — signe de deux tables/sections dupliquées`,
      detail: `Chaque "Bloc N" doit apparaître une seule fois (table ET corps du plan) — fusionner en une seule structure cohérente.`,
    });
    score -= 30;
  }

  // Audit — le préfixe "Bloc N" ci-dessus est une convention Markdown legacy
  // (systemPromptJSON.ts:41 la liste explicitement parmi les règles de
  // format ANNULÉES en mode JSON — chemin de prod par défaut) : sur ce
  // chemin, `phases[].name` est un texte libre sans ce préfixe, donc le
  // contrôle ci-dessus est inerte. Détection complémentaire, indépendante du
  // format : un même nom de phase (normalisé) répété plusieurs fois est en
  // soi un signe de doublon, quel que soit le vocabulaire utilisé.
  const seenNames = new Set<string>();
  const duplicatedNames = new Set<string>();
  for (const p of plan.phases) {
    const key = p.name.trim().toLowerCase();
    if (!key) continue;
    if (seenNames.has(key)) duplicatedNames.add(p.name);
    seenNames.add(key);
  }
  if (duplicatedNames.size > 0) {
    issues.push({
      rule: "strategic_recap",
      severity: "error",
      message: `Phase "${[...duplicatedNames].join(", ")}" apparaît plusieurs fois dans le plan (bloc "Phases") — signe de doublon`,
      detail: `Chaque phase doit apparaître une seule fois dans la structure du plan.`,
    });
    score -= 30;
  }

  const ranks = plan.strategicRecap?.limiters.map((l) => l.rank) ?? [];
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) {
      issues.push({
        rule: "strategic_recap",
        severity: "warning",
        message: `Numérotation du Récapitulatif Stratégique non continue (rang ${ranks[i]} en position ${i + 1}) — signe possible d'une deuxième table collée`,
      });
      score -= 15;
      break;
    }
  }

  return { issues, score: Math.max(0, score) };
}

/** Rule 16 : Cohérence jour de repos (systemPrompt.ts "RÈGLE REPOS — COHÉRENCE
 *  ABSOLUE" : "Un jour Repos est COMPLET. Récupération active (vélo Z1 30min)
 *  n'est pas un jour repos. 1 jour repos complet/semaine min.").
 *  Note : le parser (isRestSession, aiPlanParser.ts) classe déjà "récupération"
 *  comme isRest=true — ce contrôle rattrape donc aussi les séances de récup
 *  active mal étiquetées "Repos" en amont, pas seulement une régression du
 *  validateur. */
const ACTIVE_CONTENT_IN_REST_PATTERN = /z[1-7]\b|vélo|natation|course\b|renfo|muscul|\d+\s*(?:min|km|w)\b|ftp/i;

function validateRestDayCoherence(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  let flaggedActive = 0;
  let totalRestSessions = 0;
  let weeksWithNoFullRestDay = 0;
  let weeksChecked = 0;

  for (const week of plan.weeks) {
    // Semaines trop courtes (course, décharge minimaliste) exemptées du
    // minimum 1 repos/semaine — pas assez de jours pour que ça soit un signal.
    if (week.sessions.length < 4) continue;
    weeksChecked++;

    let hasFullRestDay = false;
    for (const s of week.sessions) {
      if (!s.isRest) continue;
      totalRestSessions++;
      const text = `${s.title} ${s.details}`.trim();
      if (text && ACTIVE_CONTENT_IN_REST_PATTERN.test(text)) {
        flaggedActive++;
        issues.push({
          rule: "rest_day_coherence",
          severity: "warning",
          week: week.weekNumber,
          message: `S${week.weekNumber} ${s.dayName}: jour "Repos" contient du contenu actif ("${s.title}") — un jour repos complet n'a aucun contenu, la récupération active n'en est pas un`,
        });
      } else {
        hasFullRestDay = true;
      }
    }
    if (!hasFullRestDay) weeksWithNoFullRestDay++;
  }

  if (weeksWithNoFullRestDay > 0) {
    issues.push({
      rule: "rest_day_coherence",
      severity: "warning",
      message: `${weeksWithNoFullRestDay}/${weeksChecked} semaine(s) sans aucun jour repos complet réel — minimum 1/semaine attendu`,
    });
  }

  const restDayScore = weeksChecked === 0 ? 100 : Math.max(0, 100 - Math.round((weeksWithNoFullRestDay / weeksChecked) * 60));
  const activeContentScore = totalRestSessions === 0 ? 100 : Math.max(0, 100 - Math.round((flaggedActive / totalRestSessions) * 100));
  const score = Math.round((restDayScore + activeContentScore) / 2);
  return { issues, score };
}

/** Rule 17 : Anti-Répétition (systemPrompt.ts "DIVERSITÉ ET PROGRESSION DES
 *  SÉANCES — CRITIQUE" : "Règle #1 : JAMAIS la même séance 2 semaines
 *  consécutives."). Comparaison au même jour de la semaine, titre normalisé
 *  (emoji/casse ignorés) — volontairement strict (titre identique) plutôt que
 *  flou (similarité de contenu), pour éviter les faux positifs sur des
 *  séances simplement du même TYPE. Semaines décharge/course exemptées : un
 *  rappel identique y est attendu, pas une répétition non désirée. */
function normalizeSessionTitleForRepetitionCheck(title: string): string {
  return title.toLowerCase().replace(/[🔑🏁]/g, "").trim();
}

function validateAntiRepetition(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const weeksByNumber = new Map<number, ParsedWeek>();
  for (const w of plan.weeks) weeksByNumber.set(w.weekNumber, w);

  let repeated = 0;
  let checked = 0;

  for (const week of plan.weeks) {
    const themeText = `${week.theme} ${week.phase}`.toLowerCase();
    if (DELOAD_PATTERNS.test(themeText) || weekHasRaceDay(week)) continue;
    const prev = weeksByNumber.get(week.weekNumber - 1);
    if (!prev) continue;
    const prevThemeText = `${prev.theme} ${prev.phase}`.toLowerCase();
    if (DELOAD_PATTERNS.test(prevThemeText) || weekHasRaceDay(prev)) continue;

    for (const s of week.sessions) {
      if (s.isRest) continue;
      const prevSame = prev.sessions.find((p) => !p.isRest && p.dayIndex === s.dayIndex);
      if (!prevSame) continue;
      const norm = normalizeSessionTitleForRepetitionCheck(s.title);
      checked++;
      if (norm.length > 0 && norm === normalizeSessionTitleForRepetitionCheck(prevSame.title)) {
        repeated++;
        issues.push({
          rule: "anti_repetition",
          severity: "warning",
          week: week.weekNumber,
          message: `S${week.weekNumber} ${s.dayName}: "${s.title}" identique à la séance de S${week.weekNumber - 1} — varier format/durée/intensité (Règle #1 Anti-Répétition)`,
        });
      }
    }
  }

  const score = checked === 0 ? 100 : Math.max(0, 100 - Math.round((repeated / checked) * 100));
  return { issues, score };
}

/** Poids du score pondéré (17 rules) — module-level pour être testable
 *  directement (somme attendue = 1.00, cf. __tests__/planValidator.test.ts
 *  "la somme des poids reste 1.00") sans dépendre d'un plan fixture
 *  "parfait" sur les 17 dimensions à la fois. */
export const PLAN_VALIDATION_WEIGHTS = {
  polarization: 0.09,
  loadPattern: 0.07,
  keySessions: 0.07,
  progression: 0.04,
  sportRatio: 0.04,
  catalogRatio: 0.03,
  prohibitionCompliance: 0.14,
  phaseCoherence: 0.08,
  raceDayPresence: 0.06,
  limiterCoherence: 0.10,
  wbalFeasibility: 0.10,
  sessionDensity: 0.02,
  lorangCategories: 0.03,
  titleFormat: 0.03,
  strategicRecapUniqueness: 0.03,
  restDayCoherence: 0.03,
  antiRepetition: 0.04,
} as const;

export function validatePlan(
  plan: ParsedPlan,
  objective?: string,
  prohibitions?: string[],
  raceWeekNumbers?: number[],
  identifiedLimiters?: string[],
  identifiedLimiterKeys?: string[],
  athleteData?: PlanAthleteData,
  coachLimiterOrder?: string[],
  sessionDensity?: SessionDensityConfig,
  injuryRisk?: { run?: { level: string }; bike?: { level: string } },
  /** #18 lot 2 : clé interne ("world_class"/"elite"/"competitor"/"age_group"/
   *  "finisher", cf. ambitionLevel.ts) — nécessaire au plancher séances/jour
   *  Elite+ (validateDailySessionFloor), absente des paramètres précédents. */
  ambition?: string,
): PlanValidationResult {
  // F-14: defensive re-sort of identifiedLimiterKeys by coach override.
  // Upstream callers (deriveLimiterKeysFromGapAnalysis) usually already pass them
  // sorted, but if a caller forgets, this guarantees L1/L2 in validateLimiterCoherence
  // match the coach's manual order.
  let effectiveLimiterKeys = identifiedLimiterKeys;
  if (coachLimiterOrder && coachLimiterOrder.length > 0 && identifiedLimiterKeys && identifiedLimiterKeys.length > 0) {
    const coachKeyOrder = coachLimiterOrder
      .map((m) => detectLimiterKeyFromMetric(m))
      .filter((k): k is string => !!k);
    effectiveLimiterKeys = [...identifiedLimiterKeys].sort((a, b) => {
      const idxA = coachKeyOrder.indexOf(a);
      const idxB = coachKeyOrder.indexOf(b);
      const posA = idxA >= 0 ? idxA : 999;
      const posB = idxB >= 0 ? idxB : 999;
      return posA - posB;
    });
  }

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
  const phaseCoherence = validatePhaseCoherence(plan, objective);
  const raceDayPresence = validateRaceDayPresence(plan, raceWeekNumbers);
  const limiterCoherence = validateLimiterCoherence(plan, identifiedLimiters, effectiveLimiterKeys);
  const wbalFeasibility = validateWbalFeasibility(plan, athleteData);
  const sessionDensity_ = validateSessionDensity(plan, sessionDensity);
  const lorang_ = validateLorangCategories(plan, objective, ambition);
  const sportObjective = validateSportObjectiveCoherence(plan, objective);
  const injuryRiskCompliance = validateInjuryRiskCompliance(plan, injuryRisk);
  // #18 lot 1 : règles INVIOLABLE/OBLIGATOIRE sans contrôle post-génération jusqu'ici
  const titleFormat = validateTitleFormat(plan);
  const strategicRecapUniqueness = validateStrategicRecapUniqueness(plan);
  const restDayCoherence = validateRestDayCoherence(plan);
  const antiRepetition = validateAntiRepetition(plan);
  // #18 lot 2 : règles conditionnelles (objectif/ambition spécifiques) — hors
  // score pondéré, cf. commentaire au-dessus des fonctions (même traitement
  // que sportObjective/injuryRiskCompliance déjà hors PLAN_VALIDATION_WEIGHTS).
  const startToRunStrength = validateStartToRunWeeklyStrength(plan, objective);
  const trailBackToBack = validateTrailBackToBack(plan, objective);
  const trailDPlusPresence = validateTrailDPlusPresence(plan, objective);
  const dailySessionFloor = validateDailySessionFloor(plan, objective, ambition);

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
    ...sessionDensity_.issues,
    ...lorang_.issues,
    ...startToRunStrength.issues,
    ...trailBackToBack.issues,
    ...trailDPlusPresence.issues,
    ...dailySessionFloor.issues,
    ...sportObjective.issues,
    ...injuryRiskCompliance.issues,
    ...titleFormat.issues,
    ...strategicRecapUniqueness.issues,
    ...restDayCoherence.issues,
    ...antiRepetition.issues,
  ];

  // Weighted score (17 rules) — Lot 4 introduit lorangCategories (5%),
  // rééquilibré depuis polarization (12→10) et sessionDensity (5→3) pour éviter double comptage
  // (polarization approximative sur classification texte vs Lorang tag-based).
  // #18 lot 1 introduit 4 règles jusqu'ici sans contrôle (titre H1, unicité
  // récap, cohérence repos, anti-répétition — 13% cumulé), rééquilibré par
  // petites retenues sur les rules les moins critiques (jamais sur
  // prohibitionCompliance/limiterCoherence/wbalFeasibility, les 3 gardes-fous
  // sécurité/fidélité diagnostic) — somme totale inchangée à 1.00, vérifié par
  // un test dédié sur PLAN_VALIDATION_WEIGHTS (garde-fou anti-drift).
  const weights = PLAN_VALIDATION_WEIGHTS;
  const clamp100 = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
  const weightedScore = Math.round(
    clamp100(polarization.score) * weights.polarization +
    clamp100(loadPattern.score) * weights.loadPattern +
    clamp100(keySessions.score) * weights.keySessions +
    clamp100(progression.score) * weights.progression +
    clamp100(sportRatio.score) * weights.sportRatio +
    clamp100(catalogRatio.score) * weights.catalogRatio +
    clamp100(prohibitionCompliance.score) * weights.prohibitionCompliance +
    clamp100(phaseCoherence.score) * weights.phaseCoherence +
    clamp100(raceDayPresence.score) * weights.raceDayPresence +
    clamp100(limiterCoherence.score) * weights.limiterCoherence +
    clamp100(wbalFeasibility.score) * weights.wbalFeasibility +
    clamp100(sessionDensity_.score) * weights.sessionDensity +
    clamp100(lorang_.score) * weights.lorangCategories +
    clamp100(titleFormat.score) * weights.titleFormat +
    clamp100(strategicRecapUniqueness.score) * weights.strategicRecapUniqueness +
    clamp100(restDayCoherence.score) * weights.restDayCoherence +
    clamp100(antiRepetition.score) * weights.antiRepetition
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
  const injuryRiskErrors = injuryRiskCompliance.issues.filter(i => i.severity === "error").length;
  const overallComment = prohibitionViolations > 0
    ? `🚫 ${prohibitionViolations} VIOLATION(S) DE PROHIBITION DÉTECTÉE(S) — Plan NON CONFORME au diagnostic physiologique`
    : injuryRiskErrors > 0
    ? `🚨 ${injuryRiskErrors} semaine(s) avec charge à impact élevé non réduite malgré un risque blessure CRITIQUE — Plan NON CONFORME au diagnostic physiologique`
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
    lorangCategories: lorang_.distribution,
    summary: {
      polarizationScore: clamp100(polarization.score),
      loadPatternScore: clamp100(loadPattern.score),
      keySessionsScore: clamp100(keySessions.score),
      progressionScore: clamp100(progression.score),
      sportRatioScore: clamp100(sportRatio.score),
      catalogRatioScore: catalogRatio.score,
      prohibitionComplianceScore: prohibitionCompliance.score,
      phaseCoherenceScore: clamp100(phaseCoherence.score),
      raceDayScore: raceDayPresence.score,
      limiterCoherenceScore: clamp100(limiterCoherence.score),
      wbalFeasibilityScore: wbalFeasibility.score,
      sessionDensityScore: sessionDensity_.score,
      lorangCategoriesScore: lorang_.score,
      injuryRiskComplianceScore: injuryRiskCompliance.score,
      titleFormatScore: clamp100(titleFormat.score),
      strategicRecapUniquenessScore: clamp100(strategicRecapUniqueness.score),
      restDayCoherenceScore: clamp100(restDayCoherence.score),
      antiRepetitionScore: clamp100(antiRepetition.score),
      startToRunStrengthScore: startToRunStrength.score,
      trailBackToBackScore: trailBackToBack.score,
      trailDPlusPresenceScore: trailDPlusPresence.score,
      dailySessionFloorScore: dailySessionFloor.score,
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
  lines.push(`| 🎨 Catégories Lorang A-D | ${result.summary.lorangCategoriesScore}/100 | ${result.summary.lorangCategoriesScore >= 75 ? "✅" : result.summary.lorangCategoriesScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 🛡️ Risque blessure (charge impact élevé) | ${result.summary.injuryRiskComplianceScore}/100 | ${result.summary.injuryRiskComplianceScore >= 75 ? "✅" : result.summary.injuryRiskComplianceScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 🔴 Titre H1 (RÈGLE #0) | ${result.summary.titleFormatScore}/100 | ${result.summary.titleFormatScore >= 75 ? "✅" : result.summary.titleFormatScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 📋 Unicité récap stratégique | ${result.summary.strategicRecapUniquenessScore}/100 | ${result.summary.strategicRecapUniquenessScore >= 75 ? "✅" : result.summary.strategicRecapUniquenessScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 😴 Cohérence jour de repos | ${result.summary.restDayCoherenceScore}/100 | ${result.summary.restDayCoherenceScore >= 75 ? "✅" : result.summary.restDayCoherenceScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 🔄 Anti-répétition | ${result.summary.antiRepetitionScore}/100 | ${result.summary.antiRepetitionScore >= 75 ? "✅" : result.summary.antiRepetitionScore >= 50 ? "⚠️" : "❌"} |`);
  if (result.summary.startToRunStrengthScore < 100) {
    lines.push(`| 🏋️ Renfo Fondation hebdo (Start to Run) | ${result.summary.startToRunStrengthScore}/100 | ${result.summary.startToRunStrengthScore >= 75 ? "✅" : result.summary.startToRunStrengthScore >= 50 ? "⚠️" : "❌"} |`);
  }
  if (result.summary.trailBackToBackScore < 100) {
    lines.push(`| ⛰️ Back-to-back trail | ${result.summary.trailBackToBackScore}/100 | ${result.summary.trailBackToBackScore >= 75 ? "✅" : "⚠️"} |`);
  }
  if (result.summary.trailDPlusPresenceScore < 100) {
    lines.push(`| 📈 D+ chiffré (trail) | ${result.summary.trailDPlusPresenceScore}/100 | ${result.summary.trailDPlusPresenceScore >= 75 ? "✅" : result.summary.trailDPlusPresenceScore >= 50 ? "⚠️" : "❌"} |`);
  }
  if (result.summary.dailySessionFloorScore < 100) {
    lines.push(`| 🔥 Plancher séances/jour (Elite+) | ${result.summary.dailySessionFloorScore}/100 | ${result.summary.dailySessionFloorScore >= 75 ? "✅" : result.summary.dailySessionFloorScore >= 50 ? "⚠️" : "❌"} |`);
  }
  lines.push("");
  {
    const d = result.lorangCategories;
    lines.push(`**Distribution Lorang** — A ${d.APct}% · B ${d.BPct}% · C ${d.CPct}% · D ${d.DPct}% (tags explicites : ${d.taggedPct}%)`);
  }
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
