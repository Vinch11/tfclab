import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Garde-fou de régression pour le bug "rien n'a changé" (audit "génération de
 * plan IA", plan Emanuela — 5 PR de correctifs `catalogObjective` déjà
 * mergées, mais natation/vélo persistaient encore intégralement dans le cycle
 * Marathon intermédiaire d'un plan Ironman).
 *
 * Diagnostic (capture navigateur, régénération réelle) : `catalogObjective`
 * était bien résolu à "Marathon" et le catalogue/verrou sport server-side
 * bien restreint à course/renfo (`sportFilter=[course,run,strength,renforcement]`,
 * `trail_entries=NONE`) — les 5 PR précédentes fonctionnaient donc comme
 * prévu. Mais le payload réseau montrait `_weeklyQuotas` imposant quand même
 * "natation exactement 3, vélo exactement 3" dès S1 : un QUATRIÈME mécanisme,
 * totalement indépendant des prompts serveur déjà audités — un calcul
 * DÉTERMINISTE côté client ("Le LLM n'a plus la main sur 'combien'") — qui
 * n'avait jamais été couvert par l'audit `catalogObjective` (celui-ci ne
 * portait que sur `supabase/functions/ai-training-plan/*.ts`).
 *
 * Cause : `objectiveForQuota` (base du calcul de `computeWeekQuotaEntry`,
 * lui-même base de `_weeklyQuotas` envoyé au serveur) lisait directement
 * `planConfig.objective` (l'objectif FINAL, "Ironman") au lieu du
 * `catalogObjective` déjà résolu plus haut dans la même fonction — recréant,
 * via un chemin totalement différent, la même contradiction "0 fiche
 * disponible vs quota obligatoire" que les PR #263/#265/#267/#268/#269
 * avaient corrigée côté prompts serveur.
 *
 * `generatePlan` (la fonction contenant ce calcul) fait un appel réseau
 * authentifié complet (session Supabase, fetch streaming) — non unitairement
 * testable ici sans mock lourd. Même limitation/pattern que les autres guard
 * tests de ce fichier (`aiTrainingPlanRaceGoalsPersistence.guard.test.ts`,
 * etc.) : ce test vérifie donc, en lisant le SOURCE, que `objectiveForQuota`
 * dérive bien de `catalogObjective` et non de `planConfig.objective` seul.
 */
describe("useAITrainingPlan — garde-fou anti-régression : le quota hebdomadaire déterministe respecte catalogObjective", () => {
  const source = readFileSync(
    join(__dirname, "../useAITrainingPlan.ts"),
    "utf-8",
  );

  it("objectiveForQuota dérive de catalogObjective, pas de planConfig.objective seul", () => {
    const idx = source.indexOf("const objectiveForQuota =");
    expect(idx, "la ligne objectiveForQuota est introuvable — a-t-elle été renommée/déplacée ?").toBeGreaterThan(-1);
    const line = source.slice(idx, source.indexOf("\n", idx));
    expect(
      line,
      "objectiveForQuota ne dérive plus de catalogObjective — le quota hebdomadaire déterministe redeviendrait insensible au cycle en cours d'un plan multi-objectif (ex. natation/vélo imposés pendant un cycle Marathon).",
    ).toContain("catalogObjective");
  });

  it("objectiveForQuota est déclaré APRÈS la résolution de catalogObjective dans la même fonction", () => {
    const catalogObjectiveIdx = source.indexOf("const catalogObjective = planConfig.catalogObjective || planConfig.objective");
    const objectiveForQuotaIdx = source.indexOf("const objectiveForQuota =");
    expect(catalogObjectiveIdx, "la résolution de catalogObjective (référence, cf. resolveSystemPromptObjective) est introuvable").toBeGreaterThan(-1);
    expect(objectiveForQuotaIdx).toBeGreaterThan(catalogObjectiveIdx);
  });
});
