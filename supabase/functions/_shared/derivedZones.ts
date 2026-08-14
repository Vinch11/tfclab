/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZONES DÉRIVÉES — miroir edge de src/lib/zones/deriveTrainingZones.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 * Même mathématique que le client (Mader α=1.98, FatMax anchor, remap standard→dérivé)
 * afin que les cibles envoyées à Nolio correspondent exactement aux zones affichées
 * dans l'application.
 *
 * Toute modification ici DOIT être répliquée côté client (et inversement).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type ZoneSport = "bike" | "run";
export type ZoneSource = "derived" | "standard";
export type ZoneId6 = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "Z6";

export interface ZoneBounds { min: number; max: number }

export interface DeriveZonesInput {
  sport: ZoneSport;
  ftp?: number | null;
  vma?: number | null;
  paceThresholdSecPerKm?: number | null;
  paceThresholdEstimated?: boolean;
  fcMax?: number | null;
  vlamax?: number | null;
  vo2max?: number | null;
  weightKg?: number | null;
}

export interface DerivedZoneSet {
  sport: ZoneSport;
  source: ZoneSource;
  confidence: number;
  anchors: string[];
  fallbackReason: string | null;
  /** Bornes en % de la référence (FTP vélo, vitesse seuil course), ordre Z1..Z6. */
  pct: Record<ZoneId6, ZoneBounds>;
}

export const ZONE6_IDS: ZoneId6[] = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"];

const MIN_ZONE_WIDTH_PCT = 2;
const MADER_ALPHA = 1.98;
const ENERGY_PER_O2 = 20.9;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function isPos(v: number | null | undefined): v is number {
  return v != null && Number.isFinite(v) && v > 0;
}
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Mader — MLSS en watts (miroir de findMLSSPower). */
export function findMLSSPowerEdge(vo2max: number, vlamax: number, weight: number, efficiency = 0.23): number {
  if (!isPos(vo2max) || !isPos(vlamax) || !isPos(weight)) return 0;
  const vo2maxAbs = (vo2max * weight) / 1000;
  const mlssIntensityPct = 100 * (1 - (MADER_ALPHA * vlamax) / vo2maxAbs);
  const clamped = clamp(mlssIntensityPct, 45, 95);
  const vo2AtMLSS = (vo2max * clamped) / 100;
  const vo2LPerMin = (vo2AtMLSS * weight) / 1000;
  const energyKJPerMin = vo2LPerMin * ENERGY_PER_O2;
  return Math.round(((energyKJPerMin * 1000) / 60) * efficiency);
}

/** FatMax ancrée en % FTP (miroir de computeFatMaxAnchorPctFTP). */
export function fatMaxAnchorPctFTPEdge(vlamax: number, vo2max?: number | null): number | null {
  if (!isPos(vlamax)) return null;
  const vo2Term = isPos(vo2max) ? 0.15 * (vo2max - 50) : 0;
  return Math.round(clamp(78 - 52 * (vlamax - 0.25) + vo2Term, 48, 82));
}

/** Grille standard TFCL convertie en 6 zones (repli). */
const STANDARD_PCT: Record<ZoneSport, Record<ZoneId6, ZoneBounds>> = {
  bike: {
    Z1: { min: 0, max: 55 },
    Z2: { min: 56, max: 75 },
    Z3: { min: 76, max: 90 },
    Z4: { min: 88, max: 105 },
    Z5: { min: 106, max: 120 },
    Z6: { min: 150, max: 300 },
  },
  run: {
    Z1: { min: 0, max: 60 },
    Z2: { min: 60, max: 70 },
    Z3: { min: 70, max: 78 },
    Z4: { min: 78, max: 92 },
    Z5: { min: 95, max: 105 },
    Z6: { min: 120, max: 200 },
  },
};

function sanitizeBounds(raw: ZoneBounds[]): ZoneBounds[] {
  const out: ZoneBounds[] = [];
  let cursor = raw[0].min;
  for (let i = 0; i < raw.length; i++) {
    const min = cursor;
    const max = Math.max(raw[i].max, min + MIN_ZONE_WIDTH_PCT);
    out.push({ min: round1(min), max: round1(max) });
    cursor = max;
  }
  return out;
}

