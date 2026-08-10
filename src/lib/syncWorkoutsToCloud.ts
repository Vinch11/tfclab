/**
 * Sync WorkoutLibrary to Supabase workouts_library table
 */
import { supabase } from "@/integrations/supabase/client";
import { WorkoutLibrary } from "@/lib/workoutLibrary";

export interface SyncResult {
  success: boolean;
  inserted: number;
  deduplicated: number;
  total: number;
  errors: string[];
}

export async function syncWorkoutsToCloud(): Promise<SyncResult> {
  // Serialize workout data for the edge function
  const workouts = WorkoutLibrary.map((w) => ({
    id: w.id,
    cat: w.cat,
    sport: w.sport,
    sportKey: w.sportKey,
    objectif: w.objectif,
    necessite: w.necessite,
    when: w.when,
    phase: w.phase,
    avoid: w.avoid,
    durationMin: w.durationMin,
    durationByPhase: w.durationByPhase,
    metricKey: w.metricKey,
    structure: w.structure,
    variants: w.variants,
    notes: w.notes,
    title: w.objectif?.slice(0, 80) || w.id,
  }));

  const { data, error } = await supabase.functions.invoke("sync-workouts-library", {
    body: { workouts },
  });

  if (error) {
    console.error("Sync error:", error);
    return { success: false, inserted: 0, deduplicated: 0, total: workouts.length, errors: [error.message] };
  }

  return data as SyncResult;
}
