/**
 * Audit "B-5K-BEGINNER round 2" (JSON réel, plan 12 semaines) : `week.phase`
 * arrive côté client déjà réécrit en libellé humain (ex "Phase 1 — Adaptation
 * & Socle Aérobie", confirmé sur l'export réel) dès qu'une passe amont
 * (`normalizeWeeksAndPhases`) a déjà tourné sur les chunks — la passe
 * phase/durée/discipline du réconciliateur (`runOnePass` et ses filets
 * `dedupeWithinWeek`/`dedupeFastedWithinWeek`/`neighborRemapPass`) ne doit
 * alors PAS caster ce texte en `PlanPhase` ni le reparser : elle doit
 * recalculer la phase CATALOGUE numériquement depuis la position réelle de
 * la semaine (`globalTotalWeeks`/`globalWeekOffset`), exactement comme B11
 * (cf. checksB10B11.test — `canonicalWeekPhase`). Reproduit ici le cas
 * concret : une fiche VMA type Lydiard (phase build/peak uniquement, "Éviter
 * directement en phase base") placée en semaine 1 d'un plan 12 semaines —
 * numériquement "base" (pct=1/12≈8% ≤30%) quel que soit le texte de
 * `week.phase`.
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk, PlanSession } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    // Mirroir simplifié de LYDIARD_RUN_TRACK_VMA (workoutLibrary.ts) : VMA
    // piste, phase build/peak uniquement, explicitement déconseillée en base.
    {
      id: "LYDIARD_RUN_TRACK_VMA",
      cat: "B", sport: "run", objectif: "VMA piste Lydiard", necessite: "Recommandé",
      when: "Build/Peak — phase 3 Lydiard.", phase: ["build", "peak"],
      avoid: "Sans base aérobie et côtes complètes · Directement en phase base",
      durationMin: [45, 60], metricKey: "pace", sportKey: "run",
      structure: [
        { part: "Warm-up", text: "15' Z1", zones: ["Z1"] },
        { part: "Main", text: "10x400m Z5/Z6", zones: ["Z5", "Z6"] },
        { part: "Cool-down", text: "10' Z1", zones: ["Z1"] },
      ],
      variants: {}, tags: ["vma", "run"], goals: ["5k", "10k"],
    },
    // Candidat de substitution base-éligible, même sport/durée proche.
    {
      id: "BASE_RUN_AEROBIE_CONTINU",
      cat: "B", sport: "run", objectif: "Endurance fondamentale continue", necessite: "Recommandé",
      when: "Base — tout le plan.", phase: ["base", "build"],
      avoid: "", durationMin: [40, 60], metricKey: "pace", sportKey: "run",
      structure: [
        { part: "Main", text: "45' continu Z2", zones: ["Z2"] },
      ],
      variants: {}, tags: ["endurance", "run"], goals: ["5k", "10k"],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { runReconciler } from "@/lib/plan/planReconciler";

function makeSession(): PlanSession {
  return {
    day: "mardi", sport: "run", title: "VMA piste", details: "", isKeySession: true,
    custom: false, catalogId: "LYDIARD_RUN_TRACK_VMA", durationMin: 50, zones: ["Z5", "Z6"],
  };
}

function makeChunk(weekNumber: number, phase: string, session: PlanSession): PlanChunk {
  return {
    weeks: [{
      weekNumber, phase, theme: "T",
      sessions: [session],
    }],
  } as unknown as PlanChunk;
}

describe("runReconciler — phase catalogue recalculée numériquement quand week.phase est un libellé (pas un enum propre)", () => {
  it("libellé humain + semaine 1/12 (numériquement base) → fiche build/peak-only substituée", () => {
    const s = makeSession();
    const chunk = makeChunk(1, "Phase 1 — Adaptation & Socle Aérobie", s);
    const rec = runReconciler([chunk], {}, 2, undefined, { globalTotalWeeks: 12, globalWeekOffset: 0 });
    expect(rec.counters.phase_substituted).toBe(1);
    expect(s.catalogId).toBe("BASE_RUN_AEROBIE_CONTINU");
    expect(rec.logs.some(l => l.includes("[phase_substituted]") && l.includes("LYDIARD_RUN_TRACK_VMA"))).toBe(true);
  });

  it("libellé humain + semaine 5/12 (numériquement build) → fiche build/peak-only conservée (phase compatible)", () => {
    const s = makeSession();
    const chunk = makeChunk(5, "Phase 2 — Développement & Spécifique 5K", s);
    const rec = runReconciler([chunk], {}, 2, undefined, { globalTotalWeeks: 12, globalWeekOffset: 0 });
    expect(rec.counters.phase_substituted).toBe(0);
    expect(s.catalogId).toBe("LYDIARD_RUN_TRACK_VMA");
  });

  it("enum propre et cohérent ('base', semaine 1/12 réellement base) → substitution normale", () => {
    const s = makeSession();
    const chunk = makeChunk(1, "base", s);
    const rec = runReconciler([chunk], {}, 2, undefined, { globalTotalWeeks: 12, globalWeekOffset: 0 });
    expect(rec.counters.phase_substituted).toBe(1);
    expect(s.catalogId).toBe("BASE_RUN_AEROBIE_CONTINU");
  });

  // P0 (consigne coach, suite PR #376) : "Ne fais pas confiance à week.phase
  // lorsqu'il est déclaré par le LLM, même si sa valeur est syntaxiquement
  // valide. Utilise le calcul canonique de phase pour vérifier l'éligibilité."
  // Avant ce correctif, un enum PROPRE mais FAUX (le LLM auto-déclare "build"
  // pour sa semaine 1 alors qu'elle est numériquement "base") était gardé tel
  // quel par `resolveWeekPhase` — Lydiard (build/peak) passait alors comme
  // "compatible" avec ce faux "build" et n'était jamais substitué. Preuve
  // directe sur le JSON réel (log réconciliateur) : le réconciliateur avait
  // bien calculé weekPhase=base pour S1/S2 (donc ce n'était pas CE bug
  // précis qui a laissé passer Lydiard dans ce run — cf. phaseNormalization
  // fix) ; ce test couvre le cas où le LLM se mécompte lui-même, qui reste
  // un vecteur distinct et confirmé par la consigne coach.
  it("enum propre mais FAUX ('build' auto-déclaré par le LLM pour une semaine 1/12 réellement 'base') → le calcul numérique prime, Lydiard substitué quand même", () => {
    const s = makeSession();
    const chunk = makeChunk(1, "build", s); // auto-déclaration LLM syntaxiquement valide mais fausse
    const rec = runReconciler([chunk], {}, 2, undefined, { globalTotalWeeks: 12, globalWeekOffset: 0 });
    expect(rec.counters.phase_substituted).toBe(1);
    expect(s.catalogId).toBe("BASE_RUN_AEROBIE_CONTINU");
    expect(rec.logs.some(l => l.includes("[phase_substituted]") && l.includes("LYDIARD_RUN_TRACK_VMA"))).toBe(true);
  });

  it("aucun substitut disponible → séance JAMAIS supprimée, conflit signalé (phase_unresolved)", () => {
    const s = makeSession();
    // Restriction au catalogue injecté qui ne contient QUE la fiche incompatible
    // elle-même → aucun remplacement possible.
    const injected = new Set(["LYDIARD_RUN_TRACK_VMA"]);
    const chunk = makeChunk(1, "Phase 1 — Adaptation & Socle Aérobie", s);
    const rec = runReconciler([chunk], {}, 2, injected, { globalTotalWeeks: 12, globalWeekOffset: 0 });
    expect(rec.counters.phase_substituted).toBe(0);
    expect(rec.counters.phase_unresolved).toBe(1);
    expect(s.catalogId).toBe("LYDIARD_RUN_TRACK_VMA"); // jamais supprimée silencieusement
    expect(rec.logs.some(l => l.includes("[phase_unresolved]"))).toBe(true);
  });

  it("fenêtre de régénération partielle (globalWeekOffset≠0) → semaine locale 1 mappée sur la semaine globale réelle", () => {
    const s = makeSession();
    // Semaine locale 1, offset 4 → semaine globale réelle 5/12 (build) → conservée.
    const chunk = makeChunk(1, "Phase 2 — Développement & Spécifique 5K", s);
    const rec = runReconciler([chunk], {}, 2, undefined, { globalTotalWeeks: 12, globalWeekOffset: 4 });
    expect(rec.counters.phase_substituted).toBe(0);
    expect(s.catalogId).toBe("LYDIARD_RUN_TRACK_VMA");
  });
});
