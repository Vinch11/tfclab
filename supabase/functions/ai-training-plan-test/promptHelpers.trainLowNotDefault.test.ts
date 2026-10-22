import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildUserPrompt } from "./promptHelpers.ts";

/**
 * Bug réel (audit "trop de fasted/train-low", ChatGPT sur le plan multi-
 * objectifs Séville→Sables d'Olonne, point #6) : le bloc "RAPPEL COHÉRENCE
 * IRONMAN" mandatait "Train Low 2-3x/sem en phase base" pour TOUT plan
 * Ironman, sans jamais regarder si VLamax élevée ou FatMax bas étaient
 * réellement identifiés comme limiteurs de l'athlète — la matrice "SÉANCE
 * CLÉ × LIMITEUR × PHASE" (même prompt) prescrit pourtant déjà le Train Low
 * de façon ciblée quand c'est indiqué. Un athlète avec d'autres limiteurs
 * recevait quand même l'injonction "Ironman = jeûne" ; un athlète AVEC
 * VLamax/FatMax en limiteur cumulait les deux prescriptions.
 */
function baseConfig(overrides: Record<string, unknown> = {}) {
  return {
    objective: "IM",
    ambition: "Confirmé",
    weeksAvailable: 20,
    identifiedLimitersRaw: [],
    ...overrides,
  };
}

Deno.test("buildUserPrompt — Ironman SANS limiteur VLamax/FatMax : plus de mandat Train Low par défaut", () => {
  const prompt = buildUserPrompt({}, baseConfig({
    identifiedLimiters: ["🔴 Économie basse (impact fort)", "🟡 Pmax/Sprint faible"],
  }));
  assertStringIncludes(prompt, "RAPPEL COHÉRENCE IRONMAN");
  assert(
    !prompt.includes("Train Low 2-3x/sem en phase base"),
    "le Train Low ne doit plus être un réflexe systématique pour tout plan Ironman",
  );
  assertStringIncludes(prompt, "PAS un réflexe systématique \"Ironman\"");
});

Deno.test("buildUserPrompt — Ironman AVEC limiteur VLamax identifié : renvoie vers la matrice, pas de mandat générique dupliqué", () => {
  const prompt = buildUserPrompt({}, baseConfig({
    identifiedLimiters: ["🔴 VLamax trop haute (impact fort)"],
  }));
  assertStringIncludes(prompt, "limiteur VLamax/FatMax identifié");
  assert(
    !prompt.includes("Train Low 2-3x/sem en phase base"),
    "pas de mandat générique — la fréquence vient uniquement de la matrice",
  );
});

Deno.test("buildUserPrompt — Ironman AVEC limiteur FatMax identifié : même comportement que VLamax", () => {
  const prompt = buildUserPrompt({}, baseConfig({
    identifiedLimiters: ["🟡 FatMax bas"],
  }));
  assertStringIncludes(prompt, "limiteur VLamax/FatMax identifié");
});

Deno.test("buildUserPrompt — Ironman sans identifiedLimiters du tout (absent) : traité comme aucun limiteur VLamax/FatMax", () => {
  const prompt = buildUserPrompt({}, baseConfig());
  assertStringIncludes(prompt, "PAS un réflexe systématique \"Ironman\"");
});

Deno.test("buildUserPrompt — objectif 70.3 : jamais affecté par ce bloc (RAPPEL COHÉRENCE IRONMAN absent)", () => {
  const prompt = buildUserPrompt({}, baseConfig({ objective: "703" }));
  assert(!prompt.includes("RAPPEL COHÉRENCE IRONMAN"));
  assert(!prompt.includes("PAS un réflexe systématique \"Ironman\""));
});
