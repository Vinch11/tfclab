/**
 * MiniGauge - Composant de jauge compacte style INSCYD
 * Optimisé pour mobile et touch
 */

import { cn } from "@/lib/utils";

interface MiniGaugeProps {
  label: string;
  // Certains appels historiques peuvent passer `undefined` (ex: données pas encore chargées)
  value: number | null | undefined;
  unit: string;
  min?: number;
  max?: number;
  optimal?: { min: number; max: number };
  secondaryValue?: string;
  secondaryLabel?: string;
  className?: string;
}

export function MiniGauge({
  label,
  value,
  unit,
  min = 0,
  max = 100,
  optimal,
  secondaryValue,
  secondaryLabel,
  className,
}: MiniGaugeProps) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const percentage = Math.min(Math.max((safeValue - min) / (max - min), 0), 1);
  const angle = percentage * 180;
  
  // Zone optimale en degrés
  const optimalStartAngle = optimal 
    ? ((optimal.min - min) / (max - min)) * 180 
    : 0;
  const optimalEndAngle = optimal 
    ? ((optimal.max - min) / (max - min)) * 180 
    : 180;

  return (
    <div 
      className={cn(
        // Base styles
        "bg-card border border-border/50 rounded-lg hover:border-primary/30 transition-colors",
        // Responsive padding
        "p-2 sm:p-3",
        // Touch-friendly sizing
        "touch-target",
        className
      )}
    >
      {/* Label - responsive text */}
      <div 
        className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2 truncate" 
        title={label}
      >
        {label}
      </div>
      
      {/* Gauge SVG - responsive height */}
      <div className="relative flex justify-center">
        <svg viewBox="0 0 100 55" className="w-full h-auto max-h-[50px] sm:max-h-[60px]">
          {/* Fond gris de la jauge */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          
          {/* Zone optimale (verte) */}
          {optimal && (
            <path
              d={describeArc(50, 50, 40, optimalStartAngle, optimalEndAngle)}
              fill="none"
              stroke="hsl(var(--success) / 0.3)"
              strokeWidth="8"
              strokeLinecap="round"
            />
          )}
          
          {/* Zone de la valeur (primaire/danger selon position) */}
          <path
            d={describeArc(50, 50, 40, 0, angle)}
            fill="none"
            stroke={getGaugeColor(percentage, optimal, min, max, safeValue)}
            strokeWidth="8"
            strokeLinecap="round"
          />
          
          {/* Aiguille */}
          <line
            x1="50"
            y1="50"
            x2={50 + 35 * Math.cos((180 - angle) * Math.PI / 180)}
            y2={50 - 35 * Math.sin((180 - angle) * Math.PI / 180)}
            stroke="hsl(var(--foreground))"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* Centre de l'aiguille */}
          <circle cx="50" cy="50" r="4" fill="hsl(var(--foreground))" />
        </svg>
      </div>
      
      {/* Valeurs - responsive text */}
      <div className="text-center mt-0.5 sm:mt-1 space-y-0">
        <div className="flex items-baseline justify-center gap-0.5 sm:gap-1">
          <span className="text-base sm:text-lg font-bold text-foreground">
            {typeof value === "number" && Number.isFinite(value) ? formatValue(value) : "—"}
          </span>
          <span className="text-[9px] sm:text-xs text-muted-foreground">{unit}</span>
        </div>
        {secondaryValue && (
          <div className="text-[9px] sm:text-xs text-muted-foreground">
            <span className="hidden xs:inline">{secondaryLabel}: </span>
            <span className="font-medium">{secondaryValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Fonction pour décrire un arc SVG
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(x, y, radius, 180 - startAngle);
  const end = polarToCartesian(x, y, radius, 180 - endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY - radius * Math.sin(angleInRadians),
  };
}

function getGaugeColor(percentage: number, optimal: { min: number; max: number } | undefined, min: number, max: number, value: number): string {
  if (optimal) {
    const isInOptimal = value >= optimal.min && value <= optimal.max;
    if (isInOptimal) return "hsl(var(--success))";
    const distanceFromOptimal = value < optimal.min 
      ? (optimal.min - value) / (optimal.min - min)
      : (value - optimal.max) / (max - optimal.max);
    if (distanceFromOptimal > 0.5) return "hsl(var(--destructive))";
    return "hsl(var(--warning))";
  }
  
  // Gradient de couleur basé sur le pourcentage
  if (percentage < 0.3) return "hsl(var(--destructive))";
  if (percentage < 0.6) return "hsl(var(--warning))";
  return "hsl(var(--success))";
}

function formatValue(value: number): string {
  if (value >= 1000) return value.toFixed(0);
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}