function deriveBikePct(fatMaxPctFtp: number, mlssPctFtp: number): Record<ZoneId6, ZoneBounds> {
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

function deriveRunPct(vlamax: number | null, vVo2maxPctThreshold: number): Record<ZoneId6, ZoneBounds> {
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

/** Estime l'allure seuil course (sec/km) : MLSS prédit × VMA, repli 0.90 × VMA. */
export function estimateRunThresholdPaceSecPerKmEdge(
  vmaKmh: number | null | undefined,
  mlssPct?: number | null,
): number | null {
  if (!isPos(vmaKmh)) return null;
  const ratio = isPos(mlssPct) ? clamp(mlssPct / 100, 0.75, 0.95) : 0.9;
  return 3600 / (vmaKmh * ratio);
}

export function deriveTrainingZonesEdge(input: DeriveZonesInput): DerivedZoneSet {
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
      const mlssW = findMLSSPowerEdge(vo2, vla, weight);
      if (mlssW <= 0) fallbackReason = "MLSS non calculable";
      else {
        const mlssPctFtp = clamp((mlssW / ftp) * 100, 80, 112);
        const fatMaxPctFtp = fatMaxAnchorPctFTPEdge(vla, vo2) ?? 65;
        pct = deriveBikePct(fatMaxPctFtp, mlssPctFtp);
        anchors.push(`MLSS ≈ ${mlssW} W (${Math.round(mlssPctFtp)} % FTP)`);
        confidence = 0.85;
      }
    }
  } else {
    const thr = isPos(input.paceThresholdSecPerKm) ? input.paceThresholdSecPerKm : null;
    const vma = isPos(input.vma) ? input.vma : null;
    const vla = isPos(input.vlamax) ? input.vlamax : null;
    if (!thr) fallbackReason = "Allure seuil manquante";
    else {
      const vThrKmh = 3600 / thr;
      const vVo2maxPct = vma ? clamp((vma / vThrKmh) * 100, 102, 135) : 112;
      pct = deriveRunPct(vla, vVo2maxPct);
      anchors.push(`Vitesse seuil ${vThrKmh.toFixed(1)} km/h`);
      confidence = (vma && vla ? 0.85 : vma ? 0.7 : 0.55) - (input.paceThresholdEstimated ? 0.15 : 0);
    }
  }

  const source: ZoneSource = pct ? "derived" : "standard";
  if (!pct) {
    confidence = 0.4;
    pct = { ...STANDARD_PCT[sport] };
    if (anchors.length === 0) anchors.push("Grille standard TFCL");
  }

  const sanitized = sanitizeBounds(ZONE6_IDS.map((id) => pct![id]));
  const finalPct = ZONE6_IDS.reduce((acc, id, i) => {
    acc[id] = sanitized[i];
    return acc;
  }, {} as Record<ZoneId6, ZoneBounds>);

  return { sport, source, confidence, anchors, fallbackReason, pct: finalPct };
}

function boundsSequence(pct: Record<ZoneId6, ZoneBounds>): number[] {
  const seq: number[] = [];
  ZONE6_IDS.forEach((id) => {
    seq.push(pct[id].min, pct[id].max);
  });
  for (let i = 1; i < seq.length; i++) if (seq[i] < seq[i - 1]) seq[i] = seq[i - 1];
  return seq;
}

/** Convertit un % de la grille standard vers le % de la référence dérivée. */
export function makeStandardPctRemapEdge(set: DerivedZoneSet): ((standardPct: number) => number) | null {
  if (set.source !== "derived") return null;
  const standard = boundsSequence(STANDARD_PCT[set.sport]);
  const derived = boundsSequence(set.pct);
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

/** Watts pour le vélo depuis un % de la grille standard (null si non dérivable). */
export function derivedWattsFromStandardPct(set: DerivedZoneSet, ftp: number | null | undefined) {
  const remap = makeStandardPctRemapEdge(set);
  if (!remap || set.sport !== "bike" || !isPos(ftp)) return null;
  return (p: number) => (remap(p) / 100) * ftp;
}

/** Vitesse (km/h) course depuis un % de la grille standard %VMA (null si non dérivable). */
export function derivedRunSpeedFromStandardPct(set: DerivedZoneSet, thresholdSecPerKm: number | null | undefined) {
  const remap = makeStandardPctRemapEdge(set);
  if (!remap || set.sport !== "run" || !isPos(thresholdSecPerKm)) return null;
  const vThr = 3600 / thresholdSecPerKm;
  return (p: number) => (remap(p) / 100) * vThr;
}

/** Zone héritée (Z1..Z7 / Z4a / Z4b) → zone du modèle 6. */
export function legacyZoneToZone6(raw: string): ZoneId6 | null {
  const s = raw.trim().toUpperCase().replace(/^ZONE\s*/, "Z").replace(/\s+/g, "");
  const m = s.match(/^Z(1|2|3|4A|4B|4|5|6|7)$/);
  if (!m) return null;
  const rest = m[1];
  if (rest === "1") return "Z1";
  if (rest === "2") return "Z2";
  if (rest === "3") return "Z3";
  if (rest === "4" || rest === "4A" || rest === "4B" || rest === "5") return "Z4";
  if (rest === "6") return "Z5";
  return "Z6";
}
