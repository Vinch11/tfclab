import { describe, it, expect, vi } from "vitest";
import { technicalGenerationEvent } from "../../../../supabase/functions/_shared/planDiagnosticPrivacy";
import { snapshotSLFloorAudit, traceSLFloorConsumer } from "../slFloorAudit";
import { formatSLRepairDiagnostic } from "../slRepairDiagnostics";
import { readFileSync } from "node:fs";
const canary = "MEDICAL_PERSONAL_CANARY";
describe("allowlist des nouveaux diagnostics P0", () => {
 it("supprime données médicales et objets privés même des anciennes provenances", () => {
  const privateData = { injuryRisk: { bike: canary }, reasons: [canary], athlete: canary, raceGoals: [{ raceName: canary }],
   nominal: { slLongRideMin: 120, medical: canary }, individualized: { slLongRideMin: 95, injuryRisk: canary } };
  const audit = snapshotSLFloorAudit(privateData);
  const spy = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
   traceSLFloorConsumer("validation", 1, { floors: privateData.nominal, floorAudit: privateData } as never);
   const output = JSON.stringify({ audit, logs: spy.mock.calls, context: technicalGenerationEvent(privateData),
    repair: formatSLRepairDiagnostic("sl_upgrade_unresolved", "critical", { before: { title: canary, details: canary, durationMin: 80 } }) });
   expect(output).not.toContain(canary); expect(output).not.toContain("injuryRisk"); expect(output).not.toContain("raceGoals");
   expect(output).toContain("slLongRideMin"); expect(output).toContain("declaredGoalCount");
  } finally { spy.mockRestore(); }
 });
 it("les puits frontend/serveur utilisent les projections, sans recopier les entrées privées", () => {
  const hook = readFileSync("src/hooks/useAITrainingPlan.ts", "utf8");
  expect(hook).toContain("technicalGenerationEvent(data)");
  expect(hook).not.toContain('individualized.reasons.join(');
  for (const folder of ["ai-training-plan", "ai-training-plan-test"]) {
   const handler = readFileSync(`supabase/functions/${folder}/jsonPlanHandler.ts`, "utf8");
   const index = readFileSync(`supabase/functions/${folder}/index.ts`, "utf8");
   expect(handler).toContain("technicalFloorAudit(rawEntry.floorAudit)");
   expect(handler).not.toContain("raceGoals: planConfig?.raceGoals");
   expect(index).not.toContain("raceGoals: planConfig?.raceGoals");
  }
 });
});
