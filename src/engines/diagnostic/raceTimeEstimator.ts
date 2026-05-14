/**
 * Race Time Estimator (RAW)
 * ─────────────────────────
 * Dérive vVO2max, allure seuil, économie de course (CE) et indice de durabilité
 * à partir des derniers chronos connus de l'athlète (5K, 10K, 20K, semi, marathon).
 *
 * Modèles :
 *  • Riegel (1981) : T₂ = T₁ · (D₂/D₁)^1.06   → projection inter-distances
 *  • Daniels VDOT (Daniels' Running Formula 4e éd., Tableau 5.2 simplifié)
 *      vVO2max ≈ vitesse soutenue ~6 min · 1.00 ≈ vitesse 3 km
 *      VO2 (ml/kg/min) = -4.60 + 0.182258·v + 0.000104·v²   (v en m/min)
 *      %VO2max(t) = 0.8 + 0.1894·exp(-0.012778·t) + 0.2989·exp(-0.1932·t)
 *  • ACSM (2018) running : VO2 (ml/kg/min) = 0.2·v(m/min) + 3.5
 *  • Durabilité : ratio T_marathon / T_semi vs ratio Riegel attendu (≈ 2.10)
 *
 * SORTIES marquées RAW (estimations) — ne remplacent JAMAIS les données EFFECTIVES
 * (FIT, labo, capteur power). Source = "race_chrono".
 */

const RIEGEL_EXP = 1.06;

export type RaceChronos = {
  time_5k_sec?: number | null;
  time_10k_sec?: number | null;
  time_20k_sec?: number | null;
  time_half_sec?: number | null;
  time_marathon_sec?: number | null;
  // dates pour fraîcheur (optionnel)
  time_5k_date?: string | null;
  time_10k_date?: string | null;
  time_20k_date?: string | null;
  time_half_date?: string | null;
  time_marathon_date?: string | null;
};

const HALF_M = 21097.5;
const FULL_M = 42195;

const DIST_M: Record<string, number> = {
  time_5k_sec: 5000,
  time_10k_sec: 10000,
  time_20k_sec: 20000,
  time_half_sec: HALF_M,
  time_marathon_sec: FULL_M,
};

export type RaceTimeEstimate = {
  source: "race_chrono";
  reliability: "raw_high" | "raw_medium" | "raw_low";
  confidence: number; // 0..1
  reference: { distance_m: number; time_sec: number; pace_sec_km: number };
  /** vVO2max estimée en m/min (≈ vitesse soutenue 6 min) */
  vVO2max_m_min?: number;
  vVO2max_kmh?: number;
  /** Allure au seuil lactique (sec/km) */
  paceThreshold_sec_km?: number;
  /** Économie de course (mlO₂/kg/km) — ACSM cross-check */
  CE_mlO2_kg_km?: number;
  /** VO2max projetée (ml/kg/min) via Daniels VDOT depuis la meilleure perf courte */
  vo2max_estimated?: number;
  /** Indice de durabilité : ratio observé/attendu sur (semi → marathon).
   *  >1 = perte d'allure plus forte qu'attendue (durabilité faible).
   *  <1 = excellente durabilité.  null si données insuffisantes. */
  durabilityIndex?: number;
  durabilityLabel?: "excellent" | "bon" | "moyen" | "faible";
  notes: string[];
};

function pickReference(c: RaceChronos): { key: keyof RaceChronos; t: number; d: number } | null {
  // Préfère la course la plus courte disponible (plus proche vVO2max), pondère 5K>10K>20K>semi>marathon
  const order: (keyof RaceChronos)[] = ["time_5k_sec", "time_10k_sec", "time_20k_sec", "time_half_sec", "time_marathon_sec"];
  for (const k of order) {
    const v = c[k];
    if (typeof v === "number" && v > 0) return { key: k, t: v, d: DIST_M[k as string] };
  }
  return null;
}

function riegelTime(t1: number, d1: number, d2: number): number {
  return t1 * Math.pow(d2 / d1, RIEGEL_EXP);
}

/** Daniels: VO2 (ml/kg/min) à partir de la vitesse en m/min */
function danielsVO2(v_m_min: number): number {
  return -4.60 + 0.182258 * v_m_min + 0.000104 * v_m_min * v_m_min;
}

/** %VO2max soutenu pour une durée t (min) selon Daniels */
function pctVO2max(t_min: number): number {
  return 0.8 + 0.1894 * Math.exp(-0.012778 * t_min) + 0.2989 * Math.exp(-0.1932 * t_min);
}

/** ACSM running : VO2 (ml/kg/min) depuis vitesse en m/min */
function acsmVO2(v_m_min: number): number {
  return 0.2 * v_m_min + 3.5;
}

