import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildUserPrompt,
  computeCPWprime,
  computePrescriptionCPWprime,
} from "./promptHelpers.ts";
const bike = { p30s: 650, p60s: 500, map5min: 320, ftp: 270 };
Deno.test("cycling CP/W' cannot prescribe running or trail intervals", () => {
  assert(computeCPWprime(bike), "cycling assessment remains calculable");
  for (
    const objective of [
      "5K",
      "10K",
      "Semi",
      "Marathon",
      "Trail",
      "TrailMountain",
      "TrailUltra",
      "StartToRun",
    ]
  ) {
    const prompt = buildUserPrompt(bike, {
      objective,
      ambition: "age_group",
      weeksAvailable: 12,
    });
    assert(!prompt.includes("OBLIGATION D'AFFICHAGE W'bal"), objective);
    assert(!prompt.includes("Durées de Repos Optimales W'bal"), objective);
  }
});
Deno.test("CP/W' prescriptions retained for triathlon, scoped to current cycle", () => {
  for (const objective of ["Sprint", "Olympic", "703", "IM", "LCW"]) {
    assert(
      buildUserPrompt(bike, {
        objective,
        ambition: "age_group",
        weeksAvailable: 12,
      }).includes("OBLIGATION D'AFFICHAGE W'bal"),
      objective,
    );
  }
  const prompt = buildUserPrompt(bike, {
    objective: "IM",
    catalogObjective: "10K",
    weeksAvailable: 12,
  });
  assertEquals(prompt.includes("OBLIGATION D'AFFICHAGE W'bal"), false);
});

Deno.test("chunk/retry context shares initial prompt applicability, raw assessment unchanged", () => {
  const before = structuredClone(bike);
  assertEquals(computePrescriptionCPWprime(bike, { objective: "10K" }), null);
  assertEquals(
    computePrescriptionCPWprime(bike, {
      objective: "IM",
      catalogObjective: "TrailMountain",
    }),
    null,
  );
  assertEquals(
    computePrescriptionCPWprime(bike, { objective: "703" }),
    computeCPWprime(bike),
  );
  assertEquals(bike, before);
  const handler = Deno.readTextFileSync(new URL("./index.ts", import.meta.url));
  assert(
    handler.includes(
      "const cpwResult = computePrescriptionCPWprime(athleteData, config)",
    ),
  );
  assert(!handler.includes("computeCPWprime(athleteData)"));
});
