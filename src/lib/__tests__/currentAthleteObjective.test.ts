import { describe, expect, it } from "vitest";
import { resolveCurrentAthleteObjective } from "../currentAthleteObjective";

describe("resolveCurrentAthleteObjective", () => {
  it("utilise le 10 km actuel de Vince plutôt que le Semi de son ancien snapshot", () => {
    expect(resolveCurrentAthleteObjective("10K", "10K", "Semi")).toBe("10K");
  });

  it("utilise l'objectif du contexte si la ligne base n'est pas encore rechargée", () => {
    expect(resolveCurrentAthleteObjective(null, "10K", "703")).toBe("10K");
  });
});
