import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";

/**
 * Audit "génération de plan IA" (suite PR #263) : `resolveSystemPromptObjective`
 * (jsonPlanHandler.ts) fait déjà préférer `catalogObjective` (objectif du
 * cycle en cours pour une fenêtre d'un plan multi-objectif) sur `objective`
 * (objectif final du plan) pour le chemin JSON — mais `index.ts` (le chemin
 * Markdown legacy) ne l'a jamais reçu. Ce chemin n'est pas mort : un
 * commentaire du fichier lui-même le documente comme FALLBACK automatique
 * quand la génération JSON échoue (cf. useAITrainingPlan.ts côté client).
 * Sans ce fix, tomber sur ce fallback pendant une fenêtre du cycle
 * intermédiaire Marathon d'un plan Ironman réintroduirait le verrou sport
 * "3 disciplines OBLIGATOIRES" (buildObjectiveSportLock) + le few-shot
 * Frodeno IM, exactement le bug corrigé côté JSON par la PR #263.
 *
 * `index.ts` est le point d'entrée HTTP complet de la fonction edge (appelle
 * `serve(...)`) — non testable bout-en-bout ici. Ce test vérifie donc, en
 * lisant le SOURCE, que l'appel à `getSystemPrompt` résout bien l'objectif
 * via `catalogObjective ?? objective` plutôt que `objective` seul.
 */

const source = Deno.readTextFileSync(new URL("./index.ts", import.meta.url));

Deno.test("index.ts (chemin Markdown legacy) : systemPromptObjective priorise catalogObjective sur objective", () => {
  const idx = source.indexOf("const systemPromptObjective =");
  assert(idx >= 0, "la résolution catalogObjective-aware de l'objectif du system prompt a disparu de index.ts");
  const line = source.slice(idx, source.indexOf("\n", idx));
  assert(
    line.includes("planConfig?.catalogObjective ?? planConfig?.objective"),
    "systemPromptObjective ne priorise plus catalogObjective — le fallback Markdown redeviendrait insensible au cycle en cours d'un plan multi-objectif.",
  );
});

Deno.test("index.ts : getSystemPrompt est bien appelé avec systemPromptObjective, pas directement planConfig?.objective", () => {
  const startIdx = source.indexOf("const baseSystemPrompt = getSystemPrompt({");
  assert(startIdx >= 0, "l'appel à getSystemPrompt (chemin Markdown) est introuvable");
  const endIdx = source.indexOf("});", startIdx);
  const body = source.slice(startIdx, endIdx);
  assert(
    body.includes("objective: systemPromptObjective"),
    "getSystemPrompt n'utilise plus la variable résolue systemPromptObjective pour son champ objective.",
  );
});
