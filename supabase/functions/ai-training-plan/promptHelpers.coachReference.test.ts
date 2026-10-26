import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
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
