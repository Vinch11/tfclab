/**
 * Fix B1 (audit "génération de plan IA", volet réconciliation) : deux filets
 * de runReconciler traitaient la dernière semaine (ou la première) des
 * `chunks` REÇUS comme si elle occupait cette position dans le plan ENTIER —
 * vrai en génération complète, faux en régénération de fenêtre partielle
 * (`usePlanAdaptation.ts::regenerateWindow`, qui ne transmet au réconciliateur
 * que les semaines de la fenêtre régénérée).
 *
 * - ensureRaceDaySession fabriquait un faux "🏁 Jour J" à la dernière semaine
 *   de la fenêtre même quand la fenêtre ne couvrait pas la fin réelle du plan
 *   (ex. semaines 9-12 régénérées sur un plan de 16 → faux Jour J à S12).
 * - enforceStartToRunLadder repartait de prevMax=0 à chaque appel, aveugle à
 *   la progression déjà atteinte dans les semaines réellement antérieures
 *   mais hors fenêtre, pouvant faire régresser l'échelle marche-course.
 *
 * globalTotalWeeks/globalWeekOffset (déjà calculés dans planWindowRegen.ts,
 * PlanConfig.globalTotalWeeks/globalWeekOffset) permettent au réconciliateur
 * de savoir si la fenêtre couvre réellement la fin du plan.
 */
import { describe, it, expect } from "vitest";
import type { PlanChunk } from "@/lib/plan/planSchema";
import { runReconciler } from "@/lib/plan/planReconciler";

function mkSess(day: string, sport: string, title: string, catalogId: string | null = null): any {
  return { day, sport, title, details: "", isKeySession: false, custom: true, durationMin: 30, zones: [], catalogId };
}
function singleWeekChunk(weekNumber: number, sessions: any[]): PlanChunk {
  return { weeks: [{ weekNumber, phase: "peak", theme: "Test", sessions }] } as unknown as PlanChunk;
}
const RACE_DAY_RX = /🏁/;

describe("runReconciler — ensureRaceDaySession n'agit que si la fenêtre couvre réellement la fin du plan (fix B1)", () => {
  it("fenêtre de régénération NE couvrant PAS la dernière semaine réelle (S9-12 d'un plan de 16) : aucun faux Jour J", () => {
    // Semaine locale 4 (dernière du chunk reçu) + offset 8 (fenêtre S9-12) = S12 réelle, plan de 16 semaines.
    const chunk = singleWeekChunk(4, [mkSess("mardi", "run", "Footing"), mkSess("dimanche", "run", "Sortie longue")]);
    const rec = runReconciler([chunk], {}, 1, undefined, {
      objectiveKey: "Marathon",
      globalTotalWeeks: 16,
      globalWeekOffset: 8,
    });
    const allText = chunk.weeks[0].sessions.map((s: any) => `${s.title} ${s.details}`).join(" ");
    expect(RACE_DAY_RX.test(allText)).toBe(false);
    expect(rec.counters.race_day_inserted).toBeUndefined();
  });

  it("fenêtre de régénération couvrant réellement la dernière semaine du plan (S9-12 d'un plan de 12) : Jour J inséré", () => {
    const chunk = singleWeekChunk(4, [mkSess("mardi", "run", "Footing"), mkSess("dimanche", "rest", "Repos")]);
    (chunk.weeks[0].sessions[1] as any).sport = "rest";
    const rec = runReconciler([chunk], {}, 1, undefined, {
      objectiveKey: "Marathon",
      globalTotalWeeks: 12,
      globalWeekOffset: 8,
    });
    const allText = chunk.weeks[0].sessions.map((s: any) => `${s.title} ${s.details}`).join(" ");
    expect(RACE_DAY_RX.test(allText)).toBe(true);
    expect(rec.counters.race_day_inserted).toBe(1);
  });

  it("régression : sans globalTotalWeeks (génération complète, comportement legacy), le Jour J est toujours inséré", () => {
    const chunk = singleWeekChunk(4, [mkSess("mardi", "run", "Footing"), mkSess("dimanche", "rest", "Repos")]);
    const rec = runReconciler([chunk], {}, 1, undefined, { objectiveKey: "Marathon" });
    const allText = chunk.weeks[0].sessions.map((s: any) => `${s.title} ${s.details}`).join(" ");
    expect(RACE_DAY_RX.test(allText)).toBe(true);
    expect(rec.counters.race_day_inserted).toBe(1);
  });
});

describe("runReconciler — enforceStartToRunLadder n'écrase pas la progression sans visibilité sur les semaines antérieures (fix B1)", () => {
  it("fenêtre ne débutant pas en S1 du plan réel (offset>0) : la fiche haut-palier n'est PAS lissée à tort", () => {
    const chunk = singleWeekChunk(1, [
      mkSess("samedi", "run", "Continu 30min", "S2R_CONTINUOUS_30_LONG"),
    ]);
    const rec = runReconciler([chunk], {}, 1, undefined, {
      objectiveKey: "Start to Run",
      globalWeekOffset: 8,
    });
    expect((chunk.weeks[0].sessions[0] as any).catalogId).toBe("S2R_CONTINUOUS_30_LONG");
    expect(rec.counters.s2r_ladder_smoothed).toBeUndefined();
  });

  it("régression : sans offset (ou offset=0), le lissage de palier reste actif comme avant", () => {
    const chunk = singleWeekChunk(1, [
      mkSess("samedi", "run", "Continu 30min", "S2R_CONTINUOUS_30_LONG"),
    ]);
    const rec = runReconciler([chunk], {}, 1, undefined, {
      objectiveKey: "Start to Run",
    });
    expect((chunk.weeks[0].sessions[0] as any).catalogId).not.toBe("S2R_CONTINUOUS_30_LONG");
    expect(rec.counters.s2r_ladder_smoothed).toBe(1);
  });
});
