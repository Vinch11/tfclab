import { describe, expect, it } from "vitest";
import { buildFactorStates, glycolyticHypothesis, rankWithHypothesis, type FactorStates } from "../factorStates";
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

describe("hypothèse glycolytique dans la hiérarchie", () => {
  const vla = (value: number, state: "above" | "inside") => ({ key: "vlamax", label: "VLamax", unit: "mmol/L/s", value, observation: undefined,
    zone: { low: 0.4, high: 0.5, point: null }, tier: "coaching" as const, state, basis: null, evidence: [], engineNote: null });
  const hyp = { sport: "run" as const, current: 0.57, ceiling: 0.6, modelHigh: 0.63, observed: 0.67, observedDate: "2026-05-05", excess: 11.7 };
  const base = (rows: unknown[], ranked: unknown[]) => ({ sections: [{ sport: "run", rows }], ranked, unmeasured: [] }) as unknown as FactorStates;

  it("annote la VLamax déjà classée sans changer son rang", () => {
    const r = vla(0.57, "above");
    const out = rankWithHypothesis(base([r], [{ r, sport: "run", gap: 14 }]), hyp);
    expect(out).toHaveLength(1);
    expect(out[0].verify).toBe(hyp);
    expect(out[0].gap).toBe(14);
  });
  it("insère la VLamax retenue dans la zone mais dont l'incertitude la dépasse, à sa place", () => {
    const r = vla(0.48, "inside");
    const other = { r: { ...vla(1, "above"), key: "vo2max" }, sport: "run" as const, gap: 3 };
    const out = rankWithHypothesis(base([r], [other]), { ...hyp, current: 0.48 });
    expect(out.map(x => x.r.key)).toEqual(["vlamax", "vo2max"]); // (0,67−0,5)/0,5 = 34 % > 3 %
    expect(out[0].verify).toBeTruthy();
  });
  it("sans hypothèse, rend le classement tel quel", () => {
    const s = base([], []);
    expect(rankWithHypothesis(s, null)).toBe(s.ranked);
  });
});

