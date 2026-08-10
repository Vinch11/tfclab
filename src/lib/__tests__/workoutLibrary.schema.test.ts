import { describe, it, expect } from "vitest";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import type { LibraryWorkout, PhaseTag } from "@/types/workoutLibrary";
import {
  resolveCanonicalDuration,
  isWideDurationRange,
  WIDE_RANGE_THRESHOLD_MIN,
} from "@/lib/plan/workoutDurationResolver";

const PHASES: PhaseTag[] = ["base", "build", "peak", "taper"];

const describeFiche = (w: LibraryWorkout) => `${w.id} (${w.sport})`;

describe("Catalogue — schéma de construction homogène", () => {
  it("chaque fiche a un ID unique", () => {
    const seen = new Map<string, number>();
    for (const w of WorkoutLibrary) {
      seen.set(w.id.toUpperCase(), (seen.get(w.id.toUpperCase()) || 0) + 1);
    }
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
    expect(dupes).toEqual([]);
  });

  it("chaque fiche a une plage de durée valide et ordonnée", () => {
    const bad = WorkoutLibrary.filter(w => {
      const d = w.durationMin;
      if (!Array.isArray(d) || d.length !== 2) return true;
      if (!Number.isFinite(d[0]) || !Number.isFinite(d[1])) return true;
      if (d[1] < d[0]) return true;
      // Exceptions canoniques à durée nulle : repos complet et protocoles
      // non chronométrés (nutrition, recharge glycogénique).
      if (d[0] <= 0) {
        const isRest = String(w.cat).toUpperCase() === "REST";
        const isProtocol = /nutrition|recharge|protocole|hydratation/i.test(
          `${w.sportKey} ${w.objectif} ${(w.tags || []).join(" ")}`
        );
        return !isRest && !isProtocol;
      }
      return false;
    }).map(describeFiche);
    expect(bad).toEqual([]);
  });

  it("chaque fiche déclare un sport, un objectif et un référentiel d'intensité", () => {
    const bad = WorkoutLibrary.filter(
      w => !w.sport || !String(w.objectif || "").trim() || !w.metricKey
    ).map(describeFiche);
    expect(bad).toEqual([]);
  });

  it("chaque fiche a une structure avec un bloc de travail identifiable", () => {
    // Vocabulaire canonique des blocs : soit un bloc "Main", soit un segment
    // de sport nommé (bricks, enchaînements multi-sports).
    const MAIN_BLOCK = /main|corps|principal|s[ée]rie|bloc|set|travail/i;
    const SPORT_SEGMENT = /bike|v[ée]lo|run|course|swim|natation|renfo|strength|gainage|marche/i;
    // Séances fractionnées dans la journée ou protocoles séquencés par étape.
    const SEQUENCE_SEGMENT = /^\s*(am|pm)\b|[ée]tape|post-|pr[ée]-/i;
    const bad = WorkoutLibrary.filter(w => {
      const parts = w.structure || [];
      if (String(w.cat).toUpperCase() === "REST") return false;
      if (parts.length === 0) return true;
      return !parts.some(p => {
        const label = p.part || "";
        return MAIN_BLOCK.test(label) || SPORT_SEGMENT.test(label) || SEQUENCE_SEGMENT.test(label);
      });
    }).map(describeFiche);
    expect(bad).toEqual([]);
  });

  it("aucune plage large ne reste ambiguë : la durée est résolue déterministiquement", () => {
    const wide = WorkoutLibrary.filter(isWideDurationRange);
    for (const w of wide) {
      for (const phase of PHASES) {
        const d = resolveCanonicalDuration(w, phase);
        expect(d, `${describeFiche(w)} @ ${phase}`).toBeGreaterThanOrEqual(w.durationMin[0]);
        expect(d, `${describeFiche(w)} @ ${phase}`).toBeLessThanOrEqual(w.durationMin[1]);
      }
      // Déterminisme : deux appels identiques ⇒ même valeur
      expect(resolveCanonicalDuration(w, "build")).toBe(resolveCanonicalDuration(w, "build"));
    }
  });

  it("la durée canonique croît avec la charge de la phase (base < build < peak)", () => {
    const wide = WorkoutLibrary.filter(w => w.durationMin[1] - w.durationMin[0] > WIDE_RANGE_THRESHOLD_MIN && !w.durationByPhase);
    for (const w of wide) {
      const base = resolveCanonicalDuration(w, "base");
      const build = resolveCanonicalDuration(w, "build");
      const peak = resolveCanonicalDuration(w, "peak");
      expect(base, describeFiche(w)).toBeLessThanOrEqual(build);
      expect(build, describeFiche(w)).toBeLessThanOrEqual(peak);
    }
  });

  it("les durationByPhase explicites restent dans la plage déclarée", () => {
    const bad: string[] = [];
    for (const w of WorkoutLibrary) {
      if (!w.durationByPhase) continue;
      for (const [phase, value] of Object.entries(w.durationByPhase)) {
        if (typeof value !== "number") continue;
        if (value < w.durationMin[0] || value > w.durationMin[1]) {
          bad.push(`${describeFiche(w)} ${phase}=${value} hors [${w.durationMin.join(",")}]`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
