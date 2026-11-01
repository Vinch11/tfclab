import { describe, expect, it } from "vitest";
import { calculatePlanRelease } from "../../../../scripts/preproduction/plan-release-source.mjs";

// Temporary diagnostic. Prints only source fingerprints (no credentials).
// Deleted once the non-attested checked-in declaration is regenerated.
describe("P0 QA source declaration candidate", () => {
  it("derives the exact candidate from actual branch source without attesting it", async () => {
    const { info } = await calculatePlanRelease(process.cwd());
    expect(info.attested).toBe(false);
    expect(info.deploymentAttested).toBe(false);
    expect(info.sourceCommit).toBeNull();
    console.log("TFCL_CANDIDATE_START" + JSON.stringify(info) + "TFCL_CANDIDATE_END");
  }, 30000);
});
