import { describe, expect, it } from "vitest";
import { repairCatalogueContractPlan, validateSessionCataloguePlan, CATALOGUE_REPAIR_NOTE } from "@/lib/plan/sessionCatalogueValidation";

/**
 * Plans d'Emanuela (27/11/2026) : sauvegarde refusée trois fois de suite pour des séances refusées par le
 * contrôle catalogue (phase:taper, race_proximity_outside_race_week…). La dernière passe de la génération
 * applique le même contrôle et remplace ces séances : un plan généré n'est plus bloqué pour ça.
 */
const plan = () => ({
  weeklyQuotas: { 30: { phase: "taper", weekType: "taper" }, 31: { phase: "taper", weekType: "taper" } },
  weeks: [
    { weekNumber: 30, phase: "taper", sessions: [
      { day: "samedi", sport: "bike", title: "Sortie affûtage vélo IM", details: "Main: 100min Z2 [ID: V2_BIKE_TT_RACE_PACE]", catalogId: "V2_BIKE_TT_RACE_PACE", custom: false, durationMin: 135, zones: ["Z2", "Z3"] },
      { day: "dimanche", sport: "run", title: "Sortie longue affûtage", details: "Main: 40min Z2 incluant 10min allure IM Z3 [ID: A_RUN_EASY_45_PRO]", catalogId: "A_RUN_EASY_45_PRO", custom: false, durationMin: 65, zones: ["Z2", "Z3"] },
    ] },
    { weekNumber: 31, phase: "taper", sessions: [
      { day: "samedi", sport: "swim", title: "Ouverture natation", details: "[ID: D_TAPER_SWIM_OPENER]", catalogId: "D_TAPER_SWIM_OPENER", custom: false, durationMin: 35, zones: ["Z3"] },
    ] },
  ],
});

describe("dernière passe : même contrôle que la sauvegarde", () => {
  it("les séances refusées sont remplacées par des fiches compatibles du même sport, et le disent", () => {
    const p = plan();
    expect(validateSessionCataloguePlan(p as never, "IM").filter(i => i.severity === "error").length).toBeGreaterThan(0);
    const log = repairCatalogueContractPlan(p as never, "IM");
    expect(log.length).toBeGreaterThanOrEqual(3);
    expect(validateSessionCataloguePlan(p as never, "IM").filter(i => i.severity === "error")).toEqual([]);
    expect(p.weeks[0].sessions.map(s => s.sport)).toEqual(["bike", "run"]);
    // Fiches Ironman de durée compatible, jamais une fiche Start to Run.
    expect(p.weeks[0].sessions.map(s => s.catalogId)).toEqual(["A_IM_TAPER_BIKE_ENDURANCE_120", "A_IM_TAPER_RUN_ENDURANCE_60"]);
    expect(p.weeks[1].sessions[0].sport).toBe("swim");
    expect(p.weeks.flatMap(w => w.sessions).every(s => s.details.startsWith(CATALOGUE_REPAIR_NOTE))).toBe(true);
  });
  it("une séance déjà conforme n'est pas touchée", () => {
    const p = { weeklyQuotas: { 10: { phase: "build", weekType: "load" } }, weeks: [{ weekNumber: 10, phase: "build", sessions: [
      { day: "mardi", sport: "run", title: "x", details: "[ID: A_RUN_EASY_45_PRO]", catalogId: "A_RUN_EASY_45_PRO", custom: false, durationMin: 45, zones: ["Z2"] },
    ] }] };
    expect(repairCatalogueContractPlan(p as never, "IM")).toEqual([]);
    expect(p.weeks[0].sessions[0].catalogId).toBe("A_RUN_EASY_45_PRO");
  });
});
