import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildUserPrompt } from "./promptHelpers.ts";

/**
 * Régression réelle (audit "génération de plan IA" — plans Manu ET Emanuela,
 * tous deux Ironman + Marathon intermédiaire) : après la PR #263
 * (`resolveSystemPromptObjective`, système prompt cycle-aware) et la PR sur
 * la persistance de `raceGoals`, le cycle Marathon (ex. S1-S21) affichait
 * TOUJOURS de la natation (~4x/sem) et du vélo (~2-3x/sem) complets — mais
 * ces séances portaient un tag `[CUSTOM]` (pas d'ID catalogue), alors que
 * les séances de course avaient de vrais IDs.
 *
 * Cause racine : PR #263 ne corrigeait QUE le system prompt
 * (`buildObjectiveSportLock`, systemPrompt.ts). Le USER prompt
 * (`buildUserPrompt`, ce fichier) contenait DEUX autres blocs qui
 * utilisaient encore `config.objective` (l'objectif FINAL, "Ironman") sans
 * jamais regarder `config.catalogObjective` (l'objectif du CYCLE, "Marathon") :
 *
 * 1. `getSportDistributionConstraint(...)` — imposait "Natation minimum
 *    X%, Vélo minimum Y% — CIBLES ABSOLUES, tout plan qui ne les respecte
 *    pas sera REJETÉ" (référentiel Ironman), alors même que le system
 *    prompt disait "NATATION INTERDITE" pour ce cycle et que le catalogue
 *    envoyé pour ces semaines ne contenait plus aucune fiche natation/vélo.
 * 2. `buildObjectiveSportLockLines(...)` — ne produisait JAMAIS le verrou
 *    "RUNNING ROUTE" pour une fenêtre du cycle Marathon, puisque
 *    `mapObjectiveToSport("Ironman")` ne résout jamais vers `run_route`.
 *
 * Coincé entre "0 fiche natation/vélo disponible" et "minimum obligatoire
 * de volume natation/vélo", le modèle inventait des séances hors-catalogue
 * (d'où le tag [CUSTOM] observé dans les plans réels) plutôt que de
 * respecter l'interdiction. Fix : les deux blocs utilisent désormais
 * `config.catalogObjective ?? config.objective`, comme
 * `resolveSystemPromptObjective` (jsonPlanHandler.ts) pour le system prompt.
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

Deno.test("buildUserPrompt — fenêtre SANS catalogObjective (cycle final/plan mono-objectif Ironman) : garde la contrainte de ratio sportif Ironman ET aucun verrou RUNNING ROUTE", () => {
  const prompt = buildUserPrompt({}, baseConfig());
  assertStringIncludes(prompt, "🏊 Natation");
  assertStringIncludes(prompt, "CIBLES ABSOLUES");
  assert(!prompt.includes("VERROU SPORT OBJECTIF — RUNNING ROUTE"), "un plan Ironman sans catalogObjective ne doit jamais recevoir le verrou RUNNING ROUTE");
});

Deno.test("buildUserPrompt — fenêtre AVEC catalogObjective=Marathon (cycle intermédiaire d'un plan Ironman) : plus de contrainte de ratio natation/vélo, verrou RUNNING ROUTE actif", () => {
  const prompt = buildUserPrompt({}, baseConfig({ catalogObjective: "Marathon" }));
  assert(
    !prompt.includes("🏊 Natation"),
    "la contrainte de ratio sportif Ironman (natation/vélo minimum obligatoire) ne doit plus apparaître pour une fenêtre du cycle Marathon — c'est exactement la contradiction qui faisait inventer des séances natation/vélo [CUSTOM]",
  );
  assertStringIncludes(prompt, "VERROU SPORT OBJECTIF — RUNNING ROUTE");
  assertStringIncludes(prompt, "NATATION INTERDITE");
});

Deno.test("buildUserPrompt — plan mono-objectif Marathon (sans catalogObjective) : comportement déjà correct, non régressé", () => {
  const prompt = buildUserPrompt({}, baseConfig({ objective: "Marathon" }));
  assert(!prompt.includes("🏊 Natation"));
  assertStringIncludes(prompt, "VERROU SPORT OBJECTIF — RUNNING ROUTE");
  assertStringIncludes(prompt, "NATATION INTERDITE");
});
