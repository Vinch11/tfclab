/** Shared-library replacement is suspended until it can be atomic. */
export interface SyncResult {
  success: boolean;
  inserted: number;
  deduplicated: number;
  total: number;
  errors: string[];
}

export const WORKOUT_SYNC_SUSPENDED = "Sync DB suspendue : le remplacement du catalogue n’est pas atomique. Aucune donnée modifiée.";

/** Fail closed even if an old UI still calls this entry point. No network call. */
export async function syncWorkoutsToCloud(): Promise<SyncResult> {
  return { success: false, inserted: 0, deduplicated: 0, total: 0, errors: [WORKOUT_SYNC_SUSPENDED] };
}
