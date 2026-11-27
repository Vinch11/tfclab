import { describe, expect, it } from "vitest";
import { applyTaperLongSessionFloors } from "@/engines/plan/longRidePolicy";

/** Plan Ironman d'Emanuela (27/11/2026) : la plus longue sortie passait de 5h40 à 1h15 à J-20. */
describe("affûtage : une séance longue raccourcie progressivement", () => {
  const base = { longRideWeekly: false, longRunWeekly: false } as never;
  it("Ironman : 3 h de vélo et 1h15 de course à J-21, 2 h et 1 h à J-14", () => {
    expect(applyTaperLongSessionFloors(base, { objective: "Ironman", weeksToRace: 2, weekType: "taper" })).toMatchObject({ slLongRideMin: 180, slLongRunMin: 75, longRideWeekly: true, longRunWeekly: true });
    expect(applyTaperLongSessionFloors(base, { objective: "IM", weeksToRace: 1, weekType: "taper" })).toMatchObject({ slLongRideMin: 120, slLongRunMin: 60 });
  });
  it("semaine de course, semaine non affûtage, Long Course Weekend, cycle de maintien : rien d'imposé", () => {
    expect(applyTaperLongSessionFloors(base, { objective: "IM", weeksToRace: 0, weekType: "taper" })).toBe(base);
    expect(applyTaperLongSessionFloors(base, { objective: "IM", weeksToRace: 2, weekType: "load" })).toBe(base);
    expect(applyTaperLongSessionFloors(base, { objective: "IM", weeksToRace: 2, weekType: "taper", isLCW: true })).toBe(base);
    expect(applyTaperLongSessionFloors(base, { objective: "IM", weeksToRace: 2, weekType: "taper", isMaintenance: true })).toBe(base);
  });
  it("marathon et semi : course longue seulement ; 10 km et 5 km : inchangés", () => {
    expect(applyTaperLongSessionFloors(base, { objective: "Marathon", weeksToRace: 2, weekType: "taper" })).toMatchObject({ slLongRunMin: 120 });
    expect(applyTaperLongSessionFloors(base, { objective: "Marathon", weeksToRace: 2, weekType: "taper" })).not.toHaveProperty("slLongRideMin");
    expect(applyTaperLongSessionFloors(base, { objective: "Semi-marathon", weeksToRace: 1, weekType: "taper" })).toMatchObject({ slLongRunMin: 70 });
    expect(applyTaperLongSessionFloors(base, { objective: "10K", weeksToRace: 1, weekType: "taper" })).toBe(base);
  });
  it("un plancher existant plus haut est conservé", () => {
    expect(applyTaperLongSessionFloors({ slLongRideMin: 200 } as never, { objective: "IM", weeksToRace: 2, weekType: "taper" })).toMatchObject({ slLongRideMin: 200 });
  });
  it("jamais plus long que les fiches d'affûtage disponibles (sinon sauvegarde bloquée)", () => {
    expect(applyTaperLongSessionFloors(base, { objective: "IM", weeksToRace: 2, weekType: "taper", catalogueMaxMin: { ride: 150, run: 75 } })).toMatchObject({ slLongRideMin: 150, slLongRunMin: 75 });
    // Moins de 45 min réalisables : pas de plancher imposé.
    expect(applyTaperLongSessionFloors(base, { objective: "SEMI", weeksToRace: 1, weekType: "taper", catalogueMaxMin: { run: 40 } })).toBe(base);
  });
});
