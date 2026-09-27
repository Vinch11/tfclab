import { describe, it, expect } from "vitest";
import { WorkoutLibrary } from "../workoutLibrary";

/**
 * Bug réel (audit "génération de plan IA", plan Emanuela) : `V3_TEST_TTE`
 * ("Test TTE — Time To Exhaustion au seuil", effort continu à 100% FTP
 * jusqu'à épuisement) était taggé `phase: ["taper"]` et se retrouvait
 * sélectionné 3 semaines DE SUITE pendant l'affûtage final (S-3, S-2, S-1
 * avant l'Ironman) — alors que son propre champ `when` dit explicitement
 * "toutes les 8-12 semaines, reposé". Un effort maximal à l'échec est
 * contradictoire avec l'objectif même du taper (dissiper la fatigue avant la
 * course, pas la créer). Fix : reclassé en `phase: ["build"]` — un test de
 * recalibrage FTP périodique appartient à une phase de développement, jamais
 * à la fin de la préparation.
 *
 * Garde-fou générique : AUCUN test "à épuisement" (TTE/max-effort) ne doit
 * être taggé taper, pour ne pas réintroduire la même classe de bug sur une
 * fiche similaire à l'avenir.
 */
describe("WorkoutLibrary — les tests à épuisement (TTE/max-effort) ne sont jamais prescrits en taper", () => {
  it("V3_TEST_TTE n'est plus taggé phase='taper'", () => {
    const w = WorkoutLibrary.find((x) => x.id === "V3_TEST_TTE");
    expect(w, "V3_TEST_TTE est introuvable dans WorkoutLibrary — a-t-il été renommé ?").toBeTruthy();
    expect(
      w!.phase ?? [],
      "un test à épuisement (100% FTP jusqu'à échec) ne doit jamais être prescrit en taper — contradictoire avec l'objectif de dissiper la fatigue avant la course",
    ).not.toContain("taper");
  });

  it("aucune fiche 'jusqu'à épuisement' / 'à l'échec' n'est taggée taper", () => {
    const exhaustionWorkouts = WorkoutLibrary.filter((w) => {
      const text = JSON.stringify(w.structure ?? []).toLowerCase();
      return text.includes("jusqu'à épuisement") || text.includes("jusqu’à épuisement") || text.includes("à l'échec") || text.includes("à l’échec");
    });
    const offenders = exhaustionWorkouts.filter((w) => (w.phase ?? []).includes("taper"));
    expect(
      offenders.map((w) => w.id),
      "ces fiches décrivent un effort à épuisement/à l'échec mais restent taggées 'taper' — à reclasser en 'build' (recalibrage périodique, jamais en fin de préparation)",
    ).toEqual([]);
  });
});
