/**
 * V2RangeBadge — Badge affichant une plage de valeurs V2
 */

import { cn } from "@/lib/utils";

interface V2RangeBadgeProps {
  min: number;
  max: number;
  unit?: string;
  decimals?: number;
  className?: string;
}

export function V2RangeBadge({ 
  min, 
  max, 
  unit = "", 
  decimals = 2,
  className 
}: V2RangeBadgeProps) {
  const formatValue = (v: number) => {
    if (decimals === 0) return Math.round(v).toString();
    return v.toFixed(decimals);
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-mono text-sm",
      className
    )}>
      <span className="text-muted-foreground">{formatValue(min)}</span>
      <span className="text-muted-foreground/60">–</span>
      <span className="text-muted-foreground">{formatValue(max)}</span>
      {unit && <span className="text-muted-foreground/80 text-xs ml-0.5">{unit}</span>}
    </span>
  );
}
