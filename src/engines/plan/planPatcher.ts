/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PLAN PATCHER — Option 1 : Transformations déterministes (zéro IA)
 *
 * Fonctions pures qui modifient un ParsedPlan sans appel IA :
 *  - applyDeload          : réduit la charge d'une semaine (fatigue)
 *  - redistributeMissedSession : reporte une séance manquée sur les jours suivants
 *  - swapModality         : remplace un sport par un autre (blessure mineure)
 *  - shiftRaceDate        : décale le taper si la date de course change
 *  - truncateAfterWeek    : coupe le plan à partir d'une semaine (prélude window-regen)
 *
 * Invariants garantis :
 *  - Jours OFF préservés sauf demande explicite
 *  - Aucune nouvelle séance générée (uniquement transformations)
 *  - Retourne diff explicite pour audit + UI
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ParsedPlan, ParsedSession, ParsedWeek } from "@/lib/aiPlanParser";

export interface PatchDiff {
  weekNumber: number;
  type: "deload" | "session_moved" | "session_swapped" | "taper_shift" | "truncate";
  before: string;
  after: string;
}

export interface PatchResult {
  plan: ParsedPlan;
  diff: PatchDiff[];
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (purs, sans état)
// ─────────────────────────────────────────────────────────────────────────────

function clonePlan(plan: ParsedPlan): ParsedPlan {
  return JSON.parse(JSON.stringify(plan)) as ParsedPlan;
}

function isOff(session: ParsedSession): boolean {
  return session.isRest || /off|repos|jour off/i.test(session.sport + " " + session.title);
}

function annotate(session: ParsedSession, tag: string): ParsedSession {
  if (session.details?.includes(tag)) return session;
  return {
    ...session,
    details: `${session.details ?? ""}\n${tag}`.trim(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. applyDeload — réduction de charge sur une semaine
// ─────────────────────────────────────────────────────────────────────────────

export interface DeloadOptions {
  /** Semaine cible (1-indexée) */
  weekNumber: number;
  /** Intensité de la réduction : 0.20 (légère) à 0.40 (lourde) */
  reductionPct?: number;
  /** Raison à journaliser dans les notes de semaine */
  reason?: string;
}

export function applyDeload(plan: ParsedPlan, opts: DeloadOptions): PatchResult {
  const reductionPct = Math.max(0.1, Math.min(0.5, opts.reductionPct ?? 0.25));
  const next = clonePlan(plan);
  const diff: PatchDiff[] = [];
  const warnings: string[] = [];

  const week = next.weeks.find((w) => w.weekNumber === opts.weekNumber);
  if (!week) {
    warnings.push(`Semaine ${opts.weekNumber} introuvable`);
    return { plan: next, diff, warnings };
  }

  const intenseSessions = week.sessions.filter(
    (s) => !isOff(s) && /seuil|VO2|sprint|tempo|intervals?|fartlek|HIT|HIIT/i.test(s.title + " " + s.details)
  );

  // Stratégie : convertir N% des séances intenses en endurance fondamentale (Z2)
  const toConvert = Math.max(1, Math.round(intenseSessions.length * reductionPct * 2));
  let converted = 0;
  for (const sess of intenseSessions) {
    if (converted >= toConvert) break;
    const idx = week.sessions.indexOf(sess);
    const before = `${sess.sport} — ${sess.title}`;
    week.sessions[idx] = {
      ...sess,
      title: `Endurance fondamentale Z2 (deload ${Math.round(reductionPct * 100)}%)`,
      details: `${sess.details ?? ""}\n[DELOAD] Séance allégée — ${opts.reason ?? "récupération"}`.trim(),
    };
    diff.push({
      weekNumber: week.weekNumber,
      type: "deload",
      before,
      after: week.sessions[idx].title,
    });
    converted++;
  }

  const note = `[DELOAD ${Math.round(reductionPct * 100)}%] ${opts.reason ?? "Fatigue détectée"} — ${converted} séance(s) allégée(s)`;
  week.coachNotes = week.coachNotes ? `${week.coachNotes}\n${note}` : note;

  if (converted === 0) {
    warnings.push("Aucune séance intense trouvée à alléger");
  }
  return { plan: next, diff, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. redistributeMissedSession — reporter une séance manquée
// ─────────────────────────────────────────────────────────────────────────────

export interface MissedSessionOptions {
  weekNumber: number;
  /** Index du jour manqué (0=lundi … 6=dimanche) */
  dayIndex: number;
  /** Stratégie : "skip" (perdue), "move_next" (reporte au prochain jour libre/léger) */
  strategy?: "skip" | "move_next";
  reason?: string;
}

export function redistributeMissedSession(
  plan: ParsedPlan,
  opts: MissedSessionOptions
): PatchResult {
  const next = clonePlan(plan);
  const diff: PatchDiff[] = [];
  const warnings: string[] = [];
  const strategy = opts.strategy ?? "move_next";

  const week = next.weeks.find((w) => w.weekNumber === opts.weekNumber);
  if (!week) {
    warnings.push(`Semaine ${opts.weekNumber} introuvable`);
    return { plan: next, diff, warnings };
  }

  const missed = week.sessions.find((s) => s.dayIndex === opts.dayIndex && !isOff(s));
  if (!missed) {
    warnings.push(`Aucune séance trouvée le jour ${opts.dayIndex}`);
    return { plan: next, diff, warnings };
  }

  if (strategy === "skip") {
    const idx = week.sessions.indexOf(missed);
    week.sessions[idx] = {
      ...missed,
      isRest: true,
      sport: "Repos",
      title: "Séance manquée — récupération",
      details: `[SKIPPED] ${missed.title} — ${opts.reason ?? "manquée"}`,
    };
    diff.push({
      weekNumber: week.weekNumber,
      type: "session_moved",
      before: `${missed.sport} — ${missed.title}`,
      after: "Repos (manquée, non reportée)",
    });
    return { plan: next, diff, warnings };
  }

  // move_next : chercher le prochain jour OFF ou allégé (Z2 courte)
  const candidates = week.sessions
    .filter((s) => s.dayIndex > opts.dayIndex)
    .sort((a, b) => a.dayIndex - b.dayIndex);

  const targetDay = candidates.find((s) => isOff(s));
  if (!targetDay) {
    warnings.push("Aucun jour OFF disponible dans la semaine — séance perdue");
    return redistributeMissedSession(plan, { ...opts, strategy: "skip" });
  }

  const missedIdx = week.sessions.indexOf(missed);
  const targetIdx = week.sessions.indexOf(targetDay);

  // Annoter la séance reportée + libérer le jour original
  week.sessions[targetIdx] = {
    ...missed,
    dayName: targetDay.dayName,
    dayIndex: targetDay.dayIndex,
    title: `${missed.title} (reportée)`,
    details: `[MOVED] Reportée depuis ${missed.dayName} — ${opts.reason ?? ""}`.trim(),
  };
  week.sessions[missedIdx] = {
    ...missed,
    isRest: true,
    sport: "Repos",
    title: "Repos (séance reportée)",
    details: `[SKIPPED] Reportée au ${targetDay.dayName}`,
  };

  diff.push({
    weekNumber: week.weekNumber,
    type: "session_moved",
    before: `${missed.title} @ ${missed.dayName}`,
    after: `${missed.title} @ ${targetDay.dayName}`,
  });
  return { plan: next, diff, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. swapModality — changer le sport d'une séance (blessure)
// ─────────────────────────────────────────────────────────────────────────────

export interface SwapModalityOptions {
  weekNumber: number;
  dayIndex: number;
  newSport: "Vélo" | "Course" | "Natation" | "Home-trainer" | "Cross-training";
  reason?: string;
}

export function swapModality(plan: ParsedPlan, opts: SwapModalityOptions): PatchResult {
  const next = clonePlan(plan);
  const diff: PatchDiff[] = [];
  const warnings: string[] = [];

  const week = next.weeks.find((w) => w.weekNumber === opts.weekNumber);
  if (!week) {
    warnings.push(`Semaine ${opts.weekNumber} introuvable`);
    return { plan: next, diff, warnings };
  }
  const sess = week.sessions.find((s) => s.dayIndex === opts.dayIndex && !isOff(s));
  if (!sess) {
    warnings.push(`Aucune séance le jour ${opts.dayIndex}`);
    return { plan: next, diff, warnings };
  }
  const idx = week.sessions.indexOf(sess);
  const before = `${sess.sport} — ${sess.title}`;
  week.sessions[idx] = annotate(
    {
      ...sess,
      sport: opts.newSport,
      title: `${sess.title} — modalité ${opts.newSport}`,
    },
    `[SWAP] ${sess.sport} → ${opts.newSport} — ${opts.reason ?? "adaptation"}`
  );
  diff.push({
    weekNumber: week.weekNumber,
    type: "session_swapped",
    before,
    after: `${opts.newSport} — ${sess.title}`,
  });
  return { plan: next, diff, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. shiftRaceDate — recaler le taper en cas de décalage de course
// ─────────────────────────────────────────────────────────────────────────────

export interface ShiftRaceDateOptions {
  /** Nombre de semaines de décalage (positif = course retardée, négatif = avancée) */
  weeksShift: number;
  reason?: string;
}

export function shiftRaceDate(plan: ParsedPlan, opts: ShiftRaceDateOptions): PatchResult {
  const next = clonePlan(plan);
  const diff: PatchDiff[] = [];
  const warnings: string[] = [];

  if (opts.weeksShift === 0) {
    warnings.push("Aucun décalage demandé");
    return { plan: next, diff, warnings };
  }

  const totalWeeks = next.totalWeeks;
  const taperStart = Math.max(1, totalWeeks - 2); // 3 dernières semaines = taper
  const annotation = `[TAPER SHIFT ${opts.weeksShift > 0 ? "+" : ""}${opts.weeksShift}w] ${opts.reason ?? "Décalage course"}`;

  for (const w of next.weeks) {
    if (w.weekNumber >= taperStart) {
      const before = w.theme;
      w.theme = `${w.theme} — recalé ${opts.weeksShift > 0 ? "+" : ""}${opts.weeksShift}w`;
      w.coachNotes = w.coachNotes ? `${w.coachNotes}\n${annotation}` : annotation;
      diff.push({
        weekNumber: w.weekNumber,
        type: "taper_shift",
        before,
        after: w.theme,
      });
    }
  }

  if (diff.length === 0) {
    warnings.push("Aucune semaine de taper identifiée");
  }
  return { plan: next, diff, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. truncateAfterWeek — préparation d'une window-regen
// ─────────────────────────────────────────────────────────────────────────────

export function truncateAfterWeek(plan: ParsedPlan, week: number): PatchResult {
  const next = clonePlan(plan);
  const diff: PatchDiff[] = [];
  const warnings: string[] = [];
  const before = next.weeks.length;
  next.weeks = next.weeks.filter((w) => w.weekNumber <= week);
  diff.push({
    weekNumber: week,
    type: "truncate",
    before: `${before} semaines`,
    after: `${next.weeks.length} semaines (coupé après S${week})`,
  });
  return { plan: next, diff, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaire : résumé condensé des semaines passées (pour window-regen prompt)
// ─────────────────────────────────────────────────────────────────────────────

export function summarizePastWeeks(weeks: ParsedWeek[]): string {
  if (weeks.length === 0) return "Aucune semaine passée.";
  const lines: string[] = [];
  for (const w of weeks.slice(-4)) {
    // 4 dernières semaines suffisent comme contexte
    const realSessions = w.sessions.filter((s) => !isOff(s));
    const sports = Array.from(new Set(realSessions.map((s) => s.sport))).join("/");
    const intense = realSessions.filter((s) =>
      /seuil|VO2|sprint|tempo|intervals?|fartlek|HIT/i.test(s.title)
    ).length;
    lines.push(
      `S${w.weekNumber} (${w.phase || w.theme}): ${realSessions.length} séances · ${sports} · ${intense} qualité`
    );
  }
  return lines.join(" | ");
}
