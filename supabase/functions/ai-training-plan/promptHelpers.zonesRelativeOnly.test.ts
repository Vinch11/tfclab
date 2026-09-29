import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildUserPrompt } from "./promptHelpers.ts";

/**
 * Bug réel (audit "plan multi-objectifs Sables d'Olonne", relayé via revue
 * ChatGPT — "trop de science décorative dans les zones") : le bloc "GRILLE
 * ZONES D'ENTRAÎNEMENT TFCL™ Z1→Z7" de `buildUserPrompt` affirmait "tu
 * DOIS... NE PAS inventer d'autres valeurs" puis listait des allures
 * ABSOLUES calculées sur un %VMA de POPULATION fixe (ex: "Allure Marathon
 * (Z4a) : 4'15-4'20/km" pour tout le monde) — alors que le bloc Phase 2B
 * "INTENSITÉS — RELATIF UNIQUEMENT" (formatTargetTableBlock, injecté dans
 * le MÊME prompt final via jsonPlanHandler.ts) dit l'inverse : "INTERDIT
 * d'écrire des... absolus... l'application les calcule pour l'athlète" via
 * renderIntensities.ts (Phase 2B v2 : le plan reste 100% RELATIF, résolu en
 * valeurs individualisées au rendu depuis la targetTable réelle de
 * l'athlète, elle-même dérivée du MLSS/VLamax — cf. deriveTrainingZones.ts).
 *
 * Les deux instructions se contredisaient dans le même prompt. Fix : le
 * tableau Z1→Z7 redevient un simple repère de lecture (comme le fait déjà
 * le bloc Phase 2B pour sa propre table TRAINING_ZONES) ; le texte des
 * séances reste 100% RELATIF (label de zone uniquement), et la liste
 * d'allures absolues à %VMA fixe a été supprimée plutôt que rendue
 * "individualisée" une seconde fois en parallèle de la targetTable.
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

Deno.test("buildUserPrompt — grille Z1-Z7 : n'affirme plus 'NE PAS inventer d'autres valeurs' ni ne liste d'allures absolues à recopier", () => {
  const prompt = buildUserPrompt({ vma: 18, ftp: 250, fcMax: 185 }, baseConfig());
  assertStringIncludes(prompt, "GRILLE ZONES D'ENTRAÎNEMENT TFCL™ Z1→Z7");
  assert(
    !prompt.includes("Allures spécifiques calculées"),
    "la liste d'allures absolues à %VMA fixe (contradictoire avec le bloc RELATIF UNIQUEMENT) ne doit plus être générée",
  );
  assert(
    !prompt.includes("NE PAS inventer d'autres valeurs"),
    "cette formulation impliquait que les nombres du tableau pouvaient être recopiés tels quels",
  );
});

Deno.test("buildUserPrompt — grille Z1-Z7 : instruit explicitement de n'écrire que le label de zone, jamais une valeur absolue", () => {
  const prompt = buildUserPrompt({ vma: 18, ftp: 250, fcMax: 185 }, baseConfig());
  assertStringIncludes(prompt, "REPÈRE DE LECTURE");
  assertStringIncludes(prompt, "100% RELATIF");
  assertStringIncludes(prompt, "N'écris JAMAIS d'allure/puissance/FC absolue dans le title/details");
});

Deno.test("buildUserPrompt — allure seuil individualisée (test de terrain observé) : ne dit plus d'ancrer les séances sur cette allure chiffrée", () => {
  const prompt = buildUserPrompt(
    { vma: 18, paceThresholdSecPerKm: 240 },
    baseConfig(),
  );
  assertStringIncludes(prompt, "Allure seuil INDIVIDUALISÉE (test de terrain observé)");
  assert(
    !prompt.includes("Ancrer toutes les séances de seuil long / Norvégienne / MLSS sur cette allure"),
    "le texte des séances doit rester le label 'Z5', pas l'allure chiffrée individualisée",
  );
  assertStringIncludes(prompt, `label "Z5" dans le texte`);
});

Deno.test("buildUserPrompt — table Z1-Z7 reste affichée comme référence même sans VMA connue (pas de crash, pas de colonne allure)", () => {
  const prompt = buildUserPrompt({}, baseConfig());
  assertStringIncludes(prompt, "GRILLE ZONES D'ENTRAÎNEMENT TFCL™ Z1→Z7");
  assertStringIncludes(prompt, "Z4a Allure Marathon / Sweet Spot");
});
