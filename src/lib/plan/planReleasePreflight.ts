import { isPlanReleaseReady, samePlanContract, type PlanReleaseInfo } from "../../../supabase/functions/_shared/planReleaseInfo";
import { technicalRelease } from "../../../supabase/functions/_shared/planDiagnosticPrivacy";
/** Metadata GET only: no generation endpoint POST until the versions match. */
export async function verifyPlanServerRelease(url: string, token: string, client: PlanReleaseInfo, transport: typeof fetch = fetch) {
 if (!isPlanReleaseReady(client)) throw new Error("PLAN_RELEASE_UNATTESTED");
 const probe = new URL(url); probe.searchParams.set("release", "1");
 const response = await transport(probe.toString(), { method: "GET", headers: { Authorization: `Bearer ${token}` } });
 if (!response.ok) throw new Error("PLAN_RELEASE_UNAVAILABLE");
 const value = await response.json();
 const metadata = value && typeof value === "object" ? value as Record<string, unknown> : {};
 const server = technicalRelease(metadata);
 const functionName = new URL(url).pathname.split("/").filter(Boolean).at(-1);
 if (!["ai-training-plan", "ai-training-plan-test"].includes(functionName ?? "") || metadata.functionName !== functionName
   || metadata.functionVersion !== server.components?.[functionName as "ai-training-plan" | "ai-training-plan-test"]) throw new Error("PLAN_RELEASE_MISMATCH");
 if (!samePlanContract(client, server)) throw new Error("PLAN_RELEASE_MISMATCH");
 return { "X-Plan-Release-Id": client.releaseId!, "X-Plan-Contract-Hash": client.contractHash!, "X-Plan-Catalogue-Hash": client.catalogueHash!, "X-Plan-Lock-Hash": client.lockHash!,
   ...(client.sourceCommit ? { "X-Plan-Source-Commit": client.sourceCommit } : {}) };
}

/** Every generation transport (including targeted/legacy paths) uses this gate. */
export async function currentPlanReleaseHeaders(url: string, token: string): Promise<Record<string, string>> {
 if (typeof __PLAN_RELEASE_INFO__ !== "undefined" && isPlanReleaseReady(__PLAN_RELEASE_INFO__)) return verifyPlanServerRelease(url, token, __PLAN_RELEASE_INFO__);
 if (import.meta.env.PROD) throw new Error("PLAN_RELEASE_UNATTESTED");
 return {}; // explicit local development/test only; not an attested publication
}
