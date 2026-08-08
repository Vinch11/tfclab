/**
 * RUN DURABILITY PROXY — TTE course estimé depuis les records d'allure longue
 * =========================================================================
 *
 * Objectif : combler le trou diagnostique côté course, où le TTE (durabilité)
 * n'est mesuré que par un test terrain rarement réalisé, alors que presque
 * tous les athlètes possèdent des chronos longs (5K → marathon).
 *
 * Modèle : loi de puissance de Riegel (1981)
 *     t = a · d^b       (t en s, d en m, b ≈ 1.06 chez l'athlète entraîné)
 * On en déduit la décroissance de la vitesse soutenable :
 *     v(t) = a^(-1/b) · t^(1/b − 1)     →  exposant α = 1/b − 1  (< 0)
 * Le TTE au seuil est le temps auquel la vitesse soutenable atteint la
 * vitesse seuil (MLSS / allure seuil) :
 *     TTE = ( v_seuil · a^(1/b) )^(1/α)
 *
 * Interprétation physiologique : plus b est proche de 1, plus la vitesse
 * décroit lentement avec la durée → durabilité élevée (Jones 2017 ; Maunder
 * 2021 « durability »). b élevé (≥ 1.10) = effondrement rapide = limiteur
 * durabilité.
 *
 * ⚠️ Ce module NE fabrique JAMAIS de valeur par défaut : sans au moins deux
 * distances suffisamment espacées, il renvoie `null` (politique "Insufficient
 * Data No Fake Defaults").
 */

import { supabase } from "@/integrations/supabase/client";

export interface RunRecordPoint {
  /** Distance en mètres */
  distanceM: number;
  /** Temps en secondes */
  timeSec: number;
  dateRecorded?: string | null;
}

export interface RunDurabilityProxy {
  /** TTE estimé au seuil, en minutes */
  tteMin: number;
  /** Exposant de Riegel (b). ~1.06 = référence entraîné */
  riegelB: number;
  /** Coefficient de détermination de la régression log-log */
  r2: number;
  /** Confiance 0–1 (nb de points, amplitude, qualité du fit, fraîcheur) */
  confidence: number;
  /** Vitesse seuil utilisée (m/s) */
  thresholdSpeedMps: number;
  /** Points retenus pour le fit */
  points: RunRecordPoint[];
  /** Qualitatif : durabilité relative déduite de b */
  durabilityLabel: "élevée" | "correcte" | "limitée";
  label: string;
}

const MIN_DISTANCE_M = 3000;
const PLAUSIBLE_MPS: [number, number] = [1.5, 8];
const TTE_CLAMP_MIN = 15;
const TTE_CLAMP_MAX = 180;

/**
 * Régression log-log ln(t) = ln(a) + b·ln(d)
 */
function fitRiegel(points: RunRecordPoint[]): { a: number; b: number; r2: number } | null {
  const n = points.length;
  if (n < 2) return null;
  const xs = points.map((p) => Math.log(p.distanceM));
  const ys = points.map((p) => Math.log(p.timeSec));
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  if (sxx <= 0) return null;
  const b = sxy / sxx;
  const lnA = my - b * mx;
  // R²
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = lnA + b * xs[i];
    ssRes += (ys[i] - pred) ** 2;
    ssTot += (ys[i] - my) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : n === 2 ? 1 : 0;
  return { a: Math.exp(lnA), b, r2 };
}

/**
 * Calcule le proxy de durabilité course.
 *
 * @param records  chronos longs (≥ 3 km) de l'athlète
 * @param thresholdSpeedMps vitesse au seuil (m/s). Dérivée de
 *        `pace_threshold_sec_per_km` (1000 / pace) ou de la VMA (0.90 × VMA).
 */
