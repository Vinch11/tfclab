import type { DbSnapshot } from "@/hooks/useCloudData";

/** Old Day forms wrote a formula into the observed TTE field. Only mask identifiable
 * untouched legacy values on read. The stored row and later coach edits are preserved. */
export function fieldDayObservations<T extends DbSnapshot>(row: T): T {
  if (
    row.tte_mode === "OBSERVED" ||
    !row.created_at ||
    row.created_at !== row.updated_at
  )
    return row;
  if (
    row.source === "bike_track_day" &&
    row.tte_observed_min &&
    row.coach_notes?.includes(` · TTE ${Math.round(row.tte_observed_min)}min`)
  )
    return { ...row, tte_observed_min: null };
  if (
    row.source === "track_day" &&
    row.tte_observed_min_run &&
    row.vma &&
    row.pace_threshold_sec_per_km &&
    row.coach_notes?.startsWith("TFCL Track Day™")
  ) {
    // The old form rounded the recorded pace to the nearest second.
    const estimated = (pace: number) =>
      Math.max(25, Math.min(75, 30 + (3600 / pace / row.vma! - 0.85) * 400));
    if (
      row.tte_observed_min_run >=
        Math.round(estimated(row.pace_threshold_sec_per_km + 0.5)) &&
      row.tte_observed_min_run <=
        Math.round(estimated(row.pace_threshold_sec_per_km - 0.5))
    )
      return { ...row, tte_observed_min_run: null };
  }
  return row;
}
