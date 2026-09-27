import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Bug réel (audit "génération de plan IA", plan Emanuela, S22-23) : retour
 * coach — "j'avais autorisé la natation pendant la prépa marathon. j'ai
 * l'impression que le plan rattrape la natation absente en première partie
 * dans la deuxième partie". Le plan réel montrait 0 séance natation sur
 * S1-21 (cycle Marathon) puis un déferlement de contenu plein volume dès
 * S22 (CSS pyramide Z4, seuil vélo FTP 2x20' à 95-100%, drafting, brique
 * "Obligatoire" 120-180min) — exactement sur le "Bloc 4 · Régénération
 * post-pic" censé être une vraie semaine de récupération.
 *
 * Root cause découverte en creusant le fix précédent (PR #273,
 * chunkRegenCatalogs/phaseOverride) : sur une génération FRAÎCHE multi-
 * objectifs, `generatePlanWindowed`/`computeObjectiveAwareWindows`
 * découpe le plan en fenêtres HTTP séparées — une par cycle d'objectif, une
 * par intervalle de régénération inter-cycles — JAMAIS mélangées dans la
 * même fenêtre. Pour la fenêtre de régénération (S22-23), `catalogObjective`
 * retombe sur l'objectif FINAL du plan (`buildWindowRegenConfig` ne fournit
 * pas de `cycle`), ce qui est correct pour le filtre sport (ouvrir
 * natation/vélo en vue du cycle Ironman suivant est voulu) — mais cette
 * fenêtre ne fait que 2 semaines locales, donc `needsChunking` est TOUJOURS
 * faux (seuil 6-8 pour un objectif triathlon) : le catalogue restreint
 * additionnel de PR #273 (gated par `if (needsChunking)`) ne se construit
 * donc JAMAIS pour ce cas réel — le seul cas où il aurait un intérêt. La
 * fenêtre retombe sur `phaseCatalogs`, calculé sur la position calendaire
 * GLOBALE brute (S22-23/39 ≈ 56-59% → "build"/"peak") : catalogue plein
 * volume au lieu d'une vraie récupération.
 *
 * Fix : puisqu'une fenêtre de régénération pure ne mélange JAMAIS des
 * semaines de charge réelles (contrairement à l'hypothèse de PR #273), on
 * détecte ici que TOUTES les semaines locales de la fenêtre sont des
 * semaines de régénération inter-cycles, et on force alors phaseOverride
 * (["base"]) + strictPhaseFilter sur l'INTÉGRALITÉ du catalogue de cette
 * fenêtre (phaseCatalogs ET chunkCatalogs), plutôt que de dépendre du
 * mécanisme "bloc additionnel" pensé pour un chunk mixte qui ne se produit
 * pas dans cette architecture de fenêtres.
 *
 * `generatePlan` fait un appel réseau authentifié complet — non unitairement
 * testable ici sans mock lourd (même limitation que les autres guard tests
 * de ce fichier). Ce test vérifie donc, en lisant le SOURCE, que cette
 * détection et cette propagation existent bien, AVANT les deux boucles de
 * construction de catalogue.
 */
describe("useAITrainingPlan — garde-fou anti-régression : une fenêtre de régénération pure (toutes ses semaines locales) reçoit un catalogue phase='base' strict", () => {
  const source = readFileSync(
    join(__dirname, "../useAITrainingPlan.ts"),
    "utf-8",
  );

  it("détecte isPureRegenGapWindow AVANT la boucle phaseRanges (phaseCatalogs)", () => {
    const detectIdx = source.indexOf("const isPureRegenGapWindow = totalWeeks > 0");
    expect(
      detectIdx,
      "isPureRegenGapWindow est introuvable — a-t-il été renommé/déplacé ?",
    ).toBeGreaterThan(-1);
    const phaseLoopIdx = source.indexOf("for (let i = 0; i < phaseRanges.length; i++) {");
    expect(phaseLoopIdx).toBeGreaterThan(-1);
    expect(
      detectIdx,
      "isPureRegenGapWindow doit être calculé AVANT la boucle phaseRanges pour pouvoir s'y appliquer",
    ).toBeLessThan(phaseLoopIdx);
  });

  it("applique regenGapPhaseOptions (phaseOverride base + strictPhaseFilter) au buildWorkoutCatalog de la boucle phaseRanges", () => {
    const phaseLoopIdx = source.indexOf("for (let i = 0; i < phaseRanges.length; i++) {");
    const phaseLoopEndIdx = source.indexOf("phaseCatalogs[pr.phase] = serializeCatalogForPrompt(catalog);");
    expect(phaseLoopIdx).toBeGreaterThan(-1);
    expect(phaseLoopEndIdx).toBeGreaterThan(phaseLoopIdx);
    const body = source.slice(phaseLoopIdx, phaseLoopEndIdx);
    expect(
      body.includes("...regenGapPhaseOptions"),
      "le catalogue phaseCatalogs ne propage plus regenGapPhaseOptions — une fenêtre de régénération pure redeviendrait pleine intensité (bug plan Emanuela S22-23)",
    ).toBe(true);
  });

  it("applique regenGapPhaseOptions au buildWorkoutCatalog principal de la boucle chunkCatalogs", () => {
    const chunkLoopIdx = source.indexOf("const chunkCatalog = buildWorkoutCatalog(");
    expect(chunkLoopIdx, "l'appel buildWorkoutCatalog de chunkCatalogs est introuvable").toBeGreaterThan(-1);
    const chunkLoopEndIdx = source.indexOf("chunkCatalogs.push(serializeCatalogForPrompt(chunkCatalog));");
    expect(chunkLoopEndIdx).toBeGreaterThan(chunkLoopIdx);
    const body = source.slice(chunkLoopIdx, chunkLoopEndIdx);
    expect(
      body.includes("...regenGapPhaseOptions"),
      "le catalogue principal de chunkCatalogs ne propage plus regenGapPhaseOptions",
    ).toBe(true);
  });
});
