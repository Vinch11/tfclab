import { describe, it, expect } from "vitest";
import { buildPlanTimeline, classifySession } from "../planTimeline";
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";

const s = (p: Partial<ParsedSession>): ParsedSession => ({ weekNumber: 1, weekTheme: "", phase: "Base", dayName: "Lundi", dayIndex: 0, sport: "run", title: "", details: "", isRest: false, ...p });

describe("planTimeline", () => {
  it("classe par zones avant le texte", () => {
    expect(classifySession(s({ zones: ["Z5"], title: "Footing" }))).toBe("severe");
    expect(classifySession(s({ title: "Seuil 3x10" }))).toBe("heavy");
    expect(classifySession(s({ title: "???" }))).toBe("unclassified");
  });
  it("n'invente pas de durée et détecte une semaine allégée de -25 %", () => {
    const wk = (n: number, d: number) => ({ weekNumber: n, theme: "", phase: "Build", sessions: [s({ title: "Endurance", durationMin: d })] });
    const plan = { title: "t", phases: [], totalWeeks: 4, weeks: [wk(1, 600), wk(2, 600), wk(3, 600), wk(4, 400)] } as unknown as ParsedPlan;
    const t = buildPlanTimeline(plan);
    expect(t[3].isRecovery).toBe(true);
    expect(t[0].isRecovery).toBe(false);
    const empty = buildPlanTimeline({ ...plan, weeks: [{ weekNumber: 1, theme: "", phase: "B", sessions: [s({ title: "Seuil" })] }] } as ParsedPlan);
    expect(empty[0].volumeMin).toBeNull();
  });
});
