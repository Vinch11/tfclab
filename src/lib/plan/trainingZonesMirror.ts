/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2B v2 — TRAINING ZONES MIRROR (client re-export from source unique)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Ré-emballe TRAINING_ZONES (src/lib/trainingZonesDefinition.ts) dans le même
 * format que le mirror edge, pour permettre l'assertion d'égalité stricte via
 * trainingZonesMirror.test.ts.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { TRAINING_ZONES } from "@/lib/trainingZonesDefinition";

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

export const TRAINING_ZONES_MIRROR: TrainingZoneMirror[] = TRAINING_ZONES.map(z => ({
  id: z.id as ZoneId,
  label: z.label,
  fcMax: z.fcMax ? { min: z.fcMax.min, max: z.fcMax.max } : null,
  vma: { min: z.vma.min, max: z.vma.max },
  ftp: { min: z.ftp.min, max: z.ftp.max },
  cpRun: { min: z.cpRun.min, max: z.cpRun.max },
}));

export function getZoneMirror(id: ZoneId): TrainingZoneMirror | undefined {
  return TRAINING_ZONES_MIRROR.find(z => z.id === id);
}

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

export function z4Union(metric: "vma" | "ftp" | "cpRun" | "fcMax"): ZonePct | null {
  const a = getZoneMirror("Z4a")!;
  const b = getZoneMirror("Z4b")!;
  const ma = a[metric]; const mb = b[metric];
  if (!ma || !mb) return null;
  return { min: Math.min(ma.min, mb.min), max: Math.max(ma.max, mb.max) };
}
