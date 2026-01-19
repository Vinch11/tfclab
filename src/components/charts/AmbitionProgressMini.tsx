/**
 * AmbitionProgressMini - Aperçu compact de la progression vers les cibles d'ambition
 * Affiche une jauge circulaire miniature avec le % de progression global
 * Animation de pulsation quand progression >= 85%
 */

import { useMemo } from "react";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getVLamaxRange,
  getTTETargetByAmbition,
  getFtpKgTargetByAmbition,
} from "@/lib/physiologicalTargets";
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
  objectif: string;
  ambition?: AmbitionLevel;
  weightKg?: number | null;
  className?: string;
  onClick?: () => void;
  onMetricClick?: (sectionId: string) => void;
}

// Mapping métrique -> section ID dans le dashboard
const METRIC_SECTION_MAP: Record<string, string> = {
  vlamax: "vlamax-v2-calibration",
  tte: "compass", // TTE intégré dans le compass
  ftpKg: "ftp-targets",
};

// =============================================
// HELPERS
// =============================================

function calculateProgress(
  current: number | null,
  target: number,
  isInverse: boolean = false
): number | null {
  if (current === null || current === 0) return null;
  if (isInverse) {
    if (current <= target) return 100;
    return Math.max(0, Math.min(100, (target / current) * 100));
  }
  return Math.min(100, (current / target) * 100);
}

function getGlobalProgress(
  vlamax: number | null,
  tte: number | null,
  ftpKg: number | null,
  objectif: string,
  ambition: AmbitionLevel
): number | null {
  const vlamaxRange = getVLamaxRange(objectif, ambition);
  const tteTarget = getTTETargetByAmbition(objectif, ambition);
  const ftpKgTarget = getFtpKgTargetByAmbition(objectif, ambition);

  const vlamaxProgress = calculateProgress(vlamax, vlamaxRange.optimal, true);
  const tteProgress = calculateProgress(tte, tteTarget, false);
  const ftpKgProgress = calculateProgress(ftpKg, ftpKgTarget, false);

  const validProgresses = [vlamaxProgress, tteProgress, ftpKgProgress].filter(
    (p) => p !== null
  ) as number[];
  
  return validProgresses.length > 0
    ? Math.round(validProgresses.reduce((a, b) => a + b, 0) / validProgresses.length)
    : null;
}

