import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleJSONPlanRequest } from "./jsonPlanHandler.ts";

Deno.test("mocked SSE preserves observed deployment/function and the actual request goals, without auth/athlete data", async () => {
  const oldFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (() => {
    calls++;
    return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      title: "Fixture", phases: [{ name: "Base", weeks: "S1-S1", objective: "Endurance" }],
      weeks: [{ weekNumber: 1, phase: "base", theme: "Base", sessions: [{ day: "mardi", sport: "run", title: "Endurance",
        details: "45 min Z2", durationMin: 45, custom: true, catalogId: null, zones: ["Z2"], isKeySession: false }] }],
    }) }, finish_reason: "stop" }] }), { status: 200, headers: { "Content-Type": "application/json" } }));
  }) as typeof fetch;
  const raceGoals = [{ objective: "703", raceDate: "2027-06-06", priority: "A" }];
  try {
    const response = handleJSONPlanRequest({ apiKey: "test-only-secret", athleteData: { firstName: "NOT_IN_CONTEXT" },
      planConfig: { objective: "703", weeksAvailable: 1, planStartDate: "2027-05-31", raceGoals },
      corsHeaders: {}, diagnosticContext: { functionName: "test-function", deploymentId: "test-deployment-v1", executionId: "test-execution" } });
    const text = await response.text();
    const event = text.split("\n\n").find(block => block.startsWith("event: generation-context"))!;
    const data = JSON.parse(event.split("data: ")[1]);
    assertEquals(data.raceGoals, raceGoals);
    assertEquals(data.functionName, "test-function");
    assertEquals(data.deploymentId, "test-deployment-v1");
    assertEquals(data.planStartDate, "2027-05-31");
    assertEquals(data.outputFormat, "json");
    assert(!event.includes("test-only-secret")); assert(!event.includes("NOT_IN_CONTEXT"));
    assert(calls > 0); // every gateway transport was mocked, no live call
  } finally { globalThis.fetch = oldFetch; }
});
