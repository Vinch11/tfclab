import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computePhaseCoverageGaps } from "./generatePhasesPatch.ts";
import type { PhaseSummaryJSON } from "./planSchema.ts";

function phase(name: string, weeks: string): PhaseSummaryJSON {
  return { name, weeks };
}

Deno.test("computePhaseCoverageGaps — récap complet → aucun trou", () => {
  const phases = [phase("Base", "S1-S4"), phase("Build", "S5-S8")];
  assertEquals(computePhaseCoverageGaps(phases, 8), []);
});

Deno.test("computePhaseCoverageGaps — récap vide → un seul trou couvrant tout le plan", () => {
  assertEquals(computePhaseCoverageGaps(undefined, 5), [{ start: 1, end: 5 }]);
  assertEquals(computePhaseCoverageGaps([], 5), [{ start: 1, end: 5 }]);
});

// Cas réel ciblé par ce correctif : le chunk 1 ne couvre que le DÉBUT du plan
// (bug "Vince"/"Manu" — chunk tronqué/oublié) → trou en FIN de plan.
Deno.test("computePhaseCoverageGaps — trou en fin de plan (chunk 1 tronqué)", () => {
  const phases = [phase("Base", "S1-S4")];
  assertEquals(computePhaseCoverageGaps(phases, 10), [{ start: 5, end: 10 }]);
});

Deno.test("computePhaseCoverageGaps — trou en tête de plan", () => {
  const phases = [phase("Peak", "S5-S10")];
  assertEquals(computePhaseCoverageGaps(phases, 10), [{ start: 1, end: 4 }]);
});

// Cas qu'aucun mécanisme existant ne gérait avant ce correctif : un trou au
// MILIEU du récap (ex: chunk 1 saute une plage) — le fallback d'affichage
// (normalizeWeeksPhases.ts) ne gère que le trou final, jamais un trou interne.
Deno.test("computePhaseCoverageGaps — trou au milieu du récap", () => {
  const phases = [phase("Base", "S1-S4"), phase("Peak", "S8-S10")];
  assertEquals(computePhaseCoverageGaps(phases, 10), [{ start: 5, end: 7 }]);
});

Deno.test("computePhaseCoverageGaps — plusieurs trous distincts (tête + milieu + fin)", () => {
  const phases = [phase("Build", "S3-S4"), phase("Peak", "S7-S8")];
  assertEquals(computePhaseCoverageGaps(phases, 10), [
    { start: 1, end: 2 },
    { start: 5, end: 6 },
    { start: 9, end: 10 },
  ]);
});

Deno.test("computePhaseCoverageGaps — formats de plage alternatifs (\"à\", tiret long) acceptés", () => {
  const phases = [phase("Base", "S1 à S4"), phase("Build", "S5–S8")];
  assertEquals(computePhaseCoverageGaps(phases, 8), []);
});

Deno.test("computePhaseCoverageGaps — entrée non parsable ignorée (ne couvre rien, pas de crash)", () => {
  const phases = [phase("Base", "texte libre sans plage")];
  assertEquals(computePhaseCoverageGaps(phases, 4), [{ start: 1, end: 4 }]);
});
