import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  accentColor?: "primary" | "accent" | "success" | "warning";
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
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "glass-card p-6 hover:border-primary/30 transition-all duration-300 group",
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "p-3 rounded-xl transition-transform duration-300 group-hover:scale-110",
            iconBgColors[accentColor]
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
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
      <p className="metric-label mb-2">{title}</p>
      <div className="flex items-baseline gap-2">
        <span className={cn("metric-value", `text-${accentColor}`)}>{value}</span>
        {unit && <span className="text-muted-foreground text-sm">{unit}</span>}
      </div>
    </div>
  );
}
