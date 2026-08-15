/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTIMATEUR DE SPLIT VÉLO TFCL™
 *
 * Remplace les baselines forfaitaires (300 min IM / 150 min 70.3 ≈ 36 km/h pour
 * tout le monde, très optimiste) par un modèle physique simple :
 *
 *   P_roue = 0.5·ρ·CdA·v³ + Crr·m·g·v          (plat, sans vent)
 *   P_compteur = P_roue / rendement transmission
 *
 * Entrées : FTP, poids, ambition, distance. Sortie : durée + vitesse moyenne.
 * Aucun fake : si FTP ou poids manquent → null (le caller garde son fallback).
 *
 * Références : Martin et al. 1998 (modèle de puissance cycliste),
 * Coggan/Allen (fractions de FTP en course longue distance).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type BikeAmbition = "finisher" | "age_group" | "competitor" | "elite";

const RHO = 1.225;        // kg/m³ — air au niveau de la mer, ~15 °C
const G = 9.81;
const CRR = 0.005;        // pneus route corrects sur asphalte
const DRIVETRAIN = 0.975; // rendement transmission
const BIKE_KIT_KG = 9;    // vélo + casque + bidons + nutrition

/** Fraction de FTP soutenable (NP) selon la durée du segment et l'ambition. */
function ftpFraction(distanceKm: number, ambition: BikeAmbition): number {
  const long = distanceKm >= 140; // Ironman
  const base = long
    ? { finisher: 0.62, age_group: 0.66, competitor: 0.70, elite: 0.74 }
    : { finisher: 0.70, age_group: 0.75, competitor: 0.79, elite: 0.83 };
  return base[ambition] ?? base.age_group;
}

/**
 * CdA estimé selon la position ET le niveau (un age-grouper n'a ni la position ni
 * le matériel d'un pro : 0.24 m² est un CdA de niveau élite, pas une valeur par défaut).
 * Mise à l'échelle sur la masse corporelle (surface frontale ∝ masse^0.425).
 * Réf. : Martin 1998 ; Barry 2015 (mesures terrain age-group 0.28–0.32 en prolongateur).
 */
function estimateCdA(weightKg: number, position: "tri" | "road", ambition: BikeAmbition): number {
  const refTri: Record<BikeAmbition, number> = {
    finisher: 0.315, age_group: 0.290, competitor: 0.265, elite: 0.240,
  };
  const refRoad: Record<BikeAmbition, number> = {
    finisher: 0.390, age_group: 0.360, competitor: 0.335, elite: 0.310,
  };
  const ref = (position === "tri" ? refTri : refRoad)[ambition] ?? (position === "tri" ? 0.29 : 0.36);
  const scaled = ref * Math.pow(weightKg / 72, 0.425);
  return Math.min(position === "tri" ? 0.38 : 0.46, Math.max(0.21, scaled));
}


/** Résout v (m/s) tel que la puissance modèle = puissance cible (bissection). */
function solveSpeed(powerW: number, massKg: number, cda: number, gradeFactor: number): number {
  const target = powerW * DRIVETRAIN;
  const f = (v: number) =>
    0.5 * RHO * cda * v * v * v + CRR * massKg * G * v - target * gradeFactor;
  let lo = 1, hi = 25;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

export interface BikeSplitEstimate {
  durationMin: number;
  avgSpeedKmh: number;
  targetNpW: number;
  ftpFraction: number;
  cda: number;
  note: string;
}

export function estimateBikeSplit(params: {
  distanceKm: number;
  ftp: number | null | undefined;
  weightKg: number | null | undefined;
  ambition?: BikeAmbition;
  /** Position : triathlon (prolongateur) par défaut sur IM / 70.3 / LCW. */
  position?: "tri" | "road";
  /** Perte liée au parcours (dénivelé, relances, virages, vent). 1 = plat parfait. */
  terrainFactor?: number;
}): BikeSplitEstimate | null {
  const { distanceKm, ftp, weightKg } = params;
  if (!ftp || ftp <= 0 || !weightKg || weightKg <= 0 || !distanceKm || distanceKm <= 0) {
    return null;
  }
  const ambition = params.ambition ?? "age_group";
  const position = params.position ?? "tri";
  const terrain = params.terrainFactor ?? 0.93; // parcours réel, pas une piste

  const frac = ftpFraction(distanceKm, ambition);
  const np = ftp * frac;
  const cda = estimateCdA(weightKg, position);
  const mass = weightKg + BIKE_KIT_KG;

  const v = solveSpeed(np, mass, cda, terrain);
  const speedKmh = v * 3.6;
  const durationMin = (distanceKm / speedKmh) * 60;

  return {
    durationMin: Math.round(durationMin),
    avgSpeedKmh: Math.round(speedKmh * 10) / 10,
    targetNpW: Math.round(np),
    ftpFraction: frac,
    cda: Math.round(cda * 1000) / 1000,
    note: `NP ${Math.round(np)} W (${Math.round(frac * 100)} % FTP) · ${Math.round(speedKmh * 10) / 10} km/h estimés en conditions optimales`,
  };
}
