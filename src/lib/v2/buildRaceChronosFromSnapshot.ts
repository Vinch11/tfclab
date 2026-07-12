/**
 * Helper — extrait un objet `RaceChronos` (chronos course réels) depuis un snapshot
 * cloud pour être injecté dans `computePacingEnvelope(...)`.
 *
 * Retourne `null` si aucun chrono n'est disponible (le moteur retombe alors sur
 * la chaîne prédictive VMA/paceThreshold → RACE_TYPICAL_DURATION_MIN).
 *
 * Sert à supprimer le fallback "IM = 10h" ancré pour tous les athlètes en
 * privilégiant la prédiction Riegel dès qu'un chrono existe.
 */
import type { RaceChronos } from "@/engines/diagnostic/raceTimeEstimator";

type MaybeSnapshot = Record<string, unknown> | null | undefined;

function num(v: unknown): number | null {
  return typeof v === "number" && v > 0 && Number.isFinite(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function buildRaceChronosFromSnapshot(snap: MaybeSnapshot): RaceChronos | null {
  if (!snap) return null;
  const chronos: RaceChronos = {
    time_5k_sec: num(snap.time_5k_sec),
    time_10k_sec: num(snap.time_10k_sec),
    time_20k_sec: num(snap.time_20k_sec),
    time_half_sec: num(snap.time_half_sec),
    time_marathon_sec: num(snap.time_marathon_sec),
    time_5k_date: str(snap.time_5k_date),
    time_10k_date: str(snap.time_10k_date),
    time_20k_date: str(snap.time_20k_date),
    time_half_date: str(snap.time_half_date),
    time_marathon_date: str(snap.time_marathon_date),
  };
  const hasAny =
    chronos.time_5k_sec != null ||
    chronos.time_10k_sec != null ||
    chronos.time_20k_sec != null ||
    chronos.time_half_sec != null ||
    chronos.time_marathon_sec != null;
  return hasAny ? chronos : null;
}
