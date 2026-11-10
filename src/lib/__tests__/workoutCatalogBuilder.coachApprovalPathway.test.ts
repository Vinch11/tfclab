/**
 * Parcours de production « approbation coach » → catalogue injecté à l'IA.
 *
 * Contrairement aux gardes existantes (signal écrit à la main), ces tests
 * passent par `buildLevelPrerequisiteSignal`, le seul constructeur de signal
 * utilisé en production. Deux niveaux de preuve, à ne pas confondre :
 *  - catalogue LARGE (`maxItems` levé, tous sports) : invariants de sécurité
 *    sur les sept objectifs. Les plafonds par sport de la phase de complément
 *    s'y appliquent encore : une absence n'y prouve pas à elle seule un refus
 *    du garde-fou (celui-ci est testé fiche par fiche dans
 *    `advancedSessionApproval.test.ts`) ;
 *  - catalogue PLAFONNÉ comme à la génération (`strictPhaseFilter`,
 *    `maxItems: 80`) : ce que l'IA reçoit réellement. Une fiche approuvée et
 *    éligible peut encore en être écartée par le filtre de phase ou les
 *    plafonds — l'approbation ne promet que l'éligibilité.
 */
import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";
import {
  APPROVABLE_ADVANCED_SESSION_IDS,
  buildLevelPrerequisiteSignal,
} from "@/lib/plan/advancedSessionApproval";

type Phase = "base" | "build" | "peak" | "taper";
type Source = Parameters<typeof buildLevelPrerequisiteSignal>[0];

/** Mêmes libellés d'objectif que `lactateNorwegianReview.test.ts`. */
const OBJECTIVES = ["5 KM", "10 KM", "Semi-marathon", "Marathon", "Trail", "Half", "Ironman"];
/** Sélection automatique bloquée : aucune approbation ne les rouvre. */
const BLOCKED = ["TPL_SWIM_HYPOXIE", "A_HEAT_ACCLIM_RUN", "C_HEAT_ACCLIM_BIKE_INDOOR", "B_RUN_LACTATE_SHUTTLE"];
const DOUBLE_THRESHOLD = "NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY";
const TOLERANCE = "BILLAT_RUN_LACTATE_TOLERANCE";

const TRAINED_MANUAL = { trainingLevel: "trained", trainingLevelSource: "manual" };
const HIGHLY_TRAINED_MANUAL = { trainingLevel: "highly_trained", trainingLevelSource: "manual" };

/** Catalogue large : `maxItems` levé, aucun filtre de sport. */
function wideCatalogIds(objective: string, phase: Phase, source: Source): Set<string> {
  return new Set(
    buildWorkoutCatalog(objective, 5, 8, 16, {
      phaseOverride: [phase],
      maxItems: 100_000,
      beginnerIntensitySignal: buildLevelPrerequisiteSignal(source),
    }).map(entry => entry.id.toUpperCase()),
  );
}

/** Catalogue course à pied plafonné comme à la génération d'une phase. */
function generationCatalogIds(objective: string, phase: Phase, source: Source): string[] {
  return buildWorkoutCatalog(objective, 7, 9, 16, {
    phaseOverride: [phase],
    strictPhaseFilter: true,
    maxItems: 80,
    sportFilter: ["course", "run"],
    beginnerIntensitySignal: buildLevelPrerequisiteSignal(source),
  }).map(entry => entry.id);
}

