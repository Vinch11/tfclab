import { describe, it, expect } from "vitest";
import { widenEndurancePhases } from "../phaseWidener";
import { ficheAllowedPhases } from "../phaseNormalization";
import type { LibraryWorkout } from "@/types/workoutLibrary";

/**
 * Bug réel corrigé (audit "génération de plan IA", volet composition
 * hebdomadaire — smoking gun #1). `widenEndurancePhases` élargissait
 * correctement `phase[]` à [base, build, peak] pour les fiches
 * endurance/technique, mais mutait AUSSI le champ libre `when` en y
 * ajoutant le mot "Peak" pour "neutraliser" une restriction perçue.
 *
 * Or `ficheAllowedPhases` (phaseNormalization.ts) traite tout `when`
 * contenant "peak" comme un mot-clé FORT et EXCLUSIF : dès qu'il matche, il
 * ignore `phase[]` et ne retient que les phases détectées dans `when`. Pour
 * une fiche dont le `when` d'origine ne contenait aucun mot-clé base/build
 * (ex. "Toute l'année" — le cas réel de A_RUN_Z2_EASY, la toute première
 * fiche de la bibliothèque, "Obligatoire"), le texte injecté produisait
 * `{peak}` seul — l'INVERSE de l'élargissement voulu. 51 fiches
 * d'endurance/technique (tous sports) devenaient indisponibles hors phase
 * Peak, c'est-à-dire indisponibles précisément en base/build — le contenu
 * qui devrait dominer ces phases.
 */
function fixtureWorkout(overrides: Partial<LibraryWorkout> = {}): LibraryWorkout {
  return {
    id: "A_RUN_Z2_EASY",
    cat: "endurance",
    sport: "run",
    objectif: "generic",
    necessite: "Obligatoire",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "",
    durationMin: [30, 90],
    metricKey: "pace",
    sportKey: "run",
    structure: [{ part: "main", text: "Z2 continu", zones: ["Z2"] }],
    variants: {},
    ...overrides,
  } as LibraryWorkout;
}

describe("widenEndurancePhases — ne mute plus le champ when", () => {
  it("élargit phase[] à [base, build, peak] sans toucher when", () => {
    const w = fixtureWorkout();
    widenEndurancePhases([w]);

    expect(w.phase).toEqual(["base", "build", "peak"]);
    expect(w.when).toBe("Toute l'année");
  });

  it("régression : ficheAllowedPhases reconnaît bien base+build+peak après élargissement (pas {peak} seul)", () => {
    const w = fixtureWorkout();
    widenEndurancePhases([w]);

    const allowed = ficheAllowedPhases(w);
    expect(allowed.has("peak")).toBe(true);
    expect(allowed.has("base")).toBe(true);
    expect(allowed.has("build")).toBe(true);
    expect(allowed.size).toBe(3);
  });

  it("preuve du bug historique : si on avait encore muté `when` en y injectant 'Peak', ficheAllowedPhases retomberait à {peak} seul", () => {
    const w = fixtureWorkout();
    // Reproduit l'ancien comportement bogué directement, sans dépendre du code de production.
    w.phase = ["base", "build", "peak"];
    w.when = `${w.when} · Peak (pertinent — pilier endurance/technique)`;

    const allowed = ficheAllowedPhases(w);
    expect(allowed.size).toBe(1);
    expect(allowed.has("peak")).toBe(true);
    expect(allowed.has("base")).toBe(false);
    expect(allowed.has("build")).toBe(false);
  });

  it("préserve taper si déjà présent dans phase[]", () => {
    const w = fixtureWorkout({ phase: ["base"], id: "A_SWIM_AEROBIC" });
    w.phase = ["base", "taper"];
    widenEndurancePhases([w]);
    expect(w.phase).toEqual(["base", "build", "peak", "taper"]);
  });

  it("ignore les fiches hors des familles endurance_fondamentale/technique", () => {
    const w = fixtureWorkout({ id: "B_RUN_SEUIL_TEMPO", structure: [{ part: "main", text: "Seuil tempo", zones: ["Z4"] }] });
    const originalPhase = [...(w.phase ?? [])];
    widenEndurancePhases([w]);
    expect(w.phase).toEqual(originalPhase);
    expect(w.when).toBe("Toute l'année");
  });
});
