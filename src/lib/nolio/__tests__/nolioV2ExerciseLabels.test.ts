import { describe, it, expect } from "vitest";
import { requiredExerciseLabels, type DetNode, type PlanSessionInput } from "../../../../supabase/functions/_shared/nolioV2/plannedMapper";

const leaf = (label: string, role: "warmup" | "main" | "cooldown", dose: DetNode extends never ? never : { seconds: number } | { reps: number }, extra: Record<string, unknown> = {}): DetNode =>
  ({ kind: "step", role, label, domain: null, dose, rpe: { min: 6, max: 7 }, target: null, ...extra }) as DetNode;
const sess = (key: string, sport: string, nodes: DetNode[], details = ""): PlanSessionInput => ({
  sessionKey: key, date: "2026-11-10", title: key, details, sport, catalogId: "SRC", durationMin: 30,
  detStructuredWorkout: { schema: "det-structured-workout-v1", sourceId: "SRC", sport, chosenDurationMin: 30, nodes, exactSeconds: null },
});

describe("libellés d'exercices requis", () => {
  const strength = sess("S1-J1-0", "strength", [
    leaf("Mobilité hanches", "warmup", { seconds: 300 }),
    { kind: "repeat", label: "Bloc A", count: 3, betweenSec: 90, restAfterLast: false, steps: [
      leaf("Squat", "main", { reps: 8 }),
      { kind: "repeat", label: "Bloc A2", count: 2, betweenSec: 30, restAfterLast: false, steps: [leaf("Fente bulgare", "main", { reps: 6 }), leaf("Gainage", "main", { seconds: 40 })] },
    ] },
    leaf("Retour au calme", "cooldown", { seconds: 300 }),
  ], "Inclut aussi Soulevé de terre et Pompes dans le texte");
  const run = sess("S1-J2-0", "run", [
    leaf("Échauffement", "warmup", { seconds: 600 }),
    { kind: "repeat", label: "Côtes", count: 4, betweenSec: 60, restAfterLast: false, steps: [leaf("Montée", "main", { seconds: 60 }), leaf("Bondissements", "main", { seconds: 30 }, { repsTarget: 10 })] },
  ]);

  it("rôles/doses structurés : séries en répétitions et principales de renforcement ; warmup/cooldown temporisés exclus ; aucun libellé tiré du texte", () => {
    const labels = requiredExerciseLabels([strength, run, { ...run, sessionKey: "x", isRest: true }, { ...strength, sessionKey: "y", detStructuredWorkout: undefined }]);
    expect(labels.sort()).toEqual(["Bondissements", "Fente bulgare", "Gainage", "Squat"].sort());
    expect(labels).not.toContain("Mobilité hanches");
    expect(labels).not.toContain("Retour au calme");
    expect(labels).not.toContain("Soulevé de terre");
    expect(labels).not.toContain("Montée");
  });

  it("libellés uniques et exacts, ordre de la structure", () => {
    expect(requiredExerciseLabels([strength, strength])).toEqual(["Squat", "Fente bulgare", "Gainage"]);
  });
  it("une vraie série en répétitions exige un exercice même en échauffement", () => {
    const warmReps = sess("S1-J3-0", "strength", [leaf("Squats d'activation", "warmup", { reps: 10 }), leaf("Gainage final", "cooldown", { seconds: 60 }, { repsTarget: 3 })]);
    expect(requiredExerciseLabels([warmReps])).toEqual(["Squats d'activation", "Gainage final"]);
  });
});
