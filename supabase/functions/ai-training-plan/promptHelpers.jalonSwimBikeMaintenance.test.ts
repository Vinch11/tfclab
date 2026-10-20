import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildUserPrompt } from "./promptHelpers.ts";

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #6 : transition
 * 10K → 70.3. `canBeIndependentPeak`/`INDEPENDENT_PEAK_ELIGIBLE_OBJECTIVES`
 * (sportRatioMatrix.ts) excluent délibérément 10K/5K/Semi/Sprint du statut
 * "pic complet" — ce n'est PAS le bug (cf. le commentaire qui l'explique :
 * un 10K reste TOUJOURS un test de forme à faible coût de récupération,
 * jamais un second objectif de saison). Le vrai bug est en aval, dans le
 * RAPPEL texte généré pour un jalon (`isFullPeak=false`) : un 10K-jalon
 * tombait TOUJOURS dans la branche générique ("séances spécifiques à cet
 * objectif"), sans aucun rappel natation/vélo — correct pour un objectif
 * FINAL run-only (rien à maintenir en triathlon), mais pas pour un plan
 * triathlon (703/IM final) où les 1-2 semaines "spécifiques course à pied"
 * avant ce jalon 10K risquaient de faire disparaître natation/vélo du plan
 * sans aucun rappel contraire (risque de concaténation identifié par
 * l'audit qualité plans IA). Corrigé en élargissant la branche natation+
 * vélo+briques (déjà utilisée pour un jalon IM/703) à TOUT jalon run-only
 * QUAND l'objectif FINAL du plan est lui-même triathlon (703/IM) — narrow :
 * seul `config.objective` (jamais celui du jalon) décide, et la branche
 * Marathon/Semi (calibrée pour un objectif final RUN-ONLY) n'est JAMAIS
 * atteinte différemment, quel que soit l'objectif final — aucune régression
 * sur ses propres règles d'affûtage Marathon.
 */
function baseConfig(overrides: Record<string, unknown> = {}) {
  return {
    ambition: "age_group",
    weeksAvailable: 20,
    identifiedLimitersRaw: [],
    ...overrides,
  };
}

Deno.test("buildUserPrompt — jalon 10K dans un plan 70.3 (final) : rappel natation+vélo+briques, plus le rappel générique sans triathlon", () => {
  const prompt = buildUserPrompt({}, baseConfig({
    objective: "703",
    raceGoals: [
      { objective: "10K", raceDate: "2027-01-10", priority: "B" },
      { objective: "703", raceDate: "2027-06-20", priority: "A" },
    ],
  }));
  assertStringIncludes(prompt, "RAPPEL : Jalon — 10K");
  assertStringIncludes(prompt, "Intégrer natation + vélo + briques dans la préparation vers ce jalon.");
  assert(
    !prompt.includes("Inclure des séances spécifiques à cet objectif dans les semaines précédant la date de course."),
    "le jalon 10K dans un plan 70.3 ne doit plus recevoir le rappel générique sans natation/vélo",
  );
});

Deno.test("buildUserPrompt — jalon 10K dans un plan Marathon (final run-only) : comportement INCHANGÉ, rappel générique sans natation/vélo", () => {
  const prompt = buildUserPrompt({}, baseConfig({
    objective: "Marathon",
    raceGoals: [
      { objective: "10K", raceDate: "2027-01-10", priority: "B" },
      { objective: "Marathon", raceDate: "2027-06-20", priority: "A" },
    ],
  }));
  assertStringIncludes(prompt, "RAPPEL : Jalon — 10K");
  assertStringIncludes(prompt, "Inclure des séances spécifiques à cet objectif dans les semaines précédant la date de course.");
  assert(
    !prompt.includes("Intégrer natation + vélo + briques dans la préparation vers ce jalon."),
    "un objectif final run-only (Marathon) ne doit jamais recevoir le rappel natation/vélo pour un jalon 10K",
  );
});

Deno.test("buildUserPrompt — jalon Marathon dans un plan IM (final) : règles d'affûtage Marathon INCHANGÉES, pas le rappel triathlon", () => {
  const prompt = buildUserPrompt({}, baseConfig({
    objective: "IM",
    raceGoals: [
      { objective: "Marathon", raceDate: "2027-01-10", priority: "B" },
      { objective: "IM", raceDate: "2027-06-20", priority: "A" },
    ],
  }));
  assertStringIncludes(prompt, "RAPPEL : Jalon — Marathon");
  assertStringIncludes(prompt, "Les semaines précédant ce jalon doivent inclure des séances spécifiques à l'allure Marathon.");
  assertStringIncludes(prompt, "Mini-taper 7-10j avant : réduction volume, rappels allure course.");
  assert(
    !prompt.includes("Intégrer natation + vélo + briques dans la préparation vers ce jalon."),
    "un jalon Marathon garde ses propres règles d'affûtage même dans un plan IM final — jamais le rappel triathlon générique",
  );
});

Deno.test("buildUserPrompt — jalon Semi dans un plan 70.3 (final) : règles d'affûtage Semi/Marathon INCHANGÉES, même logique que Marathon ci-dessus", () => {
  const prompt = buildUserPrompt({}, baseConfig({
    objective: "703",
    raceGoals: [
      { objective: "Semi", raceDate: "2027-01-10", priority: "B" },
      { objective: "703", raceDate: "2027-06-20", priority: "A" },
    ],
  }));
  assertStringIncludes(prompt, "Les semaines précédant ce jalon doivent inclure des séances spécifiques à l'allure Semi.");
  assert(!prompt.includes("Intégrer natation + vélo + briques dans la préparation vers ce jalon."));
});

Deno.test("buildUserPrompt — jalon IM dans un plan 70.3 (final) : comportement INCHANGÉ (déjà couvert avant ce fix)", () => {
  const prompt = buildUserPrompt({}, baseConfig({
    objective: "703",
    raceGoals: [
      { objective: "IM", raceDate: "2026-11-01", priority: "B" },
      { objective: "703", raceDate: "2027-06-20", priority: "A" },
    ],
  }));
  assertStringIncludes(prompt, "RAPPEL : Jalon — IM");
  assertStringIncludes(prompt, "Intégrer natation + vélo + briques dans la préparation vers ce jalon.");
});
