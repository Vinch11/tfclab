import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildStructuredDiagnosticBlock } from "./promptHelpers.ts";

Deno.test("buildStructuredDiagnosticBlock consomme le contexte stratégique calculé", () => {
  const block = buildStructuredDiagnosticBlock({
    objective: "5 KM",
    ambition: "Découverte",
    identifiedLimitersRaw: ["Économie", "VO2max"],
    activeLevers: ["Économie de course", "Développer VO2max"],
    strategyContext: {
      source: "lorang",
      primaryAction: "Focus économie de course",
      confidence: "low",
      levers: [{
        id: "economy",
        label: "Économie de course",
        priority: 1,
        reason: "Économie sous la cible",
        adaptations: ["Technique", "Coordination"],
      }],
      trainingFocus: { do: ["Gestes simples"], avoid: ["Fatigue excessive"] },
      recommendedWeekType: "endurance",
    },
  }, 12);

  assertStringIncludes(block, "STRATÉGIE PHYSIOLOGIQUE CALCULÉE (lorang, confiance low)");
  assertStringIncludes(block, "Action prioritaire : Focus économie de course");
  assertStringIncludes(block, "Levier #1: Économie de course — Économie sous la cible");
  assertStringIncludes(block, "Adaptations recherchées : Technique ; Coordination");
  assertStringIncludes(block, "Type de semaine suggéré : endurance");
  assert(!block.includes("confiance high"));
  assertEquals((block.match(/L1 \(PRIORITAIRE\)/g) ?? []).length, 1);
});
