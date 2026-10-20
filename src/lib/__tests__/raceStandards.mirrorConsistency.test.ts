import { describe, it, expect } from "vitest";
import { REFERENCE_STANDARDS } from "../raceStandards";
import { REFERENCE_STANDARDS_FRONT } from "@/components/GapAmbitionPanel";

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #4 : `raceStandards
 * .ts` garde une COPIE littérale de `GapAmbitionPanel.tsx::REFERENCE_STANDARDS
 * _FRONT` (pas un import — cf. commentaire dans raceStandards.ts) pour que
 * le contrôle post-génération (checkB15) et le panneau de prévisualisation
 * pré-génération utilisent exactement les mêmes standards populationnels.
 * Même principe que `deriveRaceTargets.mirrorConsistency.test.ts` (copie
 * client/serveur) : un test de parité plutôt qu'une confiance aveugle dans
 * deux copies qui pourraient diverger silencieusement.
 */
describe("raceStandards — REFERENCE_STANDARDS reste un MIROIR EXACT de GapAmbitionPanel", () => {
  it("les deux tables sont strictement identiques", () => {
    expect(REFERENCE_STANDARDS).toEqual(REFERENCE_STANDARDS_FRONT);
  });
});
