import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildStructuredDiagnosticBlock } from "./promptHelpers.ts";

/**
 * Correctif ciblé #F (sprint qualité Marathon/Ironman, oct. 2026, demande
 * coach explicite) : la contrainte `maxDoubleDaysPerWeek` (contrôlée côté
 * validateur depuis la Correction E) doit aussi être transmise EXPLICITEMENT
 * au modèle pendant la génération, comme un MAXIMUM — jamais un objectif —
 * et sans jamais toucher aux règles de volume.
 */
function minimalConfig(overrides: Record<string, unknown> = {}) {
  return {
    objective: "Ironman 70.3",
    ambition: "Confirmé",
    weeksAvailable: 32,
    raceGoals: [{ objective: "Ironman 70.3", priority: "A" }],
    ...overrides,
  };
}

Deno.test("buildStructuredDiagnosticBlock — maxDoubleDaysPerWeek=4 → instruction explicite, présentée comme un maximum, jamais un objectif", () => {
  const diag = buildStructuredDiagnosticBlock(minimalConfig({ maxDoubleDaysPerWeek: 4 }), 32);
  assertStringIncludes(diag, "Max journées doubles/sem: 4");
  assertStringIncludes(diag, "MAXIMUM à ne jamais dépasser");
  assertStringIncludes(diag, "PAS un objectif à atteindre");
  assertStringIncludes(diag, "Moins de journées doubles reste toujours conforme");
});

Deno.test("buildStructuredDiagnosticBlock — maxDoubleDaysPerWeek=2 → la valeur exacte apparaît (2, pas 4 codé en dur)", () => {
  const diag = buildStructuredDiagnosticBlock(minimalConfig({ maxDoubleDaysPerWeek: 2 }), 32);
  assertStringIncludes(diag, "Max journées doubles/sem: 2");
});

Deno.test("buildStructuredDiagnosticBlock — maxDoubleDaysPerWeek=0 (valeur significative : aucune journée double) → instruction présente, pas traitée comme absente", () => {
  const diag = buildStructuredDiagnosticBlock(minimalConfig({ maxDoubleDaysPerWeek: 0 }), 32);
  assertStringIncludes(diag, "Max journées doubles/sem: 0");
});

Deno.test("buildStructuredDiagnosticBlock — maxDoubleDaysPerWeek absent → aucune instruction fabriquée, comportement inchangé", () => {
  const diag = buildStructuredDiagnosticBlock(minimalConfig(), 32);
  assertEquals(diag.includes("Max journées doubles/sem"), false);
});

Deno.test("buildStructuredDiagnosticBlock — maxDoubleDaysPerWeek ne modifie aucune ligne de volume (weeklyHours/sessionsPerWeek inchangés)", () => {
  const withCap = buildStructuredDiagnosticBlock(minimalConfig({ weeklyHours: 17, sessionsPerWeek: 11, maxDoubleDaysPerWeek: 4 }), 32);
  const withoutCap = buildStructuredDiagnosticBlock(minimalConfig({ weeklyHours: 17, sessionsPerWeek: 11 }), 32);
  assertStringIncludes(withCap, "📊 Volume: 17h/sem");
  assertStringIncludes(withCap, "📊 Séances: 11/sem");
  // Les lignes de volume sont strictement identiques entre les deux versions.
  const volumeLine = (s: string) => s.split("\n").find((l) => l.includes("📊 Volume:"));
  const sessionsLine = (s: string) => s.split("\n").find((l) => l.includes("📊 Séances:"));
  assertEquals(volumeLine(withCap), volumeLine(withoutCap));
  assertEquals(sessionsLine(withCap), sessionsLine(withoutCap));
});
