import { describe, it, expect } from "vitest";
import { jsonPlanToParsedPlan } from "../jsonPlanToParsedPlan";
import type { MergedPlan, MergedSession } from "../mergePlanChunks";

/**
 * Bug réel signalé par le coach (capture d'écran) : les jours d'une semaine
 * s'affichaient dans un ordre incohérent — Lundi, Dimanche, Mardi, Samedi,
 * Mercredi... — au lieu de l'ordre chronologique attendu. Cause racine :
 * `jsonPlanToParsedPlan` (mapping identité MergedPlan → ParsedPlan, point de
 * passage unique des 3 chemins de génération — complète, fenêtre, semaine
 * seule) recopiait `week.sessions` dans l'ordre reçu, sans jamais le trier
 * par `dayIndex`. Aucune étape en amont (merge des chunks, réconciliation,
 * insertion de séances, filet dur signatures LCW) ne garantit cet ordre —
 * ces opérations mutent/substituent en place ou ajoutent en fin de tableau.
 */
function mkSession(over: Partial<MergedSession>): MergedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "run",
    title: "Séance",
    details: "",
    isRest: false,
    isKeySession: false,
    catalogId: null,
    custom: false,
    durationMin: 60,
    zones: [],
    ...over,
  };
}

function mkPlan(sessions: MergedSession[]): MergedPlan {
  return {
    title: "Plan Test",
    phases: [],
    totalWeeks: 1,
    weeks: [{ weekNumber: 1, theme: "Semaine 1", phase: "build", sessions }],
  };
}

describe("jsonPlanToParsedPlan — ordre chronologique des séances (bug réel coach)", () => {
  it("réordonne des séances reçues dans le désordre (Lundi, Dimanche, Mardi, Samedi, Mercredi) en ordre chronologique", () => {
    const sessions = [
      mkSession({ dayName: "Lundi", dayIndex: 0, isRest: true, sport: "Repos", title: "Repos" }),
      mkSession({ dayName: "Dimanche", dayIndex: 6, sport: "run", title: "Long run (LCW)" }),
      mkSession({ dayName: "Mardi", dayIndex: 1, sport: "swim", title: "Natation CSS" }),
      mkSession({ dayName: "Samedi", dayIndex: 5, sport: "bike", title: "Long ride (LCW)" }),
      mkSession({ dayName: "Mercredi", dayIndex: 2, sport: "run", title: "CAP Allure" }),
    ];
    const result = jsonPlanToParsedPlan(mkPlan(sessions));
    expect(result.weeks[0].sessions.map((s) => s.dayIndex)).toEqual([0, 1, 2, 5, 6]);
    expect(result.weeks[0].sessions.map((s) => s.dayName)).toEqual([
      "Lundi", "Mardi", "Mercredi", "Samedi", "Dimanche",
    ]);
  });

  it("préserve l'ordre relatif de plusieurs séances le même jour (tri stable)", () => {
    const sessions = [
      mkSession({ dayName: "Lundi", dayIndex: 0, sport: "bike", title: "Vélo AM" }),
      mkSession({ dayName: "Lundi", dayIndex: 0, sport: "strength", title: "Renfo PM" }),
    ];
    const result = jsonPlanToParsedPlan(mkPlan(sessions));
    expect(result.weeks[0].sessions.map((s) => s.title)).toEqual(["Vélo AM", "Renfo PM"]);
  });

  it("ne modifie rien pour des séances déjà dans l'ordre chronologique", () => {
    const sessions = [
      mkSession({ dayName: "Lundi", dayIndex: 0, isRest: true, sport: "Repos", title: "Repos" }),
      mkSession({ dayName: "Mardi", dayIndex: 1, sport: "swim", title: "Natation" }),
      mkSession({ dayName: "Mercredi", dayIndex: 2, sport: "run", title: "CAP" }),
    ];
    const result = jsonPlanToParsedPlan(mkPlan(sessions));
    expect(result.weeks[0].sessions.map((s) => s.dayIndex)).toEqual([0, 1, 2]);
  });
});
