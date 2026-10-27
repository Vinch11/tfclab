import type { CoachProfileFormPayload } from "@/components/CoachProfileForm";
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";
export interface CoachLimiterPolicy extends
  Pick<
    Partial<CoachProfileFormPayload>,
    "prohibitions" | "metabolicProfile" | "s2rStrength" | "sessionsPerWeek"
  > {
  limiterOrder: string[];
  excludedLimiterMetrics: string[];
}
export const coachProfileStorageKey = (name?: string) =>
  `tfcl:coachProfileForm:${name ?? "default"}`;
function valid(value: unknown): value is CoachLimiterPolicy {
  if (!value || typeof value !== "object") return false;
  const x = value as CoachLimiterPolicy;
  return Array.isArray(x.limiterOrder) && x.limiterOrder.length > 0 &&
    x.limiterOrder.every((m) => typeof m === "string") &&
    Array.isArray(x.excludedLimiterMetrics) &&
    x.excludedLimiterMetrics.every((m) => typeof m === "string");
}
function copyPolicy(value: CoachLimiterPolicy): CoachLimiterPolicy {
  return {
    limiterOrder: [...value.limiterOrder],
    excludedLimiterMetrics: [...value.excludedLimiterMetrics],
    ...(Array.isArray(value.prohibitions)
      ? {
        prohibitions: value.prohibitions.filter((p) =>
          [
            "sprints",
            "micro_intervals",
            "vo2_heavy_blocks",
            "erratic_pacing",
            "train_low",
          ].includes(p)
        ),
      }
      : {}),
    ...(["sprinter", "balanced", "diesel"].includes(
        value.metabolicProfile ?? "",
      )
      ? { metabolicProfile: value.metabolicProfile }
      : {}),
    ...(["full", "light", "none"].includes(value.s2rStrength ?? "")
      ? { s2rStrength: value.s2rStrength }
      : {}),
    ...(value.sessionsPerWeek === null ||
        typeof value.sessionsPerWeek === "number" &&
          Number.isFinite(value.sessionsPerWeek) && value.sessionsPerWeek > 0
      ? { sessionsPerWeek: value.sessionsPerWeek }
      : {}),
  };
}
/** Caller uses the stable athlete ID for committed policy, the legacy name only for the draft.
 * Drafts never become prescription policy merely because the dialog was opened. */
export function readCommittedLimiterPolicy(
  storage: Pick<Storage, "getItem">,
  name: string | undefined,
  objective: string,
): CoachLimiterPolicy | null {
  try {
    const data = JSON.parse(
      storage.getItem(coachProfileStorageKey(name)) ?? "{}",
    );
    const value = data.committedLimiterSelections
      ?.[normalizeObjectiveKey(objective)];
    return valid(value) ? copyPolicy(value) : null;
  } catch {
    return null;
  }
}
export function writeCommittedLimiterPolicy(
  storage: Pick<Storage, "getItem" | "setItem">,
  name: string | undefined,
  objective: string,
  policy: CoachLimiterPolicy,
): boolean {
  if (!valid(policy)) return false;
  try {
    const key = coachProfileStorageKey(name),
      data = JSON.parse(storage.getItem(key) ?? "{}");
    storage.setItem(
      key,
      JSON.stringify({
        ...data,
        committedLimiterSelections: {
          ...data.committedLimiterSelections,
          [normalizeObjectiveKey(objective)]: copyPolicy(policy),
        },
      }),
    );
    return true;
  } catch {
    return false;
  }
}
