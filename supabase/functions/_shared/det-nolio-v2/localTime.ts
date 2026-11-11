/**
 * Heure locale murale → instant réel, résolue À L'HEURE DE LA SÉANCE (jamais
 * à midi). Copie pure de la logique V401 (`resolveLocalInstant`) pour le code
 * partagé Edge : aucune dépendance hors `supabase/functions/`.
 * Heure inexistante/ambiguë ⇒ signalée ; aucun décalage silencieux.
 */
export function isRealYmd(ymd: unknown): ymd is string {
  if (typeof ymd !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function utcOffsetMinutesAt(timeZone: string, at: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(at);
    const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
    return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
  } catch { return null; }
}

export type LocalResolution =
  | { status: "ok"; utcOffsetMinutes: number }
  | { status: "nonexistent" }
  | { status: "ambiguous"; utcOffsetsMinutes: [number, number] }
  | { status: "invalid" };

export function resolveLocalInstant(timeZone: string, ymd: string, minuteOfDay: number): LocalResolution {
  if (!isRealYmd(ymd) || !Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay >= 1440) return { status: "invalid" };
  const [y, m, d] = ymd.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, 0, minuteOfDay);
  const around = [utcOffsetMinutesAt(timeZone, new Date(wall - 86400000)), utcOffsetMinutesAt(timeZone, new Date(wall + 86400000))];
  if (around.some((o) => o === null)) return { status: "invalid" };
  const valid = [...new Set(around as number[])]
    .filter((o) => utcOffsetMinutesAt(timeZone, new Date(wall - o * 60000)) === o)
    .sort((a, b) => b - a);
  if (valid.length === 0) return { status: "nonexistent" };
  if (valid.length > 1) return { status: "ambiguous", utcOffsetsMinutes: [valid[0], valid[1]] };
  return { status: "ok", utcOffsetMinutes: valid[0] };
}

/** Début de séance confirmé par le coach, conservé tel quel avec son fuseau. */
export type CoachSessionStart = {
  provenance: "coach_confirmed";
  localDate: string;
  minuteOfDay: number;
  timeZone: string;
  utcOffsetMinutes: number;
};

/**
 * Vérifie qu'un début déclaré est cohérent : date calendaire réelle, minute
 * valide, offset égal à celui de l'instant réel (ou à l'une des deux
 * occurrences d'une heure ambiguë, ce qui matérialise le choix explicite).
 */
export function startProblems(s: CoachSessionStart, sessionDate: string): string[] {
  if (s.provenance !== "coach_confirmed") return ["start_provenance_not_coach_confirmed"];
  if (!isRealYmd(s.localDate)) return ["start_date_invalid"];
  if (s.localDate !== sessionDate) return ["start_date_differs_from_session_date"];
  const r = resolveLocalInstant(s.timeZone, s.localDate, s.minuteOfDay);
  if (r.status === "invalid") return ["start_time_or_timezone_invalid"];
  if (r.status === "nonexistent") return ["start_time_nonexistent_dst"];
  if (r.status === "ambiguous") return r.utcOffsetsMinutes.includes(s.utcOffsetMinutes) ? [] : ["start_time_ambiguous_without_choice"];
  return r.utcOffsetMinutes === s.utcOffsetMinutes ? [] : ["start_offset_mismatch"];
}

export const hhmm = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
