import { describe, expect, it } from "vitest";
import { enforceRaceProtectionCaps, validateRaceCalendar } from "@/lib/plan/raceCalendarValidation";

/** Plan d'Emanuela (27/11/2026) : course de 2 h à J+12 du marathon de Séville, plafond 45 min. */
const config = { planStartDate: "2026-11-16", raceGoals: [{ objective: "Marathon", raceName: "Séville", raceDate: "2027-02-21", priority: "B" as const }] };
const session = (day: string, sport: string, durationMin: number) => ({ day, dayName: day, sport, durationMin, title: "x", details: "Main: longue", isRest: false, catalogId: null, custom: true, zones: ["Z2"] });

describe("plafonds des jours protégés autour d'une course", () => {
  it("J+12 : course ramenée à 45 min avec une note ; J+1 : repos complet", () => {
    const plan = { weeks: [
      { weekNumber: 15, sessions: [session("lundi", "bike", 60)] },
      { weekNumber: 16, sessions: [session("vendredi", "run", 120), session("mardi", "bike", 100)] },
    ] };
    const trimmed = new WeakSet<object>();
    const log = enforceRaceProtectionCaps(plan as never, config, trimmed);
    expect(plan.weeks[1].sessions[0].durationMin).toBe(45);
    expect(plan.weeks[1].sessions[0].details).toMatch(/^Raccourci par TFCL : récupération après Séville, 45 min/);
    expect(trimmed.has(plan.weeks[1].sessions[0])).toBe(true);
    expect(plan.weeks[1].sessions[1].durationMin).toBe(100); // vélo sous son plafond
    expect(plan.weeks[0].sessions[0]).toMatchObject({ sport: "rest", isRest: true });
    expect(log).toHaveLength(2);
    expect(validateRaceCalendar(plan as never, config).filter(i => /unsafe/.test(i.rule))).toEqual([]);
  });
});
