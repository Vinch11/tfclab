import type { MergedPlan } from "@/lib/plan/mergePlanChunks";
import type { BeginnerSafetyIssue } from "./auditBeginnerRunSafety";

/**
 * Offline, read-only cockpit export. The complete final merged plan is
 * preserved; no Gemini request, no upload, no side effects.
 * This helper does not activate P0 checks in generation.
 */
export function buildPilotSafetyExport(
  plan: MergedPlan,
  issues: readonly BeginnerSafetyIssue[],
) {
  const sessions = plan.weeks.flatMap(week =>
    week.sessions.filter(session => !session.isRest).map((session, index) => ({
      weekNumber: week.weekNumber,
      dayIndex: session.dayIndex,
      title: session.title,
      catalogId: session.catalogId,
      durationMin: session.durationMin,
      /** Unique even when multiple sessions share the same day/catalog. */
      occurrenceIndex: index,
    })),
  );
  const linkedIssues = issues.map(issue => {
    const candidates = issue.sessionRef
      ? sessions.filter(session =>
          session.weekNumber === issue.weekNumber &&
          `w${session.weekNumber}-d${session.dayIndex}-${session.catalogId ?? "custom"}` === issue.sessionRef &&
          session.title === issue.sessionTitle &&
          session.durationMin === issue.sessionDurationMin)
      : [];
    return {
      ...issue,
      matchStatus: issue.sessionRef === null
        ? "week_level" as const
        : candidates.length === 1
          ? "matched" as const
          : candidates.length > 1
            ? "ambiguous" as const
            : "unmatched" as const,
      match: candidates.length === 1 ? candidates[0] : null,
    };
  });
  return {
    schemaVersion: 1 as const,
    source: "pilot-cockpit-offline-safety-qa" as const,
    mode: "diagnostic_only" as const,
    finalMergedPlan: plan,
    safetyIssues: linkedIssues,
    summary: {
      total: issues.length,
      critical: issues.filter(issue => issue.severity === "critical").length,
      matched: linkedIssues.filter(issue => issue.matchStatus === "matched").length,
      ambiguous: linkedIssues.filter(issue => issue.matchStatus === "ambiguous").length,
      unmatched: linkedIssues.filter(issue => issue.matchStatus === "unmatched").length,
    },
  };
}
