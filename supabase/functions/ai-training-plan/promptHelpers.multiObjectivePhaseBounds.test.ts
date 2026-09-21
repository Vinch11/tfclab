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

/**
 * Bug scientifique réel corrigé (même audit, suite) : le cycle 2 (post-pic)
 * redémarrait un plein bloc "Fondation" au même pourcentage limiteur qu'un
 * cycle qui part de zéro — contredisant la règle du prompt ("jamais de
 * retour à Fondation une fois quittée") et la physiologie (un athlète qui
 * sort d'un Marathon n'est pas désentraîné après 1-2 sem de récupération).
 * Vérifie que le cycle 2 a une Fondation nettement plus courte, INDÉPENDANTE
 * du limiteur (contrairement au cycle 1, qui reste limiteur-dépendant).
 */
Deno.test("buildStructuredDiagnosticBlock — cycle post-pic (2/2) : Fondation courte et indépendante du limiteur (réadaptation, pas reconstruction)", () => {
  for (const limiter of ["VLamax élevé", "Économie de course faible", "TTE faible"]) {
    const text = buildStructuredDiagnosticBlock(
      { ...marathonPlusIMConfig, identifiedLimitersRaw: [limiter], identifiedLimiters: [limiter] },
      40,
    );
    const lines = text.split("\n").filter((l) => l.includes("Bloc Fondation"));
    // 2 cycles => 2 lignes "Bloc Fondation" ; on prend celle du 2e cycle (la dernière).
    assertEquals(lines.length, 2, `limiteur=${limiter}: ${text}`);
    assertStringIncludes(lines[1], "S25-S27", `limiteur=${limiter} — Fondation du cycle post-pic doit rester à 3 sem quel que soit le limiteur`);
  }
  const textVlamax = buildStructuredDiagnosticBlock(marathonPlusIMConfig, 40);
  assertStringIncludes(textVlamax, "réadaptation courte post-pic");
});

/**
 * Bug réel corrigé (même audit) : le bloc "BORNES DE PHASE ESTIMÉES"
 * recalculait sa propre durée de Fondation par pourcentage-limiteur, sans
 * jamais lire `config.fondationDurationWeeks` — pourtant injecté juste au-
 * dessus dans le MÊME prompt comme valeur faisant autorité ("utilise CETTE
 * valeur, pas le générique"). Les deux pouvaient afficher deux durées
 * différentes pour "la Fondation de CET athlète".
 */
Deno.test("buildStructuredDiagnosticBlock — le 1er cycle respecte config.fondationDurationWeeks quand fourni", () => {
  const withoutOverride = buildStructuredDiagnosticBlock(marathonPlusIMConfig, 40);
  const withOverride = buildStructuredDiagnosticBlock({ ...marathonPlusIMConfig, fondationDurationWeeks: 4 }, 40);

  const fondationLine = (text: string) => text.split("\n").find((l) => l.includes("Bloc Fondation"))!;

  // Sans override explicite, le cycle 1 utilise le calcul par pourcentage
  // (VLamax => 0.30) — ici S1-S5 pour un cycle de 22 sem.
  assertStringIncludes(fondationLine(withoutOverride), "S1-S5");
  // Avec override, le cycle 1 DOIT utiliser exactement cette valeur (4 sem),
  // pas le calcul par pourcentage.
  assertStringIncludes(fondationLine(withOverride), "S1-S4");
});
