import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildUserPrompt, buildStructuredDiagnosticBlock } from "./promptHelpers.ts";

/**
 * Bug reel (audit ambition "Elite") : `config.ambition` transmis au prompt
 * est TOUJOURS le libelle UI actuel ("Decouverte"/"Confirme"/"Competiteur"/
 * "Qualifiable"/"Elite" - voir src/types/ambitionLevel.ts), jamais une des
 * cles canoniques litterales ("finisher"/"age_group"/.../"world_class").
 * Plusieurs blocs de buildUserPrompt comparaient pourtant `config.ambition`
 * par egalite stricte a ces cles (`ambition === "world_class"`,
 * `ambition === "elite"`) sans jamais passer par normalizeAmbKey : pour un
 * athlete "Elite" (top 3% AG, palier world_class), ces comparaisons
 * tombaient systematiquement dans la branche "elite" (top 10% AG, ancien
 * palier interne "Qualifiable") ou pire, dans la branche FINISHER par
 * defaut (garde-fou doubles/triples IM/70.3) - et le garde-fou sante
 * "Master 50+ x world_class" ne se declenchait JAMAIS.
 */
function minimalConfig(overrides: Record<string, unknown> = {}) {
  return {
    objective: "703",
    ambition: "Elite",
    age: 55,
    weeksAvailable: 12,
    raceGoals: [{ objective: "703", priority: "A" }],
    ...overrides,
  };
}

Deno.test("buildUserPrompt — ambition 'Elite' (libelle) declenche la branche WORLD CLASS des doubles/triples IM/70.3, pas ELITE", () => {
  const prompt = buildUserPrompt({}, minimalConfig());
  assertStringIncludes(prompt, "Ambition WORLD CLASS (top 3% AG)");
  assert(
    !prompt.includes("Ambition ELITE (top 10% AG)"),
    "ne doit pas retrograder un athlete 'Elite' (world_class) vers le garde-fou doubles/triples de l'ancien palier interne 'elite' (Qualifiable)",
  );
});

Deno.test("buildUserPrompt — ambition 'Qualifiable' (ancien palier elite) declenche bien la branche ELITE, pas WORLD CLASS", () => {
  const prompt = buildUserPrompt({}, minimalConfig({ ambition: "Qualifiable" }));
  assertStringIncludes(prompt, "Ambition ELITE (top 10% AG)");
  assert(!prompt.includes("Ambition WORLD CLASS (top 3% AG)"));
});

Deno.test("buildStructuredDiagnosticBlock — garde-fou Master 50+ x world_class se declenche pour un athlete 'Elite' de 55 ans", () => {
  // Ce garde-fou vit dans buildStructuredDiagnosticBlock (AUDIT LOT #2), pas
  // buildUserPrompt — les deux sont concaténés dans le prompt réel envoyé au
  // LLM (jsonPlanHandler.ts : baseUserPrompt + structuredDiagnostic). Le test
  // visait la mauvaise fonction depuis un refactor antérieur (jamais détecté
  // faute de CI exécutant réellement ce fichier) : corrigé sans changer
  // l'intention du test (vérifier que ce garde-fou santé se déclenche bien).
  const diag = buildStructuredDiagnosticBlock(minimalConfig({ objective: "Marathon", age: 55 }), 12);
  assertStringIncludes(diag, "MASTER 50+ × WORLD_CLASS");
});

Deno.test("buildUserPrompt — ambition 'Confirme' (age_group) declenche bien la branche AGE GROUP, pas FINISHER", () => {
  const prompt = buildUserPrompt({}, minimalConfig({ ambition: "Confirmé" }));
  assertStringIncludes(prompt, "Ambition AGE GROUP");
  assert(!prompt.includes("Ambition FINISHER"));
});
