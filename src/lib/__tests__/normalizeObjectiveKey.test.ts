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

  // Batch 2 — exposition UI Sprint/Olympic : la branche littérale "olymp"
  // (sans "ic"/"ique") ne matchait JAMAIS en usage réel — le test ci-dessus
  // ("Olympic" → "Olympic") passait pour la mauvaise raison, via le
  // fallthrough accidentel `return obj` (qui préserve casse/espaces bruts).
  // Ce test distingue les deux : le fallthrough renverrait la casse/espaces
  // d'origine inchangés, alors que la branche canonique normalise toujours
  // vers "Olympic" exact.
  it("normalise réellement via la branche dédiée, pas par coïncidence du fallthrough (casse/espaces)", () => {
    expect(normalizeObjectiveKey("OLYMPIC")).toBe("Olympic");
    expect(normalizeObjectiveKey("  olympic  ")).toBe("Olympic");
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

/**
 * Bug réel (B-5K-BEGINNER, 2026-10-13) : "5 KM" (avec espace) n'était
 * reconnu nulle part — la ligne "5k" ne matchait que "5k" (substring) ou
 * "5km" (exact), jamais "5 km"/"5 KM" — alors que "10k" juste au-dessus gère
 * bien "10 km". Conséquence : SPORT_RATIO_TARGETS["5 KM"] retombait sur
 * `undefined`, et sessionSizingMatrix.ts::normalizeSizingObjective (même
 * gap) désactivait entièrement le moteur de quota/layout déterministe pour
 * cet objectif. Même correctif requis dans sportRatioMatrix.ts (edge,
 * miroir) — cf. sportRatioMatrix.normalizeObjKey.test.ts et
 * sessionSizingMatrix.normalizeSizingObjective.test.ts.
 */
describe("normalizeObjectiveKey — variantes 5K (B-5K-BEGINNER)", () => {
  it("reconnaît toutes les variantes d'écriture de 5 km", () => {
    expect(normalizeObjectiveKey("5K")).toBe("5K");
    expect(normalizeObjectiveKey("5k")).toBe("5K");
    expect(normalizeObjectiveKey("5km")).toBe("5K");
    expect(normalizeObjectiveKey("5KM")).toBe("5K");
    expect(normalizeObjectiveKey("5 km")).toBe("5K");
    expect(normalizeObjectiveKey("5 KM")).toBe("5K");
  });

  it("reconnaît 5 km dans un objectif plus long", () => {
    expect(normalizeObjectiveKey("Premier 5 km")).toBe("5K");
    expect(normalizeObjectiveKey("Objectif : 5 KM en 12 semaines")).toBe("5K");
  });

  it("ne confond pas 10 km et 5 km", () => {
    expect(normalizeObjectiveKey("10 km")).toBe("10K");
    expect(normalizeObjectiveKey("10 KM")).toBe("10K");
    expect(normalizeObjectiveKey("10km")).toBe("10K");
  });
});
