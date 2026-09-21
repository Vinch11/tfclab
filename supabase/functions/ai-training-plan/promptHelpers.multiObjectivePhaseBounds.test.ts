import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildStructuredDiagnosticBlock } from "./promptHelpers.ts";

/**
 * Bug réel corrigé (audit "structure d'un plan multi-objectifs long" —
 * Marathon 21/02/2027 + Ironman 27/06/2027, ~18 sem d'écart, plan de 40 sem) :
 * le bloc "BORNES DE PHASE ESTIMÉES" (guidance méthodologique lue par le LLM,
 * cf. promptHelpers.taperPhaseBounds.test.ts pour le bug analogue mono-
 * objectif) calculait un SEUL cycle Fondation→Chantier→Affûtage continu sur
 * la totalité du plan, sans aucune notion de `raceGoals` — la semaine d'une
 * course intermédiaire datée (Marathon en S22) tombait alors en plein "Bloc
 * Chantier", contredisant directement la section "Ancrage absolu" (même
 * prompt) qui exige un taper à cette semaine. Corrigé en segmentant ce bloc
 * par pic de forme complet (cf. classifyMultiObjectiveGoals), conformément à
 * la règle 1 des "RÈGLES MULTI-OBJECTIFS" déjà présente dans ce même prompt
 * ("chacun a droit à sa propre montée en charge et son propre affûtage") et
 * à la littérature de périodisation double/triple (Bompa & Haff ; Issurin
 * 2010, Block Periodization) déjà citée dans ce fichier.
 */

function countOccurrences(text: string, substr: string): number {
  return text.split(substr).length - 1;
}

function affutageLines(text: string): string[] {
  return text.split("\n").filter((l) => l.includes("Bloc Affûtage"));
}

const marathonPlusIMConfig = {
  objective: "IM",
  ambition: "age_group",
  planStartDate: "2026-09-21",
  raceGoals: [
    { objective: "Marathon", raceDate: "2027-02-21", priority: "A" },
    { objective: "IM", raceDate: "2027-06-27", priority: "A" },
  ],
  identifiedLimitersRaw: ["VLamax élevé"],
  identifiedLimiters: ["VLamax élevé"],
};

Deno.test("buildStructuredDiagnosticBlock — Marathon (S22) + IM (S40), 18 sem d'écart : DEUX cycles de blocs distincts, pas un seul continu", () => {
  const text = buildStructuredDiagnosticBlock(marathonPlusIMConfig, 40);
  assertEquals(countOccurrences(text, "📅 BORNES DE PHASE ESTIMÉES"), 2, text);
  assertStringIncludes(text, "Cycle 1/2, vers Marathon en S22");
  assertStringIncludes(text, "Cycle 2/2, vers IM en S40");
});

Deno.test("buildStructuredDiagnosticBlock — Marathon (S22) + IM (S40) : le taper Marathon (S21-S22) ne tombe PAS en plein Bloc Chantier/Consolidation", () => {
  const text = buildStructuredDiagnosticBlock(marathonPlusIMConfig, 40);
  const lines = affutageLines(text);
  assertEquals(lines.length, 2, text);
  assertStringIncludes(lines[0], "S21-S22");
  assertStringIncludes(lines[1], "S38-S40");
  // La semaine du Marathon (S22) ne doit apparaître dans AUCUN bloc de charge
  // du PREMIER cycle (Fondation/Chantier/Consolidation/Race-Specific de ce
  // cycle doivent tous se terminer avant S21) — on isole le texte du premier
  // cycle (avant la régénération) pour ne pas comparer avec les blocs du 2e
  // cycle (S25+), qui n'ont aucune raison d'être <21.
  const firstCycleText = text.split("🔁 RÉGÉNÉRATION POST-PIC")[0];
  for (const l of firstCycleText.split("\n")) {
    if (l.includes("Bloc Affûtage")) continue;
    if (!/Bloc (Fondation|Chantier|Consolidation|Race-Specific)/.test(l)) continue;
    const match = l.match(/S(\d+)-S(\d+)/);
    if (!match) continue;
    const [, , endStr] = match;
    assert(Number(endStr) < 21, `Un bloc de charge chevauche le taper Marathon (S21-22) : "${l}"`);
  }
});

Deno.test("buildStructuredDiagnosticBlock — une vraie régénération sépare les deux cycles", () => {
  const text = buildStructuredDiagnosticBlock(marathonPlusIMConfig, 40);
  assertStringIncludes(text, "🔁 RÉGÉNÉRATION POST-PIC : S23-S24");
});

Deno.test("buildStructuredDiagnosticBlock — objectif unique (raceGoals absent) : comportement inchangé, un seul cycle continu", () => {
  const text = buildStructuredDiagnosticBlock(
    { objective: "IM", ambition: "age_group", identifiedLimitersRaw: ["VLamax élevé"] },
    24,
  );
  assertEquals(countOccurrences(text, "📅 BORNES DE PHASE ESTIMÉES"), 1, text);
  assert(!text.includes("Cycle 1/"), "ne doit pas segmenter un plan mono-objectif");
});

Deno.test("buildStructuredDiagnosticBlock — multi-objectifs mais un seul pic complet (jalon insuffisamment espacé) : un seul cycle continu", () => {
  const text = buildStructuredDiagnosticBlock(
    {
      objective: "Marathon",
      ambition: "age_group",
      planStartDate: "2027-01-04",
      raceGoals: [
        { objective: "Marathon", raceDate: "2027-02-07", priority: "A" },
        { objective: "IM", raceDate: "2027-03-21", priority: "B" },
      ],
      identifiedLimitersRaw: ["VLamax élevé"],
    },
    12,
  );
  assertEquals(countOccurrences(text, "📅 BORNES DE PHASE ESTIMÉES"), 1, text);
});
