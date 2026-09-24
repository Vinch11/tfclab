import { describe, it, expect } from "vitest";
import { computeChunkSizing, computeTotalChunks, computeWindowRanges, computeObjectiveAwareWindows, MAX_CHUNKS_PER_WINDOW } from "../useAITrainingPlan";
import { buildWindowRegenConfig } from "@/engines/plan/planWindowRegen";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import type { RaceGoal } from "../useAITrainingPlan";

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

// Régression réelle constatée sur le plan de Manu (audit coach, "Ironman +
// Marathon Valence" 39 sem) : trop peu de séances course à pied pour préparer
// le marathon, et la semaine avant le marathon (S21) contenait des intervalles
// seuil + une sortie longue au lieu d'un taper. Root cause : `computeWindowRanges`
// découpait le plan en fenêtres de taille égale (15/15/9 sem) SANS tenir
// compte des objectifs — la fenêtre S16-S30 contenait le marathon (S22) en
// plein milieu, et `buildWindowRegenConfig` (sans notion de cycle) calculait
// sa phase dominante relativement au plan ENTIER (39 sem) vers l'objectif
// FINAL (Ironman) : S22/39 ≈ 56% → "build", jamais "taper". Résultat : la
// course intermédiaire recevait un catalogue de séances "build" au lieu de
// "taper", contredisant directement `computeMultiObjectiveSegments`
// (promptHelpers.ts) qui gère ce cas correctement pour la génération
// non-fenêtrée. `computeObjectiveAwareWindows` corrige ça en interdisant à
// toute fenêtre de chevaucher deux cycles d'objectifs.
describe("computeObjectiveAwareWindows — plan multi-objectifs (Manu-like : Marathon S22 + Ironman S39)", () => {
  const PLAN_START = "2026-01-05"; // lundi
  const addDaysIso = (iso: string, days: number): string => {
    const [y, m, d] = iso.split("-").map(Number);
    const utc = Date.UTC(y, m - 1, d) + days * 24 * 3600 * 1000;
    const dt = new Date(utc);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  };
  // 21*7=147 jours après le début → tombe en S22 (floor(147/7)+1=22).
  const MARATHON_DATE = addDaysIso(PLAN_START, 147);
  // 38*7=266 jours après le début → tombe en S39 (floor(266/7)+1=39).
  const IRONMAN_DATE = addDaysIso(PLAN_START, 266);

  const raceGoals: RaceGoal[] = [
    { objective: "Marathon", raceDate: MARATHON_DATE, priority: "B" },
    { objective: "Ironman", raceDate: IRONMAN_DATE, priority: "A" },
  ];

  it("aucune fenêtre ne chevauche la frontière entre le cycle Marathon (S1-S22) et le cycle Ironman (S25-S39)", () => {
    const { chunkSize } = computeChunkSizing("Ironman", 39);
    const windows = computeObjectiveAwareWindows(39, chunkSize, raceGoals, PLAN_START);

    for (const w of windows) {
      if (w.cycle) {
        expect(w.from).toBeGreaterThanOrEqual(w.cycle.startWeek);
        expect(w.to).toBeLessThanOrEqual(w.cycle.endWeek);
      }
    }
    // Couverture complète, sans trou ni chevauchement.
    const covered = new Set<number>();
    for (const w of windows) {
      for (let wk = w.from; wk <= w.to; wk++) {
        expect(covered.has(wk)).toBe(false);
        covered.add(wk);
      }
    }
    expect(covered.size).toBe(39);
  });

  it("la semaine du marathon (S22) est dans une fenêtre taguée cycle Marathon, pas dans une fenêtre neutre de 15 semaines", () => {
    const { chunkSize } = computeChunkSizing("Ironman", 39);
    const windows = computeObjectiveAwareWindows(39, chunkSize, raceGoals, PLAN_START);
    const windowWithMarathonWeek = windows.find((w) => w.from <= 22 && 22 <= w.to);
    expect(windowWithMarathonWeek?.cycle).toEqual({ objective: "Marathon", startWeek: 1, endWeek: 22 });
  });

  it("sans le fix (découpage à plat, ignorant les cycles) : la fenêtre contenant S22 s'étendrait jusqu'à S30, en plein cycle Ironman", () => {
    const { chunkSize } = computeChunkSizing("Ironman", 39);
    const flatWindows = computeWindowRanges(39, chunkSize);
    const flatWindowWithMarathonWeek = flatWindows.find((w) => w.from <= 22 && 22 <= w.to);
    expect(flatWindowWithMarathonWeek).toEqual({ from: 16, to: 30 });
  });

  it("plan mono-objectif (ou raceGoals absent) : comportement inchangé, identique à computeWindowRanges", () => {
    const { chunkSize } = computeChunkSizing("Ironman", 39);
    const flat = computeWindowRanges(39, chunkSize);
    const objectiveAwareNoGoals = computeObjectiveAwareWindows(39, chunkSize, undefined, PLAN_START);
    const objectiveAwareSingleGoal = computeObjectiveAwareWindows(39, chunkSize, [raceGoals[1]], PLAN_START);
    expect(objectiveAwareNoGoals).toEqual(flat);
    expect(objectiveAwareSingleGoal).toEqual(flat);
  });

  it("la dernière semaine locale (S22, jour du marathon) est reconnue 'taper' via le cycle, alors que sans cycle elle serait vue 'build' en plein plan Ironman", () => {
    const currentPlan: ParsedPlan = {
      title: "Plan",
      phases: [],
      totalWeeks: 39,
      weeks: Array.from({ length: 15 }, (_, i) => ({
        weekNumber: i + 1,
        theme: "Fenêtre 1",
        phase: "build",
        sessions: [],
      })),
    };

    const withCycle = buildWindowRegenConfig({
      fromWeek: 16,
      toWeek: 22,
      currentPlan,
      athleteData: {},
      baseConfig: { objective: "Ironman", weeksAvailable: 39, raceGoals, planStartDate: PLAN_START },
      cycle: { objective: "Marathon", startWeek: 1, endWeek: 22 },
    });
    // Sem locale 7 = S22 = dernière semaine du cycle Marathon (22/22 = 100%) → taper.
    expect(withCycle.config.constraints).toMatch(/Sem locale 7 \(=.*\) : phase "taper"/);
    // Sans le fix, "peak" (majorité des semaines de la fenêtre proches du pic)
    // reste le vote dominant côté catalogue — mais JAMAIS "build" : la fenêtre
    // approche bien un pic de forme, contrairement au calcul plein-plan ci-dessous.
    expect(withCycle.config.windowRegenPhase).not.toBe("build");

    // Même fenêtre, mais sans le contexte de cycle (comportement pré-fix) :
    // S22 sur un plan Ironman de 39 semaines ≈ 56% → "build", jamais "taper",
    // parce que le calcul ignore totalement l'existence du marathon en S22.
    const withoutCycle = buildWindowRegenConfig({
      fromWeek: 16,
      toWeek: 22,
      currentPlan,
      athleteData: {},
      baseConfig: { objective: "Ironman", weeksAvailable: 39, raceGoals, planStartDate: PLAN_START },
    });
    expect(withoutCycle.config.constraints).toMatch(/Sem locale 7 \(= S22 globale\) : phase "build"/);
    expect(withoutCycle.config.windowRegenPhase).toBe("build");
  });
});
