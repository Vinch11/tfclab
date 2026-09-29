import { describe, it, expect } from "vitest";
import { enrichWorkoutGoals } from "@/lib/workoutGoalsEnricher";
import type { LibraryWorkout } from "@/types/workoutLibrary";

/**
 * P6 diversité — cause #3 de l'audit catalogue : les fiches "méthode"
 * (Billat/Canova/Seiler/Coggan, 39 fiches, aucune n'a de champ `goals` codé
 * en dur) dépendent entièrement de `inferGoalsFromVariants` pour leur
 * pertinence au scoring. L'ancienne version traitait TOUT texte de variant
 * non trivial comme une adhésion pleine à l'objectif — y compris des notes
 * explicitement secondaires ("Support secondaire", "Non recommandé — trop
 * glycolytique", "1x/14j uniquement si VO2max est limiteur") — produisant des
 * `goals` bien trop larges (souvent les 4 objectifs ironman/half/marathon/
 * semi). Résultat mesuré (workoutCatalogBuilder.scoreWorkout) : ces fiches
 * perdaient le bonus "objectif étroit" (+4, réservé à ≤2 goals) et "tous les
 * objectifs matchent" (+3), un écart de 5 à 7 points qui les excluait
 * systématiquement du catalogue injecté face à des fiches génériques mieux
 * notées mais moins riches en contenu — quel que soit maxItems ou
 * rotationSeed, puisque ce n'est pas une égalité de score que la rotation
 * peut départager.
 */
function makeWorkout(overrides: Partial<LibraryWorkout>): LibraryWorkout {
  return {
    id: "TEST_ID",
    cat: "B",
    sport: "course",
    objectif: "",
    necessite: "Recommandé",
    when: "",
    phase: ["build"],
    avoid: "",
    durationMin: [60, 90],
    metricKey: "allure",
    sportKey: "course",
    structure: [],
    tags: [],
    ...overrides,
  } as LibraryWorkout;
}

describe("enrichWorkoutGoals — inférence des goals depuis les variants", () => {
  it("ne retient QUE les objectifs marqués d'un signal de priorité explicite", () => {
    const w = makeWorkout({
      variants: {
        ironman: "Allure run IM (Z2-Z3 bas) pendant 45-60 min — similaire mais plus lent",
        half: "Allure semi-marathon : 1-2×15-20 min Z3-Z4",
        marathon: "PRIORITÉ ABSOLUE — clé du marathon. Volume principal de la phase race-specific.",
        semi: "Allure semi-marathon : Z3-Z4 — 2×15 min",
      },
    });
    enrichWorkoutGoals([w]);
    expect(w.goals).toEqual(["marathon"]);
  });

  it("retient plusieurs objectifs quand plusieurs portent un marqueur de priorité", () => {
    const w = makeWorkout({
      variants: {
        ironman: "Non prioritaire",
        half: "PRIORITÉ — cœur de la préparation semi",
        marathon: "Secondaire (vitesse de base pour marathon)",
        semi: "PRIORITÉ ABSOLUE — 2x/semaine en peak",
      },
    });
    enrichWorkoutGoals([w]);
    expect(w.goals).toEqual(expect.arrayContaining(["half", "semi"]));
    expect(w.goals).toHaveLength(2);
  });

  it("exclut un objectif explicitement 'Non recommandé' même sans marqueur de priorité ailleurs", () => {
    const w = makeWorkout({
      variants: {
        ironman: "Non recommandé — trop glycolytique pour IM",
        half: "3-4 semaines en peak si VLamax basse — pour 'piquer'",
        marathon: "Non recommandé pour marathon (profil trop glycolytique)",
        semi: "Utile pour semi-marathon si capacité à tenir allure élevée",
      },
    });
    enrichWorkoutGoals([w]);
    expect(w.goals).toEqual(expect.arrayContaining(["half", "semi"]));
    expect(w.goals).not.toContain("ironman");
    expect(w.goals).not.toContain("marathon");
  });

  it("sans aucun marqueur fort ni négatif, garde le comportement large existant (tous les variants non triviaux)", () => {
    const w = makeWorkout({
      variants: {
        ironman: "3×5 min à 90% VMA — utile pour améliorer le plafond aérobie",
        half: "5×6 min à 92-95% VMA — transition MLSS→VO2max",
        marathon: "4×8 min à 90-92% VMA",
        semi: "5-6×5 min à 93-95% VMA",
      },
    });
    enrichWorkoutGoals([w]);
    expect(w.goals).toEqual(
      expect.arrayContaining(["ironman", "half", "marathon", "semi"]),
    );
    expect(w.goals).toHaveLength(4);
  });

  it("ne touche jamais un `goals` déjà déclaré explicitement sur la fiche", () => {
    const w = makeWorkout({
      goals: ["marathon"],
      variants: {
        ironman: "PRIORITÉ ABSOLUE",
        half: "PRIORITÉ ABSOLUE",
      },
    });
    enrichWorkoutGoals([w]);
    expect(w.goals).toEqual(["marathon"]);
  });

  it("reconnaît 'prioritaire' (adjectif) et 'pilier' comme marqueurs forts, pas seulement 'priorité'", () => {
    const w1 = makeWorkout({
      variants: { semi: "Bloc 4 semaines prioritaire", ironman: "Rare — seulement si diagnostic" },
    });
    enrichWorkoutGoals([w1]);
    expect(w1.goals).toEqual(["semi"]);

    const w2 = makeWorkout({
      id: "TEST_ID_2",
      variants: {
        marathon: "2h-2h30 Z2 avec surges — pilier de la préparation marathon Billat",
        ironman: "2h-3h Z2 avec surges toutes les 25 min",
      },
    });
    enrichWorkoutGoals([w2]);
    expect(w2.goals).toEqual(["marathon"]);
  });
});
