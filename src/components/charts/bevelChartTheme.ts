/**
 * bevelChartTheme — Design tokens partagés pour tous les graphiques (style Bevel).
 * Palette : périwinkle (primaire), mint (positif), ambre (charge/strain),
 * ciel (secondaire), rose (alerte douce), violet (tertiaire).
 *
 * Le style visuel global (axes, grilles, tooltips, épaisseurs de courbes)
 * est appliqué via CSS dans `src/index.css` (bloc « Charts (Recharts) »).
 * Ce module sert uniquement à choisir des couleurs de séries cohérentes.
 */

export const BEVEL_CHART_COLORS = {
  periwinkle: "hsl(var(--chart-2))",
  mint: "hsl(var(--chart-1))",
  amber: "hsl(var(--chart-3))",
  sky: "hsl(var(--chart-4))",
  rose: "hsl(var(--chart-5))",
  violet: "hsl(var(--chart-6))",
  muted: "hsl(var(--muted-foreground))",
} as const;

/** Séquence par défaut pour des séries multiples. */
export const BEVEL_SERIES_PALETTE = [
  BEVEL_CHART_COLORS.periwinkle,
  BEVEL_CHART_COLORS.mint,
  BEVEL_CHART_COLORS.amber,
  BEVEL_CHART_COLORS.sky,
  BEVEL_CHART_COLORS.violet,
  BEVEL_CHART_COLORS.rose,
];

export function bevelSeriesColor(index: number): string {
  return BEVEL_SERIES_PALETTE[index % BEVEL_SERIES_PALETTE.length];
}

/** Props communes pour les axes Recharts. */
export const bevelAxisProps = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  tick: { fontSize: 11 },
} as const;

/** Props communes pour la grille. */
export const bevelGridProps = {
  strokeDasharray: "2 6",
  vertical: false,
} as const;

/** Props communes pour les lignes. */
export const bevelLineProps = {
  strokeWidth: 2.5,
  dot: false,
  activeDot: { r: 5, strokeWidth: 3 },
} as const;
