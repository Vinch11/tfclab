import { describe, it, expect } from "vitest";
import { buildWindowRegenConfig, mergeWindowIntoPlan } from "../planWindowRegen";
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";
import type { PlanConfig, PlanAthleteData } from "@/hooks/useAITrainingPlan";

function makeSession(over: Partial<ParsedSession>): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Base",
    phase: "Base",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Vélo",
    title: "Endurance Z2",
    details: "",
    isRest: false,
    ...over,
  };
}

/** Plan de 20 semaines — sert à vérifier que la régénération d'une fenêtre
 *  centrale (S9-S12) connaît sa vraie position globale plutôt que de se
 *  croire dans un mini-cycle base/build/peak/taper isolé. */
function makeLongPlan(totalWeeks: number): ParsedPlan {
  const weeks = Array.from({ length: totalWeeks }, (_, i) => {
    const weekNumber = i + 1;
    return {
      weekNumber,
      theme: `Semaine ${weekNumber}`,
      phase: "Build",
      sessions: [
        makeSession({ weekNumber, dayIndex: 0, dayName: "Lundi", title: "Repos", sport: "Repos", isRest: true }),
        makeSession({ weekNumber, dayIndex: 1, dayName: "Mardi", title: "Intervals seuil 4x8" }),
      ],
    };
  });
  return {
    title: "Plan Test 20 sem",
    phases: [
      { name: "Fondation", weeks: "S1-S6" },
      { name: "Build", weeks: "S7-S14" },
      { name: "Spécifique", weeks: "S15-S18" },
      { name: "Affûtage", weeks: "S19-S20" },
    ],
    totalWeeks,
    weeks,
  };
}

const baseConfig: PlanConfig = { objective: "SEMI_MARATHON", weeksAvailable: 20, weeklyHours: 8 };
const athleteData: PlanAthleteData = {};

describe("planWindowRegen — périodisation globale", () => {
  it("porte la vraie longueur totale et le vrai offset, pas la taille locale de la fenêtre", () => {
    const plan = makeLongPlan(20);
    const { config } = buildWindowRegenConfig({
      fromWeek: 9,
      toWeek: 12,
      currentPlan: plan,
      athleteData,
      baseConfig,
    });
    expect(config.weeksAvailable).toBe(4); // contenu généré : 4 semaines
    expect(config.globalTotalWeeks).toBe(20); // périodisation : vrai total
    expect(config.globalWeekOffset).toBe(8); // S9 locale 1 → globale 9
  });

  it("ne classe PAS une fenêtre de milieu de plan en phase 'base' par défaut", () => {
    const plan = makeLongPlan(20);
    // S9-S12 sur 20 sem = 45%-60% → phase "build", pas "base" (bug historique :
    // le pipeline non-chunké résolvait toujours activePhase="base" car
    // chunk.start valait 1 en numérotation locale).
    const { config } = buildWindowRegenConfig({
      fromWeek: 9,
      toWeek: 12,
      currentPlan: plan,
      athleteData,
      baseConfig,
    });
    expect(config.windowRegenPhase).toBe("build");
  });

  it("détecte correctement une fenêtre de fin de plan comme 'taper'", () => {
    const plan = makeLongPlan(20);
    // S19-S20 sur 20 sem = 95%-100% → taper.
    const { config } = buildWindowRegenConfig({
      fromWeek: 19,
      toWeek: 20,
      currentPlan: plan,
      athleteData,
      baseConfig,
    });
    expect(config.windowRegenPhase).toBe("taper");
  });

  it("injecte la périodisation réelle par semaine locale dans les contraintes envoyées à l'IA", () => {
    const plan = makeLongPlan(20);
    const { config } = buildWindowRegenConfig({
      fromWeek: 9,
      toWeek: 12,
      currentPlan: plan,
      athleteData,
      baseConfig,
    });
    // La dernière semaine locale (globale S12, 60%) doit être annotée "build",
    // pas "taper" — vérifie que le texte prompt ne réinvente pas un cycle
    // local où S12 (4e/4e semaine de la fenêtre) serait vue comme fin de bloc.
    expect(config.constraints).toContain("Sem locale 4 (= S12 globale) : phase \"build\"");
    expect(config.constraints).toContain(`plan de 20 semaines`);
  });

  it("mergeWindowIntoPlan renumérote 1..N vers fromWeek..toWeek et préserve passé/futur", () => {
    const plan = makeLongPlan(20);
    const windowPlan: ParsedPlan = {
      title: "Fenêtre",
      phases: [],
      totalWeeks: 4,
      weeks: [1, 2, 3, 4].map((n) => ({
        weekNumber: n,
        theme: `Local ${n}`,
        phase: "Build",
        sessions: [makeSession({ weekNumber: n, dayIndex: 0, dayName: "Lundi" })],
      })),
    };
    const merged = mergeWindowIntoPlan(plan, windowPlan, 9, 12);
    expect(merged.weeks.map((w) => w.weekNumber)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(merged.weeks.find((w) => w.weekNumber === 9)?.theme).toBe("Local 1");
    expect(merged.weeks.find((w) => w.weekNumber === 8)?.theme).toBe("Semaine 8");
    expect(merged.weeks.find((w) => w.weekNumber === 13)?.theme).toBe("Semaine 13");
    // Le recap global est préservé tel quel (source pour la ré-assignation
    // de phase post-merge via normalizeWeeksAndPhases).
    expect(merged.phases).toEqual(plan.phases);
  });
});
