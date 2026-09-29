import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildUserPrompt } from "./promptHelpers.ts";

/**
 * Bug réel (audit "plan multi-objectifs Sables d'Olonne", plan Ironman 39
 * semaines Marathon→Ironman, relayé via revue ChatGPT) : la natation était
 * totalement absente du cycle Marathon (S1-S21), MÊME quand le coach cochait
 * "🏊 Natation en maintien léger" dans AITrainingPlanPage.tsx (qui pose
 * `config.crossTrainingMaintenance.natation = true`).
 *
 * Root cause : `buildObjectiveSportLockLines` (déjà correct) consulte bien
 * `resolveCrossTrainingMaintenance(config)` et affiche "✅ NATATION AUTORISÉE
 * EN MAINTIEN LÉGER" quand la case est cochée — mais le bloc "Doubles et
 * triples séances" (même fichier, `maxSessionsPerDay === 3`) affichait
 * TOUJOURS, sans jamais consulter ce même flag : "⛔ INTERDICTION ABSOLUE :
 * AUCUNE séance de natation dans ce plan". Les deux instructions se
 * contredisaient frontalement dans le MÊME prompt envoyé au modèle, qui a
 * suivi l'interdiction absolue.
 *
 * Fix : le bloc "Doubles et triples séances" réutilise désormais
 * `resolveCrossTrainingMaintenance`/`buildCrossTrainingPhrase` — même source
 * de vérité que `buildObjectiveSportLockLines`, aucune logique dupliquée.
 */
function baseConfig(overrides: Record<string, unknown> = {}) {
  return {
    objective: "Ironman",
    ambition: "Confirmé",
    weeksAvailable: 39,
    identifiedLimitersRaw: [],
    maxSessionsPerDay: 3,
    ...overrides,
  };
}

Deno.test("buildUserPrompt — cycle Marathon intermédiaire (maxSessionsPerDay=3), natation cochée : le bloc 'Doubles et triples' n'interdit plus la natation", () => {
  const prompt = buildUserPrompt({}, baseConfig({
    catalogObjective: "Marathon",
    crossTrainingMaintenance: { velo: true, natation: true },
  }));
  assertStringIncludes(prompt, "RÈGLE STRICTE : Doubles et triples séances OBLIGATOIRES");
  assert(
    !prompt.includes("INTERDICTION ABSOLUE : AUCUNE séance de natation"),
    "le bloc doubles/triples ne doit plus contredire la case 'maintien natation' cochée par le coach",
  );
  assertStringIncludes(prompt, "Natation autorisée en maintien léger");
});

Deno.test("buildUserPrompt — cycle Marathon intermédiaire, natation NON cochée : la natation reste bien interdite", () => {
  const prompt = buildUserPrompt({}, baseConfig({
    catalogObjective: "Marathon",
    crossTrainingMaintenance: { velo: true, natation: false },
  }));
  assertStringIncludes(prompt, "Natation 0%");
  assert(
    !prompt.includes("Natation autorisée en maintien léger"),
    "sans la case cochée, la natation ne doit pas être présentée comme autorisée",
  );
});

Deno.test("buildUserPrompt — plan mono-objectif Marathon (pas de catalogObjective), aucune maintenance configurée : comportement par défaut inchangé (vélo récup oui, natation non)", () => {
  const prompt = buildUserPrompt({}, baseConfig({ objective: "Marathon" }));
  assertStringIncludes(prompt, "Vélo autorisé UNIQUEMENT en récupération active");
  assertStringIncludes(prompt, "Natation 0%");
});

Deno.test("buildUserPrompt — plan Ironman (tri), natation cochée : le bloc triathlon n'est pas affecté par ce fix (chemin isTriPlan inchangé)", () => {
  const prompt = buildUserPrompt({}, baseConfig({
    objective: "Ironman",
    crossTrainingMaintenance: { velo: true, natation: true },
  }));
  assertStringIncludes(prompt, "Exemple de structure semaine type TRIATHLON");
});
