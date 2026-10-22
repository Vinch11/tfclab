import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { buildStructuredDiagnosticBlock } from "./promptHelpers.ts";

/**
 * Correction #1 (sprint qualité Marathon/Ironman, oct. 2026) : le bloc
 * "RAMPE DE VOLUME OBLIGATOIRE" du prompt ignorait la Charge Récente de
 * Référence (CRR) — même quand le bloc "CHARGE RÉCENTE" juste au-dessus,
 * dans le même prompt, donnait une consigne contraire pour la même décision
 * (vitesse de montée en charge S1-S2). Ces tests vérifient que le modèle
 * reçoit bien le signal réconcilié (`recentLoadAdjustment`) quand
 * `planConfigBuilder.ts` l'a calculé, et que le bloc reste inchangé sinon.
 */
function minimalConfig(overrides: Record<string, unknown> = {}) {
  return {
    objective: "Marathon",
    ambition: "Confirmé",
    weeksAvailable: 16,
    raceGoals: [{ objective: "Marathon", priority: "A" }],
    ...overrides,
  };
}

Deno.test("buildStructuredDiagnosticBlock — recentLoadAdjustment présent → la ligne d'ajustement apparaît avec sa raison", () => {
  const diag = buildStructuredDiagnosticBlock(
    minimalConfig({
      volumeRamp: {
        trainingLevel: "trained",
        week1PctTarget: 0.60,
        rampWeeks: 4,
        week1HoursCap: 8,
        weeklyHoursTarget: 10,
        week1HoursMax: 6,
        weeklyIncreasePctMax: 0.10,
        recentLoadAdjustment: {
          effectiveLevel: "light",
          reason: "Charge récente réelle mesurée basse (150 TSS/7j) pour un niveau déclaré \"trained\" — rampe calculée sur le palier \"light\" par prudence.",
        },
      },
    }),
    16,
  );
  assertStringIncludes(diag, "AJUSTÉ PAR LA CHARGE RÉCENTE RÉELLE");
  assertStringIncludes(diag, "Charge récente réelle mesurée basse");
});

Deno.test("buildStructuredDiagnosticBlock — sans recentLoadAdjustment → pas de ligne d'ajustement, rampe normale inchangée", () => {
  const diag = buildStructuredDiagnosticBlock(
    minimalConfig({
      volumeRamp: {
        trainingLevel: "trained",
        week1PctTarget: 0.80,
        rampWeeks: 2,
        week1HoursCap: null,
        weeklyHoursTarget: 10,
        week1HoursMax: 8,
        weeklyIncreasePctMax: 0.10,
      },
    }),
    16,
  );
  assert(!diag.includes("AJUSTÉ PAR LA CHARGE RÉCENTE RÉELLE"));
  assertStringIncludes(diag, "RAMPE DE VOLUME OBLIGATOIRE");
  assertStringIncludes(diag, "MAX 8h");
});
