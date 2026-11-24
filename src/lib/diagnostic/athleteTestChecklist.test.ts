import { describe, expect, it } from "vitest";
import { buildTestChecklist, buildTestingPlan, TEST_VALIDITY_DAYS } from "./athleteTestChecklist";
import type { CoachingCompassInput } from "@/lib/coachingCompass/types";

const base = { objectif: "IM", ambition: "competitor", sportFocus: "triathlon", snapshotDate: "2026-11-12", ftp: 250, vo2max: 58, vma: 16.7, paceThresholdSecPerKm: 270,
  pmax5s: 900, p30sW: 600, p60sW: 420, map5minW: 320, vlamaxRunReference: { value: 0.55, source: "test_terrain" }, criticalMetrics: undefined } as unknown as CoachingCompassInput;
const input = (over: object = {}) => ({ ...base, ...over }) as CoachingCompassInput;
const find = (c: ReturnType<typeof buildTestChecklist>, key: string) => c.items.find(i => i.key === key)!;

describe("validité des tests", () => {
  it("42 jours pour la CP et la CS, 90 jours pour les autres tests", () => {
    expect(TEST_VALIDITY_DAYS).toEqual({ critical: 42, other: 90 });
    const c = buildTestChecklist(base, "2026-11-20");
    expect(find(c, "vma-run").validityDays).toBe(90);
    expect(find(c, "cp-bike").validityDays).toBe(42);
  });
  it("récent : à jour, avec la date et le nombre de jours", () => {
    const i = find(buildTestChecklist(base, "2026-11-20"), "vma-run");
    expect(i).toMatchObject({ status: "ok", ageDays: 8, lastDate: "2026-11-12", valueText: "16,7 km/h" });
    expect(i.message).toContain("Fait le 12/11/2026 (il y a 8 jours). Valable 90 jours.");
  });
  it("validité dépassée : la valeur n'est PAS retirée, on avertit qu'il faut retester", () => {
    const i = find(buildTestChecklist(base, "2027-03-01"), "vma-run");
    expect(i.status).toBe("stale");
    expect(i.valueText).toBe("16,7 km/h");
    expect(i.message).toContain("validité 90 jours dépassée");
    expect(i.message).toContain("La valeur reste utilisée");
  });
  it("le jour limite reste valable, le lendemain non", () => {
    expect(find(buildTestChecklist(base, "2027-02-10"), "vma-run").status).toBe("ok"); // 90 jours exactement
    expect(find(buildTestChecklist(base, "2027-02-11"), "vma-run").status).toBe("stale");
  });
  it("valeur présente sans date de test : à retester, valeur conservée", () => {
    const i = find(buildTestChecklist(input({ snapshotDate: null }), "2026-11-20"), "ftp-bike");
    expect(i).toMatchObject({ status: "stale", valueText: "250 W", lastDate: null });
    expect(i.message).toContain("date de test inconnue");
  });
  it("aucune valeur : à faire", () => {
    const i = find(buildTestChecklist(input({ vma: null }), "2026-11-20"), "vma-run");
    expect(i).toMatchObject({ status: "missing", valueText: null });
  });
});

describe("CP, CS et durabilité", () => {
  const critical = { cycling: { critical: 262.4, reserve: 18300, status: "estimate", latestEffortDate: "2026-11-02", efforts: [], warnings: [] },
    running: { critical: 4.2, reserve: 200, status: "confirmed", latestEffortDate: "2026-09-01", efforts: [], warnings: [] },
    durability: { bike: { status: "estimate", method: "best20_early_vs_last_third", windowVersion: 2, unit: "W", meanChangePct: -8.2, from: "2026-06-01", to: "2026-11-01", savedAt: "2026-11-02",
      sessions: [{ id: "a", date: "2026-09-10", name: "S", durationMin: 180, early: 250, late: 230, changePct: -8 }, { id: "b", date: "2026-10-10", name: "S", durationMin: 200, early: 255, late: 234, changePct: -8.4 }] } } };
  it("CP récente mais estimation, CS de plus de 42 jours : valeurs conservées, CS à retester", () => {
    const c = buildTestChecklist(input({ criticalMetrics: critical }), "2026-11-20");
    expect(find(c, "cp-bike")).toMatchObject({ status: "ok", valueText: "CP 262 W · W′ 18,3 kJ", note: "Estimation non validée par le coach." });
    expect(find(c, "cs-run")).toMatchObject({ status: "stale", valueText: "CS 15,1 km/h · D′ 200 m" });
  });
  it("durabilité : seulement pour les objectifs longs, une ligne par sport", () => {
    const c = buildTestChecklist(input({ criticalMetrics: critical }), "2026-11-20");
    expect(find(c, "durability-bike")).toMatchObject({ status: "ok", valueText: expect.stringContaining("-8,2 %") });
    expect(find(c, "durability-run")).toMatchObject({ status: "missing" });
    const short = buildTestChecklist(input({ objectif: "10K", sportFocus: "run" }), "2026-11-20");
    expect(short.items.some(i => i.key.startsWith("durability"))).toBe(false);
  });
});

