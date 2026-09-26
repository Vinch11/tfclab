import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildTerrainHardBanBlock, buildStructuredDiagnosticBlock, buildUserPrompt } from "./promptHelpers.ts";

/**
 * Audit "génération de plan IA" (suite PR #263/#265/#267/#268) — dernier lot
 * de sites trouvés par l'audit systématique de `config.objective` : garde-fous
 * terrain/trail (moins probables en pratique, mais même classe de bug) et
 * libellés de diagnostic (purement informatifs, mais contradictoires avec le
 * verrou sport catalogObjective-aware affiché ailleurs dans le même prompt).
 * Tous utilisent désormais `config.catalogObjective ?? config.objective`.
 */

function baseConfig(overrides: Record<string, unknown> = {}) {
  return {
    objective: "Ironman",
    ambition: "Confirmé",
    weeksAvailable: 12,
    ...overrides,
  };
}

Deno.test("buildTerrainHardBanBlock — catalogObjective=Trail (cycle intermédiaire d'un plan Ironman) : contrainte terrain déclenchée", () => {
  const block = buildTerrainHardBanBlock(baseConfig({ catalogObjective: "Trail", terrainAvailability: "plat" }));
  assertStringIncludes(block, "CONTRAINTE TERRAIN");
});

Deno.test("buildTerrainHardBanBlock — sans catalogObjective, objectif final Ironman : aucune contrainte terrain (pas trail)", () => {
  const block = buildTerrainHardBanBlock(baseConfig({ terrainAvailability: "plat" }));
  assert(block === "", "un plan Ironman (non-trail) ne doit jamais recevoir la contrainte terrain trail.");
});

Deno.test("buildTerrainHardBanBlock — objectif final Trail mais catalogObjective=Marathon (cycle intermédiaire non-trail) : aucune contrainte terrain", () => {
  const block = buildTerrainHardBanBlock(baseConfig({ objective: "Trail", catalogObjective: "Marathon", terrainAvailability: "plat" }));
  assert(
    block === "",
    "une fenêtre du cycle Marathon (non-trail) ne doit pas recevoir la contrainte terrain trail même si l'objectif final du plan est trail.",
  );
});

Deno.test("buildStructuredDiagnosticBlock — catalogObjective=UTMB (cycle intermédiaire d'un plan Ironman) : garde-fou TRAIL ULTRA SANS PROFIL déclenché", () => {
  const block = buildStructuredDiagnosticBlock(baseConfig({ catalogObjective: "UTMB" }));
  assertStringIncludes(block, "TRAIL ULTRA SANS PROFIL COURSE");
});

Deno.test("buildStructuredDiagnosticBlock — sans catalogObjective, objectif final Ironman : pas de garde-fou trail", () => {
  const block = buildStructuredDiagnosticBlock(baseConfig());
  assert(!block.includes("TRAIL ULTRA SANS PROFIL COURSE"));
  assert(!block.includes("ATHLÈTE URBAIN"));
});

Deno.test("buildStructuredDiagnosticBlock — catalogObjective=Trail + terrainAvailability=plat : bloc ATHLÈTE URBAIN déclenché", () => {
  const block = buildStructuredDiagnosticBlock(baseConfig({ catalogObjective: "Trail", terrainAvailability: "plat" }));
  assertStringIncludes(block, "ATHLÈTE URBAIN — TERRAIN DÉCLARÉ");
});

Deno.test("buildStructuredDiagnosticBlock — libellé diagnostic : catalogObjective=Marathon affiche Marathon/run_route, pas Ironman/ironman", () => {
  const block = buildStructuredDiagnosticBlock(baseConfig({ catalogObjective: "Marathon" }));
  assertStringIncludes(block, "🎯 Objectif: Marathon");
  assertStringIncludes(block, "🏷️ Sport cible résolu: run_route");
  assert(!block.includes("🏷️ Sport cible résolu: ironman"));
});

Deno.test("buildStructuredDiagnosticBlock — libellé diagnostic : sans catalogObjective affiche bien l'objectif final Ironman", () => {
  const block = buildStructuredDiagnosticBlock(baseConfig());
  assertStringIncludes(block, "🎯 Objectif: Ironman");
  assertStringIncludes(block, "🏷️ Sport cible résolu: ironman");
});

Deno.test("buildUserPrompt — maxSessionsPerDay=3, catalogObjective=Marathon (cycle intermédiaire d'un plan Ironman) : exemple de structure RUNNING, pas triathlon", () => {
  const prompt = buildUserPrompt({}, baseConfig({ catalogObjective: "Marathon", maxSessionsPerDay: 3 }));
  assertStringIncludes(prompt, "Lundi matin : CAP EF Z1-Z2");
  assert(
    !prompt.includes("Lundi matin : Natation technique"),
    "l'exemple de structure doubles/triples triathlon (natation) ne doit plus apparaître pour une fenêtre du cycle Marathon.",
  );
});

Deno.test("buildUserPrompt — maxSessionsPerDay=3, sans catalogObjective (plan Ironman) : exemple de structure triathlon", () => {
  const prompt = buildUserPrompt({}, baseConfig({ maxSessionsPerDay: 3 }));
  assertStringIncludes(prompt, "Lundi matin : Natation technique");
});
