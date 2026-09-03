import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { applyLcwSignatureEnforcement } from "./jsonPlanHandler.ts";

/**
 * Bug réel confirmé sur un plan LCW 7 semaines réellement livré à un
 * athlète ("Vince", 70.3 LCW) : AUCUNE occurrence de B_LCW_BIKE_LONG_RACE_SAT
 * / B_LCW_RUN_OFF_LEGS_SUN sur l'ensemble du plan, malgré :
 *   1. la checklist statique de sortie LCW (promptHelpers.ts,
 *      "CHECKLIST DE SORTIE LCW — bloquante") ;
 *   2. le rappel dynamique numérique par chunk (lcwSignatureReminder.ts,
 *      "X/Y placé(s) jusqu'ici", urgence maximale sur le dernier chunk
 *      Build/Peak).
 * Les deux mécanismes existants sont uniquement DEMANDÉS au LLM dans le
 * prompt — rien en aval ne les fait respecter, contrairement à d'autres
 * quotas (sport/jour, déduplication catalogId) déjà réconciliés
 * déterministement. applyLcwSignatureEnforcement ajoute ce filet dur.
 */

const CATALOG_DUMP = `#### Vélo
| ID | Cat | Titre | Phase | Durée | Structure |
| B_LCW_BIKE_LONG_RACE_SAT | B | Long ride race-pace | Build/Peak | 150-200 | 2h30 IF 0.82-0.85 |
| B_LCW_RUN_OFF_LEGS_SUN | B | Long run jambes fatiguées | Build/Peak | 60-120 | 60-90min allure race |
`;

function mkSess(day: string, sport: string, catalogId: string | null): any {
  return { day, sport, title: catalogId ?? "custom", details: "", catalogId, custom: !catalogId, durationMin: 90 };
}
function mkWeek(weekNumber: number, phase: string, sessions: any[]): any {
  return { weekNumber, phase, theme: "Test", sessions };
}

const LCW_PLAN_CONFIG = { raceGoals: [{ raceFormat: "lcw_3day" }] };

Deno.test("applyLcwSignatureEnforcement — plan LCW réel, B_LCW_* totalement absents (bug 'Vince') : force le quota checklist (≥3 chacun)", () => {
  const chunks = [
    {
      weeks: [
        mkWeek(1, "build", [
          mkSess("mardi", "bike", "V3_BIKE_Z2_PROGRESSIF"),
          mkSess("samedi", "bike", "OTHER_BIKE"),
          mkSess("dimanche", "run", "A_IM_RUN_FATIGUED_NEXT_DAY"),
        ]),
        mkWeek(2, "peak", [mkSess("samedi", "bike", "OTHER_BIKE2"), mkSess("dimanche", "run", "OTHER_RUN")]),
        mkWeek(3, "peak", [mkSess("samedi", "bike", "OTHER_BIKE3"), mkSess("dimanche", "run", "OTHER_RUN2")]),
        mkWeek(4, "taper", [mkSess("samedi", "bike", "TAPER_BIKE")]),
      ],
    },
  ] as any;

  const { chunks: out, repairs } = applyLcwSignatureEnforcement(chunks, [CATALOG_DUMP], LCW_PLAN_CONFIG);

  const allIds = out[0].weeks.flatMap((w: any) => w.sessions.map((s: any) => s.catalogId));
  const bikeCount = allIds.filter((id: string) => id === "B_LCW_BIKE_LONG_RACE_SAT").length;
  const runCount = allIds.filter((id: string) => id === "B_LCW_RUN_OFF_LEGS_SUN").length;
  assertEquals(bikeCount, 3, "B_LCW_BIKE_LONG_RACE_SAT doit atteindre le minimum checklist (3)");
  assertEquals(runCount, 3, "B_LCW_RUN_OFF_LEGS_SUN doit atteindre le minimum checklist (3)");

  // La semaine taper (S4) ne fait pas partie de la fenêtre Build/Peak : jamais touchée.
  const week4Ids = out[0].weeks[3].sessions.map((s: any) => s.catalogId);
  assertEquals(week4Ids, ["TAPER_BIKE"]);

  assertEquals(repairs.filter(r => r.code === "lcw_signature_enforced").length, 6);
});

Deno.test("applyLcwSignatureEnforcement — plan non-LCW : no-op complet", () => {
  const chunks = [{ weeks: [mkWeek(1, "build", [mkSess("mardi", "bike", "SOMETHING")])] }] as any;
  const { repairs } = applyLcwSignatureEnforcement(chunks, [CATALOG_DUMP], {});
  assertEquals(repairs.length, 0);
});

