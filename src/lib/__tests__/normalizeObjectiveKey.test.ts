import { describe, it, expect } from "vitest";
import { normalizeObjectiveKey } from "../normalizeObjectiveKey";

/**
 * Audit fix — Sprint/Olympic triathlon n'avaient aucune branche dans ce
 * normalizer ("source unique" pour planValidator/workoutCatalogBuilder/
 * planConfigBuilder) : l'objectif brut retombait tel quel (return obj), donc
 * SPORT_RATIO_TARGETS (planValidator.ts) ne trouvait jamais de cible pour ces
 * deux objectifs et le contrôle de ratio par sport était silencieusement
 * réduit à "3 sports présents ?" au lieu des vraies plages swim/bike/run.
 */
describe("normalizeObjectiveKey — Sprint/Olympic triathlon", () => {
  it("reconnaît les variantes Sprint", () => {
    expect(normalizeObjectiveKey("Sprint")).toBe("Sprint");
    expect(normalizeObjectiveKey("sprint")).toBe("Sprint");
    expect(normalizeObjectiveKey("Triathlon Sprint")).toBe("Sprint");
    expect(normalizeObjectiveKey("Sprint Tri")).toBe("Sprint");
  });

  it("reconnaît les variantes Olympique/Olympic", () => {
    expect(normalizeObjectiveKey("Olympic")).toBe("Olympic");
    expect(normalizeObjectiveKey("Olympique")).toBe("Olympic");
    expect(normalizeObjectiveKey("Triathlon Olympique")).toBe("Olympic");
    expect(normalizeObjectiveKey("Distance M")).toBe("Olympic");
  });

  it("ne casse pas les objectifs déjà reconnus (IM/703/Marathon)", () => {
    expect(normalizeObjectiveKey("Ironman")).toBe("IM");
    expect(normalizeObjectiveKey("70.3")).toBe("703");
    expect(normalizeObjectiveKey("Marathon")).toBe("Marathon");
  });

  it("retombe sur l'entrée brute pour un objectif non reconnu", () => {
    expect(normalizeObjectiveKey("Objectif Mystère")).toBe("Objectif Mystère");
  });
});
