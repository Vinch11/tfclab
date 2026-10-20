import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { FinalValidationPlanLike } from "@/lib/plan/qa/checkB13";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    {
      id: "BUILD_ONLY_RUN",
      cat: "B", sport: "run", objectif: "Séance build", necessite: "Recommandé",
      when: "", phase: ["build"], avoid: "",
      durationMin: [40, 60], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "Seuil", zones: ["Z4"] }],
      variants: {}, tags: [], goals: ["10k"],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { computeFinalValidationIssues } from "@/lib/plan/qa/finalValidation";

function session(overrides: Partial<FinalValidationPlanLike["weeks"][number]["sessions"][number]>) {
  return { title: "Séance", details: "", isRest: false, catalogId: null, custom: false, ...overrides };
}

describe("computeFinalValidationIssues — orchestration B13 (critique) + B14 (avertissement)", () => {
  it("plan propre → aucune issue, hasCritical=false", () => {
    const plan: FinalValidationPlanLike = {
      weeks: [{ weekNumber: 1, phase: "build", sessions: [session({ catalogId: "BUILD_ONLY_RUN" })] }],
    };
    const r = computeFinalValidationIssues(plan);
    expect(r.issues).toEqual([]);
    expect(r.hasCritical).toBe(false);
  });

  it("doublon de catalogId → hasCritical=true, une issue 'error'", () => {
    const plan: FinalValidationPlanLike = {
      weeks: [{
        weekNumber: 1, phase: "build",
        sessions: [
          session({ catalogId: "BUILD_ONLY_RUN", dayName: "Mardi" }),
          session({ catalogId: "BUILD_ONLY_RUN", dayName: "Mercredi" }),
        ],
      }],
    };
    const r = computeFinalValidationIssues(plan);
    expect(r.hasCritical).toBe(true);
    expect(r.issues.filter((i) => i.severity === "error").length).toBe(1);
  });

  it("incohérence phase/fiche seule (B14) → hasCritical=false, une issue 'warning'", () => {
    const plan: FinalValidationPlanLike = {
      weeks: [{ weekNumber: 1, phase: "taper", sessions: [session({ catalogId: "BUILD_ONLY_RUN" })] }],
    };
    const r = computeFinalValidationIssues(plan);
    expect(r.hasCritical).toBe(false);
    expect(r.issues.length).toBe(1);
    expect(r.issues[0].severity).toBe("warning");
  });

  it("une incohérence critique ET un avertissement en même temps → hasCritical=true, les deux remontent", () => {
    const plan: FinalValidationPlanLike = {
      weeks: [{
        weekNumber: 1, phase: "taper", // phase mismatch pour BUILD_ONLY_RUN (B14)
        sessions: [
          session({ catalogId: "BUILD_ONLY_RUN", dayName: "Mardi" }),
          session({ catalogId: "BUILD_ONLY_RUN", dayName: "Mercredi" }), // doublon (B13)
        ],
      }],
    };
    const r = computeFinalValidationIssues(plan);
    expect(r.hasCritical).toBe(true);
    expect(r.issues.some((i) => i.severity === "error")).toBe(true);
    expect(r.issues.some((i) => i.severity === "warning")).toBe(true);
  });

  it("une phase incompatible conservée reste visible une seule fois avec son code existant", () => {
    const plan: FinalValidationPlanLike = {
      weeks: [{ weekNumber: 4, phase: "taper", sessions: [session({ catalogId: "BUILD_ONLY_RUN", dayName: "Mardi" })] }],
    };
    const r = computeFinalValidationIssues(plan, [
      "[reconciler] [phase_unresolved] W4/Mardi sport=run fiche=BUILD_ONLY_RUN weekPhase=taper allowed=build",
    ]);
    expect(r.issues.filter(issue => issue.rule === "phase_unresolved")).toHaveLength(1);
    expect(r.hasCritical).toBe(false);
  });

  it("un plancher de sortie longue non satisfait remonte comme critique", () => {
    const plan: FinalValidationPlanLike = { weeks: [] };
    const r = computeFinalValidationIssues(plan, [
      "[critical] sl_upgrade_unresolved: W6 dimanche — aucune fiche endurance compatible",
    ]);
    expect(r.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: "sl_upgrade_unresolved", severity: "error" }),
    ]));
    expect(r.hasCritical).toBe(true);
  });

  it("un doublon non réparé reste critique sans doubler l'alerte du réparateur", () => {
    const plan: FinalValidationPlanLike = {
      weeks: [{
        weekNumber: 11, phase: "taper",
        sessions: [
          session({ catalogId: "BUILD_ONLY_RUN", dayName: "Mardi" }),
          session({ catalogId: "BUILD_ONLY_RUN", dayName: "Jeudi" }),
        ],
      }],
    };
    const r = computeFinalValidationIssues(plan, [
      "[reconciler] [week_duplicate_unresolved] S11 Jeudi BUILD_ONLY_RUN — aucune alternative disponible",
      "[warning] duplicate_catalog_id_unresolved: W11 Jeudi — aucune alternative disponible",
    ]);
    expect(r.issues.filter(issue => issue.rule === "duplicate_catalog_id_unresolved")).toHaveLength(1);
    expect(r.hasCritical).toBe(true);
  });

  it("un cumul à jeun conserve son code existant et reste critique", () => {
    const plan: FinalValidationPlanLike = {
      weeks: [{
        weekNumber: 5, phase: "build",
        sessions: [
          session({ catalogId: "FASTED_A", title: "Endurance à jeun" }),
          session({ catalogId: "FASTED_B", title: "Train Low" }),
        ],
      }],
    };
    const r = computeFinalValidationIssues(plan, [
      "[reconciler] [week_fasted_cap_unresolved] S5 jeudi Train Low — aucune alternative disponible",
    ]);
    expect(r.issues.filter(issue => issue.rule === "fasted_session_cap_unresolved")).toHaveLength(1);
    expect(r.issues.some(issue => issue.rule === "duplicate_catalog_id_unresolved")).toBe(false);
    expect(r.hasCritical).toBe(true);
  });

  it("une réparation réussie plus tard retire l'anomalie devenue obsolète", () => {
    const plan: FinalValidationPlanLike = { weeks: [] };
    const r = computeFinalValidationIssues(plan, [
      "[critical] sl_upgrade_unresolved: S3 run — aucune fiche compatible",
      "[warning] sl_upgraded: S3 run — EASY_LONG_90",
    ]);
    expect(r.issues).toEqual([]);
    expect(r.hasCritical).toBe(false);
  });

  it("conserve ensemble les anomalies serveur et client au merge", () => {
    const plan: FinalValidationPlanLike = { weeks: [] };
    const r = computeFinalValidationIssues(plan, [
      "[info] lcw_signature_trace: [LCW_SIGNATURE] S7 samedi lcw_signature_unresolved",
      "[critical] lcw_signature_unresolved: S7 samedi — signature absente",
      "[reconciler] [reconcile_conflict] W8/dimanche durée 120min hors plage — pas de candidat",
    ]);
    expect(r.issues.map(issue => issue.rule)).toEqual(expect.arrayContaining([
      "lcw_signature_unresolved",
      "reconcile_conflict",
    ]));
    expect(r.issues.filter(issue => issue.rule === "lcw_signature_unresolved")).toHaveLength(1);
    expect(r.hasCritical).toBe(true);
  });
});

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #4 : B15
 * (cohérence ambition chronométrique ↔ physiologie) est un 3e paramètre
 * OPTIONNEL — omis, le comportement existant (B13+B14 seuls) ne change pas ;
 * fourni, il rejoint les mêmes `issues`/`hasCritical` au même point d'entrée.
 */
