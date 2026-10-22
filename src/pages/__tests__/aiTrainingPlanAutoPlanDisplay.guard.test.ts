import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Garde-fou de régression — consigne coach 2026-10-22 "gestion et sélection
 * des plans" : aucun plan ne doit plus être affiché automatiquement à
 * l'ouverture de la page ou au changement d'athlète ; seule une action
 * EXPLICITE du coach (génération réussie, ou chargement d'une version via
 * `PlanHistoryCard` → `LoadVersionDialog`) doit afficher un plan.
 *
 * Avant ce correctif, l'effet "Restore persisted CONFIG on athlete change"
 * (déclenché à l'ouverture de la page ET à chaque changement d'athlète)
 * affichait silencieusement un ancien plan par TROIS mécanismes distincts :
 * (1) `setResponse(parsed.response)` depuis le cache `activePlanKey`,
 * (2) `setResponse(savedState.response)` depuis le cache de formulaire
 * `persistKey`, (3) un appel automatique à la dernière version sauvegardée
 * en base (`.from("plan_versions")...` + `applyLoadedVersion`). Les trois
 * sont désormais retirés — ce test vérifie, en lisant le SOURCE (cette page
 * React massive n'est pas montée en test, même limitation/pattern que
 * `aiTrainingPlanOverrideReset.guard.test.ts`), qu'aucun des trois ne peut
 * silencieusement réapparaître.
 */
describe("AITrainingPlanPage — garde-fou : aucun plan affiché automatiquement au changement d'athlète", () => {
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

  const restoreEffectBody = sliceBetween(
    "// Restore persisted CONFIG on athlete change (single mode only)",
    "}, [persistKey]);",
  );

  it("ne restaure plus automatiquement le contenu du plan depuis le cache activePlanKey (point 5/7 — pas de ré-affichage silencieux à l'ouverture)", () => {
    expect(
      restoreEffectBody,
      "setResponse(parsed.response) est de retour dans cet effet — un ancien plan serait de nouveau affiché automatiquement à l'ouverture de la page ou au changement d'athlète.",
    ).not.toContain("setResponse(parsed.response)");
  });

  it("ne restaure plus automatiquement le contenu du plan depuis savedState (cache de formulaire persistKey)", () => {
    expect(
      restoreEffectBody,
      "setResponse(savedState.response) est de retour — même bug par un second chemin (cache de formulaire plutôt que cache de plan actif).",
    ).not.toContain("setResponse(savedState.response)");
  });

  it("ne va plus chercher automatiquement la dernière version sauvegardée en base pour l'afficher (point 1/5 — aucun plan sélectionné par défaut)", () => {
    expect(
      restoreEffectBody,
      "cet effet appelle de nouveau plan_versions — un plan serait de nouveau chargé et affiché sans action explicite du coach (PlanHistoryCard existe déjà pour ça).",
    ).not.toContain("plan_versions");
    expect(
      restoreEffectBody,
      "cet effet appelle de nouveau applyLoadedVersion automatiquement.",
    ).not.toContain("applyLoadedVersion(");
  });

  it("vide toujours l'affichage (reset) au changement d'athlète, sauf brouillon non sauvegardé (point 3/4/8 — jamais de contenu de l'athlète précédent qui traîne)", () => {
    expect(
      restoreEffectBody,
      "reset() n'est plus appelé systématiquement dans cet effet — le plan de l'athlète précédent pourrait rester visible.",
    ).toContain("reset();");
  });

  it("le mode multi-athlète ne pré-sélectionne toujours aucun plan à afficher (viewedMultiAthleteId démarre à null)", () => {
    expect(
      source,
      "viewedMultiAthleteId n'est plus initialisé à null — une ancienne sélection pourrait réapparaître automatiquement en mode multi-athlète.",
    ).toContain('useState<string | null>(null);');
    const idx = source.indexOf("const [viewedMultiAthleteId, setViewedMultiAthleteId]");
    expect(idx, "déclaration de viewedMultiAthleteId introuvable").toBeGreaterThan(-1);
    expect(source.slice(idx, idx + 120)).toContain("useState<string | null>(null)");
  });

  it("PlanHistoryCard (sélection explicite d'une version) reste câblé — seul chemin qui peut désormais afficher un plan existant", () => {
    expect(source).toContain("<PlanHistoryCard refreshKey={historyRefreshKey} onLoadVersion={handleLoadVersion} />");
  });
});
