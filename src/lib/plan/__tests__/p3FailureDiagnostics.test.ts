import { it, expect, vi } from "vitest";
import { readPlanStats, logPlanStat } from "../planGenerationStats";
import { exportPlanDiagnostics } from "../planStatPrivacy";
import { sanitizeSchemaFailure, sanitizeTechnicalTraces } from "../../../../supabase/functions/_shared/planFailureDiagnostics";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } } }));
const canary = "MEDICAL_PATIENT_BEARER_CANARY";
it("ne stocke, journalise ni n'exporte les contenus bruts d'un échec", () => {
 localStorage.clear();
 const info = vi.spyOn(console, "info").mockImplementation(() => {});
 try {
  logPlanStat({ ts: 1, format: "json", objective: canary, totalWeeks: 32, totalChunks: 7, durationMs: 12, ok: false, errorCode: "SCHEMA_FAIL", errorMessage: canary,
   schemaFailDetails: { rawFirst800: canary, rawLast400: canary, parseError: canary, zodIssues: [{ path: `weeks.0.sessions.1.${canary}`, message: canary, code: "custom" }],
    attempts: [{ attempt: 1, rawFirst800: canary, rawLast400: canary, zodErrorText: canary, rawLength: 1500 }] },
   semanticRepairs: [`[critical] catalogue_pool_insufficient: W4 ${canary}`],
   generationContext: { functionName: "ai-training-plan", deploymentId: "deployment-1", executionId: "execution-1", raceGoals: [{ raceName: canary }] } as never });
  const output = JSON.stringify({ logs: info.mock.calls, stored: localStorage.getItem("tfcl:plan_gen_stats"), report: exportPlanDiagnostics(readPlanStats()) });
  expect(output).not.toContain(canary); expect(output).not.toContain("rawFirst800");
  expect(output).toContain("SCHEMA_FAIL"); expect(output).toContain("catalogue_pool_insufficient"); expect(output).toContain("deployment-1");
  expect(readPlanStats()[0].semanticRepairs).toEqual(["[critical] catalogue_pool_insufficient W4"]);
 } finally { info.mockRestore(); }
});
it("filtre aussi l'historique legacy au moment de la lecture/export", () => {
 localStorage.setItem("tfcl:plan_gen_stats", JSON.stringify([{ ts: 3, ok: false, format: "json", errorMessage: canary, schemaFailDetails: { rawFirst800: canary } }]));
 expect(exportPlanDiagnostics(readPlanStats())).not.toContain(canary);
});
it("conserve les chemins et contraintes techniques sans recopier les messages privés", () => {
 const value = sanitizeSchemaFailure({ zodIssues: [{ path: ["weeks", 0, "sessions", 2, "catalogId"], code: "custom", message: "catalogue_prescription_incompatible:phase:base" }] });
 expect(value.zodIssues[0]).toMatchObject({ path: "weeks.0.sessions.2.catalogId", message: "catalogue_prescription_incompatible:phase:base" });
 expect(sanitizeTechnicalTraces([`[warning] sl_upgrade_unresolved: W2 ${canary}`])).toEqual(["[warning] sl_upgrade_unresolved W2"]);
});

it("le précontrôle de version ne fait aucun POST et refuse un serveur incompatible", async () => {
 const { verifyPlanServerRelease } = await import("../planReleasePreflight");
 const { PLAN_RELEASE_INFO } = await import("../../../../supabase/functions/_shared/planReleaseInfo");
 const client = { ...PLAN_RELEASE_INFO, attested: true, sourceCommit: "a".repeat(40), contractHash: "b".repeat(64), catalogueHash: "c".repeat(64), lockHash: "d".repeat(64) };
 const transport = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => Response.json({ ...client, catalogueHash: "e".repeat(64) }));
 await expect(verifyPlanServerRelease("https://fixture.invalid/ai-training-plan", "fake-token", client, transport)).rejects.toThrow("PLAN_RELEASE_MISMATCH");
 expect(transport).toHaveBeenCalledTimes(1);
 expect(transport.mock.calls[0][1]?.method).toBe("GET");
 transport.mockResolvedValue(Response.json(client));
 const headers = await verifyPlanServerRelease("https://fixture.invalid/ai-training-plan", "fake-token", client, transport);
 expect(headers["X-Plan-Contract-Hash"]).toBe(client.contractHash);
});
