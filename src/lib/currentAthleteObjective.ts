/**
 * Objectif du cycle courant : la fiche athlète prime sur l'objectif figé dans
 * un snapshot. Ce dernier reste utile à l'analyse historique, mais ne doit pas
 * faire revivre un ancien cycle dans les réglages courants.
 */
export function resolveCurrentAthleteObjective(
  databaseGoal: string | null | undefined,
  contextGoal: string | null | undefined,
  snapshotGoal: string | null | undefined,
): string | null {
  return databaseGoal || contextGoal || snapshotGoal || null;
}
