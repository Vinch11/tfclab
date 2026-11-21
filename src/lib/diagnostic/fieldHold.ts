import { CRITICAL_POLICY } from "@/lib/criticalEfforts";
import { validTestDate } from "@/lib/testMeasurementReview";

export const HOLD_PROTOCOL = "tfcl-continuous-hold-v1";
export type HoldSport = "bike" | "run";
export type FieldHold = {
  protocol: typeof HOLD_PROTOCOL;
  sport: HoldSport;
  day: string;
  intensity: number; // W or seconds/km
  minutes: number;
  reference: number;
  referenceDate: string;
  exhausted: boolean;
  conditions: string;
  comparable: boolean;
};
type TestRow = {
  athlete_id: string;
  type: string;
  sport: string | null;
  date: string;
  raw: unknown;
};
export type HoldBounds = {
  low: number;
  high: number | null;
  reference: number;
  sport: HoldSport;
  note: string;
  conflict: boolean;
};

export function fieldIntensity(sport: HoldSport, value: number): string {
  const sec = Math.round(value);
  return sport === "bike"
    ? value + " W"
    : Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0") + "/km";
}

export function validHold(raw: unknown, asOf: string): raw is FieldHold {
  if (!raw || typeof raw !== "object") return false;
  const h = raw as FieldHold;
  return (
    h.protocol === HOLD_PROTOCOL &&
    (h.sport === "run" || h.sport === "bike") &&
    validTestDate(h.day) &&
    validTestDate(h.referenceDate) &&
    h.referenceDate < h.day &&
    Number.isFinite(h.reference) &&
    h.reference > 0 &&
    h.day <= asOf &&
    Number.isFinite(h.intensity) &&
    h.intensity > 0 &&
    Number.isFinite(h.minutes) &&
    h.minutes > 0 &&
    h.minutes <= 120 &&
    typeof h.exhausted === "boolean" &&
    h.comparable === true &&
    typeof h.conditions === "string" &&
    !!h.conditions.trim()
  );
}

/** Monotonic performance assumption, under comparable conditions. Never extrapolate a point TTE. */
export function fieldHoldBounds(
  tests: readonly TestRow[],
  athleteId: string,
  sport: HoldSport,
  reference: number | null | undefined,
  asOf: string,
): HoldBounds | undefined {
  if (
    !reference ||
    !Number.isFinite(reference) ||
    reference <= 0 ||
    !validTestDate(asOf)
  )
    return;
  const recent = tests
    .flatMap((row) => {
      if (
        row.athlete_id !== athleteId ||
        row.sport !== sport ||
        row.type !== HOLD_PROTOCOL ||
        !validTestDate(row.date.slice(0, 10)) ||
        row.date.slice(0, 10) > asOf ||
        !validHold(row.raw, asOf) ||
        row.raw.sport !== sport ||
        row.raw.reference !== reference
      )
        return [];
      const elapsed = (Date.parse(asOf) - Date.parse(row.raw.day)) / 86400000;
      return elapsed <= CRITICAL_POLICY.maxAgeDays ? [row.raw] : [];
    })
    .sort((a, b) => b.day.localeCompare(a.day));
  const anchor = recent[0];
  if (!anchor) return;
  const same = recent.filter(
    (h) =>
      h.conditions.trim().toLowerCase() ===
        anchor.conditions.trim().toLowerCase() &&
      (Date.parse(anchor.day) - Date.parse(h.day)) / 86400000 <=
        CRITICAL_POLICY.maxDateSpanDays,
  );
  const harder = (h: FieldHold) =>
    sport === "bike" ? h.intensity - reference : reference - h.intensity;
  const lower = same
    .filter((h) => harder(h) >= 0)
    .sort((a, b) => b.minutes - a.minutes)[0];
  const upper = same
    .filter((h) => h.exhausted && harder(h) <= 0)
    .sort((a, b) => a.minutes - b.minutes)[0];
  if (!lower && !upper) return;
  const low = lower?.minutes ?? 0,
    high = upper?.minutes ?? null;

  const note = [...new Set([lower, upper])]
    .filter((h): h is FieldHold => !!h)
    .map(
      (h) =>
        `${h.day} · ${h.minutes} min à ${fieldIntensity(sport, h.intensity)} · ${h.exhausted ? "épuisement" : "arrêt volontaire"}`,
    )
    .join(" / ");
  return {
    low,
    high,
    reference,
    sport,
    note,
    conflict: high != null && low > high,
  };
}
