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

describe("inferWeekType — fenêtre d'affûtage IM RÉELLE (3 semaines) sur un plan réaliste", () => {
  it("plan IM de 16 semaines : S13-S14-S15 taper (3 semaines), S16 race, S11 encore load", () => {
    expect(inferWeekType(11, 16, "IM")).toBe("load");
    expect(inferWeekType(13, 16, "IM")).toBe("taper");
    expect(inferWeekType(14, 16, "IM")).toBe("taper");
    expect(inferWeekType(15, 16, "IM")).toBe("taper");
    expect(inferWeekType(16, 16, "IM")).toBe("race");
  });

  it("plan IM court (8 semaines) : la fenêtre de taper (3 sem) reste garantie malgré la durée réduite", () => {
    expect(inferWeekType(5, 8, "IM")).toBe("taper");
    expect(inferWeekType(6, 8, "IM")).toBe("taper");
    expect(inferWeekType(7, 8, "IM")).toBe("taper");
    expect(inferWeekType(8, 8, "IM")).toBe("race");
  });

  it("703 (2 semaines de taper) n'hérite PAS du taper 3 semaines de IM sur la même position", () => {
    // Plan de 16 semaines, S13 : S-3 avant la course pour un affûtage à 3
    // semaines (IM), mais seulement S-3 pour un affûtage à 2 semaines (70.3)
    // — donc S13 est taper pour IM, encore load pour 70.3. Garde contre une
    // régression qui confondrait les deux objectifs (cf. correction #6 de ce
    // même sprint, qui ajoute "10K" à une liste d'éligibilité sans jamais
    // devoir faire hériter son taper de Marathon).
    expect(inferWeekType(13, 16, "IM")).toBe("taper");
    expect(inferWeekType(13, 16, "703")).toBe("load");
  });
});
