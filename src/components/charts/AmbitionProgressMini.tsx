/**
 * AmbitionProgressMini - Aperçu compact de la progression vers les cibles d'ambition
 * Affiche une jauge circulaire miniature avec le % de progression global
 * Animation de pulsation quand progression >= 85%
 */

import { useMemo } from "react";
import { Button } from '@/components/ui/button';
import { dashboardTargetProgress } from '@/lib/coachingCompass/dashboardConsistency';
import type { RadarAxis } from '@/lib/coachingCompass/types';
import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  AmbitionLevel, 
  getAmbitionDefinition, 
  DEFAULT_AMBITION 
} from "@/types/ambitionLevel";
import { DbSnapshot } from "@/hooks/useCloudData";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================
// TYPES
// =============================================

interface AmbitionProgressMiniProps {
  snapshots: DbSnapshot[];
  axes?: RadarAxis[];
  objectif: string;
  ambition?: AmbitionLevel;
  weightKg?: number | null;
  className?: string;
  onClick?: () => void;
  onMetricClick?: (sectionId: string) => void;
}

// =============================================
// MINI PROGRESS RING
// =============================================

function ProgressRing({ 
  progress, 
  size = 40, 
  strokeWidth = 4,
  shouldPulse = false,
}: { 
  progress: number | null; 
  size?: number; 
  strokeWidth?: number;
  shouldPulse?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - ((progress ?? 0) / 100) * circumference;

  // Couleur selon progression
  const getColor = (p: number | null) => {
    if (p === null) return "hsl(var(--muted-foreground))";
    if (p >= 100) return "hsl(var(--success))"; // emerald
    if (p >= 85) return "hsl(var(--warning))"; // amber
    if (p >= 60) return "hsl(var(--primary))"; // blue
    return "hsl(var(--muted-foreground))";
  };

  return (
    <svg 
      width={size} 
      height={size} 
      className={cn(
        "transform -rotate-90",
        shouldPulse && "animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
      )}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={getColor(progress)}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function AmbitionProgressMini({
  snapshots,
  axes,
  objectif,
  ambition = DEFAULT_AMBITION,
  weightKg,
  className,
  onClick,
  onMetricClick,
}: AmbitionProgressMiniProps) {
  const ambDef = getAmbitionDefinition(ambition);

  const { progress, metrics, total } = useMemo(() => dashboardTargetProgress(axes ?? []), [axes]);
  const metricsCount = metrics.length;
  const trend = "unknown" as "up" | "down" | "stable" | "unknown";

  // Icône de tendance
  const TrendIcon = useMemo(() => {
    switch (trend) {
      case "up":
        return <ChevronUp className="w-3 h-3 text-emerald-500" />;
      case "down":
        return <ChevronDown className="w-3 h-3 text-red-500" />;
      case "stable":
        return <Minus className="w-3 h-3 text-amber-500" />;
      default:
        return null;
    }
  }, [trend]);

  // Animation pulsation si progression >= 85%
  const shouldPulse = progress !== null && progress >= 85;

  if (progress === null) {
    return null; // Ne rien afficher si pas de données
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost"
            onClick={onClick}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border bg-card/50 hover:bg-card transition-colors cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              shouldPulse && "ring-2 ring-amber-400/50 shadow-lg shadow-amber-400/20",
              className
            )}
          >
            {/* Mini ring progress */}
            <div className="relative">
              <ProgressRing progress={progress} size={36} strokeWidth={3} shouldPulse={shouldPulse} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold tabular-nums">
                  {progress}%
                </span>
              </div>
            </div>

            {/* Label + trend */}
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium">Cibles</span>
                {TrendIcon}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {ambDef.shortLabel} · {metricsCount}/{total}
              </span>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium text-sm">
              {ambDef.icon} Progression vers "{ambDef.label}"
            </p>
            
            <p className="text-xs text-muted-foreground">Moyenne des comparaisons disponibles du compass sur le bilan de référence. Ce n’est ni la couverture des données, ni une validation de course.</p>
            <div className="space-y-1 pt-1 border-t border-border/50">
              {metrics.map(metric => <Button key={`${metric.label}-${metric.key}`} variant="ghost" size="sm" className="w-full justify-between text-xs" onClick={(e) => { e.stopPropagation(); onMetricClick?.('coaching-compass'); }}>
                <span>{metric.label}</span><span>{metric.value?.toFixed(metric.key === 'vlamax' ? 2 : 1)} → {metric.target?.toFixed(metric.key === 'vlamax' ? 2 : 1)} {metric.unit}</span>
              </Button>)}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