describe("facteurs observés : seuil critique, réserve anaérobie, durabilité", () => {
  const critical = { cycling: { critical: 262.4, reserve: 18300, status: "confirmed", latestEffortDate: "2026-11-02", efforts: [], warnings: [] },
    running: { critical: 4.51, reserve: 212, status: "estimate", latestEffortDate: "2026-10-20", efforts: [], warnings: [] } };
  const durability = { bike: { status: "estimate", method: "best20_early_vs_last_third", windowVersion: 2, unit: "W", meanChangePct: -8.2, from: "2026-09-01", to: "2026-11-01", savedAt: "2026-11-02",
    sessions: [{ id: "a", date: "2026-09-10", name: "Sortie longue", durationMin: 180, early: 250, late: 230, changePct: -8 }, { id: "b", date: "2026-10-10", name: "Sortie longue", durationMin: 200, early: 255, late: 234, changePct: -8.2 }] } };
  const rows = (s: ReturnType<typeof states>, sport: string) => s.sections.find(x => x.sport === sport)!.rows;

  it("affiche CP et W′ en vélo, CS et D′ en course, sans zone ni classement", () => {
    const s = states("IM", "competitor", triathlon, { criticalMetrics: critical } as never);
    const bike = rows(s, "bike"), run = rows(s, "run");
    expect(bike.find(r => r.key === "cp")).toMatchObject({ value: 262, unit: "W", tier: "observed", state: "none", zone: null, caption: expect.stringContaining("Confirmé par le coach") });
    expect(bike.find(r => r.key === "wprime")).toMatchObject({ value: 18.3, unit: "kJ" });
    expect(run.find(r => r.key === "cs")).toMatchObject({ value: 16.2, unit: "km/h", caption: expect.stringContaining("Estimation non confirmée") });
    expect(run.find(r => r.key === "dprime")).toMatchObject({ value: 212, unit: "m" });
    expect(s.ranked.map(x => x.r.key)).not.toEqual(expect.arrayContaining(["cp"]));
    expect(s.ranked.every(x => x.r.tier !== "observed")).toBe(true);
    expect(s.observed.map(x => x.r.key)).toEqual(expect.arrayContaining(["cp", "wprime", "cs", "dprime"]));
  });

  it("un avis « écarter » du coach est affiché tel quel", () => {
    const rejected = { cycling: { ...critical.cycling, coachReview: { verdict: "reject", text: "x", date: "2026-11-03" } } };
    const s = states("IM", "competitor", triathlon, { criticalMetrics: rejected } as never);
    expect(rows(s, "bike").find(r => r.key === "cp")!.caption).toContain("Écarté par l'avis du coach");
  });

  it("durabilité mesurée : valeur en % et repère d'observation, jamais une cible", () => {
    const s = states("IM", "competitor", triathlon, { criticalMetrics: { durability } } as never);
    const row = rows(s, "bike").find(r => r.key === "durability")!;
    expect(row).toMatchObject({ value: -8.2, unit: "%", tier: "observed", state: "none", zone: null });
    expect(row.basis).toContain("pas une cible");
    expect(s.ranked.some(x => x.r.key === "durability")).toBe(false);
  });

  it("durabilité absente : « à mesurer » pour un objectif long, rien pour un objectif court", () => {
    const long = states("Marathon", "competitor", { presentation: { sport: "run", axes: [axis("vo2max", 52, 50, "ml/kg/min")] } });
    expect(long.sections[0].rows.find(r => r.key === "durability")).toMatchObject({ state: "missing", value: null });
    expect(long.unmeasured.map(x => x.r.key)).toContain("durability");
    const short = states("10K", "competitor", { presentation: { sport: "run", axes: [axis("vo2max", 52, 50, "ml/kg/min")] } });
    expect(short.sections[0].rows.find(r => r.key === "durability")).toBeUndefined();
  });

  it("sans métriques critiques, aucune valeur n'est inventée : « à mesurer » avec le moyen de la mesurer", () => {
    const s = states("IM", "competitor", triathlon);
    for (const [key, sport, module] of [["cp", "bike", "cp-bike"], ["cs", "run", "cs-run"]] as const) {
      const r = rows(s, sport).find(x => x.key === key)!;
      expect(r).toMatchObject({ value: null, state: "missing", tier: "observed", action: { href: "/diagnostic/tests?module=" + module } });
    }
    for (const key of ["wprime", "dprime"]) expect(s.sections.flatMap(x => x.rows).some(r => r.key === key)).toBe(false);
    expect(s.observed).toEqual([]);
    expect(s.unmeasured.map(x => x.r.key)).toEqual(expect.arrayContaining(["cp", "cs"]));
  });
});

