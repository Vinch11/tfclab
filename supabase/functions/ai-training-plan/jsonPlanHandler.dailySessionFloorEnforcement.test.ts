import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { applyDailySessionFloorEnforcement } from "./jsonPlanHandler.ts";

/**
 * Bug réel confirmé sur PLUSIEURS régénérations successives du plan "Vince"
 * (70.3, ambition élevée) : systemPrompt.ts / promptHelpers.ts ("DOUBLES &
 * TRIPLES SÉANCES — OBLIGATOIRE") demandent 2-3 séances/jour pour World
 * Class/Elite/Competitor sur IM/70.3 (sauf 1 jour de repos/semaine) — mais
 * rien en aval ne le fait respecter. planValidator.ts::validateDailySessionFloor
 * le DÉTECTE après coup ("ERREUR GRAVE") mais ne corrige jamais rien —
 * exactement le même schéma que le bug signatures LCW déjà corrigé.
 */

// Bug de fixture réel trouvé en creusant l'absence de couverture pour le
// repli catalogue global (cf. test ci-dessous) : parseCatalogCandidatesFromDump
// (jsonPlanHandler.ts) déduit `sport` UNIQUEMENT depuis un en-tête markdown
// "#### <section>" précédant les lignes — la colonne "Sport" du tableau
// elle-même est ignorée par le parseur réel. Sans en-tête, TOUTES les
// candidates ci-dessous ressortaient avec sport="unknown", ce qui aurait dû
// faire échouer le tout premier test de ce fichier (le filtre
// `c.sport === complementSport` ne matche jamais "unknown") — vérifié via
// une reproduction fidèle du parseur en dehors de cet environnement (Deno
// indisponible ici). Corrigé avec de vrais en-têtes de section.
const CATALOG_DUMP = `#### Course
| ID | Cat | Titre | Phase | Durée | Structure |
| A_RUN_EASY_STRIDES_PRO | A | EF + lignes droites | Base | 45-75 | endurance Z2 stable |

#### Vélo
| ID | Cat | Titre | Phase | Durée | Structure |
| V2_RECUP_VELO_REGENERATION | D | Récupération vélo | Base | 30-50 | récup Z1 |
`;

function mkSess(day: string, sport: string, catalogId: string | null, title?: string): any {
  return { day, sport, title: title ?? catalogId ?? "custom", details: "", catalogId, custom: !catalogId, durationMin: 45 };
}
function mkWeek(weekNumber: number, sessions: any[]): any {
  return { weekNumber, sessions };
}

const BASE_QUOTA_LOAD = {
  quota: {
    swim: { min: 0, max: 0 }, bike: { min: 1, max: 5 }, run: { min: 1, max: 5 },
    brick: { min: 0, max: 1 }, strength: { min: 0, max: 2 },
    totalSessions: { min: 1, max: 10 }, maxSessionsPerDay: 2, minFullRestDays: 0,
  },
  floors: {},
  weekType: "load",
};

Deno.test("applyDailySessionFloorEnforcement — S1 Lundi 1 seule séance (bug réel 'Vince', ambition competitor) : une 2e séance est ajoutée", () => {
  const chunks = [
    { weeks: [mkWeek(1, [
      mkSess("lundi", "strength", null, "Circuit Endurance Musculaire Général"),
      mkSess("mardi", "bike", "V3_BIKE_FORCE_SFR"),
      mkSess("mardi", "run", "A_RUN_EASY_STRIDES_PRO"),
    ])] },
  ] as any;
  const weeklyQuotas = { 1: BASE_QUOTA_LOAD };

  const { chunks: out, repairs } = applyDailySessionFloorEnforcement(chunks, weeklyQuotas, [CATALOG_DUMP], "Ironman 70.3", "competitor");

  const lundiSessions = out[0].weeks[0].sessions.filter((s: any) => s.day === "lundi");
  assertEquals(lundiSessions.length, 2, "lundi doit avoir 2 séances après le correctif");
  assert(lundiSessions.some((s: any) => s.catalogId === "A_RUN_EASY_STRIDES_PRO"));
  assertEquals(repairs.filter(r => r.code === "daily_floor_enforced").length, 1);
});

