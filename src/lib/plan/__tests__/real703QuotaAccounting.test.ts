import { describe, expect, it } from "vitest";
import { computeWeekQuotaEntry } from "@/engines/plan/sessionSizingMatrix";
import { buildWeekQuotaTransport } from "../weekQuotaTransport";
import { validateWeeklyQuotas, quotaIssuesToValidationIssues } from "../validateWeeklyQuotas";
import type { MergedPlan, MergedSession } from "../mergePlanChunks";
import { runReconciler } from "../planReconciler";
import type { PlanChunk } from "../planSchema";
import { zSession } from "../planSchema";

describe("703 S1 — compter les séances avant de prescrire une mutation", () => {
  it("le squelette produit et son quota donnent les mêmes comptes, brick compris", () => {
    const entry = computeWeekQuotaEntry("703", "age_group", 12, "load", false)!;
    const transport = buildWeekQuotaTransport(1, entry);
    const generated = transport._weeklyQuotas[1];
    const sessions = generated.layout!.days.flatMap((day, dayIndex) => day.slots.map(slot => ({
      sport: slot.sport, dayName: day.dayName, dayIndex, isRest: false,
      title: "Séance", details: "", catalogId: null, custom: true,
      durationMin: slot.minDurationMin ?? 45, isKeySession: slot.isKeySession ?? false,
    }))) as MergedSession[];
    const merged = { weeks: [{ weekNumber: 1, sessions }] } as MergedPlan;
    const issues = validateWeeklyQuotas(merged, { 1: generated });
    expect(sessions.filter(s => s.sport === "bike")).toHaveLength(2);
    expect(sessions.filter(s => s.sport === "brick")).toHaveLength(1);
    expect(sessions).toHaveLength(10);
    expect(issues).toEqual([]);
  });

  it("les 3 vélos autonomes + brick du PDF sont réellement comptés séparément ; aucun retrait", () => {
    const entry = buildWeekQuotaTransport(1, computeWeekQuotaEntry("703", "age_group", 12, "load", false)!)._weeklyQuotas[1];
    // Seuls comptes/durées connus du PDF/captures ; jours anonymisés, pas le payload historique.
    const sports = ["swim", "bike", "run", "swim", "bike", "run", "swim", "bike", "run", "brick", "strength"];
    const sessions = sports.map((sport, i) => ({ sport, dayName: ["mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"][i % 6],
      dayIndex: i % 6 + 1, isRest: false, durationMin: sport === "brick" ? 90 : 60, isKeySession: false })) as MergedSession[];
    const merged = { weeks: [{ weekNumber: 1, sessions }] } as MergedPlan;
    const before = structuredClone(merged);
    const issues = validateWeeklyQuotas(merged, { 1: entry });
    expect(issues.some(i => i.reason.includes("bike hors fourchette (3 ∉ [2, 2])"))).toBe(true);
    expect(issues.some(i => i.reason.includes("total 11 hors fourchette [10, 10]"))).toBe(true);
    expect(quotaIssuesToValidationIssues(issues).some(i => i.severity === "error")).toBe(true);
    expect(merged).toEqual(before);
  });

  it("une journée bike+swim est deux séances typées ; un brick est une seule séance", () => {
    const base = { day: "mardi", title: "Endurance", details: "", isKeySession: false, durationMin: 45, zones: ["Z2"], custom: true, catalogId: null };
    expect(zSession.safeParse({ ...base, sport: "bike+swim" }).success).toBe(false);
    expect(zSession.safeParse({ ...base, sport: "bike" }).success).toBe(true);
    expect(zSession.safeParse({ ...base, sport: "swim" }).success).toBe(true);
    expect(zSession.safeParse({ ...base, sport: "brick" }).success).toBe(true);
  });
  it("S1 : un brick déjà prévu interdit au réparateur de réintroduire un troisième vélo autonome", () => {
    const entry = buildWeekQuotaTransport(1, computeWeekQuotaEntry("703", "age_group", 12, "load", false)!)._weeklyQuotas[1];
    const sessions = entry.layout!.days.flatMap(day => day.slots.map(slot => ({
      day: day.dayName, sport: slot.sport, title: "Endurance", details: "Z2",
      custom: true, catalogId: null, durationMin: slot.minDurationMin ?? 45,
      zones: ["Z2"], isKeySession: slot.sport !== "bike",
    })));
    const chunk = { weeks: [{ weekNumber: 1, phase: "base", theme: "Fondation", sessions }] } as PlanChunk;
    const before = structuredClone(sessions);
    const result = runReconciler([chunk], { 1: entry }, 2, undefined, { objectiveKey: "703", globalTotalWeeks: 33 });
    expect(chunk.weeks[0].sessions).toEqual(before);
    expect(result.counters.quota_floor_inserted_from_catalog).toBe(0);
    expect(result.counters.quota_floor_unresolved).toBeGreaterThan(0);
    expect(sessions.filter(s => s.sport === "bike")).toHaveLength(2);
    expect(sessions).toHaveLength(10);
  });

});
