import type { CatalogEvidence, CanonicalSport } from "./types";

function sport(value: string): CanonicalSport {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/nat|swim/.test(normalized)) return "swim";
  if (/velo|bike|cycl/.test(normalized)) return "bike";
  if (/course|run|cap/.test(normalized)) return "run";
  if (/brick|transition/.test(normalized)) return "brick";
  if (/renfo|strength|muscu|force/.test(normalized)) return "strength";
  if (/recup|recovery|mobil/.test(normalized)) return "recovery";
  return "unknown";
}

/** Lecture seule : aucun enrichissement ni mutation n'est effectué ici. */
export async function buildCatalogEvidence(): Promise<ReadonlyMap<string, CatalogEvidence>> {
  // Plusieurs enrichisseurs historiques de la bibliothèque écrivent encore
  // sur console à l'import. Le CLI doit réserver stdout au rapport JSON/MD.
  const previousLog = console.log;
  console.log = () => undefined;
  let WorkoutLibrary: typeof import("@/lib/workoutLibrary")["WorkoutLibrary"];
  try {
    ({ WorkoutLibrary } = await import("@/lib/workoutLibrary"));
  } finally {
    console.log = previousLog;
  }
  return new Map(WorkoutLibrary.map(workout => [workout.id.toUpperCase(), {
    id: workout.id,
    sport: sport(workout.sport),
    objective: workout.objectif,
    physiology: workout.physiology ? {
      primary: workout.physiology.primary,
      secondary: [...(workout.physiology.secondary ?? [])],
    } : null,
    prerequisites: workout.prerequisites ? { ...workout.prerequisites } : null,
  }]));
}