Deno.test("applyDailySessionFloorEnforcement — ambition age_group : no-op (règle réservée à World Class/Elite/Competitor)", () => {
  const chunks = [
    { weeks: [mkWeek(1, [mkSess("lundi", "strength", null, "Circuit"), mkSess("mardi", "bike", "V3_BIKE_FORCE_SFR")])] },
  ] as any;
  const { repairs } = applyDailySessionFloorEnforcement(chunks, { 1: BASE_QUOTA_LOAD }, [CATALOG_DUMP], "Ironman 70.3", "age_group");
  assertEquals(repairs.length, 0);
});

Deno.test("applyDailySessionFloorEnforcement — objectif non-IM/70.3 : no-op", () => {
  const chunks = [
    { weeks: [mkWeek(1, [mkSess("lundi", "strength", null, "Circuit")])] },
  ] as any;
  const { repairs } = applyDailySessionFloorEnforcement(chunks, { 1: BASE_QUOTA_LOAD }, [CATALOG_DUMP], "Marathon", "elite");
  assertEquals(repairs.length, 0);
});

Deno.test("applyDailySessionFloorEnforcement — brick et séance signature LCW exemptés (combinent déjà 2-3 disciplines)", () => {
  const chunks = [
    { weeks: [mkWeek(1, [
      mkSess("samedi", "brick", "B_BRICK_RACE_PACE_SHORT_703"),
      mkSess("dimanche", "bike", "B_LCW_BIKE_LONG_RACE_SAT"),
    ])] },
  ] as any;
  const { repairs } = applyDailySessionFloorEnforcement(chunks, { 1: BASE_QUOTA_LOAD }, [CATALOG_DUMP], "703", "competitor");
  assertEquals(repairs.length, 0);
});

Deno.test("applyDailySessionFloorEnforcement — semaine taper/recovery/race jamais touchée", () => {
  const chunks = [
    { weeks: [mkWeek(4, [mkSess("lundi", "strength", null, "Circuit")])] },
  ] as any;
  const quotas = { 4: { ...BASE_QUOTA_LOAD, weekType: "taper" } };
  const { repairs } = applyDailySessionFloorEnforcement(chunks, quotas, [CATALOG_DUMP], "703", "competitor");
  assertEquals(repairs.length, 0);
});

Deno.test("applyDailySessionFloorEnforcement — dump du chunk courant sans candidate, mais disponible dans un AUTRE chunk : repli catalogue global (même bug que le dédoublonnage 'Test_Vince')", () => {
  // Chunk 0 (S1) : dump SANS aucune fiche run/bike endurance — reproduit la
  // rotation catalogue réelle qui peut exclure ces fiches de ce chunk précis.
  const CATALOG_DUMP_EMPTY = `| ID | Sport | Titre | Phase | Durée | Structure |
| C_STR_GLUTE_REACTIVATION | strength | Réactivation fessiers | Base | 20-30 | gainage léger |
`;
  const chunk0 = { weeks: [mkWeek(1, [mkSess("lundi", "strength", null, "Circuit Endurance Musculaire Général")])] };
  const chunk1 = { weeks: [mkWeek(2, [])] };

  const { chunks: out, repairs } = applyDailySessionFloorEnforcement(
    [chunk0, chunk1] as any,
    { 1: BASE_QUOTA_LOAD, 2: BASE_QUOTA_LOAD },
    [CATALOG_DUMP_EMPTY, CATALOG_DUMP],
    "Ironman 70.3",
    "competitor",
  );

  const lundiSessions = out[0].weeks[0].sessions.filter((s: any) => s.day === "lundi");
  assertEquals(lundiSessions.length, 2, "repli catalogue global doit résoudre l'insertion malgré un dump local vide");
  assert(repairs.some(r => r.code === "daily_floor_enforced"), "doit réussir via le repli, pas rester unresolved");
  assert(!repairs.some(r => r.code === "daily_floor_unresolved"));
});