export function estimateFromRaceChronos(c: RaceChronos): RaceTimeEstimate | null {
  const ref = pickReference(c);
  if (!ref) return null;

  const v_m_min = ref.d / (ref.t / 60); // m/min
  const v_kmh = (ref.d / ref.t) * 3.6;
  const t_min = ref.t / 60;

  const notes: string[] = [];

  // VDOT : VO2max ≈ VO2 race / %VO2max soutenu
  const vo2_at_race = danielsVO2(v_m_min);
  const pct = pctVO2max(t_min);
  const vo2max = vo2_at_race / pct;

  // vVO2max via Daniels inverse (résolution num.) : vitesse pour VO2 = vo2max
  // -4.60 + 0.182258 v + 0.000104 v² = vo2max
  const a = 0.000104, b = 0.182258, cst = -4.60 - vo2max;
  const disc = b * b - 4 * a * cst;
  const v_vvo2 = disc > 0 ? (-b + Math.sqrt(disc)) / (2 * a) : v_m_min;

  // Allure seuil : ~88% vVO2max (Daniels T-pace ≈ 88%)
  const v_threshold_m_min = v_vvo2 * 0.88;
  const paceThreshold = 1000 / (v_threshold_m_min / 60); // sec/km

  // Économie de course (ACSM, à allure race) — proxy
  const CE = acsmVO2(v_m_min) / (v_m_min / 1000); // ml/kg/min ÷ km/min = ml/kg/km
  // Multiplie par durée pour avoir mlO2/kg/km via VO2 instantané : déjà en ml/kg/km

  // Durabilité : compare ratio marathon/semi à 2.10
  let durabilityIndex: number | undefined;
  let durabilityLabel: RaceTimeEstimate["durabilityLabel"];
  if (c.time_half_sec && c.time_marathon_sec) {
    const expected = riegelTime(c.time_half_sec, HALF_M, FULL_M); // sec
    const observed = c.time_marathon_sec;
    durabilityIndex = observed / expected; // 1 = neutre
    if (durabilityIndex <= 1.00) durabilityLabel = "excellent";
    else if (durabilityIndex <= 1.04) durabilityLabel = "bon";
    else if (durabilityIndex <= 1.08) durabilityLabel = "moyen";
    else durabilityLabel = "faible";
    notes.push(`Durabilité semi→marathon : ratio observé ${durabilityIndex.toFixed(3)} vs Riegel attendu (1.000).`);
  } else if (c.time_10k_sec && c.time_half_sec) {
    const expected = riegelTime(c.time_10k_sec, 10000, HALF_M);
    durabilityIndex = c.time_half_sec / expected;
    if (durabilityIndex <= 1.01) durabilityLabel = "excellent";
    else if (durabilityIndex <= 1.04) durabilityLabel = "bon";
    else if (durabilityIndex <= 1.08) durabilityLabel = "moyen";
    else durabilityLabel = "faible";
    notes.push(`Durabilité 10K→semi : ratio observé ${durabilityIndex.toFixed(3)}.`);
  }

  // Confiance : meilleur si ref courte ET au moins 2 chronos
  const nChronos = (Object.keys(DIST_M) as (keyof RaceChronos)[]).filter(k => typeof c[k] === "number" && (c[k] as number) > 0).length;
  let confidence = 0.55;
  if (ref.d <= 10000) confidence += 0.10;
  if (nChronos >= 2) confidence += 0.10;
  if (nChronos >= 3) confidence += 0.05;
  if (durabilityIndex != null) confidence += 0.05;
  confidence = Math.min(0.85, confidence);

  const reliability: RaceTimeEstimate["reliability"] =
    confidence >= 0.75 ? "raw_high" : confidence >= 0.6 ? "raw_medium" : "raw_low";

  notes.unshift(`Référence : ${(ref.d / 1000).toFixed(ref.d % 1000 === 0 ? 0 : 1)}K en ${Math.round(ref.t)}s (${(v_kmh).toFixed(2)} km/h).`);
  notes.push("Estimations Riegel + Daniels VDOT + ACSM. Données RAW — ne remplacent pas les mesures effectives.");

  return {
    source: "race_chrono",
    reliability,
    confidence: Number(confidence.toFixed(2)),
    reference: {
      distance_m: ref.d,
      time_sec: ref.t,
      pace_sec_km: Math.round(1000 / (v_m_min / 60)),
    },
    vVO2max_m_min: Math.round(v_vvo2),
    vVO2max_kmh: Number(((v_vvo2 / 1000) * 60).toFixed(2)),
    paceThreshold_sec_km: Math.round(paceThreshold),
    CE_mlO2_kg_km: Number(CE.toFixed(2)),
    vo2max_estimated: Number(vo2max.toFixed(1)),
    durabilityIndex: durabilityIndex != null ? Number(durabilityIndex.toFixed(3)) : undefined,
    durabilityLabel,
    notes,
  };
}
