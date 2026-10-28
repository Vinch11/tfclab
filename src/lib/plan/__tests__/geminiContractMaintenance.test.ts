import { expect, it } from "vitest";
import { zPlanChunk } from "../planSchema";
import { mergePlanChunks } from "../mergePlanChunks";
import { jsonPlanToParsedPlan } from "../jsonPlanToParsedPlan";
import { exportPlanDiagnostics } from "../planStatPrivacy";
import { gateway400Evidence } from "../../../../supabase/functions/_shared/planGatewayDiagnostics";
const session = {
  day: "mardi",
  sport: "run",
  title: "Endurance facile",
  details: "30min Z2",
  durationMin: 30,
  zones: ["Z2"],
  custom: false,
  catalogId: "SYNTHETIC_RUN_EASY",
  variantKey: "10K",
  isKeySession: false,
};
it("client Zod, merge, adapter and synthetic save/reload preserve catalogue variant identity", () => {
  const chunk = zPlanChunk.parse({
    weeks: [{
      weekNumber: 1,
      phase: "base",
      theme: "Fixture",
      sessions: [session],
    }],
  });
  const parsed = jsonPlanToParsedPlan(mergePlanChunks([chunk], 1));
  const loaded = JSON.parse(JSON.stringify(parsed));
  expect(loaded.weeks[0].sessions[0]).toMatchObject({
    catalogId: session.catalogId,
    variantKey: "10K",
    custom: false,
    durationMin: 30,
    zones: ["Z2"],
    details: session.details,
    dayIndex: 1,
  });
  expect(
    zPlanChunk.safeParse({
      weeks: [{
        weekNumber: 1,
        phase: "base",
        sessions: [{ ...session, custom: true, catalogId: null }],
      }],
    }).success,
  ).toBe(false);
});
it("exportable diagnostics retain whitelisted HTTP400 evidence after server/client sanitization", () => {
  const evidence = gateway400Evidence(
    JSON.stringify({
      error: {
        status: "INVALID_ARGUMENT",
        param: "response_format.json_schema.schema",
        message: "Unsupported anyOf PRIVATE_ATHLETE injuryRisk",
      },
    }),
  );
  const output = exportPlanDiagnostics([{
    ts: 0,
    weeks: 1,
    objective: "10K",
    ambition: "age_group",
    success: false,
    elapsedMs: 1,
    schemaFailDetails: {
      gateway: {
        constrained: false,
        responseFormatType: "json_object",
        http400: evidence,
      },
    },
  } as never]);
  expect(output).toContain("INVALID_ARGUMENT");
  expect(output).toContain("response_format.json_schema.schema");
  expect(output).toContain("json_object");
  expect(output).not.toContain("PRIVATE_ATHLETE");
  expect(output).not.toContain("injuryRisk");
});
