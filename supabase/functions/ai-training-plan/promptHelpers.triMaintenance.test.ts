import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildUserPrompt } from "./promptHelpers.ts";

const cfg = (extra: Record<string, unknown>) => ({
  objective: "Ironman", catalogObjective: "Marathon", ambition: "competitor", totalWeeks: 16,
  crossTrainingMaintenance: { velo: true, natation: true }, ...extra,
});

Deno.test("cycle Marathon avant Ironman : vélo et natation en maintien réel 2×/semaine", () => {
  const prompt = buildUserPrompt({}, cfg({}) as any);
  assertStringIncludes(prompt, "Vélo en MAINTIEN RÉEL : 2 séances/semaine");
  assertStringIncludes(prompt, "Natation en MAINTIEN RÉEL : 2 séances/semaine");
  assert(!prompt.includes("max 1×/2 semaines"), "l'ancien maintien léger ne doit plus apparaître");
  assert(!prompt.includes("Vélo autorisé UNIQUEMENT en récupération active"));
});

Deno.test("Marathon seul : comportement inchangé (vélo récupération uniquement)", () => {
  const prompt = buildUserPrompt({}, cfg({ objective: "Marathon", catalogObjective: undefined }) as any);
  assert(!prompt.includes("MAINTIEN RÉEL"));
});
