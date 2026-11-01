import { describe, expect, it } from "vitest";
import { calculatePlanRelease } from "../../../../scripts/preproduction/plan-release-source.mjs";
// Temporary SHA source inventory check; remove after updating the non-attested declaration.
describe("P0 QA source manifest candidate", () => {
  it("recomputes the exact GitHub branch fingerprint from actual runtime sources", async () => {
    const { info } = await calculatePlanRelease(process.cwd());
    expect(info.attested).toBe(false);
    expect(info.deploymentAttested).toBe(false);
    console.log("QA_SOURCE_MANIFEST_CANDIDATE_START" + JSON.stringify(info) + "QA_SOURCE_MANIFEST_CANDIDATE_END");
  }, 30000);
});
