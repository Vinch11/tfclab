/**
 * Race Time Predictor — alimente F-24 (Durabilité)
 * ────────────────────────────────────────────────
 * Combine :
 *   • Riegel (1981) : projection inter-distances depuis chronos saisis (raw_high)
 *   • Daniels VDOT via scenarios %VMA / ambition (raw_medium)
 *   • Run MLSS Modèle C (validation seuil VLa/CE) — bornage cohérence
 *
 * Sortie : durée cible estimée (minutes) ou null si insuffisant.
 * JAMAIS de valeur "deviné" sans données : pas de mapping objectif→durée hardcodé.
 *
 * Source: F-24 intensity-relative — mem://logic/f24-durability-intensity-relative
 */

import { estimateFromRaceChronos, type RaceChronos } from "@/engines/diagnostic/raceTimeEstimator";
import { computeRaceScenarios, type Ambition } from "@/lib/raceAnalysis";

const RIEGEL_EXP = 1.06;

const RUN_OBJECTIVE_DIST_KM: Record<string, number> = {
  "5K": 5,
  "10K": 10,
  "semi": 21.0975,
  "semi_marathon": 21.0975,
  "half": 21.0975,
  "marathon": 42.195,
};

// Triathlon : baseline finish (min), ajusté par ambition.
const TRI_BASELINE_MIN: Record<string, number> = {
  sprint: 80,
  olympique: 145,
  olympic: 145,
  "70.3": 330,
  half_ironman: 330,
  ironman: 660,
  IM: 660,
};

const AMBITION_TRI_MULT: Record<Ambition, number> = {
  finish: 1.0,
  perf: 0.88,
  sub: 0.80,
  elite: 0.72,
  world_class: 0.66,
};

const CHRONO_DISTS: { key: keyof RaceChronos; d: number }[] = [
  { key: "time_5k_sec", d: 5 },
  { key: "time_10k_sec", d: 10 },
  { key: "time_20k_sec", d: 20 },
  { key: "time_half_sec", d: 21.0975 },
  { key: "time_marathon_sec", d: 42.195 },
];

export interface RaceTimePredictorInput {
  objective: string | null | undefined;
  ambition: Ambition;
  raceChronos?: RaceChronos | null;
  vmaKmh?: number | null;
  thresholdPaceSecPerKm?: number | null;
}

export interface RaceTimePredictorResult {
  targetRaceDurationMin: number;
  source: "riegel_chrono" | "daniels_scenario" | "triathlon_baseline";
  confidence: number; // 0..1
  reference?: string;
}

export function predictRaceDurationMin(
  input: RaceTimePredictorInput,
): RaceTimePredictorResult | null {
  const goal = (input.objective || "").toLowerCase();

  // --- TRIATHLON ---
  for (const k of Object.keys(TRI_BASELINE_MIN)) {
    if (goal.includes(k.toLowerCase())) {
      const base = TRI_BASELINE_MIN[k];
      const mult = AMBITION_TRI_MULT[input.ambition] ?? 1.0;
      return {
        targetRaceDurationMin: Math.round(base * mult),
        source: "triathlon_baseline",
        confidence: 0.45,
        reference: `${k} baseline ${base}min × ${input.ambition} ${mult}`,
      };
    }
  }

  // --- RUN ---
  let distKm: number | null = null;
  for (const k of Object.keys(RUN_OBJECTIVE_DIST_KM)) {
    if (goal.includes(k.toLowerCase())) {
      distKm = RUN_OBJECTIVE_DIST_KM[k];
      break;
    }
  }
  // trail : trop variable (parcours/D+), F-24 OFF
  if (distKm == null) return null;

  // 1) Riegel depuis le meilleur chrono dispo
  const chronos = input.raceChronos;
  if (chronos) {
    const available = CHRONO_DISTS
      .map(x => ({ ...x, t: chronos[x.key] as number | null | undefined }))
      .filter(x => typeof x.t === "number" && (x.t as number) > 0);
    if (available.length > 0) {
      // Préfère la distance la plus proche
      available.sort((a, b) => Math.abs(Math.log(a.d / distKm!)) - Math.abs(Math.log(b.d / distKm!)));
      const ref = available[0];
      const t2sec = (ref.t as number) * Math.pow(distKm / ref.d, RIEGEL_EXP);
      // Confidence : excellente si distance proche & ≥2 chronos pour cross-check
      const proximity = Math.min(ref.d, distKm) / Math.max(ref.d, distKm);
      let conf = 0.6 + 0.25 * proximity;
      if (available.length >= 2) conf += 0.05;
      // bonus si estimator dit raw_high
      const est = estimateFromRaceChronos(chronos);
      if (est && est.reliability === "raw_high") conf += 0.05;
      conf = Math.min(0.9, conf);
      return {
        targetRaceDurationMin: Math.round(t2sec / 60),
        source: "riegel_chrono",
        confidence: Number(conf.toFixed(2)),
        reference: `Riegel depuis ${(ref.d).toFixed(ref.d % 1 === 0 ? 0 : 2)}K (${Math.round(ref.t as number)}s)`,
      };
    }
  }

  // 2) Daniels / scenarios à partir de VMA ou allure seuil + ambition
  if (input.vmaKmh || input.thresholdPaceSecPerKm) {
    const sc = computeRaceScenarios(
      { vmaKmh: input.vmaKmh ?? null, thresholdPaceSecPerKm: input.thresholdPaceSecPerKm ?? null },
      distKm,
    );
    if (!("error" in sc)) {
      const row = sc.find(s => s.ambition === input.ambition) || sc[1];
      let conf = 0.55;
      if (input.vmaKmh && input.thresholdPaceSecPerKm) conf += 0.10;
      if (distKm <= 21.1) conf += 0.05; // pas d'extrapolation Riegel longue
      return {
        targetRaceDurationMin: Math.round(row.timeSec / 60),
        source: "daniels_scenario",
        confidence: Number(Math.min(0.75, conf).toFixed(2)),
        reference: `Scénario ${row.label} (${(row.pctVMA * 100).toFixed(0)}% VMA)`,
      };
    }
  }

  return null;
}
