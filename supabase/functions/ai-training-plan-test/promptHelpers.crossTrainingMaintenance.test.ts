import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildUserPrompt } from "./promptHelpers.ts";

/**
 * Feature "maintien croisé configurable" (retour coach, plan Emanuela) :
 * pour un objectif résolu run_route/trail (Marathon, Semi, 10K, 5K, Trail...),
 * le prompt autorisait TOUJOURS un peu de vélo Z1 en récupération mais
 * bannissait TOUJOURS la natation à 0%, sans que le coach puisse changer ce
 * choix — alors que les deux sont physiologiquement valables en maintien
 * léger pendant un cycle intermédiaire d'un plan multi-objectifs (ex. cycle
 * Marathon d'un plan Ironman). `PlanConfig.crossTrainingMaintenance`
 * (`{ velo?, natation? }`) rend ce choix configurable ; omis, le
 * comportement historique (vélo autorisé, natation interdite) est préservé.
 *
 * `resolveCrossTrainingMaintenance`/`buildCrossTrainingPhrase` centralisent
 * la résolution pour que le VERROU SPORT (`buildObjectiveSportLockLines`) et
 * les RAPPEL COHÉRENCE texturels (Marathon/Semi/10K/5K) ne puissent jamais
 * diverger — cf. la classe de bug déjà rencontrée avec `catalogObjective`
 * (deux blocs redisant la même règle, qui finissent par se contredire).
 */

function baseConfig(overrides: Record<string, unknown> = {}) {
  return {
    objective: "Marathon",
    ambition: "Confirmé",
    weeksAvailable: 12,
    identifiedLimitersRaw: [],
    ...overrides,
  };
}

Deno.test("buildUserPrompt — objectif Marathon, sans crossTrainingMaintenance : comportement historique (vélo récup autorisé, natation interdite)", () => {
  const prompt = buildUserPrompt({}, baseConfig());
  assertStringIncludes(prompt, "NATATION INTERDITE");
  assertStringIncludes(prompt, "VÉLO AUTORISÉ EN RÉCUPÉRATION ACTIVE UNIQUEMENT");
  assertStringIncludes(prompt, "Natation 0%");
});

Deno.test("buildUserPrompt — objectif Marathon, crossTrainingMaintenance.natation=true : natation autorisée en maintien léger, plus de bannissement", () => {
  const prompt = buildUserPrompt({}, baseConfig({ crossTrainingMaintenance: { natation: true } }));
  assert(!prompt.includes("NATATION INTERDITE"), "la natation ne doit plus être bannie quand le coach active le maintien natation");
  assertStringIncludes(prompt, "NATATION AUTORISÉE EN MAINTIEN LÉGER");
  assertStringIncludes(prompt, "Natation autorisée en maintien léger");
  // Le vélo reste autorisé par défaut (velo non précisé => true).
  assertStringIncludes(prompt, "VÉLO AUTORISÉ EN RÉCUPÉRATION ACTIVE UNIQUEMENT");
});

Deno.test("buildUserPrompt — objectif Marathon, crossTrainingMaintenance.velo=false : vélo interdit y compris en récupération", () => {
  const prompt = buildUserPrompt({}, baseConfig({ crossTrainingMaintenance: { velo: false } }));
  assert(!prompt.includes("VÉLO AUTORISÉ EN RÉCUPÉRATION ACTIVE UNIQUEMENT"), "le vélo ne doit plus être autorisé quand le coach le désactive explicitement");
  assertStringIncludes(prompt, "VÉLO INTERDIT");
  // La natation reste interdite par défaut (natation non précisé => false).
  assertStringIncludes(prompt, "NATATION INTERDITE");
});

Deno.test("buildUserPrompt — cycle Marathon intermédiaire (catalogObjective) d'un plan Ironman, natation=true : le verrou cycle-aware respecte aussi le toggle coach", () => {
  const prompt = buildUserPrompt({}, {
    objective: "Ironman",
    catalogObjective: "Marathon",
    ambition: "Confirmé",
    weeksAvailable: 8,
    identifiedLimitersRaw: [],
    crossTrainingMaintenance: { natation: true },
  });
  assertStringIncludes(prompt, "VERROU SPORT OBJECTIF — RUNNING ROUTE");
  assert(!prompt.includes("NATATION INTERDITE"));
  assertStringIncludes(prompt, "NATATION AUTORISÉE EN MAINTIEN LÉGER");
});

Deno.test("buildUserPrompt — RAPPEL COHÉRENCE MARATHON reflète le toggle coach (pas de divergence avec le VERROU SPORT)", () => {
  const promptDefault = buildUserPrompt({}, baseConfig());
  const promptNatationOn = buildUserPrompt({}, baseConfig({ crossTrainingMaintenance: { natation: true } }));
  assertStringIncludes(promptDefault, "RAPPEL COHÉRENCE MARATHON");
  assertStringIncludes(promptDefault, "Natation 0%");
  assertStringIncludes(promptNatationOn, "RAPPEL COHÉRENCE MARATHON");
  assert(
    !promptNatationOn.includes("Natation 0%"),
    "le RAPPEL COHÉRENCE MARATHON ne doit pas continuer à dire 'Natation 0%' quand le VERROU SPORT autorise le maintien natation",
  );
});

Deno.test("buildUserPrompt — objectif Trail, crossTrainingMaintenance.natation=true : natation de maintien autorisée", () => {
  const prompt = buildUserPrompt({}, baseConfig({ objective: "Trail", crossTrainingMaintenance: { natation: true } }));
  assertStringIncludes(prompt, "VERROU SPORT OBJECTIF — TRAIL");
  assert(!prompt.includes("NATATION INTERDITE"));
  assertStringIncludes(prompt, "NATATION AUTORISÉE EN MAINTIEN LÉGER");
});
