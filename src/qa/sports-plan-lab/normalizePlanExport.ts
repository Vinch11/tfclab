import type { CanonicalSport, NormalizedPlan, NormalizedSession, NormalizedWeek } from "./types";

const DAY_INDEX: Record<string, number> = {
  lundi: 0, monday: 0, mardi: 1, tuesday: 1, mercredi: 2, wednesday: 2,
  jeudi: 3, thursday: 3, vendredi: 4, friday: 4, samedi: 5, saturday: 5,
  dimanche: 6, sunday: 6,
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function canonicalSport(value: unknown, isRest: boolean): CanonicalSport {
  if (isRest) return "rest";
  const sport = String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/nat|swim/.test(sport)) return "swim";
  if (/velo|bike|cycl/.test(sport)) return "bike";
  if (/course|run|cap/.test(sport)) return "run";
  if (/brick|encha[iî]nement|transition/.test(sport)) return "brick";
  if (/renfo|strength|muscu|force/.test(sport)) return "strength";
  if (/recup|recovery|mobil/.test(sport)) return "recovery";
  if (/repos|rest/.test(sport)) return "rest";
  return "unknown";
}

function extractPlan(value: unknown): { plan: Record<string, unknown>; sourceShape: NormalizedPlan["sourceShape"] } {
  const root = record(value);
  if (!root) throw new Error("Le fichier doit contenir un objet JSON.");
  const output = record(root.output);
  const candidates: Array<[unknown, NormalizedPlan["sourceShape"]]> = [
    [root.finalMergedPlan, "finalMergedPlan"],
    [root.mergedPlan, "mergedPlan"],
    [output?.finalMergedPlan, "output.finalMergedPlan"],
    [output?.mergedPlan, "output.mergedPlan"],
    [root, "direct"],
  ];
  for (const [candidate, sourceShape] of candidates) {
    const plan = record(candidate);
    if (plan && Array.isArray(plan.weeks)) return { plan, sourceShape };
  }
  throw new Error("Aucun plan structuré trouvé (weeks, mergedPlan ou finalMergedPlan).");
}

function normalizeSession(raw: unknown, weekNumber: number, phase: string, index: number): NormalizedSession {
  const session = record(raw) ?? {};
  const dayName = String(session.dayName ?? session.day ?? `Séance ${index + 1}`);
  const explicitDayIndex = typeof session.dayIndex === "number" ? session.dayIndex : null;
  const parsedDayIndex = DAY_INDEX[dayName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()] ?? null;
  const title = String(session.title ?? "");
  const details = String(session.details ?? "");
  const explicitRest = session.isRest === true || /^repos$/i.test(title.trim());
  const duration = typeof session.durationMin === "number" && Number.isFinite(session.durationMin)
    ? session.durationMin
    : null;
  const finalIntent = record(session.physiology)?.primary ?? session.finalPhysiologicalIntent;
  return {
    weekNumber,
    phase,
    dayName,
    dayIndex: explicitDayIndex ?? parsedDayIndex,
    sport: canonicalSport(session.sport, explicitRest),
    title,
    details,
    durationMin: duration,
    zones: Array.isArray(session.zones) ? session.zones.map(String) : [],
    isRest: explicitRest || canonicalSport(session.sport, explicitRest) === "rest",
    isKeySession: typeof session.isKeySession === "boolean" ? session.isKeySession : null,
    catalogId: typeof session.catalogId === "string" && session.catalogId.trim() ? session.catalogId.trim() : null,
    finalPhysiologicalIntent: typeof finalIntent === "string" ? finalIntent as NormalizedSession["finalPhysiologicalIntent"] : null,
  };
}

export function normalizePlanExport(value: unknown): NormalizedPlan {
  const { plan, sourceShape } = extractPlan(value);
  const weeks: NormalizedWeek[] = (plan.weeks as unknown[]).map((rawWeek, index) => {
    const week = record(rawWeek) ?? {};
    const weekNumber = typeof week.weekNumber === "number" ? week.weekNumber : index + 1;
    const phase = String(week.phase ?? "unknown");
    const sessions = Array.isArray(week.sessions)
      ? week.sessions.map((session, sessionIndex) => normalizeSession(session, weekNumber, phase, sessionIndex))
      : [];
    return {
      weekNumber,
      phase,
      theme: String(week.theme ?? week.weekTheme ?? ""),
      notes: String(week.weeklyNotes ?? week.coachNotes ?? ""),
      sessions,
    };
  }).sort((a, b) => a.weekNumber - b.weekNumber);
  return {
    title: String(plan.title ?? "Plan TFCL"),
    totalWeeks: typeof plan.totalWeeks === "number" ? plan.totalWeeks : weeks.length,
    weeks,
    sourceShape,
  };
}

