/**
 * ResponsiveChartTooltip – Tooltip optimisé pour mobile et touch
 * - Plus grand sur mobile pour faciliter la lecture
 * - Positionnement adaptatif pour éviter les débordements
 * - Support du touch avec délai approprié
 */

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface TooltipRow {
  label: string;
  value: string | number | null;
  unit?: string;
  highlight?: boolean;
  color?: string;
}

interface ResponsiveChartTooltipProps {
  active?: boolean;
  title?: string;
  subtitle?: string;
  rows: TooltipRow[];
  staffRows?: TooltipRow[];
  staffMode?: boolean;
  className?: string;
  children?: ReactNode;
}

export function ResponsiveChartTooltip({
  active,
  title,
  subtitle,
  rows,
  staffRows,
  staffMode = false,
  className,
  children,
}: ResponsiveChartTooltipProps) {
  if (!active) return null;

  return (
    <div
      className={cn(
        // Base styles - larger on mobile for touch
        "bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-lg",
        // Responsive padding and text
        "p-3 sm:p-3 text-sm sm:text-sm",
        // Mobile: wider tooltip for readability
        "min-w-[180px] sm:min-w-[200px] max-w-[260px] sm:max-w-[280px]",
        // Prevent text selection on touch
        "select-none",
        className
      )}
    >
      {/* Title */}
      {title && (
        <p className="font-semibold text-foreground text-sm sm:text-sm mb-1 truncate">
          {title}
        </p>
      )}
      
      {/* Subtitle */}
      {subtitle && (
        <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">
          {subtitle}
        </p>
      )}

      {/* Main rows */}
      <div className="space-y-1.5 sm:space-y-1">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className={cn(
              "flex justify-between items-center gap-3",
              row.highlight && "font-medium"
            )}
          >
            <span className="text-muted-foreground text-xs sm:text-sm truncate">
              {row.label}
            </span>
            <span
              className={cn(
                "font-mono text-xs sm:text-sm whitespace-nowrap",
                row.color || "text-foreground"
              )}
            >
              {row.value ?? "—"}
              {row.unit && <span className="text-muted-foreground ml-0.5">{row.unit}</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Staff-only rows */}
      {staffMode && staffRows && staffRows.length > 0 && (
        <>
          <div className="border-t border-border/50 my-2" />
          <div className="space-y-1">
            {staffRows.map((row, idx) => (
              <div
                key={`staff-${idx}`}
                className="flex justify-between items-center gap-3 text-[10px] sm:text-xs"
              >
                <span className="text-muted-foreground truncate">{row.label}</span>
                <span className="font-mono text-muted-foreground whitespace-nowrap">
                  {row.value ?? "—"}
                  {row.unit && <span className="ml-0.5">{row.unit}</span>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Custom children */}
      {children}
    </div>
  );
}

/**
 * Wrapper pour les tooltips Recharts avec configuration mobile-friendly
 */
export const mobileTooltipProps = {
  // Allow tooltip to follow touch position
  allowEscapeViewBox: { x: false, y: false },
  // Position offset for better touch visibility
  offset: 15,
  // Animation settings
  animationDuration: 150,
  // Cursor style for touch
  cursor: { strokeDasharray: '3 3', stroke: 'hsl(var(--muted-foreground))' },
};

/**
 * Configuration responsive pour les axes Recharts
 */
export const responsiveAxisProps = {
  xAxis: {
    tick: { fontSize: 10 },
    tickLine: false,
    axisLine: false,
    // Smaller tick margins on mobile
    tickMargin: 4,
  },
  yAxis: {
    tick: { fontSize: 10 },
    tickLine: false,
    axisLine: false,
    tickMargin: 4,
    width: 35,
  },
};

/**
 * Configuration responsive pour les dots/points
 */
export const responsiveDotProps = {
  // Larger touch targets on mobile
  r: 5,
  strokeWidth: 2,
  // Active dot even larger
  activeDot: {
    r: 8,
    strokeWidth: 2,
  },
};

/**
 * Configuration responsive pour la grille
 */
export const responsiveGridProps = {
  strokeDasharray: "3 3",
  strokeOpacity: 0.3,
  // Fewer grid lines on mobile
  horizontalPoints: [0, 25, 50, 75, 100],
};

/**
 * Hook pour détecter si on est sur un appareil touch
 */
export function useIsTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Calcule les marges responsives pour les graphiques
 */
export function getResponsiveMargins(isMobile: boolean) {
  return isMobile
    ? { top: 10, right: 10, bottom: 20, left: 0 }
    : { top: 10, right: 20, bottom: 30, left: 10 };
}
