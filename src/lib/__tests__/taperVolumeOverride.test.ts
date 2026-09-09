/**
 * Fix C1 (audit "génération de plan IA", volet taper) : applyTaperVolumeOverride
 * ne réduisait le volume cible affiché que sur la seule semaine raceWeek-1 —
 * pour tout objectif dont le taper canonique dépasse 1 semaine (IM=3, 70.3=2,
 * Marathon=2, Trail long=2-3 — la majorité des objectifs sérieux), les
 * semaines de taper antérieures, dont `phase` vaut pourtant littéralement
 * "Affûtage", affichaient 100% du volume au lieu de 60%.
 */
import { describe, it, expect } from "vitest";
import { applyTaperVolumeOverride, isTaperWeek } from "@/lib/taperVolumeOverride";
import type { ParsedPlan, ParsedWeek } from "@/lib/aiPlanParser";

function mkWeek(weekNumber: number, phase: string, theme: string): ParsedWeek {
  return { weekNumber, phase, theme, sessions: [] };
}
function mkPlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "T", phases: [], weeks, totalWeeks: weeks.length };
}

describe("isTaperWeek", () => {
  it("phase 'Affûtage' détectée comme taper", () => {
    expect(isTaperWeek(mkWeek(10, "Affûtage", "Réduction de volume"))).toBe("taper");
  });
  it("thème 'Semaine de course' détecté comme race", () => {
    expect(isTaperWeek(mkWeek(12, "taper", "Semaine de course"))).toBe("race");
  });
  it("phase Build non détectée", () => {
    expect(isTaperWeek(mkWeek(5, "Build", "Développement"))).toBeNull();
  });
});

describe("applyTaperVolumeOverride — plancher/plafond du volume affiché par semaine (fix C1)", () => {
  it("IM (taper canonique 3 semaines) : les 3 semaines phase Affûtage reçoivent le facteur taper, pas seulement raceWeek-1", () => {
    const plan = mkPlan([
      mkWeek(1, "Base", "Fondation"),
      mkWeek(9, "Build", "Développement"),
      mkWeek(10, "Affûtage", "Réduction de volume S1"),
      mkWeek(11, "Affûtage", "Réduction de volume S2"),
      mkWeek(12, "Affûtage", "Jour J"),
    ]);
    applyTaperVolumeOverride(plan, 10, { raceWeekNumber: 12 });

    const w10 = plan.weeks.find(w => w.weekNumber === 10)!;
    const w11 = plan.weeks.find(w => w.weekNumber === 11)!;
    const w12 = plan.weeks.find(w => w.weekNumber === 12)!;

    // Base = 10h. Taper ×0.60 → cible 6h (fenêtre affichée [5h24–6h36] ±10%).
    // Avant le fix : S10/S11 retombaient sur "generic" ×1.00 (10h), pas ×0.60.
    expect(w10.volumeTarget).toContain("affûtage");
    expect(w11.volumeTarget).toContain("affûtage");
    expect(w10.volumeTarget).toMatch(/^5h|^6h/);
    expect(w11.volumeTarget).toMatch(/^5h|^6h/);

    // La semaine de course elle-même (numéro connu) reste distincte : ×0.35, pas ×0.60.
    expect(w12.volumeTarget).toContain("semaine de course");
    expect(w12.volumeTarget).toMatch(/^3h|^2h/);
  });

  it("régression : semaine de course sans mention explicite 'course' dans le thème (phase='Affûtage' seule) reste classée race via le numéro connu, pas taper", () => {
    // inferPhaseFromWeek (serveur) ne connaît aucune valeur "race" distincte —
    // la dernière semaine de taper porte souvent phase="taper"/"Affûtage" même
    // pour la semaine de course elle-même ; le thème ne mentionne pas toujours
    // "course" (le marqueur 🏁 est porté par une séance insérée par le
    // réconciliateur, pas par le thème de la semaine).
    const plan = mkPlan([
      mkWeek(11, "Affûtage", "Réduction de volume"),
      mkWeek(12, "Affûtage", "Dernière semaine avant l'objectif"),
    ]);
    applyTaperVolumeOverride(plan, 10, { raceWeekNumber: 12 });
    const w12 = plan.weeks.find(w => w.weekNumber === 12)!;
    expect(w12.volumeTarget).toContain("semaine de course");
    expect(w12.volumeTarget).toMatch(/^3h|^2h/);
  });

  it("objectif à taper court (1 semaine, ex. 10K) : comportement inchangé", () => {
    const plan = mkPlan([
      mkWeek(7, "Build", "Développement"),
      mkWeek(8, "Affûtage", "Semaine de course"),
    ]);
    applyTaperVolumeOverride(plan, 6, { raceWeekNumber: 8 });
    const w8 = plan.weeks.find(w => w.weekNumber === 8)!;
    expect(w8.volumeTarget).toContain("semaine de course");
  });

  it("sans raceWeekNumber (repli intégral sur isTaperWeek) : toutes les semaines Affûtage sont détectées", () => {
    const plan = mkPlan([
      mkWeek(1, "Base", "Fondation"),
      mkWeek(9, "Affûtage", "S1"),
      mkWeek(10, "Affûtage", "S2"),
    ]);
    applyTaperVolumeOverride(plan, 10, {});
    expect(plan.weeks.find(w => w.weekNumber === 9)!.volumeTarget).toContain("affûtage");
    expect(plan.weeks.find(w => w.weekNumber === 10)!.volumeTarget).toContain("affûtage");
  });
});
