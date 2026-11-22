import { describe, expect, it } from "vitest";
import { buildFactorStates, glycolyticHypothesis } from "../factorStates";
import type { CoachingCompassInput, RadarAxis, TFCLCoachingCompassResult } from "../types";

const axis = (key: string, value: number | null, target: number | null, unit: string, source = "snapshot"): RadarAxis =>
  ({ key, label: key, shortLabel: key, value, target, score: 0, unit, source, icon: "", color: "" });
const states = (objectif: string, ambition: string, compass: unknown, extra: Partial<CoachingCompassInput> = {}) =>
  buildFactorStates({ objectif, ambition, ...extra } as CoachingCompassInput, compass as TFCLCoachingCompassResult);

const triathlon = { presentation: { sport: "triathlon", disciplineAxes: {
  bike: [axis("vo2max", 68, 62, "ml/kg/min"), axis("ftpkg", 3.4, 4, "W/kg"), axis("tte", 41, 50, "min", "observed")],
  run: [axis("vo2max", 52, 52, "ml/kg/min"), axis("vma", 14.2, null, "km/h")] } } };

describe("classement des écarts à l'idéal", () => {
  it("trie du plus grand au plus petit écart, sans compter les facteurs dans la zone", () => {
    const { ranked } = states("IM", "competitor", triathlon);
    expect(ranked.length).toBeGreaterThanOrEqual(3);
    const gaps = ranked.map(x => x.gap);
    expect([...gaps].sort((a, b) => b - a)).toEqual(gaps);
    for (const x of ranked) expect(x.r.state === "below" || x.r.key === "vlamax" || x.r.key === "demand").toBe(true);
  });

  it("un facteur sans valeur est listé à part et jamais classé", () => {
    const { ranked, unmeasured } = states("Marathon", "age_group", { presentation: { sport: "run", axes: [axis("vo2max", null, 50, "ml/kg/min"), axis("vma", 12, null, "km/h")] } });
    expect(unmeasured.map(x => x.r.key)).toContain("vo2max");
    expect(ranked.map(x => x.r.key)).not.toContain("vo2max");
  });

  it("un athlète au-dessus de tous ses idéaux n'a aucun écart classé", () => {
    expect(states("Marathon", "age_group", { presentation: { sport: "run", axes: [axis("vo2max", 70, 50, "ml/kg/min"), axis("vma", 22, null, "km/h")] } }).ranked).toEqual([]);
  });

  it("l'âge et le sexe de l'athlète déplacent l'idéal, donc le classement", () => {
    const compass = { presentation: { sport: "run", axes: [axis("vo2max", 52, 50, "ml/kg/min")] } };
    const young = states("Marathon", "competitor", compass, { athleteAge: 30, athleteSex: "M" });
    const older = states("Marathon", "competitor", compass, { athleteAge: 55, athleteSex: "F" });
    const z = (s: ReturnType<typeof states>) => s.sections[0].rows.find(r => r.key === "vo2max")!.zone!;
    expect(z(older).high).toBeLessThan(z(young).low);
    expect(young.ranked.length).toBeGreaterThan(0); // 52 sous l'idéal d'un homme de 30 ans
    expect(older.ranked).toEqual([]); // 52 dans ou au-dessus de celui d'une femme de 55 ans
  });
});

describe("hypothèse glycolytique", () => {
  const overlap = (over: Record<string, unknown> = {}) => ({ sport: "run" as const, current: 0.57, ceiling: 0.6, range: { high: 0.63 },
    previousValue: 0.67, previousDate: "2026-05-05", ...over });

  it("retient la plus haute observation au-dessus de la plage de référence", () => {
    const h = glycolyticHypothesis(overlap())!;
    expect(h.excess).toBeCloseTo((0.67 - 0.6) / 0.6 * 100, 5);
    expect(h).toMatchObject({ sport: "run", current: 0.57, observed: 0.67, observedDate: "2026-05-05" });
  });
  it("sans observation datée, utilise la borne haute du modèle", () => {
    expect(glycolyticHypothesis(overlap({ previousValue: null, previousDate: null }))!.excess).toBeCloseTo(5, 5);
  });
  it("aucune hypothèse si rien ne dépasse la plage, ou sans chevauchement", () => {
    expect(glycolyticHypothesis(overlap({ range: { high: 0.58 }, previousValue: 0.55 }))).toBeNull();
    expect(glycolyticHypothesis(null)).toBeNull();
    expect(glycolyticHypothesis(undefined)).toBeNull();
    expect(glycolyticHypothesis(overlap({ ceiling: 0 }))).toBeNull();
  });
});
