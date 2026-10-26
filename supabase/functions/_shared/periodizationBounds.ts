/** Existing prompt periodization arithmetic, shared without changing its rules. */
export type PeriodizationPhase = "base" | "build" | "peak" | "taper";
export function periodizationBounds(tw: number, taper: number, isFinisher: boolean, primaryLimiter: string,
  fondationWeeksOverride?: number) {
  const taperWeeks = Math.max(1, taper);
  const targetRaceSpecific = isFinisher ? 0 : Math.min(4, Math.max(2, Math.floor(tw * 0.15)));
  const raceSpecificWeeks = Math.max(0, Math.min(targetRaceSpecific, tw - taperWeeks - 2));
  const remainingWeeks = Math.max(2, tw - taperWeeks - raceSpecificWeeks);
  const isVlamaxLimiter = /vlamax|glycoly|anaerob/i.test(primaryLimiter);
  const isDurabilityLimiter = /durabilit|tte|endurance|fatmax|lipid/i.test(primaryLimiter);
  const isEconomyLimiter = /econom|technique|cadence|biom[ée]can/i.test(primaryLimiter);
  const isVo2maxLimiter = /vo2max/i.test(primaryLimiter);
  const fondationPct = isEconomyLimiter ? 0.42 : isVlamaxLimiter || isDurabilityLimiter ? 0.30 : 0.35;
  let fondationWeeks = typeof fondationWeeksOverride === "number" && fondationWeeksOverride > 0
    ? Math.max(1, Math.min(fondationWeeksOverride, remainingWeeks - 1))
    : Math.max(1, Math.floor(remainingWeeks * fondationPct));
  let buildWeeks = remainingWeeks - fondationWeeks;
  if (buildWeeks < 1) { buildWeeks = 1; fondationWeeks = Math.max(1, remainingWeeks - 1); }
  return { taperWeeks, raceSpecificWeeks, fondationWeeks, buildWeeks, isVlamaxLimiter, isDurabilityLimiter, isEconomyLimiter, isVo2maxLimiter };
}
export function phaseWithinPeriodization(localWeek: number, bounds: ReturnType<typeof periodizationBounds>): PeriodizationPhase {
  if (localWeek <= bounds.fondationWeeks) return "base";
  if (localWeek <= bounds.fondationWeeks + bounds.buildWeeks) return "build";
  if (localWeek <= bounds.fondationWeeks + bounds.buildWeeks + bounds.raceSpecificWeeks) return "peak";
  return "taper";
}
export function reducedFondationWeeksPostPeak(segmentWeeks: number): number {
  return Math.max(2, Math.min(3, Math.max(2, Math.round(segmentWeeks * 0.35)), 6));
}
