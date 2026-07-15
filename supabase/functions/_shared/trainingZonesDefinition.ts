/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2B v2 — TRAINING ZONES (edge mirror of src/lib/trainingZonesDefinition.ts)
 * ═══════════════════════════════════════════════════════════════════════════════
 * MIRROR EXACT des données Z1..Z7 (id/label/%FCmax/%VMA/%FTP/%CPRun).
 * Test d'égalité : src/lib/plan/__tests__/trainingZonesMirror.test.ts
 * Toute modif ici DOIT être répliquée dans le fichier client (source unique).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type ZoneId = "Z1" | "Z2" | "Z3" | "Z4a" | "Z4b" | "Z5" | "Z6" | "Z7";

export interface ZonePct { min: number; max: number }

export interface TrainingZoneMirror {
  id: ZoneId;
  label: string;
  fcMax: ZonePct | null;
  vma: ZonePct;
  ftp: ZonePct;
  cpRun: ZonePct;
}

export const TRAINING_ZONES_MIRROR: TrainingZoneMirror[] = [
  { id: "Z1",  label: "Récupération",                          fcMax: { min: 0,  max: 70  }, vma: { min: 0,   max: 60  }, ftp: { min: 0,   max: 55  }, cpRun: { min: 0,   max: 80  } },
  { id: "Z2",  label: "Endurance Fondamentale",                fcMax: { min: 70, max: 78  }, vma: { min: 60,  max: 70  }, ftp: { min: 56,  max: 75  }, cpRun: { min: 80,  max: 90  } },
  { id: "Z3",  label: "Endurance Active",                      fcMax: { min: 78, max: 83  }, vma: { min: 70,  max: 78  }, ftp: { min: 76,  max: 90  }, cpRun: { min: 90,  max: 100 } },
  { id: "Z4a", label: "Allure Marathon / Sweet Spot",          fcMax: { min: 83, max: 87  }, vma: { min: 78,  max: 83  }, ftp: { min: 88,  max: 93  }, cpRun: { min: 100, max: 105 } },
  { id: "Z4b", label: "Allure Semi",                           fcMax: { min: 87, max: 91  }, vma: { min: 83,  max: 88  }, ftp: { min: 94,  max: 98  }, cpRun: { min: 105, max: 110 } },
  { id: "Z5",  label: "Seuil (MLSS)",                          fcMax: { min: 91, max: 94  }, vma: { min: 88,  max: 92  }, ftp: { min: 99,  max: 105 }, cpRun: { min: 110, max: 120 } },
  { id: "Z6",  label: "VO2max / VMA",                          fcMax: { min: 95, max: 100 }, vma: { min: 95,  max: 105 }, ftp: { min: 106, max: 120 }, cpRun: { min: 120, max: 140 } },
  { id: "Z7",  label: "Neuromusculaire / Anaérobie Alactique", fcMax: null,                  vma: { min: 120, max: 200 }, ftp: { min: 150, max: 300 }, cpRun: { min: 140, max: 200 } },
];

export function getZoneMirror(id: ZoneId): TrainingZoneMirror | undefined {
  return TRAINING_ZONES_MIRROR.find(z => z.id === id);
}

/**
 * ─── CONVENTION D'INTERVALLES : SEMI-OUVERTS [min, max[ ───
 * Une valeur exactement égale à une frontière PARTAGÉE entre deux zones
 * appartient TOUJOURS à la zone SUPÉRIEURE.
 *   ex : 60% VMA → Z2 (pas Z1) ; 78% VMA → Z4a ; 88% VMA → Z5.
 * Exception : la borne SUPÉRIEURE de la zone la plus haute (Z7) est inclusive.
 * Trous de grille (%VMA 92-95, %VMA 105-120, %FTP 120-150) → utiliser
 * `nearestZoneForMetric` pour rattacher à la zone la plus proche.
 */
export function containsZoneHalfOpen(
  v: number,
  metric: "vma" | "ftp" | "cpRun" | "fcMax",
  z: TrainingZoneMirror,
): boolean {
  const r = z[metric];
  if (!r) return false;
  const isTop = z.id === "Z7";
  return isTop ? (v >= r.min && v <= r.max) : (v >= r.min && v < r.max);
}

export function zonesContainingHalfOpen(
  v: number,
  metric: "vma" | "ftp" | "cpRun" | "fcMax",
): ZoneId[] {
  return TRAINING_ZONES_MIRROR.filter(z => containsZoneHalfOpen(v, metric, z)).map(z => z.id);
}

/** Distance minimale de v à l'intervalle [min,max] (0 si dedans). */
export function distanceToZone(
  v: number,
  metric: "vma" | "ftp" | "cpRun" | "fcMax",
  z: TrainingZoneMirror,
): number | null {
  const r = z[metric];
  if (!r) return null;
  if (v < r.min) return r.min - v;
  if (v > r.max) return v - r.max;
  return 0;
}

/** Zone la plus proche pour une valeur en trou de grille. Renvoie {zone, distance}. */
export function nearestZoneForMetric(
  v: number,
  metric: "vma" | "ftp" | "cpRun" | "fcMax",
): { zone: ZoneId; distance: number } | null {
  let best: { zone: ZoneId; distance: number } | null = null;
  for (const z of TRAINING_ZONES_MIRROR) {
    const d = distanceToZone(v, metric, z);
    if (d === null) continue;
    if (!best || d < best.distance) best = { zone: z.id, distance: d };
  }
  return best;
}

/** Canonicalise Z4A/z4a/Z4 → Z4a. "Z4" nu = alias union Z4a-Z4b (retourne "Z4"). */
export function canonicalizeZoneLabel(raw: string): ZoneId | "Z4" | null {
  const s = raw.trim().toUpperCase();
  const m = s.match(/^Z(1|2|3|4A|4B|4|5|6|7)$/);
  if (!m) return null;
  const rest = m[1];
  if (rest === "4A") return "Z4a";
  if (rest === "4B") return "Z4b";
  if (rest === "4") return "Z4";
  return ("Z" + rest) as ZoneId;
}

/** Union Z4a+Z4b pour métrique donnée. */
export function z4Union(metric: "vma" | "ftp" | "cpRun" | "fcMax"): ZonePct | null {
  const a = getZoneMirror("Z4a")!;
  const b = getZoneMirror("Z4b")!;
  const ma = a[metric]; const mb = b[metric];
  if (!ma || !mb) return null;
  return { min: Math.min(ma.min, mb.min), max: Math.max(ma.max, mb.max) };
}
