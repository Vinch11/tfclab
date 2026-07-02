import { cn } from "@/lib/utils";
import { LucideIcon, HelpCircle } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  accentColor?: "primary" | "accent" | "success" | "warning";
  onWhyClick?: () => void;
}

const accentColors = {
  primary: "text-primary border-primary/30 bg-primary/5",
  accent: "text-accent border-accent/30 bg-accent/5",
  success: "text-success border-success/30 bg-success/5",
  warning: "text-warning border-warning/30 bg-warning/5",
};

const iconBgColors = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  className,
  accentColor = "primary",
  onWhyClick,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "glass-card p-3 sm:p-4 md:p-6 hover:border-primary/30 transition-all duration-300 group",
        className
      )}
    >
      <div className="flex items-start justify-between mb-2 sm:mb-4">
        <div
          className={cn(
            "p-2 sm:p-3 rounded-lg sm:rounded-xl transition-transform duration-300 group-hover:scale-110",
            iconBgColors[accentColor]
          )}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="flex items-center gap-2">
          {onWhyClick && (
            <button
              onClick={onWhyClick}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 px-2 py-1 rounded-full hover:bg-primary/10"
            >
              <HelpCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Pourquoi ?</span>
            </button>
          )}
          {trend && trendValue && (
            <div
              className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                trend === "up" && "bg-success/10 text-success",
                trend === "down" && "bg-destructive/10 text-destructive",
                trend === "neutral" && "bg-muted text-muted-foreground"
              )}
            >
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
            </div>
          )}
        </div>
      </div>
      <p className="metric-label mb-1 sm:mb-2 text-xs sm:text-sm">{title}</p>
      <div className="flex items-baseline gap-1 sm:gap-2">
        <span className={cn("font-display font-semibold text-2xl sm:text-4xl tracking-tight tabular-nums", `text-${accentColor}`)}>{value}</span>
        {unit && <span className="text-muted-foreground text-xs sm:text-sm">{unit}</span>}
      </div>
    </div>
  );
}
