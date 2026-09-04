import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { applySLFloorEnforcement } from "./jsonPlanHandler.ts";

/**
 * Bug réel trouvé en auditant applyDailySessionFloorEnforcement /
 * applyReconciler (repli catalogue global, PR précédente sur le
 * dédoublonnage "Test_Vince") : applySLFloorEnforcement partage exactement
 * la même faiblesse structurelle — la recherche de fiche de remplacement
 * pour upgrader une sortie longue vers le floor SL (Seiler/Lydiard) ne
 * regardait QUE candidatesByChunk[ci] (le dump catalogue rotationné pour ce
 * chunk précis), jamais l'ensemble du catalogue. Si ce dump ne contient par
 * hasard aucune fiche endurance/récup du bon sport assez longue, l'upgrade
 * abandonnait silencieusement (sl_upgrade_unresolved, severity "critical")
 * — alors qu'une fiche valide existe presque toujours ailleurs dans le
 * catalogue complet (sorties longues Z2 génériques, très communes).
 */

function mkSess(day: string, sport: string, catalogId: string | null, durationMin: number, title?: string): any {
  return { day, sport, title: title ?? catalogId ?? "custom", details: "", catalogId, custom: !catalogId, durationMin };
}
function mkWeek(weekNumber: number, sessions: any[]): any {
  return { weekNumber, sessions };
}

const SL_FLOOR_ENTRY = {
  weekType: "load",
  longRideWeekly: false,
  longRunWeekly: true,
  slLongRideMin: 0,
  slLongRunMin: 110,
};

// Dump SANS aucune fiche run endurance assez longue (juste une fiche vélo,
// hors sujet) — reproduit la rotation catalogue réelle qui peut exclure les
// fiches concurrentes d'un chunk donné.
const CATALOG_DUMP_NO_RUN_CANDIDATE = `#### Vélo
| ID | Cat | Titre | Phase | Durée | Structure |
| V2_BIKE_RECOVERY | D | Récup vélo | Base | 30-45 | récup Z1 |
`;

// Dump AVEC une fiche run endurance longue disponible — simule un autre
// chunk du même plan qui, lui, a reçu cette fiche dans sa rotation.
const CATALOG_DUMP_WITH_RUN_CANDIDATE = `#### Course
| ID | Cat | Titre | Phase | Durée | Structure |
| LYDIARD_RUN_AEROBIC_BASE_LONG | A | Sortie longue aérobie Lydiard | Base | 90-180 | endurance Z1-Z2 fondamentale |
`;

Deno.test("applySLFloorEnforcement — sortie longue trop courte, fiche dispo dans le dump du chunk courant : upgrade réussi", () => {
  const chunk = { weeks: [mkWeek(1, [mkSess("dimanche", "run", "CUSTOM_RUN", 60, "Footing")])] };
  const { chunks: out, repairs } = applySLFloorEnforcement(
    [chunk] as any,
    { 1: SL_FLOOR_ENTRY },
    [CATALOG_DUMP_WITH_RUN_CANDIDATE],
  );
  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, "LYDIARD_RUN_AEROBIC_BASE_LONG");
  assert(sess.durationMin >= 110, "la durée doit respecter le floor SL");
  assertEquals(repairs.filter(r => r.code === "sl_upgraded").length, 1);
});

Deno.test("applySLFloorEnforcement — dump du chunk courant sans candidate, mais disponible dans un AUTRE chunk : repli catalogue global", () => {
  const chunk0 = { weeks: [mkWeek(1, [mkSess("dimanche", "run", "CUSTOM_RUN", 60, "Footing")])] };
  const chunk1 = { weeks: [mkWeek(2, [])] };

  const { chunks: out, repairs } = applySLFloorEnforcement(
    [chunk0, chunk1] as any,
    { 1: SL_FLOOR_ENTRY, 2: SL_FLOOR_ENTRY },
    [CATALOG_DUMP_NO_RUN_CANDIDATE, CATALOG_DUMP_WITH_RUN_CANDIDATE],
  );

  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, "LYDIARD_RUN_AEROBIC_BASE_LONG", "doit être résolu via le repli catalogue global");
  assert(repairs.some(r => r.code === "sl_upgraded"), "doit réussir via le repli, pas rester unresolved");
  assert(!repairs.some(r => r.code === "sl_upgrade_unresolved"));
});

Deno.test("applySLFloorEnforcement — aucune candidate nulle part (même après repli global) : signalé unresolved, pas de fausse correction", () => {
  const chunk = { weeks: [mkWeek(1, [mkSess("dimanche", "run", "CUSTOM_RUN", 60, "Footing")])] };
  const { chunks: out, repairs } = applySLFloorEnforcement(
    [chunk] as any,
    { 1: SL_FLOOR_ENTRY },
    [CATALOG_DUMP_NO_RUN_CANDIDATE],
  );
  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, "CUSTOM_RUN", "pas de fausse correction sans candidate disponible");
  assert(repairs.some(r => r.code === "sl_upgrade_unresolved"));
});

Deno.test("applySLFloorEnforcement — sortie déjà assez longue : no-op", () => {
  const chunk = { weeks: [mkWeek(1, [mkSess("dimanche", "run", "CUSTOM_RUN", 130, "Footing long")])] };
  const { repairs } = applySLFloorEnforcement(
    [chunk] as any,
    { 1: SL_FLOOR_ENTRY },
    [CATALOG_DUMP_WITH_RUN_CANDIDATE],
  );
  assertEquals(repairs.length, 0);
});

Deno.test("applySLFloorEnforcement — semaine taper/race jamais touchée", () => {
  const chunk = { weeks: [mkWeek(1, [mkSess("dimanche", "run", "CUSTOM_RUN", 60, "Footing")])] };
  const { repairs } = applySLFloorEnforcement(
    [chunk] as any,
    { 1: { ...SL_FLOOR_ENTRY, weekType: "taper" } },
    [CATALOG_DUMP_WITH_RUN_CANDIDATE],
  );
  assertEquals(repairs.length, 0);
});
