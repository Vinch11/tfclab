/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MOTEUR DE ZONES DÉRIVÉES — bornes calculées depuis la physiologie de l'athlète
 * ═══════════════════════════════════════════════════════════════════════════════
 * Principe : une zone n'est pas un pourcentage arbitraire, c'est une CONDITION
 * physiologique (LT1, FatMax, MLSS, vVO2max). Les bornes sont donc propres à
 * chaque athlète.
 *
 * Repli : si la confiance des données est insuffisante (seuil/MLSS manquant,
 * VLamax absent, DRE bas), on renvoie la grille standard convertie en 6 zones —
 * jamais d'estimation inventée.
 *
 * Références : Mader (2003), Heck & Schulz (2002), Jones (2017), Billat (2001).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { findMLSSPower } from "@/lib/v2/maderMetabolicModel";
import { computeFatMaxAnchorPctFTP } from "@/lib/v2/fatmaxTFCL";
import { TRAINING_ZONES } from "@/lib/trainingZonesDefinition";
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";
import {
  ZONE6_IDS,
  ZONE6_LABELS,
  ZONE6_CONDITIONS,
  legacyToZone6,
  type ZoneId6,
  type LegacyZoneId,
} from "./zoneMapping";

export type ZoneSport = "bike" | "run" | "swim";
export type ZoneSource = "derived" | "standard";

export interface ZoneBounds {
  min: number;
  max: number;
}

export interface DerivedZone {
  id: ZoneId6;
  label: string;
  condition: string;
  /** Bornes en % de la référence principale (FTP pour le vélo, vSeuil pour la course, CSS pour la natation). */
  pctRef: ZoneBounds;
  /** Libellé de la référence ("% FTP", "% vitesse seuil", "% CSS"). */
  refLabel: string;
  /**
   * Bornes en % FCmax. DÉRIVÉES (Karvonen ancré sur la FC seuil) quand les zones
   * elles-mêmes sont dérivées ; grille tabulée seulement en repli.
   */
  fcMaxPct: ZoneBounds | null;
  /** Valeurs absolues formatées (W, allure, sec/100m) si la référence est connue. */
  absolute: string | null;
  /** Plage FC absolue formatée si FCmax connue. */
  heartRate: string | null;
  /** Référence secondaire (course : % VMA) quand elle est calculable. */
  secondaryPct?: { min: number; max: number; label: string } | null;

}

/**
 * Repère d'intensité transversal (Sweet Spot, allure spécifique course).
 * Ce ne sont PAS des zones : ce sont des fenêtres de travail qui chevauchent
 * les zones canoniques, exprimées dans la même référence.
 */
export interface ZoneMarker {
  id: "sweet_spot" | "race_specific" | "allure_marathon" | "allure_semi";
  label: string;
  /** Zone(s) canonique(s) recouverte(s), pour éviter toute confusion. */
  zoneSpan: string;
  pctRef: ZoneBounds;
  refLabel: string;
  absolute: string | null;
  /** Justification physiologique courte. */
  note: string;
}

export interface DerivedZoneSet {
  sport: ZoneSport;
  source: ZoneSource;
  /** 0..1 — confiance dans les entrées physiologiques. */
  confidence: number;
  /** Ancrages réellement utilisés (traçabilité affichée dans l'UI). */
  anchors: string[];
  /** Raison du repli sur la grille standard, si applicable. */
  fallbackReason: string | null;
  zones: DerivedZone[];
  /** Repères transversaux (Sweet Spot, allure spécifique course). */
  markers: ZoneMarker[];
}

export interface DeriveZonesInput {
  sport: ZoneSport;
  ftp?: number | null;
  vma?: number | null;
  /** Allure seuil course en secondes/km. */
  paceThresholdSecPerKm?: number | null;
  /** true si l'allure seuil est estimée (MLSS prédit × VMA) et non mesurée. */
  paceThresholdEstimated?: boolean;
  /** CSS natation en secondes/100 m. */
  css?: number | null;
  fcMax?: number | null;
  /** FC de repos (bpm) — ancre basse de la réserve cardiaque (Karvonen). */
  fcRest?: number | null;
  /** FC mesurée au seuil / MLSS (bpm) — ancre haute si disponible. */
  fcThreshold?: number | null;
  vlamax?: number | null;
  vo2max?: number | null;
  weightKg?: number | null;
  /** Score de confiance externe (DRE), 0..1. */
  dreConfidence?: number | null;
  /** Objectif de course (libellé libre) — sert au repère « allure spécifique ». */
  raceObjective?: string | null;
}


