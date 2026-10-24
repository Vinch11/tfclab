import type {
  AthleteDTO,
  EventKind,
  PlannedEventDTO,
  SportDTO,
  ZoneDTO,
} from "./contracts.ts";
import { NolioError, object } from "./errors.ts";
const text = (x: unknown): string => {
  if (typeof x !== "string") throw new NolioError("invalid_response", 502);
  return x;
};
export function publicId(x: unknown, prefix: string): string {
  const id = text(x);
  if (
    !id.startsWith(prefix + "_") || id.length <= prefix.length + 1 ||
    id.length > 512 || /[\s\u0000-\u001f\u007f]/.test(id)
  ) throw new NolioError("invalid_response", 502);
  return id;
}
export function athlete(row: unknown): AthleteDTO {
  const r = object(row);
  if (typeof r.has_api_access !== "boolean") {
    throw new NolioError("invalid_response", 502);
  }
  return {
    id: publicId(r.id, "usr"),
    name: text(r.name),
    hasApiAccess: r.has_api_access,
  };
}
export function sport(row: unknown, profile = false): SportDTO {
  const r = object(row);
  if (profile && typeof r.is_active !== "boolean") {
    throw new NolioError("invalid_response", 502);
  }
  return {
    id: publicId(profile ? r.sport : r.id, "spt"),
    name: text(r.name),
    active: profile ? r.is_active as boolean : null,
  };
}
export function civilDate(x: unknown): string {
  if (
    typeof x !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x) ||
    !Number.isFinite(Date.parse(x + "T00:00:00Z")) ||
    new Date(x + "T00:00:00Z").toISOString().slice(0, 10) !== x
  ) {
    throw new NolioError("invalid_request", 400);
  }
  return x;
}
export function dateWindow(from: unknown, to: unknown) {
  const first = civilDate(from), last = civilDate(to);
  if (
    first > last || (Date.parse(last) - Date.parse(first)) / 86_400_000 > 89
  ) throw new NolioError("invalid_request", 400);
  return { from: first, to: last };
}
function quantity(x: unknown, expected: string): number | null {
  if (x === null || x === undefined) return null;
  const r = object(x);
  if (
    r.unit !== expected || typeof r.value !== "number" ||
    !Number.isFinite(r.value) || r.value < 0
  ) {
    throw new NolioError("invalid_response", 502);
  }
  return r.value;
}
const prefixes: Record<EventKind, string> = {
  training: "ptrn",
  competition: "pcmp",
  cycle: "pcyc",
  note: "pnot",
  message: "pmsg",
  quiz: "pqz",
};
export function planned(row: unknown, kind: EventKind): PlannedEventDTO {
  const r = object(row);
  // Only event trainings/competitions have stable prefix constraints used here; other opaque IDs are retained.
  const id = text(r.id);
  if (
    !id ||
    ((kind === "training" || kind === "competition") &&
      !id.startsWith(prefixes[kind] + "_"))
  ) throw new NolioError("invalid_response", 502);
  return {
    id,
    kind,
    name: typeof r.name === "string"
      ? r.name
      : typeof r.title === "string"
      ? r.title
      : kind === "message" && typeof r.description === "string"
      ? r.description.slice(0, 120)
      : kind,
    date: civilDate(r.date_start),
    endDate: r.date_end == null ? null : civilDate(r.date_end),
    time: typeof r.time === "string"
      ? r.time
      : typeof r.hour_start === "string"
      ? r.hour_start
      : null,
    sport: r.sport == null ? null : publicId(r.sport, "spt"),
    durationSeconds: quantity(r.duration, "s"),
    distanceKm: quantity(r.distance, "km"),
    hasStructuredWorkout: r.has_structured_workout === true,
    restricted: r.restriction != null,
  };
}
export function zones(body: unknown): ZoneDTO[] {
  // The official final-zones response is an open object, not a typed list of bounds.
  // Preserve stream contents for consultation rather than inventing physiological zone semantics.
  return Object.entries(object(body)).map(([stream, value]) => ({
    stream,
    content: value,
  }));
}
