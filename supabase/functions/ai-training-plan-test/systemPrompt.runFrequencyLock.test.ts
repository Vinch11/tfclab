import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { getSystemPrompt } from "./systemPrompt.ts";

/**
 * Bug réel (audit "génération de plan IA", plan Emanuela — coach : "tout le
 * debut de la semaine est uniquement composé de natation et velo, tout le
 * running est en fin de semaine"). Sur un plan Ironman généré par blocs (39
 * semaines), la course à pied se retrouvait systématiquement regroupée sur
 * vendredi/samedi/dimanche pendant que mardi-mercredi-jeudi n'étaient QUE
 * natation+vélo — 3 jours d'affilée sans aucune touche course, puis 3 jours
 * d'affilée à fort impact (course + brique + long run).
 *
 * Investigation : les semaines-types few-shot (Frodeno IM, Lucy 70.3)
 * alternent déjà course/non-course tous les 1-2 jours — mais une simple
 * imitation d'exemple, sans règle explicite, n'a pas suffi à empêcher le
 * modèle de dériver vers un regroupement plus marqué au fil d'une génération
 * longue par blocs. Fix : une règle EXPLICITE "jamais 2 jours consécutifs
 * sans touche course" ajoutée au verrou sport de chaque objectif triathlon
 * (Sprint, Olympique, 70.3, IM) — la course route (déjà 100% CAP) et le trail
 * n'ont pas ce risque de regroupement natation/vélo vs course.
 */

Deno.test("getSystemPrompt(IM) : contient la règle explicite anti-regroupement natation/vélo vs course", () => {
  const prompt = getSystemPrompt({ objective: "IM" });
  assertStringIncludes(prompt, "RÉPARTITION HEBDOMADAIRE");
  assertStringIncludes(prompt, "JAMAIS 2 JOURS CONSÉCUTIFS SANS TOUCHE COURSE");
});

Deno.test("getSystemPrompt(70.3) : contient la même règle", () => {
  const prompt = getSystemPrompt({ objective: "70.3" });
  assertStringIncludes(prompt, "JAMAIS 2 JOURS CONSÉCUTIFS SANS TOUCHE COURSE");
});

Deno.test("getSystemPrompt(Triathlon Sprint) : contient la même règle", () => {
  const prompt = getSystemPrompt({ objective: "Sprint" });
  assertStringIncludes(prompt, "JAMAIS 2 JOURS CONSÉCUTIFS SANS TOUCHE COURSE");
});

Deno.test("getSystemPrompt(Triathlon Olympique) : contient la même règle", () => {
  const prompt = getSystemPrompt({ objective: "Olympique" });
  assertStringIncludes(prompt, "JAMAIS 2 JOURS CONSÉCUTIFS SANS TOUCHE COURSE");
});

Deno.test("getSystemPrompt(Marathon) : ne contient PAS cette règle (course route = déjà 100% CAP, natation interdite, pas de risque de regroupement)", () => {
  const prompt = getSystemPrompt({ objective: "Marathon" });
  assert(!prompt.includes("JAMAIS 2 JOURS CONSÉCUTIFS SANS TOUCHE COURSE"));
});

Deno.test("getSystemPrompt(Trail) : ne contient PAS cette règle (pas de risque de regroupement natation/vélo vs course)", () => {
  const prompt = getSystemPrompt({ objective: "Trail" });
  assert(!prompt.includes("JAMAIS 2 JOURS CONSÉCUTIFS SANS TOUCHE COURSE"));
});

Deno.test("getSystemPrompt(IM) : les semaines-types few-shot Frodeno/Lucy portent l'annotation d'alternance explicite", () => {
  const prompt = getSystemPrompt({ objective: "IM" });
  assertStringIncludes(prompt, "Remarque de structure");
  assertStringIncludes(prompt, "Reproduis cette alternance");
});
