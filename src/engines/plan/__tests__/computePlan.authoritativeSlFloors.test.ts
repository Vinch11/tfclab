import { describe, expect, it } from "vitest";
import type { ParsedPlan, ParsedSession, PlanGenerationConfig } from "../types";
import { postProcessParsedPlan } from "../computePlan";
import { applySlFloorIndividualization, computeWeekQuotaEntry } from "../sessionSizingMatrix";
import { postProcessSessionText, resolveWideDurationRanges } from "../sessionTextPostProcessor";
import { mergeWindowIntoPlan } from "../planWindowRegen";
import { validateWeeklyQuotas } from "@/lib/plan/validateWeeklyQuotas";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";
import { quotaIssuesToValidationIssues, type QuotaIssue } from "@/lib/plan/validateWeeklyQuotas";

const config: PlanGenerationConfig = { objective: "703", ambition: "age_group", weeklyHours: 12, weeksAvailable: 33, mode: "ai" };
function quota(week = 1) {
  const raw = computeWeekQuotaEntry("703", "age_group", 12, "load", false)!;
  return { ...raw, floors: applySlFloorIndividualization(raw.floors, week, "load", {
    week1PctTarget: 0.8, rampWeeks: 2, weeklyIncreasePctMax: 0.1,
  }, null).floors };
}
function plan(week = 1): ParsedPlan {
  const s: ParsedSession = { weekNumber: week, weekTheme: "Fondation", phase: "base", dayName: "Samedi", dayIndex: 5,
    sport: "bike", title: "Sortie longue", details: "Main: 90-150 min Z2", catalogId: "V3_BIKE_Z2_PROGRESSIF", isRest: false };
  return { title: "703", phases: [], totalWeeks: 33,
    weeks: Array.from({ length: 33 }, (_, i) => ({ weekNumber: i + 1, theme: "Fondation", phase: "base", sessions: i + 1 === week ? [s] : [] })),
    weeklyQuotas: { [week]: quota(week) } };
}

