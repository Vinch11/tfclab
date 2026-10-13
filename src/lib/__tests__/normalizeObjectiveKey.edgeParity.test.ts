import { describe, it, expect } from "vitest";
import { normalizeObjectiveKey } from "../normalizeObjectiveKey";
import { normalizeObjKey } from "../../../supabase/functions/ai-training-plan/sportRatioMatrix";

/**
 * Test de parité client ↔ edge function (consigne coach : "examine la
 * possibilité de mutualiser la normalisation entre le client et Supabase
 * Edge, sans refonte disproportionnée"). L'edge function (Deno) ne peut pas
 * importer depuis src/ — normalizeObjKey (sportRatioMatrix.ts) reste donc
 * une COPIE manuelle de normalizeObjectiveKey.ts, pas un import partagé. Le
 * bug B-5K-BEGINNER (2026-10-13) est la preuve concrète du risque de cette
 * duplication : le même gap "5 KM" existait identiquement dans les DEUX
 * fichiers, découvert et corrigé dans les deux en même temps.
 *
 * Plutôt qu'une vraie fusion de code (le fichier edge n'a aucun import —
 * Deno runtime distinct — et une fusion forcerait soit un bundling
 * supplémentaire au build, soit un require() Node incompatible avec Deno),
 * ce test exécute les DEUX fonctions côte à côte sur une table commune
 * d'objectifs et échoue au premier retour divergent — garde-fou mécanique
 * contre une future désynchronisation, sans toucher à l'architecture.
 *
 * Deux clés sont *intentionnellement* différentes entre les deux copies
 * (Sprint/Olympic côté client — alignées sur physiologicalTargets.ts — vs
 * TriSprint/TriOlympique côté edge — alignées sur TAPER_WEEKS_BY_OBJECTIVE_
 * SERVER) : testées séparément ci-dessous pour ne pas masquer une VRAIE
 * divergence future sous un faux "c'est normal".
 */
const SHARED_OBJECTIVES = [
  "Ironman", "ironman", "70.3", "IRONMAN 70.3",
  "Marathon", "marathon", "Semi-marathon", "Semi",
  "10K", "10k", "10km", "10 km", "10 KM",
  "5K", "5k", "5km", "5 km", "5 KM", "Premier 5 km dans 12 semaines",
  "Trail", "trail", "Trail court", "Trail Short",
  "Trail montagne", "Trail mountain", "UTMB", "CCC", "OCC",
  "Ultra trail", "Trail ultra", "Ultra",
  "Start to Run", "Start-to-Run", "start",
  "Objectif inconnu xyz",
];

describe("normalizeObjectiveKey (client) ↔ normalizeObjKey (edge) — parité", () => {
  it.each(SHARED_OBJECTIVES)("renvoie la même clé pour '%s'", (objective) => {
    expect(normalizeObjectiveKey(objective)).toBe(normalizeObjKey(objective));
  });

  it("variantes 5K (régression B-5K-BEGINNER) : les deux copies restent synchronisées", () => {
    for (const o of ["5K", "5k", "5km", "5 km", "5 KM"]) {
      expect(normalizeObjectiveKey(o)).toBe("5K");
      expect(normalizeObjKey(o)).toBe("5K");
    }
  });

  it("divergence CONNUE et volontaire — Sprint/Olympic triathlon (clés internes différentes par design)", () => {
    expect(normalizeObjectiveKey("Sprint")).toBe("Sprint");
    expect(normalizeObjKey("Sprint")).toBe("TriSprint");
    expect(normalizeObjectiveKey("Olympique")).toBe("Olympic");
    expect(normalizeObjKey("Olympique")).toBe("TriOlympique");
  });
});
