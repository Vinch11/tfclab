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
import { estimateBikeSplit } from "@/lib/v2/bikeSplitEstimator";
import { estimateRunSplitMin, V_SEUIL_FRACTION_BY_AMBITION, type RunSplitAmbition } from "@/lib/v2/runSplitEstimator";

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

/**
 * Correspondance vers le palier d'ambition à 4 niveaux (finisher/age_group/
 * competitor/elite) utilisé par estimateBikeSplit et estimateRunSplitMin —
 * même palier que sessionSizingMatrix.ts::normalizeSizingAmbition (world_class
 * collapse sur elite).
 */
function toVSeuilAmbition(ambition: Ambition): RunSplitAmbition {
  switch (ambition) {
    case "finish": return "finisher";
    case "perf": return "age_group";
    case "sub": return "competitor";
    case "elite":
    case "world_class":
      return "elite";
    default:
      return "age_group";
  }
}

/**
 * Splits fixes (swim + T1 + T2, minutes) par format — mêmes valeurs que
 * TriathlonFullRaceSimulationCard.tsx (déjà validées/affichées au coach dans
 * "Simulation de course"). Non personnalisés par CSS natation : le swim ne
 * pèse qu'~7-10% du temps total IM/70.3, une bien plus petite source d'erreur
 * que l'ancienne baseline forfaitaire vélo+course qui pesait ~90% du temps.
 */
const TRI_FIXED_SPLITS_MIN: Record<"IM" | "70.3", { swim: number; t1: number; t2: number; bikeKm: number; runKm: number }> = {
  IM: { swim: 65, t1: 6, t2: 4, bikeKm: 180.2, runKm: 42.195 },
  "70.3": { swim: 33, t1: 3, t2: 2, bikeKm: 90.1, runKm: 21.0975 },
};

/**
 * Estimation physiologique (FTP + allure seuil réels) du temps total IM/70.3
 * — remplace la baseline "ambition_baseline" forfaitaire (identique pour tout
 * le monde à ambition égale) quand les données nécessaires sont disponibles.
 * Portée volontairement limitée à IM/70.3 : ce sont les 2 seuls formats dotés
 * de splits swim/T1/T2 fixes déjà établis dans l'app (TriathlonFullRace
 * SimulationCard) ; Sprint/Olympique restent sur la baseline forfaitaire
 * (fix "temps course triathlon", audit "rapport staff").
 */
function estimateTriathlonPhysioMin(
  format: "IM" | "70.3",
  input: RaceTimePredictorInput,
): { totalMin: number; confidence: number } | null {
  const splits = TRI_FIXED_SPLITS_MIN[format];
  const bike = estimateBikeSplit({
    distanceKm: splits.bikeKm,
    ftp: input.ftp,
    weightKg: input.weightKg,
    ambition: toVSeuilAmbition(input.ambition),
    position: "tri",
  });
  if (!bike) return null;

  const durabilityIndex = input.raceChronos ? estimateFromRaceChronos(input.raceChronos)?.durabilityIndex ?? null : null;
  const vSeuilFraction = V_SEUIL_FRACTION_BY_AMBITION[toVSeuilAmbition(input.ambition)][format === "IM" ? "full" : "half"];
  const runMin = estimateRunSplitMin({
    distanceKm: splits.runKm,
    thresholdPaceSecPerKm: input.thresholdPaceSecPerKm,
    vSeuilFraction,
    vlamaxRun: input.vlamaxRun,
    durabilityIndex,
  });
  if (runMin == null) return null;

  const totalMin = splits.swim + splits.t1 + bike.durationMin + splits.t2 + runMin;
  // Base 0.65 (modèle physique validé, pas un lookup) + bonus si signaux
  // supplémentaires réellement mesurés disponibles — jamais > 0.8 (le swim
  // reste forfaitaire, cf. commentaire TRI_FIXED_SPLITS_MIN).
  let confidence = 0.65;
  if (durabilityIndex != null) confidence += 0.05;
  if (input.vlamaxRun != null) confidence += 0.05;
  return { totalMin: Math.round(totalMin), confidence: Math.min(0.8, confidence) };
}

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
  /** FTP (W) — nécessaire à l'estimation physiologique du split vélo IM/70.3. */
  ftp?: number | null;
  /** Poids (kg) — idem. */
  weightKg?: number | null;
  /** VLamax course (pas vélo) — pénalité vSeuil si profil glycolytique. */
  vlamaxRun?: number | null;
}

export interface RaceTimePredictorResult {
  targetRaceDurationMin: number;
  source: "riegel_chrono" | "daniels_scenario" | "triathlon_baseline" | "triathlon_physio_split";
  confidence: number; // 0..1
  reference?: string;
}

// Formats dotés d'une estimation physiologique (FTP + allure seuil) —
// cf. estimateTriathlonPhysioMin. Les autres clés de TRI_BASELINE_MIN
// (sprint, olympique/olympic) restent sur la baseline forfaitaire.
const TRI_PHYSIO_FORMAT_BY_KEY: Record<string, "IM" | "70.3"> = {
  "70.3": "70.3",
  half_ironman: "70.3",
  ironman: "IM",
  IM: "IM",
};

export function predictRaceDurationMin(
  input: RaceTimePredictorInput,
): RaceTimePredictorResult | null {
  const goal = (input.objective || "").toLowerCase();

  // --- TRIATHLON ---
  for (const k of Object.keys(TRI_BASELINE_MIN)) {
    if (goal.includes(k.toLowerCase())) {
      // Fix "temps course triathlon" (audit "rapport staff") : avant ce fix,
      // TOUT objectif triathlon retombait sur une baseline forfaitaire
      // identique pour tout le monde à ambition égale (330min × mult pour un
      // 70.3, par ex.) — ignorant FTP/poids/allure seuil réels de l'athlète,
      // pourtant déjà exploités partout ailleurs dans l'app (Simulation de
      // course). Pour IM/70.3, on tente d'abord le split physiologique réel ;
      // la baseline forfaitaire ne sert plus que de repli si FTP/poids/allure
      // seuil manquent, ou pour Sprint/Olympique (hors périmètre du fix).
      const physioFormat = TRI_PHYSIO_FORMAT_BY_KEY[k];
      if (physioFormat) {
        const physio = estimateTriathlonPhysioMin(physioFormat, input);
        if (physio) {
          return {
            targetRaceDurationMin: physio.totalMin,
            source: "triathlon_physio_split",
            confidence: physio.confidence,
            reference: `Split physiologique ${physioFormat} (FTP ${input.ftp}W, allure seuil réelle)`,
          };
        }
      }
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
