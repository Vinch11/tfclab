import { describe, expect, it } from "vitest";
import { isRaceDaySession, validatePlan } from "@/engines/plan/planValidator";
import { postProcessParsedPlan } from "@/engines/plan/computePlan";
import type { ParsedPlan, ParsedSession, PlanGenerationConfig } from "@/engines/plan/types";
import { isRaceEventTitle } from "../../../../supabase/functions/_shared/raceDayIdentity";
import { runReconciler } from "../planReconciler";
import { zSession, type PlanChunk } from "../planSchema";

// Transcription ciblée p.151 du PDF 703/33 semaines, sans donnée athlète.
const title = "COURSE : IRONMAN 70.3 TOURS";
const details = "Objectif Principal : 1.9km Natation Z3 + 90km Vélo Z3/Z4a + 21.1km CAP Z4a. Gestion nutritionnelle stricte 90g/h glucides.";
const config: PlanGenerationConfig = {
  objective: "703", weeksAvailable: 33, mode: "ai", planStartDate: "2026-10-19",
  raceGoals: [{ objective: "703", priority: "A", raceDate: "2027-06-06", raceName: "IRONMAN 70.3 TOURS" }],
};

function session(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return { weekNumber: 33, weekTheme: "Course", phase: "taper", dayName: "Dimanche", dayIndex: 6,
    sport: "brick", title, details, isRest: false, ...overrides };
}

function plan(sessions: ParsedSession[]): ParsedPlan {
  return { title: "703", phases: [], weeks: [{ weekNumber: 33, theme: "Course", phase: "taper", sessions }], totalWeeks: 33 };
}

