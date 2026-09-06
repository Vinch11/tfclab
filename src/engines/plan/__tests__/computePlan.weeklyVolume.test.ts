import { describe, it, expect } from "vitest";
import { postProcessParsedPlan } from "../computePlan";
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";
import type { PlanGenerationConfig } from "../types";

/**
 * Bug réel corrigé (audit "dashboard/plan/export", passe 6). postProcessParsedPlan
 * calculait computedVolumeMin/computedVolumeStr DEUX FOIS de suite avec deux
 * algorithmes différents : le premier sommait toutes les durées explicites du
 * texte (parseSessionDurationMin), le second (computeWeekVolumeMin — lookup
 * catalogue puis fallback par sport, prend la durée la PLUS LONGUE trouvée, pas
 * la somme) écrasait INCONDITIONNELLEMENT le résultat du premier pour chaque
 * semaine. Le premier calcul était donc mort — son résultat n'était jamais lu.
 * Ce test verrouille le fait que le volume hebdo affiché suit bien le second
 * algorithme (max), pas le premier (somme), qui a été supprimé.
 */

function makeSession(over: Partial<ParsedSession>): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Base",
    phase: "base",
    dayName: "Mardi",
    dayIndex: 1,
    sport: "Vélo",
    title: "Sortie",
    details: "",
    isRest: false,
    ...over,
  };
}

function makePlan(session: ParsedSession): ParsedPlan {
  return {
    title: "Plan Test",
    phases: [],
    totalWeeks: 1,
    weeks: [
      {
        weekNumber: 1,
        theme: "Semaine 1",
        phase: "base",
        sessions: [session],
      },
    ],
  };
}

const baseConfig: PlanGenerationConfig = {
  objective: "70.3",
  weeksAvailable: 1,
  mode: "ai",
  ambition: "sub",
};

describe("postProcessParsedPlan — computedVolumeMin suit l'algorithme 'durée max' (computeWeekVolumeMin), pas 'somme des durées' (mort)", () => {
  it("un texte avec deux mentions de durée (90min et 60min) donne un volume de 90min (max), pas 150min (somme)", () => {
    const session = makeSession({
      details: "Sortie 90min. Version courte alternative 60min si fatigue.",
    });
    const { plan } = postProcessParsedPlan(makePlan(session), baseConfig, undefined);
    expect(plan.weeks[0].computedVolumeMin).toBe(90);
  });

  it("un texte sans durée extractible retombe sur le fallback par sport (vélo → 90min), pas sur 0", () => {
    const session = makeSession({ sport: "Vélo", title: "Endurance", details: "Rouler tranquillement en Z2." });
    const { plan } = postProcessParsedPlan(makePlan(session), baseConfig, undefined);
    expect(plan.weeks[0].computedVolumeMin).toBe(90);
  });
});
