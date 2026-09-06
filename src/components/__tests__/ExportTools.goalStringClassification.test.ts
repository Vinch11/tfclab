import { describe, it, expect } from "vitest";
import {
  determineSportFocusForLimiter,
  determineNutritionV2Sport,
  formatMinutesToTime,
  RACE_OBJECTIVE_MAP_E,
  RACE_DURATION_MIN_E,
  RACE_DURATION_HOURS_E,
} from "../ExportTools";

/**
 * Bug réel corrigé (audit "dashboard/plan/export", passe 6). Plusieurs listes
 * de classification d'objectif dans ExportTools.tsx utilisaient des valeurs
 * Trail obsolètes ("Trail", "TrailLong", "TrailCourt") jamais produites par
 * l'UI actuelle (AthleteEditPage.tsx / AthleteObjectiveManager.tsx utilisent
 * "TrailShort"/"TrailMountain"/"TrailUltra" depuis le renommage), et la table
 * de correspondance objectif/durée du 70.3 n'avait que "70.3" alors que la
 * vraie valeur produite par l'UI est "703" (sans point).
 */

describe("determineSportFocusForLimiter — objectifs Trail réels traités comme 'run', pas 'bike'", () => {
  it.each(["TrailShort", "TrailMountain", "TrailUltra"])(
    "'%s' (valeur réelle de l'UI) → 'run'",
    (goal) => {
      expect(determineSportFocusForLimiter(goal)).toBe("run");
    }
  );

  it("un objectif 70.3 ('703', valeur réelle) → 'tri', pas 'bike'", () => {
    expect(determineSportFocusForLimiter("703")).toBe("tri");
  });

  it("un objectif Ironman → 'tri'", () => {
    expect(determineSportFocusForLimiter("IM")).toBe("tri");
  });

  it("un objectif vélo pur (non listé) → 'bike'", () => {
    expect(determineSportFocusForLimiter("Sprint-Bike-Only")).toBe("bike");
  });
});

describe("determineNutritionV2Sport — objectifs Trail réels traités comme 'cap', pas 'velo'", () => {
  it.each(["TrailShort", "TrailMountain", "TrailUltra"])(
    "'%s' (valeur réelle de l'UI) → 'cap'",
    (goal) => {
      expect(determineNutritionV2Sport(goal)).toBe("cap");
    }
  );

  it("un objectif 70.3 ('703', valeur réelle) → 'triathlon'", () => {
    expect(determineNutritionV2Sport("703")).toBe("triathlon");
  });

  it("un objectif vélo pur (non listé) → 'velo'", () => {
    expect(determineNutritionV2Sport("Sprint-Bike-Only")).toBe("velo");
  });
});

describe("RACE_OBJECTIVE_MAP_E / RACE_DURATION_MIN_E / RACE_DURATION_HOURS_E — '703' résolu comme '70.3', pas comme fallback Marathon", () => {
  it("RACE_OBJECTIVE_MAP_E['703'] === '70.3' (pas de fallback Marathon)", () => {
    expect(RACE_OBJECTIVE_MAP_E["703"]).toBe("70.3");
  });

  it("RACE_DURATION_MIN_E['703'] === 300 (5h), pas le fallback 180 (3h, Marathon)", () => {
    expect(RACE_DURATION_MIN_E["703"]).toBe(300);
  });

  it("RACE_DURATION_HOURS_E['703'] === 5, pas le fallback 3 (Marathon)", () => {
    expect(RACE_DURATION_HOURS_E["703"]).toBe(5);
  });
});

describe("formatMinutesToTime — plus de débordement de minutes non reporté sur les heures", () => {
  it("119.6 min → '2h00', pas '1h60'", () => {
    expect(formatMinutesToTime(119.6)).toBe("2h00");
  });

  it("179.7 min → '3h00', pas '2h60'", () => {
    expect(formatMinutesToTime(179.7)).toBe("3h00");
  });

  it("non-régression : 125 min → '2h05'", () => {
    expect(formatMinutesToTime(125)).toBe("2h05");
  });

  it("non-régression : 45 min (< 1h) → '45min'", () => {
    expect(formatMinutesToTime(45)).toBe("45min");
  });
});
