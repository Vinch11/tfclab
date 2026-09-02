import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Bug réel signalé par le coach (audit d'un plan IA régénéré, PDF — "la
 * partie course à pied est très timide... ça ne correspond pas à la phase du
 * plan") : un plan format LCW (Long Course Weekend) confirmé — diagnostic
 * "athlète confirmé préparant un format LCW 3 jours", bloc "Race-Specific
 * LCW" — ne contenait AUCUNE des séances signature LCW
 * (B_LCW_BIKE_LONG_RACE_SAT / B_LCW_RUN_OFF_LEGS_SUN / B_LCW_BACK_TO_BACK_PEAK)
 * dans ses 7 semaines, alors que le prompt de génération
 * (promptHelpers.ts) déclare cette checklist explicitement "bloquante".
 * Rien en aval ne vérifiait réellement cette checklist — elle n'était que
 * demandée au LLM, jamais contrôlée après coup.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "base",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Vélo",
    title: "Séance",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Standard", phase = "base"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase,
    sessions: sessions.map((s, i) => makeSession({ weekNumber, weekTheme: theme, dayIndex: i % 7, ...s })),
  };
}

function makePlan(weeks: ParsedWeek[], title = "Plan TFCL™ — 703 — Structure Confirmé"): ParsedPlan {
  return { title, phases: [], weeks, totalWeeks: weeks.length };
}

describe("validateLcwSignaturePresence — checklist LCW bloquante réellement vérifiée", () => {
  it("flague (erreur) un plan LCW sans AUCUNE des 3 séances signature déclarées bloquantes", () => {
    const weeks = [
      makeWeek(1, [{ title: "SFR", catalogId: "V3_BIKE_FORCE_SFR" }], "Fondation", "Bloc 1 · Fondation"),
      makeWeek(5, [{ title: "Sweet Spot", catalogId: "TPL_703_BIKE_SWEET_SPOT_90RPM" }], "Spécifique LCW & Race Power", "Bloc 3 · Race-Specific LCW"),
    ];
    const result = validatePlan(makePlan(weeks));
    const issue = result.issues.find((i) => i.rule === "lcw_signature_missing");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("error");
    expect(issue?.message).toMatch(/B_LCW_BIKE_LONG_RACE_SAT/);
    expect(issue?.message).toMatch(/B_LCW_RUN_OFF_LEGS_SUN/);
    expect(issue?.message).toMatch(/B_LCW_BACK_TO_BACK_PEAK/);
  });

  it("ne flague pas un plan LCW où les 3 séances signature sont bien présentes", () => {
    const weeks = [
      makeWeek(4, [
        { sport: "Vélo", title: "Long Ride Race Pace", catalogId: "B_LCW_BIKE_LONG_RACE_SAT", dayIndex: 5 },
        { sport: "Course", title: "Off-Legs Run", catalogId: "B_LCW_RUN_OFF_LEGS_SUN", dayIndex: 6 },
      ], "Chantier", "Bloc 2 · Chantier LCW"),
      makeWeek(6, [
        { title: "Répétition générale", catalogId: "B_LCW_BACK_TO_BACK_PEAK" },
      ], "Affûtage LCW", "Bloc 3 · Race-Specific LCW"),
    ];
    const result = validatePlan(makePlan(weeks));
    expect(result.issues.filter((i) => i.rule === "lcw_signature_missing")).toHaveLength(0);
  });

  it("ne s'applique pas à un plan qui n'est PAS format LCW (703 continu classique)", () => {
    const weeks = [
      makeWeek(5, [{ title: "Sweet Spot", catalogId: "TPL_703_BIKE_SWEET_SPOT_90RPM" }], "Spécifique", "Bloc 3 · Race-Specific"),
    ];
    const result = validatePlan(makePlan(weeks, "Plan TFCL™ — 703 — Structure Confirmé"));
    expect(result.issues.filter((i) => i.rule === "lcw_signature_missing")).toHaveLength(0);
  });

  it("détecte un format LCW via le titre H1 seul, même sans mention dans les thèmes de semaine", () => {
    const weeks = [makeWeek(1, [{ title: "SFR", catalogId: "V3_BIKE_FORCE_SFR" }], "Fondation", "Bloc 1")];
    const result = validatePlan(makePlan(weeks, "Plan TFCL™ — 70.3 LCW Cath — 7 semaines"));
    const issue = result.issues.find((i) => i.rule === "lcw_signature_missing");
    expect(issue).toBeDefined();
  });
});
