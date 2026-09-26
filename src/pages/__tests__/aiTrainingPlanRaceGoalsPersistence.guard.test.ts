import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Garde-fou de régression pour le bug "objectifs secondaires perdus au
 * changement d'appareil" (audit "génération de plan IA" — retour coach :
 * "Quand je regenere le plan pour manu, j'ai toujours beaucoup de sessions de
 * natation et de velo", alors que le Marathon intermédiaire de Manu était
 * bien configuré).
 *
 * Diagnostic (capture navigateur) : `raceGoals` (les objectifs A/B/C
 * secondaires, cf. `RaceGoal[]` dans `useAITrainingPlan.ts`) ne vivait QUE
 * dans `localStorage[persistKey]` (`tfcl_ai_plan_<athleteId>`) — un state
 * purement client, jamais envoyé à Supabase. Régénérer depuis un navigateur/
 * appareil différent (ou après un cache vidé) repartait avec `raceGoals=[]`,
 * et toute la mécanique de cycle multi-objectif (segmentation, catalogue
 * restreint, verrou sport de la PR #263) restait inactive : le plan
 * redevenait 100% mono-objectif final (ex: Ironman complet, natation+vélo
 * chaque semaine), sans que rien n'alerte le coach.
 *
 * `persistPlanVersion` sauvegardait déjà `_objective`/`_raceName`/
 * `_raceDate` dans `plan_json` (table `plan_versions`, en base — partagée
 * entre appareils), mais jamais `raceGoals`. Et `applyLoadedVersion`
 * (chargement d'une version, y compris le chargement AUTOMATIQUE de la
 * dernière version au premier accès sur un nouvel appareil, cf. l.752+)
 * restaurait `_objective`/`_raceName`/`_raceDate` mais jamais les objectifs
 * secondaires — même s'ils avaient été sauvegardés.
 *
 * Ce test ne peut pas monter le composant (page React massive, non testée
 * jusqu'ici — même limitation que `aiTrainingPlanOverrideReset.guard.test.ts`).
 * Il vérifie à la place, en lisant le SOURCE, que `raceGoals` fait
 * maintenant l'aller-retour : écrit par `persistPlanVersion`, relu par
 * `applyLoadedVersion`.
 */
describe("AITrainingPlanPage — garde-fou anti-régression : les objectifs secondaires (raceGoals) survivent à un changement d'appareil", () => {
  const source = readFileSync(
    join(__dirname, "../AITrainingPlanPage.tsx"),
    "utf-8",
  );

  function sliceBetween(startMarker: string, endMarker: string, searchFrom = 0): string {
    const startIdx = source.indexOf(startMarker, searchFrom);
    expect(startIdx, `marqueur de début introuvable : "${startMarker}"`).toBeGreaterThan(-1);
    const endIdx = source.indexOf(endMarker, startIdx + startMarker.length);
    expect(endIdx, `marqueur de fin introuvable après le début : "${endMarker}"`).toBeGreaterThan(startIdx);
    return source.slice(startIdx, endIdx);
  }

  it("persistPlanVersion sauvegarde raceGoals dans plan_json (pas seulement objective/raceName/raceDate)", () => {
    const body = sliceBetween(
      "const persistPlanVersion = useCallback(async (",
      "if (error) throw error;",
    );
    expect(
      body,
      "persistPlanVersion ne sauvegarde plus _raceGoals — les objectifs secondaires (multi-objectif A/B/C) resteraient perdus dès qu'on change d'appareil/navigateur, exactement le bug réel constaté sur le plan de Manu.",
    ).toContain("_raceGoals: raceGoals");
  });

  it("applyLoadedVersion restaure raceGoals depuis pj._raceGoals au chargement d'une version", () => {
    const body = sliceBetween(
      "const applyLoadedVersion = useCallback((version: { plan_json: any }, startDate: Date) => {",
      "setResultView(\"interactive\");",
    );
    expect(
      body,
      "applyLoadedVersion ne restaure plus raceGoals depuis la version sauvegardée — même si _raceGoals est bien en base, il ne serait jamais relu dans le formulaire de régénération.",
    ).toContain("setRaceGoals(pj._raceGoals)");
  });
});
