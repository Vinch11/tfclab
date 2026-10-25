import { describe, expect, it, vi } from "vitest";
import { PLAN_RELEASE_INFO, planReleaseResponse, planContractResponse, type PlanReleaseInfo } from "../../../../supabase/functions/_shared/planReleaseInfo";
import { verifyPlanServerRelease, currentPlanReleaseHeaders } from "../planReleasePreflight";

describe("ordinary Lovable source deployment (no preparation script)", () => {
  it("production without a valid frontend marker cannot use the development bypass", async () => {
    const transport = vi.fn();
    vi.stubEnv("PROD", true);
    vi.stubGlobal("__PLAN_RELEASE_INFO__", undefined);
    vi.stubGlobal("fetch", transport);
    try {
      await expect(currentPlanReleaseHeaders("https://fixture.invalid/ai-training-plan", "synthetic")).rejects.toThrow("PLAN_RELEASE_UNATTESTED");
      expect(transport).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
  });
  const url = "https://fixture.invalid/ai-training-plan";
  const metadata = (info: PlanReleaseInfo) => ({ ...info, functionName: "ai-training-plan", functionVersion: info.components["ai-training-plan"] });
  it.each(["ai-training-plan", "ai-training-plan-test"] as const)("%s exposes usable compatibility without claiming deployment attestation", async name => {
    const response = planReleaseResponse(new Request(`https://fixture.invalid/${name}?release=1`), name)!;
    expect(response.status).toBe(200);
    const info = await response.json();
    expect(info.attested).toBe(false);
    const transport = vi.fn(async () => Response.json(info));
    const headers = await verifyPlanServerRelease(`https://fixture.invalid/${name}`, "synthetic", PLAN_RELEASE_INFO, transport);
    const request = new Request(`https://fixture.invalid/${name}`, { method: "POST", headers, body: "synthetic" });
    expect(planContractResponse(request)).toBeNull();
    expect(request.bodyUsed).toBe(false);
  });

  it.each(["releaseId", "contractHash", "catalogueHash", "lockHash"] as const)("rejects %s mismatch before any POST or body read", async key => {
    const transport = vi.fn(async () => Response.json(metadata({ ...PLAN_RELEASE_INFO, [key]: "f".repeat(64) })));
    await expect(verifyPlanServerRelease(url, "synthetic", PLAN_RELEASE_INFO, transport)).rejects.toThrow("PLAN_RELEASE_MISMATCH");
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0]).toHaveLength(2);
    const headers = await verifyPlanServerRelease(url, "synthetic", PLAN_RELEASE_INFO, async () => Response.json(metadata(PLAN_RELEASE_INFO)));
    const request = new Request(url, { method: "POST", body: "synthetic", headers });
    expect(planContractResponse(request, { ...PLAN_RELEASE_INFO, [key]: "f".repeat(64) })!.status).toBe(409);
    expect(request.bodyUsed).toBe(false);
  });

  it.each(["frontend", "ai-training-plan", "ai-training-plan-test"] as const)("rejects a different %s component even with the same claimed release ID", async name => {
    const server = { ...PLAN_RELEASE_INFO, components: { ...PLAN_RELEASE_INFO.components, [name]: "f".repeat(64) } };
    await expect(verifyPlanServerRelease(url, "synthetic", PLAN_RELEASE_INFO, async () => Response.json(metadata(server)))).rejects.toThrow("PLAN_RELEASE_MISMATCH");
  });

  it("missing client markers stop without a network request; missing server markers return503", async () => {
    const transport = vi.fn();
    const missing = { ...PLAN_RELEASE_INFO, releaseId: null };
    await expect(verifyPlanServerRelease(url, "synthetic", missing, transport)).rejects.toThrow("PLAN_RELEASE_UNATTESTED");
    expect(transport).not.toHaveBeenCalled();
    expect(planReleaseResponse(new Request(`${url}?release=1`), "ai-training-plan", missing)!.status).toBe(503);
    await expect(verifyPlanServerRelease(url, "synthetic", PLAN_RELEASE_INFO, async () => planReleaseResponse(new Request(`${url}?release=1`), "ai-training-plan", missing)!)).rejects.toThrow("PLAN_RELEASE_UNAVAILABLE");
    expect(planContractResponse(new Request(url, { method: "POST" }), missing)!.status).toBe(503);
    expect(planContractResponse(new Request(url, { method: "POST" }))!.status).toBe(409);
  });
  it.each([null, {}, { manifestVersion: 2 }])("rejects incomplete metadata %j", async value => {
    await expect(verifyPlanServerRelease(url, "synthetic", PLAN_RELEASE_INFO, async () => Response.json(value))).rejects.toThrow("PLAN_RELEASE_MISMATCH");
  });

  it("rejects a legacy protocol and a response from the other function", async () => {
    await expect(verifyPlanServerRelease(url, "synthetic", PLAN_RELEASE_INFO, async () => Response.json({ ...metadata(PLAN_RELEASE_INFO), manifestVersion: 1, attested: true }))).rejects.toThrow("PLAN_RELEASE_MISMATCH");
    await expect(verifyPlanServerRelease(url, "synthetic", PLAN_RELEASE_INFO, async () => Response.json({ ...metadata(PLAN_RELEASE_INFO), functionName: "ai-training-plan-test" }))).rejects.toThrow("PLAN_RELEASE_MISMATCH");
    const legacy = new Request(url, { method: "POST", headers: { "X-Plan-Source-Commit": "a".repeat(40), "X-Plan-Contract-Hash": PLAN_RELEASE_INFO.contractHash!, "X-Plan-Catalogue-Hash": PLAN_RELEASE_INFO.catalogueHash! } });
    expect(planContractResponse(legacy)!.status).toBe(409);
  });

  it("coherent rollback to an older v2 release works; partial rollback stays blocked", async () => {
    const previous = { ...PLAN_RELEASE_INFO, releaseId: "e".repeat(64), components: { ...PLAN_RELEASE_INFO.components, frontend: "e".repeat(64) } };
    await expect(verifyPlanServerRelease(url, "synthetic", PLAN_RELEASE_INFO, async () => Response.json(metadata(previous)))).rejects.toThrow("PLAN_RELEASE_MISMATCH");
    const headers = await verifyPlanServerRelease(url, "synthetic", previous, async () => Response.json(metadata(previous)));
    expect(planContractResponse(new Request(url, { method: "POST", headers }), previous)).toBeNull();
    expect(planContractResponse(new Request(url, { method: "POST", headers }))!.status).toBe(409);
  });
  it("archive provenance and ordinary provenance may match content, never by SHA alone", async () => {
    const archive = { ...PLAN_RELEASE_INFO, provenance: "archived-source" as const, attested: true, sourceCommit: "a".repeat(40) };
    await expect(verifyPlanServerRelease(url, "synthetic", archive, async () => Response.json(metadata(PLAN_RELEASE_INFO)))).resolves.toHaveProperty("X-Plan-Release-Id", PLAN_RELEASE_INFO.releaseId);
    await expect(verifyPlanServerRelease(url, "synthetic", archive, async () => Response.json(metadata({ ...archive, catalogueHash: "f".repeat(64) })))).rejects.toThrow("PLAN_RELEASE_MISMATCH");
  });
});
