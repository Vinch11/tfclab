// =============================================
// BARRES DE PROGRESSION COLORÉES
// =============================================

import { cn } from "@/lib/utils";

interface ColoredProgressBarProps {
  value: number;
  max: number;
  label: string;
  displayValue: string;
  unit?: string;
  precision?: string;
  color?: "primary" | "accent" | "success" | "warning" | "destructive";
  size?: "sm" | "md" | "lg";
}

export function ColoredProgressBar({
  value,
  max,
  label,
  displayValue,
  unit,
  precision,
  color = "primary",
  size = "md",
}: ColoredProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colorClasses: Record<string, string> = {
    primary: "bg-primary",
    accent: "bg-accent",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    destructive: "bg-destructive",
  };

  const bgColorClasses: Record<string, string> = {
    primary: "bg-primary/20",
    accent: "bg-accent/20",
    success: "bg-emerald-500/20",
    warning: "bg-amber-500/20",
    destructive: "bg-destructive/20",
  };

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold">{displayValue}</span>
          {unit && <span className="text-muted-foreground text-xs">{unit}</span>}
          {precision && (
            <span className="text-muted-foreground text-xs">±{precision}%</span>
          )}
        </div>
      </div>
      <div
        className={cn(
          "w-full rounded-full overflow-hidden",
          bgColorClasses[color],
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Metric display with multiple bars
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
        color="warning"
        size="md"
      />
      <ColoredProgressBar
        value={tte}
        max={120}
        label="TTE"
        displayValue={String(tte)}
        unit="min"
        color="success"
        size="md"
      />
      <ColoredProgressBar
        value={vo2max}
        max={80}
        label="VO2max"
        displayValue={vo2max > 0 ? String(vo2max) : "N/A"}
        unit="ml/kg/min"
        color="destructive"
        size="md"
      />
      <ColoredProgressBar
        value={confiance}
        max={100}
        label="Confiance"
        displayValue={`${confiance}`}
        unit="%"
        color={confiance >= 80 ? "success" : confiance >= 60 ? "warning" : "destructive"}
        size="sm"
      />
    </div>
  );
}
