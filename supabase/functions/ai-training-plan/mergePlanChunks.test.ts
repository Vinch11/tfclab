import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mergePlanChunks, MergePlanError } from "./mergePlanChunks.ts";
import type { PlanChunk } from "./planSchema.ts";

function makeWeek(n: number, sessionsCount = 1): PlanChunk["weeks"][number] {
  return {
    weekNumber: n,
    phase: "base",
    theme: `Semaine ${n}`,
    sessions: Array.from({ length: sessionsCount }, (_, i) => ({
      day: "lundi",
      title: `S${n}-J${i}`,
      details: "",
      isKeySession: false,
      durationMin: 60,
      zones: ["Z2"],
      sport: "bike",
      custom: false,
      catalogId: "B_BIKE_TEMPO",
    })) as PlanChunk["weeks"][number]["sessions"],
  };
}

Deno.test("mergePlanChunks — 3 chunks contigus → plan complet ordonné", () => {
  const chunks: PlanChunk[] = [
    { title: "Mon Plan", weeks: [makeWeek(1), makeWeek(2)] },
    { weeks: [makeWeek(3), makeWeek(4)] },
    { weeks: [makeWeek(5), makeWeek(6)] },
  ];
  const merged = mergePlanChunks(chunks, 6);
  assertEquals(merged.title, "Mon Plan");
  assertEquals(merged.weeks.length, 6);
  assertEquals(merged.weeks.map(w => w.weekNumber), [1, 2, 3, 4, 5, 6]);
  assertEquals(merged.weeks[0].sessions[0].dayName, "Lundi");
  assertEquals(merged.weeks[0].sessions[0].dayIndex, 0);
  assertEquals(merged.weeks[0].sessions[0].isRest, false);
});

Deno.test("mergePlanChunks — chunks désordonnés → réordonnés par weekNumber", () => {
  const chunks: PlanChunk[] = [
    { weeks: [makeWeek(4), makeWeek(3)] },
    { title: "P", weeks: [makeWeek(1), makeWeek(2)] },
  ];
  const merged = mergePlanChunks(chunks, 4);
  assertEquals(merged.weeks.map(w => w.weekNumber), [1, 2, 3, 4]);
});

Deno.test("mergePlanChunks — semaine manquante → MergePlanError code=GAP", () => {
  const chunks: PlanChunk[] = [
    { title: "P", weeks: [makeWeek(1), makeWeek(2), makeWeek(4)] },
  ];
  const err = assertThrows(
    () => mergePlanChunks(chunks, 4),
    MergePlanError,
    "manquantes",
  );
  assertEquals((err as MergePlanError).code, "GAP");
});

Deno.test("mergePlanChunks — doublon → MergePlanError code=DUP", () => {
  const chunks: PlanChunk[] = [
    { title: "P", weeks: [makeWeek(1), makeWeek(2)] },
    { weeks: [makeWeek(2), makeWeek(3)] },
  ];
  const err = assertThrows(
    () => mergePlanChunks(chunks, 3),
    MergePlanError,
    "doublon",
  );
  assertEquals((err as MergePlanError).code, "DUP");
});

Deno.test("mergePlanChunks — chunk unique (regenerateWeek) → 1 semaine", () => {
  // regenerateWeek : le chunk ne contient que la semaine régénérée,
  // et totalWeeks côté merge est passé à 1.
  const chunks: PlanChunk[] = [{ weeks: [makeWeek(1)] }];
  const merged = mergePlanChunks(chunks, 1);
  assertEquals(merged.weeks.length, 1);
  assertEquals(merged.weeks[0].weekNumber, 1);
});

Deno.test("mergePlanChunks — hors bornes → OUT_OF_RANGE", () => {
  const chunks: PlanChunk[] = [{ weeks: [makeWeek(5)] }];
  const err = assertThrows(
    () => mergePlanChunks(chunks, 3),
    MergePlanError,
    "hors bornes",
  );
  assertEquals((err as MergePlanError).code, "OUT_OF_RANGE");
});

Deno.test("mergePlanChunks — rest session → isRest=true, dayIndex correct", () => {
  const chunks: PlanChunk[] = [{
    weeks: [{
      weekNumber: 1,
      phase: "base",
      theme: "Récup",
      sessions: [{
        day: "dimanche",
        title: "Repos",
        details: "",
        isKeySession: false,
        durationMin: 0,
        zones: [],
        sport: "rest",
        custom: true,
        catalogId: null,
      }],
    }],
  }];
  const merged = mergePlanChunks(chunks, 1);
  const s = merged.weeks[0].sessions[0];
  assertEquals(s.isRest, true);
  assertEquals(s.dayName, "Dimanche");
  assertEquals(s.dayIndex, 6);
});
