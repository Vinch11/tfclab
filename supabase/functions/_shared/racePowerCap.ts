// ⚠️ MIROIR EXACT de src/lib/v2/racePowerCap.ts — toute modif doit être appliquée aux deux.
// Cap logarithmique IF vélo race par TTE (Coggan/Skiba/Karsten).

export type RaceBikeAmbition = "finisher" | "age_group" | "competitor" | "elite" | "world_class";

const BIKE_RACE_IF_BASELINE: Record<string, Record<RaceBikeAmbition, number>> = {
  im:  { finisher: 0.68, age_group: 0.72, competitor: 0.76, elite: 0.79, world_class: 0.81 },
  "703": { finisher: 0.74, age_group: 0.80, competitor: 0.83, elite: 0.86, world_class: 0.88 },
};

const K_PENALTY = 0.09;
const IF_FLOOR = 0.55;

export interface CapBikeRaceIFInput {
  objective: string;
  ambition: RaceBikeAmbition;
  tteMin: number | null;
  raceDurationMin?: number | null;
}

export interface CapBikeRaceIFResult {
  baselineIF: number;
  cappedIF: number;
  cappedPctFTP: number;
  overExposureRatio: number;
  wasCapped: boolean;
  rationale: string;
}

function normalizeObjective(obj: string): "im" | "703" | null {
  const s = obj.trim().toLowerCase().replace(/[\s\-_.]/g, "");
  if (s === "im" || s === "ironman" || s === "fullim") return "im";
  if (s === "703" || s.includes("703") || s.includes("halfironman") || s === "ims") return "703";
  return null;
}

function defaultRaceDurationMin(obj: "im" | "703", amb: RaceBikeAmbition): number {
  if (obj === "im") {
    return amb === "elite" || amb === "world_class" ? 270 : amb === "competitor" ? 300 : 330;
  }
  return amb === "elite" || amb === "world_class" ? 135 : amb === "competitor" ? 150 : 165;
}

export function capBikeRaceIF(input: CapBikeRaceIFInput): CapBikeRaceIFResult | null {
  const key = normalizeObjective(input.objective);
  if (!key) return null;

  const baseline = BIKE_RACE_IF_BASELINE[key][input.ambition] ?? BIKE_RACE_IF_BASELINE[key].age_group;
  const raceDur = input.raceDurationMin && input.raceDurationMin > 0
    ? input.raceDurationMin
    : defaultRaceDurationMin(key, input.ambition);

  if (input.tteMin == null || !Number.isFinite(input.tteMin) || input.tteMin <= 0) {
    return {
      baselineIF: baseline,
      cappedIF: baseline,
      cappedPctFTP: Math.round(baseline * 100),
      overExposureRatio: 0,
      wasCapped: false,
      rationale: `TTE non observée — IF baseline ${(baseline * 100).toFixed(0)}% FTP conservée. ⚠️ À réévaluer après test TTE (30-40min @ FTP).`,
    };
  }

  const ratio = raceDur / input.tteMin;
  let capped = baseline;
  if (ratio > 1) {
    const penalty = K_PENALTY * Math.log10(ratio);
    capped = Math.max(IF_FLOOR, baseline - penalty);
  }
  capped = Math.round(capped * 1000) / 1000;
  const cappedPct = Math.round(capped * 100);
  const wasCapped = baseline - capped >= 0.02;

  const rationale = wasCapped
    ? `TTE ${input.tteMin} min vs race ${raceDur} min (×${ratio.toFixed(1)}) → IF soutenable **${cappedPct}% FTP** (baseline ambition = ${(baseline * 100).toFixed(0)}%). Prescrire ${cappedPct - 2}-${cappedPct + 2}% FTP en race, PAS ${(baseline * 100).toFixed(0)}%. Sinon fade garanti (Coggan/Skiba).`
    : `TTE ${input.tteMin} min suffisante pour ${raceDur} min race → IF baseline ${cappedPct}% FTP OK.`;

  return {
    baselineIF: baseline,
    cappedIF: capped,
    cappedPctFTP: cappedPct,
    overExposureRatio: Number(ratio.toFixed(2)),
    wasCapped,
    rationale,
  };
}
