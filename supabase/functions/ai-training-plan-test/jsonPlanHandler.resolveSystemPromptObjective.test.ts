import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { resolveSystemPromptObjective } from "./jsonPlanHandler.ts";
import { getSystemPromptJSON } from "./systemPromptJSON.ts";

/**
 * Régression réelle (audit "génération de plan IA", plan Ironman/Marathon
 * intermédiaire — retour coach : "le Marathon est bien reconnu [dans le
 * découpage], mais il ne se traduit ni en jour de course ni en catalogue
 * réduit"). Diagnostic Lovable confirmé : `computeObjectiveCycleSegments`
 * détecte bien le cycle Marathon (S1-21) puis Ironman (S24-39) — la
 * segmentation elle-même n'est pas en cause.
 *
 * Cause racine trouvée en tracant `handleJSONPlanRequest` : le profil envoyé
 * à `getSystemPromptJSON` utilisait TOUJOURS `planConfig.objective` (l'objectif
 * FINAL du plan, "Ironman" — design volontaire, cf. PlanConfig.catalogObjective
 * côté client, jamais modifié). `buildObjectiveSportLock` (systemPrompt.ts)
 * réagit à cet objectif en imposant "3 disciplines OBLIGATOIRES : natation +
 * vélo + CAP chaque semaine active" pour Ironman — une instruction dure et
 * explicite qui contredit frontalement le catalogue course/renfo envoyé pour
 * les fenêtres du cycle Marathon (PR #259), et que le modèle suit à la place
 * du catalogue. Fix : utiliser `catalogObjective` (objectif du CYCLE EN COURS,
 * déjà calculé côté client par `buildWindowRegenConfig`) quand présent.
 */
Deno.test("resolveSystemPromptObjective : catalogObjective prime sur objective quand présent (fenêtre d'un cycle intermédiaire)", () => {
  const planConfig = { objective: "Ironman", catalogObjective: "Marathon" };
  const result = resolveSystemPromptObjective(planConfig);
  assert(result === "Marathon", `attendu "Marathon", reçu "${result}"`);
});

Deno.test("resolveSystemPromptObjective : retombe sur objective en l'absence de catalogObjective (plan mono-objectif, ou fenêtre du cycle final)", () => {
  const planConfig = { objective: "Ironman" };
  const result = resolveSystemPromptObjective(planConfig);
  assert(result === "Ironman", `attendu "Ironman", reçu "${result}"`);
});

Deno.test("resolveSystemPromptObjective : gère un planConfig vide/absent sans lever", () => {
  assert(resolveSystemPromptObjective(undefined) === null);
  assert(resolveSystemPromptObjective({}) === null);
});

Deno.test("Mirror bout en bout : catalogObjective='Marathon' fait bien passer le verrou sport JSON de 'Ironman' (3 disciplines obligatoires) à 'course route' (natation interdite)", () => {
  const planConfig = { objective: "Ironman", catalogObjective: "Marathon" };
  const objectiveForPrompt = resolveSystemPromptObjective(planConfig);
  const prompt = getSystemPromptJSON({ objective: objectiveForPrompt });

  // Sans le fix, ce prompt contiendrait encore le verrou Ironman ci-dessous —
  // exactement la contradiction qui faisait ignorer le catalogue restreint.
  assert(
    !prompt.includes("3 disciplines OBLIGATOIRES : natation + vélo + CAP chaque semaine active"),
    "le verrou sport Ironman (natation+vélo obligatoires) ne doit plus apparaître pour une fenêtre du cycle Marathon",
  );
  assertStringIncludes(prompt, "VERROU SPORT OBJECTIF — COURSE ROUTE");
  assertStringIncludes(prompt, "NATATION INTERDITE");
});

Deno.test("Mirror bout en bout : sans catalogObjective (objectif final ou plan mono-objectif Ironman), le verrou sport reste Ironman", () => {
  const planConfig = { objective: "Ironman" };
  const objectiveForPrompt = resolveSystemPromptObjective(planConfig);
  const prompt = getSystemPromptJSON({ objective: objectiveForPrompt });

  assertStringIncludes(prompt, "VERROU SPORT OBJECTIF — TRIATHLON IRONMAN");
  assertStringIncludes(prompt, "3 disciplines OBLIGATOIRES : natation + vélo + CAP chaque semaine active");
});
