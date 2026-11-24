/**
 * Zones Garmin (5 zones) déduites de la grille TFCL Z1–Z7.
 * Les 4 frontières tombent sur les repères qui comptent :
 *  1 gris  = Z1 (récupération)
 *  2 bleu  = Z2 (endurance, jusqu'au premier seuil)
 *  3 vert  = Z3 + Z4a (tempo, allure marathon)
 *  4 orange = Z4b + Z5 (allure semi, seuil, jusqu'à la CP / CS)
 *  5 rouge = Z6 + Z7 (au-dessus du seuil critique)
 */
import type { AnchoredGrid } from "./anchoredZoneGrid";
import type { LegacyZoneId } from "@/lib/zones/zoneMapping";

export interface GarminZone {
  n: 1 | 2 | 3 | 4 | 5;
  color: "gris" | "bleu" | "vert" | "orange" | "rouge";
  tfcl: string;
  /** FC [min, max] en bpm, null sans FC max. */
  hr: [number, number] | null;
  /** Vélo : watts [min, max] (max null = sans limite). Course : km/h [min, max]. */
  min: number;
  max: number | null;
}

const GROUPS: { n: GarminZone["n"]; color: GarminZone["color"]; ids: LegacyZoneId[] }[] = [
  { n: 1, color: "gris", ids: ["Z1"] },
  { n: 2, color: "bleu", ids: ["Z2"] },
  { n: 3, color: "vert", ids: ["Z3", "Z4a"] },
  { n: 4, color: "orange", ids: ["Z4b", "Z5"] },
  { n: 5, color: "rouge", ids: ["Z6", "Z7"] },
];

export function garminFiveZones(grid: AnchoredGrid, fcMax: number | null): GarminZone[] {
  return GROUPS.map(g => {
    const zones = g.ids.map(id => grid.zones.find(z => z.id === id)).filter((z): z is NonNullable<typeof z> => !!z);
    const first = zones[0], last = zones[zones.length - 1];
    const hrs = zones.map(z => z.hr).filter((h): h is [number, number] => !!h);
    // Z7 n'a pas de FC (effort trop court) : la zone rouge monte jusqu'à la FC max.
    const hr: [number, number] | null = hrs.length ? [hrs[0][0], g.n === 5 && fcMax ? fcMax : hrs[hrs.length - 1][1]] : null;
    return { n: g.n, color: g.color, tfcl: g.ids.join(" + "), hr, min: first?.min ?? 0, max: last?.max ?? null };
  });
}
