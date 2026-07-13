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

// ─── strategicRecap canonicalisation ──────────────────────────────────────

function mkPlanWithRecap(recap: unknown) {
  return {
    weeks: [{ weekNumber: 1, phase: "base", theme: "T", sessions: [
      { day: "lundi", sport: "bike", title: "T", details: "", isKeySession: false, custom: true, catalogId: null, durationMin: 60, zones: [] },
    ]}],
    strategicRecap: recap,
  };
}

Deno.test("normalize — strategicRecap: alias 'statue'/'bloc'/'semaines'/'séances' canonicalisés", () => {
  const input = mkPlanWithRecap({
    limiters: [
      { nom: "VO2max", statue: "critique", bloc: "Build", semaines: "S3-S6", "séances": "VMA courte" },
    ],
    synergies: ["ok"],
  });
  const { value, repairs } = normalizeModelJsonForSchema(input, []);
  const lim = (value as any).strategicRecap.limiters[0];
  assertEquals(lim.name, "VO2max");
  assertEquals(lim.status, "critique");
  assertEquals(lim.block, "Build");
  assertEquals(lim.weeks, "S3-S6");
  assertEquals(lim.keySessions, "VMA courte");
  assertEquals(lim.rank, 1);
  assertEquals(repairs.some(r => r.includes('key "statue"→"status"')), true);
  assertEquals(repairs.some(r => r.includes('key "bloc"→"block"')), true);
});

Deno.test("normalize — strategicRecap: synergies objets → strings", () => {
  const input = mkPlanWithRecap({
    limiters: [{ rank: 1, name: "N", status: "s", block: "b", weeks: "w", keySessions: "k" }],
    synergies: [{ name: "Sync A", description: "boost VO2" }, "plain"],
  });
  const { value, repairs } = normalizeModelJsonForSchema(input, []);
  const syn = (value as any).strategicRecap.synergies;
  assertEquals(syn[0], "Sync A");
  assertEquals(syn[1], "plain");
  assertEquals(repairs.some(r => r.includes("synergies coerced")), true);
});

Deno.test("normalize — strategicRecap: keySessions array → join, sans rank → index+1", () => {
  const input = mkPlanWithRecap({
    limiters: [
      { name: "A", status: "s", block: "b", weeks: "w", keySessions: ["Séance1", "Séance2"] },
      { name: "B", status: "s", block: "b", weeks: "w", keySessions: "k" },
    ],
    synergies: [],
  });
  const { value } = normalizeModelJsonForSchema(input, []);
  const lims = (value as any).strategicRecap.limiters;
  assertEquals(lims[0].keySessions, "Séance1 · Séance2");
  assertEquals(lims[0].rank, 1);
  assertEquals(lims[1].rank, 2);
});

Deno.test("normalize — strategicRecap irrécupérable → droppé, chunk valide, repair loggé", () => {
  const input = mkPlanWithRecap({
    limiters: "not-an-array-at-all",
    synergies: 42,
  });
  const { value, repairs } = normalizeModelJsonForSchema(input, []);
  assertEquals((value as any).strategicRecap, undefined);
  assertEquals(repairs.some(r => r.includes("strategicRecap dropped")), true);
  // chunk core still intact
  assertEquals(Array.isArray((value as any).weeks), true);
});

Deno.test("normalize — strategicRecap déjà propre ⇒ aucun repair strategicRecap", () => {
  const input = mkPlanWithRecap({
    limiters: [{ rank: 1, name: "VO2max", status: "critique", block: "Build", weeks: "S3-S6", keySessions: "VMA" }],
    synergies: ["A", "B"],
  });
  const { repairs } = normalizeModelJsonForSchema(input, []);
  assertEquals(repairs.filter(r => r.startsWith("strategicRecap")).length, 0);
});

