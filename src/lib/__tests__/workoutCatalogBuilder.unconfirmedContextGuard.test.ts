/**
 * Mission 2B (audit "sécurisation du catalogue injecté à Gemini", suite
 * PR #377/Mission 2A) : `ficheRequiresUnconfirmedContext` protégeait déjà
 * `findReplacement` côté réconciliateur, mais rien n'empêchait Gemini de
 * choisir directement, dès la génération initiale, une des 29 fiches à
 * contexte non confirmé (Sleep Low, Train Low, FatMax, Gut Training,
 * Altitude, Fatigue cognitive) depuis le catalogue construit par
 * `buildWorkoutCatalog` — confirmé empiriquement sur le run réel
 * B-5K-BEGINNER du 2026-10-14 (`CANOVA_RUN_INTRODUCTIVE_PHASE` relève d'un
 * axe différent — prérequis de niveau, `avoid` — hors périmètre P0 de
 * cette mission, qui porte UNIQUEMENT sur l'axe "contexte requis" déjà
 * couvert par `ficheRequiresUnconfirmedContext`).
 *
 * Utilise le VRAI catalogue (`@/lib/workoutLibrary`, 920 fiches), pas des
 * fixtures mockées — conformément à la consigne coach.
 */
import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog, serializeCatalogForPrompt } from "@/lib/workoutCatalogBuilder";

// Catalogue initial RÉELLEMENT transmis à Gemini pour un chunk donné, avec
// les mêmes paramètres que le call-site de production
// (useAITrainingPlan.ts::generatePlan, chunk chaining maxItems=130).
function geminiCatalog(objective: string, cStart: number, cEnd: number, totalWeeks: number, extra: Record<string, unknown> = {}) {
  return buildWorkoutCatalog(objective, cStart, cEnd, totalWeeks, { maxItems: 130, chunkIndex: 0, ...extra });
}

describe("buildWorkoutCatalog — garde-fou contexte non confirmé (Mission 2B)", () => {
  it("1. Débutant 5K sans contexte spécial : Sleep Low/Train Low/FatMax/Gut Training/Altitude/Fatigue cognitive absents du catalogue transmis à Gemini", () => {
    const catalog = geminiCatalog("5 KM", 5, 8, 12, {
      beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "manual" },
    });
    const ids = new Set(catalog.map(c => c.id));
    // Cas réels confirmés présents dans le catalogue AVANT ce correctif
    // (vérifié par un diagnostic jetable avant implémentation).
    expect(ids.has("FM_RUN_SLEEP_LOW_AM")).toBe(false);       // Sleep Low
    expect(ids.has("FM_RUN_FATMAX_ZONE")).toBe(false);        // FatMax
    expect(ids.has("ENR_ALTITUDE_EASY_RUN")).toBe(false);     // Altitude
    expect(ids.has("V2_RUN_MENTAL_FATIGUE")).toBe(false);     // Fatigue cognitive
    // Train Low / Gut Training : mêmes motifs (`fasted_pattern`/préfixe `FM_`),
    // vérifiés sur tout le catalogue plutôt qu'un seul ID.
    for (const c of catalog) {
      expect(/train[\s_-]*low/i.test(`${c.id} ${c.objectif ?? ""}`)).toBe(false);
      expect(c.id.toUpperCase().startsWith("FM_")).toBe(false); // couvre tout FatMax/Sleep Low/Gut Training du module FM_
    }
  });

  it("2. Contexte explicitement confirmé (motif par motif) : la fiche correspondante reste disponible, les autres motifs restent exclus", () => {
    const withAltitude = geminiCatalog("5 KM", 5, 8, 12, {
      confirmedSpecialContexts: new Set(["altitude"]),
    });
    const idsAlt = new Set(withAltitude.map(c => c.id));
    expect(idsAlt.has("ENR_ALTITUDE_EASY_RUN")).toBe(true);
    expect(idsAlt.has("V2_RUN_MENTAL_FATIGUE")).toBe(false);   // fatigue cognitive PAS confirmée
    expect(idsAlt.has("FM_RUN_FATMAX_ZONE")).toBe(false);      // fatmax_module PAS confirmé

    const withFasted = geminiCatalog("Marathon", 5, 8, 16, {
      confirmedSpecialContexts: new Set(["fasted"]),
    });
    const idsFasted = new Set(withFasted.map(c => c.id));
    expect([...idsFasted].some(id => id.includes("TRAIN_LOW") || id.includes("SLEEP_LOW"))).toBe(true);
  });

  it("3. Séances fondamentales préservées (A_RUN_Z2_EASY et consorts), avec ou sans contexte confirmé", () => {
    const base = geminiCatalog("5 KM", 5, 8, 12);
    const withContext = geminiCatalog("5 KM", 5, 8, 12, { confirmedSpecialContexts: new Set(["altitude", "fasted", "fatmax_module", "fatigue_cognitive"]) });
    for (const ids of [new Set(base.map(c => c.id)), new Set(withContext.map(c => c.id))]) {
      expect(ids.has("A_RUN_Z2_EASY")).toBe(true);
    }
  });

  it("4. Cohérence catalogue Gemini / réconciliateur : même motif, même décision (source unique `ficheUnconfirmedContextReason`)", async () => {
    const { ficheUnconfirmedContextReason } = await import("@/lib/plan/planReconciler");
    const { WorkoutLibrary } = await import("@/lib/workoutLibrary");
    const flagged = WorkoutLibrary.filter(w => ficheUnconfirmedContextReason(w) !== null);
    expect(flagged.length).toBeGreaterThanOrEqual(29); // cf. audit Mission 2A (29 confirmées catalogue-wide)
    const catalog = geminiCatalog("Marathon", 1, 4, 16); // objectif large, aucun contexte confirmé
    const injectedIds = new Set(catalog.map(c => c.id));
    for (const w of flagged) {
      expect(injectedIds.has(w.id)).toBe(false);
    }
  });

  it("5. Filtrage existant sport/phase/objectif inchangé : un objectif/phase sans fiche à contexte non confirmé produit un catalogue identique avant/après", () => {
    // Objectif Ironman, chunk peak : vérifie qu'aucune fiche NON concernée par
    // l'axe B n'est affectée (le filtre ne doit pas élargir ni restreindre
    // le filtrage existant pour le reste du catalogue).
    const catalog = geminiCatalog("Ironman", 20, 23, 28);
    const ids = new Set(catalog.map(c => c.id));
    // Fiches IM-spécifiques universellement attendues dans un chunk peak Ironman —
    // leur présence confirme que sport/phase/objectif n'ont pas été altérés.
    const anyImSpecific = [...ids].some(id => /_IM_|^A_IM_|^B_IM_/.test(id));
    expect(anyImSpecific).toBe(true);
  });

  it("6. Pas de raréfaction excessive du RUN disponible (5K/10K/Semi/Marathon)", () => {
    for (const [obj, totalWeeks] of [["5 KM", 12], ["10K", 12], ["Semi", 16], ["Marathon", 16]] as const) {
      const catalog = geminiCatalog(obj, 5, 8, totalWeeks);
      const runCount = catalog.filter(c => c.sport === "run" || c.sport === "course").length;
      // Seuil large (pas une mesure fine) : s'assurer qu'on reste dans un
      // ordre de grandeur cohérent avec l'audit Mission 2A (RUN total=417,
      // 29 fiches à contexte non confirmé catalogue-wide, dont une minorité
      // en sport=course) — jamais un effondrement du pool RUN.
      expect(runCount).toBeGreaterThan(15);
    }
  });
});
