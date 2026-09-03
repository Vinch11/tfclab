import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { getSystemPrompt, getSystemPromptJSON } from "./systemPrompt.ts";

/**
 * Audit fiabilité génération de plan IA : `getSystemPrompt` émettait TOUJOURS
 * 4 règles de format Markdown formulées avec l'emphase la plus forte du
 * prompt (🔴 RÈGLE #0 — BLOQUANTE, À LIRE EN PREMIER ; RÈGLE ANTI-SEMAINE
 * VIDE — CRITIQUE ; RÈGLE COLONNE DÉTAILS — CRITIQUE, NON NÉGOCIABLE ;
 * RÈGLE MARQUEUR 🔑 — OBLIGATOIRE, NON NÉGOCIABLE), et `getSystemPromptJSON`
 * les annulait ensuite dans un appendix ajouté ~1000 lignes plus loin.
 * Une instruction très emphatique en tête de prompt, contredite bien plus
 * tard, est un facteur de risque de contamination de format connu. Corrigé
 * en rendant `getSystemPrompt` conscient du mode JSON (`isJsonMode`) : ces
 * 4 règles ne sont plus émises du tout dans ce mode, plutôt que d'être
 * neutralisées après coup.
 */

Deno.test("getSystemPrompt() sans isJsonMode : conserve EXACTEMENT le comportement Markdown legacy (chemin index.ts)", () => {
  const prompt = getSystemPrompt({ objective: "IM" });
  assertStringIncludes(prompt, "RÈGLE #0 — TITRE H1 DU PLAN (BLOQUANTE, À LIRE EN PREMIER)");
  assertStringIncludes(prompt, "Le tout premier caractère du plan DOIT être");
  assertStringIncludes(prompt, "RÈGLE ANTI-SEMAINE VIDE (CRITIQUE)");
  assertStringIncludes(prompt, 'RÈGLE COLONNE "DÉTAILS" (CRITIQUE — NON NÉGOCIABLE)');
  assertStringIncludes(prompt, "RÈGLE MARQUEUR 🔑 SÉANCES CLÉS (OBLIGATOIRE — NON NÉGOCIABLE)");
});

Deno.test("getSystemPrompt({isJsonMode:true}) : les 4 règles de format Markdown ne sont PLUS émises du tout", () => {
  const prompt = getSystemPrompt({ objective: "IM", isJsonMode: true });
  assert(!prompt.includes("TITRE H1 DU PLAN (BLOQUANTE"), "règle H1 Markdown ne doit plus apparaître en mode JSON");
  assert(!prompt.includes("Le tout premier caractère du plan DOIT être"), "instruction contradictoire avec la sortie JSON");
  assert(!prompt.includes("RÈGLE ANTI-SEMAINE VIDE"), "règle tableau Markdown ne doit plus apparaître en mode JSON");
  assert(!prompt.includes('RÈGLE COLONNE "DÉTAILS"'), "règle colonne Markdown ne doit plus apparaître en mode JSON");
  assert(!prompt.includes("RÈGLE MARQUEUR 🔑"), "règle marqueur emoji ne doit plus apparaître en mode JSON");
  // La règle #0 est remplacée par son équivalent JSON-aware, pas supprimée sans rien.
  assertStringIncludes(prompt, "RÈGLE #0 — FORMAT DE SORTIE (BLOQUANTE, À LIRE EN PREMIER)");
  assertStringIncludes(prompt, "isKeySession");
  // Le reste du prompt (méthodologie, ratios, verrous sport) doit rester intact.
  assertStringIncludes(prompt, "RATIOS SPORT/VOLUME PAR OBJECTIF");
});

Deno.test("getSystemPromptJSON() : plus de contradiction — aucune règle Markdown à annuler, l'appendix reste cohérent", () => {
  const prompt = getSystemPromptJSON({ objective: "70.3" });
  assert(!prompt.includes("TITRE H1 DU PLAN (BLOQUANTE"), "le prompt JSON combiné ne doit plus contenir la règle H1 Markdown");
  assertStringIncludes(prompt, "MODE SORTIE JSON STRUCTURÉ");
  assertStringIncludes(prompt, "RÈGLES DE FORMAT — HORS SUJET DANS CE MODE");
});

Deno.test("getSystemPrompt() par défaut (sans profile) : reste en mode Markdown (comportement historique inchangé)", () => {
  const prompt = getSystemPrompt();
  assertStringIncludes(prompt, "RÈGLE #0 — TITRE H1 DU PLAN (BLOQUANTE, À LIRE EN PREMIER)");
});
