/** Existing LCW chunk arithmetic, shared unchanged with prevalidation. */
export function detectLcwFromConfig(planConfig: unknown): boolean {
  const cfg = (planConfig ?? {}) as Record<string, unknown>;
  const goals = Array.isArray(cfg.raceGoals) ? (cfg.raceGoals as Array<Record<string, unknown>>) : [];
  const hasFlag = goals.some((g) => g?.raceFormat === "lcw_3day");
  if (hasFlag) return true;
  const names = [
    ...goals.map((g) => String(g?.raceName ?? "")),
    String(cfg.raceName ?? ""),
    String(cfg.objective ?? ""),
  ].filter(Boolean);
  return names.some((n) => /long\s*course\s*weekend|\blcw\b/i.test(n));
}

const MIN_BUILD_PEAK_WEEKS_IN_TAIL_CHUNK = 2;

export function computeLcwChunkSize(
  totalWeeks: number,
  standardChunkSize: number,
  inferPhase: (week: number, totalWeeks: number) => string,
): number {
  const buildOrPeakWeeks: number[] = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const phase = inferPhase(w, totalWeeks);
    if (phase === "build" || phase === "peak") buildOrPeakWeeks.push(w);
  }
  if (buildOrPeakWeeks.length === 0) return standardChunkSize;

  const bpStart = buildOrPeakWeeks[0];
  const bpEnd = buildOrPeakWeeks[buildOrPeakWeeks.length - 1];

  // Le DERNIER chunk (taille standard) touchant encore Build/Peak : c'est le
  // seul qui compte pour juger si le découpage standard suffit — peu importe
  // que des chunks antérieurs (plus longs, plan long) aient déjà offert de
  // bons checkpoints, si celui-ci est trop étroit pour caser encore 2
  // semaines Build/Peak distinctes, la génération peut buter dessus (bug
  // confirmé sur le plan "Vince", 7 semaines : dernier chunk touché = 1 seule
  // semaine Build/Peak, insuffisant pour 2 week-ends Peak).
  const lastTouchedChunkStart = Math.floor((bpEnd - 1) / standardChunkSize) * standardChunkSize + 1;
  const lastTouchedChunkEnd = Math.min(lastTouchedChunkStart + standardChunkSize - 1, totalWeeks);
  const buildPeakWeeksInLastChunk = buildOrPeakWeeks.filter(
    (w) => w >= lastTouchedChunkStart && w <= lastTouchedChunkEnd,
  ).length;

  if (buildPeakWeeksInLastChunk >= MIN_BUILD_PEAK_WEEKS_IN_TAIL_CHUNK) {
    return standardChunkSize;
  }

  // Chunk final insuffisant : réduit juste assez pour forcer un découpage
  // (fenêtre Build+Peak plus longue que le chunk réduit ⇒ ne peut plus tenir
  // dans un seul chunk, quel que soit l'alignement).
  const bpWindowLength = bpEnd - bpStart + 1;
  if (bpWindowLength < 2) return standardChunkSize; // fenêtre atomique, rien à répartir.
  return Math.max(1, Math.min(standardChunkSize - 1, bpWindowLength - 1));
}
