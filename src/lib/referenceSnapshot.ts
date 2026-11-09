/**
 * Bilan de référence — règle unique pour tous les écrans et moteurs.
 * 1) le bilan actif choisi par le coach, s'il existe pour cet athlète ;
 * 2) sinon le plus récent : date ↓, puis date de création ↓, puis id ↓
 *    (départage déterministe quand plusieurs bilans ont la même date).
 */
export interface ReferenceSnapshotLike {
  id: string;
  athlete_id: string;
  date: string;
  created_at?: string | null;
}

export function compareSnapshotsNewestFirst(a: ReferenceSnapshotLike, b: ReferenceSnapshotLike): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const ca = a.created_at ?? "";
  const cb = b.created_at ?? "";
  if (ca !== cb) return ca < cb ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

export function pickReferenceSnapshot<T extends ReferenceSnapshotLike>(
  snapshots: readonly T[] | null | undefined,
  athleteId: string | null | undefined,
  activeSnapshotId?: string | null,
): T | null {
  if (!athleteId) return null;
  const list = (snapshots ?? []).filter((s) => s.athlete_id === athleteId);
  if (list.length === 0) return null;
  if (activeSnapshotId) {
    const active = list.find((s) => s.id === activeSnapshotId);
    if (active) return active;
  }
  return [...list].sort(compareSnapshotsNewestFirst)[0];
}
