import { describe, it, expect } from "vitest";
import { nolioStructureForSession, structureFromSessionText } from "../nolioSessionStructure";

describe("structure Nolio depuis le texte du plan", () => {
  it("découpe échauffement / corps / retour au calme", () => {
    const p = structureFromSessionText("Warm-up: 15' Z1–Z2 | Main: 5x6' Z4a (seuil) r=1' trot | Cool-down: 10' Z1");
    expect(p?.map(x => x.part)).toEqual(["Warm-up", "Main", "Cool-down"]);
    expect(p?.[1].zones).toEqual(["Z4A"]);
  });
  it("résout la tranche avant l'envoi : 10' + 20–70 min + 5' sur 35 min → 20 min", () => {
    const p = nolioStructureForSession({ details: "Warm-up: 10 min Z1–Z2 | Main: 20–70 min Z2 | Cool-down: 5 min Z1", durationMin: 35, sport: "run" });
    expect(p?.[1].text).toContain("20 min");
  });
  it("ignore une fiche catalogue qui garde une tranche", () => {
    expect(nolioStructureForSession({ details: "Footing Z1", durationMin: 30 }, [{ part: "Main", text: "45–70' Z2", zones: ["Z2"] }])).toBeNull();
  });
  it("aucune structure pour un repos", () => {
    expect(nolioStructureForSession({ details: "Main: 30' Z2", isRest: true })).toBeNull();
  });
});
