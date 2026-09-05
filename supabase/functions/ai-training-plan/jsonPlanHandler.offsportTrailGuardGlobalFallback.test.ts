import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { applyOffsportTrailGuardToChunks } from "./jsonPlanHandler.ts";

/**
 * Bug réel (4e occurrence de la même faiblesse structurelle, après
 * applyReconciler / applySLFloorEnforcement / applyDailySessionFloorEnforcement) :
 * applyOffsportTrailGuardToChunks ne cherchait une fiche de remplacement que
 * dans candidatesByChunk[ci] (le dump catalogue rotationné pour CE chunk),
 * jamais dans l'ensemble du catalogue transmis pour les autres chunks. Une
 * séance trail détectée (vocabulaire custom ou catalogId trail survivant)
 * dans un chunk dont le dump ne contient par hasard aucune fiche du bon
 * sport échouait donc en "offsport_unresolved" (critical) alors qu'une fiche
 * valide existe ailleurs dans le catalogue complet du plan.
 */

function mkChunk(weekNumber: number, sessions: any[]): any {
  return { weeks: [{ weekNumber, phase: "build", theme: "Test", sessions }] };
}

const DUMP_NO_RUN = `#### Vélo
| ID | Cat | Titre | Phase | Durée | Structure |
| V2_BIKE_RECOVERY | D | Récup vélo | Base | 30-45 | récup Z1 |
`;
const DUMP_WITH_RUN = `#### Course
| ID | Cat | Titre | Phase | Durée | Structure |
| A_RUN_EASY_STRIDES_PRO | A | EF + lignes droites | Base | 45-75 | endurance Z2 stable |
`;

Deno.test("applyOffsportTrailGuardToChunks — catalogId trail survivant, fiche dispo dans le dump du chunk courant : substitution locale, pas de repli", () => {
  const chunk = mkChunk(1, [{
    day: "mardi", sport: "run", zones: ["Z2"],
    title: "Sortie trail", details: "",
    isKeySession: false, custom: false, catalogId: "TRAIL_HILL_RUN", durationMin: 60,
  }]);

  const { chunks: out, repairs } = applyOffsportTrailGuardToChunks(
    [chunk] as any,
    "Marathon",
    [DUMP_WITH_RUN],
  );

  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, "A_RUN_EASY_STRIDES_PRO");
  assertEquals(repairs.filter((r: any) => r.code === "substituted_offsport").length, 1);
  assert(!repairs[0].reason.includes("repli catalogue global"), "ne doit pas mentionner de repli quand la fiche est trouvée localement");
});

Deno.test("applyOffsportTrailGuardToChunks — dump du chunk courant sans fiche run, mais disponible dans un AUTRE chunk : repli catalogue global", () => {
  const chunk0 = mkChunk(1, [{
    day: "mardi", sport: "run", zones: ["Z2"],
    title: "Sortie trail", details: "",
    isKeySession: false, custom: false, catalogId: "TRAIL_HILL_RUN", durationMin: 60,
  }]);
  const chunk1 = mkChunk(2, []);

  const { chunks: out, repairs } = applyOffsportTrailGuardToChunks(
    [chunk0, chunk1] as any,
    "Marathon",
    [DUMP_NO_RUN, DUMP_WITH_RUN],
  );

  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, "A_RUN_EASY_STRIDES_PRO", "doit être résolu via le repli catalogue global");
  const repair = repairs.find((r: any) => r.code === "substituted_offsport");
  assert(repair, "doit réussir via le repli, pas rester unresolved");
  assert(repair.reason.includes("repli catalogue global"), "la raison doit documenter que la substitution vient du repli global");
  assert(!repairs.some((r: any) => r.code === "offsport_unresolved"));
});

Deno.test("applyOffsportTrailGuardToChunks — aucune fiche run nulle part (même après repli global) : offsport_unresolved, pas de fausse correction", () => {
  const chunk = mkChunk(1, [{
    day: "mardi", sport: "run", zones: ["Z2"],
    title: "Sortie trail", details: "",
    isKeySession: false, custom: false, catalogId: "TRAIL_HILL_RUN", durationMin: 60,
  }]);

  const { chunks: out, repairs } = applyOffsportTrailGuardToChunks(
    [chunk] as any,
    "Marathon",
    [DUMP_NO_RUN],
  );

  const sess = out[0].weeks[0].sessions[0];
  // Un catalogId trail survivant est TOUJOURS basculé en custom (invariant
  // custom=true ⇒ catalogId=null, planSchema.ts), avant même la tentative de
  // substitution — donc catalogId=null que la substitution réussisse ou non.
  // "Pas de fausse correction" porte sur le CONTENU (title/details), qui doit
  // rester inchangé quand aucun remplaçant n'existe (ni localement, ni via le
  // repli global) : la traçabilité de l'ID d'origine reste dans matchedMarker.
  assertEquals(sess.catalogId, null);
  assertEquals(sess.custom, true);
  assertEquals(sess.title, "Sortie trail", "contenu original préservé, pas de fausse correction sans candidate disponible");
  const repair = repairs.find((r: any) => r.code === "offsport_unresolved");
  assert(repair, "doit être signalé unresolved");
  assertEquals(repair.matchedMarker, "TRAIL_HILL_RUN", "l'ID trail d'origine reste traçable dans le repair malgré le catalogId nullifié");
});

Deno.test("applyOffsportTrailGuardToChunks — objectif trail : guard désactivé, aucun repair", () => {
  const chunk = mkChunk(1, [{
    day: "mardi", sport: "run", zones: ["Z2"],
    title: "Sortie trail", details: "",
    isKeySession: false, custom: false, catalogId: "TRAIL_HILL_RUN", durationMin: 60,
  }]);

  const { repairs } = applyOffsportTrailGuardToChunks(
    [chunk] as any,
    "UTMB",
    [DUMP_WITH_RUN],
  );
  assertEquals(repairs.length, 0);
});