describe("qualité de la mesure et prochaine étape", () => {
  const base = { critical: 262.4, reserve: 18300, status: "confirmed", latestEffortDate: "2026-11-02", efforts: [], warnings: [] as string[] };
  const bikeRow = (cycling: object, today: string, key = "cp") =>
    buildFactorStates({ objectif: "IM", ambition: "competitor", criticalMetrics: { cycling } } as unknown as CoachingCompassInput, triathlon as unknown as TFCLCoachingCompassResult, today)
      .sections.find(x => x.sport === "bike")!.rows.find(r => r.key === key)!;

  it("confirmée, récente et sans avertissement : mesure fiable", () => {
    expect(bikeRow(base, "2026-11-20").reliability).toEqual({ level: "ok", notes: [] });
  });
  it("efforts de plus de 42 jours : à refaire", () => {
    const r = bikeRow(base, "2026-12-20").reliability!;
    expect(r.level).toBe("review");
    expect(r.notes.join(" ")).toContain("plus de 42 jours");
  });
  it("estimation non validée : à revoir ; avertissements du bilan repris", () => {
    const r = bikeRow({ ...base, status: "estimate", warnings: ["Deux points : qualité d’ajustement non vérifiable ; troisième effort requis avant prescription dans TFCL."] }, "2026-11-20").reliability!;
    expect(r.level).toBe("review");
    expect(r.notes.some(n => n.includes("non validée par le coach"))).toBe(true);
    expect(r.notes.some(n => n.includes("troisième effort requis"))).toBe(true);
  });
  it("avis « écarter » du coach : à revoir", () => {
    const r = bikeRow({ ...base, coachReview: { verdict: "reject", text: "x", date: "2026-11-03" } }, "2026-11-20").reliability!;
    expect(r.notes[0]).toContain("Écarté par l'avis du coach");
  });

  const durability = (n: number, to: string) => ({ bike: { status: "estimate", method: "best20_early_vs_last_third", windowVersion: 2, unit: "W", meanChangePct: -8.2, from: "2026-05-01", to, savedAt: to,
    sessions: Array.from({ length: n }, (_, i) => ({ id: "s" + i, date: "2026-10-1" + i, name: "Sortie", durationMin: 180, early: 250, late: 230, changePct: -8 })) } });
  const dur = (n: number, to: string, today: string) =>
    buildFactorStates({ objectif: "IM", ambition: "competitor", criticalMetrics: { durability: durability(n, to) } } as unknown as CoachingCompassInput, triathlon as unknown as TFCLCoachingCompassResult, today)
      .sections.find(x => x.sport === "bike")!.rows.find(r => r.key === "durability")!;

  it("durabilité : 2 sorties seulement ou sorties anciennes → à revoir, avec le test avant/après proposé", () => {
    const few = dur(2, "2026-11-01", "2026-11-20");
    expect(few.reliability!.level).toBe("review");
    expect(few.action).toEqual({ label: "Programmer un test avant/après", href: "/diagnostic/tests?module=durability-bike" });
    const old = dur(4, "2026-06-01", "2026-11-20");
    expect(old.reliability!.notes.join(" ")).toContain("plus de 3 mois");
  });
  it("durabilité : 3 sorties récentes → fiable, sans action", () => {
    const ok = dur(3, "2026-11-01", "2026-11-20");
    expect(ok.reliability).toEqual({ level: "ok", notes: [] });
    expect(ok.action).toBeUndefined();
  });
  it("durabilité absente sur objectif long : l'action mène au test de la bonne discipline", () => {
    const r = states("Marathon", "competitor", { presentation: { sport: "run", axes: [axis("vo2max", 52, 50, "ml/kg/min")] } }).sections[0].rows.find(x => x.key === "durability")!;
    expect(r.action!.href).toBe("/diagnostic/tests?module=durability-run");
  });
});

describe("exigence du chrono visé en % de la vitesse critique (marathon)", () => {
  const input = (objectif: string, extra: object = {}) => ({ objectif, ambition: "competitor", performanceGoal: { minutes: 180 },
    criticalMetrics: { running: { critical: 4.2, reserve: 200, status: "confirmed", latestEffortDate: "2026-11-02", efforts: [], warnings: [] } }, ...extra }) as unknown as CoachingCompassInput;
  const compass = { presentation: { sport: "run", axes: [axis("vma", 16, null, "km/h")] } } as unknown as TFCLCoachingCompassResult;
  const row = (i: CoachingCompassInput) => buildFactorStates(i, compass, "2026-11-20").sections[0].rows.find(r => r.key === "demandcs");

  it("3 h au marathon = 14,07 km/h, soit 93 % d'une CS de 15,12 km/h, avec les repères publiés", () => {
    const r = row(input("Marathon"))!;
    expect(r.value).toBe(93);
    expect(r).toMatchObject({ unit: "%", tier: "observed", state: "none", zone: null, evidence: ["cs-marathon-2020"] });
    expect(r.basis).toContain("84,8 ± 13,6");
    expect(r.basis).toContain("96 %");
    expect(r.caption).toContain("confirmée");
  });
  it("jamais classée : aucune cible par ambition", () => {
    const s = buildFactorStates(input("Marathon"), compass, "2026-11-20");
    expect(s.ranked.some(x => x.r.key === "demandcs")).toBe(false);
    expect(s.observed.some(x => x.r.key === "demandcs")).toBe(true);
  });
  it("seulement pour le marathon, et seulement si la CS et le chrono visé existent", () => {
    expect(row(input("10K"))).toBeUndefined();
    expect(row(input("Marathon", { criticalMetrics: undefined }))).toBeUndefined();
    expect(row(input("Marathon", { performanceGoal: undefined }))).toBeUndefined();
  });
});
