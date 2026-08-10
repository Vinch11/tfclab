import { describe, it, expect } from "vitest";
import { computeWeeklySessionQuota } from "@/engines/plan/sessionSizingMatrix";
import { buildWeeklySlotLayout, diffLayoutVsWeek, formatWeeklySlotLayoutLine } from "@/engines/plan/weeklySlotLayout";

function build(objective: string, ambition: string, hours: number, weekType: "load"|"recovery"|"taper"|"race") {
  const r = computeWeeklySessionQuota(objective, ambition, hours, weekType)!;
  return buildWeeklySlotLayout(r.quota, r.floors, weekType);
}

describe("weeklySlotLayout — buildWeeklySlotLayout", () => {
  it("703 age_group load : lundi repos, brick SL samedi (surrogate SL vélo), SL run dimanche", () => {
    const l = build("IRONMAN 70.3", "age_group", 10, "load");
    const lundi = l.days.find(d => d.dayName === "lundi")!;
    const samedi = l.days.find(d => d.dayName === "samedi")!;
    const dimanche = l.days.find(d => d.dayName === "dimanche")!;
    expect(lundi.isRest).toBe(true);
    // PHASE 2A.4 : brick occupe samedi comme SL vélo surrogate (≥ 120+20=140min).
    expect(samedi.slots.some(s => s.sport === "brick" && s.isLongSession && (s.minDurationMin ?? 0) >= 140)).toBe(true);
    // Pas de SL vélo dédiée cette semaine-là (le brick tient ce rôle).
    expect(l.days.every(d => !d.slots.some(s => s.sport === "bike" && s.isLongSession))).toBe(true);
    expect(dimanche.slots.some(s => s.sport === "run" && s.isLongSession && s.minDurationMin === 90)).toBe(true);
  });

  it("703 age_group load : renfo JAMAIS le vendredi", () => {
    const l = build("IRONMAN 70.3", "age_group", 10, "load");
    const ven = l.days.find(d => d.dayName === "vendredi")!;
    expect(ven.slots.some(s => s.sport === "strength")).toBe(false);
  });

  it("703 age_group load : nb total de slots dans la fourchette matrice", () => {
    const l = build("IRONMAN 70.3", "age_group", 10, "load");
    const total = l.days.reduce((n, d) => n + d.slots.length, 0);
    expect(total).toBeGreaterThanOrEqual(9);
    expect(total).toBeLessThanOrEqual(12);
  });

  it("PHASE 2A.4 : brick et SL vélo JAMAIS le même jour (aucune semaine tri)", () => {
    for (const l of [
      build("IRONMAN 70.3", "age_group", 10, "load"),
      build("IRONMAN 70.3", "competitor", 12, "load"),
      build("IRONMAN", "age_group", 10, "load"),
      build("TRIATHLON SPRINT", "age_group", 8, "load"),
    ]) {
      for (const d of l.days) {
        const hasBrick = d.slots.some(s => s.sport === "brick");
        const hasBikeSL = d.slots.some(s => s.sport === "bike" && s.isLongSession);
        expect(hasBrick && hasBikeSL).toBe(false);
      }
    }
  });

  it("TRI_SPRINT finisher : brick SL samedi (surrogate ≥95min), SL run dimanche", () => {
    const l = build("TRIATHLON SPRINT", "finisher", 7, "load");
    const samedi = l.days.find(d => d.dayName === "samedi")!;
    const dimanche = l.days.find(d => d.dayName === "dimanche")!;
    // Sprint finisher : brick midpoint(0,1)=1 → brick tient le rôle SL vélo (75+20=95).
    expect(samedi.slots.some(s => s.sport === "brick" && s.isLongSession && (s.minDurationMin ?? 0) >= 95)).toBe(true);
    expect(dimanche.slots.some(s => s.sport === "run" && s.isLongSession && s.minDurationMin === 60)).toBe(true);
  });

  it("PHASE 2A.3 : brick et run JAMAIS le même jour (sprint & 70.3)", () => {
    for (const l of [
      build("TRIATHLON SPRINT", "age_group", 8, "load"),
      build("IRONMAN 70.3", "age_group", 10, "load"),
      build("IRONMAN 70.3", "competitor", 12, "load"),
    ]) {
      for (const d of l.days) {
        const hasBrick = d.slots.some(s => s.sport === "brick");
        const hasRun = d.slots.some(s => s.sport === "run");
        expect(hasBrick && hasRun).toBe(false);
      }
    }
  });

  it("PHASE 2A.3 : renfo jamais sur un jour déjà double", () => {
    for (const l of [
      build("IRONMAN 70.3", "age_group", 10, "load"),
      build("IRONMAN 70.3", "competitor", 12, "load"),
    ]) {
      for (const d of l.days) {
        const strengthHere = d.slots.some(s => s.sport === "strength");
        if (strengthHere) {
          expect(d.slots.length).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it("SEMI age_group : run SL dimanche (min 90min), pas de bike SL", () => {
    const l = build("SEMI-MARATHON", "age_group", 6, "load");
    const dim = l.days.find(d => d.dayName === "dimanche")!;
    expect(dim.slots.some(s => s.sport === "run" && s.isLongSession && s.minDurationMin === 90)).toBe(true);
    // pas de SL bike (SEMI n'a pas longRideWeekly)
    const hasBikeSL = l.days.some(d => d.slots.some(s => s.sport === "bike" && s.isLongSession));
    expect(hasBikeSL).toBe(false);
  });

  it("recovery week 70.3 : brick surrogate SL vélo (≥85+20=105min), SL run 65min", () => {
    const l = build("IRONMAN 70.3", "age_group", 10, "recovery");
    const sam = l.days.find(d => d.dayName === "samedi")!;
    const dim = l.days.find(d => d.dayName === "dimanche")!;
    // Brick prend samedi (surrogate SL vélo), min durée = 85+20=105.
    expect(sam.slots.some(s => s.sport === "brick" && s.isLongSession && (s.minDurationMin ?? 0) >= 105)).toBe(true);
    expect(dim.slots.find(s => s.isLongSession && s.sport === "run")?.minDurationMin).toBe(65);
  });

  it("format compact ligne : contient jours + sports", () => {
    const l = build("IRONMAN 70.3", "age_group", 10, "load");
    const line = formatWeeklySlotLayoutLine(3, l);
    expect(line).toContain("Semaine 3");
    expect(line).toContain("Lun: repos");
    // Samedi contient soit VÉLO (SL bike) soit BRICK selon présence de brick au quota.
    expect(line).toMatch(/Sam.*(VÉLO|BRICK)/);
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

describe("plancher fréquence course taper/race", () => {
  const quota = {
    swim: { min: 1, max: 2 }, bike: { min: 1, max: 2 }, run: { min: 0, max: 1 },
    brick: { min: 0, max: 0 }, strength: { min: 0, max: 0 },
    maxSessionsPerDay: 2, minFullRestDays: 1,
  } as any;
  const floors = { minSwimPerWeek: 1, minStrengthPerWeek: 0, longRideWeekly: false, longRunWeekly: false } as any;

  it("garantit ≥2 créneaux course en semaine de course", () => {
    const l = buildWeeklySlotLayout(quota, floors, "race", { finalStageSport: "run" });
    const runs = l.days.flatMap(d => d.slots).filter(s => s.sport === "run");
    expect(runs.length).toBeGreaterThanOrEqual(2);
    expect(runs.every(s => s.isActivation)).toBe(true);
  });

  it("ne change rien en semaine de charge", () => {
    const l = buildWeeklySlotLayout(quota, floors, "load");
    const runs = l.days.flatMap(d => d.slots).filter(s => s.sport === "run");
    expect(runs.every(s => !s.isActivation)).toBe(true);
  });
});
