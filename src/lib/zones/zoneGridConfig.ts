/**
 * Grille de zones utilisée par les plans (table des valeurs autorisées).
 * - "current"  : grille historique, convertie par le modèle de zones dérivées.
 * - "anchored" : grille Z1–Z7 ancrée sur le seuil critique (anchoredZoneGrid.ts).
 * Décision coach (23/11/2026) : la grille ancrée est codée mais NON activée ; elle
 * s'affiche en aperçu dans le rapport coach jusqu'à validation sur des athlètes réels.
 */
export type ZoneGridMode = "current" | "anchored";
export const ZONE_GRID_MODE: ZoneGridMode = "current";
