import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { computePilotChunksToRun } from "./promptHelpers.ts";

/**
 * Incident réel (coach, 1er test B-10K-TO-70.3, consigne coach explicite) :
 * `_pilotMaxChunks` était câblé UNIQUEMENT dans le chemin Markdown legacy
 * (index.ts) — jamais dans `jsonPlanHandler.ts`, pourtant le SEUL chemin
 * utilisé par le Pilot Cockpit (`usePilotCockpit.ts` force toujours
 * `_outputFormat: "json"`). La boucle de génération tournait donc sur la
 * TOTALITÉ des chunks réels (7 pour ce profil 32 semaines) au lieu de
 * s'arrêter à 1 — timeout serveur ~400s, 31109 tokens Gemini réellement
 * consommés, aucun plan récupéré côté client.
 *
 * `handleJSONPlanRequest` est un handler de streaming HTTP complet,
 * non unitairement testable sans mocker l'appel LLM (même limitation déjà
 * documentée dans jsonPlanHandler.regenGapCatalogBlock.guard.test.ts) :
 * on vérifie donc, en lisant son SOURCE, que la boucle est bien bornée par
 * `chunksToRun` (dérivé de `computePilotChunksToRun`, déjà testé en
 * isolation dans promptHelpers.pilotMaxChunks.test.ts) et jamais par
 * `chunks.length` brut, et que la fenêtre transmise à `mergePlanChunks`
 * reflète ce qui a RÉELLEMENT été généré quand le run est tronqué —
 * sinon le merge échouerait lui-même avec une erreur GAP sur les semaines
 * non générées, remplaçant un timeout par un échec immédiat différent.
 */

const source = Deno.readTextFileSync(new URL("./jsonPlanHandler.ts", import.meta.url));

function sliceBetween(startMarker: string, endMarker: string): string {
  const startIdx = source.indexOf(startMarker);
  assert(startIdx >= 0, `marqueur de début introuvable : "${startMarker}"`);
  const endIdx = source.indexOf(endMarker, startIdx + startMarker.length);
  assert(endIdx > startIdx, `marqueur de fin introuvable après le début : "${endMarker}"`);
  return source.slice(startIdx, endIdx);
}

Deno.test("jsonPlanHandler.ts importe computePilotChunksToRun (câblage présent, pas seulement côté Markdown legacy)", () => {
  assert(
    source.includes('computePilotChunksToRun,') || source.includes('computePilotChunksToRun }'),
    "computePilotChunksToRun n'est plus importé — le câblage _pilotMaxChunks serait de nouveau absent du chemin JSON",
  );
});

Deno.test("la boucle principale de génération est bornée par chunksToRun, jamais par chunks.length directement", () => {
  const body = sliceBetween(
    "const totalChunks = chunks.length;",
    "const mergedTotal = regenerateWeek",
  );
  assert(
    body.includes("const chunksToRun = computePilotChunksToRun(chunks.length, planConfig?._pilotMaxChunks);"),
    "chunksToRun n'est plus calculé via computePilotChunksToRun — le plafond _pilotMaxChunks serait de nouveau ignoré",
  );
  assert(
    /for \(let ci = 0; ci < chunksToRun; ci\+\+\)/.test(body),
    "la boucle principale ne borne plus son exécution par chunksToRun — un run _pilotMaxChunks=1 relancerait tous les chunks réels (incident reproduit)",
  );
  assert(
    !/for \(let ci = 0; ci < chunks\.length; ci\+\+\)/.test(body),
    "la boucle principale est redevenue bornée par chunks.length brut — régression exacte de l'incident",
  );
});

Deno.test("mergedTotal reflète la fenêtre réellement générée (chunks[chunksToRun-1].end), pas totalWeeks, quand le run est tronqué", () => {
  const body = sliceBetween(
    "const mergedTotal = regenerateWeek",
    "try {\n          if (regenerateWeek) {",
  );
  assert(
    body.includes("chunksToRun < chunks.length ? chunks[chunksToRun - 1].end : totalWeeks"),
    "mergedTotal n'adapte plus la fenêtre au nombre de chunks réellement générés — mergePlanChunks lèverait une erreur GAP sur les semaines non générées dès qu'un run est tronqué par _pilotMaxChunks",
  );
});

Deno.test("computePilotChunksToRun(7, 1) = 1 — même garantie que côté Markdown legacy, pour le scénario réel 10K→70.3 Tours (32 sem., 7 chunks)", () => {
  assert(computePilotChunksToRun(7, 1) === 1);
});
