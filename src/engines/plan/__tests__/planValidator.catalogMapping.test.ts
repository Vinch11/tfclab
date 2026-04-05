import { describe, expect, it } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedSession, ParsedWeek } from "@/lib/aiPlanParser";

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Audit mapping catalogue",
    phase: "build",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Vélo",
    title: "V3_BIKE_Z2_ENDURANCE_LONG",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[]): ParsedWeek {
  return {
    weekNumber,
    theme: `Bloc ${weekNumber}`,
    phase: "build",
    sessions: sessions.map((session, index) =>
      makeSession({
        weekNumber,
        dayIndex: index,
        dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][index % 7],
        ...session,
      })
    ),
  };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return {
    title: "Catalog limiter mapping regression",
    phases: [],
    weeks,
    totalWeeks: weeks.length,
  };
}

describe("planValidator catalog-id limiter mapping", () => {
  it("prevents false L1/L2 under-coverage when key sessions are emitted as catalog ids", () => {
    const plan = makePlan([
      makeWeek(1, [
        { sport: "Vélo", title: "TPL_703_BIKE_RACE_PACE_3x20", details: "" },
        { sport: "Course", title: "B_RUN_NORWEGIAN_2x20", details: "" },
        { sport: "Vélo", title: "V3_BIKE_SST_PROGRESSIF", details: "" },
        { sport: "Course", title: "B_RUN_BILLAT_30_30", details: "" },
        { sport: "Vélo", title: "V3_BIKE_Z2_ENDURANCE_LONG", details: "" },
      ]),
      makeWeek(2, [
        { sport: "Vélo", title: "TPL_703_BIKE_RACE_PACE_2x20", details: "" },
        { sport: "Course", title: "B_RUN_DOUBLE_THRESHOLD", details: "" },
        { sport: "Vélo", title: "V3_BIKE_OVER_UNDER_ADV", details: "" },
        { sport: "Course", title: "B_RUN_VMA_5x1000", details: "" },
        { sport: "Vélo", title: "V3_BIKE_TRAIN_LOW_LONG", details: "" },
      ]),
      makeWeek(3, [
        { sport: "Vélo", title: "B_BIKE_THRESHOLD_LONG_CRUISE", details: "" },
        { sport: "Course", title: "B_RUN_TEMPO_LONG", details: "" },
        { sport: "Vélo", title: "B_BIKE_SWEET_SPOT_3x20", details: "" },
        { sport: "Course", title: "B_RUN_VO2_30_30", details: "" },
        { sport: "Vélo", title: "V3_BIKE_Z2_ENDURANCE_LONG", details: "" },
      ]),
    ]);

    const result = validatePlan(plan, undefined, undefined, undefined, undefined, ["tte", "ftp", "vo2max", "vlamax"]);

    expect(result.limiterCoverage.find((item) => item.key === "tte")?.pct).toBeGreaterThanOrEqual(30);
    expect(result.limiterCoverage.find((item) => item.key === "ftp")?.pct).toBeGreaterThanOrEqual(15);
    expect(result.limiterCoverage.find((item) => item.key === "tte")?.status).toBe("ok");
    expect(result.limiterCoverage.find((item) => item.key === "ftp")?.status).toBe("ok");
  });
});