import { describe, it, expect } from "vitest";
import { computeChunkSizing, computeTotalChunks, computeWindowRanges, buildAssembledPlanTitle, MAX_CHUNKS_PER_WINDOW } from "../useAITrainingPlan";
import { buildWindowRegenConfig } from "@/engines/plan/planWindowRegen";
import type { ParsedPlan } from "@/lib/aiPlanParser";

// Audit coach (plan Manu 40 sem, Ironman) : jsonPlanHandler.ts accumule tous
// les blocs en mémoire serveur et ne les envoie au navigateur qu'à la toute
// fin — un plan qui dépasse le délai maximal d'exécution du serveur (~400s,
// 8 blocs × ~70s pour Manu) se termine en NO_CHUNKS sans qu'aucun contenu
// déjà généré ne soit récupérable. generatePlanWindowed découpe la
// génération en plusieurs requêtes de ≤MAX_CHUNKS_PER_WINDOW blocs chacune ;
// ces tests verrouillent l'arithmétique pure du découpage.

describe("computeChunkSizing", () => {
  it("Ironman/70.3/triathlon → bloc de 5 semaines, seuil 6", () => {
    expect(computeChunkSizing("Ironman", 40)).toEqual({ chunkSize: 5, chunkThreshold: 6 });
    expect(computeChunkSizing("70.3", 40)).toEqual({ chunkSize: 5, chunkThreshold: 6 });
    expect(computeChunkSizing("IM", 40)).toEqual({ chunkSize: 5, chunkThreshold: 6 });
  });

  it("Trail ultra/mountain (≥12 sem ou explicite) → bloc de 6 semaines, seuil 8", () => {
    expect(computeChunkSizing("TrailUltra", 40)).toEqual({ chunkSize: 6, chunkThreshold: 8 });
    expect(computeChunkSizing("Trail Mont-Blanc", 20)).toEqual({ chunkSize: 6, chunkThreshold: 8 });
  });

  it("Objectif générique (Marathon, 5K...) → bloc de 4 semaines, seuil 6", () => {
    expect(computeChunkSizing("Marathon", 40)).toEqual({ chunkSize: 4, chunkThreshold: 6 });
    expect(computeChunkSizing("5K", 10)).toEqual({ chunkSize: 4, chunkThreshold: 6 });
  });
});

describe("computeTotalChunks", () => {
  it("Ironman 40 sem → 8 blocs (ceil(40/5))", () => {
    expect(computeTotalChunks("Ironman", 40)).toBe(8);
  });

  it("Ironman exactement au seuil (6 sem) → pas de chunking (1 seul bloc)", () => {
    expect(computeTotalChunks("Ironman", 6)).toBe(1);
  });

  it("Ironman juste au-dessus du seuil (7 sem) → 2 blocs", () => {
    expect(computeTotalChunks("Ironman", 7)).toBe(2);
  });
});

describe("computeWindowRanges — plan Manu (Ironman 40 sem, 8 blocs)", () => {
  const { chunkSize } = computeChunkSizing("Ironman", 40);

  it("découpe en 3 fenêtres de ≤3 blocs (15/15/10 semaines)", () => {
    const windows = computeWindowRanges(40, chunkSize, MAX_CHUNKS_PER_WINDOW);
    expect(windows).toEqual([
      { from: 1, to: 15 },
      { from: 16, to: 30 },
      { from: 31, to: 40 },
    ]);
  });

  it("chaque fenêtre reste dans la limite de blocs standards (≤3)", () => {
    const windows = computeWindowRanges(40, chunkSize, MAX_CHUNKS_PER_WINDOW);
    for (const w of windows) {
      const windowWeeks = w.to - w.from + 1;
      expect(Math.ceil(windowWeeks / chunkSize)).toBeLessThanOrEqual(MAX_CHUNKS_PER_WINDOW);
    }
  });

  it("les fenêtres couvrent exactement S1 à S40 sans trou ni chevauchement", () => {
    const windows = computeWindowRanges(40, chunkSize, MAX_CHUNKS_PER_WINDOW);
    const covered = new Set<number>();
    for (const w of windows) {
      for (let wk = w.from; wk <= w.to; wk++) {
        expect(covered.has(wk)).toBe(false); // pas de chevauchement
        covered.add(wk);
      }
    }
    expect(covered.size).toBe(40);
    expect(Math.min(...covered)).toBe(1);
    expect(Math.max(...covered)).toBe(40);
  });

  it("plan exactement divisible (45 sem, 9 blocs) → 3 fenêtres de 3 blocs pile", () => {
    const windows = computeWindowRanges(45, chunkSize, MAX_CHUNKS_PER_WINDOW);
    expect(windows).toEqual([
      { from: 1, to: 15 },
      { from: 16, to: 30 },
      { from: 31, to: 45 },
    ]);
  });

  it("plan assez court (15 sem, 3 blocs pile) → une seule fenêtre couvrant tout", () => {
    const windows = computeWindowRanges(15, chunkSize, MAX_CHUNKS_PER_WINDOW);
    expect(windows).toEqual([{ from: 1, to: 15 }]);
  });
});

