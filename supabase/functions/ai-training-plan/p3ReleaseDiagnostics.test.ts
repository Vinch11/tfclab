import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { planReleaseResponse, samePlanContract, PLAN_RELEASE_INFO } from "../_shared/planReleaseInfo.ts";
import { sanitizeSchemaFailure } from "../_shared/planFailureDiagnostics.ts";
Deno.test("release metadata is read-only and never invents an attestation", async () => {
 const response = planReleaseResponse(new Request("https://fixture.invalid/?release=1"), "ai-training-plan")!;
 assertEquals(response.status, 200); assertEquals((await response.json()).attested, false);
 assertEquals(planReleaseResponse(new Request("https://fixture.invalid/", { method: "POST" }), "ai-training-plan"), null);
 assert(samePlanContract(PLAN_RELEASE_INFO, PLAN_RELEASE_INFO));
 assert(!samePlanContract(PLAN_RELEASE_INFO, { ...PLAN_RELEASE_INFO, releaseId: null }));
 const info = { ...PLAN_RELEASE_INFO, attested: true, sourceCommit: "a".repeat(40), contractHash: "b".repeat(64), catalogueHash: "c".repeat(64), lockHash: "d".repeat(64) };
 assert(samePlanContract(info, info)); assert(!samePlanContract(info, { ...info, catalogueHash: "e".repeat(64) }));
});
Deno.test("SSE diagnostic projection strips raw model/medical fields and keeps technical causes", () => {
 const result = sanitizeSchemaFailure({ rawFirst800: "PRIVATE_MEDICAL", attempts: [{ rawLast400: "PRIVATE_MEDICAL", zodIssues: [{ path: "weeks.0.sessions.1.sport", message: "PRIVATE_MEDICAL", code: "invalid_enum_value" }] }] });
 assert(!JSON.stringify(result).includes("PRIVATE_MEDICAL")); assert(JSON.stringify(result).includes("invalid_enum_value"));
});

Deno.test("échec JSON mocké : aucun extrait médical dans SSE ni console après deux refus", async () => {
 const { handleJSONPlanRequest } = await import("./jsonPlanHandler.ts");
 const oldFetch = globalThis.fetch, oldWarn = console.warn, oldError = console.error;
 const logs: unknown[] = []; let calls = 0;
 globalThis.fetch = (() => { calls++; return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: "PRIVATE_MEDICAL", weeks: [] }) }, finish_reason: "stop" }] }), { status: 200 })); }) as typeof fetch;
 console.warn = (...args: unknown[]) => { logs.push(args); }; console.error = (...args: unknown[]) => { logs.push(args); };
 try {
  const response = handleJSONPlanRequest({ apiKey: "mock", athleteData: {}, planConfig: { weeksAvailable: 1, objective: "703", _outputFormat: "json" }, corsHeaders: {} });
  const output = await response.text();
  assert(output.includes("SCHEMA_FAIL")); assert(!output.includes("PRIVATE_MEDICAL")); assert(!JSON.stringify(logs).includes("PRIVATE_MEDICAL"));
  assertEquals(calls, 2);
 } finally { globalThis.fetch = oldFetch; console.warn = oldWarn; console.error = oldError; }
});

Deno.test("POST incompatible est refusé avant lecture des données, sans exception de sécurité", async () => {
 const { planContractResponse } = await import("../_shared/planReleaseInfo.ts");
 const request = new Request("https://fixture.invalid/", { method: "POST", body: "PRIVATE_MEDICAL" });
 assertEquals(planContractResponse(request, { ...PLAN_RELEASE_INFO, releaseId: null })!.status, 503); assertEquals(request.bodyUsed, false);
 const info = { ...PLAN_RELEASE_INFO, attested: true, sourceCommit: "a".repeat(40), contractHash: "b".repeat(64), catalogueHash: "c".repeat(64), lockHash: "d".repeat(64) };
 assertEquals(planContractResponse(request, info)!.status, 409);
 const matched = new Request("https://fixture.invalid/", { method: "POST", headers: { "X-Plan-Release-Id": info.releaseId!, "X-Plan-Lock-Hash": info.lockHash!, "X-Plan-Source-Commit": info.sourceCommit!, "X-Plan-Contract-Hash": info.contractHash!, "X-Plan-Catalogue-Hash": info.catalogueHash! } });
 assertEquals(planContractResponse(matched, info), null);
});
