import { CHECKED_IN_PLAN_RELEASE_INFO } from "./planReleaseManifest.ts";
export type PlanFunctionName = "ai-training-plan" | "ai-training-plan-test";
export interface PlanReleaseInfo {
  manifestVersion: 2; releaseId: string | null;
  components: { frontend: string | null; "ai-training-plan": string | null; "ai-training-plan-test": string | null };
  /** Source preparation only; never an attestation of provider deployment. */
  provenance: "declared-source" | "archived-source";
  deploymentAttested: false;
  attested: boolean; sourceCommit: string | null;
  contractHash: string | null; catalogueHash: string | null; lockHash: string | null;
  sourceEpoch: number | null;
}
export const PLAN_RELEASE_INFO: PlanReleaseInfo = CHECKED_IN_PLAN_RELEASE_INFO;
const hash = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export function isPlanReleaseReady(value: unknown): value is PlanReleaseInfo {
  const info = value as PlanReleaseInfo;
  return info?.manifestVersion === 2 && info.deploymentAttested === false && hash(info.releaseId) && hash(info.contractHash) && hash(info.catalogueHash) && hash(info.lockHash)
    && hash(info.components?.frontend) && hash(info.components?.["ai-training-plan"]) && hash(info.components?.["ai-training-plan-test"])
    && ["declared-source", "archived-source"].includes(info.provenance);
}
export function samePlanContract(client: unknown, server: unknown): boolean {
  return isPlanReleaseReady(client) && isPlanReleaseReady(server) && client.releaseId === server.releaseId
    && client.contractHash === server.contractHash && client.catalogueHash === server.catalogueHash && client.lockHash === server.lockHash
    && client.components.frontend === server.components.frontend
    && client.components["ai-training-plan"] === server.components["ai-training-plan"]
    && client.components["ai-training-plan-test"] === server.components["ai-training-plan-test"];
}
export function planReleaseResponse(request: Request, functionName: PlanFunctionName, info = PLAN_RELEASE_INFO): Response | null {
  if (request.method !== "GET" || new URL(request.url).searchParams.get("release") !== "1") return null;
  return Response.json({ ...info, functionName, functionVersion: info.components?.[functionName] ?? null }, { status: isPlanReleaseReady(info) ? 200 : 503, headers: {
    "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } });
}

/** Fail before parsing athlete input or reaching a model when artifacts are mixed. */
export function planContractResponse(request: Request, info = PLAN_RELEASE_INFO): Response | null {
  if (request.method !== "POST") return null;
  const headers = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
  if (!isPlanReleaseReady(info)) return Response.json({ code: "PLAN_RELEASE_UNATTESTED", error: "Marqueurs de compatibilité absents ou invalides" }, { status: 503, headers });
  if (request.headers.get("X-Plan-Release-Id") !== info.releaseId || request.headers.get("X-Plan-Lock-Hash") !== info.lockHash ||
      request.headers.get("X-Plan-Contract-Hash") !== info.contractHash ||
      request.headers.get("X-Plan-Catalogue-Hash") !== info.catalogueHash) {
    return Response.json({ code: "PLAN_RELEASE_MISMATCH", error: "Versions frontend/serveur incompatibles" }, { status: 409, headers });
  }
  return null;
}