// Régression ciblée : generatePlanWindowed doit forcer `totalWeeks` (le VRAI
// total du plan, ex. 40) sur le plan assemblé après chaque fenêtre — jamais
// `windowPlan.totalWeeks` (la taille de LA fenêtre elle-même, ex. 15).
// buildWindowRegenConfig lit `currentPlan.totalWeeks` pour calculer
// `globalTotalWeeks` de la fenêtre SUIVANTE (périodisation/phase) : sans ce
// fix, la fenêtre 2 d'un plan de 40 semaines croirait le plan long de 15
// semaines seulement (la taille de la fenêtre 1), et calculerait une phase
// totalement fausse (ex: "peak"/"taper" au lieu de "build" en plein milieu
// du plan réel).
describe("generatePlanWindowed — propagation de totalWeeks entre fenêtres", () => {
  const makeAssembledAfterWindow1 = (totalWeeks: number): ParsedPlan => ({
    title: "Plan",
    phases: [],
    totalWeeks,
    weeks: Array.from({ length: 15 }, (_, i) => ({
      weekNumber: i + 1,
      theme: "Fenêtre 1",
      phase: "build",
      sessions: [],
    })),
  });

  it("avec le vrai total (40) propagé : la fenêtre 2 (S16-S30) connaît sa vraie position globale", () => {
    const { config } = buildWindowRegenConfig({
      fromWeek: 16,
      toWeek: 30,
      currentPlan: makeAssembledAfterWindow1(40),
      athleteData: {},
      baseConfig: { objective: "Ironman", weeksAvailable: 40 },
    });
    expect(config.globalTotalWeeks).toBe(40);
    expect(config.globalWeekOffset).toBe(15);
  });

  it("sans le fix (totalWeeks de la fenêtre 1 au lieu du vrai total) : globalTotalWeeks serait faux", () => {
    // Reproduit exactement le bug qu'aurait généré `{ ...windowPlan, weeks }`
    // sans le `totalWeeks` explicite (windowPlan.totalWeeks = 15, la taille
    // de la fenêtre 1 elle-même, jamais le vrai total de 40).
    const { config } = buildWindowRegenConfig({
      fromWeek: 16,
      toWeek: 30,
      currentPlan: makeAssembledAfterWindow1(15),
      athleteData: {},
      baseConfig: { objective: "Ironman", weeksAvailable: 40 },
    });
    expect(config.globalTotalWeeks).toBe(15);
  });
});

// Régression réelle constatée sur le plan de Manu (audit coach, plan 40 sem
// multi-objectifs) : le titre affiché était "...15 semaines (Bloc 1)" — celui
// de la FENÊTRE 1 (buildWindowRegenConfig génère un titre scopé "fenêtre"),
// resté figé sur le plan complet assemblé car mergeWindowIntoPlan hérite les
// champs hors `weeks` (title, phases...) de la première fenêtre sans jamais
// les réévaluer pour le plan entier.
describe("buildAssembledPlanTitle", () => {
  it("ne mentionne jamais un nombre de semaines ou un 'Bloc' partiel — reflète le vrai total assemblé", () => {
    const title = buildAssembledPlanTitle("Ironman", undefined, 40);
    expect(title).not.toMatch(/bloc/i);
    expect(title).not.toContain("15 semaines");
    expect(title).toContain("40 semaines");
  });

  it("inclut le nom de course quand fourni", () => {
    const title = buildAssembledPlanTitle("Ironman", "Marathon Valence", 40);
    expect(title).toContain("Marathon Valence");
    expect(title).toContain("40 semaines");
  });
});
