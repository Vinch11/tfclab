/**
 * Audit "B-5K-BEGINNER round 2" — suite (JSON réel, run post-PR#376) : le
 * réconciliateur a lui-même substitué un fartlek incompatible phase par
 * `LYDIARD_RUN_TRACK_VMA` en semaines 1 et 2 :
 *   [phase_substituted] W1/dimanche ENR_RUN_FARTLEK_SCANDINAVE(build) → LYDIARD_RUN_TRACK_VMA (phase=base)
 *   [phase_substituted] W2/dimanche ENR_RUN_FARTLEK_SCANDINAVE(build) → LYDIARD_RUN_TRACK_VMA (phase=base)
 *
 * Cause racine confirmée : `LYDIARD_RUN_TRACK_VMA.when` = "Build/Peak — phase
 * 3 Lydiard. Après 16-24 semaines de **base** + 4-6 semaines de collines."
 * `parseWhenPhases` matche le mot "base" n'IMPORTE OÙ dans le texte libre —
 * y compris dans une clause de PRÉREQUIS ("après N semaines de base"), pas
 * seulement dans la déclaration d'éligibilité en tête de champ. Comme ce
 * match est "strong", `ficheAllowedPhases` retourne `fromWhen` ENTIÈREMENT
 * (en écrasant le tag structuré `phase:["build","peak"]`, pourtant correct),
 * incluant "base" — alors que la fiche déclare elle-même explicitement
 * `avoid: "...Directement en phase base"`.
 *
 * Convention du catalogue (vérifiée sur ~145 fiches avec "—") : le champ
 * `when` suit systématiquement `<PHASE(S) ÉLIGIBLES> — <prose/prérequis>`.
 * Le correctif ne regarde le texte après "—" QUE si le segment avant "—"
 * (l'en-tête) n'a lui-même produit aucun mot-clé fort — préservant tout
 * comportement existant pour les ~679 fiches sans "—".
 */
import { describe, it, expect } from "vitest";
import { ficheAllowedPhases, parseWhenPhases } from "../phaseNormalization";
import type { LibraryWorkout } from "@/types/workoutLibrary";

function makeFiche(overrides: Partial<LibraryWorkout>): LibraryWorkout {
  return {
    id: "TEST_FICHE", cat: "B", sport: "run", objectif: "Test", necessite: "Recommandé",
    when: "", avoid: "", phase: [], durationMin: [40, 60], metricKey: "pace", sportKey: "run",
    structure: [], variants: {},
    ...overrides,
  } as LibraryWorkout;
}

describe("parseWhenPhases — ne doit pas lire un mot-clé de phase dans une clause de prérequis après '—'", () => {
  it("Lydiard réel : 'Build/Peak — ... Après 16-24 semaines de base ...' → 'base' absent", () => {
    const phases = parseWhenPhases("Build/Peak — phase 3 Lydiard. Après 16-24 semaines de base + 4-6 semaines de collines.");
    expect(phases.has("base")).toBe(false);
    expect(phases.has("build")).toBe(true);
    expect(phases.has("peak")).toBe(true);
  });

  it("ficheAllowedPhases(LYDIARD_RUN_TRACK_VMA réel) exclut 'base' malgré le prérequis dans when", () => {
    const lydiard = makeFiche({
      id: "LYDIARD_RUN_TRACK_VMA",
      when: "Build/Peak — phase 3 Lydiard. Après 16-24 semaines de base + 4-6 semaines de collines.",
      avoid: "Sans base aérobie et collines complètes · Directement en phase base",
      phase: ["build", "peak"],
    });
    const allowed = ficheAllowedPhases(lydiard);
    expect(allowed.has("base")).toBe(false);
    expect([...allowed].sort()).toEqual(["build", "peak"]);
  });

  it("variante similaire : 'Build — phase 2 Lydiard, après 8-16 semaines de base aérobie complète.' → 'base' absent", () => {
    const phases = parseWhenPhases("Build — phase 2 Lydiard, après 8-16 semaines de base aérobie complète. 2x/semaine.");
    expect(phases.has("base")).toBe(false);
    expect(phases.has("build")).toBe(true);
  });

  it("'Build — 1x/semaine. Base du développement aérobie spécifique vélo.' → 'base' absent (faux-sens 'fondement', pas la phase)", () => {
    const phases = parseWhenPhases("Build — 1x/semaine. Base du développement aérobie spécifique vélo.");
    expect(phases.has("base")).toBe(false);
    expect(phases.has("build")).toBe(true);
  });

  it("comportement inchangé : un vrai mot-clé EN TÊTE reste détecté normalement", () => {
    expect(parseWhenPhases("Base — tout le plan.").has("base")).toBe(true);
    expect(parseWhenPhases("Peak — J-2 avant course").has("peak")).toBe(true);
  });

  it("comportement inchangé : champ sans '—' continue de scanner le texte entier", () => {
    // Pas de séparateur "—" → pas de notion d'en-tête, le texte entier est scanné (legacy).
    const phases = parseWhenPhases("Semaine de course, pas de charge, affûtage strict");
    expect(phases.has("taper")).toBe(true);
  });

  it("comportement inchangé : en-tête sans aucun mot-clé → repli sur le texte entier (ex: 'Toute l'année')", () => {
    // Aucun mot-clé de phase dans "Toute l'année" ni dans la prose : ensemble vide, comme avant.
    const phases = parseWhenPhases("Toute l'année — 1-2x/semaine. Idéal J de repos ou après séance légère.");
    expect(phases.size).toBe(0);
  });
});
