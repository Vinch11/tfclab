/**
 * plan_json sauvegardé (V3/V4 DET) → séances d'entrée du mapper V2, à
 * l'identique : clé `S{semaine}-J{jour}-{index}` (même clé que le contrôle
 * PDF), date = début de plan + décalage, structure V400 et créneau coach tels
 * que sauvegardés. Aucune valeur complétée ; absence ⇒ refus explicite.
 */
import { isRealYmd } from "./localTime.ts";
import type { PlanSessionInput } from "./plannedMapper.ts";

export type PlanExtraction = { sessions: PlanSessionInput[]; problems: string[] };

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function sessionsFromPlanJson(plan: unknown): PlanExtraction {
  const problems: string[] = [];
  const p = (plan ?? {}) as Record<string, unknown>;
  const start = p._planStartDate;
  if (!isRealYmd(start)) return { sessions: [], problems: ["plan_start_date_absent_or_invalid"] };
  const weeks = p.weeks;
  if (!Array.isArray(weeks) || !weeks.length) return { sessions: [], problems: ["plan_without_weeks"] };
  const sessions: PlanSessionInput[] = [];
  for (const w of weeks as Array<Record<string, unknown>>) {
    const list = Array.isArray(w.sessions) ? (w.sessions as Array<Record<string, unknown>>) : [];
    list.forEach((s, i) => {
      const wn = Number(s.weekNumber ?? w.weekNumber), di = Number(s.dayIndex);
      const key = `S${wn}-J${di}-${i}`;
      if (!Number.isInteger(wn) || wn < 1 || !Number.isInteger(di) || di < 0 || di > 6) { problems.push(`${key}:week_or_day_invalid`); return; }
      const out: PlanSessionInput = {
        sessionKey: key, date: addDays(start as string, (wn - 1) * 7 + di), title: String(s.title ?? ""),
        sport: String(s.sport ?? ""), isRest: s.isRest === true,
        catalogId: typeof s.catalogId === "string" ? s.catalogId : null,
      };
      if (typeof s.details === "string" && s.details) out.details = s.details;
      if (typeof s.durationMin === "number") out.durationMin = s.durationMin;
      if (s.detStructuredComponents) out.detStructuredComponents = s.detStructuredComponents as PlanSessionInput["detStructuredComponents"];
      if (s.detStructuredWorkout) out.detStructuredWorkout = s.detStructuredWorkout as PlanSessionInput["detStructuredWorkout"];
      if (s.detStructureRefusal) out.detStructureRefusal = s.detStructureRefusal as { reason: string };
      if (s.coachStart) out.coachStart = s.coachStart as PlanSessionInput["coachStart"];
      sessions.push(out);
    });
  }
  return { sessions, problems };
}
