/**
 * Audit réel "B-5K-BEGINNER" (15/10) : `B_RUN_FARTLEK_60_PRO` (Main
 * 10×(1' Z4a / 2' Z2), un vrai travail d'intervalles) était classée
 * "technique" par `intentFamilyOf` sur la seule foi du mot "mobilité"
 * présent dans son retour au calme — avant même que son contenu réel ne
 * soit examiné. `phaseWidener.ts` élargissait alors sa phase jusqu'à
 * "base", la rendant disponible dès la semaine 1 pour un profil débutant
 * (répétée identique en S1 et S2 dans le plan réel).
 *
 * Le contenu réel du bloc "Main" (zone max) doit primer sur le texte de
 * warm-up/cool-down pour les deux familles consommées par `phaseWidener.ts`
 * ("technique", "endurance_fondamentale") — jamais pour les autres, où un
 * mot-clé de warm-up/cool-down reste un signal légitime.
 */
import { describe, it, expect } from "vitest";
import { intentFamilyOf } from "@/lib/plan/intentFamily";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import type { LibraryWorkout } from "@/types/workoutLibrary";

function fiche(overrides: Partial<LibraryWorkout>): LibraryWorkout {
  return {
    id: "MOCK_FICHE", cat: "B", sport: "run", objectif: "Séance", necessite: "Recommandé",
    when: "Toute l'année", phase: ["build", "peak"], avoid: "", durationMin: [40, 60],
    metricKey: "pace", sportKey: "run", structure: [], variants: {}, tags: [], goals: ["5k"],
    ...overrides,
  } as LibraryWorkout;
}

describe("intentFamilyOf — le bloc Main réel prime sur un mot de warm-up/cool-down", () => {
  it("RÉGRESSION réelle : B_RUN_FARTLEK_60_PRO (catalogue réel, Main 10×(1'Z4a/2'Z2)) n'est jamais 'technique' ni 'endurance_fondamentale'", () => {
    const w = WorkoutLibrary.find((x) => x.id === "B_RUN_FARTLEK_60_PRO");
    expect(w).toBeDefined();
    const family = intentFamilyOf(w!);
    expect(family).not.toBe("technique");
    expect(family).not.toBe("endurance_fondamentale");
  });

  it("un Main dur (Z4) avec 'mobilité' en cool-down n'est jamais classé 'technique' (cas reproduit, hors catalogue réel)", () => {
    const w = fiche({
      id: "MOCK_HARD_MAIN_EASY_COOLDOWN",
      structure: [
        { part: "Warm-up", text: "15' Z1-Z2 progressif", zones: ["Z1", "Z2"] },
        { part: "Main", text: "10x(1' Z4a / 2' Z2) sur terrain adapté", zones: ["Z4a", "Z2"] },
        { part: "Cool-down", text: "10' Z1 souple + mobilité", zones: ["Z1"] },
      ],
    });
    expect(intentFamilyOf(w)).not.toBe("technique");
    expect(intentFamilyOf(w)).not.toBe("endurance_fondamentale");
  });

  it("un Main dur (Z4) avec 'gammes'/'éducatif' en warm-up n'est jamais classé 'technique' non plus (même mécanisme, warm-up cette fois)", () => {
    const w = fiche({
      id: "MOCK_HARD_MAIN_EDUCATIF_WARMUP",
      structure: [
        { part: "Warm-up", text: "10' Z1 + gammes éducatives", zones: ["Z1"] },
        { part: "Main", text: "6x3min Z4 r=2min", zones: ["Z4"] },
      ],
    });
    expect(intentFamilyOf(w)).not.toBe("technique");
  });

  it("CONTRÔLE — une vraie fiche technique (Main Z1-Z2, drill/éducatif dans le Main lui-même) reste classée 'technique'", () => {
    const w = fiche({
      id: "MOCK_GENUINE_TECHNIQUE",
      structure: [
        { part: "Warm-up", text: "5' Z1", zones: ["Z1"] },
        { part: "Main", text: "6x100m éducatifs techniques (talons-fesses, montées de genoux), gammes", zones: ["Z1", "Z2"] },
        { part: "Cool-down", text: "5' Z1", zones: ["Z1"] },
      ],
    });
    expect(intentFamilyOf(w)).toBe("technique");
  });

  it("CONTRÔLE — une vraie fiche d'endurance fondamentale (Main Z2, pas de mot-clé spécifique) reste classée 'endurance_fondamentale' par le repli", () => {
    const w = fiche({
      id: "MOCK_GENUINE_EASY",
      objectif: "Footing facile",
      structure: [
        { part: "Warm-up", text: "5' Z1", zones: ["Z1"] },
        { part: "Main", text: "40' continu en Z2, respiration fluide", zones: ["Z2"] },
        { part: "Cool-down", text: "5' Z1, retour au calme", zones: ["Z1"] },
      ],
    });
    expect(intentFamilyOf(w)).toBe("endurance_fondamentale");
  });

  it("CONTRÔLE — une fiche seuil (Main Z4, mot-clé 'seuil' explicite) reste classée 'seuil', pas affectée par ce correctif", () => {
    const w = fiche({
      id: "MOCK_GENUINE_SEUIL",
      structure: [
        { part: "Warm-up", text: "15' Z1-Z2 + mobilité", zones: ["Z1", "Z2"] },
        { part: "Main", text: "2x12min au seuil Z4", zones: ["Z4"] },
        { part: "Cool-down", text: "10' Z1", zones: ["Z1"] },
      ],
    });
    expect(intentFamilyOf(w)).toBe("seuil");
  });
});