describe("post-traitement final — source de vérité SL individualisée #398", () => {
  it("S1 : 95min générées/validées restent 95min dans le texte final, jamais le nominal 120min", () => {
    const input = plan();
    const before = structuredClone(input.weeklyQuotas);
    const result = postProcessParsedPlan(input, config).plan;
    expect(result.weeks[0].sessions[0].details).toBe("Main: 1h35 Z2");
    expect(result.weeks[0].sessions[0].catalogId).toBe("V3_BIKE_Z2_PROGRESSIF");
    expect(result.weeklyQuotas).toEqual(before);
    // Réouverture depuis le JSON sauvegardé et formulaire courant différent :
    // les quotas du plan restent prioritaires, sans réindividualisation.
    const reopened = JSON.parse(JSON.stringify(result)) as ParsedPlan;
    reopened.weeks[0].sessions[0].details = "Main: 90-150 min Z2";
    expect(postProcessParsedPlan(reopened, { ...config, weeklyHours: 20, ambition: "world_class" }).plan.weeks[0].sessions[0].details).toBe("Main: 1h35 Z2");
  });

  it("un floor déjà réduit pour risque blessure est consommé tel quel, sans double réduction", () => {
    const entry = quota();
    entry.floors = { ...entry.floors, slLongRideMin: 70, slLongRunMin: 60 };
    const result = resolveWideDurationRanges("60-150 min Z2", { sport: "bike", weeklyQuota: entry });
    expect(result.text).toBe("1h10 Z2");
    expect(result.logs.join(" ")).toContain("weeklyQuota:bikeSLRide");
    expect(entry.floors.slLongRideMin).toBe(70);
  });

  it("respecte les bornes de la plage sans modifier les métadonnées catalogue", () => {
    const entry = quota();
    entry.floors = { ...entry.floors, slLongRideMin: 70 };
    const result = resolveWideDurationRanges("90-150 min Z2", { sport: "bike", weeklyQuota: entry });
    expect(result.text).toBe("1h30 Z2");
    expect(result.logs.some(l => l.startsWith("freetext_duration_clamped"))).toBe(true);
  });

  it("sans quota historique, utilise le fallback de phase explicite et ne reconstitue pas le nominal", () => {
    const result = resolveWideDurationRanges("90-150 min Z2", { ...config, ambitionEffective: "age_group", totalWeeks: 33, weekNumber: 1, sport: "bike", phase: "base" });
    expect(result.text).toBe("1h45 Z2");
    expect(result.logs.join(" ")).toContain("generation_weekly_quota_unavailable");
  });

  it.each([95, 120])("ne peut ni créer ni effacer l'alerte de quota ≥%imin calculée sur les durées structurées", (floor) => {
    const input = plan();
    input.weeklyQuotas![1].floors.slLongRideMin = floor;
    const session = { sport: "bike", dayName: "Samedi", dayIndex: 5, durationMin: floor - 5, isRest: false } as MergedSession;
    const merged = { weeks: [{ weekNumber: 1, sessions: [session] }] } as MergedPlan;
    const before = validateWeeklyQuotas(merged, input.weeklyQuotas!);
    expect(before.some(i => i.severity === "critical" && i.reason.includes(`pas de SL vélo (≥${floor}min)`))).toBe(true);
    postProcessParsedPlan(input, config);
    expect(validateWeeklyQuotas(merged, input.weeklyQuotas!)).toEqual(before);
    expect(session.durationMin).toBe(floor - 5);
  });

  it("ne modifie que le texte, jamais durationMin, catalogId ni les quotas", () => {
    const entry = quota();
    const before = structuredClone(entry);
    const s = { title: "SL 90-150 min", details: "Z2", sport: "bike", phase: "base", weekNumber: 1,
      durationMin: 95, catalogId: "V3_BIKE_Z2_PROGRESSIF" };
    postProcessSessionText(s, "age_group", { weeklyQuota: entry });
    expect(s).toMatchObject({ title: "SL 1h35", durationMin: 95, catalogId: "V3_BIKE_Z2_PROGRESSIF", details: "Z2" });
    expect(entry).toEqual(before);
  });

  it("la durée unique 1h45 transcrite du PDF S1 n'est pas modifiée par ce resolver", () => {
    const input = plan();
    input.weeks[0].sessions[0] = { ...input.weeks[0].sessions[0], sport: "run", catalogId: "LYDIARD_RUN_AEROBIC_BASE_LONG", details: "Main: 1h45 en Z1-Z2 strict." };
    expect(postProcessParsedPlan(input, config).plan.weeks[0].sessions[0].details).toBe("Main: 1h45 en Z1-Z2 strict.");
  });

  it("fusionne les quotas des fenêtres en numérotation globale et retire les entrées remplacées périmées", () => {
    const current = plan();
    current.weeklyQuotas = { 1: quota(), 9: quota(9), 10: quota(10), 33: quota(33) };
    const replacement = plan();
    replacement.weeks = replacement.weeks.slice(0, 1);
    const result = mergeWindowIntoPlan(current, replacement, 9, 10);
    expect(Object.keys(result.weeklyQuotas!)).toEqual(["1", "9", "33"]);
    expect(result.weeklyQuotas![9].floors.slLongRideMin).toBe(95);
    expect(result.weeklyQuotas![33]).toEqual(current.weeklyQuotas[33]);
    expect(current.weeklyQuotas[9].floors.slLongRideMin).toBe(120);
    expect(postProcessParsedPlan(result, config).plan.weeks.find(w => w.weekNumber === 9)!.sessions[0].details).toBe("Main: 1h35 Z2");
  });

  it("agrège les alertes des fenêtres sans perdre les critiques ni confondre S1 locale et globale", () => {
    const issue = (weekNumber: number, severity: QuotaIssue["severity"] = "critical"): QuotaIssue => ({
      weekNumber, severity, code: severity === "critical" ? "quota_floor_violation" : "layout_drift", reason: "fixture",
    });
    const current = plan();
    current.weeklyQuotaIssues = [issue(1)];
    const window = plan();
    window.weeks = window.weeks.slice(0, 2);
    window.weeklyQuotaIssues = [issue(1), issue(2, "warning")];
    const merged = mergeWindowIntoPlan(current, window, 16, 17);
    expect(merged.weeklyQuotaIssues?.map(i => [i.weekNumber, i.severity])).toEqual([
      [1, "critical"], [16, "critical"], [17, "warning"],
    ]);
    const blocking = quotaIssuesToValidationIssues(merged.weeklyQuotaIssues ?? []);
    expect(blocking).toHaveLength(2);
    expect(blocking.every(i => i.severity === "error")).toBe(true);
    expect(current.weeklyQuotaIssues).toEqual([issue(1)]);
    const finalWindow = plan();
    finalWindow.weeks = finalWindow.weeks.slice(0, 1);
    finalWindow.weeklyQuotaIssues = [issue(1)];
    expect(mergeWindowIntoPlan(merged, finalWindow, 31, 31).weeklyQuotaIssues?.map(i => i.weekNumber)).toEqual([1, 16, 17, 31]);
  });

  it("une fenêtre remplacée conserve les alertes hors fenêtre et retire ses anciens diagnostics", () => {
    const current = plan();
    current.weeklyQuotaIssues = [1, 9, 33].map(weekNumber => ({ weekNumber, severity: "critical", code: "quota_floor_violation", reason: "fixture" }));
    const cleanWindow = plan();
    cleanWindow.weeks = cleanWindow.weeks.slice(0, 1);
    cleanWindow.weeklyQuotaIssues = [];
    expect(mergeWindowIntoPlan(current, cleanWindow, 9, 9).weeklyQuotaIssues?.map(i => i.weekNumber)).toEqual([1, 33]);
  });

  it("une fenêtre sans diagnostic calculé n'efface pas une alerte critique existante", () => {
    const current = plan();
    current.weeklyQuotaIssues = [{ weekNumber: 9, severity: "critical", code: "quota_floor_violation", reason: "fixture" }];
    const unknownWindow = plan();
    unknownWindow.weeks = unknownWindow.weeks.slice(0, 1);
    expect(mergeWindowIntoPlan(current, unknownWindow, 9, 9).weeklyQuotaIssues).toEqual(current.weeklyQuotaIssues);
  });
});
