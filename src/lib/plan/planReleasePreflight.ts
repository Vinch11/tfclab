import { samePlanContract, type PlanReleaseInfo } from "../../../supabase/functions/_shared/planReleaseInfo";
import { technicalRelease } from "../../../supabase/functions/_shared/planDiagnosticPrivacy";
/** Metadata GET only: no generation endpoint POST until the versions match. */
export async function verifyPlanServerRelease(url: string, token: string, client: PlanReleaseInfo, transport: typeof fetch = fetch) {
 if (!client.attested) throw new Error("PLAN_RELEASE_UNATTESTED");
 const probe = new URL(url); probe.searchParams.set("release", "1");
 const response = await transport(probe.toString(), { method: "GET", headers: { Authorization: `Bearer ${token}` } });
 if (!response.ok) throw new Error("PLAN_RELEASE_UNAVAILABLE");
 const server = technicalRelease(await response.json());
 if (!samePlanContract(client, server)) throw new Error("PLAN_RELEASE_MISMATCH");
 return { "X-Plan-Source-Commit": client.sourceCommit!, "X-Plan-Contract-Hash": client.contractHash!, "X-Plan-Catalogue-Hash": client.catalogueHash! };
}
