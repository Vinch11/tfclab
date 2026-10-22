import { assertStringIncludes, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { computeGoalWeekForConfig, buildUserPrompt } from "./promptHelpers.ts";

/**
 * Bug réel (audit "génération de plan IA", plan Emanuela, plan Ironman 39
 * semaines) : le Jour J de l'Ironman n'apparaissait JAMAIS dans le plan
 * généré, et la brique "Activation pré-course (J-1)" était dupliquée sur
 * DEUX samedis différents (S38 et S39) sans que le dimanche final (S39)
 * contienne autre chose que de la mobilité.
 *
 * Cause racine : la date de la DERNIÈRE course du plan tombe souvent UNE
 * semaine calendaire après `weeksAvailable` (décalage d'arrondi entre date
 * de début et durée exacte de la course — un quirk déjà documenté ET
 * corrigé dans `computeMultiObjectiveSegments` ci-dessus ET dans le mirror
 * client `computeObjectiveCycleSegments`, multiObjectiveClassification.ts).
 * Mais `computeGoalWeekForConfig` — utilisée par DEUX AUTRES blocs du prompt
 * ("Ancrage absolu... DERNIÈRE semaine DOIT être..." et "RAPPEL FINAL
 * MULTI-OBJECTIFS") — n'avait PAS ce clamp. Le prompt demandait donc au
 * modèle de placer le Jour de Course sur une semaine qui n'existe jamais
 * dans le plan réellement généré (ex. S40 pour un plan de 39 semaines) : le
 * modèle ne pouvait jamais satisfaire cette instruction, d'où l'absence
 * totale de Jour J et la répétition d'ouvertures J-1 sans jamais conclure.
 */

Deno.test("computeGoalWeekForConfig — sans isLast, aucun clamp (comportement historique)", () => {
  const config = { planStartDate: "2027-01-04", weeksAvailable: 4 };
  const goal = { raceDate: "2027-02-01" }; // jour 28 → floor(28/7)+1 = 5 = weeksAvailable+1
  assertEquals(computeGoalWeekForConfig(config, goal), 5);
});

Deno.test("computeGoalWeekForConfig — avec isLast=true, clampe le décalage d'une semaine sur weeksAvailable", () => {
  const config = { planStartDate: "2027-01-04", weeksAvailable: 4 };
  const goal = { raceDate: "2027-02-01" }; // jour 28 → 5 = weeksAvailable+1, doit clamper à 4
  assertEquals(computeGoalWeekForConfig(config, goal, { isLast: true }), 4);
});

Deno.test("computeGoalWeekForConfig — avec isLast=true, ne masque PAS un écart de plus d'une semaine (vraie erreur de config)", () => {
  const config = { planStartDate: "2027-01-04", weeksAvailable: 4 };
  const goal = { raceDate: "2027-03-01" }; // bien plus loin que weeksAvailable+1
  const raw = computeGoalWeekForConfig(config, goal, { isLast: true });
  assert(raw !== 4 && typeof raw === "number" && raw > 5, "un écart de plus d'une semaine ne doit pas être silencieusement masqué par le clamp");
});

function multiObjBaseConfig(overrides: Record<string, unknown> = {}) {
  return {
    objective: "Ironman",
    ambition: "Confirmé",
    weeksAvailable: 4,
    planStartDate: "2027-01-04",
    identifiedLimitersRaw: [],
    raceGoals: [
      { objective: "Marathon", raceDate: "2027-01-11", priority: "A" }, // jalon, S2
      { objective: "Ironman", raceDate: "2027-02-01", priority: "A" }, // dernière course, S5 brut → doit clamper à S4
    ],
    ...overrides,
  };
}

Deno.test("buildUserPrompt — plan multi-objectifs, dernière course décalée d'une semaine : le prompt ancre le Jour J sur la DERNIÈRE semaine réelle du plan (pas une semaine hors-plan)", () => {
  const prompt = buildUserPrompt({}, multiObjBaseConfig());
  assertStringIncludes(
    prompt,
    "La DERNIÈRE semaine du plan (S4) DOIT être la SEMAINE DE COURSE",
    /* si ce test échoue, chercher "(S5)" dans le prompt généré : ça reproduirait */
  );
  assert(
    !prompt.includes("DERNIÈRE semaine du plan (S5)"),
    "le prompt ne doit jamais ancrer le Jour J sur une semaine qui n'existe pas dans le plan généré (weeksAvailable=4)",
  );
});

Deno.test("buildUserPrompt — RAPPEL FINAL MULTI-OBJECTIFS ancre aussi la dernière course sur S4, pas S5", () => {
  const prompt = buildUserPrompt({}, multiObjBaseConfig());
  assertStringIncludes(prompt, "RAPPEL FINAL MULTI-OBJECTIFS");
  assertStringIncludes(prompt, "Semaine cible: S4");
  assert(!prompt.includes("Semaine cible: S5"));
});
