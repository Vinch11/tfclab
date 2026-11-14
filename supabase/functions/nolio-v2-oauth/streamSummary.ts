export type NumericStream = Array<number | null>;
export type NumericStreams = Record<string, NumericStream>;

/**
 * Réduit les flux d'une sortie longue à une moyenne par minute.
 * Le temps est placé au milieu de chaque minute ; les trous restent des trous,
 * jamais des zéros. Utilisé uniquement pour la durabilité sur fenêtres de 20 min.
 */
export function summarizeStreamsByMinute(streams: NumericStreams): NumericStreams {
  const time = streams.stream_time;
  const origin = time?.find((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!time?.length || origin == null) return streams;

  const keys = Object.keys(streams).filter(key => key !== 'stream_time');
  const buckets = new Map<number, { time: number; sums: Record<string, number>; counts: Record<string, number> }>();

  for (let index = 0; index < time.length; index++) {
    const timestamp = time[index];
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp < origin) continue;
    const minute = Math.floor((timestamp - origin) / 60);
    let bucket = buckets.get(minute);
    if (!bucket) {
      bucket = { time: origin + minute * 60 + 30, sums: {}, counts: {} };
      buckets.set(minute, bucket);
    }
    for (const key of keys) {
      const value = streams[key]?.[index];
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      bucket.sums[key] = (bucket.sums[key] ?? 0) + value;
      bucket.counts[key] = (bucket.counts[key] ?? 0) + 1;
    }
  }

  const ordered = [...buckets.values()].sort((a, b) => a.time - b.time);
  const result: NumericStreams = { stream_time: ordered.map(bucket => bucket.time) };
  for (const key of keys) {
    result[key] = ordered.map(bucket => {
      const count = bucket.counts[key] ?? 0;
      return count > 0 ? bucket.sums[key] / count : null;
    });
  }
  return result;
}
