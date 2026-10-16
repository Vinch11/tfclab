import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { testOnlyApplySLFloorEnforcement as applySLFloorEnforcement } from "./jsonPlanHandler.ts";

/**
 * Bug réel confirmé sur le JSON du run B-5K-BEGINNER (post-PR #376) :
 *   [warning] sl_upgraded: W1 "Sortie Longue Endurance Fondamentale" [45min
 *   run] → "Fartlek scandinave — surges imprévisibles 1-4' Z4/" [ENR_RUN_
 *   FARTLEK_SCANDINAVE] (60min)
 *   [warning] sl_upgraded: W3 "Sortie Longue de Récupération" [35min run] →
 *   "Sprints plat — 6-8x80-100m effort maximal" [V2_RUN_SPRINT_PLAT] (40min)
 *   [warning] sl_upgraded: W10 "Sortie Longue — Pacing Practice" [50min run]
 *   → "Pyramide lactique — 200-400-800..." [ENR_RUN_PYRAMIDE_LACTIQUE] (60min)
 *
 * Cause racine : le dump catalogue réel (markdown, colonne Structure en
 * PROSE libre, jamais de notation `[Z4,Z5]` entre crochets — cf. le format
 * `CATALOG_DUMP_*` de jsonPlanHandler.slFloorEnforcement.test.ts) ne permet
 * JAMAIS à `extractZones` d'extraire quoi que ce soit (elle ne cherche que
 * des crochets `[...]`). `classifyIntensity` retombe donc entièrement sur
 * le texte libre — et son vocabulaire vo2_intensity/tempo_threshold ne
 * couvrait pas "fartlek", "sprint" ni "pyramide" (lactique). Ces 3 séances
 * tombaient alors dans le filtre ENDURANCE générique (le warm-up "15' Z1→Z2"
 * présent dans quasi toute fiche matche `/z1.?z2/`), les rendant éligibles
 * à `buildEndurancePool` — exactement l'inverse de l'intention du contrôle
 * (`classifyIntensity`, cf. commentaire "une séance '90min Z2 endurance' ne
 * peut pas être substituée par un Special Block Canova VO2/lactate").
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
  slLongRunMin: 60,
};

// Dump réel (format sans crochets de zone) mélangeant un fartlek/sprint/
// pyramide (quality, à NE JAMAIS choisir) et une vraie fiche endurance.
const CATALOG_DUMP_MIXED = `#### Course
| ID | Cat | Titre | Phase | Durée | Structure |
| ENR_RUN_FARTLEK_SCANDINAVE | B | Fartlek scandinave — surges imprévisibles 1-4' Z4/Z5 dans Z2 | Build | 50-70 | 15' Z1→Z2. 30-40' Fartlek : surges de 1-4' Z4/Z5, retours 2-3' Z2. 10' Z1 |
| V2_RUN_SPRINT_PLAT | C | Sprints plat — 6-8x80-100m effort maximal | Build | 35-45 | 15' Z2 + gammes. 6-8 x 80-100m sprint max. 10' Z1 |
| ENR_RUN_PYRAMIDE_LACTIQUE | B | Pyramide lactique — 200-400-800-1200m | Build | 55-70 | 15' Z2 + gammes. Pyramide 200-400-800-1200-800-400-200m. 10' Z1 |
| SEILER_RUN_Z1_EASY_LONG | A | Sortie longue endurance fondamentale | Base | 60-150 | 70-150' Z1-Z2 continu, allure conversationnelle |
`;

Deno.test("applySLFloorEnforcement — ne substitue JAMAIS un fartlek (quality) à une sortie longue facile sous le floor", () => {
  const chunk = { weeks: [mkWeek(1, [mkSess("dimanche", "run", "CUSTOM_RUN", 45, "Sortie Longue Endurance Fondamentale")])] };
  const { chunks: out, repairs } = applySLFloorEnforcement(
    [chunk] as any,
    { 1: SL_FLOOR_ENTRY },
    [CATALOG_DUMP_MIXED],
  );
  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, "SEILER_RUN_Z1_EASY_LONG");
  assert(sess.catalogId !== "ENR_RUN_FARTLEK_SCANDINAVE", "jamais un fartlek en remplacement d'une sortie longue facile");
  assertEquals(repairs.filter(r => r.code === "sl_upgraded").length, 1);
});

Deno.test("applySLFloorEnforcement — ne substitue JAMAIS un sprint à une sortie longue de récupération sous le floor", () => {
  const chunk = { weeks: [mkWeek(3, [mkSess("dimanche", "run", "CUSTOM_RUN", 35, "Sortie Longue de Récupération")])] };
  const { chunks: out } = applySLFloorEnforcement(
    [chunk] as any,
    { 3: SL_FLOOR_ENTRY },
    [CATALOG_DUMP_MIXED],
  );
  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, "SEILER_RUN_Z1_EASY_LONG");
  assert(sess.catalogId !== "V2_RUN_SPRINT_PLAT", "jamais un sprint en remplacement d'une sortie longue de récupération");
});

Deno.test("applySLFloorEnforcement — ne substitue JAMAIS une pyramide lactique à une sortie longue sous le floor", () => {
  const chunk = { weeks: [mkWeek(10, [mkSess("dimanche", "run", "CUSTOM_RUN", 50, "Sortie Longue — Pacing Practice")])] };
  const { chunks: out } = applySLFloorEnforcement(
    [chunk] as any,
    { 10: SL_FLOOR_ENTRY },
    [CATALOG_DUMP_MIXED],
  );
  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, "SEILER_RUN_Z1_EASY_LONG");
  assert(sess.catalogId !== "ENR_RUN_PYRAMIDE_LACTIQUE", "jamais une pyramide lactique en remplacement d'une sortie longue");
});

Deno.test("applySLFloorEnforcement — aucune fiche endurance disponible (que du fartlek/sprint/pyramide) → unresolved, jamais une fiche quality", () => {
  const dumpOnlyQuality = `#### Course
| ID | Cat | Titre | Phase | Durée | Structure |
| ENR_RUN_FARTLEK_SCANDINAVE | B | Fartlek scandinave — surges imprévisibles 1-4' Z4/Z5 dans Z2 | Build | 50-70 | 15' Z1→Z2. 30-40' Fartlek : surges de 1-4' Z4/Z5, retours 2-3' Z2. 10' Z1 |
`;
  const chunk = { weeks: [mkWeek(1, [mkSess("dimanche", "run", "CUSTOM_RUN", 45, "Sortie Longue Endurance Fondamentale")])] };
  const { chunks: out, repairs } = applySLFloorEnforcement(
    [chunk] as any,
    { 1: SL_FLOOR_ENTRY },
    [dumpOnlyQuality],
  );
  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, "CUSTOM_RUN"); // jamais dégradée vers du quality
  assertEquals(repairs.filter(r => r.code === "sl_upgrade_unresolved").length, 1);
});
