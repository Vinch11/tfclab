import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildUserPrompt } from "./promptHelpers.ts";

/**
 * Question du coach en creusant l'audit LCW : la checklist exigeait que
 * `B_LCW_BACK_TO_BACK_PEAK` soit à la fois en phase "Peak" (déduite d'un %
 * de progression dans le plan) ET à J-21/J-28 avant la course. Sur un plan
 * LCW COURT (7 semaines), c'est CONTRADICTOIRE : la phase "Peak" (%) tombe
 * à J-7/J-14, et J-21/J-28 retombe en phase "Build" — impossible de
 * satisfaire les deux à la fois, ce qui explique en partie l'absence totale
 * de cette séance sur un vrai plan généré.
 *
 * Fix : le prompt calcule désormais directement le(s) numéro(s) de semaine
 * cible pour CE plan (weeksAvailable - 3 / - 4) et l'injecte explicitement,
 * en explicitant que le nom de la phase (Build ou Peak) n'a pas d'importance
 * pour cette règle précise — seule la distance en semaines avant la course
 * compte.
 */
function minimalConfig(overrides: Record<string, unknown> = {}) {
  return {
    objective: "703",
    ambition: "Confirmé",
    weeksAvailable: 7,
    raceGoals: [{ objective: "703", priority: "A", raceFormat: "lcw_3day" }],
    ...overrides,
  };
}

Deno.test("buildUserPrompt — plan LCW 7 semaines : cible la simulation aux semaines 3 ou 4 explicitement (pas seulement 'Peak')", () => {
  const prompt = buildUserPrompt({}, minimalConfig());
  assertStringIncludes(prompt, "semaines 3 ou 4");
  assertStringIncludes(prompt, "ne recalcule pas");
});

Deno.test("buildUserPrompt — plan LCW long (16 semaines) : cible les semaines 12 ou 13 (J-21/J-28), pas juste 'Peak'", () => {
  const prompt = buildUserPrompt({}, minimalConfig({ weeksAvailable: 16 }));
  assertStringIncludes(prompt, "semaines 12 ou 13");
});

Deno.test("buildUserPrompt — la checklist ne mentionne plus 'ni en Build' comme une interdiction absolue", () => {
  const prompt = buildUserPrompt({}, minimalConfig());
  assert(!prompt.includes("ni en Build)"), "l'ancienne interdiction rigide 'ni en Build' ne doit plus apparaître telle quelle");
  assertStringIncludes(prompt, "N'A PAS D'IMPORTANCE");
});

Deno.test("buildUserPrompt — plan non-LCW : aucune mention de la cible de semaine LCW", () => {
  const prompt = buildUserPrompt({}, { objective: "703", weeksAvailable: 7, raceGoals: [{ objective: "703", priority: "A" }] });
  assert(!prompt.includes("B_LCW_BACK_TO_BACK_PEAK"));
});
