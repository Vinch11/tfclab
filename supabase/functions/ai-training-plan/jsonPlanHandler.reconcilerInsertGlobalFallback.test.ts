import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { applyReconciler } from "./jsonPlanHandler.ts";

/**
 * Bug réel trouvé en auditant les mécanismes voisins du dédoublonnage
 * catalogId (PR précédente, "Test_Vince") : la sous-partie (b) INSERT
 * d'applyReconciler — insertion d'une séance manquante quand le quota
 * hebdo exige min≥1 pour un sport et que la semaine en a 0 — partage
 * exactement la même faiblesse : la recherche de fiche candidate ne
 * regardait QUE candidatesByChunk[ci] (le dump rotationné de CE chunk),
 * jamais l'ensemble du catalogue. Si ce dump ne contient par hasard aucune
 * fiche du sport manquant, l'insertion abandonnait silencieusement
 * (insert_unresolved, severity "critical") — alors qu'une fiche générique
 * existe presque toujours ailleurs dans le catalogue complet.
 */

const BASE_QUOTA = {
  quota: {
    swim: { min: 0, max: 0 }, bike: { min: 1, max: 5 }, run: { min: 1, max: 5 },
    brick: { min: 0, max: 1 }, strength: { min: 0, max: 2 },
    totalSessions: { min: 1, max: 10 }, maxSessionsPerDay: 2, minFullRestDays: 0,
  },
  weekType: "load",
};

// Chunk 0 : dump SANS aucune fiche course — reproduit la rotation catalogue
// réelle qui peut exclure ces fiches de ce chunk précis.
const DUMP_NO_RUN = `#### Vélo
| ID | Cat | Titre | Phase | Durée | Structure |
| V2_BIKE_RECOVERY | D | Récup vélo | Base | 30-45 | récup Z1 |
`;
// Chunk 1 (autre semaine du même plan) : dump AVEC une fiche course dispo.
const DUMP_WITH_RUN = `#### Course
| ID | Cat | Titre | Phase | Durée | Structure |
| A_RUN_EASY_STRIDES_PRO | A | EF + lignes droites | Base | 45-75 | endurance Z2 stable |
`;

function mkChunk(weekNumber: number, sessions: any[]): any {
  return { weeks: [{ weekNumber, phase: "build", theme: "Test", sessions }] };
}

Deno.test("applyReconciler (insert) — dump du chunk courant sans candidate run, mais disponible dans un AUTRE chunk : repli catalogue global", () => {
  const chunk0 = mkChunk(1, [{ day: "mardi", sport: "bike", catalogId: "V2_BIKE_RECOVERY", durationMin: 45, custom: false }]);
  const chunk1 = mkChunk(2, []);

  // weeklyQuotas ne couvre QUE S1 — S2 est ignorée (no_quota), on isole
  // ainsi l'effet du repli catalogue global sur S1 uniquement.
  const { chunks: out, repairs } = applyReconciler(
    [chunk0, chunk1],
    { 1: BASE_QUOTA },
    [DUMP_NO_RUN, DUMP_WITH_RUN],
    null,
  );

  const sessions = out[0].weeks[0].sessions;
  const runSession = sessions.find((s: any) => s.sport === "run");
  assert(runSession, "une séance run doit avoir été insérée via le repli catalogue global");
  assertEquals(runSession.catalogId, "A_RUN_EASY_STRIDES_PRO");

  const repair = repairs.find(r => r.code === "session_inserted" && r.sport === "run");
  assert(repair, "repair session_inserted attendu");
  assert(!repairs.some(r => r.code === "insert_unresolved"), "ne doit pas rester unresolved");
});

Deno.test("applyReconciler (insert) — aucune candidate run nulle part (même après repli global) : signalé unresolved, pas de fausse insertion", () => {
  const chunk0 = mkChunk(1, [{ day: "mardi", sport: "bike", catalogId: "V2_BIKE_RECOVERY", durationMin: 45, custom: false }]);

  const { chunks: out, repairs } = applyReconciler(
    [chunk0],
    { 1: BASE_QUOTA },
    [DUMP_NO_RUN],
    null,
  );

  const sessions = out[0].weeks[0].sessions;
  assert(!sessions.some((s: any) => s.sport === "run"), "aucune séance run ne doit être inventée sans candidate");
  assert(repairs.some(r => r.code === "insert_unresolved" && r.sport === "run"));
});
