/**
 * Marqueur d'origine TFCLab et corps RÉELLEMENT envoyé (pur, sans réseau ni journal).
 * Partagé par l'expéditeur réel et la simulation du plan complet : la simulation porte
 * ainsi EXACTEMENT le corps marqué qui sera créé (même empreinte), au lieu du corps nu.
 */
import { canonicalJson, type V2Operation } from "./plannedMapper.ts";

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type OpId = Pick<V2Operation, "sessionKey" | "path" | "body">;

/** Marqueur d'origine TFCLab inscrit dans la description. Indice, PAS preuve absolue d'origine. */
export async function originMarker(planVersionId: string, op: Pick<V2Operation, "sessionKey" | "path">): Promise<string> {
  return `[TFCLab ${(await sha256Hex(`nolio-v2-origin-1|${planVersionId}|${op.sessionKey}|${op.path}`)).slice(0, 24)}]`;
}
/** Corps réellement envoyé : corps du mapper + marqueur d'origine en fin de description. */
export async function bodyToSend(planVersionId: string, op: OpId): Promise<Record<string, unknown>> {
  const m = await originMarker(planVersionId, op);
  const d = typeof op.body.description === "string" && op.body.description ? `${op.body.description}\n\n${m}` : m;
  return { ...op.body, description: d };
}
export async function operationKey(planVersionId: string, op: OpId): Promise<{ opKey: string; payloadSha256: string }> {
  const payloadSha256 = await sha256Hex(canonicalJson(await bodyToSend(planVersionId, op)));
  const opKey = await sha256Hex(canonicalJson({ v: "nolio-v2-op-1", planVersionId, sessionKey: op.sessionKey, path: op.path, payloadSha256 }));
  return { opKey, payloadSha256 };
}
