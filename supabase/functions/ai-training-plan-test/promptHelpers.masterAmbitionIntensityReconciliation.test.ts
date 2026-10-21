import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildUserPrompt } from "./promptHelpers.ts";
import { getSystemPrompt } from "./systemPrompt.ts";

/**
 * Audit Codex (oct. 2026), P0-2 — confirmé sur le profil réel B-10K-TO-70.3
 * (42 ans, ambition "elite" → qualitesParSemaine=3, trainingLevel "trained") :
 * systemPrompt.ts affirmait un plafond ABSOLU fondé sur l'âge seul ("max 2
 * intensités/sem" pour >40 ans, "MAX 1 séance VO2max/sem + 1 seuil/sem" pour
 * >50 ans — à la fois dans le bloc dynamique `buildSpecializedSections` ET
 * dans la section de référence statique "MASTER ATHLETES >40/>50 ans"),
 * pendant que promptHelpers.ts affirmait séparément, dans le MÊME prompt,
 * "STRUCTURE AMBITION (non négociable) : 3 qualité(s)/semaine" — deux
 * nombres "non négociables" contradictoires pour le même athlète. Consigne
 * coach explicite : définir une règle individualisée, SANS considérer l'âge
 * seul comme une justification scientifique universelle. Fix : le COMPTAGE
 * de séances est désormais piloté EXCLUSIVEMENT par STRUCTURE AMBITION ;
 * l'âge ne gouverne plus que la RÉCUPÉRATION (espacement entre séances
 * d'intensité, charge 2:1, repos, renfo) — jamais le nombre de séances.
 */
function b10kTo703Config(overrides: Record<string, unknown> = {}) {
  return {
    objective: "IRONMAN 70.3",
    ambition: "Qualifiable", // → clé canonique "elite", qualitesParSemaine=3
    weeklyHours: 17,
    weeksAvailable: 32,
    raceGoals: [{ objective: "IRONMAN 70.3", priority: "A" }],
    ...overrides,
  };
}

Deno.test("buildUserPrompt — athlète 42 ans, ambition elite : STRUCTURE AMBITION affiche 3/sem, jamais réduit à 2 par l'âge seul", () => {
  const prompt = buildUserPrompt({ age: 42 }, b10kTo703Config());
  assertStringIncludes(prompt, "STRUCTURE AMBITION (non négociable) :** 3 qualité(s)/semaine");
  assert(
    !prompt.includes("STRUCTURE AMBITION (non négociable) :** 2 qualité(s)/semaine"),
    "l'âge seul (42 ans, règle Master >40) ne doit plus plafonner silencieusement le nombre de qualités/sem fixé par l'ambition (contradiction confirmée, audit Codex P0-2)",
  );
  // Rappel explicite des règles de récupération Master, mais sans réduire le nombre.
  assertStringIncludes(prompt, "Athlète 42 ans (règles MASTER");
  assertStringIncludes(prompt, "espacement ≥48h");
});

Deno.test("buildUserPrompt — athlète 55 ans, ambition elite : même principe, espacement 72h (pas 48h), nombre toujours piloté par l'ambition", () => {
  const prompt = buildUserPrompt({ age: 55 }, b10kTo703Config());
  assertStringIncludes(prompt, "STRUCTURE AMBITION (non négociable) :** 3 qualité(s)/semaine");
  assertStringIncludes(prompt, "espacement ≥72h");
});

Deno.test("buildUserPrompt — athlète <40 ans : aucune mention Master ajoutée (comportement inchangé)", () => {
  const prompt = buildUserPrompt({ age: 30 }, b10kTo703Config());
  assertStringIncludes(prompt, "STRUCTURE AMBITION (non négociable) :** 3 qualité(s)/semaine");
  assert(!prompt.includes("règles MASTER"));
});

Deno.test("buildUserPrompt — age absent (data vide) : comportement historique inchangé, aucun crash", () => {
  const prompt = buildUserPrompt({}, b10kTo703Config());
  assertStringIncludes(prompt, "STRUCTURE AMBITION (non négociable) :** 3 qualité(s)/semaine");
  assert(!prompt.includes("règles MASTER"));
});

Deno.test("getSystemPrompt — bloc dynamique MASTER 40-49 ans : plus de plafond numérique concurrent, renvoie vers STRUCTURE AMBITION", () => {
  const prompt = getSystemPrompt({ age: 42 });
  assertStringIncludes(prompt, "PROFIL MASTER 42 ANS");
  assert(
    !/max 2 intensit/i.test(prompt),
    "le bloc dynamique Master 40-49 ne doit plus affirmer un plafond absolu 'max 2 intensités/sem' qui contredirait STRUCTURE AMBITION",
  );
  assertStringIncludes(prompt, "STRUCTURE AMBITION");
});

Deno.test("getSystemPrompt — bloc dynamique MASTER 50+ ans : plus de plafond numérique concurrent, renvoie vers STRUCTURE AMBITION", () => {
  const prompt = getSystemPrompt({ age: 55 });
  assertStringIncludes(prompt, "PROFIL MASTER 55+ ANS");
  assert(
    !/max 1 s[ée]ance vo2max/i.test(prompt),
    "le bloc dynamique Master 50+ ne doit plus affirmer un plafond absolu 'MAX 1 séance VO2max/sem + 1 seuil/sem'",
  );
  assertStringIncludes(prompt, "STRUCTURE AMBITION");
});

Deno.test("getSystemPrompt — section de référence statique 'MASTER ATHLETES >40/>50 ans' : plus de nombre absolu concurrent", () => {
  const prompt = getSystemPrompt();
  assertStringIncludes(prompt, "MASTER ATHLETES >40/>50 ans");
  assert(!/max 2 intensit/i.test(prompt));
  assert(!/max 1 intensit/i.test(prompt));
  assertStringIncludes(prompt, "n'est JAMAIS fixé par l'âge seul");
});