Deno.test("applyLcwSignatureEnforcement — plan déjà conforme (3 occurrences chacun) : aucune modification", () => {
  const chunks = [
    {
      weeks: [
        mkWeek(1, "build", [mkSess("samedi", "bike", "B_LCW_BIKE_LONG_RACE_SAT"), mkSess("dimanche", "run", "B_LCW_RUN_OFF_LEGS_SUN")]),
        mkWeek(2, "peak", [mkSess("samedi", "bike", "B_LCW_BIKE_LONG_RACE_SAT"), mkSess("dimanche", "run", "B_LCW_RUN_OFF_LEGS_SUN")]),
        mkWeek(3, "peak", [mkSess("samedi", "bike", "B_LCW_BIKE_LONG_RACE_SAT"), mkSess("dimanche", "run", "B_LCW_RUN_OFF_LEGS_SUN")]),
      ],
    },
  ] as any;
  const { repairs } = applyLcwSignatureEnforcement(chunks, [CATALOG_DUMP], LCW_PLAN_CONFIG);
  assertEquals(repairs.length, 0);
});

Deno.test("applyLcwSignatureEnforcement — fiche absente du dump du chunk : contenu de repli livré (pas juste un catalogId muet)", () => {
  // Bug réel (2e itération du correctif, audit plans "Vince") : sans dump
  // pour ce chunk, l'ancienne version forçait catalogId mais laissait
  // title/details inchangés — le validateur passait, mais l'athlète ne
  // voyait jamais le vrai contenu de la séance signature (aucun tag
  // [ID: ...] visible, aucune fiche "FICHE COMPLÈTE BIBLIOTHÈQUE" au rendu).
  const chunks = [
    {
      weeks: [
        mkWeek(1, "build", [mkSess("samedi", "bike", "OTHER_BIKE"), mkSess("dimanche", "run", "OTHER_RUN")]),
        mkWeek(2, "peak", [mkSess("samedi", "bike", "OTHER_BIKE2"), mkSess("dimanche", "run", "OTHER_RUN2")]),
        mkWeek(3, "peak", [mkSess("samedi", "bike", "OTHER_BIKE3"), mkSess("dimanche", "run", "OTHER_RUN3")]),
      ],
    },
  ] as any;
  // Dump vide (fiches non présentes dans le catalogue de CE chunk).
  const { chunks: out } = applyLcwSignatureEnforcement(chunks, [""], LCW_PLAN_CONFIG);
  const sessions = out[0].weeks.flatMap((w: any) => w.sessions);
  const bikeSession = sessions.find((s: any) => s.catalogId === "B_LCW_BIKE_LONG_RACE_SAT");
  const runSession = sessions.find((s: any) => s.catalogId === "B_LCW_RUN_OFF_LEGS_SUN");
  assert(bikeSession, "B_LCW_BIKE_LONG_RACE_SAT attendu");
  assert(runSession, "B_LCW_RUN_OFF_LEGS_SUN attendu");
  // Le contenu livré doit porter le tag [ID: ...] exploitable par le même
  // extracteur que le validateur ET le rendu PDF (extractCatalogId), pas
  // juste un catalogId interne invisible pour l'athlète.
  assert(bikeSession.details.includes("[ID: B_LCW_BIKE_LONG_RACE_SAT]"), "détails bike doivent contenir le tag ID");
  assert(runSession.details.includes("[ID: B_LCW_RUN_OFF_LEGS_SUN]"), "détails run doivent contenir le tag ID");
  assert(bikeSession.title !== "OTHER_BIKE", "le titre générique ne doit plus rester tel quel");
});

Deno.test("applyLcwSignatureEnforcement — substitution préfère le même jour/sport quand disponible (pas de déplacement inutile)", () => {
  const chunks = [
    {
      weeks: [
        mkWeek(1, "build", [mkSess("samedi", "bike", "OTHER_BIKE"), mkSess("dimanche", "run", "OTHER_RUN")]),
      ],
    },
  ] as any;
  const { chunks: out } = applyLcwSignatureEnforcement(chunks, [CATALOG_DUMP], LCW_PLAN_CONFIG);
  const sessions = out[0].weeks[0].sessions;
  const bikeSession = sessions.find((s: any) => s.catalogId === "B_LCW_BIKE_LONG_RACE_SAT");
  const runSession = sessions.find((s: any) => s.catalogId === "B_LCW_RUN_OFF_LEGS_SUN");
  assert(bikeSession, "B_LCW_BIKE_LONG_RACE_SAT attendu");
  assert(runSession, "B_LCW_RUN_OFF_LEGS_SUN attendu");
  assertEquals(bikeSession.day, "samedi");
  assertEquals(runSession.day, "dimanche");
});
