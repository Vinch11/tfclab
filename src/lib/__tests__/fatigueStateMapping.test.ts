import { describe, it, expect } from "vitest";
import { fatigueStateToAvailability } from "../fatigueStateMapping";

/**
 * Source unique pour dériver une AvailabilityRun depuis fatigue_state —
 * remplace deux tables ad hoc (RunningGuidancePage, RunningProfilePage) qui
 * donnaient des échelles différentes, et pour fatigue_level un SENS opposé
 * (l'une "plus haut = plus frais", l'autre "plus haut = plus fatigué") pour
 * le même nom de champ.
 */

describe("fatigueStateToAvailability", () => {
  it("fatigue_level croît de façon monotone avec l'état réel (fresh < ok < fatigued < high < injured)", () => {
    const scores = ["fresh", "ok", "fatigued", "high", "injured"].map(
      (s) => fatigueStateToAvailability(s).fatigue_level,
    );
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
  });

  it("pain_flag n'est vrai que pour 'injured'", () => {
    expect(fatigueStateToAvailability("injured").pain_flag).toBe(true);
    for (const s of ["fresh", "ok", "fatigued", "high"]) {
      expect(fatigueStateToAvailability(s).pain_flag).toBe(false);
    }
  });

  it("état null/inconnu retombe sur des valeurs neutres ('ok'), jamais une valeur alarmiste inventée", () => {
    expect(fatigueStateToAvailability(null)).toEqual(fatigueStateToAvailability("ok"));
    expect(fatigueStateToAvailability("unknown-state")).toEqual(fatigueStateToAvailability("ok"));
  });

  it("sleep_quality et motivation décroissent quand l'état se dégrade (plus haut = mieux)", () => {
    const fresh = fatigueStateToAvailability("fresh");
    const injured = fatigueStateToAvailability("injured");
    expect(fresh.sleep_quality).toBeGreaterThan(injured.sleep_quality);
    expect(fresh.motivation).toBeGreaterThan(injured.motivation);
  });
});
