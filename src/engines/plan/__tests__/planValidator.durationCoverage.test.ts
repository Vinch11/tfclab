import { describe, it, expect } from "vitest";
import { validatePlan, parseSessionDurationMin } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * GRAND SPRINT P0, Sprint 5 ("charge et prescription réelle"), 2026-10-23.
 *
 * Défaut démontré : `WeekMetrics.totalDurationMin` ne fait QUE sommer les
 * durées parseables (`parseSessionDurationMin`, qui s'abstient honnêtement
 * — retourne `null` — pour un bloc en distance/allure sans jeton min/h
 * explicite). Une séance non calculable contribue donc 0 SILENCIEUSEMENT :
 * sur une semaine où la plupart des séances ne sont pas calculables,
 * `totalDurationMin` peut afficher une fraction minime du volume réellement
 * prescrit (cas démontré : 235min réellement prescrites lues comme 55min).
 *
 * Cette suite verrouille : 1) la nouvelle règle `duration_not_calculable`
 * (severity "info", visibilité explicite de l'incertitude) ; 2) l'abstention
 * des contrôles basés sur le volume (taper, milestone, charge hebdo,
 * consolidation) quand la couverture est insuffisante, plutôt qu'un verdict
 * fondé sur un total sous-compté ; 3) le correctif du bug de parsing
 * décimal ("49.5min" lu comme "5min").
 */

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "Test", phase: "build", dayName: "Lundi", dayIndex: 0,
    sport: "Course", title: "Séance", details: "", isRest: false, ...overrides,
  };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan Test", phases: [], weeks, totalWeeks: weeks.length } as ParsedPlan;
}

describe("parseSessionDurationMin — correctif du parsing décimal (Sprint 5)", () => {
  it("lit '49.5min' comme ~50min, pas '5min' (le point décimal ne doit plus casser le match)", () => {
    const result = parseSessionDurationMin(
      { ...makeSession(), title: "Endurance", details: "49.5min Z2" },
    );
    expect(result).toBe(50);
  });

  it("lit '31,5 min' (virgule décimale) correctement", () => {
    const result = parseSessionDurationMin(
      { ...makeSession(), title: "Endurance", details: "31,5 min Z2" },
    );
    expect(result).toBe(32);
  });

  it("ne régresse pas sur les durées entières existantes", () => {
    expect(parseSessionDurationMin({ ...makeSession(), details: "45min" })).toBe(45);
    expect(parseSessionDurationMin({ ...makeSession(), details: "1h30" })).toBe(90);
  });
});

describe("validateDurationCoverage — rendre les durées non calculables explicitement identifiables", () => {
  it("[TEST OBLIGATOIRE] une semaine où la majorité des séances ne sont pas calculables est signalée explicitement (severity info)", () => {
    const week: ParsedWeek = {
      weekNumber: 1, theme: "Test", phase: "build",
      sessions: [
        makeSession({ details: "55min continu" }), // parseable
        makeSession({ title: "Fractionné distance", details: "5x1km allure 10K, r=90s" }), // non calculable
        makeSession({ title: "Fractionné distance", details: "3x2km allure semi, r=2min" }), // non calculable
        makeSession({ title: "Fractionné distance", details: "4x800m allure 5K" }), // non calculable
      ],
    };
    const plan = makePlan([week]);
    const result = validatePlan(plan, "Marathon");
    const coverageIssue = result.issues.find(i => i.rule === "duration_not_calculable" && i.week === 1);
    expect(coverageIssue).toBeDefined();
    expect(coverageIssue?.severity).toBe("info");
    expect(coverageIssue?.message).toContain("3/4");
  });

  it("une semaine bien couverte (≥60% des séances calculables) n'est pas signalée", () => {
    const week: ParsedWeek = {
      weekNumber: 1, theme: "Test", phase: "build",
      sessions: [
        makeSession({ details: "45min" }),
        makeSession({ details: "60min" }),
        makeSession({ title: "Fractionné distance", details: "5x1km allure 10K" }), // 1 non calculable sur 3
      ],
    };
    const result = validatePlan(makePlan([week]), "Marathon");
    expect(result.issues.filter(i => i.rule === "duration_not_calculable")).toHaveLength(0);
  });

  it("une issue 'info' n'affecte jamais le score pondéré ni CRITICAL_SCORE_CEILING", () => {
    const week: ParsedWeek = {
      weekNumber: 1, theme: "Test", phase: "build",
      sessions: [
        makeSession({ title: "Fractionné distance", details: "5x1km allure 10K" }),
        makeSession({ title: "Fractionné distance", details: "3x2km allure semi" }),
      ],
    };
    const result = validatePlan(makePlan([week]), "Marathon");
    expect(result.issues.some(i => i.rule === "duration_not_calculable" && i.severity === "error")).toBe(false);
  });
});

describe("Abstention des contrôles de volume quand la couverture de durée est insuffisante (Sprint 5)", () => {
  function sportSessions(sport: string, totalMin: number): Partial<ParsedSession>[] {
    if (totalMin <= 0) return [];
    return [{ sport, title: `${sport} A`, details: `${totalMin}min` }];
  }
  function loadWeek(weekNumber: number, nat: number, velo: number, course: number): ParsedWeek {
    return {
      weekNumber, theme: "Build", phase: "build",
      sessions: [...sportSessions("Natation", nat), ...sportSessions("Vélo", velo), ...sportSessions("Course", course)]
        .map((s, i) => makeSession({ weekNumber, dayIndex: i, dayName: ["Lundi", "Mardi", "Mercredi"][i], ...s })),
    };
  }
  /** Semaine "mal couverte" : la plupart des séances sont des blocs en
   *  distance/allure sans jeton min/h — cas démontré 235min réellement
   *  prescrites lues comme une fraction minime. */
  function poorlyParsedWeek(weekNumber: number): ParsedWeek {
    return {
      weekNumber, theme: "Build", phase: "build",
      sessions: [
        makeSession({ weekNumber, sport: "Course", details: "55min continu", dayName: "Lundi", dayIndex: 0 }),
        makeSession({ weekNumber, sport: "Vélo", title: "Fractionné distance", details: "8x2km allure FTP", dayName: "Mardi", dayIndex: 1 }),
        makeSession({ weekNumber, sport: "Vélo", title: "Fractionné distance", details: "6x3km allure seuil", dayName: "Mercredi", dayIndex: 2 }),
        makeSession({ weekNumber, sport: "Course", title: "Fractionné distance", details: "10x1km allure 10K", dayName: "Jeudi", dayIndex: 3 }),
      ],
    };
  }

  it("validateTaperVolumeReduction s'abstient quand une semaine de référence est mal couverte (pas de faux verdict sur un total sous-compté)", () => {
    const weeks: ParsedWeek[] = [
      loadWeek(1, 60, 240, 90),
      poorlyParsedWeek(2), // référence mal couverte
      loadWeek(3, 62, 245, 92),
      { weekNumber: 4, theme: "Affûtage", phase: "taper", sessions: [makeSession({ weekNumber: 4, details: "20min", dayName: "Lundi", dayIndex: 0 })] },
    ];
    const plan = makePlan(weeks);
    const result = validatePlan(plan, "Marathon");
    const taperIssues = result.issues.filter(i => i.rule === "progression" && /affûtage/i.test(i.message));
    expect(taperIssues).toHaveLength(0);
  });
});
