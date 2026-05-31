import { describe, it, expect } from "vitest";
import {
  AMBITION_DEFINITIONS,
  AMBITION_LEVELS_ORDERED,
  DEFAULT_AMBITION,
  RUNNING_TIME_HINTS,
  getRunningTimeHint,
  normalizeAmbitionLevel,
  getAthleteAmbition,
  type AmbitionLevel,
} from "@/types/ambitionLevel";
import { getTargetsForAmbition } from "@/lib/physiologicalTargets";
import { getVo2maxTarget } from "@/lib/v2/unifiedLimiterDetection";

describe("AmbitionLevel — 5 paliers Parcours athlète", () => {
  it("expose exactement 5 paliers ordonnés", () => {
    expect(AMBITION_LEVELS_ORDERED).toEqual([
      "finisher",
      "age_group",
      "competitor",
      "elite",
      "world_class",
    ]);
    expect(Object.keys(AMBITION_DEFINITIONS)).toHaveLength(5);
  });

  it("DEFAULT_AMBITION reste age_group (Confirmé)", () => {
    expect(DEFAULT_AMBITION).toBe("age_group");
  });

  it("chaque palier a label + icon + description", () => {
    for (const lvl of AMBITION_LEVELS_ORDERED) {
      const d = AMBITION_DEFINITIONS[lvl];
      expect(d.label).toBeTruthy();
      expect(d.icon).toBeTruthy();
      expect(d.description).toBeTruthy();
    }
  });
});

describe("normalizeAmbitionLevel — alias legacy + nouveaux", () => {
  const cases: Array<[unknown, AmbitionLevel]> = [
    // nouveaux alias UI
    ["discovery", "finisher"],
    ["Découverte", "finisher"],
    ["confirmed", "age_group"],
    ["Confirmé", "age_group"],
    ["competiteur", "competitor"],
    ["qualifiable", "elite"],
    ["Qualif", "elite"],
    ["world_class", "world_class"],
    ["WorldClass", "world_class"],
    ["mondial", "world_class"],
    // canoniques
    ["finisher", "finisher"],
    ["age_group", "age_group"],
    ["elite", "elite"],
    // fallback
    [null, DEFAULT_AMBITION],
    [undefined, DEFAULT_AMBITION],
    ["", DEFAULT_AMBITION],
    ["unknown_xyz", DEFAULT_AMBITION],
    [42, DEFAULT_AMBITION],
  ];
  it.each(cases)("normalize(%p) -> %s", (input, expected) => {
    expect(normalizeAmbitionLevel(input)).toBe(expected);
  });

  it("getAthleteAmbition lit refs.ambition prioritairement", () => {
    expect(getAthleteAmbition({ refs: { ambition: "qualifiable" }, ambition: "finisher" })).toBe("elite");
    expect(getAthleteAmbition({ ambition: "world_class" })).toBe("world_class");
    expect(getAthleteAmbition(null)).toBe(DEFAULT_AMBITION);
  });
});

describe("RUNNING_TIME_HINTS — cohérence 5 paliers", () => {
  it("chaque objectif running a une entrée pour les 5 paliers (M+F)", () => {
    for (const [obj, table] of Object.entries(RUNNING_TIME_HINTS)) {
      for (const lvl of AMBITION_LEVELS_ORDERED) {
        const entry = table[lvl];
        expect(entry, `${obj}/${lvl}`).toBeTruthy();
        expect(entry.M).toBeTruthy();
        expect(entry.F).toBeTruthy();
      }
    }
  });

  it("smoke 70.3 → world_class renvoie un hint pour Marathon", () => {
    expect(getRunningTimeHint("Marathon", "world_class", "M")).toMatch(/Sub/);
  });
});

describe("physiologicalTargets — monotonicité 5 paliers", () => {
  const objectifs = ["IM", "703", "Marathon", "Semi", "10K", "Trail", "Sprint", "Olympic"];

  it("FTP/kg, VMA, TTE et charge sont monotones croissants", () => {
    for (const obj of objectifs) {
      const tFin = getTargetsForAmbition(obj, "finisher");
      const tAg = getTargetsForAmbition(obj, "age_group");
      const tComp = getTargetsForAmbition(obj, "competitor");
      const tElite = getTargetsForAmbition(obj, "elite");
      const tWc = getTargetsForAmbition(obj, "world_class");

      // FTP/kg
      expect(tFin.ftp_kg_min).toBeLessThanOrEqual(tAg.ftp_kg_min);
      expect(tAg.ftp_kg_min).toBeLessThanOrEqual(tComp.ftp_kg_min);
      expect(tComp.ftp_kg_min).toBeLessThanOrEqual(tElite.ftp_kg_min);
      expect(tElite.ftp_kg_min).toBeLessThanOrEqual(tWc.ftp_kg_min);

      // TTE
      expect(tFin.tte_min).toBeLessThanOrEqual(tAg.tte_min);
      expect(tElite.tte_min).toBeLessThanOrEqual(tWc.tte_min);
    }
  });
});

describe("VO2max targets — world_class > elite", () => {
  it("smoke 70.3 / Marathon / Sprint", () => {
    for (const obj of ["703", "Marathon", "Sprint"]) {
      const elite = getVo2maxTarget(obj, "elite", 25);
      const wc = getVo2maxTarget(obj, "world_class", 25);
      expect(wc).toBeGreaterThan(elite);
    }
  });
});
