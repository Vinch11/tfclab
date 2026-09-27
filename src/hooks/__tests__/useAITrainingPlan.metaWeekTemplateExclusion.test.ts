import { describe, it, expect } from "vitest";
import { getCatalogExclusions, META_WEEK_TEMPLATE_ID_PATTERNS } from "../useAITrainingPlan";
import { WorkoutLibrary } from "@/lib/workoutLibrary";

/**
 * Bug réel (audit "génération de plan IA", plan Emanuela) : plusieurs fiches
 * catalogue décrivent la structure d'une SEMAINE ENTIÈRE ("LUNDI : ... MARDI
 * : ... MERCREDI : ...") mais partagent exactement le même schéma qu'une
 * fiche de séance normale (durationMin sur une plage de séance unique, sans
 * `goals` → traitées comme "universelles" par `scoreWorkout`). Rien ne les
 * empêchait d'être sélectionnées et PLANIFIÉES comme la séance d'UN SEUL
 * jour — observé : "Structure semaine norvégienne course" planifiée un
 * mercredi, avec le texte "Cette séance représente le jeudi soir" affiché
 * tel quel dans le plan.
 */
describe("META_WEEK_TEMPLATE_ID_PATTERNS — fiches de structure hebdomadaire bannies de la sélection", () => {
  it("les 5 IDs connus existent bien dans WorkoutLibrary (le test ne protège rien si l'ID a été renommé)", () => {
    const knownIds = [
      "NORWEGIAN_WEEK_STRUCTURE_RUN",
      "KENYAN_WEEK_STRUCTURE_MARATHON",
      "SEILER_WEEK_POLARIZED_RUN",
      "SEILER_WEEK_POLARIZED_TRI",
      "NUTRITION_CARB_PERIODIZATION_WEEK",
    ];
    const libraryIds = new Set(WorkoutLibrary.map((w) => w.id));
    for (const id of knownIds) {
      expect(libraryIds.has(id), `${id} est introuvable dans WorkoutLibrary — a-t-il été renommé ?`).toBe(true);
    }
  });

  it("getCatalogExclusions bannit ces fiches quel que soit l'objectif (Ironman, Marathon, Semi, Trail...)", () => {
    for (const objective of ["Ironman", "Marathon", "Semi", "Trail montagne (40-80 km)", "10K"]) {
      const { excludeIdPatterns } = getCatalogExclusions(objective, []);
      for (const rx of META_WEEK_TEMPLATE_ID_PATTERNS) {
        const banned = excludeIdPatterns.some((p) => p.source === rx.source);
        expect(banned, `${rx} doit être banni pour l'objectif "${objective}"`).toBe(true);
      }
    }
  });

  it("les patterns matchent exactement les IDs connus (pas de faux négatif de casse/format)", () => {
    const knownIds = [
      "NORWEGIAN_WEEK_STRUCTURE_RUN",
      "KENYAN_WEEK_STRUCTURE_MARATHON",
      "SEILER_WEEK_POLARIZED_RUN",
      "SEILER_WEEK_POLARIZED_TRI",
      "NUTRITION_CARB_PERIODIZATION_WEEK",
    ];
    for (const id of knownIds) {
      const matched = META_WEEK_TEMPLATE_ID_PATTERNS.some((rx) => rx.test(id));
      expect(matched, `${id} devrait matcher un pattern de META_WEEK_TEMPLATE_ID_PATTERNS`).toBe(true);
    }
  });
});
