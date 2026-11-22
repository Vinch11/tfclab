import { describe, expect, it } from "vitest";
import { labReference } from "../labReference";
import { labProfile } from "../labProfile";
import type { CoachingCompassInput } from "@/lib/coachingCompass/types";
import type { DbSnapshot } from "@/hooks/useCloudData";

const input = (over: Partial<CoachingCompassInput> = {}) => ({ objectif: "10K", ambition: "competitor", athleteAge: 46, athleteSex: "F", ...over }) as CoachingCompassInput;
const fmt = (n: number) => String(n);

describe("repère affiché sur la page 100%lab", () => {
  it("VMA, VO₂max et seuil vélo : l'idéal sourcé, avec son niveau de preuve", () => {
    const r = labReference({ key: "vma", target: 18.5, unit: "km/h" }, input(), "run", fmt)!;
    expect(r.kind).toBe("ideal");
    expect(r.label).toBe("Idéal (dérivé)");
    expect(r.tier).toBe("derived");
    expect(r.display).toMatch(/^\d+[,.]?\d*–\d+[,.]?\d* km\/h$/);
    expect(r.basis).toBeTruthy();
    expect(r.adjustment).toMatch(/femme, 46 ans/);
  });

  it("même idéal que le Dashboard pour le même athlète (même objectif, ambition, âge, sexe)", () => {
    const lab = labReference({ key: "vo2max", target: 59.5, unit: "ml/kg/min" }, input(), "run", fmt)!;
    const sameWithoutProfile = labReference({ key: "vo2max", target: 59.5, unit: "ml/kg/min" }, input({ athleteAge: null, athleteSex: null }), "run", fmt)!;
    expect(lab.value).toBeLessThan(sameWithoutProfile.value); // femme de 46 ans : idéal plus bas
    expect(sameWithoutProfile.adjustment).toMatch(/non ajusté/);
  });

  it("autres facteurs : la cible interne TFCL, étiquetée comme telle", () => {
    const r = labReference({ key: "tte", target: 52, unit: "min" }, input(), "run", v => v + " min")!;
    expect(r).toMatchObject({ kind: "coaching", label: "Repère TFCL (cible interne)", value: 52, display: "52 min", tier: null });
  });

  it("sans cible ni idéal : aucun repère", () => {
    expect(labReference({ key: "threshold", target: null, unit: "s/km" }, input(), "run", fmt)).toBeNull();
    expect(labReference({ key: "ftpkg", target: null, unit: "W/kg" }, input({ objectif: "Marathon" }), "bike", fmt)).toBeNull();
  });
});

describe("labProfile", () => {
  const snapshot = { id: "s1", athlete_id: "a1", coach_id: "c", date: "2026-11-12", source: "manual", created_at: "", updated_at: "" } as unknown as DbSnapshot;
  it("transmet l'âge et le sexe de l'athlète, comme le Dashboard", () => {
    const p = labProfile(snapshot, [], "10K", "competitor", { age: 46, sex: "F" });
    expect(p.athleteAge).toBe(46);
    expect(p.athleteSex).toBe("F");
  });
  it("sans profil, rien n'est inventé", () => {
    const p = labProfile(snapshot, [], "10K", "competitor");
    expect(p.athleteAge).toBeNull();
    expect(p.athleteSex).toBeNull();
  });
});