describe("identité de compétition réelle — régression PDF 703", () => {
  it("reconnaît le titre COURSE : nommé sans exiger un emoji", () => {
    expect(isRaceDaySession({ title, details })).toBe(true);
  });

  it.each([
    "Activation pré-course : IRONMAN 70.3 TOURS",
    "Simulation course : IRONMAN 70.3 TOURS",
    "Entraînement allure course : IRONMAN 70.3 TOURS",
    "Course à pied — endurance fondamentale",
  ])("ne transforme pas une séance en compétition : %s", (title) => {
    expect(isRaceDaySession({ title, details: "30min Z2" })).toBe(false);
  });

  it("le réconciliateur n'ajoute aucun Jour J à l'épreuve nommée, même rejoué", () => {
    const chunk = { weeks: [{ weekNumber: 33, phase: "taper", theme: "Course", sessions: [
      { day: "dimanche", sport: "brick", title, details, durationMin: 330, zones: [], custom: true, catalogId: null, isKeySession: true },
    ] }] } as PlanChunk;
    for (let i = 0; i < 2; i++) {
      const result = runReconciler([chunk], {}, 2, undefined, { objectiveKey: "703", globalTotalWeeks: 33 });
      expect(result.counters.race_day_inserted ?? 0).toBe(0);
      expect(chunk.weeks[0].sessions).toHaveLength(1);
      expect(chunk.weeks[0].sessions[0]).toMatchObject({ title, details, durationMin: 330 });
    }
  });

  it("le post-traitement conserve l'épreuve nommée sans fabriquer un doublon", () => {
    const result = postProcessParsedPlan(plan([session()]), config).plan;
    expect(result.weeks[0].sessions).toHaveLength(1);
    expect(result.weeks[0].sessions.filter(isRaceDaySession)).toHaveLength(1);
    expect(result.weeks[0].sessions[0]).toMatchObject({ title, details });
  });

  it("un doublon déjà produit converge vers l'épreuve nommée en conservant les consignes", () => {
    const input = plan([session(), session({ title: "🏁 COURSE OBJECTIF — Jour J (Ironman 70.3)", details: "Jour de course. 330min. Pacing conforme à la stratégie validée." })]);
    for (let i = 0; i < 2; i++) {
      const result = postProcessParsedPlan(input, config).plan;
      expect(result.weeks[0].sessions).toHaveLength(1);
      expect(result.weeks[0].sessions.filter(isRaceDaySession)).toHaveLength(1);
      expect(result.weeks[0].sessions[0].title).toBe(title);
      expect(result.weeks[0].sessions[0].details).toBe(details);
    }
  });

  it("conserve les deux courses déclarées S9/S33 sans créer d'événement à partir du thème S24", () => {
    const input = plan([]);
    input.weeks = Array.from({ length: 33 }, (_, i) => ({
      weekNumber: i + 1, theme: i === 23 ? "Régénération & Activation Objectif Intermédiaire" : "Fondation",
      phase: "base", sessions: [session({ weekNumber: i + 1, title: "Endurance fondamentale", details: "45min Z2", sport: "run" })],
    }));
    input.weeks[8].sessions = [session({ weekNumber: 9, title: "🏁 COURSE OBJECTIF B — 10 km WSL", details: "Course officielle 10 km", dayName: "Samedi", dayIndex: 5, sport: "run", catalogId: null })];
    input.weeks[32].sessions = [session()];
    const result = postProcessParsedPlan(input, { ...config, raceGoals: [
      { objective: "10K", priority: "B", raceDate: "2026-12-19", raceName: "10 km WSL" },
      ...config.raceGoals!,
    ] }).plan;
    expect(result.weeks.filter(w => w.sessions.some(isRaceDaySession)).map(w => w.weekNumber)).toEqual([9, 33]);
    expect(result.weeks[8].sessions[0]).toMatchObject({ title: "🏁 COURSE OBJECTIF B — 10 km WSL", catalogId: null });
  });

  it("une course nommée hors calendrier reste une erreur bloquante P0", () => {
    const input = plan([session()]);
    input.weeks.unshift({ weekNumber: 24, theme: "Build", phase: "build", sessions: [session({ weekNumber: 24, title: "COURSE : 10 km non déclaré" })] });
    const issues = validatePlan(input, "703", undefined, [9, 33]).issues;
    expect(issues).toEqual(expect.arrayContaining([expect.objectContaining({ rule: "race_day_unexpected", week: 24, severity: "error" })]));
  });
  it("refuse la course officielle associée à une fiche de simulation sans effacer la prescription", () => {
    const race = session({ weekNumber: 9, sport: "run", dayName: "Samedi", dayIndex: 5,
      title: "Course — 🏁 OBJECTIF B : 10 km (Wsl)",
      details: "Course 10 km : gestion rigoureuse en negative split au seuil Z5. 10min retour au calme en Z1. [ID: V3_RUN_10K_RACE_SIM]",
      catalogId: "V3_RUN_10K_RACE_SIM" });
    const input = plan([race]);
    input.weeks[0].weekNumber = 9;
    const before = structuredClone(input);
    const issues = validatePlan(input, "703", undefined, [9, 33]).issues;
    expect(issues).toEqual(expect.arrayContaining([expect.objectContaining({
      rule: "race_catalog_conflict", week: 9, severity: "error",
    })]));
    expect(input).toEqual(before);
  });

  it("le réconciliateur préserve la course officielle même avec une fiche incompatible en durée/phase", () => {
    const race = { day: "samedi", sport: "run", title: "Course — 🏁 OBJECTIF B : 10 km (Wsl)",
      details: "10 km officiel le 19 décembre 2026. [ID: V3_RUN_10K_RACE_SIM]",
      durationMin: 60, zones: ["Z4"], custom: false, catalogId: "V3_RUN_10K_RACE_SIM", isKeySession: true };
    const chunk = { weeks: [{ weekNumber: 9, phase: "base", theme: "Course", sessions: [race] }] } as PlanChunk;
    const before = structuredClone(race);
    const result = runReconciler([chunk], {}, 2, undefined, { objectiveKey: "703", globalTotalWeeks: 33 });
    expect(race).toEqual(before);
    expect(result.counters.phase_unresolved).toBe(0);
    expect(result.counters.duration_unresolved).toBe(0);
  });

  it.each(["Simulation 🏁 compétition 10 km", "Activation précompétition Jour J", "Entraînement allure course 10 km"])("ne protège pas un entraînement comme un événement : %s", title => {
    expect(isRaceEventTitle({ title })).toBe(false);
  });
  it("détecte aussi l'ID de simulation dans le texte après un chargement Markdown", () => {
    const input = plan([session({ title: "COURSE : 10 km WSL", catalogId: null,
      details: "Course officielle. [ID: V3_RUN_10K_RACE_SIM]" })]);
    expect(validatePlan(input, "703").issues.some(i => i.rule === "race_catalog_conflict")).toBe(true);
  });
  it("ne bloque pas une vraie simulation d'entraînement sur le seul nom de sa fiche", () => {
    const input = plan([session({ title: "Simulation course 10K — dress rehearsal", catalogId: "V3_RUN_10K_RACE_SIM", details: "6-8 km à allure cible" })]);
    expect(validatePlan(input, "703").issues.some(i => i.rule === "race_catalog_conflict")).toBe(false);
  });

  it("le schéma client refuse l'association structurée mais conserve une compétition autonome", () => {
    const race = { day: "samedi", sport: "run", title: "COURSE : 10 km WSL", details: "Course officielle 10 km",
      durationMin: 60, custom: false, catalogId: "V3_RUN_10K_RACE_SIM", isKeySession: true, zones: ["Z4"] };
    expect(zSession.safeParse(race).success).toBe(false);
    expect(zSession.safeParse({ ...race, custom: true, catalogId: null }).success).toBe(true);
  });

});
