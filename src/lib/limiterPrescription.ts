import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";
import { isRunningOnlyPrescriptionGoal } from "../../supabase/functions/_shared/prescriptionDiscipline";
/** Existing goal keys only. A cycling CP/W' estimate is not a running-power measurement. */
export function isRunningOnlyPrescription(objective: string): boolean {
  return isRunningOnlyPrescriptionGoal(normalizeObjectiveKey(objective));
}
export function canGuidePrescription(
  gap: { metric: string; prescriptionApplicable?: boolean },
  objective?: string,
): boolean {
  if (gap.prescriptionApplicable === false) return false;
  return !(objective && isRunningOnlyPrescription(objective) &&
    ["W'", "W' (kJ)"].includes(gap.metric));
}
export function rankPrescriptionGaps<
  T extends {
    metric: string;
    weightedImpact: number;
    prescriptionApplicable?: boolean;
  },
>(gaps: readonly T[], objective?: string): T[] {
  return gaps.filter((g) =>
    g.weightedImpact > 0 && canGuidePrescription(g, objective)
  ).sort((a, b) => b.weightedImpact - a.weightedImpact);
}
/** Explicit selections promote/reorder; only explicit exclusions remove a limiter. */
export function resolveCoachLimiterOrder(
  automatic: readonly string[],
  options: {
    order?: readonly string[];
    excluded?: readonly string[];
    primary?: string | null;
    secondary?: string | null;
    overridePrimary?: boolean;
    overrideSecondary?: boolean;
    inapplicable?: readonly string[];
  } = {},
): string[] {
  const selected = [
    ...(options.overridePrimary && options.primary ? [options.primary] : []),
    ...(options.overrideSecondary && options.secondary
      ? [options.secondary]
      : []),
  ];
  const known = new Set([
    ...automatic,
    ...selected,
    "VO2max",
    "VLamax",
    "TTE",
    "Économie",
    "FatMax",
    "Disponibilité",
  ]);
  let result = [
    ...new Set([
      ...(options.order ?? []).filter((m) => known.has(m)),
      ...automatic,
    ]),
  ];
  const originalPrimary = result[0];
  if (options.overrideSecondary && options.secondary) {
    result = [
      options.secondary,
      ...result.filter((m) => m !== options.secondary),
    ];
  }
  const primary = options.overridePrimary ? options.primary : originalPrimary;
  if (primary) result = [primary, ...result.filter((m) => m !== primary)];
  const excluded = new Set([
    ...(options.excluded ?? []),
    ...(options.inapplicable ?? []),
  ]);
  return result.filter((m) => !excluded.has(m));
}