function getTrend(
  data: { progress: number | null }[]
): "up" | "down" | "stable" | "unknown" {
  const validPoints = data.filter((d) => d.progress !== null);
  if (validPoints.length < 2) return "unknown";
  
  const first = validPoints[0].progress as number;
  const last = validPoints[validPoints.length - 1].progress as number;
  const diff = last - first;
  
  if (Math.abs(diff) < 2) return "stable";
  return diff > 0 ? "up" : "down";
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
    if (p >= 100) return "hsl(142, 76%, 36%)"; // emerald
    if (p >= 85) return "hsl(38, 92%, 50%)"; // amber
    if (p >= 60) return "hsl(221, 83%, 53%)"; // blue
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
  objectif,
  ambition = DEFAULT_AMBITION,
  weightKg,
  className,
  onClick,
  onMetricClick,
}: AmbitionProgressMiniProps) {
  const ambDef = getAmbitionDefinition(ambition);

  // Calculer les données avec métriques individuelles
  const { progress, trend, metricsCount, metrics } = useMemo(() => {
    const sorted = [...snapshots]
      .filter((s) => s.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-6);

    if (sorted.length === 0) {
      return { 
        progress: null, 
        trend: "unknown" as const, 
        metricsCount: 0,
        metrics: { vlamax: null, tte: null, ftpKg: null }
      };
    }

    const progressData = sorted.map((s) => {
      const ftpKg = s.ftp && s.weight_kg ? s.ftp / s.weight_kg : 
                    s.ftp && weightKg ? s.ftp / weightKg : null;
      return {
        progress: getGlobalProgress(
          s.vlamax ?? null,
          s.tte_observed_min ?? null,
          ftpKg,
          objectif,
          ambition
        ),
      };
    });

    const latest = sorted[sorted.length - 1];
    const latestFtpKg = latest.ftp && latest.weight_kg ? latest.ftp / latest.weight_kg : 
                        latest.ftp && weightKg ? latest.ftp / weightKg : null;
    const currentProgress = getGlobalProgress(
      latest.vlamax ?? null,
      latest.tte_observed_min ?? null,
      latestFtpKg,
      objectif,
      ambition
    );

    // Calculer les progressions individuelles
    const vlamaxRange = getVLamaxRange(objectif, ambition);
    const tteTarget = getTTETargetByAmbition(objectif, ambition);
    const ftpKgTarget = getFtpKgTargetByAmbition(objectif, ambition);

    const vlamaxProgress = calculateProgress(latest.vlamax ?? null, vlamaxRange.optimal, true);
    const tteProgress = calculateProgress(latest.tte_observed_min ?? null, tteTarget, false);
    const ftpKgProgress = calculateProgress(latestFtpKg, ftpKgTarget, false);

    // Compter les métriques disponibles
    let count = 0;
    if (latest.vlamax !== null) count++;
    if (latest.tte_observed_min !== null) count++;
    if (latestFtpKg !== null) count++;

    return {
      progress: currentProgress,
      trend: getTrend(progressData),
      metricsCount: count,
      metrics: {
        vlamax: vlamaxProgress !== null ? { 
          value: latest.vlamax, 
          progress: Math.round(vlamaxProgress),
          target: vlamaxRange.optimal
        } : null,
        tte: tteProgress !== null ? { 
          value: latest.tte_observed_min, 
          progress: Math.round(tteProgress),
          target: tteTarget
        } : null,
        ftpKg: ftpKgProgress !== null ? { 
          value: latestFtpKg, 
          progress: Math.round(ftpKgProgress),
          target: ftpKgTarget
        } : null,
      },
    };
  }, [snapshots, objectif, ambition, weightKg]);

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
          <button
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
                <span className="text-xs font-medium">{ambDef.shortLabel}</span>
                {TrendIcon}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {metricsCount}/3 métriques
              </span>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium text-sm">
              {ambDef.icon} Progression vers "{ambDef.label}"
            </p>
            
            {/* Métriques individuelles - cliquables */}
            <div className="space-y-1 pt-1 border-t border-border/50">
              {metrics.vlamax && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMetricClick?.(METRIC_SECTION_MAP.vlamax);
                  }}
                  className="flex items-center justify-between text-xs w-full hover:bg-muted/50 rounded px-1 py-0.5 transition-colors group"
                >
                  <span className="text-muted-foreground group-hover:text-foreground">VLamax →</span>
                  <span className="font-mono">
                    <span className="font-medium">{metrics.vlamax.value?.toFixed(2)}</span>
                    <span className="text-muted-foreground"> → {metrics.vlamax.target.toFixed(2)}</span>
                    <span className={cn("ml-1", metrics.vlamax.progress >= 100 ? "text-emerald-500" : "text-amber-500")}>
                      ({metrics.vlamax.progress}%)
                    </span>
                  </span>
                </button>
              )}
              {metrics.tte && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMetricClick?.(METRIC_SECTION_MAP.tte);
                  }}
                  className="flex items-center justify-between text-xs w-full hover:bg-muted/50 rounded px-1 py-0.5 transition-colors group"
                >
                  <span className="text-muted-foreground group-hover:text-foreground">TTE →</span>
                  <span className="font-mono">
                    <span className="font-medium">{metrics.tte.value}′</span>
                    <span className="text-muted-foreground"> → {metrics.tte.target}′</span>
                    <span className={cn("ml-1", metrics.tte.progress >= 100 ? "text-emerald-500" : "text-amber-500")}>
                      ({metrics.tte.progress}%)
                    </span>
                  </span>
                </button>
              )}
              {metrics.ftpKg && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMetricClick?.(METRIC_SECTION_MAP.ftpKg);
                  }}
                  className="flex items-center justify-between text-xs w-full hover:bg-muted/50 rounded px-1 py-0.5 transition-colors group"
                >
                  <span className="text-muted-foreground group-hover:text-foreground">FTP/kg →</span>
                  <span className="font-mono">
                    <span className="font-medium">{metrics.ftpKg.value?.toFixed(2)}</span>
                    <span className="text-muted-foreground"> → {metrics.ftpKg.target.toFixed(2)}</span>
                    <span className={cn("ml-1", metrics.ftpKg.progress >= 100 ? "text-emerald-500" : "text-amber-500")}>
                      ({metrics.ftpKg.progress}%)
                    </span>
                  </span>
                </button>
              )}
            </div>
            
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
              Cliquez sur une métrique pour y accéder
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
