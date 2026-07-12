/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL RACE POWER CAP — Bornage de l'IF vélo course par la TTE observée
 *
 * Problème corrigé (audit Cath juillet 2026) :
 *   Le plan prescrit 82-85% FTP en race vélo 70.3/IM SANS consulter la TTE.
 *   Avec TTE = 35 min, tenir un IF 0.83 sur 2h30 est physiologiquement
 *   irréaliste (Coggan : IF soutenable ≈ fonction de la TTE).
 *
 * MODÈLE — Cap logarithmique (calibré Coggan/Skiba/Karsten) :
 *   IF_max(t) = IF_baseline − k · log10(raceDurationMin / tteMin)
 *   avec k = 0.09 (agressivité de la pénalité) et floor = 0.55.
 *
 * Références :
 *   - Coggan A. (2003) — Training and Racing with a Power Meter (IF/TSS).
 *   - Skiba P. (2012) — W'bal & durability modelling.
 *   - Karsten B. et al. (2017) — TTE au seuil comme prédicteur de tenue.
 *
 * PRINCIPE :
 *   Race duration <= TTE → aucune pénalité (IF baseline).
 *   Race duration = 2× TTE → −0.027 IF (~ −2.7% FTP).
 *   Race duration = 5× TTE → −0.063 IF (~ −6.3% FTP).
 *   Race duration = 10× TTE → −0.09 IF (~ −9% FTP).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type RaceBikeAmbition = "finisher" | "age_group" | "competitor" | "elite" | "world_class";

/**
 * IF baseline vélo course par (objectif × ambition).
 * Sources : deriveRaceTargets + coach TFCL (calibration N=40).
 */
const BIKE_RACE_IF_BASELINE: Record<string, Record<RaceBikeAmbition, number>> = {
  // Ironman full : durée moyenne 5-7h → IF 0.70-0.78
  im:  { finisher: 0.68, age_group: 0.72, competitor: 0.76, elite: 0.79, world_class: 0.81 },
  // 70.3 : durée 2h30-3h → IF 0.78-0.85
  "703": { finisher: 0.74, age_group: 0.80, competitor: 0.83, elite: 0.86, world_class: 0.88 },
};

const K_PENALTY = 0.09;
const IF_FLOOR = 0.55;

export interface CapBikeRaceIFInput {
  /** Objectif normalisé ("im" | "703" | autre → renvoie null) */
  objective: string;
  ambition: RaceBikeAmbition;
  /** TTE observée en minutes (bike). Si null → renvoie baseline sans pénalité + warning. */
  tteMin: number | null;
  /** Durée course cible (bike leg) en minutes. Si null → estimation par défaut. */
  raceDurationMin?: number | null;
}

export interface CapBikeRaceIFResult {
  /** IF baseline (sans considération TTE) */
  baselineIF: number;
  /** IF bornée par la TTE — valeur à prescrire */
  cappedIF: number;
  /** Correspondance en % FTP (× 100, entier) */
  cappedPctFTP: number;
  /** Ratio raceDur/tte utilisé pour le calcul */
  overExposureRatio: number;
  /** True si la TTE bride réellement l'IF (>2% écart) */
  wasCapped: boolean;
  /** Texte pédagogique prêt à injecter dans le prompt / UI */
  rationale: string;
}

function normalizeObjective(obj: string): "im" | "703" | null {
  const s = obj.trim().toLowerCase().replace(/[\s\-_.]/g, "");
  if (s === "im" || s === "ironman" || s === "fullim") return "im";
  if (s === "703" || s.includes("703") || s.includes("halfironman") || s === "ims") return "703";
  return null;
}

function defaultRaceDurationMin(obj: "im" | "703", amb: RaceBikeAmbition): number {
  // Durée BIKE LEG uniquement (pas la course entière).
  if (obj === "im") {
    return amb === "elite" || amb === "world_class" ? 270 : amb === "competitor" ? 300 : 330;
  }
  // 70.3
  return amb === "elite" || amb === "world_class" ? 135 : amb === "competitor" ? 150 : 165;
}

/**
 * Retourne l'IF vélo soutenable en race, bornée par la TTE observée.
 * Utilisable côté client ET côté edge function (Deno-safe : pas de dépendance externe).
 */
export function capBikeRaceIF(input: CapBikeRaceIFInput): CapBikeRaceIFResult | null {
  const key = normalizeObjective(input.objective);
  if (!key) return null;

  const baseline = BIKE_RACE_IF_BASELINE[key][input.ambition] ?? BIKE_RACE_IF_BASELINE[key].age_group;
  const raceDur = input.raceDurationMin && input.raceDurationMin > 0
    ? input.raceDurationMin
    : defaultRaceDurationMin(key, input.ambition);

  // Pas de TTE → renvoyer baseline avec warning
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
