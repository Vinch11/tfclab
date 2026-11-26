// ============================================================================
// PUISSANCE VÉLO DU JOUR DE COURSE — SOURCE UNIQUE (simulation, plans, rapports)
// Partagé client (re-export src/lib/raceSimulation/raceBikePower.ts) et Deno.
// ----------------------------------------------------------------------------
// Pourquoi (26/11/2026) : la cible était un % de FTP fixe par distance (IM 76 %)
// dans la table des zones, une autre valeur (baseline d'ambition bornée TTE)
// dans les prompts du plan, et aucun watt dans la simulation. Un même athlète
// recevait trois cibles différentes.
//
// MODÈLE
// 1. Durée vélo : temps observé (course réelle) > modèle de vitesse (puissance,
//    poids, position selon l'ambition, conditions réelles) > durée type par
//    ambition (sans poids). La durée dépend de la puissance et la part de FTP
//    tenable dépend de la durée : on itère jusqu'à stabilité.
// 2. Charge totale du vélo (TSS = heures × IF² × 100 ; Coggan 2003) : fourchette
//    par distance permettant de bien courir ensuite (pratique Ironman/70.3 :
//    ≈ 260–300 TSS IM, 170–200 70.3, 85–105 olympique), bas de fourchette pour finisher/age-group,
//    haut pour compétiteur et plus. IF = √(TSS / (100 × heures)).
// 3. Bornes : plafond d'IF par distance et ambition (capBikeRaceIF, bornage par la
//    TTE observée, Coggan/Skiba/Karsten) — la plus basse des deux limites gagne.
// Les zones d'entraînement (grille ancrée sur la CP) ne dépendent pas de ce calcul.
// ============================================================================

import { capBikeRaceIF, type CapBikeRaceIFResult, type RaceBikeAmbition } from "./racePowerCap.ts";

export type RaceBikeDistance = "im" | "703" | "olympic" | "sprint";

const BIKE_KM: Record<RaceBikeDistance, number> = { im: 180, "703": 90, olympic: 40, sprint: 20 };
/** [bas, milieu, haut] de la charge vélo visée (TSS). */
const TSS: Record<RaceBikeDistance, [number, number, number]> = {
  im: [260, 280, 300], "703": [170, 185, 200], olympic: [85, 95, 105], sprint: [50, 55, 60],
};
/** Plafond d'IF par distance (au-delà : course à pied compromise, même pour un élite). */
const IF_CEILING: Record<RaceBikeDistance, number> = { im: 0.82, "703": 0.88, olympic: 0.95, sprint: 1.02 };
/** Durée vélo type (h) quand le poids manque. */
const TYPICAL_HOURS: Record<RaceBikeDistance, Record<RaceBikeAmbition, number>> = {
  im: { finisher: 7, age_group: 6.25, competitor: 5.5, elite: 4.9, world_class: 4.4 },
  "703": { finisher: 3.3, age_group: 3, competitor: 2.7, elite: 2.4, world_class: 2.2 },
  olympic: { finisher: 1.4, age_group: 1.25, competitor: 1.1, elite: 1, world_class: 0.95 },
  sprint: { finisher: 0.75, age_group: 0.65, competitor: 0.58, elite: 0.52, world_class: 0.48 },
};
// Modèle de vitesse : MÊME physique que src/lib/v2/bikeSplitEstimator.ts (Martin et al. 1998 ;
// CdA triathlon par niveau, Barry 2015) — un test vérifie que les deux donnent la même durée.
/** CdA en position triathlon d'un athlète de 72 kg selon le niveau, × (poids/72)^0,425. */
const CDA_TRI_72KG: Record<RaceBikeAmbition, number> = { finisher: 0.315, age_group: 0.29, competitor: 0.265, elite: 0.24, world_class: 0.24 };
const BIKE_KG = 9, CRR = 0.005, RHO = 1.225, G = 9.81, DRIVETRAIN = 0.975;
/** Parcours réel (relances, virages, ravitaillements, vent, léger dénivelé) : 90 % de la puissance utile sur plat parfait. */
const TERRAIN = 0.9;

