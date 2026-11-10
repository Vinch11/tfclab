import { approvedIdsForFamilies } from "./demandingSessionFamilies.ts";
import { auditedSafetyPrerequisitesFor } from "./workoutSafetyPrerequisites.ts";

export interface DemandingContext {
  approvedDemandingFamilies?: readonly string[];
  trainingLevel?: string;
  trainingLevelSource?: string;
  weeklyHours?: number | null;
}
/** The server checks its own audited ID policies, never caller-supplied prerequisite metadata. */
export function demandingSessionReasons(id: string, context: DemandingContext): string[] {
  const rule = auditedSafetyPrerequisitesFor(id);
  if (!rule) return [];
  if (rule.blockAutomaticSelection) return ["session_automatically_blocked"];
  const reasons: string[] = [];
  if (rule.requireExplicitCoachApproval && !approvedIdsForFamilies(context.approvedDemandingFamilies).includes(id)) reasons.push("session_coach_approval_missing");
  if (rule.requireVerifiedProfile && !["manual", "auto-tss"].includes(context.trainingLevelSource ?? "")) reasons.push("session_verified_profile_missing");
  const levels = ["untrained", "light", "trained", "highly_trained"];
  if (rule.minimumTrainingLevel && levels.indexOf(context.trainingLevel ?? "") < levels.indexOf(rule.minimumTrainingLevel)) reasons.push("session_training_level_insufficient");
  if (rule.minimumWeeklyHours !== undefined && (context.weeklyHours == null || context.weeklyHours < rule.minimumWeeklyHours)) reasons.push("session_weekly_hours_insufficient");
  return reasons;
}