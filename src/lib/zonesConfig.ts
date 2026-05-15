/**
 * Configuration des zones d'entraînement - Grille Z1→Z7 Staff-Grade
 * 
 * ⚠️ ALIGNÉ AVEC src/lib/trainingZonesDefinition.ts (source unique)
 * Ce fichier fournit la rétrocompatibilité avec l'ancien système par métrique/sport.
 */

import { TRAINING_ZONES, ZoneId, ZONE_COLORS } from "./trainingZonesDefinition";

export interface ZoneDefinition {
  key: string;
  name: string;
  min: number;
  max: number;
  cogH?: number;
  desc: string;
}

export interface MetricConfig {
  label: string;
  sports: Record<string, ZoneDefinition[]>;
}

/**
 * GRILLE OFFICIELLE Z1→Z7 - Alignée avec trainingZonesDefinition.ts
 */
export const ZonesConfig: Record<string, MetricConfig> = {
  allure: {
    label: "Allure",
    sports: {
      "course": TRAINING_ZONES.map(z => ({
        key: z.id,
        name: z.label,
        min: z.vma.min,
        max: z.vma.max,
        desc: z.parametresTravailles
      })),
      "natation": [
        { key: "Z1", name: "Récupération", min: 0, max: 85, desc: "Récupération, technique" },
        { key: "Z2", name: "Endurance Fondamentale", min: 85, max: 95, desc: "Base aérobie, lipolyse" },
        { key: "Z3", name: "Endurance Active", min: 95, max: 100, desc: "Seuil aérobie" },
        { key: "Z4a", name: "Allure IM", min: 100, max: 105, desc: "Spécifique long" },
        { key: "Z4b", name: "Allure 70.3", min: 105, max: 110, desc: "Spécifique moyen" },
        { key: "Z5", name: "Seuil", min: 110, max: 115, desc: "MLSS natation" },
        { key: "Z6", name: "VO2max", min: 115, max: 120, desc: "Capacité aérobie max" },
        { key: "Z7", name: "Sprint", min: 120, max: 150, desc: "Neuromusculaire, explosivité" }
      ]
    }
  },

  puissance: {
    label: "Puissance",
    sports: {
      "cyclisme": TRAINING_ZONES.map(z => ({
        key: z.id,
        name: z.label,
        min: z.ftp.min,
        max: z.ftp.max,
        desc: z.parametresTravailles
      })),
      "course": TRAINING_ZONES.map(z => ({
        key: z.id,
        name: z.label,
        min: z.cpRun.min,
        max: z.cpRun.max,
        desc: z.parametresTravailles
      }))
    }
  },

  cardiaque: {
    label: "Cardiaque",
    sports: {
      "tout sport": TRAINING_ZONES.filter(z => z.fcMax !== null).map(z => ({
        key: z.id,
        name: z.label,
        min: z.fcMax!.min,
        max: z.fcMax!.max,
        cogH: z.id === "Z1" ? 36 : z.id === "Z2" ? 55 : z.id === "Z3" ? 65 : z.id === "Z4a" ? 70 : z.id === "Z4b" ? 75 : z.id === "Z5" ? 80 : 120,
        desc: z.parametresTravailles
      }))
    }
  }
};

export function getZoneTable(metricKey: string, sportKey: string): ZoneDefinition[] {
  const metric = ZonesConfig[metricKey];
  if (!metric) return [];
  return metric.sports[sportKey] || [];
}

export function getZoneTarget(
  metricKey: string,
  sportKey: string,
  zoneKey: string,
  referenceValue: number,
  unit: string = ""
) {
  const zones = getZoneTable(metricKey, sportKey);
  const z = zones.find(x => x.key === zoneKey);
  if (!z || referenceValue == null) return null;
  
  const lo = (z.min / 100) * referenceValue;
  const hi = (z.max / 100) * referenceValue;
  
  return {
    zoneKey: z.key,
    name: z.name,
    absMin: lo,
    absMax: hi,
    unit,
    percentMin: z.min,
    percentMax: z.max
  };
}

export function detectZone(
  metricKey: string,
  sportKey: string,
  valueAbs: number,
  referenceValue: number
): ZoneDefinition | null {
  const zones = getZoneTable(metricKey, sportKey);
  if (!zones.length || !referenceValue) return null;
  const pct = (valueAbs / referenceValue) * 100;
  return zones.find(z => pct >= z.min && pct <= z.max) || null;
}

// Convertir km/h en min/km
export function kmhToMinPerKm(kmh: number): string | null {
  if (!kmh || kmh <= 0) return null;
  const min = 60 / kmh;
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

// Interface pour les références athlète
export interface AthleteRefsForZones {
  fcMax: number | null;
  vma: number | null;
  ftp: number | null;
  css: number | null;
}

// Calcul automatique des valeurs absolues pour une zone
export interface AbsoluteZoneResult {
  ok: boolean;
  unit?: string;
  lo?: number;
  hi?: number;
  display?: string;
  note?: string;
}

export function computeAbsoluteRange(
  metricKey: string,
  sportKey: string,
  zone: ZoneDefinition,
  refs: AthleteRefsForZones
): AbsoluteZoneResult {
  // Cardiaque: %FCmax -> bpm
  if (metricKey === "cardiaque") {
    if (!refs.fcMax) return { ok: false, note: "Renseigne FCmax" };
    const lo = (zone.min / 100) * refs.fcMax;
    const hi = (zone.max / 100) * refs.fcMax;
    return { ok: true, unit: "bpm", lo, hi, display: `${lo.toFixed(0)}–${hi.toFixed(0)} bpm` };
  }

  // Puissance cyclisme: %FTP -> W
  if (metricKey === "puissance" && sportKey === "cyclisme") {
    if (!refs.ftp) return { ok: false, note: "Renseigne FTP" };
    const lo = (zone.min / 100) * refs.ftp;
    const hi = (zone.max / 100) * refs.ftp;
    return { ok: true, unit: "W", lo, hi, display: `${lo.toFixed(0)}–${hi.toFixed(0)} W` };
  }

  // Allure course: %VMA -> km/h + min/km
  if (metricKey === "allure" && sportKey === "course") {
    if (!refs.vma) return { ok: false, note: "Renseigne VMA" };
    const lo = (zone.min / 100) * refs.vma;
    const hi = (zone.max / 100) * refs.vma;
    const paceLo = kmhToMinPerKm(hi); // plus vite
    const paceHi = kmhToMinPerKm(lo); // plus lent
    return {
      ok: true,
      unit: "km/h",
      lo,
      hi,
      display: `${lo.toFixed(1)}–${hi.toFixed(1)} km/h (${paceLo} → ${paceHi})`
    };
  }

  // Allure natation: CSS sec/100m
  if (metricKey === "allure" && sportKey === "natation") {
    if (!refs.css) return { ok: false, note: "Renseigne CSS" };
    const css = refs.css;
    const minPct = zone.min / 100;
    const maxPct = zone.max / 100;
    const fast = css / maxPct;
    const slow = css / minPct;
    return { ok: true, unit: "sec/100m", lo: slow, hi: fast, display: `${fast.toFixed(1)}–${slow.toFixed(1)} sec/100m` };
  }

  return { ok: false, note: "Référence non définie" };
}

/**
 * Couleurs des zones - Exporté depuis trainingZonesDefinition.ts
 */
export const zoneColors = ZONE_COLORS;