const AMBITIONS: RaceBikeAmbition[] = ["finisher", "age_group", "competitor", "elite", "world_class"];
const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

export function raceBikeDistanceKey(objective: string | null | undefined): RaceBikeDistance | null {
  const s = String(objective ?? "").trim().toLowerCase().replace(/[\s\-_.]/g, "");
  if (!s) return null;
  if (s === "im" || s === "ironman" || s === "fullim" || (s.includes("ironman") && !s.includes("70") && !s.includes("half"))) return "im";
  if (s.includes("703") || s.includes("halfironman") || s === "ims") return "703";
  if (s.includes("olymp") || s === "od" || s === "m") return "olympic";
  if (s.includes("sprint") || s === "s") return "sprint";
  return null;
}

export function normalizeRaceAmbition(ambition: string | null | undefined): RaceBikeAmbition {
  const a = String(ambition ?? "").trim().toLowerCase().replace(/[\s-]/g, "_");
  return (AMBITIONS as string[]).includes(a) ? a as RaceBikeAmbition : "age_group";
}

/** Vitesse de course (km/h) pour une puissance, un poids et une ambition, parcours réel compris. */
export function raceBikeSpeedKmh(powerW: number, riderKg: number, ambition: RaceBikeAmbition): number {
  const mass = riderKg + BIKE_KG;
  const cda = Math.min(0.38, Math.max(0.21, CDA_TRI_72KG[ambition] * Math.pow(riderKg / 72, 0.425)));
  const p = powerW * DRIVETRAIN * TERRAIN;
  let lo = 1, hi = 25;
  for (let i = 0; i < 60; i++) {
    const v = (lo + hi) / 2;
    const need = 0.5 * RHO * cda * v ** 3 + CRR * mass * G * v;
    if (need > p) hi = v; else lo = v;
  }
  return ((lo + hi) / 2) * 3.6;
}

export interface RaceBikePowerInput {
  objective: string | null | undefined;
  ambition: string | null | undefined;
  ftpW: number | null | undefined;
  weightKg?: number | null;
  /** TTE vélo observée (min) : borne l'IF (capBikeRaceIF). */
  tteMin?: number | null;
  /** Temps vélo réel sur une course comparable (h) : remplace le modèle de vitesse. */
  observedBikeHours?: number | null;
}

export interface RaceBikePowerResult {
  distance: RaceBikeDistance;
  ambition: RaceBikeAmbition;
  rangeW: [number, number];
  centerW: number;
  ifRange: [number, number];
  centerIF: number;
  bikeHours: number;
  tssRange: [number, number];
  durationMethod: "observed" | "model" | "typical";
  /** Ce qui fixe le haut de la fourchette : la charge visée, le plafond de distance ou la TTE. */
  limitedBy: "tss" | "ceiling" | "tte";
  cap: CapBikeRaceIFResult | null;
  /** Explication en français simple (rapports, simulation, prompts). */
  explanation: string;
}

