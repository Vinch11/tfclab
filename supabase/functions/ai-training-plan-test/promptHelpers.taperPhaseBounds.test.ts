import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildStructuredDiagnosticBlock } from "./promptHelpers.ts";

/**
 * Bug réel confirmé (audit "Test_Vince", plan 703 LCW 8 semaines) : le bloc
 * "BORNES DE PHASE ESTIMÉES" injecté dans le prompt (guidance textuelle lue
 * par le LLM) calculait sa propre durée de taper via une table locale
 * (Semi=2, Trail générique=2 — divergentes de TAPER_WEEKS_BY_OBJECTIVE côté
 * client) ET un plafond `Math.min(fullTaper, Math.floor(totalWeeks*0.2))`
 * sans équivalent côté moteur de quotas. Sur ce plan précis (703, 8
 * semaines), ça donnait "Bloc Affûtage : S8-S8" (1 semaine) dans la CONSIGNE
 * lue par le LLM, pendant que le moteur de quotas (et inferPhaseFromWeek,
 * cf. jsonPlanHandler.ts) traitaient déjà S7 ET S8 comme taper. Le LLM
 * recevait deux consignes contradictoires — exactement la même classe de
 * split-brain que le bug fuite_mapping déjà corrigé sur inferPhaseFromWeek,
 * mais une étape plus en amont dans le pipeline (le texte du prompt
 * lui-même, pas seulement le repli catalogue post-génération).
 */

function minimalConfig(overrides: Record<string, unknown> = {}) {
  return {
    objective: "Ironman 70.3",
    ambition: "competitor",
    identifiedLimitersRaw: ["VLamax haute"],
    identifiedLimiters: ["VLamax haute"],
    ...overrides,
  };
}

function affutageLine(text: string): string {
  return text.split("\n").find((l) => l.includes("Bloc Affûtage")) ?? "";
}

Deno.test("buildStructuredDiagnosticBlock — 703, 8 semaines, L1=VLamax : Bloc Affûtage = S7-S8 (2 semaines, cohérent avec le moteur de quotas)", () => {
  const text = buildStructuredDiagnosticBlock(minimalConfig(), 8);
  assertStringIncludes(affutageLine(text), "S7-S8");
});

Deno.test("buildStructuredDiagnosticBlock — IM, 12 semaines, L1=VLamax : taper = 3 semaines (S10-S12)", () => {
  const text = buildStructuredDiagnosticBlock(minimalConfig({ objective: "Ironman" }), 12);
  assertStringIncludes(affutageLine(text), "S10-S12");
});

Deno.test("buildStructuredDiagnosticBlock — Semi, 8 semaines : taper = 1 semaine (pas 2 — ancienne table locale divergeait du moteur de quotas)", () => {
  const text = buildStructuredDiagnosticBlock(
    minimalConfig({ objective: "Semi-marathon", identifiedLimitersRaw: ["Endurance faible"], identifiedLimiters: ["Endurance faible"] }),
    8,
  );
  assertStringIncludes(affutageLine(text), "S8-S8");
});

Deno.test("buildStructuredDiagnosticBlock — 703, 20 semaines : taper reste 2 semaines (comportement long-plan inchangé)", () => {
  const text = buildStructuredDiagnosticBlock(minimalConfig(), 20);
  assertStringIncludes(affutageLine(text), "S19-S20");
});
