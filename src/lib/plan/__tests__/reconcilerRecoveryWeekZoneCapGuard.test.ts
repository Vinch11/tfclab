/**
 * Audit réel "B-5K-BEGINNER" (15/10) : une semaine de décharge dont la note
 * coach plafonne explicitement l'intensité ("Semaine allégée. Réduire
 * l'intensité, rester strictement en Z1-Z2...") ne voyait ce plafond vérifié
 * qu'après coup par le QA check B11 (`checksB10B11.ts`) — jamais consulté
 * par le réconciliateur au moment de choisir un candidat de substitution.
 * Cas réel constaté : `findReplacement` a réintroduit `A_RUN_FARTLEK_LIBRE`
 * (Main jusqu'en Z4) dans la semaine 3 (décharge, plafond Z2) en réparant un
 * mismatch de phase — dépassant le plafond que la semaine annonçait
 * elle-même. `extractWeekZoneCap(week.weeklyNotes)` + `FindOpts.weekZoneCap`
 * (planReconciler.ts) ferment ce trou : aucun candidat dont le bloc "Main"
 * dépasse la zone plafonnée n'est plus jamais choisi.
 *
 * Bibliothèque mockée (déterministe, même convention que
 * reconcilerLevelPrerequisiteGuard.test.ts) — reprend l'ID et le contenu
 * RÉELS d'`A_RUN_FARTLEK_LIBRE` (src/lib/enrichedWorkoutsV6.ts).
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout, PhaseTag } from "@/types/workoutLibrary";
import type { PlanChunk, PlanSession } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    // Original : phase "build/peak" uniquement, placé en semaine "base"
    // ci-dessous → déclenche une substitution PHASE (step 1).
    {
      id: "ORIG_RUN_BUILD_ONLY",
      cat: "B", sport: "run", objectif: "Fartlek contrôlé", necessite: "Recommandé",
      when: "Build", phase: ["build", "peak"],
      avoid: "", durationMin: [40, 55], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "20min continu Z2 puis accélérations", zones: ["Z4"] }],
      variants: {}, tags: [], goals: ["5k"],
    },
    // Reprend l'ID + contenu RÉELS d'A_RUN_FARTLEK_LIBRE — seul candidat
    // sport=run compatible phase "base" + durée 40-55min dans ce mock tant
    // que D_DELOAD_RUN_MOCK (durée 35-45min) est hors plage.
    {
      id: "A_RUN_FARTLEK_LIBRE",
      cat: "A", sport: "course",
      objectif: "Fartlek libre – autonomie de l'athlète, plaisir de courir, instinct",
      necessite: "Recommandé",
      when: "Toute phase, idéal en récup active ou milieu de semaine légère",
      phase: ["base", "build", "peak", "taper"],
      avoid: "Aucun (ajuster si fatigue : rester en Z1-Z2)",
      durationMin: [40, 55], metricKey: "cardiaque", sportKey: "run_fartlek_libre",
      structure: [
        { part: "Warm-up", text: "10min jog facile sans montre (courir au feeling)", zones: ["Z1"] },
        { part: "Main", text: "25-35min de Fartlek libre : l'athlète accélère QUAND IL VEUT, AUSSI LONGTEMPS QU'IL VEUT, à L'INTENSITÉ QU'IL VEUT.", zones: ["Z1", "Z2", "Z3", "Z4"] },
        { part: "Cool-down", text: "5-10min marche/jog très facile", zones: ["Z1"] },
      ],
      variants: {}, tags: [], goals: ["5k", "10k"],
    },
    // Candidat conforme à un plafond Z2 — durée 35-45min, hors plage pour
    // le test "sans plafond" (session à 50min) afin d'isoler A_RUN_FARTLEK_LIBRE
    // comme unique candidat valide dans ce cas précis.
    {
      id: "D_DELOAD_RUN_MOCK",
      cat: "D", sport: "run", objectif: "Footing de décharge", necessite: "Recommandé",
      when: "Toute l'année", phase: ["base", "build", "peak", "taper"],
      avoid: "", durationMin: [35, 45], metricKey: "cardiaque", sportKey: "run",
      structure: [{ part: "Main", text: "35min continu en Z1 très facile", zones: ["Z1"] }],
      variants: {}, tags: [], goals: ["5k"],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { runReconciler, extractWeekZoneCap } from "@/lib/plan/planReconciler";

function makeChunk(session: PlanSession, weeklyNotes: string | undefined, phase: PhaseTag = "base"): PlanChunk {
  return {
    weeks: [{
      weekNumber: 3, phase, theme: "Décharge & Assimilation",
      weeklyNotes,
      sessions: [session],
    }],
  };
}

function makeSession(durationMin: number): PlanSession {
  return {
    day: "mercredi", sport: "run", title: "Fartlek contrôlé", details: "", isKeySession: true,
    custom: false, catalogId: "ORIG_RUN_BUILD_ONLY", durationMin, zones: ["Z4"],
  };
}

describe("extractWeekZoneCap — lecture du plafond de zone dans la note hebdo", () => {
  it("reconnaît 'rester strictement en Z1-Z2' (cas réel S3, audit 15/10)", () => {
    expect(extractWeekZoneCap("Semaine allégée. Réduire l'intensité, rester strictement en Z1-Z2 et privilégier la fraîcheur.")).toBe(2);
  });
  it("reconnaît 'ne pas dépasser Z2'", () => {
    expect(extractWeekZoneCap("Semaine de récupération, ne pas dépasser Z2 cette semaine.")).toBe(2);
  });
  it("reconnaît 'max Z3'", () => {
    expect(extractWeekZoneCap("Contenu modéré, max Z3 toléré.")).toBe(3);
  });
  it("renvoie null sans note", () => {
    expect(extractWeekZoneCap(undefined)).toBeNull();
    expect(extractWeekZoneCap("")).toBeNull();
  });
  it("renvoie null si la note ne mentionne aucun plafond reconnu", () => {
    expect(extractWeekZoneCap("Semaine normale, continuer la progression.")).toBeNull();
  });
});

describe("runReconciler/findReplacement — garde-fou plafond d'intensité des semaines de décharge", () => {
  it("RÉGRESSION S3 (audit B-5K-BEGINNER 15/10) : semaine plafonnée Z1-Z2 → A_RUN_FARTLEK_LIBRE (Main Z4) n'est jamais réintroduite, même si elle serait le meilleur candidat sans le plafond", () => {
    const s = makeSession(50);
    const rec = runReconciler(
      [makeChunk(s, "Semaine allégée. Réduire l'intensité, rester strictement en Z1-Z2 et privilégier la fraîcheur.")],
      {}, 1, undefined, { globalTotalWeeks: 12 },
    );
    expect(s.catalogId).not.toBe("A_RUN_FARTLEK_LIBRE");
    // Durée 50min hors plage de D_DELOAD_RUN_MOCK (35-45) : aucun candidat
    // sport=run conforme au plafond ET à la durée → réparation non résolue,
    // jamais une fiche hors plafond choisie par défaut.
    expect(s.catalogId).toBe("ORIG_RUN_BUILD_ONLY");
    expect(rec.counters.phase_unresolved).toBe(1);
    expect(rec.counters.phase_substituted).toBe(0);
  });

  it("même semaine plafonnée, mais un candidat conforme existe à la bonne durée → il est choisi plutôt que de laisser la réparation non résolue", () => {
    const s = makeSession(42); // dans la plage 35-45 de D_DELOAD_RUN_MOCK
    const rec = runReconciler(
      [makeChunk(s, "Semaine allégée. Réduire l'intensité, rester strictement en Z1-Z2 et privilégier la fraîcheur.")],
      {}, 1, undefined, { globalTotalWeeks: 12 },
    );
    expect(s.catalogId).toBe("D_DELOAD_RUN_MOCK");
    expect(rec.counters.phase_substituted).toBe(1);
  });

  it("sans plafond dans weeklyNotes : A_RUN_FARTLEK_LIBRE reste normalement sélectionnable — aucune régression du comportement existant", () => {
    const s = makeSession(50); // hors plage D_DELOAD_RUN_MOCK (35-45) : seul A_RUN_FARTLEK_LIBRE (40-55) matche
    const rec = runReconciler([makeChunk(s, undefined)], {}, 1, undefined, { globalTotalWeeks: 12 });
    expect(s.catalogId).toBe("A_RUN_FARTLEK_LIBRE");
    expect(rec.counters.phase_substituted).toBe(1);
  });

  it("note hebdo sans plafond reconnu (texte neutre) : comportement inchangé, A_RUN_FARTLEK_LIBRE reste sélectionnable", () => {
    const s = makeSession(50);
    const rec = runReconciler([makeChunk(s, "Semaine de progression normale.")], {}, 1, undefined, { globalTotalWeeks: 12 });
    expect(s.catalogId).toBe("A_RUN_FARTLEK_LIBRE");
    expect(rec.counters.phase_substituted).toBe(1);
  });
});