describe("approbation coach → catalogue large (sept objectifs)", () => {
  it.each(OBJECTIVES)("%s : sans approbation, aucune fiche à revue nominative n'est éligible", objective => {
    for (const phase of ["build", "peak"] as const) {
      const ids = wideCatalogIds(objective, phase, { ambitionMeta: HIGHLY_TRAINED_MANUAL, weeklyHours: 15 });
      for (const id of [...APPROVABLE_ADVANCED_SESSION_IDS, ...BLOCKED]) {
        expect(ids.has(id), `${id} ${phase}`).toBe(false);
      }
    }
  });

  it.each(OBJECTIVES)("%s : tout approuver sur un profil non vérifié n'ouvre rien", objective => {
    for (const source of [
      { ambitionMeta: { trainingLevel: "highly_trained", trainingLevelSource: "fallback-prudent" }, weeklyHours: 15 },
      { weeklyHours: 15 }, // pas d'ambitionMeta → signal nul
    ]) {
      const ids = wideCatalogIds(objective, "build", {
        ...source,
        approvedAdvancedSessionIds: [...APPROVABLE_ADVANCED_SESSION_IDS, ...BLOCKED],
      });
      for (const id of [...APPROVABLE_ADVANCED_SESSION_IDS, ...BLOCKED]) {
        expect(ids.has(id), id).toBe(false);
      }
    }
  });

  it.each(OBJECTIVES)("%s : hypoxie, chaleur et navette lactate course restent fermées, tout approuvé", objective => {
    for (const phase of ["base", "build", "peak", "taper"] as const) {
      const ids = wideCatalogIds(objective, phase, {
        ambitionMeta: HIGHLY_TRAINED_MANUAL,
        weeklyHours: 20,
        approvedAdvancedSessionIds: [...APPROVABLE_ADVANCED_SESSION_IDS, ...BLOCKED],
      });
      for (const id of BLOCKED) expect(ids.has(id), `${id} ${phase}`).toBe(false);
    }
  });

  it.each(OBJECTIVES)("%s : l'approbation est nominative — une fiche approuvée n'en ouvre aucune autre", objective => {
    const ids = wideCatalogIds(objective, "build", {
      ambitionMeta: HIGHLY_TRAINED_MANUAL,
      weeklyHours: 15,
      approvedAdvancedSessionIds: [DOUBLE_THRESHOLD],
    });
    for (const id of APPROVABLE_ADVANCED_SESSION_IDS) {
      if (id !== DOUBLE_THRESHOLD) expect(ids.has(id), id).toBe(false);
    }
    // Non trivial : sur 10 km, la fiche approuvée est bien entrée.
    if (objective === "10 KM") expect(ids.has(DOUBLE_THRESHOLD)).toBe(true);
  });

  it("le double seuil norvégien approuvé reste fermé sous « très chargé » ou sous 8 h/sem", () => {
    const id = DOUBLE_THRESHOLD;
    const approved = { approvedAdvancedSessionIds: [id] };
    expect(wideCatalogIds("10 KM", "build", { ambitionMeta: TRAINED_MANUAL, weeklyHours: 12, ...approved }).has(id)).toBe(false);
    expect(wideCatalogIds("10 KM", "build", { ambitionMeta: HIGHLY_TRAINED_MANUAL, weeklyHours: 7, ...approved }).has(id)).toBe(false);
    expect(wideCatalogIds("10 KM", "build", { ambitionMeta: HIGHLY_TRAINED_MANUAL, weeklyHours: 8, ...approved }).has(id)).toBe(true);
  });

  it("la liste approuvée ne rouvre pas à un débutant une fiche de l'axe historique", () => {
    const beginner = { trainingLevel: "untrained", trainingLevelSource: "manual" };
    for (const id of [
      "CANOVA_RUN_INTRODUCTIVE_PHASE",
      "BILLAT_RUN_30_30_INTRO",
      "KENYAN_WEEK_STRUCTURE_MARATHON",
      "NORWEGIAN_WEEK_STRUCTURE_RUN",
    ]) {
      for (const phase of ["base", "build", "peak"] as const) {
        expect(
          wideCatalogIds("Marathon", phase, { ambitionMeta: beginner, weeklyHours: 12, approvedAdvancedSessionIds: [id] }).has(id),
          `${id} ${phase}`,
        ).toBe(false);
      }
    }
  });
});

describe("approbation coach → catalogue plafonné de génération (ce que l'IA reçoit)", () => {
  it("tolérance lactate approuvée + profil vérifié → présente en phase peak, absente sans approbation", () => {
    const source = { ambitionMeta: TRAINED_MANUAL, weeklyHours: 6 };
    // Deux objectifs où la fiche est loin du bord du plafond : ce test prouve
    // le transport de bout en bout, pas le classement du catalogue.
    for (const objective of ["5 KM", "Marathon"]) {
      expect(generationCatalogIds(objective, "peak", source), objective).not.toContain(TOLERANCE);
      expect(
        generationCatalogIds(objective, "peak", { ...source, approvedAdvancedSessionIds: [TOLERANCE] }),
        objective,
      ).toContain(TOLERANCE);
    }
  });

  it("approuvée mais profil non vérifié (« Auto » sans TSS) → absente : l'approbation ne remplace pas la preuve", () => {
    expect(
      generationCatalogIds("5 KM", "peak", {
        ambitionMeta: { trainingLevel: "trained", trainingLevelSource: "fallback-prudent" },
        weeklyHours: 6,
        approvedAdvancedSessionIds: [TOLERANCE],
      }),
    ).not.toContain(TOLERANCE);
  });

  it("navette lactate course : jamais transmise à l'IA, approuvée ou non", () => {
    for (const objective of ["5 KM", "10 KM", "Semi-Marathon", "Marathon"]) {
      for (const phase of ["build", "peak"] as const) {
        expect(
          generationCatalogIds(objective, phase, {
            ambitionMeta: HIGHLY_TRAINED_MANUAL,
            weeklyHours: 15,
            approvedAdvancedSessionIds: ["B_RUN_LACTATE_SHUTTLE"],
          }),
          `${objective} ${phase}`,
        ).not.toContain("B_RUN_LACTATE_SHUTTLE");
      }
    }
  });
});
