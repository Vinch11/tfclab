import { describe, it, expect } from "vitest";
import { TRI_RUN_ZONE_PATTERN } from "../computePlan";

const fix = (t: string) => t.replace(TRI_RUN_ZONE_PATTERN, (_m, leg: string) => `${leg} à l'allure CAP cible Ironman`);

describe("jour de course Ironman : le marathon n'est jamais prescrit en Z4", () => {
  it("retire « Marathon en Z4a » du texte réel d'Emanuela", () => {
    const out = fix("puis 42.195km Marathon en Z4a régulière et gestion du pacing négatif.");
    expect(out).not.toMatch(/Z4/);
    expect(out).toContain("allure CAP cible Ironman");
  });
  it("ne touche pas la natation ou le vélo", () => {
    expect(fix("3.8km Natation gérée en Z2-Z3")).toBe("3.8km Natation gérée en Z2-Z3");
  });
});
