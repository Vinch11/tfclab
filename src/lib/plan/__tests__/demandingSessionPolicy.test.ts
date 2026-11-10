import { it, expect } from "vitest";
import { demandingSessionReasons } from "../../../../supabase/functions/_shared/demandingSessionPolicy";
const id = "NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY";
const profile = { trainingLevel: "highly_trained", trainingLevelSource: "manual", weeklyHours: 8 };
it("server requires family approval even for a verified eight-hour profile", () => {
  expect(demandingSessionReasons(id, profile)).toContain("session_coach_approval_missing");
});
it("server allows approved double threshold with verified level and eight hours", () => {
  expect(demandingSessionReasons(id, { ...profile, approvedDemandingFamilies: ["double_threshold"] })).toEqual([]);
});
it("family approval never substitutes for eight hours or highly trained level", () => {
  const reasons = demandingSessionReasons(id, { ...profile, weeklyHours: 7, trainingLevel: "light", approvedDemandingFamilies: ["double_threshold"] });
  expect(reasons).toContain("session_weekly_hours_insufficient"); expect(reasons).toContain("session_training_level_insufficient");
});
it.each(["TPL_SWIM_HYPOXIE", "A_HEAT_ACCLIM_RUN", "B_RUN_LACTATE_SHUTTLE"])("permanent exclusion %s stays blocked", blocked => {
  expect(demandingSessionReasons(blocked, { ...profile, approvedDemandingFamilies: ["double_threshold", "lactate_shuttles"] })).toContain("session_automatically_blocked");
});