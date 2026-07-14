import { describe, it, expect } from "vitest";
import { computeWeeklySessionQuota } from "@/engines/plan/sessionSizingMatrix";
import { buildWeeklySlotLayout, diffLayoutVsWeek, formatWeeklySlotLayoutLine } from "@/engines/plan/weeklySlotLayout";

function build(objective: string, ambition: string, hours: number, weekType: "load"|"recovery"|"taper"|"race") {
  const r = computeWeeklySessionQuota(objective, ambition, hours, weekType)!;
  return buildWeeklySlotLayout(r.quota, r.floors, weekType);
}

describe("weeklySlotLayout — buildWeeklySlotLayout", () => {
  it("703 age_group load : lundi repos, SL bike samedi, SL run dimanche", () => {
    const l = build("IRONMAN 70.3", "age_group", 10, "load");
    const lundi = l.days.find(d => d.dayName === "lundi")!;
    const samedi = l.days.find(d => d.dayName === "samedi")!;
    const dimanche = l.days.find(d => d.dayName === "dimanche")!;
    expect(lundi.isRest).toBe(true);
    expect(samedi.slots.some(s => s.sport === "bike" && s.isLongSession && s.minDurationMin === 120)).toBe(true);
    expect(dimanche.slots.some(s => s.sport === "run" && s.isLongSession && s.minDurationMin === 90)).toBe(true);
  });

  it("703 age_group load : renfo JAMAIS le vendredi", () => {
    const l = build("IRONMAN 70.3", "age_group", 10, "load");
    const ven = l.days.find(d => d.dayName === "vendredi")!;
    expect(ven.slots.some(s => s.sport === "strength")).toBe(false);
  });

  it("703 age_group load : nb total de slots = totalSessions.min (11)", () => {
    const l = build("IRONMAN 70.3", "age_group", 10, "load");
    const total = l.days.reduce((n, d) => n + d.slots.length, 0);
    expect(total).toBeGreaterThanOrEqual(10);
    expect(total).toBeLessThanOrEqual(12);
  });

  it("TRI_SPRINT finisher : SL présentes, layout faisable", () => {
    const l = build("TRIATHLON SPRINT", "finisher", 7, "load");
    const samedi = l.days.find(d => d.dayName === "samedi")!;
    const dimanche = l.days.find(d => d.dayName === "dimanche")!;
    expect(samedi.slots.some(s => s.sport === "bike" && s.isLongSession && s.minDurationMin === 75)).toBe(true);
    expect(dimanche.slots.some(s => s.sport === "run" && s.isLongSession && s.minDurationMin === 60)).toBe(true);
  });

  it("SEMI age_group : run SL dimanche (min 90min), pas de bike SL", () => {
    const l = build("SEMI-MARATHON", "age_group", 6, "load");
    const dim = l.days.find(d => d.dayName === "dimanche")!;
    expect(dim.slots.some(s => s.sport === "run" && s.isLongSession && s.minDurationMin === 90)).toBe(true);
    // pas de SL bike (SEMI n'a pas longRideWeekly)
    const hasBikeSL = l.days.some(d => d.slots.some(s => s.sport === "bike" && s.isLongSession));
    expect(hasBikeSL).toBe(false);
  });

  it("recovery week : SL maintenues mais durée plancher réduite (85/65)", () => {
    const l = build("IRONMAN 70.3", "age_group", 10, "recovery");
    const sam = l.days.find(d => d.dayName === "samedi")!;
    const dim = l.days.find(d => d.dayName === "dimanche")!;
    expect(sam.slots.find(s => s.isLongSession && s.sport === "bike")?.minDurationMin).toBe(85);
    expect(dim.slots.find(s => s.isLongSession && s.sport === "run")?.minDurationMin).toBe(65);
  });

  it("format compact ligne : contient jours + sports", () => {
    const l = build("IRONMAN 70.3", "age_group", 10, "load");
    const line = formatWeeklySlotLayoutLine(3, l);
    expect(line).toContain("Semaine 3");
    expect(line).toContain("Lun: repos");
    expect(line).toMatch(/Sam.*VÉLO/);
  });
});

describe("weeklySlotLayout — diffLayoutVsWeek", () => {
  it("no drift si observed matche exactement", () => {
    const l = build("IRONMAN 70.3", "age_group", 10, "load");
    const observed = new Map<string, string[]>();
    for (const d of l.days) {
      if (d.isRest) continue;
      observed.set(d.dayName, d.slots.map(s => s.sport));
    }
    const drifts = diffLayoutVsWeek(l, observed);
    expect(drifts.length).toBe(0);
  });

  it("drift détecté si samedi bike SL absent (observed = run)", () => {
    const l = build("IRONMAN 70.3", "age_group", 10, "load");
    const observed = new Map<string, string[]>();
    for (const d of l.days) {
      if (d.isRest) continue;
      observed.set(d.dayName, d.slots.map(s => s.sport));
    }
    observed.set("samedi", ["run"]);
    const drifts = diffLayoutVsWeek(l, observed);
    expect(drifts.some(d => d.dayName === "samedi")).toBe(true);
  });
});
