import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeModelJsonForSchema } from "./generateChunkJSON.ts";

function mkPlan(sessions: unknown[], weekOverrides: Partial<Record<string, unknown>> = {}) {
  return {
    weeks: [
      {
        weekNumber: 1,
        phase: "base",
        theme: "T",
        sessions,
        ...weekOverrides,
      },
    ],
  };
}

Deno.test("normalize — day 'Lundi' → 'lundi'", () => {
  const input = mkPlan([{ day: "Lundi", sport: "swim", durationMin: 30 }]);
  const { value, repairs } = normalizeModelJsonForSchema(input, []);
  const w = (value as any).weeks[0];
  assertEquals(w.sessions[0].day, "lundi");
  assertEquals(repairs.some(r => r.includes("day canonicalized")), true);
});

Deno.test("normalize — sport 'CAP' → 'run'", () => {
  const input = mkPlan([{ day: "lundi", sport: "CAP", durationMin: 45 }]);
  const { value, repairs } = normalizeModelJsonForSchema(input, []);
  assertEquals((value as any).weeks[0].sessions[0].sport, "run");
  assertEquals(repairs.some(r => r.includes("sport canonicalized")), true);
});

Deno.test("normalize — sport 'Vélo' → 'bike'", () => {
  const input = mkPlan([{ day: "lundi", sport: "Vélo", durationMin: 60 }]);
  const { value } = normalizeModelJsonForSchema(input, []);
  assertEquals((value as any).weeks[0].sessions[0].sport, "bike");
});

Deno.test("normalize — phase 'Fondation' → 'base'", () => {
  const input = mkPlan([{ day: "lundi", sport: "swim", durationMin: 30 }], { phase: "Fondation" });
  const { value, repairs } = normalizeModelJsonForSchema(input, []);
  assertEquals((value as any).weeks[0].phase, "base");
  assertEquals(repairs.some(r => r.includes("phase canonicalized")), true);
});

Deno.test("normalize — phase 'Affûtage' → 'taper'", () => {
  const input = mkPlan([{ day: "lundi", sport: "swim", durationMin: 30 }], { phase: "Affûtage" });
  const { value } = normalizeModelJsonForSchema(input, []);
  assertEquals((value as any).weeks[0].phase, "taper");
});

Deno.test("normalize — durationMin 52.5 → 53", () => {
  const input = mkPlan([{ day: "lundi", sport: "swim", durationMin: 52.5 }]);
  const { value, repairs } = normalizeModelJsonForSchema(input, []);
  assertEquals((value as any).weeks[0].sessions[0].durationMin, 53);
  assertEquals(repairs.some(r => r.includes("durationMin rounded")), true);
});

Deno.test("normalize — weekRange filtre 10,11,11,12,13 → [11,12]", () => {
  const input = {
    weeks: [
      { weekNumber: 10, phase: "base", theme: "", sessions: [] },
      { weekNumber: 11, phase: "base", theme: "A", sessions: [] },
      { weekNumber: 11, phase: "base", theme: "B", sessions: [] },
      { weekNumber: 12, phase: "build", theme: "", sessions: [] },
      { weekNumber: 13, phase: "build", theme: "", sessions: [] },
    ],
  };
  const { value, repairs } = normalizeModelJsonForSchema(input, [], { start: 11, end: 12 });
  const weeks = (value as any).weeks;
  assertEquals(weeks.length, 2);
  assertEquals(weeks[0].weekNumber, 11);
  assertEquals(weeks[0].theme, "A"); // premier gagnant
  assertEquals(weeks[1].weekNumber, 12);
  assertEquals(repairs.filter(r => r.includes("out-of-range")).length, 2);
  assertEquals(repairs.filter(r => r.includes("dedup")).length, 1);
});

Deno.test("normalize — session déjà canonique ⇒ AUCUN repair", () => {
  const input = mkPlan([
    {
      day: "mardi",
      sport: "bike",
      title: "T",
      details: "",
      isKeySession: false,
      custom: true,
      catalogId: null,
      durationMin: 90,
      zones: [],
    },
  ]);
  const { repairs } = normalizeModelJsonForSchema(input, []);
  assertEquals(repairs.length, 0);
});
