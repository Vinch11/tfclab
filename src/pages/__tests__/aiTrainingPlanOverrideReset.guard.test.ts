import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Garde-fou de régression pour le bug "affichage figé" (audit "génération de
 * plan IA" — retour coach : plusieurs régénérations complètes d'affilée
 * réaffichaient toujours le même plan périmé, quel que soit le contenu
 * fraîchement généré).
 *
 * Cause racine : `rawParsedPlan` (le mémo qui décide ce qui s'affiche) donne
 * la priorité absolue à `planOverride` (posé par une régénération CIBLÉE
 * d'une semaine, cf. `setPlanOverride(merged)`) — AVANT `jsonParsedPlan`
 * (l'état JSON du hook, mis à jour par toute génération COMPLÈTE) et AVANT
 * `response` (mis à jour par le chargement d'une version sauvegardée). Si
 * `planOverride` reste posé, il masque indéfiniment toute génération
 * complète ultérieure OU tout chargement de version — sauf si le point
 * d'entrée qui déclenche cette génération/chargement le remet lui-même à
 * `null`.
 *
 * `handleGenerate` (bouton "Générer" classique) faisait bien ce reset.
 * `handleCoachFormGenerate` (formulaire coach avec limiteurs/objectifs
 * multiples — le chemin qu'utilisait le coach pendant tout cet audit) ne le
 * faisait PAS : une seule régénération ciblée plus tôt dans la session
 * suffisait à figer l'affichage pour le reste de la session, quel que soit
 * le nombre de régénérations complètes faites ensuite via ce formulaire.
 * `applyLoadedVersion` (clic sur une version sauvegardée) ne remettait ni
 * `planOverride` ni l'état JSON du hook (`reset()`) à zéro non plus — un
 * plan JSON généré plus tôt dans la session restait donc affiché même après
 * avoir explicitement cliqué pour charger une autre version.
 *
 * Ce test ne peut pas monter le composant (page React massive, non testée
 * jusqu'ici — cf. `aiTrainingPlanFormStateReset.guard.test.ts`, même
 * limitation pour le bug PR #66). Il vérifie à la place, en lisant le
 * SOURCE, que chaque point d'entrée qui déclenche une génération complète ou
 * un chargement de version efface bien l'état susceptible de masquer son
 * propre résultat.
 */
describe("AITrainingPlanPage — garde-fou anti-régression : l'affichage ne reste jamais figé sur un ancien plan", () => {
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

  it("handleGenerate (bouton \"Générer\") efface planOverride avant de lancer generatePlanWindowed", () => {
    const body = sliceBetween(
      "const handleGenerate = async (extraConstraints?: string) => {",
      "generatePlanWindowed(athleteContext.data, config);",
    );
    expect(
      body,
      "handleGenerate ne remet plus planOverride à null avant de générer — une régénération ciblée antérieure masquerait ce nouveau plan.",
    ).toContain("setPlanOverride(null);");
  });

  it("handleCoachFormGenerate (formulaire coach, objectifs multi-limiteurs) efface planOverride avant de lancer generatePlanWindowed", () => {
    const body = sliceBetween(
      "const handleCoachFormGenerate = useCallback((",
      "generatePlanWindowed(athleteContext.data, config);",
    );
    expect(
      body,
      "handleCoachFormGenerate ne remet plus planOverride à null avant de générer — c'est exactement le bug réel observé (plan régénéré plusieurs fois via ce formulaire, affichage figé sur un plan périmé).",
    ).toContain("setPlanOverride(null);");
  });

  it("applyLoadedVersion (chargement d'une version sauvegardée) efface l'état JSON du hook ET planOverride avant setResponse", () => {
    const body = sliceBetween(
      "const applyLoadedVersion = useCallback((version: { plan_json: any }, startDate: Date) => {",
      "setResponse(md);",
    );
    expect(
      body,
      "applyLoadedVersion n'appelle plus reset() — un plan JSON généré plus tôt dans la session (jsonParsedPlan) resterait prioritaire sur la version qu'on vient explicitement de charger.",
    ).toContain("reset();");
    expect(
      body,
      "applyLoadedVersion ne remet plus planOverride à null — une régénération ciblée antérieure resterait prioritaire sur la version qu'on vient explicitement de charger.",
    ).toContain("setPlanOverride(null);");
  });
});
