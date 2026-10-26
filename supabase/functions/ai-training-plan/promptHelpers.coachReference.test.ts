import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildStructuredDiagnosticBlock, buildUserPrompt } from "./promptHelpers.ts";

Deno.test("coach internal reference is never presented as measured load or athlete availability", () => {
  const cfg = { objective: "10K", ambition: "age_group", weeksAvailable: 12, weeklyHours: 4,
    weeklyHoursSource: "internal-matrix", ambitionMeta: { trainingLevel: "light", trainingLevelSource: "manual" },
    volumeRamp: { trainingLevel: "light", week1PctTarget: 0.6, rampWeeks: 4, week1HoursCap: 8,
      weeklyHoursTarget: 4, week1HoursMax: 2.4, weeklyIncreasePctMax: 0.1 },
    recentLoad: { source: "MANUAL", tss7d: 175, status: "low", label: "Estimation qualitative", target: { min: 250, opt: 400, max: 650 } },
  };
  const diagnostic = buildStructuredDiagnosticBlock(cfg, 12);
  assertStringIncludes(diagnostic, "Référence interne");
  assertStringIncludes(diagnostic, "NON mesurée");
  assertStringIncludes(diagnostic, "MAX 2.4h");
  assertStringIncludes(diagnostic, "jamais un volume obligatoire");
  const user = buildUserPrompt({ nom: "Synthetic", vma: 18, age: 35 }, cfg);
  assertStringIncludes(user, "Référence interne (non mesurée)");
  assert(!user.includes("Heures dispo/semaine (saisie athlète)"));
  assert(!user.includes("VOLUME CIBLE HEBDO (SOURCE UNIQUE, NON NÉGOCIABLE)"));
});


Deno.test("manual optimal-looking estimates never certify tolerance, even in a legacy payload", () => {
  for (const status of ["low", "optimal", "high", "overload"]) {
    const block = buildStructuredDiagnosticBlock({ recentLoad: { source: "MANUAL", tss7d: 325, status,
      target: { min: 250, opt: 400, max: 650 } } }, 12);
    assertStringIncludes(block, "Charge récente INCONNUE");
    assertStringIncludes(block, "Provenance MANUAL");
    assertStringIncludes(block, "validation du coach nécessaire");
    assert(!block.includes("Charge cohérente avec l'objectif"));
    assert(!block.includes('statut "optimal"'));
    assert(!block.includes("Athlète déjà chargé"));
    assert(!block.includes("Progression normale +5-7"));
  }
});

Deno.test("internal planning ceilings never promise that the target will be reached", () => {
  const block = buildStructuredDiagnosticBlock({ weeklyHoursSource: "internal-matrix", volumeRamp: {
    trainingLevel: "trained", week1PctTarget: 0.8, week1HoursCap: null, weeklyHoursTarget: 8,
    week1HoursMax: 6.4, rampWeeks: 2, weeklyIncreasePctMax: 0.1,
  } }, 12);
  assertStringIncludes(block, "le plafond S1 n’est PAS une cible");
  assertStringIncludes(block, "aucune obligation de l’atteindre");
  assert(!block.includes("Rampe : atteindre"));
  assert(!block.includes("c'est la cible APRÈS la rampe"));
});


Deno.test("server transport preserves canonical elite and world_class and old UI labels", async () => {
  const { normalizeAmbKey } = await import("./sportRatioMatrix.ts");
  assertEquals(normalizeAmbKey("elite"), "elite");
  assertEquals(normalizeAmbKey("world_class"), "world_class");
  assertEquals(normalizeAmbKey("Qualifiable"), "elite");
  assertEquals(normalizeAmbKey("Elite"), "world_class");
});
