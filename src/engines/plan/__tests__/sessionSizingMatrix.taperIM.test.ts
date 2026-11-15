import { describe, it, expect } from "vitest";
import { taperWeeksForObjective, inferWeekType } from "../sessionSizingMatrix";

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #5 : `taperWeeksFor
 * Objective`/`inferWeekType` sont la source de vérité UNIQUE de la longueur
 * d'affûtage par objectif (réutilisée par taperVolumeOverride.ts, planPatcher
 * .ts, annotationEngineV2.ts) — mais n'avaient jusqu'ici AUCUN test direct
 * pour IM (3 semaines, le plus long affûtage course/triathlon de la table,
 * cf. TAPER_WEEKS_BY_OBJECTIVE). Les tests existants de sessionSizingMatrix
 * .test.ts couvrent "IRONMAN 70.3" (cadence recovery par âge) mais jamais la
 * clé objectif "IM" elle-même ni la LONGUEUR de son affûtage.
 */
describe("taperWeeksForObjective — Ironman (IM) : 3 semaines, le plus long de la table", () => {
  it.each(["IM", "Ironman", "ironman", "IRONMAN", "Full Ironman"])(
    'reconnaît "%s" comme objectif IM → 3 semaines de taper',
    (objective) => {
      expect(taperWeeksForObjective(objective)).toBe(3);
    },
  );

  it("ne confond pas IM (3 sem) avec 70.3 (2 sem) — libellés proches mais distincts", () => {
    expect(taperWeeksForObjective("IM")).toBe(3);
    expect(taperWeeksForObjective("Ironman 70.3")).toBe(2);
    expect(taperWeeksForObjective("70.3")).toBe(2);
    expect(taperWeeksForObjective("half ironman")).toBe(2);
  });

  it("3 semaines IM > 2 semaines Marathon/70.3 > 1 semaine 10K/Sprint/Olympique — ordre physiologique attendu (dommages cumulés croissants avec la durée d'épreuve)", () => {
    expect(taperWeeksForObjective("IM")).toBeGreaterThan(taperWeeksForObjective("Marathon"));
    expect(taperWeeksForObjective("IM")).toBeGreaterThan(taperWeeksForObjective("703"));
    expect(taperWeeksForObjective("703")).toBeGreaterThan(taperWeeksForObjective("10K"));
    expect(taperWeeksForObjective("703")).toBeGreaterThan(taperWeeksForObjective("Sprint"));
  });
});

describe("inferWeekType — affûtage IM : 2 semaines allégées + semaine de course", () => {
  it("plan IM de 16 semaines : S14-S15 taper, S16 race, S13 n'est plus réduite", () => {
    expect(inferWeekType(13, 16, "IM")).not.toBe("taper");
    expect(inferWeekType(14, 16, "IM")).toBe("taper");
    expect(inferWeekType(15, 16, "IM")).toBe("taper");
    expect(inferWeekType(16, 16, "IM")).toBe("race");
  });
  it("plan IM de 32 semaines (Emanuela) : S29 reste une semaine d'entraînement", () => {
    expect(inferWeekType(29, 32, "IM", 50, 4)).toBe("load");
    expect(inferWeekType(30, 32, "IM", 50, 4)).toBe("taper");
    expect(inferWeekType(31, 32, "IM", 50, 4)).toBe("taper");
    expect(inferWeekType(32, 32, "IM", 50, 4)).toBe("race");
  });
  it("3:1 choisi par le coach : décharge toutes les 4 semaines même à 50 ans", () => {
    expect(inferWeekType(3, 32, "IM", 50, 4)).toBe("load");
    expect(inferWeekType(4, 32, "IM", 50, 4)).toBe("recovery");
    expect(inferWeekType(8, 32, "IM", 50, 4)).toBe("recovery");
  });
  it("703 et marathon conservent leurs 2 semaines", () => {
    expect(inferWeekType(14, 16, "703")).toBe("taper");
    expect(inferWeekType(13, 16, "703")).not.toBe("taper");
  });
});
