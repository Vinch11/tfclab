// =============================================
// BARRES DE PROGRESSION COLORÉES - VINCE'S LAB
// =============================================

import { cn } from "@/lib/utils";

interface ColoredProgressBarProps {
  value: number;
  max: number;
  label: string;
  displayValue: string;
  unit?: string;
  precision?: string;
  color?: "auto" | "primary" | "accent" | "success" | "warning" | "destructive";
  size?: "sm" | "md" | "lg";
  showSegments?: boolean;
  inverted?: boolean; // Pour VLamax: plus bas = mieux
}

// Calcul couleur automatique basée sur le ratio (comme dans le code Vince's Lab)
function getAutoColor(ratio: number, inverted: boolean = false): string {
  const effectiveRatio = inverted ? 1 - ratio : ratio;
  if (effectiveRatio > 0.75) return "success";
  if (effectiveRatio > 0.5) return "warning";
  if (effectiveRatio > 0.25) return "orange";
  return "destructive";
}

export function ColoredProgressBar({
  value,
  max,
  label,
  displayValue,
  unit,
  precision,
  color = "auto",
  size = "md",
  showSegments = false,
  inverted = false,
}: ColoredProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const ratio = value / max;

  // Déterminer la couleur automatiquement ou utiliser celle fournie
  const effectiveColor = color === "auto" ? getAutoColor(ratio, inverted) : color;

  const colorClasses: Record<string, string> = {
    primary: "bg-primary",
    accent: "bg-accent",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    orange: "bg-orange-500",
    destructive: "bg-red-500",
  };

  const bgColorClasses: Record<string, string> = {
    primary: "bg-primary/20",
    accent: "bg-accent/20",
    success: "bg-emerald-500/20",
    warning: "bg-amber-500/20",
    orange: "bg-orange-500/20",
    destructive: "bg-red-500/20",
  };

  const textColorClasses: Record<string, string> = {
    primary: "text-primary",
    accent: "text-accent",
    success: "text-emerald-500",
    warning: "text-amber-500",
    orange: "text-orange-500",
    destructive: "text-red-500",
  };

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-3",
    lg: "h-5",
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn("font-mono font-bold", textColorClasses[effectiveColor])}>
            {displayValue}
          </span>
          {unit && <span className="text-muted-foreground text-xs">{unit}</span>}
          {precision && (
            <span className="text-muted-foreground text-xs">±{precision}%</span>
          )}
        </div>
      </div>
      <div
        className={cn(
          "w-full rounded-full overflow-hidden relative",
          bgColorClasses[effectiveColor],
          sizeClasses[size]
        )}
      >
        {/* Barre de progression principale */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            colorClasses[effectiveColor]
          )}
          style={{ width: `${percentage}%` }}
        />
        {/* Segments optionnels */}
        {showSegments && (
          <div className="absolute inset-0 flex">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-background/30 last:border-r-0"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Composant de barre graphique style "console" avec émojis
interface GraphBarProps {
  value: number;
  max: number;
  length?: number;
  label?: string;
}

export function GraphBar({ value, max, length = 20, label }: GraphBarProps) {
  const ratio = Math.min(value / max, 1);
  const filled = Math.round(length * ratio);
  const empty = length - filled;

  // Couleur basée sur le ratio
  const getColor = () => {
    if (ratio > 0.75) return "bg-emerald-500";
    if (ratio > 0.5) return "bg-amber-500";
    if (ratio > 0.25) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      {label && <span className="w-16 text-muted-foreground">{label}</span>}
      <div className="flex">
        {[...Array(filled)].map((_, i) => (
          <div key={i} className={cn("w-2 h-3 mr-0.5 rounded-sm", getColor())} />
        ))}
        {[...Array(empty)].map((_, i) => (
          <div key={i} className="w-2 h-3 mr-0.5 rounded-sm bg-muted/30" />
        ))}
      </div>
      <span className="text-muted-foreground">{value.toFixed(2)}</span>
    </div>
  );
}

// Metric display with multiple bars (version améliorée)
interface MetricBarsProps {
  vlamax: number;
  vlamaxPrecision: number;
  tte: number;
  vo2max: number;
  confiance: number;
}

export function MetricBars({ vlamax, vlamaxPrecision, tte, vo2max, confiance }: MetricBarsProps) {
  return (
    <div className="space-y-4">
      <ColoredProgressBar
        value={vlamax}
        max={1}
        label="VLamax"
        displayValue={vlamax.toFixed(2)}
        unit="mmol/L/s"
        precision={String(vlamaxPrecision)}
        color="auto"
        inverted={true} // Plus bas = mieux pour endurance
        size="md"
        showSegments
      />
      <ColoredProgressBar
        value={tte}
        max={120}
        label="TTE"
        displayValue={String(Math.round(tte))}
        unit="min"
        color="auto"
        size="md"
        showSegments
      />
      <ColoredProgressBar
        value={vo2max}
        max={80}
        label="VO2max"
        displayValue={vo2max > 0 ? String(Math.round(vo2max)) : "N/A"}
        unit="ml/kg/min"
        color="auto"
        size="md"
        showSegments
      />
      <ColoredProgressBar
        value={confiance}
        max={100}
        label="Confiance"
        displayValue={`${Math.round(confiance)}`}
        unit="%"
        color="auto"
        size="sm"
      />
    </div>
  );
}

// Historique graphique compact
interface HistoriqueBarProps {
  date: string;
  vlamax: number;
  tte: number;
  vo2max: number;
}

export function HistoriqueBar({ date, vlamax, tte, vo2max }: HistoriqueBarProps) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-border/30 last:border-b-0">
      <span className="text-xs text-muted-foreground w-20 font-mono">{date}</span>
      <div className="flex-1 flex items-center gap-4">
        <GraphBar value={vlamax} max={1} length={12} label="VLamax" />
        <GraphBar value={tte} max={120} length={12} label="TTE" />
        <GraphBar value={vo2max} max={80} length={12} label="VO2" />
      </div>
    </div>
  );
}
