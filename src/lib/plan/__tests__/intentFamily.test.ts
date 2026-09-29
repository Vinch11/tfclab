import { describe, it, expect } from "vitest";
import { intentFamilyOf } from "@/lib/plan/intentFamily";
import type { LibraryWorkout } from "@/types/workoutLibrary";

/**
 * P6 diversité — retour coach : le catalogue étoffé ne doit pas se réduire à
 * quelques séances type. Mesuré empiriquement : les 52 fiches de sport
 * "brick" de la bibliothèque contiennent TOUTES "brick"/"BR_" dans leur id ou
 * leurs tags — avec "brick" en 2e position dans FAMILY_PATTERNS (juste après
 * "test"), elles matchaient TOUTES ce motif en premier, avant même d'avoir la
 * chance d'être classées par leur intention réelle (race-pace, seuil,
 * technique...). Conséquence : le socle de couverture (buildWorkoutCatalog,
 * garantie "N meilleures fiches par sport×famille") ne réservait que 4 places
 * pour TOUTE la diversité brick, quel que soit le nombre réel d'intentions
 * différentes présentes. Ce fichier verrouille le comportement inverse :
 * "brick" ne doit capturer qu'une fiche générique SANS signal de zone/
 * intention plus spécifique — sinon la fiche doit tomber dans la famille qui
 * correspond à son contenu réel.
 */
function makeWorkout(overrides: Partial<LibraryWorkout>): LibraryWorkout {
  return {
    id: "TEST_ID",
    cat: "B",
    sport: "brick",
    objectif: "",
    necessite: "Recommandé",
    when: "",
    phase: ["build"],
    avoid: "",
    durationMin: [60, 90],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [],
    tags: [],
    ...overrides,
  } as LibraryWorkout;
}

describe("intentFamilyOf — brick n'est plus un tiroir monolithique", () => {
  it("une fiche brick de race simulation devient race_pace, pas brick", () => {
    const w = makeWorkout({ id: "BRICK_703_RACE_SIM", objectif: "Brick race-sim 70.3" });
    expect(intentFamilyOf(w)).toBe("race_pace");
  });

  it("une fiche brick d'allure spécifique marathon devient race_pace", () => {
    const w = makeWorkout({
      id: "B_IM_BRICK_LONG_MARATHON_PACE",
      objectif: "Brick long — spécifique allure marathon",
    });
    expect(intentFamilyOf(w)).toBe("race_pace");
  });

  it("une fiche brick de sweet spot/seuil devient seuil, pas brick", () => {
    const w = makeWorkout({
      id: "B_BRICK_SST_TEMPO_BUILD_703",
      objectif: "Brick sweet spot vélo + tempo course",
    });
    expect(intentFamilyOf(w)).toBe("seuil");
  });

  it("une fiche brick de récupération devient recuperation, pas brick", () => {
    const w = makeWorkout({ id: "D_BRICK_RECOVERY_SPIN", objectif: "Brick récupération active" });
    expect(intentFamilyOf(w)).toBe("recuperation");
  });

  it("une fiche brick générique sans signal de zone/intention reste brick (fallback légitime)", () => {
    const w = makeWorkout({
      id: "BR_HALF_V1_PRO",
      objectif: "Brick 70.3 variante #1",
      structure: [
        { part: "Bike", text: "60–80' Z3–Z4a (contrôlé)", zones: ["Z3", "Z4a"] },
        { part: "Run", text: "18–25' Z2→Z3", zones: ["Z2", "Z3"] },
      ],
      tags: ["brick", "race"],
    });
    expect(intentFamilyOf(w)).toBe("brick");
  });

  it("le motif test reste prioritaire sur brick (une fiche brick de test reste 'test')", () => {
    const w = makeWorkout({ id: "BRICK_FTP_TEST", objectif: "Test FTP après brick" });
    expect(intentFamilyOf(w)).toBe("test");
  });
});
