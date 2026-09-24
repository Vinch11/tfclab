import { describe, it, expect } from "vitest";
import { normalizeWeeksAndPhases, INCOMPLETE_PHASE_LABEL, type PhaseNormalizable } from "../normalizeWeeksPhases";

function makeWeek(weekNumber: number, phase = "?"): PhaseNormalizable["weeks"][number] {
  return {
    weekNumber,
    phase,
    theme: "",
    sessions: [{ phase }],
  };
}

describe("normalizeWeeksAndPhases", () => {
  it("réassigne week.phase et session.phase depuis un récap complet", () => {
    const plan: PhaseNormalizable = {
      weeks: [makeWeek(1, "?"), makeWeek(2, "?"), makeWeek(3, "?")],
      phases: [{ name: "Bloc unique", weeks: "S1-S3", objective: "Base", volume: "6h" }],
      totalWeeks: 3,
    };
    const stats = normalizeWeeksAndPhases(plan, { weeksAvailable: 3 });
    expect(plan.weeks.every(w => w.phase === "Bloc unique")).toBe(true);
    expect(plan.weeks.every(w => w.sessions[0].phase === "Bloc unique")).toBe(true);
    expect(stats.incompletePhaseWeeks).toEqual([]);
  });

  it("drop les semaines fantômes au-delà de totalWeeksExpected", () => {
    const plan: PhaseNormalizable = {
      weeks: [makeWeek(1), makeWeek(2), makeWeek(17)],
      phases: [{ name: "Spécifique", weeks: "S1-S2", objective: "X" }],
      totalWeeks: 2,
    };
    const stats = normalizeWeeksAndPhases(plan, { weeksAvailable: 2 });
    expect(stats.droppedGhostWeeks).toEqual([17]);
    expect(plan.weeks.map(w => w.weekNumber)).toEqual([1, 2]);
  });

  // Audit coach (plan Manu 40 sem, Ironman 27/06 + Marathon 27/02) : un récap
  // `plan.phases` qui s'arrête avant `totalWeeks` (chunk de génération
  // manquant/tronqué) ne doit JAMAIS faire hériter aux semaines restantes le
  // nom ET le contenu du dernier bloc réel — ça masquait silencieusement la
  // perte de contenu (ex: "Bloc 8 · Durabilité IM" dupliqué sur S29-S32 ET
  // S33-S40, avec la même durée/volume recopiés).
  describe("récap de phases incomplet (dernier bloc ne couvre pas totalWeeks)", () => {
    const plan: PhaseNormalizable = {
      weeks: Array.from({ length: 40 }, (_, i) => makeWeek(i + 1)),
      phases: [
        { name: "Bloc 1 · Fondation", weeks: "S1-S8", objective: "Base aérobie", volume: "8h" },
        { name: "Bloc 8 · Durabilité IM", weeks: "S29-S32", objective: "Répétition d'efforts longs", volume: "14h" },
      ],
      totalWeeks: 40,
    };
    const stats = normalizeWeeksAndPhases(plan, { weeksAvailable: 40 });

    it("signale les semaines non couvertes dans incompletePhaseWeeks", () => {
      expect(stats.incompletePhaseWeeks).toEqual(
        Array.from({ length: 8 }, (_, i) => 33 + i), // S33-S40
      );
    });

    it("n'attribue PAS le nom du dernier bloc réel aux semaines manquantes", () => {
      const week33 = plan.weeks.find(w => w.weekNumber === 33)!;
      const week40 = plan.weeks.find(w => w.weekNumber === 40)!;
      expect(week33.phase).toBe(INCOMPLETE_PHASE_LABEL);
      expect(week40.phase).toBe(INCOMPLETE_PHASE_LABEL);
      expect(week33.phase).not.toBe("Bloc 8 · Durabilité IM");
    });

    it("le dernier bloc réel (S29-S32) garde son propre contenu, non dupliqué", () => {
      const week30 = plan.weeks.find(w => w.weekNumber === 30)!;
      expect(week30.phase).toBe("Bloc 8 · Durabilité IM");
    });

    it("le bloc synthétique dans plan.phases n'hérite d'aucun objective/volume", () => {
      const incompleteEntry = plan.phases!.find(p => p.name === INCOMPLETE_PHASE_LABEL);
      expect(incompleteEntry).toBeDefined();
      expect(incompleteEntry!.weeks).toBe("S33-S40");
      expect(incompleteEntry!.objective).toBeUndefined();
      expect(incompleteEntry!.volume).toBeUndefined();
    });
  });

  it("fallback Lorang (aucun récap exploitable) couvre totalWeeks sans déclencher le signal d'incomplétude", () => {
    const plan: PhaseNormalizable = {
      weeks: Array.from({ length: 12 }, (_, i) => makeWeek(i + 1)),
      phases: [],
      totalWeeks: 12,
    };
    const stats = normalizeWeeksAndPhases(plan, { weeksAvailable: 12 });
    expect(stats.incompletePhaseWeeks).toEqual([]);
    expect(plan.weeks.every(w => w.phase.length > 0)).toBe(true);
  });
});
