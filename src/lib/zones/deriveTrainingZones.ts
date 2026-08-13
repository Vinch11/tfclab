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
  /** Bornes en % FCmax (grille standard, la FC ne se dérive pas fiablement). */
  fcMaxPct: ZoneBounds | null;
  /** Valeurs absolues formatées (W, allure, sec/100m) si la référence est connue. */
  absolute: string | null;
  /** Plage FC absolue formatée si FCmax connue. */
  heartRate: string | null;
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
  vlamax?: number | null;
  vo2max?: number | null;
  weightKg?: number | null;
  /** Score de confiance externe (DRE), 0..1. */
  dreConfidence?: number | null;
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

/** %FCmax du modèle 6 zones (grille standard : la FC reste tabulée). */
const FC_MAX_PCT: Record<ZoneId6, ZoneBounds | null> = {
  Z1: { min: 0, max: 70 },
  Z2: { min: 70, max: 80 },
  Z3: { min: 80, max: 87 },
  Z4: { min: 87, max: 94 },
  Z5: { min: 94, max: 100 },
  Z6: null,
};

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

  const refLabel =
    sport === "bike"
      ? "% FTP"
      : sport === "run"
        ? source === "derived"
          ? "% vitesse seuil"
          : "% VMA"
        : "% CSS";

  const fcMax = isPos(input.fcMax) ? input.fcMax : null;

  const zones: DerivedZone[] = ZONE6_IDS.map((id, i) => {
    const b = sanitized[i];
    const fc = FC_MAX_PCT[id];
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
    };
  });

  return { sport, source, confidence, anchors, fallbackReason, zones };
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
