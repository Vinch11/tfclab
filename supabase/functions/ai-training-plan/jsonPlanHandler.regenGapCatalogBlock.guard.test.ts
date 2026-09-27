import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";

/**
 * Audit "génération de plan IA", plan Emanuela, "Bloc 4 · Régénération
 * post-pic" (S22-23) : le catalogue envoyé au LLM pour le chunk couvrant ces
 * semaines de régénération inter-cycles (`chunkSpecificCatalog` /
 * `chunkCatalogs[ci]`) ne connaît QUE la position calendaire du chunk entier
 * — aucune awareness des segments multi-objectifs. Le quota hebdomadaire
 * déterministe (PR #272) réduit le NOMBRE de séances de ces semaines, mais le
 * catalogue disponible pour les remplir restait plein de fiches build/peak
 * intenses (FTP threshold, MLSS, squat/deadlift lourd).
 *
 * Fix (client, useAITrainingPlan.ts) : un second catalogue RESTREINT
 * (phaseOverride=["base"], strictPhaseFilter=true — donc hard-exclusion des
 * fiches build/peak, cf. workoutCatalogBuilder.phaseOverride.test.ts) est
 * construit pour les semaines de régénération couvertes par chaque chunk et
 * transmis via `chunkRegenCatalogs`/`chunkRegenWeeks`. Ce test vérifie, en
 * lisant le SOURCE de `handleJSONPlanRequest` (handler de streaming HTTP
 * complet, non unitairement testable sans mocker l'appel LLM — même
 * limitation que les autres guard tests de ce fichier), que ce second
 * catalogue est bien injecté dans le prompt du chunk EN PLUS du catalogue
 * principal (jamais à sa place), avec une consigne explicite de restriction
 * aux semaines de régénération, et que ses IDs sont bien inclus dans
 * `allowedIds` (sinon une fiche piochée dedans serait considérée "hors
 * catalogue" par la validation).
 */

const source = Deno.readTextFileSync(new URL("./jsonPlanHandler.ts", import.meta.url));

function sliceBetween(startMarker: string, endMarker: string): string {
  const startIdx = source.indexOf(startMarker);
  assert(startIdx >= 0, `marqueur de début introuvable : "${startMarker}"`);
  const endIdx = source.indexOf(endMarker, startIdx + startMarker.length);
  assert(endIdx > startIdx, `marqueur de fin introuvable après le début : "${endMarker}"`);
  return source.slice(startIdx, endIdx);
}

Deno.test("HandlerInput déclare chunkRegenCatalogs et chunkRegenWeeks", () => {
  const body = sliceBetween("interface HandlerInput {", "corsHeaders: Record<string, string>;");
  assert(body.includes("chunkRegenCatalogs?: string[];"), "HandlerInput ne déclare plus chunkRegenCatalogs");
  assert(body.includes("chunkRegenWeeks?: number[][];"), "HandlerInput ne déclare plus chunkRegenWeeks");
});

Deno.test("handleJSONPlanRequest déstructure chunkRegenCatalogs et chunkRegenWeeks depuis input", () => {
  const body = sliceBetween(
    "export function handleJSONPlanRequest(input: HandlerInput): Response {",
    "corsHeaders,\n  } = input;",
  );
  assert(body.includes("chunkRegenCatalogs"), "chunkRegenCatalogs n'est plus déstructuré depuis input — le fix devient inopérant");
  assert(body.includes("chunkRegenWeeks"), "chunkRegenWeeks n'est plus déstructuré depuis input — le fix devient inopérant");
});

Deno.test("le bloc catalogue restreint régénération est construit à partir de chunkRegenCatalogs/chunkRegenWeeks[ci], PAS à la place du catalogue principal", () => {
  const body = sliceBetween(
    "const catalogDump = chunkSpecificCatalog",
    "const allowedIds = extractCatalogIdsFromDump(catalogDump)",
  );
  assert(body.includes("chunkRegenWeeks[ci]"), "regenWeeksForChunk n'est plus dérivé de chunkRegenWeeks[ci]");
  assert(body.includes("chunkRegenCatalogs[ci]"), "regenCatalogDump n'est plus dérivé de chunkRegenCatalogs[ci]");
  assert(
    body.includes("CATALOGUE RESTREINT") && body.includes("RÉGÉNÉRATION INTER-CYCLES"),
    "le bloc régénération a perdu son libellé explicite — le LLM ne serait plus prévenu qu'il s'agit d'un catalogue à part, restreint à des semaines précises",
  );
  assert(
    body.includes("IGNORE le catalogue principal"),
    "le bloc régénération n'instruit plus explicitement d'ignorer le catalogue principal pour les semaines concernées",
  );
});

Deno.test("les IDs du catalogue régénération sont inclus dans allowedIds (sinon une fiche piochée dedans serait rejetée comme hors-catalogue)", () => {
  const body = sliceBetween(
    "const allowedIds = extractCatalogIdsFromDump(catalogDump)",
    "// ─── SONDE DIAGNOSTIC TRAIL",
  );
  assert(
    body.includes("extractCatalogIdsFromDump(regenCatalogDump)"),
    "allowedIds n'inclut plus les IDs du catalogue régénération — une fiche choisie dedans serait signalée à tort comme hors-catalogue",
  );
});

Deno.test("le bloc catalogue restreint régénération est bien injecté dans userPrompt, juste après le catalogue principal", () => {
  const body = sliceBetween("const userPrompt = [", "].filter(Boolean).join(\"\\n\");");
  const catalogIdx = body.indexOf("catalogDump ? `\\n${catalogDump}\\n` : null,");
  const regenIdx = body.indexOf("regenCatalogBlock,");
  assert(catalogIdx >= 0, "l'insertion du catalogue principal dans userPrompt est introuvable");
  assert(regenIdx >= 0, "regenCatalogBlock n'est plus injecté dans userPrompt — le LLM ne verrait plus jamais le catalogue restreint régénération");
  assert(regenIdx > catalogIdx, "regenCatalogBlock doit être injecté APRÈS le catalogue principal (complément, jamais substitut)");
});
