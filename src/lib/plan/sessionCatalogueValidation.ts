import { checkSessionCatalogue, type ContractSession } from "../../../supabase/functions/_shared/sessionCatalogueContract";
import { WorkoutLibrary } from "../workoutLibrary";
import { buildRepairWorkoutMetadata } from "./repairCatalogMetadata";
import { parseWhenPhases } from "./phaseNormalization";
import { extractCatalogId } from "../catalogIdExtractor";
const catalog = WorkoutLibrary.map(buildRepairWorkoutMetadata);
interface PlanLike { weeklyQuotas?: Record<number, { weekType?: string }>; weeks: Array<{ weekNumber: number; phase: string; sessions: Array<ContractSession & { isRest?: boolean }> }>; }
/** Validate the current prescription, never mutate it to make an ID fit. */
export function validateSessionCataloguePlan(plan: PlanLike, objective?: string) {
 return plan.weeks.flatMap(week => week.sessions.flatMap((session, index) => {
  if (session.isRest || session.sport === "rest") return [];
  const catalogId = extractCatalogId(session.title ?? "", session.details ?? "", session.catalogId);
  const result = checkSessionCatalogue({ ...session, catalogId }, { catalog, objective, weekType: plan.weeklyQuotas?.[week.weekNumber]?.weekType, phase: (["base", "build", "peak", "taper"].includes(week.phase) ? week.phase : [...parseWhenPhases(week.phase)][0]) });
  return [
   ...result.errors.map(code => ({ rule: "catalogue_prescription_incompatible", severity: "error" as const, week: week.weekNumber,
    message: `S${week.weekNumber} séance ${index + 1} [${catalogId ?? "événement"}] : ${code}` })),
   ...result.unknown.map(code => ({ rule: "catalogue_prescription_unverified", severity: "warning" as const, week: week.weekNumber,
    message: `S${week.weekNumber} séance ${index + 1} [${catalogId ?? "sans ID"}] : ${code}` })),
  ];
 }));
}