/** Seuil de bascule : sous cette confiance, on retombe sur la grille standard. */
export const ZONE_DERIVATION_CONFIDENCE_THRESHOLD = 0.5;

/** Largeur minimale d'une zone, en points de pourcentage. */
const MIN_ZONE_WIDTH_PCT = 2;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function isPos(v: number | null | undefined): v is number {
  return v != null && Number.isFinite(v) && v > 0;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** %FCmax de REPLI (grille tabulée) — utilisée uniquement si les zones ne sont pas dérivées. */
const FC_MAX_PCT_STANDARD: Record<ZoneId6, ZoneBounds | null> = {
  Z1: { min: 0, max: 70 },
  Z2: { min: 70, max: 80 },
  Z3: { min: 80, max: 87 },
  Z4: { min: 87, max: 94 },
  Z5: { min: 94, max: 100 },
  Z6: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// FC DÉRIVÉE — Karvonen ancré sur la FC seuil (MLSS), pas sur une grille figée
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Fraction de FCmax au seuil, par défaut, quand la FC seuil n'est pas mesurée.
 * Valeurs de consensus labo (Lucía 2000, Coyle 1995) : la FC au MLSS se situe
 * autour de 88-91 % FCmax, un peu plus haute en course qu'en vélo (masse
 * musculaire sollicitée + absence d'appui assis).
 */
const DEFAULT_THRESHOLD_HR_FRACTION: Record<ZoneSport, number> = {
  bike: 0.89,
  run: 0.91,
  swim: 0.87,
};

/** Fraction de FCmax au repos par défaut si la FC de repos est inconnue. */
const DEFAULT_REST_HR_FRACTION = 0.5;

/**
 * Relation FC / intensité sous le seuil, exprimée en réserve cardiaque.
 * Karvonen/Swain : %HRR ≈ %VO2R, et le VO2 croît un peu plus vite que
 * linéairement avec la vitesse/puissance sous le seuil. Un exposant ~1.4
 * place la FC de FatMax (≈86 % de la vitesse seuil) autour de 78-80 % FCmax,
 * conforme aux mesures labo. Un exposant < 1 (ancien modèle) surestimait
 * fortement la FC en endurance (Z2 collée au seuil).
 */
const HR_SUBTHRESHOLD_EXPONENT = 1.4;


interface DerivedHrResult {
  pct: Record<ZoneId6, ZoneBounds | null>;
  thresholdHrPct: number;
  thresholdHrBpm: number | null;
  restHrPct: number;
  measured: boolean;
}

/**
 * Traduit les bornes d'intensité DÉRIVÉES (en % de la référence) en % FCmax.
 *
 * Modèle : réserve cardiaque (Karvonen) ancrée sur deux points physiologiques
 * de l'athlète — la FC de repos et la FC au seuil (MLSS) — puis saturation
 * linéaire entre le seuil et vVO2max/PMA. Résultat : deux athlètes ayant le
 * même FCmax mais un MLSS différent n'obtiennent PAS les mêmes zones FC.
 */
function deriveHrPct(
  sport: ZoneSport,
  bounds: Record<ZoneId6, ZoneBounds>,
  refAtThreshold: number,
  refAtVo2max: number,
  fcMax: number,
  fcRest: number | null,
  fcThreshold: number | null,
): DerivedHrResult {
  const restHrPct = fcRest
    ? clamp(fcRest / fcMax, 0.28, 0.65)
    : DEFAULT_REST_HR_FRACTION;
  const measured = fcThreshold != null && fcThreshold > 0;
  const thresholdHrPct = measured
    ? clamp(fcThreshold! / fcMax, restHrPct + 0.15, 0.98)
    : clamp(DEFAULT_THRESHOLD_HR_FRACTION[sport], restHrPct + 0.15, 0.98);

  const hrrAtThreshold = (thresholdHrPct - restHrPct) / (1 - restHrPct);
  const rVo2 = Math.max(1.04, refAtVo2max / refAtThreshold);

  const hrAt = (refPct: number): number => {
    const r = Math.max(0, refPct / refAtThreshold);
    if (r <= 1) {
      const hrr = hrrAtThreshold * Math.pow(r, HR_SUBTHRESHOLD_EXPONENT);
      return clamp((restHrPct + hrr * (1 - restHrPct)) * 100, restHrPct * 100, 100);
    }
    const over = clamp((r - 1) / (rVo2 - 1), 0, 1);
    return clamp((thresholdHrPct + over * (1 - thresholdHrPct)) * 100, 0, 100);
  };

  const pct = {} as Record<ZoneId6, ZoneBounds | null>;
  let prevMax = 0;
  for (const id of ZONE6_IDS) {
    // Z6 (neuromusculaire/sprint) : la FC n'est pas un pilotage valide.
    if (id === "Z6") {
      pct[id] = null;
      continue;
    }
    const b = bounds[id];
    // Z1 : plancher à la FC de récup active (repos + 8 pts, jamais < 50 % FCmax),
    // la borne basse « repos pur » n'a pas de sens pour piloter une séance.
    const min = id === "Z1"
      ? Math.round(Math.max(restHrPct * 100 + 8, 50))
      : Math.max(prevMax, Math.round(hrAt(b.min)));
    const max = Math.max(min + 1, Math.min(100, Math.round(hrAt(b.max))));
    pct[id] = { min, max };
    prevMax = max;
  }

  return {
    pct,
    thresholdHrPct: thresholdHrPct * 100,
    thresholdHrBpm: Math.round(thresholdHrPct * fcMax),
    restHrPct: restHrPct * 100,
    measured,
  };
}

function fmtPaceFromSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Force la monotonie et une largeur minimale sur une suite de bornes. */
function sanitizeBounds(raw: ZoneBounds[]): ZoneBounds[] {
  const out: ZoneBounds[] = [];
  let cursor = raw[0].min;
  for (let i = 0; i < raw.length; i++) {
    const min = i === 0 ? cursor : cursor;
    const max = Math.max(raw[i].max, min + MIN_ZONE_WIDTH_PCT);
    out.push({ min: round1(min), max: round1(max) });
    cursor = max;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// GRILLE STANDARD (repli) — conversion Z1..Z7 → Z1..Z6
// ─────────────────────────────────────────────────────────────────────────────

function standardPctFor(sport: ZoneSport, id: ZoneId6): ZoneBounds {
  const metric: "ftp" | "vma" = sport === "bike" ? "ftp" : "vma";
  const rows = TRAINING_ZONES.filter((z) => legacyToZone6(z.id as LegacyZoneId) === id);
  const min = Math.min(...rows.map((z) => z[metric].min));
  const max = Math.max(...rows.map((z) => z[metric].max));
  return { min, max };
}

// ─────────────────────────────────────────────────────────────────────────────
// BORNES DÉRIVÉES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vélo — bornes en % FTP ancrées sur FatMax (VLamax/VO2max) et MLSS (Mader).
 */
function deriveBikePct(
  fatMaxPctFtp: number,
  mlssPctFtp: number,
): Record<ZoneId6, ZoneBounds> {
  const z2Bottom = clamp(fatMaxPctFtp - 12, 35, 70);
  const z2Top = clamp(fatMaxPctFtp + 5, z2Bottom + 5, mlssPctFtp - 8);
  const z3Top = clamp(mlssPctFtp - 5, z2Top + 3, mlssPctFtp - 2);
  const z4Bottom = clamp(mlssPctFtp - 3, z3Top, mlssPctFtp);
  const z4Top = mlssPctFtp + 3;
  const z5Top = clamp(mlssPctFtp * 1.18, z4Top + 6, 145);
  return {
    Z1: { min: 0, max: z2Bottom },
    Z2: { min: z2Bottom, max: z2Top },
    Z3: { min: z2Top, max: z3Top },
    Z4: { min: z4Bottom, max: z4Top },
    Z5: { min: z4Top, max: z5Top },
    Z6: { min: z5Top, max: Math.max(300, z5Top + 50) },
  };
}

/**
 * Course — bornes en % de la VITESSE SEUIL (et non en % VMA figé).
 * Le haut de Z5 est vVO2max exprimée en % du seuil : c'est là que le ratio
 * seuil/VMA propre à l'athlète entre en jeu.
 */
function deriveRunPct(
  vlamax: number | null,
  vVo2maxPctThreshold: number,
): Record<ZoneId6, ZoneBounds> {
  // FatMax en % du seuil : VLamax haute → FatMax plus basse.
  const fatMaxPct = vlamax != null ? clamp(86 - 22 * (vlamax - 0.45), 76, 92) : 85;
  const z2Bottom = clamp(fatMaxPct - 10, 55, 80);
  const z2Top = clamp(fatMaxPct, z2Bottom + 5, 93);
  const z3Top = 95;
  const z4Bottom = 97;
  const z4Top = 103;
  const z5Top = clamp(vVo2maxPctThreshold, z4Top + 4, 135);
  return {
    Z1: { min: 0, max: z2Bottom },
    Z2: { min: z2Bottom, max: z2Top },
    Z3: { min: Math.max(z2Top, 80), max: Math.max(z3Top, z2Top + 3) },
    Z4: { min: z4Bottom, max: z4Top },
    Z5: { min: z4Top, max: z5Top },
    Z6: { min: z5Top, max: Math.max(160, z5Top + 25) },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

export function deriveTrainingZones(input: DeriveZonesInput): DerivedZoneSet {
  const { sport } = input;
  const anchors: string[] = [];
  let pct: Record<ZoneId6, ZoneBounds> | null = null;
  let confidence = 0;
  let fallbackReason: string | null = null;
  // Intensité (en % de la référence) correspondant au SEUIL/MLSS de l'athlète :
  // ancre de la dérivation cardiaque. Renseignée uniquement en mode dérivé.
  let refAtThreshold: number | null = null;

  if (sport === "bike") {
    const ftp = isPos(input.ftp) ? input.ftp : null;
    const vla = isPos(input.vlamax) ? input.vlamax : null;
    const vo2 = isPos(input.vo2max) ? input.vo2max : null;
    const weight = isPos(input.weightKg) ? input.weightKg : null;

    if (!ftp) fallbackReason = "FTP manquante";
    else if (!vla) fallbackReason = "VLamax manquante";
    else if (!vo2 || !weight) fallbackReason = "VO2max ou poids manquant";
    else {
      const mlssW = findMLSSPower({ vo2max: vo2, vlamax: vla, weight });
      if (mlssW <= 0) fallbackReason = "MLSS non calculable";
      else {
        const mlssPctFtp = clamp((mlssW / ftp) * 100, 80, 112);
        const fatMaxPctFtp = computeFatMaxAnchorPctFTP(vla, vo2) ?? 65;
        pct = deriveBikePct(fatMaxPctFtp, mlssPctFtp);
        refAtThreshold = mlssPctFtp;
        anchors.push(
          `FatMax ≈ ${Math.round(fatMaxPctFtp)} % FTP (VLamax ${vla.toFixed(2)})`,
          `MLSS Mader ≈ ${mlssW} W (${Math.round(mlssPctFtp)} % FTP)`,
        );
        confidence = 0.85;
      }
    }
  } else if (sport === "run") {
    const thr = isPos(input.paceThresholdSecPerKm) ? input.paceThresholdSecPerKm : null;
    const vma = isPos(input.vma) ? input.vma : null;
    const vla = isPos(input.vlamax) ? input.vlamax : null;

    if (!thr) fallbackReason = "Allure seuil manquante";
    else {
      const vThrKmh = 3600 / thr;
      // vVO2max ≈ VMA ; exprimée en % de la vitesse seuil de l'athlète.
      const vVo2maxPct = vma ? clamp((vma / vThrKmh) * 100, 102, 135) : 112;
      pct = deriveRunPct(vla, vVo2maxPct);
      refAtThreshold = 100; // les bornes course sont déjà exprimées en % de la vitesse seuil
      const estimated = input.paceThresholdEstimated === true;
      anchors.push(
        `Vitesse seuil ${vThrKmh.toFixed(1)} km/h (${fmtPaceFromSec(thr)}/km)${estimated ? " — estimée (MLSS prédit)" : " — mesurée"}`,
      );
      if (vma) anchors.push(`vVO2max ≈ ${Math.round(vVo2maxPct)} % du seuil (VMA ${vma.toFixed(1)} km/h)`);
      if (vla) anchors.push(`FatMax modulée par VLamax ${vla.toFixed(2)}`);
      confidence = (vma && vla ? 0.85 : vma ? 0.7 : 0.55) - (estimated ? 0.15 : 0);
    }
  } else {
    fallbackReason = "Zones natation non dérivables (CSS seul)";
  }

  const dre = input.dreConfidence;
  if (pct && isPos(dre) && dre < ZONE_DERIVATION_CONFIDENCE_THRESHOLD) {
    pct = null;
    fallbackReason = "Confiance des données insuffisante";
  }

  const source: ZoneSource = pct ? "derived" : "standard";
  if (!pct) {
    confidence = isPos(dre) ? dre : 0.4;
    pct = ZONE6_IDS.reduce((acc, id) => {
      acc[id] = standardPctFor(sport, id);
      return acc;
    }, {} as Record<ZoneId6, ZoneBounds>);
    if (anchors.length === 0) anchors.push("Grille standard TFCL (pourcentages tabulés)");
  }

  const sanitized = sanitizeBounds(ZONE6_IDS.map((id) => pct![id]));

  const fcMax = isPos(input.fcMax) ? input.fcMax : null;

  const refLabel =
    sport === "bike"
      ? "% FTP"
      : sport === "run"
        ? source === "derived"
          ? "% vitesse seuil"
          : "% VMA"
        : "% CSS";

  // FC : dérivée (Karvonen ancré sur la FC seuil) dès que les zones le sont et
  // que la FCmax est connue ; sinon repli sur la grille tabulée.
  const boundsById = ZONE6_IDS.reduce((acc, id, i) => {
    acc[id] = sanitized[i];
    return acc;
  }, {} as Record<ZoneId6, ZoneBounds>);

  let hrPctById: Record<ZoneId6, ZoneBounds | null> = FC_MAX_PCT_STANDARD;
  if (source === "derived" && fcMax && refAtThreshold) {
    const hr = deriveHrPct(
      sport,
      boundsById,
      refAtThreshold,
      boundsById.Z5.max,
      fcMax,
      isPos(input.fcRest) ? input.fcRest : null,
      isPos(input.fcThreshold) ? input.fcThreshold : null,
    );
    hrPctById = hr.pct;
    anchors.push(
      `FC seuil ≈ ${hr.thresholdHrBpm} bpm (${Math.round(hr.thresholdHrPct)} % FCmax)${hr.measured ? " — mesurée" : " — estimée"}, zones FC en réserve cardiaque (repos ${Math.round(hr.restHrPct)} % FCmax)`,
    );
  } else if (fcMax) {
    anchors.push("Zones FC : grille standard (%FCmax tabulé) — FC seuil non dérivable");
  }

  // Course : conversion % vitesse seuil -> % VMA (référence secondaire affichée).
  const vmaKmhForPct = sport === "run" && isPos(input.vma) ? input.vma : null;
  const vThrKmhForPct =
    sport === "run" && isPos(input.paceThresholdSecPerKm) ? 3600 / input.paceThresholdSecPerKm : null;
  const vmaRatio =
    vmaKmhForPct && vThrKmhForPct && source === "derived" ? vThrKmhForPct / vmaKmhForPct : null;

  const zones: DerivedZone[] = ZONE6_IDS.map((id, i) => {
    const b = sanitized[i];
    const fc = hrPctById[id];
    const secondaryPct =
      sport === "run"
        ? vmaRatio
          ? { min: Math.round(b.min * vmaRatio), max: Math.round(b.max * vmaRatio), label: "% VMA" }
          : source === "standard" && vmaKmhForPct
            ? { min: b.min, max: b.max, label: "% VMA" }
            : null
        : null;
    return {
      id,
      label: ZONE6_LABELS[id],
      condition: ZONE6_CONDITIONS[id],
      pctRef: b,
      refLabel,
      fcMaxPct: fc,
      absolute: formatAbsolute(sport, source, b, input),
      heartRate:
        fc && fcMax
          ? `${Math.round((fc.min / 100) * fcMax)}–${Math.round((fc.max / 100) * fcMax)} bpm`
          : null,
      secondaryPct,
    };
  });
  const markers = buildMarkers(sport, source, refAtThreshold, refLabel, input);

  return { sport, source, confidence, anchors, fallbackReason, zones, markers };
}

// ─────────────────────────────────────────────────────────────────────────────
// REPÈRES TRANSVERSAUX — Sweet Spot & intensité spécifique course
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sweet Spot : 88–94 % de la puissance/vitesse au seuil (MLSS).
 * Définition d'origine (Coggan & Allen, « Training and Racing with a Power
 * Meter ») : meilleur rapport stimulus aérobie / coût de récupération. Ce n'est
 * pas une zone métabolique distincte — elle chevauche le haut de Z3 et le bas
 * de Z4 — d'où son affichage comme REPÈRE et non comme zone.
 */
const SWEET_SPOT_FRACTION: ZoneBounds = { min: 0.88, max: 0.94 };

/**
 * Intensité spécifique course, en fraction du seuil (MLSS).
 * Cohérent avec la littérature sur la durée d'effort : plus l'épreuve est
 * longue, plus la fraction soutenable du seuil baisse (Coyle 1995,
 * Jones 2017, Smyth 2022).
 */
const RACE_FRACTION_RUN: Record<string, ZoneBounds> = {
  "5K": { min: 1.05, max: 1.10 },
  "10K": { min: 1.00, max: 1.05 },
  Semi: { min: 0.95, max: 1.00 },
  Marathon: { min: 0.88, max: 0.94 },
  Trail: { min: 0.82, max: 0.90 },
  TrailShort: { min: 0.88, max: 0.95 },
  TrailMountain: { min: 0.80, max: 0.88 },
  TrailUltra: { min: 0.72, max: 0.82 },
  StartToRun: { min: 0.70, max: 0.80 },
  IM: { min: 0.78, max: 0.85 },
  "703": { min: 0.85, max: 0.92 },
};

const RACE_FRACTION_BIKE: Record<string, ZoneBounds> = {
  IM: { min: 0.68, max: 0.76 },
  "703": { min: 0.78, max: 0.85 },
};

function buildMarkers(
  sport: ZoneSport,
  source: ZoneSource,
  refAtThreshold: number | null,
  refLabel: string,
  input: DeriveZonesInput,
): ZoneMarker[] {
  if (source !== "derived" || !refAtThreshold || sport === "swim") return [];
  const out: ZoneMarker[] = [];

  const ss: ZoneBounds = {
    min: round1(refAtThreshold * SWEET_SPOT_FRACTION.min),
    max: round1(refAtThreshold * SWEET_SPOT_FRACTION.max),
  };
  out.push({
    id: "sweet_spot",
    label: "Sweet Spot",
    zoneSpan: "haut Z3 → bas Z4",
    pctRef: ss,
    refLabel,
    absolute: formatAbsolute(sport, source, ss, input),
    note: "88–94 % du seuil (Coggan) — meilleur rapport stimulus aérobie / coût de récupération. Chevauche Z3 et Z4, ce n'est pas une zone métabolique distincte.",
  });

  const key = input.raceObjective ? normalizeObjectiveKey(input.raceObjective) : null;
  const table = sport === "bike" ? RACE_FRACTION_BIKE : RACE_FRACTION_RUN;
  const frac = key ? table[key] : undefined;
  if (frac) {
    const b: ZoneBounds = {
      min: round1(refAtThreshold * frac.min),
      max: round1(refAtThreshold * frac.max),
    };
    out.push({
      id: "race_specific",
      label: sport === "bike" ? `Intensité course · ${key}` : `Allure spécifique · ${key}`,
      zoneSpan: describeSpan(b, refAtThreshold),
      pctRef: b,
      refLabel,
      absolute: formatAbsolute(sport, source, b, input),
      note: `${Math.round(frac.min * 100)}–${Math.round(frac.max * 100)} % du seuil — fraction soutenable estimée pour la durée de l'épreuve.`,
    });
  }

  // Repères fixes Allure Marathon / Allure Semi — TOUJOURS affichés (pas
  // seulement pour l'objectif de course actuel de l'athlète). Le modèle
  // dérivé à 6 zones fusionne Z4a (allure marathon) + Z4b (allure semi) +
  // Z5 (seuil) de la grille héritée en une seule zone "Z4" — ces repères
  // rendent visible la sous-structure interne de cette zone fusionnée,
  // avec les mêmes fractions du seuil que RACE_FRACTION_RUN ci-dessus.
  // Pas de doublon si `race_specific` couvre déjà Marathon ou Semi.
  if (sport === "run" && key !== "Marathon" && key !== "Semi") {
    const fixedRefs: Array<{ id: "allure_marathon" | "allure_semi"; raceKey: "Marathon" | "Semi"; label: string }> = [
      { id: "allure_marathon", raceKey: "Marathon", label: "Allure Marathon" },
      { id: "allure_semi", raceKey: "Semi", label: "Allure Semi" },
    ];
    for (const ref of fixedRefs) {
      const f = RACE_FRACTION_RUN[ref.raceKey];
      const b: ZoneBounds = {
        min: round1(refAtThreshold * f.min),
        max: round1(refAtThreshold * f.max),
      };
      out.push({
        id: ref.id,
        label: ref.label,
        zoneSpan: describeSpan(b, refAtThreshold),
        pctRef: b,
        refLabel,
        absolute: formatAbsolute(sport, source, b, input),
        note: `${Math.round(f.min * 100)}–${Math.round(f.max * 100)} % du seuil. Repère fixe (indépendant de l'objectif de course actuel) — sous-partie de la zone Z4 fusionnée ci-dessus.`,
      });
    }
  }

  return out;
}

function describeSpan(b: ZoneBounds, thr: number): string {
  const mid = ((b.min + b.max) / 2) / thr;
  if (mid >= 1.03) return "Z5";
  if (mid >= 0.97) return "Z4 Seuil";
  if (mid >= 0.88) return "haut Z3 → bas Z4";
  if (mid >= 0.80) return "Z3 Tempo";
  return "Z2 Endurance";
}


function formatAbsolute(
  sport: ZoneSport,
  source: ZoneSource,
  b: ZoneBounds,
  input: DeriveZonesInput,
): string | null {
  if (sport === "bike") {
    if (!isPos(input.ftp)) return null;
    return `${Math.round((b.min / 100) * input.ftp)}–${Math.round((b.max / 100) * input.ftp)} W`;
  }
  if (sport === "run") {
    // Référence = vitesse seuil si dérivé, VMA si grille standard.
    const refKmh =
      source === "derived" && isPos(input.paceThresholdSecPerKm)
        ? 3600 / input.paceThresholdSecPerKm
        : isPos(input.vma)
          ? input.vma
          : null;
    if (!refKmh) return null;
    const lo = (b.min / 100) * refKmh;
    const hi = (b.max / 100) * refKmh;
    if (lo <= 0 || hi <= 0) return null;
    const slow = fmtPaceFromSec(3600 / Math.max(lo, 0.1));
    const fast = fmtPaceFromSec(3600 / hi);
    return b.min <= 0 ? `≤ ${fast}/km` : `${fast}–${slow}/km`;
  }
  if (sport === "swim" && isPos(input.css)) {
    const fast = input.css / (b.max / 100);
    const slow = b.min > 0 ? input.css / (b.min / 100) : null;
    return slow ? `${fmtPaceFromSec(fast)}–${fmtPaceFromSec(slow)}/100m` : `≥ ${fmtPaceFromSec(fast)}/100m`;
  }
  return null;
}

/** Renvoie une zone du set par identifiant. */
export function getDerivedZone(set: DerivedZoneSet, id: ZoneId6): DerivedZone | undefined {
  return set.zones.find((z) => z.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
// PONT AVEC LA GRILLE HÉRITÉE Z1..Z7 (plans IA, catalogue, exports)
// ─────────────────────────────────────────────────────────────────────────────

/** Suite monotone des bornes (min,max de chaque zone) pour l'interpolation. */
function boundsSequence(zones: { pctRef: ZoneBounds }[]): number[] {
  const seq: number[] = [];
  zones.forEach((z) => {
    seq.push(z.pctRef.min, z.pctRef.max);
  });
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] < seq[i - 1]) seq[i] = seq[i - 1];
  }
  return seq;
}

/**
 * Convertit un pourcentage exprimé dans la GRILLE STANDARD (% FTP vélo,
 * % VMA course) vers le pourcentage équivalent de la référence DÉRIVÉE
 * (% FTP recalé sur MLSS, % vitesse seuil), par interpolation linéaire
 * par morceaux entre les bornes des deux grilles.
 *
 * Retourne null si le set est en repli standard (aucune conversion à faire).
 */
export function makeStandardPctRemap(
  set: DerivedZoneSet,
): ((standardPct: number) => number) | null {
  if (set.source !== "derived") return null;
  const standard = boundsSequence(
    ZONE6_IDS.map((id) => ({ pctRef: standardPctFor(set.sport, id) })),
  );
  const derived = boundsSequence(set.zones);
  if (standard.length !== derived.length) return null;

  return (p: number) => {
    if (p <= standard[0]) return round1(derived[0] + (p - standard[0]));
    for (let i = 1; i < standard.length; i++) {
      if (p <= standard[i]) {
        const span = standard[i] - standard[i - 1];
        const t = span > 0 ? (p - standard[i - 1]) / span : 0;
        return round1(derived[i - 1] + t * (derived[i] - derived[i - 1]));
      }
    }
    const last = standard.length - 1;
    const ratio = standard[last] > 0 ? derived[last] / standard[last] : 1;
    return round1(p * ratio);
  };
}

/**
 * Valeur ABSOLUE (W pour le vélo, km/h pour la course) correspondant à un
 * pourcentage de la grille standard, en passant par les zones dérivées.
 * Retourne null si non dérivable (repli standard, référence manquante).
 */
export function makeStandardPctToAbsolute(
  set: DerivedZoneSet,
  input: DeriveZonesInput,
): ((standardPct: number) => number) | null {
  const remap = makeStandardPctRemap(set);
  if (!remap) return null;
  if (set.sport === "bike") {
    if (!isPos(input.ftp)) return null;
    const ftp = input.ftp;
    return (p: number) => (remap(p) / 100) * ftp;
  }
  if (set.sport === "run") {
    if (!isPos(input.paceThresholdSecPerKm)) return null;
    const vThr = 3600 / input.paceThresholdSecPerKm;
    return (p: number) => (remap(p) / 100) * vThr;
  }
  return null;
}


/**
 * Estime l'allure seuil course (sec/km) quand elle n'est pas mesurée :
 * MLSS prédit (VLamax + CE) × VMA, repli 0.90 × VMA.
 */
export function estimateRunThresholdPaceSecPerKm(
  vmaKmh: number | null | undefined,
  mlssPct: number | null | undefined,
): number | null {
  if (!isPos(vmaKmh)) return null;
  const ratio = isPos(mlssPct) ? clamp(mlssPct / 100, 0.75, 0.95) : 0.9;
  return 3600 / (vmaKmh * ratio);
}
