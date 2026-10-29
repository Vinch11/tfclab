/** Review-only candidates. No production consumer imports this module. */
import {
  getEffectiveRefs as originalRefs,
  getSourceLabel as originalLabel,
  type RefSource,
} from "@/lib/effectiveRefs";
import { mapExtractToSnapshot as originalMapper } from "@/lib/labImport/snapshotMapper";
import type { LabExtract } from "@/lib/labImport/types";
import type { DbAthlete, DbSnapshot } from "@/hooks/useCloudData";

// Exact existing snapshot bounds from effectiveRefs.ts, applied to profile fallback too.
// These are software admission bounds, not new physiological conventions.
const EXISTING_BOUNDS = {
  weightKg: [30, 200], fatPct: [3, 50], fcMax: [100, 250], vma: [8, 30],
  ftp: [50, 500], css: [50, 200], vo2max: [20, 100],
} as const;

export function getEffectiveRefs(athlete: DbAthlete | null, snapshots: DbSnapshot[]) {
  if (!athlete) return originalRefs(athlete, snapshots);
  const refs = athlete.refs && typeof athlete.refs === "object" ? { ...athlete.refs } : {};
  for (const [key, [min, max]] of Object.entries(EXISTING_BOUNDS)) {
    const value = (refs as Record<string, unknown>)[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
      (refs as Record<string, unknown>)[key] = null;
    }
  }
  return originalRefs({ ...athlete, refs } as DbAthlete, snapshots);
}

export function getSourceLabel(source: RefSource) {
  return source === "snapshot" ? "Stocké (snapshot)" : originalLabel(source);
}

export function mapExtractToSnapshot(extract: LabExtract, goal: string) {
  const payload = originalMapper(extract, goal);
  // Explicit report discipline only: a triathlon report cannot identify the segment.
  const sport = extract.performance.sport;
  if (sport !== "run" && sport !== "bike") return payload;
  return {
    ...payload,
    sport_main: sport,
    vlamax_source: extract.vlamax.source,
    ...(sport === "run" ? { vlamax: null, vlamax_run: extract.vlamax.value } : {}),
  };
}
