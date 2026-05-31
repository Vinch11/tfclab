/**
 * MIRROR (edge function) de src/lib/physiologicalTargets.ts — section VLamax uniquement.
 * ⚠️ Si tu modifies les cibles dans la source unique, recopie ici à l'identique.
 * Source de vérité : src/lib/physiologicalTargets.ts → AMBITION_TARGETS[*].vlamax
 */

export type AmbitionLevel = "finisher" | "age_group" | "competitor" | "elite" | "world_class";
export interface VLamaxRange { min: number; max: number; optimal: number }

// world_class est dérivé en runtime depuis `elite` via multiplicateur ×0.92 — pas d'entrée explicite requise
const VLAMAX_TABLE: Record<string, Partial<Record<AmbitionLevel, VLamaxRange>>> = {
  IM: {
    finisher:   { min: 0.35, max: 0.60, optimal: 0.48 },
    age_group:  { min: 0.30, max: 0.50, optimal: 0.40 },
    competitor: { min: 0.28, max: 0.45, optimal: 0.36 },
    elite:      { min: 0.25, max: 0.38, optimal: 0.30 },
  },
  "703": {
    finisher:   { min: 0.40, max: 0.65, optimal: 0.52 },
    age_group:  { min: 0.35, max: 0.55, optimal: 0.45 },
    competitor: { min: 0.30, max: 0.48, optimal: 0.38 },
    elite:      { min: 0.26, max: 0.42, optimal: 0.33 },
  },
  Marathon: {
    finisher:   { min: 0.45, max: 0.70, optimal: 0.55 },
    age_group:  { min: 0.35, max: 0.55, optimal: 0.45 },
    competitor: { min: 0.30, max: 0.48, optimal: 0.38 },
    elite:      { min: 0.25, max: 0.40, optimal: 0.32 },
  },
  Semi: {
    finisher:   { min: 0.55, max: 0.80, optimal: 0.65 },
    age_group:  { min: 0.45, max: 0.70, optimal: 0.55 },
    competitor: { min: 0.38, max: 0.58, optimal: 0.48 },
    elite:      { min: 0.32, max: 0.50, optimal: 0.40 },
  },
  Trail: {
    finisher:   { min: 0.45, max: 0.65, optimal: 0.55 },
    age_group:  { min: 0.40, max: 0.60, optimal: 0.50 },
    competitor: { min: 0.35, max: 0.52, optimal: 0.42 },
    elite:      { min: 0.30, max: 0.45, optimal: 0.36 },
  },
};

const ALIASES: Record<string, string> = {
  Ironman: "IM", IRONMAN: "IM", im: "IM",
  "70.3": "703", "Ironman70.3": "703", HALF: "703", half: "703",
  marathon: "Marathon", MARATHON: "Marathon",
  semi: "Semi", SEMI: "Semi", "Semi-Marathon": "Semi", HalfMarathon: "Semi",
  trail: "Trail", TRAIL: "Trail", TrailLong: "Trail",
};

const VLAMAX_CAP_MAX = 0.80;

function applySportOffset(r: VLamaxRange, sport?: string): VLamaxRange {
  if (!sport) return r;
  const s = sport.toLowerCase();
  if (s === "cap" || s === "run" || s === "running") {
    return {
      min: +(r.min + 0.05).toFixed(2),
      max: +Math.min(r.max + 0.07, VLAMAX_CAP_MAX).toFixed(2),
      optimal: +(r.optimal + 0.06).toFixed(2),
    };
  }
  return r;
}

export function getVLamaxRangeForPlan(
  objectif: string | null | undefined,
  ambition: string | null | undefined,
  sport?: string | null
): VLamaxRange {
  const key = (objectif && (VLAMAX_TABLE[objectif] ? objectif : ALIASES[objectif] || ALIASES[objectif.toLowerCase()])) || "703";
  const ambKey = (ambition || "age_group").toLowerCase() as AmbitionLevel;
  // world_class : applique multiplicateur ×0.92 (top 3%) sur la base elite
  if (ambKey === "world_class") {
    const eliteBase = VLAMAX_TABLE[key]?.elite ?? VLAMAX_TABLE["703"].elite;
    const wc: VLamaxRange = {
      min: +(eliteBase.min * 0.95).toFixed(2),
      max: +(eliteBase.max * 0.95).toFixed(2),
      optimal: +(eliteBase.optimal * 0.92).toFixed(2),
    };
    return applySportOffset(wc, sport ?? undefined);
  }
  const ambResolved: AmbitionLevel = (["finisher", "age_group", "competitor", "elite"] as AmbitionLevel[]).includes(ambKey)
    ? ambKey
    : "age_group";
  const base = VLAMAX_TABLE[key]?.[ambResolved as Exclude<AmbitionLevel, "world_class">] ?? VLAMAX_TABLE["703"].age_group;
  return applySportOffset(base, sport ?? undefined);
}
