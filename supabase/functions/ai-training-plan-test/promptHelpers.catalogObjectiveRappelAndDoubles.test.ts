import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildUserPrompt } from "./promptHelpers.ts";

/**
 * Audit "génération de plan IA" (suite PR #265) : après avoir corrigé
 * `getSportDistributionConstraint` et `buildObjectiveSportLockLines` pour
 * qu'ils respectent `catalogObjective` (l'objectif du CYCLE en cours d'une
 * fenêtre, vs `objective` l'objectif FINAL du plan), un audit systématique de
 * tous les usages de `config.objective` dans ce fichier a trouvé deux autres
 * blocs qui recréaient exactement la même contradiction :
 *
 * - "RAPPEL COHÉRENCE IRONMAN/70.3" (`objKeyForRappel`) : réinjecte
 *   littéralement "Vélo 45-55% | CAP 25-35% | Natation 15-20%, min 3
 *   natation/sem, 4 vélo/sem" + des IDs catalogue natation/vélo dédiés.
 * - "DOUBLES/TRIPLES SÉANCES" (`objKeyForTriCheck`) : impose un nombre
 *   minimum de séances natation/vélo/course par jour et par semaine.
 *
 * Ces deux blocs tournaient SANS CONDITION à chaque bloc généré pour tout
 * plan dont l'objectif FINAL est Ironman/70.3 — y compris pour une fenêtre
 * du cycle intermédiaire Marathon, où le verrou sport (déjà corrigé) interdit
 * pourtant la natation. Fix : les deux utilisent désormais
 * `config.catalogObjective ?? config.objective`, même logique que
 * `resolveSystemPromptObjective` (jsonPlanHandler.ts, PR #263).
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

Deno.test("buildUserPrompt — fenêtre SANS catalogObjective (cycle final/plan mono-objectif Ironman) : garde RAPPEL COHÉRENCE IRONMAN et DOUBLES/TRIPLES SÉANCES", () => {
  const prompt = buildUserPrompt({}, baseConfig());
  assertStringIncludes(prompt, "RAPPEL COHÉRENCE IRONMAN");
  assertStringIncludes(prompt, "DOUBLES/TRIPLES SÉANCES");
});

Deno.test("buildUserPrompt — fenêtre AVEC catalogObjective=Marathon (cycle intermédiaire d'un plan Ironman) : ni RAPPEL COHÉRENCE IRONMAN ni DOUBLES/TRIPLES SÉANCES", () => {
  const prompt = buildUserPrompt({}, baseConfig({ catalogObjective: "Marathon" }));
  assert(
    !prompt.includes("RAPPEL COHÉRENCE IRONMAN"),
    "le rappel de ratios Ironman (natation/vélo obligatoires) ne doit plus apparaître pour une fenêtre du cycle Marathon — même contradiction que le bug corrigé en PR #265, via un autre bloc du prompt.",
  );
  assert(
    !prompt.includes("DOUBLES/TRIPLES SÉANCES"),
    "l'exigence de doubles/triples natation+vélo+course ne doit plus apparaître pour une fenêtre du cycle Marathon.",
  );
});

Deno.test("buildUserPrompt — fenêtre AVEC catalogObjective=70.3 (cycle intermédiaire d'un plan Ironman) : RAPPEL COHÉRENCE 70.3 et DOUBLES/TRIPLES SÉANCES réapparaissent (toujours triathlon)", () => {
  const prompt = buildUserPrompt({}, baseConfig({ catalogObjective: "70.3" }));
  assertStringIncludes(prompt, "RAPPEL COHÉRENCE 70.3");
  assertStringIncludes(prompt, "DOUBLES/TRIPLES SÉANCES");
});

Deno.test("buildUserPrompt — plan mono-objectif Marathon (sans catalogObjective) : comportement déjà correct, non régressé", () => {
  const prompt = buildUserPrompt({}, baseConfig({ objective: "Marathon" }));
  assert(!prompt.includes("RAPPEL COHÉRENCE IRONMAN"));
  assert(!prompt.includes("DOUBLES/TRIPLES SÉANCES"));
});
