/**
 * Audit qualité plans IA (plan "Vince", 10K, semaine 1) : la substitution
 * phase (runOnePass) choisissait DEUX FOIS la même fiche de remplacement
 * pour deux séances Build placées par erreur dans une semaine Base (ex:
 * "Test tlim@vVO2max Billat" mardi ET mercredi, mot pour mot identique) —
 * le ledger de diversité ne fait que pénaliser (-25) une fiche déjà
 * utilisée, jamais assez pour contrebalancer un écart de score d'intention
 * (toujours ≥100 dès que deux candidats diffèrent). Voir dedupeWithinWeek
 * dans planReconciler.ts.
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk, PlanSession, DayLower } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    // Fiche d'origine (Build) — placée par erreur dans une semaine Base,
    // donc phase-incompatible pour les deux séances mardi/mercredi.
    {
      id: "BUILD_FICHE_RUN",
      cat: "B", sport: "run", objectif: "Séance build", necessite: "Recommandé",
      when: "Build", phase: ["build"],
      avoid: "", durationMin: [55, 70], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "VO2max", zones: ["Z5"] }],
      variants: {}, tags: ["vo2max"], goals: ["10k", "semi"],
    },
    // Candidat Base IDÉAL : même cat + mêmes goals que l'original → score
    // d'intention largement supérieur au 2e candidat (écart ≫ 25, la
    // pénalité du ledger est donc structurellement insuffisante seule).
    {
      id: "BASE_IDEAL_RUN",
      cat: "B", sport: "run", objectif: "Base idéale", necessite: "Recommandé",
      when: "Base", phase: ["base", "build"],
      avoid: "", durationMin: [55, 70], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "Z2", zones: ["Z5"] }],
      variants: {}, tags: ["base"], goals: ["10k", "semi"],
    },
    // Candidat Base alternatif : seule fiche restante une fois BASE_IDEAL_RUN
    // exclue — c'est elle que le filet de dédoublonnage doit choisir pour la
    // 2e occurrence.
    {
      id: "BASE_ALT_RUN",
      cat: "C", sport: "run", objectif: "Base alternative", necessite: "Recommandé",
      when: "Base", phase: ["base", "build"],
      avoid: "", durationMin: [50, 75], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "Z2", zones: ["Z5"] }],
      variants: {}, tags: ["base"], goals: [],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { runReconciler } from "@/lib/plan/planReconciler";

function makeSession(day: DayLower, catalogId: string): PlanSession {
  return {
    day, sport: "run", title: "Séance build", details: "", isKeySession: false,
    custom: false, catalogId, durationMin: 60, zones: ["Z5"],
  };
}

function makeWeekChunk(sessions: PlanSession[], phase: PlanChunk["weeks"][number]["phase"] = "base"): PlanChunk {
  return {
    weeks: [{ weekNumber: 1, phase, theme: "T", sessions }],
  };
}

describe("runReconciler — dédoublonnage intra-semaine (filet final)", () => {
  it("reproduit le cas réel Billat mardi+mercredi : la substitution phase choisit 2x la même fiche, le filet final en remplace la 2e par une alternative distincte", () => {
    const mardi = makeSession("mardi", "BUILD_FICHE_RUN");
    const mercredi = makeSession("mercredi", "BUILD_FICHE_RUN");
    const chunk = makeWeekChunk([mardi, mercredi], "base");

    const rec = runReconciler([chunk], {}, 2);

    // Les deux séances ont bien été substituées hors phase build (sinon le
    // test ne reproduit pas la situation réelle).
    expect(rec.counters.phase_substituted).toBe(2);

    // Sans le filet final, les deux auraient reçu BASE_IDEAL_RUN (bug réel).
    // Avec le filet : la 1re garde BASE_IDEAL_RUN, la 2e est détectée en
    // double puis remplacée par BASE_ALT_RUN — jamais deux fois la même fiche.
    expect(mardi.catalogId).toBe("BASE_IDEAL_RUN");
    expect(mercredi.catalogId).toBe("BASE_ALT_RUN");
    expect(mardi.catalogId).not.toBe(mercredi.catalogId);

    expect(rec.counters.week_duplicate_replaced).toBe(1);
    expect(rec.counters.week_duplicate_unresolved).toBeUndefined();
    expect(rec.logs.some(l => l.includes("[week_duplicate_replaced]") && l.includes("BASE_IDEAL_RUN") && l.includes("BASE_ALT_RUN"))).toBe(true);
  });

  it("aucune alternative disponible : le doublon est laissé intact mais signalé (jamais de dégradation silencieuse)", () => {
    const mardi = makeSession("mardi", "BUILD_FICHE_RUN");
    const mercredi = makeSession("mercredi", "BUILD_FICHE_RUN");
    // Catalogue restreint au seul candidat Base idéal — aucune alternative
    // possible pour la 2e occurrence une fois la 1re exclue.
    const injected = new Set(["BASE_IDEAL_RUN"]);
    const chunk = makeWeekChunk([mardi, mercredi], "base");

    const rec = runReconciler([chunk], {}, 2, injected);

    expect(mardi.catalogId).toBe("BASE_IDEAL_RUN");
    // Le doublon n'a pas pu être résolu — conservé tel quel, pas de fiche inventée.
    expect(mercredi.catalogId).toBe("BASE_IDEAL_RUN");
    expect(rec.counters.week_duplicate_unresolved).toBe(1);
    expect(rec.counters.week_duplicate_replaced).toBeUndefined();
    expect(rec.logs.some(l => l.includes("[week_duplicate_unresolved]") && l.includes("BASE_IDEAL_RUN"))).toBe(true);
  });

  it("deux semaines différentes avec la même fiche : pas de faux positif (pas un doublon intra-semaine)", () => {
    const s1 = makeSession("mardi", "BASE_IDEAL_RUN");
    const s2 = makeSession("mardi", "BASE_IDEAL_RUN");
    const chunk: PlanChunk = {
      weeks: [
        { weekNumber: 1, phase: "base", theme: "T", sessions: [s1] },
        { weekNumber: 2, phase: "base", theme: "T", sessions: [s2] },
      ],
    };

    const rec = runReconciler([chunk], {}, 2);

    expect(s1.catalogId).toBe("BASE_IDEAL_RUN");
    expect(s2.catalogId).toBe("BASE_IDEAL_RUN");
    expect(rec.counters.week_duplicate_replaced).toBeUndefined();
    expect(rec.counters.week_duplicate_unresolved).toBeUndefined();
  });
});