export function computeRunDurabilityProxy(
  records: RunRecordPoint[],
  thresholdSpeedMps: number | null,
): RunDurabilityProxy | null {
  if (!thresholdSpeedMps || thresholdSpeedMps <= 0) return null;

  // Nettoyage : distances longues, vitesses plausibles, meilleur temps par distance
  const byDist = new Map<number, RunRecordPoint>();
  for (const r of records) {
    if (!Number.isFinite(r.distanceM) || r.distanceM < MIN_DISTANCE_M) continue;
    if (!Number.isFinite(r.timeSec) || r.timeSec <= 0) continue;
    const mps = r.distanceM / r.timeSec;
    if (mps < PLAUSIBLE_MPS[0] || mps > PLAUSIBLE_MPS[1]) continue;
    const prev = byDist.get(r.distanceM);
    if (!prev || r.timeSec < prev.timeSec) byDist.set(r.distanceM, r);
  }
  const points = [...byDist.values()].sort((a, b) => a.distanceM - b.distanceM);
  if (points.length < 2) return null;

  // Amplitude minimale : facteur 2 entre la plus courte et la plus longue
  const span = points[points.length - 1].distanceM / points[0].distanceM;
  if (span < 2) return null;

  const fit = fitRiegel(points);
  if (!fit) return null;
  const { a, b, r2 } = fit;
  // Garde-fou physiologique : b hors [1.00, 1.20] = données incohérentes
  if (!Number.isFinite(b) || b < 1.0 || b > 1.2) return null;

  const alpha = 1 / b - 1; // < 0
  if (alpha >= 0) return null;
  const tteSec = Math.pow(thresholdSpeedMps * Math.pow(a, 1 / b), 1 / alpha);
  if (!Number.isFinite(tteSec) || tteSec <= 0) return null;
  const tteMin = Math.round(Math.min(TTE_CLAMP_MAX, Math.max(TTE_CLAMP_MIN, tteSec / 60)));

  // Confiance : base 0.55, bonus points / amplitude / fit / fraîcheur
  let confidence = 0.55;
  if (points.length >= 3) confidence += 0.08;
  if (points.length >= 4) confidence += 0.05;
  if (span >= 4) confidence += 0.05;
  if (r2 >= 0.99) confidence += 0.07;
  else if (r2 >= 0.97) confidence += 0.04;
  const dates = points.map((p) => p.dateRecorded).filter(Boolean) as string[];
  if (dates.length > 0) {
    const newest = dates.sort().at(-1)!;
    const months = (Date.now() - new Date(newest).getTime()) / (1000 * 60 * 60 * 24 * 30.4);
    if (months <= 6) confidence += 0.05;
    else if (months > 18) confidence -= 0.1;
  }
  confidence = Math.max(0.3, Math.min(0.85, Number(confidence.toFixed(2))));

  const durabilityLabel: RunDurabilityProxy["durabilityLabel"] =
    b <= 1.05 ? "élevée" : b <= 1.09 ? "correcte" : "limitée";

  return {
    tteMin,
    riegelB: Number(b.toFixed(4)),
    r2: Number(r2.toFixed(3)),
    confidence,
    thresholdSpeedMps,
    points,
    durabilityLabel,
    label: `~${tteMin} min (chronos, b=${b.toFixed(3)})`,
  };
}

/**
 * Convertit une allure seuil (s/km) ou une VMA (km/h) en vitesse seuil (m/s).
 * Priorité à l'allure seuil mesurée ; fallback VMA × 0.90 (MLSS ≈ 90 % VMA).
 */
export function resolveThresholdSpeedMps(
  paceThresholdSecPerKm: number | null | undefined,
  vmaKmh: number | null | undefined,
): number | null {
  if (paceThresholdSecPerKm && paceThresholdSecPerKm > 0) return 1000 / paceThresholdSecPerKm;
  if (vmaKmh && vmaKmh > 0) return (vmaKmh * 0.9) / 3.6;
  return null;
}

/**
 * Récupère les chronos longs course depuis `nolio_records`.
 * ⚠️ Unités Nolio : `item_seconds` = distance (m), `value` = VITESSE (m/s).
 */
export async function fetchRunLongRecords(
  athleteId: string,
  windowMonths: number | null = 18,
): Promise<RunRecordPoint[]> {
  if (!athleteId) return [];
  let q = supabase
    .from("nolio_records")
    .select("item_seconds, value, date_recorded")
    .eq("athlete_id", athleteId)
    .in("sport_id", [2, 24])
    .eq("cat", "par")
    .eq("record_type", "distance")
    .gte("item_seconds", MIN_DISTANCE_M);

  if (windowMonths && windowMonths > 0) {
    const since = new Date();
    since.setMonth(since.getMonth() - windowMonths);
    q = q.gte("date_recorded", since.toISOString().slice(0, 10));
  }

  const { data, error } = await q;
  if (error || !data) return [];

  const out: RunRecordPoint[] = [];
  for (const row of data as Array<{ item_seconds: number; value: number | string; date_recorded: string | null }>) {
    const d = Number(row.item_seconds);
    const mps = Number(row.value);
    if (!Number.isFinite(d) || d <= 0) continue;
    if (!Number.isFinite(mps) || mps <= 0) continue;
    out.push({ distanceM: d, timeSec: d / mps, dateRecorded: row.date_recorded });
  }
  return out;
}
