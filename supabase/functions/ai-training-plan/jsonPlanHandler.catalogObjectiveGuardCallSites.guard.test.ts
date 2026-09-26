import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";

/**
 * Audit "génération de plan IA" (suite PR #263/#265) : deux garde-fous
 * SERVEUR (pas de simples instructions de prompt — du code qui peut muter le
 * plan fusionné) lisaient `planConfig?.objective` (l'objectif FINAL du plan)
 * au lieu de `planConfig?.catalogObjective` (l'objectif du CYCLE en cours
 * pour la fenêtre HTTP traitée) :
 *
 * - `applyOffsportTrailGuardToChunks` : court-circuitait tout le garde-fou
 *   anti-contenu-trail dès que l'objectif FINAL était trail, même pour une
 *   fenêtre d'un cycle intermédiaire non-trail.
 * - `applyDailySessionFloorEnforcement` : pouvait FORCER l'ajout d'une
 *   séance natation/vélo dans le plan fusionné si l'objectif FINAL était
 *   Ironman/70.3, même pour une fenêtre du cycle intermédiaire Marathon où
 *   le verrou sport interdit la natation.
 *
 * Ces deux fonctions ne peuvent pas être testées bout-en-bout facilement
 * (elles vivent dans `handleJSONPlanRequest`, un handler de streaming HTTP
 * complet nécessitant de mocker l'appel LLM) — ce test vérifie donc, en
 * lisant le SOURCE, que les deux points d'appel utilisent bien
 * `catalogObjective ?? objective` plutôt que `objective` seul. Même
 * limitation/pattern que les guard tests déjà utilisés côté frontend
 * (`aiTrainingPlanOverrideReset.guard.test.ts`, etc.) pour ce type de
 * point d'entrée non unitairement testable.
 */

const source = Deno.readTextFileSync(new URL("./jsonPlanHandler.ts", import.meta.url));

function sliceBetween(startMarker: string, endMarker: string): string {
  const startIdx = source.indexOf(startMarker);
  assert(startIdx >= 0, `marqueur de début introuvable : "${startMarker}"`);
  const endIdx = source.indexOf(endMarker, startIdx + startMarker.length);
  assert(endIdx > startIdx, `marqueur de fin introuvable après le début : "${endMarker}"`);
  return source.slice(startIdx, endIdx);
}

Deno.test("applyOffsportTrailGuardToChunks (point d'appel) : utilise catalogObjective ?? objective, pas objective seul", () => {
  const body = sliceBetween(
    "const guard = applyOffsportTrailGuardToChunks(",
    "catalogDumpsByChunk,",
  );
  assert(
    body.includes("planConfig?.catalogObjective ?? planConfig?.objective"),
    "le point d'appel de applyOffsportTrailGuardToChunks ne priorise plus catalogObjective — le garde-fou trail redeviendrait insensible au cycle en cours d'un plan multi-objectif.",
  );
});

Deno.test("applyDailySessionFloorEnforcement (point d'appel) : utilise catalogObjective ?? objective, pas objective seul", () => {
  const body = sliceBetween(
    "const dailyFloorEnforced = regenerateWeek",
    "planConfig?.ambitionMeta?.effective",
  );
  assert(
    body.includes("planConfig?.catalogObjective ?? planConfig?.objective"),
    "le point d'appel de applyDailySessionFloorEnforcement ne priorise plus catalogObjective — ce filet pourrait de nouveau forcer l'ajout d'une séance natation/vélo dans une fenêtre du cycle Marathon d'un plan Ironman.",
  );
});
