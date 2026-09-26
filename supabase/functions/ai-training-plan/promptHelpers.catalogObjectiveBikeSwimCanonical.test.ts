import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildUserPrompt, buildCanonicalRaceCard } from "./promptHelpers.ts";

/**
 * Audit "génération de plan IA" (suite PR #263/#265/#267) : deux garde-fous
 * "Race Power Vélo" / "Zones triathlon" (GARDE-FOU #1 et #3, `buildUserPrompt`)
 * et la section vélo/natation de `buildCanonicalRaceCard` utilisaient TOUJOURS
 * `config.objective` (l'objectif FINAL du plan) — pour une fenêtre du cycle
 * intermédiaire Marathon d'un plan Ironman/70.3, ils affichaient quand même
 * une section vélo (IF race bornée TTE, watts cibles) et/ou natation (CSS,
 * race-pace) complète, contredisant le verrou sport de cette même fenêtre
 * (déjà cycle-aware, PR #263) qui interdit la natation et le vélo qualité.
 *
 * `deriveRaceTargets` (allures course) DANS `buildCanonicalRaceCard` reste
 * volontairement lié à l'objectif FINAL (déjà classifié correct — cf. PR
 * #265/#267) : seules les sections vélo/natation, spécifiques au triathlon,
 * sont corrigées ici.
 */

function baseConfig(overrides: Record<string, unknown> = {}) {
  return {
    objective: "Ironman",
    ambition: "Confirmé",
    weeksAvailable: 8,
    identifiedLimitersRaw: [],
    ...overrides,
  };
}

Deno.test("buildUserPrompt — sans catalogObjective (plan Ironman) : RACE POWER VÉLO et ZONES CANONIQUES TRIATHLON présents", () => {
  const prompt = buildUserPrompt({}, baseConfig());
  assertStringIncludes(prompt, "RACE POWER VÉLO");
  assertStringIncludes(prompt, "ZONES CANONIQUES TRIATHLON");
});

Deno.test("buildUserPrompt — catalogObjective=Marathon (cycle intermédiaire d'un plan Ironman) : ni RACE POWER VÉLO ni ZONES CANONIQUES TRIATHLON", () => {
  const prompt = buildUserPrompt({}, baseConfig({ catalogObjective: "Marathon" }));
  assert(
    !prompt.includes("RACE POWER VÉLO"),
    "la section race power vélo (IF bornée TTE) ne doit plus apparaître pour une fenêtre du cycle Marathon.",
  );
  assert(
    !prompt.includes("ZONES CANONIQUES TRIATHLON"),
    "les zones canoniques triathlon (vélo+course) ne doivent plus apparaître pour une fenêtre du cycle Marathon.",
  );
});

Deno.test("buildCanonicalRaceCard — sans catalogObjective (plan Ironman) : section vélo canonique présente", () => {
  const card = buildCanonicalRaceCard({}, baseConfig());
  assertStringIncludes(card, "Vélo — Race power canonique");
});

Deno.test("buildCanonicalRaceCard — catalogObjective=Marathon : section vélo canonique absente (allures CAP restent, objectif final)", () => {
  const card = buildCanonicalRaceCard({}, baseConfig({ catalogObjective: "Marathon" }));
  assert(
    !card.includes("Vélo — Race power canonique"),
    "la carte de course canonique ne doit plus afficher de race power vélo pour une fenêtre du cycle Marathon.",
  );
});

Deno.test("buildCanonicalRaceCard — sans catalogObjective, avec CSS mesuré : section natation canonique présente", () => {
  const card = buildCanonicalRaceCard({ css: 90 }, baseConfig());
  assertStringIncludes(card, "Natation — CSS & Race-pace canoniques");
});

Deno.test("buildCanonicalRaceCard — catalogObjective=Marathon, avec CSS mesuré : section natation canonique absente", () => {
  const card = buildCanonicalRaceCard({ css: 90 }, baseConfig({ catalogObjective: "Marathon" }));
  assert(
    !card.includes("Natation — CSS & Race-pace canoniques"),
    "la carte de course canonique ne doit plus afficher de CSS/race-pace natation pour une fenêtre du cycle Marathon.",
  );
});
