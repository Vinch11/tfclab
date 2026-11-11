/**
 * Étape 3 « Séances précises » — quotas hebdomadaires de travail à allure de
 * course (minutes cumulées), validés par le coach le 2026-11-11.
 * Référence = ambition « competitor » ; coefficient d'ambition ; plafond en
 * part du volume hebdomadaire (min des deux). Non-respect = avertissement,
 * jamais blocage. Fourchettes d'entraîneurs (Canova, Lorang, Bakken,
 * Pfitzinger ; affûtage Bosquet 2007 / Mujika), pas des valeurs d'essais.
 */
import { normalizeRepairGoal } from "../../../supabase/functions/_shared/repairSportingEquivalence";

export type QuotaPhase = "base" | "build" | "specific" | "taper";
type Range = [number, number];

/** Minutes/semaine à allure de course, référence « competitor ». */
export const SPECIFIC_PACE_QUOTAS: Record<string, Record<QuotaPhase, Range>> = {
  "5k":       { base: [6, 8],    build: [10, 15],  specific: [15, 20],   taper: [6, 10] },
  "10k":      { base: [8, 10],   build: [15, 25],  specific: [25, 40],   taper: [10, 15] },
  semi:       { base: [10, 15],  build: [20, 35],  specific: [35, 60],   taper: [15, 20] },
  marathon:   { base: [15, 20],  build: [30, 60],  specific: [60, 120],  taper: [20, 30] },
  trail:      { base: [10, 20],  build: [20, 40],  specific: [90, 180],  taper: [15, 30] },
  half:       { base: [20, 30],  build: [40, 80],  specific: [60, 120],  taper: [20, 30] },
  ironman:    { base: [30, 60],  build: [90, 150], specific: [150, 240], taper: [45, 60] },
};

export const AMBITION_COEFFICIENT: Record<string, number> = {
  finisher: 0.5, age_group: 0.75, competitor: 1, elite: 1.2, world_class: 1.2,
};

/** Plafond : part max du volume hebdo à allure de course. */
export function volumeShareCap(phase: QuotaPhase, ambition: string): number {
  return phase === "specific" && (ambition === "elite" || ambition === "world_class") ? 0.25 : 0.2;
}

export function quotaObjectiveKey(objective: string | null | undefined): string | null {
  const g = normalizeRepairGoal(objective ?? "");
  if (!g) return null;
  if (g.startsWith("trail")) return "trail";
  return SPECIFIC_PACE_QUOTAS[g] ? g : null;
}

export function quotaPhase(raw: string | null | undefined): QuotaPhase | null {
  const p = (raw ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/taper|affut/.test(p)) return "taper";
  if (/peak|specif|competition|pic/.test(p)) return "specific";
  if (/build|construct|developp/.test(p)) return "build";
  if (/base|fondation|prep|general/.test(p)) return "base";
  return null;
}

/** Fourchette attendue (minutes) après ambition et plafond de volume. */
export interface QuotaOptions {
  /** Niveau d'entraînement : untrained/light = débutant, plafonné ×0,6 en spécifique. */
  trainingLevel?: string | null;
  /** Coefficient forcé par le coach pour cet athlète (remplace l'ambition). */
  coachCoef?: number | null;
}

export function quotaCoefficient(phase: QuotaPhase, ambition: string, opts: QuotaOptions = {}): number {
  if (opts.coachCoef && opts.coachCoef > 0) return opts.coachCoef;
  let k = AMBITION_COEFFICIENT[ambition] ?? 1;
  if (phase === "specific" && (opts.trainingLevel === "untrained" || opts.trainingLevel === "light")) k = Math.min(k, 0.6);
  return k;
}

const OVERRIDE_KEY = (athleteId: string) => `tfcl:specific-pace-coef:${athleteId}`;
export function getSpecificPaceOverride(athleteId: string | null | undefined): number | null {
  if (!athleteId || typeof localStorage === "undefined") return null;
  const v = Number(localStorage.getItem(OVERRIDE_KEY(athleteId)));
  return Number.isFinite(v) && v > 0 ? v : null;
}
export function setSpecificPaceOverride(athleteId: string, coef: number | null): void {
  if (typeof localStorage === "undefined") return;
  if (coef && coef > 0) localStorage.setItem(OVERRIDE_KEY(athleteId), String(coef));
  else localStorage.removeItem(OVERRIDE_KEY(athleteId));
}

export function expectedSpecificMinutes(objective: string, phase: QuotaPhase, ambition: string, weeklyMinutes?: number, opts: QuotaOptions = {}): Range | null {
  const key = quotaObjectiveKey(objective);
  if (!key) return null;
  const k = quotaCoefficient(phase, ambition, opts);
  let [lo, hi] = SPECIFIC_PACE_QUOTAS[key][phase].map(v => Math.round(v * k)) as Range;
  if (weeklyMinutes && weeklyMinutes > 0) {
    const cap = Math.round(weeklyMinutes * volumeShareCap(phase, ambition));
    hi = Math.min(hi, cap); lo = Math.min(lo, hi);
  }
  return [lo, hi];
}

const RACE_PACE = /allure\s*(?:de\s*)?(?:course|cible|sp[ée]cifique|10\s*k|5\s*k|semi|marathon|70[.,]?3|ironman|im\b)|race[\s-]*pace|\bas10\b|\bam\b|\bash\b|\bim pace\b/i;

/** Minutes à allure de course lisibles dans le texte d'une séance (0 si non chiffrable). */
export function racePaceMinutes(text: string): number {
  if (!RACE_PACE.test(text)) return 0;
  let total = 0;
  for (const m of text.matchAll(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:'|’|min\b)/gi)) total += Number(m[1]) * Number(m[2].replace(",", "."));
  const stripped = text.replace(/(\d+)\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:'|’|min\b)/gi, "");
  for (const m of stripped.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:'|’|min\b)\s*(?:à\s*|a\s*|en\s*)?allure/gi)) total += Number(m[1].replace(",", "."));
  return Math.round(total);
}

interface Week { weekNumber: number; phase: string; sessions: Array<{ title: string; details: string; isRest: boolean; durationMin?: number }> }

export function checkSpecificPaceQuotas(plan: { weeks: Week[] }, objective: string | null | undefined, ambition: string | null | undefined, opts: QuotaOptions = {}) {
  if (!quotaObjectiveKey(objective)) return [];
  const issues: Array<{ rule: string; severity: "warning"; message: string }> = [];
  for (const w of plan.weeks) {
    const phase = quotaPhase(w.phase);
    if (!phase) continue;
    const weekly = w.sessions.reduce((a, s) => a + (s.isRest ? 0 : s.durationMin ?? 0), 0);
    const range = expectedSpecificMinutes(objective!, phase, ambition || "competitor", weekly, opts);
    if (!range) continue;
    const done = w.sessions.reduce((a, s) => a + (s.isRest ? 0 : racePaceMinutes(`${s.title} ${s.details}`)), 0);
    if (done < range[0]) issues.push({ rule: "specific_pace_quota_low", severity: "warning",
      message: `S${w.weekNumber} (${phase}) : ${done} min à allure de course lisibles, attendu ${range[0]}–${range[1]} min.` });
    else if (done > range[1]) issues.push({ rule: "specific_pace_quota_high", severity: "warning",
      message: `S${w.weekNumber} (${phase}) : ${done} min à allure de course, au-delà de ${range[1]} min (ambition et volume).` });
  }
  return issues;
}