const fmtH = (h: number) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`; };
const pct = (x: number) => `${Math.round(x * 100)} %`;

export function raceBikePower(input: RaceBikePowerInput): RaceBikePowerResult | null {
  const distance = raceBikeDistanceKey(input.objective);
  if (!distance || !positive(input.ftpW)) return null;
  const ftp = input.ftpW;
  const ambition = normalizeRaceAmbition(input.ambition);
  const [tLow, tMid, tHigh] = TSS[distance];
  const ambitious = ambition === "competitor" || ambition === "elite" || ambition === "world_class";
  const tssRange: [number, number] = ambitious ? [tMid, tHigh] : [tLow, tMid];
  const tssCenter = (tssRange[0] + tssRange[1]) / 2;
  const km = BIKE_KM[distance];

  // Durée : observée, sinon modèle de vitesse (boucle puissance ↔ durée), sinon durée type.
  let hours: number;
  let durationMethod: RaceBikePowerResult["durationMethod"];
  if (positive(input.observedBikeHours)) { hours = input.observedBikeHours; durationMethod = "observed"; }
  else if (positive(input.weightKg)) {
    let power = 0.7 * ftp;
    hours = km / raceBikeSpeedKmh(power, input.weightKg, ambition);
    for (let i = 0; i < 12; i++) {
      const ifCenter = Math.min(IF_CEILING[distance], Math.sqrt(tssCenter / (100 * hours)));
      power = ifCenter * ftp;
      hours = km / raceBikeSpeedKmh(power, input.weightKg, ambition);
    }
    durationMethod = "model";
  } else { hours = TYPICAL_HOURS[distance][ambition]; durationMethod = "typical"; }

  let ifLo = Math.sqrt(tssRange[0] / (100 * hours));
  let ifHi = Math.sqrt(tssRange[1] / (100 * hours));
  let limitedBy: RaceBikePowerResult["limitedBy"] = "tss";
  if (ifHi > IF_CEILING[distance]) { ifHi = IF_CEILING[distance]; limitedBy = "ceiling"; }
  // Bornage par l'ambition et la TTE observée (IM / 70.3), appliqué à la durée estimée.
  const cap = capBikeRaceIF({ objective: distance, ambition, tteMin: input.tteMin ?? null, raceDurationMin: Math.round(hours * 60) });
  if (cap && cap.cappedIF < ifHi) { ifHi = cap.cappedIF; limitedBy = cap.wasCapped ? "tte" : "ceiling"; }
  ifLo = Math.min(ifLo, ifHi - 0.03);
  const round3 = (x: number) => Math.round(x * 1000) / 1000;
  ifLo = round3(ifLo); ifHi = round3(ifHi);
  const centerIF = round3((ifLo + ifHi) / 2);
  const rangeW: [number, number] = [Math.round(ifLo * ftp), Math.round(ifHi * ftp)];
  const centerW = Math.round(centerIF * ftp);

  const how = durationMethod === "observed" ? `temps vélo réel de ${fmtH(hours)}`
    : durationMethod === "model" ? `vélo estimé à ${fmtH(hours)} (poids ${Math.round(input.weightKg!)} kg, position triathlon, parcours réel peu vallonné)`
    : `durée type ${fmtH(hours)} pour cette ambition (poids inconnu)`;
  const why = limitedBy === "tte" ? ` Plafonné à ${pct(ifHi)} de la FTP par la durée tenue au seuil (TTE ${input.tteMin} min).`
    : limitedBy === "ceiling" ? ` Plafonné à ${pct(ifHi)} de la FTP pour cette distance et cette ambition.` : "";
  const explanation = `${rangeW[0]}–${rangeW[1]} W (${pct(ifLo)}–${pct(ifHi)} de la FTP) : ${how}, pour une charge vélo de ${tssRange[0]}–${tssRange[1]} TSS qui laisse des jambes pour courir.${why}`;

  return { distance, ambition, rangeW, centerW, ifRange: [ifLo, ifHi], centerIF, bikeHours: Math.round(hours * 100) / 100, tssRange, durationMethod, limitedBy, cap, explanation };
}

/**
 * Même forme que capBikeRaceIF (prompts du plan) : la valeur retenue est le centre de la fourchette
 * de raceBikePower quand la FTP est connue ; sinon le bornage historique (ambition + TTE).
 */
export function raceBikeCap(input: RaceBikePowerInput): CapBikeRaceIFResult | null {
  const r = raceBikePower(input);
  const ambition = normalizeRaceAmbition(input.ambition);
  if (!r) return capBikeRaceIF({ objective: String(input.objective ?? ""), ambition, tteMin: input.tteMin ?? null });
  if (r.distance !== "im" && r.distance !== "703") return null;
  const baselineIF = r.cap?.baselineIF ?? r.centerIF;
  return {
    baselineIF,
    cappedIF: r.centerIF,
    cappedPctFTP: Math.round(r.centerIF * 100),
    overExposureRatio: r.cap?.overExposureRatio ?? 0,
    wasCapped: r.limitedBy === "tte",
    rationale: r.explanation,
  };
}
