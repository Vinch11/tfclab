import { describe, expect, it } from "vitest";
import { applySlFloorIndividualization, computeWeekQuotaEntry } from "@/engines/plan/sessionSizingMatrix";
import { buildWeekQuotaTransport } from "../weekQuotaTransport";
import { validateWeeklyQuotas } from "../validateWeeklyQuotas";
import type { MergedPlan, MergedSession } from "../mergePlanChunks";

describe("régénération 703 — quotas individualisés transmis au serveur et au client", () => {
  it.each([1, 2, 9, 24, 33])("conserve le numéro global S%i, les floors et le squelette après JSON", (week) => {
    const weekType = week === 33 ? "race" : "load";
    const raw = computeWeekQuotaEntry("703", "age_group", 12, weekType, false)!;
    const individualized = applySlFloorIndividualization(raw.floors, week, weekType, {
      week1PctTarget: 0.8, rampWeeks: 2, weeklyIncreasePctMax: 0.1,
    }, null);
    const entry = { ...raw, floors: individualized.floors };
    const payload = buildWeekQuotaTransport(week, entry);
    const received = JSON.parse(JSON.stringify(payload)) as typeof payload;
    expect(Object.keys(received._weeklyQuotas)).toEqual([String(week)]);
    expect(received._weeklyQuotas[week].floors).toEqual(entry.floors);
    expect(received._weeklyQuotas[week].quota).toEqual(entry.quota);
    expect(received._weeklyQuotasPromptByChunk[0]).toContain(`Semaine ${week}`);
    const longBike = received._weeklyQuotas[week].layout!.days.flatMap(d => d.slots)
      .find(s => (s.sport === "bike" || s.sport === "brick") && s.isLongSession);
    if (weekType === "load") {
      const expectedFloor = entry.floors.slLongRideMin! + (longBike?.sport === "brick" ? 20 : 0);
      expect(longBike?.minDurationMin).toBe(expectedFloor);
      expect(received._weeklyQuotasPromptByChunk[0]).toContain(`SL ≥${expectedFloor}min`);
    }
    // La validation finale lit la même durée, sans recalcul nominal à 120min.
    const sessions = [{ sport: "bike", dayName: "Dimanche", dayIndex: 6, isRest: false,
      durationMin: entry.floors.slLongRideMin, isKeySession: true }] as MergedSession[];
    const merged = { weeks: [{ weekNumber: week, sessions }] } as MergedPlan;
    const issues = validateWeeklyQuotas(merged, received._weeklyQuotas);
    expect(issues.filter(i => i.reason.includes("pas de SL vélo"))).toEqual([]);
    // Les autres obligations restent bloquantes : ce vélo seul ne fait pas un plan conforme.
    expect(issues.some(i => i.severity === "critical")).toBe(true);
  });

  it("sans volumeRamp, ne fabrique aucune réduction du floor nominal", () => {
    const raw = computeWeekQuotaEntry("703", "age_group", 12, "load", false)!;
    const floors = applySlFloorIndividualization(raw.floors, 1, "load", null, null).floors;
    const received = buildWeekQuotaTransport(1, { ...raw, floors });
    expect(received._weeklyQuotas[1].floors.slLongRideMin).toBe(120);
  });

  it("aucun quota disponible : transport vide explicite, pas de quota inventé", () => {
    expect(buildWeekQuotaTransport(24, null)).toEqual({ _weeklyQuotas: {}, _weeklyQuotasPromptByChunk: [""] });
  });
});
