import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildUserPrompt } from "./promptHelpers.ts";

/**
 * Bug réel (ChatGPT sur un plan 10K, coach) : l'audit durabilité F-24
 * (écart entre TTE effectif et durée cible de course) prescrivait du
 * Train Low (jeûne) dès qu'une "carence" était détectée — pour TOUT
 * objectif, y compris un 10K (30-45min de course, où le mur glycogénique
 * n'est pas le facteur limitant), sans jamais regarder si VLamax élevée ou
 * FatMax bas avait été identifié comme limiteur de l'athlète. C'est un
 * chemin de prescription DISTINCT du "RAPPEL COHÉRENCE IRONMAN" déjà
 * corrigé (promptHelpers.trainLowNotDefault.test.ts) — celui-ci se
 * déclenche pour n'importe quel objectif dès qu'un temps cible + TTE sont
 * fournis, pas seulement pour l'Ironman.
 */
function baseConfig(overrides: Record<string, unknown> = {}) {
  return {
    objective: "10K",
    ambition: "Confirmé",
    weeksAvailable: 12,
    identifiedLimitersRaw: [],
    raceGoals: [
      { objective: "10K", raceDate: "2026-08-06", priority: "A", targetTimeMinutes: 38 },
    ],
    ...overrides,
  };
}

Deno.test("buildUserPrompt — 10K, carence de durabilité, SANS limiteur VLamax/FatMax : pas de Train Low", () => {
  // 10K (38min) → durabilityTarget = max(38-15, 30) = 30. TTE=5 → carence 25 (branche 🟠).
  const prompt = buildUserPrompt({ tte: 5 }, baseConfig({
    identifiedLimiters: ["🔴 Économie basse (impact fort)"],
  }));
  assertStringIncludes(prompt, "Durabilité INSUFFISANTE");
  assert(
    !prompt.includes("Ajouter 1 séance hebdo de Train Low"),
    "un 10K sans limiteur VLamax/FatMax ne doit pas recevoir de prescription Train Low par défaut",
  );
  assertStringIncludes(prompt, "PAS de Train Low par défaut ici");
});

Deno.test("buildUserPrompt — 10K, carence de durabilité, AVEC limiteur FatMax identifié : Train Low autorisé", () => {
  const prompt = buildUserPrompt({ tte: 5 }, baseConfig({
    identifiedLimiters: ["🟡 FatMax bas"],
  }));
  assertStringIncludes(prompt, "Ajouter 1 séance hebdo de Train Low");
  assertStringIncludes(prompt, "limiteur VLamax/FatMax identifié");
});

Deno.test("buildUserPrompt — 10K, carence de durabilité, sans identifiedLimiters du tout : traité comme aucun limiteur", () => {
  const prompt = buildUserPrompt({ tte: 5 }, baseConfig());
  assert(!prompt.includes("Ajouter 1 séance hebdo de Train Low"));
  assertStringIncludes(prompt, "PAS de Train Low par défaut ici");
});

Deno.test("buildUserPrompt — 10K, pas de carence de durabilité (TTE suffisant) : aucune mention de Train Low", () => {
  // TTE=40 (baseline load) > durabilityTarget=30 → shortMin<=0 → branche 🟢.
  const prompt = buildUserPrompt({ tte: 40 }, baseConfig());
  assertStringIncludes(prompt, "Durabilité OK");
  assert(!prompt.includes("Train Low"));
});
