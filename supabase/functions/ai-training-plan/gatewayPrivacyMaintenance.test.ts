import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  gateway400Evidence,
  sanitizeGatewayRejection,
} from "../_shared/planGatewayDiagnostics.ts";
import { executableCatalogueVariantsForWeeks } from "../_shared/sessionCatalogueContract.ts";
Deno.test("unstructured and unsafe provider fields never become personal diagnostics", () => {
  const secrets = ["PRIVATE_ATHLETE", "injuryRisk", "raceGoals", "my-secret"];
  for (
    const body of [
      "PRIVATE_ATHLETE injuryRisk raceGoals",
      JSON.stringify({
        error: {
          status: "PRIVATE_ATHLETE",
          param: "messages.PRIVATE_ATHLETE",
          message: "my-secret",
        },
      }),
    ]
  ) {
    const safe = gateway400Evidence(body);
    assertEquals(safe.status, 400);
    assertEquals(safe.parameter, undefined);
    for (const secret of secrets) {
      assert(!JSON.stringify(safe).includes(secret));
    }
  }
  const injected = sanitizeGatewayRejection({
    status: 400,
    code: "PRIVATE_ATHLETE",
    parameter: "raceGoals",
    keywords: ["PRIVATE_ATHLETE", "anyOf"],
  });
  assertEquals(injected, { status: 400, keywords: ["anyOf"] });
});
Deno.test("empty contracts never advertise executable variants", () =>
  assertEquals(executableCatalogueVariantsForWeeks({}), {}));

Deno.test("variant keys preserve goal-specific contracts across the seven objective families", async () => {
  const { normalizeRepairGoal } = await import(
    "../_shared/repairSportingEquivalence.ts"
  );
  for (
    const objective of [
      "5K",
      "10K",
      "Semi",
      "Marathon",
      "TrailMountain",
      "703",
      "IM",
    ]
  ) {
    const card = {
      metadataVersion: 1 as const,
      complete: true as const,
      id: "SYNTHETIC_" + objective,
      sport: "run",
      title: "Endurance facile",
      objective,
      intentFamily: "endurance_fondamentale" as const,
      goals: [normalizeRepairGoal(objective)!],
      objectiveSpecific: false,
      phases: ["base"],
      durationMin: [40, 60] as [number, number],
      mainZoneMax: 2,
      specialContext: null,
      prerequisiteKeys: [],
      necessity: "Recommandé",
      when: "Base",
      avoid: "",
      tags: [],
      structure: "40min Z2",
      zones: ["Z2"],
      variants: { [objective]: "Z2 25-35min", prose: "un peu plus court" },
    };
    const variants = executableCatalogueVariantsForWeeks({
      1: { objective, phase: "base", catalog: [card] },
    }) as Record<string, Record<string, Record<string, string>>>;
    assertEquals(Object.keys(variants[1][card.id]), [objective]);
  }
});
