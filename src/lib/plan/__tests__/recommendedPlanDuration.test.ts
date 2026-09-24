import { describe, it, expect } from "vitest";
import { evaluateDurationCoherence, evaluateDurationCoherenceMultiObjective } from "../recommendedPlanDuration";
import type { ClassifiableRaceGoal } from "../multiObjectiveClassification";

describe("evaluateDurationCoherence", () => {
  it("Ironman en 4 semaines → too_short (sous le plancher)", () => {
    const r = evaluateDurationCoherence(4, "Ironman", "age_group");
    expect(r.coherence).toBe("too_short");
    expect(r.message).toMatch(/court/);
  });

  it("Ironman Elite en 16 semaines → short_for_ambition (au-dessus du plancher mais sous la fenêtre idéale pour ambition élevée)", () => {
    const r = evaluateDurationCoherence(16, "Ironman", "elite");
    expect(r.coherence).toBe("short_for_ambition");
  });

  it("Ironman Age Group en 16 semaines → ok (fenêtre idéale sans exigence d'ambition élevée)", () => {
    const r = evaluateDurationCoherence(16, "Ironman", "age_group");
    expect(r.coherence).toBe("ok");
  });

  it("5K Finisher en 30 semaines → long", () => {
    const r = evaluateDurationCoherence(30, "5K", "finisher");
    expect(r.coherence).toBe("long");
  });

  it("70.3 en 14 semaines, ambition competitor → ok", () => {
    const r = evaluateDurationCoherence(14, "Ironman 70.3", "competitor");
    expect(r.coherence).toBe("ok");
  });

  it("Objectif inconnu → toujours ok, range null (pas de faux avertissement)", () => {
    const r = evaluateDurationCoherence(2, "Objectif Inconnu XYZ", "elite");
    expect(r.coherence).toBe("ok");
    expect(r.range).toBeNull();
  });

  it("Durée invalide (0 ou NaN) → ok, range null", () => {
    expect(evaluateDurationCoherence(0, "Marathon", "elite").coherence).toBe("ok");
    expect(evaluateDurationCoherence(NaN, "Marathon", "elite").coherence).toBe("ok");
  });
});

describe("evaluateDurationCoherenceMultiObjective", () => {
  // Plan Manu (audit coach) : Marathon S1-S20 (18/05/2026) puis Ironman S21-S40
  // (05/10/2026) depuis un départ le 05/01/2026 — chaque macrocycle fait 20
  // semaines, dans la fourchette de SON objectif, mais 40 semaines dépasse
  // 28×1.4=39.2 pour un IM pris seul (faux positif avant ce fix).
  const planStartDate = "2026-01-05";
  const marathonThenIM: ClassifiableRaceGoal[] = [
    { objective: "IM", raceDate: "2026-10-05", priority: "A" },
    { objective: "Marathon", raceDate: "2026-05-18", priority: "B" },
  ];

  it("Marathon (S1-S20) puis Ironman (S21-S40), 40 sem total → ok (pas de faux 'trop long')", () => {
    const naive = evaluateDurationCoherence(40, "IM", "competitor");
    expect(naive.coherence).toBe("long"); // confirme le faux positif du chemin non segmenté

    const r = evaluateDurationCoherenceMultiObjective(40, marathonThenIM, planStartDate, "competitor");
    expect(r.coherence).toBe("ok");
  });

  it("Un seul objectif daté (pas de 2e pic complet) → identique à evaluateDurationCoherence", () => {
    const single: ClassifiableRaceGoal[] = [{ objective: "IM", raceDate: "2026-10-05", priority: "A" }];
    const r = evaluateDurationCoherenceMultiObjective(40, single, planStartDate, "competitor");
    expect(r.coherence).toBe("long");
    expect(r).toEqual(evaluateDurationCoherence(40, "IM", "competitor"));
  });

  it("Segment le plus défavorable gagne : Marathon trop court (7 sem) même si l'IM qui suit est correct", () => {
    // Marathon en semaine 7 (< minViable 10) le 16/02/2026, puis IM le 05/10/2026 (gap de 33 sem, largement > 8 sem requis).
    const goals: ClassifiableRaceGoal[] = [
      { objective: "IM", raceDate: "2026-10-05", priority: "A" },
      { objective: "Marathon", raceDate: "2026-02-16", priority: "B" },
    ];
    const r = evaluateDurationCoherenceMultiObjective(40, goals, planStartDate, "competitor");
    expect(r.coherence).toBe("too_short");
    expect(r.message).toMatch(/Marathon/);
  });

  it("raceGoals vide → ok, range null (pas de crash sans date)", () => {
    const r = evaluateDurationCoherenceMultiObjective(40, [], planStartDate, "competitor");
    expect(r.coherence).toBe("ok");
    expect(r.range).toBeNull();
  });
});
