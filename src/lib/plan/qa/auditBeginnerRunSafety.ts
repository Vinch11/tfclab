import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";

export type BeginnerSafetyCode =
  | "week_one_volume_exceeded"
  | "weekly_volume_ramp_exceeded"
  | "weekly_session_quota_exceeded"
  | "advanced_intensity_high_injury_risk"
  | "unjustified_initial_deload";

export interface BeginnerSafetyIssue {
  code: BeginnerSafetyCode;
  weekNumber: number;
  severity: "warning" | "critical";
  actual: number | null;
  limit: number | null;
  message: string;
  /** Stable within a final merged plan; null for week-level alerts. */
  sessionRef: string | null;
  sessionTitle: string | null;
  catalogId: string | null;
  sessionDurationMin: number | null;
}

/**
 * Read-only, deterministic post-merge QA for a beginner runner.
 * Deliberately NOT a production generation gate.
 *
 * Scope is explicit: running minutes and running sessions only.
 * Strength is excluded from both the volume ramp and session quota here;
 * the caller must configure sessionsPerWeek as RUN sessions for this audit.
 * This conservative convention must be reviewed before production wiring.
 */
export function auditBeginnerRunSafety(
  plan: MergedPlan,
  config: {
    trainingLevel: string | null | undefined;
    highRunInjuryRisk: boolean;
    week1RunHoursMax?: number | null;
    weeklyRunIncreasePctMax?: number | null;
    runSessionsPerWeek?: number | null;
    hasPriorLoadForDeload?: boolean;
  },
): BeginnerSafetyIssue[] {
  if (config.trainingLevel !== "untrained") return [];
  const issues: BeginnerSafetyIssue[] = [];
  let previousRunMinutes: number | null = null;
  for (const week of [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber)) {
    const runs = week.sessions.filter((s) => !s.isRest && /^run(?:ning)?$/i.test(s.sport));
    const minutes = runs.reduce((sum, s) => sum + Math.max(0, s.durationMin), 0);
    const add = (
      code: BeginnerSafetyCode, severity: "warning" | "critical",
      actual: number | null, limit: number | null, message: string,
      session?: MergedSession,
    ) => issues.push({
      code, weekNumber: week.weekNumber, severity, actual, limit, message,
      sessionRef: session ? `w${week.weekNumber}-d${session.dayIndex}-${session.catalogId ?? "custom"}` : null,
      sessionTitle: session?.title ?? null,
      catalogId: session?.catalogId ?? null,
      sessionDurationMin: session?.durationMin ?? null,
    });
    if (week.weekNumber === 1 && config.week1RunHoursMax != null &&
      minutes > config.week1RunHoursMax * 60 + 0.01) {
      add("week_one_volume_exceeded", "critical", minutes, config.week1RunHoursMax * 60,
        "Volume CAP initial supérieur au plafond CAP configuré.");
    }
    if (previousRunMinutes !== null && previousRunMinutes > 0 &&
      config.weeklyRunIncreasePctMax != null &&
      minutes > previousRunMinutes * (1 + config.weeklyRunIncreasePctMax) + 0.01) {
      add("weekly_volume_ramp_exceeded", "warning", minutes,
        previousRunMinutes * (1 + config.weeklyRunIncreasePctMax),
        "Hausse hebdomadaire CAP supérieure au plafond ; examiner le contexte de décharge.");
    }
    if (config.runSessionsPerWeek != null && runs.length > config.runSessionsPerWeek) {
      add("weekly_session_quota_exceeded", "warning", runs.length,
        config.runSessionsPerWeek, "Nombre de séances CAP supérieur au quota CAP.");
    }
    for (const s of runs) {
      const evidence = `${s.title} ${s.details}`;
      if (config.highRunInjuryRisk && /over[ -]?under|seuil.{0,35}norv[eé]gien|double seuil/i.test(evidence)) {
        add("advanced_intensity_high_injury_risk", "critical", null, null,
          `Séance CAP avancée à revoir : ${s.title}.`, s);
      }
      if (week.weekNumber === 1 && !config.hasPriorLoadForDeload &&
        /d[eé]charge|deload/i.test(evidence)) {
        add("unjustified_initial_deload", "warning", null, null,
          `Séance de décharge initiale sans historique : ${s.title}.`, s);
      }
    }
    previousRunMinutes = minutes;
  }
  return issues;
}