describe("tests selon le sport et l'objectif", () => {
  it("triathlon : vélo et course ; course seule : pas de test vélo", () => {
    const tri = buildTestChecklist(base, "2026-11-20").items.map(i => i.key);
    expect(tri).toEqual(expect.arrayContaining(["sprint-bike", "cp-bike", "vma-run", "cs-run", "vo2max"]));
    const run = buildTestChecklist(input({ objectif: "10K", sportFocus: "run" }), "2026-11-20").items.map(i => i.key);
    expect(run).toEqual(expect.arrayContaining(["vma-run", "cs-run", "sprint-run"]));
    expect(run.some(k => k.endsWith("-bike"))).toBe(false);
  });
  it("sprint course estimé sans test : à faire, avec la mention de l'estimation", () => {
    const i = find(buildTestChecklist(input({ vlamaxRunReference: { value: 0.57, source: "estimation" } }), "2026-11-20"), "sprint-run");
    expect(i).toMatchObject({ status: "missing", valueText: null, note: "Valeur estimée, sans sprint testé." });
  });
  it("le résumé compte à jour, à retester et à faire", () => {
    const c = buildTestChecklist(base, "2027-03-01");
    expect(c.summary.total).toBe(c.items.length);
    expect(c.summary.ok + c.summary.stale + c.summary.missing).toBe(c.summary.total);
    expect(c.summary.stale).toBeGreaterThan(0);
  });
  it("débutant : aucune checklist", () => {
    expect(buildTestChecklist(input({ objectif: "StartToRun" }), "2026-11-20").items).toEqual([]);
  });
  it("chaque test porte un protocole et le Day qui le programme", () => {
    for (const i of buildTestChecklist(base, "2026-11-20").items) { expect(i.protocol.length).toBeGreaterThan(0); expect(i.day).toBeTruthy(); }
  });
});

describe("tout tester en quelques jours", () => {
  it("plan complet : un Day par jour, 48 h entre deux Days du même sport", () => {
    const plan = buildTestingPlan(buildTestChecklist(base, "2026-11-20"), true);
    expect(plan.map(d => d.day)).toEqual(["bike-day", "track-day", "cp-day", "durability-bike", "durability-run"]);
    expect(plan.map(d => d.dayNumber)).toEqual([1, 2, 3, 5, 6]); // 48 h entre deux Days du même sport ; la durabilité en dernier
    const bike = plan.filter(d => d.day === "bike-day" || d.day === "cp-day").map(d => d.dayNumber);
    expect(bike[1] - bike[0]).toBeGreaterThanOrEqual(2);
    expect(plan[0].session.sport).toBe("bike");
    expect(plan[1].session.sport).toBe("run");
    expect(new Set(plan.map(d => d.dayNumber)).size).toBe(plan.length);
  });
  it("plan des tests à faire : seulement les Days qui couvrent un test à faire ou à retester", () => {
    const c = buildTestChecklist(input({ vma: null, paceThresholdSecPerKm: null }), "2026-11-20");
    const todo = buildTestingPlan(c, false).map(d => d.day);
    expect(todo).toContain("track-day");
    expect(todo).not.toContain("bike-day"); // tests vélo à jour
  });
  it("tout est à jour : plan vide, plan complet disponible", () => {
    const c = buildTestChecklist(input({ durabilityPairs: [{ day: "2026-11-15", sport: "bike", between: 120, target: "200", early: "200", late: "200", hr1: 140, hr2: 146, rpe1: 4, rpe2: 6, context: "home-trainer" }, { day: "2026-11-16", sport: "run", between: 60, target: "5:30", early: "5:30", late: "5:30", hr1: 150, hr2: 156, rpe1: 4, rpe2: 6, context: "piste" }], criticalMetrics: { cycling: { critical: 260, reserve: 18000, status: "confirmed", latestEffortDate: "2026-11-10", efforts: [], warnings: [] },
      running: { critical: 4.2, reserve: 200, status: "confirmed", latestEffortDate: "2026-11-10", efforts: [], warnings: [] } } }), "2026-11-20");
    const todo = buildTestingPlan(c, false);
    expect(todo).toEqual([]);
    expect(buildTestingPlan(c, true).length).toBe(5);
  });
  it("Durability Day : deux blocs enregistrés rendent la durabilité « à jour »", () => {
    const c = buildTestChecklist(input({ durabilityPairs: [{ day: "2026-11-15", sport: "bike", between: 120, target: "200", early: "200", late: "200", hr1: 140, hr2: 146, rpe1: 4, rpe2: 6, context: "home-trainer" }, { day: "2026-11-16", sport: "run", between: 60, target: "5:30", early: "5:30", late: "5:30", hr1: 150, hr2: 156, rpe1: 4, rpe2: 6, context: "piste" }], }), "2026-11-20");
    const bike = c.items.find(i => i.key === "durability-bike")!;
    expect(bike.status).toBe("ok");
    expect(bike.valueText).toContain("Durability Day");
  });
  it("les semaines suivantes sont décalées proprement", () => {
    const plan = buildTestingPlan(buildTestChecklist(base, "2026-11-20"), true);
    for (const d of plan) { expect(d.session.dayIndex).toBeGreaterThanOrEqual(0); expect(d.session.dayIndex).toBeLessThan(7); expect(d.session.weekNumber).toBe(1); }
  });
});
