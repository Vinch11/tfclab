import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildStructuredDiagnosticBlock } from "./promptHelpers.ts";

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #E (demande coach
 * explicite, suite à une hausse réelle 8h→17h/sem sur 4 semaines) : le bloc
 * "HISTORIQUE DE CHARGE DÉCLARATIF" du prompt — distinct du bloc "CHARGE
 * RÉCENTE" (TSS mesuré) déjà existant — doit guider qualitativement le
 * modèle vers la consolidation sans jamais présenter le ratio comme un
 * ACWR mesuré, et rester inactif si `loadHistory` est absent (comportement
 * historique inchangé pour tout appelant existant).
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

Deno.test("buildStructuredDiagnosticBlock — loadHistory avec hausse importante → bloc de consolidation présent, jamais labellisé ACWR", () => {
  const diag = buildStructuredDiagnosticBlock(
    minimalConfig({
      loadHistory: { chronicWeeklyHours: 8, recentWeeklyHours: 17, recentWeeksCount: 4 },
    }),
    32,
  );
  assertStringIncludes(diag, "HISTORIQUE DE CHARGE DÉCLARATIF");
  assertStringIncludes(diag, "8h/sem");
  assertStringIncludes(diag, "17h/sem");
  assertStringIncludes(diag, "PRIORISER la consolidation");
  assertStringIncludes(diag, "NE PAS appliquer de nouvelle hausse automatique");
  // Jamais présenté comme une mesure ACWR réelle — le mot ne doit pas apparaître du tout ici.
  assertEquals(diag.includes("ACWR"), false);
});

Deno.test("buildStructuredDiagnosticBlock — loadHistory sans écart notable (chronique ≈ récent) → pas de consigne de consolidation", () => {
  const diag = buildStructuredDiagnosticBlock(
    minimalConfig({
      loadHistory: { chronicWeeklyHours: 17, recentWeeklyHours: 17, recentWeeksCount: 20 },
    }),
    32,
  );
  assertStringIncludes(diag, "HISTORIQUE DE CHARGE DÉCLARATIF");
  assertStringIncludes(diag, "Pas d'écart déclaratif notable");
  assertEquals(diag.includes("PRIORISER la consolidation"), false);
});

Deno.test("buildStructuredDiagnosticBlock — loadHistory absent → bloc entièrement inactif, comportement inchangé", () => {
  const diag = buildStructuredDiagnosticBlock(minimalConfig(), 32);
  assertEquals(diag.includes("HISTORIQUE DE CHARGE DÉCLARATIF"), false);
});

Deno.test("buildStructuredDiagnosticBlock — loadHistory partiel (recentWeeklyHours seul) → bloc inactif, aucune donnée fabriquée", () => {
  const diag = buildStructuredDiagnosticBlock(
    minimalConfig({ loadHistory: { recentWeeklyHours: 17 } }),
    32,
  );
  assertEquals(diag.includes("HISTORIQUE DE CHARGE DÉCLARATIF"), false);
});
