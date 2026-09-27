import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Garde-fou de régression (audit "génération de plan IA", plan Emanuela,
 * "Bloc 4 · Régénération post-pic" S22-23) : le quota hebdomadaire
 * déterministe (PR #272) réduit le NOMBRE de séances des semaines de
 * régénération inter-cycles, mais le catalogue par chunk (`chunkCatalogs`,
 * envoyé au LLM pour CHOISIR ces séances) restait construit uniquement
 * depuis la position calendaire du chunk — aveugle aux mêmes segments de
 * cycles multi-objectifs. Un chunk couvrant S22-23 recevait donc un
 * catalogue plein de fiches build/peak intenses (FTP threshold, MLSS,
 * squat/deadlift lourd) : le quota dit "combien", jamais "lequel".
 *
 * `generatePlan` fait un appel réseau authentifié complet — non unitairement
 * testable ici sans mock lourd (même limitation que les autres guard tests
 * de ce fichier). Ce test vérifie donc, en lisant le SOURCE, que la
 * construction de chunkCatalogs calcule bien un second catalogue RESTREINT
 * (`phaseOverride: ["base"]`, `strictPhaseFilter: true`) pour les semaines de
 * régénération couvertes par chaque chunk, et que ce second catalogue est
 * bien transmis à l'edge function.
 */
describe("useAITrainingPlan — garde-fou anti-régression : catalogue RESTREINT dédié aux semaines de régénération inter-cycles", () => {
  const source = readFileSync(
    join(__dirname, "../useAITrainingPlan.ts"),
    "utf-8",
  );

  it("calcule isRegenGapWeek (segments multi-objectifs) AVANT la construction de chunkCatalogs", () => {
    const segIdx = source.indexOf("const cycleSegmentsForCatalog = computeObjectiveCycleSegments(");
    expect(segIdx, "cycleSegmentsForCatalog est introuvable — a-t-il été renommé/déplacé ?").toBeGreaterThan(-1);
    const chunkLoopIdx = source.indexOf("const chunkCatalogs: string[] = [];");
    expect(chunkLoopIdx).toBeGreaterThan(-1);
    expect(segIdx, "les segments de cycles doivent être calculés AVANT la construction de chunkCatalogs").toBeLessThan(chunkLoopIdx);
  });

  it("construit un catalogue restreint (phaseOverride base + strictPhaseFilter) pour les semaines de régénération d'un chunk", () => {
    const regenBuildIdx = source.indexOf("phaseOverride: [\"base\"], strictPhaseFilter: true");
    expect(
      regenBuildIdx,
      "le catalogue régénération n'utilise plus phaseOverride+strictPhaseFilter — la fuite build/peak (bug plan Emanuela) redeviendrait possible",
    ).toBeGreaterThan(-1);
    const chunkLoopIdx = source.indexOf("const chunkCatalogs: string[] = [];");
    expect(regenBuildIdx).toBeGreaterThan(chunkLoopIdx);
  });

  it("transmet chunkRegenCatalogs et chunkRegenWeeks à l'edge function", () => {
    const bodyIdx = source.indexOf("body: JSON.stringify({");
    expect(bodyIdx).toBeGreaterThan(-1);
    const catalogsFieldIdx = source.indexOf("chunkRegenCatalogs:", bodyIdx);
    const weeksFieldIdx = source.indexOf("chunkRegenWeeks:", bodyIdx);
    expect(catalogsFieldIdx, "chunkRegenCatalogs n'est plus transmis dans le payload — le fix devient inopérant côté serveur").toBeGreaterThan(bodyIdx);
    expect(weeksFieldIdx, "chunkRegenWeeks n'est plus transmis dans le payload — le serveur ne pourrait plus savoir à quelles semaines le catalogue restreint s'applique").toBeGreaterThan(bodyIdx);
  });
});
