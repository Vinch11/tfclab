import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { testOnlyApplyDailySessionFloorEnforcement as applyDailySessionFloorEnforcement } from "./jsonPlanHandler.ts";

/**
 * Plancher séances/jour Elite+ DÉSACTIVÉ (décision coach, revue du premier
 * plan réel B-10K-TO-70.3, 2026-10-21) : 1 ou 2 séances/jour restent des
 * choix sportifs légitimes ; l'ambition elite ne doit JAMAIS imposer
 * artificiellement une séance supplémentaire — cf.
 * applyDailySessionFloorEnforcement (jsonPlanHandler.ts) et
 * planValidator.ts::validateDailySessionFloor (même décision, même date).
 * Ce fichier vérifie que la fonction est désormais un no-op strict : aucune
 * séance n'est jamais ajoutée, quels que soient l'objectif, l'ambition ou
 * le nombre de séances/jour déjà présentes (y compris les cas qui
 * déclenchaient auparavant une insertion forcée).
 */
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

const CATALOG_DUMP = `#### Course
| ID | Cat | Titre | Phase | Durée | Structure |
| A_RUN_EASY_STRIDES_PRO | A | EF + lignes droites | Base | 45-75 | endurance Z2 stable |
`;

Deno.test("applyDailySessionFloorEnforcement — ancien cas réel 'Vince' (1 seule séance, ambition competitor, IM/70.3) : plus aucune séance ajoutée (no-op)", () => {
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
  assertEquals(lundiSessions.length, 1, "aucune séance ajoutée le lundi — 1 seule séance/jour est un choix légitime");
  assertEquals(repairs.length, 0, "no-op strict : jamais de repair émis");
});

Deno.test("applyDailySessionFloorEnforcement — World Class (ancien palier le plus strict) : no-op malgré de nombreux jours à 1 séance", () => {
  const chunks = [
    { weeks: [mkWeek(1, [
      mkSess("lundi", "strength", null, "Circuit"),
      mkSess("mardi", "bike", "V3_BIKE_FORCE_SFR"),
      mkSess("mercredi", "run", "A_RUN_EASY_STRIDES_PRO"),
    ])] },
  ] as any;
  const { chunks: out, repairs } = applyDailySessionFloorEnforcement(chunks, { 1: BASE_QUOTA_LOAD }, [CATALOG_DUMP], "Ironman 70.3", "world_class");
  assertEquals(out[0].weeks[0].sessions.length, 3, "aucune séance ajoutée (3 → 3)");
  assertEquals(repairs.length, 0);
});

Deno.test("applyDailySessionFloorEnforcement — ambition age_group : no-op (déjà le cas avant, inchangé)", () => {
  const chunks = [
    { weeks: [mkWeek(1, [mkSess("lundi", "strength", null, "Circuit"), mkSess("mardi", "bike", "V3_BIKE_FORCE_SFR")])] },
  ] as any;
  const { repairs } = applyDailySessionFloorEnforcement(chunks, { 1: BASE_QUOTA_LOAD }, [CATALOG_DUMP], "Ironman 70.3", "age_group");
  assertEquals(repairs.length, 0);
});

Deno.test("applyDailySessionFloorEnforcement — objectif non-IM/70.3 : no-op (déjà le cas avant, inchangé)", () => {
  const chunks = [
    { weeks: [mkWeek(1, [mkSess("lundi", "strength", null, "Circuit")])] },
  ] as any;
  const { repairs } = applyDailySessionFloorEnforcement(chunks, { 1: BASE_QUOTA_LOAD }, [CATALOG_DUMP], "Marathon", "elite");
  assertEquals(repairs.length, 0);
});

Deno.test("applyDailySessionFloorEnforcement — traces explicitent que la règle est désactivée (pas juste silencieuse)", () => {
  const chunks = [
    { weeks: [mkWeek(1, [mkSess("lundi", "strength", null, "Circuit")])] },
  ] as any;
  const { traces } = applyDailySessionFloorEnforcement(chunks, { 1: BASE_QUOTA_LOAD }, [CATALOG_DUMP], "Ironman 70.3", "elite");
  assertEquals(traces.some((t) => t.includes("rule_disabled_by_coach_decision")), true);
});
