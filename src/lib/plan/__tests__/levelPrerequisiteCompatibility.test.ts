/**
 * Mission Axe C (consigne coach) : vérifie la portée EXACTE du hard-ban
 * nominatif sur les 8 fiches à prérequis de niveau confirmé par relecture
 * du contenu réel (cf. MISSION_AXE_C_VALIDATION.md §1) — jamais une règle
 * plus large, jamais activée sans signal fiable, et explicitement SANS les
 * 2 fiches dont le seul critère indépendant est une VMA non disponible au
 * pipeline (`BILLAT_RUN_30_30_PRO`, `BILLAT_RUN_3MIN_3MIN`).
 */
import { describe, it, expect } from "vitest";
import { isLevelPrerequisiteIncompatible } from "@/lib/plan/levelPrerequisiteCompatibility";

const EIGHT_IDS = [
  "CANOVA_RUN_INTRODUCTIVE_PHASE",
  "CANOVA_RUN_FAST_CONTINUOUS_INTRO",
  "BILLAT_RUN_30_30_INTRO",
  "NORWEGIAN_WEEK_STRUCTURE_RUN",
  "KENYAN_WEEK_STRUCTURE_MARATHON",
  "COGGAN_BIKE_CP_OVER_UNDER",
  "COGGAN_BIKE_CP_DEPLETION",
  "V3_BIKE_VO2_TABATA",
];
const SAFETY_REVIEW_IDS = ["KENYAN_WEEK_STRUCTURE_MARATHON", "V3_BIKE_VO2_TABATA"];
const LEGACY_LEVEL_ONLY_IDS = EIGHT_IDS.filter(id => !SAFETY_REVIEW_IDS.includes(id));

// Volontairement HORS périmètre — seul critère indépendant = VMA non transmise.
const VMA_ONLY_IDS = ["BILLAT_RUN_30_30_PRO", "BILLAT_RUN_3MIN_3MIN"];

describe("isLevelPrerequisiteIncompatible — Mission Axe C", () => {
  it("niveau untrained + source fiable (manual) : les 8 fiches sont exclues", () => {
    for (const id of EIGHT_IDS) {
      expect(isLevelPrerequisiteIncompatible(id, { trainingLevel: "untrained", trainingLevelSource: "manual" })).toBe(true);
    }
  });

  it("niveau light + source fiable (auto-tss) : les 8 fiches sont exclues", () => {
    for (const id of EIGHT_IDS) {
      expect(isLevelPrerequisiteIncompatible(id, { trainingLevel: "light", trainingLevelSource: "auto-tss" })).toBe(true);
    }
  });

  it("niveau trained ou highly_trained (même source fiable) : jamais exclues", () => {
    for (const id of LEGACY_LEVEL_ONLY_IDS) {
      expect(isLevelPrerequisiteIncompatible(id, { trainingLevel: "trained", trainingLevelSource: "manual" })).toBe(false);
      expect(isLevelPrerequisiteIncompatible(id, { trainingLevel: "highly_trained", trainingLevelSource: "manual" })).toBe(false);
    }
  });

  it("source non fiable (fallback-prudent), même avec untrained : jamais exclues", () => {
    for (const id of LEGACY_LEVEL_ONLY_IDS) {
      expect(isLevelPrerequisiteIncompatible(id, { trainingLevel: "untrained", trainingLevelSource: "fallback-prudent" })).toBe(false);
    }
  });

  it("signal absent (undefined/null) : jamais exclues — l'absence d'info n'est jamais une preuve", () => {
    for (const id of LEGACY_LEVEL_ONLY_IDS) {
      expect(isLevelPrerequisiteIncompatible(id, undefined)).toBe(false);
      expect(isLevelPrerequisiteIncompatible(id, null)).toBe(false);
    }
  });

  it("les 2 fiches à critère VMA uniquement ne sont JAMAIS exclues, quel que soit le niveau — aucun hard-ban fondé sur une estimation", () => {
    for (const id of VMA_ONLY_IDS) {
      expect(isLevelPrerequisiteIncompatible(id, { trainingLevel: "untrained", trainingLevelSource: "manual" })).toBe(false);
      expect(isLevelPrerequisiteIncompatible(id, { trainingLevel: "light", trainingLevelSource: "auto-tss" })).toBe(false);
    }
  });

  it("fiche non concernée : jamais exclue, quel que soit le niveau", () => {
    expect(isLevelPrerequisiteIncompatible("A_RUN_Z2_EASY", { trainingLevel: "untrained", trainingLevelSource: "manual" })).toBe(false);
  });

  it("insensible à la casse de l'ID", () => {
    expect(isLevelPrerequisiteIncompatible("canova_run_introductive_phase", { trainingLevel: "untrained", trainingLevelSource: "manual" })).toBe(true);
  });
});
