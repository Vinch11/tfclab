import { describe, expect, it } from "vitest";
import { combinedLibrary, readLibrary, upsertLibrary, libraryLabel } from "@/lib/raceSimulation/productLibrary";
import { withNutritionProfile } from "@/lib/raceSimulation/raceNutritionProfile";

describe("bibliothèque de produits du coach", () => {
  it("un produit enregistré y entre, le même nom le met à jour (sans doublon, casse ignorée)", () => {
    let lib = upsertLibrary([], { gel: { name: "Maurten Gel 100", carbsG: 25, sodiumMg: 20 } }, "2026-11-26");
    lib = upsertLibrary(lib, { gel: { name: "maurten gel 100 ", carbsG: 25, sodiumMg: 85 }, drink: { name: "PF 30", carbsG: 30, sodiumMg: 0, volumeMl: 500 } }, "2026-11-27");
    expect(lib).toHaveLength(2);
    expect(lib.find(p => p.kind === "gel")).toMatchObject({ sodiumMg: 85, updatedAt: "2026-11-27" });
    expect(libraryLabel(lib.find(p => p.kind === "drink")!)).toBe("PF 30 · 30 g / 500 ml");
  });
  it("ignore les produits incomplets (boisson sans volume, glucides absents)", () => {
    expect(upsertLibrary([], { drink: { name: "Iso", carbsG: 30, sodiumMg: 0 }, bar: null }, "2026-11-26")).toEqual([]);
    expect(readLibrary({ raceProductLibrary: [{ kind: "gel", name: "X" }, { kind: "pizza", name: "Y", carbsG: 10 }] })).toEqual([]);
  });
  it("garde les autres réglages du coach et relit ce qui est rangé", () => {
    const prefs = { userPreferences: { compact: true }, raceProductLibrary: upsertLibrary([], { bar: { name: "Solid 160", carbsG: 40, sodiumMg: 430 } }, "2026-11-26") };
    expect(readLibrary(prefs)).toEqual([{ kind: "bar", name: "Solid 160", carbsG: 40, sodiumMg: 430, updatedAt: "2026-11-26" }]);
  });
  it("les produits déjà dans les fiches des athlètes apparaissent aussi", () => {
    const refs = withNutritionProfile({}, { products: { gel: { name: "Tä Energy Gel", carbsG: 33, sodiumMg: 48 } } });
    const lib = combinedLibrary([], [refs, null, {}]);
    expect(lib).toEqual([{ kind: "gel", name: "Tä Energy Gel", carbsG: 33, sodiumMg: 48, updatedAt: null }]);
    expect(combinedLibrary(lib.map(p => ({ ...p, updatedAt: "2026-11-26" })), [refs])).toHaveLength(1);
  });
});
