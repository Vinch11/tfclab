/** Replaced only in an archived build workspace by prepare-plan-release.mjs. */
export interface PlanReleaseInfo {
  manifestVersion: 1; attested: boolean; sourceCommit: string | null;
  contractHash: string | null; catalogueHash: string | null; lockHash: string | null;
  sourceEpoch: number | null;
}
export const PLAN_RELEASE_INFO: PlanReleaseInfo = { manifestVersion: 1, attested: false,
  sourceCommit: null, contractHash: null, catalogueHash: null, lockHash: null, sourceEpoch: null };
export function samePlanContract(client: PlanReleaseInfo, server: PlanReleaseInfo): boolean {
  return client.attested && server.attested && /^[a-f0-9]{40}$/.test(client.sourceCommit ?? "") && client.sourceCommit === server.sourceCommit &&
    /^[a-f0-9]{64}$/.test(client.contractHash ?? "") && client.contractHash === server.contractHash &&
    /^[a-f0-9]{64}$/.test(client.catalogueHash ?? "") && client.catalogueHash === server.catalogueHash && /^[a-f0-9]{64}$/.test(client.lockHash ?? "") && client.lockHash === server.lockHash;
}
export function planReleaseResponse(request: Request, functionName: "ai-training-plan" | "ai-training-plan-test", info = PLAN_RELEASE_INFO): Response | null {
  if (request.method !== "GET" || new URL(request.url).searchParams.get("release") !== "1") return null;
  return Response.json({ ...info, functionName }, { status: info.attested ? 200 : 503, headers: {
    "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } });
}

/** Fail before parsing athlete input or reaching a model when artifacts are mixed. */
export function planContractResponse(request: Request, info = PLAN_RELEASE_INFO): Response | null {
  if (request.method !== "POST") return null;
  const headers = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
  if (!info.attested) return Response.json({ code: "PLAN_RELEASE_UNATTESTED", error: "Version technique non attestée" }, { status: 503, headers });
  if (request.headers.get("X-Plan-Source-Commit") !== info.sourceCommit ||
      request.headers.get("X-Plan-Contract-Hash") !== info.contractHash ||
      request.headers.get("X-Plan-Catalogue-Hash") !== info.catalogueHash) {
    return Response.json({ code: "PLAN_RELEASE_MISMATCH", error: "Versions frontend/serveur incompatibles" }, { status: 409, headers });
  }
  return null;
}