describe("computeFinalValidationIssues — orchestration B15 (ambition↔physiologie, optionnel)", () => {
  it("3e paramètre omis : comportement inchangé, aucune issue B15 injectée", () => {
    const plan: FinalValidationPlanLike = { weeks: [] };
    const r = computeFinalValidationIssues(plan);
    expect(r.issues.some(issue => issue.rule === "ambition_physiology_gap")).toBe(false);
  });

  it("profil cohérent (VMA bien au-dessus du standard finisher) : wiring sans effet sur hasCritical", () => {
    const plan: FinalValidationPlanLike = { weeks: [] };
    const r = computeFinalValidationIssues(plan, [], {
      vmaKmh: 20, objective: "Marathon", ambition: "finisher",
    });
    expect(r.hasCritical).toBe(false);
  });

  it("profil très incohérent (VMA très faible, ambition world_class) : 1 issue warning ambition_physiology_gap, fusionnée avec les autres", () => {
    const plan: FinalValidationPlanLike = {
      weeks: [{
        weekNumber: 1, phase: "build",
        sessions: [
          session({ catalogId: "BUILD_ONLY_RUN", dayName: "Mardi" }),
          session({ catalogId: "BUILD_ONLY_RUN", dayName: "Mercredi" }),
        ],
      }],
    };
    const r = computeFinalValidationIssues(plan, [], {
      vmaKmh: 11, objective: "Marathon", ambition: "world_class",
    });
    const gapIssues = r.issues.filter(issue => issue.rule === "ambition_physiology_gap");
    expect(gapIssues).toHaveLength(1);
    expect(gapIssues[0].severity).toBe("warning");
    // Le doublon catalogId (B13, critique) reste présent — B15 s'ajoute, ne remplace rien.
    expect(r.issues.some(issue => issue.rule === "duplicate_catalog_id_unresolved")).toBe(true);
    expect(r.hasCritical).toBe(true);
  });
});
